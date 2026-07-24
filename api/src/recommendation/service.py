from geoalchemy2 import Geometry
from sqlalchemy import select as sa_select
from sqlmodel import cast, col, func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.housing.models import HousingProject
from src.housing.service import affordable_projects, to_summaries
from src.poi.models import CommercialPoi
from src.recommendation.schemas import (
    LifestyleRecommendationRequest,
    LifestyleRecommendationResult,
    MatchedPoi,
    MatchedPoiPoint,
)

POIS_PER_CATEGORY = 5


async def recommend_lifestyle(session: AsyncSession, req: LifestyleRecommendationRequest) -> list[LifestyleRecommendationResult]:
    category_names = [p.category_name for p in req.preferences]
    weight_by_category = {p.category_name: p.weight for p in req.preferences}

    stmt = select(HousingProject).where(col(HousingProject.geom).is_not(None))
    if req.district:
        stmt = stmt.where(HousingProject.source_district == req.district)
    if req.deposit_max is not None:
        stmt = stmt.where(col(HousingProject.id).in_(affordable_projects(req.deposit_max)))

    result = await session.exec(stmt.limit(200))
    candidates = list(result.all())
    if not candidates:
        return []

    ids = [c.id for c in candidates if c.id is not None]
    dist = func.ST_Distance(HousingProject.geom, CommercialPoi.geom)
    within = func.ST_DWithin(HousingProject.geom, CommercialPoi.geom, req.radius_meters)

    result = await session.exec(
        select(
            HousingProject.id,
            CommercialPoi.category_name,
            func.count(),
            func.min(dist),
        )
        .join(CommercialPoi, col(CommercialPoi.category_name).in_(category_names))
        .where(col(HousingProject.id).in_(ids), within)
        .group_by(col(HousingProject.id), col(CommercialPoi.category_name))
    )
    match_rows = result.all()

    ranked = (
        sa_select(
            col(HousingProject.id).label("project_id"),
            col(CommercialPoi.category_name).label("category_name"),
            col(CommercialPoi.biz_name).label("biz_name"),
            func.ST_Y(cast(col(CommercialPoi.geom), Geometry())).label("lat"),
            func.ST_X(cast(col(CommercialPoi.geom), Geometry())).label("lng"),
            dist.label("dist"),
            func.row_number()
            .over(
                partition_by=(
                    col(HousingProject.id),
                    col(CommercialPoi.category_name),
                ),
                order_by=dist,
            )
            .label("rn"),
        )
        .join(
            CommercialPoi,
            col(CommercialPoi.category_name).in_(category_names),
        )
        .where(col(HousingProject.id).in_(ids), within)
        .subquery()
    )
    result = await session.execute(  # ty:ignore[deprecated]
        sa_select(ranked).where(ranked.c.rn <= POIS_PER_CATEGORY)
    )
    poi_point_rows = result.all()

    matches_by_project: dict[int, dict[str, tuple[int, float]]] = {}
    for project_id, category_name, poi_count, nearest in match_rows:
        by_category = matches_by_project.setdefault(project_id, {})
        by_category[category_name] = (poi_count, float(nearest))

    pois_by_project: dict[int, dict[str, list[MatchedPoiPoint]]] = {}
    for row in poi_point_rows:
        by_category = pois_by_project.setdefault(row.project_id, {})
        by_category.setdefault(row.category_name, []).append(
            MatchedPoiPoint(
                name=row.biz_name,
                lat=row.lat,
                lng=row.lng,
                distance_meters=float(row.dist),
            )
        )

    summaries = await to_summaries(session, candidates)

    results: list[LifestyleRecommendationResult] = []
    for housing in summaries:
        by_category = matches_by_project.get(housing.id, {})
        pois_for_project = pois_by_project.get(housing.id, {})
        score = 0.0
        matches: list[MatchedPoi] = []
        for category_name in category_names:
            hit = by_category.get(category_name)
            if not hit:
                matches.append(
                    MatchedPoi(
                        category_name=category_name,
                        count=0,
                        nearest_meters=None,
                        pois=[],
                    )
                )
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
