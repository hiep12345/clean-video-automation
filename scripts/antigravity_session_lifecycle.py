#!/usr/bin/env python3
"""Read-only lifecycle scanner for local Antigravity conversations.

Phase 1 deliberately has no archive or delete command. It correlates:

* Antigravity conversation SQLite files and ``brain`` directories;
* task/claim/evidence data returned by the supported ``task_manager.py`` CLI;
* trajectory IDs embedded in generation and QA receipts; and
* stale deletion-cleanup references reported by the Antigravity language server.

The scanner never opens ``task_agent.db`` directly and opens conversation
databases with SQLite ``mode=ro`` plus ``PRAGMA query_only``.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import subprocess
import sys
from collections import Counter, defaultdict
from contextlib import closing
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)
UUID_SEARCH_RE = re.compile(
    r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
)
DELETION_CLEANUP_RE = re.compile(
    r"Failed to ensure trajectory "
    r"([0-9a-fA-F-]{36}) loaded for deletion cleanup"
)
ACTIVE_TASK_STATUSES = frozenset({"PENDING", "IN_PROGRESS"})


class ScannerError(RuntimeError):
    """Raised when a required read-only source cannot be inspected."""


@dataclass(frozen=True)
class Policy:
    schema_version: int = 1
    handover_warning_steps: int = 70
    handover_required_steps: int = 80
    stale_review_days: int = 30
    scan_receipts: bool = True
    quick_check: bool = False
    receipt_globs: tuple[str, ...] = (
        "content-planner-kb/output/fb-posts/**/generation_receipt.json",
        "content-planner-kb/output/fb-posts/**/review_results.json",
    )
    explicit_protected_cascade_ids: tuple[str, ...] = ()


@dataclass
class ConversationRecord:
    cascade_id: str
    conversation_db: str | None
    brain_path: str | None
    brain_exists: bool
    db_exists: bool
    db_size_bytes: int
    db_last_modified: str | None
    age_days: float | None
    step_count: int
    trajectory_ids: list[str] = field(default_factory=list)
    linked_tasks: list[dict[str, Any]] = field(default_factory=list)
    receipt_paths: list[str] = field(default_factory=list)
    health: str = "OK"
    quick_check: str | None = None
    lifecycle: str = "OBSERVED"
    reasons: list[str] = field(default_factory=list)
    archive_blockers: list[str] = field(default_factory=list)


def _is_uuid(value: str) -> bool:
    return bool(UUID_RE.fullmatch(value))


def _iso_utc(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()


def _age_days(timestamp: float, now: datetime) -> float:
    observed = datetime.fromtimestamp(timestamp, tz=timezone.utc)
    return max(0.0, (now - observed).total_seconds() / 86400.0)


def _validate_uuid_list(values: Iterable[Any], field_name: str) -> tuple[str, ...]:
    output: list[str] = []
    for value in values:
        normalized = str(value).lower()
        if not _is_uuid(normalized):
            raise ScannerError(f"{field_name} contains an invalid UUID: {value!r}")
        output.append(normalized)
    return tuple(output)


def load_policy(path: Path) -> Policy:
    """Load the JSON-compatible YAML policy without external dependencies."""

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ScannerError(f"Policy file not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ScannerError(
            f"Policy must use JSON-compatible YAML syntax: {path}: {exc}"
        ) from exc

    if not isinstance(raw, dict):
        raise ScannerError("Policy root must be an object")

    warning = int(raw.get("handover_warning_steps", 70))
    required = int(raw.get("handover_required_steps", 80))
    stale_days = int(raw.get("stale_review_days", 30))
    if warning < 1 or required < warning:
        raise ScannerError(
            "handover_required_steps must be greater than or equal to "
            "handover_warning_steps"
        )
    if stale_days < 1:
        raise ScannerError("stale_review_days must be positive")

    receipt_globs = tuple(
        str(item)
        for item in raw.get(
            "receipt_globs",
            list(Policy.receipt_globs),
        )
    )
    protected = _validate_uuid_list(
        raw.get("explicit_protected_cascade_ids", ()),
        "explicit_protected_cascade_ids",
    )
    return Policy(
        schema_version=int(raw.get("schema_version", 1)),
        handover_warning_steps=warning,
        handover_required_steps=required,
        stale_review_days=stale_days,
        scan_receipts=bool(raw.get("scan_receipts", True)),
        quick_check=bool(raw.get("quick_check", False)),
        receipt_globs=receipt_globs,
        explicit_protected_cascade_ids=protected,
    )


def _run_task_manager(task_manager: Path) -> list[dict[str, Any]]:
    """Read tasks through the supported task-manager CLI."""

    if not task_manager.is_file():
        raise ScannerError(f"task_manager.py not found: {task_manager}")
    result = subprocess.run(
        [sys.executable, str(task_manager), "list", "--json"],
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip()
        raise ScannerError(f"task_manager.py list failed: {detail[:500]}")
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise ScannerError("task_manager.py did not return valid JSON") from exc
    if not isinstance(payload, list):
        raise ScannerError("task_manager.py list response must be an array")
    return [item for item in payload if isinstance(item, dict)]


def load_tasks(
    task_manager: Path | None,
    task_snapshot: Path | None = None,
) -> list[dict[str, Any]]:
    """Load tasks from a test snapshot or the supported CLI."""

    if task_snapshot is not None:
        try:
            payload = json.loads(task_snapshot.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ScannerError(f"Cannot read task snapshot: {task_snapshot}") from exc
        if not isinstance(payload, list):
            raise ScannerError("Task snapshot root must be an array")
        return [item for item in payload if isinstance(item, dict)]
    if task_manager is None:
        raise ScannerError("A task-manager path or task snapshot is required")
    return _run_task_manager(task_manager)


def _trajectory_ids_from_value(value: Any) -> set[str]:
    if not isinstance(value, str):
        return set()
    return {match.group(0).lower() for match in UUID_SEARCH_RE.finditer(value)}


def index_task_trajectories(
    tasks: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    """Map every evidence/claim trajectory ID to its task summary."""

    index: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for task in tasks:
        task_id = str(task.get("id", ""))
        status = str(task.get("status", "")).upper()
        active_claim = task.get("active_claim")
        evidence = task.get("evidence")
        trajectories: set[str] = set()
        if isinstance(active_claim, dict):
            trajectories.update(
                _trajectory_ids_from_value(active_claim.get("trajectory_id"))
            )
        if isinstance(evidence, dict):
            for key, value in evidence.items():
                if "trajectory" in str(key).lower():
                    trajectories.update(_trajectory_ids_from_value(value))
        summary = {
            "task_id": task_id,
            "status": status,
            "assigned_to": task.get("assigned_to"),
            "active_claim": bool(active_claim),
        }
        for trajectory_id in trajectories:
            index[trajectory_id].append(summary)
    return index


def _walk_trajectory_fields(value: Any, key: str = "") -> set[str]:
    output: set[str] = set()
    if isinstance(value, dict):
        for child_key, child_value in value.items():
            output.update(_walk_trajectory_fields(child_value, str(child_key)))
    elif isinstance(value, list):
        for item in value:
            output.update(_walk_trajectory_fields(item, key))
    elif "trajectory" in key.lower():
        output.update(_trajectory_ids_from_value(value))
    return output


def index_receipt_trajectories(
    workspace_root: Path,
    globs: Iterable[str],
) -> tuple[dict[str, set[str]], list[str]]:
    """Map receipt trajectory IDs to relative receipt paths."""

    index: dict[str, set[str]] = defaultdict(set)
    errors: list[str] = []
    visited: set[Path] = set()
    for pattern in globs:
        for path in workspace_root.glob(pattern):
            resolved = path.resolve()
            if resolved in visited or not path.is_file():
                continue
            visited.add(resolved)
            try:
                payload = json.loads(path.read_text(encoding="utf-8-sig"))
            except (OSError, json.JSONDecodeError) as exc:
                errors.append(f"{path}: {exc}")
                continue
            relative = path.relative_to(workspace_root).as_posix()
            for trajectory_id in _walk_trajectory_fields(payload):
                index[trajectory_id].add(relative)
    return index, errors


def _open_conversation_db(path: Path) -> sqlite3.Connection:
    uri = f"file:{path.resolve().as_posix()}?mode=ro"
    connection = sqlite3.connect(uri, uri=True, timeout=1.0)
    connection.execute("PRAGMA query_only=ON")
    return connection


def inspect_conversation_db(
    path: Path,
    quick_check: bool,
) -> tuple[str, list[str], int, str | None]:
    """Return cascade ID, trajectory IDs, step count and optional check result."""

    fallback_cascade = path.stem.lower()
    trajectories: list[str] = []
    step_count = 0
    check_result: str | None = None
    with closing(_open_conversation_db(path)) as connection:
        tables = {
            str(row[0])
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
        }
        cascade_id = fallback_cascade
        if "trajectory_meta" in tables:
            rows = list(
                connection.execute(
                    "SELECT trajectory_id, cascade_id FROM trajectory_meta"
                )
            )
            for trajectory_id, row_cascade in rows:
                normalized = str(trajectory_id).lower()
                if _is_uuid(normalized):
                    trajectories.append(normalized)
                candidate = str(row_cascade).lower()
                if _is_uuid(candidate):
                    cascade_id = candidate
        if "steps" in tables:
            step_count = int(
                connection.execute("SELECT COUNT(*) FROM steps").fetchone()[0]
            )
        if quick_check:
            check_result = str(
                connection.execute("PRAGMA quick_check").fetchone()[0]
            )
    return cascade_id, sorted(set(trajectories)), step_count, check_result


def scan_antigravity_store(
    antigravity_root: Path,
    quick_check: bool,
    now: datetime,
) -> tuple[dict[str, ConversationRecord], list[str]]:
    """Inspect conversation DBs and brain directories without writes."""

    conversations_root = antigravity_root / "conversations"
    brain_root = antigravity_root / "brain"
    if not conversations_root.is_dir():
        raise ScannerError(
            f"Antigravity conversations directory not found: {conversations_root}"
        )
    if not brain_root.is_dir():
        raise ScannerError(f"Antigravity brain directory not found: {brain_root}")

    records: dict[str, ConversationRecord] = {}
    errors: list[str] = []
    for path in sorted(conversations_root.glob("*.db")):
        try:
            cascade_id, trajectories, steps, check_result = inspect_conversation_db(
                path, quick_check
            )
            stat = path.stat()
            brain_path = brain_root / cascade_id
            health = "OK"
            if not brain_path.is_dir():
                health = "BRAIN_MISSING"
            if check_result not in (None, "ok"):
                health = "SQLITE_CHECK_FAILED"
            records[cascade_id] = ConversationRecord(
                cascade_id=cascade_id,
                conversation_db=str(path),
                brain_path=str(brain_path),
                brain_exists=brain_path.is_dir(),
                db_exists=True,
                db_size_bytes=stat.st_size,
                db_last_modified=_iso_utc(stat.st_mtime),
                age_days=round(_age_days(stat.st_mtime, now), 3),
                step_count=steps,
                trajectory_ids=trajectories,
                health=health,
                quick_check=check_result,
            )
        except (OSError, sqlite3.Error) as exc:
            cascade_id = path.stem.lower()
            errors.append(f"{path}: {exc}")
            records[cascade_id] = ConversationRecord(
                cascade_id=cascade_id,
                conversation_db=str(path),
                brain_path=str(brain_root / cascade_id),
                brain_exists=(brain_root / cascade_id).is_dir(),
                db_exists=True,
                db_size_bytes=path.stat().st_size if path.exists() else 0,
                db_last_modified=None,
                age_days=None,
                step_count=0,
                health="DB_READ_ERROR",
                reasons=[str(exc)],
            )

    for path in sorted(brain_root.iterdir()):
        cascade_id = path.name.lower()
        if not path.is_dir() or not _is_uuid(cascade_id) or cascade_id in records:
            continue
        stat = path.stat()
        records[cascade_id] = ConversationRecord(
            cascade_id=cascade_id,
            conversation_db=None,
            brain_path=str(path),
            brain_exists=True,
            db_exists=False,
            db_size_bytes=0,
            db_last_modified=None,
            age_days=round(_age_days(stat.st_mtime, now), 3),
            step_count=0,
            health="CONVERSATION_DB_MISSING",
        )
    return records, errors


def scan_deletion_cleanup_log(
    log_path: Path | None,
    present_ids: set[str] | None = None,
) -> dict[str, Any]:
    if log_path is None or not log_path.is_file():
        return {
            "log_path": str(log_path) if log_path is not None else None,
            "available": False,
            "unique_cleanup_error_ids": 0,
            "missing_from_current_store": 0,
        }
    ids: set[str] = set()
    try:
        with log_path.open("r", encoding="utf-8", errors="replace") as handle:
            for line in handle:
                match = DELETION_CLEANUP_RE.search(line)
                if match:
                    ids.add(match.group(1).lower())
    except OSError as exc:
        return {
            "log_path": str(log_path),
            "available": False,
            "error": str(exc),
            "unique_cleanup_error_ids": 0,
            "missing_from_current_store": 0,
        }
    normalized_present = {item.lower() for item in (present_ids or set())}
    return {
        "log_path": str(log_path),
        "available": True,
        "unique_cleanup_error_ids": len(ids),
        "missing_from_current_store": len(ids - normalized_present),
    }


def default_language_server_log() -> Path | None:
    appdata = os.environ.get("APPDATA")
    if not appdata:
        return None
    return Path(appdata) / "Antigravity" / "logs" / "language_server.log"


def classify_records(
    records: dict[str, ConversationRecord],
    tasks_by_trajectory: dict[str, list[dict[str, Any]]],
    receipts_by_trajectory: dict[str, set[str]],
    policy: Policy,
    current_cascade_ids: set[str],
    protected_cascade_ids: set[str],
) -> None:
    """Attach task/receipt evidence and conservative lifecycle labels."""

    for record in records.values():
        linked_tasks: dict[str, dict[str, Any]] = {}
        receipt_paths: set[str] = set()
        for trajectory_id in record.trajectory_ids:
            for task in tasks_by_trajectory.get(trajectory_id, []):
                linked_tasks[str(task.get("task_id"))] = task
            receipt_paths.update(receipts_by_trajectory.get(trajectory_id, set()))
        record.linked_tasks = sorted(
            linked_tasks.values(), key=lambda item: str(item.get("task_id"))
        )
        record.receipt_paths = sorted(receipt_paths)

        active_tasks = [
            task
            for task in record.linked_tasks
            if task.get("status") in ACTIVE_TASK_STATUSES
            or bool(task.get("active_claim"))
        ]
        evidence_present = bool(record.linked_tasks or record.receipt_paths)
        is_current = record.cascade_id in current_cascade_ids
        is_policy_protected = record.cascade_id in protected_cascade_ids
        requires_handover = record.step_count >= policy.handover_required_steps
        warning_handover = record.step_count >= policy.handover_warning_steps
        stale = (
            record.age_days is not None
            and record.age_days >= policy.stale_review_days
        )

        if active_tasks:
            record.lifecycle = "PROTECTED_ACTIVE"
            record.reasons.append("linked task is PENDING/IN_PROGRESS or claimed")
        elif is_current:
            record.lifecycle = "PROTECTED_CURRENT"
            record.reasons.append("cascade supplied as a currently open session")
        elif is_policy_protected:
            record.lifecycle = "PROTECTED_POLICY"
            record.reasons.append("cascade explicitly protected by policy or CLI")
        elif requires_handover:
            record.lifecycle = "HANDOVER_DUE"
            record.reasons.append(
                f"step count {record.step_count} reached required threshold "
                f"{policy.handover_required_steps}"
            )
        elif evidence_present:
            record.lifecycle = "PROTECTED_EVIDENCE"
            record.reasons.append("trajectory is referenced by task or receipt evidence")
        elif stale:
            record.lifecycle = "REVIEW_REQUIRED"
            record.reasons.append(
                f"unreferenced conversation is at least "
                f"{policy.stale_review_days} days old"
            )
        else:
            record.lifecycle = "OBSERVED"
            if warning_handover:
                record.reasons.append(
                    f"step count reached warning threshold "
                    f"{policy.handover_warning_steps}"
                )

        blockers = ["phase-1 scanner has no mutation capability"]
        if active_tasks:
            blockers.append("active or unfinished linked task")
        if is_current:
            blockers.append("currently open session")
        if is_policy_protected:
            blockers.append("explicit protection")
        if requires_handover:
            blockers.append("handover acknowledgement not implemented")
        if record.health != "OK":
            blockers.append(f"store health is {record.health}")
        if not evidence_present:
            blockers.append("no task/receipt ownership evidence")
        record.archive_blockers = blockers


def build_report(
    *,
    workspace_root: Path,
    antigravity_root: Path,
    policy: Policy,
    tasks: list[dict[str, Any]],
    current_cascade_ids: Iterable[str] = (),
    protected_cascade_ids: Iterable[str] = (),
    language_server_log: Path | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Build the complete read-only report."""

    observed_at = now or datetime.now(tz=timezone.utc)
    if observed_at.tzinfo is None:
        observed_at = observed_at.replace(tzinfo=timezone.utc)
    observed_at = observed_at.astimezone(timezone.utc)

    task_index = index_task_trajectories(tasks)
    receipt_index: dict[str, set[str]] = {}
    receipt_errors: list[str] = []
    if policy.scan_receipts:
        receipt_index, receipt_errors = index_receipt_trajectories(
            workspace_root, policy.receipt_globs
        )
    records, store_errors = scan_antigravity_store(
        antigravity_root, policy.quick_check, observed_at
    )

    current = _validate_uuid_list(current_cascade_ids, "current_cascade_ids")
    explicit = set(policy.explicit_protected_cascade_ids)
    explicit.update(
        _validate_uuid_list(protected_cascade_ids, "protected_cascade_ids")
    )
    classify_records(
        records,
        task_index,
        receipt_index,
        policy,
        set(current),
        explicit,
    )

    lifecycle_counts = Counter(record.lifecycle for record in records.values())
    health_counts = Counter(record.health for record in records.values())
    ordered_records = sorted(
        records.values(),
        key=lambda item: (
            item.lifecycle,
            -(item.step_count or 0),
            item.cascade_id,
        ),
    )
    present_store_ids = set(records)
    for record in records.values():
        present_store_ids.update(record.trajectory_ids)
    return {
        "schema_version": 1,
        "phase": "1-read-only",
        "observed_at": observed_at.isoformat(),
        "workspace_root": str(workspace_root),
        "antigravity_root": str(antigravity_root),
        "mutations_performed": False,
        "mutation_capabilities": [],
        "archive_actions_enabled": False,
        "policy": asdict(policy),
        "summary": {
            "conversation_records": len(records),
            "conversation_databases": sum(r.db_exists for r in records.values()),
            "brain_directories": sum(r.brain_exists for r in records.values()),
            "task_count": len(tasks),
            "task_trajectory_ids": len(task_index),
            "receipt_trajectory_ids": len(receipt_index),
            "lifecycle_counts": dict(sorted(lifecycle_counts.items())),
            "health_counts": dict(sorted(health_counts.items())),
            "store_errors": len(store_errors),
            "receipt_errors": len(receipt_errors),
        },
        "deletion_cleanup": scan_deletion_cleanup_log(
            language_server_log, present_store_ids
        ),
        "warnings": {
            "store_errors": store_errors,
            "receipt_errors": receipt_errors,
            "current_session_hint_missing": not bool(current),
        },
        "conversations": [asdict(record) for record in ordered_records],
    }


def _default_workspace_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _default_antigravity_root() -> Path:
    return Path.home() / ".gemini" / "antigravity"


def _default_policy_path(workspace_root: Path) -> Path:
    return workspace_root / ".agents" / "config" / "session-lifecycle.yaml"


def _default_task_manager(workspace_root: Path) -> Path:
    return workspace_root / "content-planner-kb" / "scripts" / "task_manager.py"


def _human_summary(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lifecycle = summary["lifecycle_counts"]
    lines = [
        "Antigravity Session Lifecycle — Phase 1 (read-only)",
        f"Observed: {report['observed_at']}",
        (
            f"Conversations: {summary['conversation_databases']} DB / "
            f"{summary['brain_directories']} brain"
        ),
        f"Tasks: {summary['task_count']}",
        f"Lifecycle: {json.dumps(lifecycle, ensure_ascii=False, sort_keys=True)}",
        (
            "Stale deletion references: "
            f"{report['deletion_cleanup']['missing_from_current_store']}"
        ),
        "Mutations performed: false",
        "Archive actions enabled: false",
    ]
    if report["warnings"]["current_session_hint_missing"]:
        lines.append(
            "Warning: current session was not supplied; no session can be "
            "considered archive-safe."
        )
    return "\n".join(lines)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Read-only Antigravity session lifecycle scanner."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    scan = subparsers.add_parser(
        "scan", help="Correlate conversations, tasks, claims and receipts"
    )
    scan.add_argument("--workspace-root", type=Path)
    scan.add_argument("--antigravity-root", type=Path)
    scan.add_argument("--policy", type=Path)
    scan.add_argument("--task-manager", type=Path)
    scan.add_argument(
        "--task-snapshot",
        type=Path,
        help="Read tasks from JSON instead of invoking task_manager.py",
    )
    scan.add_argument(
        "--current-cascade",
        action="append",
        default=[],
        help="Protect a currently open cascade UUID; may be repeated",
    )
    scan.add_argument(
        "--protect-cascade",
        action="append",
        default=[],
        help="Explicitly protect a cascade UUID; may be repeated",
    )
    scan.add_argument("--language-server-log", type=Path)
    scan.add_argument(
        "--quick-check",
        action="store_true",
        help="Run SQLite PRAGMA quick_check (read-only but more expensive)",
    )
    scan.add_argument("--json", action="store_true", dest="as_json")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    workspace_root = (
        args.workspace_root.resolve()
        if args.workspace_root
        else _default_workspace_root()
    )
    antigravity_root = (
        args.antigravity_root.resolve()
        if args.antigravity_root
        else _default_antigravity_root()
    )
    policy_path = (
        args.policy.resolve()
        if args.policy
        else _default_policy_path(workspace_root)
    )
    task_manager = (
        args.task_manager.resolve()
        if args.task_manager
        else _default_task_manager(workspace_root)
    )
    language_server_log = (
        args.language_server_log.resolve()
        if args.language_server_log
        else default_language_server_log()
    )
    try:
        policy = load_policy(policy_path)
        if args.quick_check:
            policy = Policy(**{**asdict(policy), "quick_check": True})
        tasks = load_tasks(task_manager, args.task_snapshot)
        report = build_report(
            workspace_root=workspace_root,
            antigravity_root=antigravity_root,
            policy=policy,
            tasks=tasks,
            current_cascade_ids=args.current_cascade,
            protected_cascade_ids=args.protect_cascade,
            language_server_log=language_server_log,
        )
    except ScannerError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    if args.as_json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(_human_summary(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
