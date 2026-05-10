"""
LangGraph node: load_memory

Runs at the start of each invocation.  Fetches long-term facts and
session summary from the memory service and injects them into the
system prompt that sits at `messages[0]`.
"""

from src.memory.memory_service import load_long_term_memory
from src.memory.memory_service import load_semantic_memory
from src.memory.memory_service import load_episodic_memory
import logging

from langchain_core.messages import SystemMessage

from src.config import (
    MEMORY_CONTEXT_TURNS,
    MEMORY_FACT_MAX_DISTANCE,
    MEMORY_FACT_TOP_K,
)
from src.graph.state import AgentState
from src.memory.memory_service import (
    load_context_messages,
    load_memory,
    load_session_context_summary,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are an AI Teaching Assistant.

You MUST use the tool `search_course_material` before answering any question related to:
- lectures
- course content
- documents
- definitions in the syllabus

Tool usage rules:
- Always call tool first if question is academic/content-based
- If tool returns multiple chunks, synthesize them
- If tool returns empty, say you don't know

You are not allowed to answer from memory for course-related questions.

Output format:
Answer: ...
Sources:
- source1
- source2
"""


def load_memory_node(state: AgentState) -> dict:
    """Fetch memory + session summary and prepend a system message."""

    user_id = state["user_id"]
    profile = state.get("user_profile") or {}
    session_id = state.get("session_id", "default")
    
    # Extract user's latest message text for memory query
    user_input = ""
    for msg in reversed(state["messages"]):
        if msg.type == "human":
            user_input = msg.content
            break

    # --- Memory recall ---
    # We use a combined query for the system block
    semantic = load_semantic_memory(user_id, user_input, top_k=3)
    long_term = load_long_term_memory(user_id, user_input, top_k=2)
    episodic = load_episodic_memory(user_id, user_input, session_id=session_id, top_k=2)
    
    memory_lines = []
    seen = set()
    for m in semantic + long_term + episodic:
        txt = m.strip()
        if txt and txt not in seen:
            seen.add(txt)
            memory_lines.append(f"- {txt}")
            
    memory_block = ""
    if memory_lines:
        memory_block = "\nUser Memory & Context:\n" + "\n".join(memory_lines)

    # --- Session summary ---
    session_summary = load_session_context_summary(user_id)
    summary_block = ""
    if session_summary:
        summary_block = f"\nSession Summary:\n{session_summary}"

    # --- Profile block ---
    enrolled_courses = ", ".join(profile.get("courses") or ["None"])
    profile_block = (
        f"Hồ sơ người dùng:\n"
        f"- Tên: {profile.get('full_name') or 'Unknown'}\n"
        f"- Vai trò: {profile.get('role') or 'Unknown'}\n"
        f"- Email: {profile.get('email') or 'Unknown'}\n"
        f"- Các khóa học đang tham gia: {enrolled_courses}\n"
    )

    # --- Context messages (recent conversation turns) ---
    context_messages = load_context_messages(
        user_id,
        session_id=session_id,
        max_turns=MEMORY_CONTEXT_TURNS,
    ) or []

    logger.info("[MEMORY DEBUG] User ID: %s", user_id)
    logger.info("[MEMORY DEBUG] Profile: %s", profile)
    logger.info("[MEMORY DEBUG] Memory Block: %s", memory_block)
    logger.info("[MEMORY DEBUG] loaded %d facts, %d context turns", len(memory_lines), len(context_messages))

    # Build final system prompt in Vietnamese for consistency
    personalized_system = (
        "Bạn là một trợ lý giảng dạy AI chuyên nghiệp và nghiêm túc. Nhiệm vụ của bạn là hỗ trợ người dùng dựa TRÊN DUY NHẤT các tài liệu được cung cấp.\n\n"
        "QUY TẮC BẮT BUỘC (KHÔNG ĐƯỢC VI PHẠM):\n"
        "1. ĐỐI VỚI CÂU HỎI HỌC THUẬT/KIẾN THỨC: Bạn CHỈ được phép sử dụng thông tin từ công cụ `search_course_material`. Tuyệt đối KHÔNG sử dụng kiến thức bên ngoài hoặc kiến thức sẵn có của bạn.\n"
        "2. NẾU KHÔNG TÌM THẤY: Nếu tài liệu cung cấp không chứa câu trả lời, bạn PHẢI trả lời: 'Tôi xin lỗi, thông tin này không có trong tài liệu khóa học hiện tại.' KHÔNG được đoán hoặc giả định.\n"
        "3. TRÍCH DẪN (CITATION): Mọi câu trả lời dựa trên tài liệu PHẢI kèm theo trích dẫn nguồn bằng Markdown Link: [Nguồn: <tên_file>](/student/materials/viewer/<id>?visible=True).\n"
        "4. CÁ NHÂN HÓA: Hãy luôn gọi người dùng bằng tên của họ từ phần Profile bên dưới để tạo sự gần gũi, nhưng vẫn giữ vững quy tắc số 1 và 2.\n\n"
        f"{summary_block}\n\n"
        "--- DỮ LIỆU NGƯỜI DÙNG (DÙNG ĐỂ XƯNG HÔ VÀ NHẬN DIỆN) ---\n"
        f"{profile_block}\n"
        f"{memory_block}\n"
    )
    
    system_msg = SystemMessage(content=personalized_system)

    # Rebuild messages: system → context history → current user message
    from langchain_core.messages import HumanMessage, AIMessage

    rebuilt: list = [system_msg]
    for cm in context_messages:
        role = cm.get("role", "user")
        content = cm.get("content", "")
        if role == "user":
            rebuilt.append(HumanMessage(content=content))
        elif role == "assistant":
            rebuilt.append(AIMessage(content=content))

    # Append the current user message (last human message from state)
    if user_input:
        rebuilt.append(HumanMessage(content=user_input))

    return {
        "messages": rebuilt,
        "memory_block": memory_block,
        "summary_block": summary_block,
        "sources": [],
    }
