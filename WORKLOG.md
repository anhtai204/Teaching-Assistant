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

## 👥 2. Thành viên & Phân công Nhiệm vụ (Team Members & Task Assignments)

### 2.1. Danh sách thành viên nhóm
*   **Nguyễn Anh Tài (MSSV: 2A202600388)** - Backend/AI/DevOps + Frontend
*   **Nguyễn Công Quốc Huy (MSSV: 2A202600389)** - Frontend + Backend/AI
    
---

### 2.2. Chi tiết Phân công công việc (Detailed Task Matrix)

| STT | Phân hệ (Domain) | Nhiệm vụ kỹ thuật chi tiết | Thành viên phụ trách | Thời hạn | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Database & Architecture** | Thiết kế lược đồ thực thể ERD, thiết lập quan hệ PostgreSQL và viết lớp Model SQLAlchemy cho các bảng dữ liệu (`course_questions`, `roadmap_items`, `knowledge_gaps`). | **Nguyễn Anh Tài** | 15/04 | ✅ Hoàn thành |
| **2** | **AI Pipeline - Vector** | Cấu hình cơ sở dữ liệu Vector pgvector, sinh embedding vector qua OpenAI API và thiết lập chỉ mục HNSW tối ưu hóa tìm kiếm. | **Nguyễn Anh Tài** | 20/04 | ✅ Hoàn thành |
| **3** | **MCQ Generator Engine** | Viết prompt template sư phạm và logic tích hợp OpenAI GPT-4o-mini để tự động sinh 10 câu hỏi trắc nghiệm ngay khi upload tài liệu mới. | **Nguyễn Anh Tài** | 05/05 | ✅ Hoàn thành |
| **4** | **Adaptive Test Engine** | Thiết lập thuật toán cục bộ lọc thích ứng Spaced Repetition (loại bỏ các chủ đề tiến độ 100%) và bốc đề phân phối tỉ lệ vàng 60-40. | **Nguyễn Anh Tài** | 08/05 | ✅ Hoàn thành |
| **5** | **Seeding & Processing** | Xây dựng và thực thi script quét tài liệu cũ trong DB để tự động sinh và nạp câu hỏi trắc nghiệm mới vào PostgreSQL. | **Nguyễn Công Quốc Huy** | 12/05 | ✅ Hoàn thành |
| **6** | **Frontend - Base Setup** | Khởi tạo khung Next.js 14 (App Router), thiết lập Tailwind CSS, cấu hình biến màu HSL và Theme Provider hỗ trợ Dark/Light Mode. | **Nguyễn Anh Tài** | 25/04 | ✅ Hoàn thành |
| **7** | **Frontend - Base Layouts** | Phát triển hệ thống layout cơ sở, thanh Sidebar điều hướng thông minh, và các panel bộ lọc tìm kiếm theo khóa học. | **Nguyễn Anh Tài** | 30/04 | ✅ Hoàn thành |
| **8** | **Student Chat Portal** | Phát triển cổng Chat RAG cho Sinh viên: hiển thị bong bóng chat, streaming văn bản AI thời gian thực, sidebar trích dẫn học liệu gốc. | **Nguyễn Anh Tài** | 09/05 | ✅ Hoàn thành |
| **9** | **Backend - Base Setup** | Khởi tạo khung ứng dụng FastAPI, cấu hình CORS Middleware, kết nối Database connection pool và quản lý migrations. | **Nguyễn Công Quốc Huy** | 25/04 | ✅ Hoàn thành |
| **10** | **Security & Auth** | Triển khai cơ chế xác thực JWT, mã hóa bcrypt mật khẩu, phân quyền phân cấp dựa trên vai trò (Lecturer / Student). | **Nguyễn Công Quốc Huy** | 30/04 | ✅ Hoàn thành |
| **11** | **AI Pipeline - Chunks** | Phát triển pipeline tải học liệu (PDF, Video), bộ tách văn bản thông minh (Sentence Splitter) để tránh đứt gãy ngữ cảnh. | **Nguyễn Công Quốc Huy + Nguyễn Anh Tài** | 05/05 | ✅ Hoàn thành |
| **12** | **Lecturer Moderation** | Triển khai Dashboard quản trị cho Giảng viên: duyệt/xóa tài liệu bài giảng, chỉnh sửa trực quan các chunk, xem và chỉnh sửa ngân hàng MCQ. | **Nguyễn Công Quốc Huy** | 09/05 | ✅ Hoàn thành |
| **13** | **Global Quiz State** | Triển khai `QuizProvider` Context API quản lý trạng thái mở Quiz toàn cục từ bất kỳ màn hình nào và đồng bộ hóa State Roadmap tức thời. | **Nguyễn Công Quốc Huy** | 12/05 | ✅ Hoàn thành |
| **14** | **Premium UI Details** | Thiết kế Modal Quiz cao cấp: tích hợp kính mờ, thẻ cảnh báo thoát tự chế khi nhấn X (State modal), thẻ Giải thích AI chìm watermark. | **Nguyễn Công Quốc Huy** | 14/05 | ✅ Hoàn thành |
| **15** | **Roadmap Learning Path** | Xây dựng trang Lộ trình học tập (`/student/roadmap`): vẽ vòng tròn tiến độ, sắp xếp thẻ nhiệm vụ học tập trực quan sinh động. | **Nguyễn Công Quốc Huy + Nguyễn Anh Tài** | 15/05 | ✅ Hoàn thành |
| **16** | **DevOps & Operations** | Đóng gói Docker backend, triển khai lên Render/Vercel, viết api-route `/health` hỗ trợ HEAD/GET và tích hợp UptimeRobot keep-alive 24/7. | **Nguyễn Anh Tài** | 17/05 | ✅ Hoàn thành |arning Path** | Xây dựng trang Lộ trình học tập (`/student/roadmap`): vẽ vòng tròn tiến độ, sắp xếp thẻ nhiệm vụ học tập trực quan sinh động. | **Nguyễn Công Quốc Huy** | 12/05 | ✅ Hoàn thành |
| **14** | **Global Quiz State** | Triển khai `QuizProvider` Context API quản lý trạng thái mở Quiz toàn cục từ bất kỳ màn hình nào và đồng bộ hóa State Roadmap tức thì. | **Nguyễn Công Quốc Huy** | 14/05 | ✅ Hoàn thành |
| **15** | **Premium UI Details** | Thiết kế Modal Quiz cao cấp: tích hợp kính mờ, thẻ cảnh báo thoát tự chế khi nhấn X (State modal), thẻ Giải thích AI chìm watermark. | **Nguyễn Công Quốc Huy** | 15/05 | ✅ Hoàn thành |
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