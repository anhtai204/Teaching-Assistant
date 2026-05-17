# Kiến trúc Hệ thống Backend & API (Technical Specification)

Tài liệu này mô tả chi tiết kiến trúc của hệ thống Backend, tập trung vào khả năng mở rộng, tính bảo mật và sự tối ưu cho các tác vụ AI xử lý luồng (streaming).

---

## 1. Triết lý Thiết kế: Layered Architecture
Hệ thống được xây dựng dựa trên nguyên lý tách biệt trách nhiệm (Separation of Concerns), chia làm 4 tầng chính:

### 1.1. Interface Layer (Tầng giao diện API)
- **Framework:** FastAPI sử dụng Asyncio để xử lý hàng nghìn kết nối đồng thời mà không làm nghẽn luồng.
- **Validation:** Pydantic v2 đảm bảo dữ liệu đầu vào luôn đúng schema, tự động sinh tài liệu Swagger/OpenAPI.
- **Security:** Tích hợp Middleware để kiểm tra JWT tokens từ Auth.js, thực hiện Rate Limiting để bảo vệ OpenAI API key.

### 1.2. Service Layer (Tầng nghiệp vụ)
Đây là "bộ não" của ứng dụng, nơi điều phối các luồng công việc phức tạp:
- **Knowledge Service:** Quản lý vòng đời tài liệu. Khi một file PDF được upload, service này sẽ kích hoạt pipeline: Trích xuất -> Chunking -> Embedding -> Lưu trữ Vector.
- **Chat Orchestrator:** Điều phối bối cảnh hội thoại, truy xuất lịch sử từ database và kết nối với OpenAI GPT-4o-mini qua luồng Stream.
- **Analytics Engine:** Thực hiện các phép tính toán học và thống kê từ lịch sử chat để sinh ra các chỉ số Knowledge Gaps và Insights cho giảng viên.

### 1.3. Domain & Repository Layer (Tầng dữ liệu)
- **SQLAlchemy (Async):** Cung cấp khả năng giao tiếp với database một cách an toàn thông qua các Object Relational Mapping.
- **Repository Pattern:** Giúp tách biệt logic truy vấn SQL khỏi tầng nghiệp vụ, dễ dàng thực hiện Unit Test và thay đổi database nếu cần.

### 1.4. Infrastructure Layer (Tầng hạ tầng)
- **Database:** PostgreSQL 16+.
- **AI Engine:** OpenAI SDK (GPT-4o-mini).
- **Storage:** Hệ thống file local (hoặc S3) để lưu trữ tài liệu gốc trước khi xử lý.

---

## 2. Mô hình Dữ liệu & Lưu trữ (Data Strategy)

### 2.1. Quan hệ & Vector (Hybrid Search)
Hệ thống sử dụng **PostgreSQL** với extension **pgvector** thay vì một database vector chuyên dụng (như Pinecone/Chroma) vì:
- **Tính nhất quán:** Dữ liệu metadata (tên course, giảng viên) và dữ liệu vector nằm cùng một nơi, đảm bảo tính toàn vẹn (ACID).
- **Hiệu năng:** Cho phép thực hiện các câu lệnh SQL phức tạp kết hợp với tìm kiếm vector trong một query duy nhất.
- **Bảo mật:** Dễ dàng áp dụng các chính sách bảo mật tầng dòng (Row-Level Security) để cách ly tài liệu giữa các khóa học.

### 2.2. Indexing Chiến lược
Sử dụng index **HNSW (Hierarchical Navigable Small World)** trên cột vector:
- **Lợi ích:** Tăng tốc độ tìm kiếm lân cận (Nearest Neighbor Search) lên gấp nhiều lần so với tìm kiếm tuyến tính, đặc biệt quan trọng khi số lượng tài liệu lên tới hàng nghìn trang.

---

## 3. Quy trình Xử lý AI & Luồng dữ liệu (Pipeline)

### 3.1. Pipeline Nạp tài liệu (Ingestion)
1. **Upload:** Nhận file từ giảng viên qua Multipart Form.
2. **Parsing:** Sử dụng `PyPDF2` (cho PDF) và `python-docx` (cho Word) để trích xuất text thô.
3. **Cleaning:** Loại bỏ các ký tự rác, chuẩn hóa khoảng trắng và định dạng UTF-8.
4. **Embedding:** Gửi từng chunk tới `text-embedding-3-small`.
5. **Storage:** Lưu chunk text và vector tương ứng vào bảng `document_chunks`.

### 3.2. Pipeline Phân tích (Analytics)
Hệ thống sử dụng các tác vụ nền (Background Tasks) để:
- Định kỳ quét lịch sử chat.
- Sử dụng GPT-4o-mini để phân loại ý định (Intent) và chủ đề của sinh viên.
- Tổng hợp các chủ đề "hot" và các chủ đề AI không thể trả lời.

---

## 4. Bảo mật & Hiệu năng (Optimization)
- **Streaming Responses:** Sử dụng `StreamingResponse` của FastAPI để trả về kết quả từ OpenAI theo thời gian thực (SSE), giúp giảm thời gian Time-To-First-Token (TTFT) xuống dưới 200ms.
- **Connection Pooling:** Sử dụng `AsyncSessionMaker` với pool size tối ưu để tránh cạn kiệt kết nối database.
- **Error Handling:** Hệ thống bắt các lỗi API OpenAI (Rate limit, Auth) và trả về thông báo thân thiện cho người dùng, tránh crash hệ thống.
