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
powershell -ExecutionPolicy Bypass -File scripts/setup_git_hooks.ps1
```

The final setup command installs the same managed Git hooks for the root
repository and both submodules. `pre-commit` scans staged additions, while
`pre-push` scans the commits about to be published. Verify an existing
workspace with:

```bash
powershell -ExecutionPolicy Bypass -File scripts/setup_git_hooks.ps1 -CheckOnly
```

`content-planner-kb` là repository riêng tư nên lệnh cuối yêu cầu tài khoản GitHub có quyền truy cập. Thư viện nhạc trong `content-planner-kb/resources/bgm/` là dữ liệu cục bộ, không được lưu trên GitHub.

## Shared integration configuration

Copy `.env.example` to the workspace-root `.env` and keep real values local.
Notion BUFFER is retired and must not be queried or updated; its legacy
`NOTION_BUFFER_DB_ID` setting is not an operational integration. Settings for
separate Notion Goal/Docs use cases, plus `FB_APP_ID` and `FB_APP_SECRET`,
belong in this root file, not inside either submodule. Google Drive OAuth files belong under
`.secrets/google-drive/` or at the paths configured by
`GDRIVE_CREDENTIALS_FILE` and `GDRIVE_TOKEN_FILE`. Set
`GDRIVE_PARENT_FOLDER_ID` to the exact writable destination folder; the
uploader never searches or creates a folder by name. Facebook Page IDs and
Page Access Tokens belong in `.secrets/facebook/pages.json`, configurable
through `FB_PAGES_CONFIG`. All secret locations are ignored by Git.

Facebook read-only credential setup and redacted preflight:

```bash
python content-planner-kb/scripts/fb_upload_reel.py setup
python content-planner-kb/scripts/facebook_config.py --page science-unlocked
```

Facebook publishing is manual-only. Agents and automation may use the Page
credential for sync/insights but cannot upload or publish Posts/Reels.

Distribution Hub ingest is fail-closed, exact-ID only, and dry-run by default:

```bash
python content-planner-kb/scripts/publish_buffer.py --channel mt --id <content-id>
python content-planner-kb/scripts/publish_buffer.py --channel mt --id <content-id> --apply
```

Only media with a QA PASS receipt and a verified Drive link can enter
Distribution Hub with `Ready` status. The `publish_buffer.py` filename is a
legacy technical identifier retained for compatibility; it does not call
Notion.

## Quy tắc Phát triển

- Mọi thay đổi code hoặc logic đều phải làm trên branch riêng theo mẫu trung lập với agent: `<type>/<scope>-<description>`.
- Việc quản lý Task phải thông qua SQLite (`.agents/state/task_agent.db`), tuyệt đối không tạo file `task.md` ở thư mục gốc.
- Mọi AI agent phải đọc `AGENTS.md` ở thư mục gốc trước khi ghi file hoặc thay đổi Git.
- Antigravity 2 phải đọc thêm `.agents/AGENTS.md` cho các quy trình vận hành chuyên biệt.
