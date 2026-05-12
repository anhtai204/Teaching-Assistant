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
        .filter((ChatMessage.is_flagged == True) | (ChatMessage.feedback_rating == -1))
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

