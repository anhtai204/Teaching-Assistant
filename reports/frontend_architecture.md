# Kiến trúc Hệ thống Frontend & UI/UX (Technical Specification)

Tài liệu này chi tiết hóa cách thức xây dựng giao diện người dùng dựa trên Next.js 14, tập trung vào tính tương tác cao, thiết kế hiện đại (Premium) và trải nghiệm AI mượt mà.

---

## 1. Stack Công nghệ & Design System

### 1.1. Core Framework: Next.js 14 (App Router)
Chúng tôi sử dụng kiến trúc App Router mới nhất của Next.js để tận dụng:
- **Server Components (RSC):** Giảm dung lượng JavaScript tải về trình duyệt, tăng tốc độ FCP (First Contentful Paint).
- **Server Actions:** Xử lý các tác vụ như gửi feedback, tạo khóa học mà không cần viết API route riêng biệt, giúp code sạch và dễ bảo trì.
- **Middleware:** Thực hiện phân quyền (Authorization) và kiểm tra session ngay tại "cửa ngõ" ứng dụng.

### 1.2. Design System: shadcn/ui & Tailwind CSS
- **shadcn/ui:** Cung cấp các thành phần giao diện (Primitive Components) dựa trên Radix UI, đảm bảo khả năng truy cập (Accessibility - WCAG) và tính thẩm mỹ cao.
- **Tailwind CSS:** Sử dụng phương pháp Utility-First để xây dựng giao diện linh hoạt. Hệ thống màu sắc được thiết lập qua các CSS Variables (HSL) hỗ trợ chuyển đổi Dark/Light mode mượt mà.

---

## 2. Trải nghiệm Người dùng AI (AI-First UX)

### 2.1. Chatbot Interface nâng cao
- **Streaming UI:** Sử dụng cơ chế đọc stream từ Backend để hiển thị nội dung tin nhắn ngay khi GPT-4o-mini sinh ra từng token. 
- **Markdown & Code Highlighting:** Tích hợp `react-markdown` và `prismjs` để trình bày câu trả lời của AI một cách chuyên nghiệp (hỗ trợ bảng, danh sách, khối code).
- **LaTeX Rendering:** Sử dụng `KaTeX` để hiển thị các công thức toán học và khoa học phức tạp trong bài giảng.

### 2.2. Micro-interactions với Framer Motion
Để tạo cảm giác ứng dụng "đang sống", Framer Motion được sử dụng cho:
- **Entrance Animations:** Các thẻ khóa học và biểu đồ Analytics sẽ hiện lên với hiệu ứng fade-in và scale nhẹ.
- **Skeleton Loaders:** Khi dữ liệu đang được fetch, các khung hình xám nhạt (Skeleton) sẽ hiển thị để giảm bớt sự lo lắng của người dùng (perceived performance).
- **Status Indicators:** Các đốm trạng thái (dots) nhấp nháy khi AI đang "suy nghĩ" hoặc "đang tìm kiếm tài liệu".

---

## 3. Quản lý Dữ liệu & State

### 3.1. Chiến lược Fetching với SWR (Stale-While-Revalidate)
Thay vì sử dụng các thư viện quản lý state cồng kềnh, hệ thống sử dụng SWR để:
- **Auto Revalidation:** Tự động cập nhật biểu đồ Analytics khi người dùng chuyển tab hoặc sau một khoảng thời gian nhất định.
- **Optimistic UI:** Khi sinh viên gửi một tin nhắn, tin nhắn đó sẽ hiện ngay lập tức trên màn hình trước khi Backend phản hồi, tạo cảm giác cực kỳ nhanh nhạy.

### 3.2. Form Handling
Sử dụng `react-hook-form` kết hợp với `zod` để thực hiện validation dữ liệu ngay tại client:
- Đảm bảo file upload đúng định dạng và dung lượng.
- Kiểm tra enrollment code hợp lệ trước khi gửi request tới server.

---

## 4. Cấu trúc Thư mục (Atomic-ish Design)
Hệ thống tổ chức thư mục một cách khoa học:
- **`/app`:** Chứa các route và layout chính.
- **`/components/ui`:** Các thành phần giao diện dùng chung (buttons, inputs, cards).
- **`/components/features`:** Các component phức tạp gắn liền với nghiệp vụ (ChatWindow, RoadmapTree, AnalyticsCharts).
- **`/hooks`:** Chứa các custom hooks để xử lý logic (useChat, useAnalytics).
- **`/lib`:** Chứa các hàm tiện ích (formatters, constants, api-clients).

---

## 5. Tối ưu hóa Hiệu năng & SEO
- **Image Optimization:** Sử dụng `next/image` để tự động resize và lazy load ảnh bìa khóa học.
- **Font Optimization:** Tích hợp `next/font` cho font Inter và Roboto, tránh lỗi layout shift khi tải font.
- **SEO Ready:** Mỗi trang đều có Title, Meta Description và OpenGraph tags được sinh động (dynamic) theo thông tin khóa học.
- **Code Splitting:** Next.js tự động chia nhỏ code, chỉ tải những gì cần thiết cho trang hiện tại.
 stone.
