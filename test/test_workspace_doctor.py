import importlib
import importlib.util
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
doctor = importlib.import_module("workspace_control.doctor")
SHIM_PATH = ROOT / "scripts" / "workspace_doctor.py"


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

    def _create_media_layout(self, root: Path) -> Path:
        physical = root.parent / "Aff_Media" / "output"
        (physical / "fb-reels").mkdir(parents=True)
        (physical / "fb-posts").mkdir()
        canonical = root / "content-planner-kb" / "output"
        canonical.parent.mkdir(parents=True)
        self._create_directory_link(canonical, physical)
        return physical

    def _create_channel_database(
        self, root: Path, rows: list[tuple[str, str, str]]
    ) -> Path:
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
        connection.executemany("INSERT INTO topic_catalog VALUES (?, ?, ?)", rows)
        connection.commit()
        connection.close()
        return database

    def test_compatibility_shim_reexports_stable_module(self) -> None:
        spec = importlib.util.spec_from_file_location("workspace_doctor_shim", SHIM_PATH)
        self.assertIsNotNone(spec)
        self.assertIsNotNone(spec.loader)
        shim = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(shim)
        self.assertIs(shim.main, doctor.main)
        self.assertIs(shim.build_report, doctor.build_report)

    def test_module_entrypoint_is_runnable(self) -> None:
        result = subprocess.run(
            [
                sys.executable,
                "-m",
                "workspace_control.doctor",
                "--help",
            ],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        self.assertEqual(result.returncode, 0)
        self.assertIn("read-only", result.stdout.lower())

    def test_missing_or_wrong_mount_uses_stable_finding_code(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "workspace"
            root.mkdir()
            physical = root.parent / "Aff_Media" / "output"
            (physical / "fb-reels").mkdir(parents=True)
            (physical / "fb-posts").mkdir()
            issues = doctor._media_contract_issues(root, physical_root=physical)
            self.assertEqual([item.code for item in issues], ["MEDIA_MOUNT_TARGET_MISMATCH"])

    def test_database_media_check_is_read_only_and_machine_readable(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "workspace"
            root.mkdir()
            physical = self._create_media_layout(root)
            database = self._create_channel_database(
                root,
                [("generic-content-id", "produced", "fb-posts/channel/missing")],
            )
            before = database.read_bytes()
            issues = doctor._channel_database_media_issues(root, physical)
            self.assertEqual(database.read_bytes(), before)
            matching = [
                item for item in issues if item.code == "DATABASE_MEDIA_PATH_MISSING"
            ]
            self.assertEqual(len(matching), 1)
            self.assertEqual(matching[0].details["content_id"], "generic-content-id")

    def test_database_media_paths_accept_supported_relative_forms(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            physical = Path(temp_dir) / "output"
            expected = physical / "fb-reels" / "channel" / "reel-id"
            expected.mkdir(parents=True)
            self.assertEqual(
                doctor._resolve_database_media_path(
                    "output/fb-reels/channel/reel-id", physical
                ),
                expected.resolve(),
            )
            self.assertEqual(
                doctor._resolve_database_media_path(
                    "fb-reels/channel/reel-id", physical
                ),
                expected.resolve(),
            )

    def test_pytest_artifact_uses_stable_finding_code(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            physical = Path(temp_dir) / "output"
            (physical / "pytest-generic-leak").mkdir(parents=True)
            issues = doctor._pytest_media_issues(physical)
            self.assertEqual(
                [item.code for item in issues],
                ["TEST_ARTIFACT_IN_PRODUCTION_MEDIA"],
            )

    def test_worktree_shared_media_reparse_uses_stable_finding_code(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            base = Path(temp_dir)
            root = base / "workspace"
            worktree = base / "worktree"
            physical = base / "Aff_Media" / "output"
            mount = worktree / "content-planner-kb" / "output"
            mount.parent.mkdir(parents=True)
            physical.mkdir(parents=True)
            self._create_directory_link(mount, physical)
            issues = doctor._worktree_media_mount_issues(
                root, physical, worktree_paths=[worktree]
            )
            self.assertEqual(
                [item.code for item in issues],
                ["WORKTREE_REPARSE_POINTS_TO_SHARED_MEDIA"],
            )
            self.assertTrue(issues[0].details["cleanup_blocked"])

    def test_report_composition_keeps_media_findings_generic(self) -> None:
        base = {
            "schema_version": 1,
            "workspace_root": "root",
            "mutations_performed": False,
            "summary": {"repositories": 1, "issues": 0, "by_severity": {}, "by_code": {}},
            "repositories": [],
            "issues": [],
        }
        issue = doctor.Issue(
            "DATABASE_MEDIA_PATH_MISSING", "ERROR", "generic missing path"
        )
        with patch.object(doctor, "_base_build_report", return_value=base), patch.object(
            doctor, "_media_runtime_issues", return_value=[issue]
        ):
            report = doctor.build_report(Path("."))
        self.assertEqual(report["summary"]["by_code"], {"DATABASE_MEDIA_PATH_MISSING": 1})


if __name__ == "__main__":
    unittest.main()
