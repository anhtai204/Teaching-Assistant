from typing import Optional, List
import os
from langchain_text_splitters import RecursiveCharacterTextSplitter
try:
    from src.rag.embedding import get_embedding
    from src.rag.vectorstore import get_vectorstore, add_documents
    from src.config import CHROMA_DB_DIR, DOCUMENT_PATH, CHUNK_SIZE, CHUNK_OVERLAP
except ImportError:
    from rag.embedding import get_embedding
    from rag.vectorstore import get_vectorstore, add_documents
    from config import CHROMA_DB_DIR, DOCUMENT_PATH, CHUNK_SIZE, CHUNK_OVERLAP

# Ensure ffmpeg installed via winget is available in PATH
winget_path = os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Links")
if winget_path not in os.environ.get("PATH", ""):
    os.environ["PATH"] += os.pathsep + winget_path

from markitdown import MarkItDown
from langchain_core.documents import Document as LCDocument
import os

md = MarkItDown()
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        print("Loading Faster-Whisper model (small) with INT8 quantization for efficiency...")
        # 'small' is great for Vietnamese. int8 makes it very light on RAM.
        _whisper_model = WhisperModel("small", device="cpu", compute_type="int8")
    return _whisper_model

def transcribe_with_whisper(file_path):
    try:
        model = get_whisper_model()
        print(f"--- Starting Faster-Whisper Transcription for: {os.path.basename(file_path)} ---")
        
        # faster-whisper returns a generator of segments
        segments, info = model.transcribe(
            file_path,
            beam_size=5,
            language=None, # Auto-detect
            initial_prompt="This is a professional lecture in English or Vietnamese. Accurate transcription only.",
            vad_filter=True, # Voice Activity Detection to filter out silence/noise
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        
        full_text = []
        for segment in segments:
            full_text.append(segment.text)
            
        print(f"✅ Transcription completed. Extracted {sum(len(t) for t in full_text)} characters.")
        
        # Extract and filter segments
        hallucination_blacklist = [
            "Hãy subscribe cho kênh", "Ghiền Mì Gõ", "không bỏ lỡ những video hấp dẫn",
            "Cảm ơn các bạn đã xem video", "Like và subscribe", "Nhớ nhấn chuông thông báo",
            "Thanks for watching", "Please subscribe", "Subscribe to my channel",
            "Subtitles by", "Amara.org"
        ]

        filtered_segments = []
        for text in full_text:
            text = text.strip()
            if len(text) < 2: continue
            
            is_hallucination = any(phrase.lower() in text.lower() for phrase in hallucination_blacklist)
            if not is_hallucination:
                filtered_segments.append(text)
                
        return "\n".join(filtered_segments)
    except Exception as e:
        print(f"❌ Faster-Whisper Transcription Error: {e}")
        raise e

def load_documents():
    docs = []

    if not os.path.exists(DOCUMENT_PATH):
        os.makedirs(DOCUMENT_PATH)
        return []

    for file in os.listdir(DOCUMENT_PATH):
        path = os.path.join(DOCUMENT_PATH, file)
        
        # Skip directories
        if os.path.isdir(path):
            continue

        try:
            ext = file.split('.')[-1].lower()
            if ext in ['mp3', 'mp4', 'wav', 'm4a', 'flac']:
                print(f'Transcribing {file} with Whisper...')
                content = transcribe_with_whisper(path)
            else:
                print(f'Converting {file} to markdown...')
                result = md.convert(path)
                content = result.text_content
            
            # Create a LangChain Document from the content
            doc = LCDocument(
                page_content=content,
                metadata={
                    "source": file,
                    "file_path": path,
                    "format": ext
                }
            )
            docs.append(doc)
            print(f'Successfully loaded {file}')
        except Exception as e:
            print(f'Error loading {file}: {e}')

    print(f"Total loaded: {len(docs)} documents")
    return docs

# chunk strategy
def chunk_documents(documents):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP
    )

    chunks = splitter.split_documents(documents)

    print(f"Split into {len(chunks)} chunks")

    return chunks

from src.models import DocumentChunk
from sqlalchemy.orm import Session

def ingest():
    # This remains for batch processing if needed, but would need db session
    pass

def ingest_file(file_path: str, document_id: str, course_id: Optional[str], db: Session):
    """Processes a single file and adds it to both vector store and PostgreSQL."""
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    file_name = os.path.basename(file_path)
    try:
        ext = file_name.split('.')[-1].lower()
        print(f"Processing file: {file_name} (Type: {ext})")
        
        if ext in ['mp3', 'mp4', 'wav', 'm4a', 'flac']:
            print(f'Transcribing {file_name} with Whisper...')
            content = transcribe_with_whisper(file_path)
        else:
            print(f'Converting {file_name} to markdown...')
            result = md.convert(file_path)
            content = result.text_content
        
        if not content or len(content.strip()) == 0:
            print(f"⚠️ Warning: No content extracted from {file_name}. Please check if the file is empty or password protected.")
            return 0
            
        print(f"Extracted {len(content)} characters from {file_name}.")

        doc = LCDocument(
            page_content=content,
            metadata={
                "source": file_name,
                "file_path": file_path,
                "format": ext,
                "is_visible": True,
                "document_id": str(document_id),
                "course_id": str(course_id)
            }
        )
        
        chunks = chunk_documents([doc])
        if not chunks:
            print(f"⚠️ Warning: No chunks created for {file_name}")
            return 0
            
        # 1. Save to PostgreSQL (document_chunks table) with pgvector
        embedding_model = get_embedding()
        
        print(f"Saving {len(chunks)} chunks to PostgreSQL...")
        for i, chunk in enumerate(chunks):
            # Generate embedding
            try:
                if hasattr(embedding_model, "embed_query"):
                    emb = embedding_model.embed_query(chunk.page_content)
                else:
                    emb = embedding_model.encode(chunk.page_content).tolist()
                
                db_chunk = DocumentChunk(
                    document_id=document_id,
                    content=chunk.page_content,
                    embedding=emb,
                    metadata_json=chunk.metadata
                )
                db.add(db_chunk)
                if (i + 1) % 10 == 0:
                    print(f"  Processed {i + 1}/{len(chunks)} chunks...")
            except Exception as emb_err:
                print(f"❌ Error creating embedding for chunk {i}: {emb_err}")
                raise emb_err
        
        db.commit()
        print(f'✅ Successfully ingested {file_name} to Supabase pgvector ({len(chunks)} chunks)')
        return len(chunks)
    except Exception as e:
        db.rollback()
        print(f'❌ Error ingesting {file_name}: {e}')
        raise e

