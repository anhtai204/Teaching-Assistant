import os
import asyncio
from sqlalchemy import text
from src.database import engine
from dotenv import load_dotenv

load_dotenv()

def check_courses():
    with engine.connect() as conn:
        print("\n--- Users ---")
        users = conn.execute(text("SELECT id, email, full_name, role FROM users LIMIT 5")).all()
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Name: {u.full_name}, Role: {u.role}")

        print("\n--- Courses ---")
        courses = conn.execute(text("SELECT id, name, code FROM courses LIMIT 5")).all()
        for c in courses:
            print(f"ID: {c.id}, Name: {c.name}, Code: {c.code}")

        print("\n--- Enrollments ---")
        enrollments = conn.execute(text("SELECT student_id, course_id FROM course_enrollments LIMIT 5")).all()
        for e in enrollments:
            print(f"Student: {e.student_id}, Course: {e.course_id}")

if __name__ == "__main__":
    check_courses()
