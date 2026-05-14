import json
import logging
from typing import List, Dict
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from src.config import DEFAULT_MODEL, OPENAI_API_KEY, GOOGLE_API_KEY

logger = logging.getLogger(__name__)

def generate_roadmap_with_llm(user_id: str, chat_history: List[dict], allowed_sources: List[str], assessment_gaps: List[str] = None) -> List[dict]:
    if not OPENAI_API_KEY:
        logger.error("OPENAI_API_KEY missing")
        return []

    user_messages = [str(h.get("content") or "").strip() for h in chat_history if str(h.get("role") or "") == "user"]
    assistant_messages = [str(h.get("content") or "").strip() for h in chat_history if str(h.get("role") or "") == "assistant"]

    behavior_payload = {
        "user_id": user_id,
        "recent_user_messages": user_messages[-20:],
        "recent_assistant_messages": assistant_messages[-10:],
        "assessment_knowledge_gaps": assessment_gaps or [],
        "available_sources": allowed_sources[:20],
        "requirements": {
            "item_count": 5 if assessment_gaps else 4,
            "id_format": "rm-1, rm-2, ...",
            "priority_values": ["high", "medium", "low"],
            "status_default": "todo",
            "progress_range": [0, 100],
            "include_fields": ["id", "topic", "description", "priority", "progress", "status", "sources", "actions"],
            "language": "vi",
        },
    }

    primary = ChatOpenAI(
        model=DEFAULT_MODEL, 
        api_key=OPENAI_API_KEY, 
        temperature=0.2,
        max_retries=2,
        timeout=60
    )
    fallback = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=GOOGLE_API_KEY, temperature=0.2)
    llm = primary.with_fallbacks([fallback])
    
    system_prompt = (
        "You are an expert academic learning planner. Build a personalized roadmap. "
        "STRICT RULE: Only include topics that are present in or directly relevant to the 'available_sources' list. "
        "DO NOT include any topics mentioned in 'recent_user_messages' if they are NOT related to the course material in 'available_sources'. "
        "The chat history should ONLY be used to gauge the student's mastery level or current struggles with VALID course topics. "
        "IF 'assessment_knowledge_gaps' are provided, PRIORITIZE these topics, as they are confirmed weaknesses from course materials. "
        "For EACH roadmap item, you MUST: "
        "1. Populate 'sources' with a list of EXACT document names from 'available_sources' used for this topic. "
        "2. Generate 3 to 5 specific 'actions'. Each action MUST link to a document name from 'sources'. "
        "CRITICAL: Avoid generic tasks like 'Watch video' or 'Read notes'. "
        "Example action: 'Study pages 5-10 in [Lecture1.pdf]', 'Watch the part about CNNs in [Course_Video.mp4]'. "
        "Return STRICT JSON array only."
    )
    
    resp = llm.invoke([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": json.dumps(behavior_payload, ensure_ascii=False)},
    ])

    raw = (resp.content or "").strip()
    
    # Robust JSON extraction from markdown blocks
    if "```json" in raw:
        raw = raw.split("```json")[1].split("```")[0].strip()
    elif "```" in raw:
        raw = raw.split("```")[1].split("```")[0].strip()
        
    try:
        parsed = json.loads(raw)
        if not isinstance(parsed, list):
            logger.error(f"LLM did not return a list: {raw}")
            return []
        
        normalized = []
        for idx, item in enumerate(parsed, start=1):
            # Chuyển đổi actions thành dạng objects để theo dõi trạng thái done
            raw_actions = item.get("actions", [])
            structured_actions = []
            for act in raw_actions:
                if isinstance(act, str):
                    structured_actions.append({"text": act, "done": False})
                elif isinstance(act, dict) and "text" in act:
                    structured_actions.append({"text": act["text"], "done": act.get("done", False)})

            normalized.append({
                "id": str(item.get("id") or f"rm-{idx}"),
                "topic": str(item.get("topic") or f"Chủ đề {idx}"),
                "description": str(item.get("description") or ""),
                "priority": str(item.get("priority") or "medium").lower(),
                "progress": 0,
                "status": "todo",
                "sources": item.get("sources", []),
                "actions": structured_actions,
            })
        return normalized
    except Exception as e:
        logger.error(f"Failed to parse roadmap JSON: {e}")
        return []
