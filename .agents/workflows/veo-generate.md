---
name: veo-generate
description: "End-to-end AI video production via FlowKit: Script → Prompts → FlowKit API → 3-Phase QA → Assembly → final.mp4"
trigger: "/veo-generate"
skills:
  - flowkit
subagent_config: .agents/config/subagent-team.md
---

# /veo-generate — AI Video Production Pipeline (FlowKit-native)

## Mục đích
Tạo video hoàn chỉnh với AI-generated footage qua FlowKit REST API.
Script → Veo prompts → FlowKit generate → 3-Phase QA → Assembly → final.mp4.

> **⚠️ KHÔNG dùng browser automation. Toàn bộ pipeline chạy qua FlowKit API (`http://127.0.0.1:8100`).**

## Sub-Agent Execution (MANDATORY cho action=full-produce)
> Đọc `.agents/config/subagent-team.md` — define team + execution flow đầy đủ ở đó.
> Fallback (serial mode): nếu invoke_subagent unavailable → chạy pipeline serial như cũ.

## Yêu cầu đầu vào
- `script`: Nội dung narration (tiếng Anh)
- `subject`: Tiêu đề video
- `style`: Photorealistic (default) hoặc Cinematic
- `aspect`: VERTICAL (9:16, default) hoặc HORIZONTAL (16:9)

## Bước 0: Pre-production Gate (BLOCKING — TRƯỚC MỌI THỨ)

### 0a. Channel Validate (prerequisite cho mọi bước sau)
```
→ Canonical rule: Obsidian KB/_shared/production/guardrails-content-policy.md § Universal QA Framework

Xác nhận channel đang produce có trong Channel Matrix:
  □ Kênh có trong Channel Matrix? → biết L1/L2/L3 nào áp dụng
  □ Chưa có → DỪNG. Đăng ký kênh vào Channel Matrix trước khi produce bất kỳ video nào.

PASS → biết đúng channel → tiếp 0b
```

### 0b. Topic/Content Dedup (dùng channel đã validate ở 0a)
```
→ Canonical rule: Obsidian KB/_shared/production/guardrails-content-policy.md § Topic/Content Dedup Gate

Dùng channel đã xác định → tìm file cấu hình tại `config/channels/<channel-slug>.json`. Đọc thuộc tính `ssot_path` để xác định file catalog của kênh và đường dẫn thư mục output tương ứng:

| Config Field | Description | Dynamic Source / Output |
|---|---|---|
| `ssot_path` | Đường dẫn tệp catalog để check trùng | `Obsidian KB/<ssot_path>` |
| Output Folder | Thư mục lưu trữ video thành phẩm | `output/fb-reels/<channel_slug>/` |

Checklist (cả 5 phải PASS):
  □ 1. SSOT: Organism/subject KHÔNG trùng bất kỳ entry nào trong SSOT (bảng channel ở trên)
  □ 2. TERRITORY: KHÔNG trùng territory kênh khác → Obsidian KB/_shared/production/guardrails-content-policy.md § Cross-Channel Domain Boundary
  □ 3. MECHANISM: Cơ chế/hook chính PHẢI khác — cùng mechanism = FAIL dù loài khác
       Check: grep SSOT cho mechanism keyword (mimic/zombie/explode/poison/parasite/...)
       Nghi ngờ → confirm với user TRƯỚC khi tiếp tục
  □ 4. AUTO-GREP — KHÔNG skip dù 3 item trên đã PASS:
       python scripts/topic_dedup.py --channel <channel> --organism "<organism>"
       → exit 0 = PASS | exit 1 = DỪNG, báo user
  □ 5. RISK NOTE: Nếu partial match (loài khác, mechanism tương tự) →
       ghi vào script.md: "⚠️ Risk: similar mechanism to [video X]" trước khi generate

PASS (cả 5) → tiếp Pre-flight kỹ thuật bên dưới
FAIL (bất kỳ 1) → DỪNG HOÀN TOÀN. Báo user:
  "⛔ DEDUP FAIL: Topic '[X]' đã có trong [source]. Chọn topic khác hoặc confirm override."
  KHÔNG tự override. Chờ user quyết định.
```

---

## Pre-flight Check (kỹ thuật)
```bash
# 1. Channel Lock claim
# 2. BANNED Patterns check (Obsidian KB/_shared/production/guardrails-content-policy.md § BANNED Patterns)
# 3. Model key đúng tier (.agents/skills/flowkit/SKILL.md)
# 4. FlowKit health check (MANDATORY):
python scripts/check_flowkit_health.py
# Exit 0 = OK (extension connected + has_token + not expired) → tiếp tục
# Exit 1 = OFFLINE/extension disconnected → chạy: python scripts/flowkit_token_refresh.py
#           Nếu token_refresh cũng fail → escalate CC, DỪNG
# 5. Nếu 403 xảy ra TRONG KHI generate:
#    → FlowKit tự gọi flowkit_token_refresh.py (tự động)
#    → Đọc .agents/skills/flowkit-recovery/SKILL.md để recover thủ công nếu cần
```

---

## Quy trình

### Bước 1: Chuẩn Bị & Kiểm Duyệt Kịch Bản (Phase 1: Script Preparation - MANDATORY)
*   **Hành động**: CEO triệu gọi Đặc vụ viết kịch bản (`script-writer`) để chạy workflow `/script-preparation`.
*   **Nhiệm vụ**: Đặc vụ viết kịch bản nạp skill [.agents/skills/script-writer/SKILL.md](../skills/script-writer/SKILL.md) và `skills/prompt-engineering/SKILL.md` để:
    1. Chạy `topic_dedup.py` kiểm tra trùng lặp chủ đề.
    2. Nạp cấu hình kênh tương ứng tại `config/channels/<channel_slug>.json`.
    3. Lập Scene Plan, viết Lời thoại (Narration), chèn Bio-anchors, và viết các Veo Prompts chi tiết.
    4. Triệu gọi Kỹ sư kiểm thử (`qa-engineer`) chạy L1 QA để chấm điểm và xuất tệp chứng chỉ `l1_qa.review` (PASS).
*   **Chốt chặn Verification Gate (BLOCKING)**: 
    CEO bắt buộc phải kiểm tra chéo (Cross-check) tệp kịch bản `script.md` và kiểm tra tệp `l1_qa.review` có chữ `PASS`. Người dùng phê duyệt kịch bản chữ thì CEO mới cho phép chuyển sang Bước 2.

---

### Bước 2: Khởi Tạo Dự Án & Sinh Clips Thô (Phase 2: FlowKit Generation)

⛔ **Cơ Chế Resume Tránh Lãng Phí (MANDATORY):**
```
Project đã tồn tại (có --project-id trong task database)?
  → CÓ  ➔ PHẢI dùng --project-id + --video-id để resume. KHÔNG tạo project mới.
  → KHÔNG ➔ OK tạo mới bằng --prompts.
```
*(Vi phạm = tạo project mới thừa ➔ tốn credits cho clips đã sinh xong).*

⚠️ **Quy trình sinh video tự động với FlowKit Skills:**
AI Agent sẽ sử dụng trực tiếp các kỹ năng (Skills) của FlowKit để tự động sinh các phân cảnh hands-free thông qua các lệnh gọi API:

| FlowKit Skill | CLI Command | Purpose / Behavior |
|---|---|---|
| **Create Project** | `/fk-create-project` | Khởi tạo dự án, nạp nhân vật và bối cảnh từ kịch bản. |
| **Gen Refs** | `/fk-gen-refs <pid>` | Sinh ảnh reference để giữ visual đồng bộ. |
| **Pipeline Run** | `/fk-pipeline --upscale --tts --download` | Chạy tự động: sinh ảnh phân cảnh ➔ sinh clips thô ➔ làm QA L2 ➔ tạo TTS ➔ tải clips về máy. |

*Cách thực thi bằng Skills (Tự động hóa hoàn toàn):*
```bash
# Khởi chạy pipeline của FlowKit
/fk-pipeline <project_id> --upscale --tts --download --concat
```
*(Hệ thống sẽ tự động chạy, kiểm soát reCAPTCHA, giải quyết Captcha tự động và tải clips về thư mục output).*

---

### Bước 3: Ghép Nối & Dựng Video (Phase 3: Assembly)
```bash
# Ghép nối clips và khớp lời thoại TTS
/fk-concat-fit-narrator <video_id>
```
*(Hệ thống sẽ chạy công thức ghép nối video tự động, lồng tiếng, chèn nhạc nền BGM dựa trên kịch bản và xuất ra tệp `final.mp4` hoàn chỉnh).*

⚠️ BƯỚC NÀY BẮT BUỘC — KHÔNG skip dù clips đã pass Layer 2 QA.

---

### Bước 4: Thẩm Định Chất Lượng Video (Phase 4: L3 QA Gate)
*   **Hành động**: CEO triệu gọi Đặc vụ QA (`qa-reviewer`) chạy ở chế độ Workspace: inherit.
*   **Tri thức**: Đặc vụ QA nạp skill `.agents/skills/video-qa-gate/SKILL.md` và load động cấu hình kênh từ `config/channels/<channel_slug>.json`.
*   **CEO Chốt chặn (BẮT BUỘC)**: CEO tự mình mở xem trực tiếp video `final.mp4` bằng công cụ native `view_file` để duyệt chất lượng trước khi bàn giao.
*   **Bằng chứng đầu ra**: Tệp `review_results.json` và `l3_qa.review` (chứa chữ `PASS`) được ghi nhận thành công trong thư mục video.
*   *Nếu QA Score < 7.5 (FAIL)* ➔ Trả lại cho đặc vụ sản xuất điều chỉnh và re-render, cấm upload Drive/Notion.

---

### Bước 5: Đồng Bộ Hóa Dữ Liệu (Phase 5: Notion & Drive Sync)
```
Sau khi QA L3 PASS, tiến hành đồng bộ dữ liệu sản xuất lên Google Drive và Notion BUFFER DB:

Step A: Upload zip lên Google Drive (chứa: final.mp4, script.md, narration.txt, review_results.json):
  python scripts/gdrive_share.py upload <video_id> <channel>
  (Links sẽ tự động được lưu vào config/.gdrive_links.json)

Step B: Đồng bộ lên Notion BUFFER DB:
  python scripts/notion_sync.py
  (Đọc SQLite task_agent.db và config/.gdrive_links.json để cập nhật trạng thái lên Notion DB ID: 37b879a6-8e15-816a-a044-f278470c434b)
```

### Bước 7: Log & Learn (MANDATORY — sau mỗi video)
```
Sau QA review (dù PASS hay FAIL), agent PHẢI ghi vào:
  Obsidian KB/_shared/production/veo-prompt-log.md

Ghi gì:
  - Prompt nào FAIL? → thêm entry ❌ Known Failures (FXX)
  - Prompt nào cho kết quả đẹp? → thêm entry ✅ Proven Patterns (PXX)
  - Update Stats table

Mỗi entry phải có: Video#, prompt, kết quả, root cause, fix, PATTERN tổng quát.
Pattern = rule ngắn gọn mà video sau có thể apply ngay.

ĐÂY LÀ BƯỚC QUAN TRỌNG NHẤT — không log = không học = lặp lỗi.
```

---

## Ví dụ sử dụng

```
User: /veo-generate  channel=<channel-slug>  video=<video-id>

Agent:
  0a. Channel validate → <channel-slug> ✅
  0b. topic_dedup.py --channel <channel-slug> --organism "<subject-name>" → PASS
  Pre-flight: health check API server → exit 0 ✅
  1. Script → 5 segments
  1.5. Clarity Gate → PASS
  2. Veo prompts (6-part) → Self-verify ≥16/20 → PASS
  3. Chạy pipeline: Gọi `/fk-pipeline <project_id> --upscale --tts --download --concat`
     → Tự động: Clips gen + NLE concat + lồng tiếng + QA L2 thành công!
  4. QA L3: qa-reviewer subagent and view_file check → PASS (l3_qa.review created)
  5. Log to veo-prompt-log.md
  → Báo user: output/fb-reels/<channel-slug>/<video-id>/final.mp4 | 34s | QA 8.1 (L3 QA PASS)
```

## Output Structure
```
output/fb-reels/<channel>/<video-id>/
├── script.md        # Script + Veo prompts + Clarity Gate result
├── clips/           # Generated clips tải về từ FlowKit Engine (MANDATORY subfolder)
│   ├── scene_0.mp4
│   ├── scene_1.mp4
│   └── ...
└── final.mp4        # Final deliverable xuất ra từ /fk-concat-fit-narrator
```



## 📋 Quy Chuẩn Kỹ Thuật Gọi API FlowKit An Toàn (FlowKit Engine Rules)
Để đảm bảo sự ổn định của hệ thống FlowKit Engine và tối ưu hóa chi phí credits/tài nguyên, mọi sub-agent và pipeline bắt buộc phải tuân thủ nghiêm ngặt các quy tắc gọi API sau:

### 1. Định dạng Media ID bắt buộc là UUID
*   Media ID của ảnh/video luôn luôn là định dạng UUID (ví dụ: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
*   **TUYỆT ĐỐI CẤM** sử dụng mã `CAMS...` hoặc chuỗi base64 làm ID. Nếu API trả về định dạng `CAMS...`, hãy trích xuất UUID thực tế từ URL `fifeUrl` có dạng `/image/{UUID}`.

### 2. Cấm viết script chạy vòng lặp gửi API đơn lẻ
*   **TUYỆT ĐỐI CẤM** viết các script tự động chạy vòng lặp để liên tục gửi các request API đơn lẻ lên server (gây quá tải).
*   Bắt buộc sử dụng endpoint gửi hàng loạt: `POST /api/requests/batch` và sau đó poll trạng thái gộp qua `GET /api/requests/batch-status?video_id=<VID>`. Server sẽ tự động điều phối hàng đợi (tối đa 5 request đồng thời, cooldown 10s).

### 3. Phân biệt GENERATE và REGENERATE
*   **Lệnh `GENERATE_*`**: Sẽ tự động bỏ qua nếu phân cảnh đó đã được đánh dấu là `COMPLETED`.
*   **Lệnh `REGENERATE_*`**: Sẽ xóa tệp tin cũ và bắt buộc sinh mới lại phân cảnh từ đầu.

### 4. Cơ chế Cascade khi Regen
*   Việc tạo lại (`Regenerate`) một ảnh phân cảnh sẽ tự động xóa (clear) các video clips và các tệp upscale của các cảnh phía sau trong chuỗi. Do đó cần cân nhắc kỹ trước khi chạy lệnh này.

### 5. Yêu cầu Image Material
*   Mọi dự án khi tạo mới yêu cầu khai báo trường `material` (ví dụ: `realistic`, `3d_pixar`, `anime`). Hãy gọi `GET /api/materials` để lấy danh sách styles hợp lệ của hệ thống.

### 6. Sử dụng PATCH để cập nhật
*   Khi cần chỉnh sửa prompt, nhạc nền, hoặc lời thoại của một scene đã được tạo, hãy gọi `PATCH /api/scenes/{sid}` thay vì xóa cảnh đó đi và tạo lại từ đầu.
