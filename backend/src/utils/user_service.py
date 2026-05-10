from sqlalchemy.orm import Session
from src.models import User
from uuid import UUID

def get_user_profile_sync(db: Session, user_id: str) -> dict:
    try:
        # Try to parse as UUID
        uid = UUID(user_id)
        user = db.query(User).filter(User.id == uid).first()
        if user:
            # Lấy danh sách tên các khóa học mà sinh viên đã tham gia
            course_names = [c.name for c in user.enrolled_courses]
            
            return {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "courses": course_names
            }
    except Exception:
        pass
    return {}
