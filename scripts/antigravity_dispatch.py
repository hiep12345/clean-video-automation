#!/usr/bin/env python3
"""Fail-closed two-phase dispatcher for Antigravity 2 ``agentapi``.

The dispatcher never claims a Task Tracker task. It records the expected
dispatch identity, creates a conversation with a single-line bootstrap,
verifies the returned local metadata, and requests an acknowledgement. A
separate verification step must pass before the caller invokes team_preflight.
"""

from __future__ import annotations

import argparse
from contextlib import closing
import hashlib
import json
import os
import re
import sqlite3
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Mapping
from urllib.parse import unquote, urlparse

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from antigravity_session_lifecycle import (
    ScannerError,
    evaluate_handover_gate,
    load_policy,
)


UUID_RE = re.compile(
    r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
)
SHA256_RE = re.compile(r"[0-9a-f]{64}")
class DispatchError(RuntimeError):
    """Raised when dispatch identity or external metadata cannot be proven."""


@dataclass(frozen=True)
class DispatchSpec:
    task_id: str
    role: str
    trajectory_id: str
    project_id: str
    workspace_root: Path
    work_order_sha256: str
    claim_allowed_state: str
    profile_uri: str = ""


@dataclass(frozen=True)
class DispatchAuthority:
    task_id: str
    role: str
    trajectory_id: str


@dataclass(frozen=True)
class DispatchPreparation:
    state: str
    ack_token: str = field(repr=False)


@dataclass(frozen=True)
class LocalConversationIdentity:
    cascade_id: str
    trajectory_id: str
    step_count: int
    conversation_db: Path


@dataclass(frozen=True)
class RuntimeCandidate:
    pid: int
    port: int
    csrf_token: str = field(repr=False)
    executable_path: str = ""


@dataclass(frozen=True)
class AgentApiRuntime:
    executable: Path
    pid: int
    port: int
    address: str
    csrf_token: str = field(repr=False)
    provenance: str = "process"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _single_line(value: str, label: str) -> str:
    text = str(value).strip()
    if not text or "\n" in text or "\r" in text:
        raise DispatchError(f"{label} must be one non-empty line")
    return text


def _quote_windows_batch_argument(value: str) -> str:
    """Quote one controlled AgentAPI argument for cmd.exe.

    Batch files are interpreted by ``cmd.exe`` rather than the C runtime.  We
    therefore use cmd's simple double-quoted argument form only after rejecting
    its metacharacters.  The profile URI may contain URL escapes such as
    ``%20``; paired percent expansions are rejected, while ordinary URL escapes
    remain intact.
    """
    text = str(value)
    if any(character in text for character in '"&|<>()^!'):
        raise DispatchError("unsafe character in Windows batch argument")
    if re.search(r"%[^%]+%", text):
        raise DispatchError("unsafe environment expansion in Windows batch argument")
    if "\n" in text or "\r" in text:
        raise DispatchError("Windows batch argument must be one line")
    return f'"{text}"'


def resolve_profile_uri(value: str, workspace_root: Path) -> str:
    """Return a canonical managed agent-profile URI or fail closed.

    A dispatcher may select any workspace agent profile, but it must never
    accept an arbitrary local file or a profile outside the workspace.  This
    keeps the AgentAPI ``--profile`` argument generic without turning it into
    a path-injection escape hatch.
    """
    raw = _single_line(value, "profile URI")
    parsed = urlparse(raw)
    if parsed.scheme.casefold() != "file" or parsed.netloc:
        raise DispatchError("profile URI must be a local file URI")
    path_text = unquote(parsed.path)
    if re.fullmatch(r"/[A-Za-z]:/.*", path_text):
        path_text = path_text[1:]
    profile_path = Path(path_text).resolve()
    profiles_root = (workspace_root / ".agents" / "agents").resolve()
    try:
        profile_path.relative_to(profiles_root)
    except ValueError as exc:
        raise DispatchError("profile URI must be under .agents/agents") from exc
    if profile_path.parent != profiles_root or not (profile_path / "agent.md").is_file():
        raise DispatchError("profile URI must name a managed agent profile")
    return profile_path.as_uri()


def build_bootstrap(spec: DispatchSpec) -> str:
    prompt = (
        f"Load Task Tracker task {spec.task_id} as role {spec.role} for project "
        f"{spec.project_id}; profile {spec.profile_uri}; expected trajectory "
        f"{spec.trajectory_id}; work-order "
        f"sha256 {spec.work_order_sha256}; do not claim or execute; first verify "
        "workspace/project/task evidence and acknowledge the dispatch handshake."
    )
    return _single_line(prompt, "bootstrap prompt")


def build_handshake_message(
    spec: DispatchSpec,
    conversation_id: str,
    ack_token: str,
) -> str:
    message = (
        f"For Task Tracker task {spec.task_id}, run the supported dispatch-ack "
        f"contract with role={spec.role}, trajectory={spec.trajectory_id}, "
        f"conversation-id={conversation_id}, work-order-sha256="
        f"{spec.work_order_sha256}, ack-token={_single_line(ack_token, 'ack token')}; "
        f"require state={spec.claim_allowed_state}; do not claim before the "
        "authenticated acknowledgement succeeds."
    )
    return _single_line(message, "handshake message")


def load_claim_allowed_state(workspace_root: Path) -> str:
    manifest = workspace_root / ".agents" / "config" / "team-manifest.yaml"
    try:
        payload = json.loads(manifest.read_text(encoding="utf-8"))
        state = payload["task_tracker"]["dispatch_evidence"][
            "claim_allowed_state"
        ]
    except (OSError, json.JSONDecodeError, KeyError, TypeError) as exc:
        raise DispatchError(
            f"team manifest dispatch claim state is unavailable: {manifest}"
        ) from exc
    normalized = str(state).strip().upper()
    if not normalized or not re.fullmatch(r"[A-Z][A-Z0-9_]*", normalized):
        raise DispatchError("team manifest dispatch claim state is invalid")
    return normalized


def parse_conversation_id(output: str) -> str:
    identifiers = sorted(set(match.group(0).lower() for match in UUID_RE.finditer(output)))
    if len(identifiers) != 1:
        raise DispatchError("agentapi did not return exactly one conversation UUID")
    return identifiers[0]


def _run_process(
    command: list[str] | str,
    *,
    env: Mapping[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=dict(env) if env is not None else None,
        shell=isinstance(command, str),
    )


def _powershell_runtime_candidates(
    run: Callable[..., subprocess.CompletedProcess[str]] = _run_process,
) -> list[dict[str, Any]]:
    script = r"""
$items = @()
$processes = Get-CimInstance Win32_Process -Filter "Name='language_server.exe'" |
  Where-Object { $_.ExecutablePath -match 'Antigravity' -or $_.CommandLine -match 'Antigravity' }
foreach ($process in $processes) {
  $match = [regex]::Match($process.CommandLine, '--csrf[_-]?token(?:=|\s+)(?:"([^"]+)"|([^\s]+))')
  if (-not $match.Success) { continue }
  $token = if ($match.Groups[1].Success) { $match.Groups[1].Value } else { $match.Groups[2].Value }
  $ports = @(Get-NetTCPConnection -OwningProcess $process.ProcessId -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalAddress -in @('127.0.0.1', '::1', '0.0.0.0', '::') } |
    Select-Object -ExpandProperty LocalPort)
  foreach ($port in $ports) {
    $items += [pscustomobject]@{
      pid = [int]$process.ProcessId
      port = [int]$port
      csrf_token = $token
      executable_path = [string]$process.ExecutablePath
    }
  }
}
$items | ConvertTo-Json -Compress
"""
    result = run(
        ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script]
    )
    if result.returncode != 0:
        raise DispatchError("Antigravity language-server discovery failed")
    try:
        payload = json.loads(result.stdout or "[]")
    except json.JSONDecodeError as exc:
        raise DispatchError("Antigravity discovery returned invalid JSON") from exc
    if isinstance(payload, dict):
        payload = [payload]
    if not isinstance(payload, list):
        raise DispatchError("Antigravity discovery returned an invalid candidate list")
    return [item for item in payload if isinstance(item, dict)]


def _runtime_candidates(raw: list[dict[str, Any]]) -> list[RuntimeCandidate]:
    candidates: dict[tuple[int, int, str], RuntimeCandidate] = {}
    for item in raw:
        try:
            pid = int(item["pid"])
            port = int(item["port"])
            token = str(item["csrf_token"]).strip()
            executable_path = str(item.get("executable_path", "")).strip()
        except (KeyError, TypeError, ValueError):
            continue
        if pid < 1 or not 1 <= port <= 65535 or not token:
            continue
        key = (pid, port, token)
        candidates[key] = RuntimeCandidate(
            pid=pid,
            port=port,
            csrf_token=token,
            executable_path=executable_path,
        )
    return sorted(candidates.values(), key=lambda item: (item.pid, item.port))


def discover_runtime(
    environment: Mapping[str, str] | None = None,
    *,
    run: Callable[..., subprocess.CompletedProcess[str]] = _run_process,
) -> AgentApiRuntime:
    env = dict(os.environ if environment is None else environment)
    executable = Path(
        env.get("ANTIGRAVITY_AGENTAPI", "").strip()
        or Path.home() / ".gemini" / "antigravity" / "bin" / "agentapi.bat"
    )
    if not executable.is_file():
        raise DispatchError(f"agentapi executable not found: {executable}")
    supplied_address = env.get("ANTIGRAVITY_LS_ADDRESS", "").strip()
    supplied_token = env.get("ANTIGRAVITY_CSRF_TOKEN", "").strip()
    supplied_pid = env.get("ANTIGRAVITY_LS_PID", "").strip()
    if len([value for value in (supplied_address, supplied_token, supplied_pid) if value]) not in {0, 3}:
        raise DispatchError(
            "ANTIGRAVITY_LS_ADDRESS, ANTIGRAVITY_CSRF_TOKEN and "
            "ANTIGRAVITY_LS_PID must be supplied together"
        )
    candidates = _runtime_candidates(_powershell_runtime_candidates(run))
    if not candidates:
        raise DispatchError("No active Antigravity language-server endpoint found")
    if supplied_address:
        parsed_supplied = urlparse(supplied_address)
        if (
            parsed_supplied.scheme != "https"
            or parsed_supplied.hostname not in {"127.0.0.1", "localhost", "::1"}
            or parsed_supplied.port is None
        ):
            raise DispatchError("Supplied Antigravity endpoint must be local HTTPS")
        try:
            configured_pid = int(supplied_pid)
        except ValueError as exc:
            raise DispatchError("ANTIGRAVITY_LS_PID must be an integer") from exc
        candidates = [
            item
            for item in candidates
            if item.pid == configured_pid
            and item.port == parsed_supplied.port
            and item.csrf_token == supplied_token
        ]
        if len(candidates) != 1:
            raise DispatchError(
                "Supplied Antigravity endpoint tuple does not match exactly one "
                "process provenance record"
            )
    elif len(candidates) != 1:
        provenance = ",".join(
            f"pid={item.pid}:port={item.port}" for item in candidates
        )
        raise DispatchError(
            "Ambiguous Antigravity language-server endpoints: " + provenance
        )
    candidate = candidates[0]
    address = f"https://127.0.0.1:{candidate.port}"
    parsed = urlparse(address)
    if parsed.scheme != "https" or parsed.hostname not in {
        "127.0.0.1",
        "localhost",
        "::1",
    }:
        raise DispatchError("Antigravity language-server address must be local HTTPS")
    return AgentApiRuntime(
        executable=executable,
        pid=candidate.pid,
        port=candidate.port,
        address=address,
        csrf_token=candidate.csrf_token,
    )


def resolve_local_conversation_identity(
    antigravity_root: Path,
    source_trajectory_id: str,
) -> LocalConversationIdentity:
    """Derive source identity and step count from read-only local SQLite metadata."""
    trajectory_id = str(source_trajectory_id).strip().lower()
    if not UUID_RE.fullmatch(trajectory_id):
        raise DispatchError("source trajectory ID is invalid")
    conversations = antigravity_root / "conversations"
    brain_root = antigravity_root / "brain"
    if not conversations.is_dir() or not brain_root.is_dir():
        raise DispatchError("Antigravity conversation metadata store is unavailable")
    matches: list[LocalConversationIdentity] = []
    inspection_errors: list[str] = []
    for database in sorted(conversations.glob("*.db")):
        uri = f"file:{database.resolve().as_posix()}?mode=ro"
        try:
            with closing(sqlite3.connect(uri, uri=True, timeout=1.0)) as connection:
                with closing(connection.cursor()) as cursor:
                    cursor.execute("PRAGMA query_only=ON")
                    cursor.execute(
                        "SELECT name FROM sqlite_master WHERE type='table'"
                    )
                    tables = {str(row[0]) for row in cursor.fetchall()}
                    if "trajectory_meta" not in tables:
                        continue
                    cursor.execute(
                        "SELECT trajectory_id, cascade_id FROM trajectory_meta "
                        "WHERE lower(trajectory_id)=?",
                        (trajectory_id,),
                    )
                    rows = cursor.fetchall()
                    if not rows:
                        continue
                    if "steps" not in tables:
                        raise DispatchError(
                            "conversation step metadata is unavailable: "
                            f"{database.name}"
                        )
                    cascade_ids = {
                        str(row[1]).strip().lower()
                        for row in rows
                        if UUID_RE.fullmatch(str(row[1]).strip())
                    }
                    if len(cascade_ids) != 1:
                        raise DispatchError(
                            f"conversation identity is ambiguous: {database.name}"
                        )
                    cascade_id = next(iter(cascade_ids))
                    if not (brain_root / cascade_id).is_dir():
                        raise DispatchError(
                            "conversation brain metadata is unavailable: "
                            f"{cascade_id}"
                        )
                    cursor.execute("SELECT COUNT(*) FROM steps")
                    step_count = int(cursor.fetchone()[0])
                    matches.append(
                        LocalConversationIdentity(
                            cascade_id=cascade_id,
                            trajectory_id=trajectory_id,
                            step_count=step_count,
                            conversation_db=database.resolve(),
                        )
                    )
        except DispatchError:
            raise
        except (OSError, sqlite3.Error, TypeError, ValueError) as exc:
            inspection_errors.append(f"{database.name}:{type(exc).__name__}")
    if inspection_errors:
        raise DispatchError(
            "Antigravity conversation metadata could not be fully verified: "
            + ",".join(inspection_errors)
        )
    if not matches:
        raise DispatchError("source trajectory is absent from local conversation metadata")
    if len(matches) != 1:
        raise DispatchError("source trajectory maps to multiple local conversations")
    return matches[0]


class AgentApiClient:
    def __init__(
        self,
        runtime: AgentApiRuntime,
        *,
        run: Callable[..., subprocess.CompletedProcess[str]] = _run_process,
    ) -> None:
        self.runtime = runtime
        self._run = run

    def _command(self, *args: str, project_id: str | None = None) -> str:
        executable = self.runtime.executable
        if executable.suffix.casefold() in {".bat", ".cmd"}:
            # ``subprocess`` cannot pass a space-containing batch-file path
            # as an argv array: cmd.exe then splits the executable before the
            # batch parser receives it.  Send one cmd.exe command line instead.
            # AgentAPI arguments are machine-built and quoted with cmd.exe
            # rules; unsafe shell metacharacters fail closed before execution.
            batch_arguments = [str(executable), *args]
            command = " ".join(
                _quote_windows_batch_argument(value)
                for value in batch_arguments
            )
        else:
            command = [str(executable), *args]
        env = dict(os.environ)
        env["ANTIGRAVITY_LS_ADDRESS"] = self.runtime.address
        env["ANTIGRAVITY_CSRF_TOKEN"] = self.runtime.csrf_token
        if project_id:
            env["ANTIGRAVITY_PROJECT_ID"] = project_id
        result = self._run(command, env=env)
        if result.returncode != 0:
            raise DispatchError(f"agentapi command failed: {args[0]}")
        return result.stdout

    def new_conversation(
        self,
        prompt: str,
        *,
        project_id: str,
        profile_uri: str,
        title: str,
    ) -> str:
        output = self._command(
            "new-conversation",
            "--model=pro",
            f"--title={_single_line(title, 'conversation title')}",
            f"--profile={_single_line(profile_uri, 'profile URI')}",
            _single_line(prompt, "bootstrap prompt"),
            project_id=project_id,
        )
        return parse_conversation_id(output)

    def get_metadata(self, conversation_id: str) -> dict[str, Any]:
        output = self._command("get-conversation-metadata", conversation_id)
        try:
            payload = json.loads(output)
        except json.JSONDecodeError as exc:
            raise DispatchError("agentapi metadata is not valid JSON") from exc
        if not isinstance(payload, dict):
            raise DispatchError("agentapi metadata root must be an object")
        return payload

    def send_message(self, conversation_id: str, message: str, *, title: str) -> None:
        self._command(
            "send-message",
            f"--title={_single_line(title, 'message title')}",
            conversation_id,
            _single_line(message, "handshake message"),
        )


class TaskTrackerGateway:
    def __init__(
        self,
        task_manager: Path,
        *,
        run: Callable[..., subprocess.CompletedProcess[str]] = _run_process,
    ) -> None:
        self.task_manager = task_manager
        self._run = run

    def _call(self, *args: str) -> Any:
        result = self._run([sys.executable, str(self.task_manager), *args])
        if result.returncode != 0:
            issue_text = "rejected"
            try:
                rejected = json.loads(result.stdout)
                issues = rejected.get("issues", []) if isinstance(rejected, dict) else []
                if isinstance(issues, list) and issues:
                    issue_text = ",".join(str(item) for item in issues)
            except json.JSONDecodeError:
                pass
            raise DispatchError(
                f"Task Tracker command failed: {args[0]}: {issue_text}"
            )
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError as exc:
            raise DispatchError("Task Tracker returned invalid JSON") from exc

    def dispatch_prepare(
        self,
        spec: DispatchSpec,
        authority: DispatchAuthority,
    ) -> DispatchPreparation:
        payload = self._call(
            "dispatch-prepare",
            "--task",
            spec.task_id,
            "--authority-task",
            authority.task_id,
            "--authority-role",
            authority.role,
            "--authority-trajectory",
            authority.trajectory_id,
            "--authority-target",
            f"task:{spec.task_id}",
            "--expected-role",
            spec.role,
            "--expected-trajectory",
            spec.trajectory_id,
            "--work-order-sha256",
            spec.work_order_sha256,
            "--json",
        )
        if not isinstance(payload, dict) or not payload.get("ok"):
            raise DispatchError("Task Tracker dispatch prepare was rejected")
        expected = {
            "task_id": spec.task_id,
            "state": "PREPARED",
            "expected_role": spec.role,
            "expected_trajectory": spec.trajectory_id,
            "work_order_sha256": spec.work_order_sha256,
        }
        mismatches = [
            key for key, value in expected.items() if payload.get(key) != value
        ]
        token = str(payload.get("ack_token", "")).strip()
        if mismatches or not token or "\n" in token or "\r" in token:
            raise DispatchError("Task Tracker dispatch prepare response mismatch")
        return DispatchPreparation(state="PREPARED", ack_token=token)

    def dispatch_bind(
        self,
        spec: DispatchSpec,
        authority: DispatchAuthority,
        conversation_id: str,
    ) -> dict[str, Any]:
        payload = self._call(
            "dispatch-bind",
            "--task",
            spec.task_id,
            "--authority-task",
            authority.task_id,
            "--authority-role",
            authority.role,
            "--authority-trajectory",
            authority.trajectory_id,
            "--authority-target",
            f"task:{spec.task_id}",
            "--conversation-id",
            conversation_id,
            "--json",
        )
        if (
            not isinstance(payload, dict)
            or not payload.get("ok")
            or payload.get("task_id") != spec.task_id
            or payload.get("state") != "HANDSHAKE_REQUESTED"
        ):
            raise DispatchError("Task Tracker dispatch bind response mismatch")
        return payload

    def dispatch_verify(
        self,
        spec: DispatchSpec,
        conversation_id: str,
    ) -> dict[str, Any]:
        payload = self._call(
            "dispatch-verify",
            "--task",
            spec.task_id,
            "--role",
            spec.role,
            "--trajectory",
            spec.trajectory_id,
            "--conversation-id",
            conversation_id,
            "--work-order-sha256",
            spec.work_order_sha256,
            "--json",
        )
        if not isinstance(payload, dict):
            raise DispatchError("Task Tracker dispatch verify response is invalid")
        return payload

    def dispatch_abort(
        self,
        spec: DispatchSpec,
        authority: DispatchAuthority,
        *,
        reason_code: str,
        conversation_id: str | None = None,
    ) -> dict[str, Any]:
        arguments = [
            "dispatch-abort",
            "--task",
            spec.task_id,
            "--authority-task",
            authority.task_id,
            "--authority-role",
            authority.role,
            "--authority-trajectory",
            authority.trajectory_id,
            "--authority-target",
            f"task:{spec.task_id}",
            "--reason-code",
            _single_line(reason_code, "dispatch abort reason"),
        ]
        if conversation_id:
            arguments.extend(["--conversation-id", conversation_id])
        arguments.append("--json")
        payload = self._call(*arguments)
        if (
            not isinstance(payload, dict)
            or not payload.get("ok")
            or payload.get("task_id") != spec.task_id
            or payload.get("state") != "ABORTED"
        ):
            raise DispatchError("Task Tracker dispatch abort response mismatch")
        return payload


def _metadata_values(payload: Any, accepted_keys: set[str]) -> list[str]:
    values: list[str] = []
    if isinstance(payload, dict):
        for key, value in payload.items():
            normalized = re.sub(r"[^a-z]", "", str(key).casefold())
            if normalized in accepted_keys:
                if isinstance(value, str):
                    values.append(value)
                elif isinstance(value, (list, dict)):
                    values.extend(_all_strings(value))
            values.extend(_metadata_values(value, accepted_keys))
    elif isinstance(payload, list):
        for item in payload:
            values.extend(_metadata_values(item, accepted_keys))
    return values


def _all_strings(payload: Any) -> list[str]:
    if isinstance(payload, str):
        return [payload]
    if isinstance(payload, dict):
        output: list[str] = []
        for value in payload.values():
            output.extend(_all_strings(value))
        return output
    if isinstance(payload, list):
        output = []
        for value in payload:
            output.extend(_all_strings(value))
        return output
    return []


def _normalize_workspace(value: str) -> str:
    parsed = urlparse(value)
    text = unquote(parsed.path) if parsed.scheme == "file" else value
    if re.fullmatch(r"/[A-Za-z]:/.*", text):
        text = text[1:]
    return str(Path(text).resolve()).casefold()


def verify_metadata(
    metadata: dict[str, Any], spec: DispatchSpec, conversation_id: str
) -> None:
    conversations = {
        value.lower()
        for value in _metadata_values(
            metadata,
            {
                "conversationid",
                "cascadeid",
                "conversationuuid",
                "rootconversationid",
            },
        )
        if UUID_RE.fullmatch(value)
    }
    if conversation_id.lower() not in conversations:
        raise DispatchError("conversation metadata ID mismatch")
    projects = set(
        _metadata_values(metadata, {"projectid", "antigravityprojectid"})
    )
    if spec.project_id not in projects:
        raise DispatchError("conversation metadata project mismatch")
    expected_workspace = str(spec.workspace_root.resolve()).casefold()
    workspaces = {
        _normalize_workspace(value)
        for value in _metadata_values(
            metadata,
            {"workspace", "workspaceuri", "workspacepath", "workspacefolders"},
        )
    }
    if expected_workspace not in workspaces:
        # AgentAPI may omit workspaceUris even when it received the canonical
        # local workspace path as projectId.  Accept that narrow representation
        # only when both the requested and returned project IDs resolve to the
        # exact workspace root; aliases and opaque project IDs remain blocked.
        requested_project = _normalize_workspace(spec.project_id)
        returned_projects = {
            _normalize_workspace(value) for value in projects
        }
        if (
            requested_project != expected_workspace
            or expected_workspace not in returned_projects
        ):
            raise DispatchError("conversation metadata workspace mismatch")
    profiles = {
        _normalize_workspace(value)
        for value in _metadata_values(metadata, {"activeprofile"})
    }
    if _normalize_workspace(spec.profile_uri) not in profiles:
        raise DispatchError("conversation metadata profile mismatch")


def prepare_dispatch(
    spec: DispatchSpec,
    *,
    gateway: TaskTrackerGateway,
    agentapi: AgentApiClient,
    authority: DispatchAuthority,
    lifecycle_gate: Mapping[str, Any],
    source_identity: LocalConversationIdentity,
) -> dict[str, Any]:
    if not lifecycle_gate or not lifecycle_gate.get("allowed"):
        raise DispatchError(
            "session lifecycle blocked dispatch: "
            + ",".join((lifecycle_gate or {}).get("issues", ["gate_missing"]))
        )
    if not SHA256_RE.fullmatch(spec.work_order_sha256):
        raise DispatchError("work-order SHA-256 is invalid")
    if not spec.profile_uri:
        raise DispatchError("profile URI is required for dispatch")
    if not UUID_RE.fullmatch(spec.trajectory_id):
        raise DispatchError("expected trajectory ID is invalid")
    if not UUID_RE.fullmatch(authority.trajectory_id):
        raise DispatchError("authority trajectory ID is invalid")
    if source_identity.trajectory_id != authority.trajectory_id:
        raise DispatchError(
            "local conversation trajectory does not match dispatch authority"
        )
    if source_identity.trajectory_id == spec.trajectory_id:
        raise DispatchError("source and successor trajectories must differ")
    bootstrap = build_bootstrap(spec)
    preparation = gateway.dispatch_prepare(spec, authority)
    conversation_id: str | None = None
    phase = "agentapi_new_conversation"
    try:
        conversation_id = agentapi.new_conversation(
            bootstrap,
            project_id=spec.project_id,
            profile_uri=spec.profile_uri,
            title=f"dispatch-{spec.task_id}",
        )
        phase = "agentapi_metadata"
        metadata = agentapi.get_metadata(conversation_id)
        verify_metadata(metadata, spec, conversation_id)
        phase = "dispatch_bind"
        gateway.dispatch_bind(spec, authority, conversation_id)
        phase = "handshake_send"
        agentapi.send_message(
            conversation_id,
            build_handshake_message(
                spec,
                conversation_id,
                preparation.ack_token,
            ),
            title=f"handshake-{spec.task_id}",
        )
    except Exception:
        try:
            gateway.dispatch_abort(
                spec,
                authority,
                reason_code=f"{phase}_failed",
                conversation_id=conversation_id,
            )
        except Exception as abort_failure:
            raise DispatchError(
                "dispatch failed and authority-bound abort recovery failed"
            ) from abort_failure
        raise
    assert conversation_id is not None
    return {
        "task_id": spec.task_id,
        "conversation_id": conversation_id,
        "work_order_sha256": spec.work_order_sha256,
        "handshake_state": "HANDSHAKE_REQUESTED",
        "source_cascade_id": source_identity.cascade_id,
        "source_step_count": source_identity.step_count,
        "claim_authorized": False,
        "external_model_invoked": True,
    }


def verify_dispatch_handshake(
    spec: DispatchSpec,
    conversation_id: str,
    *,
    gateway: TaskTrackerGateway,
) -> dict[str, Any]:
    payload = gateway.dispatch_verify(spec, conversation_id)
    issues = payload.get("issues", [])
    if (
        not payload.get("ok")
        or not payload.get("authorized")
        or payload.get("state") != spec.claim_allowed_state
        or issues
    ):
        raise DispatchError("Task Tracker dispatch verification was not authorized")
    return {
        "task_id": spec.task_id,
        "conversation_id": conversation_id,
        "work_order_sha256": spec.work_order_sha256,
        "handshake_state": spec.claim_allowed_state,
        "claim_authorized": True,
        "next_action": "team_preflight --claim",
        "external_model_invoked": False,
    }


def _load_json_object(path: Path, label: str) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise DispatchError(f"{label} is missing or invalid: {path}") from exc
    if not isinstance(payload, dict):
        raise DispatchError(f"{label} must be a JSON object")
    return payload


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    for name in ("prepare", "verify"):
        command = subparsers.add_parser(name)
        command.add_argument("--task", required=True)
        command.add_argument("--role", required=True)
        command.add_argument("--trajectory", required=True)
        command.add_argument("--project-id", required=True)
        command.add_argument("--profile", required=True)
        command.add_argument("--workspace-root", required=True, type=Path)
        command.add_argument("--work-order", required=True, type=Path)
        command.add_argument("--task-manager", required=True, type=Path)
        command.add_argument("--json", action="store_true", dest="as_json")
    prepare = subparsers.choices["prepare"]
    prepare.add_argument("--authority-task", required=True)
    prepare.add_argument("--authority-role", required=True)
    prepare.add_argument("--authority-trajectory", required=True)
    prepare.add_argument("--handover-ack", type=Path)
    subparsers.choices["verify"].add_argument("--conversation-id", required=True)
    return parser


def _spec_from_args(args: argparse.Namespace) -> DispatchSpec:
    work_order = args.work_order.resolve()
    workspace_root = args.workspace_root.resolve()
    if workspace_root != SCRIPT_DIR.parent.resolve():
        raise DispatchError(
            "workspace root must match the dispatcher installation root"
        )
    return DispatchSpec(
        task_id=_single_line(args.task, "task id"),
        role=_single_line(args.role, "role"),
        trajectory_id=_single_line(args.trajectory, "trajectory"),
        project_id=_single_line(args.project_id, "project id"),
        profile_uri=resolve_profile_uri(args.profile, workspace_root),
        workspace_root=workspace_root,
        work_order_sha256=sha256_file(work_order),
        claim_allowed_state=load_claim_allowed_state(workspace_root),
    )


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        spec = _spec_from_args(args)
        gateway = TaskTrackerGateway(args.task_manager.resolve())
        if args.command == "verify":
            result = verify_dispatch_handshake(
                spec, args.conversation_id.lower(), gateway=gateway
            )
        else:
            authority = DispatchAuthority(
                task_id=_single_line(args.authority_task, "authority task id"),
                role=_single_line(args.authority_role, "authority role"),
                trajectory_id=_single_line(
                    args.authority_trajectory,
                    "authority trajectory",
                ).lower(),
            )
            source_identity = resolve_local_conversation_identity(
                Path.home() / ".gemini" / "antigravity",
                authority.trajectory_id,
            )
            policy = load_policy(
                spec.workspace_root
                / ".agents"
                / "config"
                / "session-lifecycle.yaml"
            )
            acknowledgement = (
                _load_json_object(args.handover_ack, "handover acknowledgement")
                if args.handover_ack
                else None
            )
            lifecycle_gate = evaluate_handover_gate(
                policy,
                step_count=source_identity.step_count,
                action="dispatch",
                acknowledgement=acknowledgement,
                cascade_id=source_identity.cascade_id,
                source_trajectory_id=source_identity.trajectory_id,
                successor_trajectory_id=spec.trajectory_id,
                work_order_sha256=spec.work_order_sha256,
            )
            runtime = discover_runtime()
            result = prepare_dispatch(
                spec,
                gateway=gateway,
                agentapi=AgentApiClient(runtime),
                authority=authority,
                lifecycle_gate=lifecycle_gate,
                source_identity=source_identity,
            )
    except (DispatchError, ScannerError, OSError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2 if args.as_json else None))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
