import os
from dotenv import load_dotenv
from src.rag.embedding import get_embedding
from src.rag.retriever import call_llm

load_dotenv()

def test_gemini_embedding():
    print("\n--- Testing Gemini Embedding ---")
    try:
        embedding = get_embedding()
        text = "AI Teaching Assistant is very helpful."
        vector = embedding.embed_query(text)
        print(f"Success! Vector length: {len(vector)}")
        print(f"Model: {getattr(embedding, 'model', 'unknown')}")
    except Exception as e:
        print(f"Embedding failed: {e}")

def test_gemini_generation():
    print("\n--- Testing Gemini Generation ---")
    try:
        prompt = "Explain what a RAG system is in one sentence."
        response = call_llm(prompt)
        print(f"Prompt: {prompt}")
        print(f"Response: {response}")
    except Exception as e:
        print(f"Generation failed: {e}")

if __name__ == "__main__":
    if not os.getenv("GOOGLE_API_KEY"):
        print("Error: GOOGLE_API_KEY not found in .env")
    else:
        test_gemini_embedding()
        test_gemini_generation()
