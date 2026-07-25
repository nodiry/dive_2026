"""
Loads population figures onto admin_boundary (법정동 polygons) and, when the
선도소프트 grid data is available, fills industry_population_grid.

Two sources, tried in order when run without arguments:

1. `samples/population/busan_population.csv` — a hand-aggregated
   `code,population` CSV (8-digit 법정동 codes match exactly; 5-digit 구/군
   codes are distributed across member 동 polygons proportionally to area).
   Takes precedence when present since it's real 주민등록 data.
2. The 선도소프트 POP_STORE shapefile (인구-5대업종 가맹점 융합데이터,
   latest year found) — grid cells carrying 총인구 (P_Val). Each cell's
   population is split across the admin boundaries it intersects,
   proportionally to overlap area (areal interpolation). The same staging
   pass fills industry_population_grid with per-cell franchise counts
   (편의점/커피/한식/약국/이미용) and population density per km².

No source at all is a soft skip (exit 0) so `just seed` and onboarding
don't fail on a repo without the optional data — the density heat layer
just stays empty until a source lands.

Explicit CSV path: `uv run python -m scripts.seed_population <csv>`.
"""

import asyncio
import csv
import sys
import tempfile
import zipfile
from pathlib import Path

from scripts.db import close_pool, get_pool
from scripts.lib.gis import ogr2ogr_to_staging
from scripts.lib.paths import SAMPLES_DIR

MANUAL_CSV = SAMPLES_DIR / "population" / "busan_population.csv"
POP_STORE_DIR = SAMPLES_DIR / "2026_DIVE_해커톤_제공데이터_선도소프트" / "02. 인구-5대업종 가맹점 융합데이터"


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


async def ingest_from_csv(csv_path: Path) -> None:
    rows = read_rows(csv_path)
    if not rows:
        print(f"no usable rows in {csv_path}", file=sys.stderr)
        sys.exit(1)

    pool = await get_pool()
    boundaries = await pool.fetch("SELECT emd_code, sgg_code, ST_Area(geom) AS area_m2 FROM admin_boundary")
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
    print(
        f"population seeded from CSV: {exact} exact 법정동 rows, {gu} 구-level rows "
        f"(distributed by area), {unmatched} unmatched -> {len(updates)} polygons updated"
    )


def latest_pop_store_zip() -> Path | None:
    """Newest year folder wins ('24년' > '23년' — plain string sort works)."""
    if not POP_STORE_DIR.is_dir():
        return None
    zips = sorted(POP_STORE_DIR.glob("*/POP_STORE*.[zZ]ip"), key=lambda p: p.parent.name)
    return zips[-1] if zips else None


def _stage_pop_store(zip_path: Path, tmp: str) -> None:
    # Inner filenames are EUC-KR-mangled in some year zips — extract via
    # zipfile (names come out as cp437 mojibake, which is fine) and find
    # the .shp by extension rather than by name.
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(tmp)
    shp = next(Path(tmp).rglob("*.shp"), None)
    if shp is None:
        raise RuntimeError(f"no .shp found inside {zip_path}")
    print(f"loading POP_STORE grid from {zip_path.parent.name}/{zip_path.name}...")
    ogr2ogr_to_staging(shp, "staging_pop_store")


async def ingest_from_pop_store(zip_path: Path) -> None:
    pool = await get_pool()
    with tempfile.TemporaryDirectory() as tmp:
        _stage_pop_store(zip_path, tmp)

    # Areal interpolation: each grid cell's 총인구 (p_val) is split across
    # the admin boundaries it overlaps, proportionally to overlap area.
    result = await pool.execute(
        """
        WITH interpolated AS (
            SELECT ab.id,
                   ROUND(SUM(
                       COALESCE(g.p_val, 0)
                       * ST_Area(ST_Intersection(g.geom, ab.geom::geometry))
                       / NULLIF(ST_Area(g.geom), 0)
                   ))::int AS pop
            FROM staging_pop_store g
            JOIN admin_boundary ab ON ST_Intersects(g.geom, ab.geom::geometry)
            GROUP BY ab.id
        )
        UPDATE admin_boundary ab SET population = i.pop
        FROM interpolated i WHERE ab.id = i.id
        """
    )
    print(f"population interpolated onto admin_boundary: {result.split()[-1]} polygons updated")

    await pool.execute("TRUNCATE industry_population_grid")
    await pool.execute(
        """
        INSERT INTO industry_population_grid (geom, industry_mix, population_density)
        SELECT ST_Multi(g.geom)::geography,
               jsonb_build_object(
                   'convenience', COALESCE(g.d_csv, 0),
                   'coffee', COALESCE(g.d_coffee, 0),
                   'koreanFood', COALESCE(g.d_kfood, 0),
                   'pharmacy', COALESCE(g.d_pharm, 0),
                   'salon', COALESCE(g.d_salon, 0)
               ),
               COALESCE(g.p_val, 0) / NULLIF(ST_Area(g.geom::geography) / 1000000.0, 0)
        FROM staging_pop_store g
        """
    )
    count = await pool.fetchval("SELECT count(*) FROM industry_population_grid")
    await pool.execute("DROP TABLE staging_pop_store")
    print(f"industry_population_grid: {count} grid cells (franchise mix + density/km²)")


async def auto_ingest() -> None:
    """CSV if present, else POP_STORE grid, else a soft skip — used by seed.py."""
    if MANUAL_CSV.exists():
        await ingest_from_csv(MANUAL_CSV)
        return
    zip_path = latest_pop_store_zip()
    if zip_path is None:
        print(
            "population: no source found, skipping. Provide either\n"
            f"  {MANUAL_CSV} (code,population rows), or\n"
            f"  the 선도소프트 POP_STORE zips under {POP_STORE_DIR}/",
            file=sys.stderr,
        )
        return
    await ingest_from_pop_store(zip_path)


async def main(explicit_csv: Path | None) -> None:
    if explicit_csv is not None:
        await ingest_from_csv(explicit_csv)
    else:
        await auto_ingest()
    await close_pool()


def cli() -> None:
    explicit_csv: Path | None = None
    if len(sys.argv) > 1:
        explicit_csv = Path(sys.argv[1])
        if not explicit_csv.exists():
            print(
                f"CSV not found: {explicit_csv}\nProvide `code,population` rows (8-digit 법정동 or 5-digit 구 codes).",
                file=sys.stderr,
            )
            sys.exit(1)
    asyncio.run(main(explicit_csv))


if __name__ == "__main__":
    cli()
