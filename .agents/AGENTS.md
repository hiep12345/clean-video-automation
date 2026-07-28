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
- `Git authority`: tên Git integrator thực tế hoặc `none`;
- `Task mode`: `read-only` hoặc `write-scoped`.

Không tự suy đoán Git integrator. Nếu Codex hoặc agent khác đang giữ vai trò
này, Antigravity 2 không được switch branch, stage, commit, rebase hay push.

## Claim và team preflight bắt buộc

`.agents/config/team-manifest.yaml` là registry máy đọc được cho role và risk
tier. Trước hành động đầu tiên của specialist Tier 2/3, specialist phải chạy:

```text
python content-planner-kb/scripts/team_preflight.py \
  --task <task-id> --role <role> \
  --trajectory <ANTIGRAVITY_TRAJECTORY_ID> \
  --resource <exact-resource-key> --claim --json
```

Preflight tự kiểm tra assignment, dependency, trajectory reuse và resource
conflict, rồi chuyển task sang `IN_PROGRESS` bằng một transaction nguyên tử.
Không được cập nhật `IN_PROGRESS` thủ công để thay thế claim. Lỗi CLI, task
không tồn tại, role sai, dependency chưa xong hoặc claim thất bại đều là hard
stop; parent không được tiếp tục bằng báo cáo thủ công.

Specialist phải heartbeat cho task dài và giải phóng claim khi handoff. Trạng
thái terminal tự giải phóng lock. Không kết nối SQLite trực tiếp; dùng
`task_manager.py`.

## Vai trò điều phối chiến lược

Antigravity 2 là **Strategic Coordinator** của phiên Antigravity, không phải
một shell executor mặc định. Parent agent giữ quyền sở hữu task, chia phạm vi,
triệu gọi specialist, tổng hợp kết quả và tự kiểm tra bằng chứng trước khi bàn
giao.

Trước task phức tạp, parent phải đọc
`.agents/config/agent-routing.md`. Task được coi là phức tạp khi có ít nhất một
điều kiện sau:

- cần từ hai chuyên môn độc lập trở lên;
- dự kiến sửa từ ba file hoặc chạm nhiều repository;
- cần cả thực thi và nghiệm thu độc lập;
- dự kiến vượt quá mười tool call.

Khi nền tảng có `invoke_subagent`, parent phải dùng đúng tên agent trong routing
table, truyền mục tiêu hữu hạn, input đã biết, repository, task mode và write
scope không chồng lấn. Parent không được chuyển toàn bộ trách nhiệm nghiệm thu
cho specialist. Không delegate task nhỏ chỉ để hình thức.

Nếu runtime không có `invoke_subagent`, parent chỉ được tự thực hiện task Tier
0/1. Task Tier 2/3 cần production, QA độc lập, developer, software QA hoặc Git
integration phải chuyển `BLOCKED`; parent không được tự đóng nhiều vai hoặc
tuyên bố đã dùng specialist.

## Phối hợp

- Không ghi vào file đang thuộc write scope của agent khác.
- Dùng `.agents/config/agent-routing.md` làm nguồn định tuyến cho các agent
  chuyên biệt. Workflow không được gọi tên agent không có trong bảng này.
- Chỉ dùng sub-agent khi task thực sự cần và nền tảng hiện tại hỗ trợ; không
  coi file cấu hình tùy chọn là điều kiện bắt buộc để làm việc.
- Không tạo file tiến độ hoặc task Markdown tạm ở root.
- Khi cần task tracker, dùng `.agents/state/task_agent.db` qua
  `content-planner-kb/scripts/task_manager.py`. Nếu script hoặc database chưa
  sẵn sàng, ghi rõ trạng thái đó; không tự tạo một cơ chế song song.
- Các database trong `.agents/state/` là trạng thái runtime cục bộ, không được
  stage hoặc commit.

## Nghiệm thu độc lập và bằng chứng QA

- Agent tạo hoặc sửa media/content không được tự ký PASS cho chính artifact đó.
- PASS mở khóa Drive, Notion Buffer hoặc publish phải do `qa-reviewer` độc lập
  kiểm tra đúng phiên bản artifact hiện tại.
- QA ảnh/video phải mở từng artifact; không suy rộng kết quả từ một mẫu cho cả
  batch.
- Xác nhận `visual_accuracy`, `text_readability` và `claim_verification` chỉ
  được bật khi báo cáo có bằng chứng tương ứng. Claim khoa học phải ghi nguồn
  có thể truy cập; morphology phải đối chiếu ảnh tham chiếu thực tế.
- Parent phải bác bỏ PASS thiếu bằng chứng, có checklist chưa hoàn thành hoặc
  có lỗi nhìn thấy được, kể cả receipt đúng schema/hash.
- Search snippet, tiêu đề bài báo hoặc DOI đứng riêng chỉ dùng để tìm nguồn,
  không phải bằng chứng đã kiểm tra. Với claim khoa học, `qa-reviewer` phải mở
  nguồn đã chọn bằng `read_url_content` và ghi evidence receipt theo
  `.agents/agents/qa-reviewer/references/evidence-contract.md`.
- Parent chỉ được dùng các từ `cross-checked`, `verified` hoặc tương đương khi
  chính parent đã mở ít nhất một nguồn sơ cấp quyết định bằng
  `read_url_content`, đối chiếu metadata/điều kiện nghiên cứu và ghi
  `PARENT EVIDENCE RECEIPT` gồm URL đã mở, tool, claim đã kiểm tra và kết quả.
  Nếu không có receipt này, parent phải ghi `parent_cross_check: not performed`.
- DOI sai tiêu đề/tác giả/đối tượng, claim dùng nhầm môi trường thí nghiệm,
  morphology không có reference thực tế, hoặc thiếu tool receipt đều phải fail
  closed: `UNVERIFIED`/`Unsupported`, không PASS.
- Chỉ artifact có `drive_buffer_eligible: true` trong QA gate receipt hợp lệ
  mới được xem là đủ điều kiện cho bước Drive hoặc Notion Buffer. Receipt
  không tự cấp quyền chạy upload/sync; quyền bên ngoài vẫn theo lệnh người dùng.
- Không chạy upload hoặc sync để “thử” một artifact chưa qua gate. Dry-run
  không thay thế QA.

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

Với task có ghi code/config/tài liệu:

- tạo task tracker với `--git-required`, repository, branch và write scope;
- developer bàn giao kết quả cho `qa-engineer`, sau đó
  `repository-integrator`; không agent nào tự kiểm tra và tự closeout thay đổi
  của chính mình;
- chỉ task gán chính xác cho `repository-integrator` mới có quyền stage, commit,
  push feature branch và gọi `closeout`;
- không báo `COMPLETED` khi chưa có commit/push evidence;
- nếu thiếu role bắt buộc, giữ task `BLOCKED`; không bắt đầu write task chồng
  scope trong cùng repository.

`repository-integrator` không được sửa source, bypass hook, merge, rebase,
force-push hoặc dùng `git add .`. Merge luôn cần lệnh riêng của người dùng.

## Đồng bộ sau khi rewrite Git history

Nếu Git integrator thông báo repository đã rewrite history, Antigravity 2 phải
dừng mọi write task trên clone/worktree cũ, đọc lại `AGENTS.md`, rồi đồng bộ từ
remote mới hoặc clone lại trước khi tạo `WORKSPACE ACK`. Không được khôi phục
hoặc push lại commit thuộc lịch sử cũ.
