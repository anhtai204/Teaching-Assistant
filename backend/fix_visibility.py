from sqlalchemy import create_engine, text
import os

DATABASE_URL = "postgresql://postgres:22042004@localhost:5433/ai_assistant"
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Updating existing documents to set is_visible=True...")
    result = conn.execute(text("UPDATE documents SET is_visible = True WHERE is_visible IS NULL;"))
    conn.commit()
    print(f"Updated {result.rowcount} rows.")
