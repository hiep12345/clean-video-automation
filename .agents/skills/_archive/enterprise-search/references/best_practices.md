# Tiêu chuẩn và Best Practices — Enterprise Search

## 1. Xếp hạng kết quả (Ranking)
- Ưu tiên kết quả mới nhất (recency).
- Kết quả từ nguồn trực tiếp liên quan đến query được xếp cao hơn.
- Nếu trùng nội dung giữa các nguồn, giữ bản gốc, loại bỏ bản sao.

## 2. Trình bày kết quả
- Luôn ghi rõ **nguồn gốc** (source icon + link).
- Nhóm kết quả theo nguồn nếu > 10 items.
- Hiển thị snippet/preview cho mỗi kết quả.

## 3. Xử lý khi không tìm thấy
- Đề xuất từ khóa thay thế.
- Mở rộng phạm vi tìm kiếm (thêm nguồn).
- Hỏi người dùng để clarify trước khi kết luận "không có kết quả".

## 4. Bảo mật
- Không hiển thị kết quả từ nguồn mà người dùng không có quyền truy cập.
