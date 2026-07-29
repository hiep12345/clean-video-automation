"""Ensure agent routing cannot send operational sync work to Notion BUFFER."""

from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class NotionBufferRoutingTests(unittest.TestCase):
    def test_workspace_policy_forbids_legacy_sync(self) -> None:
        policy = (ROOT / ".agents" / "AGENTS.md").read_text(encoding="utf-8")

        self.assertIn("Notion BUFFER là hệ thống legacy đã retire", policy)
        self.assertIn("bị cấm chạy hoặc import", policy)
        self.assertIn("phải được định tuyến sang Distribution Hub", policy)

    def test_specialists_do_not_treat_notion_sync_as_approvable(self) -> None:
        analytics = (
            ROOT / ".agents" / "agents" / "analytics-manager" / "agent.md"
        ).read_text(encoding="utf-8")
        production = (
            ROOT / ".agents" / "agents" / "production-executor" / "agent.md"
        ).read_text(encoding="utf-8")
        routing = (
            ROOT / ".agents" / "config" / "agent-routing.md"
        ).read_text(encoding="utf-8")

        self.assertIn("Never run or import `notion_sync.py`", analytics)
        self.assertIn("Notion BUFFER is retired and must never be synced", production)
        self.assertIn("Notion BUFFER is retired and forbidden", routing)
        self.assertNotIn(
            "Notion sync and archive require separate approval",
            routing,
        )

    def test_readme_routes_exact_ids_to_distribution_hub(self) -> None:
        readme = (ROOT / "README.md").read_text(encoding="utf-8")

        self.assertIn("Distribution Hub ingest is fail-closed", readme)
        self.assertIn("--id <content-id> --apply", readme)
        self.assertIn("it does not call\nNotion", readme)


if __name__ == "__main__":
    unittest.main()
