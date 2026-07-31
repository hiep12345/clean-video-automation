import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts import antigravity_dispatch as dispatch


class AuthorityBoundDispatchCliTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        configured = os.environ.get("ANTIGRAVITY_DISPATCH_TASK_MANAGER", "")
        cls.task_manager = Path(configured).resolve() if configured else None
        if cls.task_manager is None or not cls.task_manager.is_file():
            raise unittest.SkipTest(
                "set ANTIGRAVITY_DISPATCH_TASK_MANAGER to the runnable "
                "task_manager.py contract implementation"
            )

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name).resolve()
        self.database = self.root / "task_agent.db"
        self.base_environment = dict(os.environ)
        self.base_environment.update(
            {
                "TASK_TRACKER_DB_PATH": str(self.database),
                "TASK_TRACKER_TEST_MODE": "1",
                "TASK_TRACKER_MUTATION_MODE": "legacy",
                "PYTHONDONTWRITEBYTECODE": "1",
            }
        )
        self.controller = "dispatch-controller"
        self.target = "dispatch-target"
        self.authority_trajectory = "11111111-1111-4111-8111-111111111111"
        self.target_trajectory = "22222222-2222-4222-8222-222222222222"
        self.conversation = "33333333-3333-4333-8333-333333333333"
        self.work_order_sha256 = "d" * 64
        self.target_resource = f"task:{self.target}"
        self._bootstrap_tasks()

    def tearDown(self):
        self.temp.cleanup()

    def run_cli(self, *args, strict=False, expected_code=0):
        environment = dict(self.base_environment)
        if strict:
            environment["TASK_TRACKER_MUTATION_MODE"] = "strict"
        result = subprocess.run(
            [sys.executable, str(self.task_manager), *args],
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=environment,
        )
        self.assertEqual(
            result.returncode,
            expected_code,
            msg=f"stdout={result.stdout}\nstderr={result.stderr}",
        )
        return result

    def _bootstrap_tasks(self):
        self.run_cli(
            "create",
            "--id",
            self.controller,
            "--channel",
            "system",
            "--action",
            "custom",
            "--assigned",
            "coordinator",
            "--allowed-verb",
            "dispatch_prepare",
            "--allowed-verb",
            "dispatch_bind",
            "--allowed-verb",
            "dispatch_abort",
            "--declared-target",
            self.target_resource,
        )
        self.run_cli(
            "create",
            "--id",
            self.target,
            "--channel",
            "system",
            "--action",
            "custom",
            "--assigned",
            "qa-reviewer",
            "--dispatch-required",
        )
        self.run_cli(
            "claim",
            "--id",
            self.controller,
            "--role",
            "coordinator",
            "--trajectory",
            self.authority_trajectory,
            "--resource",
            self.target_resource,
            "--json",
        )

    def test_real_cli_requires_authenticated_ack_before_claim(self):
        strict_environment = dict(self.base_environment)
        strict_environment["TASK_TRACKER_MUTATION_MODE"] = "strict"

        def strict_run(command, **kwargs):
            return subprocess.run(
                command,
                check=False,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                env=strict_environment,
            )

        gateway = dispatch.TaskTrackerGateway(
            self.task_manager, run=strict_run
        )
        spec = dispatch.DispatchSpec(
            task_id=self.target,
            role="qa-reviewer",
            trajectory_id=self.target_trajectory,
            project_id="isolated-test-project",
            workspace_root=self.root,
            work_order_sha256=self.work_order_sha256,
            claim_allowed_state="ACKNOWLEDGED",
        )
        authority = dispatch.DispatchAuthority(
            task_id=self.controller,
            role="coordinator",
            trajectory_id=self.authority_trajectory,
        )

        failed_attempt = gateway.dispatch_prepare(spec, authority)
        gateway.dispatch_abort(
            spec,
            authority,
            reason_code="agentapi_metadata_failed",
            conversation_id=self.conversation,
        )
        prepared = gateway.dispatch_prepare(spec, authority)
        self.assertNotEqual(failed_attempt.ack_token, prepared.ack_token)
        database_bytes = self.database.read_bytes()
        self.assertNotIn(failed_attempt.ack_token.encode(), database_bytes)
        self.assertNotIn(prepared.ack_token.encode(), database_bytes)
        gateway.dispatch_bind(spec, authority, self.conversation)

        self.run_cli(
            "claim",
            "--id",
            self.target,
            "--role",
            "qa-reviewer",
            "--trajectory",
            self.target_trajectory,
            "--json",
            strict=True,
            expected_code=2,
        )
        self.run_cli(
            "dispatch-ack",
            "--task",
            self.target,
            "--role",
            "qa-reviewer",
            "--trajectory",
            self.target_trajectory,
            "--conversation-id",
            self.conversation,
            "--work-order-sha256",
            self.work_order_sha256,
            "--ack-token",
            prepared.ack_token,
            "--json",
            strict=True,
        )

        verified = dispatch.verify_dispatch_handshake(
            spec, self.conversation, gateway=gateway
        )
        self.assertTrue(verified["claim_authorized"])
        self.assertEqual(verified["handshake_state"], "ACKNOWLEDGED")

        self.run_cli(
            "dispatch-ack",
            "--task",
            self.target,
            "--role",
            "qa-reviewer",
            "--trajectory",
            self.target_trajectory,
            "--conversation-id",
            self.conversation,
            "--work-order-sha256",
            self.work_order_sha256,
            "--ack-token",
            prepared.ack_token,
            "--json",
            strict=True,
            expected_code=2,
        )
        self.run_cli(
            "claim",
            "--id",
            self.target,
            "--role",
            "qa-reviewer",
            "--trajectory",
            self.target_trajectory,
            "--json",
            strict=True,
        )


if __name__ == "__main__":
    unittest.main()
