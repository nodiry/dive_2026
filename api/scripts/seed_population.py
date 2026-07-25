"""
Loads population figures onto admin_boundary (법정동 polygons).

CSV format: two columns `code,population` (header optional, commas inside
numbers tolerated). Two granularities are supported per row:

- 8-digit 법정동 code  -> exact match, population set directly.
- 5-digit 구/군 code   -> the 구's population is distributed across its
  member 동 polygons proportionally to polygon area (uniform density),
  which renders as a 구-level choropleth until finer data is available.

Rows that match nothing are reported, not silently dropped.
"""

import asyncio
import csv
import sys
from pathlib import Path

from scripts.db import close_pool, get_pool
from scripts.lib.paths import SAMPLES_DIR

DEFAULT_CSV = SAMPLES_DIR / "population" / "busan_population.csv"


def read_rows(path: Path) -> list[tuple[str, int]]:
    rows: list[tuple[str, int]] = []
    with open(path, encoding="utf-8-sig") as f:
        for raw in csv.reader(f):
            if len(raw) < 2:
                continue
            code = raw[0].strip()
            pop_text = raw[1].strip().replace(",", "").replace('"', "")
            if not code.isdigit() or not pop_text.isdigit():
                continue
            rows.append((code, int(pop_text)))
    return rows


async def ingest_population(csv_path: Path) -> None:
    rows = read_rows(csv_path)
    if not rows:
        print(f"no usable rows in {csv_path}", file=sys.stderr)
        sys.exit(1)

    pool = await get_pool()
    boundaries = await pool.fetch(
        "SELECT emd_code, sgg_code, ST_Area(geom) AS area_m2 FROM admin_boundary"
    )
    by_emd = {b["emd_code"]: b for b in boundaries}
    by_sgg: dict[str, list] = {}
    for b in boundaries:
        by_sgg.setdefault(b["sgg_code"], []).append(b)

    updates: dict[str, int] = {}
    exact = gu = unmatched = 0
    for code, population in rows:
        if code in by_emd:
            updates[code] = population
            exact += 1
        elif code in by_sgg:
            members = by_sgg[code]
            total_area = sum(m["area_m2"] for m in members)
            for m in members:
                updates[m["emd_code"]] = round(population * m["area_m2"] / total_area)
            gu += 1
        else:
            unmatched += 1
            print(f"  unmatched code: {code}", file=sys.stderr)

    await pool.executemany(
        "UPDATE admin_boundary SET population = $2 WHERE emd_code = $1",
        list(updates.items()),
    )
    await close_pool()

    print(
        f"population seeded: {exact} exact 법정동 rows, {gu} 구-level rows "
        f"(distributed by area), {unmatched} unmatched -> {len(updates)} polygons updated"
    )


if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV
    if not path.exists():
        print(
            f"CSV not found: {path}\n"
            "Provide `code,population` rows (8-digit 법정동 or 5-digit 구 codes).",
            file=sys.stderr,
        )
        sys.exit(1)
    asyncio.run(ingest_population(path))
