"""Shared models and helpers for workspace health checks."""

from __future__ import annotations

import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable


SEVERITY_ORDER = {"INFO": 0, "WARNING": 1, "ERROR": 2}


@dataclass(frozen=True)
class Issue:
    code: str
    severity: str
    message: str
    repository: str = "root"
    path: str | None = None
    details: dict[str, Any] = field(default_factory=dict)


class DoctorError(RuntimeError):
    """Raised when a required local source cannot be inspected."""


def run_git(repo: Path, *args: str, check: bool = True) -> str:
    try:
        result = subprocess.run(
            ["git", "-C", str(repo), *args],
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    except OSError as exc:
        raise DoctorError(f"Cannot execute Git: {exc}") from exc
    if check and result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip()
        raise DoctorError(
            f"Git command failed in {repo}: {' '.join(args)}: {detail[:500]}"
        )
    return result.stdout


def relative_path(path: Path, root: Path) -> str:
    try:
        return path.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return str(path.resolve())


def count_by(values: Iterable[str]) -> dict[str, int]:
    output: dict[str, int] = {}
    for value in values:
        output[value] = output.get(value, 0) + 1
    return dict(sorted(output.items()))
