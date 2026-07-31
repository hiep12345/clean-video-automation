#!/usr/bin/env python3
"""Compatibility shim for :mod:`workspace_control.doctor`."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from workspace_control.doctor import (  # noqa: E402,F401
    MEDIA_CONTRACT,
    MediaRootContract,
    _channel_database_media_issues,
    _duplicate_state_issues,
    _is_reparse_point,
    _media_contract_issues,
    _media_runtime_issues,
    _paths_overlap,
    _pytest_media_issues,
    _registered_worktree_paths,
    _resolve_database_media_path,
    _task_database_issues,
    _worktree_media_mount_issues,
    build_parser,
    build_report,
    classify_path,
    main,
)


if __name__ == "__main__":
    raise SystemExit(main())
