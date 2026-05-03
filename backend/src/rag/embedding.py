from langchain_google_genai import GoogleGenerativeAIEmbeddings
# from langchain_openai import OpenAIEmbeddings
import os

def get_embedding():
    try:
        # Use Google Generative AI Embeddings
        api_key = os.getenv("GOOGLE_API_KEY")
        embedding_model = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001", 
            google_api_key=api_key
        )
        # Test if it works
        embedding_model.embed_query("test")
        print("Using GoogleGenerativeAIEmbeddings (models/embedding-001).")
        return embedding_model
    except Exception as e:
        print(f"Error occurred while initializing GoogleEmbeddings: {e}")
        
        # Fallback to SentenceTransformer via LangChain
        print("Falling back to HuggingFaceEmbeddings.")
        from langchain_community.embeddings import HuggingFaceEmbeddings
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