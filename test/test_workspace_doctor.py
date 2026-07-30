import importlib.util
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "workspace_doctor.py"
SPEC = importlib.util.spec_from_file_location("workspace_doctor", MODULE_PATH)
assert SPEC and SPEC.loader
doctor = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = doctor
SPEC.loader.exec_module(doctor)


class WorkspaceDoctorTests(unittest.TestCase):
    def test_classifies_general_path_families(self) -> None:
        self.assertEqual(
            doctor.classify_path(
                "intake/photo-posts/channel/content-id/script.md"
            ),
            "production",
        )
        self.assertEqual(
            doctor.classify_path("scripts/repair.py"),
            "implementation",
        )
        self.assertEqual(
            doctor.classify_path(".agents/state/task_agent.db"),
            "runtime-state",
        )

    def test_duplicate_tracker_is_reported_without_mutation(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            canonical = root / ".agents" / "state" / "task_agent.db"
            duplicate = (
                root
                / ".worktrees"
                / "linked"
                / ".agents"
                / "state"
                / "task_agent.db"
            )
            canonical.parent.mkdir(parents=True)
            duplicate.parent.mkdir(parents=True)
            canonical.write_bytes(b"canonical")
            duplicate.write_bytes(b"duplicate")
            before = duplicate.read_bytes()
            issues = doctor._duplicate_state_issues(root)
            self.assertEqual(
                [item.code for item in issues],
                ["DUPLICATE_TASK_DATABASE"],
            )
            self.assertEqual(duplicate.read_bytes(), before)

    def test_terminal_task_with_in_progress_git_state_is_invalid(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            db_path = root / ".agents" / "state" / "task_agent.db"
            db_path.parent.mkdir(parents=True)
            connection = sqlite3.connect(db_path)
            connection.executescript(
                """
                CREATE TABLE task (id TEXT PRIMARY KEY, status TEXT);
                CREATE TABLE task_evidence (
                    task_id TEXT,
                    key TEXT,
                    value TEXT
                );
                INSERT INTO task VALUES ('failed-task', 'FAILED');
                INSERT INTO task_evidence
                VALUES ('failed-task', 'git_state', 'IN_PROGRESS');
                """
            )
            connection.commit()
            connection.close()
            issues = doctor._task_database_issues(root)
            self.assertIn(
                "INVALID_TASK_GIT_STATE",
                {item.code for item in issues},
            )

    def test_completed_git_task_requires_all_closeout_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            db_path = root / ".agents" / "state" / "task_agent.db"
            db_path.parent.mkdir(parents=True)
            connection = sqlite3.connect(db_path)
            connection.executescript(
                """
                CREATE TABLE task (id TEXT PRIMARY KEY, status TEXT);
                CREATE TABLE task_evidence (
                    task_id TEXT,
                    key TEXT,
                    value TEXT
                );
                INSERT INTO task VALUES ('git-task', 'COMPLETED');
                INSERT INTO task_evidence
                VALUES ('git-task', 'git_required', 'true');
                """
            )
            connection.commit()
            connection.close()
            issues = doctor._task_database_issues(root)
            matching = [
                item
                for item in issues
                if item.code == "COMPLETED_TASK_MISSING_GIT_EVIDENCE"
            ]
            self.assertEqual(len(matching), 1)
            self.assertIn("git_commit", matching[0].details["missing"])


if __name__ == "__main__":
    unittest.main()
