from src.models import RoadmapItem
from fastapi import Query
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
from src.models import User, Course, ChatSession, ChatMessage, Document, course_enrollments, MaterialRequest
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
            "description": course.description,
            "instructor_name": course.lecturer.full_name if course.lecturer else "N/A",
            "document_count": len(course.documents)
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

@router.get("/api/courses/{course_id}")
async def get_course_detail(course_id: str, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    return {
        "id": str(course.id),
        "code": course.code,
        "name": course.name,
        "description": course.description,
        "enrollment_code": course.enrollment_code,
        "greeting_message": course.greeting_message
    }

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

@router.patch("/api/materials/{document_id}/rename")
async def rename_document(document_id: str, new_name: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc.name = new_name
    db.commit()
    return {"message": "Document renamed successfully", "new_name": new_name}

@router.patch("/api/materials/{document_id}/course")
async def update_document_course(document_id: str, course_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # 1. Update SQL DB
    doc.course_id = course_id
    
    # 2. Update VectorDB (Chroma) metadata for all chunks
    from src.rag.vectorstore import get_vectorstore
    vectorstore = get_vectorstore()
    if hasattr(vectorstore, "_collection"):
        try:
            # Get all chunk IDs for this document
            results = vectorstore._collection.get(where={"document_id": str(document_id)})
            ids = results.get("ids", [])
            if ids:
                # Update course_id metadata
                vectorstore._collection.update(
                    ids=ids,
                    metadatas=[{"course_id": str(course_id)}] * len(ids)
                )
                print(f"[COURSE_UPDATE] Updated {len(ids)} chunks for doc {document_id} to course {course_id}")
        except Exception as e:
            print(f"Error updating vectorstore course_id: {e}")
            
    db.commit()
    return {"message": "Document assigned to course successfully", "course_id": course_id}

# --- Material Request Endpoints ---

class MaterialRequestCreate(BaseModel):
    student_id: str
    course_id: str
    topic_name: str
    description: Optional[str] = None

@router.post("/api/materials/request")
async def create_material_request(request: MaterialRequestCreate, db: Session = Depends(get_db)):
    new_request = MaterialRequest(
        student_id=request.student_id,
        course_id=request.course_id,
        topic_name=request.topic_name,
        description=request.description
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return {"message": "Request submitted successfully", "request_id": str(new_request.id)}

@router.get("/api/materials/requests")
async def get_material_requests(
    course_id: Optional[str] = Query(None), 
    student_id: Optional[str] = Query(None), 
    db: Session = Depends(get_db)
):
    query = db.query(MaterialRequest)
    if course_id and course_id != "undefined":
        query = query.filter(MaterialRequest.course_id == course_id)
    if student_id and student_id != "undefined":
        query = query.filter(MaterialRequest.student_id == student_id)
    
    requests = query.order_by(MaterialRequest.created_at.desc()).all()
    
    result = []
    for r in requests:
        try:
            result.append({
                "id": str(r.id),
                "student_id": str(r.student_id),
                "student_name": r.student.full_name if r.student else "Unknown Student",
                "course_id": str(r.course_id),
                "topic_name": r.topic_name,
                "description": r.description,
                "status": r.status,
                "lecturer_comment": r.lecturer_comment,
                "created_at": r.created_at
            })
        except Exception as e:
            print(f"Error serializing request {r.id}: {e}")
            continue
            
    return result

@router.patch("/api/materials/requests/{request_id}/status")
async def update_request_status(request_id: str, status: str, comment: Optional[str] = Query(None), db: Session = Depends(get_db)):
    req = db.query(MaterialRequest).filter(MaterialRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    req.status = status
    if comment:
        req.lecturer_comment = comment
    db.commit()
    return {"message": f"Status updated to {status}"}

@router.get("/api/materials/{document_id}")
async def get_material_details(document_id: UUID, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    course_names = [c.name for c in doc.courses]
    return {
        "id": str(doc.id),
        "name": doc.name,
        "type": doc.file_type.upper() if doc.file_type else "FILE",
        "url": doc.storage_url,
        "is_visible": doc.is_visible,
        "status": doc.status,
        "course_name": ", ".join(course_names) if course_names else "Library",
        "course_id": str(doc.courses[0].id) if doc.courses else None
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



@router.post("/api/materials/upload")
async def upload_material(
    course_id: Optional[str] = None,
    lecturer_id: Optional[str] = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        # --- NEW: File Size Validation for MVP ---
        MAX_DOC_SIZE = 10 * 1024 * 1024  # 10MB
        MAX_MEDIA_SIZE = 25 * 1024 * 1024 # 25MB
        
        file_ext = file.filename.split('.')[-1].lower()
        is_media = file_ext in ['mp3', 'mp4', 'wav', 'm4a', 'flac']
        
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)
        
        limit = MAX_MEDIA_SIZE if is_media else MAX_DOC_SIZE
        if file_size > limit:
            raise HTTPException(status_code=400, detail="File quá lớn.")
        # ----------------------------------------

        from src.supabase_client import supabase
        
        # 1. Check for existing document by name and lecturer
        existing_doc = db.query(Document).filter(
            Document.name == file.filename,
            Document.lecturer_id == lecturer_id
        ).first()
        
        if existing_doc:
            # Just link to new course if provided
            if course_id:
                from src.models import course_document_links
                # Check if link exists
                existing_link = db.execute(
                    course_document_links.select().where(
                        course_document_links.c.course_id == course_id,
                        course_document_links.c.document_id == existing_doc.id
                    )
                ).first()
                
                if not existing_link:
                    db.execute(course_document_links.insert().values(course_id=course_id, document_id=existing_doc.id))
                    db.commit()
            
            return {
                "message": f"Document {file.filename} already exists, linked to course.",
                "document_id": str(existing_doc.id),
                "status": existing_doc.status
            }

        # 2. Upload to Supabase Storage
        file_content = await file.read()
        import re
        safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', file.filename)
        storage_path = f"library/{lecturer_id or 'shared'}/{safe_filename}"
        
        supabase.storage.from_("course-materials").upload(
            path=storage_path,
            file=file_content,
            file_options={"upsert": "true", "content-type": file.content_type}
        )
        storage_url = supabase.storage.from_("course-materials").get_public_url(storage_path)

        # 3. Create Document entry
        new_doc = Document(
            lecturer_id=lecturer_id,
            name=file.filename,
            file_type=file.filename.split('.')[-1],
            storage_url=storage_url,
            status="processing"
        )
        db.add(new_doc)
        db.flush() # Get ID
        
        # 4. Link to course if provided
        if course_id:
            from src.models import course_document_links
            db.execute(course_document_links.insert().values(course_id=course_id, document_id=new_doc.id))
        
        db.commit()
        
        # 5. Ingest
        os.makedirs("temp_uploads", exist_ok=True)
        temp_path = os.path.join("temp_uploads", f"{new_doc.id}_{file.filename}")
        with open(temp_path, "wb") as f:
            f.write(file_content)
            
        num_chunks, converted_pdf_path = ingest_file(temp_path, str(new_doc.id), course_id, db)
        
        # 6. If converted to PDF, upload the PDF version and update Document URL
        if converted_pdf_path and os.path.exists(converted_pdf_path):
            try:
                with open(converted_pdf_path, "rb") as pdf_file:
                    pdf_content = pdf_file.read()
                    
                pdf_filename = os.path.basename(converted_pdf_path)
                pdf_storage_path = f"library/{lecturer_id or 'shared'}/{pdf_filename}"
                
                print(f"[SYNC] Uploading standardized PDF version: {pdf_filename}")
                supabase.storage.from_("course-materials").upload(
                    path=pdf_storage_path,
                    file=pdf_content,
                    file_options={"upsert": "true", "content-type": "application/pdf"}
                )
                new_pdf_url = supabase.storage.from_("course-materials").get_public_url(pdf_storage_path)
                
                # Update Document Record
                new_doc.storage_url = new_pdf_url
                new_doc.file_type = "pdf"
                db.commit()
                print(f"✅ Document {new_doc.id} updated to PDF version for viewing.")
                
                # Cleanup converted PDF
                if os.path.exists(converted_pdf_path):
                    os.remove(converted_pdf_path)
            except Exception as sync_err:
                print(f"⚠️ Warning: Failed to sync PDF version to storage: {sync_err}")
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        new_doc.status = "indexed"
        db.commit()
        
        return {"message": "Success", "document_id": str(new_doc.id), "chunks": num_chunks}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/materials")
async def get_materials(course_id: Optional[str] = None, lecturer_id: Optional[str] = None, db: Session = Depends(get_db)):
    from src.models import course_document_links, Course
    
    from src.models import course_document_links, Course
    
    query = db.query(Document)
    
    if course_id:
        # Filter by course
        query = query.join(course_document_links).filter(course_document_links.c.course_id == course_id)
    elif lecturer_id:
        # Filter by lecturer (Library view)
        query = query.filter(Document.lecturer_id == lecturer_id)
    else:
        return []

    docs = query.all()
    
    # Consistently enrich with course names for the UI
    results = []
    for doc in docs:
        course_names = [c.name for c in doc.courses]
        results.append({
            "id": str(doc.id),
            "name": doc.name,
            "type": doc.file_type,
            "status": doc.status,
            "is_visible": doc.is_visible,
            "course_name": ", ".join(course_names) if course_names else "Unassigned"
        })
    return results


@router.post("/api/materials/{document_id}/link")
async def link_material_to_course(document_id: str, course_id: str, db: Session = Depends(get_db)):
    from src.models import course_document_links
    # Check if exists
    existing = db.execute(course_document_links.select().where(
        course_document_links.c.course_id == course_id,
        course_document_links.c.document_id == document_id
    )).first()
    
    if not existing:
        db.execute(course_document_links.insert().values(course_id=course_id, document_id=document_id))
        db.commit()
    return {"message": "Linked successfully"}

@router.delete("/api/materials/{document_id}/link")
async def unlink_material_from_course(document_id: str, course_id: str, db: Session = Depends(get_db)):
    from src.models import course_document_links
    db.execute(course_document_links.delete().where(
        course_document_links.c.course_id == course_id,
        course_document_links.c.document_id == document_id
    ))
    db.commit()
    return {"message": "Unlinked successfully"}
@router.get("/api/student/courses/{course_id}/materials")
async def get_student_materials(course_id: UUID, db: Session = Depends(get_db)):
    """Returns materials for a student to view/download."""
    from src.models import course_document_links
    documents = db.query(Document).join(course_document_links).filter(
        course_document_links.c.course_id == course_id,
        Document.status == "indexed",
        Document.is_visible == True
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
    from src.models import course_document_links
    user = db.query(User).filter(User.id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='Student not found')
    course_ids = [course.id for course in user.enrolled_courses]
    documents = db.query(Document).join(course_document_links).filter(
        course_document_links.c.course_id.in_(course_ids), 
        Document.status == 'indexed',
        Document.is_visible == True
    ).all()
    results = []
    for doc in documents:
        course_names = [c.name for c in doc.courses if c.id in course_ids]
        results.append({
            'id': str(doc.id), 
            'name': doc.name, 
            'type': doc.file_type.upper() if doc.file_type else 'FILE', 
            'url': doc.storage_url, 
            'is_visible': doc.is_visible,
            'course_name': ", ".join(course_names) if course_names else "Library"
        })
    return results

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
async def get_roadmap(
    user_id: str, 
    course_id: Optional[str] = None, 
    all: Optional[bool] = Query(False),
    db: Session = Depends(get_db)
):
    from src.models import RoadmapItem
    
    # Filter by user and scope
    query = db.query(RoadmapItem).filter(RoadmapItem.student_id == user_id)
    
    if not all:
        if course_id:
            query = query.filter(RoadmapItem.course_id == course_id)
        else:
            # Get general items only if no course_id specified
            query = query.filter(RoadmapItem.course_id == None)
        
    existing_items = query.order_by(RoadmapItem.created_at.desc()).all()
    
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
                    "course_id": str(item.course_id) if item.course_id else None,
                    "sources": item.sources or [],
                    "actions": item.actions or []
                } for item in existing_items
            ]
        }
    
    # If no items found, just return empty (don't auto-generate)
    return {
        "ok": True,
        "items": []
    }

@router.post("/api/roadmap/refresh")
async def refresh_roadmap(user_id: str, course_id: Optional[str] = None, db: Session = Depends(get_db)):
    from src.models import RoadmapItem, ChatSession, ChatMessage, Course, Document, course_enrollments, course_document_links
    
    # 1. Delete old roadmap items
    delete_query = db.query(RoadmapItem).filter(RoadmapItem.student_id == user_id)
    if course_id:
        delete_query = delete_query.filter(RoadmapItem.course_id == course_id)
    else:
        # If general refresh, we might want to keep course-specific ones or delete all?
        # Standard behavior: delete general ones (where course_id is null)
        delete_query = delete_query.filter(RoadmapItem.course_id == None)
        
    delete_query.delete()
    db.commit()

    # 2. Collect context
    # Get courses to consider
    if course_id:
        course_ids = [course_id]
    else:
        enrolled_courses = db.query(Course.id).join(course_enrollments).filter(course_enrollments.c.student_id == user_id).all()
        course_ids = [c.id for c in enrolled_courses]
    
    # Get documents from these courses
    if course_ids:
        docs = db.query(Document).join(course_document_links).filter(course_document_links.c.course_id.in_(course_ids)).all()
    else:
        docs = []
    allowed_sources = list(set([d.name for d in docs]))
    
    # Get chat history (filter by course if specified)
    history_query = db.query(ChatMessage).join(ChatSession).filter(ChatSession.student_id == user_id)
    if course_id:
        history_query = history_query.filter(ChatSession.course_id == course_id)
    
    history = history_query.order_by(ChatMessage.created_at.desc()).limit(50).all()
    history_dicts = [{"role": m.role, "content": m.content} for m in reversed(history)]
    
    # 3. Call AI
    from src.roadmap.roadmap_service import generate_roadmap_with_llm
    items = generate_roadmap_with_llm(user_id, history_dicts, allowed_sources)
    
    # 4. Save to DB
    saved_items = []
    for item in items:
        new_item = RoadmapItem(
            student_id=user_id,
            course_id=course_id, # Can be None for general
            topic=item.get("topic", "Unknown"),
            description=item.get("description", ""),
            priority=item.get("priority", "medium"),
            progress=item.get("progress", 0),
            status=item.get("status", "todo"),
            sources=item.get("sources", []),
            actions=item.get("actions", [])
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
                "course_id": str(item.course_id) if item.course_id else None,
                "sources": item.sources,
                "actions": item.actions
            } for item in saved_items
        ]
    }

class RoadmapProgressUpdate(BaseModel):
    progress: Optional[int] = None
    actions: Optional[List[dict]] = None

@router.patch("/api/roadmap/{item_id}")
async def update_roadmap_progress(item_id: str, request: RoadmapProgressUpdate, db: Session = Depends(get_db)):
    from src.models import RoadmapItem
    item = db.query(RoadmapItem).filter(RoadmapItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Roadmap item not found")
    
    new_progress = request.progress
    new_actions = request.actions
    
    # Nếu gửi actions lên, tự động tính toán progress
    if new_actions is not None:
        item.actions = new_actions
        if len(new_actions) > 0:
            done_count = sum(1 for a in new_actions if a.get("done") is True)
            new_progress = int((done_count / len(new_actions)) * 100)
    
    if new_progress is not None:
        item.progress = new_progress
        if new_progress == 100:
            item.status = "done"
            # Nếu hoàn thành 100%, tự động tích toàn bộ các task/actions
            if item.actions:
                updated_actions = []
                for action in item.actions:
                    updated_actions.append({**action, "done": True})
                item.actions = updated_actions
        elif new_progress > 0:
            item.status = "in_progress"
        else:
            item.status = "todo"
            
    db.commit()
    return {"ok": True, "progress": item.progress, "status": item.status, "actions": item.actions}

@router.get("/api/student/revision")
async def get_student_revision_suggestions(user_id: str, db: Session = Depends(get_db)):
    from src.models import KnowledgeGap, RoadmapItem
    
    # 1. Lấy các lỗ hổng kiến thức đã phát hiện
    gaps = db.query(KnowledgeGap).filter(KnowledgeGap.student_id == user_id).order_by(KnowledgeGap.frequency.desc()).limit(5).all()
    
    # 2. Lấy các mục Roadmap quan trọng nhưng chưa xong
    urgent_roadmap = db.query(RoadmapItem).filter(
        RoadmapItem.student_id == user_id,
        RoadmapItem.priority == "high",
        RoadmapItem.progress < 50
    ).limit(3).all()
    
    suggestions = []
    
    # Map Gaps
    for gap in gaps:
        suggestions.append({
            "course_id": str(gap.course_id),
            "topic": gap.topic,
            "reason": f"Bạn đã hỏi về chủ đề này {gap.frequency} lần trong các cuộc hội thoại gần đây.",
            "difficulty": "High" if gap.frequency > 3 else "Medium"
        })
        
    # Map Roadmap
    for item in urgent_roadmap:
        # Tránh trùng lặp với gaps
        if any(s["topic"] == item.topic for s in suggestions):
            continue
        suggestions.append({
            "course_id": str(item.course_id) if item.course_id else None,
            "topic": item.topic,
            "reason": "Chủ đề ưu tiên cao trong lộ trình học tập của bạn.",
            "difficulty": "Medium"
        })
        
    # Nếu trống, trả về mặc định
    if not suggestions:
        suggestions = [
            {
                "topic": "Tổng quan khóa học",
                "reason": "Bắt đầu bằng việc ôn tập các khái niệm cơ bản.",
                "difficulty": "Low"
            }
        ]
        
    return {"suggestions": suggestions}
# --- Assessment Quiz Endpoints ---

class QuizGenerateRequest(BaseModel):
    user_id: str
    course_id: Optional[str] = None
    course_ids: Optional[List[str]] = None
    count: Optional[int] = 5
    topics: Optional[List[str]] = None
    title: Optional[str] = None

class QuizEvaluateRequest(BaseModel):
    user_id: str
    attempt_id: str
    answers: List[int]
    skip_roadmap: Optional[bool] = False

@router.post("/api/quiz/generate")
async def generate_quiz(request: QuizGenerateRequest, db: Session = Depends(get_db)):
    """
    Generates a personalized assessment quiz, saves as pending attempt, and returns attempt_id.
    """
    from src.quiz.quiz_service import generate_assessment_quiz
    from src.models import QuizAttempt
    
    ids = request.course_ids or ([request.course_id] if request.course_id else [])
    if not ids:
        raise HTTPException(status_code=400, detail="At least one course_id or course_ids must be provided")
        
    questions = generate_assessment_quiz(ids, count=request.count, topics=request.topics)
    if not questions:
        raise HTTPException(status_code=500, detail="Failed to generate quiz questions")
        
    # Save as pending attempt immediately
    new_attempt = QuizAttempt(
        student_id=request.user_id,
        course_ids=ids,
        questions=questions,
        answers=[], # Empty initially
        total=len(questions),
        status="pending",
        title=request.title or ("Ôn tập tổng hợp" if len(ids) > 1 else "Củng cố kiến thức")
    )
    db.add(new_attempt)
    db.commit()
    
    return {
        "attempt_id": str(new_attempt.id),
        "questions": questions
    }

@router.get("/api/quiz/history")
async def get_quiz_history(user_id: str, db: Session = Depends(get_db)):
    """
    Fetches the history of quiz attempts for a specific student.
    """
    from src.models import QuizAttempt
    attempts = db.query(QuizAttempt).filter(QuizAttempt.student_id == user_id).order_by(QuizAttempt.created_at.desc()).all()
    
    return {
        "attempts": [
            {
                "id": str(a.id),
                "course_ids": a.course_ids,
                "score": a.score,
                "total": a.total,
                "percentage": round((a.score / a.total) * 100, 1) if a.total > 0 and a.score is not None else 0,
                "status": a.status,
                "title": a.title,
                "created_at": a.created_at.isoformat()
            } for a in attempts
        ]
    }

@router.get("/api/quiz/{attempt_id}")
async def get_quiz_attempt(attempt_id: str, db: Session = Depends(get_db)):
    """
    Fetches a specific quiz attempt by ID.
    """
    from src.models import QuizAttempt
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
        
    return {
        "id": str(attempt.id),
        "questions": attempt.questions,
        "answers": attempt.answers,
        "status": attempt.status,
        "score": attempt.score,
        "total": attempt.total,
        "course_ids": attempt.course_ids,
        "created_at": attempt.created_at.isoformat()
    }

@router.post("/api/quiz/evaluate")
async def evaluate_quiz(request: QuizEvaluateRequest, db: Session = Depends(get_db)):
    """
    Evaluates quiz results, updates the existing attempt, and generates a roadmap if needed.
    """
    from src.quiz.quiz_service import evaluate_assessment_results
    from src.roadmap.roadmap_service import generate_roadmap_with_llm
    from src.models import QuizAttempt
    
    # 1. Fetch the existing attempt
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == request.attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Quiz attempt not found")
        
    # 2. Evaluate results
    result = evaluate_assessment_results(attempt.questions, request.answers)
    
    # 3. Update the attempt
    attempt.answers = request.answers
    attempt.score = float(result["score"])
    attempt.status = "completed"
    db.commit()

    # 4. Save/Return immediately if skip_roadmap is True
    if request.skip_roadmap:
        return {
            "ok": True,
            "result": result,
            "attempt_id": str(attempt.id),
            "message": "Củng cố kiến thức thành công. Kết quả đã được ghi nhận vào lịch sử."
        }

    # 5. Fetch history for context (for roadmap generation)
    # Use the first course from the attempt context
    c_id = attempt.course_ids[0] if attempt.course_ids else None
    
    history = db.query(ChatMessage).join(ChatSession).filter(ChatSession.student_id == request.user_id).limit(30).all()
    chat_history = [{"role": m.role, "content": m.content} for m in history]
    
    # 5. Get course sources
    course = db.query(Course).filter(Course.id == c_id).first() if c_id else None
    allowed_sources = [doc.name for doc in course.documents] if course else []
    
    # 6. Generate TARGETED roadmap
    new_items = generate_roadmap_with_llm(
        request.user_id, 
        chat_history, 
        allowed_sources, 
        assessment_gaps=result["gaps"]
    )
    
    # 7. Persist to DB (Replace existing roadmap items for this user/course)
    if c_id:
        db.query(RoadmapItem).filter(
            RoadmapItem.student_id == request.user_id,
            RoadmapItem.course_id == c_id
        ).delete()
    
    saved_items = []
    for item in new_items:
        new_item = RoadmapItem(
            student_id=request.user_id,
            course_id=c_id,
            topic=item["topic"],
            description=item["description"],
            priority=item["priority"],
            actions=item.get("actions", []),
            sources=item.get("sources", []),
            status="todo",
            progress=0
        )
        db.add(new_item)
        saved_items.append(new_item)
    
    db.commit()
    
    return {
        "ok": True,
        "result": result,
        "attempt_id": str(attempt.id),
        "items": [
            {
                "id": str(item.id),
                "topic": item.topic,
                "description": item.description,
                "priority": item.priority,
                "progress": item.progress,
                "status": item.status,
                "actions": item.actions,
                "sources": item.sources
            } for item in saved_items
        ]
    }
