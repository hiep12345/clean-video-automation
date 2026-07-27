---
name: script-preparation
description: "Chuẩn bị script và chạy cổng L1 QA trước production"
---

# Script preparation

## Inputs

- approved channel and video ID;
- topic or research packet;
- target duration and orientation;
- write scope:
  `content-planner-kb/output/fb-reels/<channel>/<video_id>/`.

## Gates

1. Parent checks duplicates using the current content tooling and channel
   catalog. A duplicate or ambiguous match stops the workflow.
2. `script-writer` reads the channel configuration, approved research and
   `.agents/skills/script-writer/SKILL.md`, then writes only `script.md`.
3. `qa-reviewer` performs L1 content QA using
   `.agents/skills/clarity-gate/SKILL.md` and, when requested:

```text
python content-planner-kb/scripts/qa/l1_script_qa.py <script.md> --channel <channel>
```

4. A failed gate returns to `script-writer` for at most two revisions.
5. The parent reads the final script and QA evidence.
6. Production remains blocked until the user approves the script and
   separately authorizes media generation.

No agent in this workflow may publish metadata, upload files, mutate Git or
write outside the declared video folder.
