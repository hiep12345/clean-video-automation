---
description: "Scan xu hướng đa nền tảng, lọc và chấm điểm content opportunities. Dùng khi cần tìm topic mới, lên content calendar, hoặc đánh giá niche."
---

# /trend-scan — Trend Scanning Workflow

Scan nhanh xu hướng → filter → score → recommend content opportunities.

## Usage
```
/trend-scan --niche "nature ASMR" --platforms "facebook,youtube"
/trend-scan --niche "camping" 
/trend-scan  (default: dùng niche hiện tại từ GEMINI.md)
```

## Prerequisites
- Skill: `trend-scout` (global)
- `learnings.md` phải tồn tại

## Workflow Steps

### Step 1: Set Parameters
Từ input, xác định:
- **Niche**: Topic/keyword chính (bắt buộc, hoặc lấy từ GEMINI.md)
- **Platforms**: facebook, youtube, tiktok, reddit, google-trends (default: all)
- **Depth**: quick (3 queries) | standard (5) | deep (10)
- **Timeframe**: 7 ngày (default) | 30 ngày | 90 ngày

### Step 2: Activate Trend Scout
- Dùng skill `trend-scout`
- Chạy Phase 1-4: Scan → Extract → Score → Report
- **Output**: Trend Report markdown

### Step 3: Cross-Reference
So sánh trends tìm được với:
1. **Content đã publish**: `output/` folder → tránh trùng
2. **Obsidian KB**: `/obsidian-rag-retrieve` → đã có research chưa?
3. **Posting schedule**: `output/week-XX-batch/posting-schedule.md` → fit vào calendar?
4. **Pipeline capability**: Templates nào đã có (T1-T5)?

Output:
```markdown
## Cross-Reference Results
| Trend | Already Covered? | Template Available? | Calendar Slot? |
|-------|-----------------|--------------------|-|
```

### Step 4: Prioritize & Recommend
Từ trends đã filter:
1. **Immediate** (CVS ≥ 4.0, template sẵn): Đưa vào content calendar tuần này
2. **Next Sprint** (CVS ≥ 3.5, cần prep): Lên kế hoạch tuần sau
3. **R&D** (CVS ≥ 3.0, cần template mới): Trigger `/rd-sprint`
4. **Watch** (CVS < 3.0): Theo dõi, scan lại tuần sau

### Step 5: Save & Learn
1. Report → suggest `/obsidian-kb-save` nếu quality
2. Auto-append top trend vào `learnings.md` > "Trend Accuracy Log"
3. Nếu có immediate actions → tạo task trong SQLite task DB

## ⚡ Quick Mode
```
/trend-scan --quick
```
- Chỉ scan 2 platforms (YouTube + Facebook)
- 3 queries/platform
- Skip cross-reference
- Output: Top 3 trends only

## ⚠️ Guardrails
- Report valid ~7 ngày — ghi timestamp rõ
- KHÔNG recommend topic mà pipeline chưa support
- Tối đa 5 recommendations/scan
- Khi suggest `/rd-sprint` → hỏi user confirm trước
