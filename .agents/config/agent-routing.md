# Specialized agent routing

All specialized agents inherit `AGENTS.md` and `.agents/AGENTS.md`. The parent
assigns one primary agent per task and declares a non-overlapping write scope.

| Agent | Primary use | Default repository | Allowed write scope | State-changing boundary |
|---|---|---|---|---|
| `analytics-manager` | Metrics and recommendations | `content-planner-kb` | Approved analytics report | Notion sync and archive require separate approval |
| `production-executor` | Approved media generation/render | `content-planner-kb`, `flowkit-engine` | One video output folder | Credit use, fresh generation, publish and upload require explicit approval |
| `qa-engineer` | Software tests and regression | Task repository | Tests and fixtures only | Cannot edit production source |
| `qa-reviewer` | L1/L2/L3 content-media QA | `content-planner-kb` | Approved QA report only | Cannot regenerate or publish |
| `script-writer` | Script, prompts and metadata | `content-planner-kb` | One designated `script.md` | Cannot publish or invent unsupported facts |
| `system-developer` | Backend/API/database changes | Explicit task repository | Declared source and tests | External services and production data require approval |
| `web-developer` | UI/dashboard changes | Explicit task repository | Declared UI folder and tests | Package changes and deployment require approval |

## Coordinator contract

- Antigravity 2 parent is the Strategic Coordinator and remains accountable
  for task ownership, decomposition, synthesis and final evidence review.
- For a complex task, read this table first and call `invoke_subagent` with the
  exact agent name, bounded objective, task mode and non-overlapping scope.
- Use independent roles for implementation and verification. The agent that
  generates or edits an artifact cannot approve its publication gate.
- Do not invoke a specialist for a trivial task or claim delegation when the
  runtime did not expose the invocation tool.

## Routing rules

- Code implementation: `system-developer` or `web-developer`.
- Code verification: `qa-engineer`.
- Script and media verification: `qa-reviewer`.
- Scientific claim verification belongs to `qa-reviewer`, using accessible
  primary or authoritative sources recorded in the QA evidence.
- Production is never implied by script approval; invoke
  `production-executor` only after a separate generation approval.
- Analytics collection is not authorization to sync, archive or publish.
- No specialized agent is Git integrator unless the user explicitly assigns
  that role.
