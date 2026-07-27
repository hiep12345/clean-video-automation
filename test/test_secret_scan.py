from __future__ import annotations

import io
import subprocess
import tempfile
import unittest
from pathlib import Path

from tools import secret_scan


class SecretScanTests(unittest.TestCase):
    def _git(self, repo: Path, *args: str) -> str:
        result = subprocess.run(
            ["git", "-C", str(repo), *args],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        return result.stdout.strip()

    def _repo(self) -> tuple[tempfile.TemporaryDirectory[str], Path]:
        temporary = tempfile.TemporaryDirectory()
        repo = Path(temporary.name)
        self._git(repo, "init")
        self._git(repo, "config", "user.name", "Secret Scan Test")
        self._git(repo, "config", "user.email", "secret-scan@example.invalid")
        (repo / "safe.txt").write_text("safe\n", encoding="utf-8")
        self._git(repo, "add", "--", "safe.txt")
        self._git(repo, "commit", "-m", "safe baseline")
        return temporary, repo

    def test_detects_google_key_without_returning_value(self) -> None:
        secret = b"AI" + b"za" + (b"A" * 35)
        findings = secret_scan.findings_in_lines([("config.py", 4, secret)])

        self.assertEqual([finding.rule for finding in findings], ["Google API key"])
        self.assertNotIn(secret.decode(), repr(findings))

    def test_staged_scan_blocks_added_secret(self) -> None:
        temporary, repo = self._repo()
        self.addCleanup(temporary.cleanup)
        secret = "AI" + "za" + ("B" * 35)
        (repo / "config.py").write_text(f'KEY = "{secret}"\n', encoding="utf-8")
        self._git(repo, "add", "--", "config.py")

        findings = secret_scan.scan_staged(repo)

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].source, "config.py")

    def test_pre_push_scans_new_branch_history(self) -> None:
        temporary, repo = self._repo()
        self.addCleanup(temporary.cleanup)
        secret = "gh" + "p_" + ("C" * 24)
        (repo / "token.txt").write_text(secret, encoding="utf-8")
        self._git(repo, "add", "--", "token.txt")
        self._git(repo, "commit", "-m", "add token")
        local_oid = self._git(repo, "rev-parse", "HEAD")
        update = f"refs/heads/test {local_oid} refs/heads/test {secret_scan.ZERO_OID}\n"

        findings = secret_scan.scan_pre_push(repo, io.BytesIO(update.encode()))

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].rule, "GitHub token")

    def test_tracked_scan_ignores_safe_files(self) -> None:
        temporary, repo = self._repo()
        self.addCleanup(temporary.cleanup)

        self.assertEqual(secret_scan.scan_tracked(repo), [])


if __name__ == "__main__":
    unittest.main()
