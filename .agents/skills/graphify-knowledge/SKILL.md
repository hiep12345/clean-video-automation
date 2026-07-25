---
name: Graphify Knowledge
description: Đọc và truy vấn Đồ thị Tri thức (Knowledge Graph) của hệ thống bằng Graphify. Sử dụng khi cần phân tích kiến trúc, tìm kiếm mối quan hệ giữa các file (AST/References) hoặc khi lệnh grep_search truyền thống không mang lại kết quả rõ ràng trong codebase lớn.
---

# 🕸️ Kỹ năng Sử dụng Graphify (Graph RAG)

Khi làm việc với các hệ thống phức tạp, tài liệu rải rác ở nhiều nơi (`learnings.md`, `AGENTS.md`, `config/channels/`, `scripts/`), việc tìm kiếm bằng `grep_search` thuần túy có thể dẫn đến việc thiếu ngữ cảnh hoặc bị chìm trong hàng ngàn kết quả không liên quan. 

Kỹ năng này cung cấp các nguyên tắc sử dụng **Graph RAG** thông qua `graphify-out/graph.json` - bản đồ toàn thư của hệ thống.

## 1. Nguyên Tắc Vận Hành (Khi nào dùng?)
- **Tránh Lạm dụng:** Đừng gọi Graphify cho những sửa đổi nhỏ 1 dòng (ví dụ: đổi text, sửa tham số truyền vào). Hãy tiếp tục dùng `grep_search` và `view_file` cho các tác vụ đơn giản.
- **Bắt buộc dùng khi Refactor (Kiến trúc):** Khi được yêu cầu thay đổi tên hàm, cấu trúc thư mục, hoặc sửa đổi luồng dữ liệu chính (như `produce_pipeline.py`), Đặc vụ **BẮT BUỘC** phải tra cứu đồ thị để đảm bảo nguyên tắc "Map Before Move".
- **Khi làm việc với Codebase chưa biết:** Khi Sếp hỏi "Tính năng X nằm ở đâu?", thay vì mò mẫm, hãy xem qua đồ thị.

## 2. Cách Thực Thi (How to use)
Do Đồ thị Tri thức đã được Cron Job tự động build và lưu tại `graphify-out/graph.json`, Đặc vụ không cần chạy lại lệnh extract (rất tốn thời gian). Thay vào đó, hãy **đọc trực tiếp file JSON đó**.

### Phương pháp truy vấn `graph.json`:
Bạn có thể sử dụng `grep_search` trên chính file `graph.json` để tìm tên hàm hoặc tên file.
Ví dụ:
```python
# Gọi lệnh terminal nội bộ để truy xuất các Cạnh (Edges) liên quan đến file hoặc hàm cụ thể
cat graphify-out/graph.json | grep -i "tên_hàm_hoặc_tên_file" -C 5
```
*(Nếu hệ thống tích hợp sẵn plugin `/graphify`, bạn có thể gọi thẳng lệnh `graphify query`)*.

## 3. Cập nhật Đồ thị
Đồ thị sẽ được cập nhật tự động hàng tuần. Tuy nhiên, nếu bạn vừa thực hiện một đợt Refactor cực lớn (thay đổi hàng chục file code) và cần bản đồ mới ngay lập tức, bạn có thể tự mình khởi chạy lại trình xây dựng:
```bash
python scripts/update_knowledge_graph.py
```
*(Lưu ý: Quá trình này có thể tốn vài phút và sẽ tiêu tốn Gemini API Token).*
