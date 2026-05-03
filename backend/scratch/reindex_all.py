import os
import shutil
from src.database import SessionLocal
from src.models import Document
from src.rag.vectorstore import get_vectorstore
from src.rag.ingest import ingest_file
from src.config import CHROMA_DB_DIR

print("Step 1: Wiping ChromaDB via API...")
try:
    vectorstore = get_vectorstore()
    vectorstore.delete_collection()
    print("Collection deleted successfully.")
except Exception as e:
    print(f"Warning: Could not delete collection: {e}")

db = SessionLocal()

print("Step 2: Resetting document status in Postgres...")
docs = db.query(Document).all()
for d in docs:
    d.status = 'pending'
db.commit()
print(f"Reset {len(docs)} documents.")

print("Step 3: Re-indexing documents with Gemini...")
# Path to documents folder
DOC_DIR = "data/documents"

for d in docs:
    file_path = os.path.join(DOC_DIR, d.name)
    if os.path.exists(file_path):
        print(f"Processing '{d.name}' for course {d.course_id}...")
        try:
            # We call ingest_file synchronously for this script
            ingest_file(file_path, str(d.id), str(d.course_id), db)
            d.status = 'indexed'
            db.commit()
            print(f"  Done: {d.name}")
        except Exception as e:
            print(f"  Error processing {d.name}: {e}")
    else:
        print(f"  File not found: {file_path}")

db.close()
print("Re-indexing complete! All documents are now using Gemini embeddings.")
