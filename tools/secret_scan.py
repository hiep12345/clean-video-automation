#!/usr/bin/env python3
"""Fail-closed secret checks for staged changes and commits being pushed."""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO, Iterable, Sequence


MAX_FILE_BYTES = 2 * 1024 * 1024
ZERO_OID = "0" * 40

SECRET_PATTERNS: tuple[tuple[str, re.Pattern[bytes]], ...] = (
    ("Google API key", re.compile(rb"AIza[0-9A-Za-z_-]{35}")),
    ("Google OAuth client secret", re.compile(rb"GOCSPX-[0-9A-Za-z_-]{20,}")),
    ("GitHub token", re.compile(rb"gh[pousr]_[0-9A-Za-z]{20,255}")),
    ("OpenAI API key", re.compile(rb"sk-(?:proj-)?[0-9A-Za-z_-]{20,}")),
    ("AWS access key", re.compile(rb"AKIA[0-9A-Z]{16}")),
    ("Facebook access token", re.compile(rb"EAA[0-9A-Za-z]{50,}")),
    ("Notion integration token", re.compile(rb"ntn_[0-9A-Za-z]{30,}")),
    ("Slack token", re.compile(rb"xox[baprs]-[0-9A-Za-z-]{20,}")),
    (
        "Private key",
        re.compile(rb"-{5}BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-{5}"),
    ),
)

HUNK_RE = re.compile(rb"@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@")


class ScanError(RuntimeError):
    """Raised when Git data cannot be inspected safely."""


@dataclass(frozen=True)
class Finding:
    rule: str
    source: str
    line: int


def _git(repo: Path, *args: str, stdin: bytes | None = None) -> bytes:
    process = subprocess.run(
        ["git", "-C", str(repo), *args],
        input=stdin,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if process.returncode != 0:
        message = process.stderr.decode("utf-8", errors="replace").strip()
        raise ScanError(message or f"git {' '.join(args)} failed")
    return process.stdout


def findings_in_lines(
    lines: Iterable[tuple[str, int, bytes]],
) -> list[Finding]:
    findings: list[Finding] = []
    for source, line_number, content in lines:
        for rule, pattern in SECRET_PATTERNS:
            if pattern.search(content):
                findings.append(Finding(rule, source, line_number))
    return findings


def _added_lines(
    diff: bytes, *, source_prefix: str = ""
) -> Iterable[tuple[str, int, bytes]]:
    source = "<unknown>"
    line_number = 0

    for raw_line in diff.splitlines():
        if raw_line.startswith(b"+++ b/"):
            source = raw_line[6:].decode("utf-8", errors="replace")
            continue

        hunk = HUNK_RE.search(raw_line)
        if hunk:
            line_number = int(hunk.group(1))
            continue

        if raw_line.startswith(b"+") and not raw_line.startswith(b"+++"):
            label = f"{source_prefix}{source}" if source_prefix else source
            yield label, line_number, raw_line[1:]
            line_number += 1
        elif raw_line.startswith(b" "):
            line_number += 1


def scan_staged(repo: Path) -> list[Finding]:
    diff = _git(
        repo,
        "diff",
        "--cached",
        "--no-ext-diff",
        "--unified=0",
        "--diff-filter=ACMRTUXB",
        "--",
        ".",
    )
    return findings_in_lines(_added_lines(diff))


def _tracked_lines(repo: Path) -> Iterable[tuple[str, int, bytes]]:
    paths = _git(repo, "ls-files", "-z").split(b"\0")
    for encoded_path in paths:
        if not encoded_path:
            continue
        relative_path = encoded_path.decode("utf-8", errors="surrogateescape")
        path = repo / relative_path
        if not path.is_file() or path.stat().st_size > MAX_FILE_BYTES:
            continue
        content = path.read_bytes()
        if b"\0" in content:
            continue
        for line_number, line in enumerate(content.splitlines(), start=1):
            yield relative_path, line_number, line


def scan_tracked(repo: Path) -> list[Finding]:
    return findings_in_lines(_tracked_lines(repo))


def _commits_for_update(repo: Path, local_oid: str, remote_oid: str) -> list[str]:
    if local_oid == ZERO_OID:
        return []
    revision = local_oid if remote_oid == ZERO_OID else f"{remote_oid}..{local_oid}"
    output = _git(repo, "rev-list", "--reverse", revision)
    return [line for line in output.decode("ascii").splitlines() if line]


def scan_pre_push(repo: Path, stream: BinaryIO) -> list[Finding]:
    commits: set[str] = set()
    for raw_line in stream:
        fields = raw_line.decode("utf-8", errors="replace").strip().split()
        if len(fields) != 4:
            raise ScanError("unexpected pre-push input")
        _, local_oid, _, remote_oid = fields
        commits.update(_commits_for_update(repo, local_oid, remote_oid))

    findings: list[Finding] = []
    for commit in sorted(commits):
        diff = _git(
            repo,
            "show",
            "--format=",
            "--no-ext-diff",
            "--unified=0",
            "--diff-filter=ACMRTUXB",
            commit,
            "--",
            ".",
        )
        findings.extend(
            findings_in_lines(_added_lines(diff, source_prefix=f"{commit[:12]}:"))
        )
    return findings


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--staged", action="store_true")
    mode.add_argument("--tracked", action="store_true")
    mode.add_argument("--pre-push", action="store_true")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    repo = args.repo.resolve()

    try:
        if args.staged:
            findings = scan_staged(repo)
        elif args.tracked:
            findings = scan_tracked(repo)
        else:
            findings = scan_pre_push(repo, sys.stdin.buffer)
    except (OSError, ScanError) as exc:
        print(f"SECRET SCAN ERROR: {exc}", file=sys.stderr)
        return 2

    if findings:
        print("SECRET SCAN BLOCKED: possible credentials detected.", file=sys.stderr)
        for finding in findings:
            print(
                f"- {finding.rule}: {finding.source}:{finding.line} (value redacted)",
                file=sys.stderr,
            )
        print(
            "Move credentials to an ignored .env/.secrets location before continuing.",
            file=sys.stderr,
        )
        return 1

    print("SECRET SCAN PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
