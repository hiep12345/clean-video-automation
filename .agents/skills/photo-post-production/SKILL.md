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

1. Write the editorial draft at `obsidian-kb/<channel>/posts/<post-id>.md`.
   Its only valid state is `DRAFT` after preflight passes.
2. Materialize it into the canonical local bundle; do not hand-copy files:

   ```text
   python content-planner-kb/scripts/photo_post_lifecycle.py materialize \
     --channel <channel> --id <post-id> --json
   ```

3. Generate only into that bundle using the bounded batch generator:

   ```text
   python content-planner-kb/scripts/batch_gen.py <channel> --id <post-id>
   ```

4. Read the evidence-derived state after every stage:

   ```text
   python content-planner-kb/scripts/photo_post_lifecycle.py status \
     --channel <channel> --id <post-id> --json
   ```

   Never write `Ready`, `Drive eligible`, or `Notion Buffer ready` unless this
   command returns `state: READY` and `ready: true`.
5. Run independent hash-bound photo QA. Biology channels require a real-world
   morphology reference and accessible claim sources. Invalid dimensions or
   missing receipts produce `GENERATED_INVALID`/`QA_INVALID`, not `READY`.
6. Only `READY` may enter the existing Drive/Notion gate. Facebook stays
   manual-only. After user-confirmed publication, use exact-ID reconciliation;
   do not infer publication or move folders by hand.

## Non-negotiable policy precedence

Platform limits (for example Facebook's hashtag cap) belong in the profile and
are never copied from a template. This prevents stale template text from
overriding current distribution policy.
