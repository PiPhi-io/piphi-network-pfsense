from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECK_RELEASE = ROOT / "scripts" / "check_release.py"


def test_current_release_metadata_is_consistent() -> None:
    version = json.loads((ROOT / "manifest.json").read_text())["version"]
    result = subprocess.run(
        [sys.executable, str(CHECK_RELEASE), f"v{version}"],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr


def test_release_check_rejects_a_mismatched_tag() -> None:
    result = subprocess.run(
        [sys.executable, str(CHECK_RELEASE), "v9.9.9"],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    assert "does not match release metadata" in result.stderr
