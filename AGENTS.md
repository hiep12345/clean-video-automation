# Quy Ước Làm Việc Chung Cho AI Agents

File này là điểm vào chung cho mọi AI agent làm việc trong
`clean-video-automation`, bao gồm Codex và Antigravity 2.

## 1. Phạm vi và thứ tự ưu tiên

- Chỉ dẫn trực tiếp của người dùng và chỉ dẫn hệ thống luôn có mức ưu tiên cao
  nhất.
- File này là nguồn chuẩn cho việc phối hợp agent, quyền sở hữu thay đổi và Git.
- `.agents/AGENTS.md` bổ sung quy trình vận hành riêng của Antigravity.
- `AGENTS.md` bên trong repo con chỉ bổ sung quy tắc cục bộ cho repo đó.
- Khi hai quy tắc mâu thuẫn, agent phải dừng phần bị ảnh hưởng và báo rõ mâu
  thuẫn; không tự chọn cách có rủi ro cao hơn.

## 2. Xác nhận trước khi bắt đầu

Trước lần ghi file hoặc thay đổi Git đầu tiên, agent phải:

1. Xác định task đang làm và agent chịu trách nhiệm chính.
2. Xác định đúng repository: repo gốc, `content-planner-kb`, hay
   `flowkit-engine`.
3. Kiểm tra branch, `git status --short` và các thay đổi có sẵn.
4. Công bố phạm vi file/thư mục dự kiến chỉnh sửa nếu có agent khác đang hoạt
   động trong cùng workspace.

Mẫu xác nhận khi có nhiều agent:

```text
WORKSPACE ACK
Agent: <Codex | Antigravity 2 | tên khác>
Task: <mô tả ngắn>
Repository: <root | content-planner-kb | flowkit-engine>
Branch: <tên branch>
Write scope: <file/thư mục được phép sửa>
Existing dirty files: <đã quan sát, không nhận quyền sở hữu>
Git integrator: <agent được phép stage/commit/push>
```

Không được bắt đầu ghi file nếu `Write scope` đang trùng với phạm vi của agent
khác mà chưa có bàn giao rõ ràng.

## 3. Quyền sở hữu và phối hợp

- Một task chỉ có một agent chịu trách nhiệm chính tại một thời điểm.
- Một file chỉ có một agent được quyền ghi tại một thời điểm.
- Thay đổi có sẵn nhưng không thuộc task hiện tại là tài sản của người dùng hoặc
  agent khác: không sửa, format, stage, xóa hay hoàn nguyên.
- Nếu phát hiện cùng sửa một file, dừng ghi file đó và phối hợp bàn giao trước.
- Khi task tracker hoạt động, dùng `.agents/state/task_agent.db` làm nguồn trạng
  thái; không tạo `task.md`, `TASKS.md` hoặc file task tạm ở root.
- Trong shared workspace, chỉ `Git integrator` được chạy lệnh làm thay đổi trạng
  thái Git. Agent khác không được switch branch, stage, commit, rebase hay push.
- Nếu cần hai agent viết song song trong cùng repo, phải dùng worktree tách biệt
  đã được thống nhất trước; không tự tạo worktree trong lúc agent khác đang làm.

## 4. Quy trình Git

- Tên branch phải trung lập với người/agent và theo mẫu
  `<type>/<scope>-<description>`.
- `type` được dùng: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`,
  `hotfix`.
- Dùng chữ thường và kebab-case, ví dụ `feat/dashboard-export`,
  `fix/flowkit-timeout`, `chore/repository-governance`.
- Ghi chủ sở hữu trong `WORKSPACE ACK` hoặc task tracker; không đưa tên người,
  Codex hay Antigravity vào tên branch.
- Không commit trực tiếp lên `main` hoặc `dev`.
- Chỉ stage đường dẫn cụ thể bằng `git add -- <path>`.
- Không dùng `git add .` hoặc `git add -A` trong workspace có nhiều agent.
- Mỗi commit chỉ chứa thay đổi thuộc đúng task và đúng repository.
- Không dùng `git reset --hard`, `git clean -fd`, hoàn nguyên file, sửa lịch sử,
  rebase hoặc force-push nếu chưa có yêu cầu rõ ràng của người dùng.
- Không amend commit của agent khác.
- Chỉ push hoặc tạo pull request khi phạm vi task bao gồm việc bàn giao lên
  remote hoặc người dùng đã yêu cầu.

### Submodule

- `content-planner-kb` và `flowkit-engine` là hai repository độc lập.
- Với thay đổi repo con: kiểm tra, commit và push trong repo con trước; sau đó
  mới cập nhật gitlink trong repo gốc bằng một commit riêng, dễ nhận biết.
- Không stage gitlink chỉ vì repo con đang có working tree bẩn.
- `flowkit-engine`: `origin` là fork làm việc; coi `upstream` là chỉ đọc trừ khi
  người dùng chỉ định khác.
- `content-planner-kb`: không track credentials, token, certificate/private key,
  database/runtime state hay `resources/bgm/`.

## 5. An toàn dữ liệu và hành động bên ngoài

- Không ghi secret vào code, tài liệu, log, commit hoặc nội dung chat.
- Nếu phát hiện secret đã được track, dừng push và báo người dùng mà không in giá
  trị secret.
- Không upload nội dung, gửi email, xuất bản lên mạng xã hội, bật billing hoặc
  thực hiện hành động bên ngoài không thể hoàn tác khi chưa có lệnh trực tiếp.

## 6. Kiểm tra và bàn giao

Trước khi báo hoàn thành:

1. Chạy test/lint/check phù hợp với phạm vi thay đổi.
2. Kiểm tra lại `git status --short` của từng repository đã tác động.
3. Xác nhận không vô tình stage hoặc commit thay đổi có sẵn.
4. Báo rõ repository, branch, commit, file đã sửa, kiểm tra đã chạy, lỗi còn lại
   và các dirty file được giữ nguyên.

Không tuyên bố hoàn thành nếu test bắt buộc chưa chạy hoặc kết quả Git chưa được
kiểm tra.
