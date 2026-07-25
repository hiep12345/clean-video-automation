---
description: "Đóng gói phiên làm việc hiện tại, lưu ngữ cảnh, và tạo prompt bàn giao để chuyển sang phiên mới, giúp giải phóng context window."
skills: []
---

# /compact

> **Mục tiêu**: Thực hiện "Shutdown Protocol" để kết thúc phiên làm việc hiện tại gọn gàng, tránh tràn context window (vượt 50 lượt), và chuẩn bị cho phiên mới một cách liền mạch.
> **Skills**: (Không yêu cầu skill cụ thể, sử dụng Agent capabilities)
> **Trigger**: "/compact", "compact", "đóng phiên", "bàn giao"

## Bước 1: Tổng kết phiên làm việc (Session Summary)

Agent phân tích toàn bộ lịch sử trong phiên hiện tại và tóm tắt theo định dạng sau:
1. **Đã hoàn thành**: Các task, tính năng, hoặc nội dung đã hoàn thành.
2. **Đang dang dở/Cần làm tiếp**: Các phần còn thiếu hoặc bước tiếp theo logic nhất.
3. **Bài học/Quyết định quan trọng**: Các logic mới, architecture decision, hoặc rule mới sinh ra trong phiên (nếu có).

## Bước 2: Cập nhật tài liệu (Documentation Update)

Agent tự động lưu trạng thái vào các file phù hợp (luôn ưu tiên các file sau nếu tồn tại):
- Cập nhật tiến độ vào SQLite task DB (`python scripts/tasks_db/db.py`).
- **Chống Duplicate Learnings (Anti-Pattern Hygiene):** Tuyệt đối KHÔNG tự động ghi thêm bài học vào các file learning nếu trong quá trình làm việc Agent đã chủ động ghi rồi. BẮT BUỘC dùng lệnh tìm kiếm (grep) để kiểm tra.
- **Phân luồng tri thức (Knowledge Routing):** 
  - Nếu bài học thuộc về một Tool/Skill cụ thể (vd: FlowKit, Notion) -> Ghi vào `.agents/skills/<skill_name>/learnings.md` (Local Domain).
  - Nếu bài học là quy tắc vận hành chung, cấu trúc dự án, hoặc lỗi hệ thống chéo -> Ghi vào `learnings.md` ở thư mục gốc (Global System).
- **Hot Cache Sync:** Nếu phiên phát sinh rule mới hoặc keyword routing mới → update `GEMINI.md` TRƯỚC KHI đóng phiên.
- **Obsidian KB Sync:** Nếu phiên có channel strategy decisions, performance insights, hoặc content decisions mới → sync vào file Obsidian KB tương ứng TRƯỚC KHI đóng phiên.
- Ghi đè trạng thái toàn cục vào `Handover.md` (cập nhật YAML Frontmatter và block tóm tắt).

## Bước 3: Dọn dẹp cuối phiên (End-of-Session Cleanup)

Agent BẮT BUỘC thực hiện kiểm tra và chạy checklist dọn dẹp theo Global Rule:
- Xoá các file script tạm (`generate.py`, `_fix.py`...).
- Xoá media tạm không cần thiết.
- Dọn dẹp cache.

## Bước 4: Sinh Handover Prompt (Prompt Bàn Giao)

Agent sinh ra một khối lệnh (prompt) đóng gói gọn gàng để user CHỈ CẦN COPY VÀ DÁN vào phiên chat mới.

**Mẫu Handover Prompt:**
```markdown
# 🔄 HANDOVER TỪ PHIÊN TRƯỚC

**Ngữ cảnh hiện tại:**
- [Tóm tắt mục tiêu chung đang làm...]

**Trạng thái công việc:**
- ✅ Đã xong: [Liệt kê ngắn gọn]
- 🔄 Cần làm tiếp: [Liệt kê task cho phiên mới]

**Chỉ thị bắt đầu phiên mới:**
1. Đọc lại SQLite task DB và `Handover.md` để lấy context.
2. Bắt đầu với task: "[Tên task tiếp theo]"
```

## Quality Gate
- [ ] Báo cáo rõ ràng những gì đã xong và chưa xong.
- [ ] SQLite task DB đã được cập nhật.
- [ ] Checklist "End-of-Session Cleanup" đã được chạy.
- [ ] Handover Prompt đã được format trong code block để dễ copy.
