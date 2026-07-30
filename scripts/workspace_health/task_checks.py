"""Read-only checks for canonical and duplicate Task Tracker state."""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from .models import Issue, relative_path


REQUIRED_GIT_EVIDENCE = (
    "git_repository",
    "git_branch",
    "git_write_scope",
    "git_tests",
    "git_commit",
    "git_push_status",
)


def duplicate_state_issues(root: Path) -> list[Issue]:
    canonical = (root / ".agents" / "state" / "task_agent.db").resolve()
    issues: list[Issue] = []
    for scan_root in (root / ".worktrees", root / "scratch"):
        if not scan_root.exists():
            continue
        try:
            candidates = scan_root.glob("**/.agents/state/task_agent.db")
            for candidate in candidates:
                resolved = candidate.resolve()
                if resolved == canonical:
                    continue
                issues.append(
                    Issue(
                        "DUPLICATE_TASK_DATABASE",
                        "ERROR",
                        "A non-canonical Task Tracker database exists.",
                        path=relative_path(resolved, root),
                        details={"canonical": str(canonical)},
                    )
                )
        except OSError as exc:
            issues.append(
                Issue(
                    "STATE_SCAN_FAILED",
                    "WARNING",
                    "Could not scan a runtime-state directory.",
                    path=str(scan_root),
                    details={"error": str(exc)},
                )
            )
    return issues


def _open_read_only(path: Path) -> sqlite3.Connection:
    uri = f"file:{path.resolve().as_posix()}?mode=ro"
    connection = sqlite3.connect(uri, uri=True, timeout=1.0)
    connection.execute("PRAGMA query_only=ON")
    return connection


def _invalid_git_states(
    connection: sqlite3.Connection,
    path: Path,
    root: Path,
) -> list[Issue]:
    issues: list[Issue] = []
    rows = connection.execute(
        """
        SELECT task.id, task.status, evidence.value
        FROM task
        JOIN task_evidence AS evidence
          ON evidence.task_id=task.id AND evidence.key='git_state'
        WHERE task.status IN ('FAILED', 'BLOCKED')
          AND evidence.value='IN_PROGRESS'
        """
    ).fetchall()
    for task_id, status, git_state in rows:
        issues.append(
            Issue(
                "INVALID_TASK_GIT_STATE",
                "ERROR",
                "Terminal task retains an in-progress Git state.",
                path=relative_path(path, root),
                details={
                    "task_id": task_id,
                    "status": status,
                    "git_state": git_state,
                },
            )
        )
    return issues


def _incomplete_closeouts(
    connection: sqlite3.Connection,
    path: Path,
    root: Path,
) -> list[Issue]:
    issues: list[Issue] = []
    completed = connection.execute(
        """
        SELECT task.id
        FROM task
        JOIN task_evidence AS required
          ON required.task_id=task.id
         AND required.key='git_required'
         AND lower(required.value)='true'
        WHERE task.status='COMPLETED'
        """
    ).fetchall()
    for (task_id,) in completed:
        keys = {
            row[0]
            for row in connection.execute(
                "SELECT key FROM task_evidence WHERE task_id=?",
                (task_id,),
            )
        }
        missing = sorted(set(REQUIRED_GIT_EVIDENCE) - keys)
        if missing:
            issues.append(
                Issue(
                    "COMPLETED_TASK_MISSING_GIT_EVIDENCE",
                    "ERROR",
                    "Completed Git task is missing closeout evidence.",
                    path=relative_path(path, root),
                    details={"task_id": task_id, "missing": missing},
                )
            )
    return issues


def _expired_claims(
    connection: sqlite3.Connection,
    path: Path,
    root: Path,
) -> list[Issue]:
    issues: list[Issue] = []
    now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat()
    rows = connection.execute(
        """
        SELECT task_id, owner_role, trajectory_id, expires_at
        FROM task_claim
        WHERE released_at IS NULL AND expires_at < ?
        """,
        (now,),
    ).fetchall()
    for task_id, role, trajectory, expires_at in rows:
        issues.append(
            Issue(
                "EXPIRED_ACTIVE_CLAIM",
                "ERROR",
                "An unreleased task claim has expired.",
                path=relative_path(path, root),
                details={
                    "task_id": task_id,
                    "owner_role": role,
                    "trajectory_id": trajectory,
                    "expires_at": expires_at,
                },
            )
        )
    return issues


def task_database_issues(root: Path) -> list[Issue]:
    path = root / ".agents" / "state" / "task_agent.db"
    if not path.is_file():
        return [
            Issue(
                "TASK_DATABASE_MISSING",
                "ERROR",
                "Canonical Task Tracker database does not exist.",
                path=relative_path(path, root),
            )
        ]
    connection: sqlite3.Connection | None = None
    try:
        connection = _open_read_only(path)
        tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
        }
        if not {"task", "task_evidence"} <= tables:
            return [
                Issue(
                    "TASK_DATABASE_SCHEMA_INVALID",
                    "ERROR",
                    "Task Tracker database is missing required tables.",
                    path=relative_path(path, root),
                )
            ]
        issues = _invalid_git_states(connection, path, root)
        issues.extend(_incomplete_closeouts(connection, path, root))
        if "task_claim" in tables:
            issues.extend(_expired_claims(connection, path, root))
        return issues
    except (OSError, sqlite3.Error) as exc:
        return [
            Issue(
                "TASK_DATABASE_READ_FAILED",
                "ERROR",
                "Canonical Task Tracker database could not be read safely.",
                path=relative_path(path, root),
                details={"error": str(exc)},
            )
        ]
    finally:
        if connection is not None:
            connection.close()
