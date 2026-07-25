---
name: analytics-batch
description: "Thu thập và tổng hợp analytics theo channel với agent read-only"
trigger: "analytics-batch"
subagent_config: .agents/config/agent-routing.md
---

# Analytics batch

## Preflight

1. Read root agent rules and the routing table.
2. Resolve active channel slugs from
   `content-planner-kb/config/channels/`.
3. Declare one non-overlapping report path per `analytics-manager` instance.
4. Existing analytics for the requested date may be reused.

## Collection

For each approved channel, invoke `analytics-manager` with:

```text
Role: [analytics-manager] Read-only metrics for <channel>
Command when refresh is requested:
python content-planner-kb/scripts/fb_page_insights.py --page <channel> --save
Output:
content-planner-kb/output/analytics/fb_<channel>_<date>.json
```

Parallel instances may write only their own channel JSON. The parent
consolidates results into the approved performance report.

## State-changing follow-up

Notion sync and archive are not part of analytics collection. If the user
requests them, run and review these dry runs first:

```text
python content-planner-kb/scripts/notion_sync.py --dry-run
python content-planner-kb/scripts/archive_old_uploads.py --dry-run
```

The real commands require a second explicit approval for their exact targets.
