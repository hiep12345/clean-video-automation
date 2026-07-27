import importlib.util
import json
import os
import tempfile
import time
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = (
    ROOT
    / "content-planner-kb"
    / "scripts"
    / "update_knowledge_graph.py"
)
SPEC = importlib.util.spec_from_file_location("update_knowledge_graph", SCRIPT)
GRAPHIFY = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(GRAPHIFY)


class GraphifySetupTests(unittest.TestCase):
    def test_missing_graph_is_reported_stale(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "app.py").write_text("print('ok')\n", encoding="utf-8")
            graph = root / "graphify-out" / "graph.json"
            with patch.object(
                GRAPHIFY,
                "graphify_version",
                return_value="graphify test",
            ):
                status = GRAPHIFY.collect_status(
                    workspace_root=root,
                    graph_path=graph,
                )

        self.assertEqual(status["status"], "STALE")
        self.assertFalse(status["graph_exists"])

    def test_graph_freshness_tracks_newer_source(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            source = root / "app.py"
            source.write_text("print('ok')\n", encoding="utf-8")
            graph = root / "graphify-out" / "graph.json"
            graph.parent.mkdir()
            graph.write_text(
                json.dumps({"nodes": [{}, {}], "edges": [{}]}),
                encoding="utf-8",
            )
            source_time = source.stat().st_mtime
            os.utime(graph, (source_time + 10, source_time + 10))
            with patch.object(
                GRAPHIFY,
                "graphify_version",
                return_value="graphify test",
            ):
                fresh = GRAPHIFY.collect_status(
                    workspace_root=root,
                    graph_path=graph,
                )
            os.utime(source, (source_time + 20, source_time + 20))
            with patch.object(
                GRAPHIFY,
                "graphify_version",
                return_value="graphify test",
            ):
                stale = GRAPHIFY.collect_status(
                    workspace_root=root,
                    graph_path=graph,
                )

        self.assertEqual(fresh["status"], "FRESH")
        self.assertEqual(fresh["node_count"], 2)
        self.assertEqual(stale["status"], "STALE")

    def test_update_bootstraps_code_only_then_becomes_incremental(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            graph = root / "graphify-out" / "graph.json"
            with patch.object(
                GRAPHIFY,
                "graphify_executable",
                return_value="graphify",
            ):
                initial = GRAPHIFY.build_command(
                    "update",
                    workspace_root=root,
                    graph_path=graph,
                )
                graph.parent.mkdir()
                graph.write_text("{}", encoding="utf-8")
                incremental = GRAPHIFY.build_command(
                    "update",
                    workspace_root=root,
                    graph_path=graph,
                )

        self.assertIn("extract", initial)
        self.assertIn("--code-only", initial)
        self.assertEqual(incremental[1], "update")
        self.assertNotIn("--backend", incremental)

    def test_deep_mode_is_explicit(self):
        with patch.object(
            GRAPHIFY,
            "graphify_executable",
            return_value="graphify",
        ):
            command = GRAPHIFY.build_command("deep")

        self.assertIn("--backend", command)
        self.assertIn("gemini", command)
        self.assertIn("--mode", command)
        self.assertIn("deep", command)

    def test_semantic_freshness_is_not_reset_by_code_update(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            code = root / "app.py"
            note = root / "guide.md"
            code.write_text("print('ok')\n", encoding="utf-8")
            note.write_text("# Original\n", encoding="utf-8")
            graph = root / "graphify-out" / "graph.json"
            graph.parent.mkdir()
            graph.write_text(
                json.dumps({"nodes": [], "edges": []}),
                encoding="utf-8",
            )
            indexed_at = time.time() + 10
            build_info = {
                "coverage": "code+semantic-deep",
                "code_indexed_at": datetime.fromtimestamp(
                    indexed_at + 20,
                    timezone.utc,
                ).isoformat(),
                "semantic_indexed_at": datetime.fromtimestamp(
                    indexed_at,
                    timezone.utc,
                ).isoformat(),
            }
            (graph.parent / "BUILD_INFO.json").write_text(
                json.dumps(build_info),
                encoding="utf-8",
            )
            os.utime(code, (indexed_at - 10, indexed_at - 10))
            os.utime(note, (indexed_at + 10, indexed_at + 10))
            with patch.object(
                GRAPHIFY,
                "graphify_version",
                return_value="graphify test",
            ):
                status = GRAPHIFY.collect_status(
                    workspace_root=root,
                    graph_path=graph,
                )

        self.assertEqual(status["status"], "STALE")
        self.assertEqual(status["required_action"], "deep")
        self.assertEqual(status["coverage"], "code+semantic-deep")

    def test_shared_instructions_do_not_claim_automatic_cron(self):
        skill = (
            ROOT
            / ".agents"
            / "skills"
            / "graphify-knowledge"
            / "SKILL.md"
        ).read_text(encoding="utf-8")
        agents = (ROOT / "AGENTS.md").read_text(encoding="utf-8")

        self.assertIn("status --json", skill)
        self.assertIn("graphify affected", skill)
        self.assertIn("coverage", skill)
        self.assertIn("Không mặc định rằng cron", skill)
        self.assertIn("Map Before Move", agents)
        self.assertIn("Graphify Knowledge", agents)

    def test_root_ignore_excludes_generated_graph_and_secrets(self):
        ignore = (ROOT / ".graphifyignore").read_text(encoding="utf-8")

        self.assertIn("graphify-out/", ignore)
        self.assertIn(".secrets/", ignore)
        self.assertIn("**/.env", ignore)
        self.assertIn("**/output/", ignore)


if __name__ == "__main__":
    unittest.main()
