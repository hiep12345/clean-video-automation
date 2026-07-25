---
name: reverse-kpi-calculator
description: >
  Tính KPI ngược từ doanh thu → ngân sách (hoặc xuôi từ ngân sách → doanh thu).
  Output: bảng 3 kịch bản, sensitivity analysis, break-even, phân bổ ngân sách.
  Trigger: "tính KPI", "cần bao nhiêu views", "budget calculator",
  "tính ngược từ revenue", "bao nhiêu traffic để đạt X".
metadata:
  version: 1.0.0
  category: performance
  tier: S
---

## Thu thập thông tin (tối đa 4 câu)

1. **Mục tiêu?** Revenue target/tháng, hoặc budget có sẵn?
2. **Sản phẩm & commission?** AOV, commission rate, recurring hay one-time?
3. **Kênh hiện tại?** YouTube views TB, CTR, conversion data hiện có?
4. **Thời gian?** 1 tháng, 3 tháng, hay 6 tháng?

> Đọc `.agents/product-marketing-context.md` trước nếu có.

---

## Hướng 1: Tính ngược (Revenue → Traffic)

```
Revenue mục tiêu
  ÷ AOV (commission trung bình/sale)
  = SỐ SALES CẦN
  ÷ Conversion rate (click → sale)
  = SỐ CLICKS CẦN
  ÷ CTR (impression → click)
  = SỐ IMPRESSIONS CẦN
  ÷ Avg views/video
  = SỐ VIDEOS CẦN/THÁNG
```

## Hướng 2: Tính xuôi (Traffic → Revenue)

```
Số videos/tháng × Avg views
  = TỔNG IMPRESSIONS
  × CTR
  = SỐ CLICKS DỰ KIẾN
  × Conversion rate
  = SỐ SALES DỰ KIẾN
  × AOV
  = REVENUE DỰ KIẾN
```

---

## Benchmarks tham khảo (US/UK/Canada)

### YouTube Affiliate
| Metric | Poor | Average | Good | Excellent |
|--------|------|---------|------|-----------|
| CTR (impression → click) | <2% | 2-5% | 5-10% | >10% |
| Affiliate link CTR | <1% | 1-3% | 3-6% | >6% |
| Conversion rate | <1% | 1-3% | 3-7% | >7% |
| RPM (Revenue/1K views) | <$2 | $2-8 | $8-20 | >$20 |

### Paid Ads (nếu chạy)
| Channel | CPC Poor | CPC Avg | CPC Good |
|---------|----------|---------|----------|
| Google Ads | >$3 | $1-3 | <$1 |
| Meta Ads | >$2 | $0.5-2 | <$0.5 |
| YouTube Ads (CPV) | >$0.10 | $0.03-0.10 | <$0.03 |

---

## Output: Bảng 3 kịch bản

| Chỉ số | Pessimistic | Base | Optimistic |
|--------|-------------|------|------------|
| Revenue target | — | — | — |
| AOV/commission | — | — | — |
| **Sales cần** | — | — | — |
| Conversion rate | Base −30% | Benchmark | Base +30% |
| **Clicks cần** | — | — | — |
| CTR | Base −30% | Benchmark | Base +30% |
| **Views cần** | — | — | — |
| Videos/tháng | — | — | — |
| **ROAS dự kiến** | — | — | — |

**Đọc kết quả**: Dùng Base để lập kế hoạch. Pessimistic để dự phòng. Optimistic để đặt mục tiêu.

## Sensitivity Analysis

| Biến | Thay đổi +20% | Budget impact | Khả năng cải thiện |
|------|---------------|---------------|-------------------|
| CTR | +20% | −17% clicks cần | Dễ — test thumbnail/title |
| Conv. rate | +20% | −17% traffic cần | TB — test CTA, review quality |
| AOV | +20% | −17% sales cần | Khó — chọn sản phẩm giá cao hơn |
| Views/video | +20% | −17% videos cần | TB — SEO, consistency |

**Quy tắc 80/20**: 2 biến dễ cải thiện nhất thường là CTR (thumbnail) và Conv. rate (CTA placement).

## Break-even

| Hạng mục | Giá trị |
|----------|---------|
| Chi phí cố định/tháng | Tools + hosting + content production |
| Revenue/video TB | Views × CTR × Conv × AOV |
| **Break-even videos** | Chi phí / Revenue per video |

## Checklist
- [ ] Xác định đúng hướng tính (ngược/xuôi)
- [ ] Benchmark đúng kênh, đúng niche
- [ ] Đủ 3 kịch bản: Pessimistic, Base, Optimistic
- [ ] Sensitivity analysis chỉ ra biến ảnh hưởng nhất
- [ ] Break-even được tính và đánh giá
- [ ] Timeline thực tế — không hứa ROI cao từ tháng 1
