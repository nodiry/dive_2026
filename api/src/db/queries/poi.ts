import type { PoiCategorySummary } from "@dive2026/shared";
import { sql } from "../client";

/**
 * Powers the frontend's category picker. Deliberately backed by real data
 * rather than a hardcoded Korean label list — category_name strings must
 * match commercial_poi exactly for the recommendation query to find anything,
 * and this project has already been burned twice by assumed-but-wrong Korean
 * taxonomy strings (see docs/DATA_MODEL.md Part 2).
 */
export async function listPoiCategories(limit = 40): Promise<PoiCategorySummary[]> {
  const rows = await sql<{ categoryName: string; count: number }[]>`
    SELECT category_name AS "categoryName", count(*)::int AS count
    FROM commercial_poi
    GROUP BY category_name
    ORDER BY count DESC
    LIMIT ${limit}
  `;
  return rows;
}
