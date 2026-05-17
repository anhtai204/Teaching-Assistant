# AI Teaching Assistant (A20-App-013)

**Hệ thống Trợ lý Giáo dục Thông minh dựa trên RAG và Cá nhân hóa Lộ trình Học tập.**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Tech Stack](https://img.shields.io/badge/stack-Next.js%20|%20FastAPI%20|%20OpenAI-green)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## 📖 Mô tả dự án
**AI Teaching Assistant** là một nền tảng giáo dục thế hệ mới, tích hợp trí tuệ nhân tạo để tối ưu hóa việc truyền đạt và tiếp nhận tri thức. Dự án xây dựng một hệ sinh thái nơi Giảng viên có thể nạp tri thức từ tài liệu chuyên môn và Sinh viên có thể tương tác với trợ lý AI GPT-4o-mini để học tập một cách có hệ thống thông qua lộ trình cá nhân hóa.

## 🚀 Mục tiêu & Vấn đề giải quyết
- **Khắc phục sự quá tải thông tin:** Tự động tóm tắt và trích xuất kiến thức trọng tâm từ hàng ngàn trang tài liệu PDF/Word.
- **Cá nhân hóa giáo dục:** Mỗi sinh viên có một lộ trình học tập riêng biệt (Roadmap) dựa trên khả năng tiếp thu thực tế.
- **Hỗ trợ học tập 24/7:** Giải đáp thắc mắc ngay lập tức với độ chính xác cao nhờ cơ chế RAG (Retrieval-Augmented Generation).
- **Tối ưu hóa giảng dạy:** Cung cấp cho giảng viên các "Insights" về những phần kiến thức sinh viên đang yếu để điều chỉnh giáo án.

## 📂 Cấu trúc dự án
Dưới đây là cấu trúc tổ chức thư mục chính của hệ thống:

```text
A20-App-013/
├── frontend/                # Ứng dụng Next.js 14 (Frontend)
│   ├── src/                 # Mã nguồn chính (App Router, Components)
│   ├── public/              # Tài sản tĩnh (Images, Fonts)
│   └── package.json         # Cấu hình dependencies frontend
├── backend/                 # API Server FastAPI (Backend)
│   ├── src/                 # Logic xử lý, Routes, Models
│   ├── scratch/             # Các script bổ trợ, seed dữ liệu
│   └── requirements.txt     # Danh sách thư viện Python
├── reports/                 # Hồ sơ đặc tả kiến thức hệ thống (Architecture Docs)
│   ├── user_flow.md         # Sơ đồ hành trình người dùng
│   ├── backend_architecture.md
│   └── ...                  # Các sơ đồ kỹ thuật khác
├── .ai-log/                 # Nhật ký tương tác AI (Audit Trail)
├── .gitignore               # Cấu hình bỏ qua các tệp không cần thiết
└── README.md                # Tài liệu hướng dẫn chính
```

## ✨ Tính năng chính

### 👨‍🏫 Dành cho Giảng viên:
- **Knowledge Ingestion:** Tự động xử lý, cắt nhỏ và tạo embedding cho tài liệu bài giảng.
- **Class Analytics Dashboard:** Theo dõi biểu đồ tương tác và mức độ hiểu bài của cả lớp.
- **Knowledge Gap Detection:** AI tự động phát hiện các chủ đề sinh viên đang thắc mắc nhiều nhưng chưa có tài liệu đáp ứng.
- **Moderation Center:** Kiểm duyệt các nội dung nhạy cảm hoặc phản hồi tiêu cực.

### 🎓 Dành cho Sinh viên:
- **AI Tutoring:** Chat trực tiếp với tài liệu khóa học, nhận câu trả lời kèm trích dẫn nguồn xác thực.
- **Dynamic Roadmaps:** Lộ trình học tập sinh bởi LangGraph, tự động điều chỉnh theo lịch sử học tập.
- **Resource Request:** Gửi yêu cầu bổ sung học liệu trực tiếp cho giảng viên.
- **Premium UI:** Giao diện hiện đại, hỗ trợ Dark Mode, Streaming AI và LaTeX.

## 🛠 Công nghệ sử dụng

| Tầng | Công nghệ | Chi tiết |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14** | App Router, Server Components, Server Actions |
| **UI/UX** | **shadcn/ui** | Tailwind CSS, Framer Motion, Lucide Icons |
| **Backend** | **FastAPI** | Python 3.10+, Asynchronous logic, Pydantic v2 |
| **LLM Engine** | **GPT-4o-mini** | OpenAI API, text-embedding-3-small |
| **Orchestration** | **LangGraph** | Quản lý trạng thái lộ trình học tập (Learning State) |
| **Database** | **PostgreSQL** | Lưu trữ quan hệ & Vector search (pgvector) |
| **Auth** | **Auth.js** | NextAuth v5, bảo mật session & phân quyền |

## 💻 Hướng dẫn cài đặt

### 1. Yêu cầu hệ thống
- **Node.js:** 18.x hoặc mới hơn.
- **Python:** 3.10 hoặc mới hơn.
- **Database:** PostgreSQL 16+ (Yêu cầu cài đặt `pgvector` extension).

### 2. Thiết lập môi trường
Tạo tệp `.env` tại `backend/` và `frontend/`:

**Backend (`backend/.env`):**
```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/ai_teaching
OPENAI_API_KEY=sk-proj-...
```

**Frontend (`frontend/.env.local`):**
```env
NEXTAUTH_SECRET=your_secret_phrase
NEXTAUTH_URL=http://localhost:3000
BACKEND_API_URL=http://localhost:8000
```

### 3. Cài đặt chi tiết
**Cài đặt Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Cài đặt Frontend:**
```bash
cd frontend
npm install
```

## 🏃 Hướng dẫn chạy dự án

1. **Khởi động Backend:**
   ```bash
   cd backend
   uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Khởi động Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. Mở trình duyệt và truy cập: `http://localhost:3000`.

## 📘 Hướng dẫn sử dụng nhanh

### 👨‍🏫 Dành cho Giảng viên (Phân quyền Quản lý)
1. **Khởi tạo Khóa học:**
   - Truy cập dashboard, chọn **"Tạo khóa học mới"**.
   - Thiết lập tên môn học, mô tả và nhận **Mã tham gia (Enrollment Code)**.
2. **Nạp Tri thức cho AI:**
   - Tại mục **"Quản lý tài liệu"**, tải lên các tệp bài giảng (PDF, Word, Markdown).
   - Theo dõi trạng thái nạp dữ liệu. Khi trạng thái chuyển sang **"Đã hoàn thành"**, AI đã sẵn sàng trả lời về nội dung đó.
3. **Theo dõi Hiệu quả Giảng dạy:**
   - Truy cập mục **"Analytics"** để xem biểu đồ xu hướng câu hỏi của sinh viên.
   - Kiểm tra phần **"Knowledge Gaps"**: Tại đây AI sẽ chỉ ra những chủ đề mà sinh viên đang gặp khó khăn.
   - Xem **"AI Insights"** để nhận lời khuyên về việc điều chỉnh nội dung bài giảng.
4. **Kiểm duyệt (Moderation):**
   - Vào mục **"Moderation"** để kiểm tra các tin nhắn bị hệ thống gắn cờ (flagged) hoặc các phản hồi tiêu cực từ sinh viên.

### 🎓 Dành cho Sinh viên (Phân quyền Học tập)
1. **Tham gia Lớp học:**
   - Nhập mã **Enrollment Code** do giảng viên cung cấp để bắt đầu học.
2. **Học tập cùng Trợ lý AI:**
   - Đặt câu hỏi trực tiếp tại khung Chat.
   - **Mẹo:** Bạn có thể yêu cầu AI "Giải thích phần X trong tài liệu Y" để nhận câu trả lời kèm trích dẫn nguồn (số trang cụ thể).
3. **Theo dõi Lộ trình Cá nhân hóa:**
   - Truy cập mục **"Lộ trình" (Roadmap)** để xem các chủ đề cần hoàn thiện.
   - Đánh dấu hoàn thành các bài học để AI cập nhật bước tiếp theo trong lộ trình.
4. **Yêu cầu Tài liệu:**
   - Nếu không tìm thấy thông tin, hãy sử dụng tính năng **"Yêu cầu học liệu"** để gửi đề đạt trực tiếp tới giảng viên.

---
