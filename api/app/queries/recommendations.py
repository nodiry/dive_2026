from app.db import get_pool
from app.models import LifestyleRecommendationRequest, LifestyleRecommendationResult, MatchedPoi, MatchedPoiPoint
from app.queries.housing import BASE_SELECT, to_housing_summary

POIS_PER_CATEGORY = 5

"""
Lifestyle-based recommendation (deck example 1: "카페, 헬스장, 편의점 가까운
임대주택 어디야?"). Two-step: (1) hard-filtered candidate housing list in
SQL, (2) per-category proximity counts/nearest-distance in a second SQL
pass, combined into an explainable score in Python.

Requires housing_project.geom to be populated — see docs/DATA_MODEL.md
Part 3's geocoding section. Every housing_project.geom is NULL until real
geocoding is wired up (name-matching against the building layer was tested
and doesn't have enough coverage to use), so this returns [] until then —
that's a real, honest empty result, not a bug in this query.

Score per category = weight × (matched POI count within radius) × closeness
of the nearest one (1 at distance 0, 0 at the radius edge). Deliberately
simple/explainable over ML-flavored — see PLAN.md §2 on what the judging
rubric actually rewards.
"""


async def recommend_lifestyle(req: LifestyleRecommendationRequest) -> list[LifestyleRecommendationResult]:
    category_names = [p.category_name for p in req.preferences]
    weight_by_category = {p.category_name: p.weight for p in req.preferences}

    where = ["p.geom IS NOT NULL"]
    params: list = []
    if req.district:
        params.append(req.district)
        where.append(f"p.source_district = ${len(params)}")

    having: list[str] = []
    if req.deposit_max is not None:
        params.append(req.deposit_max)
        having.append(f"MIN(pr.deposit) <= ${len(params)}")

    where_sql = f"WHERE {' AND '.join(where)}"
    having_sql = f"HAVING {' AND '.join(having)}" if having else ""

    pool = await get_pool()
    candidates = await pool.fetch(f"{BASE_SELECT} {where_sql} GROUP BY p.id {having_sql} LIMIT 200", *params)
    if not candidates:
        return []

    ids = [c["id"] for c in candidates]
    match_rows = await pool.fetch(
        """
        SELECT hits.project_id, hits.category_name, count(*)::int AS poi_count, min(hits.dist) AS nearest_meters
        FROM (
            SELECT p.id AS project_id, poi.category_name, ST_Distance(p.geom, poi.geom) AS dist
            FROM housing_project p
            JOIN commercial_poi poi ON poi.category_name = ANY($1::text[])
            WHERE p.id = ANY($2::int[])
              AND ST_DWithin(p.geom, poi.geom, $3)
        ) hits
        GROUP BY hits.project_id, hits.category_name
        """,
        category_names,
        ids,
        req.radius_meters,
    )

    # Individual nearest POI points per (project, category), capped, for map pins/trails —
    # additive alongside the aggregate query above rather than restructuring it.
    poi_point_rows = await pool.fetch(
        """
        SELECT project_id, category_name, biz_name, lat, lng, dist
        FROM (
            SELECT p.id AS project_id, poi.category_name, poi.biz_name,
                   ST_Y(poi.geom::geometry) AS lat, ST_X(poi.geom::geometry) AS lng,
                   ST_Distance(p.geom, poi.geom) AS dist,
                   ROW_NUMBER() OVER (PARTITION BY p.id, poi.category_name ORDER BY ST_Distance(p.geom, poi.geom)) AS rn
            FROM housing_project p
            JOIN commercial_poi poi ON poi.category_name = ANY($1::text[])
            WHERE p.id = ANY($2::int[])
              AND ST_DWithin(p.geom, poi.geom, $3)
        ) ranked
        WHERE rn <= $4
        """,
        category_names,
        ids,
        req.radius_meters,
        POIS_PER_CATEGORY,
    )

    matches_by_project: dict[int, dict[str, tuple[int, float]]] = {}
    for row in match_rows:
        forProject = matches_by_project.setdefault(row["project_id"], {})
        forProject[row["category_name"]] = (row["poi_count"], float(row["nearest_meters"]))

    pois_by_project: dict[int, dict[str, list[MatchedPoiPoint]]] = {}
    for row in poi_point_rows:
        forProject = pois_by_project.setdefault(row["project_id"], {})
        forProject.setdefault(row["category_name"], []).append(
            MatchedPoiPoint(name=row["biz_name"], lat=row["lat"], lng=row["lng"], distance_meters=float(row["dist"]))
        )

    results: list[LifestyleRecommendationResult] = []
    for c in candidates:
        housing = to_housing_summary(c)
        for_project = matches_by_project.get(housing.id, {})
        pois_for_project = pois_by_project.get(housing.id, {})
        score = 0.0
        matches: list[MatchedPoi] = []
        for category_name in category_names:
            hit = for_project.get(category_name)
            if not hit:
                matches.append(MatchedPoi(category_name=category_name, count=0, nearest_meters=None, pois=[]))
                continue
            count, nearest_meters = hit
            weight = weight_by_category.get(category_name, 0)
            closeness = max(0.0, 1 - nearest_meters / req.radius_meters)
            score += weight * count * closeness
            matches.append(
                MatchedPoi(
                    category_name=category_name,
                    count=count,
                    nearest_meters=nearest_meters,
                    pois=pois_for_project.get(category_name, []),
                )
            )
        results.append(LifestyleRecommendationResult(housing=housing, score=score, matches=matches))

    results.sort(key=lambda r: r.score, reverse=True)
    return results
