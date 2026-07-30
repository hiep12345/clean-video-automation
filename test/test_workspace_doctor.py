import importlib.util
import sqlite3
import subprocess
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
    def _create_directory_link(self, link: Path, target: Path) -> None:
        try:
            link.symlink_to(target, target_is_directory=True)
        except OSError as exc:
            if sys.platform != "win32":
                self.skipTest(f"Directory links are unavailable: {exc}")
            result = subprocess.run(
                ["cmd", "/c", "mklink", "/J", str(link), str(target)],
                check=False,
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                detail = result.stderr.strip() or result.stdout.strip()
                self.skipTest(f"Directory junctions are unavailable: {detail}")

    def _create_media_layout(
        self,
        root: Path,
        *,
        include_posts: bool = True,
    ) -> Path:
        physical = root.parent / "Aff_Media" / "output"
        (physical / "fb-reels").mkdir(parents=True)
        if include_posts:
            (physical / "fb-posts").mkdir()
        canonical = root / "content-planner-kb" / "output"
        canonical.parent.mkdir(parents=True)
        self._create_directory_link(canonical, physical)
        return physical

    def _create_channel_database(
        self,
        root: Path,
        rows: list[tuple[str, str, str]],
    ) -> None:
        database = root / ".agents" / "state" / "channel.db"
        database.parent.mkdir(parents=True)
        connection = sqlite3.connect(database)
        connection.execute(
            """
            CREATE TABLE topic_catalog (
                video_id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                media_path TEXT
            )
            """
        )
        connection.executemany(
            "INSERT INTO topic_catalog VALUES (?, ?, ?)",
            rows,
        )
        connection.commit()
        connection.close()

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

    def test_media_contract_reports_missing_fb_posts_family(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "workspace"
            root.mkdir()
            physical = self._create_media_layout(
                root,
                include_posts=False,
            )

            issues = doctor._media_contract_issues(
                root,
                physical_root=physical,
            )

            matching = [
                item
                for item in issues
                if item.code == "MEDIA_OUTPUT_FAMILY_MISSING"
            ]
            self.assertEqual(len(matching), 1)
            self.assertEqual(
                matching[0].details["missing_families"],
                ["fb-posts"],
            )

    def test_live_database_media_drift_is_machine_readable(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "workspace"
            root.mkdir()
            physical = self._create_media_layout(root)
            self._create_channel_database(
                root,
                [
                    (
                        "generic-content-id",
                        "produced",
                        "fb-posts/channel/generic-content-id",
                    )
                ],
            )

            issues = doctor._channel_database_media_issues(root, physical)

            matching = [
                item
                for item in issues
                if item.code == "DATABASE_MEDIA_PATH_MISSING"
            ]
            self.assertEqual(len(matching), 1)
            self.assertEqual(
                matching[0].details["content_id"],
                "generic-content-id",
            )
            self.assertEqual(matching[0].severity, "ERROR")

    def test_database_media_path_accepts_both_relative_forms(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "workspace"
            root.mkdir()
            physical = self._create_media_layout(root)
            reel = physical / "fb-reels" / "channel" / "reel-id"
            post = physical / "fb-posts" / "channel" / "post-id"
            reel.mkdir(parents=True)
            post.mkdir(parents=True)
            self._create_channel_database(
                root,
                [
                    (
                        "reel-id",
                        "produced",
                        "output/fb-reels/channel/reel-id",
                    ),
                    (
                        "post-id",
                        "ready",
                        "fb-posts/channel/post-id",
                    ),
                ],
            )

            issues = doctor._channel_database_media_issues(root, physical)

            self.assertEqual(issues, [])
            self.assertEqual(
                doctor._resolve_database_media_path(
                    "output/fb-reels/channel/reel-id",
                    physical,
                ),
                reel.resolve(),
            )
            self.assertEqual(
                doctor._resolve_database_media_path(
                    "fb-posts/channel/post-id",
                    physical,
                ),
                post.resolve(),
            )

    def test_pytest_pollution_under_media_root_is_error(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            physical = Path(temp_dir) / "output"
            pollution = physical / "pytest-production-leak"
            pollution.mkdir(parents=True)

            issues = doctor._pytest_media_issues(physical)

            self.assertEqual(
                [item.code for item in issues],
                ["TEST_ARTIFACT_IN_PRODUCTION_MEDIA"],
            )
            self.assertEqual(issues[0].severity, "ERROR")
            self.assertIn(str(pollution), issues[0].details["paths"])

    def test_external_media_reparse_blocks_worktree_cleanup(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            base = Path(temp_dir)
            root = base / "workspace"
            worktree = root / ".worktrees" / "disposable"
            worktree.mkdir(parents=True)
            physical = base / "Aff_Media" / "output"
            physical.mkdir(parents=True)
            mount = worktree / "content-planner-kb" / "output"
            mount.parent.mkdir(parents=True)
            self._create_directory_link(mount, physical)

            issues = doctor._worktree_media_mount_issues(
                root,
                physical,
                worktree_paths=[worktree],
            )

            self.assertEqual(
                [item.code for item in issues],
                ["WORKTREE_SHARED_MEDIA_REPARSE_POINT"],
            )
            self.assertTrue(issues[0].details["cleanup_blocked"])
            self.assertEqual(
                Path(issues[0].details["target"]).resolve(),
                physical.resolve(),
            )

    def test_healthy_media_layout_has_no_runtime_issues(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "workspace"
            root.mkdir()
            physical = self._create_media_layout(root)
            bundle = physical / "fb-reels" / "channel" / "content-id"
            bundle.mkdir(parents=True)
            self._create_channel_database(
                root,
                [
                    (
                        "content-id",
                        "ready",
                        "fb-reels/channel/content-id",
                    )
                ],
            )

            issues = doctor._media_runtime_issues(
                root,
                physical_root=physical,
                worktree_paths=[],
            )

            self.assertEqual(issues, [])


if __name__ == "__main__":
    unittest.main()
