
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Migrating to Many-to-Many Knowledge Library...")
    
    # 1. Create course_document_links table
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS course_document_links (
            course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
            document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
            linked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            PRIMARY KEY (course_id, document_id)
        )
    """))
    print("- Created course_document_links table")

    # 2. Migrate data from documents.course_id to links table
    # Only if course_id exists in documents (it should, from my previous fix)
    try:
        conn.execute(text("""
            INSERT INTO course_document_links (course_id, document_id)
            SELECT course_id, id FROM documents WHERE course_id IS NOT NULL
            ON CONFLICT DO NOTHING
        """))
        print("- Migrated data to course_document_links")
    except Exception as e:
        print(f"- Data migration skipped or failed: {e}")

    # 3. Rename owner_id back to lecturer_id
    try:
        conn.execute(text("ALTER TABLE documents RENAME COLUMN owner_id TO lecturer_id"))
        print("- Renamed owner_id back to lecturer_id")
    except Exception as e:
        print(f"- Rename lecturer_id skipped: {e}")

    # 4. Drop course_id from documents
    try:
        conn.execute(text("ALTER TABLE documents DROP COLUMN course_id"))
        print("- Dropped course_id from documents table")
    except Exception as e:
        print(f"- Drop course_id skipped: {e}")

    conn.commit()
    print("Migration to Many-to-Many complete.")
