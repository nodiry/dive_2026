import { sql } from "../db/client";
import { runMigrations } from "../db/migrate";

await runMigrations();
await sql.close();
