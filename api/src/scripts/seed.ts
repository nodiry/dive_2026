import { sql } from "../db/client";
import { runMigrations } from "../db/migrate";
import { ingestGis } from "../db/seedGis";
import { ingestHousing } from "../db/seedHousing";
import { ingestPoi } from "../db/seedPoi";
import { requireSamplesDir } from "../lib/paths";

await requireSamplesDir();
await runMigrations();
await ingestHousing();
await ingestPoi();
await ingestGis();
await sql.close();
