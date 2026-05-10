import os
from pathlib import Path
import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from src.rag.embedding import get_embedding

embedding_model = get_embedding()

PROJECT_ROOT = Path(__file__).resolve().parents[2]
# Force local project directory for memory storage
MEMORY_DB_PATH = str(PROJECT_ROOT / "memory_db")

CONVERSATION_PATH = Path(MEMORY_DB_PATH) / "conversation_history.jsonl"
SUMMARY_PATH = Path(MEMORY_DB_PATH) / "session_summaries.json"
AI_LOG_DIR = PROJECT_ROOT.parent / ".ai-log"
SESSION_LOG_PATH = AI_LOG_DIR / "session.jsonl"

from src.rag.vectorstore import get_chroma_client
client = get_chroma_client()

memory_col = client.get_or_create_collection("user_memory")


def _stable_memory_id(user_id: str, text: str) -> str:
    raw = f"{user_id}::{text}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def get_emb(text: str) -> List[float]:
    if hasattr(embedding_model, "embed_query"):
        return embedding_model.embed_query(text)
    else:
        return embedding_model.encode(text).tolist()

def add_memory(
    user_id: str,
    text: str,
    memory_type: str = "fact",
    source: str = "user",
    confidence: float = 0.8,
    tags: Optional[List[str]] = None,
    session_id: str = "global",
):
    embedding = get_emb(text)
    metadata = {
        "user_id": user_id,
        "session_id": session_id,
        "memory_type": memory_type,
        "source": source,
        "confidence": float(confidence),
        "tags": ",".join(tags or []),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    memory_col.upsert(
        ids=[_stable_memory_id(user_id, text)],
        documents=[text],
        embeddings=[embedding],
        metadatas=[metadata],
    )


def query_memory(
    user_id: str,
    query: str,
    top_k: int = 5,
    max_distance: Optional[float] = None,
    memory_types: Optional[List[str]] = None,
    session_id: Optional[str] = None,
) -> List[str]:
    q_emb = get_emb(query)

    # Xây dựng danh sách các điều kiện lọc
    conditions = [{"user_id": user_id}]
    
    if memory_types:
        if len(memory_types) == 1:
            conditions.append({"memory_type": memory_types[0]})
        else:
            conditions.append({"$or": [{"memory_type": mt} for mt in memory_types]})
    
    if session_id and session_id != "global":
        conditions.append({"session_id": session_id})

    # Nếu có nhiều hơn 1 điều kiện, dùng $and. Nếu chỉ có 1, dùng chính điều kiện đó.
    where_clause = {"$and": conditions} if len(conditions) > 1 else conditions[0]

    res = memory_col.query(
        query_embeddings=[q_emb],
        n_results=top_k,
        where=where_clause,
        include=["documents", "distances", "metadatas"],
    )

    documents = res.get("documents", [[]])[0]
    distances = res.get("distances", [[]])[0]

    if max_distance is None:
        return documents

    filtered: List[str] = []
    for idx, doc in enumerate(documents):
        distance = distances[idx] if idx < len(distances) else None
        if distance is None or distance <= max_distance:
            filtered.append(doc)

    return filtered


def query_memory_records(
    user_id: str,
    query: str,
    top_k: int = 5,
    max_distance: Optional[float] = None,
    memory_types: Optional[List[str]] = None,
    session_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    q_emb = get_emb(query)

    # Xây dựng danh sách các điều kiện lọc
    conditions = [{"user_id": user_id}]
    
    if memory_types:
        if len(memory_types) == 1:
            conditions.append({"memory_type": memory_types[0]})
        else:
            conditions.append({"$or": [{"memory_type": mt} for mt in memory_types]})
            
    if session_id and session_id != "global":
        conditions.append({"session_id": session_id})

    where_clause = {"$and": conditions} if len(conditions) > 1 else conditions[0]

    res = memory_col.query(
        query_embeddings=[q_emb],
        n_results=top_k,
        where=where_clause,
        include=["documents", "distances", "metadatas"],
    )

    documents = res.get("documents", [[]])[0]
    distances = res.get("distances", [[]])[0]
    metadatas = res.get("metadatas", [[]])[0]

    rows: List[Dict[str, Any]] = []
    for idx, doc in enumerate(documents):
        distance = distances[idx] if idx < len(distances) else None
        if max_distance is not None and distance is not None and distance > max_distance:
            continue

        metadata = metadatas[idx] if idx < len(metadatas) else {}
        rows.append(
            {
                "text": doc,
                "distance": distance,
                "metadata": metadata or {},
            }
        )

    return rows


import subprocess

def get_git_info():
    try:
        repo = subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], encoding='utf-8').strip()
        repo_name = os.path.basename(repo)
        branch = subprocess.check_output(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], encoding='utf-8').strip()
        commit = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], encoding='utf-8').strip()
        return repo_name, branch, commit
    except:
        return "", "", ""

def append_conversation_turn(
    user_id: str,
    user_text: str,
    assistant_text: str,
    session_id: str = "default",
) -> None:
    CONVERSATION_PATH.parent.mkdir(parents=True, exist_ok=True)
    item = {
        "user_id": user_id,
        "session_id": session_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user": user_text,
        "assistant": assistant_text,
    }
    with CONVERSATION_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(item, ensure_ascii=False) + "\n")

    # Also log to session.jsonl in .ai-log directory for agent tracking
    try:
        AI_LOG_DIR.mkdir(parents=True, exist_ok=True)
        repo_name, branch, commit = get_git_info()
        
        log_item = {
            "ts": datetime.now(timezone.utc).astimezone().isoformat(),
            "tool": "antigravity" if user_id != "lecturer_system" else "lecturer_system",
            "event": "UserPromptSubmit" if user_id != "lecturer_system" else "LecturerUpload",
            "session_id": session_id,
            "model": os.getenv("DEFAULT_MODEL", "gpt-4o-mini"),
            "repo": repo_name,
            "branch": branch,
            "commit": commit,
            "student": user_id if "@" in user_id else "anhtai22042004@gmail.com",
            "prompt": user_text,
            "response_summary": assistant_text,
            "tool_name": "agent_chat" if user_id != "lecturer_system" else "document_ingest",
            "tool_args": None
        }
        
        with SESSION_LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(log_item, ensure_ascii=False) + "\n")
    except Exception:
        pass # Best effort logging


def load_recent_conversation(user_id: str, max_turns: int = 3, session_id: str = "default") -> List[Dict[str, str]]:
    if max_turns <= 0:
        return []

    if not CONVERSATION_PATH.exists():
        return []

    turns = []
    with CONVERSATION_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue

            if item.get("user_id") != user_id:
                continue
            
            # Filter by session_id if it's not the default global one
            item_sid = str(item.get("session_id") or "default")
            if session_id != "default" and item_sid != str(session_id):
                continue

            turns.append(item)

    turns = turns[-max_turns:]

    messages: List[Dict[str, str]] = []
    for turn in turns:
        user_text = (turn.get("user") or "").strip()
        assistant_text = (turn.get("assistant") or "").strip()

        if user_text:
            messages.append({"role": "user", "content": user_text})
        if assistant_text:
            messages.append({"role": "assistant", "content": assistant_text})

    return messages


def _load_summary_map() -> Dict[str, Any]:
    if not SUMMARY_PATH.exists():
        return {}

    try:
        return json.loads(SUMMARY_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _save_summary_map(data: Dict[str, Any]) -> None:
    SUMMARY_PATH.parent.mkdir(parents=True, exist_ok=True)
    SUMMARY_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_session_summary(user_id: str) -> str:
    data = _load_summary_map()
    item = data.get(user_id, {})
    return (item.get("summary") or "").strip()


def save_session_summary(user_id: str, summary: str) -> None:
    data = _load_summary_map()
    data[user_id] = {
        "summary": summary,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    _save_summary_map(data)