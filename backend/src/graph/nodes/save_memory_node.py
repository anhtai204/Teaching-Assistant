"""
LangGraph node: save_memory

Runs after the LLM produces its final (non-tool) response.
Persists conversation turns and refreshes the session summary.
"""

import logging

from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

from src.config import (
    MEMORY_SUMMARY_MODEL,
    MEMORY_SUMMARY_TURNS,
    GOOGLE_API_KEY,
    OPENAI_API_KEY,
)
from src.graph.state import AgentState
from src.memory.memory_service import (
    refresh_session_summary_with_llm,
    save_conversation_turn,
    save_memory,
)

logger = logging.getLogger(__name__)

# LLM client for summary
_summary_llm = None

def _get_summary_llm():
    global _summary_llm
    if _summary_llm is None:
        # Primary (OpenAI)
        primary = ChatOpenAI(
            model=MEMORY_SUMMARY_MODEL,
            api_key=OPENAI_API_KEY,
            temperature=0,
            max_retries=1,
            timeout=10,
        )
        # Fallback (Gemini)
        fallback = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=GOOGLE_API_KEY,
            temperature=0,
        )
        _summary_llm = primary.with_fallbacks([fallback])
    return _summary_llm


def save_memory_node(state: AgentState) -> dict:
    """Persist memory, conversation turn, and session summary."""

    user_id = state["user_id"]
    session_id = state["session_id"]

    # Extract user question and assistant answer from messages
    user_input = ""
    assistant_answer = ""

    for msg in state["messages"]:
        if msg.type == "human":
            user_input = msg.content
        elif msg.type == "ai" and not getattr(msg, "tool_calls", None):
            assistant_answer = msg.content or ""

    # Use the *last* user message & last assistant message
    for msg in reversed(state["messages"]):
        if msg.type == "ai" and not getattr(msg, "tool_calls", None):
            assistant_answer = msg.content or ""
            break

    for msg in reversed(state["messages"]):
        if msg.type == "human":
            user_input = msg.content
            break

    # 1. Save long-term facts
    saved_count = save_memory(user_id, user_input, session_id=session_id)
    logger.info("[MEMORY SAVE] saved %d items", saved_count)

    # 2. Save conversation turn
    save_conversation_turn(
        user_id,
        user_input,
        str(assistant_answer),
        session_id=session_id,
    )
    logger.info("[CONTEXT SAVE] saved 1 turn")

    # 3. Refresh session summary (uses LangChain Gemini)
    llm = _get_summary_llm()
    summary = refresh_session_summary_with_llm(
        llm,
        user_id,
        model=MEMORY_SUMMARY_MODEL,
        max_turns_for_summary=MEMORY_SUMMARY_TURNS,
    )
    logger.info("[SUMMARY SAVE] length %d", len(summary))

    # Collect sources from tool messages
    sources = list(state.get("sources", []))
    import json
    for msg in state["messages"]:
        if msg.type == "tool":
            try:
                data = json.loads(msg.content)
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict):
                            src = item.get("source")
                            if src and str(src) not in sources:
                                sources.append(str(src))
            except (json.JSONDecodeError, TypeError):
                pass

    return {"sources": sources}