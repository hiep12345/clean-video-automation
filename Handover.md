# Session Handover [2026-07-24]

## Đã Hoàn Thành (Completed)
- **Tối ưu V3 Prompting (Mix Therapy):** Nhúng thành công hướng dẫn vẽ chữ (Typography) trực tiếp vào Prompt (không dùng Pillow).
- **Phát hiện Bug Cắt chữ (Crop Issue):** Xác định lỗi `batch_gen.py` cắt xén tâm ảnh (center crop) về tỷ lệ 4:5 làm đứt chữ do AI vẽ. Đã sửa mã nguồn `batch_gen.py` để sử dụng **tỷ lệ 1:1** (`--aspect 1:1`), giúp giữ trọn vẹn bố cục chữ nguyên bản.
- **Kiểm toán Gumroad API:** Chứng minh được Trình phân tích ảnh (Image Analyzer) của Gumroad API đang bị hỏng hoàn toàn ở phía máy chủ của họ. Dù API trả về mã 200 (OK), nó vẫn từ chối mọi Public URL (thử nghiệm bằng `catbox.moe`) hoặc Internal S3 URL. Chốt phương án: API hiện tại không thể set Thumbnail tự động.

## Đang Dang Dở & Cần Làm Tiếp (Pending ở Phiên Mới)
1. Khắc phục lỗi kết nối FlowKit Engine: Máy chủ ở cổng 8100 hiện đang từ chối kết nối (Connection Refused), làm gián đoạn tiến trình render 5 ảnh.
2. Chạy lại tiến trình `batch_gen.py` để kết xuất 5 ảnh infographic (Indian Yellow, Carmine Red...) ở tỷ lệ vuông 1:1.
3. Review kết quả chữ Typography 1:1 và hoàn thiện post Facebook.
