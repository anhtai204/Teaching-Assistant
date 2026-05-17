# Nhật ký Hành trình Xây dựng Sản phẩm - Trợ lý Giáo dục AI

Hồ sơ ghi lại chi tiết quá trình phát triển dự án, từ những ý tưởng sơ khai đến một sản phẩm công nghệ hoàn thiện.

---

## 📅 Tuần 1 (11/04 - 17/04): Nghiên cứu và Hình thành Ý tưởng
**Chủ đề:** Khảo sát nhu cầu người dùng và Lựa chọn giải pháp công nghệ cốt lõi.

### ✅ Công việc đã hoàn thành
- **Phân tích bài toán:** Xác định các khó khăn của sinh viên trong việc xử lý khối lượng học liệu lớn và nhu cầu của giảng viên về việc theo dõi mức độ hiểu bài của lớp.
- **Nghiên cứu giải pháp AI:** Thực hiện so sánh chuyên sâu giữa việc tinh chỉnh mô hình và cơ chế truy xuất tri thức. Quyết định chọn RAG để đảm bảo tính cập nhật và độ chính xác của thông tin.
- **Lựa chọn hạ tầng dữ liệu:** Nghiên cứu các cơ sở dữ liệu vector và quyết định sử dụng pgvector tích hợp trực tiếp trong PostgreSQL để tối ưu hóa quản lý dữ liệu hỗn hợp.

### 🤖 Công cụ AI đã sử dụng
- **Trợ lý nghiên cứu AI:** Hỗ trợ tổng hợp các bài báo khoa học và kiến trúc hệ thống RAG hiện đại nhất trong giáo dục.
- **Công cụ sơ đồ tư duy AI:** Phác thảo các tính năng quan trọng cho hai nhóm người dùng chính là Giảng viên và Sinh viên.

### 🧩 Thử thách lớn nhất trong tuần
**Vấn đề:** Đảm bảo AI chỉ trả lời trong phạm vi tài liệu mà không sử dụng kiến thức bên ngoài.
**Giải pháp:** Nghiên cứu cơ chế kiểm soát ngữ cảnh thông qua chỉ dẫn hệ thống và thiết lập ngưỡng độ tin cậy khi tìm kiếm dữ liệu vector.

---

## 📅 Tuần 2 (18/04 - 24/04): Thiết kế Hệ thống và Đặc tả Kỹ thuật
**Chủ đề:** Xây dựng kiến trúc tổng thể và Thiết kế giao diện người dùng.

### ✅ Công việc đã hoàn thành
- **Kiến trúc hệ thống:** Thiết kế mô hình phân tầng cho Backend sử dụng FastAPI và kiến trúc App Router cho Frontend sử dụng Next.js 14.
- **Mô hình dữ liệu:** Vẽ sơ đồ thực thể quan hệ, tập trung vào việc quản lý thông tin bổ trợ cho tài liệu và lịch sử hội thoại.
- **Thiết kế giao diện:** Hoàn thiện bản phác thảo các trang phân tích cho giảng viên và giao diện trò chuyện cho sinh viên.
- **Chốt hạ công nghệ:** Quyết định sử dụng OpenAI SDK, thư viện giao diện shadcn/ui và hệ thống xác thực Auth.js.

### 🤖 Công cụ AI đã sử dụng
- **AI thiết kế sơ đồ:** Tự động sinh mã sơ đồ Mermaid cho các luồng dữ liệu và API.
- **AI phân tích trải nghiệm:** Đánh giá tính khả dụng của các bản phác thảo giao diện để tối ưu hóa hành trình người dùng.

---

## 📅 Tuần 3 (25/04 - 01/05): Xây dựng Hạ tầng và Nền tảng
**Chủ đề:** Thiết lập môi trường phát triển và Hệ thống xác thực người dùng.

### ✅ Công việc đã hoàn thành
- **Hạ tầng cơ sở:** Cấu hình môi trường ảo, thiết lập PostgreSQL với extension pgvector và khởi tạo kho lưu trữ mã nguồn trên Git.
- **Nền tảng Backend:** Xây dựng khung ứng dụng FastAPI với các tầng xử lý riêng biệt từ API đến cơ sở dữ liệu.
- **Hệ thống xác thực:** Tích hợp Auth.js v5 để quản lý phiên đăng nhập và phân quyền người dùng dựa trên vai trò Giảng viên hoặc Sinh viên.
- **Giao diện trang chủ:** Hoàn thiện trang giới thiệu sản phẩm hiện đại với các hiệu ứng thị giác chuyên nghiệp.

### 🤖 Công cụ AI đã sử dụng
- **Trợ lý lập trình AI:** Hỗ trợ viết các đoạn mã mẫu cho mô hình dữ liệu và các lược đồ kiểm soát đầu vào.

### 🧩 Thử thách lớn nhất trong tuần
**Vấn đề:** Lỗi tương thích giữa hệ thống xác thực và môi trường chạy của Middleware trong Next.js.
**Giải pháp:** Tách biệt cấu hình xác thực thành các module nhỏ hơn để đảm bảo khả năng chạy ổn định trên mọi môi trường.

---

## 📅 Tuần 4 (02/05 - 08/05): Triển khai Lõi AI và Hệ thống RAG
**Chủ đề:** Xử lý tri thức, Tìm kiếm Vector và Trải nghiệm Trò chuyện AI.

### ✅ Công việc đã hoàn thành
- **Xử lý tài liệu:** Phát triển module trích xuất văn bản từ PDF/Word và cơ chế cắt nhỏ tài liệu thông minh để tối ưu hóa ngữ cảnh hội thoại.
- **Tìm kiếm tri thức:** Tích hợp mô hình embedding của OpenAI và triển khai chỉ mục HNSW trên pgvector để tăng tốc độ truy vấn tri thức.
- **Trợ lý ảo thông minh:** Hoàn thiện luồng trả lời của AI bám sát tài liệu gốc và có kèm theo trích dẫn nguồn cụ thể.
- **Giao diện trò chuyện:** Hỗ trợ phản hồi tức thời, định dạng văn bản nâng cao và hiển thị công thức toán học.

### 🤖 Công cụ AI đã sử dụng
- **OpenAI GPT-4o-mini:** Mô hình ngôn ngữ chính cho các tác vụ suy luận và trả lời câu hỏi.
- **AI kiểm thử chỉ dẫn:** Tinh chỉnh các câu lệnh hệ thống để AI luôn giữ thái độ chuyên nghiệp và trung thực với dữ liệu.

### 🧩 Thử thách lớn nhất trong tuần
**Vấn đề:** AI có xu hướng ảo tưởng thông tin khi tài liệu không chứa câu trả lời trực tiếp.
**Giải pháp:** Triển khai kỹ thuật ràng buộc phủ định trong chỉ dẫn, buộc AI phải từ chối trả lời nếu độ tin cậy của dữ liệu tìm kiếm thấp.

---

## 📅 Tuần 5 (09/05 - 16/05): Triển khai Thành công và Hoàn thiện Sản phẩm
**Chủ đề:** Triển khai môi trường thực tế, Phân tích tri thức và Bàn giao dự án.

### ✅ Công việc đã hoàn thành
- **Triển khai Production:** Đẩy thành công ứng dụng lên môi trường thực tế (Vercel cho Frontend và Railway cho Backend). Thiết lập đầy đủ các biến môi trường và kết nối Database an toàn.
- **Analytics & Insights:** Hoàn thiện biểu đồ xu hướng câu hỏi và cơ chế tự động phát hiện các lỗ hổng kiến thức của lớp học.
- **Lộ trình học tập:** Vận hành thành công hệ thống sinh lộ trình học tập cá nhân hóa bằng LangGraph.
- **Nạp dữ liệu thực tế:** Hoàn tất việc nạp và xử lý tri thức từ thư mục bài giảng thực tế cho các môn Robotics, AI và Kinh doanh.
- **Đóng gói hồ sơ:** Hoàn thiện 6 báo cáo kiến trúc hệ thống, tệp hướng dẫn cài đặt và tệp giới thiệu sản phẩm. Kiểm tra và làm sạch mã nguồn lần cuối.

### 🤖 Công cụ AI đã sử dụng
- **Antigravity AI:** Hỗ trợ nạp dữ liệu lớn và kiểm tra lỗi hệ thống trước khi triển khai.
- **OpenAI GPT-4o-mini:** Hoạt động ổn định trong môi trường thực tế với hiệu suất cao.

### 🧩 Thử thách lớn nhất trong tuần
**Vấn đề:** Tối ưu hóa hiệu năng khi dữ liệu thực tế lớn hơn nhiều so với dữ liệu mẫu.
**Giải pháp:** Tinh chỉnh các tham số tìm kiếm của chỉ mục HNSW trên pgvector và tối ưu hóa logic gộp dữ liệu phân tích.

### 🔄 Bài học kinh nghiệm
- Việc chuẩn bị hồ sơ đặc tả chi tiết từ những tuần đầu tiên giúp quá trình triển khai cuối cùng diễn ra cực kỳ nhanh chóng và ít lỗi.
- GPT-4o-mini chứng minh được sức mạnh vượt trội về tốc độ phản hồi trong môi trường chạy thực tế.

### 📋 Kế hoạch giai đoạn tiếp theo
- Theo dõi hiệu năng hệ thống và phản hồi từ người dùng thực tế.
- Xây dựng kế hoạch bảo trì và cập nhật tri thức định kỳ cho các khóa học.
- Mở rộng thêm tính năng đa ngôn ngữ và hỗ trợ nhiều định dạng tài liệu hơn.
 stone.