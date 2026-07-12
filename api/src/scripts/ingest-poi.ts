import { sql } from "../db/client";
import { ingestPoi } from "../db/seedPoi";
import { requireSamplesDir } from "../lib/paths";

await requireSamplesDir();
await ingestPoi();
await sql.close();
