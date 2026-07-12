import { fileURLToPath } from "node:url";

function pgConnString(): string {
  const url = new URL(process.env.DATABASE_URL ?? "postgres://dive:dive@localhost:5433/dive2026");
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const dbname = url.pathname.replace(/^\//, "");
  return `PG:host=${url.hostname} port=${url.port || "5432"} user=${user} dbname=${dbname} password=${password}`;
}

/**
 * Loads a shapefile into a staging table via ogr2ogr (not hand-parsed — GDAL
 * is far more reliable for CRS reprojection and DBF text decoding). Uses
 * argv-array spawn, not a shell string — Bun's `$` shell tag mis-escapes
 * Korean/paren/comma filenames, argv arrays sidestep that entirely.
 *
 * `-nlt PROMOTE_TO_MULTI` is required: Busan's admin/zoning polygons include
 * islands/exclaves that export as MultiPolygon, and a plain Polygon target
 * column would reject them.
 *
 * Some source shapefiles (e.g. the building layer) ship without a .prj file
 * — pass `sourceSrs` explicitly in that case, and verify the result lands in
 * real Busan coordinates (129.0-129.3, 35.0-35.4) before trusting it.
 */
export function ogr2ogrToStaging(shpUrl: URL, stagingTable: string, opts: { sourceSrs?: string } = {}): void {
  const args = [
    "ogr2ogr",
    "-f",
    "PostgreSQL",
    pgConnString(),
    fileURLToPath(shpUrl),
    "-nln",
    stagingTable,
    "-overwrite",
    "-nlt",
    "PROMOTE_TO_MULTI",
    "-lco",
    "GEOMETRY_NAME=geom",
    "-t_srs",
    "EPSG:4326",
  ];
  if (opts.sourceSrs) args.push("-s_srs", opts.sourceSrs);

  const proc = Bun.spawnSync(args, { env: { ...process.env, SHAPE_ENCODING: "EUC-KR" } });
  if (proc.exitCode !== 0) {
    throw new Error(`ogr2ogr failed for ${stagingTable}:\n${proc.stderr.toString()}`);
  }
}
