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

## Local source and bundle

- Editorial source: `obsidian-kb/<channel>/posts/<post-id>.md`
- Canonical production bundle: `output/fb-posts/<channel>/<post-id>/`

The two `post.md` files may have identical content, but have different roles:
the first is editable knowledge; the second is the hash-bound production input.
Never delete or manually copy either one to "clean up" a post.

## Entry gates and state

The only user-facing production command is the single-ID orchestrator:

```text
python content-planner-kb/scripts/photo_post_produce.py \
  --channel <channel> --id <post-id> --json
```

Add `--execute-flowkit` only after the reference pack has been curated and the
user has authorized the FlowKit run. The orchestrator performs preflight,
materialization, reference validation, FlowKit request, asset validation, and
receipt-backed state transitions in that order. Direct calls to `batch_gen.py`
or `gen_image_post.py` are implementation details and are not valid workflow
steps.

The profile, not the template, controls format, aspect ratio, output name,
text layout, platform caption limits, disclosure/CTA policy, QA evidence, and
lifecycle constraints. A biology post also requires a hash-bound
`references/reference_pack.json`; an image without a FlowKit generation receipt
is `UNVERIFIED`, never generated. A missing/unknown/retired format fails closed.

## Lifecycle

1. Draft + preflight: `DRAFT`.
2. Production post materialized into the canonical bundle, no image: `MATERIALIZED`.
3. Image exists but violates structural checks: `GENERATED_INVALID`.
4. Structurally valid image, awaiting QA: `GENERATED`.
5. Invalid/stale QA receipt: `QA_INVALID`.
6. Hash-bound QA PASS with explicit distribution eligibility: `READY`.
7. Publication receipt plus uploaded flag: `UPLOADED`.

Only `READY` may enter Drive/Notion Buffer. The completion report must print
per-ID `state`, `bundle_path`, `asset path`, and QA/Drive receipts. Missing
receipt means `not performed`, never an inferred success.

After user-confirmed publication, reconcile exact IDs using
`reconcile-uploaded-content.md`; only that workflow may mark `uploaded` and
archive an item.
