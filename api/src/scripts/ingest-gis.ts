/**
 * STUB — Sundosoft has not shipped real SHP samples yet (see PLAN.md §3).
 * Once files are obtained (from geomarket.kr or the vworld/data.go.kr/sgis
 * portals referenced in docs/[참고자료]선도소프트 원천데이터 링크), load them
 * with ogr2ogr directly into PostGIS — don't hand-parse .shp in JS:
 *
 *   ogr2ogr -f PostgreSQL \
 *     "PG:host=localhost user=dive dbname=dive2026 password=dive" \
 *     path/to/상가-건물_융합정보.shp \
 *     -nln commercial_poi_staging -overwrite -t_srs EPSG:4326
 *
 * Then reconcile `commercial_poi_staging` into `commercial_poi` (mapping
 * whatever the real category/name columns turn out to be onto `category`/
 * `category_name`/`biz_name`/`geom`) and drop the staging table. Repeat the
 * pattern for the population-industry grid and commercial-zone layers.
 *
 * Requires GDAL (`brew install gdal`) for ogr2ogr.
 */
console.log(
  "ingest-gis: no SHP samples available yet — see the comment at the top of this file once Sundosoft provides them.",
);
