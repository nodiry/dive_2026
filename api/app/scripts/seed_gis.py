"""
Loads the 3 shapefiles that are actually usable (see docs/DATA_MODEL.md
Part 3 for the full story, including the one that ISN'T usable):

 - admin_boundary  <- vworld 행정구역도 (link #1), 192 동 boundary polygons, all 16 districts
 - commercial_zone <- vworld 용도지역지구 (link #4, LSMD_CONT_UQ111 half only — the
                      other file in that download, AL_D011, is a scattered nationwide
                      preview sample and is NOT loaded)
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

from app.db import close_pool, get_pool
from app.lib.gis import ogr2ogr_to_staging
from app.lib.paths import SAMPLES_DIR, require_samples_dir


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
    _load_staging("gis/zoning/LSMD_CONT_UQ111_26_202606.shp", "staging_zoning")
    await conn.execute("TRUNCATE commercial_zone")
    await conn.execute(
        """
        INSERT INTO commercial_zone (zone_type, geom)
        SELECT NULLIF(alias, ''), ST_SetSRID(geom, 4326)::geography
        FROM staging_zoning
        """
    )
    await conn.execute("DROP TABLE staging_zoning")
    count = await conn.fetchval("SELECT count(*) FROM commercial_zone")
    print(f"commercial_zone: {count} rows")


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
        "industry_population_grid still empty — sgis's population CSVs have no boundary "
        "geometry to place them with, see docs/DATA_MODEL.md Part 4."
    )


async def main() -> None:
    require_samples_dir()
    await ingest_gis()
    await close_pool()


if __name__ == "__main__":
    asyncio.run(main())
