import requests
import os

# Base URL
url = "http://localhost:8000/api/materials/upload"

# 1. Get Course ID from DB (First course)
# In a real scenario, we'd get this from an API, but here we'll just use a dummy or fetch it
import psycopg2
conn = psycopg2.connect(
    host="localhost",
    user="postgres",
    password="22042004",
    port="5433",
    database="ai_assistant"
)
cur = conn.cursor()
cur.execute("SELECT id FROM courses LIMIT 1")
course_id = cur.fetchone()[0]
cur.close()
conn.close()

print(f"Testing upload for Course ID: {course_id}")

# 2. Files to upload
files_to_upload = [
    "data/documents/chuong1_intro_ai.md",
    "data/documents/chuong2_rag_edu.txt"
]

for file_path in files_to_upload:
    if not os.path.exists(file_path):
        print(f"Skipping {file_path}, file not found.")
        continue
        
    print(f"Uploading {file_path}...")
    with open(file_path, "rb") as f:
        response = requests.post(
            url,
            params={"course_id": course_id},
            files={"file": (os.path.basename(file_path), f)}
        )
    
    if response.status_code == 200:
        print(f"✅ Success: {response.json()}")
    else:
        print(f"❌ Failed ({response.status_code}): {response.text}")

print("Testing complete.")
