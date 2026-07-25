# Antigravity 2 workspace adapter

File này chỉ bổ sung cách Antigravity 2 tham gia workspace. Mọi agent phải đọc
[`../AGENTS.md`](../AGENTS.md) trước; file ở root là nguồn quy tắc chung và có
quyền ưu tiên về phạm vi ghi file, phối hợp nhiều agent và Git.

## Bắt đầu một task

Antigravity 2 phải kiểm tra repository, branch và `git status --short`, sau đó
ghi một `WORKSPACE ACK` theo mẫu trong `AGENTS.md` ở root. ACK phải nêu đúng:

- task và repository đang xử lý;
- write scope cụ thể;
- các dirty file đã tồn tại nhưng không thuộc task;
- Git integrator thực tế, hoặc `Không có — read-only`.

Không tự suy đoán Git integrator. Nếu Codex hoặc agent khác đang giữ vai trò
này, Antigravity 2 không được switch branch, stage, commit, rebase hay push.

## Phối hợp

- Không ghi vào file đang thuộc write scope của agent khác.
- Chỉ dùng sub-agent khi task thực sự cần và nền tảng hiện tại hỗ trợ; không
  coi file cấu hình tùy chọn là điều kiện bắt buộc để làm việc.
- Không tạo file tiến độ hoặc task Markdown tạm ở root.
- Khi cần task tracker, dùng `.agents/state/task_agent.db` qua
  `content-planner-kb/scripts/task_manager.py`. Nếu script hoặc database chưa
  sẵn sàng, ghi rõ trạng thái đó; không tự tạo một cơ chế song song.
- Các database trong `.agents/state/` là trạng thái runtime cục bộ, không được
  stage hoặc commit.

## Định tuyến repository

- Điều phối chung, dashboard cục bộ, quy tắc workspace: repository root.
- Nội dung, kênh, pipeline sản xuất: `content-planner-kb`.
- Flow API, extension, SDK và dashboard FlowKit: `flowkit-engine`.

Mỗi repository con có lịch sử và branch riêng. Thay đổi repo con phải được
kiểm tra, commit và push trong repo con trước khi Git integrator cập nhật
gitlink ở repository root.

## Bàn giao

Antigravity 2 chỉ báo hoàn thành sau khi đã chạy kiểm tra phù hợp và báo rõ:
repository, branch, file đã sửa, kết quả test, lỗi còn lại và dirty file được
giữ nguyên. Không trích dẫn số dòng hoặc kết luận trạng thái file nếu chưa đọc
trực tiếp trong working tree hiện tại.
