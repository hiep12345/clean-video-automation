---
name: programmatic-seo
description: >
  Thiết kế và đánh giá chiến lược programmatic SEO để tạo landing pages tối ưu
  ở quy mô lớn. Feasibility Index, page justification, kill switch criteria.
  Trigger: "programmatic SEO", "scale pages", "template pages", "landing page factory",
  "tạo hàng loạt trang", "pSEO".
metadata:
  version: 1.0.0
  category: seo
  tier: A
  source: adapted from sickn33/antigravity-awesome-skills
---

## Core Principle
Scaling pages does NOT lower the bar for quality. 100 excellent pages > 10,000 weak ones.

## Feasibility Index (0-100)

Trước khi bắt đầu, tính điểm khả thi:

| Category | Weight | Mô tả |
|----------|--------|-------|
| Search Pattern Validity | 20 | Keyword pattern lặp lại, intent nhất quán |
| Unique Value per Page | 25 | Trang có thông tin KHÁC BIỆT thực sự (quan trọng nhất) |
| Data Availability & Quality | 20 | Data chính xác, cập nhật, có thể maintain |
| Search Intent Alignment | 15 | Trang thỏa mãn hoàn toàn intent người tìm |
| Competitive Feasibility | 10 | Đối thủ beatable, không bị brand lớn dominate |
| Operational Sustainability | 10 | Maintain + update khả thi lâu dài |

| Score | Verdict | Action |
|-------|---------|--------|
| 80-100 | **Strong Fit** | Programmatic SEO phù hợp |
| 65-79 | **Moderate Fit** | Proceed với giới hạn scope |
| 50-64 | **High Risk** | Chỉ thử nếu có strong controls |
| <50 | **Do Not Proceed** | STOP — đề xuất alternatives |

## YouTube Affiliate pSEO Applications

| Pattern | Ví dụ | Feasibility |
|---------|-------|-------------|
| Product comparison pages | "X vs Y vs Z" | ⭐⭐⭐ High |
| Best-of lists by category | "Best [product] for [use case]" | ⭐⭐⭐ High |
| Product spec/review pages | "[Product] review 2026" | ⭐⭐ Medium |
| Affiliate deal pages | "[Brand] coupon/discount" | ⭐ Low (thin content risk) |

## Page Justification Rule
> Mỗi trang phải trả lời được: **"Tại sao trang này xứng đáng tồn tại riêng?"**

Nếu câu trả lời không rõ ràng → **KHÔNG index**.

## Template Specification

> **Chi tiết**: Xem `templates.md` trong folder này (URL patterns, page sections, conditional logic)

## Indexation Rules
- NOT all generated pages should be indexed
- Index only pages with: Demand + Unique Value + Complete Intent Match
- Crawl Management: segment sitemaps by page type, monitor indexation rate

## Kill Switch Criteria
HALT indexing hoặc rollback nếu:
- High impressions, low engagement at scale
- Thin content warnings từ GSC
- Index bloat with no traffic
- Manual hoặc algorithmic suppression signals

## Checklist
- [ ] Feasibility Index ≥ 65
- [ ] Mỗi page có unique value rõ ràng
- [ ] Data source identified + refresh plan
- [ ] Template tested với 5-10 pages trước khi scale
- [ ] Indexation rules documented
- [ ] Kill switch criteria defined
- [ ] Schema markup applied (dùng `schema-markup` skill)
