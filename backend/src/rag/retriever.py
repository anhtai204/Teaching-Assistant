from src.rag.embedding import get_embedding
import re
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from src.rag.vectorstore import get_vectorstore
from src.config import CHROMA_DB_DIR, TOP_K_SEARCH, TOP_K_SELECT
from rank_bm25 import BM25Okapi
import os
from dotenv import load_dotenv
from src.memory.memory_service import load_memory, save_memory

load_dotenv()  # Load environment variables from .env file

from src.database import SessionLocal
from src.models import DocumentChunk, Document

def retrieve_dense(
    query: str, 
    user_id: Optional[str] = None,
    course_id: Optional[str] = "default", 
    file_ids: Optional[List[str]] = None,
    top_k: int = TOP_K_SEARCH
) -> List[Dict[str, Any]]:
    """
    Dense retrieval: tìm kiếm theo embedding similarity trong Supabase pgvector.
    """
    db = SessionLocal()
    try:
        from src.models import course_document_links, User
        embedding_model = get_embedding()
        # Generate query embedding
        if hasattr(embedding_model, "embed_query"):
            query_embedding = embedding_model.embed_query(query)
        else:
            query_embedding = embedding_model.encode(query).tolist()
            
        # Build the base query
        # We need to filter by:
        # 1. Document visibility and status
        # 2. (Document linked to course_id) OR (Document owner_id == user_id)
        # 3. If file_ids provided, ONLY those files
        
        from sqlalchemy import or_, and_
        
        query_obj = db.query(DocumentChunk, Document).join(Document)
        
        filters = [
            Document.is_visible == True,
            Document.status == "indexed"
        ]
        
        if file_ids:
            # If specific files are selected, only search those
            filters.append(Document.id.in_(file_ids))
        else:
            # Normal search: User's own files + Enrolled courses files
            access_filters = []
            
            # Own files
            if user_id:
                access_filters.append(Document.owner_id == str(user_id))
            
            # Course files
            if course_id and course_id != "default":
                query_obj = query_obj.join(course_document_links, Document.id == course_document_links.c.document_id)
                access_filters.append(course_document_links.c.course_id == str(course_id))
            elif user_id:
                # If no specific course, but we have user_id, search ALL courses the user is enrolled in
                from src.models import course_enrollments
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    enrolled_course_ids = [str(c.id) for c in user.enrolled_courses]
                    if enrolled_course_ids:
                        # Find documents linked to these courses
                        # Using a subquery for linked document IDs
                        linked_doc_ids = db.query(course_document_links.c.document_id).filter(
                            course_document_links.c.course_id.in_(enrolled_course_ids)
                        ).subquery()
                        access_filters.append(Document.id.in_(linked_doc_ids))
            
            if access_filters:
                filters.append(or_(*access_filters))
        
        results = query_obj.filter(and_(*filters)).order_by(
            DocumentChunk.embedding.cosine_distance(query_embedding)
        ).limit(top_k).all()

        chunks = []
        for chunk, doc in results:
            chunks.append({
                "text": chunk.content,
                "metadata": {
                    **chunk.metadata_json, 
                    "source": doc.name,
                    "id": str(doc.id),
                    "is_visible": doc.is_visible
                },
                "score": 1.0 
            })

        return chunks
    except Exception as e:
        print(f"Error in retrieve_dense (pgvector): {e}")
        return []
    finally:
        db.close()

import re
from rank_bm25 import BM25Okapi
from typing import List, Dict, Any

BM25_INDEX = None
BM25_DOCS = None
BM25_METADATA = None


def tokenize(text: str) -> List[str]:
    return re.findall(r"\w+", (text or "").lower(), flags=re.UNICODE)


def build_bm25_index(docs: List[Dict[str, Any]]):
    """
    docs: [
        {"text": "...", "metadata": {...}},
        ...
    ]
    """

    global BM25_INDEX, BM25_DOCS, BM25_METADATA

    BM25_DOCS = [d["text"] for d in docs]
    BM25_METADATA = [d.get("metadata", {}) for d in docs]

    tokenized_corpus = [tokenize(doc) for doc in BM25_DOCS]

    BM25_INDEX = BM25Okapi(tokenized_corpus)


def retrieve_sparse(
    query: str, 
    user_id: Optional[str] = None,
    course_id: Optional[str] = "default", 
    file_ids: Optional[List[str]] = None,
    top_k: int = TOP_K_SEARCH
) -> List[Dict[str, Any]]:
    """
    BM25 sparse retrieval (keyword-based search)
    """

    if BM25_INDEX is None:
        return []

    tokenized_query = tokenize(query)
    if not tokenized_query:
        return []

    scores = BM25_INDEX.get_scores(tokenized_query)

    top_indices = sorted(
        range(len(scores)),
        key=lambda i: scores[i],
        reverse=True
    )

    results: List[Dict[str, Any]] = []

    # Get user's enrolled course IDs if needed
    enrolled_course_ids = []
    if not course_id or course_id == "default":
        if user_id:
            db = SessionLocal()
            from src.models import User
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                enrolled_course_ids = [str(c.id) for c in user.enrolled_courses]
            db.close()

    for idx in top_indices:
        metadata = BM25_METADATA[idx] or {}
        
        # Visibility check
        if not metadata.get("is_visible", True):
            continue
            
        doc_id = metadata.get("id")
        doc_owner_id = metadata.get("owner_id")
        doc_course_id = metadata.get("course_id") # Note: Document might be in multiple courses now

        authorized = False
        
        if file_ids:
            if doc_id in file_ids:
                authorized = True
        else:
            # Ownership check
            if user_id and doc_owner_id == str(user_id):
                authorized = True
            
            # Course check
            if not authorized:
                if course_id and course_id != "default":
                    if doc_course_id == str(course_id):
                        authorized = True
                elif enrolled_course_ids:
                    if doc_course_id in enrolled_course_ids:
                        authorized = True

        if authorized:
            results.append({
                "text": BM25_DOCS[idx],
                "metadata": metadata,
                "score": float(scores[idx])
            })
            if len(results) >= top_k:
                break

    return results

from typing import Optional
import hashlib


RRF_K = 60


def build_doc_key(chunk: Dict[str, Any]) -> str:
    meta = chunk.get("metadata", {}) or {}

    source = str(meta.get("source", ""))
    section = str(meta.get("section", ""))
    chunk_id = str(meta.get("chunk_id", ""))

    if chunk_id:
        return f"{source}|{section}|{chunk_id}"

    # fallback
    text = chunk.get("text", "")
    h = hashlib.md5(text.encode("utf-8")).hexdigest()[:12]
    return f"{source}|{section}|{h}"

def retrieve_hybrid(
    query: str,
    user_id: Optional[str] = None,
    course_id: Optional[str] = "default",
    file_ids: Optional[List[str]] = None,
    top_k: int = TOP_K_SEARCH
) -> List[Dict[str, Any]]:
    """
    Hybrid retrieval using Reciprocal Rank Fusion (RRF)
    """

    dense_results = retrieve_dense(query, user_id=user_id, course_id=course_id, file_ids=file_ids, top_k=top_k * 2)
    sparse_results = retrieve_sparse(query, user_id=user_id, course_id=course_id, file_ids=file_ids, top_k=top_k * 2)

    merged = {}

    # Dense ranks
    for rank, chunk in enumerate(dense_results, start=1):
        key = build_doc_key(chunk)
        merged[key] = {
            "chunk": chunk,
            "dense_rank": rank,
            "sparse_rank": None
        }

    # Sparse ranks
    for rank, chunk in enumerate(sparse_results, start=1):
        key = build_doc_key(chunk)

        if key in merged:
            merged[key]["sparse_rank"] = rank
        else:
            merged[key] = {
                "chunk": chunk,
                "dense_rank": None,
                "sparse_rank": rank
            }

    # RRF scoring
    def rrf(dense_rank: Optional[int], sparse_rank: Optional[int]) -> float:
        dr = dense_rank if dense_rank is not None else 10_000
        sr = sparse_rank if sparse_rank is not None else 10_000

        return (1 / (RRF_K + dr)) + (1 / (RRF_K + sr))

    scored = []

    for info in merged.values():
        score = rrf(info["dense_rank"], info["sparse_rank"])
        chunk = dict(info["chunk"])
        chunk["score"] = float(score)
        scored.append(chunk)

    scored.sort(key=lambda x: x["score"], reverse=True)

    return scored[:top_k]

import numpy as np

RERANK_MODEL = None

def get_rerank_model():
    global RERANK_MODEL
    
    # DISABLE Rerank on Render/Cloud to save RAM (512MB limit)
    if os.getenv("RENDER") or os.getenv("VERCEL"):
        print("Cloud environment detected. Disabling CrossEncoder Rerank to save RAM.")
        return None

    if RERANK_MODEL is None:
        try:
            from sentence_transformers import CrossEncoder
            print("Loading CrossEncoder Rerank model...")
            RERANK_MODEL = CrossEncoder(
                "cross-encoder/ms-marco-MiniLM-L-6-v2",
                device="cpu"
            )
        except ImportError:
            print("Warning: sentence_transformers not installed. Reranking will be disabled.")
    return RERANK_MODEL

def mmr(doc_scores, embeddings, lambda_param=0.5, top_k=5):
    """
    Maximal Marginal Relevance
    """

    selected = []
    selected_idx = []

    while len(selected) < top_k and doc_scores:
        best_score = -1
        best_idx = None

        for i, (score, emb) in enumerate(zip(doc_scores, embeddings)):

            if i in selected_idx:
                continue

            redundancy = 0
            if selected:
                redundancy = max(
                    np.dot(emb, embeddings[j])
                    for j in selected_idx
                )

            mmr_score = lambda_param * score - (1 - lambda_param) * redundancy

            if mmr_score > best_score:
                best_score = mmr_score
                best_idx = i

        selected_idx.append(best_idx)
        selected.append(best_idx)

    return selected

def rerank(
    query: str,
    candidates: List[Dict[str, Any]],
    top_k: int = 5,
    use_mmr: bool = False,
) -> List[Dict[str, Any]]:
    """
    Cross-encoder rerank + optional MMR
    """

    if not candidates:
        return []

    model = get_rerank_model()
    if model is None:
        print("RERANK_MODEL is not available. Skipping reranking.")
        return candidates[:top_k]

    pairs = [[query, c["text"]] for c in candidates]

    scores = model.predict(pairs)

    # attach scores
    for c, s in zip(candidates, scores):
        c["rerank_score"] = float(s)

    # sort by relevance
    candidates = sorted(
        candidates,
        key=lambda x: x["rerank_score"],
        reverse=True
    )

    # OPTIONAL MMR (only if embeddings exist)
    if use_mmr:
        # fallback: simple diversity by index (no embeddings required)
        seen = set()
        final = []

        for c in candidates:
            key = c.get("metadata", {}).get("source", "") + c["text"][:30]

            if key in seen:
                continue

            seen.add(key)
            final.append(c)

            if len(final) == top_k:
                break

        return final

    return candidates[:top_k]


# =============================================================================
# QUERY TRANSFORMATION (Sprint 3 alternative)
# =============================================================================

import re
from typing import List

SYNONYM_MAP = {
    "approval matrix": ["access control sop", "permission matrix", "authorization table"],
    "error": ["issue", "bug", "failure", "exception"],
    "refund": ["return money", "reimbursement", "repayment"],
}

def expand_query(query: str) -> List[str]:
    q = query.lower()

    expanded = [query]

    for k, synonyms in SYNONYM_MAP.items():
        if k in q:
            expanded.extend(synonyms)

    return list(set(expanded))

def decompose_query(query: str) -> List[str]:
    """
    Split multi-intent queries into sub-queries
    """

    # simple heuristics
    split_keywords = [" and ", ", ", ";", " + "]

    for kw in split_keywords:
        if kw in query:
            parts = [p.strip() for p in query.split(kw)]
            return parts

    # fallback: single query
    return [query]

def hyde_query(query: str) -> List[str]:
    """
    Hypothetical Document Expansion (light version)
    """

    return [
        query,
        f"Thông tin liên quan đến: {query}",
        f"Giải thích chi tiết về {query}"
    ]

def transform_query(query: str, strategy: str = "expansion") -> List[str]:
    """
    Query transformation dispatcher
    """

    if strategy == "expansion":
        return expand_query(query)

    elif strategy == "decomposition":
        return decompose_query(query)

    elif strategy == "hyde":
        return hyde_query(query)

    else:
        return [query]

# =============================================================================
# GENERATION — GROUNDED ANSWER FUNCTION
# =============================================================================

def build_context_block(chunks: List[Dict[str, Any]]) -> str:
    """
    Build structured context with stable citation IDs
    """

    parts = []

    for i, chunk in enumerate(chunks, 1):
        meta = chunk.get("metadata", {}) or {}

        source = meta.get("source", "unknown")
        section = meta.get("section", "")
        chunk_id = meta.get("chunk_id", "")

        score = chunk.get("score", 0.0)
        text = chunk.get("text", "")

        header = f"[{i}] {source}"

        if section:
            header += f" | {section}"

        if chunk_id:
            header += f" | id={chunk_id}"

        header += f" | score={score:.3f}"

        parts.append(f"{header}\n{text}")

    return "\n\n".join(parts)


def build_grounded_prompt(query: str, context: str, memory: list):

    memory_block = ""
    if memory:
        memory_block = "\nUser Memory:\n" + "\n".join(f"- {m}" for m in memory)

    return f"""
You are a grounded RAG system.

RULES:
- Use context + memory if relevant
- Do not hallucinate
- If unknown → say you don't know

{memory_block}

Context:
{context}

Question:
{query}

Answer:
"""


def call_llm(prompt: str) -> str:
    """
    Gọi LLM để sinh câu trả lời. Sử dụng Gemini 1.5 Flash.
    """
    from langchain_google_genai import ChatGoogleGenerativeAI
    
    api_key = os.getenv("GOOGLE_API_KEY")
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=api_key,
        temperature=0.2
    )
    
    # Old OpenAI logic (commented out)
    """
    from openai import OpenAI
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role":"user","content":str(prompt)}],
    )
    return response.choices[0].message.content
    """
    
    response = llm.invoke(prompt)
    return response.content


def rag_answer(
    query: str,
    user_id: str = "default",
    course_id: str = "default",
    retrieval_mode: str = "hybrid",
    top_k_search: int = TOP_K_SEARCH,
    top_k_select: int = TOP_K_SELECT,
    use_rerank: bool = True,
    verbose: bool = False,
) -> Dict[str, Any]:

    config = {
        "retrieval_mode": retrieval_mode,
        "top_k_search": top_k_search,
        "top_k_select": top_k_select,
        "use_rerank": use_rerank,
    }

    # -----------------------
    # 0. MEMORY LOAD (SAFE)
    # -----------------------
    memory = load_memory(user_id, query) or []

    if verbose:
        print(f"[MEMORY] loaded {len(memory)} items")

    # -----------------------
    # 1. RETRIEVE
    # -----------------------
    if retrieval_mode == "dense":
        candidates = retrieve_dense(query, user_id=user_id, course_id=course_id, top_k=top_k_search)

    elif retrieval_mode == "sparse":
        candidates = retrieve_sparse(query, user_id=user_id, course_id=course_id, top_k=top_k_search)

    elif retrieval_mode == "hybrid":
        candidates = retrieve_hybrid(query, user_id=user_id, course_id=course_id, top_k=top_k_search)

    else:
        raise ValueError("Invalid retrieval_mode")

    if verbose:
        print(f"[RAG] Retrieved: {len(candidates)}")

    # -----------------------
    # 2. RERANK
    # -----------------------
    if use_rerank:
        candidates = rerank(query, candidates, top_k=top_k_search)

    # -----------------------
    # 3. SELECT TOP-K
    # -----------------------
    candidates = candidates[:top_k_select]

    # -----------------------
    # 4. SORT (SAFE)
    # -----------------------
    candidates = sorted(
        candidates,
        key=lambda x: x.get("rerank_score", x.get("score", 0.0)),
        reverse=True
    )

    if verbose:
        print(f"[RAG] Selected: {len(candidates)}")

    # -----------------------
    # 5. CONTEXT BUILD
    # -----------------------
    context_block = build_context_block(candidates)

    # -----------------------
    # 6. PROMPT BUILD
    # -----------------------
    prompt = build_grounded_prompt(query, context_block, memory)

    # -----------------------
    # 7. LLM CALL
    # -----------------------
    answer = call_llm(prompt)

    # -----------------------
    # 8. MEMORY SAVE (FIXED POSITION)
    # -----------------------
    save_memory(user_id, query)

    # -----------------------
    # 9. SOURCES
    # -----------------------
    sources = [
        c.get("metadata", {}).get("source", "unknown")
        for c in candidates
    ]

    return {
        "query": query,
        "answer": answer,
        "sources": sources,
        "chunks_used": candidates,
        "config": config,
    }
