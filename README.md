# Clean Video Automation

Hệ thống tự động hóa nội dung và render video chuyên nghiệp được vận hành bởi AI Agents (Antigravity).

## Cấu trúc Dự án

- `.agents/`: Chứa định nghĩa cấu hình, rules, skills, và workflows của toàn bộ hệ thống AI Agent.
- `flowkit-engine/`: Engine kết xuất video và quản lý giao tiếp (public Git submodule).
- `content-planner-kb/`: Obsidian Vault lưu trữ kịch bản và kế hoạch (private Git submodule).
- `dashboard/`: Giao diện quản lý cục bộ.
- `scratch/`: Thư mục chứa các file nháp, tải về tạm thời (Không đẩy lên Git).
- `output/`: Thư mục xuất video cuối cùng (Không đẩy lên Git).
- `learnings.md`: Nhật ký học tập của hệ thống.
- `Handover.md`: Biên bản bàn giao phiên làm việc.

## Thiết lập Git lần đầu

```bash
git clone https://github.com/hiep12345/clean-video-automation.git
cd clean-video-automation
git submodule update --init --recursive flowkit-engine
git submodule update --init content-planner-kb
```

`content-planner-kb` là repository riêng tư nên lệnh cuối yêu cầu tài khoản GitHub có quyền truy cập. Thư viện nhạc trong `content-planner-kb/resources/bgm/` là dữ liệu cục bộ, không được lưu trên GitHub.

## Quy tắc Phát triển

- Mọi thay đổi code hoặc logic đều phải tạo nhánh mới (Feature Branch).
- Việc quản lý Task phải thông qua SQLite (`.agents/state/task_agent.db`), tuyệt đối không tạo file `task.md` ở thư mục gốc.
- Đảm bảo tuân thủ nghiêm ngặt các điều khoản trong `.agents/AGENTS.md`.
