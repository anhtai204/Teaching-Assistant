import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()
url = os.getenv("DATABASE_URL")
conn = psycopg2.connect(url, sslmode="require")
cur = conn.cursor()

# Check documents and links
query = """
    SELECT d.name, COUNT(cdl.course_id)
    FROM documents d
    LEFT JOIN course_document_links cdl ON d.id = cdl.document_id
    GROUP BY d.name
"""
cur.execute(query)
docs = cur.fetchall()

print(f"{'Document Name':<50} | {'Links'}")
print("-" * 60)
for d in docs:
    print(f"{d[0]:<50} | {d[1]}")

conn.close()
