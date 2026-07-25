---
name: Veo Flow
description: "Tạo video/image clips trên Google Flow qua browser automation. Hỗ trợ Veo 2/3.1, Nano Banana. Generate, batch, download."
version: "1.0.0"
role: "AI Video Production Specialist"
---

# 🎬 Veo Flow — Browser Automation cho Google Flow

## 🎯 Trigger Conditions
- "tạo video veo", "generate clip veo", "veo flow"
- "tạo footage cho video", "generate footage"
- "batch veo clips", "chạy veo prompts"

## 📋 Sub-Skills

| Sub-Skill | Mô tả |
|-----------|--------|
| `generate-keyframe` | Tạo ảnh keyframe photorealistic (Nano Banana 2) → dùng làm Veo reference |
| `generate-clip` | Tạo 1 video clip từ prompt (hoặc từ keyframe image) trên Google Flow |
| `generate-batch` | Queue nhiều prompts liên tục với random delay |
| `download-clips` | Download clips đã generate về local |
| `prompt-engineer` | Viết Veo prompt photorealistic từ scene description |

## ⭐ Keyframe-First Workflow (BEST PRACTICE)

Để đạt chất lượng cao nhất, LUÔN tạo keyframe ảnh trước khi generate video:
```
Bước A: Nano Banana 2 (Image mode, x4) → Tạo keyframe siêu chân thực
Bước B: Chọn ảnh đẹp nhất → Click ảnh → Dùng làm reference cho Veo
Bước C: Veo (Video mode, 8s, 9:16) → Generate video từ keyframe
Bước D: Download 8s clip → Loop ×3 trong CapCut/InShot = 24s Reel
```
**Lý do**: Imagen render chi tiết cao hơn Veo text-only. Video bám sát composition keyframe.
**Effort**: ~5 phút/Reel (2 min keyframe + 2 min Veo + 1 min loop+audio)

### Chuyển đổi Image ↔ Video trên cùng project
```
1. Click nút settings (góc phải prompt box) — hiện "Nano Banana 2 ▎x4" hoặc "Video ▎x2"
2. Chọn tab [Image] để tạo keyframe HOẶC [Video] để tạo clip
3. Image mode: chọn model "Nano Banana 2", variants x4
4. Video mode: chọn model "Veo 3.1 - Fast", 8s, 9:16
```

## 🔄 Quy trình Generate — Step by Step

### Bước 0: Launch CDP (BẮT BUỘC trước khi dùng Playwright)
```
MPT_PY=tools/MoneyPrinterTurbo/venv/Scripts/python.exe
$MPT_PY tools/MoneyPrinterTurbo/scripts/cdp_launcher.py start flow   # Port 9334
# Lần đầu: $MPT_PY tools/MoneyPrinterTurbo/scripts/cdp_launcher.py login flow
```

### Shortcut: ASMR End-to-End (1 lệnh)
```
$MPT_PY tools/MoneyPrinterTurbo/scripts/smart_video_generator.py --template asmr --asmr-prompt "..." --auto
```

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
│  Generating will use 20 credits│ ← Chi phí hiển thị
└───────────────────────────────┘
```
Cấu hình mặc định: **Video, 9:16, x2, Veo 3.1 - Fast, 6s** (~20 credits)

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

### Bước 4: Batch Generate (nhiều prompts)
```
Cho mỗi prompt trong danh sách:
  1. Clear ô prompt → paste prompt mới
  2. Click [→] submit
  3. Delay 3-5s → submit prompt tiếp (KHÔNG cần đợi xong)
  4. Flow queue tất cả, hiển thị progress cùng lúc trên canvas
  5. Đợi TẤT CẢ clips đạt 100% trước khi download
```

### Bước 5: Download Clips
```
Có 2 cách:
Cách 1: Download thủ công trên UI
1. Click vào thumbnail clip → mở preview
2. Hover → icon download (↓) xuất hiện
3. Click download → lưu .mp4

Cách 2: Download tự động qua script (KHUYẾN NGHỊ)
1. Lấy link trực tiếp của project (VD: https://labs.google/fx/tools/flow/project/{uuid})
2. Chạy kịch bản tự động điều hướng Chrome (CDP port 9334) tới thẳng URL trên.
3. Việc truy cập thẳng URL project sẽ tránh lỗi click nhầm dự án/icon ngoài trang chủ.
4. Chờ 10-15s để canvas tải toàn bộ <video> elements.
5. Thực thi script trích xuất blob video/UI download.
6. Rename: clip_001.mp4, clip_002.mp4... và lưu vào output/veo_clips/{slug}/
```

## 🎨 Prompt Engineering
→ Obsidian KB: `_shared/production/veo-prompt-engineering-pipeline.md` + `_shared/production/veo3-prompt-guideline.md`
(Script → phân cảnh → Veo prompt, 6-layer structure, camera/lens table, từ cấm, realism checklist)

### Bảng Model Available
→ **Canonical table**: `video-production-guardrails.md` > "## Veo Models Reference"
(Update model table tại đó khi Google thay đổi — skill này không cần update)

## ⚙️ Default Config

| Param | Default | Options |
|-------|---------|---------|
| URL | `labs.google/fx/tools/flow` | — |
| Model | `Veo 3.1 - Fast` | Xem model table: video-production-guardrails.md |
| Duration | `6s` | 4s, 6s, 8s |
| Aspect | `9:16` | 9:16 (portrait), 16:9 (landscape) |
| Variants | `x1` | x1, x2, x3, x4 (x1 default vì đã có multi-layer QA verify) |
| Batch delay | 3-5s giữa submits | — |
| Output dir | `output/veo_clips/{slug}/` | — |

## ⚠️ Lưu ý quan trọng
- **CDP flow profile**: `cdp_launcher.py start flow` (port 9334). Login 1 lần, session lưu mãi.
- **ULTRA account**: Credits hữu hạn → ưu tiên quality prompts, tránh spam
- **Variants x1 (từ 03/05)**: Đã có QA pipeline (Tier 1 + Tier 2) verify sau generate → không cần tạo x2 variants. Nếu clip fail QA → re-gen 1 clip mới với prompt cải tiến, tiết kiệm 50% credits.
- **Session timeout**: ~24h, cần re-login nếu hết phiên
- **Lower Priority models**: Rẻ hơn nhưng queue lâu hơn, hiển thị "leaving X/10"
- **Ctrl+Enter fallback**: Nếu arrow button không tìm thấy, `Ctrl+Enter` luôn submit prompt an toàn. KHÔNG dùng `Create`/`Generate` button.
- **Selector `button:has-text("Create")` trap (29/04)**: Tìm thấy nút "Create Asset" → bấm nhầm → mở popup. **FIX**: Xóa sạch `Create`/`Generate` khỏi selector list.

<!-- meta: verified=2026-05-03 | depends_on=[Google Flow UI, Veo models] | decay=fast -->