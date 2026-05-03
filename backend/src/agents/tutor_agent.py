"""
Tutor agent that composes grounded responses from retrieved chunks.
"""

from __future__ import annotations

from typing import Dict, List

from langchain_google_genai import ChatGoogleGenerativeAI

from src.config import DEFAULT_MODEL, GOOGLE_API_KEY

_llm = ChatGoogleGenerativeAI(model=DEFAULT_MODEL, google_api_key=GOOGLE_API_KEY, temperature=0.3)


def _format_context(chunks: List[dict]) -> str:
    if not chunks:
        return ""
    lines = []
    for i, c in enumerate(chunks, start=1):
        src = (c.get("metadata") or {}).get("source", "unknown")
        lines.append(f"[{i}] source={src}\n{c.get('text', '')}")
    return "\n\n".join(lines)


def generate_answer(question: str, chunks: List[dict]) -> Dict[str, str]:
    """Generate a flexible, grounded tutoring answer."""
    context = _format_context(chunks)

    if not context:
        return {"answer": "Xin lỗi, tôi không tìm thấy thông tin này trong tài liệu khóa học. Vui lòng đặt câu hỏi liên quan đến nội dung bài học hoặc liên hệ Giảng viên."}

    prompt = f"""Bạn là một Robot Trợ giảng CỰC KỲ NGHIÊM TÚC.
Nhiệm vụ: Chỉ được phép trả lời dựa trên thông tin có trong Context dưới đây.

QUY TẮC BẮT BUỘC:
1. BẮT ĐẦU câu trả lời bằng cụm từ: "Dựa trên tài liệu khóa học, ..."
2. CHỈ TRÍCH DẪN các ý có trong Context. Nếu Context chỉ có 1 dòng, bạn chỉ được trả lời trong phạm vi 1 dòng đó.
3. CẤM TUYỆT ĐỐI: Không được giải thích thêm, không được đưa kiến thức cá nhân, không được phân tích các khái niệm nếu Context không mô tả chúng.
4. KHÔNG CÓ TRÍCH DẪN = KHÔNG TRẢ LỜI: Mọi thông tin đưa ra PHẢI kèm theo thẻ trích dẫn [1], [2]... ở cuối câu hoặc đoạn.
5. Nếu Context trống hoặc không chứa câu trả lời, bạn BUỘC PHẢI trả lời: "Xin lỗi, tôi không tìm thấy thông tin này trong tài liệu khóa học. Vui lòng liên hệ Giảng viên."

Context:
{context}

Question: {question}
"""
    resp = _llm.invoke(prompt)
    return {"answer": (resp.content or "").strip()}