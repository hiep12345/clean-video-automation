---
name: photo-post-production
description: "Khung xương chuẩn cho create/review/distribute photo post, nạp policy động theo channel và format."
---

# Photo-post production

Use this skill for every request involving a photo post: creating one,
explaining the current process, reviewing readiness, preparing metadata, or
reconciling an already-published item. Do not answer from a remembered channel
rule or by copying a template's static policy text.

## Dynamic sources of truth

1. `content-planner-kb/config/photo-post-profiles.json` is the policy registry.
   It defines enabled channels and formats and is always used to resolve
   `render_strategy`, layout, evidence requirements, lifecycle gates, and
   platform policy.
2. `post.md` supplies the exact `channel` and `format_code` in frontmatter,
   plus the editorial exact-copy fields and creative content.
3. The channel template is a separate, channel-specific editorial and handoff
   contract. If it conflicts with the profile registry, the registry wins.

## General operator contract

- Resolve the declared channel and format in the profile registry before
  explaining, generating, reviewing, or distributing a photo post. Never infer
  a renderer, evidence rule, lifecycle state, or platform permission from a
  previous channel run.
- Keep canonical handoff templates separate by channel:
  - Botanical Killers:
    `obsidian-kb/00-Templates/botanical-killers/photo-bk-infographic-v3.md`
  - Mix Therapy:
    `obsidian-kb/00-Templates/mix-therapy/photo-mt-recipe-v3.md`
  - Science Unlocked:
    `obsidian-kb/00-Templates/science-unlocked/photo-su-scientific-editorial-v2.md`
- BK, MT, and SU share the one-step, prompt-owned Nano typography method.
  Their layout and evidence contracts remain channel-specific. Every visible
  text element comes from the editorial exact-copy fields, appears exactly
  once, and is rendered in that generation step; agents must not add overlays
  or invent ad hoc visible copy in the prompt.
- CD and HD retain the deterministic typography strategy declared by their
  profiles. Never force one renderer or typography method across all channels.
- For SU, morphology evidence covers only traits actually observable in the
  exact reference. Quantitative or count claims use authoritative claim
  sources and do not require one reference to depict the full quantity.
  Require two or three callouts that clearly map to an anatomical region or
  declared visible trait; exact-pixel contact is unnecessary, while an empty
  or ambiguous target fails. A prompt-native footer rail or shelf may occupy no
  more than 6% of image height if it does not obscure morphology or become a
  card, dashboard, or large lower panel/bar.
- Generation runs only through the production orchestrator and FlowKit, using
  the user-authorized Google Labs execution path. Do not substitute a paid
  external generation API. Platform publishing remains `manual-only`.

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
2. Compile the minimal production work order:

   ```text
   python content-planner-kb/scripts/photo_post_work_order.py \
     --channel <channel> --id <post-id> --stage production --json
   ```

   This local command resolves the profile, runs preflight, compiles the
   contract, and atomically ensures the canonical `<post-id>-production` and
   `<post-id>-qa` task pair. Repeated calls return the same task identities;
   never create `-v2`, `-v3`, or other retry tasks. Give the specialist only
   the returned work order, not the full policy stack.
3. The production specialist claims the returned task/resources and runs the
   returned orchestrator command. For an explicitly user-authorized FlowKit run
   through the Google Labs execution path, that command uses
   `--execute-flowkit`. Contract drift fails before any reference upload or
   provider generation. Work-order compilation is local and consumes no
   generation credit; actual Google Labs generation may use the user's account
   allowance. Do not substitute a paid external AI API. The production command
   uploads only curated reference files recorded in the bundle's
   `references/reference_pack.json`, then sends their FlowKit media IDs with
   the prompt. Biology references must be imported first through
   `photo_reference_import.py`; manual pack entries, schema-v1 packs,
   schematics, low-resolution images, and source/file hash mismatches fail
   closed. The importer binds the source page, direct image URL, identity,
   depicted view, exact downloaded bytes and SHA-256.
4. Do not call `batch_gen.py` or `gen_image_post.py` as a user-facing step; they
   are implementation modules behind the orchestrator. Do not hand-copy files
   or create alternate output folders.
   Apply the resolved profile strategy and the channel's canonical handoff
   template from the general operator contract. Do not reuse another channel's
   layout, evidence policy, or renderer.
5. Read the evidence-derived state after every stage:

   ```text
   python content-planner-kb/scripts/photo_post_lifecycle.py status \
     --channel <channel> --id <post-id> --json
   ```

   Never write `Ready`, `Drive eligible`, or `Distribution Hub ready` unless this
   command returns `state: READY` and `ready: true`.
6. Run independent hash-bound photo QA. Biology channels require a real-world
   morphology reference and accessible claim sources. Invalid dimensions,
   missing FlowKit provenance, or missing receipts produce
   `GENERATED_INVALID`/`QA_INVALID`, not `READY`.
   Production and QA are separate canonical tracker tasks and separate
   Antigravity trajectories. The work-order compiler creates missing tasks
   initially as `PENDING`; repeated compilation preserves each task's identity
   and current status. Coordinators must not create versioned replacements.
   Each specialist must atomically start its own returned task with
   `team_preflight.py --claim`, exact role, current trajectory and
   non-overlapping resource keys. After production completes, compile
   `--stage qa` and give that returned work order to a fresh QA trajectory.
   Do not pass a numeric score:
   schema-v5 computes it from fixed checklist weights and caps any critical
   failure at 5.9. Morphology visual evidence requires `view_file` on the exact
   local artifact and schema-v2 reference, matching hashes, and a separate
   observation for every declared visual trait. Direct `photo_qa.py` writes,
   hand-authored PASS receipts, reused trajectories, and receipt hashes not
   bound in the tracker fail closed. A failed tracker/preflight command blocks
   the run; the parent may not substitute for either specialist.
7. A valid QA receipt produces `QA_REVIEWED`, not `READY`, and cannot grant
   Drive/Buffer eligibility. The coordinator must independently open the exact
   artifact and references from a trajectory different from producer and QA,
   then run `photo_post_accept.py`. Only a hash-bound ACCEPT receipt with zero
   critical defects moves the lifecycle to `READY`.
8. `UNVERIFIED_LEGACY` is quarantine-only: it cannot enter QA, Drive,
   Distribution Hub, or publication. Notion BUFFER is retired and must not be
   queried or updated. Only `READY` may enter the existing
   Drive/Distribution Hub gate. Facebook stays manual-only. After user-confirmed
   publication, use exact-ID reconciliation; do not infer publication or move
   folders by hand.

## Short operator command for a quantity

The user does not need to repeat implementation rules. Treat a request shaped
like `Sản xuất <N> photo <CHANNEL>` (for example, `Sản xuất 5 photo MT`) as the
official shorthand for a bounded sequential production run.

The coordinator must expand that shorthand internally:

1. Resolve the channel slug, active format, platform, and canonical template
   from the dynamic profile.
2. Create one unique intake draft per post; let the work-order compiler ensure
   the canonical production/QA task pair.
3. Compile and execute the production work order, then compile and execute the
   QA work order sequentially for every post. Do not call `batch_gen.py` or
   `gen_image_post.py` directly and do not create versioned retry tasks.
4. Do not run photo generation in parallel and do not start runtime
   reset/archive work while the production run is active.
5. Require independent, hash-bound QA and coordinator acceptance for every
   image. A verdict or acceptance for one image
   never applies to the rest of the run.
6. Stop on the first failed gate unless the user explicitly requests
   continue-on-error.
7. Report a per-ID table containing lifecycle state, bundle path, asset path,
   QA score, and blocker. Only IDs with `state: READY` and `ready: true` count
   as completed.

This shorthand coordinates repeated single-post production. It does not turn
the implementation modules into an unsupported channel-wide batch command.

## Non-negotiable policy precedence

Platform limits (for example Facebook's hashtag cap) belong in the profile and
are never copied from a template. This prevents stale template text from
overriding current distribution policy.
