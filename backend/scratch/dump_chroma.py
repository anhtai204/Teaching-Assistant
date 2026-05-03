from src.rag.vectorstore import get_vectorstore
import json

vectorstore = get_vectorstore()
# Get some documents to see metadata
print("Fetching some raw metadata from ChromaDB...")
data = vectorstore._collection.get(limit=10, include=['metadatas', 'documents'])

if not data['metadatas']:
    print("No metadata found in collection!")
else:
    for i, meta in enumerate(data['metadatas']):
        print(f"Doc {i+1}:")
        print(f"  Source: {meta.get('source')}")
        print(f"  CourseID: '{meta.get('course_id')}'")
        print(f"  Visible: {meta.get('is_visible')}")
        print(f"  Text preview: {data['documents'][i][:50]}...")
