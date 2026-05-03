from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:22042004@localhost:5433/ai_assistant"
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Adding is_visible column to documents table...")
    try:
        conn.execute(text("ALTER TABLE documents ADD COLUMN is_visible BOOLEAN DEFAULT TRUE;"))
        conn.commit()
        print("Column added successfully.")
    except Exception as e:
        print(f"Error: {e}")
