# Nhật ký Kỹ thuật (Technical Worklog) - AI Teaching Assistant

Tài liệu ghi lại các quyết định kiến trúc, quy trình giải quyết vấn đề và quản lý nhiệm vụ trong suốt quá trình phát triển dự án.

---

## 🛠 1. Quyết định Kỹ thuật & Rationale (Technical Decisions)

### 1.1. Lựa chọn Cơ sở dữ liệu: PostgreSQL + pgvector
- **Các phương án cân nhắc:** Pinecone (Vector-only), ChromaDB, MongoDB.
- **Tại sao chọn pgvector?**
    - **Tính nhất quán (ACID):** Đảm bảo dữ liệu quan hệ (thông tin khóa học, sinh viên) và dữ liệu vector luôn đồng bộ.
    - **Hybrid Search:** Cho phép lọc dữ liệu theo `course_id` bằng SQL chuẩn trước khi thực hiện tìm kiếm vector, tăng tốc độ và độ chính xác tuyệt đối.
    - **Tiết kiệm hạ tầng:** Không cần duy trì và trả phí cho một dịch vụ database thứ hai.

### 1.2. Chuyển đổi mô hình LLM: Từ Gemini sang GPT-4o-mini
- **Lý do:**
    - **Tốc độ phản hồi (Latency):** GPT-4o-mini có thời gian phản hồi token đầu tiên (TTFT) cực thấp, tối ưu cho trải nghiệm chat thời gian thực.
    - **Độ tin cậy:** Khả năng tuân thủ các ràng buộc trong System Prompt (đặc biệt là việc từ chối trả lời ngoài tài liệu) tốt hơn trong các thử nghiệm thực tế.
    - **Chi phí:** Tối ưu hóa ngân sách khi dự án mở rộng số lượng sinh viên tương tác đồng thời.

### 1.3. Kiến trúc Frontend: Next.js 14 Server Components (RSC)
- **Các phương án cân nhắc:** Vite + React (SPA), Remix.
- **Tại sao chọn Next.js 14?**
    - **Hiệu năng:** Di chuyển logic fetch dữ liệu lên Server giúp giảm dung lượng JavaScript tải về Client.
    - **SEO & Social Sharing:** Hỗ trợ sinh meta tags động cho từng trang khóa học một cách dễ dàng.
    - **Server Actions:** Thay thế các API mutation truyền thống, giúp đồng bộ dữ liệu giữa UI và Database mượt mà hơn.

---

## 📅 2. Phân công Nhiệm vụ (Task Assignments)

| Giai đoạn | Nhiệm vụ cụ thể | Trách nhiệm | Thời hạn | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **P1: Planning** | Phân tích RAG & Thiết kế ERD | AI + Lead Dev | 15/04 | ✅ Hoàn thành |
| **P2: Foundation** | Setup FastAPI, pgvector & Auth.js | AI + Backend | 28/04 | ✅ Hoàn thành |
| **P3: AI Core** | Xây dựng Document Ingestion Pipeline | AI + Data Eng | 05/05 | ✅ Hoàn thành |
| **P4: Analytics** | Triển khai Dashboard & AI Insights | AI + Frontend | 12/05 | ✅ Hoàn thành |
| **P5: Launch** | Triển khai Production & Seeding dữ liệu thực | AI + DevOps | 16/05 | ✅ Hoàn thành |

---

## 🧠 3. Brainstorming: Cơ chế lộ trình học tập cá nhân hóa
Trong quá trình phát triển tính năng Roadmap, đội ngũ đã cân nhắc các phương án:

- **Phương án A (Quy tắc cứng):** Sinh lộ trình dựa trên thứ tự chương mục trong sách.
    - *Ưu điểm:* Đơn giản, dễ làm.
    - *Nhược điểm:* Không tính đến trình độ thực tế của sinh viên.
- **Phương án B (LangGraph Agent):** AI phân tích lịch sử chat để tìm ra các "điểm mù" và sinh lộ trình bổ sung.
    - *Ưu điểm:* Cực kỳ cá nhân hóa, tạo ra trải nghiệm học tập độc nhất.
    - *Nhược điểm:* Phức tạp trong việc quản lý trạng thái đồ thị (Graph State).
- **Kết luận:** Chọn **Phương án B** để tạo ra sự khác biệt về công nghệ cho sản phẩm.

---

## 🐞 4. Các Lỗi Quan trọng & Cách Giải quyết (Bug Log)

### Lỗi #001: Xung đột Middleware trên môi trường Vercel
- **Hiện tượng:** Trang Dashboard bị lặp vô hạn (Infinite Redirect) khi đã đăng nhập.
- **Nguyên nhân:** Cấu hình Auth.js không tương thích với cơ chế caching của Vercel Edge Network.
- **Khắc phục:** Refactor lại logic check session trong `middleware.ts`, sử dụng `auth.config.ts` để tối ưu hóa runtime.

### Lỗi #002: Tìm kiếm Vector trả về kết quả không liên quan (Low Recall)
- **Hiện tượng:** AI trả lời "Tôi không biết" ngay cả khi tài liệu có thông tin.
- **Nguyên nhân:** Kích thước đoạn cắt (Chunk size) quá nhỏ (200 ký tự) khiến ngữ cảnh bị rời rạc.
- **Khắc phục:** Tăng Chunk size lên 1000 ký tự và thêm Overlap 200 ký tự để duy trì tính liên kết giữa các đoạn.

### Lỗi #003: Rò rỉ kết nối Database (Connection Leak)
- **Hiện tượng:** Backend bị treo sau khoảng 100 phiên chat đồng thời.
- **Nguyên nhân:** Không đóng phiên (Session) SQLAlchemy sau khi kết thúc stream dữ liệu từ AI.
- **Khắc phục:** Chuyển sang sử dụng `AsyncScopedSession` và đảm bảo đóng session trong khối `finally`.

---

## 📈 5. Định hướng Tương lai
- Tích hợp thêm mô hình **Re-ranking** (như Cohere) sau bước truy vấn vector để đảm bảo context sạch nhất trước khi gửi tới LLM.
- Phát triển tính năng **AI Voice Tutor** (hỗ trợ giọng nói) để sinh viên có thể học tập rảnh tay.