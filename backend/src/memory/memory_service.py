from src.memory.memory_extract import extract_memory
from src.memory.memory_store import (
    add_memory,
    append_conversation_turn,
    load_recent_conversation,
    load_session_summary,
    query_memory,
    query_memory_records,
    save_session_summary,
)


DEFAULT_FACT_TOP_K = 5
DEFAULT_FACT_MAX_DISTANCE = 1.1


def load_short_term_memory(user_id: str, session_id: str, max_turns: int = 8):
    return load_recent_conversation(user_id, max_turns=max_turns, session_id=session_id)


def load_long_term_memory(user_id: str, query: str, top_k: int = 4, max_distance: float = DEFAULT_FACT_MAX_DISTANCE):
    return query_memory(
        user_id,
        query,
        top_k=top_k,
        max_distance=max_distance,
        memory_types=["long_term"],
        session_id="global",
    )


def load_semantic_memory(user_id: str, query: str, top_k: int = 5, max_distance: float = DEFAULT_FACT_MAX_DISTANCE):
    return query_memory(
        user_id,
        query,
        top_k=top_k,
        max_distance=max_distance,
        memory_types=["semantic"],
        session_id="global",
    )


def load_episodic_memory(user_id: str, query: str, session_id: str, top_k: int = 3, max_distance: float = DEFAULT_FACT_MAX_DISTANCE):
    return query_memory(
        user_id,
        query,
        top_k=top_k,
        max_distance=max_distance,
        memory_types=["episodic"],
        session_id=session_id,
    )


def load_memory(
    user_id: str,
    query: str,
    top_k: int = DEFAULT_FACT_TOP_K,
    max_distance: float = DEFAULT_FACT_MAX_DISTANCE,
):
    semantic = load_semantic_memory(user_id, query, top_k=max(1, top_k // 2), max_distance=max_distance)
    long_term = load_long_term_memory(user_id, query, top_k=max(1, top_k - len(semantic)), max_distance=max_distance)
    merged = []
    seen = set()
    for item in semantic + long_term:
        key = item.strip()
        if not key or key in seen:
            continue
        seen.add(key)
        merged.append(item)
    return merged[:top_k]


def load_context_messages(user_id: str, max_turns: int = 8, session_id: str = "default"):
    return load_short_term_memory(user_id, session_id=session_id, max_turns=max_turns)


def load_session_context_summary(user_id: str):
    return load_session_summary(user_id)


def debug_memory_recall(
    user_id: str,
    query: str,
    top_k: int = DEFAULT_FACT_TOP_K,
    max_distance: float = DEFAULT_FACT_MAX_DISTANCE,
):
    return query_memory_records(
        user_id,
        query,
        top_k=top_k,
        max_distance=max_distance,
    )


def save_memory(user_id: str, text: str, session_id: str = "default"):
    text_l = text.lower()

    # Explicit intents that indicate users want long-term memory.
    explicit_triggers = [
        "tôi thích",
        "tôi không thích",
        "tôi là",
        "tên tôi",
        "hãy nhớ",
        "nhớ rằng",
        "remember",
        "remember that",
        "i like",
        "i don't like",
        "my preference",
        "my name is",
        "i am",
        "my goal",
        "my weakness",
    ]

    extracted = extract_memory(text)

    candidates = list(extracted)
    if any(t in text_l for t in explicit_triggers):
        candidates.append(text)

    # Deduplicate while keeping original order.
    unique_candidates = []
    seen = set()
    for c in candidates:
        c_norm = c.strip()
        if not c_norm or c_norm in seen:
            continue
        seen.add(c_norm)
        unique_candidates.append(c_norm)

    for memory in unique_candidates:
        add_memory(
            user_id,
            memory,
            memory_type="semantic",
            source="user",
            confidence=0.9,
            tags=["preference", "profile"],
            session_id="global",
        )

    if unique_candidates:
        add_memory(
            user_id,
            " | ".join(unique_candidates[:3]),
            memory_type="episodic",
            source="session",
            confidence=0.75,
            tags=["episode", "session"],
            session_id=session_id,
        )

    return len(unique_candidates)


def _summary_from_turns(turns):
    if not turns:
        return ""

    user_messages = [
        (m.get("content") or "").strip()
        for m in turns
        if m.get("role") == "user"
    ]
    assistant_messages = [
        (m.get("content") or "").strip()
        for m in turns
        if m.get("role") == "assistant"
    ]

    user_messages = [m for m in user_messages if m]
    assistant_messages = [m for m in assistant_messages if m]

    recent_user = user_messages[-3:]
    recent_assistant = assistant_messages[-2:]

    facts = []
    for msg in user_messages[-8:]:
        facts.extend(extract_memory(msg))

    # dedupe facts while preserving order
    seen = set()
    dedup_facts = []
    for fact in facts:
        key = fact.strip()
        if not key or key in seen:
            continue
        seen.add(key)
        dedup_facts.append(key)

    lines = []
    if recent_user:
        lines.append("Recent user intents:")
        lines.extend(f"- {m}" for m in recent_user)

    if dedup_facts:
        lines.append("Stable user facts:")
        lines.extend(f"- {f}" for f in dedup_facts[-5:])

    if recent_assistant:
        lines.append("Recent assistant commitments:")
        lines.extend(f"- {m}" for m in recent_assistant)

    return "\n".join(lines)


def refresh_session_summary(user_id: str, max_turns_for_summary: int = 12):
    turns = load_recent_conversation(user_id, max_turns=max_turns_for_summary)
    summary = _summary_from_turns(turns)
    if summary:
        save_session_summary(user_id, summary)
    return summary


def refresh_session_summary_with_llm(
    llm,
    user_id: str,
    model: str,
    max_turns_for_summary: int = 12,
):
    turns = load_recent_conversation(user_id, max_turns=max_turns_for_summary)
    if not turns:
        return load_session_summary(user_id)

    previous_summary = load_session_summary(user_id)
    transcript_lines = []
    for m in turns:
        role = m.get("role", "user")
        content = (m.get("content") or "").strip()
        if not content:
            continue
        transcript_lines.append(f"{role}: {content}")

    transcript = "\n".join(transcript_lines[-24:])

    system_prompt = (
        "You summarize user-agent conversation memory for future context recall. "
        "Keep only durable user preferences, goals, constraints, and recent commitments. "
        "Output concise bullet points in plain text."
    )
    user_prompt = (
        f"Previous summary:\n{previous_summary or '(none)'}\n\n"
        f"Recent transcript:\n{transcript}\n\n"
        "Write an updated memory summary (max 8 bullets, max 700 characters)."
    )

    try:
        messages = [
            ("system", system_prompt),
            ("human", user_prompt),
        ]
        resp = llm.invoke(messages)
        summary = (resp.content or "").strip()
        if summary:
            save_session_summary(user_id, summary)
            return summary
    except Exception as e:
        print(f"Memory summary error: {e}")
        pass

    return refresh_session_summary(user_id, max_turns_for_summary=max_turns_for_summary)


def save_conversation_turn(
    user_id: str,
    user_text: str,
    assistant_text: str,
    session_id: str = "default",
):
    append_conversation_turn(user_id, user_text, assistant_text, session_id=session_id)

