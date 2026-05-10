# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Install system dependencies required for ML libraries, audio processing (Whisper), and database
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download Faster-Whisper model to avoid runtime downloads
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8')"

# Copy the rest of the backend source code
COPY . .

# Expose port (Render sets the PORT environment variable dynamically)
EXPOSE 8000

# Start the FastAPI application
# Using sh -c allows us to use the $PORT variable provided by Render, with a fallback to 8000
CMD sh -c "uvicorn src.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
