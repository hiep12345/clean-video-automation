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

- Unvalidated intake source: `content-planner-kb/intake/photo-posts/<channel>/<post-id>.md`
- Curated knowledge destination (after validation): `obsidian-kb/<channel>/posts/<post-id>.md`
- Canonical production bundle: `output/fb-posts/<channel>/<post-id>/`

The intake draft and bundle `post.md` have different roles: the intake file is
unvalidated working input; the bundle copy is hash-bound production input.
Obsidian notes are promoted only after the validation gates pass. Never use
Obsidian as an intake folder or manually copy drafts into the vault.

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

### Short quantity trigger

The operator may request a quantity with only:

```text
Sản xuất <N> photo <CHANNEL>
```

Example: `Sản xuất 5 photo MT`.

Antigravity 2 must treat this as a coordinator shorthand, not ask the operator
to restate paths, commands, QA rules, or storage rules. Expand it into a
sequential list of unique post IDs. For each ID, create the intake draft, run
preflight, call the single-ID orchestrator, request independent QA for the
exact asset revision, and read lifecycle status. Do not generate in parallel,
do not run a runtime reset/archive during the production run, and stop on the
first failed gate unless the user explicitly requests continue-on-error.

The completion report must be per ID. Only `READY` IDs count as completed;
missing or stale evidence is a blocker, never a batch-level PASS.

For Botanical Killers, resolve the current profile before generation:
`BK-F01-INFOGRAPHIC-V3` is a single square `1:1` infographic. FlowKit receives
the complete editorial prompt and renders every visible text element; do not
add text with a compositor or create a second image variant. The legacy
`BK-F01-SINGLE` profile is for historical/quarantined material only.
The only active BK photo template is `obsidian-kb/00-Templates/botanical-killers/photo-bk-infographic-v3.md`.
For Mix Therapy, use `obsidian-kb/00-Templates/mix-therapy/photo-mt-single.md`: square `1:1`, all visible copy rendered by the FlowKit prompt, and no compositor overlay. Do not use the archived carousel template unless a profile is explicitly enabled.

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
6. Quarantined asset without verified provenance: `UNVERIFIED_LEGACY`.
7. Hash-bound QA PASS with explicit distribution eligibility: `READY`.
8. Publication receipt plus uploaded flag: `UPLOADED`.

Only `READY` may enter Drive/Notion Buffer. `UNVERIFIED_LEGACY` is blocked
from every downstream gate. The completion report must print per-ID `state`,
`bundle_path`, `asset path`, and QA/Drive receipts. Missing
receipt means `not performed`, never an inferred success.

After user-confirmed publication, reconcile exact IDs using
`reconcile-uploaded-content.md`; only that workflow may mark `uploaded` and
archive an item.
