from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:22042004@localhost:5433/ai_assistant"
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("\n--- Users ---")
    result = conn.execute(text("SELECT id, email, full_name, role FROM users"))
    users = result.all()
    for u in users:
        print(f"ID: {u.id}, Email: {u.email}, Name: {u.full_name}, Role: {u.role}")

    print("\n--- Courses ---")
    result = conn.execute(text("SELECT id, name, code, lecturer_id FROM courses"))
    courses = result.all()
    for c in courses:
        print(f"ID: {c.id}, Name: {c.name}, Code: {c.code}, LecturerID: {c.lecturer_id}")
