
import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

for table_name in ["courses", "documents", "users"]:
    print(f"\nColumns in '{table_name}' table:")
    columns = inspector.get_columns(table_name)
    for column in columns:
        print(f"- {column['name']} ({column['type']})")
