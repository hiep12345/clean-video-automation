---
name: ad-creative
description: >
  Tạo, iterate, scale paid ad creative cho Google Ads, Meta, LinkedIn, TikTok, Twitter/X.
  Headlines, descriptions, primary text, ad variations cho testing & optimization.
  Trigger: "ad copy", "headlines", "ad creative", "RSA", "ad variations".
metadata:
  version: 2.0.0
  category: marketing
  tier: A
  source: adapted from coreyhaines31/marketingskills
---

## Before Starting

**Check `.agents/product-marketing-context.md` first.**

Gather context (ask if not provided):
1. **Platform & Format**: Google Ads/Meta/LinkedIn/TikTok? Search RSA/display/social/video?
2. **Product & Offer**: What's promoted, core value prop, differentiation
3. **Audience & Intent**: Target audience, awareness stage, pain points
4. **Performance Data** (if iterating): Current creative, top/bottom performers, tested angles
5. **Constraints**: Brand voice, compliance, mandatory elements

## Two Modes

### Mode 1: Generate from Scratch
Full ad creative set based on product context + audience insights + platform best practices.

### Mode 2: Iterate from Performance Data
Analyze winners → identify patterns → generate new variations building on what works.

```
Pull data → Identify winning patterns → Generate variations → Validate specs → Deliver
```

## Step 1: Define Angles (3-5)

| Category | Example |
|----------|---------|
| Pain point | "Stop wasting time on X" |
| Outcome | "Achieve Y in Z days" |
| Social proof | "Join 10,000+ teams who..." |
| Curiosity | "The X secret top companies use" |
| Comparison | "Unlike X, we do Y" |
| Urgency | "Limited time: get X free" |
| Identity | "Built for [specific role]" |
| Contrarian | "Why [common practice] doesn't work" |

## Step 2: Generate Variations per Angle

Vary: word choice, specificity (numbers vs general), tone (direct/question/command), structure (short punch vs full statement).

## Step 3: Validate Against Specs

Check every piece against platform character limits. Flag over-limit → provide trimmed alternative.
> **Platform limits**: See [references/platform-specs.md](references/platform-specs.md)

## Step 4: Iterate from Data

**Analyze Winners**: themes, structures, word patterns, character utilization
**Analyze Losers**: flat themes, patterns in low performers
**Generate New**: double down on winning themes + test 1-2 new angles + avoid loser patterns

## Writing Quality

**Strong headlines**: Specific ("Cut reporting time 75%") > vague ("Save time"). Benefits > features. Active voice. Include numbers.
**Descriptions**: Complement headlines (don't repeat). Add proof, handle objections, reinforce CTA.

**Avoid**: Jargon, unspecific claims ("Best", "Leading"), clickbait landing page can't deliver.

## Batch Generation (Scale)

1. Break into sub-tasks: headlines, descriptions, primary text
2. Waves: Core angles (5 each) → Extended on top 2 → Wild cards
3. Quality filter: remove over-limit, duplicates, policy violations

## References (Progressive Disclosure)

- **[Platform Specs & Output Formats](references/platform-specs.md)**: Character limits, CSV format, iteration report template
- **[Generative Tools](references/generative-tools.md)**: Image/video/voice AI tools, Remotion, cost comparison

## Related Skills

- **paid-ads**: Campaign strategy, targeting, budgets
- **copywriting**: Landing page copy
- **ab-test-setup**: Creative test structure
- **marketing-psychology**: Psychology behind high-performing creative
