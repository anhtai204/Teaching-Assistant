#!/bin/bash
set -euo pipefail

echo "--- Starting Application Initialization ---"
echo "PORT: ${PORT:-10000}"
echo "Working dir: $(pwd)"
ls -la src/
pip list | grep -E "(gunicorn|uvicorn)"

echo "--- Launching Gunicorn Server ---"
exec gunicorn \
  -w 1 \
  -k uvicorn.workers.UvicornWorker \
  --bind "0.0.0.0:${PORT:-10000}" \
  --worker-tmp-dir /dev/shm \
  --preload \
  --timeout 120 \
  --max-requests 1000 \
  --max-requests-jitter 100 \
  --log-level info \
  src.app.main:app
