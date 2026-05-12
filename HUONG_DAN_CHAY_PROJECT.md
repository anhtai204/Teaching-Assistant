# Hướng Dẫn Chạy Project AI Teaching Assistant

## 📋 Tổng Quan

Project này là một hệ thống AI Teaching Assistant với:
- **Backend**: FastAPI + Python (RAG system với LangChain, ChromaDB)
- **Frontend**: Next.js 14 + React + TypeScript
- **Database**: PostgreSQL (Supabase)
- **Vector Store**: ChromaDB (local hoặc cloud)

---

## 🔧 Yêu Cầu Hệ Thống

- **Python**: 3.11+ (kiểm tra: `python --version`)
- **Node.js**: 18+ (kiểm tra: `node --version`)
- **npm**: 9+ (kiểm tra: `npm --version`)
- **Git**: Đã cài đặt

---

## 🚀 Bước 1: Cài Đặt Ban Đầu

### 1.1. Clone Repository (nếu chưa có)

```bash
git clone <repo-url>
cd Teaching-Assistant
```

### 1.2. Cài Đặt Git Hooks (Bắt Buộc - Chỉ Chạy 1 Lần)

```bash
bash scripts/setup_hooks.sh
```

> ✅ Hook này tự động log các prompts AI khi bạn sử dụng AI coding tools.

---

## 🔑 Bước 2: Cấu Hình Environment Variables

### 2.1. Kiểm Tra File `.env`

File `.env` đã tồn tại trong project. Đảm bảo các biến sau đã được cấu hình:

```bash
# AI Provider Keys (Cần ít nhất 1 trong 3)
ANTHROPIC_API_KEY=sk-ant-...           # Claude API
OPENAI_API_KEY=sk-proj-...             # GPT API
GOOGLE_API_KEY=AIzaSy...               # Gemini API

# Database (Supabase)
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Auth Configuration
AUTH_SECRET=...
AUTH_URL=http://localhost:3000
```

> ⚠️ **Quan trọng**: Nếu thiếu API keys, hệ thống sẽ không thể gọi AI models.

### 2.2. Cấu Hình Frontend Environment

Tạo file `.env.local` trong thư mục `frontend/`:

```bash
cd frontend
cp .env.local.example .env.local  # Nếu có file example
```

Hoặc tạo thủ công với nội dung:

```bash
# Frontend Environment Variables
NEXT_PUBLIC_API_URL=http://localhost:8000
AUTH_SECRET=ewexTI9mwMrCp7dXDlsCKg5zDKjG7fYeinPIJjnYgkM=
AUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres.icpmdjghxsstmlzxoefv:cherishnguyen%40224@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
```

---

## 🐍 Bước 3: Cài Đặt Backend

### 3.1. Tạo Virtual Environment

```bash
cd backend
python -m venv env
```

### 3.2. Kích Hoạt Virtual Environment

**Linux/Mac:**
```bash
source env/bin/activate
```

**Windows:**
```bash
env\Scripts\activate
```

> 💡 Bạn sẽ thấy `(env)` xuất hiện ở đầu dòng lệnh.

### 3.3. Cài Đặt Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> ⏱️ Quá trình này mất khoảng 3-5 phút.

### 3.4. Tạo Thư Mục Data (Bắt Buộc)

```bash
mkdir -p data
```

> ⚠️ Backend sẽ lỗi nếu thiếu thư mục này.

### 3.5. Khởi Tạo Database (Tùy Chọn)

Nếu database chưa có tables:

```bash
python setup_db.py
```

---

## 🌐 Bước 4: Cài Đặt Frontend

### 4.1. Di Chuyển Vào Thư Mục Frontend

```bash
cd ../frontend
```

### 4.2. Cài Đặt Dependencies

```bash
npm install
```

> ⏱️ Quá trình này mất khoảng 2-3 phút.

---

## ▶️ Bước 5: Chạy Project

### 5.1. Chạy Backend (Terminal 1)

```bash
cd backend
source env/bin/activate  # Kích hoạt virtual environment
cd src
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Kiểm tra Backend đã chạy:**
- Mở trình duyệt: http://localhost:8000
- Bạn sẽ thấy: `{"status": "online", "message": "AI Teaching Assistant API is running"}`
- API Docs: http://localhost:8000/docs

### 5.2. Chạy Frontend (Terminal 2 - Mở Terminal Mới)

```bash
cd frontend
npm run dev
```

**Kiểm tra Frontend đã chạy:**
- Mở trình duyệt: http://localhost:3000
- Bạn sẽ thấy giao diện đăng nhập

---

## 👤 Bước 6: Đăng Nhập Hệ Thống

Backend tự động tạo 2 tài khoản mặc định:

### Tài Khoản Giảng Viên (Lecturer)
- **Email**: `lecturer@university.edu`
- **Password**: `lecturer123`

### Tài Khoản Sinh Viên (Student)
- **Email**: `student@university.edu`
- **Password**: `student123`

---

## 🧪 Bước 7: Kiểm Tra Hệ Thống

### 7.1. Test Backend API

```bash
cd backend
python test_api.py
```

### 7.2. Test RAG System

```bash
python test_rag_gemini.py
```

### 7.3. Test Upload File

```bash
python test_upload.py
```

---

## 🛠️ Các Lệnh Hữu Ích

### Backend Commands

```bash
# Chạy backend (development mode)
cd backend/src
uvicorn app.main:app --reload --port 8000

# Chạy backend (production mode)
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000

# Kiểm tra database
python check_db.py

# Seed database với dữ liệu mẫu
python seed_db.py

# Kiểm tra users
python check_users.py
```

### Frontend Commands

```bash
# Chạy development server
npm run dev

# Build production
npm run build

# Chạy production build
npm run start
```

---

## 🐛 Xử Lý Lỗi Thường Gặp

### Lỗi 1: `ModuleNotFoundError: No module named 'src'`

**Nguyên nhân**: Chạy uvicorn từ sai thư mục.

**Giải pháp**:
```bash
cd backend/src
uvicorn app.main:app --reload
```

### Lỗi 2: `RuntimeError: data/ directory not found`

**Nguyên nhân**: Thiếu thư mục data.

**Giải pháp**:
```bash
cd backend
mkdir -p data
```

### Lỗi 3: `Connection refused` khi frontend gọi backend

**Nguyên nhân**: Backend chưa chạy hoặc sai port.

**Giải pháp**:
1. Kiểm tra backend đang chạy: http://localhost:8000
2. Kiểm tra `NEXT_PUBLIC_API_URL` trong `frontend/.env.local`

### Lỗi 4: `API key not found`

**Nguyên nhân**: Thiếu hoặc sai API keys trong `.env`.

**Giải pháp**:
1. Kiểm tra file `.env` ở thư mục gốc
2. Đảm bảo có ít nhất 1 trong 3 keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`

### Lỗi 5: Database connection failed

**Nguyên nhân**: Sai `DATABASE_URL` hoặc Supabase không khả dụng.

**Giải pháp**:
1. Kiểm tra `DATABASE_URL` trong `.env`
2. Test connection: `python backend/check_db.py`

### Lỗi 6: Port đã được sử dụng

**Nguyên nhân**: Port 8000 hoặc 3000 đang được process khác sử dụng.

**Giải pháp**:

**Linux/Mac:**
```bash
# Tìm process đang dùng port
lsof -i :8000
lsof -i :3000

# Kill process
kill -9 <PID>
```

**Windows:**
```bash
# Tìm process
netstat -ano | findstr :8000

# Kill process
taskkill /PID <PID> /F
```

---

## 📊 Kiến Trúc Hệ Thống

```
Teaching-Assistant/
├── backend/                 # FastAPI Backend
│   ├── src/
│   │   ├── app/            # FastAPI application
│   │   │   ├── main.py     # Entry point
│   │   │   ├── routes.py   # API endpoints
│   │   │   └── analytics_routes.py
│   │   ├── rag/            # RAG system
│   │   │   ├── ingest.py   # Document ingestion
│   │   │   └── retriever.py # Vector search
│   │   ├── agents/         # AI agents
│   │   ├── database.py     # Database connection
│   │   └── models.py       # SQLAlchemy models
│   ├── data/               # Upload storage
│   ├── chroma_db/          # Vector database
│   └── requirements.txt
│
├── frontend/               # Next.js Frontend
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities
│   ├── package.json
│   └── .env.local
│
├── .env                   # Environment variables
└── scripts/               # Utility scripts
```

---

## 🔐 Bảo Mật

> ⚠️ **QUAN TRỌNG**: File `.env` chứa thông tin nhạy cảm (API keys, database credentials).

**Không được:**
- Commit file `.env` lên Git
- Chia sẻ API keys công khai
- Sử dụng production credentials trong development

**Nên:**
- Sử dụng `.env.example` làm template
- Rotate API keys định kỳ
- Sử dụng environment variables riêng cho production

---

## 📚 Tài Liệu Bổ Sung

- **API Documentation**: http://localhost:8000/docs (khi backend đang chạy)
- **AGENTS.md**: Quy tắc sử dụng AI coding agents
- **JOURNAL.md**: Ghi chép hàng tuần về tiến độ
- **WORKLOG.md**: Quyết định kỹ thuật và phân công công việc

---

## 🆘 Hỗ Trợ

Nếu gặp vấn đề:

1. **Kiểm tra logs**:
   - Backend: Terminal đang chạy uvicorn
   - Frontend: Terminal đang chạy npm run dev
   - Browser Console: F12 → Console tab

2. **Kiểm tra environment**:
   ```bash
   # Backend
   cd backend
   python -c "from src.config import settings; print(settings.model_dump())"
   
   # Frontend
   cd frontend
   cat .env.local
   ```

3. **Restart services**:
   - Dừng cả backend và frontend (Ctrl+C)
   - Chạy lại từ Bước 5

---

## ✅ Checklist Hoàn Thành

- [ ] Git hooks đã được cài đặt (`bash scripts/setup_hooks.sh`)
- [ ] File `.env` đã được cấu hình với API keys
- [ ] Backend virtual environment đã được tạo và kích hoạt
- [ ] Backend dependencies đã được cài đặt
- [ ] Thư mục `backend/data/` đã được tạo
- [ ] Frontend dependencies đã được cài đặt
- [ ] Backend đang chạy tại http://localhost:8000
- [ ] Frontend đang chạy tại http://localhost:3000
- [ ] Có thể đăng nhập với tài khoản mặc định

---

**🎉 Chúc bạn code vui vẻ!**
