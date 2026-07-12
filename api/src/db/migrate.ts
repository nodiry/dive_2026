import { readdir } from "node:fs/promises";
import { sql } from "./client";

const migrationsDir = new URL("./migrations/", import.meta.url);

export async function runMigrations(): Promise<void> {
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    console.log(`applying ${file}`);
    const contents = await Bun.file(new URL(file, migrationsDir)).text();
    await sql.unsafe(contents);
  }
  console.log(`done — applied ${files.length} migration file(s)`);
}
