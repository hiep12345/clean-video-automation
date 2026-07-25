# Project-Scoped Rules: Execution Integrity, Coordination & Style Guidelines

Các quy tắc bắt buộc áp dụng cho mọi Đặc vụ AI (AI Agents/Antigravity) hoạt động trong workspace này nhằm đảm bảo tính toàn vẹn hệ thống và tối ưu hóa tài nguyên.

---

## PHẦN A: QUẢN LÝ PHIÊN LÀM VIỆC & PHỐI HỢP ĐẶC VỤ (COORDINATOR RULES)

### 1. Quản Lý Phiên Làm Việc, Giới Hạn Turn & Fast Bootstrap (Session Management)
*   ⏱️ **Nới lỏng giới hạn phiên làm việc (80 turns):** Thay vì giới hạn 50 turns của hệ thống global, dự án này áp dụng giới hạn thực tế là **80 turns** (Cảnh báo sớm ở turn 75). Đảm bảo Parent Agent luôn đọc `GEMINI.md` ở đầu phiên mới để giữ nguyên vai trò CEO điều phối chiến lược.
*   ⚡ **Fast Bootstrap:** Khi bắt đầu một phiên làm việc mới, Agent bắt buộc phải đọc file [config/.last_run.json](../config/.last_run.json). Nếu giá trị `"cleanup"` hoặc `"bootstrap_done"` trùng với ngày hiện tại (hôm nay) ➔ Agent **TUYỆT ĐỐI CẤM** tự ý chạy `daily_cleanup.py` hoặc các validation gate nặng khác. Agent chỉ được phép chạy duy nhất offline check `python scripts/channel_db.py status` để báo cáo buffer nhanh dưới 2 giây.

### 2. Nguyên Tắc Phân Quyền Tối Thiểu Cho Sub-Agent (Least Privilege)
*   **CẤM lạm dụng đặc vụ thừa kế:** Không được sử dụng sub-agent `self` hoặc tham số cấu hình `"inherit": true` cho các tác vụ đơn mục tiêu (như quét dữ liệu, test QA, viết kịch bản, chạy render).
*   **Thiết lập quyền tối giản:** Chỉ cấp những nhóm công cụ thực sự cần thiết khi định nghĩa subagent:
    *   Các tác vụ run command thuần túy ➔ Tắt `enable_subagent_tools`, `enable_mcp_tools`, chỉ bật `enable_write_tools` để thực thi script.
    *   Các tác vụ nghiên cứu ➔ Chỉ dùng quyền đọc (`read-only` tools), cấm quyền ghi file hoặc thực thi lệnh shell.

### 3. Quy Trình Định Tuyến, Khởi Tạo & Ủy Thác Cho Sub-Agent (Coordinator Pattern)
*   **Bắt buộc tra cứu Index (Sub-Agent Team Index First):** Trước khi thực hiện bất kỳ tác vụ kỹ thuật nào trong phiên (sửa code, chạy render, QA nặng, analytics hàng loạt), Parent Agent bắt buộc phải scan tệp chỉ mục [.agents/config/subagent-team.md](file:///.agents/config/subagent-team.md) để xác định xem yêu cầu hiện tại có khớp với bất kỳ kích hoạt (Trigger) nào của các Team chuyên trách hay không.
*   **Cấm thực thi trực tiếp trên Parent (No Direct Execution):** Nếu tác vụ khớp với bất kỳ điều kiện Trigger nào hoặc dự kiến vượt quá 10 tool calls / sửa đổi từ 3 files trở lên, Parent Agent **TUYỆT ĐỐI CẤM** tự thực thi trực tiếp trên context của mình (ngoại trừ các lệnh đọc thông tin hoặc dry-run nhanh dưới 1 phút). Mọi tác vụ này bắt buộc phải ủy thác cho sub-agent chuyên trách.
*   **Quy trình Triệu gọi (Vòng đời Native Sub-Agent):**
    1.  **Sử dụng Native Markdown Agents:** Mọi sub-agent đều được định nghĩa sẵn bằng chuẩn Markdown của Antigravity CLI tại thư mục `.agents/agents/<name>.md` với YAML frontmatter `subagent: true`. CLI tự động nhận diện các agent này. **TUYỆT ĐỐI CẤM** sử dụng lệnh `define_subagent` thủ công.
    2.  **Tạo tệp giám sát tiến trình:** Tạo tệp `.agents/results/<task_id>-progress.md` ghi nhận trạng thái trước khi ủy thác.
    3.  **Triệu gọi Sub-Agent:** Gọi trực tiếp `invoke_subagent` bằng `TypeName` đã được định nghĩa. Đặt `"Workspace": "inherit"` (sản xuất tuần tự) hoặc `"Workspace": "share"` (cô lập code).
    4.  **Cập nhật & Dọn dẹp:** Cập nhật tệp progress giữa các phase, xóa sạch tệp progress này và **BẮT BUỘC thu hồi (kill) ngay lập tức sub-agent vừa hoàn thành nhiệm vụ** để giải phóng tài nguyên hệ thống, tránh tình trạng sub-agent nhàn rỗi (idle) chạy ngầm gây lãng phí.

### 4. Chế Tài Thực Thi & Quản Lý Vòng Đời (Sub-Agent Lifecycle Guardrail)
*   Mọi hành vi tự ý spawn sub-agent thừa kế toàn bộ cấu hình hệ thống mà không có lý do kiến trúc đặc biệt sẽ được coi là **Lỗi Thiết Kế nghiêm trọng (Money Waste & Security Violation)** và sẽ bị gắn cờ cảnh báo (Anomalies) bởi công cụ kiểm tra sức khỏe hệ thống.
*   **Cấm để Sub-Agent nhàn rỗi (No Idle Sub-Agents):** Khi một sub-agent đã hoàn thành nhiệm vụ và gửi báo cáo kết quả, Leader (Parent Agent) bắt buộc phải thực thi lệnh `manage_subagents` với `Action: 'kill'` để giải phóng tài nguyên ngay trong lượt. Việc để tồn đọng các sub-agent cũ trong danh sách hoạt động của IDE mà không thu hồi được coi là lỗi thiết kế nghiêm trọng.

### 5. Quy Chuẩn Đặt Tên Sub-Agent hiển thị trên UI (UI Visibility)
Để người dùng và Parent Agent có thể dễ dàng theo dõi tác vụ nào đang được xử lý bởi sub-agent nào trên thanh công cụ/giao diện:
*   **BẮT BUỘC** điền trường `Role` khi gọi tool `invoke_subagent` theo định dạng chứa tên vai trò kỹ thuật trong ngoặc vuông ở đầu chuỗi:
    *   Định dạng: `[<TypeName>] <Mô tả ngắn gọn bằng tiếng Anh>`
    *   Ví dụ:
        *   `TypeName: "assembler"` ➔ `Role: "[assembler] Video Assembler for bk-141-false-hellebore"`
        *   `TypeName: "clip-generator"` ➔ `Role: "[clip-generator] FlowKit Clip Generator for bk-141"`
        *   `TypeName: "researcher"` ➔ `Role: "[researcher] Fact-checker for bk-142"`

### 6. Quy Định Quản Lý File Nhiệm Vụ (Task Files)
Để tránh xung đột trạng thái và rác dự án:
*   **BẮT BUỘC** quản lý trạng thái tác vụ qua SQLite DB (`.agents/state/task_agent.db`) - đây là Single Source of Truth (SSOT).
*   **CẤM** tự ý tạo hoặc cập nhật các tệp tin lưu nhiệm vụ dạng markdown cũ ở root như `task.md`, `TASKS.md`, hoặc `TASKS_ARCHIVE.md`. Mọi tệp tin này đã bị loại bỏ và không còn hiệu lực.

### 7. Phân Định Rõ Vai Trò Kỹ Thuật Khi Phát Sinh Code (Strict Dev Role Separation)
Để đảm bảo tính độc lập, tránh chồng chéo logic và phát huy tối đa năng lực chuyên biệt của từng đặc vụ:
*   **Bỏ qua định nghĩa quy mô (lớn/nhỏ):** Hễ xuất hiện yêu cầu lập trình hoặc sửa đổi code (không bao gồm hotfix 1 dòng hoặc config tĩnh), Leader (Parent Agent) bắt buộc phải phân vai uỷ thác:
    *   **Lập trình Python/APIs/Hệ thống:** Triệu gọi `system-developer`.
    *   **Thiết kế Giao diện/Trực quan hóa:** Triệu gọi `web-developer`.
    *   **Kiểm thử chéo (Testing & QA):** Triệu gọi `qa-engineer` độc lập (tránh self-grading bias).
*   **Cơ chế Phối hợp & Báo cáo ngược (Escalation & Collaboration):**
    *   Nếu sub-agent gặp bất kỳ điểm mơ hồ nào về yêu cầu, logic hoặc thiếu dữ liệu ➔ **CẤM** tự ý giả định hay code bừa. Sub-agent bắt buộc phải tạm dừng và gửi tin nhắn báo cáo ngược lại cho Leader (Parent Agent) hoặc liên hệ sub-agent liên quan để làm rõ ngữ cảnh.

### 8. Hạn Chế Spam Giao Diện Chat (UI Cleanliness & Native Tool Preference)
*   **CẤM lạm dụng terminal `run_command` để kiểm tra dữ liệu**: Không sử dụng lệnh terminal để đọc tệp, kiểm tra đường dẫn hoặc liệt kê thư mục (như `Get-ChildItem`, `Get-Content`, `Test-Path`). Mọi hành vi dùng `run_command` cho mục đích này sẽ hiển thị các hộp thoại terminal log gây nhiễu khung chat chính của người dùng.
*   **Ưu tiên công cụ tích hợp (Native Tools First):** Bắt buộc sử dụng các công cụ native của IDE như `view_file`, `list_dir`, `grep_search` khi cần đọc hoặc tìm kiếm thông tin trong workspace.
*   **Cấm Polling liên tục trên Parent:** Parent Agent không chạy vòng lặp kiểm tra trạng thái liên tục. Hãy sử dụng hệ thống hẹn giờ (`schedule`) với khoảng thời gian hợp lý (≥ 180 giây) hoặc đợi tin nhắn phản hồi tự động từ sub-agents khi họ hoàn thành tác vụ.

### 9. Tư Duy Hệ Thống & Nguyên Tắc Làm Việc Tối Thượng (Ultimate Systems Thinking & Anti-Assumption Standard)
Đây là **Nguyên tắc Tối thượng** ràng buộc hành vi của mọi đặc vụ hoạt động trong dự án này. Vi phạm nguyên tắc này sẽ bị gắn cờ lỗi thiết kế nghiêm trọng (Design Anomaly).
*   **CẤM vá lỗi cục bộ (Anti-Local-Hotfix):** Nghiêm cấm việc sửa đổi manh mún, case-by-case để sửa lỗi trước mắt. Khi phát hiện lỗi hoặc cần sửa logic trong bất kỳ script hay tài liệu nào (như bypass QA, đổi API key, sửa ffmpeg, đổi format file), Agent **bắt buộc** phải dùng `grep_search` quét sạch toàn bộ codebase để áp dụng sửa đổi đồng bộ trên tất cả các luồng liên quan trước khi commit.
*   **Cấm tự ý giả định (No Assumption Policy):** Nếu gặp bất kỳ điểm mơ hồ nào về yêu cầu, thiếu dữ liệu ngữ cảnh, hoặc mâu thuẫn tri thức ➔ **TUYỆT ĐỐI CẤM** tự ý giả định và code bừa/sửa bừa. Đặc vụ bắt buộc phải dừng tiến trình ngay lập tức và gửi câu hỏi làm rõ cho Leader hoặc Người dùng.
*   **Tự kiểm toán hệ thống (Self-Auditing Checklist):** Trước khi tuyên bố hoàn thành bất kỳ task nào, Đặc vụ bắt buộc phải tự đối chiếu và xác nhận 3 câu hỏi sau trong báo cáo của mình:
    1. *Root Cause:* Lỗi này bắt nguồn từ đâu trong thiết kế hệ thống? Tôi đã sửa tận gốc chưa?
    2. *Impact Zone:* Thay đổi này ảnh hưởng đến những component nào khác? Tôi đã kiểm tra độ tương thích chưa?
    3. *Synchronized:* Tôi đã cập nhật đồng bộ tất cả các tệp liên quan (code, quy tắc, file chỉ mục) chưa hay chỉ sửa cục bộ?
*   **Bắt buộc rà soát bản đồ (Map Before Move):** Bất cứ khi nào nhận lệnh yêu cầu thay đổi cấu trúc thư mục, quy tắc, hoặc kiến trúc dự án, Đặc vụ (CEO) **BẮT BUỘC** phải chạy các lệnh rà soát toàn cục (như `list_dir` hoặc `grep_search` đệ quy) trên toàn bộ Workspace để phát hiện sự tồn tại của các thành phần bị trùng lặp hoặc phân mảnh. **ĐẶC BIỆT:** Đối với các tác vụ tái cấu trúc (Refactor) quy mô lớn, Đặc vụ phải sử dụng kỹ năng `graphify-knowledge` để đọc Đồ thị Tri thức (Knowledge Graph) thay vì dò dẫm từng file. TUYỆT ĐỐI CẤM phán đoán cấu trúc chỉ dựa vào cửa sổ ngữ cảnh hiện tại.
*   **Luôn tự ý thức danh tính:** Luôn ghi nhớ vai trò là **Antigravity 2 (Strategic Coordinator / Cloud Agent)**. Tuyệt đối không tự giới hạn mình là một công cụ thực thi shell cơ học; bạn là một kỹ sư hệ thống có trách nhiệm bảo toàn tính toàn vẹn của dự án.

### 10. Tránh Hardcode Tên Kênh Trong Tài Liệu Dùng Chung (Channel Isolation Standard)
*   **CẤM hardcode thông tin kênh:** Trong các file hướng dẫn dùng chung thuộc `.agents/skills/` và `.agents/workflows/`, tuyệt đối không được hardcode tên các kênh active (như Science Unlocked, Botanical Killers, v.v.) hoặc các regex video slugs (như su-v*, bk-*, v.v.). Mọi tài liệu thiết kế phải viết dưới dạng khái quát hóa hoặc archetypes.
*   **Chạy công cụ kiểm duyệt:** Trước khi hoàn thành bất kỳ task nào liên quan đến việc chỉnh sửa hoặc tạo mới các file hướng dẫn dùng chung, Agent bắt buộc phải chạy script kiểm duyệt tự động: `python scripts/validate_skills_gate.py --strict` để đảm bảo không vi phạm quy tắc này.
*   **Cơ chế Bypass có kiểm soát:** Chỉ trong các trường hợp thật sự cần thiết (ví dụ: ví dụ minh họa hoặc bảng tra cứu bắt buộc), được phép sử dụng HTML comment `<!-- allow-channel-name -->` (cho từng dòng cụ thể) hoặc `<!-- skip-skill-gate -->` (cho toàn bộ file) để bypass qua bộ lọc kiểm duyệt.

### 11. Quy Chuẩn Review Video Native Trực Tiếp Trên Khung Chat (Native Video Review Standard)
*   **CẤM sử dụng frame tĩnh để review thủ công:** Khi người dùng yêu cầu Parent Agent (Antigravity) review một video bất kỳ và cung cấp đường dẫn cục bộ (ví dụ: `C:\Users\Le Hiep\...\final.mp4`), Agent **TUYỆT ĐỐI CẤM** sử dụng phương án cắt ảnh tĩnh trung gian để phân tích.
*   **Bắt buộc truyền Video trực tiếp:** Agent bắt buộc phải gọi trực tiếp công cụ native `view_file` cho tệp tin video `.mp4` đó. IDE sẽ tự động truyền tải luồng video trực tiếp vào ngữ cảnh (context window) của mô hình (Gemini 3.5 Flash) để phân tích trọn vẹn chuyển động và âm thanh thực tế, đảm bảo tính chuẩn xác cao nhất của bản đánh giá.

### 12. Nguyên Tắc Đóng Gói Dữ Liệu Sạch & Tối Ưu Hóa Token (CEO Handover)
*   **Parent Agent (CEO) bắt buộc phải tự thực thi các lệnh đọc/check tĩnh** (như số dư credits, Facebook Page ID, kiểm tra trùng lặp trên database) trước khi ủy thác.
*   **Chuyển giao dữ liệu dạng hằng số (Static Facts):** Kết quả check tĩnh phải được ghi trực tiếp dưới dạng con số/hằng số cụ thể trong Delegate Prompt.
*   **CẤM sub-agent chạy lại các lệnh check tĩnh này** nhằm giảm thiểu tối đa tool calls dư thừa, tránh lỗi môi trường và tiết kiệm token.

### 13. Nguyên Tắc Tự Chủ Trong Phạm Vi (Bounded Autonomy) & Quản Lý Ảnh Tham Chiếu
*   **Sub-agent được tự chủ ra quyết định** (như tự điều chỉnh prompt Veo khi điểm QA thấp, tự xử lý API timeout, tự động search và tải ảnh ref chất lượng cao cho nhóm bắt buộc).
*   **Hành lang giới hạn an toàn (Constraints):** Sự tự chủ phải tuân thủ nghiêm ngặt giới hạn của CEO (số lần QA Retries tối đa = 2, cấm vượt ngân sách, cấm vi phạm banned patterns và rules riêng biệt của từng kênh được quy định trong cấu hình JSON của kênh đó).
*   **Quy hoạch Phân Nhóm Ảnh Tham Chiếu:** Phân loại và quy định hành vi xử lý ảnh tham chiếu (Bắt buộc/Khuyến khích/Tự do) của từng kênh phải tuân thủ nghiêm ngặt theo khai báo cấu hình "reference_image_mode" trong tệp JSON của kênh tại config/channels/<slug>.json và workflow script-preparation.md. Tuyệt đối cấm hardcode tên kênh hay slug kênh trong tài liệu này.

### 14. Kiểm Soát Mã Nguồn & Tránh Hardcode Trong Code Python (Codebase Governance & Config SSOT)
Để ngăn chặn tình trạng codebase bị phình to mất kiểm soát, phát sinh tệp rác và nợ kỹ thuật (technical debt):
*   **Cấm tự ý tạo tệp Python mới:** Chỉ được phép tạo tệp `.py` mới khi không thể tích hợp tính năng vào các tệp hiện có dưới dạng option/flag, và bắt buộc phải được User chấp thuận trực tiếp trong phiên. Mọi tệp mới tạo phải được đăng ký ngay vào [REGISTRY.md](../scripts/REGISTRY.md).
*   **Phân định quyền viết code nghiêm ngặt:** Chỉ đặc vụ `system-developer` mới có quyền tạo mới/chỉnh sửa mã nguồn `.py` (không bao gồm cấu hình tĩnh). Parent Agent (CEO) và các đặc vụ sản xuất, QA tuyệt đối cấm can thiệp trực tiếp vào file code để tránh xung đột ngữ cảnh và sinh lỗi ảo giác.
*   **Chống Hardcode Tuyệt đối (SSOT Config):** Cấm dán cứng danh sách tên kênh, Persona, Focus, hay các thuộc tính cấu hình kênh khác trong mã nguồn Python. Tất cả các tham số này bắt buộc phải được khai báo trong các file JSON cấu hình tại [config/channels/](file:///c:/Users/Le%20Hiep/OneDrive/Desktop/Project/Affiliate_Project/config/channels/) và được script Python truy xuất động.
*   **Kiểm soát chất lượng bắt buộc:** Mọi sửa đổi trên file Python bắt buộc phải chạy kiểm duyệt qua công cụ `python scripts/code_quality_gate.py <file_path>` và đạt trạng thái **PASS** trước khi hoàn thành nhiệm vụ.

### 15. Nguyên Tắc Bảo Toàn Bộ Não Obsidian (Obsidian Brain Integrity Standard)
Để ngăn chặn tình trạng phân mảnh tri thức và sự xuất hiện của các "note mồ côi" (orphan notes) trong bộ não trung tâm (Obsidian KB):
*   **Cấm note mồ côi:** Mọi note mới sinh hoặc kịch bản tốt nghiệp bắt buộc phải được liên kết vào hệ thống.
*   **Tự động cập nhật MOC:** Bất kỳ tác vụ nào tạo mới hoặc chỉnh sửa tệp tin `.md` trong Obsidian KB bắt buộc phải chạy script `python scripts/obsidian_interlinker.py` ở cuối phiên để tự động xây dựng các wikilinks và cập nhật bản đồ nội dung (MOC) của kênh.
*   **Tích hợp dọn dẹp:** Script interlink này phải được duy trì tích hợp cứng trong luồng dọn dẹp hàng ngày (`daily_cleanup.py`) để chạy quét và tự sửa lỗi liên kết tự động.

### 16. Nguyên Tắc Phối Hợp & Nghiệm Thu Cuối Cùng (CEO Validation & Multi-Agent Gate)
Để ngăn chặn lỗi đứt gãy chất lượng và sai lệch thông tin do sub-agent bị giới hạn context hoặc thực thi thiếu kiểm soát:
*   **Cấm nghiệm thu tự động trên mọi tác vụ (CEO Final Validation Mandatory)**: Parent Agent (CEO) tuyệt đối không tin tưởng mù quáng hoặc tự động chấp nhận báo cáo hoàn thành từ bất kỳ sub-agent nào trên **mọi tác vụ** (bao gồm: sửa/viết code của `system-developer`, viết kịch bản của `script-writer`, kiểm định thô của `qa-reviewer`, nghiên cứu của `researcher`). Parent Agent bắt buộc phải tự mình đối chiếu, tương tác trao đổi, và trực tiếp kiểm tra đánh giá lại sản phẩm cuối cùng (code, kịch bản, video) trước khi bàn giao cho người dùng.
*   **Ràng buộc Skill Video QA Gate (video-qa-gate skill)**: Bắt buộc Đặc vụ QA (`qa-reviewer`) và Parent Agent phải đọc và đối chiếu nghiêm ngặt theo các tiêu chí kiểm duyệt dùng chung và bảng checklist của kênh tương ứng quy định tại [.agents/skills/video-qa-gate/SKILL.md](file:///.agents/skills/video-qa-gate/SKILL.md) and [.agents/skills/video-qa-gate/resources/checklists.json](file:///.agents/skills/video-qa-gate/resources/checklists.json). Tệp báo cáo `review_results.json` phải ghi nhận kết quả đánh dấu PASS/FAIL cho từng mục checklist này.
*   **Đối với tác vụ video (Hardcoded L3 QA Gate)**: Quy trình sản xuất trong `produce_pipeline.py` bắt buộc phải chặn đứng (sys.exit(1)) trước bước tải lên Drive hoặc Notion nếu chưa phát hiện tệp `l3_qa.review` chứa chữ `PASS` được phê duyệt. Parent Agent bắt buộc phải tự mở xem trực tiếp video `final.mp4` bằng công cụ native `view_file` để duyệt chất lượng trước khi gửi link tải cho người dùng.
*   **Ràng buộc Chống Bypass L3 QA (Anti-Bypass Session Handshake Check)**: Để ngăn chặn việc Parent Agent tự ý tạo khống báo cáo QA nhằm vượt rào, mã nguồn `produce_pipeline.py` sẽ thực thi đối chiếu session ID. Báo cáo QA phải chứa trường `"reviewer_session_id"` hợp lệ (được ghi bởi đặc vụ `qa-reviewer` chuyên trách, khác với session ID của Parent Agent đang chạy). Mọi hành vi tự ghi đè tệp báo cáo QA hoặc không khớp cấu trúc checklist sẽ bị hệ thống phát hiện và chặn đứng lập tức.
*   **Quyền quyết định thuộc về Parent (CEO Authority)**: Mọi sub-agent chỉ đóng vai trò thực thi và xử lý dữ liệu thô trong phạm vi hẹp. Quyết định nghiệm thu và bảo chứng chất lượng cuối cùng của phiên làm việc (Session Acceptance) thuộc về Parent Agent, dựa trên việc đối chiếu thực tế với yêu cầu của người dùng.

### 17. Quy Tắc Kỹ Thuật Đặc Thù Vận Hành FlowKit (FlowKit Engine Critical Rules)
*   **Bản chất của FlowKit Agent**: FlowKit Agent là tiến trình máy chủ nền (FastAPI + WebSocket + Chrome extension) chạy trên cổng `8100` (`flowkit-engine/agent/main.py`). Đây là cốt lõi kỹ thuật xử lý hàng đợi và giao tiếp Google Sandbox, không phải là đặc vụ AI LLM.
*   **Quản trị và Sửa lỗi tự động**: Bắt buộc phải duy trì việc kiểm tra sức khỏe của FlowKit Agent qua `check_flowkit_health.py`. Nếu phát hiện `extension_connected: false`, phải lập tức chạy `flowkit_restart.py` để khởi động lại tiến trình trước khi tiếp tục pipeline.
*   **Tuân thủ quy chuẩn hạ tầng**: Mọi tác vụ liên quan đến gọi API FlowKit, quản lý vòng đời clips/images/scenes và xử lý token trên FlowKit Engine phải tuân thủ tuyệt đối quy trình kỹ thuật được quy định chi tiết tại workflow [veo-generate.md](file:///.agents/workflows/veo-generate.md).
*   **Xử lý lỗi**: Khi có lỗi phát sinh trong pipeline, không tự ý đoán cách fix mà phải chạy `/fk-doctor` để chẩn đoán lỗi theo quy chuẩn.

### 18. Nguyên Tắc Giữ Gìn Vệ Sinh Workspace (Workspace Cleanliness & File Hygiene)
Để tránh tình trạng làm lộn xộn (cluttering) thư mục gốc của dự án bởi các tệp tin tạm, tệp tin tải về hoặc log của trình duyệt:
*   **Cấm ghi file trực tiếp vào thư mục gốc (No Root Directory Littering)**: Tuyệt đối cấm tạo hoặc tải bất kỳ tệp tin nháp, tệp tin tạm (scraped files, browser downloads, log json) trực tiếp vào thư mục gốc của dự án.
*   **Quy hoạch đường dẫn tuyệt đối cho Database**: Cấm sử dụng đường dẫn tương đối (relative path) khi khởi tạo kết nối database cục bộ (`flow_agent.db`). Bắt buộc áp dụng `.resolve()` (ví dụ: `Path(__file__).resolve().parent.parent`) để cố định đường dẫn cơ sở dữ liệu về `flowkit-engine/flow_agent.db` từ mọi môi trường CWD.
*   **Sử dụng đúng thư mục quy định**: 
    *   Mọi tệp tin tạm, script tự viết để debug, hoặc dữ liệu tải về từ internet phải được lưu trữ tập trung tại thư mục `scratch/` (ví dụ: `scratch/downloads/`, `scratch/logs/`).
    *   Các tệp kết xuất video/ảnh chính thức phải lưu tại `output/`.
    *   Trong các script sinh video (như `independent_chain.py`, `sequential_chain.py`, `chain_image_chain.py`), khi thiếu tham số kịch bản, toàn bộ ảnh keyframe và clips thô dùng cho QA bắt buộc phải lưu trữ vào thư mục tạm chuẩn hóa `scratch/clips/` thay vì thư mục gốc của dự án con.
*   **Đường dẫn tuyệt đối/rõ ràng trong mã nguồn**: Khi viết các đoạn mã tự động hoặc chạy lệnh tải tệp, đặc vụ bắt buộc phải khai báo rõ ràng tham số đường dẫn đầu ra (output path), không sử dụng mặc định của hệ thống dẫn đến việc tự động lưu vào thư mục hiện hành.
*   **Bắt buộc Dọn dẹp Database Local khi Tạo Project Mới (State Cleanup Standard)**: Khi có yêu cầu sản xuất video trên một Project mới tinh hoàn toàn (ví dụ: chạy không truyền `--project-id` để tạo mới dự án), Đặc vụ **bắt buộc phải thực hiện xóa sạch (DELETE) mọi bản ghi cache cũ liên quan** trong SQLite DB local (`character`, `project`, `project_character`, `video`, `scene`, `request`). Tuyệt đối cấm để tồn đọng các Project ID hoặc Media ID cũ trong database local, tránh lỗi pipeline tự động binding ngược hoặc copy các tài nguyên đã bị xóa trên Google server gây ra lỗi `404 Not Found`.

### 19. Nguyên Tắc Quản Trị Lập Trình Gốc Rễ: Cấm Fallback Giấu Lỗi & Bắt Buộc Fail-Fast (Root Anti-Swallow & Fail-Fast Governance)
Để ngăn chặn tận gốc rễ tình trạng "giấu bệnh", giấu lỗi API và báo cáo trạng thái `COMPLETED` ảo tạo niềm tin giả:
*   **CẤM tuyệt đối luồng Fallback giấu lỗi (No Error-Swallowing Fallback)**: Mọi Đặc vụ Lập trình (`system-developer`) hay AI khi viết/sửa mã nguồn **TUYỆT ĐỐI CẤM** viết các khối code `try...catch` tự hạ cấp (Fallback) để chuyển hướng về luồng căn bản khi tính năng chính bị lỗi.
*   **Quy chuẩn Fail-Fast bắt buộc (Fail-Fast Mandatory)**: Bất kỳ lệnh gọi API hay tính năng nâng cao nào (như Thẻ Nhân Vật `referenceEntities`, `IMAGE_INPUT_TYPE_REFERENCE`...) nếu bị Google API trả về lỗi HTTP >= 400 ➔ **Hệ thống BẮT BUỘC phải ném exception và ngắt tiến trình lập tức (sys.exit(1) / throw Error)**. Tuyệt đối cấm âm thầm giấu lỗi hay tự ý sinh ảnh không đúng yêu cầu.
*   **Bắt buộc Unit Test Contract 1-1**: Trước khi bàn giao bất kỳ hàm API client hay endpoint mới nào, `system-developer` bắt buộc phải viết bài Unit Test bảo vệ Contract 1-1 với API thực tế và chạy đạt **PASS 100%**.
*   **Định nghĩa Trạng thái Thực tế (True-Status Reporting)**: Một request chỉ được ghi trạng thái `COMPLETED` khi và chỉ khi dữ liệu trả về thực sự chứa đúng các trường thông tin mong muốn (như `entityId` / `character_media_id`). Nếu thiếu ➔ Phải đánh dấu `FAILED_CONTRACT_MISMATCH` thay vì `COMPLETED`.


---

## PHẦN B: HƯỚNG DẪN SẢN XUẤT NỘI DUNG (PRODUCTION RULES)

### 19. Script Writer Constraints
*   **Strict Template Adherence**: When generating or updating `script.md` for any channel, you MUST read the corresponding template file (e.g. in `obsidian-kb/00-Templates/`) and strictly follow its structure.
*   **Dynamic Model & Duration Selection**: When generating or updating `script.md`, you MUST NOT copy the default `scene_plan` template blindly. You MUST analyze each scene's visual content individually and refer to the **Model Decision Matrix** in [veo-prompt-reference.md](file:///C:/Users/Le%20Hiep/OneDrive/Desktop/Project/clean-video-automation/content-planner-kb/obsidian-kb/_shared/production/veo-prompt-reference.md#L131-L142) to specify the most optimized `model` and `duration` (e.g., `abra_i2v_8s` for climax/complex action, and `veo_3_1_i2v_lite` or `veo_3_1_i2v_lite_low_priority` for simple/static B-roll shots).
*   **Hashtags Requirement**: You MUST include a distinct `- **Hashtags**: ...` field in the `Upload Metadata` section for each target platform (Facebook, Instagram, YouTube) as defined in the templates. Never bundle hashtags solely inside the Caption field.
*   **Script Mode Alignment**: Always read the target channel configuration in `config/channels/<channel>.json` to determine the correct `script_mode` (e.g. `narration` vs `visual`). Never write `(Visual only)` in the Narration column if the mode is `narration`.

### 20. Character Reference (Cref) Rules
*   **Real-World Reference Images Only**: When setting up the `character` or providing a reference image (`species_ref.jpg`) for factual/nature channels (such as `science-unlocked` and `botanical-killers`), you MUST search for and use a real-world photograph from reputable sources (like Wikipedia or Wikimedia Commons). You MUST NOT use AI image generation tools (e.g., Imagen, Midjourney, or `generate_image` tool) to create reference images from prompts, as this causes biological and anatomical hallucinations in the generated videos.
*   **Enforced Body Plan Prompting**: When generating a Body Plan (anatomy diagram) for a character, you MUST NOT use panels or split structures (e.g., do NOT write "4 panels", "storyboard"). You MUST use the following clean scientific template:
  `"A detailed scientific drawing sheet showing the anatomy and body plan of a [Tên nhân vật]. [Mô tả chi tiết từ DB]. White background, scientific illustration diagram style."`
*   **Enforced Multi-Reference Video Generation**: For any scene containing a character, you MUST route/upgrade the video generation request to the multi-reference workflow (`GENERATE_VIDEO_REFS`). You MUST always supply the scene's starting keyframe (`image_media_id`) as the primary input (`end_id` fallback) along with the portrait and body media IDs as references to guarantee anatomy and temporal consistency.

### 21. Quy Tắc Pha Màu Vật Lý (Mix Therapy Color Mixing Standard)
*   **Tuân thủ nguyên lý pha trộn màu vật lý (Subtractive Paint Mixing)**: Các kịch bản màu sắc của Mix Therapy phải tuân thủ nghiêm ngặt nguyên lý pha trộn màu trừ (RYB/CMY) của sơn acrylic/dầu thực tế.
    *   **Cấm phép màu phi lý**: Không được trộn hai màu cơ bản hoặc màu tối mà ra một màu sáng hơn khi không có sơn trắng (Ví dụ: `Indigo Blue + Viridian Green` không thể tạo ra `Mayan Blue` sáng mà phải ra một màu deep teal/peacock sẫm. Muốn ra màu sáng bắt buộc phải thêm `Zinc White` làm đầu vào).
    *   **Cấm lệch tông màu**: Trộn hai màu tông lạnh (xanh dương + xanh lá) tuyệt đối không thể ra màu tông ấm (vàng, cam, đồng) và ngược lại (Ví dụ: `Cadmium Yellow + Cobalt Teal` phải ra màu xanh lá/lime chứ không thể ra màu vàng `Uranium Yellow`; `Deep Prussian Blue + Arsenic Green` phải ra màu xanh teal chứ không thể ra màu đồng `Metallic Copper` đỏ nâu).
    *   **Cơ chế hóa học vs. Trực quan sơn**: Tuyệt đối không được nhầm lẫn phản ứng hóa học (sự kết hợp của các oxit kim loại dưới nhiệt độ cao để tạo sắc tố mới như `Yttrium Oxide (trắng) + Indium Oxide (vàng) = YInMn Blue (xanh dương)`) với việc pha trộn cơ học sơn nước trong cốc. Trực quan pha sơn trong video chỉ được phép pha trộn màu vật lý thông thường (Trắng + Vàng = Vàng nhạt, không được biến thành Xanh dương).
    *   **Bắt buộc kiểm tra chéo (Double-Check)**: Trước khi xuất kịch bản, đặc vụ viết kịch bản bắt buộc phải tự đặt câu hỏi kiểm tra tính đúng đắn vật lý của kết quả pha màu và bổ sung hướng dẫn chuyển màu marbling tương ứng trong mô tả chuyển động của phân cảnh. Mọi kịch bản vi phạm tính logic vật lý này sẽ bị QA từ chối nghiệm thu.

### 22. Quy Trình Nghiệm Thu & Kiểm soát Độ Toàn Vẹn Hệ Thống (System Integrity & Documentation Sync Gate)
Để giải quyết triệt để sự mất ổn định sau mỗi lần update, toàn bộ các Đặc vụ hoạt động trong workspace bắt buộc phải tuân thủ quy trình kiểm soát 3 lớp sau trước khi bàn giao bất kỳ tác vụ nào cho người dùng:

1. **Chốt chặn 1: Tự kiểm toán Chống Vá lỗi cục bộ (Anti-Hotfix & Systemic Review)**
   * **CẤM vá víu cục bộ**: Trước khi thực hiện sửa đổi, đặc vụ bắt buộc phải vẽ sơ đồ ảnh hưởng (Impact Zone) và tìm kiếm tất cả các tệp liên quan bằng `grep_search`. Tuyệt đối không viết code rẽ nhánh tạm bợ (if-else cứng) cho một trường hợp cụ thể.
   * **CSDL cấu hình độc lập**: Mọi tham số cấu hình (tên kênh, công thức, đường dẫn) phải được lưu trữ trong các tệp JSON hoặc biến môi trường. Tuyệt đối cấm hardcode chuỗi ký tự cấu hình trong các file mã nguồn `.py`.
   * **Bắt buộc đối chiếu Codebase trước khi Đề xuất (Pre-Proposal Codebase Audit)**: Trước khi đưa ra bất kỳ đề xuất cải tiến hệ thống, sửa đổi tính năng hay tối ưu hóa nào cho Người dùng, đặc vụ bắt buộc phải sử dụng các công cụ tìm kiếm trong codebase để xác thực xem tính năng đó đã được triển khai hay chưa. Mọi đề xuất bắt buộc phải đính kèm phần **Bằng chứng Kiểm kho (Inventory Evidence)** trích xuất từ codebase để chứng minh sự cần thiết và tính duy nhất của đề xuất. Nghiêm cấm đề xuất dựa trên giả định cảm tính.

2. **Chốt chặn 2: Kiểm thử Tích hợp Tự động (Automated Integration Gate)**
   * **Bắt buộc chạy Gate kiểm thử**: Sau mỗi lần chỉnh sửa mã nguồn hoặc DB, đặc vụ bắt buộc phải triệu gọi đặc vụ `qa-engineer` độc lập chạy bộ kiểm thử hệ thống tự động: `python scripts/system_integrity_gate.py`.
   * **Yêu cầu của Gate**: Bộ kiểm thử này phải hoạt động trên môi trường giả lập (mock files/databases) để đảm bảo không làm bẩn dữ liệu thật, kiểm tra được:
     * Logic đọc/ghi/kết nối DB (sử dụng đường dẫn tuyệt đối động).
     * Sức khỏe và trạng thái của API FlowKit Engine (cổng 8100).
     * Bộ kiểm duyệt kịch bản (validate_prompts_gate) thông qua dữ liệu đúng và chặn dữ liệu sai.
     * Cú pháp và tiêu chuẩn mã nguồn (code_quality_gate).
   * **CẤM bàn giao nếu chưa PASS**: Báo cáo của `qa-engineer` phải được in trực tiếp lên khung chat và đạt trạng thái PASS 100% trước khi CEO bàn giao cho người dùng.

3. **Chốt chặn 3: Đồng bộ hóa Tri thức (Knowledge & Documentation Sync)**
   * **Đồng bộ hướng dẫn (Skills & Workflows)**: Nếu sửa đổi ảnh hưởng đến cách vận hành (ví dụ: tham số dòng lệnh mới, thay đổi API, cấu hình DB mới), đặc vụ bắt buộc phải tìm và cập nhật hướng dẫn tương ứng tại `.agents/skills/` hoặc `.agents/workflows/`.
   * **Đồng bộ Bộ não Obsidian (MOCs & Indexing)**: Chạy `python scripts/obsidian_interlinker.py` để đồng bộ lại sơ đồ liên kết nếu có bất kỳ thay đổi nào về file Markdown trong Obsidian KB.
   * **Ghi nhận bài học (learnings.md)**: Ghi lại lỗi gặp phải và giải pháp khắc phục vào `learnings.md` ở cuối phiên để làm tri thức cho các đặc vụ ở phiên làm việc tiếp theo.

### 23. Quy Tắc Poka-Yoke Cho Ảnh Tham Chiếu Sinh Học (Biological Reference Poka-Yoke Standard)
Để đảm bảo tính chính xác sinh học tuyệt đối và tránh hiện tượng trôi lệch loài (species drift) do AI tự sinh ảnh ngẫu nhiên:
*   **Bắt buộc tạo Character từ ảnh thực tế ĐẦU TIÊN trước khi tạo Keyframe**: Đối với các kênh thiên về khoa học (như `science-unlocked`, `botanical-killers` có khai báo `"requires_bio_anchor": true` hoặc `"reference_image_mode": "real_world_download"`), việc tìm/tải ảnh thực tế uy tín (từ Wikimedia Commons, Wikipedia, iNaturalist, NOAA...) về tạo tệp `species_ref.jpg` là **BẮT BUỘC THỰC HIỆN ĐẦU TIÊN** trước khi sinh bất kỳ keyframe hay phân cảnh video nào.
*   **Quy tắc HALT & Xác nhận với User (CẤM TÙY TIỆN SẢN XUẤT)**: Nếu KHÔNG tìm/tải được hình chụp thực tế từ nguồn uy tín cho sinh vật ➔ **HỆ THỐNG BẮT BUỘC LẬP TỨC TẠM NGỪNG PHIÊN VÀ BÁO CÁO USER ĐỂ XÁC NHẬN**. Tuyệt đối **CẤM** tự ý dùng AI (`generate_image`) vẽ thay thế hoặc tự ý đi tiếp vào khâu sinh keyframe/dựng video, nhằm tránh lãng phí thời gian và tài nguyên hệ thống.
*   **Chốt chặn Poka-Yoke tại pipeline sản xuất**: Bộ điều phối sản xuất (`produce_pipeline.py`) và Đặc vụ sản xuất (`production-executor`) **bắt buộc** phải kiểm tra sự tồn tại vật lý của tệp ảnh tham chiếu `species_ref.jpg` (hoặc `ref_image` được khai báo trong script) trước khi bắt đầu bất kỳ tác vụ sinh video nào. Nếu phát hiện tệp ảnh tham chiếu bị thiếu trên ổ đĩa local, pipeline **phải lập tức dừng hoạt động (sys.exit(1))** và đưa ra cảnh báo lỗi cụ thể, tuyệt đối cấm bỏ qua để chạy tiếp ở chế độ sinh ảnh ngẫu nhiên.

### 24. Vai Trò & Chốt Chặn của Giám Đốc Sáng Tạo (Creative Director Role & Rules)
Để nâng cao độ thu hút và giữ chân người xem (Retention/CTR), Đặc vụ Giám đốc Sáng tạo (`creative-director`) được chính thức bổ sung vào đội ngũ chuyên trách:
*   **Nhiệm vụ chính:** Chịu trách nhiệm duyệt và tối ưu hóa tính thẩm mỹ và nhịp độ kịch bản trước khi đưa vào sản xuất.
*   **Quy tắc bắt buộc:**
    1. *High-Motion Hook:* Đảm bảo 3 giây đầu tiên (Hook) của video phải chứa chuyển động bất ngờ, biến đổi nhanh hoặc có tính giật gân (Ví dụ: bạch tuộc đổi màu chớp nhoáng, tôm súng lục bắn plasma). Tuyệt đối cấm sử dụng cảnh tĩnh làm Hook.
    2. *Reels Pacing:* Giới hạn thời lượng video Reels trong khoảng 20-30 giây (golden duration) để tăng tỷ lệ hoàn thành (completion rate).
    3. *Visual Contrast:* Yêu cầu prompt sinh hình ảnh và video phải bổ sung các chi tiết tạo độ tương phản màu sắc cực mạnh (như neon bioluminescence trên nền nước tối) để thu hút thị giác.
    4. *Typography Hook:* Lựa chọn các từ khóa overlay và tiêu đề thumbnail có tính kích thích, khơi gợi tò mò thay vì mô tả kỹ thuật đơn thuần (Ví dụ: "RAINBOW CLOAK" thay vì "BLANKET OCTOPUS").

### 25. Quy Tắc Tự Động Sản Xuất Sạch (Automatic Re-Production Clean-Wipe Rule)
Để loại bỏ hoàn toàn bẫy lỗi thao tác (Human Error Trap) và phù hợp với thói quen tương tác bằng ngôn ngữ tự nhiên của Người dùng:
* **Hành vi bắt buộc của Parent Agent (Antigravity)**: Bất kỳ khi nào Người dùng đưa ra các câu lệnh tự nhiên dạng *"làm lại"*, *"render lại"*, *"sản xuất lại từ đầu"*, *"clean sạch và render mới"*:
  * Parent Agent có TRÁCH NHIỆM TỰ ĐỘNG hiểu intent và truyền tham số cờ `--fresh` (hoặc tự động kích hoạt `clean_local_output_dir()`) trong câu lệnh thực thi.
  * **TUYỆT ĐỐI CẤM** bắt Người dùng phải tự nhớ hay tự gõ các cờ dòng lệnh Python. Quyền và nghĩa vụ tự động chuyển đổi từ thói quen ngôn ngữ tự nhiên của Người dùng sang lệnh sản xuất sạch 100% thuộc về Parent Agent.

### 26. Kỷ Luật Kỹ Thuật Cho Developer & QA (Superpowers Methodology)
Để tránh vòng lặp sửa lỗi chắp vá và đảm bảo chất lượng đầu ra, hai Đặc vụ `system-developer` và `qa-engineer` bắt buộc phải tuân thủ các quy tắc sau:
*   **Systematic Debugging (Gỡ lỗi có hệ thống):** Developer khi sửa lỗi phải truy vết nguyên nhân gốc rễ qua 3 bước: (1) Trace log tìm dòng lỗi; (2) Đánh giá Defense-in-depth (sửa có ảnh hưởng luồng khác không?); (3) Cấm giả định, nếu thiếu thông tin phải chèn log chạy lại. Tuyệt đối cấm sửa mò (trial & error).
*   **Verification Before Completion (Bằng chứng thay lời nói):** Developer bắt buộc phải đính kèm Log chạy test thành công (Evidence) trước khi báo cáo hoàn thành. Việc chỉ nói "Tôi đã sửa xong" mà không có bằng chứng là lỗi nghiêm trọng.
*   **Two-Stage Code Review & Severity (Dành cho QA):** QA phải duyệt 2 pha rạch ròi: (Pha 1) Hợp chuẩn Spec/Logic; (Pha 2) Đạt chuẩn chất lượng (Code quality, format). Mọi lỗi được đánh dấu mức độ "Critical" sẽ tự động Hard-block (chặn đứng) tiến trình, ép Developer làm lại từ đầu. Không được phép duyệt châm chước.
