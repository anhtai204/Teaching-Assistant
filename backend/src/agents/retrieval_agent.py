"""
Retrieval agent that returns structured retrieval outputs.
"""

from __future__ import annotations

from typing import Dict, List, Optional

from src.rag.retriever import retrieve_dense, retrieve_hybrid, retrieve_sparse


def run(
    question: str, 
    user_id: Optional[str] = None,
    course_id: Optional[str] = "default", 
    file_ids: Optional[List[str]] = None,
    mode: str = "hybrid", 
    top_k: int = 5
) -> Dict[str, List[dict]]:
    if mode == "dense":
        chunks = retrieve_dense(question, user_id=user_id, course_id=course_id, file_ids=file_ids, top_k=top_k)
    elif mode == "sparse":
        chunks = retrieve_sparse(question, user_id=user_id, course_id=course_id, file_ids=file_ids, top_k=top_k)
    else:
        chunks = retrieve_hybrid(question, user_id=user_id, course_id=course_id, file_ids=file_ids, top_k=top_k)

    sources: List[str] = []
    for c in chunks:
        src = (c.get("metadata") or {}).get("source")
        if src and str(src) not in sources:
            sources.append(str(src))

    return {
        "chunks": chunks,
        "sources": sources,
    }