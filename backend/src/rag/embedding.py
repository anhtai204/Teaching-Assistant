from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv
import os

load_dotenv()

_embedding_model = None

def get_embedding():
    global _embedding_model
    if _embedding_model is not None:
        return _embedding_model

    try:
        # Ưu tiên OpenAI Embeddings vì Google API Key đã hết hạn
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            from src.config import OPENAI_API_KEY as config_key
            api_key = config_key
            
        print(f"Initializing OpenAI Embedding (text-embedding-3-small, 768 dims)...")
        _embedding_model = OpenAIEmbeddings(
            model="text-embedding-3-small", 
            api_key=api_key,
            dimensions=768 # Khớp với cấu hình Vector(768) trong models.py
        )
        return _embedding_model
    except Exception as e:
        print(f"⚠️ OpenAI Embeddings failed, attempting Google Cloud fallback: {e}")
        
        # Fallback về Google Gemini Embedding (Cloud) thay vì Local model
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        from src.config import GOOGLE_API_KEY
        
        _embedding_model = GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-004",
            google_api_key=GOOGLE_API_KEY
        )
        return _embedding_model
