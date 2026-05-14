import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "gpt-4o-mini")

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

DOCUMENT_PATH = "data/documents"
CHROMA_DB_DIR = "chroma_db"
CHROMA_TENANT = os.getenv("CHROMA_TENANT", "default_tenant")
CHROMA_DATABASE = os.getenv("CHROMA_DATABASE", "default_database")
CHROMA_API_KEY = os.getenv("CHROMA_API_KEY")

CHUNK_SIZE = 500       # Match Vercel_Proj standard
CHUNK_OVERLAP = 50 
TOP_K_SEARCH = 10    # Số chunk lấy từ vector store trước rerank (search rộng)
TOP_K_SELECT = 3 

# Memory system knobs
MEMORY_CONTEXT_TURNS = int(os.getenv("MEMORY_CONTEXT_TURNS", "3"))
MEMORY_FACT_TOP_K = int(os.getenv("MEMORY_FACT_TOP_K", "5"))
MEMORY_FACT_MAX_DISTANCE = float(os.getenv("MEMORY_FACT_MAX_DISTANCE", "1.1"))
MEMORY_SUMMARY_TURNS = int(os.getenv("MEMORY_SUMMARY_TURNS", "12"))
MEMORY_SUMMARY_MODEL = os.getenv("MEMORY_SUMMARY_MODEL", DEFAULT_MODEL)