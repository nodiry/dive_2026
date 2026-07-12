import { SQL } from "bun";

const url = process.env.DATABASE_URL ?? "postgres://dive:dive@localhost:5432/dive2026";

export const sql = new SQL(url);
