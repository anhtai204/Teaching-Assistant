
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Running migrations...")
    try:
        conn.execute(text("ALTER TABLE documents RENAME COLUMN lecturer_id TO owner_id"))
        print("- Renamed lecturer_id to owner_id")
    except Exception as e:
        print(f"- Skip rename: {e}")
        
    try:
        conn.execute(text("ALTER TABLE documents ADD COLUMN course_id UUID REFERENCES courses(id)"))
        print("- Added course_id column")
    except Exception as e:
        print(f"- Skip add course_id: {e}")
    
    conn.commit()
    print("Migration complete.")
