import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

try:
    conn = psycopg2.connect(
        dbname="ai_assistant",
        user="postgres",
        password="POSTGRES_PASSWORD", # Placeholder
        host="localhost",
        port="5433"
    )
    # Wait, I'll just use the env vars
    conn = psycopg2.connect(
        dbname=os.getenv("POSTGRES_DB", "ai_assistant"),
        user=os.getenv("POSTGRES_USER", "postgres"),
        password=os.getenv("POSTGRES_PASSWORD", "22042004"),
        host=os.getenv("POSTGRES_SERVER", "localhost"),
        port=os.getenv("POSTGRES_PORT", "5433")
    )
    conn.autocommit = True
    cur = conn.cursor()
    
    print("Altering embedding column dimension to 384...")
    cur.execute("ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(384);")
    print("Success!")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
