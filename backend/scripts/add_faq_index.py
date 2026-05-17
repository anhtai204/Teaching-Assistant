import os
from dotenv import load_dotenv
import psycopg2

def add_hnsw_index():
    load_dotenv()
    url = os.getenv("DATABASE_URL")
    if not url:
        print("DATABASE_URL not found!")
        return

    conn = psycopg2.connect(url, sslmode="require")
    cur = conn.cursor()

    try:
        print("Adding HNSW index to faq_cache.question_embedding...")
        # Add index for cosine distance (vector_cosine_ops)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS faq_cache_embedding_idx 
            ON faq_cache USING hnsw (question_embedding vector_cosine_ops);
        """)
        conn.commit()
        print("HNSW index added successfully!")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    add_hnsw_index()
