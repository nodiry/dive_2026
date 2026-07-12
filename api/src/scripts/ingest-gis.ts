import { sql } from "../db/client";
import { ingestGis } from "../db/seedGis";
import { requireSamplesDir } from "../lib/paths";

await requireSamplesDir();
await ingestGis();
await sql.close();
