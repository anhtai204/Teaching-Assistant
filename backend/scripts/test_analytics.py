import sys
import os
from uuid import uuid4
from datetime import datetime, timedelta

# Add parent directory to path to import src
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.database import SessionLocal
from src.models import User, Course, ChatSession, ChatMessage, KnowledgeGap

def seed_test_analytics_data():
    db = SessionLocal()
    try:
        # 1. Get a test lecturer and student (or create if not exists)
        lecturer = db.query(User).filter(User.role == "lecturer").first()
        student = db.query(User).filter(User.role == "student").first()
        
        if not lecturer or not student:
            print("Error: Need at least one lecturer and one student in DB.")
            return

        # 2. Get or create a test course
        course = db.query(Course).filter(Course.lecturer_id == lecturer.id).first()
        if not course:
            print(f"Creating test course for lecturer {lecturer.full_name}...")
            course = Course(
                name="Test Analytics Course",
                code="ANLY-101",
                lecturer_id=lecturer.id
            )
            db.add(course)
            db.commit()
            db.refresh(course)

        print(f"Using Course: {course.name} ({course.id})")

        # 3. Create a chat session with negative feedback
        print("Seeding negative feedback chat sessions...")
        session = ChatSession(
            student_id=student.id,
            course_id=course.id,
            title="Trouble with Matrix Multiplication"
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        # Seed 3 pairs of "Bad" messages about the same topic
        topics = [
            "How do I multiply two 3x3 matrices?",
            "I don't understand the dot product in matrix multiplication.",
            "Can you explain the steps for matrix multiplication again? AI failed."
        ]

        for text in topics:
            # User asks
            u_msg = ChatMessage(
                session_id=session.id,
                role="user",
                content=text
            )
            db.add(u_msg)
            
            # AI answers poorly
            a_msg = ChatMessage(
                session_id=session.id,
                role="assistant",
                content="I'm sorry, I cannot find specific info in the slides about matrix multiplication steps.",
                feedback_rating=-1, # Bad rating
                is_flagged=True     # Flagged
            )
            db.add(a_msg)
        
        db.commit()
        print("✅ Seeded 3 negative feedback pairs about 'Matrix Multiplication'.")
        print("\nNEXT STEPS:")
        print(f"1. Open Lecturer Dashboard for Course ID: {course.id}")
        print("2. Click 'Analyze Insights' button.")
        print("3. Check if 'Matrix Multiplication' appears in Knowledge Gaps.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_test_analytics_data()
