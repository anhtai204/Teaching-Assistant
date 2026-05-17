import os
import sys
import json
import time
import uuid

# Add the backend directory to sys.path so we can import src modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
import psycopg2

from src.rag.embedding import get_embedding
from langchain_google_genai import ChatGoogleGenerativeAI
from src.config import GOOGLE_API_KEY

def generate_qa_from_chunk(llm, chunk_text):
    prompt = f"""
    You are an expert educational assistant. Your task is to generate exactly ONE highly specific and natural question that a student might ask, which can be fully and directly answered by the provided text.
    Then, provide the concise, direct answer to that question based ONLY on the provided text.
    
    IMPORTANT: Respond ONLY with a valid JSON object in the following format, with NO markdown formatting, NO code blocks, and NO additional text.
    {{
        "question": "The generated question here?",
        "answer": "The generated answer here."
    }}
    
    Provided text:
    {chunk_text}
    """
    
    try:
        response = llm.invoke(prompt)
        content = response.content.strip()
        
        # Remove markdown code block wrapping if the LLM adds it despite instructions
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
            
        content = content.strip()
        data = json.loads(content)
        
        # Validate format
        if "question" in data and "answer" in data:
            return data["question"], data["answer"]
        return None, None
    except Exception as e:
        print(f"  [LLM Error] {e}")
        return None, None

def main():
    load_dotenv()
    url = os.getenv("DATABASE_URL")
    if not url:
        print("DATABASE_URL not found!")
        return

    print("Connecting to DB...")
    conn = psycopg2.connect(url, sslmode="require")
    cur = conn.cursor()

    try:
        # Get all document chunks with their associated course_id and source name
        # We join document_chunks -> documents -> course_document_links (LEFT JOIN)
        query = """
            SELECT dc.id, dc.content, cdl.course_id, d.name, dc.metadata->>'page'
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            LEFT JOIN course_document_links cdl ON d.id = cdl.document_id
            WHERE d.is_visible = true AND d.status = 'indexed'
        """
        cur.execute(query)
        chunks = cur.fetchall()
        print(f"Found {len(chunks)} chunks to process.")

        if not chunks:
            print("No chunks found. Exiting.")
            return

        print("Initializing LLM (GPT-4o-mini)...")
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0.2
        )
        
        print("Initializing Embedding Model...")
        embedding_model = get_embedding()
        
        # Process chunks
        processed_count = 0
        success_count = 0
        
        # Check existing FAQ cache to avoid duplicates
        cur.execute("SELECT COUNT(*) FROM faq_cache")
        existing_count = cur.fetchone()[0]
        if existing_count > 0:
            print(f"faq_cache already has {existing_count} records. We will just add more.")
            
        for chunk in chunks:
            chunk_id, chunk_content, course_id, doc_name, page_num = chunk
            processed_count += 1
            
            # Print progress concisely
            sys.stdout.write(f"\rProcessing {processed_count}/{len(chunks)}... ")
            sys.stdout.flush()
            
            if not chunk_content or len(chunk_content.strip()) < 50:
                continue # Skip very small chunks
                
            # 1. Generate Q&A
            question, answer = generate_qa_from_chunk(llm, chunk_content)
            
            if not question or not answer:
                continue
                
            # 2. Embed question
            try:
                # Handle different embed models (langchain vs direct)
                if hasattr(embedding_model, "embed_query"):
                    q_emb = embedding_model.embed_query(question)
                else:
                    q_emb = embedding_model.encode(question).tolist()
            except Exception as emb_e:
                print(f"\n  [Embedding Error] {emb_e}")
                continue
                
            # 3. Format sources (JSON array containing the document name and page if available)
            formatted_source = doc_name
            if page_num:
                formatted_source = f"{doc_name} (Trang {page_num})"
            else:
                import re
                match = re.search(r'\[t=([^\]]+)\]', chunk_content)
                if match:
                    ts = match.group(1)
                    formatted_source = f"{doc_name} (Tại {ts})"
            sources_json = json.dumps([formatted_source])
            
            # 4. Insert into faq_cache
            # faq_cache columns: id, course_id, question, question_embedding, answer, created_at, sources
            faq_id = str(uuid.uuid4())
            try:
                cur.execute(
                    """
                    INSERT INTO faq_cache 
                    (id, course_id, question, question_embedding, answer, sources) 
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (faq_id, str(course_id) if course_id else None, question, f"[{','.join(map(str, q_emb))}]", answer, sources_json)
                )
                conn.commit()
                success_count += 1
            except Exception as db_e:
                print(f"\n  [DB Error] {db_e}")
                conn.rollback()
                
            # Small sleep to respect rate limits
            time.sleep(0.5)
            
        print(f"\nCompleted! Successfully generated and inserted {success_count} FAQs into faq_cache.")

    except Exception as e:
        print(f"\nFatal Error: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
