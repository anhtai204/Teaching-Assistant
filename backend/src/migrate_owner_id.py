from src.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        print("Migrating 'lecturer_id' to 'owner_id' in 'documents' table...")
        try:
            # Check if lecturer_id exists and owner_id does not
            # This is a simple way to handle the rename in PostgreSQL/SQLite
            conn.execute(text("ALTER TABLE documents RENAME COLUMN lecturer_id TO owner_id;"))
            conn.commit()
            print("Successfully renamed lecturer_id to owner_id.")
        except Exception as e:
            print(f"Error or already migrated: {e}")

if __name__ == "__main__":
    migrate()
