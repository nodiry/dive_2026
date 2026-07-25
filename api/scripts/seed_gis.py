"""
Loads the 3 shapefiles that are actually usable (see docs/DATA_MODEL.md
Part 3 for the full story, including the one that ISN'T usable):

 - admin_boundary  <- vworld 행정구역도 (link #1), 192 동 boundary polygons, all 16 districts
 - commercial_zone <- vworld 용도지역지구 (link #4), AL_D124 도시지역 current-state
                      layer, Busan slice — every row carries a zone label (the older
                      LSMD_CONT_UQ111 history file only labeled ~500 of 3,307)
 - building        <- vworld 도로명주소 건물 (link #5), 379,711 Busan building footprints

IMPORTANT: building is loaded as reference data ONLY. Testing showed
matching housing_project.project_name against building names resolves
unambiguously for only 3 of 41 projects (~7%) — the rest are either
unmatched or the same name reused at multiple physical locations across
the city (e.g. "센텀뷰" matches 6 different sites). That's not a usable
geocoding strategy, so nothing here writes to housing_project.geom.
Real geocoding still needs the Kakao geocoding API — see PLAN.md.
"""

import asyncio

import asyncpg

from scripts.db import close_pool, get_pool
from scripts.lib.gis import ogr2ogr_to_staging
from scripts.lib.paths import SAMPLES_DIR, require_samples_dir


def _load_staging(shp_relative_path: str, staging_table: str, source_srs: str | None = None) -> None:
    ogr2ogr_to_staging(SAMPLES_DIR / shp_relative_path, staging_table, source_srs)


async def ingest_admin_boundary(conn: asyncpg.Connection) -> None:
    _load_staging("gis/admin_boundary/LSMD_ADM_SECT_UMD_26_202606.shp", "staging_admin_boundary")
    await conn.execute("TRUNCATE admin_boundary")
    await conn.execute(
        """
        INSERT INTO admin_boundary (emd_code, emd_name, sgg_code, geom)
        SELECT emd_cd, emd_nm, col_adm_se, ST_SetSRID(geom, 4326)::geography
        FROM staging_admin_boundary
        """
    )
    await conn.execute("DROP TABLE staging_admin_boundary")
    count = await conn.fetchval("SELECT count(*) FROM admin_boundary")
    print(f"admin_boundary: {count} rows")


async def ingest_zoning(conn: asyncpg.Connection) -> None:
    # AL_D124 (국토계획/도시지역, current-state layer) Busan slice — carries a
    # zone label (a6) on every row, unlike the old LSMD designation-history
    # file that only labeled ~500 of 3,307. a5 is the UQAxxx zone code
    # directly. 관리지역/농림지역 layers were checked and contain zero Busan
    # polygons — 도시지역 alone is complete coverage here (docs/DATA_MODEL.md).
    _load_staging("gis/zoning/AL_D124_26_20260719.shp", "staging_zoning")
    await conn.execute("TRUNCATE commercial_zone")
    await conn.execute(
        """
        INSERT INTO commercial_zone (zone_type, zone_code, geom)
        SELECT NULLIF(a6, ''), NULLIF(a5, ''), ST_SetSRID(geom, 4326)::geography
        FROM staging_zoning
        """
    )
    await conn.execute("DROP TABLE staging_zoning")
    count = await conn.fetchval("SELECT count(*) FROM commercial_zone")
    labeled = await conn.fetchval("SELECT count(*) FROM commercial_zone WHERE zone_type IS NOT NULL")
    print(f"commercial_zone: {count} rows ({labeled} with zone_type)")


async def ingest_buildings(conn: asyncpg.Connection) -> None:
    _load_staging("gis/building/TL_SPBD_BULD.Busan.shp", "staging_building", "EPSG:5179")
    await conn.execute("TRUNCATE building")
    await conn.execute(
        """
        INSERT INTO building (buld_name, emd_code, geom)
        SELECT NULLIF(buld_nm, ''), emd_cd, ST_SetSRID(geom, 4326)::geography
        FROM staging_building
        """
    )
    await conn.execute("DROP TABLE staging_building")
    count = await conn.fetchval("SELECT count(*) FROM building")
    print(f"building: {count} rows")


async def ingest_gis() -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await ingest_admin_boundary(conn)
        await ingest_zoning(conn)
        await ingest_buildings(conn)
    print(
        "industry_population_grid is filled by scripts/seed_population.py from the "
        "선도소프트 POP_STORE grid when present — see docs/DATA_MODEL.md Parts 4-5."
    )


async def main() -> None:
    require_samples_dir()
    await ingest_gis()
    await close_pool()


if __name__ == "__main__":
    asyncio.run(main())
