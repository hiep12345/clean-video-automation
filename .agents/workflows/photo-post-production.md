---
name: photo-post-production
description: "Khung chung để tạo, QA và phân phối photo post theo channel profile động"
---

# Photo-post production

Use this workflow for every request to create, review, explain, prepare, or
distribute a photo post. Never answer from memory: resolve the declared channel
and format through `content-planner-kb/config/photo-post-profiles.json` first.

## Required inputs

- `channel` (channel slug)
- exact `post.md` path or post ID resolved to it
- target platform

## Entry gates

```text
python content-planner-kb/scripts/photo_post_preflight.py \
  --channel <channel> --post <path-to-post.md> --platform facebook
python content-planner-kb/scripts/photo_post_generate.py \
  --channel <channel> --post <path-to-post.md>
```

The profile, not the template, controls format, aspect ratio, output name,
text layout, platform caption limits, disclosure/CTA policy, QA evidence, and
lifecycle constraints. A missing/unknown/retired format fails closed.

## Lifecycle

1. Author a `post.md` with `channel` and `format_code` frontmatter.
2. Run preflight; failure blocks generation.
3. Generate only the exact post through the policy-aware generator.
4. Get independent, hash-bound photo QA. Biology channels require morphology
   and claim-source evidence; only PASS can become Ready.
5. Use the existing Drive/Notion eligibility gate. Facebook publishing is
   manual-only.
6. After user-confirmed publication, reconcile exact IDs using
   `reconcile-uploaded-content.md`; only that workflow may mark `uploaded` and
   archive an item.
