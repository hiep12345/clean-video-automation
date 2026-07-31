"""Compose the complete workspace health report."""

from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .git_checks import (
    discover_submodules,
    repository_issues,
    submodule_issues,
    worktree_issues,
)
from .models import Issue, SEVERITY_ORDER, count_by
from .task_checks import duplicate_state_issues, task_database_issues


def build_report(root: Path) -> dict[str, Any]:
    root = root.resolve()
    repos = discover_submodules(root)
    repository_reports: list[dict[str, Any]] = []
    issues: list[Issue] = []
    for name, path in [("root", root), *repos]:
        report, repo_issues = repository_issues(name, path)
        repository_reports.append(report)
        issues.extend(repo_issues)
    issues.extend(submodule_issues(root))
    issues.extend(worktree_issues(root, repos))
    issues.extend(duplicate_state_issues(root))
    issues.extend(task_database_issues(root))
    ordered = sorted(
        issues,
        key=lambda issue: (
            -SEVERITY_ORDER.get(issue.severity, 0),
            issue.code,
            issue.repository,
            issue.path or "",
        ),
    )
    return {
        "schema_version": 1,
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "workspace_root": str(root),
        "mutations_performed": False,
        "summary": {
            "repositories": len(repository_reports),
            "issues": len(ordered),
            "by_severity": count_by(item.severity for item in ordered),
            "by_code": count_by(item.code for item in ordered),
        },
        "repositories": repository_reports,
        "issues": [asdict(item) for item in ordered],
    }
