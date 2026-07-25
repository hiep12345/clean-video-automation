---
name: clarity-gate
description: >
  Content verification layer chống AI hallucination + kiểm tra engagement structure.
  14-point check: 9 epistemic/data/routing points đảm bảo facts đúng, 5 engagement
  points đảm bảo hook/loop/reveal/payoff/shock đủ mạnh — tất cả ở script level trước khi render.
  Adapted from clarity-gate v2.1 (CC-BY-4.0, Francesco Marinoni Moretto).
triggers:
  - verify content
  - check hallucination
  - fact check
  - kiểm tra nội dung
  - content accuracy
  - trước khi publish
---

# Clarity Gate — Content Verification Layer

> **Core Question**: "Nếu viewer/LLM đọc content này, sẽ nhầm assumption thành fact không?"

## Khi nào dùng

**PRE-PUBLISH** (trước khi upload — mọi video có narration):
- Chạy tại Quy trình kiểm tra xuất bản (`/publish-checklist` Bước 5) hoặc [l1_script_qa.py](../../../scripts/qa/l1_script_qa.py) (`python scripts/qa/l1_script_qa.py <script.md>`)

**STANDALONE / independent check** (review theo yêu cầu):
- Khi cần fact-check ngoài luồng script-writer

**KHÔNG cần chạy riêng khi:**
- Script viết qua `script-writer/SKILL.md` với `script_mode: narration` — Points 1-9, 10-13 đã verify inline trong Step 2
- Kênh có `l1_gate: null` trong `config/channels/` (aesthetic, visual-only, non-factual)

## Pre-Scan — Xác định Points cần chạy

> **Scope:** Chỉ áp dụng SAU KHI section "Khi nào dùng" đã quyết định chạy skill.
> **Override rule:** Kênh có `l1_gate: "clarity-gate"` — Pre-Scan KHÔNG được giảm bớt points. Luôn chạy đủ 14+ điểm.

Pre-Scan chỉ có tác dụng với kênh có `l1_gate: null` hoặc topic borderline chưa rõ domain.

### Câu hỏi Pre-Scan (trả lời trước khi vào checklist)

**Q1: Content này có factual claims không?**
Factual = tên loài, công thức, số liệu thực tế, cơ chế khoa học, nghiên cứu
→ CÓ: chạy Points 1–9
→ KHÔNG: skip Points 1–9 → ghi: `"Skipping Points 1-9: no factual claims — [lý do]"`

**Q2: Content có narration / story structure không?**
→ CÓ: chạy Points 10–14
→ KHÔNG (silent ASMR, no voiceover): skip Points 10–14 → ghi: `"Skipping Points 10-14: no narration"`

**Q3: Domain có rủi ro đặc biệt không?**
| Domain | Extra check cần |
|--------|----------------|
| Psychology / neuroscience | Point 15 — peer-review (xem bên dưới) |
| Công thức màu / recipe | Verify formula trước khi tiếp tục: "X + Y = Z" có đúng color theory không? |
| Physics / cơ chế vật lý | Verify mechanism: claim có thể reproduce/verify không? |
| Aesthetic only (visual, no claim) | Không cần extra check |

### Output Pre-Scan
Chỉ báo cáo khi SKIP points:
```
Pre-Scan: Skipping Points 1-9 (no factual claims — aesthetic channel)
Pre-Scan: Running Points 10-14 (narrated content)
Pre-Scan: Adding color formula check (domain: pigment mixing)
```
Nếu chạy full 14 → không cần báo gì, vào checklist luôn.

## 14-Point Verification Checklist

> **Domain Adaptation**: Checklist này áp dụng cho MỌI kênh có `l1_gate: "clarity-gate"` trong `config/channels/`.
> Agent KHÔNG cần ví dụ cụ thể cho từng kênh. Thay vào đó, đọc `domain_topics` của kênh → map vào archetype bên dưới → áp dụng nguyên lý tương ứng.

### Domain Archetypes (dùng để tự suy luận ví dụ)

| Archetype | Đặc trưng claim | Risk chính | Ví dụ domain_topics |
|-----------|-----------------|------------|---------------------|
| **Biology / Nature** | Tên loài, cơ chế sinh học, số liệu sinh thái | Nhầm hypothesis thành fact, anthropomorphism | animal, plant, marine, insect |
| **Psychology / Cognitive** | Hiện tượng tâm lý, nghiên cứu hành vi, bias | Pop-science thiếu source, chẩn đoán viewer | psychology, cognitive, neuroscience, bias |
| **Physics / Chemistry** | Công thức, phản ứng, cơ chế vật lý | Sai cơ chế, thiếu điều kiện áp dụng | physics, chemistry, formula |
| **History / Narrative** | Sự kiện, nhân vật, timeline | Sai niên đại, dramatize quá mức | historical figure, biography, legend |

**Nguyên lý**: Khi gặp domain mới không khớp 100% bảng trên → chọn archetype GẦN NHẤT dựa trên loại claim trong script, không dựa trên tên kênh.

---

### Epistemic (Bắt buộc — Points 1-4)

**1. FACT vs HYPOTHESIS**
Mọi claim phải rõ ràng: đã validate hay giả thuyết?

| Anti-pattern | Nguyên lý sửa |
|---|---|
| Dùng ngôn ngữ tuyệt đối cho claim chưa đồng thuận | Thêm attribution: "theo nghiên cứu X", "được cho là", "có xu hướng" |
| Trình bày giả thuyết như sự thật đã chứng minh | Phân biệt rõ: "đã xác nhận" vs "gợi ý rằng" vs "đang tranh luận" |

**2. UNCERTAINTY MARKERS**
Claims về tương lai/chưa chứng minh PHẢI có qualifier.

| Anti-pattern | Nguyên lý sửa |
|---|---|
| "X chữa/giải quyết Y" (absolute cure/solve) | "X **đang được nghiên cứu** cho tiềm năng…" |
| "X sẽ xảy ra" (tương lai như chắc chắn) | "X **có nguy cơ** / **có khả năng**…" |
| Bỏ qua điều kiện biên | Thêm context: "[trong điều kiện Z]", "[theo mô hình Y]" |

**3. ASSUMPTION VISIBILITY**
Giả định ngầm PHẢI được nêu rõ.

| Anti-pattern | Nguyên lý sửa |
|---|---|
| Số liệu thiếu context (tuổi thọ, tỷ lệ, hiệu quả) | Thêm điều kiện: "[nuôi nhốt]", "[nghiên cứu phương Tây]", "[in vitro]" |
| Trình bày quan niệm phổ biến như sự thật | Nêu rõ: "Quan niệm phổ biến rằng X — **thực tế, Y**" |

**4. UNVALIDATED DATA**
Số liệu cụ thể PHẢI có nguồn hoặc đánh dấu ước tính.

| Anti-pattern | Nguyên lý sửa |
|---|---|
| Số % cụ thể không nguồn (89%, 73%) | Thêm "(est.)" hoặc "[source: X]" |
| Bảng so sánh / ranking không citation | Thêm "Source: ..." hoặc ghi "(estimated based on ...)" |
| Số liệu từ survey online / pop-science blog | Ghi rõ methodology limitations |

### Data Quality (Points 5-7)

**5. DATA CONSISTENCY** — Không có số liệu mâu thuẫn trong script
**6. IMPLICIT CAUSATION** — Không ngụ ý nhân quả khi chưa chứng minh (correlation ≠ causation)
**7. FUTURE AS PRESENT** — Không mô tả kế hoạch/đề xuất như đã xảy ra

### Verification Routing (Points 8-9)

**8. TEMPORAL COHERENCE** — Ngày tháng hợp lý, không outdated
**9. EXTERNALLY VERIFIABLE** — Số liệu có thể fact-check → đánh dấu để verify

### Engagement Structure (Points 10-14)

> Check ở **script level** — trước khi render. Clip timing và escalation pacing được check sau khi assembly (Layer 3 QA).

**10. HOOK 0-3s**
3 giây đầu narration phải tạo ra "must-watch" curiosity ngay lập tức.

| Anti-pattern | Nguyên lý sửa |
|---|---|
| Mở bằng giới thiệu / context dài ("Hôm nay chúng ta nói về…") | Mở bằng **conflict, contradiction, hoặc shocking fact** gắn trực tiếp với subject |
| Hook không tạo câu hỏi trong đầu viewer | Hook phải buộc viewer tự hỏi "sao lại thế?" hoặc "thật sao?" |

→ Nếu hook không tạo câu hỏi hoặc tension ngay → REWRITE trước khi tiếp tục.

**11. OPEN LOOP**
Script phải raise một câu hỏi chưa trả lời sớm trong video và giữ nó cho đến gần cuối.

| Anti-pattern | Nguyên lý sửa |
|---|---|
| Liệt kê facts tuần tự (X là gì, sống ở đâu, ăn gì) | Đặt câu hỏi "tại sao / làm sao" ngay đầu → giữ suspense → trả lời ở 60-90% video |
| Trả lời câu hỏi ngay sau khi đặt | Delay answer — cung cấp context/evidence trước, reveal sau |

→ Xác định: câu hỏi mở là gì? Nó được giữ đến phần nào? Nếu không có → REWRITE.

**12. REVEAL TIMING**
Reveal chính (câu trả lời cho open loop) KHÔNG được xuất hiện quá sớm (< 60% video) hoặc quá muộn (> 90% video).

| ❌ Sai timing | ✅ Đúng timing |
|--------------|----------------|
| Reveal ở giây 10 của video 60s | Reveal ở giây 40-50 của video 60s |
| Reveal ở câu cuối cùng (không có payoff) | Reveal để lại 1-2 câu cho emotional payoff |

→ Map reveal vị trí: tính % theo tổng số câu/dòng narration.

**13. PAYOFF SHAREABILITY**
Đoạn kết phải để lại cảm xúc hoặc insight khiến viewer muốn share/comment.

| Anti-pattern | Nguyên lý sửa |
|---|---|
| Kết bằng CTA trực tiếp ("Subscribe để xem thêm") | Kết bằng **implication lớn hơn** — câu kết mở ra suy nghĩ mới |
| Câu kết chỉ recap nội dung | Câu kết phải trigger emotion: awe, fear, surprise, disbelief, hoặc self-reflection |

→ Kết có trigger emotion không? Nếu không → REWRITE câu cuối.

**14. SHOCK SAFETY ZONE**
Nội dung phải đủ engaging để giữ viewer nhưng không vượt ngưỡng gây flag/remove.

| ❌ Quá nhẹ | ❌ Quá mạnh | ✅ Safe zone |
|-----------|-----------|-------------|
| Không có yếu tố surprising | Mô tả bạo lực/đau đớn chi tiết | Factual description of danger/mechanism |
| Không có tension | Chẩn đoán/gán nhãn bệnh lý cho viewer | Mô tả hiện tượng, để viewer tự nhận ra |
| Chỉ liệt kê fact | Ngôn ngữ gây sợ hãi thái quá | Ngôn ngữ factual nhưng unexpected |

→ Đọc qua script: có từ/cụm nào có thể trigger FB/YT content policy không? → Thay bằng ngôn ngữ factual.

### Domain-specific extra rules

> Áp dụng KHI `domain_topics` của kênh match archetype tương ứng. Agent tự map — không cần hardcode.

**Psychology/Neuroscience** (Point 15):
- Claim PHẢI có peer-reviewed study, named researcher, hoặc established institution
- Pop-science only (no source) → flag cho review trước khi continue
- Medical/diagnostic claim → **BLOCK** (mô tả phenomenon ≠ label/diagnose viewer)

## Quick Scan — Red Flags trong Video Script

| Pattern | Action |
|---------|--------|
| Số % cụ thể (89%, 73%) | Thêm source hoặc "(est.)" |
| "Luôn luôn", "Không bao giờ" | Đổi thành "Thường", "Hiếm khi" |
| So sánh tuyệt đối ("X tốt nhất") | Thêm qualifier "một trong những" |
| Giá tiền cụ thể | Kiểm tra lại, thêm "~" hoặc "(as of 2026)" |
| Claim y tế/khoa học | BẮT BUỘC có source |
| "Các nhà khoa học cho biết" | Cụ thể: ai, khi nào, ở đâu |

## Output Format

Sau khi verify, báo cáo ngắn:

```
## Clarity Gate: [Script Title]
- Verdict: PASS / NEEDS FIX / BLOCK
- Epistemic issues (1-9): [count]
- Engagement issues (10-14): [count]
- Critical: [list nếu có]
- Fixed: [list đã sửa]
```

## Severity Levels
| Level | Ý nghĩa | Action |
|-------|----------|--------|
| CRITICAL | Viewer sẽ hiểu sai fact | BẮT BUỘC fix trước publish |
| WARNING | Có thể gây hiểu nhầm | Nên fix |
| PASS | Rõ ràng, không mơ hồ | OK |

## Tích hợp Workflow

### Trong Quy trình kiểm tra xuất bản (`/publish-checklist`):
- Chạy Clarity Gate SAU khi script hoàn chỉnh, TRƯỚC khi render final
- Nếu verdict = BLOCK → KHÔNG publish, fix script trước

### Trong Quy trình lên kế hoạch video (`/video-plan`):
- Chạy Pre-Scan trước → xác định points cần check → chạy đúng nhóm đó
- Full check (tất cả 14 points) ở giai đoạn final script nếu kênh có `l1_gate: "clarity-gate"`

## Video QA Checklist (AI-Generated Footage)

> Bổ sung cho visual content — L3 QA được thực hiện native qua IDE `view_file` trên `final.mp4` (xem AGENTS.md §11, §16).
> Kết quả kiểm tra được ghi vào `review_results.json` trong thư mục video.

### Frame-level Check
| Artifact | Mô tả | Chấp nhận? |
|----------|--------|------------|
| Morphing background | Nền thay đổi bất thường giữa frames | ❌ Re-generate |
| Extra/missing limbs | Động vật có thêm/thiếu chi | ❌ Re-generate |
| Texture flickering | Bề mặt nhấp nháy | ⚠️ OK nếu < 0.5s |
| Floating objects | Vật thể trôi nổi không logic | ❌ Re-generate |
| Unnatural motion | Chuyển động giật, không tự nhiên | ⚠️ Tùy mức độ |
| Text/watermark | Chữ AI bị generate vào video | ❌ Cắt clip đó |

### Sequence-level Check
| Issue | Check |
|-------|-------|
| Scene coherence | Các clip liên tiếp có matching lighting/color? |
| Audio sync | Voiceover khớp với visual không? |
| Duration | Mỗi clip đủ dài để viewer nhận diện nội dung? (≥2s) |
| Transition | Không có jump cut đột ngột giữa 2 scene khác biệt lớn? |

### Decision Matrix
```
ALL frames clean           → PUBLISH
1-2 minor artifacts (< 1s) → PUBLISH (viewer ít nhận ra)
Major artifact > 1s        → RE-GENERATE clip đó
> 30% clips có artifacts   → RE-GENERATE toàn bộ batch
```

## Thumbnail QA Checklist

Mọi ảnh đại diện (`thumbnail.jpg`) trước khi đóng gói xuất bản BẮT BUỘC phải vượt qua 4 tiêu chí kiểm duyệt chất lượng sau:

### 1. Độ chuẩn xác hình thái sinh học (Morphology Accuracy)
*   **Đối chiếu sinh học:** Bắt buộc so sánh hình dáng con vật trong ảnh AI với ảnh mẫu thực tế (`species_ref.jpg` / `subject-overview.jpg`).
*   **Không dị dạng:** Không chấp nhận các lỗi sinh học của AI như thừa mắt, thiếu chi, gai góc đột biến, hoặc các chi tiết giả tạo (như bánh răng cơ khí xoắn ốc sai lệch thực tế).

### 2. Sự hiển thị & Bố cục của văn bản (Text Overlay Coherence)
*   **Không che chủ thể:** Dòng chữ chính BẮT BUỘC phải nằm ở vùng trống (Negative Space) — thường ở góc trên 6% hoặc góc dưới, tuyệt đối không được đè lên che khuất con vật hay các bộ phận nhận diện quan trọng.
*   **Không rác chữ AI:** Không được chứa các dòng chữ méo mó, sai chính tả do AI tự vẽ chìm ở nền phía sau. Prompt gửi lên FlowKit phải là prompt sạch (loại bỏ mọi từ khóa `"with text overlay"`). Chữ chính chỉ được vẽ đè sạch sẽ bằng PIL.

### 3. Tỉ lệ & Định dạng khung hình (Aspect Ratio & Scaling)
*   **Đúng định dạng kịch bản:** Sinh ảnh dọc 9:16 trực tiếp từ FlowKit cho Reels, hoặc ảnh ngang 16:9 cho YouTube.
*   **Cấm crop tự do:** Tuyệt đối không sử dụng các bước crop xén thô bạo làm méo mó hoặc mất đi tỷ lệ tự nhiên của bức ảnh. Chỉ phóng to/thu nhỏ trực tiếp về độ phân giải chuẩn (1080x1920 hoặc 1920x1080).

### 4. Tính thẩm mỹ & Click-through Rate (Aesthetics & Hook)
*   **Độ tương phản:** Chữ in hoa (font Impact) có đường viền đen dày (15px) bao quanh để nổi bật trên mọi loại màu nền.
*   **Quy chuẩn màu sắc:** Sử dụng công thức màu phối: Dòng trên màu Trắng (`white`), dòng dưới màu Vàng nghệ (`#FFE600`) để kích thích thị giác mạnh nhất.

<!-- meta: verified=2026-07-01 | depends_on=[] | decay=slow -->