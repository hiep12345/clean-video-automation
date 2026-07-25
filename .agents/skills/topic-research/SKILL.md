---
name: topic-research
description: >
  On-demand R&D để tìm topic candidates mới từ external sources (competitors, science news,
  viral trackers). Chạy khi queue kênh sắp cạn. Output: shortlist 10-15 candidates đã pre-screen.
  Trigger: "bổ sung topic", "topic research", "tìm topic mới", "queue cạn".
risk: safe
source: cc-built
date_added: "2026-06-16"
---

# Topic Research Skill

Tìm topic candidates mới từ external sources, pre-screen theo criteria, output shortlist cho CC review.

## ⛔ PRE-CHECK

Trước khi chạy:
1. Xác định mã kênh (slug) cần bổ sung (ví dụ: `<channel-slug>`).
2. Đọc criteria card tương ứng của kênh đó tại `.agents/skills/topic-research/references/<channel>-criteria.md`.
3. Chạy `python scripts/topic_dedup.py --channel <slug> --check "<topic>"` hoặc đọc `Obsidian KB/<channel>/species-library/` để biết topic nào đã có.

## Quy trình

### Step 1 — Xác định nguồn search theo kênh

1. Nạp động file criteria card tương ứng tại đường dẫn `.agents/skills/topic-research/references/[channel]-criteria.md` (trong đó `[channel]` là mã kênh, ví dụ: `<channel-slug>-criteria.md`).
2. Trích xuất danh sách nguồn tìm kiếm (Search Sources) và các câu truy vấn mẫu (Queries) từ phần `## 🔍 Search Sources & Queries` trong file criteria card đó.
3. Sử dụng các nguồn và queries này để thực hiện tìm kiếm trên WebSearch nhằm có thông tin chính xác và cập nhật nhất cho ngách của kênh đó.

### Step 2 — Collect raw candidates (20-30)

Chạy 5-8 WebSearch queries. Cho mỗi result, ghi:
```
- [Organism/Phenomenon]: [1-sentence description]
  Source: [URL]
```

### Step 3 — Pre-screen (áp dụng criteria card)

Cho mỗi candidate, check 3 câu:
1. Behavior là động từ, không phải danh từ? (Y/N)
2. Có ≥3 visual moments rõ ràng? (Y/N)
3. Chưa có trong species-index.md? (Y/N)

Loại bỏ bất kỳ candidate nào có 1 câu trả lời N.

### Step 4 — Score remaining candidates (0-3)

Áp dụng Visual Score Quick Check từ criteria card. Chỉ giữ score ≥2.

### Step 5 — Output shortlist

Format output chuẩn cho CC review:

```markdown
## Topic R&D Shortlist — [Channel] — [Date]

### TOP PICKS (score 3/3)

**[N]. [Organism latin name] ([Common name])**
Hook: "[1-sentence hook đề xuất]"
Behavior: [2 câu mô tả behavior chính]
Visual moments: (1) [scene 1] → (2) [scene 2] → (3) [scene 3]
Source: [URL]
AI risk: [LOW/MEDIUM] — [lý do nếu MEDIUM]
Bio-anchor:
  body_plan: [mô tả hình dạng chính xác từ source]
  color_anchor: [màu sắc thực tế]
  movement: [cách di chuyển đặc trưng]
  key_ai_error: [lỗi AI thường mắc với loài này]
  ❌ NOT: NOT [sai lầm 1], NOT [sai lầm 2]

### GOOD CANDIDATES (score 2/3)
[same format]

### NEEDS VERIFICATION
[candidates cần CC check thêm trước khi thêm]
```

### Step 6 — CC review

CC đọc shortlist, approve từng item → thêm vào `config/topic_queue/<channel>.md` dưới `## Ideas`.
Gate 0 (`topic_dedup.py`) bắt buộc trước khi promote lên `## Ready`.

## ⛔ KHÔNG làm

- Không tự thêm vào topic_queue mà không có CC approve
- Không tạo task file từ R&D output (CC mới được tạo task)
- Không giới hạn nguồn — nếu thấy nguồn mới uy tín, thêm vào queries

## Trigger keywords

`bổ sung topic`, `topic research`, `tìm topic mới`, `queue cạn`, `R&D topic`, `topic ideas`,
`bổ sung queue`, `fill queue`, `research topics`
