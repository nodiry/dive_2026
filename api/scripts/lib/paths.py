"""
Single source of truth for where the (gitignored, ~560MB) sample data lives.
Every ingestion script imports SAMPLES_DIR from here rather than hardcoding
a relative path.
"""

import os
import sys
from pathlib import Path

# api/app/lib/paths.py -> api/app/lib -> api/app -> api -> repo root.
# Overridable via $SAMPLES_DIR — in Docker the mount point may not match the
# host's relative layout, so docker-compose.yml sets this explicitly.
_default = Path(__file__).resolve().parents[3] / "samples"
SAMPLES_DIR = Path(os.environ.get("SAMPLES_DIR", str(_default)))


# The 2026-06-30 BMC handout folder — seed_housing reads its CSVs in place,
# original Korean folder/file names untouched.
BMC_DIR = SAMPLES_DIR / "2026_DIVE_해커톤_제공데이터_부산도시공사"


def require_samples_dir() -> None:
    marker = BMC_DIR / "매입임대주택 상세 정보 및 평균보증금, 평균임대료" / "매입임대 주택정보_20260630.csv"
    if not marker.exists():
        print(
            "\nsamples/ not found (or incomplete) at the repo root.\n"
            "Download the data zip, unzip it, and drop the resulting `samples/` folder\n"
            "directly into the project root (next to api/, client/, docs/), then re-run\n"
            "this command. See README.md and docs/DATA_MODEL.md for details.\n",
            file=sys.stderr,
        )
        sys.exit(1)
