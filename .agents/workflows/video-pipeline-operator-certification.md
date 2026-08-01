# Video Pipeline Operator Certification Workflow

This workflow governs the certification, preflight validation, and execution sequence for the Video Pipeline Operator.

## Workflow Phases

### Phase 1: Preflight & Claim Acquisition
1. Verify presence of compiled Video Work Order (`work_order.json`). If missing $\rightarrow$ halt immediately with `WAITING_FOR_COMPILED_WORK_ORDER`.
2. Run `team_preflight.py` to acquire atomic resource claims.
3. Validate `work_order.json` schema against Obsidian KB channel profile.
4. Execute `validate_channel_config.py --all` and verify Exit Code 0.
5. Check FlowKit `/health`. If unavailable $\rightarrow$ fail-closed with `BLOCKED`.

### Phase 2: Execution Boundary Validation
1. Verify explicit authorization for provider API generation calls. (Service `/health` HTTP 200 OK confirms availability ONLY, not authorization).
2. If `--fresh` flag is specified, verify `destructive_reset_authorized=true`.
3. Confirm zero hardcoded channel fallbacks or duration trim overrides are present.

### Phase 3: Pipeline Execution & QA Gate Verification
1. Execute pipeline generation via `produce_pipeline.py`.
2. Submit rendered assets to independent `qa-reviewer` for L1, L2, L3, and thumbnail QA gate inspection.
3. Collect evidence receipts signed by independent `qa-reviewer`.
4. Transition manifest state to `READY_LOCAL`.

### Phase 4: Separately Authorized Distribution
1. External publishing, Drive upload, or Distribution Hub sync requires explicit separate authorization flags (e.g., `--authorize-external-publish`).
2. Enforce manual-only policy for Facebook distribution.
