FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

RUN apt-get update && apt-get install -y \
    ffmpeg libsm6 libxext6 build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .

# Install theo nhóm
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir numpy>=1.26.0 hnswlib setuptools wheel && \
    pip install --no-cache-dir --no-deps chromadb==0.5.5 sentence-transformers>=3.0.1 faster-whisper && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download Faster-Whisper model to avoid runtime downloads
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8')"

COPY . .
EXPOSE 8000
CMD sh -c "uvicorn src.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"