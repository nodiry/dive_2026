import type { LifestyleRecommendationRequest, LifestyleRecommendationResult, MatchedPoi } from "@dive2026/shared";
import { sql } from "../client";
import { toHousingSummary } from "./housing";

/**
 * Lifestyle-based recommendation (deck example 1: "카페, 헬스장, 편의점 가까운
 * 임대주택 어디야?"). Two-step: (1) hard-filtered candidate housing list in
 * SQL, (2) per-category proximity counts/nearest-distance in a second SQL
 * pass, combined into an explainable score in JS.
 *
 * Requires housing_project.geom to be populated — see docs/DATA_MODEL.md
 * Part 3's geocoding section. Every housing_project.geom is NULL until real
 * geocoding is wired up (name-matching against the building layer was tested
 * and doesn't have enough coverage to use), so this returns [] until then —
 * that's a real, honest empty result, not a bug in this query.
 *
 * Score per category = weight × (matched POI count within radius) × closeness
 * of the nearest one (1 at distance 0, 0 at the radius edge). Deliberately
 * simple/explainable over ML-flavored — see PLAN.md §2 on what the judging
 * rubric actually rewards.
 */
export async function recommendLifestyle(req: LifestyleRecommendationRequest): Promise<LifestyleRecommendationResult[]> {
  const categoryNames = req.preferences.map((p) => p.categoryName);
  const weightByCategory = new Map(req.preferences.map((p) => [p.categoryName, p.weight]));

  const where: string[] = ["p.geom IS NOT NULL"];
  const params: unknown[] = [];
  if (req.district) {
    params.push(req.district);
    where.push(`p.source_district = $${params.length}`);
  }
  const having: string[] = [];
  if (req.depositMax != null) {
    params.push(req.depositMax);
    having.push(`MIN(pr.deposit) <= $${params.length}`);
  }
  const whereSql = `WHERE ${where.join(" AND ")}`;
  const havingSql = having.length ? `HAVING ${having.join(" AND ")}` : "";

  const candidates = await sql.unsafe<Record<string, unknown>[]>(
    `
    SELECT p.id, p.type, p.project_name AS "projectName", p.address,
           p.built_date AS "builtDate", p.total_units AS "totalUnits",
           ST_Y(p.geom::geometry) AS lat, ST_X(p.geom::geometry) AS lng,
           MIN(pr.deposit) AS "minDeposit", MIN(pr.rent) AS "minRent"
    FROM housing_project p
    LEFT JOIN housing_price pr ON pr.project_id = p.id
    ${whereSql}
    GROUP BY p.id
    ${havingSql}
    LIMIT 200
    `,
    params,
  );
  if (candidates.length === 0) return [];

  const ids = candidates.map((c) => Number(c.id));
  const matchRows = await sql<{ project_id: number; category_name: string; poi_count: number; nearest_meters: number }[]>`
    SELECT hits.project_id, hits.category_name, count(*)::int AS poi_count, min(hits.dist) AS nearest_meters
    FROM (
      SELECT p.id AS project_id, poi.category_name, ST_Distance(p.geom, poi.geom) AS dist
      FROM housing_project p
      JOIN commercial_poi poi ON poi.category_name = ANY(${sql.array(categoryNames, "TEXT")})
      WHERE p.id = ANY(${sql.array(ids, "INT4")})
        AND ST_DWithin(p.geom, poi.geom, ${req.radiusMeters})
    ) hits
    GROUP BY hits.project_id, hits.category_name
  `;

  const matchesByProject = new Map<number, Map<string, { count: number; nearestMeters: number }>>();
  for (const row of matchRows) {
    const forProject = matchesByProject.get(row.project_id) ?? new Map();
    forProject.set(row.category_name, { count: row.poi_count, nearestMeters: Number(row.nearest_meters) });
    matchesByProject.set(row.project_id, forProject);
  }

  const results: LifestyleRecommendationResult[] = candidates.map((c) => {
    const housing = toHousingSummary(c);
    const forProject = matchesByProject.get(housing.id);
    let score = 0;
    const matches: MatchedPoi[] = categoryNames.map((categoryName) => {
      const hit = forProject?.get(categoryName);
      if (!hit) return { categoryName, count: 0, nearestMeters: null };
      const weight = weightByCategory.get(categoryName) ?? 0;
      const closeness = Math.max(0, 1 - hit.nearestMeters / req.radiusMeters);
      score += weight * hit.count * closeness;
      return { categoryName, count: hit.count, nearestMeters: hit.nearestMeters };
    });
    return { housing, score, matches };
  });

  results.sort((a, b) => b.score - a.score);
  return results;
}
