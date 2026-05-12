
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Cleaning up documents table columns...")
    
    # 1. Ensure lecturer_id has the correct data (from owner_id if needed)
    try:
        conn.execute(text("UPDATE documents SET lecturer_id = owner_id WHERE lecturer_id IS NULL AND owner_id IS NOT NULL"))
        print("- Sync data from owner_id to lecturer_id")
    except Exception as e:
        print(f"- Data sync skipped: {e}")

    # 2. Drop owner_id
    try:
        conn.execute(text("ALTER TABLE documents DROP COLUMN owner_id"))
        print("- Dropped owner_id")
    except Exception as e:
        print(f"- Drop owner_id failed: {e}")

    # 3. Drop course_id (it's already in the links table now)
    try:
        conn.execute(text("ALTER TABLE documents DROP COLUMN course_id"))
        print("- Dropped course_id")
    except Exception as e:
        print(f"- Drop course_id failed: {e}")

    conn.commit()
    print("Cleanup complete.")
