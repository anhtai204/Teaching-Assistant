import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()
url = os.getenv("DATABASE_URL")
conn = psycopg2.connect(url, sslmode="require")
cur = conn.cursor()

# Query pg_attribute and pg_type to find vector dimensions
cur.execute("""
    SELECT a.attname, t.typname, a.atttypmod
    FROM pg_attribute a
    JOIN pg_type t ON a.atttypid = t.oid
    JOIN pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'faq_cache' AND a.attname = 'question_embedding'
""")
res = cur.fetchall()
print("FAQ_CACHE vector:")
for r in res:
    print(f"  Column: {r[0]} | Type: {r[1]} | Typmod: {r[2]}")

cur.execute("""
    SELECT a.attname, t.typname, a.atttypmod
    FROM pg_attribute a
    JOIN pg_type t ON a.atttypid = t.oid
    JOIN pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'document_chunks' AND a.attname = 'embedding'
""")
res = cur.fetchall()
print("DOCUMENT_CHUNKS vector:")
for r in res:
    print(f"  Column: {r[0]} | Type: {r[1]} | Typmod: {r[2]}")

conn.close()
