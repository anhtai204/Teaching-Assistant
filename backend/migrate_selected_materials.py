from src.database import engine
from sqlalchemy import text

def migrate():
    print("Migrating database...")
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS selected_materials JSONB DEFAULT '[]'::jsonb"))
    print("Migration successful!")

if __name__ == "__main__":
    migrate()
