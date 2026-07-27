---
name: photo-post-production
description: "Khung xương chuẩn cho create/review/distribute photo post, nạp policy động theo channel và format."
risk: safe
updated: "2026-07-27"
---

# Photo-post production

Use this skill for every request involving a photo post: creating one,
explaining the current process, reviewing readiness, preparing metadata, or
reconciling an already-published item. Do not answer from a remembered channel
rule or by copying a template's static policy text.

## Dynamic sources of truth

1. `content-planner-kb/config/photo-post-profiles.json` is the policy registry.
   It defines enabled channels, formats, rendering layout, platform rules, QA
   evidence, and lifecycle gates.
2. `post.md` supplies the exact `channel` and `format_code` in frontmatter,
   plus creative content.
3. The channel template supplies structure only. If it conflicts with the
   profile, the profile wins.

## Mandatory preflight

Before generation, a readiness statement, or a process explanation for a
specific post, run:

```text
python content-planner-kb/scripts/photo_post_preflight.py \
  --channel <channel> --post <path-to-post.md> --platform <platform>
```

Unknown or retired formats, unconfigured platforms, missing disclosure,
over-limit hashtags, forbidden engagement CTAs, and missing required fields
must fail closed.

## Standard lifecycle

1. Write the unvalidated editorial draft at `content-planner-kb/intake/photo-posts/<channel>/<post-id>.md`.
   Its only valid state is `DRAFT` after preflight passes. Never write drafts
   into `obsidian-kb/`; that vault is curated, validated knowledge.
2. Run the single production orchestrator. It owns materialization, reference
   validation, FlowKit generation, hash-bound generation receipt, and state:

   ```text
   python content-planner-kb/scripts/photo_post_produce.py \
     --channel <channel> --id <post-id> --json
   ```

3. For an explicitly authorized FlowKit run, add `--execute-flowkit`. The
   command uploads only curated reference files recorded in the bundle's
   `references/reference_pack.json`, then sends their FlowKit media IDs with
   the prompt. It never discovers or downloads references implicitly.
4. Do not call `batch_gen.py` or `gen_image_post.py` as a user-facing step; they
   are implementation modules behind the orchestrator. Do not hand-copy files
   or create alternate output folders.
   For Botanical Killers, the active default is `BK-F01-INFOGRAPHIC-V3`: one
   square `1:1` image (`image.png`) rendered by FlowKit from the editorial
   prompt. The prompt owns all visible copy (category tag, headline, subline,
   labels, and footer); code/compositor text overlays are forbidden for V3.
   `BK-F01-SINGLE` is retained only for historical bundles and is not the
   current BK production format.
   The canonical editable template is `obsidian-kb/00-Templates/botanical-killers/photo-bk-infographic-v3.md`; other BK photo templates are archive-only.
5. Read the evidence-derived state after every stage:

   ```text
   python content-planner-kb/scripts/photo_post_lifecycle.py status \
     --channel <channel> --id <post-id> --json
   ```

   Never write `Ready`, `Drive eligible`, or `Notion Buffer ready` unless this
   command returns `state: READY` and `ready: true`.
6. Run independent hash-bound photo QA. Biology channels require a real-world
   morphology reference and accessible claim sources. Invalid dimensions,
   missing FlowKit provenance, or missing receipts produce
   `GENERATED_INVALID`/`QA_INVALID`, not `READY`.
7. `UNVERIFIED_LEGACY` is quarantine-only: it cannot enter QA, Drive,
   Notion Buffer, or publication. Only `READY` may enter the existing
   Drive/Notion gate. Facebook stays manual-only. After user-confirmed
   publication, use exact-ID reconciliation; do not infer publication or move
   folders by hand.

## Non-negotiable policy precedence

Platform limits (for example Facebook's hashtag cap) belong in the profile and
are never copied from a template. This prevents stale template text from
overriding current distribution policy.
