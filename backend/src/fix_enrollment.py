
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

student_id = "bf519ad1-1915-4c2c-8fa5-bc23df00ea5f"
course_id = "1c11b3b2-d1b8-4e70-a177-95591fb84fa1"

with engine.connect() as conn:
    result = conn.execute(text(f"SELECT * FROM course_enrollments WHERE student_id = '{student_id}' AND course_id = '{course_id}'"))
    enrollment = result.fetchone()
    
    if enrollment:
        print("Student is already enrolled.")
    else:
        print("Enrolling student...")
        conn.execute(text(f"INSERT INTO course_enrollments (student_id, course_id) VALUES ('{student_id}', '{course_id}')"))
        conn.commit()
        print("Enrolled successfully.")
