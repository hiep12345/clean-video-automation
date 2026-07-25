---
name: analytics-tracking
description: >
  Thiết kế, audit, và cải thiện hệ thống analytics tracking. Đảm bảo data
  đáng tin cậy, decision-ready. GA4, YouTube Analytics, affiliate dashboards.
  Trigger: "setup analytics", "tracking", "GA4", "UTM", "conversion tracking",
  "đo lường", "event tracking".
metadata:
  version: 1.0.0
  category: data
  tier: A
  source: adapted from sickn33/antigravity-awesome-skills
---

## Core Principle
Track for DECISIONS, not curiosity. If no decision depends on it, don't track it.

## Measurement Readiness Index (0-100)

| Category | Weight | Mô tả |
|----------|--------|-------|
| Decision Alignment | 25 | Mỗi event map tới 1 decision |
| Event Model Clarity | 20 | Events = meaningful actions, naming consistent |
| Data Accuracy | 20 | Không duplicate, fire reliable, values correct |
| Conversion Quality | 15 | Conversions = real value, counting intentional |
| Attribution & Context | 10 | UTMs consistent, source preserved |
| Governance | 10 | Documented, owned, versioned |

| Score | Verdict | Action |
|-------|---------|--------|
| 85-100 | Measurement-Ready | Safe to optimize |
| 70-84 | Usable with Gaps | Fix trước khi quyết định lớn |
| 55-69 | Unreliable | Data chưa đáng tin |
| <55 | Broken | STOP — fix tracking trước |

## YouTube Affiliate Tracking Setup

### Events cần track

**Navigation/Exposure:**
- `video_published` — video mới lên
- `description_link_clicked` — affiliate link trong description

**Intent Signals:**
- `affiliate_link_clicked` — click vào affiliate link
- `pinned_comment_clicked` — click link trong pinned comment

**Completion/Conversion:**
- `affiliate_purchase` — mua hàng qua link
- `subscription_gained` — sub mới

### UTM Convention cho Affiliate Links

```
?utm_source=youtube
&utm_medium=affiliate
&utm_campaign=[video-slug]
&utm_content=[link-position: description|pinned|card]
```

### Tracking Plan Template

| Event | Description | Properties | Trigger | Decision |
|-------|-------------|------------|---------|----------|
| affiliate_click | Click affiliate link | video_id, product, position | Link click | Optimize CTA placement |
| video_publish | Video published | category, niche, type | Upload | Content frequency tracking |
| revenue_event | Affiliate sale | product, amount, commission | Sale confirmed | ROI per video |

## Audit Checklist
- [ ] Tất cả affiliate links có UTM parameters
- [ ] YouTube Analytics connected + verified
- [ ] Affiliate dashboard data matches expectations
- [ ] No duplicate events
- [ ] Conversion counting: once per user per session
- [ ] Tracking documented (event → decision mapping)
- [ ] Monthly data quality review scheduled

<!-- meta: verified=2026-05-02 | depends_on=[GA4, YouTube Analytics] | decay=medium -->