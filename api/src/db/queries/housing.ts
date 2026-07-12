import type { HousingSearchQuery, HousingSummary } from "@dive2026/shared";
import { sql } from "../client";

export function toHousingSummary(r: Record<string, unknown>): HousingSummary {
  return {
    id: Number(r.id),
    type: r.type as HousingSummary["type"],
    projectName: r.projectName as string,
    address: r.address as string,
    lat: r.lat != null ? Number(r.lat) : null,
    lng: r.lng != null ? Number(r.lng) : null,
    builtDate: r.builtDate ? new Date(r.builtDate as string).toISOString().slice(0, 10) : null,
    totalUnits: r.totalUnits != null ? Number(r.totalUnits) : null,
    minDeposit: r.minDeposit != null ? Number(r.minDeposit) : null,
    minRent: r.minRent != null ? Number(r.minRent) : null,
  };
}

/**
 * Condition-based search (deck example 2: "5년 이내 신축, 보증금 3천만원 미만").
 * Built as a hand-rolled parameterized query rather than the tagged-template
 * form because the filter set is optional/dynamic — see the lifestyle
 * recommendation query (once written) for the same pattern with spatial joins.
 */
export async function searchHousing(query: HousingSearchQuery): Promise<HousingSummary[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (query.type) {
    params.push(query.type);
    where.push(`p.type = $${params.length}`);
  }
  if (query.district) {
    params.push(query.district);
    where.push(`p.source_district = $${params.length}`);
  }
  if (query.builtAfter) {
    params.push(`${query.builtAfter}-01-01`);
    where.push(`p.built_date >= $${params.length}::date`);
  }
  if (query.roomCount) {
    params.push(query.roomCount);
    where.push(
      `EXISTS (SELECT 1 FROM housing_unit u WHERE u.project_id = p.id AND u.room_count = $${params.length})`,
    );
  }

  const having: string[] = [];
  if (query.depositMax != null) {
    params.push(query.depositMax);
    having.push(`MIN(pr.deposit) <= $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const havingSql = having.length ? `HAVING ${having.join(" AND ")}` : "";

  const rows = await sql.unsafe<Record<string, unknown>[]>(
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
    ORDER BY p.id
    LIMIT 100
    `,
    params,
  );

  return rows.map(toHousingSummary);
}

export async function getHousingById(id: number): Promise<HousingSummary | null> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT p.id, p.type, p.project_name AS "projectName", p.address,
           p.built_date AS "builtDate", p.total_units AS "totalUnits",
           ST_Y(p.geom::geometry) AS lat, ST_X(p.geom::geometry) AS lng,
           MIN(pr.deposit) AS "minDeposit", MIN(pr.rent) AS "minRent"
    FROM housing_project p
    LEFT JOIN housing_price pr ON pr.project_id = p.id
    WHERE p.id = ${id}
    GROUP BY p.id
  `;
  return rows[0] ? toHousingSummary(rows[0]) : null;
}
