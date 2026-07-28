---
name: sqlite-task-tracker
description: "Rules, schema, and API patterns for managing and developing the SQLite-based Task Tracker database (task_agent.db) in this workspace."
risk: safe
source: custom
date_added: "2026-06-05"
---

<!-- skip-skill-gate -->
# SQLite Task Tracker Skill


Playbook này hướng dẫn các AI Agent trong tương lai cách tương tác, bảo trì, và phát triển hệ thống Task Tracker chạy bằng SQLite trong dự án.

## 🎯 Khi nào sử dụng
Sử dụng skill này khi:
- Cần tạo, cập nhật trạng thái, hoặc xóa tác vụ (task).
- Cần ghi nhận bằng chứng thực thi (evidence).
- Cần bảo trì cấu trúc database hoặc thực hiện migration.
- Cần chạy dọn dẹp (pruning/vacuuming) dữ liệu cũ.

---

## 🏗️ DB Schema & Relationships

Database chạy trên SQLite, lưu trữ tại `.agents/state/task_agent.db`.

```mermaid
erDiagram
    task {
        TEXT id PK
        TEXT channel
        TEXT action
        TEXT status
        TEXT assigned_to
        TEXT strategy_mode  %% legacy DB column name; conceptually = generation_method %%
        TEXT script_path
        TEXT created_at
        TEXT updated_at
        TEXT completed_at
        TEXT result_summary
        TEXT error_message
    }
    task_dependency {
        TEXT task_id PK, FK
        TEXT depends_on_task_id PK, FK
    }
    task_evidence {
        TEXT task_id PK, FK
        TEXT key PK
        TEXT value
    }
    task_claim {
        INTEGER id PK
        TEXT task_id FK
        TEXT owner_role
        TEXT trajectory_id UK
        TEXT acquired_at
        TEXT heartbeat_at
        TEXT expires_at
        TEXT released_at
    }
    resource_lock {
        TEXT resource_key PK
        TEXT task_id FK
        INTEGER claim_id FK
        TEXT owner_role
        TEXT trajectory_id
        TEXT expires_at
    }
    task_handoff {
        INTEGER id PK
        TEXT task_id FK
        TEXT from_role
        TEXT to_role
        TEXT reason
        TEXT status
    }

    task ||--o{ task_dependency : "has"
    task ||--o{ task_evidence : "records"
    task ||--o{ task_claim : "claimed by"
    task_claim ||--o{ resource_lock : "owns"
    task ||--o{ task_handoff : "hands off"
```

### Các ràng buộc quan trọng:
- **Foreign Keys**: Bảng `task_dependency` và `task_evidence` sử dụng ràng buộc khóa ngoại tới `task(id)` với tùy chọn `ON DELETE CASCADE`. Khi một task bị xóa, toàn bộ dependency và evidence liên quan sẽ tự động bị xóa theo.
- **Indexes**: 
  - `idx_task_status` trên `task(status)`
  - `idx_task_channel` trên `task(channel)`
  - `idx_evidence_task` trên `task_evidence(task_id)`

---

## 💻 Python API Standard Patterns

Không tự ý kết nối trực tiếp đến file DB bằng `sqlite3.connect` trong các script khác. **Bắt buộc phải dùng [task_manager.py](../../../content-planner-kb/scripts/task_manager.py)** để thao tác dữ liệu:

```python
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[3] / "content-planner-kb" / "scripts"))
import task_manager

# 1. Tạo task mới (kèm dependencies nếu có)
task_manager.create_task(
    task_id="su-v130-custom-video",
    channel="science-unlocked",
    action="full-produce",
    strategy_mode="default",
    script_path="path/to/script.md",
    deps=["su-v129-spitting-spider"]
)

# 2. Cập nhật trạng thái task
task_manager.update_task(
    task_id="su-v130-custom-video",
    status="COMPLETED", # PENDING, IN_PROGRESS, COMPLETED, FAILED
    result="QA Passed: 9.85/10. Output: output/fb-reels/science-unlocked/.../final.mp4",
    error=None
)

# 3. Ghi nhận bằng chứng thực thi (Evidence)
task_manager.add_evidence(
    task_id="su-v130-custom-video",
    key="fb_reel_id",
    value="1029384756"
)
```

---

## 🧹 Quy tắc Dọn dẹp & Bảo trì (Hygiene & Maintenance)

1.  **Dọn dẹp liên thông (Database + Markdown)**:
    - Khi xóa task (qua hàm `prune_tasks`), bắt buộc phải xóa cả file kịch bản Markdown tương ứng trong thư mục `.agents/tasks/` để tránh lãng phí ổ đĩa.
2.  **SQLite Vacuum**:
    - Lệnh `VACUUM` để giải phóng dung lượng đĩa **không được chạy bên trong transaction block** (sẽ gây lỗi `cannot VACUUM from within a transaction`). Phải chạy lệnh này độc lập sau khi connection commit và đóng transaction.
3.  **Tần suất chạy**:
    - Quy trình prune mặc định là **90 ngày**.
    - Được kích hoạt tự động qua `daily_cleanup.py` trong quy trình dọn dẹp hàng ngày.

---

## 🛠️ CLI Diagnostics Quick Reference

Sử dụng trực tiếp CLI của `task_manager.py` khi cần debug thủ công:

*   **Xem thông tin chi tiết 1 Task**:
    ```bash
    python content-planner-kb/scripts/task_manager.py get --id <task_id> --json
    ```
*   **Liệt kê toàn bộ các Task đang chạy ngầm/chờ xử lý**:
    ```bash
    python content-planner-kb/scripts/task_manager.py list --status PENDING --json
    ```
*   **Chạy dọn dẹp thủ công**:
    ```bash
    python content-planner-kb/scripts/task_manager.py prune --days 60
    ```

## Antigravity Team Coordination

Tier 2/3 specialists do not start by calling `update --status IN_PROGRESS`.
They must claim atomically through the machine-readable team preflight:

```powershell
python content-planner-kb/scripts/team_preflight.py `
  --task <task-id> --role <assigned-role> `
  --trajectory <current-trajectory-id> `
  --resource <exact-resource-key> --claim --json
```

Long-running tasks renew their lease:

```powershell
python content-planner-kb/scripts/task_manager.py heartbeat `
  --id <task-id> --trajectory <trajectory-id> --json
```

Before assigning overlapping work, inspect locks:

```powershell
python content-planner-kb/scripts/task_manager.py conflicts `
  --resource <resource-key> --json
```

When a role cannot continue, hand off instead of editing outside its boundary:

```powershell
python content-planner-kb/scripts/task_manager.py handoff `
  --id <task-id> --from-role <role-a> --to-role <role-b> `
  --reason "<bounded reason>" --evidence "<artifact/test evidence>" --json
```

Claims use a 15-minute lease by default. Trajectory IDs are immutable and
cannot be reused after release. Terminal task states release active locks.
Any non-zero tracker/preflight result is a hard stop, not a warning.

## Git Closeout Gate

Task có ghi code/config/tài liệu phải được tạo kèm Git metadata:

```powershell
python content-planner-kb/scripts/task_manager.py create `
  --id <task-id> --channel workspace --action custom --assigned <agent> `
  --git-required --repository <repo> --branch <feature-branch> `
  --write-scope "<path1>,<path2>"
```

Agent thực thi bàn giao cho Git integrator. Sau khi test, commit và push feature
branch, Git integrator closeout:

```powershell
python content-planner-kb/scripts/task_manager.py closeout `
  --id <task-id> --tests "<checks: PASS>" --commit <sha> `
  --push-status pushed --result "<summary>"
```

`COMPLETED` bị chặn nếu thiếu evidence. `deferred` chỉ hợp lệ khi kèm
`--push-reason`. Không dùng closeout để tự stage file hoặc thay thế review diff.
