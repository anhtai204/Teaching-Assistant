"""
Migration: Add owner_id column to documents table.
The model was refactored to use owner_id (user FK) + many-to-many course_document_links,
but the DB schema was never updated from the original init_db.sql.
"""
import os, urllib.parse
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load .env the same way src/database.py does
base_dir = os.path.dirname(os.path.abspath(__file__))          # backend/
project_root = os.path.dirname(base_dir)                        # project root
load_dotenv(os.path.join(project_root, ".env"))                 # project root .env
load_dotenv(os.path.join(base_dir, ".env"), override=False)     # backend/.env (if any)

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
if not DATABASE_URL:
    host = os.getenv("POSTGRES_SERVER", "localhost")
    user = os.getenv("POSTGRES_USER", "postgres")
    password = urllib.parse.quote_plus(os.getenv("POSTGRES_PASSWORD", ""))
    port = os.getenv("POSTGRES_PORT", "5432")
    db = os.getenv("POSTGRES_DB", "ai_assistant")
    DATABASE_URL = f"postgresql://{user}:{password}@{host}:{port}/{db}"

print(f"Connecting to: {DATABASE_URL[:50]}...")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

migrations = [
    # 1. Add owner_id (nullable FK to users)
    """
    ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE CASCADE;
    """,
    # 2. Add is_visible if somehow missing
    """
    ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;
    """,
    # 3. Create course_document_links junction table if not exists
    """
    CREATE TABLE IF NOT EXISTS course_document_links (
        course_id    UUID REFERENCES courses(id) ON DELETE CASCADE,
        document_id  UUID REFERENCES documents(id) ON DELETE CASCADE,
        linked_at    TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (course_id, document_id)
    );
    """,
    # 4. Migrate existing course_id data → course_document_links (if course_id column exists)
    """
    INSERT INTO course_document_links (course_id, document_id)
    SELECT course_id, id
    FROM documents
    WHERE course_id IS NOT NULL
    ON CONFLICT DO NOTHING;
    """,
]

with engine.connect() as conn:
    for sql in migrations:
        try:
            conn.execute(text(sql.strip()))
            conn.commit()
            print(f"✅ OK: {sql.strip()[:60]}...")
        except Exception as e:
            conn.rollback()
            print(f"⚠️  Skipped (may already exist): {e}")

print("\nMigration complete.")
