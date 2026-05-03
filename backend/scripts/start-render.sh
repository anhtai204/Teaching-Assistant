#!/bin/bash

# Exit on error
set -e

echo "--- Starting Application Initialization ---"

# You can add database migration commands here if needed
# python scripts/setup_db.py

echo "--- Launching Gunicorn Server ---"
# Run Gunicorn with Uvicorn workers
# -w 4: Number of worker processes (adjust based on Render plan)
# -k uvicorn.workers.UvicornWorker: Use Uvicorn for ASGI support
# --bind 0.0.0.0:$PORT: Bind to the port provided by Render
gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.app.main:app --bind 0.0.0.0:$PORT --timeout 120
