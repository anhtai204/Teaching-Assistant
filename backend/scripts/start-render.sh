#!/bin/bash
set -euo pipefail

export PYTHONPATH=/opt/render/project/src/backend

echo "--- Starting Application Initialization ---"
echo "PORT: ${PORT:-10000}"
echo "Working dir: $(pwd)"

echo "--- Launching Gunicorn Server ---"

exec gunicorn \
  -w 1 \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:${PORT:-10000} \
  --timeout 120 \
  --log-level info \
  app.main:app
