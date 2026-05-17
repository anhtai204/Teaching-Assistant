import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()
url = os.getenv("DATABASE_URL")
conn = psycopg2.connect(url, sslmode="require")
cur = conn.cursor()

# Check documents and chunks
query = """
    SELECT d.id, d.name, d.status, d.is_visible, COUNT(dc.id)
    FROM documents d
    LEFT JOIN document_chunks dc ON d.id = dc.document_id
    GROUP BY d.id, d.name, d.status, d.is_visible
    ORDER BY d.name
"""
cur.execute(query)
docs = cur.fetchall()

print(f"{'Document Name':<50} | {'Status':<10} | {'Visible':<7} | {'Chunks'}")
print("-" * 80)
total_chunks = 0
for d in docs:
    print(f"{d[1]:<50} | {d[2]:<10} | {str(d[3]):<7} | {d[4]}")
    total_chunks += d[4]
    
print("-" * 80)
print(f"Total Chunks: {total_chunks}")

# Check faq_cache breakdown by document source
cur.execute("""
    SELECT sources->>0 as src, COUNT(*) 
    FROM faq_cache 
    GROUP BY src
    ORDER BY count DESC
""")
faqs = cur.fetchall()
print("\nFAQ Cache Breakdown:")
for f in faqs:
    print(f"{f[0]:<50} | {f[1]} FAQs")

conn.close()
