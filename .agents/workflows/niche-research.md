---
description: "Nghiên cứu niche mới: demand → competition → monetization → content gap."
skills: [deep-research]
---

# /niche-research

> **Mục tiêu**: Đánh giá niche tiềm năng trước khi commit resources
> **Khi nào dùng**: Khi cân nhắc niche mới hoặc sub-niche
> **Skills**: deep-research

## Bước 1: Define & Validate niche
- **Goal**: Làm rõ niche + kiểm tra demand thực tế
- **Skills**: `deep-research`
- **Actions**:
  1. Clarify: niche là gì, khách hàng là ai, problem gì?
  2. Search volume check: keyword research cho niche
  3. Google Trends: niche đang tăng hay giảm?
  4. Reddit/Forum check: có community active không?
- **Output**: Niche definition + demand validation
- **Prompt**: `"Nghiên cứu niche [tên niche] cho affiliate YouTube"`

## Bước 2: Competition analysis
- **Goal**: Đánh giá mức độ cạnh tranh + gaps
- **Skills**: `deep-research`, `/obsidian-rag-retrieve` (Competitive-Landscape-Framework.md)
- **Actions**:
  1. Top 10 YouTube channels trong niche (subs, views, frequency)
  2. Content gap: chủ đề nào chưa ai cover tốt?
  3. Quality gap: video quality hiện tại cao hay thấp?
  4. Barrier to entry: cần gì để cạnh tranh?
- **Output**: Competitor matrix + gap opportunities

## Bước 3: Monetization potential
- **Goal**: Ước tính revenue potential từ niche
- **Skills**: `deep-research`
- **Actions**:
  1. Affiliate programs available: Amazon, brand-direct, networks
  2. Commission rates + AOV cho sản phẩm trong niche
  3. RPM estimates (AdSense + Affiliate combined)
  4. Chạy reverse KPI: cần bao nhiêu views cho $X/tháng?
- **Output**: Monetization assessment + revenue estimate

## Bước 4: Content strategy fit
- **Goal**: Đánh giá khả năng sản xuất content
- **Skills**: `/obsidian-rag-retrieve` (Content-Strategy-Framework.md)
- **Actions**:
  1. Có thể dùng AI content (voiceover, B-roll) không?
  2. Frequency target: bao nhiêu videos/tuần?
  3. Content pillar: 3-5 chủ đề chính cho niche
  4. Evergreen vs trending content ratio
- **Output**: Content feasibility assessment

## Bước 5: Go/No-Go decision
- **Goal**: Quyết định có nên enter niche hay không
- **Actions**:
  1. Scoring: Demand (1-5) × Competition (1-5) × Monetization (1-5) × Fit (1-5)
  2. Score ≥ 48 → GO, 32-47 → RESEARCH thêm, <32 → SKIP
  3. Nếu GO: tạo content plan 30 ngày đầu
- **Output**: Go/No-Go recommendation + rationale

## Quality Gate
- [ ] Có data search volume thực tế (không đoán)
- [ ] Đã phân tích ≥5 competitors
- [ ] Monetization estimate dựa trên benchmarks thực
- [ ] Content feasibility realistic cho solopreneur

## 📚 Auto-Save → Obsidian KB
- **Điều kiện**: Luôn lưu (niche research = high-value data)
- **Nội dung lưu**: Go/No-Go decision + scoring + competitor matrix + gaps
- **Action**: Chạy `/obsidian-kb-save` sau bước 5 — folder theo routing table trong obsidian-kb-save.md
