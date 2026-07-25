---
description: "Lưu output chất lượng cao vào Obsidian KB để tái sử dụng. Auto-trigger sau workflows chính."
skills: [obsidian]
---

# /obsidian-kb-save

> **Mục đích**: Lưu output vào Obsidian KB — compound knowledge over time
> **Vault**: `obsidian-kb/`
> **Kích hoạt**: Tự động sau workflows có output tốt, hoặc user nói "lưu vào KB"

## Routing Table — Lưu gì, vào đâu?

> ⚠️ Đây là nguồn duy nhất định nghĩa KB paths. KHÔNG hardcode paths ở workflow khác.
> Sync với: `Affiliate KB/README.md`

| Workflow source | Folder đích | Tên file pattern | Tags |
|----------------|-------------|-------------------|------|
| `/niche-research` | `{channel_slug}/research/` hoặc `{channel_slug}/` | `{niche-name}.md` | niche, research |
| `/affiliate-product-review` | `{channel_slug}/research/` hoặc `{channel_slug}/` | `{product-name}.md` | product, review, affiliate |
| `/youtube-video-plan` | `{channel_slug}/videos/` | `v{NNN}-{slug}.md` | video, plan, youtube |
| Video script success (Real Views >= 10K hoặc Retention >= 35%) | `{channel_slug}/scripts/` | `{video_id}.md` | script, approved-by-metrics |
| `/weekly-content-review` | `_meta/reviews/` | `weekly-{YYYY-MM-DD}.md` | analytics, weekly |
| `/kpi-forecast` | `_meta/reviews/` | `kpi-forecast-{YYYY-MM}.md` | kpi, forecast |
| `/context-setup` | `_shared/` | `{niche}-context.md` | context, positioning |
| `/thumbnail-ab-test` | `{channel_slug}/research/` hoặc `{channel_slug}/` | `ab-test-{topic}.md` | thumbnail, ab-test |
| Content output (general) | `_shared/templates/` | `{type}-{platform}-{topic}.md` | template |

---

## ⛔ GATE 1: Eligibility Check (Có nên lưu không?)

TRƯỚC KHI làm bất cứ gì, kiểm tra 4 điều kiện. **Cần ≥2/4 để PASS**:

| # | Điều kiện | Check |
|---|-----------|-------|
| 1 | Chứa **data/số liệu thực tế đạt KPI** (Ví dụ: Reels Views >= 10K, Retention >= 35% trên Facebook/YouTube) | ☐ |
| 2 | Có **giá trị tái sử dụng** (template, kịch bản mẫu cấu trúc prompt đã được chứng minh hiệu quả) | ☐ |
| 3 | **Workflow source** nằm trong Routing Table ở trên | ☐ |
| 4 | User **approve** ("lưu lại", "good", "save") hoặc tự động sync sau khi quét analytics | ☐ |

**KHÔNG LƯU** nếu:
- Output chỉ là trả lời ngắn, one-off, hoặc conversational
- Draft chưa hoàn thành (thiếu >50% nội dung)
- Nội dung lặp lại note đã có trong vault

→ **FAIL** → Báo user: *"Output chưa đạt tiêu chuẩn lưu KB. Lý do: [X]"* → STOP

---

## 🔍 GATE 2: Data Quality Score (0-100)

Chấm điểm output trước khi lưu:

| Tiêu chí | Trọng số | Cách chấm |
|----------|----------|-----------|
| **Accuracy** — Có nguồn/evidence không? | 30 | Có URL/source = 30, có data nhưng ko source = 15, chỉ opinion = 0 |
| **Completeness** — Đủ sections/thông tin? | 25 | Đủ hết = 25, thiếu 1-2 = 15, thiếu >2 = 5 |
| **Freshness** — Data mới không? | 20 | <30 ngày = 20, 1-6 tháng = 10, >6 tháng = 5 |
| **Specificity** — Cụ thể hay generic? | 15 | Có tên/số/ngày cụ thể = 15, chung chung = 5 |
| **Actionability** — Có next steps rõ ràng? | 10 | Có action items = 10, chỉ thông tin = 5 |

| Score | Verdict | Action |
|-------|---------|--------|
| **80-100** | 🟢 **High Quality** | Lưu ngay, không cần hỏi |
| **60-79** | 🟡 **Acceptable** | Lưu + gắn tag `needs-review` |
| **40-59** | 🟠 **Low Quality** | Hỏi user: "Quality score thấp ({X}/100). Vẫn lưu?" |
| **<40** | 🔴 **Reject** | KHÔNG lưu. Báo: "Output không đạt chất lượng. [chi tiết]" |

---

## 🔄 GATE 3: Duplicate & Conflict Check

Trước khi ghi file, kiểm tra vault:

```
grep_search:
  SearchPath: obsidian-kb/
  Query: {product-name hoặc niche-name hoặc topic}
  CaseInsensitive: true
```

| Kết quả | Action |
|---------|--------|
| **Không tìm thấy** | → Tạo note mới |
| **Tìm thấy note cùng topic** | → So sánh: data mới hơn? → **MERGE** (cập nhật sections mới, giữ cũ) |
| **Tìm thấy note gần giống** | → Hỏi user: "Đã có `{note}`. Ghi đè, merge, hay bỏ qua?" |

---

## Bước 4: Format & Save

### Note Template (bắt buộc)
```markdown
---
tags: [{tag1}, {tag2}, {niche}]
created: {YYYY-MM-DD}
source: {workflow-name}
quality_score: {điểm từ Gate 2}
status: active
metrics:
  views: null # Lượt xem thực tế từ Facebook/YouTube
  retention_rate: null # Tỷ lệ giữ chân người xem (%)
  shares: null # Lượt chia sẻ thực tế
expires: {YYYY-MM-DD nếu data có hạn, ví dụ pricing}
---

# {Tiêu đề rõ ràng}

## Summary
{2-3 câu tóm tắt — BẮT BUỘC cho RAG retrieve}

## Content
{Nội dung đầy đủ}

## Sources
- {URL hoặc nguồn data}

## Action Items
- [ ] {Việc cần làm tiếp theo}

## Related
- [[{link đến notes liên quan nếu có}]]
```

### Lưu vào vault

**File Naming Convention:**

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Video script | `vNNN-slug.md` | `v014-zombie-flies.md` |
| Weekly review | `weekly-YYYY-MM-DD.md` | `weekly-2026-05-09.md` |
| Audit | `[platform]-audit-YYYY-MM-DD.md` | `fb-audit-2026-05-30.md` |
| Research | `[topic]-[qualifier].md` | `camping-trends-2026.md` |
| SSOT | `channel-ssot.md` | `channel-ssot.md` |

> Quy tắc chung: **lowercase, dùng hyphen, không dùng space, không dùng tiếng Việt có dấu trong tên file**.

```powershell
$vault = "obsidian-kb"
$folder = "{folder-đích từ Routing Table}"
$file = "{tên-file}.md"

New-Item -Path "$vault\$folder" -ItemType Directory -Force
Set-Content -Path "$vault\$folder\$file" -Value $content -Encoding UTF8
```

## Bước 5: Confirm + Log

Báo user kết quả đầy đủ:
```
✅ Đã lưu vào Obsidian KB
📁 Path: {folder}/{file-name}.md
📊 Quality Score: {X}/100
🏷️ Tags: {tags}
⏰ Expires: {date hoặc "không"}
```

---

## Auto-Save Trigger Rules

Khi hoàn thành workflow trong Routing Table:
1. Chạy **Gate 1** → Pass?
2. Chạy **Gate 2** → Score ≥60?
3. Chạy **Gate 3** → Không duplicate?
4. Nếu cả 3 pass → lưu + confirm
5. Nếu bất kỳ gate nào fail → báo user lý do, hỏi có muốn override không

**Mở rộng trigger** — KHÔNG chỉ routing table, mà còn:
- Output prompt engineering, guideline, template → `_shared/` hoặc `_shared/production/`
- Research/analysis có data cụ thể → folder project tương ứng theo routing table

## Vault Hygiene Rules
- Notes có `status: stale` (>6 tháng không update) → flag khi RAG retrieve
- Notes có `quality_score < 60` → ưu tiên thấp khi retrieve
- Notes có `expires` đã qua → cảnh báo khi retrieve: "⚠️ Data có thể outdated"

## ⚠️ ENFORCEMENT
Rule 5 trong GEMINI.md quy định: output đạt ≥2/4 eligibility → auto-trigger save.
Agent PHẢI tự chạy save **KHÔNG ĐỢI user nhắc**.
Vi phạm = lỗi hệ thống nghiêm trọng.
