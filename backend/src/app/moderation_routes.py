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
    Excludes messages that have already been resolved by the lecturer.
    """
    query = (
        db.query(ChatMessage)
        .join(ChatSession)
        .filter((ChatMessage.is_flagged == True) | (ChatMessage.feedback_rating == -1))
        .filter((ChatMessage.feedback_comment == None) | (~ChatMessage.feedback_comment.like('%[RESOLVED]%')))
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

from pydantic import BaseModel

class ResolveRequest(BaseModel):
    manual_answer: str

@router.post("/resolve/{message_id}")
async def resolve_moderation(message_id: str, req: ResolveRequest, db: Session = Depends(get_db)):
    """
    Resolves a flagged message by appending the lecturer's manual answer directly into the message content,
    while retaining the student's original flag.
    """
    msg = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    # We DO NOT unflag the message, so the student still sees their feedback was registered.
    
    # Append the manual answer directly to the existing message content
    if req.manual_answer and req.manual_answer.strip():
        correction_block = f"\n\n---\n👨‍🏫 **Đính chính từ Giảng viên:**\n{req.manual_answer}"
        # Avoid duplicate appending if clicked twice somehow
        if "👨‍🏫 **Đính chính từ Giảng viên:**" not in msg.content:
            msg.content += correction_block
            
        # Mark as resolved in feedback_comment
        current_comment = msg.feedback_comment or ""
        if "[RESOLVED]" not in current_comment:
            msg.feedback_comment = f"[RESOLVED] {current_comment}".strip()
        
    db.commit()
    return {"status": "success", "message": "Moderation resolved with in-place correction"}

class SatisfactionRequest(BaseModel):
    is_satisfied: bool

@router.post("/messages/{message_id}/satisfaction")
async def student_satisfaction(message_id: str, req: SatisfactionRequest, db: Session = Depends(get_db)):
    """
    Handles student feedback on the lecturer's correction.
    If satisfied, unflags the message.
    """
    msg = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    if req.is_satisfied:
        msg.is_flagged = False
        if msg.feedback_rating == -1:
            msg.feedback_rating = None
            
    db.commit()
    return {"status": "success"}
