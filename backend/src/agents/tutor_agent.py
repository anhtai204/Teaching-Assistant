"""
Tutor agent that composes grounded responses from retrieved chunks.
"""

from __future__ import annotations
from typing import Dict, List
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from src.config import DEFAULT_MODEL, GOOGLE_API_KEY, OPENAI_API_KEY
import logging
from src.graph.state import AgentState

logger = logging.getLogger(__name__)

def get_llm(temperature=0.1, timeout=30):
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
    ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=GOOGLE_API_KEY)
])


import re

def _format_context(chunks: List[dict]) -> str:
    if not chunks:
        return ""
    lines = []
    for i, c in enumerate(chunks, start=1):
        meta = c.get("metadata") or {}
        src = meta.get("source", "unknown")
        doc_id = meta.get("id", "")
        is_visible = meta.get("is_visible", True)
        text = c.get('text', '')
        
        # Tìm timestamp đầu tiên trong chunk nếu có
        match = re.search(r'\[t=(\d+)s\]', text)
        
        if match and src.lower().endswith(('.mp4', '.mp3', '.mov', '.wav', '.m4a', '.webm')):
            t_sec = match.group(1)
            markdown_link = f"[Nguồn: {src} (tại {t_sec}s)](/student/materials/viewer/{doc_id}?visible={is_visible}&t={t_sec})"
        else:
            markdown_link = f"[Nguồn: {src}](/student/materials/viewer/{doc_id}?visible={is_visible})"
            
        lines.append(f"TÀI LIỆU SỐ {i}:\n- LINK TRÍCH DẪN BẮT BUỘC: {markdown_link}\n- NỘI DUNG: {text}")
        
    return "\n\n".join(lines)


def tutor_node(state: AgentState) -> dict:
    """Generate a flexible, grounded tutoring answer for the graph."""
    
    # Context messages (contains the personalized prompt from load_memory_node)
    # The personalized prompt is at messages[0]
    base_messages = state["messages"]
    context_text = _format_context(state.get("context", []))
    
    # We keep it simple: Use the messages from load_memory_node
    # If we have course context, we append it as a system message to guide the answer.
    rebuilt_messages = list(base_messages)
    
    # Use lower temperature for academic grounding
    _strict_llm = get_llm(temperature=0.1, timeout=30).with_fallbacks([
        ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=GOOGLE_API_KEY)
    ])

    if context_text:
        from langchain_core.messages import SystemMessage
        rebuilt_messages.insert(1, SystemMessage(content=(
            "BẠN ĐANG TRONG CHẾ ĐỘ 'KIẾM CHỨNG TÀI LIỆU'. CHỈ ĐƯỢC SỬ DỤNG DỮ LIỆU DƯỚI ĐÂY:\n\n"
            "QUY TẮC TRÍCH DẪN BẮT BUỘC (SỐNG CÒN):\n"
            "1. TẤT CẢ các câu khẳng định lấy từ tài liệu PHẢI có link trích dẫn ngay sau dấu chấm câu.\n"
            "2. Tuyệt đối KHÔNG tự bịa ra link. Hãy COPY Y NGUYÊN chuỗi ở mục `LINK TRÍCH DẪN BẮT BUỘC` của tài liệu tương ứng và dán vào cuối câu trả lời.\n\n"
            f"--- DANH SÁCH TÀI LIỆU ---\n{context_text}\n--- HẾT TÀI LIỆU ---"
        )))


    # Log for debug
    logger.info("[TUTOR NODE] Final system prompt content:\n%s", rebuilt_messages[1].content if len(rebuilt_messages) > 1 else "No context message")
    
    resp = _strict_llm.invoke(rebuilt_messages)
    
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