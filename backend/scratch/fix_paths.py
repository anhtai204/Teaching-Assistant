from src.database import SessionLocal
from src.models import Document

def fix():
    db = SessionLocal()
    try:
        docs = db.query(Document).all()
        for d in docs:
            old_url = d.storage_url
            new_url = old_url.replace('\\', '/')
            if old_url != new_url:
                print(f"Fixing {old_url} -> {new_url}")
                d.storage_url = new_url
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    fix()
