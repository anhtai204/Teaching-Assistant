import bcrypt
from src.database import SessionLocal
from src.models import User

def create_student():
    db = SessionLocal()
    try:
        # Check if student exists
        email = "student@university.edu"
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"User {email} already exists.")
            return

        salt = bcrypt.gensalt()
        hashed_pw = bcrypt.hashpw("student123".encode('utf-8'), salt).decode('utf-8')
        
        new_student = User(
            email=email,
            password_hash=hashed_pw,
            full_name="Default Student",
            role="student"
        )
        db.add(new_student)
        db.commit()
        print(f"✅ Successfully created student: {email} / student123")
    except Exception as e:
        print(f"❌ Error creating student: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_student()
