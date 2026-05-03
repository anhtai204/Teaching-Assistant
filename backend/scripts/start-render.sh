#!/usr/bin/env bash
set -e  # Exit on error

echo "--- Starting Application Initialization ---"
echo "--- Launching Gunicorn Server ---"

# Debug: List files/modules
ls -la *.py
pip list | grep gunicorn

# Chạy với debug
exec gunicorn main:app \
  --bind 0.0.0.0:${PORT:-10000} \
  --workers 1 \
  --worker-class uvicorn.workers.UvicornWorker \
  --timeout 120 \
  --log-level info \
  --preload
