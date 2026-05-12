from typing import Optional, List
import os
from langchain_text_splitters import RecursiveCharacterTextSplitter
from src.rag.embedding import get_embedding
from src.rag.vectorstore import get_vectorstore, add_documents
from src.config import CHROMA_DB_DIR, DOCUMENT_PATH, CHUNK_SIZE, CHUNK_OVERLAP

# Ensure ffmpeg installed via winget is available in PATH
winget_path = os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Links")
if winget_path not in os.environ.get("PATH", ""):
    os.environ["PATH"] += os.pathsep + winget_path

from markitdown import MarkItDown
from langchain_core.documents import Document as LCDocument
import os

md = MarkItDown()
def transcribe_with_whisper(file_path):
    """Transcribe audio/video using OpenAI Whisper API (Cloud)."""
    try:
        import openai
        from src.config import OPENAI_API_KEY
        
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        
        print(f"--- Starting OpenAI Cloud Whisper Transcription for: {os.path.basename(file_path)} ---")
        
        with open(file_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json"
            )
            
        full_text = []
        if hasattr(transcript, 'segments'):
            for segment in transcript.segments:
                # Format: [t=10s] Nội dung...
                timestamp_prefix = f"[t={int(segment['start'])}s]"
                full_text.append(f"{timestamp_prefix} {segment['text'].strip()}")
        else:
            full_text.append(transcript.text)
            
        print(f"✅ Transcription completed via Cloud API. Extracted {sum(len(t) for t in full_text)} characters.")
        
        return "\n".join(full_text)
    except Exception as e:
        print(f"❌ OpenAI Whisper API Error: {e}")
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

