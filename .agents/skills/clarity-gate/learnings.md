# Learnings — clarity-gate

> Cập nhật sau MỖI lần skill được dùng trong production.
> Khi Run Log có 3+ entries cùng pattern → đề xuất update SKILL.md.
> Giới hạn cứng: 10 tickets + 5 patterns. Vượt quá → Graduate/Xóa mục cũ nhất.

## Active Patterns (Hành vi & Hướng xử lý)
- **Quyết định Thiết kế Hợp nhất (Unified Architecture)**: Không phân tách nhỏ file luật `clarity-gate` theo từng định dạng hay kênh sản xuất. Logic kiểm định lõi được hợp nhất để bảo vệ tính nhất quán (DRY), trong khi các luật đặc thù về sinh học, màu sắc và cấm kỵ được nạp động từ phần thuộc tính `Bio-anchors` của từng kịch bản hoặc từ file cấu hình `channels.json`.
- **Duy trì Narration cho Silent Channel**: Đối với các kênh nghệ thuật/ASMR không lời thoại (ví dụ: `mix-therapy`), công cụ [render.py](../../../scripts/render.py) vẫn yêu cầu tệp tin [narration.txt](narration.txt) tồn tại để cấu trúc dòng phụ đề. Cần tạo tệp này với nhãn `[No Narration — Sound Only]` để pipeline chạy trôi chảy.
- **Tránh Lệch Phụ Đề (Subtitle Shift)**: Với video không tiếng nói, bộ lọc ASS tạo sub đôi khi bị lệch timing do thiếu sóng âm voiceover chuẩn. Cần chạy L3 video QA và điều chỉnh thủ công/kiểm tra lại dòng text overlay xuất hiện đúng theo phân cảnh trong script.
- **Cơ chế nạp động luật thẩm định (Dynamic Rule Loading)**: Kể từ 25/06/2026, [clarity_gate.py](../../../scripts/qa/l1_script_qa.py) tự động nạp động các quy tắc kiểm định từ file [SKILL.md](SKILL.md) tại thời điểm chạy. Khi muốn thay đổi, tinh chỉnh hoặc thêm bớt tiêu chí thẩm định (như facts, hashtags, logic,...), chỉ cần sửa trực tiếp tệp `SKILL.md` này mà không cần can thiệp vào code Python.

## Run Log
| Date | Task | Result | Key Learning |
|------|------|--------|--------------|
| 22/06 | Kiểm định video mt-v033-golden-amber | ✅ Đạt 10.0/10 | Xác nhận áp dụng mô hình unified clarity-gate kết hợp bio-anchors chống vẽ tay/công cụ cơ học hoạt động chính xác. |
