import os
from dotenv import load_dotenv
import psycopg2
import json

load_dotenv()
url = os.getenv("DATABASE_URL")
conn = psycopg2.connect(url, sslmode="require")
cur = conn.cursor()

query = """
    SELECT dc.metadata, d.name
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.name LIKE '%.pdf'
    LIMIT 3
"""
cur.execute(query)
res = cur.fetchall()

print("PDF Metadata samples:")
for r in res:
    print(f"Doc: {r[1]}")
    print(f"Metadata: {json.dumps(r[0], ensure_ascii=False)}")
    print("-" * 50)

conn.close()
