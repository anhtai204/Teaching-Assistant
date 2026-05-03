from src.database import SessionLocal
from src.models import Document, DocumentChunk

def check():
    db = SessionLocal()
    docs = db.query(Document).all()
    print(f"{'Document Name':<30} | {'Status':<10} | {'Chunks':<6}")
    print("-" * 52)
    for d in docs:
        count = db.query(DocumentChunk).filter(DocumentChunk.document_id == d.id).count()
        print(f"{d.name:<30} | {d.status:<10} | {count:<6}")
    db.close()

if __name__ == "__main__":
    check()
