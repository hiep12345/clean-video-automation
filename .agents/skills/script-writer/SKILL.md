---
name: script-writer
description: "Viết script.md hoàn chỉnh cho full-produce: Scene Plan, Narration, Veo Prompts, Upload Metadata. Load channel formula từ Obsidian KB trước khi viết."
risk: safe
updated: "2026-07-04"
---

# Script Writer

## ⛔ Gate 0: Dedup Check (BLOCKING)

Trước khi làm bất cứ điều gì — chạy dedup:

```bash
python scripts/topic_dedup.py --organism "<latin+common name>" --channel <channel-slug>
```

- **exit 0** → ghi `dedup_exit_code: "0"` vào task file evidence → tiếp tục
- **exit 1** → DỪNG NGAY, báo lại CC: `"DEDUP FAIL: topic đã tồn tại — cần topic mới"`. Không viết script.

Organism name lấy từ task file (title hoặc context section).

---

## Step 0: Session Context

**Load analytics** → `output/analytics/fb_<channel-slug>_*.json`

🟢 **Established (≥10 videos):** Sort by `avg_watch_s` desc (fallback: `reactions` desc). Phân tích top 10 theo 3 chiều:
- **Hook structure** (từ `title`): format nào đang ăn? ("This [X]..." / số liệu / contrast / câu hỏi?)
- **Topic type**: angle nào win retention? (predator/threat / mechanism / record / visual phenomenon)
- **Duration**: range nào có avg_watch_s cao nhất?

🟡 **New channel:** Competitor research trong Obsidian KB (ví dụ: `Obsidian KB/<channel-folder>/competitor-*-analysis.md`) → phân tích theo cùng 3 chiều. Fallback: `## Proven Structure` từ formula file. Ghi `pattern_source:` trong script.md metadata.

**Load channel identity** → `[Đường dẫn động: $OBSIDIAN_KB/<channel-folder>/<channel-slug>-script-formula.md]`

Tệp công thức kịch bản (script formula) của từng kênh được tải động theo cấu trúc trong Obsidian KB (ví dụ: [channel-folder]/[channel-slug]-script-formula.md tại $OBSIDIAN_KB (hoặc $OBSIDIAN_VAULT_PATH làm fallback)). Hệ thống tự động ánh xạ dựa trên channel-slug của tác vụ hiện hành.

**Load Staging Preset (channels visual/room-staging)** → Nếu `script_mode: visual` và task yêu cầu bối cảnh phòng:
- Tra cứu Preset phù hợp tại: `$OBSIDIAN_KB/<channel-folder>/presets/<preset-name>.md`
- Preset cung cấp các khối text sẵn có: `IMAGE_PROMPT Base`, `CAMERA Block`, `Static Anchor Phrase`, `Negative Prompt Standard`, `SFX Palette`, `Bio-Anchor Template`.
- **Copy trực tiếp** các khối này vào từng `## Scene X` khi viết — KHÔNG paraphrase, KHÔNG viết lại từ đầu.
- Preset hiện có: `scandinavian-living` (phòng khách Scandi), `japandi-bedroom` (phòng ngủ Japandi).
- Nếu không có preset phù hợp → tự viết theo formula, ghi `preset: none` vào Frontmatter.

**Chọn Generation Method** — đọc `Obsidian KB/_shared/production/generation-method-guide.md` → suy luận method phù hợp → ghi vào Context Card.

**Output — ghi vào `## Context Card` trong script.md TRƯỚC khi sang Step 1:**
```markdown
## Context Card

| Field | Value |
|-------|-------|
| Pattern source | [analytics / competitor / seed — ghi rõ video/source cụ thể] |
| Hook format | [ví dụ: "This [X] [behavior] — Here's Why" — ghi rõ format lấy từ video nào] |
| Winning angle | [predator/threat / mechanism / record / ...] |
| Duration target | [Xs] |
| Proven Structure | [hook style · narration style · visual rhythm] |
| BGM | [file + vol] |
| Generation Method | [sequential-end-frame / chain-image / extend / shot-explorer — ghi lý do chọn] |
```

⛔ Không viết placeholder. Mỗi field phải có giá trị cụ thể, không để `[...]`.

---

## Step 1: Scene Plan

Dùng `duration target` + `Generation Method` từ Context Card → quyết định số scene + timing + model mix.

Lựa chọn Model Key: Đối chiếu bảng tra cứu chi tiết và quy tắc quyết định chọn model tại: `Obsidian KB/_shared/production/veo-prompt-reference.md § 9 (Scene Model Selection — Decision Guide)`.

**ref_image (Khai báo ảnh tham chiếu):**
- **Có ảnh thật trong thư mục của tác vụ (ví dụ: `science-unlocked` / `botanical-killers`):** Khai báo đường dẫn `species_ref.jpg` (hoặc `botanical_sketch.jpg` nếu là ảnh sketch) vào phân cảnh đầu tiên (`Scene 0`) trong `scene_plan`. 
  - *Cơ chế hoạt động*: Client sẽ tự động phát hiện, upload ảnh làm Character/Visual Asset lên FlowKit, và chạy bước `GENERATE_IMAGE` (Step 1) có dẫn hướng (Guided Generation) để tạo ra một **Keyframe dọc 9:16 sạch trung gian** có hình dạng chuẩn xác sinh học theo ảnh gốc, sau đó mới dùng nó để sinh video I2V.
- **Không có ảnh thật nhưng kênh yêu cầu độ chính xác sinh học/cấu trúc cao:** Khai báo `ref_image: generate_keyframe` để hệ thống tự động sinh Start Frame sạch từ prompt trước khi tạo chuyển động.
- **Đối với các kênh nghệ thuật, trừu tượng hoặc phi thực tế:** Không bắt buộc phải khai báo trừ khi tác vụ có yêu cầu đặc thù.
- **Trường hợp loài hiếm không có hình ref chuẩn**: Vẫn cho phép thực hiện, tuy nhiên bắt buộc kịch bản phải chứa câu cảnh báo (Disclaimer) để người xem biết đây là mô phỏng dựa trên mô tả khoa học chứ không phải hình ảnh thật ngoài đời (xem chi tiết ở Step 2 và Step 4).

Đặt `ref_image` ở scene quan trọng nhất (Scene 0 toàn cảnh hoặc scene reveal).

Scene Plan frontmatter format:
```yaml
scene_plan:
  - {model: veo_3_1_i2v_lite_low_priority, duration: 8, ref_image: species_ref.jpg}
  - {model: veo_3_1_i2v_lite_low_priority, duration: 8}
  - {model: veo_3_1_i2v_lite_low_priority, duration: 8}
```

Include credit budget total.

⛔ **Credit Fallback Rule (AUTO):**
  Trước khi chọn model, kiểm tra số dư credits (GET /health). Nếu `remainingCredits < 20` ➔ tự động hạ cấp (downgrade) toàn bộ các cảnh sử dụng `abra_*` xuống `veo_3_1_i2v_lite_low_priority`. KHÔNG hỏi ý kiến user và KHÔNG dùng credits khi thiếu hụt.

---

## 🧠 Generation Method & Pacing Guardrails (Tư duy Kịch bản Hệ thống)

Khi lập kế hoạch phân cảnh (Scene Plan) và viết prompt, Agent bắt buộc phải suy luận logic dựa trên tính thực tế của nội dung (Data-Driven Realism) thay vì áp dụng máy móc các công cụ kỹ thuật:

1. **Giới hạn thời lượng hành động tự nhiên (Action Pacing Limit)**:
   - Không được kéo dài một hành động vật lý đơn điệu (như quay phới, gạt dao, khuấy nước) vượt quá giới hạn chú ý tự nhiên của người xem (ví dụ: trộn sơn chỉ được phép kéo dài tối đa 8s - 12s).
   - Cấm sử dụng `extend_chain` để lặp lại một hành động đã hoàn thành chu trình (ví dụ: màu sơn đã hòa quyện xong ở giây thứ 8 thì 8s tiếp theo không được tiếp tục quay trộn vô nghĩa).

2. **Tiến trình hành động logic (Logical Action Progression)**:
   - Nếu video yêu cầu thời lượng dài (ví dụ Reels 24s), Agent phải phân tích xem hành động tiếp theo của tiến trình thực tế là gì:
      - *Ví dụ (kênh aesthetic/visual):* Trộn sơn/chất liệu (0-8s) $\rightarrow$ Nhấc phới nhỏ giọt (8-16s) $\rightarrow$ Quệt mịn bóng lên bề mặt canvas (16-24s).
   - Mỗi phân đoạn extend phải là một bước phát triển hành động mới, thay đổi trạng thái hoặc góc cận cảnh để kích thích thị giác.

3. **Lựa chọn Generation Method chuẩn xác (Method Matrix)**:
   - **Extend Chain (`extend_chain`)**: Chỉ dùng khi hành động tiếp diễn liên tục trên cùng một đối tượng tĩnh (VD: vết dầu loang, sấy tạo hình, vẽ tranh). Đảm bảo chênh lệch chi tiết giữa các cảnh extend ở mức thấp nhất để tránh lỗi AI morphing (độ phức tạp hành động $\uparrow$ = lỗi $\uparrow$).
   - **Sequential Chain (`sequential_chain`)**: Dùng khi cần ghép các chu kỳ hành động độc lập hoặc các combo màu sắc khác nhau liên tục để giữ nhịp độ nhanh (VD: Ghép 3 clip trộn 3 màu khác nhau, mỗi clip 8s hoàn chỉnh).

---

## Step 2: Script

**Script tốt** = hook dùng format từ Context Card + angle match winning type + duration trong target range + Proven Structure apply xuyên suốt.

Đọc `script_mode` từ formula file:

`script_mode: narration` — follow Proven Structure + apply epistemic standards khi viết:
- Claims factual → qualifier ("khoảng", "có nguy cơ", "theo nghiên cứu X") hoặc source
- Số liệu cụ thể (%) → "(est.)" hoặc source — không để trơn
- Assumption ngầm → nêu rõ điều kiện ("trong môi trường nuôi nhốt", "as of 2026")

`script_mode: visual` — follow Proven Structure, visual flow only, không narration, không epistemic check.

Duration không vượt `max_duration_s` được cấu hình động trong SQLite database (channel.db).

⛔ **Word count gate** (narration controls final video length — render trims video to audio):
- `duration_target` từ Context Card × 2.5 = số words tối thiểu
- Ví dụ: 30s target → ≥75 words. 35s target → ≥87 words.
- Đếm words sau khi viết xong → nếu thiếu → mở rộng narration, KHÔNG tăng scene count.

**Self-review sau khi viết xong** (chỉ cho `script_mode: narration`):
- Data consistency: số liệu mâu thuẫn nhau xuyên suốt script không?
- Temporal coherence: ngày tháng / số liệu có outdated không?
- Shock safety zone: có từ/cụm nào trigger FB/YT content policy không? → đổi sang ngôn ngữ factual
- Psychology/neuroscience: claim có peer-reviewed backing không? → flag nếu không có
- **Rare Species Disclaimer**: Nếu dự án không có ảnh tham chiếu thực tế (species_ref.jpg), kịch bản (Narration và Text Overlay) ở scene cuối/outro Bắt buộc phải chèn câu disclaimer: "AI Disclosure: Visuals are an AI-assisted model based on documented records." (hoặc tiếng Việt tương đương: "đây chỉ là mô tả dựa trên thông tin được ghi nhận").

---

## Step 3: Veo Prompts

**3a. Bio-anchor** (prerequisite cho mọi prompt):

**Nguồn ưu tiên:**
1. ✅ **Task file `## Bio-anchor` section** — nếu CC/topic-researcher đã điền → dùng trực tiếp, KHÔNG override (trừ khi là placeholder).
2. ⚠️ **Tự generate từ knowledge / Obsidian RAG** — chỉ khi task file hoặc tệp loài để trống hoặc chứa placeholder → ghi rõ `[self-generated — verify accuracy]`.

⛔ **Chống Lan truyền Placeholder**: Nếu tệp loài trong `species-library` hoặc tệp task chứa các giá trị placeholder mặc định (như `Medium sized organism, standard posture.`, `Natural colors matching references.`, `Natural animal movements.`, `Stout upright tubular plant structure.`, `Natural botanical colors matching references.`, `Static (slow growth/bloom only).`) ➔ Đặc vụ **CẤM TUYỆT ĐỐI** copy lại các giá trị này vào kịch bản. Đặc vụ phải tự tra cứu sinh học qua RAG hoặc WebSearch để tự viết Bio-anchor chính xác 100% cho loài.

Format của Anchor theo kênh: Sử dụng đúng cấu trúc schema quy định tại: `Obsidian KB/_shared/production/factual-prompt-guide.md § 1 (Bio-anchor Schemas)`.

Bio-anchor được embed vào đầu mỗi Veo Prompt để giữ visual consistency.

**3b. Viết Veo Prompts**

**Nguyên tắc:** Prompt = visual translation của narration moment. Câu hỏi bắt đầu mỗi scene: *"Moment nào trong narration beat này nhất thiết phải thấy?"* ➔ THEN viết prompt phục vụ moment đó.

Reference:
- Obsidian KB/_shared/technical/dynamic-prompt-alignment-architecture.md — Cơ chế kỹ thuật của sequential-end-frame & shot-reverse-shot DPAF và cách căn chỉnh prompt.
- Obsidian KB/_shared/production/veo-prompt-reference.md — Quy chuẩn toàn diện về viết prompt và cơ chế kỹ thuật sinh ảnh/video.
- Obsidian KB/_shared/production/factual-prompt-guide.md — Ràng buộc chuyển động và Bio-anchor cho sinh học/factual.
- Obsidian KB/_shared/production/aesthetic-prompt-guide.md — Visual presets và quy luật tiến trình hành động cho sáng tạo.
- Obsidian KB/_shared/production/compilation-prompt-guide.md — Nhịp độ, chữ đè nổi bật, và neon contrast cho compilation/montage.
- Obsidian KB/_shared/production/veo-prompt-log.md — Nhật ký tránh lỗi và mẫu prompt thành công. BẮT BUỘC đọc tệp này trước khi viết prompt. Lọc theo ngách (Tag Filtering): chỉ nạp các mục lỗi có tag `[Global]` và tag tương thích với ngách của kênh hiện tại (ví dụ: `[Biology/Nature]` cho factual channels như SU/BK, `[Aesthetic/Visual]` cho aesthetic/visual channels như MT/CD, `[Psychology/Narrative]` cho MG) để tránh loãng ngữ cảnh.

⛔ **Quy tắc Tham chiếu Kịch bản Mẫu (Performance-Driven Reference Guardrail)**: 
- **CẤM TUYỆT ĐỐI** đặc vụ tự ý đọc, sao chép hoặc tham chiếu kịch bản trực tiếp từ thư mục cục bộ `output/fb-reels/archive/` (vì đây là kho lưu trữ thô chưa qua bộ lọc và chứa nhiều video chất lượng kém).
- **NGUỒN THAM CHIẾU DUY NHẤT BẮT BUỘC**: Mọi hoạt động tham khảo kịch bản mẫu, cấu trúc hook, và prompt Veo thành công bắt buộc phải thực hiện trên thư mục tốt nghiệp của kênh tại Obsidian KB: `obsidian-kb/<channel_slug>/scripts/`.
- **Cơ chế**: Thư mục này chỉ chứa các kịch bản đã được hệ thống tự động kiểm duyệt bằng số liệu thực tế (`status: approved-by-metrics` với Views >= 5K hoặc Retention >= 40%). Hãy nạp trực tiếp các kịch bản này làm **Few-shot Prompting examples** trong prompt sinh của LLM để kế thừa văn phong và các prompt Veo đã tối ưu hóa thành công.


Header format: `## Scene N — [tên] | [model_key] | [Xs]`

⛔ **Binary gates (không negotiate):**
- Subject already mid-action — không bắt đầu từ static pose
- Scene 2+: `"Same [environment] and [lighting] as previous shot"`
- SFX: ≥2 âm thanh cụ thể — không dùng "ambient" chung
- Terminal line cuối mỗi prompt: 9:16 vertical format, Xs, [visual style presets trích xuất từ tệp formula của kênh đã nạp ở Step 0]. Bắt buộc phải có visual style; nếu tệp formula không quy định, Agent phải báo lỗi thiếu cấu hình phong cách tại L1 Clarity Gate.
- Standard Negative block cuối mỗi prompt: Sử dụng block negative prompt đặc thù của kênh được cấu hình trong tệp formula. Nếu không có, mới dùng block tiêu chuẩn tại Obsidian KB/_shared/production/veo-prompt-reference.md § 2 làm fallback chung.
- Cấm sử dụng bất kỳ từ khóa rác nào trong danh sách cấm tại: `Obsidian KB/_shared/production/veo-prompt-reference.md § 3 (Forbidden Words)`.
- Nếu kịch bản mô tả cảnh nhạy cảm/ăn thịt ➔ Bắt buộc lách luật qua: `Obsidian KB/_shared/production/veo-prompt-reference.md § 5 & § 6 (Safety Bypass Rules)`.
- Self-score ≥16/20 ➔ Đối chiếu checklist tự đánh giá tại: `Obsidian KB/_shared/production/veo-prompt-reference.md § 11 (Self-Score Gate)`.

⛔ **Ràng buộc Camera Theo Phương Pháp Sinh (Method-Specific Camera Constraints)**:
- Đặc vụ **bắt buộc** phải đối chiếu và tuân thủ nghiêm ngặt các ràng buộc camera và chuyển động (Motion & Camera Constraints) đặc thù của phương pháp sinh video đã chọn (như Sequential Chain, Extend, hay Shot Explorer) được quy định tại `Obsidian KB/_shared/production/veo-prompt-reference.md § 11.1`.
- Đảm bảo camera của Scene 1 (hoặc scene đầu chuỗi) phải static hoặc dolly cực chậm, camera các scene sau phải đồng bộ góc quay để tránh lỗi nhòe/méo hình và trôi chuyển động giữa các phân cảnh nối tiếp.


---

## Step 4: Upload Metadata

Load `.agents/skills/social-post-writer-seo/SKILL.md` → viết per-platform.
Caption hook: dùng hook format từ Context Card + element shock nhất từ narration.

⛔ **BẮT BUỘC (Hashtag & ID Gate):**
- Mọi caption viết cho FB, IG, YT **bắt buộc** phải chứa hashtag ID của video viết liền không dấu gạch ngang ở cuối dòng (dạng: `#[channel]v[number]`, ví dụ: `<channel_code>-v002-topic` ➔ `#<channel_code>v002`). Đây là khóa chính để hệ thống tự động quét và nhận diện bài đăng trên Facebook.
- Giới hạn số lượng hashtag nghiêm ngặt:
  - Facebook: **Tối đa 3 hashtags chính + 1 ID tag**.
  - Instagram: **Tối đa 5 hashtags + 1 ID tag**.
  - YouTube: **Tối đa 5 tags + 1 ID tag**.
- **Rare Species Disclaimer**: Nếu dự án không có ảnh tham chiếu thực tế, phần caption của mọi platform phải chứa dòng: "AI Disclosure: Visuals are an AI-assisted model based on documented records."

🟢 **Pin Comment (Affiliate):** Viết thêm mục `### Pin Comment (Affiliate)` ở cuối phần Upload Metadata.
- Tra cứu mẫu comment phù hợp trong `Obsidian KB/_shared/production/affiliate-comments-playbook.md` dựa theo chủ đề của video.
- Sử dụng domain active chính xác của kênh (lấy từ cấu hình kênh JSON, ví dụ trường `affiliate_domain` hoặc `shop_url`). 
- ⛔ **CẤM TỰ Ý BỊA DOMAIN (Strict No-Hallucination Rule):** Nếu cấu hình JSON của kênh không khai báo trường domain tiếp thị liên kết chính thức, **TUYỆT ĐỐI CẤM** tự ý bịa ra các domain giả lập (như `[channel_name].space` hoặc `[channel_name].com`). Bắt buộc phải sử dụng placeholder chuẩn: `[INSERT_AFFILIATE_LINK]` hoặc `[SHOP_LINK_HERE]` để team member tự điền link thật khi xuất bản.
- Chèn link rút gọn `/go/<slug>` tương ứng với sản phẩm trong video (nếu có domain thật).

---

## Output format

```markdown
---
generation_method: [independent (for independent/montage formats) | sequential-end-frame (for continuous process/story formats)]
preset: [tên preset đã dùng, ví dụ: scandinavian-living | japandi-bedroom | none]  ← metadata cho Agent, pipeline bỏ qua
scene_plan:
  - {model: model_key, duration: N, parent_scene_idx: [-1 to force independent root | omit or specify parent index for continuous chaining]}
  - ...
---
# <VIDEO_ID> — <Title>

## Metadata        ← table: Channel, Format, Date, Duration, BGM, ID
## Context Card    ← 7-field table từ Step 0 (AUDITABLE — bạn đọc file là thấy tư duy)
## Upload Metadata ← per platform (FB / IG / YT) + Pin Comment (Affiliate)
## Narration Table ← Time | Narration | Text Overlay
## Scene Plan      ← Scene | Model | Credits | Lý do (Human-readable table)
## Bio-anchors     ← các thuộc tính cố định theo schema quy định ở Step 3a
## Veo Prompts     ← 1 section/scene với header format đúng
## Thumbnail Prompts ← Option A + Option B
## Production Pipeline ← checklist [ ]
```

---

## Targeted Hotfix Mode (Visual Feedback Loop)

Khi video cuối cùng trượt QA L3 (Score < 6.0) hoặc trượt review của User:
1. **Xác định scene lỗi:** Phân tích `review_results.json` để tìm ra scene nào bị morphing, sai màu, hoặc lỗi giải phẫu.
2. **Kích hoạt Hotfix Mode:** Script-writer sẽ được invoke với context kịch bản cũ + Target Scene ID + QA feedback chi tiết.
3. **Chỉnh sửa mục tiêu:**
   - Chỉ chỉnh sửa prompt của scene bị lỗi đó. KHÔNG được thay đổi kịch bản hay các scene đã PASS.
   - Bổ sung negative prompt cụ thể (ví dụ: `no wings morphing`, `no color shift`) hoặc khóa màu trong `color_anchor`.
   - Hạ cấp model hoặc chuyển sang keyframe-guided (Imagen 3) nếu model Lite liên tục lỗi.
   - Cập nhật lại `script.md` và chuyển sang bước re-generation scene đó.

---

## Self-check

```
□ Gate 0: topic_dedup.py exit 0? evidence.dedup_exit_code ghi vào task file?
□ Context Card đã ghi vào script.md? 7 fields đầy đủ, không có placeholder `[...]`?
□ Script: hook format match analytics? duration trong target? word count ≥ duration_target × 2.5?
□ Script self-review (script_mode: narration): data consistent? safety zone OK? temporal coherence?
□ Preset loaded (script_mode: visual)? Preset name ghi vào YAML Frontmatter `preset:` field?
□ IMAGE_PROMPT Base copy từ preset, không viết lại từ đầu? CAMERA Block + Negative Prompt copy nguyên?
□ Veo: subject mid-action? scene 2+ có continuity line? terminal line? negative block?
□ Veo: camera constraints followed (Scene 1 static/slow, Scene 2+ consistent, Action-Camera matched)?
□ Veo self-score ≥16/20? (verified via scripts/validate_prompts_gate.py)
□ Upload Metadata: per platform đầy đủ?
```
