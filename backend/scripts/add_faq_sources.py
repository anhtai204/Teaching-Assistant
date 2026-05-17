import os
from dotenv import load_dotenv
import psycopg2

def add_sources_column():
    load_dotenv()
    url = os.getenv("DATABASE_URL")
    if not url:
        print("DATABASE_URL not found!")
        return

    conn = psycopg2.connect(url, sslmode="require")
    cur = conn.cursor()

    try:
        # Check if the column exists
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='faq_cache' AND column_name='sources'
        """)
        if cur.fetchone():
            print("Column 'sources' already exists in faq_cache.")
        else:
            print("Adding 'sources' column to faq_cache...")
            cur.execute("ALTER TABLE faq_cache ADD COLUMN sources JSONB DEFAULT '[]'")
            conn.commit()
            print("Column added successfully.")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    add_sources_column()
