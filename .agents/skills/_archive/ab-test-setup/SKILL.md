---
name: ab-test-setup
description: >
  Thiết kế A/B test có hệ thống: hypothesis, variants, sample size, significance,
  decision rules. Áp dụng cho content, ads, landing pages, email.
  Trigger: "A/B test", "test thumbnail", "test title", "so sánh 2 phiên bản",
  "nên dùng A hay B", "split test".
metadata:
  version: 1.0.0
  category: performance
  tier: A
---

## Thu thập thông tin (tối đa 3 câu)

1. **Test gì?** (thumbnail, title, CTA, landing page, email subject, ad copy)
2. **Metric chính?** (CTR, conversion rate, revenue, watch time)
3. **Traffic hiện tại?** (views/ngày, visits/ngày — để tính sample size)

---

## Framework: 6 bước A/B Test

### Bước 1: Hypothesis
Format chuẩn:
```
Nếu [thay đổi X] thì [metric Y] sẽ [tăng/giảm Z%]
vì [lý do dựa trên data/insight].
```

Ví dụ:
```
Nếu dùng thumbnail có mặt người (thay vì text-only)
thì CTR sẽ tăng 25%
vì data 3 tháng gần cho thấy videos có face avg CTR 6.2% vs 4.1%.
```

### Bước 2: Variants

| | Variant A (Control) | Variant B (Test) |
|-|---------------------|------------------|
| Mô tả | Phiên bản hiện tại | Phiên bản mới |
| Khác biệt | — | **CHỈ 1 yếu tố** thay đổi |
| Screenshot/mockup | [mô tả] | [mô tả] |

> ⚠️ **Quy tắc vàng**: Chỉ test 1 biến/lần. Test nhiều biến = không biết cái nào gây ra kết quả.

### Bước 3: Sample Size & Duration

| Thông số | Giá trị |
|----------|---------|
| Baseline metric | [CTR hiện tại: X%] |
| Minimum Detectable Effect (MDE) | [muốn phát hiện thay đổi ≥ Y%] |
| Significance level (α) | 0.05 (95% confidence) |
| Power (1-β) | 0.80 |
| **Sample size/variant** | [tính từ các thông số trên] |
| Traffic/ngày | [X impressions hoặc visits] |
| **Duration tối thiểu** | Sample size ÷ Traffic/ngày |

**Quy tắc nhanh** (khi không tính chi tiết):
- CTR test: tối thiểu 1,000 impressions/variant
- Conversion test: tối thiểu 100 conversions/variant
- Revenue test: tối thiểu 2 tuần data

### Bước 4: Setup & Tracking

**YouTube thumbnail/title test**:
- Phương pháp: Upload → đo 48h → đổi variant → đo 48h
- Hoặc: dùng YouTube A/B testing tools (TubeBuddy, VidIQ)
- Track: CTR từ YouTube Analytics → Impressions tab

**Ads test**:
- Split traffic 50/50, cùng audience, cùng budget
- Track: platform analytics (Meta, Google)

**Landing page/email test**:
- Redirect tool (Google Optimize, Optimizely) hoặc email platform built-in
- Track: conversion events

### Bước 5: Decision Rules

| Kết quả | Hành động |
|---------|-----------|
| Variant B thắng > MDE, p < 0.05 | ✅ **ADOPT** — triển khai Variant B |
| Variant B thắng nhưng p > 0.05 | ⏳ **EXTEND** — chạy thêm 1 tuần |
| Chênh lệch < 5% | 🟰 **NO DIFF** — giữ nguyên, test yếu tố khác |
| Variant B thua > 10% | ❌ **REJECT** — bỏ Variant B |

### Bước 6: Document & Learn

```markdown
## Test Log: [Tên test]
- Date: [start] → [end]
- Hypothesis: [...]
- Result: [Variant A: X% vs Variant B: Y%, p = Z]
- Decision: [ADOPT/REJECT/EXTEND]
- Learning: [Insight rút ra cho lần test sau]
```

---

## Template A/B Test phổ biến cho YouTube Affiliate

| Test | Variant A | Variant B | Metric | MDE |
|------|-----------|-----------|--------|-----|
| Thumbnail face | No face | With face | CTR | 20% |
| Title format | "Best X for Y" | "X vs Y: Which is Better?" | CTR | 15% |
| CTA placement | End of video | Mid-roll | Affiliate clicks | 25% |
| Link position | Description top | Pinned comment | Affiliate clicks | 20% |
| Video length | <10 min | 15-20 min | Watch time + conv | 10% |
| Hook style | Problem-first | Result-first | Retention 30s | 15% |

---

## Sai lầm phổ biến

1. ❌ **Dừng test sớm** khi thấy 1 variant đang thắng → cần đủ sample size
2. ❌ **Test nhiều biến cùng lúc** → không biết cái nào ảnh hưởng
3. ❌ **Không ghi chép** → mất insights, test lại cùng thứ
4. ❌ **Sample size quá nhỏ** → kết quả không đáng tin
5. ❌ **Bỏ qua seasonality** → so sánh weekday vs weekend = sai

## Checklist
- [ ] Hypothesis rõ ràng (If/Then/Because)
- [ ] Chỉ 1 biến thay đổi giữa 2 variants
- [ ] Sample size đủ lớn + duration đủ dài
- [ ] Decision rules xác định TRƯỚC khi chạy
- [ ] Kết quả được document vào test log
- [ ] Insights được ghi nhận cho lần test sau

<!-- meta: verified=2026-05-02 | depends_on=[] | decay=slow -->