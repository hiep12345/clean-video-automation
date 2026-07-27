"""Regression tests for Antigravity QA evidence guardrails."""

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).parents[1]
QA_DIR = ROOT / ".agents" / "agents" / "qa-reviewer"
VALIDATOR_PATH = QA_DIR / "scripts" / "validate_smoke_transcript.py"
EVIDENCE_CONTRACT = QA_DIR / "references" / "evidence-contract.md"
EVALS_PATH = QA_DIR / "evals" / "evals.json"
SMOKE_PROMPT = QA_DIR / "evals" / "AGY-QA-SMOKE-20260726-03.md"


def load_validator():
    spec = importlib.util.spec_from_file_location(
        "validate_smoke_transcript", VALIDATOR_PATH
    )
    if spec is None or spec.loader is None:
        raise AssertionError("unable to load smoke transcript validator")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def model_report(text: str) -> dict:
    return {
        "source": "MODEL",
        "type": "PLANNER_RESPONSE",
        "content": text,
    }


def model_tools(*calls: dict) -> dict:
    return {
        "source": "MODEL",
        "type": "PLANNER_RESPONSE",
        "tool_calls": list(calls),
    }


GOOD_SUBAGENT_REPORT = """
CLAIM EVIDENCE RECEIPT
claim_id: trap-doi
exact_claim: DOI 10.1242/jeb.01328 proves neural shutdown
verdict: Unverified
source_opened: true
source_tool: read_url_content
source_type: primary
source_title: Anatomy of a live invertebrate revealed by MRI
source_authors: Herberholz et al.
source_url: https://example.test/bad-doi
source_doi: 10.1242/jeb.01328
study_subject: invertebrate
study_environment: laboratory MRI
exposure_conditions: not an epaulette shark study
supports: invertebrate MRI
does_not_support: epaulette shark neural shutdown
citation_identity: INVALID

CLAIM EVIDENCE RECEIPT
claim_id: aerial-duration
exact_claim: The shark survives two hours out of water
verdict: Unsupported
source_opened: true
source_tool: read_url_content
source_type: primary
source_title: Brain blood flow during hypoxia
source_authors: Soderstrom et al.
source_url: https://example.test/aquatic-study
source_doi: 10.1242/jeb.202.7.829
study_subject: Hemiscyllium ocellatum
study_environment: aquatic respiratory water
exposure_conditions: severe hypoxia for two hours at 24 C
supports: tolerance of aquatic hypoxia
does_not_support: two hours of aerial emersion
citation_identity: MATCH

MORPHOLOGY EVIDENCE RECEIPT
artifact_opened: true
artifact_path: image_infographic.png
reference_opened: false
reference_tool: unavailable
reference_source_url: none
reference_identity: not established
traits_compared: none
verdict: UNVERIFIED

QA GATE RECEIPT
artifact_revision: sha256:test
claim_receipts_complete: true
morphology_receipt_complete: false
critical_defects: 1
unsupported_claims: 1
unverified_claims: 1
gate_verdict: BLOCK
drive_buffer_eligible: false
"""


GOOD_PARENT_REPORT = """
PARENT EVIDENCE RECEIPT
parent_sources_opened: 1
source_tool: read_url_content
source_urls: https://example.test/aquatic-study
claims_cross_checked: aerial-duration
discrepancies_found: none
parent_cross_check: performed
"""


class QaEvidenceGuardrailTests(unittest.TestCase):
    """The policy, evals and transcript validator must fail closed."""

    @classmethod
    def setUpClass(cls):
        cls.validator = load_validator()

    def test_agent_loads_machine_checkable_evidence_contract(self):
        agent = (QA_DIR / "agent.md").read_text(encoding="utf-8")
        contract = EVIDENCE_CONTRACT.read_text(encoding="utf-8")
        adapter = (ROOT / ".agents" / "AGENTS.md").read_text(encoding="utf-8")
        routing = (
            ROOT / ".agents" / "config" / "agent-routing.md"
        ).read_text(encoding="utf-8")

        self.assertIn("references/evidence-contract.md", agent)
        self.assertIn("read_url_content", agent)
        self.assertIn("A DOI or URL is not evidence by itself", agent)
        self.assertIn("different species", agent)
        self.assertIn("MORPHOLOGY EVIDENCE RECEIPT", contract)
        self.assertIn("QA GATE RECEIPT", contract)
        self.assertIn("drive_buffer_eligible", contract)
        self.assertIn("PARENT EVIDENCE RECEIPT", adapter)
        self.assertIn("parent_cross_check: not performed", adapter)
        self.assertIn("Search snippets", routing)

    def test_smoke_test_03_has_three_deliberate_failure_modes(self):
        data = json.loads(EVALS_PATH.read_text(encoding="utf-8"))
        self.assertEqual(data["skill_name"], "qa-reviewer")
        self.assertEqual(
            {item["id"] for item in data["evals"]},
            {
                "citation-identity-trap",
                "exposure-mode-conflation",
                "missing-morphology-reference",
            },
        )
        for item in data["evals"]:
            self.assertTrue(item["expected_output"])
            self.assertGreaterEqual(len(item["assertions"]), 4)

        prompt = SMOKE_PROMPT.read_text(encoding="utf-8")
        self.assertIn("10.1242/jeb.01328", prompt)
        self.assertIn("Unsupported, not Needs qualifier", prompt)
        self.assertIn("parent_cross_check: not performed", prompt)
        self.assertIn("No state-changing tools", prompt)

    def test_validator_accepts_complete_fail_closed_receipts(self):
        subagent = [
            model_tools(
                {
                    "name": "read_url_content",
                    "args": {"url": "https://example.test/bad-doi"},
                },
                {
                    "name": "read_url_content",
                    "args": {"url": "https://example.test/aquatic-study"},
                },
            ),
            model_report(GOOD_SUBAGENT_REPORT),
        ]
        parent = [
            model_tools(
                {"name": "invoke_subagent", "args": {"agent": "qa-reviewer"}},
                {
                    "name": "read_url_content",
                    "args": {"url": "https://example.test/aquatic-study"},
                },
            ),
            model_report(GOOD_PARENT_REPORT),
        ]
        self.assertEqual(self.validator.validate_subagent(subagent), [])
        self.assertEqual(self.validator.validate_parent(parent), [])

    def test_validator_rejects_search_only_and_false_cross_check(self):
        weak_report = GOOD_SUBAGENT_REPORT.replace(
            "source_tool: read_url_content", "source_tool: search_web"
        ).replace("verdict: Unsupported", "verdict: Needs qualifier")
        subagent = [
            model_tools(
                {
                    "name": "search_web",
                    "args": {"query": "epaulette shark two hours"},
                }
            ),
            model_report(weak_report),
        ]
        parent = [
            model_tools(
                {"name": "invoke_subagent", "args": {"agent": "qa-reviewer"}}
            ),
            model_report(GOOD_PARENT_REPORT),
        ]
        subagent_failures = self.validator.validate_subagent(subagent)
        parent_failures = self.validator.validate_parent(parent)
        self.assertTrue(
            any("never called read_url_content" in item for item in subagent_failures)
        )
        self.assertTrue(
            any("not marked Unsupported" in item for item in subagent_failures)
        )
        self.assertTrue(
            any(
                "independently call read_url_content" in item
                for item in parent_failures
            )
        )

    def test_validator_ignores_receipt_words_in_user_prompt(self):
        events = [
            {
                "source": "USER_EXPLICIT",
                "type": "USER_INPUT",
                "content": GOOD_SUBAGENT_REPORT,
            },
            model_tools({"name": "search_web", "args": {"query": "test"}}),
            model_report("No evidence was opened."),
        ]
        failures = self.validator.validate_subagent(events)
        self.assertTrue(any("missing receipt field" in item for item in failures))

    def test_validator_can_use_delivered_child_report_from_parent_log(self):
        sender = "child-conversation-id"
        subagent = [
            model_tools(
                {
                    "name": "read_url_content",
                    "args": {"url": "https://example.test/source"},
                }
            ),
            model_report("Structured message body was truncated in child JSONL."),
        ]
        parent = [
            {
                "source": "SYSTEM",
                "type": "SYSTEM_MESSAGE",
                "content": (
                    "<SYSTEM_MESSAGE>\n"
                    f"[Message] timestamp=now sender={sender} "
                    f"priority=high content={GOOD_SUBAGENT_REPORT}\n"
                    "</SYSTEM_MESSAGE>"
                ),
            }
        ]
        subagent.extend(
            self.validator.delivered_child_events(parent, sender)
        )
        self.assertEqual(self.validator.validate_subagent(subagent), [])

    def test_cli_reports_pass_and_fail(self):
        with tempfile.TemporaryDirectory() as temporary:
            temp = Path(temporary)
            subagent_path = temp / "subagent.jsonl"
            parent_path = temp / "parent.jsonl"
            subagent_events = [
                model_tools(
                    {
                        "name": "read_url_content",
                        "args": {"url": "https://example.test/source"},
                    }
                ),
                model_report(GOOD_SUBAGENT_REPORT),
            ]
            parent_events = [
                model_tools(
                    {"name": "invoke_subagent", "args": {}},
                    {
                        "name": "read_url_content",
                        "args": {"url": "https://example.test/source"},
                    },
                ),
                model_report(GOOD_PARENT_REPORT),
            ]
            subagent_path.write_text(
                "\n".join(json.dumps(item) for item in subagent_events),
                encoding="utf-8",
            )
            parent_path.write_text(
                "\n".join(json.dumps(item) for item in parent_events),
                encoding="utf-8",
            )

            old_argv = list(__import__("sys").argv)
            try:
                __import__("sys").argv = [
                    "validate_smoke_transcript.py",
                    "--subagent-log",
                    str(subagent_path),
                    "--parent-log",
                    str(parent_path),
                ]
                self.assertEqual(self.validator.main(), 0)
            finally:
                __import__("sys").argv = old_argv


if __name__ == "__main__":
    unittest.main()
