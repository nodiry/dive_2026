import { sql } from "../db/client";
import { runMigrations } from "../db/migrate";
import { ingestHousing } from "../db/seedHousing";

await runMigrations();
await ingestHousing();
console.log(
  "GIS layers (commercial_poi etc.) are still empty — run `bun run ingest:gis` once Sundosoft's SHP samples are sourced (see ingest-gis.ts).",
);
await sql.close();
