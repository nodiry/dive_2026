import { sql } from "../db/client";
import { ingestHousing } from "../db/seedHousing";
import { requireSamplesDir } from "../lib/paths";

await requireSamplesDir();
await ingestHousing();
await sql.close();
