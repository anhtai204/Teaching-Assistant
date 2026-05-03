from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from src.database import get_db
from src.models import ChatMessage, ChatSession, KnowledgeGap
from typing import List
import uuid

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/overview")
async def get_analytics_overview(course_id: str, db: Session = Depends(get_db)):
    """
    Returns high-level stats for the lecturer dashboard.
    """
    total_chats = db.query(ChatSession).filter(ChatSession.course_id == course_id).count()
    
    # AI Resolution rate (messages that aren't flagged or unanswered)
    total_assistant_msgs = (
        db.query(ChatMessage)
        .join(ChatSession)
        .filter(ChatSession.course_id == course_id)
        .filter(ChatMessage.role == "assistant")
        .count()
    )
    
    unresolved_msgs = (
        db.query(ChatMessage)
        .join(ChatSession)
        .filter(ChatSession.course_id == course_id)
        .filter((ChatMessage.is_flagged == True) | (ChatMessage.was_unanswered == True))
        .count()
    )
    
    resolution_rate = 0
    if total_assistant_msgs > 0:
        resolution_rate = ((total_assistant_msgs - unresolved_msgs) / total_assistant_msgs) * 100
        
    # Estimate time saved: Assume each resolved question saves 5 minutes of lecturer time
    hours_saved = ((total_assistant_msgs - unresolved_msgs) * 5) / 60
    
    return {
        "total_chats": total_chats,
        "total_questions": total_assistant_msgs,
        "resolution_rate": round(resolution_rate, 1),
        "hours_saved": round(hours_saved, 1)
    }

@router.get("/knowledge-gaps")
async def get_knowledge_gaps(course_id: str, db: Session = Depends(get_db)):
    """
    Returns aggregated topics that students are struggling with.
    """
    gaps = (
        db.query(KnowledgeGap)
        .filter(KnowledgeGap.course_id == course_id)
        .order_by(KnowledgeGap.frequency.desc())
        .limit(10)
        .all()
    )
    
    return [
        {
            "topic": gap.topic,
            "frequency": gap.frequency,
            "gap_score": gap.gap_score,
            "last_detected": gap.last_detected_at
        }
        for gap in gaps
    ]
