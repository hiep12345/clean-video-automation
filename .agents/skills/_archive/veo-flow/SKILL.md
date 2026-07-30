---
name: veo-flow
description: "Archived, last-resort browser procedure for a user-approved one-shot Google Flow calibration only when standard FlowKit resolution and the one-shot FlowKit API calibration path are unavailable. Do not use for normal generation, batching, or retries."
---

# Veo Flow — Archived browser calibration fallback

> [!CAUTION]
> Không dùng skill này làm đường production mặc định. Luôn chạy FlowKit Engine
> local API-first. Nếu exact R2V key chỉ resolve ở trạng thái
> `legacy_unverified_no_duration_claim`, ưu tiên one-shot API calibration trước.
> Chỉ dùng browser UI khi nhánh API calibration không khả dụng và người dùng đã
> duyệt rõ một hành động có thể tiêu credit.

## API-first gate

Trước khi mở browser:

1. `GET http://127.0.0.1:8100/health` — yêu cầu `status=ok`,
   `extension_connected=true`.
2. `GET /api/flow/status` — yêu cầu `connected=true`,
   `flow_key_present=true`.
3. Inspect `/api/flow/credits`, `/api/models` và
   `/api/flow/video-capabilities`.
4. `POST /api/flow/resolve-video-contract` với exact model key, generation mode,
   duration, output ratio và tier.
5. Nếu resolver xác nhận exact key + native duration, quay lại API production;
   không dùng browser.
6. Nếu mapping unknown, mismatch hoặc legacy-unverified, đặt
   `calibration_required` và chặn standard submit.

Ingredients/storyboard phải dùng
`POST /api/flow/generate-video-refs` với
`generation_mode=reference_frame_2_video`. Không coi image-to-video model là
drop-in Ingredients model nếu resolver chưa xác nhận.

Các rule về input ratio, output ratio, tay, tool, mixer, drip, model và duration
thuộc format/model contract đang chọn. Không biến một lỗi artifact thành quy
tắc phổ quát. Storyboard input ratio và video output ratio là hai trường độc
lập; ví dụ storyboard 16:9 có thể tạo output 9:16.

## One-shot FlowKit API calibration first

Nếu resolver của exact R2V key với `duration_seconds=null` trả
`verification=legacy_unverified_no_duration_claim`, chỉ được gọi trực tiếp
`POST /api/flow/generate-video-refs` khi người dùng duyệt một attempt có thể tiêu
credit:

- bỏ trường duration; không suy đoán native duration;
- submit đúng một request, không batch;
- ghi input hash/media ID/dimensions, prompt, exact model key, mode, ratio,
  credits trước/sau, project/result IDs, output hash, ffprobe và QA;
- coi output là calibration evidence, không phải production verification và
  không phải quyền dùng standard/batch;
- không retry nếu chưa có approval mới.

Khi đã đo được native duration, việc cập nhật capability registry là một task
review riêng; không tự sửa registry trong calibration.

## One-shot calibration authorization

Chỉ tiếp tục phần browser bên dưới khi có đủ:

- API không thể resolve exact contract;
- one-shot API calibration ở trên không khả dụng;
- người dùng duyệt **một** lần thử có thể tiêu credit;
- input storyboard/reference đã có media ID, dimensions và SHA-256;
- prompt, output ratio và requested duration đã cố định.

Ghi receipt trước/sau attempt:

- input SHA-256, media ID, width, height;
- exact prompt;
- model label, exact key, version;
- native duration và output aspect ratio;
- credits before/after;
- project ID và result/operation ID;
- output SHA-256, ffprobe và QA.

Không batch, không regenerate và không retry nếu chưa có approval mới. Nếu
attempt thất bại hoặc mapping vẫn chưa xác minh, giữ
`calibration_required`.

## Phạm vi thao tác UI

Chỉ thực hiện thủ công các thao tác nằm trong attempt đã duyệt: chọn reference
đã khóa, cấu hình đúng model/ratio/duration, submit một lần, theo dõi kết quả và
download output. Không gọi sub-skill, batch helper hoặc automation script cũ.

## Legacy UI sequence for the approved attempt

Ưu tiên dùng reference đã được duyệt. Chỉ tạo keyframe mới khi approval nói rõ
generation ảnh này nằm trong phạm vi được phép:
```
Bước A: Image mode (x1) → Tạo đúng một keyframe bằng model ảnh đã được duyệt
Bước B: Click ảnh → Dùng làm reference cho Veo
Bước C: Video mode → chọn đúng model/duration/output ratio đã được duyệt
Bước D: Download output duy nhất để hash, ffprobe và QA
```
**Lý do**: Imagen render chi tiết cao hơn Veo text-only. Video bám sát composition keyframe.
**Thời gian**: Không giả định trước; ghi lại thời gian thực tế trong receipt.

### Chuyển đổi Image ↔ Video trên cùng project
```
1. Click nút settings (góc phải prompt box) để quan sát model và số variant hiện tại
2. Chọn tab [Image] để tạo keyframe HOẶC [Video] để tạo clip
3. Image mode: chỉ khi có approval riêng; chọn model ảnh đã duyệt, variants x1
4. Video mode: chọn đúng model label, duration và output ratio trong approval
```

## 🔄 Quy trình Generate — Step by Step

### Bước 0: Xác nhận browser session

Mở Google Flow trong browser session do người dùng kiểm soát. Nếu cần đăng nhập
hoặc xác minh tài khoản, dừng để người dùng hoàn tất. Không gọi local helper,
CDP launcher hoặc shortcut automation không được khai báo trong repository.

### Bước 1: Mở Project
```
1. Navigate → https://labs.google/fx/tools/flow
2. Nếu ở landing page → click "Create with Flow" → vào dashboard
3. Click "+ New project" (hoặc click project card cũ)
4. Đợi editor load → thấy "Start creating or drop media"
5. URL editor: labs.google/fx/tools/flow/project/{uuid}
```

### Bước 2: Cấu hình Settings (1 lần/session)
Click vào nút **"Video ▎x2"** (góc phải dưới prompt box) → popup hiện:
```
┌───────────────────────────────┐
│  [🖼 Image]    [🎬 Video]     │  ← Chọn VIDEO
│  [🔲 Frames]   [🧪 Ingredients]│
├───────────────────────────────┤
│  [📱 9:16]     [🖥 16:9]      │  ← Chọn ASPECT RATIO
├───────────────────────────────┤
│  [x1] [x2] [x3] [x4]        │  ← Số variants/prompt
├───────────────────────────────┤
│  [Veo 3.1 - Fast        ▼]  │  ← Click dropdown chọn MODEL
├───────────────────────────────┤
│  [4s]  [6s]  [8s]           │  ← Chọn DURATION/clip
├───────────────────────────────┤
│  Generating will use [UI value]│ ← Ghi đúng chi phí UI hiển thị
└───────────────────────────────┘
```
Không dùng cấu hình mặc định. Chọn đúng model label, duration và output ratio
đã được duyệt cho calibration; ghi lại giá trị UI và exact key quan sát được.

### Bước 3: Submit Prompt
```
1. Prompt input = [role="textbox"] contenteditable div (KHÔNG phải textarea)
2. Paste/type prompt (chi tiết, photorealistic style)
3. ⚠️ CLICK NÚT [→] (arrow icon cuối prompt bar) — KHÔNG click "Generate"/"Create"
   → "Generate" button mở asset panel, KHÔNG submit prompt!
4. Thumbnails xuất hiện với % progress (2% → 50% → 100%)
5. Thời gian chờ: ~60-180s tùy model
6. Khi 100%: có nút ▶ = video sẵn sàng xem
```

### Bước 4: Batch Generate — DISABLED

Không dùng quy trình batch cũ trong calibration fallback. Một approval chỉ cho
phép một submit. Không thực thi batch; dừng ngay sau submit calibration duy nhất.

### Bước 5: Download output
```
1. Click vào thumbnail clip → mở preview
2. Hover → icon download (↓) xuất hiện
3. Click download → lưu .mp4
4. Đổi tên theo video ID và lưu dưới
   content-planner-kb/output/fb-reels/<channel>/<video_id>/
5. Tính SHA-256, chạy ffprobe và ghi QA result vào calibration receipt
```

## 🎨 Prompt Engineering

Đọc nguồn hiện có:
`content-planner-kb/obsidian-kb/_shared/production/veo-prompt-reference.md`.
Chỉ áp dụng phần phù hợp với format/model contract đang chọn.

### Bảng Model Available

Không dùng bảng model tĩnh trong archived skill. Lấy exact key, mode, native
duration và verification từ `/api/models`,
`/api/flow/video-capabilities` và `/api/flow/resolve-video-contract`.

## Calibration fields — no defaults

| Param | Required evidence | Notes |
|-------|---------|---------|
| URL | `labs.google/fx/tools/flow` | — |
| Model | label + exact key + version | Không chọn theo tên suy đoán |
| Duration | native duration quan sát được | Phải khớp model key |
| Aspect | output aspect ratio | Tách khỏi storyboard input ratio |
| Variants | `x1` | One-shot calibration |
| Retry | disabled | Cần approval mới |
| Output dir | `content-planner-kb/output/fb-reels/<channel>/<video_id>/` | Dùng write scope đã xác nhận |

## ⚠️ Lưu ý quan trọng
- **ULTRA account**: Credits hữu hạn → ưu tiên quality prompts, tránh spam
- **Variants x1**: one-shot calibration chỉ được một output. Clip fail QA thì
  dừng; không re-gen nếu chưa có approval mới.
- **Session timeout**: ~24h, cần re-login nếu hết phiên
- **Lower Priority models**: chỉ dùng khi resolver xác nhận exact mode/key/native
  duration; không suy luận chi phí từ label.
- **Ctrl+Enter fallback**: Nếu arrow button không tìm thấy, `Ctrl+Enter` luôn submit prompt an toàn. KHÔNG dùng `Create`/`Generate` button.
- **Selector `button:has-text("Create")` trap (29/04)**: Tìm thấy nút "Create Asset" → bấm nhầm → mở popup. **FIX**: Xóa sạch `Create`/`Generate` khỏi selector list.

<!-- meta: archived-fallback=2026-07-30 | depends_on=[FlowKit API, Google Flow UI] | decay=fast -->
