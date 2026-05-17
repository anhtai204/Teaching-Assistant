# Sơ đồ User Flow & Hành trình Trải nghiệm (Chi tiết)

Bản mô tả chi tiết các điểm chạm (touchpoints) của người dùng trong hệ thống AI Teaching Assistant.

## 1. Vai trò Giảng viên (The Architect)
Mục tiêu: Quản lý tri thức và theo dõi hiệu suất lớp học.

```mermaid
graph TD
    A[Truy cập Landing Page] --> B[Đăng nhập / Đăng ký]
    B --> C[Lecturer Dashboard Overview]
    
    C --> D[Khoá học]
    D --> D1[Tạo khoá học mới & Sinh Enrollment Code]
    D --> D2[Upload tài liệu bài giảng PDF/Docs]
    D2 --> D3[AI xử lý & Phản hồi trạng thái nạp dữ liệu]
    
    C --> E[Analytics & Insights]
    E --> E1[Xem biểu đồ xu hướng câu hỏi]
    E --> E2[Khám phá Knowledge Gaps - Điểm mù kiến thức]
    E --> E3[Đọc AI Insights - Gợi ý cải thiện học liệu]
    
    C --> F[Kiểm soát & Điều phối]
    F --> F1[Moderation Inbox - Tin nhắn bị gắn cờ]
    F --> F2[Phản hồi yêu cầu tài liệu từ sinh viên]
```

## 2. Vai trò Sinh viên (The Learner)
Mục tiêu: Học tập cá nhân hóa với sự hỗ trợ 24/7 của trợ lý GPT-4o-mini.

```mermaid
graph TD
    A[Đăng nhập Sinh viên] --> B[Student Dashboard]
    B --> C[Tham gia lớp học qua Enrollment Code]
    B --> D[Chọn khóa học đang học]
    
    D --> E[Trò chuyện với Trợ lý AI]
    E --> E1[Đặt câu hỏi chuyên sâu về bài giảng]
    E1 --> E2[Nhận câu trả lời có trích dẫn nguồn cụ thể]
    E2 --> E3[Đánh giá phản hồi AI - Feedback Loop]
    
    D --> F[Lộ trình Cá nhân hóa]
    F --> F1[Xem Roadmap được AI sinh tự động]
    F --> F2[Theo dõi tiến độ hoàn thành các chủ đề]
    
    D --> G[Tài nguyên]
    G --> G1[Xem danh sách tài liệu được duyệt]
    G --> G2[Yêu cầu tài liệu mới nếu thấy thiếu]
```

## 3. Các điểm tương tác đặc biệt
- **Feedback Loop:** Sinh viên đánh giá câu trả lời của AI giúp hệ thống tinh chỉnh Prompt và thông báo cho Giảng viên về những câu hỏi chưa được giải đáp tốt.
- **Dynamic Roadmap:** Lộ trình học tập không tĩnh mà thay đổi dựa trên mức độ hiểu bài của sinh viên (được GPT-4o-mini phân tích từ lịch sử chat).
