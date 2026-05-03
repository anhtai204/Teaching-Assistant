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
import whisper

md = MarkItDown()
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        print("Loading Whisper model (small) for better Vietnamese support...")
        # 'small' is significantly better for Vietnamese than 'base'
        _whisper_model = whisper.load_model("small")
    return _whisper_model

def transcribe_with_whisper(file_path):
    model = get_whisper_model()
    print(f"Transcribing {file_path} with Whisper (Music/Speech Optimized)...")
    
    # Cấu hình chuyên sâu để xử lý tốt hơn cả giọng hát và lời nói:
    # - condition_on_previous_text=False: Giúp tránh bị lặp từ khi gặp đoạn nhạc dạo.
    # - compression_ratio_threshold: Lọc bỏ các đoạn bị lặp lại vô nghĩa.
    result = model.transcribe(
        file_path, 
        language=None, # Tự động nhận diện ngôn ngữ (Tiếng Anh, Tiếng Việt, ...)
        fp16=False,
        temperature=0.0,
        initial_prompt="This is a professional lecture in English or Vietnamese. Accurate transcription only. / Đây là bài giảng chuyên môn tiếng Anh hoặc tiếng Việt.",
        condition_on_previous_text=False,
        compression_ratio_threshold=2.4,
        no_speech_threshold=0.8,
        logprob_threshold=-1.0
    )
    
    # Danh sách các câu thường bị "ảo giác" (hallucination) - Song ngữ
    hallucination_blacklist = [
        "Hãy subscribe cho kênh",
        "Ghiền Mì Gõ",
        "không bỏ lỡ những video hấp dẫn",
        "Cảm ơn các bạn đã xem video",
        "Like và subscribe",
        "Nhớ nhấn chuông thông báo",
        "Thanks for watching",
        "Please subscribe",
        "Subscribe to my channel",
        "Subtitles by",
        "Amara.org"
    ]

    segments = []
    for s in result.get("segments", []):
        text = s["text"].strip()
        # Loại bỏ các segment quá ngắn hoặc chứa từ khóa ảo giác
        if len(text) < 2:
            continue
        
        is_hallucination = any(phrase.lower() in text.lower() for phrase in hallucination_blacklist)
        if not is_hallucination:
            segments.append(text)
            
    return "\n".join(segments)

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
from typing import List

def ingest():
    # This remains for batch processing if needed, but would need db session
    pass

def ingest_file(file_path: str, document_id: str, course_id: str, db: Session):
    """Processes a single file and adds it to both vector store and PostgreSQL."""
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    file_name = os.path.basename(file_path)
    try:
        ext = file_name.split('.')[-1].lower()
        if ext in ['mp3', 'mp4', 'wav', 'm4a', 'flac']:
            print(f'Transcribing {file_name} with Whisper...')
            content = transcribe_with_whisper(file_path)
        else:
            print(f'Converting {file_name} to markdown...')
            result = md.convert(file_path)
            content = result.text_content
        
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
        
        # 1. Save to Vector Store (ChromaDB)
        vectorstore = get_vectorstore()
        add_documents(vectorstore, chunks)
        
        # 2. Save to PostgreSQL (document_chunks table)
        embedding_model = get_embedding()
        
        print(f"Saving {len(chunks)} chunks to PostgreSQL...")
        for chunk in chunks:
            # Generate embedding
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
        
        db.commit()
        print(f'Successfully ingested {file_name} to ChromaDB and PostgreSQL')
        return len(chunks)
    except Exception as e:
        db.rollback()
        print(f'Error ingesting {file_name}: {e}')
        raise e

