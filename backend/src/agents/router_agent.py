"""
Router agent for deciding whether a query should use retrieval.
"""

from __future__ import annotations

import json
from typing import Dict

from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from src.config import DEFAULT_MODEL, OPENAI_API_KEY, GOOGLE_API_KEY

def get_router_llm(timeout=30):
    """Factory for router LLM."""
    model_name = DEFAULT_MODEL.lower()
    
    if "gpt" in model_name:
        return ChatOpenAI(
            model=DEFAULT_MODEL,
            api_key=OPENAI_API_KEY,
            temperature=0,
            max_retries=2,
            timeout=timeout
        )
    elif "gemini" in model_name:
        return ChatGoogleGenerativeAI(
            model=DEFAULT_MODEL,
            google_api_key=GOOGLE_API_KEY,
            temperature=0,
            timeout=timeout
        )
    else:
        return ChatOpenAI(
            model="gpt-4o-mini",
            api_key=OPENAI_API_KEY,
            temperature=0,
            timeout=timeout
        )

_router_llm = get_router_llm().with_fallbacks([
    ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=GOOGLE_API_KEY)
])

_MATERIAL_TERMS = (
    "lecture",
    "course",
    "syllabus",
    "document",
    "chapter",
    "lesson",
    "definition",
    "slide",
    "reference",
    "citation",
    "bài giảng",
    "giáo trình",
    "chương",
    "tài liệu",
    "trích dẫn",
    "môn học",
    "học phần",
    "kiến thức",
)

_LOOKUP_VERBS = (
    "find",
    "lookup",
    "search",
    "quote",
    "cite",
    "extract",
    "show source",
    "tra cứu",
    "tìm",
    "trích",
)

_SMALL_TALK_TERMS = (
    "hello",
    "hi",
    "thanks",
    "thank you",
    "how are you",
    "xin chào",
    "cảm ơn",
)

_ROUTER_PROMPT = """You are a strict routing classifier for an Academic AI Teaching Assistant.

Decide the route based on the question:
- direct: ONLY use this for explicit greetings (Hi, Hello, Xin chào) or expressions of gratitude (Thanks, Cảm ơn).
- retrieval: Use this for EVERYTHING ELSE. Any question about science, facts, physics, logic, life, course content, definitions, or any inquiries. If it is a question, it MUST be 'retrieval'.

Your goal is to force the system to look at the database whenever possible to avoid making things up.

Return STRICT JSON only:
{"route":"retrieval|direct","reason":"short reason"}
"""

def _retrieval_signal_score(question: str) -> int:
    q = (question or "").lower().strip()
    score = 0
    if any(term in q for term in _MATERIAL_TERMS):
        score += 2
    if any(verb in q for verb in _LOOKUP_VERBS):
        score += 2
    if "?" in q and len(q.split()) >= 8:
        score += 1
    return score

def _heuristic_route(question: str) -> Dict[str, str]:
    q = (question or "").lower().strip()
    if not q:
        return {"route": "direct", "reason": "Empty question"}
    
    score = _retrieval_signal_score(q)
    if any(term in q for term in _SMALL_TALK_TERMS) and score < 2:
        return {"route": "direct", "reason": "Small talk detected"}
    
    # Mặc định ưu tiên tìm kiếm tài liệu thay vì trả lời trực tiếp từ trí nhớ
    return {"route": "retrieval", "reason": "Default to retrieval for academic safety"}


def route_question(question: str) -> Dict[str, str]:
    """Return routing decision for orchestration graph using LLM."""
    user_q = (question or "").strip()
    if not user_q:
        return {"route": "direct", "reason": "Empty question"}

    try:
        resp = _router_llm.invoke(
            [
                {"role": "system", "content": _ROUTER_PROMPT},
                {"role": "user", "content": user_q},
            ]
        )
        raw = (resp.content or "").strip()
        
        # Strip markdown formatting if present
        if raw.startswith("```json"):
            raw = raw[7:]
        elif raw.startswith("```"):
            raw = raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

        data = json.loads(raw)

        route = data.get("route", "")
        reason = data.get("reason", "LLM decision")

        if route not in ("retrieval", "direct"):
            return _heuristic_route(user_q)

        return {"route": route, "reason": str(reason)}

    except Exception as e:
        print(f"[ROUTER ERROR] Failed to parse LLM route: {e}")
        # Safe fallback to avoid crashing the graph.
        return _heuristic_route(user_q)