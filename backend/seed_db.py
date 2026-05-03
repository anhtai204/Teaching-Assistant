from backend.src.models import User
from backend.src.database import SessionLocal
from backend.src.models import Course
import bcrypt

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def seed_data():
    db = SessionLocal()
    try:
        # 1. Create a test lecturer
        lecturer = db.query(User).filter(User.email == "lecturer@example.com").first()
        if not lecturer:
            lecturer = User(
                email="lecturer@example.com",
                password_hash=hash_password("password123"),
                full_name="Dr. Smith",
                role="lecturer"
            )
            db.add(lecturer)
            db.commit()
            db.refresh(lecturer)
            print(f"Created lecturer: {lecturer.full_name}")

        # 2. Create a test course
        course = db.query(Course).filter(Course.code == "CS101").first()
        if not course:
            course = Course(
                code="CS101",
                name="Introduction to AI",
                description="Learn the basics of Artificial Intelligence.",
                lecturer_id=lecturer.id
            )
            db.add(course)
            db.commit()
            db.refresh(course)
            print(f"Created course: {course.name}")

        # 3. Create a test student
        student = db.query(User).filter(User.email == "student@example.com").first()
        if not student:
            student = User(
                email="student@example.com",
                password_hash=hash_password("password123"),
                full_name="John Doe",
                role="student"
            )
            db.add(student)
            db.commit()
            db.refresh(student)
            print(f"Created student: {student.full_name}")

        print("✅ Seeding completed!")
    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
