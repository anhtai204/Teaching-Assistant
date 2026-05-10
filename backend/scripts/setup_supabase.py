import os
from sqlalchemy import text
from src.database import engine, Base
from src.models import * # Import all models to ensure they are registered with Base.metadata

def setup_supabase():
    print("Connecting to Supabase Postgres...")
    with engine.connect() as conn:
        print("Enabling pgvector extension...")
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()
        print("pgvector extension enabled.")

    print("Creating tables if they don't exist...")
    # This will create tables defined in models.py
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")

if __name__ == "__main__":
    setup_supabase()
