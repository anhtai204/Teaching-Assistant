from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:22042004@localhost:5433/ai_assistant"
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Fixing missing columns in courses table...")
    try:
        # Add enrollment_code
        conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS enrollment_code TEXT UNIQUE;"))
        # Add greeting_message
        conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS greeting_message TEXT;"))
        
        conn.commit()
        print("Success! Table courses updated.")
    except Exception as e:
        print(f"Error: {e}")
