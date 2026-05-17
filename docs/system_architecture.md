# TÀI LIỆU KIẾN TRÚC HỆ THỐNG VÀ QUY TRÌNH HOẠT ĐỘNG
*(System Architecture & Core Workflows Documentation)*

Tài liệu này mô tả chi tiết kiến trúc tổng quan hệ thống, luồng dữ liệu đa tầng và giải thích cặn kẽ 4 quy trình hoạt động (workflows) cốt lõi của ứng dụng Trợ lý Học tập AI (AI Teaching Assistant).

---

## 🏛️ I. KIẾN TRÚC TỔNG QUAN (SYSTEM ARCHITECTURE OVERVIEW)

Hệ thống được xây dựng trên mô hình 3 lớp hiện đại (3-Tier Architecture) kết hợp RAG (Retrieval-Augmented Generation) và thuật toán tự thích ứng cục bộ:

```
+-----------------------------------------------------------+
|                   FRONTEND LAYER (Next.js 14)             |
|  - Student Portal (Roadmap UI, Chat RAG, Quiz Modal)      |
|  - Lecturer Portal (Materials Mgmt, MCQ Editor, Chunks)   |
|  - Global State Orchestration (QuizProvider Context)      |
+-----------------------------+-----------------------------+
                              | HTTPS (JSON / SSE Stream)
                              v
+-----------------------------------------------------------+
|                   BACKEND LAYER (FastAPI)                 |
|  - CORS & Middleware Gateway                              |
|  - RESTful APIs (Auth, Courses, Moderation, Analytics)    |
|  - RAG Core Search Engine & Local Adaptive Quiz Sampler   |
+-----------------------------+-----------------------------+
                              | SQL / pgvector / API Calls
                              v
+-----------------------------------------------------------+
|                   DATA & AI SERVICES LAYER                |
|  - PostgreSQL Database (Structured Relational Data)       |
|  - pgvector Extension (Vector Embeddings Store)           |
|  - OpenAI GPT-4o-mini (LLM Text Generation & MCQs)       |
+-----------------------------------------------------------+
```

---

## 🔄 II. CÁC QUY TRÌNH HOẠT ĐỘNG CỐT LÕI (CORE WORKFLOWS)

### 1. Quy trình Nạp Học liệu & Sinh câu hỏi MCQ (Material Ingestion Workflow)

Quy trình tự động hóa việc tải lên tài liệu học tập mới (PDF hoặc Video) và sinh sẵn ngân hàng câu hỏi trắc nghiệm nền:

```mermaid
sequenceDiagram
    autonumber
    actor L as Giảng viên
    participant FE as Frontend Next.js
    participant BE as Backend FastAPI
    participant AI as OpenAI API (Embedding/LLM)
    participant DB as PostgreSQL + pgvector

    L->>FE: Tải lên học liệu mới (PDF/Video)
    FE->>BE: POST /api/moderation/upload
    Note over BE: Trích xuất nội dung văn bản gốc
    BE->>BE: Sentence Splitter (Cắt thành các đoạn Chunks)
    BE->>AI: Gửi Chunk văn bản để nhúng (Embedding Vector)
    AI-->>BE: Trả về Vector dữ liệu (1536 chiều)
    BE->>DB: Lưu các Chunk kèm Vector vào bảng "materials"
    
    Note over BE: Kích hoạt Sinh câu hỏi trắc nghiệm nền
    BE->>AI: Gửi tài liệu yêu cầu sinh MCQ (Prompt Sư phạm)
    AI-->>BE: Trả về bộ ngân hàng câu hỏi (MCQ JSON)
    BE->>DB: Lưu bộ câu hỏi vào bảng "course_questions"
    BE-->>FE: Thông báo nạp học liệu thành công!
    FE-->>L: Cập nhật giao diện quản lý
```

#### 🔍 Giải thích chi tiết luồng hoạt động:
1.  **Tải file:** Giảng viên thực hiện upload tài liệu (dạng PDF học tập hoặc video bài giảng) thông qua giao diện quản lý học liệu của Giảng viên.
2.  **Xử lý nội dung gốc:** Backend FastAPI tiếp nhận file, trích xuất text thuần túy (và dùng Whisper API / SRT parser đối với Video). Sau đó sử dụng bộ tách câu thông minh `Sentence Splitter` cắt văn bản thành các đoạn Chunks tối ưu (1000 ký tự, overlap 200 ký tự) để đảm bảo ngữ cảnh liền mạch.
3.  **Tạo Vector lưu trữ:** Từng Chunk văn bản được gửi lên OpenAI Embedding API để tạo vector biểu diễn ngữ nghĩa 1536 chiều, sau đó lưu toàn bộ Chunks kèm Vector tương ứng vào bảng `materials` được cấu hình mở rộng `pgvector` trong PostgreSQL.
4.  **Sinh câu hỏi MCQ nền:** Để tối ưu độ trễ khi sinh viên làm bài, hệ thống chạy một background task gọi mô hình OpenAI GPT-4o-mini kèm Prompt sư phạm chuẩn để soạn sẵn **10 câu hỏi trắc nghiệm** tương ứng với tài liệu vừa upload.
5.  **Lưu kho MCQ:** Bộ câu hỏi (gồm câu hỏi, 4 đáp án nhiễu, đáp án đúng và lời giải thích học thuật) được lưu trữ trực tiếp vào bảng `course_questions`.

---

### 2. Quy trình Trò chuyện RAG & Lưu vết Lỗ hổng (RAG Chat & Knowledge Gap Workflow)

Quy trình sinh viên trò chuyện hỏi đáp trực tiếp dựa trên tài liệu lớp học và tự động tích lũy các lỗ hổng kiến thức:

```mermaid
sequenceDiagram
    autonumber
    actor S as Sinh viên
    participant FE as Frontend Next.js
    participant BE as Backend FastAPI
    participant AI as OpenAI API (Embedding/LLM)
    participant DB as PostgreSQL + pgvector

    S->>FE: Gửi câu hỏi chat hỏi bài
    FE->>BE: POST /api/student/chat (Stream response)
    BE->>AI: Sinh Vector từ câu hỏi của sinh viên
    AI-->>BE: Trả về Vector câu hỏi
    BE->>DB: Thực hiện Vector Hybrid Search (Lọc theo course_id)
    DB-->>BE: Trả về các Chunks tài liệu liên quan nhất
    BE->>AI: Gửi System Prompt + Context Chunks + Question
    AI-->>BE: Stream văn bản phản hồi từng ký tự
    BE-->>FE: SSE Stream chuyển tiếp ra màn hình chat
    FE-->>S: Hiển thị câu trả lời trôi chảy tức thì

    Note over FE, BE: Phân tích phát hiện Lỗ hổng
    S->>FE: Nhấn Dislike câu trả lời hoặc hỏi sâu một chủ đề nhiều lần
    FE->>BE: Ghi nhận tín hiệu tương tác yếu
    BE->>DB: Tăng tần suất lỗi (frequency) của chủ đề trong bảng "knowledge_gaps"
```

#### 🔍 Giải thích chi tiết luồng hoạt động:
1.  **Gửi câu hỏi:** Sinh viên nhập câu hỏi vào khung chat. Next.js gửi yêu cầu `POST /api/student/chat` hỗ trợ truyền luồng dữ liệu thời gian thực (Server-Sent Events - SSE).
2.  **Truy vấn RAG:** Backend FastAPI chuyển câu hỏi của sinh viên thành Vector embedding và thực hiện tìm kiếm tương đồng (Cosine Similarity) trên bảng `materials`. Phép tìm kiếm được lọc theo khóa `course_id` (Hybrid Search) bằng SQL chuẩn để đảm bảo chỉ trả về tài liệu thuộc khóa học đó trong chưa đầy 15ms.
3.  **Sinh câu trả lời thông minh:** Backend lắp ghép các Chunks tài liệu tìm thấy vào System Prompt tạo thành bối cảnh sạch (Context). Sau đó gửi tới OpenAI GPT-4o-mini để yêu cầu trả lời, bắt buộc phải trích dẫn nguồn học liệu gốc và từ chối các câu hỏi ngoài lề.
4.  **Streaming UI:** Câu trả lời được stream trực tiếp về giao diện giúp sinh viên có phản hồi tức thì mà không cần chờ đợi.
5.  **Lưu vết lỗ hổng:** Hệ thống ngầm lắng nghe các tín hiệu tương tác của sinh viên (Ví dụ: sinh viên nhấn dislike câu trả lời, hoặc liên tục hỏi sâu về một chủ đề trong 1 phiên chat). Tín hiệu này được ghi nhận và cộng dồn chỉ số tần suất lỗi vào bảng `knowledge_gaps` phục vụ việc đề xuất ôn luyện.

---

### 3. Quy trình Đánh giá Năng lực thích ứng (Adaptive Assessment Workflow)

Quy trình lắp ghép đề thi thích ứng 5 câu (hoặc 15 câu) cục bộ siêu tốc từ DB Vector:

```mermaid
sequenceDiagram
    autonumber
    actor S as Sinh viên
    participant FE as Roadmap UI
    participant QM as QuizModal Component
    participant BE as Backend FastAPI
    participant DB as PostgreSQL

    S->>FE: Bấm "Tạo lộ trình" hoặc "Đánh giá chuyên sâu"
    FE->>QM: Kích hoạt hiển thị QuizModal
    QM->>BE: Gửi yêu cầu sinh đề: POST /api/quiz/generate (count=5/15)
    BE->>DB: Đọc bảng "roadmap_items" của Sinh viên
    DB-->>BE: Trả về danh sách chủ đề đã Hoàn thành (100% progress)
    
    Note over BE: Thuật toán lọc thích ứng cục bộ
    BE->>DB: Truy vấn bảng "course_questions"
    DB-->>BE: Trả về toàn bộ câu hỏi của khóa học
    BE->>BE: Lọc bỏ 100% các câu hỏi thuộc chủ đề đã Hoàn thành
    BE->>BE: Phân bổ ngẫu nhiên: 60% chủ đề yếu/đang học, 40% ôn tập chung
    BE->>DB: Lưu đề thi tạm thời vào "quiz_attempts" (Status: pending)
    BE-->>QM: Trả về đề thi 5 câu tối ưu nhất
    QM->>S: Mở QuizModal cho sinh viên làm bài
```

#### 🔍 Giải thích chi tiết luồng hoạt động:
1.  **Khởi động Quiz:** Sinh viên bấm "Tạo lộ trình học tập" lần đầu hoặc bấm "Làm bài kiểm tra ôn tập 15 câu".
2.  **Quét Spaced Repetition:** Backend truy vấn bảng `roadmap_items` của sinh viên đó, lọc ra toàn bộ các chủ đề đã đạt tiến độ **100%** (Học giỏi) để loại bỏ hoàn toàn các câu hỏi liên quan ra khỏi đề thi, giúp sinh viên tập trung vào các mảng kiến thức mới.
3.  **Lắp đề theo trọng số 60-40:** Backend bốc từ kho `course_questions` của môn học: **60%** số câu hỏi tập trung vào các chủ đề sinh viên đang yếu (ưu tiên `high` hoặc đang học dở) và **40%** số câu hỏi còn lại phục vụ ôn tập tổng hợp.
4.  **Tốc độ đột phá:** Toàn bộ thuật toán bốc đề thích ứng được thực hiện cục bộ thông qua mã nguồn Python tối ưu và truy vấn cơ sở dữ liệu nên đạt độ trễ cực thấp **(<10ms)**, triệt tiêu hoàn toàn thời gian chờ đợi tải đề.

---

### 4. Quy trình Lập Lộ trình học tập Cá nhân hóa (Personalized Roadmap Generation Workflow)

Quy trình tự động chấm điểm cục bộ và kích hoạt AI sinh lộ trình học tập cá nhân hóa tức thời:

```mermaid
sequenceDiagram
    autonumber
    actor S as Sinh viên
    participant FE as Frontend Next.js
    participant BE as Backend FastAPI
    participant AI as OpenAI API (GPT-4o-mini)
    participant DB as PostgreSQL

    S->>FE: Chọn các đáp án và bấm Nộp bài
    FE->>BE: POST /api/quiz/evaluate (attempt_id, answers)
    Note over BE: Chấm điểm logic cứng cục bộ <1ms
    BE->>DB: Cập nhật "quiz_attempts" (Status: completed, score)
    
    alt Có chủ đề bị điểm yếu (<70%)
        BE->>DB: Lưu/Cập nhật chủ đề yếu vào bảng "knowledge_gaps"
    end
    
    Note over BE: Lập lộ trình cá nhân hóa bằng LLM
    BE->>DB: Đọc lịch sử chat gần nhất + mảng kiến thức yếu "knowledge_gaps"
    DB-->>BE: Trả về Context
    BE->>AI: Gửi Lịch sử chat + Lỗ hổng kiến thức + Danh mục tài liệu học tập thực có
    Note over AI: Tránh ảo giác: Đối chiếu học liệu thực có để lên kế hoạch nhiệm vụ
    AI-->>BE: Trả về Lộ trình mới dạng danh sách nhiệm vụ đính kèm tài liệu nguồn
    BE->>DB: Lưu các nhiệm vụ mới vào bảng "roadmap_items"
    BE-->>FE: Trả về kết quả đánh giá kèm Lộ trình học tập mới sinh
    
    Note over FE: Đồng bộ hóa Reactive State
    FE->>FE: QuizProvider phát tín hiệu callback onComplete()
    FE->>FE: Cập nhật state items của RoadmapPage tức thời (không cần F5)
    FE-->>S: Hiển thị kết quả điểm số và lộ trình học tập mới lung linh!
```

#### 🔍 Giải thích chi tiết luồng hoạt động:
1.  **Nộp bài:** Sinh viên nhấn nút "Nộp bài", gửi các đáp án đã chọn lên Backend.
2.  **Chấm điểm & Lưu vết:** Backend so khớp đáp án cực nhanh bằng logic Python, lưu điểm số vào `quiz_attempts`. Nếu điểm số của bất kỳ chủ đề nào dưới **70%**, chủ đề đó lập tức được đẩy vào danh sách lỗ hổng `knowledge_gaps`.
3.  **Sinh lộ trình không ảo giác:** Backend tập hợp lịch sử chat gần nhất + lỗ hổng từ bài làm và danh mục tài liệu giảng dạy thực tế của lớp học (`available_sources`) gửi tới OpenAI GPT-4o-mini. LLM thực hiện so khớp và lên danh sách các nhiệm vụ cụ thể đính kèm nguồn học liệu gốc (ví dụ: `Đọc Slide 3 trong [Activation_Functions.pdf]`) để đảm bảo sinh viên có tài liệu ôn tập thực tế.
4.  **Đồng bộ hóa Reactive State Frontend:** Kết quả trả về Modal `QuizModal`. Nhờ Context wrapper `QuizProvider.tsx`, `QuizModal` kích hoạt callback `onComplete()`, truyền trực tiếp danh sách lộ trình mới sinh về hàm cập nhật state của `RoadmapPage`. Giao diện cập nhật vòng tròn tiến độ và danh sách nhiệm vụ học tập ngay lập tức mà không cần F5 trình duyệt.