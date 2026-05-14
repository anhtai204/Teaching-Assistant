import json
import logging
import random
from typing import List, Dict, Any
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from src.config import DEFAULT_MODEL, OPENAI_API_KEY, GOOGLE_API_KEY
from src.database import SessionLocal
from src.models import DocumentChunk, Document, course_document_links

logger = logging.getLogger(__name__)

def get_assessment_llm():
    """
    Returns the primary LLM with fallback configured.
    Primary: GPT-4o-mini, Fallback: Gemini-2.5-flash
    """
    primary = ChatOpenAI(
        model="gpt-4o-mini", 
        api_key=OPENAI_API_KEY, 
        temperature=0.3
    )
    fallback = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", 
        google_api_key=GOOGLE_API_KEY, 
        temperature=0.3
    )
    return primary.with_fallbacks([fallback])

def generate_assessment_quiz(course_ids: List[str], count: int = 5, topics: List[str] = None) -> List[Dict[str, Any]]:
    """
    Generates MCQ questions based on course documents from multiple courses.
    """
    db = SessionLocal()
    try:
        all_chunks = []
        
        # If topics provided, try to find chunks containing those topics first
        if topics:
            priority_chunks = []
            # We still need to know which courses to look into
            for c_id in course_ids:
                chunks_query = db.query(DocumentChunk.content)\
                    .join(Document, DocumentChunk.document_id == Document.id)\
                    .join(course_document_links, Document.id == course_document_links.c.document_id)\
                    .filter(course_document_links.c.course_id == c_id)
                
                course_chunks = [r[0] for r in chunks_query.all()]
                if not course_chunks: continue
                
                # Priority search in this course
                for topic in topics:
                    t_chunks = [c for c in course_chunks if topic.lower() in c.lower()]
                    if t_chunks:
                        priority_chunks.extend(random.sample(t_chunks, min(len(t_chunks), 3)))
                
                all_chunks.extend(course_chunks)
            
            remaining_needed = max(0, 30 - len(priority_chunks))
            sampled_chunks = list(set(priority_chunks))
            if all_chunks:
                sampled_chunks += random.sample(all_chunks, min(len(all_chunks), remaining_needed))
        else:
            for c_id in course_ids:
                chunks_query = db.query(DocumentChunk.content)\
                    .join(Document, DocumentChunk.document_id == Document.id)\
                    .join(course_document_links, Document.id == course_document_links.c.document_id)\
                    .filter(course_document_links.c.course_id == c_id)
                course_chunks = [r[0] for r in chunks_query.all()]
                if course_chunks:
                    all_chunks.extend(random.sample(course_chunks, min(len(course_chunks), 10)))
            
            sampled_chunks = random.sample(all_chunks, min(len(all_chunks), 30))
            
        if not sampled_chunks:
            logger.warning(f"No document chunks found for courses {course_ids}")
            raise ValueError(f"Không tìm thấy tài liệu học tập cho các khóa học đã chọn.")
            
        context_text = "\n---\n".join(sampled_chunks)
        
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"Error fetching chunks: {e}")
        return []
    finally:
        db.close()

    # 2. LLM Call
    llm = get_assessment_llm()
    
    topic_context = f" Focus on these priority topics: {', '.join(topics)}." if topics else ""
    
    system_prompt = (
        "You are an expert academic evaluator. Generate a high-quality Assessment Quiz (MCQ) "
        "based ONLY on the provided course material."
        f"{topic_context} "
        f"Generate exactly {count} challenging questions in Vietnamese. "
        "Distribute questions across different topics mentioned in the material. "
        "Each question MUST include a detailed explanation of why the correct answer is right. "
        "Format the response as a STRICT JSON array of objects: "
        "[{'question': '...', 'options': ['A', 'B', 'C', 'D'], 'correct_index': 0-3, 'topic': 'Chủ đề', 'explanation': 'Giải thích chi tiết...'}]"
    )
    
    user_prompt = f"MATERIAL:\n{context_text}\n\nReturn JSON array only."
    
    try:
        resp = llm.invoke([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ])
        
        raw = (resp.content or "").strip()
        logger.info(f"Raw AI Quiz Response: {raw[:500]}...") # Log first 500 chars
        
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
             raw = raw.split("```")[1].split("```")[0].strip()
            
        return json.loads(raw)
    except Exception as e:
        logger.error(f"Assessment generation failed: {e}")
        return []

def evaluate_assessment_results(questions: List[dict], answers: List[int]) -> Dict[str, Any]:
    """
    Analyzes assessment results to identify specific learning gaps.
    """
    correct_count = 0
    topic_scores = {} # topic -> {correct, total}
    
    for idx, q in enumerate(questions):
        topic = q.get("topic", "Tổng quan")
        if topic not in topic_scores:
            topic_scores[topic] = {"correct": 0, "total": 0}
            
        topic_scores[topic]["total"] += 1
        if idx < len(answers) and answers[idx] == q.get("correct_index"):
            correct_count += 1
            topic_scores[topic]["correct"] += 1
            
    gaps = []
    for topic, stats in topic_scores.items():
        if (stats["correct"] / stats["total"]) < 0.7:
            gaps.append(topic)
            
    return {
        "score": correct_count,
        "total": len(questions),
        "percentage": round((correct_count / len(questions)) * 100, 1) if questions else 0,
        "gaps": gaps,
        "topic_summary": topic_scores
    }
