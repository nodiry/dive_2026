import { sql } from "../db/client";
import { ingestHousing } from "../db/seedHousing";

await ingestHousing();
await sql.close();
