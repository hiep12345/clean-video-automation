"""Compatibility launcher for the production-owned Distribution Hub client.

The canonical bridge lives beside the production pipeline in
``content-planner-kb/scripts/distribution_hub_sync.py``. Keeping this launcher
avoids two implementations drifting while preserving the documented command.
Neither path imports or calls ``notion_sync``.
"""

from __future__ import annotations

import runpy
import sys
from pathlib import Path


WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
CANONICAL_CLIENT = (
    WORKSPACE_ROOT
    / "content-planner-kb"
    / "scripts"
    / "distribution_hub_sync.py"
)


def main() -> None:
    if not CANONICAL_CLIENT.is_file():
        raise RuntimeError(
            f"Distribution Hub client not found: {CANONICAL_CLIENT}"
        )
    sys.path.insert(0, str(CANONICAL_CLIENT.parent))
    runpy.run_path(str(CANONICAL_CLIENT), run_name="__main__")


if __name__ == "__main__":
    main()
