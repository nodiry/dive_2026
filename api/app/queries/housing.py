from datetime import date

import asyncpg

from app.db import get_pool
from app.models import HousingSearchQuery, HousingSummary

BASE_SELECT = """
    SELECT p.id, p.type, p.project_name AS "projectName", p.address,
           p.built_date AS "builtDate", p.total_units AS "totalUnits",
           ST_Y(p.geom::geometry) AS lat, ST_X(p.geom::geometry) AS lng,
           MIN(pr.deposit) AS "minDeposit", MIN(pr.rent) AS "minRent"
    FROM housing_project p
    LEFT JOIN housing_price pr ON pr.project_id = p.id
"""


def to_housing_summary(row: asyncpg.Record) -> HousingSummary:
    built_date = row["builtDate"]
    return HousingSummary(
        id=row["id"],
        type=row["type"],
        project_name=row["projectName"],
        address=row["address"],
        lat=row["lat"],
        lng=row["lng"],
        built_date=built_date.isoformat() if isinstance(built_date, date) else built_date,
        total_units=row["totalUnits"],
        min_deposit=row["minDeposit"],
        min_rent=row["minRent"],
    )


async def search_housing(query: HousingSearchQuery) -> list[HousingSummary]:
    """
    Condition-based search (deck example 2: "5년 이내 신축, 보증금 3천만원 미만").
    Hand-rolled parameterized query rather than a fixed one because the filter
    set is optional/dynamic — see recommendations.py for the same pattern
    combined with spatial joins.
    """
    where: list[str] = []
    params: list = []

    if query.type:
        params.append(query.type)
        where.append(f"p.type = ${len(params)}")
    if query.district:
        params.append(query.district)
        where.append(f"p.source_district = ${len(params)}")
    if query.built_after:
        params.append(date(query.built_after, 1, 1))
        where.append(f"p.built_date >= ${len(params)}")
    if query.room_count:
        params.append(query.room_count)
        where.append(
            f"EXISTS (SELECT 1 FROM housing_unit u WHERE u.project_id = p.id AND u.room_count = ${len(params)})"
        )

    having: list[str] = []
    if query.deposit_max is not None:
        params.append(query.deposit_max)
        having.append(f"MIN(pr.deposit) <= ${len(params)}")

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    having_sql = f"HAVING {' AND '.join(having)}" if having else ""

    sql = f"{BASE_SELECT} {where_sql} GROUP BY p.id {having_sql} ORDER BY p.id LIMIT 100"

    pool = await get_pool()
    rows = await pool.fetch(sql, *params)
    return [to_housing_summary(r) for r in rows]


async def get_housing_by_id(housing_id: int) -> HousingSummary | None:
    pool = await get_pool()
    row = await pool.fetchrow(f"{BASE_SELECT} WHERE p.id = $1 GROUP BY p.id", housing_id)
    return to_housing_summary(row) if row else None
