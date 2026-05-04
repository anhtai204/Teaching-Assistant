from langchain_google_genai import GoogleGenerativeAIEmbeddings
# from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv
import os
load_dotenv()

def get_embedding():
    try:
        # Use Google Generative AI Embeddings
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            from src.config import GOOGLE_API_KEY as config_key
            api_key = config_key
            
        print(f"Initializing Google Embedding (API)...")
        embedding_model = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001", 
            google_api_key=api_key,
            output_dimensionality=768
        )
        return embedding_model
    except Exception as e:
        print(f"⚠️ Google Embeddings API failed, attempting lightweight fallback: {e}")
        
        # Lazy load heavy library only if needed
        from langchain_community.embeddings import HuggingFaceEmbeddings
        # Use a much smaller model for fallback to save RAM
        return HuggingFaceEmbeddings(model_name='all-MiniLM-L6-v2')

        # Original OpenAI logic (commented out)
        """
        try:
            from langchain_openai import OpenAIEmbeddings
            embedding_model = OpenAIEmbeddings()
            embedding_model.embed_query("test")
            print("Using OpenAIEmbeddings for embedding.")
            return embedding_model
        except Exception as e:
            print(f"Error occurred while initializing OpenAIEmbeddings: {e}")
            from langchain_community.embeddings import HuggingFaceEmbeddings
            return HuggingFaceEmbeddings(model_name='all-MiniLM-L6-v2')
        """
