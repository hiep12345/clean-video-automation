"""Contract tests for Antigravity specialized-agent definitions."""

import re
import unittest
from pathlib import Path


ROOT = Path(__file__).parents[1]
AGENT_DIR = ROOT / ".agents" / "agents"
ROUTING_FILE = ROOT / ".agents" / "config" / "agent-routing.md"
WORKFLOW_DIR = ROOT / ".agents" / "workflows"

EXPECTED_TOOLS = {
    "analytics-manager": {
        "view_file",
        "grep_search",
        "run_command",
        "write_to_file",
    },
    "production-executor": {"view_file", "run_command"},
    "qa-engineer": {
        "view_file",
        "grep_search",
        "write_to_file",
        "run_command",
    },
    "qa-reviewer": {
        "view_file",
        "search_web",
        "read_url_content",
        "run_command",
        "write_to_file",
    },
    "script-writer": {
        "view_file",
        "grep_search",
        "write_to_file",
        "replace_file_content",
    },
    "system-developer": {
        "view_file",
        "grep_search",
        "write_to_file",
        "replace_file_content",
        "multi_replace_file_content",
        "run_command",
    },
    "web-developer": {
        "view_file",
        "grep_search",
        "write_to_file",
        "replace_file_content",
        "multi_replace_file_content",
        "run_command",
    },
}


def parse_frontmatter(path: Path) -> tuple[dict[str, str], set[str], str]:
    """Parse the small YAML subset used by native Markdown agents."""
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    if not lines or lines[0] != "---":
        raise AssertionError(f"{path.name}: missing opening frontmatter marker")
    try:
        closing = lines.index("---", 1)
    except ValueError as exc:
        raise AssertionError(
            f"{path.name}: missing closing frontmatter marker"
        ) from exc

    values: dict[str, str] = {}
    tools: set[str] = set()
    in_tools = False
    for line in lines[1:closing]:
        if line == "tools:":
            in_tools = True
            continue
        if in_tools and line.startswith("  - "):
            tools.add(line[4:].strip())
            continue
        in_tools = False
        match = re.fullmatch(r"([a-zA-Z_]+):\s*(.+)", line)
        if match:
            values[match.group(1)] = match.group(2).strip().strip('"')
    return values, tools, text


class AgentDefinitionTests(unittest.TestCase):
    """Prevent stale paths, privilege drift and ambiguous role routing."""

    def test_exact_agent_inventory_and_frontmatter(self):
        """Every routed agent must have valid native Markdown metadata."""
        files = sorted(AGENT_DIR.glob("*/agent.md"))
        self.assertEqual(
            {path.parent.name for path in files},
            set(EXPECTED_TOOLS),
        )
        self.assertEqual(list(AGENT_DIR.glob("*.md")), [])
        for path in files:
            values, tools, _ = parse_frontmatter(path)
            self.assertEqual(values.get("name"), path.parent.name)
            self.assertEqual(values.get("subagent"), "true")
            self.assertTrue(values.get("description"))
            self.assertEqual(tools, EXPECTED_TOOLS[path.parent.name])

    def test_all_agents_inherit_workspace_safety_contract(self):
        """Specialists must acknowledge scope, dirty files and Git ownership."""
        for path in AGENT_DIR.glob("*/agent.md"):
            _, _, text = parse_frontmatter(path)
            with self.subTest(agent=path.parent.name):
                self.assertIn("# Agent System Instructions", text)
                self.assertIn("Read `AGENTS.md`", text)
                self.assertIn("`WORKSPACE ACK`", text)
                self.assertIn("Git authority: none", text)
                self.assertIn("Task mode:", text)
                self.assertNotIn("Git integrator: Không có — read-only", text)
                self.assertIn("dirty", text.lower())
                self.assertRegex(text, r"Never (mutate Git|switch branches)")

    def test_no_known_stale_paths_or_encoding_damage(self):
        """Definitions must route through current repositories and valid UTF-8."""
        forbidden = (
            "python scripts/",
            "Obsidian KB/",
            "GEMINI.md at the workspace root",
            ".agents/workflows/obsidian-rag-retrieve.md",
            "subagent-team.md",
            "fb-analyst-",
        )
        broken_encoding = re.compile(r"\b(?:K|d|l|ch|tr)\?\w*", re.IGNORECASE)
        for path in AGENT_DIR.glob("*/agent.md"):
            _, _, text = parse_frontmatter(path)
            with self.subTest(agent=path.parent.name):
                for token in forbidden:
                    self.assertNotIn(token, text)
                self.assertIsNone(broken_encoding.search(text))

    def test_routing_covers_each_agent_once(self):
        """The routing table must use the exact native agent inventory."""
        routing = ROUTING_FILE.read_text(encoding="utf-8")
        routed = re.findall(r"^\| `([^`]+)` \|", routing, flags=re.MULTILINE)
        self.assertEqual(set(routed), set(EXPECTED_TOOLS))
        self.assertEqual(len(routed), len(set(routed)))
        self.assertIn("No specialized agent is Git integrator", routing)
        adapter = (ROOT / ".agents" / "AGENTS.md").read_text(encoding="utf-8")
        self.assertIn(".agents/config/agent-routing.md", adapter)

    def test_coordinator_and_independent_acceptance_contract(self):
        """Parent must delegate complex work and reject self-signed media QA."""
        adapter = (ROOT / ".agents" / "AGENTS.md").read_text(encoding="utf-8")
        routing = ROUTING_FILE.read_text(encoding="utf-8")
        self.assertIn("Strategic Coordinator", adapter)
        self.assertIn("invoke_subagent", adapter)
        self.assertIn("từ ba file", adapter)
        self.assertIn("mười tool call", adapter)
        self.assertIn("không được tự ký PASS", adapter)
        self.assertIn("qa-reviewer", adapter)
        self.assertIn("The agent that", routing)
        self.assertIn("cannot approve its publication gate", routing)

    def test_content_hot_cache_uses_current_readable_governance(self):
        """The Antigravity hot cache must stay UTF-8 and avoid stale sections."""
        hot_cache = (ROOT / "content-planner-kb" / "GEMINI.md").read_text(
            encoding="utf-8"
        )
        self.assertIn('File này là "bộ nhớ nóng"', hot_cache)
        self.assertIn("../.agents/AGENTS.md", hot_cache)
        self.assertIn("../.agents/config/agent-routing.md", hot_cache)
        self.assertIn("invoke_subagent", hot_cache)
        self.assertNotIn("superpowers:subagent-driven-development", hot_cache)
        self.assertNotIn("AGENTS.md §3 (Coordinator Pattern)", hot_cache)
        self.assertLessEqual(len(hot_cache.splitlines()), 130)

    def test_high_risk_role_boundaries_are_explicit(self):
        """Production, analytics and QA must fail closed at role boundaries."""
        texts = {
            path.parent.name: path.read_text(encoding="utf-8")
            for path in AGENT_DIR.glob("*/agent.md")
        }
        self.assertIn(
            "explicit user approval to generate media and consume credits",
            texts["production-executor"],
        )
        self.assertIn(
            "Analytics is read-only by default",
            texts["analytics-manager"],
        )
        self.assertIn(
            "không thực hiện QA nội dung hoặc chấm video",
            texts["qa-engineer"],
        )
        self.assertIn(
            "L1/L2/L3 content-media QA",
            ROUTING_FILE.read_text(encoding="utf-8"),
        )
        self.assertIn(
            "record the exact source URL/DOI",
            texts["qa-reviewer"],
        )

    def test_required_static_references_exist(self):
        """Canonical scripts, policies and skills used by agents must exist."""
        required = (
            ".agents/skills/video-qa-gate/SKILL.md",
            ".agents/skills/clarity-gate/SKILL.md",
            ".agents/skills/script-writer/SKILL.md",
            "content-planner-kb/GEMINI.md",
            "content-planner-kb/scripts/fb_page_insights.py",
            "content-planner-kb/scripts/notion_sync.py",
            "content-planner-kb/scripts/archive_old_uploads.py",
            "content-planner-kb/scripts/produce_pipeline.py",
            "content-planner-kb/scripts/qa/l1_script_qa.py",
            (
                "content-planner-kb/obsidian-kb/_shared/production/"
                "guardrails-content-policy.md"
            ),
        )
        missing = [path for path in required if not (ROOT / path).exists()]
        self.assertEqual(missing, [])

    def test_workflows_use_current_routing_and_agents(self):
        """Core workflows must not reference deleted team configuration."""
        for name in (
            "analytics-batch.md",
            "script-preparation.md",
            "veo-generate.md",
        ):
            text = (WORKFLOW_DIR / name).read_text(encoding="utf-8")
            with self.subTest(workflow=name):
                self.assertNotIn("subagent-team.md", text)
                self.assertNotIn("fb-analyst-", text)
                self.assertNotIn("python scripts/", text)

        analytics = (WORKFLOW_DIR / "analytics-batch.md").read_text(
            encoding="utf-8"
        )
        production = (WORKFLOW_DIR / "veo-generate.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("not part of analytics collection", analytics)
        self.assertIn("explicit authorization", production)


if __name__ == "__main__":
    unittest.main()
