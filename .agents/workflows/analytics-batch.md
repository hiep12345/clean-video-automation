---
name: analytics-batch
description: "Refresh Facebook analytics mới nhất bằng credential registry và Graph API"
trigger: "analytics-batch | cập nhật số liệu Facebook mới nhất | refresh Facebook analytics"
subagent_config: .agents/config/agent-routing.md
---

# Facebook analytics refresh

## Preflight

1. Read root agent rules and the routing table.
2. Treat "các kênh hiện tại" as the intersection of active channel configs and
   Pages in the secure Facebook registry. Do not hardcode channel names.
3. Never ask the user to paste a token into chat or pass a token through a CLI
   argument. If credentials are missing, stop with the interactive command:
   `python content-planner-kb/scripts/fb_credentials.py setup`.
4. Declare write scope under `content-planner-kb/output/analytics/`.
5. If the user requests "mới nhất", old artifacts may be used only for
   comparison; they do not satisfy the refresh.

Run the local, no-network preflight:

```text
python content-planner-kb/scripts/fb_credentials.py check
python content-planner-kb/scripts/fb_refresh.py --dry-run
```

## Collection

Route collection and analysis to `analytics-manager`. The canonical command for
all current eligible channels is:

```text
python content-planner-kb/scripts/fb_refresh.py --json
```

For an exact subset, repeat `--channel`:

```text
python content-planner-kb/scripts/fb_refresh.py \
  --channel <slug-a> --channel <slug-b> --json
```

The command reads Facebook analytics and writes only:
`content-planner-kb/output/analytics/fb_<channel>_<YYYYMMDD>.json`.

Do not add `--update-scorecards` unless the user explicitly requests local
scorecard updates. Do not add `--sync-flags` and do not run
`fb_sync_topics.py`; those mutate local tracking state and are separate tasks.

## Completion evidence

The parent must verify all of the following before reporting success:

- every requested channel has `status: COMPLETED`;
- every reported artifact exists, is non-empty, and parses as JSON;
- `pulled_at` comes from the current refresh, not an older fallback;
- missing-credential and API failures are reported as blocked/failed, never
  silently replaced with stale numbers;
- no token material appears in output or task evidence.

Record the redacted summary and artifact paths in
`.agents/state/task_agent.db` through `task_manager.py`.

## State-changing follow-up

Facebook publishing, topic reconciliation, Buffer mutation, Notion sync,
archive, comment actions, and scorecard updates are not implied by analytics
collection. These actions are not part of analytics collection. Each requires
a separate explicit task and applicable approval.
