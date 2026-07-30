# Session Handover [2026-07-30]

## Kết quả phục hồi workspace

- `content-planner-kb` đã có một nguồn trạng thái Task Tracker chuẩn tại
  `.agents/state/task_agent.db`; state bị tách trong worktree cũ đã được nhập
  lại bằng lệnh migration có audit.
- Output `mt-v088-aurelium` đã được phục hồi về
  `content-planner-kb/output/fb-reels/mix-therapy/mt-v088-aurelium`.
  Task được giữ ở `BLOCKED` cho đến khi có independent QA hợp lệ; không tự nâng
  trạng thái dựa trên việc file tồn tại.
- 21 draft thay thế BK/MT/SU đã được bảo toàn trên nhánh
  `feat/photo-batch-bk-mt-su-20260727` (commit `a83e439`).
- Bản được bộ reconciler tổng quát chọn đã được đưa vào nhánh
  `fix/content-recovery-hygiene`; không có rule hardcode theo post ID.
- Sáu bundle Canvas Decor và các draft MT/SU liên quan đã được phục hồi vào Git.
  Metadata hiện còn trạng thái không đồng nhất (`DRAFT`/`READY_FOR_PUBLISH`);
  vì không có đầy đủ receipt QA/acceptance đi kèm trong bundle phục hồi, chúng
  không được coi là đã sẵn sàng xuất bản chỉ dựa trên nội dung Markdown.
- Hai worktree phục hồi đã được tháo sau khi dữ liệu, log và nhánh khôi phục đã
  được xác minh. State trùng và script one-off được chuyển vào
  `scratch/recovery-quarantine/`, không xóa không thể khôi phục.

## Cơ chế phòng tái diễn

- Repo gốc có `scripts/workspace_doctor.py check` để kiểm tra read-only:
  dirty repo, lệch gitlink submodule, worktree đặt sai chỗ, Task DB trùng,
  task Git closeout sai trạng thái, script/asset chưa có Git owner và branch
  divergence.
- Worktree nội bộ, Task DB và QA runtime results được ignore; artifact vẫn giữ
  trên đĩa nhưng không làm bẩn Git.
- QA video/thumbnail dùng policy theo config và evidence theo capability; không
  bắt buộc một chiến lược trích frame cố định.
- Duration clip/final video lấy từ production profile/manifest. Không còn giá
  trị `4.0` áp đặt theo từng case trong copy/QA helper.
- Notion BUFFER đã retired và fail-closed. Distribution Hub là hệ thống trạng
  thái phân phối hiện hành; không chạy lại `notion_sync.py`.

## Việc cần xử lý tiếp theo

1. Chạy independent QA + coordinator acceptance cho các bundle Canvas Decor
   được phục hồi, rồi mới chuẩn hóa lifecycle bằng receipt thật.
2. Chạy independent full-video QA cho `mt-v088-aurelium`; chỉ bỏ `BLOCKED` khi
   evidence đạt policy.
3. Bổ sung đúng asset nhạc production
   `output/bgm/home-decor/quiet-geometry-a.mp3` có SHA-256 khớp config. File này
   không có trong workspace hoặc Google Drive theo tìm kiếm tên ngày 2026-07-30.
4. Merge các feature branch chỉ sau review riêng. Không có Reel/Post nào được
   upload hoặc publish trong phiên phục hồi này.
