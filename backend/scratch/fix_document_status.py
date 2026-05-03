from src.database import SessionLocal
from src.models import Document, DocumentChunk
from sqlalchemy import func

def fix():
    db = SessionLocal()
    try:
        # Find documents with status 'pending' that have chunks
        docs_to_fix = db.query(Document).filter(Document.status == 'pending').all()
        
        fixed_count = 0
        for d in docs_to_fix:
            chunk_count = db.query(DocumentChunk).filter(DocumentChunk.document_id == d.id).count()
            if chunk_count > 0:
                print(f"Updating '{d.name}' to 'indexed' ({chunk_count} chunks found)")
                d.status = 'indexed'
                fixed_count += 1
        
        db.commit()
        print(f"\nSuccessfully updated {fixed_count} documents to 'indexed'.")
    except Exception as e:
        db.rollback()
        print(f"Error during update: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix()
