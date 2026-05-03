
import sys
import os

# Add src to path
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'src')))

from src.database import SessionLocal
from src.models import User, Course, course_enrollments
from sqlalchemy import select

def check_enrollments():
    db = SessionLocal()
    try:
        # Check all enrollments
        print("--- All Enrollments ---")
        enrollments = db.execute(select(course_enrollments)).all()
        for e in enrollments:
            print(f"Student: {e.student_id}, Course: {e.course_id}")
        
        # Check students
        print("\n--- Students ---")
        students = db.query(User).filter(User.role == 'student').all()
        for s in students:
            print(f"ID: {s.id}, Email: {s.email}, Enrolled Courses Count: {len(s.enrolled_courses)}")
            for c in s.enrolled_courses:
                print(f"  - {c.name} ({c.code})")

    finally:
        db.close()

if __name__ == "__main__":
    check_enrollments()
