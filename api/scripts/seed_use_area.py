"""
Loads the 선도소프트 상권-주거 융합데이터 (03 folder) into use_area_cell.

Each cell carries the partner's own 용도지역 label (UCODE/UNAME) and, more
usefully, BSST_YN — a per-cell bus-stop flag. That flag is the only public
transit signal in any of the provided datasets, and it powers the transit
chip on housing detail.

Unlike the government shapefiles this layer ships .cpg=UTF8, so it must be
staged with SHAPE_ENCODING=UTF-8 or UNAME comes out mojibake.

Soft-skips when the 03 folder isn't present (it comes from the handout zip
dropped at the repo root — see docs/DATA_MODEL.md Part 5). Runs inside
`just seed`. Idempotent: the table is replaced wholesale.
"""

import asyncio
import re
import sys
import unicodedata
from pathlib import Path

from scripts.db import close_pool, get_pool
from scripts.lib.gis import stage_zipped_shapefile
from scripts.lib.paths import SAMPLES_DIR, resolve_unicode_path

USE_AREA_DIR = resolve_unicode_path(
    SAMPLES_DIR,
    "2026_DIVE_해커톤_제공데이터_선도소프트",
    "03. 상권-주거 융합데이터",
)


def latest_zip() -> Path | None:
    """The newest 년 folder's zip — earlier years carry the same columns."""
    if not USE_AREA_DIR.is_dir():
        return None
    years: list[tuple[int, Path]] = []
    for child in sorted(USE_AREA_DIR.iterdir()):
        match = re.match(r"(\d{2})년", unicodedata.normalize("NFC", child.name))
        if not match or not child.is_dir():
            continue
        zip_path = next(iter(sorted(child.glob("*.[zZ]ip"))), None)
        if zip_path is not None:
            years.append((2000 + int(match.group(1)), zip_path))
    if not years:
        return None
    return max(years, key=lambda pair: pair[0])[1]


async def ingest_use_area() -> None:
    zip_path = latest_zip()
    if zip_path is None:
        print(
            f"use area: no 상권-주거 융합데이터 found under {USE_AREA_DIR}/ — skipping.\n"
            "Drop the 선도소프트 handout zip at the repo root and re-run.",
            file=sys.stderr,
        )
        return

    pool = await get_pool()
    print(f"loading STORE_USE_AREA from {zip_path.name}...")
    stage_zipped_shapefile(
        zip_path,
        "staging_use_area",
        select=["UCODE", "UNAME", "BSST_YN"],
        encoding="UTF-8",
    )
    await pool.execute("TRUNCATE use_area_cell")
    await pool.execute(
        """
        INSERT INTO use_area_cell (zone_code, zone_name, bus_stop, geom)
        SELECT NULLIF(s.ucode, ''),
               NULLIF(s.uname, ''),
               upper(COALESCE(s.bsst_yn, 'N')) = 'Y',
               ST_Multi(s.geom)::geography
        FROM staging_use_area s
        WHERE s.geom IS NOT NULL
        """
    )
    total = await pool.fetchval("SELECT count(*) FROM use_area_cell")
    with_stop = await pool.fetchval("SELECT count(*) FROM use_area_cell WHERE bus_stop")
    zones = await pool.fetchval("SELECT count(DISTINCT zone_name) FROM use_area_cell")
    await pool.execute("DROP TABLE staging_use_area")
    print(f"use_area_cell: {total} cells ({with_stop} with a bus stop, {zones} zoning labels)")


async def main() -> None:
    await ingest_use_area()
    await close_pool()


if __name__ == "__main__":
    asyncio.run(main())
