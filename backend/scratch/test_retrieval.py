from src.rag.retriever import retrieve_dense
import json

query = 'Định nghĩa về trí tuệ nhân tạo'
course_id = '1d0a80c8-3cf7-42e8-8cf4-f5e6e15d4a49'

print(f"Testing retrieval for: '{query}' in course: {course_id}")
results = retrieve_dense(query, course_id=course_id)

print(f"Final results count: {len(results)}")
for i, r in enumerate(results):
    print(f"Result {i+1}:")
    print(f"  Score: {r['score']}")
    print(f"  Source: {r['metadata'].get('source')}")
    print(f"  Text: {r['text'][:200]}...")
