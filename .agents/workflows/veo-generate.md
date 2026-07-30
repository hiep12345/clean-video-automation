---
name: veo-generate
description: "Controlled video production through content-planner-kb and FlowKit"
trigger: "/veo-generate"
subagent_config: .agents/config/agent-routing.md
---

# Controlled video generation — API first

## Blocking inputs

- user-approved script and L1 QA evidence;
- exact channel and video ID;
- selected format contract, including storyboard/input and output aspect ratios;
- explicit authorization to generate media and consume credits;
- existing FlowKit project/video IDs when resuming;
- explicit authorization if `--fresh` is required.

## Ratio and scope boundary

- Treat the storyboard/input canvas ratio and output video ratio as separate
  fields. A 16:9 storyboard may intentionally drive a 9:16 output.
- Apply hand, tool, mixer, drip, storyboard, model, and duration rules only from
  the selected format/model contract. Do not generalize one artifact's failure
  into a universal channel or model rule.

## Mandatory FlowKit preflight

Use the local FlowKit Engine at `http://127.0.0.1:8100`. Before any generation
request:

1. `GET /health` — require `status=ok` and `extension_connected=true`.
2. `GET /api/flow/status` — require `connected=true` and
   `flow_key_present=true`.
3. Inspect `GET /api/flow/credits`, `GET /api/models`, and
   `GET /api/flow/video-capabilities`.
4. Call `POST /api/flow/resolve-video-contract` with the exact model key,
   generation mode, requested duration, output ratio, and paygate tier.
5. Require an exact verified model mapping and native duration. A missing,
   legacy-unverified, mismatched, or unknown mapping becomes
   `calibration_required`; stop before standard submit.

Health/status/models/capabilities/resolver are local preflight operations and do
not submit generation. Credits is an external read from Google Flow. Do not
claim a cost outcome from endpoint names; record the observed credit response
and the actual generation side effect.

## API-first execution order

1. Read `AGENTS.md` and `.agents/config/agent-routing.md`.
2. Confirm the write scope under
   `content-planner-kb/output/fb-reels/<channel>/<video_id>/`.
3. Run the mandatory FlowKit preflight above.
4. Route storyboard/Ingredients generation to
   `POST /api/flow/generate-video-refs` with
   `generation_mode=reference_frame_2_video`. Bind the verified storyboard
   media ID and preserve its dimensions/hash in the production receipt.
5. For all generation modes, submit only the exact model key and native
   duration returned by `/api/flow/resolve-video-contract`.
6. Invoke `production-executor` with the exact command and resume identifiers:

```text
python content-planner-kb/scripts/produce_pipeline.py --channel <channel> --video <video_id> [--project-id <pid> --video-id <vid>]
```

7. Read `flowkit-engine/AGENTS.md`. If the pipeline needs a FlowKit recipe, use
   only the matching existing file under `flowkit-engine/skills/`.
8. Invoke `qa-reviewer` for L2 clips and L3 `final.mp4`.
9. Stop on failed QA. Regeneration requires a new, scoped instruction.

## API calibration before browser fallback

Standard submit remains fail-closed for
`verification=legacy_unverified_no_duration_claim`. If resolving the exact R2V
key with `duration_seconds=null` returns that value, allow one calibration call
to `POST /api/flow/generate-video-refs` only when the user explicitly approves
that credit-consuming attempt.

- Omit duration; do not invent or claim a native duration.
- Submit exactly one request; do not use batch.
- Record input hash/media ID/dimensions, prompt, exact model key, generation
  mode, ratio, credits before/after, project/result IDs, output hash, ffprobe,
  and QA.
- Treat the result only as calibration evidence. It does not verify production
  use or authorize standard/batch submission.
- Updating FlowKit's capability registry after native duration is empirically
  known requires a separate reviewed task.
- Do not retry without a new explicit approval.

## Browser fallback: one-shot calibration only

The archived `veo-flow` browser skill is not a normal production route. Use
direct Google Flow UI only when both standard API resolution and the API
calibration path above are unavailable, and the user explicitly approves one
calibration attempt that may consume credits.

Before and after that one attempt, write a calibration receipt containing:

- input SHA-256, media ID, width and height;
- exact prompt;
- model label, model key and model version;
- native duration and output aspect ratio;
- credits before and after;
- Google Flow project ID and result/operation ID;
- output SHA-256, ffprobe result and QA result.

Do not batch, regenerate, or retry from the UI. A failed or still-unverified
attempt remains `calibration_required`; a new attempt requires new explicit
approval.

## External actions

Generation approval does not authorize Drive upload, Notion sync, social
publishing, archive, deletion or Git operations. Each external action requires
an explicit user instruction and its own preflight.
