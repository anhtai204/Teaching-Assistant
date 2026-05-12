"""
Tutor agent that composes grounded responses from retrieved chunks.
"""

from __future__ import annotations
from typing import Dict, List
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from src.config import DEFAULT_MODEL, GOOGLE_API_KEY, OPENAI_API_KEY
import logging
import re
from src.graph.state import AgentState
from src.tools.request_tool import create_material_request_tool
from langchain_core.messages import SystemMessage, ToolMessage

logger = logging.getLogger(__name__)

def get_llm(temperature=0.1, timeout=20):
    """Factory to get the correct LLM based on DEFAULT_MODEL."""
    model_name = DEFAULT_MODEL.lower()
    
    if "gpt" in model_name:
        return ChatOpenAI(
            model=DEFAULT_MODEL,
            api_key=OPENAI_API_KEY,
            temperature=temperature,
            max_retries=2,
            timeout=timeout
        )
    elif "gemini" in model_name:
        return ChatGoogleGenerativeAI(
            model=DEFAULT_MODEL,
            google_api_key=GOOGLE_API_KEY,
            temperature=temperature,
            timeout=timeout
        )
    else:
        # Fallback to OpenAI if unknown
        return ChatOpenAI(
            model="gpt-4o-mini",
            api_key=OPENAI_API_KEY,
            temperature=temperature,
            timeout=timeout
        )

# Base LLM with fallback
_llm = get_llm().with_fallbacks([
    ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=GOOGLE_API_KEY)
])


import re

def _format_context(chunks: List[dict]) -> str:
    if not chunks:
        return ""
    lines = []
    for i, c in enumerate(chunks, start=1):
        meta = c.get("metadata") or {}
        src = meta.get("source", "unknown")
        doc_id = meta.get("document_id") or meta.get("id", "")
        is_visible = meta.get("is_visible", True)
        text = c.get('content') or c.get('text', '')
        page = meta.get("page")
        
        # Determine the anchor/label
        # 1. Video Timestamp
        match = re.search(r'\[t=(\d+)s\]', text)
        if match and src.lower().endswith(('.mp4', '.mp3', '.mov', '.wav', '.m4a', '.webm')):
            t_sec = match.group(1)
            markdown_link = f"[Nguồn: {src} (tại {t_sec}s)](/student/materials/viewer/{doc_id}?visible={is_visible}&t={t_sec})"
        # 2. PDF/Document Page
        elif page:
            markdown_link = f"[Nguồn: {src} (Trang {page})](/student/materials/viewer/{doc_id}?visible={is_visible}#page={page})"
        # 3. Text-based fragment (for MD, TXT, DOCX)
        else:
            # Just link to the document as requested
            markdown_link = f"[Nguồn: {src}](/student/materials/viewer/{doc_id}?visible={is_visible})"
            
        lines.append(f"TÀI LIỆU SỐ {i}:\n- LINK TRÍCH DẪN BẮT BUỘC: {markdown_link}\n- NỘI DUNG: {text}")
        
    return "\n\n".join(lines)


def tutor_node(state: AgentState) -> dict:
    """Generate a flexible, grounded tutoring answer for the graph."""
    
    base_messages = state["messages"]
    context_text = _format_context(state.get("context", []))
    
    rebuilt_messages = list(base_messages)
    
    # Use lower temperature for academic grounding
    _strict_llm = get_llm(temperature=0.1, timeout=20).with_fallbacks([
        ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=GOOGLE_API_KEY)
    ])

    if context_text:
        from langchain_core.messages import SystemMessage
        rebuilt_messages.insert(1, SystemMessage(content=(
            "BẠN ĐANG TRONG CHẾ ĐỘ 'HỖ TRỢ HỌC TẬP CHÍNH XÁC'. CHỈ ĐƯỢC SỬ DỤNG DỮ LIỆU DƯỚI ĐÂY ĐỂ TRẢ LỜI:\n\n"
            "QUY TẮC TRÍCH DẪN (QUAN TRỌNG NHẤT):\n"
            "1. Mọi thông tin bạn lấy từ tài liệu PHẢI được theo sau bởi 'LINK TRÍCH DẪN BẮT BUỘC' tương ứng.\n"
            "2. Đặt link trích dẫn ngay sau ý văn hoặc cuối câu. Ví dụ: 'Định thức ma trận là... [Nguồn: Slide 1 (Trang 5)](...)'.\n"
            "3. Nếu thông tin đến từ Video, hãy đảm bảo link có chứa thông tin thời gian (t=...).\n"
            "4. Giữ phong cách giảng dạy nhiệt tình, dễ hiểu nhưng phải cực kỳ trung thành với nguồn tin.\n"
            "5. NẾU THÔNG TIN KHÔNG CÓ TRONG DỮ LIỆU TRÊN: Hãy xin lỗi và đề xuất sinh viên gửi 'Yêu cầu tài liệu' tới giảng viên. Bạn có thể tự thực hiện việc này nếu sinh viên đồng ý.\n\n"
            f"--- KHO TRI THỨC CỦA KHÓA HỌC ---\n{context_text}\n--- HẾT TRI THỨC ---"
        )))


    # Log for debug
    logger.info("[TUTOR NODE] Final system prompt content:\n%s", rebuilt_messages[1].content if len(rebuilt_messages) > 1 else "No context message")
    
    # Bind tools to the LLM
    tools = [create_material_request_tool]
    llm_with_tools = _strict_llm.bind_tools(tools)
    
    resp = llm_with_tools.invoke(rebuilt_messages)
    
    # Handle Tool Calls
    if resp.tool_calls:
        new_messages = [resp]
        for tool_call in resp.tool_calls:
            if tool_call["name"] == "create_material_request_tool":
                # Execute tool
                tool_result = create_material_request_tool.invoke(tool_call["args"])
                new_messages.append(ToolMessage(
                    tool_call_id=tool_call["id"],
                    content=tool_result
                ))
        
        # Get final response after tool execution
        final_resp = _strict_llm.invoke(rebuilt_messages + new_messages)
        logger.info("[TUTOR NODE] Final LLM Response after Tool:\n%s", final_resp.content)
        return {"messages": [final_resp]}

    logger.info("[TUTOR NODE] LLM Raw Response:\n%s", resp.content)
    return {"messages": [resp]}

# For backward compatibility if any script calls generate_answer
def generate_answer(question: str, chunks: List[dict]) -> Dict[str, str]:
    context = _format_context(chunks)
    
    system_instruction = (
        "You are an AI Teaching Assistant. "
        "If context is provided, use it to answer the question. "
        "If the question is a greeting or general talk, answer politely. "
        "Only if the question is academic and you have no info, suggest contacting the lecturer."
    )
    
    prompt = [
        {"role": "system", "content": system_instruction},
        {"role": "system", "content": f"Context:\n{context}" if context else "No specific course context found."},
        {"role": "user", "content": question}
    ]
    
    resp = _llm.invoke(prompt)
    return {"answer": (resp.content or "").strip()}