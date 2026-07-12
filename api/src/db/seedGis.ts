/**
 * Loads the 3 shapefiles that are actually usable (see docs/DATA_MODEL.md
 * Part 3 for the full story, including the one that ISN'T usable):
 *
 *  - admin_boundary  <- vworld 행정구역도 (link #1), 192 동 boundary polygons, all 16 districts
 *  - commercial_zone <- vworld 용도지역지구 (link #4, LSMD_CONT_UQ111 half only — the
 *                       other file in that download, AL_D011, is a scattered nationwide
 *                       preview sample and is NOT loaded)
 *  - building        <- vworld 도로명주소 건물 (link #5), 379,711 Busan building footprints
 *
 * IMPORTANT: building is loaded as reference data ONLY. Testing showed
 * matching housing_project.project_name against building names resolves
 * unambiguously for only 3 of 41 projects (~7%) — the rest are either
 * unmatched or the same name reused at multiple physical locations across
 * the city (e.g. "센텀뷰" matches 6 different sites). That's not a usable
 * geocoding strategy, so nothing here writes to housing_project.geom.
 * Real geocoding still needs the Kakao/VWorld geocoding API — see PLAN.md.
 */
import { sql } from "./client";
import { ogr2ogrToStaging } from "../lib/gis";
import { SAMPLES_DIR } from "../lib/paths";

async function loadStaging(shpRelativePath: string, stagingTable: string, sourceSrs?: string) {
  const shp = new URL(shpRelativePath, SAMPLES_DIR);
  ogr2ogrToStaging(shp, stagingTable, { sourceSrs });
}

export async function ingestAdminBoundary(): Promise<void> {
  await loadStaging("gis/admin_boundary/LSMD_ADM_SECT_UMD_26_202606.shp", "staging_admin_boundary");
  await sql`TRUNCATE admin_boundary`;
  const rows = await sql`
    INSERT INTO admin_boundary (emd_code, emd_name, sgg_code, geom)
    SELECT emd_cd, emd_nm, col_adm_se, ST_SetSRID(geom, 4326)::geography
    FROM staging_admin_boundary
  `;
  await sql`DROP TABLE staging_admin_boundary`;
  console.log(`admin_boundary: ${rows.count} rows`);
}

export async function ingestZoning(): Promise<void> {
  await loadStaging("gis/zoning/LSMD_CONT_UQ111_26_202606.shp", "staging_zoning");
  await sql`TRUNCATE commercial_zone`;
  const rows = await sql`
    INSERT INTO commercial_zone (zone_type, geom)
    SELECT NULLIF(alias, ''), ST_SetSRID(geom, 4326)::geography
    FROM staging_zoning
  `;
  await sql`DROP TABLE staging_zoning`;
  console.log(`commercial_zone: ${rows.count} rows`);
}

export async function ingestBuildings(): Promise<void> {
  await loadStaging("gis/building/TL_SPBD_BULD.Busan.shp", "staging_building", "EPSG:5179");
  await sql`TRUNCATE building`;
  const rows = await sql`
    INSERT INTO building (buld_name, emd_code, geom)
    SELECT NULLIF(buld_nm, ''), emd_cd, ST_SetSRID(geom, 4326)::geography
    FROM staging_building
  `;
  await sql`DROP TABLE staging_building`;
  console.log(`building: ${rows.count} rows`);
}

export async function ingestGis(): Promise<void> {
  await ingestAdminBoundary();
  await ingestZoning();
  await ingestBuildings();
  console.log(
    "industry_population_grid still empty — sgis's population CSVs have no boundary geometry to place them with, see docs/DATA_MODEL.md Part 4.",
  );
}
