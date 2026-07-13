from app.db import get_pool
from app.models import PoiCategorySummary

"""
Powers the frontend's category picker. Deliberately backed by real data
rather than a hardcoded Korean label list — category_name strings must
match commercial_poi exactly for the recommendation query to find anything,
and this project has already been burned twice by assumed-but-wrong Korean
taxonomy strings (see docs/DATA_MODEL.md Part 2).
"""


async def list_poi_categories(limit: int = 40) -> list[PoiCategorySummary]:
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT category_name AS "categoryName", count(*)::int AS count
        FROM commercial_poi
        GROUP BY category_name
        ORDER BY count DESC
        LIMIT $1
        """,
        limit,
    )
    return [PoiCategorySummary(category_name=r["categoryName"], count=r["count"]) for r in rows]
