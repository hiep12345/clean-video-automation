"""Read-only Git, submodule, and worktree checks."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .models import Issue, count_by, relative_path, run_git


def classify_path(path: str) -> str:
    """Classify a repository-relative path using reusable path families."""
    normalized = path.replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    parts = normalized.split("/")
    if normalized.startswith(".agents/state/"):
        return "runtime-state"
    if normalized.startswith(".agents/results/"):
        return "runtime-result"
    if ".worktrees/" in f"/{normalized}" or normalized.startswith(".worktrees/"):
        return "worktree"
    if normalized.startswith(("intake/", "output/", "resources/")):
        return "production"
    if normalized.startswith(("config/", "scripts/", "tests/", "test/")):
        return "implementation"
    if parts[-1].lower().endswith((".mp4", ".mov", ".png", ".jpg", ".jpeg")):
        return "media"
    if normalized.startswith(("obsidian-kb/", "docs/")):
        return "knowledge"
    return "unknown"


def status_entries(repo: Path) -> list[dict[str, str]]:
    output = run_git(
        repo,
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
        "--ignore-submodules=none",
    )
    entries: list[dict[str, str]] = []
    for raw in output.splitlines():
        if len(raw) < 4:
            continue
        status = raw[:2]
        value = raw[3:]
        path = value.split(" -> ", 1)[-1]
        entries.append(
            {
                "status": status,
                "path": path,
                "classification": classify_path(path),
            }
        )
    return entries


def upstream_state(repo: Path) -> dict[str, Any]:
    branch = run_git(repo, "branch", "--show-current").strip()
    upstream = run_git(
        repo,
        "rev-parse",
        "--abbrev-ref",
        "--symbolic-full-name",
        "@{upstream}",
        check=False,
    ).strip()
    state: dict[str, Any] = {
        "branch": branch,
        "upstream": upstream or None,
        "ahead": None,
        "behind": None,
    }
    if not upstream:
        return state
    counts = run_git(
        repo,
        "rev-list",
        "--left-right",
        "--count",
        f"HEAD...{upstream}",
    ).strip().split()
    if len(counts) == 2:
        state["ahead"], state["behind"] = map(int, counts)
    return state


def discover_submodules(root: Path) -> list[tuple[str, Path]]:
    gitmodules = root / ".gitmodules"
    if not gitmodules.is_file():
        return []
    output = run_git(
        root,
        "config",
        "-f",
        str(gitmodules),
        "--get-regexp",
        r"^submodule\..*\.path$",
        check=False,
    )
    discovered: list[tuple[str, Path]] = []
    for line in output.splitlines():
        key, _, value = line.partition(" ")
        if not value:
            continue
        name = key.removeprefix("submodule.").removesuffix(".path")
        discovered.append((name, (root / value.strip()).resolve()))
    return discovered


def repository_issues(
    name: str,
    repo: Path,
) -> tuple[dict[str, Any], list[Issue]]:
    if not repo.exists():
        return (
            {"name": name, "path": str(repo), "available": False},
            [
                Issue(
                    "REPOSITORY_MISSING",
                    "ERROR",
                    "Configured repository path does not exist.",
                    repository=name,
                    path=str(repo),
                )
            ],
        )
    entries = status_entries(repo)
    upstream = upstream_state(repo)
    issues: list[Issue] = []
    if entries:
        issues.append(
            Issue(
                "REPOSITORY_DIRTY",
                "ERROR",
                f"Repository has {len(entries)} changed paths.",
                repository=name,
                path=str(repo),
                details={
                    "counts": count_by(
                        item["classification"] for item in entries
                    )
                },
            )
        )
    if upstream["upstream"] is None:
        issues.append(
            Issue(
                "UPSTREAM_MISSING",
                "WARNING",
                "Current branch has no configured upstream.",
                repository=name,
                path=str(repo),
                details={"branch": upstream["branch"]},
            )
        )
    elif upstream["ahead"] and upstream["behind"]:
        issues.append(
            Issue(
                "BRANCH_DIVERGED",
                "ERROR",
                "Current branch has commits on both sides of its upstream.",
                repository=name,
                path=str(repo),
                details=upstream,
            )
        )
    elif upstream["ahead"]:
        issues.append(
            Issue(
                "UNPUSHED_COMMITS",
                "ERROR",
                "Current branch has unpushed commits.",
                repository=name,
                path=str(repo),
                details=upstream,
            )
        )

    for entry in entries:
        if entry["status"] != "??":
            continue
        if entry["classification"] in {"production", "media"}:
            issues.append(
                Issue(
                    "UNTRACKED_PRODUCTION_ASSET",
                    "ERROR",
                    "Production data is not tracked by Git.",
                    repository=name,
                    path=entry["path"],
                )
            )
        elif entry["path"].replace("\\", "/").startswith("scripts/"):
            issues.append(
                Issue(
                    "UNTRACKED_SCRIPT",
                    "ERROR",
                    "Executable script has no Git owner.",
                    repository=name,
                    path=entry["path"],
                )
            )
    return (
        {
            "name": name,
            "path": str(repo),
            "available": True,
            "git": upstream,
            "changes": entries,
        },
        issues,
    )


def worktree_issues(root: Path, repos: list[tuple[str, Path]]) -> list[Issue]:
    issues: list[Issue] = []
    root_resolved = root.resolve()
    for name, repo in [("root", root), *repos]:
        if not repo.exists():
            continue
        output = run_git(repo, "worktree", "list", "--porcelain")
        for line in output.splitlines():
            if not line.startswith("worktree "):
                continue
            path = Path(line.removeprefix("worktree ").strip()).resolve()
            if path == repo.resolve():
                continue
            try:
                path.relative_to(root_resolved)
            except ValueError:
                continue
            issues.append(
                Issue(
                    "IN_REPOSITORY_WORKTREE",
                    "ERROR",
                    "Linked worktree is stored inside the root repository.",
                    repository=name,
                    path=relative_path(path, root),
                )
            )
    return issues


def submodule_issues(root: Path) -> list[Issue]:
    issues: list[Issue] = []
    output = run_git(root, "submodule", "status", check=False)
    for line in output.splitlines():
        if line.startswith("+"):
            parts = line[1:].strip().split()
            issues.append(
                Issue(
                    "SUBMODULE_GITLINK_MISMATCH",
                    "ERROR",
                    "Checked-out submodule commit differs from the root gitlink.",
                    path=parts[1] if len(parts) > 1 else None,
                    details={"status": line.strip()},
                )
            )
        elif line.startswith("-"):
            issues.append(
                Issue(
                    "SUBMODULE_NOT_INITIALIZED",
                    "ERROR",
                    "Configured submodule is not initialized.",
                    details={"status": line.strip()},
                )
            )
    return issues
