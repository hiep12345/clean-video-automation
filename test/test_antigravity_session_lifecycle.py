import importlib.util
import json
import sqlite3
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "antigravity_session_lifecycle.py"
SPEC = importlib.util.spec_from_file_location(
    "antigravity_session_lifecycle", MODULE_PATH
)
assert SPEC and SPEC.loader
scanner = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = scanner
SPEC.loader.exec_module(scanner)


def create_conversation(
    antigravity_root: Path,
    *,
    cascade_id: str,
    trajectory_id: str,
    steps: int,
) -> None:
    conversations = antigravity_root / "conversations"
    brain = antigravity_root / "brain"
    conversations.mkdir(parents=True, exist_ok=True)
    (brain / cascade_id).mkdir(parents=True, exist_ok=True)
    db_path = conversations / f"{cascade_id}.db"
    connection = sqlite3.connect(db_path)
    connection.executescript(
        """
        CREATE TABLE trajectory_meta (
            trajectory_id TEXT PRIMARY KEY,
            cascade_id TEXT,
            trajectory_type INTEGER,
            source INTEGER
        );
        CREATE TABLE steps (
            id INTEGER PRIMARY KEY,
            payload TEXT
        );
        """
    )
    connection.execute(
        "INSERT INTO trajectory_meta VALUES (?, ?, 4, 1)",
        (trajectory_id, cascade_id),
    )
    connection.executemany(
        "INSERT INTO steps(payload) VALUES (?)",
        [(f"step-{index}",) for index in range(steps)],
    )
    connection.commit()
    connection.close()


class SessionLifecycleScannerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tempdir.name)
        self.workspace = self.root / "workspace"
        self.antigravity = self.root / "antigravity"
        self.workspace.mkdir()
        (self.antigravity / "conversations").mkdir(parents=True)
        (self.antigravity / "brain").mkdir(parents=True)
        self.now = datetime(2026, 7, 28, 3, 0, tzinfo=timezone.utc)

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def test_policy_is_json_compatible_yaml_and_validates_thresholds(self) -> None:
        path = self.root / "policy.yaml"
        path.write_text(
            json.dumps(
                {
                    "handover_warning_steps": 70,
                    "handover_required_steps": 80,
                    "stale_review_days": 14,
                    "explicit_protected_cascade_ids": [],
                }
            ),
            encoding="utf-8",
        )
        policy = scanner.load_policy(path)
        self.assertEqual(policy.handover_required_steps, 80)
        self.assertEqual(policy.stale_review_days, 14)

    def test_active_task_protects_conversation(self) -> None:
        cascade = "11111111-1111-4111-8111-111111111111"
        trajectory = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        create_conversation(
            self.antigravity,
            cascade_id=cascade,
            trajectory_id=trajectory,
            steps=12,
        )
        tasks = [
            {
                "id": "photo-qa",
                "status": "IN_PROGRESS",
                "assigned_to": "qa-reviewer",
                "evidence": {"trajectory_id": trajectory},
                "active_claim": {
                    "trajectory_id": trajectory,
                    "owner_role": "qa-reviewer",
                },
            }
        ]
        report = scanner.build_report(
            workspace_root=self.workspace,
            antigravity_root=self.antigravity,
            policy=scanner.Policy(scan_receipts=False),
            tasks=tasks,
            now=self.now,
        )
        record = report["conversations"][0]
        self.assertEqual(record["lifecycle"], "PROTECTED_ACTIVE")
        self.assertIn("active or unfinished linked task", record["archive_blockers"])
        self.assertFalse(report["mutations_performed"])
        self.assertFalse(report["archive_actions_enabled"])

    def test_scan_does_not_modify_conversation_database(self) -> None:
        cascade = "88888888-8888-4888-8888-888888888888"
        trajectory = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
        create_conversation(
            self.antigravity,
            cascade_id=cascade,
            trajectory_id=trajectory,
            steps=9,
        )
        db_path = self.antigravity / "conversations" / f"{cascade}.db"
        before_bytes = db_path.read_bytes()
        before_mtime = db_path.stat().st_mtime_ns
        scanner.build_report(
            workspace_root=self.workspace,
            antigravity_root=self.antigravity,
            policy=scanner.Policy(scan_receipts=False, quick_check=True),
            tasks=[],
            now=self.now,
        )
        self.assertEqual(db_path.read_bytes(), before_bytes)
        self.assertEqual(db_path.stat().st_mtime_ns, before_mtime)

    def test_receipt_evidence_protects_terminal_task_trajectory(self) -> None:
        cascade = "22222222-2222-4222-8222-222222222222"
        trajectory = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
        create_conversation(
            self.antigravity,
            cascade_id=cascade,
            trajectory_id=trajectory,
            steps=15,
        )
        receipt = (
            self.workspace
            / "content-planner-kb"
            / "output"
            / "fb-posts"
            / "channel"
            / "post"
            / "review_results.json"
        )
        receipt.parent.mkdir(parents=True)
        receipt.write_text(
            json.dumps(
                {
                    "verdict": "PASS",
                    "provenance": {"reviewer_trajectory_id": trajectory},
                }
            ),
            encoding="utf-8",
        )
        tasks = [
            {
                "id": "photo-qa",
                "status": "COMPLETED",
                "evidence": {"trajectory_id": trajectory},
                "active_claim": None,
            }
        ]
        report = scanner.build_report(
            workspace_root=self.workspace,
            antigravity_root=self.antigravity,
            policy=scanner.Policy(),
            tasks=tasks,
            now=self.now,
        )
        record = report["conversations"][0]
        self.assertEqual(record["lifecycle"], "PROTECTED_EVIDENCE")
        self.assertEqual(record["receipt_paths"], [
            "content-planner-kb/output/fb-posts/channel/post/review_results.json"
        ])

    def test_handover_due_at_required_threshold(self) -> None:
        cascade = "33333333-3333-4333-8333-333333333333"
        trajectory = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
        create_conversation(
            self.antigravity,
            cascade_id=cascade,
            trajectory_id=trajectory,
            steps=80,
        )
        report = scanner.build_report(
            workspace_root=self.workspace,
            antigravity_root=self.antigravity,
            policy=scanner.Policy(scan_receipts=False),
            tasks=[],
            now=self.now,
        )
        record = report["conversations"][0]
        self.assertEqual(record["lifecycle"], "HANDOVER_DUE")
        self.assertIn(
            "handover acknowledgement not implemented",
            record["archive_blockers"],
        )

    def test_current_session_overrides_handover_due(self) -> None:
        cascade = "44444444-4444-4444-8444-444444444444"
        trajectory = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
        create_conversation(
            self.antigravity,
            cascade_id=cascade,
            trajectory_id=trajectory,
            steps=120,
        )
        report = scanner.build_report(
            workspace_root=self.workspace,
            antigravity_root=self.antigravity,
            policy=scanner.Policy(scan_receipts=False),
            tasks=[],
            current_cascade_ids=[cascade],
            now=self.now,
        )
        record = report["conversations"][0]
        self.assertEqual(record["lifecycle"], "PROTECTED_CURRENT")
        self.assertIn("currently open session", record["archive_blockers"])

    def test_brain_only_directory_is_reported_as_inconsistent(self) -> None:
        cascade = "55555555-5555-4555-8555-555555555555"
        (self.antigravity / "brain" / cascade).mkdir(parents=True)
        report = scanner.build_report(
            workspace_root=self.workspace,
            antigravity_root=self.antigravity,
            policy=scanner.Policy(scan_receipts=False),
            tasks=[],
            now=self.now,
        )
        record = report["conversations"][0]
        self.assertEqual(record["health"], "CONVERSATION_DB_MISSING")
        self.assertIn(
            "store health is CONVERSATION_DB_MISSING",
            record["archive_blockers"],
        )

    def test_deletion_cleanup_scan_counts_unique_ids(self) -> None:
        log = self.root / "language_server.log"
        first = "66666666-6666-4666-8666-666666666666"
        second = "77777777-7777-4777-8777-777777777777"
        log.write_text(
            "\n".join(
                [
                    f"Failed to ensure trajectory {first} loaded for deletion cleanup",
                    f"Failed to ensure trajectory {first} loaded for deletion cleanup",
                    f"Failed to ensure trajectory {second} loaded for deletion cleanup",
                ]
            ),
            encoding="utf-8",
        )
        result = scanner.scan_deletion_cleanup_log(log, {second})
        self.assertEqual(result["unique_cleanup_error_ids"], 2)
        self.assertEqual(result["missing_from_current_store"], 1)


if __name__ == "__main__":
    unittest.main()
