#!/usr/bin/env python3
"""CLI for read-only Git, worktree, and Task Tracker health checks."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from workspace_health import (
    build_report,
    classify_path,
    duplicate_state_issues as _duplicate_state_issues,
    task_database_issues as _task_database_issues,
)
from workspace_health.models import DoctorError


def _human_summary(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "Workspace Doctor (read-only)",
        f"Workspace: {report['workspace_root']}",
        f"Repositories: {summary['repositories']}",
        f"Issues: {summary['issues']} "
        f"{json.dumps(summary['by_severity'], sort_keys=True)}",
    ]
    for issue in report["issues"]:
        location = f" [{issue['path']}]" if issue.get("path") else ""
        lines.append(
            f"- {issue['severity']} {issue['code']}{location}: "
            f"{issue['message']}"
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
