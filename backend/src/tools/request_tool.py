from langchain_core.tools import tool
from src.database import SessionLocal
from src.models import MaterialRequest
from typing import Optional

@tool
def create_material_request_tool(student_id: str, course_id: str, topic_name: str, description: Optional[str] = None) -> str:
    """
    Creates a formal request for new learning materials from the lecturer.
    Use this when a student asks for information that is NOT found in the existing course materials.
    """
    db = SessionLocal()
    try:
        new_request = MaterialRequest(
            student_id=student_id,
            course_id=course_id,
            topic_name=topic_name,
            description=description
        )
        db.add(new_request)
        db.commit()
        return f"✅ Thành công! Tôi đã gửi yêu cầu tài liệu về chủ đề '{topic_name}' tới giảng viên của bạn."
    except Exception as e:
        db.rollback()
        return f"❌ Lỗi khi gửi yêu cầu: {str(e)}"
    finally:
        db.close()
