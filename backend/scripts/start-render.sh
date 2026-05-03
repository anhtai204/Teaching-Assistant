#!/bin/bash
set -e

echo "--- Starting Application Initialization ---"
echo "📍 Working directory: $(pwd)"
echo "📂 Contents of current directory:"
ls -F

# Set PYTHONPATH - Python tự động đọc biến env này vào sys.path
# Đây là cách chuẩn, không dùng --pythonpath của gunicorn (dễ gây lỗi)
export PYTHONPATH="$(pwd):${PYTHONPATH}"
echo "🐍 PYTHONPATH: $PYTHONPATH"

# Xóa các symlink rác nếu có
if [ -L "src/src" ]; then
    echo "🧹 Cleaning up redundant symlink src/src..."
    rm src/src
fi

# ⚡ KIỂM TRA IMPORT TRƯỚC KHI CHẠY GUNICORN
# Lệnh này sẽ hiển thị lỗi Python chi tiết nếu có vấn đề với code/dependencies
echo "--- Pre-flight: Testing Python import ---"
python -c "from src.app.main import app; print('✅ Import OK - app found')" 2>&1 || {
    echo "❌ Import FAILED. See traceback above."
    exit 1
}

echo "--- Launching Gunicorn Server ---"
exec gunicorn \
  -w 1 \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:${PORT:-10000} \
  --timeout 120 \
  --log-level debug \
  src.app.main:app
