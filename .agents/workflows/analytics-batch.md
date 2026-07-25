---
name: analytics-batch
description: "Fetch FB + YT analytics cho tất cả kênh active song song via sub-agents. Output: Handover.md / SQLite DB buffer update."
trigger: "analytics-batch"
subagent_config: .agents/config/subagent-team.md § Analytics Team
---

# analytics-batch — Parallel Analytics Collection

## Mục đích
Thu thập FB Page Insights cho tất cả kênh active cùng lúc, tổng hợp vào SQLite DB và Handover.md.
Thay thế serial loop (4 API calls tuần tự) bằng 4 sub-agents song song.

## Pre-flight
```
□ Check artifact trước: output/analytics/fb_<channel>_<today>.json tồn tại → SKIP channel đó
□ Verify FB token: python scripts/fb_page_insights.py --check-token
  FAIL → báo user "FB token expired", DỪNG
```

## Execution

### Step 1 — Spawn 4 fb-analyst sub-agents đồng thời
```python
# Parent invokes sub-agents dynamically per active channel from config/channels/:
# For each <channel-slug> with a valid fb_page_id:
invoke_subagent("fb-analyst-<SLUG>",
  prompt="Run: python scripts/fb_page_insights.py --page <channel-slug> --save
  Output: output/analytics/fb_<channel-slug>_<today>.json
  Report: follower_count, avg_views, post_count")
```

### Step 2 — Wait for all 4, then consolidate
```
Parent đọc 4 output JSON files → tổng hợp:
  - Follower count per channel
  - Avg views (last 30 posts)
  - Buffer count (final.mp4 without uploaded.flag)
  - Top performing post (highest views)
```

### Step 3 — Update Handover.md & SQLite DB
```
Cập nhật bảng điểm và thống kê buffer vào channel.db và tổng hợp vào Handover.md.
```

## Output
- 4 analytics JSON files in `output/analytics/`
- `Handover.md` § Buffer Status updated
- Report to CC inbox: `cc_analytics-batch-<date>.md`

## Error Handling
- 1 channel fail → log error, continue other 3, report gap in summary
- Token expired → STOP ALL, write to CC inbox immediately
- Rate limit → retry once after 30s, then report
