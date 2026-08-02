import json
import os
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts import antigravity_dispatch as dispatch


TASK_ID = "dispatch-test-task"
ROLE = "system-developer"
TRAJECTORY = "12345678-1234-4234-8234-123456789abc"
SOURCE_TRAJECTORY = "11111111-1111-4111-8111-111111111111"
SOURCE_CASCADE = "22222222-2222-4222-8222-222222222222"
AUTHORITY_TRAJECTORY = "33333333-3333-4333-8333-333333333333"
CONVERSATION = "87654321-4321-4321-8321-cba987654321"
WORK_ORDER_SHA256 = "a" * 64
ACK_TOKEN = "one-time-capability"


def create_conversation_db(root, name, trajectory, cascade, steps):
    conversations = root / "conversations"
    brain = root / "brain" / cascade
    conversations.mkdir(parents=True, exist_ok=True)
    brain.mkdir(parents=True, exist_ok=True)
    database = conversations / f"{name}.db"
    with closing(sqlite3.connect(database)) as connection:
        connection.execute(
            "CREATE TABLE trajectory_meta (trajectory_id TEXT, cascade_id TEXT)"
        )
        connection.execute("CREATE TABLE steps (id INTEGER PRIMARY KEY)")
        connection.execute(
            "INSERT INTO trajectory_meta VALUES (?, ?)", (trajectory, cascade)
        )
        connection.executemany(
            "INSERT INTO steps DEFAULT VALUES", [() for _ in range(steps)]
        )
        connection.commit()
    return database


class FakeGateway:
    def __init__(self):
        self.prepare_calls = []
        self.bind_calls = []
        self.abort_calls = []
        self.verify_calls = []
        self.verify_payload = {
            "ok": True,
            "authorized": True,
            "state": "ACKNOWLEDGED",
            "issues": [],
        }

    def dispatch_prepare(self, spec, authority):
        self.prepare_calls.append((spec, authority))
        return dispatch.DispatchPreparation(
            state="PREPARED", ack_token=ACK_TOKEN
        )

    def dispatch_bind(self, spec, authority, conversation_id):
        self.bind_calls.append((spec, authority, conversation_id))
        return {
            "ok": True,
            "task_id": spec.task_id,
            "state": "HANDSHAKE_REQUESTED",
        }

    def dispatch_verify(self, spec, conversation_id):
        self.verify_calls.append((spec, conversation_id))
        return dict(self.verify_payload)

    def dispatch_abort(
        self,
        spec,
        authority,
        *,
        reason_code,
        conversation_id=None,
    ):
        self.abort_calls.append(
            (spec, authority, reason_code, conversation_id)
        )
        return {"ok": True, "task_id": spec.task_id, "state": "ABORTED"}


class FakeAgentApi:
    def __init__(self, workspace, *, project_id="project-one", profile_uri=""):
        self.new_calls = []
        self.metadata_calls = []
        self.messages = []
        self.metadata = {
            "conversationId": CONVERSATION,
            "projectId": project_id,
            "workspaceUri": workspace.as_uri(),
            "activeProfile": profile_uri,
        }

    def new_conversation(self, prompt, *, project_id, profile_uri, title):
        self.new_calls.append((prompt, project_id, profile_uri, title))
        return CONVERSATION

    def get_metadata(self, conversation_id):
        self.metadata_calls.append(conversation_id)
        return dict(self.metadata)

    def send_message(self, conversation_id, message, *, title):
        self.messages.append((conversation_id, message, title))


class DispatcherTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.workspace = Path(self.temp.name).resolve()
        self.profile_uri = (self.workspace / "profiles" / "operator").as_uri()
        self.spec = dispatch.DispatchSpec(
            task_id=TASK_ID,
            role=ROLE,
            trajectory_id=TRAJECTORY,
            project_id="project-one",
            profile_uri=self.profile_uri,
            workspace_root=self.workspace,
            work_order_sha256=WORK_ORDER_SHA256,
            claim_allowed_state="ACKNOWLEDGED",
        )
        self.authority = dispatch.DispatchAuthority(
            task_id="controller-task",
            role="orchestrator",
            trajectory_id=AUTHORITY_TRAJECTORY,
        )
        self.identity = dispatch.LocalConversationIdentity(
            cascade_id=SOURCE_CASCADE,
            trajectory_id=AUTHORITY_TRAJECTORY,
            step_count=12,
            conversation_db=self.workspace / "source.db",
        )

    def tearDown(self):
        self.temp.cleanup()

    def prepare(self, gateway, agentapi, gate=None):
        return dispatch.prepare_dispatch(
            self.spec,
            gateway=gateway,
            agentapi=agentapi,
            authority=self.authority,
            lifecycle_gate={"allowed": True, "issues": []}
            if gate is None
            else gate,
            source_identity=self.identity,
        )

    def test_bootstrap_and_authenticated_handshake_are_single_line(self):
        bootstrap = dispatch.build_bootstrap(self.spec)
        handshake = dispatch.build_handshake_message(
            self.spec, CONVERSATION, ACK_TOKEN
        )
        self.assertNotIn("\n", bootstrap)
        self.assertNotIn("\n", handshake)
        self.assertIn(WORK_ORDER_SHA256, bootstrap)
        self.assertIn(CONVERSATION, handshake)
        self.assertIn(ACK_TOKEN, handshake)
        self.assertIn("dispatch-ack", handshake)

    def test_claim_state_is_loaded_from_root_manifest(self):
        config = self.workspace / ".agents" / "config"
        config.mkdir(parents=True)
        (config / "team-manifest.yaml").write_text(
            json.dumps(
                {
                    "task_tracker": {
                        "dispatch_evidence": {
                            "claim_allowed_state": "ACKNOWLEDGED"
                        }
                    }
                }
            ),
            encoding="utf-8",
        )
        self.assertEqual(
            dispatch.load_claim_allowed_state(self.workspace),
            "ACKNOWLEDGED",
        )

    def test_prepare_cli_has_no_caller_controlled_lifecycle_selector(self):
        help_text = dispatch.build_parser()._subparsers._group_actions[
            0
        ].choices["prepare"].format_help()
        self.assertNotIn("--step-count", help_text)
        self.assertNotIn("--source-trajectory", help_text)
        self.assertIn("--authority-trajectory", help_text)

    def test_prepare_uses_authority_contract_and_never_authorizes_claim(self):
        gateway = FakeGateway()
        agentapi = FakeAgentApi(self.workspace, profile_uri=self.profile_uri)

        result = self.prepare(gateway, agentapi)

        self.assertFalse(result["claim_authorized"])
        self.assertEqual(result["handshake_state"], "HANDSHAKE_REQUESTED")
        self.assertEqual(result["source_step_count"], 12)
        self.assertEqual(gateway.prepare_calls, [(self.spec, self.authority)])
        self.assertEqual(
            gateway.bind_calls,
            [(self.spec, self.authority, CONVERSATION)],
        )
        self.assertEqual(len(agentapi.messages), 1)
        self.assertEqual(agentapi.new_calls[0][2], self.profile_uri)
        self.assertIn(ACK_TOKEN, agentapi.messages[0][1])
        self.assertNotIn(ACK_TOKEN, json.dumps(result))

    def test_metadata_mismatch_aborts_prepared_state_before_retry(self):
        gateway = FakeGateway()
        agentapi = FakeAgentApi(
            self.workspace,
            project_id="wrong-project",
            profile_uri=self.profile_uri,
        )

        with self.assertRaisesRegex(dispatch.DispatchError, "project mismatch"):
            self.prepare(gateway, agentapi)

        self.assertEqual(len(gateway.prepare_calls), 1)
        self.assertEqual(gateway.bind_calls, [])
        self.assertEqual(agentapi.messages, [])
        self.assertEqual(
            gateway.abort_calls,
            [
                (
                    self.spec,
                    self.authority,
                    "agentapi_metadata_failed",
                    CONVERSATION,
                )
            ],
        )

    def test_profile_metadata_mismatch_aborts_prepared_state_before_retry(self):
        gateway = FakeGateway()
        agentapi = FakeAgentApi(
            self.workspace,
            profile_uri=(self.workspace / "profiles" / "wrong").as_uri(),
        )

        with self.assertRaisesRegex(dispatch.DispatchError, "profile mismatch"):
            self.prepare(gateway, agentapi)

        self.assertEqual(
            gateway.abort_calls,
            [
                (
                    self.spec,
                    self.authority,
                    "agentapi_metadata_failed",
                    CONVERSATION,
                )
            ],
        )

    def test_metadata_accepts_canonical_project_path_when_agentapi_omits_workspace(self):
        spec = dispatch.DispatchSpec(
            task_id=TASK_ID,
            role=ROLE,
            trajectory_id=TRAJECTORY,
            project_id=str(self.workspace),
            profile_uri=self.profile_uri,
            workspace_root=self.workspace,
            work_order_sha256=WORK_ORDER_SHA256,
            claim_allowed_state="ACKNOWLEDGED",
        )
        agentapi = FakeAgentApi(
            self.workspace,
            project_id=str(self.workspace),
            profile_uri=self.profile_uri,
        )
        agentapi.metadata.pop("workspaceUri")

        dispatch.verify_metadata(agentapi.metadata, spec, CONVERSATION)

    def test_metadata_rejects_opaque_project_id_when_workspace_is_missing(self):
        agentapi = FakeAgentApi(
            self.workspace, profile_uri=self.profile_uri
        )
        agentapi.metadata.pop("workspaceUri")

        with self.assertRaisesRegex(dispatch.DispatchError, "workspace mismatch"):
            dispatch.verify_metadata(agentapi.metadata, self.spec, CONVERSATION)

    def test_metadata_accepts_agentapi_root_conversation_id(self):
        agentapi = FakeAgentApi(
            self.workspace, profile_uri=self.profile_uri
        )
        agentapi.metadata["rootConversationId"] = agentapi.metadata.pop(
            "conversationId"
        )

        dispatch.verify_metadata(agentapi.metadata, self.spec, CONVERSATION)

    def test_agentapi_failure_aborts_prepared_attempt_for_safe_retry(self):
        gateway = FakeGateway()
        agentapi = FakeAgentApi(self.workspace, profile_uri=self.profile_uri)

        def fail_new_conversation(*args, **kwargs):
            raise dispatch.DispatchError("agentapi unavailable")

        agentapi.new_conversation = fail_new_conversation
        with self.assertRaisesRegex(dispatch.DispatchError, "unavailable"):
            self.prepare(gateway, agentapi)
        self.assertEqual(
            gateway.abort_calls,
            [
                (
                    self.spec,
                    self.authority,
                    "agentapi_new_conversation_failed",
                    None,
                )
            ],
        )

    def test_lifecycle_gate_is_mandatory_before_gateway_or_agentapi(self):
        for gate in (
            {},
            {
                "allowed": False,
                "issues": ["hash_bound_handover_acknowledgement_required"],
            },
        ):
            with self.subTest(gate=gate):
                gateway = FakeGateway()
                agentapi = FakeAgentApi(
                    self.workspace, profile_uri=self.profile_uri
                )
                with self.assertRaisesRegex(
                    dispatch.DispatchError, "lifecycle blocked"
                ):
                    self.prepare(gateway, agentapi, gate=gate)
                self.assertEqual(gateway.prepare_calls, [])
                self.assertEqual(agentapi.new_calls, [])

    def test_local_identity_must_match_authenticated_authority_trajectory(self):
        gateway = FakeGateway()
        agentapi = FakeAgentApi(self.workspace, profile_uri=self.profile_uri)
        mismatched = dispatch.LocalConversationIdentity(
            cascade_id=SOURCE_CASCADE,
            trajectory_id=SOURCE_TRAJECTORY,
            step_count=1,
            conversation_db=self.workspace / "old.db",
        )
        with self.assertRaisesRegex(dispatch.DispatchError, "authority"):
            dispatch.prepare_dispatch(
                self.spec,
                gateway=gateway,
                agentapi=agentapi,
                authority=self.authority,
                lifecycle_gate={"allowed": True, "issues": []},
                source_identity=mismatched,
            )
        self.assertEqual(gateway.prepare_calls, [])
        self.assertEqual(agentapi.new_calls, [])

    def test_verify_trusts_only_manifest_state_and_authorized_cli_result(self):
        gateway = FakeGateway()
        result = dispatch.verify_dispatch_handshake(
            self.spec, CONVERSATION, gateway=gateway
        )
        self.assertTrue(result["claim_authorized"])
        self.assertEqual(result["handshake_state"], "ACKNOWLEDGED")
        for mutation in (
            {"state": "VERIFIED"},
            {"authorized": False},
            {"issues": ["identity_mismatch"]},
            {"ok": False},
        ):
            with self.subTest(mutation=mutation):
                gateway.verify_payload.update(mutation)
                with self.assertRaises(dispatch.DispatchError):
                    dispatch.verify_dispatch_handshake(
                        self.spec, CONVERSATION, gateway=gateway
                    )
                gateway.verify_payload = {
                    "ok": True,
                    "authorized": True,
                    "state": "ACKNOWLEDGED",
                    "issues": [],
                }

    def test_runtime_discovery_preserves_one_process_tuple(self):
        executable = self.workspace / "agentapi.bat"
        executable.write_text("@echo off\n", encoding="utf-8")
        payload = [{
            "pid": 41,
            "port": 6200,
            "csrf_token": "process-token",
            "executable_path": "C:/Antigravity/language_server.exe",
        }]

        def fake_run(*args, **kwargs):
            return subprocess.CompletedProcess(
                args=args[0], returncode=0, stdout=json.dumps(payload), stderr=""
            )

        runtime = dispatch.discover_runtime(
            {"ANTIGRAVITY_AGENTAPI": str(executable)}, run=fake_run
        )
        self.assertEqual((runtime.pid, runtime.port), (41, 6200))
        self.assertEqual(runtime.address, "https://127.0.0.1:6200")
        self.assertEqual(runtime.csrf_token, "process-token")
        self.assertNotIn("process-token", repr(runtime))

    @unittest.skipUnless(os.name == "nt", "Windows batch quoting only")
    def test_agentapi_batch_command_preserves_paths_and_arguments_with_spaces(self):
        executable = self.workspace / "agent api.bat"
        executable.write_text("@echo off\necho %~1^|%~2\n", encoding="utf-8")
        runtime = dispatch.AgentApiRuntime(
            executable=executable,
            pid=1,
            port=6200,
            address="https://127.0.0.1:6200",
            csrf_token="test-token",
        )

        output = dispatch.AgentApiClient(runtime)._command(
            "file:///C:/Profile%20Folder", "second argument"
        )

        self.assertEqual(
            output.strip(), "file:///C:/Profile%20Folder|second argument"
        )

    def test_agentapi_batch_command_rejects_shell_metacharacters(self):
        runtime = dispatch.AgentApiRuntime(
            executable=self.workspace / "agentapi.bat",
            pid=1,
            port=6200,
            address="https://127.0.0.1:6200",
            csrf_token="test-token",
        )

        with self.assertRaisesRegex(dispatch.DispatchError, "unsafe character"):
            dispatch.AgentApiClient(runtime)._command("bad&argument")

    def test_runtime_discovery_fails_closed_on_multiple_endpoints(self):
        executable = self.workspace / "agentapi.bat"
        executable.write_text("@echo off\n", encoding="utf-8")
        payload = [
            {"pid": 1, "port": 6100, "csrf_token": "first"},
            {"pid": 2, "port": 6200, "csrf_token": "second"},
        ]

        def fake_run(*args, **kwargs):
            return subprocess.CompletedProcess(
                args=args[0], returncode=0, stdout=json.dumps(payload), stderr=""
            )

        with self.assertRaisesRegex(dispatch.DispatchError, "Ambiguous"):
            dispatch.discover_runtime(
                {"ANTIGRAVITY_AGENTAPI": str(executable)}, run=fake_run
            )

    def test_runtime_discovery_deduplicates_only_identical_provenance(self):
        executable = self.workspace / "agentapi.bat"
        executable.write_text("@echo off\n", encoding="utf-8")
        candidate = {"pid": 4, "port": 6300, "csrf_token": "same"}

        def fake_run(*args, **kwargs):
            return subprocess.CompletedProcess(
                args=args[0],
                returncode=0,
                stdout=json.dumps([candidate, candidate]),
                stderr="",
            )

        runtime = dispatch.discover_runtime(
            {"ANTIGRAVITY_AGENTAPI": str(executable)}, run=fake_run
        )
        self.assertEqual((runtime.pid, runtime.port), (4, 6300))

    def test_supplied_runtime_tuple_cannot_bypass_process_provenance(self):
        executable = self.workspace / "agentapi.bat"
        executable.write_text("@echo off\n", encoding="utf-8")
        payload = [{"pid": 4, "port": 6300, "csrf_token": "real"}]

        def fake_run(*args, **kwargs):
            return subprocess.CompletedProcess(
                args=args[0], returncode=0, stdout=json.dumps(payload), stderr=""
            )

        with self.assertRaises(dispatch.DispatchError):
            dispatch.discover_runtime(
                {
                    "ANTIGRAVITY_AGENTAPI": str(executable),
                    "ANTIGRAVITY_LS_ADDRESS": "https://127.0.0.1:9999",
                    "ANTIGRAVITY_CSRF_TOKEN": "fake",
                    "ANTIGRAVITY_LS_PID": "9",
                },
                run=fake_run,
            )

    def test_exact_supplied_tuple_disambiguates_without_max_port_selection(self):
        executable = self.workspace / "agentapi.bat"
        executable.write_text("@echo off\n", encoding="utf-8")
        payload = [
            {"pid": 4, "port": 6300, "csrf_token": "selected"},
            {"pid": 5, "port": 6400, "csrf_token": "other"},
        ]

        def fake_run(*args, **kwargs):
            return subprocess.CompletedProcess(
                args=args[0], returncode=0, stdout=json.dumps(payload), stderr=""
            )

        runtime = dispatch.discover_runtime(
            {
                "ANTIGRAVITY_AGENTAPI": str(executable),
                "ANTIGRAVITY_LS_ADDRESS": "https://127.0.0.1:6300",
                "ANTIGRAVITY_CSRF_TOKEN": "selected",
                "ANTIGRAVITY_LS_PID": "4",
            },
            run=fake_run,
        )
        self.assertEqual((runtime.pid, runtime.port), (4, 6300))

    def test_local_identity_and_step_count_come_from_read_only_database(self):
        antigravity = self.workspace / "antigravity"
        database = create_conversation_db(
            antigravity,
            SOURCE_CASCADE,
            SOURCE_TRAJECTORY,
            SOURCE_CASCADE,
            7,
        )
        before = database.read_bytes()

        identity = dispatch.resolve_local_conversation_identity(
            antigravity, SOURCE_TRAJECTORY
        )

        self.assertEqual(identity.cascade_id, SOURCE_CASCADE)
        self.assertEqual(identity.step_count, 7)
        self.assertEqual(database.read_bytes(), before)

    def test_local_identity_fails_closed_when_mapping_is_ambiguous(self):
        antigravity = self.workspace / "antigravity"
        create_conversation_db(
            antigravity, "one", SOURCE_TRAJECTORY, SOURCE_CASCADE, 2
        )
        create_conversation_db(
            antigravity,
            "two",
            SOURCE_TRAJECTORY,
            "44444444-4444-4444-8444-444444444444",
            3,
        )

        with self.assertRaisesRegex(dispatch.DispatchError, "multiple"):
            dispatch.resolve_local_conversation_identity(
                antigravity, SOURCE_TRAJECTORY
            )

    def test_gateway_uses_only_authority_bound_dispatch_commands(self):
        calls = []
        responses = [
            {
                "ok": True,
                "task_id": TASK_ID,
                "state": "PREPARED",
                "expected_role": ROLE,
                "expected_trajectory": TRAJECTORY,
                "work_order_sha256": WORK_ORDER_SHA256,
                "ack_token": ACK_TOKEN,
            },
            {
                "ok": True,
                "task_id": TASK_ID,
                "state": "HANDSHAKE_REQUESTED",
            },
            {
                "ok": True,
                "authorized": True,
                "state": "ACKNOWLEDGED",
                "issues": [],
            },
            {
                "ok": True,
                "task_id": TASK_ID,
                "state": "ABORTED",
            },
        ]

        def fake_run(command, **kwargs):
            calls.append(command)
            payload = responses.pop(0)
            return subprocess.CompletedProcess(
                args=command,
                returncode=0,
                stdout=json.dumps(payload),
                stderr="",
            )

        gateway = dispatch.TaskTrackerGateway(
            self.workspace / "task_manager.py", run=fake_run
        )
        prepared = gateway.dispatch_prepare(self.spec, self.authority)
        gateway.dispatch_bind(
            self.spec, self.authority, CONVERSATION
        )
        gateway.dispatch_verify(self.spec, CONVERSATION)
        gateway.dispatch_abort(
            self.spec,
            self.authority,
            reason_code="metadata_failed",
            conversation_id=CONVERSATION,
        )

        self.assertEqual(prepared.ack_token, ACK_TOKEN)
        self.assertEqual(
            [command[2] for command in calls],
            [
                "dispatch-prepare",
                "dispatch-bind",
                "dispatch-verify",
                "dispatch-abort",
            ],
        )
        self.assertNotIn("add-evidence", " ".join(sum(calls, [])))
        self.assertIn("--authority-trajectory", calls[0])
        self.assertIn(f"task:{TASK_ID}", calls[0])


if __name__ == "__main__":
    unittest.main()
