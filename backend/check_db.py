from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

# Use the same DB URL as the app
DATABASE_URL = "postgresql://postgres:22042004@localhost:5433/ai_assistant"

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("\n--- Courses ---")
    result = conn.execute(text("SELECT id, name, code, lecturer_id FROM courses"))
    courses = result.all()
    for c in courses:
        print(f"ID: {c.id}, Name: {c.name}, Code: {c.code}, LecturerID: {c.lecturer_id}")
    
    print("\n--- Documents ---")
    result = conn.execute(text("SELECT id, course_id, name, status FROM documents"))
    docs = result.all()
    for d in docs:
        print(f"ID: {d.id}, CourseID: {d.course_id}, Name: {d.name}, Status: {d.status}")

    if not courses:
        print("No courses found.")
    if not docs:
        print("No documents found.")
