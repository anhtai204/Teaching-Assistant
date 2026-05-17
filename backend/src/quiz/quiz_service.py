import json
import logging
import random
from typing import List, Dict, Any, Optional
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

def generate_assessment_quiz(course_ids: List[str], student_id: Optional[str] = None, count: int = 5, topics: List[str] = None) -> List[Dict[str, Any]]:
    """
    Generates or assembles a personalized Assessment Quiz (MCQ) for a student, 
    prioritizing active roadmap topics/knowledge gaps and excluding completed topics.
    """
    db = SessionLocal()
    try:
        from src.models import CourseQuestion, RoadmapItem, DocumentChunk, Document, course_document_links
        from uuid import UUID
        import random

        # 1. Convert course IDs to UUID objects
        uuid_course_ids = []
        for c_id in course_ids:
            try:
                uuid_course_ids.append(UUID(str(c_id)))
            except:
                pass

        # 2. Extract roadmap topics and their progress for personalization
        completed_topics = set()
        active_topics = set()
        high_priority_topics = set()

        if student_id:
            try:
                student_uuid = UUID(str(student_id))
                roadmap_items = db.query(RoadmapItem).filter(
                    RoadmapItem.student_id == student_uuid,
                    RoadmapItem.course_id.in_(uuid_course_ids)
                ).all()

                for item in roadmap_items:
                    topic_name = item.topic.strip()
                    if item.progress >= 100 or item.status == "completed":
                        completed_topics.add(topic_name)
                    else:
                        active_topics.add(topic_name)
                        if item.priority == "high":
                            high_priority_topics.add(topic_name)
                
                logger.info(f"[QUIZ_PERSONALIZE] Active: {active_topics}, Completed: {completed_topics}, High: {high_priority_topics}")
            except Exception as rm_err:
                logger.error(f"Error fetching roadmap items in generate_assessment_quiz: {rm_err}")

        # 3. Check for pre-generated questions first
        pregen_questions = db.query(CourseQuestion).filter(CourseQuestion.course_id.in_(uuid_course_ids)).all()

        if pregen_questions:
            # Filter out completed topics to implement spaced repetition
            filtered = [q for q in pregen_questions if q.topic.strip() not in completed_topics]
            if len(filtered) < count:
                # If we don't have enough questions after excluding completed ones, fall back to the entire pool
                filtered = pregen_questions

            # Divide the pool into priority groups
            group_a = [q for q in filtered if q.topic.strip() in high_priority_topics]
            group_b = [q for q in filtered if q.topic.strip() in active_topics and q.topic.strip() not in high_priority_topics]
            group_c = [q for q in filtered if q.topic.strip() not in active_topics and q.topic.strip() not in completed_topics]

            # Target: 60% active/weakness topics, 40% general review topics
            target_active = max(1, int(count * 0.6))
            selected = []

            # Sample from active weaknesses (Group A first, then Group B)
            active_pool = group_a + group_b
            if len(active_pool) >= target_active:
                selected.extend(random.sample(active_pool, target_active))
            else:
                selected.extend(active_pool)

            # Fill remaining slots from Group C
            remaining_needed = count - len(selected)
            if remaining_needed > 0:
                remaining_c_pool = [q for q in group_c if q not in selected]
                if len(remaining_c_pool) >= remaining_needed:
                    selected.extend(random.sample(remaining_c_pool, remaining_needed))
                else:
                    selected.extend(remaining_c_pool)

            # If we still haven't met count, sample randomly from all filtered
            remaining_needed = count - len(selected)
            if remaining_needed > 0:
                backup_pool = [q for q in filtered if q not in selected]
                if len(backup_pool) >= remaining_needed:
                    selected.extend(random.sample(backup_pool, remaining_needed))
                else:
                    selected.extend(backup_pool)

            if len(selected) >= count:
                logger.info(f"[QUIZ_ASSEMBLE] Assembled {len(selected)} personalized pre-generated questions in <10ms!")
                return [{
                    "question": q.question,
                    "options": q.options,
                    "correct_index": q.correct_index,
                    "topic": q.topic,
                    "explanation": q.explanation
                } for q in selected[:count]]

        # 4. Fallback: Generate dynamically using RAG if pool is empty
        logger.info("[QUIZ_FALLBACK] Pregenerated pool is empty. Dynamically generating questions...")
        all_chunks = []
        
        # If topics provided, try to find chunks containing those topics first
        if topics:
            priority_chunks = []
            for c_id in course_ids:
                chunks_query = db.query(DocumentChunk.content)\
                    .join(Document, DocumentChunk.document_id == Document.id)\
                    .join(course_document_links, Document.id == course_document_links.c.document_id)\
                    .filter(course_document_links.c.course_id == c_id)
                
                course_chunks = [r[0] for r in chunks_query.all()]
                if not course_chunks: continue
                
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

    # 5. LLM Call
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
        logger.info(f"Raw AI Quiz Response: {raw[:500]}...")
        
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
             raw = raw.split("```")[1].split("```")[0].strip()
            
        raw_json = json.loads(raw)

        # 6. Auto-seed: Automatically save these generated questions to DB for future speedups!
        try:
            db_seed = SessionLocal()
            for q in raw_json:
                new_q = CourseQuestion(
                    course_id=UUID(str(course_ids[0])),
                    question=q.get("question"),
                    options=q.get("options", []),
                    correct_index=int(q.get("correct_index", 0)),
                    topic=q.get("topic", "Tổng quan"),
                    explanation=q.get("explanation"),
                    difficulty="medium"
                )
                db_seed.add(new_q)
            db_seed.commit()
            logger.info(f"[QUIZ_AUTO_SEED] Programmatically cached {len(raw_json)} questions to CourseQuestion database.")
        except Exception as seed_err:
            logger.error(f"[QUIZ_AUTO_SEED_ERROR] Failed to auto-seed: {seed_err}")
            db_seed.rollback()
        finally:
            db_seed.close()

        return raw_json
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

def pre_generate_document_questions(course_id: str, document_id: str, db=None) -> int:
    """
    Background task to pre-generate high-quality MCQ questions for an uploaded document.
    """
    from src.models import DocumentChunk, CourseQuestion
    from uuid import UUID

    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # 1. Fetch chunks for this document
        chunks = db.query(DocumentChunk.content).filter(DocumentChunk.document_id == document_id).all()
        if not chunks:
            logger.warning(f"No chunks found for document {document_id}")
            return 0

        chunk_contents = [c[0] for c in chunks]
        
        # If the document is too large, sample chunks to prevent LLM context overflow
        if len(chunk_contents) > 20:
            # Sample 20 chunks evenly spread across the document
            step = len(chunk_contents) // 20
            sampled = [chunk_contents[i * step] for i in range(20)]
        else:
            sampled = chunk_contents

        context_text = "\n---\n".join(sampled)
        
        # 2. Call LLM to generate questions
        llm = get_assessment_llm()
        system_prompt = (
            "You are an expert academic content creator. Generate a comprehensive pool of 12 challenging "
            "multiple choice questions (MCQ) in Vietnamese based ONLY on the provided course material. "
            "Each question MUST cover a specific topic mentioned in the material. "
            "Formulate 4 distinct options (A, B, C, D) for each question, specify the correct_index (0-3), "
            "and provide a detailed explanation of why the correct answer is right. "
            "Specify a concise 'topic' name (e.g. 'Mạng Neural', 'Hàm kích hoạt', 'Học sâu'). "
            "Format the response as a STRICT JSON array of objects: "
            "[{'question': '...', 'options': ['A', 'B', 'C', 'D'], 'correct_index': 0-3, 'topic': 'Tên chủ đề', 'explanation': 'Giải thích...', 'difficulty': 'medium'}]"
        )
        
        user_prompt = f"MATERIAL:\n{context_text}\n\nReturn JSON array only."
        
        resp = llm.invoke([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ])
        
        raw = (resp.content or "").strip()
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()
            
        questions = json.loads(raw)
        if not isinstance(questions, list):
            logger.error("LLM did not return a list for pre-generation")
            return 0
            
        # 3. Save to database
        saved_count = 0
        for q in questions:
            new_q = CourseQuestion(
                course_id=UUID(course_id) if isinstance(course_id, str) else course_id,
                document_id=UUID(document_id) if isinstance(document_id, str) else document_id,
                question=q.get("question"),
                options=q.get("options", []),
                correct_index=int(q.get("correct_index", 0)),
                topic=q.get("topic", "Tổng quan"),
                explanation=q.get("explanation"),
                difficulty=q.get("difficulty", "medium")
            )
            db.add(new_q)
            saved_count += 1
            
        db.commit()
        logger.info(f"Successfully pre-generated {saved_count} questions for document {document_id}")
        return saved_count
    except Exception as e:
        logger.error(f"Failed to pre-generate questions for document {document_id}: {e}")
        db.rollback()
        return 0
    finally:
        if close_db:
            db.close()
