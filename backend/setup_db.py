import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_database():
    # Database connection details
    host = os.getenv("POSTGRES_SERVER", "localhost")
    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "22042004")
    db_name = os.getenv("POSTGRES_DB", "ai_assistant")
    port = os.getenv("POSTGRES_PORT", "5433")

    print(f"Connecting to PostgreSQL at {host}:{port}...")

    try:
        # Connect to default 'postgres' database first to create the target DB
        conn = psycopg2.connect(
            host=host,
            user=user,
            password=password,
            port=port,
            database="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()

        # Check if database exists
        cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{db_name}'")
        exists = cur.fetchone()
        
        if not exists:
            print(f"Creating database '{db_name}'...")
            cur.execute(f"CREATE DATABASE {db_name}")
        else:
            print(f"Database '{db_name}' already exists.")

        cur.close()
        conn.close()

        # Connect to the target database and run the schema
        print(f"Applying schema from init_db.sql to '{db_name}'...")
        conn = psycopg2.connect(
            host=host,
            user=user,
            password=password,
            port=port,
            database=db_name
        )
        cur = conn.cursor()

        # Read SQL script
        schema_path = os.path.join(os.path.dirname(__file__), "init_db.sql")
        with open(schema_path, "r", encoding="utf-8") as f:
            sql_script = f.read()

        # Execute script
        cur.execute(sql_script)
        conn.commit()
        
        print("✅ Database initialized successfully!")

    except Exception as e:
        print(f"❌ Error setting up database: {e}")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    setup_database()
