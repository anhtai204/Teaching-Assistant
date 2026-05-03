from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:22042004@localhost:5433/ai_assistant"
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Updating schema for Moderation and Analytics...")
    try:
        # chat_messages updates
        conn.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS was_unanswered BOOLEAN DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS manual_answer TEXT;"))
        
        # knowledge_gaps updates
        conn.execute(text("ALTER TABLE knowledge_gaps ADD COLUMN IF NOT EXISTS frequency INTEGER DEFAULT 1;"))
        conn.execute(text("ALTER TABLE knowledge_gaps ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';"))
        
        conn.commit()
        print("Schema updated successfully.")
    except Exception as e:
        print(f"Error: {e}")
