/**
 * Batch-geocodes every housing_project row that doesn't have a geom yet.
 * Safe to re-run any time — only touches rows where geom IS NULL, so it
 * never re-geocodes (and never re-spends API quota on) rows already done.
 *
 * Requires KAKAO_REST_API_KEY. Not run against a live key while building this
 * (none was available) — see docs/DATA_MODEL.md Part 3.
 */
import { sql } from "../db/client";
import { geocodeAddress } from "../lib/geocode";

const rows = await sql<{ id: number; address: string }[]>`
  SELECT id, address FROM housing_project WHERE geom IS NULL ORDER BY id
`;

console.log(`geocoding ${rows.length} housing_project rows without a geom...`);

let succeeded = 0;
let failed = 0;

for (const row of rows) {
  try {
    const result = await geocodeAddress(row.address);
    if (!result) {
      console.warn(`no geocode result for #${row.id}: ${row.address}`);
      failed++;
      continue;
    }
    await sql`
      UPDATE housing_project
      SET geom = ST_SetSRID(ST_MakePoint(${result.lng}, ${result.lat}), 4326)::geography
      WHERE id = ${row.id}
    `;
    succeeded++;
  } catch (err) {
    console.error(`geocode failed for #${row.id}: ${row.address}`, err);
    failed++;
  }
  // polite rate limit — Kakao's free tier is generous but there's no reason to hammer it
  await new Promise((resolve) => setTimeout(resolve, 100));
}

console.log(`geocoding complete: ${succeeded} succeeded, ${failed} failed`);
await sql.close();
