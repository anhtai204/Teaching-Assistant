
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Checking documents table:")
    result = conn.execute(text("SELECT id, name, course_id, owner_id FROM documents LIMIT 5"))
    for row in result:
        print(f"Document: {row[1]} | course_id: {row[2]} | owner_id: {row[3]}")
