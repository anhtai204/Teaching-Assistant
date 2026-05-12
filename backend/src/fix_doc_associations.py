
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # Get the first course ID
    result = conn.execute(text("SELECT id FROM courses LIMIT 1"))
    course_id = result.fetchone()[0]
    
    if course_id:
        print(f"Assigning all documents to course: {course_id}")
        conn.execute(text(f"UPDATE documents SET course_id = '{course_id}' WHERE course_id IS NULL"))
        conn.commit()
        print("Updated successfully.")
    else:
        print("No courses found to assign documents to.")
