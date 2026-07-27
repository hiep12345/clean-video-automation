# Script Scene Format Reference
> Extracted from production guardrails 2026-06-15 — PROCESS layer (templates + format).
> GATE enforcement → `Obsidian KB/_shared/production/guardrails-content-policy.md § Script Format`
> Model selection guide → `Obsidian KB/_shared/production/veo-prompt-reference.md § Scene Model Selection`

---

## 1. scene_plan Frontmatter — Machine-Readable SSOT

### Channel production profile

Trước khi áp dụng ví dụ tổng quát bên dưới, đọc
`config/channels/<channel-slug>.json`. Nếu có `production_profile`:

- dùng chính xác `script_formula_path` và `script_template_path` được cấu hình;
- giữ nguyên role, thứ tự, lineage, model và native duration trong template;
- không downgrade model khi `require_exact_model: true`;
- chạy `scripts/production_profile.py` và chỉ gọi Flow sau khi preflight PASS.

Các duration 4/6/8/10 giây trong bảng dưới là năng lực chung của Flow, không
phải quyền tự thay đổi native duration đã khóa trong production profile.

```yaml
---
generation_method: sequential-end-frame
scene_plan:
  - {model: abra_i2v_8s, duration: 8}
  - {model: veo_3_1_i2v_lite_low_priority, duration: 4}
  - {model: abra_i2v_6s, duration: 6}
  - {model: veo_3_1_i2v_lite_low_priority, duration: 4}
---
```

> `scene_plan:` là SSOT duy nhất. `load_scene_configs()` đọc từ đây cho cả `sequential_chain.py` và `chain_image_chain.py`.
> ⚠️ Pipeline UNIFIED: cả hai method đọc cùng một `scene_plan:`.

**Duration options:**
| Duration | Dùng khi |
|---|---|
| 4s | Cutaway nhanh, reaction shot, single motion |
| 6s | Action beat, product reveal, Omni tiết kiệm credit |
| 8s | Character scene, complex motion — **Omni default** |
| 10s | Extended narrative, V2V (`abra_edit` cố định 10s) |

---

## 2. Scene Plan Table — Human-Readable Doc

> Chỉ ghi thông tin KHÔNG có trong frontmatter: Credits estimate + Lý do chọn model.
> Model và Duration đã ở frontmatter — KHÔNG lặp lại ở đây để tránh drift.

```markdown
## Scene Plan
| Scene | Tên | Credits | Lý do chọn model |
|-------|-----|---------|------------------|
| 0 | Hero opener | ~1.6 | Character + fast motion → Omni |
| 1 | Wide run | 0 | Background shot → Lite OK |
| 2 | Toe close-up | ~1.2 | Extreme detail → Omni |
| 3 | Bank escape | ~1.2 | Fast motion → Omni |
```

---

## 3. Veo Prompt Block Format

```
## Scene N — [tên] | [model_key] | [Xs]

[CAMERA: shot type + movement] Subject description (≥3 fixed attributes). Action ALREADY IN PROGRESS.
Environment detail + imperfection anchors. Lighting behavior ("casts shadow onto..."). SFX: explicit sounds.
9:16 vertical format, Xs, cinematic documentary style, shallow depth of field.
No brand logos, no text overlays, no watermarks, no subtitles, no captions,
no camera equipment visible in frame, no morphing artifacts, no unnatural camera jitter.
```

> Header `## Scene N — name | model_key | Xs` chỉ để người đọc hiểu — không ảnh hưởng execution.
> Model decision đã ghi trong `scene_plan:` frontmatter — KHÔNG cần `[MODEL:]` tag trong prompt block.

---

## 4. Full Example (YAML + Scene Plan Table + Prompt Blocks)

```yaml
---
generation_method: sequential-end-frame
scene_plan:
  - {model: abra_i2v_8s, duration: 8}
  - {model: veo_3_1_i2v_lite_low_priority, duration: 4}
---
```

```markdown
## Scene Plan
| Scene | Tên | Credits | Lý do chọn model |
|-------|-----|---------|------------------|
| 1 | Hero opener | ~1.6 | Character + fast motion → Omni |
| 2 | Reef B-roll | 0 | Background filler → Lite |
```

```
## Scene 1 — Hero opener | abra_i2v_8s | 8s

[CAMERA: Cinematic close-up with slow push-in] a mantis shrimp emerging from coral crevice —
iridescent carapace, thumb-length, raptorial claws ALREADY mid-strike extension.
Shallow tropical reef floor, worn coral rubble, dappled caustic light from above.
Hard side-light casting blue rim across carapace edge, shadow falling into claw joint.
SFX: sharp underwater click, water pressure resonance, distant reef ambience.
9:16 vertical format, 8s, cinematic documentary style, shallow depth of field.
No brand logos, no text overlays, no watermarks, no subtitles, no captions,
no camera equipment visible in frame, no morphing artifacts, no unnatural camera jitter.

## Scene 2 — Reef B-roll | veo_3_1_i2v_lite_low_priority | 4s

[CAMERA: Wide establishing shot, static] vibrant coral reef ecosystem, ambient light filtering through
water column, no focal organism. Natural color palette, muted blues and greens.
SFX: ambient underwater hum, distant bubbles.
9:16 vertical format, 4s, cinematic documentary style, shallow depth of field.
No brand logos, no text overlays, no watermarks, no subtitles, no captions,
no camera equipment visible in frame, no morphing artifacts, no unnatural camera jitter.
```

---

## 5. CC Task File — Key Visual Moments Format

CC chỉ cung cấp **key visual moments** trong task file. AG tự quyết số scene, duration, model.

```markdown
## Key Visual Moments (AG tự design scene_plan)
- Moment A: [subject + action — e.g., "lizard mid-sprint on water, hero shot"]
- Moment B: [environment/angle — e.g., "full body bipedal run, wide angle"]
- Moment C: [detail — e.g., "close-up fringe toes splashing"]
- Moment D: [resolution — e.g., "lizard reaching far bank"]
```

CC KHÔNG ghi:
```markdown
scene_plan:          ← AG quyết, không phải CC
  - {model: abra_i2v_8s, duration: 8}
```

AG đọc narration → tính TTS (đếm từ ÷ 3 = giây) → thiết kế scene_plan cho khớp.


## 6. Quy Định Kích Thước Ảnh Tham Chiếu & Phân Đoạn Video Prompts
Để tối ưu hóa chất lượng sinh ảnh/video và tránh reCAPTCHA hoặc lỗi format của mô hình:

### 1. Kích thước Ảnh Tham Chiếu (Reference Image Dimensions)
*   **Địa điểm (Locations/Environments)**: Bắt buộc sử dụng khung hình **ngang (landscape)** (ví dụ: bối cảnh rừng, rạn san hô, phòng khách).
*   **Nhân vật (Characters/Entities)**: Bắt buộc sử dụng khung hình **dọc (portrait)** để tập trung vào chi tiết thực thể.

### 2. Phân Đoạn Thời Gian Video Prompts (Sub-clip Timing)
Đối với video prompts có thời lượng dài (ví dụ: 8s), prompt phải được cấu trúc chi tiết theo các phân đoạn thời gian để mô hình sinh chuyển động chính xác:
*   **Công thức phân đoạn 8 giây**:
    *   `0-3s: [Hành động bắt đầu / action details]`
    *   `3-6s: [Chuyển động tiếp diễn / movement progression]`
    *   `6-8s: [Hành động kết thúc hoặc thay đổi góc / resolution]`
*   *Ví dụ*:
    `0-3s: The mantis shrimp crawls slowly on the coral reef floor. 3-6s: It suddenly accelerates, lunging forward with its raptorial claws. 6-8s: The shrimp pulls back into its burrow, sand settling around it.`
