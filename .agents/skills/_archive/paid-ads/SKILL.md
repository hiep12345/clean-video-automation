---
name: paid-ads
description: >
  Expert performance marketer — tạo, tối ưu, scale paid ad campaigns.
  Google Ads, Meta, LinkedIn, TikTok, Twitter/X.
  Trigger: "paid ads", "chạy quảng cáo", "Google Ads", "Meta Ads", "campaign setup".
metadata:
  version: 2.0.0
  category: marketing
  tier: A
---

## Before Starting

**Check `.agents/product-marketing-context.md` first** — dùng context có sẵn, chỉ hỏi thêm nếu thiếu.

Gather context (ask if not provided):
1. **Campaign Goals**: Objective, target CPA/ROAS, budget, constraints
2. **Product & Offer**: What you're promoting, landing page, USP
3. **Audience**: ICP, problems solved, interests, existing data
4. **Current State**: Previous ads, pixel data, funnel conversion rate

## Platform Selection

| Platform | Best For | Use When |
|----------|----------|----------|
| **Google Ads** | High-intent search | People actively search for your solution |
| **Meta** | Demand gen, visual | Creating demand, strong creative assets |
| **LinkedIn** | B2B targeting | Decision-makers, job title targeting |
| **TikTok** | Young demographics | 18-34, native video, brand awareness |
| **Twitter/X** | Tech audiences | Timely content, lower CPMs |

**Campaign types per platform**: Search, Performance Max, Advantage+, Sponsored Content, etc.

## Campaign Structure

```
Account
├── Campaign: [Objective] - [Audience/Product]
│   ├── Ad Set: [Targeting variation]
│   │   ├── Ad 1-3: [Creative variations]
│   └── Ad Set: [Targeting variation]
└── Campaign 2...
```

**Naming**: `[Platform]_[Objective]_[Audience]_[Offer]_[Date]`

**Budget Allocation**:
- Testing (first 2-4 weeks): 70% proven / 30% testing
- Scaling: Consolidate winners, increase 20-30% per step, wait 3-5 days

## Core Optimization Loop

**If CPA too high**: Check landing page → tighten targeting → new creative → improve quality score
**If CTR low**: New hooks/angles → refine targeting → refresh creative → improve offer
**If CPM high**: Expand targeting → different placements → improve creative fit

**Bid progression**: Manual → gather data (50+ conversions) → automated (Target CPA/ROAS)

## Weekly Review Checklist

- [ ] Spend vs. budget pacing
- [ ] CPA/ROAS vs. targets
- [ ] Top/bottom performing ads
- [ ] Audience performance breakdown
- [ ] Frequency check (fatigue risk)
- [ ] Landing page conversion rate

## References (Progressive Disclosure)

> Chi tiết được tách ra file riêng — chỉ đọc khi cần deep-dive:

- **[Ad Copy Frameworks](references/ad-copy-frameworks.md)**: PAS, BAB, Social Proof, headline & CTA formulas
- **[Audience Targeting](references/audience-targeting.md)**: Google, Meta, LinkedIn audience strategies
- **[Creative Best Practices](references/creative-best-practices.md)**: Image/video ads, testing hierarchy, common mistakes
- **[Optimization & Reporting](references/optimization-reporting.md)**: Metrics, retargeting, bid strategies, attribution
- **[Platform Setup Checklists](references/platform-setup-checklists.md)**: Google, Meta, LinkedIn setup checklists

## Related Skills

- **ad-creative**: Headlines, descriptions, creative at scale
- **copywriting**: Landing page copy that converts
- **analytics-tracking**: Conversion tracking setup
- **ab-test-setup**: Landing page A/B testing
