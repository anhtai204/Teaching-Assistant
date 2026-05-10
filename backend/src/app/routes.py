from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from uuid import UUID
from fastapi.responses import StreamingResponse
import shutil
import os
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from src.base_agent import run_agent, astream_agent
from src.database import get_db
from src.models import User, Course, ChatSession, ChatMessage, Document, course_enrollments
from src.rag.ingest import ingest_file
from src.config import DOCUMENT_PATH
from src.memory.memory_store import append_conversation_turn
from src.utils.security import generate_enrollment_code
from src.utils.user_service import get_user_profile_sync
from src.roadmap.roadmap_service import generate_roadmap_with_llm

router = APIRouter()

# --- Models for Request/Response ---

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None # Will create new if None
    user_id: str = "default"
    course_id: Optional[str] = None

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: Optional[str] = "student"

class CourseCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    lecturer_id: str

class CourseEnroll(BaseModel):
    student_id: str
    enrollment_code: str

class CourseSettingsUpdate(BaseModel):
    greeting_message: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    user_id: UUID
    old_password: str
    new_password: str

# --- Endpoints ---

import bcrypt

@router.post("/api/auth/register")
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    salt = bcrypt.gensalt()
    hashed_pw = bcrypt.hashpw(request.password.encode('utf-8'), salt).decode('utf-8')
    
    new_user = User(
        email=request.email,
        password_hash=hashed_pw,
        full_name=request.full_name,
        role=request.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User registered successfully", "user_id": str(new_user.id)}

@router.post("/api/auth/change-password")
async def change_password(request: ChangePasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify old password
    if not bcrypt.checkpw(request.old_password.encode('utf-8'), user.password_hash.encode('utf-8')):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    # Hash and save new password
    salt = bcrypt.gensalt()
    user.password_hash = bcrypt.hashpw(request.new_password.encode('utf-8'), salt).decode('utf-8')
    db.commit()
    return {"message": "Password updated successfully"}

@router.get("/api/student/{student_id}/courses")
async def get_student_courses(student_id: UUID, db: Session = Depends(get_db)):
    """Returns all courses a specific student is enrolled in."""
    print(f"DEBUG: Fetching courses for student_id: {student_id}")
    try:
        user = db.query(User).filter(User.id == student_id).first()
    except Exception as e:
        print(f"DEBUG: Error querying user: {e}")
        raise HTTPException(status_code=400, detail="Invalid student ID format")
        
    if not user:
        print(f"DEBUG: Student with ID {student_id} not found")
        raise HTTPException(status_code=404, detail="Student not found")
    
    print(f"DEBUG: Found user {user.email}, enrolled in {len(user.enrolled_courses)} courses")
    return [
        {
            "id": str(course.id),
            "name": course.name,
            "code": course.code,
            "description": course.description
        }
        for course in user.enrolled_courses
    ]

@router.post("/api/courses/enroll")
async def enroll_course(request: CourseEnroll, db: Session = Depends(get_db)):
    """Enrolls a student in a course using an enrollment code."""
    course = db.query(Course).filter(Course.enrollment_code == request.enrollment_code).first()
    if not course:
        raise HTTPException(status_code=404, detail="Invalid enrollment code")
        
    user = db.query(User).filter(User.id == request.student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Check if already enrolled
    if course in user.enrolled_courses:
        return {"message": "Already enrolled", "course_id": str(course.id), "course_name": course.name}
        
    user.enrolled_courses.append(course)
    db.commit()
    
    return {
        "message": "Enrolled successfully",
        "course_id": str(course.id),
        "course_name": course.name
    }

@router.get("/api/courses")
async def get_courses(lecturer_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Course)
    if lecturer_id:
        query = query.filter(Course.lecturer_id == lecturer_id)
    courses = query.all()
    return [
        {
            "id": str(c.id), 
            "code": c.code, 
            "name": c.name, 
            "description": c.description,
            "enrollment_code": c.enrollment_code,
            "greeting_message": c.greeting_message
        } for c in courses
    ]

@router.post("/api/courses")
async def create_course(request: CourseCreate, db: Session = Depends(get_db)):
    print(f"DEBUG: Creating course with data: {request.dict()}")
    # Check if course code exists
    existing = db.query(Course).filter(Course.code == request.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Course code already exists")
    
    # Generate unique enrollment code
    enroll_code = generate_enrollment_code()
    # Ensure uniqueness (simple retry logic)
    while db.query(Course).filter(Course.enrollment_code == enroll_code).first():
        enroll_code = generate_enrollment_code()

    new_course = Course(
        name=request.name,
        code=request.code,
        description=request.description,
        lecturer_id=request.lecturer_id,
        enrollment_code=enroll_code
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return {"message": "Course created successfully", "course_id": str(new_course.id), "enrollment_code": enroll_code}

@router.get("/api/courses/{course_id}/students")
async def get_course_students(course_id: str, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    return [
        {
            "id": str(s.id),
            "full_name": s.full_name,
            "email": s.email
        } for s in course.students
    ]

@router.delete("/api/courses/{course_id}/students/{student_id}")
async def remove_student(course_id: str, student_id: str, db: Session = Depends(get_db)):
    statement = course_enrollments.delete().where(
        course_enrollments.c.course_id == course_id,
        course_enrollments.c.student_id == student_id
    )
    result = db.execute(statement)
    db.commit()
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Student not enrolled in this course")
        
    return {"message": "Student removed successfully"}

@router.delete("/api/materials/{document_id}")
async def delete_material(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        # 1. Remove from VectorDB (Chroma)
        try:
            from src.rag.vectorstore import get_vectorstore
            vectorstore = get_vectorstore()
            if hasattr(vectorstore, "_collection"):
                print(f"[DELETE] Removing chunks for doc {document_id} from Chroma")
                vectorstore._collection.delete(where={"document_id": str(document_id)})
        except Exception as v_err:
            print(f"[DELETE] VectorDB error (skipping): {v_err}")
        
        # 2. Remove file from Supabase Storage
        try:
            from src.supabase_client import supabase
            if supabase and doc.storage_url:
                # Extract path from storage_url
                # URL format: .../storage/v1/object/public/course-materials/course_id/safe_filename
                parts = doc.storage_url.split('/')
                if len(parts) >= 2:
                    storage_path = f"{parts[-2]}/{parts[-1]}"
                    print(f"[DELETE] Removing file {storage_path} from Supabase Storage")
                    supabase.storage.from_("course-materials").remove([storage_path])
        except Exception as storage_err:
            print(f"[DELETE] Supabase Storage error (skipping): {storage_err}")
            
        # 3. Delete from SQL Database
        print(f"[DELETE] Removing document {document_id} from SQL DB")
        db.delete(doc)
        db.commit()
        
        return {"message": "Material deleted successfully"}
    except Exception as e:
        db.rollback()
        print(f"[DELETE] Final fallback error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/api/materials/{document_id}/visibility")
async def toggle_visibility(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc.is_visible = not doc.is_visible
    
    # Also update in VectorDB for accurate filtering
    from src.rag.vectorstore import get_vectorstore
    vectorstore = get_vectorstore()
    if hasattr(vectorstore, "_collection"):
        try:
            # First get the IDs of all chunks belonging to this document
            results = vectorstore._collection.get(where={"document_id": str(document_id)})
            ids = results.get("ids", [])
            if ids:
                # Update visibility metadata for all chunks
                # We only want to update the is_visible field, but keep others if possible
                # In Chroma update, metadatas are merged
                vectorstore._collection.update(
                    ids=ids,
                    metadatas=[{"is_visible": doc.is_visible}] * len(ids)
                )
        except Exception as e:
            print(f"Error updating vectorstore visibility: {e}")
            # We don't necessarily want to fail the whole request if vectordb update fails, 
            # but we should log it.
    
    db.commit()
    return {"message": "Visibility updated", "is_visible": doc.is_visible}

@router.get("/api/materials/{document_id}")
async def get_material_details(document_id: UUID, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {
        "id": str(doc.id),
        "name": doc.name,
        "type": doc.file_type.upper(),
        "url": doc.storage_url,
        "is_visible": doc.is_visible,
        "status": doc.status,
        "course_name": doc.course.name if doc.course else "General",
        "course_id": str(doc.course_id)
    }

@router.patch("/api/courses/{course_id}/settings")
async def update_course_settings(course_id: str, request: CourseSettingsUpdate, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if request.greeting_message is not None:
        course.greeting_message = request.greeting_message
        
    db.commit()
    return {"message": "Settings updated successfully"}

@router.post("/api/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        # 1. Resolve Profile & Session
        profile = get_user_profile_sync(db, request.user_id)
        session = None
        if request.session_id and request.session_id != "default":
            session = db.query(ChatSession).filter(ChatSession.id == request.session_id).first()
        
        if not session:
            # Use profile ID if valid UUID, else fallback
            try:
                uid = UUID(request.user_id)
                user = db.query(User).filter(User.id == uid).first()
            except:
                user = db.query(User).filter(User.email == "test@example.com").first()
            
            if not user:
                user = db.query(User).first()
            
            course = db.query(Course).first()
            
            if user and course:
                session = ChatSession(
                    student_id=user.id,
                    course_id=course.id,
                    title=request.message[:50]
                )
                db.add(session)
                db.commit()
                db.refresh(session)

        # 2. Save User Message
        if session:
            user_msg = ChatMessage(
                session_id=session.id,
                role="user",
                content=request.message
            )
            db.add(user_msg)
            db.commit()

        # 3. Run Agent with Profile
        response = run_agent(
            user_input=request.message,
            user_id=request.user_id,
            session_id=str(session.id) if session else "default",
            course_id=request.course_id or "default",
            user_profile=profile
        )

        # 4. Save Assistant Message
        if session:
            assistant_msg = ChatMessage(
                session_id=session.id,
                role="assistant",
                content=response
            )
            db.add(assistant_msg)
            db.commit()

        # 5. Log to session.jsonl
        append_conversation_turn(
            user_id=request.user_id,
            user_text=request.message,
            assistant_text=response,
            session_id=str(session.id) if session else "default"
        )

        return {
            "response": response,
            "session_id": str(session.id) if session else "default"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/chat/stream")
async def chat_stream(
    message: str,
    course_id: str,
    user_id: str = "default",
    session_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Streaming chat endpoint using SSE.
    """
    print(f"[CHAT_STREAM] Received message: '{message}' for course_id: '{course_id}'")
    # 1. Resolve Profile & Session
    profile = get_user_profile_sync(db, user_id)
    if session_id and session_id != "undefined":
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    else:
        # Create new session
        session = ChatSession(
            student_id=user_id,
            course_id=course_id,
            title=message[:50]
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # 2. Save User Message
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=message
    )
    db.add(user_msg)
    db.commit()

    # Capture session_id early to avoid DetachedInstanceError in generator
    session_id_str = str(session.id)

    async def stream_and_save():
        full_content = ""
        metadata = {}
        
        async for chunk in astream_agent(
            user_input=message,
            user_id=user_id,
            session_id=session_id_str,
            course_id=course_id,
            user_profile=profile
        ):
            if chunk.startswith("data: "):
                data_str = chunk[6:].strip()
                if data_str != "[DONE]":
                    try:
                        import json
                        data = json.loads(data_str)
                        if data.get("type") == "token":
                            full_content += data.get("content", "")
                        elif data.get("type") == "metadata":
                            metadata = data.get("metadata", {})
                    except Exception:
                        pass
            yield chunk
        
        if full_content:
            assistant_msg = ChatMessage(
                session_id=session_id_str,
                role="assistant",
                content=full_content,
                sources=metadata.get("sources", [])
            )
            db.add(assistant_msg)
            db.commit()
            db.refresh(assistant_msg)
            
            # Send a final debug chunk so the user can check the raw output
            debug_data = {
                "type": "debug",
                "content": full_content,
                "metadata": metadata
            }
            import json
            yield f"data: {json.dumps(debug_data)}\n\n"
            
            # Log to conversation history file
            from src.memory.memory_store import append_conversation_turn
            append_conversation_turn(
                user_id=user_id,
                user_text=message,
                assistant_text=full_content,
                session_id=session_id_str
            )
            
            # Send the final message ID so frontend can use it for feedback
            yield f"data: {{\"type\": \"message_id\", \"id\": \"{str(assistant_msg.id)}\"}}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        stream_and_save(),
        media_type="text/event-stream"
    )

@router.get("/api/chat/sessions")
async def get_chat_sessions(student_id: UUID, course_id: Optional[UUID] = None, db: Session = Depends(get_db)):
    # Validate UUID format to avoid SQL errors
    query = db.query(ChatSession).filter(ChatSession.student_id == student_id)
    if course_id:
        query = query.filter(ChatSession.course_id == course_id)
    sessions = query.order_by(ChatSession.last_message_at.desc()).all()
    return [
        {
            "id": str(s.id),
            "title": s.title,
            "course_id": str(s.course_id),
            "created_at": s.created_at
        }
        for s in sessions
    ]

@router.get("/api/chat/sessions/{session_id}/messages")
async def get_session_messages(session_id: UUID, db: Session = Depends(get_db)):
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    return [
        {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "sources": m.sources,
            "is_flagged": m.is_flagged,
            "feedback_rating": m.feedback_rating,
            "manual_answer": m.manual_answer,
            "created_at": m.created_at
        }
        for m in messages
    ]

class FeedbackRequest(BaseModel):
    rating: Optional[int] = None # 1 or -1
    comment: Optional[str] = None
    is_report: bool = False

@router.post("/api/chat/messages/{message_id}/feedback")
async def submit_feedback(message_id: UUID, request: FeedbackRequest, db: Session = Depends(get_db)):
    msg = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if request.rating is not None:
        msg.feedback_rating = request.rating
    if request.comment is not None:
        msg.feedback_comment = request.comment
    if request.is_report:
        msg.is_flagged = True
    
    db.commit()
    return {"message": "Feedback submitted"}

@router.get("/api/moderation/pending")
async def get_pending_moderation(course_id: str, db: Session = Depends(get_db)):
    """Lecturer endpoint to see flagged messages."""
    messages = db.query(ChatMessage).join(ChatSession).filter(
        ChatSession.course_id == course_id,
        (ChatMessage.is_flagged == True) | (ChatMessage.feedback_rating == -1),
        ChatMessage.manual_answer == None
    ).all()
    
    return [
        {
            "id": str(m.id),
            "student_question": db.query(ChatMessage).filter(
                ChatMessage.session_id == m.session_id, 
                ChatMessage.created_at < m.created_at,
                ChatMessage.role == "user"
            ).order_by(ChatMessage.created_at.desc()).first().content if db.query(ChatMessage).filter(
                ChatMessage.session_id == m.session_id, 
                ChatMessage.created_at < m.created_at,
                ChatMessage.role == "user"
            ).first() else "Unknown Question",
            "content": m.content,
            "created_at": m.created_at.isoformat(),
            "is_flagged": m.is_flagged,
            "was_unanswered": m.was_unanswered
        }
        for m in messages
    ]

class ResolveRequest(BaseModel):
    manual_answer: str

@router.post("/api/moderation/resolve/{message_id}")
async def resolve_moderation(message_id: str, request: ResolveRequest, db: Session = Depends(get_db)):
    msg = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    msg.manual_answer = request.manual_answer
    msg.is_flagged = False # Mark as resolved
    db.commit()
    return {"message": "Resolved successfully"}

@router.post("/api/materials/upload")
async def upload_material(
    course_id: Optional[str] = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        from src.supabase_client import supabase
        
        # 1. Check for existing document
        if course_id:
            existing_doc = db.query(Document).filter(
                Document.course_id == course_id,
                Document.name == file.filename
            ).first()
            
            if existing_doc:
                print(f"Document {file.filename} already exists in course {course_id}, skipping duplicate creation.")
                return {
                    "message": f"Document {file.filename} already exists",
                    "document_id": str(existing_doc.id),
                    "status": existing_doc.status
                }

        # 2. Upload to Supabase Storage
        file_content = await file.read()
        
        # Sanitize filename to avoid "InvalidKey" errors with spaces/special chars
        import re
        safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', file.filename)
        # Use a default folder if course_id is missing
        folder_name = course_id if course_id else "unclassified"
        storage_path = f"{folder_name}/{safe_filename}"
        
        # Ensure bucket exists (or handle error if it doesn't)
        try:
            # Note: Upsert=True allows replacing if needed
            res = supabase.storage.from_("course-materials").upload(
                path=storage_path,
                file=file_content,
                file_options={"upsert": "true", "content-type": file.content_type}
            )
        except Exception as storage_err:
            print(f"Supabase Storage Error: {storage_err}")
            # Fallback to local if storage fails? No, better to fail and inform.
            raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(storage_err)}")

        # 3. Get public URL
        storage_url = supabase.storage.from_("course-materials").get_public_url(storage_path)

        # 4. Create local temporary file for ingestion (since ingest_file needs a path)
        os.makedirs("temp_uploads", exist_ok=True)
        temp_path = os.path.join("temp_uploads", file.filename)
        with open(temp_path, "wb") as f:
            f.write(file_content)

        new_doc = Document(
            course_id=course_id,
            name=file.filename,
            file_type=file.filename.split('.')[-1],
            storage_url=storage_url,
            status="processing"
        )
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)
        
        # 5. Trigger Ingestion (using the local temp file)
        num_chunks = ingest_file(temp_path, str(new_doc.id), course_id, db)
        
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        # 6. Update Document status
        new_doc.status = "indexed"
        db.commit()
        
        # 7. Log to session.jsonl
        append_conversation_turn(
            user_id="lecturer_system",
            user_text=f"Uploaded and indexed: {file.filename}",
            assistant_text=f"Successfully processed into {num_chunks} chunks.",
            session_id="system_log"
        )
        
        return {
            "message": f"Successfully uploaded and indexed {file.filename}",
            "document_id": str(new_doc.id),
            "chunks": num_chunks
        }
    except Exception as e:
        db.rollback()
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/materials")
async def get_materials(course_id: Optional[str] = None, lecturer_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Returns materials filtered by course or all materials for a lecturer."""
    query = db.query(Document)
    if course_id:
        query = query.filter(Document.course_id == course_id)
    elif lecturer_id:
        # Join with Course to filter by lecturer, but also include documents with NO course
        # if they were uploaded by this lecturer (need to add lecturer_id to Document table or handle differently)
        # For now, let's just return documents that belong to any of the lecturer's courses
        query = query.join(Course).filter(Course.lecturer_id == lecturer_id)
    else:
        return []
    documents = query.order_by(Document.created_at.desc()).all()
    
    return [
        {
            "id": str(doc.id),
            "name": doc.name,
            "type": doc.file_type.upper(),
            "status": doc.status.capitalize(),
            "is_visible": doc.is_visible,
            "course_name": doc.course.name if doc.course else "General"
        }
        for doc in documents
    ]

@router.get("/api/student/courses/{course_id}/materials")
async def get_student_materials(course_id: UUID, db: Session = Depends(get_db)):
    """Returns materials for a student to view/download."""
    documents = db.query(Document).filter(
        Document.course_id == course_id,
        Document.status == "indexed"
    ).all()
    
    return [
        {
            "id": str(doc.id),
            "name": doc.name,
            "type": doc.file_type.upper(),
            "url": doc.storage_url,
            "is_visible": doc.is_visible
        }
        for doc in documents
    ]

@router.get('/api/student/{student_id}/all_materials')
async def get_all_student_materials(student_id: UUID, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='Student not found')
    course_ids = [course.id for course in user.enrolled_courses]
    documents = db.query(Document).filter(Document.course_id.in_(course_ids), Document.status == 'indexed').all()
    return [{'id': str(doc.id), 'name': doc.name, 'type': doc.file_type.upper(), 'url': doc.storage_url, 'course_name': doc.course.name, 'is_visible': doc.is_visible} for doc in documents]

@router.put('/api/courses/{course_id}')
async def update_course(course_id: str, request: CourseCreate, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail='Course not found')
    course.name = request.name
    course.code = request.code
    course.description = request.description
    db.commit()
    return {'message': 'Course updated successfully'}
@router.get("/api/roadmap")
async def get_roadmap(user_id: str, db: Session = Depends(get_db)):
    from src.models import RoadmapItem
    # Kiểm tra xem sinh viên đã có lộ trình trong DB chưa
    existing_items = db.query(RoadmapItem).filter(RoadmapItem.student_id == user_id).order_by(RoadmapItem.created_at.desc()).all()
    
    if existing_items:
        return {
            "ok": True, 
            "items": [
                {
                    "id": str(item.id),
                    "topic": item.topic,
                    "description": item.description,
                    "priority": item.priority,
                    "progress": item.progress,
                    "status": item.status,
                    "eta_minutes": item.eta_minutes
                } for item in existing_items
            ]
        }
    
    # Nếu chưa có, tự động tạo mới (giống cơ chế Refresh)
    return await refresh_roadmap(user_id, db)

@router.post("/api/roadmap/refresh")
async def refresh_roadmap(user_id: str, db: Session = Depends(get_db)):
    from src.models import RoadmapItem
    
    # Xóa lộ trình cũ
    db.query(RoadmapItem).filter(RoadmapItem.student_id == user_id).delete()
    db.commit()

    # Thu thập dữ liệu
    history = db.query(ChatMessage).join(ChatSession).filter(ChatSession.student_id == user_id).limit(40).all()
    history_dicts = [{"role": m.role, "content": m.content} for m in history]
    
    docs = db.query(Document).limit(10).all()
    allowed_sources = [d.name for d in docs]
    
    # Gọi AI để tạo lộ trình mới
    items = generate_roadmap_with_llm(user_id, history_dicts, allowed_sources)
    
    # Lưu vào Database
    saved_items = []
    for item in items:
        new_item = RoadmapItem(
            student_id=user_id,
            topic=item.get("topic", "Unknown"),
            description=item.get("description", ""),
            priority=item.get("priority", "medium"),
            progress=item.get("progress", 0),
            status=item.get("status", "todo"),
            eta_minutes=item.get("eta_minutes", 30)
        )
        db.add(new_item)
        saved_items.append(new_item)
    
    db.commit()
    
    return {
        "ok": True, 
        "items": [
            {
                "id": str(item.id),
                "topic": item.topic,
                "description": item.description,
                "priority": item.priority,
                "progress": item.progress,
                "status": item.status,
                "eta_minutes": item.eta_minutes
            } for item in saved_items
        ]
    }

class RoadmapProgressUpdate(BaseModel):
    progress: int

@router.patch("/api/roadmap/{item_id}")
async def update_roadmap_progress(item_id: str, request: RoadmapProgressUpdate, db: Session = Depends(get_db)):
    from src.models import RoadmapItem
    item = db.query(RoadmapItem).filter(RoadmapItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Roadmap item not found")
    
    item.progress = request.progress
    if request.progress >= 100:
        item.status = "done"
    elif request.progress > 0:
        item.status = "in_progress"
    else:
        item.status = "todo"
        
    db.commit()
    return {"message": "Progress updated successfully", "progress": item.progress, "status": item.status}
