#!/usr/bin/env python3
"""Read-only Git, Task Tracker, worktree, and media integrity doctor."""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable

from scripts.workspace_health import (
    build_report as _base_build_report,
    classify_path,
    duplicate_state_issues as _duplicate_state_issues,
    task_database_issues as _task_database_issues,
)
from scripts.workspace_health.models import (
    SEVERITY_ORDER,
    DoctorError,
    Issue,
    count_by,
    relative_path,
    run_git,
)


@dataclass(frozen=True)
class MediaRootContract:
    """Reusable path-family contract for production media."""

    canonical_relative: Path = Path("content-planner-kb/output")
    external_directory: str = "Aff_Media"
    physical_directory: str = "output"
    required_families: tuple[str, ...] = ("fb-reels", "fb-posts")
    live_statuses: tuple[str, ...] = ("produced", "ready")
    test_path_markers: tuple[str, ...] = (
        ".pytest_cache",
        ".tmp-pytest",
        "pytest-",
    )

    def canonical_path(self, root: Path) -> Path:
        return root / self.canonical_relative

    def physical_path(self, root: Path) -> Path:
        configured = os.environ.get("AFF_MEDIA_ROOT", "").strip()
        if configured:
            base = Path(configured).expanduser()
            if base.name.casefold() == self.physical_directory.casefold():
                return base.resolve()
            return (base / self.physical_directory).resolve()
        return (root.parent / self.external_directory / self.physical_directory).resolve()


MEDIA_CONTRACT = MediaRootContract()


def _is_reparse_point(path: Path) -> bool:
    try:
        if path.is_symlink():
            return True
        is_junction = getattr(path, "is_junction", None)
        if callable(is_junction) and is_junction():
            return True
        attributes = getattr(path.lstat(), "st_file_attributes", 0)
        return bool(attributes & 0x400)
    except OSError:
        return False


def _paths_overlap(first: Path, second: Path) -> bool:
    first = first.resolve()
    second = second.resolve()
    try:
        first.relative_to(second)
        return True
    except ValueError:
        pass
    try:
        second.relative_to(first)
        return True
    except ValueError:
        return False


def _media_contract_issues(
    root: Path,
    *,
    contract: MediaRootContract = MEDIA_CONTRACT,
    physical_root: Path | None = None,
) -> list[Issue]:
    canonical = contract.canonical_path(root)
    expected = (physical_root or contract.physical_path(root)).resolve()
    if not canonical.exists():
        return [
            Issue(
                "MEDIA_MOUNT_TARGET_MISMATCH",
                "ERROR",
                "Canonical production media mount does not exist.",
                path=relative_path(canonical, root),
                details={"expected_target": str(expected), "actual_target": None},
            )
        ]

    issues: list[Issue] = []
    actual = canonical.resolve()
    if not _is_reparse_point(canonical) or actual != expected:
        issues.append(
            Issue(
                "MEDIA_MOUNT_TARGET_MISMATCH",
                "ERROR",
                "Canonical production media mount does not resolve to the configured shared media root.",
                path=relative_path(canonical, root),
                details={
                    "actual_target": str(actual),
                    "expected_target": str(expected),
                    "is_reparse_point": _is_reparse_point(canonical),
                },
            )
        )
    if not expected.is_dir():
        if not issues:
            issues.append(
                Issue(
                    "MEDIA_MOUNT_TARGET_MISMATCH",
                    "ERROR",
                    "Configured physical production media root does not exist.",
                    path=str(expected),
                    details={"expected_target": str(expected), "actual_target": str(actual)},
                )
            )
        return issues
    missing = [
        family for family in contract.required_families if not (expected / family).is_dir()
    ]
    if missing:
        issues.append(
            Issue(
                "MEDIA_OUTPUT_FAMILY_MISSING",
                "ERROR",
                "Physical production media root is missing required path families.",
                path=str(expected),
                details={
                    "missing_families": missing,
                    "required_families": list(contract.required_families),
                },
            )
        )
    return issues


def _open_sqlite_read_only(path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(
        f"file:{path.resolve().as_posix()}?mode=ro", uri=True, timeout=1.0
    )
    connection.execute("PRAGMA query_only=ON")
    return connection


def _resolve_database_media_path(
    stored_path: object,
    physical_root: Path,
    *,
    contract: MediaRootContract = MEDIA_CONTRACT,
) -> Path:
    value = Path(str(stored_path))
    if value.is_absolute():
        return value.resolve()
    parts = value.parts
    family_names = {name.casefold() for name in contract.required_families}
    if (
        len(parts) >= 2
        and parts[0].casefold() == physical_root.name.casefold()
        and parts[1].casefold() in family_names
    ):
        value = Path(*parts[1:])
    return (physical_root / value).resolve()


def _channel_database_media_issues(
    root: Path,
    physical_root: Path,
    *,
    contract: MediaRootContract = MEDIA_CONTRACT,
) -> list[Issue]:
    database = root / ".agents" / "state" / "channel.db"
    if not database.is_file():
        return []
    connection: sqlite3.Connection | None = None
    issues: list[Issue] = []
    try:
        connection = _open_sqlite_read_only(database)
        table = connection.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='topic_catalog'"
        ).fetchone()
        if table is None:
            return [
                Issue(
                    "CHANNEL_DATABASE_SCHEMA_INVALID",
                    "ERROR",
                    "Channel database is missing topic_catalog.",
                    path=relative_path(database, root),
                )
            ]
        columns = {
            str(row[1]) for row in connection.execute("PRAGMA table_info(topic_catalog)")
        }
        required = {"video_id", "status", "media_path"}
        if not required <= columns:
            return [
                Issue(
                    "CHANNEL_DATABASE_SCHEMA_INVALID",
                    "ERROR",
                    "topic_catalog is missing media integrity columns.",
                    path=relative_path(database, root),
                    details={"missing_columns": sorted(required - columns)},
                )
            ]
        placeholders = ",".join("?" for _ in contract.live_statuses)
        rows = connection.execute(
            f"""
            SELECT video_id, status, media_path
            FROM topic_catalog
            WHERE lower(status) IN ({placeholders})
              AND media_path IS NOT NULL AND trim(media_path) <> ''
            """,
            contract.live_statuses,
        ).fetchall()
        physical = physical_root.resolve()
        for content_id, status, stored_path in rows:
            resolved = _resolve_database_media_path(
                stored_path, physical, contract=contract
            )
            try:
                resolved.relative_to(physical)
            except ValueError:
                issues.append(
                    Issue(
                        "DATABASE_MEDIA_PATH_OUTSIDE_ROOT",
                        "ERROR",
                        "Live database row points outside production media root.",
                        path=relative_path(database, root),
                        details={
                            "content_id": content_id,
                            "status": status,
                            "media_path": str(stored_path),
                            "resolved_path": str(resolved),
                            "physical_root": str(physical),
                        },
                    )
                )
                continue
            if not resolved.exists():
                issues.append(
                    Issue(
                        "DATABASE_MEDIA_PATH_MISSING",
                        "ERROR",
                        "Live database row points to missing production media.",
                        path=relative_path(database, root),
                        details={
                            "content_id": content_id,
                            "status": status,
                            "media_path": str(stored_path),
                            "resolved_path": str(resolved),
                        },
                    )
                )
    except (OSError, sqlite3.Error) as exc:
        issues.append(
            Issue(
                "CHANNEL_DATABASE_MEDIA_CHECK_FAILED",
                "ERROR",
                "Channel database media references could not be inspected.",
                path=relative_path(database, root),
                details={"error": str(exc)},
            )
        )
    finally:
        if connection is not None:
            connection.close()
    return issues


def _pytest_media_issues(
    physical_root: Path,
    *,
    contract: MediaRootContract = MEDIA_CONTRACT,
) -> list[Issue]:
    if not physical_root.is_dir():
        return []
    matches: list[str] = []
    for current, directories, files in os.walk(physical_root, followlinks=False):
        current_path = Path(current)
        for name in [*directories, *files]:
            folded = name.casefold()
            if any(marker in folded for marker in contract.test_path_markers):
                matches.append(str(current_path / name))
        directories[:] = [
            name
            for name in directories
            if not _is_reparse_point(current_path / name)
        ]
    if not matches:
        return []
    return [
        Issue(
            "TEST_ARTIFACT_IN_PRODUCTION_MEDIA",
            "ERROR",
            "Test or pytest artifacts exist under production media root.",
            path=str(physical_root.resolve()),
            details={"paths": sorted(set(matches))},
        )
    ]


def _registered_worktree_paths(root: Path) -> list[Path]:
    paths: set[Path] = set()
    if (root / ".git").exists():
        output = run_git(root, "worktree", "list", "--porcelain", check=False)
        for line in output.splitlines():
            if line.startswith("worktree "):
                paths.add(Path(line.removeprefix("worktree ").strip()).resolve())
    disposable = root / ".worktrees"
    if disposable.is_dir():
        for child in disposable.iterdir():
            if child.is_dir():
                paths.add(child.resolve())
    return sorted(paths, key=str)


def _reparse_points_under(path: Path) -> Iterable[tuple[Path, Path]]:
    if not path.is_dir():
        return
    for current, directories, files in os.walk(path, followlinks=False):
        current_path = Path(current)
        retained: list[str] = []
        for name in directories:
            candidate = current_path / name
            if _is_reparse_point(candidate):
                try:
                    yield candidate, candidate.resolve()
                except OSError:
                    continue
            else:
                retained.append(name)
        directories[:] = retained
        for name in files:
            candidate = current_path / name
            if _is_reparse_point(candidate):
                try:
                    yield candidate, candidate.resolve()
                except OSError:
                    continue


def _worktree_media_mount_issues(
    root: Path,
    physical_root: Path,
    *,
    worktree_paths: Iterable[Path] | None = None,
) -> list[Issue]:
    physical = physical_root.resolve()
    candidates = (
        list(worktree_paths)
        if worktree_paths is not None
        else _registered_worktree_paths(root)
    )
    issues: list[Issue] = []
    for worktree in candidates:
        resolved_worktree = Path(worktree).resolve()
        if resolved_worktree == root.resolve():
            continue
        for mount, target in _reparse_points_under(resolved_worktree):
            if _paths_overlap(target, physical):
                issues.append(
                    Issue(
                        "WORKTREE_REPARSE_POINTS_TO_SHARED_MEDIA",
                        "ERROR",
                        "Worktree contains a reparse point that overlaps shared production media.",
                        path=relative_path(mount, root),
                        details={
                            "worktree": str(resolved_worktree),
                            "target": str(target),
                            "physical_root": str(physical),
                            "cleanup_blocked": True,
                        },
                    )
                )
    return issues


def _media_runtime_issues(
    root: Path,
    *,
    contract: MediaRootContract = MEDIA_CONTRACT,
    physical_root: Path | None = None,
    worktree_paths: Iterable[Path] | None = None,
) -> list[Issue]:
    physical = (physical_root or contract.physical_path(root)).resolve()
    issues = _media_contract_issues(root, contract=contract, physical_root=physical)
    issues.extend(_channel_database_media_issues(root, physical, contract=contract))
    issues.extend(_pytest_media_issues(physical, contract=contract))
    issues.extend(
        _worktree_media_mount_issues(
            root, physical, worktree_paths=worktree_paths
        )
    )
    return issues


def build_report(root: Path) -> dict[str, Any]:
    report = _base_build_report(root)
    additions = [asdict(issue) for issue in _media_runtime_issues(root)]
    issues = [*report["issues"], *additions]
    issues.sort(
        key=lambda issue: (
            -SEVERITY_ORDER.get(issue["severity"], 0),
            issue["code"],
            issue["repository"],
            issue.get("path") or "",
        )
    )
    report["issues"] = issues
    report["summary"]["issues"] = len(issues)
    report["summary"]["by_severity"] = count_by(
        item["severity"] for item in issues
    )
    report["summary"]["by_code"] = count_by(item["code"] for item in issues)
    return report


def _human_summary(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "Workspace Doctor (read-only)",
        f"Workspace: {report['workspace_root']}",
        f"Repositories: {summary['repositories']}",
        f"Issues: {summary['issues']} {json.dumps(summary['by_severity'], sort_keys=True)}",
    ]
    for issue in report["issues"]:
        location = f" [{issue['path']}]" if issue.get("path") else ""
        lines.append(
            f"- {issue['severity']} {issue['code']}{location}: {issue['message']}"
        )
    return "\n".join(lines)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Read-only Git, worktree and Task Tracker health checks."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    check = subparsers.add_parser("check")
    check.add_argument("--workspace-root", type=Path)
    check.add_argument("--json", action="store_true", dest="as_json")
    check.add_argument(
        "--strict",
        action="store_true",
        help="Return non-zero for warnings as well as errors.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    root = (
        args.workspace_root.resolve()
        if args.workspace_root
        else Path(__file__).resolve().parents[1]
    )
    try:
        report = build_report(root)
    except DoctorError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    if args.as_json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(_human_summary(report))
    severities = {item["severity"] for item in report["issues"]}
    if "ERROR" in severities or (args.strict and "WARNING" in severities):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
