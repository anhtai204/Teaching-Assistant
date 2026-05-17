from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from src.database import get_db
from src.models import ChatMessage, ChatSession, KnowledgeGap
from typing import List
import uuid

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/overview")
async def get_analytics_overview(course_id: str = None, lecturer_id: str = None, db: Session = Depends(get_db)):
    from src.models import Course
    
    target_course_ids = []
    if course_id and course_id != "null":
        target_course_ids = [course_id]
    elif lecturer_id and lecturer_id != "null":
        courses = db.query(Course).filter(Course.lecturer_id == lecturer_id).all()
        target_course_ids = [str(c.id) for c in courses]

    if not target_course_ids:
        return {"total_chats": 0, "total_questions": 0, "resolution_rate": 0, "hours_saved": 0}
        
    total_chats = db.query(ChatSession).filter(ChatSession.course_id.in_(target_course_ids)).count()
    
    # AI Resolution rate (messages that aren't flagged or unanswered)
    total_assistant_msgs = (
        db.query(ChatMessage)
        .join(ChatSession)
        .filter(ChatSession.course_id.in_(target_course_ids))
        .filter(ChatMessage.role == "assistant")
        .count()
    )
    
    unresolved_msgs = (
        db.query(ChatMessage)
        .join(ChatSession)
        .filter(ChatSession.course_id.in_(target_course_ids))
        .filter(ChatMessage.is_flagged == True)
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
async def get_knowledge_gaps(course_id: str = None, lecturer_id: str = None, db: Session = Depends(get_db)):
    from src.models import Course
    
    target_course_ids = []
    if course_id and course_id != "null":
        target_course_ids = [course_id]
    elif lecturer_id and lecturer_id != "null":
        courses = db.query(Course).filter(Course.lecturer_id == lecturer_id).all()
        target_course_ids = [str(c.id) for c in courses]

    if not target_course_ids:
        return []
        
    gaps = (
        db.query(KnowledgeGap)
        .filter(KnowledgeGap.course_id.in_(target_course_ids))
        .order_by(KnowledgeGap.frequency.desc())
        .limit(10)
        .all()
    )
    
    return [
        {
            "topic": gap.topic,
            "frequency": gap.frequency,
            "last_detected": gap.last_detected_at
        }
        for gap in gaps
    ]

@router.post("/analyze")
async def analyze_class_insights(course_id: str, db: Session = Depends(get_db)):
    if course_id == "null" or not course_id:
        raise HTTPException(status_code=400, detail="Invalid course ID")
        
    from src.analytics.analytics_service import generate_knowledge_gaps_with_llm
    
    # 1. Fetch unresolved/negative feedback chats
    unresolved_msgs = (
        db.query(ChatMessage)
        .join(ChatSession)
        .filter(ChatSession.course_id == course_id)
        .filter((ChatMessage.is_flagged == True) | (ChatMessage.feedback_rating == -1))
        .limit(50)
        .all()
    )
    
    if not unresolved_msgs:
        return {"message": "No unresolved chats to analyze", "gaps_found": 0}
        
    # Format for LLM
    history_data = []
    for msg in unresolved_msgs:
        # Get the preceding user message if this is an assistant message
        user_msg_content = "Unknown"
        if msg.role == "assistant":
            user_msg = db.query(ChatMessage).filter(
                ChatMessage.session_id == msg.session_id,
                ChatMessage.role == "user",
                ChatMessage.created_at < msg.created_at
            ).order_by(ChatMessage.created_at.desc()).first()
            if user_msg:
                user_msg_content = user_msg.content
                
        history_data.append({
            "user_msg": user_msg_content if msg.role == "assistant" else msg.content,
            "ai_msg": msg.content if msg.role == "assistant" else "N/A",
            "feedback": f"Flagged: {msg.is_flagged}, Rating: {msg.feedback_rating}"
        })
        
    # 2. Call LLM
    new_gaps = generate_knowledge_gaps_with_llm(history_data)
    
    # 3. Save to DB
    saved_count = 0
    if new_gaps:
        # Optional: Clear old gaps for this course to keep it fresh
        db.query(KnowledgeGap).filter(KnowledgeGap.course_id == course_id).delete()
        
        for gap_data in new_gaps:
            gap_score = gap_data.get("gap_score", 5.0)
            new_gap = KnowledgeGap(
                course_id=course_id,
                topic=gap_data.get("topic", "Unknown"),
                frequency=gap_data.get("frequency", 1),
                metadata_json={
                    "gap_score": gap_score,
                    "severity": "high" if gap_score >= 7.0 else ("medium" if gap_score >= 4.0 else "low"),
                    "analysis_source": "llm_class_insights_v2"
                }
            )
            db.add(new_gap)
            saved_count += 1
            
        db.commit()
        
    return {"message": "Analysis complete", "gaps_found": saved_count}

@router.get("/roadmap")
async def get_class_roadmap_progress(course_id: str, db: Session = Depends(get_db)):
    if course_id == "null" or not course_id:
        return []
        
    from src.models import RoadmapItem, course_enrollments, User
    
    # Get all students enrolled in the course
    enrolled_student_ids = [
        row[0] for row in db.query(course_enrollments.c.student_id)
        .filter(course_enrollments.c.course_id == course_id)
        .all()
    ]
    
    if not enrolled_student_ids:
        return []
        
    # Get all roadmap items for these students
    items = (
        db.query(RoadmapItem.topic, func.avg(RoadmapItem.progress).label("avg_progress"), func.count(RoadmapItem.id).label("student_count"))
        .filter(RoadmapItem.student_id.in_(enrolled_student_ids))
        .group_by(RoadmapItem.topic)
        .order_by(func.count(RoadmapItem.id).desc())
        .limit(15)
        .all()
    )
    
    return [
        {
            "topic": item.topic,
            "avg_progress": round(item.avg_progress, 1),
            "student_count": item.student_count
        }
        for item in items
    ]
