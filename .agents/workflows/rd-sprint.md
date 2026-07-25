---
description: "R&D sprint end-to-end: brainstorm → research → prototype → evaluate → ship/kill. Dùng khi cần thử nghiệm concept, template, hoặc ý tưởng mới trước khi đưa vào production."
---

# /rd-sprint — R&D Sprint Workflow

Quy trình R&D có hệ thống: từ ý tưởng → prototype → quyết định ship hoặc kill.

## Usage
```
/rd-sprint "Thử template parallax scrolling cho Facebook Reels"
/rd-sprint "R&D format storytelling 3-act cho YouTube Shorts"
```

## Prerequisites
- Skills: `brainstorming`, `deep-research`, `trend-scout` (global)
- `learnings.md` phải tồn tại (ghi R&D Log)

## Workflow Steps

### Step 1: Define Scope
Từ input của user, xác định:
- **Hypothesis**: "Nếu ta [làm X], thì [kết quả Y] vì [lý do Z]"
- **Success criteria**: Metric cụ thể (ví dụ: engagement rate > 5%)
- **Time box**: Tối đa bao lâu cho sprint (default: 1 session)
- **Kill criteria**: Khi nào dừng (ví dụ: render fail, chất lượng dưới baseline)

### Step 2: Brainstorm (Dùng skill `brainstorming`)
- Activate `brainstorming` skill
- Đi qua 7-step process: Context → Clarify → Viability → Lock → Design → Present → Decision Log
- **Output**: Design document với approach đã chọn

### Step 3: Knowledge Pull (Dùng `/obsidian-rag-retrieve`)
- Chạy `/obsidian-rag-retrieve` với từ khóa từ hypothesis
- Tìm: đã có research, template, hoặc learnings liên quan chưa?
- **Nếu có**: inject context → tránh duplicate research
- **Nếu không có**: proceed → KB context = empty

### Step 4: Research (Dùng skill `deep-research`)
- Activate `deep-research` skill
- Research 2-3 questions liên quan đến hypothesis
- Ví dụ: "Đối thủ đã làm parallax chưa?", "Best practices cho format này?"
- **Output**: Research report với confidence score

### Step 5: Prototype
Dựa trên design + research, build prototype:
- **Template mới**: Tạo script trong `scripts/templates/`
- **Content format mới**: Tạo sample script + veo prompts
- **Tool mới**: Tạo script trong `scripts/`
- **Dry run**: Test với `--dry-run` nếu có
- **Output**: Working prototype hoặc sample output

### Step 6: Evaluate
So sánh prototype vs baseline:
```markdown
| Criteria | Baseline | Prototype | Verdict |
|----------|----------|-----------|---------|
| Quality  | [current]| [new]     | ✅/❌   |
| Speed    | [current]| [new]     | ✅/❌   |
| Effort   | [current]| [new]     | ✅/❌   |
```
- Nếu ≥2/3 criteria pass → **SHIP**
- Nếu <2/3 → **KILL** hoặc **ITERATE** (max 1 iteration)

### Step 7: Ship or Kill
**SHIP**:
1. Integrate prototype vào pipeline chính
2. Update documentation (README, REGISTRY.md nếu cần)
3. Ghi vào `learnings.md` > "R&D Log": Outcome = "Shipped"

**KILL**:
1. Archive prototype (move to `_archive/` hoặc delete)
2. Ghi vào `learnings.md` > "R&D Log": Outcome = "Killed — [lý do]"
3. **Clean up** — KHÔNG để dead code trong pipeline

### Step 8: Learn (Auto)
Auto-append vào `learnings.md` > "R&D Log":
```
| [Date] | [Topic] | [Ship/Kill] | [Key insight] | [Confidence] |
```

Nếu output quality → trigger `/obsidian-kb-save`.

## ⚠️ Guardrails
- **Time box**: KHÔNG exceed 1 session cho prototype
- **Scope creep**: Nếu scope mở rộng → dừng, tạo sprint mới
- **Clean As You Go**: Prototype files dọn dẹp ngay sau evaluate
- **Max 1 iteration**: Nếu iteration cũng fail → KILL
