from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.database import get_db
from src.models import ChatMessage, ChatSession, Course
from typing import List
import uuid

router = APIRouter(prefix="/api/moderation", tags=["Moderation"])

@router.get("/pending")
async def get_pending_moderation(course_id: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Returns messages that are flagged by students or marked as unanswered by AI.
    """
    query = (
        db.query(ChatMessage)
        .join(ChatSession)
        .filter((ChatMessage.is_flagged == True) | (ChatMessage.was_unanswered == True) | (ChatMessage.feedback_rating == -1))
        .filter(ChatMessage.manual_answer == None)
    )
    
    if course_id and course_id != "null" and course_id != "undefined":
        query = query.filter(ChatSession.course_id == course_id)
        
    pending_messages = query.order_by(ChatMessage.created_at.desc()).all()
    
    return [
        {
            "id": str(msg.id),
            "session_id": str(msg.session_id),
            "content": msg.content,
            "role": msg.role,
            "is_flagged": msg.is_flagged,
            "was_unanswered": msg.was_unanswered,
            "created_at": msg.created_at,
            "course_id": str(msg.session.course_id) if msg.session else None,
            "course_name": msg.session.course.name if msg.session and msg.session.course else "Unknown Course",
            # For context, we might want to get the user's question before this assistant response
            "student_question": (
                db.query(ChatMessage)
                .filter(ChatMessage.session_id == msg.session_id)
                .filter(ChatMessage.created_at < msg.created_at)
                .filter(ChatMessage.role == "user")
                .order_by(ChatMessage.created_at.desc())
                .first()
            ).content if (msg.role == "assistant" and db.query(ChatMessage)
                .filter(ChatMessage.session_id == msg.session_id)
                .filter(ChatMessage.created_at < msg.created_at)
                .filter(ChatMessage.role == "user")
                .first()) else (msg.content if msg.role == "user" else "Unknown Question")
        }
        for msg in pending_messages
    ]

@router.post("/resolve/{message_id}")
async def resolve_message(message_id: str, payload: dict, db: Session = Depends(get_db)):
    """
    Lecturer provides a manual answer to a flagged/unanswered message.
    """
    manual_answer = payload.get("manual_answer")
    if not manual_answer:
        raise HTTPException(status_code=400, detail="Manual answer is required")
        
    msg = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    msg.manual_answer = manual_answer
    msg.is_flagged = False  # Mark as resolved to clear from queue
    # If it's the assistant's message we are correcting, we update it.
    # If it was a user question that was unanswered, the manual_answer serves as the fix.
    
    db.commit()
    return {"status": "success", "message": "Question resolved with manual answer"}
