---
name: photo-post-production
description: "Khung chung để tạo, QA và phân phối photo post theo channel profile động"
---

# Photo-post production

Use this workflow for every request to create, review, explain, prepare, or
distribute a photo post. Never answer from memory: resolve the declared channel
and format through `content-planner-kb/config/photo-post-profiles.json` first.
The resolved profile always controls `render_strategy`, evidence requirements,
lifecycle gates, and platform policy.

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
user has authorized the FlowKit run through the Google Labs execution path.
The orchestrator performs preflight, materialization, reference validation,
FlowKit request, asset validation, and receipt-backed state transitions in that
order. Direct calls to `batch_gen.py` or `gen_image_post.py` are implementation
details and are not valid workflow steps. Never substitute a paid external
generation API.

### Channel contracts

Templates remain separate per channel because they are editorial and handoff
contracts, not a replacement for the profile registry:

- Botanical Killers:
  `obsidian-kb/00-Templates/botanical-killers/photo-bk-infographic-v3.md`
- Mix Therapy:
  `obsidian-kb/00-Templates/mix-therapy/photo-mt-recipe-v3.md`
- Science Unlocked:
  `obsidian-kb/00-Templates/science-unlocked/photo-su-scientific-editorial-v2.md`

BK, MT, and SU use the one-step, prompt-owned Nano typography method declared
by their profiles, but retain distinct channel layouts and evidence contracts.
All visible copy must come from the editorial exact-copy fields and be rendered
exactly once in that generation step. Agents must not add a compositor overlay
or invent ad hoc visible copy in the prompt.

CD and HD keep the deterministic typography strategy declared by their
profiles. Never force one renderer or typography method across all channels.

For SU, visual morphology evidence is limited to traits actually observable in
the exact reference. Quantitative or count claims are verified separately
through authoritative claim sources; a single morphology reference need not
show the full claimed quantity. Use two or three clear callouts mapped to an
anatomical region or declared visible trait. Exact-pixel contact is not
required, but an empty or ambiguous target fails. A prompt-native footer rail
or shelf is allowed only at no more than 6% of image height, without morphology
occlusion and without becoming a card, dashboard, or large lower panel/bar.

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
5. Valid schema-v5 independent QA, awaiting coordinator: `QA_REVIEWED`.
6. Invalid/stale QA or parent receipt: `QA_INVALID`.
7. Quarantined asset without verified provenance: `UNVERIFIED_LEGACY`.
8. Hash-bound QA plus independent coordinator acceptance: `READY`.

For every generated ID, the coordinator creates a `PENDING` task assigned to
`production-executor` and invokes that sub-agent. The specialist, not the
parent, atomically starts the task:

```text
python content-planner-kb/scripts/team_preflight.py \
  --task <production-task-id> --role production-executor \
  --trajectory <current-trajectory> \
  --resource workflow:photo-post \
  --resource artifact:<channel>:<post-id> \
  --resource path:output/fb-posts/<channel>/<post-id> \
  --claim --json
```

Only after this passes may it call
`photo_post_produce.py --execute-flowkit --production-task-id ...`.
After generation completes, the coordinator creates a dependent `PENDING` QA
task assigned to `qa-reviewer` and invokes a fresh trajectory. That specialist
must claim a distinct QA resource before using
`photo_post_review.py --qa-task-id ...`:

```text
python content-planner-kb/scripts/team_preflight.py \
  --task <qa-task-id> --role qa-reviewer \
  --trajectory <fresh-qa-trajectory> \
  --resource qa:<channel>:<post-id> --claim --json
```

The production command cannot write a PASS; the review command is the only
supported writer of `review_results.json`. The review command does not accept
`--score`: schema-v5 computes it from fixed checks. A failed preflight/claim or
missing specialist blocks the batch; the parent may not impersonate either
role.

After QA reaches `QA_REVIEWED`, the coordinator opens the exact generated
artifact and every exact local biology reference with `view_file`, records
specific findings and zero critical defects, and runs:

```text
python content-planner-kb/scripts/photo_post_accept.py \
  --channel <channel> --id <post-id> --decision ACCEPT \
  --evidence-file <parent-evidence.json> --json
```

`READY` requires all of the following at the same revision: schema-v2
real-photo reference evidence where configured, FlowKit media IDs, schema-v2
generation receipt, production task/trajectory binding, schema-v5
machine-scored QA receipt, distinct dependent QA task/trajectory binding,
tracker-bound receipt hashes, and a parent acceptance hash-bound by a third
trajectory. A plausible receipt without those bindings is
`GENERATED_INVALID`, `QA_REVIEWED`, or `QA_INVALID`.
9. Publication receipt plus uploaded flag: `UPLOADED`.

Only `READY` may enter Drive/Notion Buffer. `UNVERIFIED_LEGACY` is blocked
from every downstream gate. Platform publishing remains `manual-only`. The
completion report must print per-ID `state`,
`bundle_path`, `asset path`, and QA/Drive receipts. Missing
receipt means `not performed`, never an inferred success.

After user-confirmed publication, reconcile exact IDs using
`reconcile-uploaded-content.md`; only that workflow may mark `uploaded` and
archive an item.
