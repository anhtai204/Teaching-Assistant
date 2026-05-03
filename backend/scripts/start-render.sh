#!/bin/bash
set -e

echo "--- Starting Application Initialization ---"
echo "📍 Working directory: $(pwd)"

# 1. Đảm bảo PYTHONPATH bao gồm thư mục hiện tại (backend)
# Điều này giúp gunicorn tìm thấy package 'src'
export PYTHONPATH=$PYTHONPATH:$(pwd)

# 2. Xóa các symlink rác nếu có (do script cũ tạo ra lỗi src/src)
if [ -L "src/src" ]; then
    echo "🧹 Cleaning up redundant symlink src/src..."
    rm src/src
fi

# 3. Thông tin debug để kiểm tra cấu trúc
echo "📂 Contents of current directory:"
ls -F

echo "--- Launching Gunicorn Server ---"

# Chạy với 1 worker để tiết kiệm RAM trên gói Free của Render
# Module: src.app.main (tương ứng với backend/src/app/main.py)
# Variable: app
exec gunicorn \
  -w 1 \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:${PORT:-10000} \
  --timeout 120 \
  --log-level debug \
  src.app.main:app
