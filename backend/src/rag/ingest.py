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
import subprocess
from langchain_community.document_loaders import PyPDFLoader
from src.models import DocumentChunk
from sqlalchemy.orm import Session

md = MarkItDown()

def convert_office_to_pdf(file_path: str) -> str:
    """Converts Office documents to PDF using LibreOffice (soffice)."""
    try:
        output_dir = os.path.dirname(file_path)
        print(f"--- Converting to PDF: {os.path.basename(file_path)} ---")
        
        # Determine the soffice command/path
        soffice_path = "soffice" # Default for Linux/Docker/PATH
        
        if os.name == 'nt': # Windows specific detection
            common_paths = [
                r"C:\Program Files\LibreOffice\program\soffice.exe",
                r"C:\Program Files (x86)\LibreOffice\program\soffice.exe"
            ]
            for p in common_paths:
                if os.path.exists(p):
                    soffice_path = p
                    break
        
        cmd = [
            soffice_path,
            "--headless",
            "--convert-to", "pdf",
            "--outdir", output_dir,
            file_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode != 0:
            print(f"❌ LibreOffice Error: {result.stderr}")
            return None
            
        pdf_path = os.path.splitext(file_path)[0] + ".pdf"
        if os.path.exists(pdf_path):
            print(f"✅ Successfully converted to PDF: {os.path.basename(pdf_path)}")
            return pdf_path
        return None
    except Exception as e:
        if "FileNotFoundError" in str(type(e)) or "[WinError 2]" in str(e):
            print("⚠️ LibreOffice (soffice) not found in PATH or standard install locations.")
            print("💡 Please install LibreOffice or ensure 'soffice' is in your environment variables.")
        else:
            print(f"❌ Office Conversion Error: {e}")
        return None

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
        if hasattr(transcript, 'segments') and transcript.segments:
            for segment in transcript.segments:
                # Use attribute access (.start, .text) for Pydantic models in OpenAI SDK v1
                timestamp_prefix = f"[t={int(segment.start)}s]"
                full_text.append(f"{timestamp_prefix} {segment.text.strip()}")
        else:
            full_text.append(transcript.text)
            
        print(f"✅ Transcription completed via Cloud API. Extracted {sum(len(t) for t in full_text)} characters.")
        
        return "\n".join(full_text)
    except Exception as e:
        print(f"❌ OpenAI Whisper API Error: {e}")
        raise e

def load_documents():
    # Deprecated for the new specific ingest_file flow but kept for compatibility
    docs = []
    if not os.path.exists(DOCUMENT_PATH):
        os.makedirs(DOCUMENT_PATH)
        return []
    for file in os.listdir(DOCUMENT_PATH):
        path = os.path.join(DOCUMENT_PATH, file)
        if os.path.isdir(path): continue
        # ... logic omitted for brevity as we focus on ingest_file ...
    return docs

def chunk_documents(documents):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP
    )
    chunks = splitter.split_documents(documents)
    print(f"Split into {len(chunks)} chunks")
    return chunks

def ingest_file(file_path: str, document_id: str, course_id: Optional[str], db: Session):
    """Processes a single file and adds it to both vector store and PostgreSQL."""
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    file_name = os.path.basename(file_path)
    try:
        ext = file_name.split('.')[-1].lower()
        print(f"Processing file: {file_name} (Type: {ext})")
        
        docs_to_chunk = []
        
        if ext in ['mp3', 'mp4', 'wav', 'm4a', 'flac']:
            # 1. Handle Media (Whisper)
            content = transcribe_with_whisper(file_path)
            docs_to_chunk.append(LCDocument(
                page_content=content,
                metadata={
                    "source": file_name,
                    "file_path": file_path,
                    "format": ext,
                    "document_id": str(document_id)
                }
            ))
        elif ext in ['pdf', 'docx', 'pptx', 'xlsx', 'txt', 'md']:
            # 2. Handle PDF and all text-based files (Standardize to PDF for Page-Level)
            target_pdf = file_path
            if ext != 'pdf':
                converted_pdf = convert_office_to_pdf(file_path)
                if converted_pdf:
                    target_pdf = converted_pdf
                else:
                    # Fallback to MarkItDown for TXT/MD if conversion fails
                    print(f"⚠️ Fallback to Markdown for {file_name}")
                    result = md.convert(file_path)
                    docs_to_chunk.append(LCDocument(
                        page_content=result.text_content,
                        metadata={"source": file_name, "file_path": file_path, "format": ext, "document_id": str(document_id)}
                    ))
            
            if ext == 'pdf' or (ext != 'pdf' and target_pdf != file_path):
                print(f"Loading {os.path.basename(target_pdf)} with PyPDFLoader...")
                loader = PyPDFLoader(target_pdf)
                pages = loader.load()
                for p in pages:
                    p.metadata.update({
                        "source": file_name,
                        "file_path": file_path,
                        "format": ext,
                        "document_id": str(document_id),
                        "page": p.metadata.get("page", 0) + 1 # PyPDF is 0-indexed
                    })
                docs_to_chunk.extend(pages)
        else:
            # 3. Handle Text/Markdown
            result = md.convert(file_path)
            docs_to_chunk.append(LCDocument(
                page_content=result.text_content,
                metadata={
                    "source": file_name,
                    "file_path": file_path,
                    "format": ext,
                    "document_id": str(document_id)
                }
            ))

        if not docs_to_chunk:
            print(f"⚠️ Warning: No content extracted from {file_name}")
            return 0
            
        chunks = chunk_documents(docs_to_chunk)
        
        # 1. Save to PostgreSQL with pgvector
        embedding_model = get_embedding()
        print(f"Saving {len(chunks)} chunks to PostgreSQL...")
        
        for i, chunk in enumerate(chunks):
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
                if (i + 1) % 20 == 0:
                    print(f"  Processed {i + 1}/{len(chunks)} chunks...")
            except Exception as emb_err:
                print(f"❌ Error creating embedding for chunk {i}: {emb_err}")
                raise emb_err
        
        db.commit()
        print(f'✅ Successfully ingested {file_name} ({len(chunks)} chunks)')
        return len(chunks), target_pdf if target_pdf != file_path else None
    except Exception as e:
        db.rollback()
        print(f'❌ Error ingesting {file_name}: {e}')
        raise e

