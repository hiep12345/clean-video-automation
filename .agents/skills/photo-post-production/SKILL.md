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

1. Resolve channel + declared format.
2. Write the creative `post.md` using the matched template.
3. Preflight it.
4. Generate exactly one requested artifact through
   `photo_post_generate.py`; the profile dynamically selects aspect ratio,
   filename, text mode, and brand.
5. Run independent hash-bound photo QA. When profile requires biology evidence,
   a real-world morphology reference and accessible claim sources are required.
6. Only QA PASS can become Ready for the existing Drive/Notion gate.
7. Facebook stays manual-only. After user-confirmed publication, use the exact
   ID reconciliation workflow; do not infer publication or move folders by hand.

## Non-negotiable policy precedence

Platform limits (for example Facebook's hashtag cap) belong in the profile and
are never copied from a template. This prevents stale template text from
overriding current distribution policy.
