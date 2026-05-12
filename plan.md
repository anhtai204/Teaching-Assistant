
---

### Chặng 1: Nâng cấp Động cơ "Tiêu hóa" (Advanced Ingestion & Metadata)

**Mục tiêu:** Xử lý triệt để file đầu vào, giữ lại 100% ngữ cảnh với Parent-Child và Metadata chuẩn.

1. **PDF Parsing & OCR linh hoạt:**
* *Chiến lược:* Không nên tự chạy model OCR (như Tesseract) trên server do ngốn RAM. Hãy dùng `PyMuPDF` để bóc tách text đối với PDF chuẩn. Nếu phát hiện PDF dạng scan (không có text layer), đẩy file đó qua API bên thứ ba (như Unstructured.io hoặc Google Document AI) để lấy cấu trúc thô.


2. **Parent-Child Chunking (Truy xuất Cha-Con):**
* Thay vì băm đều 1000 ký tự, chúng ta chia làm 2 tầng:
* **Parent Chunk:** Đoạn văn bản lớn chứa trọn vẹn ngữ cảnh (Ví dụ: Toàn bộ mục 1.2, khoảng 2000-3000 ký tự).
* **Child Chunks:** Băm Parent Chunk thành các đoạn nhỏ hơn (khoảng 300-500 ký tự).


* *Metadata Workflow:* Cả Child và Parent đều được gắn chuỗi siêu dữ liệu: `course_id`, `source_name`, `page/heading`. Đặc biệt, Child Chunk phải mang thêm `parent_id`.
* *Lưu trữ:* Gửi Child Chunks qua OpenAI Embedding và lưu vào `pgvector`. Lưu Parent Chunks thuần túy (không embedding) vào một bảng khác dạng Document Store.
* *Lợi ích:* Khi tìm kiếm, DB sẽ match với các Child Chunks (tìm cực chuẩn vì đoạn nhỏ), nhưng khi gửi cho LLM, ta query ngược ID để ném toàn bộ Parent Chunk vào Prompt (đảm bảo AI không bị thiếu ngữ cảnh).



### Chặng 2: Luồng Cao tốc & Định tuyến (Fast-path & Routing)

**Mục tiêu:** Trả lời trong < 2 giây cho các câu hỏi cũ, giảm tải cho OpenAI API và Vector DB.

1. **Thiết lập Semantic Cache (Bộ đệm ngữ nghĩa):**
* Tạo một bảng `FAQ_Cache` trong PostgreSQL chứa: `question_embedding`, `answer`, `course_id`.
* Khi có câu hỏi mới -> Cắm vào `pgvector` quét với bảng `FAQ_Cache` với ngưỡng tương đồng (Threshold) cực cao (vd: 0.95).
* Nếu match: Trả về thẳng kết quả cũ. Nếu không match: Đi tiếp xuống hệ thống.


2. **Xây dựng Intent Router (Bộ định tuyến ý định):**
* Dùng một LLM prompt siêu nhỏ, siêu nhanh (như `gpt-4o-mini`) hoặc thư viện phân loại nhẹ để xác định câu hỏi:
* *Loại 1 (Greeting/Chitchat):* Trả lời luôn bằng prompt cơ bản.
* *Loại 2 (Hỏi kiến thức môn học):* Điều hướng xuống luồng Hybrid Search (Chặng 3).
* *Loại 3 (Cần tổng hợp lộ trình ôn tập):* Điều hướng sang Agentic RAG (Chặng 4).





### Chặng 3: Trái tim Tìm kiếm (Hybrid Search & Reranking)

**Mục tiêu:** Khắc phục nhược điểm của Vector Search (hay bỏ sót từ khóa chuyên ngành).

1. **Thực thi Hybrid Search (BM25 + Vector Search):**
* *Vector Search:* Giải quyết câu hỏi về mặt ý nghĩa ngữ nghĩa (tìm bằng pgvector).
* *BM25 (Keyword Search):* Giải quyết việc sinh viên gõ chính xác một mã lỗi, một thuật toán cụ thể. Cài đặt thuật toán BM25 bằng Python hoặc dùng luôn tính năng Full Text Search của PostgreSQL (để tiết kiệm RAM không phải chạy thêm service).
* *Kết hợp:* Áp dụng thuật toán Reciprocal Rank Fusion (RRF) để trộn điểm của 2 tập kết quả này lại.


2. **Cross-Encoder Reranking (Xếp hạng lại):**
* Kết quả sau bước RRF có thể ra 10-20 chunks. Để LLM không bị nhiễu, cần chọn ra 3-5 chunks tinh túy nhất.
* *Chiến lược thực tế:* Tuyệt đối không tải các mô hình Rerank (như `bge-reranker`) lên server ứng dụng. Hãy gọi API `Cohere Rerank` để chấm điểm lại mức độ phù hợp giữa câu hỏi và 10 chunks kia, lấy top 3 đẩy cho LLM.



### Chặng 4: Agentic RAG & Hàng rào bảo vệ (Guardrails)

**Mục tiêu:** Cung cấp khả năng tự lập luận nhiều bước và ngăn chặn ảo giác (hallucination).

1. **Thiết lập LangGraph Agent:**
* Biến LLM thành một Agent có "tools". Các tools bao gồm: `search_course_docs` (Chặng 3), `generate_roadmap` (Tính năng ôn tập).
* Nếu sinh viên hỏi: "So sánh thuật toán A ở bài 1 và bài 4", Agent sẽ tự động Reflection (phản tư): *"Câu này cần tìm ở 2 nơi khác nhau"*, sau đó nó tự gọi tool tìm kiếm 2 lần rồi mới tổng hợp trả lời.


2. **Hallucination Guardrails (Kiểm duyệt đầu ra):**
* Thêm một bước LLM chạy ẩn để kiểm chứng: *"Câu trả lời có thực sự dựa trên Context được cung cấp không?"* Nếu không, bắt hệ thống generate lại hoặc trả về thông báo từ chối.


3. **Hoàn thiện Feedback Loop:**
* Đưa các câu hỏi bị sinh viên "Thumbs down" hoặc Giảng viên "Flag" ngược về bảng dữ liệu. Bổ sung tính năng cho phép giảng viên ghi chú cách trả lời đúng, sau đó dùng dữ liệu này đẩy vào `FAQ_Cache` (Chặng 2) để hệ thống tự thông minh lên vào ngày hôm sau.



---

### Khuyến nghị Triển khai (Roadmap)

Với nguồn lực hiện tại, bạn nên chia kế hoạch code theo thứ tự ưu tiên sau để đảm bảo không bị quá tải:

* **Tuần 1-2 (MVP Core):** Hoàn thiện **Chặng 1** (Parent-Child) và luồng Vector Search cơ bản + Trích dẫn Metadata. Hệ thống phải chạy được từ A-Z.
* **Tuần 3 (Tối ưu tìm kiếm):** Lắp ráp **Chặng 3** (BM25 + Rerank API) để nâng cấp độ chính xác.
* **Tuần 4 (Hiệu năng):** Lắp ráp **Chặng 2** (Semantic Cache + Router) để tối ưu chi phí và độ trễ.
* **Tuần 5 (Nâng cao):** Viết Agentic RAG bằng LangGraph cho **Chặng 4**.

Sự kết hợp giữa Metadata tĩnh (tọa độ file) và luồng Agent động (tự quyết định dùng tool nào) sẽ tạo ra một Trợ giảng AI cực kỳ mạnh mẽ. Bạn muốn chúng ta bắt đầu thảo luận chi tiết cấu trúc bảng Database cho phần **Semantic Cache** hay muốn thiết kế đồ thị luồng (Graph) cho phần **Agentic RAG bằng LangGraph** trước?