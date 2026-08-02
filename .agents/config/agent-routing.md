# Specialized agent routing

All specialized agents inherit `AGENTS.md` and `.agents/AGENTS.md`. The parent
assigns one primary agent per task and declares a non-overlapping write scope.

| Agent | Primary use | Default repository | Allowed write scope | State-changing boundary |
|---|---|---|---|---|
| `analytics-manager` | Metrics and recommendations | `content-planner-kb` | Approved analytics report | Read-only analytics; Notion BUFFER is retired and forbidden |
| `production-executor` | Approved media generation/render | `content-planner-kb`, `flowkit-engine` | One approved media output folder | Credit use, fresh generation, publish and upload require explicit approval |
| `qa-engineer` | Software tests and regression | Task repository | Tests and fixtures only | Cannot edit production source |
| `qa-reviewer` | L1/L2/L3 content-media QA | `content-planner-kb` | Approved QA report only | Cannot regenerate or publish |
| `script-writer` | Script, prompts and metadata | `content-planner-kb` | One designated `script.md` | Cannot publish or invent unsupported facts |
| `system-developer` | Backend/API/database changes | Explicit task repository | Declared source and tests | External services and production data require approval |
| `video-pipeline-operator` | Contract-bound video pipeline control plane | Workspace root | Declared work-order and handoff evidence only | Delegates production to `production-executor` and QA to `qa-reviewer`; cannot generate, self-certify, publish or mutate Git |
| `web-developer` | UI/dashboard changes | Explicit task repository | Declared UI folder and tests | Package changes and deployment require approval |
| `repository-integrator` | Git review and closeout | Explicit task repository | Exact tracker `git_write_scope` only | Feature-branch commit/push only; cannot merge or edit source |

## Coordinator contract

- Antigravity 2 parent is the Strategic Coordinator and remains accountable
  for task ownership, decomposition, synthesis and final evidence review.
- `.agents/config/team-manifest.yaml` is the machine-readable role and risk-tier
  registry. Markdown instructions may add context but may not weaken it.
- For a complex task, read this table first and call `invoke_subagent` with the
  exact agent name, bounded objective, task mode and non-overlapping scope.
- Every Tier 2 or Tier 3 specialist must pass `team_preflight.py --claim`
  before its first task action. A missing task, role mismatch, reused
  trajectory, incomplete dependency, or resource conflict is a hard stop.
- Use independent roles for implementation and verification. The agent that
  generates or edits an artifact cannot approve its publication gate.
- For photo posts, the parent compiles the contract-bound production work order.
  The compiler atomically creates or verifies the canonical
  `<post-id>-production` and dependent `<post-id>-qa` tasks, preserving their
  current status on repeated calls. The parent dispatches the returned work
  orders with a new trajectory for each task; it must not create versioned
  replacements or run either specialist receipt-writing command itself. After
  QA reaches `QA_REVIEWED`, the parent opens the exact artifact and references
  itself and writes only the separate coordinator acceptance through
  `photo_post_accept.py`; this second key is required for `READY`.
- Do not invoke a specialist for a trivial task or claim delegation when the
  runtime did not expose the invocation tool.
- Parent fallback is allowed only for Tier 0/1. If the runtime cannot invoke a
  required Tier 2/3 specialist, mark the task `BLOCKED`; the parent may not
  impersonate production, QA, development, or integration trajectories.

## Routing rules

- Code implementation: `system-developer` or `web-developer`.
- Code verification: `qa-engineer`.
- Git review, feature-branch commit/push and tracker closeout:
  `repository-integrator`. This role cannot modify implementation files.
- Script and media verification: `qa-reviewer`.
- Scientific claim verification belongs to `qa-reviewer`, using accessible
  primary or authoritative sources opened with `read_url_content` and
  recorded using
  `.agents/agents/qa-reviewer/references/evidence-contract.md`.
- Search snippets and unvalidated DOI strings are discovery inputs, not QA
  evidence. A citation identity or experimental-condition mismatch must fail
  closed.
- The parent independently opens and checks at least one PASS-critical source
  before claiming a cross-check. Without a parent tool receipt, report
  `parent_cross_check: not performed`.
- Photo QA scores are machine-computed; neither reviewer nor parent may supply
  or override a numeric score. `read_url_content` cannot satisfy morphology
  visual evidence. Biology references must be schema-v2 imports and both QA
  and parent must use `view_file` on the exact hash-bound local files.
- Production is never implied by script approval; invoke
  `production-executor` only after a separate generation approval.
- Analytics collection is not authorization to sync, archive or publish.
- Requests such as “cập nhật số liệu Facebook mới nhất”, “refresh Facebook
  analytics”, or “lấy số liệu các kênh hiện tại” route to `analytics-manager`
  through `.agents/workflows/analytics-batch.md`. “Các kênh hiện tại” means
  active channel config intersected with configured Facebook Pages; agents
  must not ask the user to enumerate them or silently reuse stale artifacts.
- Requests such as “đã upload”, “đã đăng”, “xử content uploaded” or “dọn bài
  đã đăng khỏi Buffer” route through
  `.agents/workflows/reconcile-uploaded-content.md`; exact photo reconciliation
  must not fall back to heuristic bulk Facebook topic sync.
- Requests about creating, reviewing, preparing, distributing, or explaining a
  photo post route through `.agents/workflows/photo-post-production.md` and
  `.agents/skills/photo-post-production/SKILL.md`. The coordinator must resolve
  the channel/format profile and run preflight before making a readiness claim
  or treating a template as policy.
- Short requests matching `Sản xuất <N> photo <CHANNEL>` (for example,
  `Sản xuất 5 photo MT`) route to the same photo-post workflow. The
  coordinator expands the request internally into sequential single-ID runs,
  independent QA per artifact, fail-closed lifecycle checks, and a per-ID
  completion table. Do not ask the user to repeat implementation paths or
  command flags.
- No specialist has Git authority except a task explicitly assigned to
  `repository-integrator` with `git_required=true`. Merge remains user-only.
