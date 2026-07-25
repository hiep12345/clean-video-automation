# pSEO Page Templates & URL Patterns

> Tách riêng từ SKILL.md để giữ process lean. Load on-demand (Level 3).

## URL Patterns

### Product Comparison
```
/best-{category}-for-{use-case}/
Ví dụ: /best-headphones-for-gaming/
```

### Best-of Lists
```
/best-{product}-{year}/
Ví dụ: /best-wireless-earbuds-2026/
```

### Product Review Landing
```
/{product-name}-review/
Ví dụ: /sony-wh-1000xm5-review/
```

## Page Template Specification

```markdown
## Required Sections
1. Intro (unique per page — KHÔNG copy-paste)
2. Selection criteria (specific to use case)
3. Product comparisons (data-driven, bảng so sánh)
4. Verdict + recommendation (1 winner rõ ràng)
5. FAQ (use case specific, 3-5 câu hỏi)
6. Affiliate CTA (link + disclosure)

## Conditional Logic
- If product < 3 options → noindex
- If no affiliate program → mark informational only
- If data > 6 months old → flag for update
- If search volume < 100/mo → skip page
```

## Sitemap Segmentation

```xml
<!-- Segment sitemaps by type -->
<sitemap>
  <loc>https://example.com/sitemap-comparisons.xml</loc>
</sitemap>
<sitemap>
  <loc>https://example.com/sitemap-reviews.xml</loc>
</sitemap>
<sitemap>
  <loc>https://example.com/sitemap-best-of.xml</loc>
</sitemap>
```
