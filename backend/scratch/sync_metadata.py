from src.database import SessionLocal
from src.models import Document
from src.rag.vectorstore import get_vectorstore
import json

db = SessionLocal()
vectorstore = get_vectorstore()

# Get all indexed documents from DB
docs = db.query(Document).filter(Document.status == 'indexed').all()

print(f"Syncing {len(docs)} documents metadata...")

for d in docs:
    print(f"Updating '{d.name}' (Course: {d.course_id})...")
    # Find chunks in Chroma for this document
    # LangChain Chroma doesn't have an easy 'update by metadata' for all chunks at once easily 
    # but we can use the collection directly
    
    # We'll search for chunks where source == d.name
    results = vectorstore._collection.get(where={"source": d.name})
    ids = results['ids']
    if ids:
        new_metadatas = []
        for m in results['metadatas']:
            m['course_id'] = str(d.course_id)
            m['is_visible'] = d.is_visible
            new_metadatas.append(m)
        
        vectorstore._collection.update(ids=ids, metadatas=new_metadatas)
        print(f"  Successfully updated {len(ids)} chunks.")
    else:
        print(f"  No chunks found for {d.name}")

db.close()
print("Sync complete.")
