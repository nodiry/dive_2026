"""
Loads yearly store counts per 법정동 into district_store_trend, from the
선도소프트 상가-건물 융합데이터 (01 folder, per-year shapefile zips,
2021-2024). Each year's shapefile is one point per store; we only need the
count inside each admin boundary, so staging selects a single attribute
and the aggregate is a spatial join.

Powers the commercial-trend badge on housing detail (rising / stable /
declining, comparing the newest year against the oldest available).

Soft-skips when the 01 folder isn't present (it comes from the handout zip
dropped at the repo root — see docs/DATA_MODEL.md Part 5). Runs inside
`just seed`, after GIS so admin_boundary exists. Idempotent per year.
"""

import asyncio
import re
import sys
import unicodedata
from pathlib import Path

from scripts.db import close_pool, get_pool
from scripts.lib.gis import stage_zipped_shapefile
from scripts.lib.paths import SAMPLES_DIR, resolve_unicode_path

STORE_BUD_DIR = resolve_unicode_path(
    SAMPLES_DIR,
    "2026_DIVE_해커톤_제공데이터_선도소프트",
    "01. 상가-건물 융합데이터",
)


def yearly_zips() -> list[tuple[int, Path]]:
    """[(2021, .../21년/STORE_BUD_21_부산광역시.zip), ...] — folder name is the year."""
    if not STORE_BUD_DIR.is_dir():
        return []
    found: list[tuple[int, Path]] = []
    for child in sorted(STORE_BUD_DIR.iterdir()):
        # Drive-zip extractions can leave NFD folder names ("21년" with
        # decomposed jamo) — normalize before matching the composed pattern.
        m = re.match(r"(\d{2})년", unicodedata.normalize("NFC", child.name))
        if not m or not child.is_dir():
            continue
        zip_path = next(iter(sorted(child.glob("*.[zZ]ip"))), None)
        if zip_path is not None:
            found.append((2000 + int(m.group(1)), zip_path))
    return found


async def ingest_year(year: int, zip_path: Path) -> None:
    pool = await get_pool()
    print(f"loading STORE_BUD {year} from {zip_path.name}...")
    # only one light attribute staged — we just count points per boundary
    stage_zipped_shapefile(zip_path, "staging_store_trend", select=["CM_BSSH_NO"])
    await pool.execute("DELETE FROM district_store_trend WHERE year = $1", year)
    await pool.execute(
        """
        INSERT INTO district_store_trend (emd_code, year, store_count)
        SELECT ab.emd_code, $1, count(*)
        FROM staging_store_trend s
        JOIN admin_boundary ab ON ST_Contains(ab.geom::geometry, s.geom)
        GROUP BY ab.emd_code
        """,
        year,
    )
    total = await pool.fetchval("SELECT sum(store_count) FROM district_store_trend WHERE year = $1", year)
    await pool.execute("DROP TABLE staging_store_trend")
    print(f"district_store_trend {year}: {total} stores across boundaries")


async def ingest_trend() -> None:
    zips = yearly_zips()
    if not zips:
        print(
            f"store trend: no 상가-건물 융합데이터 found under {STORE_BUD_DIR}/ — skipping.\n"
            "Drop the 선도소프트 handout zip at the repo root and re-run (docs/DATA_MODEL.md Part 5).",
            file=sys.stderr,
        )
        return
    for year, zip_path in zips:
        await ingest_year(year, zip_path)


async def main() -> None:
    await ingest_trend()
    await close_pool()


if __name__ == "__main__":
    asyncio.run(main())
