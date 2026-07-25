---
name: veo-generate
description: "Controlled video production through content-planner-kb and FlowKit"
trigger: "/veo-generate"
subagent_config: .agents/config/agent-routing.md
---

# Controlled video generation

## Blocking inputs

- user-approved script and L1 QA evidence;
- exact channel and video ID;
- explicit authorization to generate media and consume credits;
- existing FlowKit project/video IDs when resuming;
- explicit authorization if `--fresh` is required.

## Execution order

1. Read root agent rules and `.agents/config/agent-routing.md`.
2. Confirm the write scope under
   `content-planner-kb/output/fb-reels/<channel>/<video_id>/`.
3. Check FlowKit health using the current FlowKit instructions under
   `flowkit-engine/AGENTS.md`.
4. Invoke `production-executor` with the exact command and resume identifiers:

```text
python content-planner-kb/scripts/produce_pipeline.py --channel <channel> --video <video_id> [--project-id <pid> --video-id <vid>]
```

5. Use FlowKit's repository-local skills for generation and assembly where the
   pipeline requires them.
6. Invoke `qa-reviewer` for L2 clips and L3 `final.mp4`.
7. Stop on failed QA. Regeneration requires a new, scoped instruction.

## External actions

Generation approval does not authorize Drive upload, Notion sync, social
publishing, archive, deletion or Git operations. Each external action requires
an explicit user instruction and its own preflight.
