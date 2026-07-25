import math

from geoalchemy2 import Geometry
from sqlalchemy import select as sa_select
from sqlalchemy import text
from sqlmodel import cast, col, func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.housing.models import HousingProject, HousingUnit
from src.housing.service import affordable_projects, rent_affordable_projects, to_summaries
from src.poi.models import CommercialPoi
from src.recommendation.schemas import (
    LifeAxisScores,
    LifestyleMatchBreakdown,
    LifestyleRecommendationRequest,
    LifestyleRecommendationResult,
    MatchedPoi,
    MatchedPoiPoint,
    NeighborhoodEvidence,
    RoutineActivity,
    RoutineEvidence,
    RoutineFitItem,
)

POIS_PER_CATEGORY = 5

CAFE_CATEGORIES = {"카페"}
GYM_CATEGORIES = {"헬스장"}
CONVENIENCE_CATEGORIES = {"편의점"}
PHARMACY_CATEGORIES = {"약국"}
GAS_CATEGORIES = {"주유소"}
FOOD_CATEGORIES = {
    "백반/한정식",
    "김밥/만두/분식",
    "치킨",
    "중국집",
    "국/탕/찌개류",
    "경양식",
    "일식 회/초밥",
    "국수/칼국수",
    "돼지고기 구이/찜",
    "횟집",
}


def _clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, value))


def _category_score(count: int, nearest_meters: float, radius_meters: float) -> float:
    proximity = _clamp(1 - nearest_meters / radius_meters, 0, 1)
    density = min(count, 8) / 8
    return (proximity * 0.6 + density * 0.4) * 100


def _affordability_component(actual: float | None, maximum: float | None) -> float | None:
    if actual is None or maximum is None or maximum <= 0:
        return None
    slack = _clamp((maximum - actual) / maximum, 0, 1)
    return 65 + slack * 35


def _housing_fit(housing, req: LifestyleRecommendationRequest) -> float:
    parts: list[float] = []
    if req.min_area_m2:
        actual = housing.max_area_m2 or 0
        parts.append(_clamp(75 + ((actual - req.min_area_m2) / req.min_area_m2) * 25))
    if req.min_room_count:
        actual = housing.max_rooms or 0
        parts.append(_clamp(80 + (actual - req.min_room_count) * 10))
    if req.elevator_required:
        parts.append(100 if housing.has_elevator else 0)
    if req.parking_required:
        parts.append(100 if (housing.parking_spots or 0) > 0 else 0)
    return sum(parts) / len(parts) if parts else 82


def _haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    earth_radius = 6_371_000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    return earth_radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# Measured over the seeded stock at a 500m radius: p25=1, p50=16, p75=44,
# max=192 bus-stop-flagged cells. Saturating at the 75th percentile keeps the
# score discriminating across the middle of the range instead of pinning
# almost every project at 100.
TRANSIT_FULL_CELLS = 44
TRANSIT_WEIGHT = 0.35


def _destination_score(distance_meters: float | None) -> float:
    if distance_meters is None:
        return 50
    return _clamp(math.exp(-distance_meters / 8_000) * 100)


def _group_score(category_scores: dict[str, float], categories: set[str], fallback: float = 0) -> float:
    values = [category_scores[name] for name in categories if name in category_scores]
    return sum(values) / len(values) if values else fallback


# Both loaders below are keyed only by (project_id, radius): they read the
# seeded zoning and bus-stop layers and know nothing about the caller's
# preferences, budget, or routine. Life Match recalculates on every slider
# drag, so without this the zone buffering ran again for identical inputs and
# accounted for ~94% of the endpoint's 3.6s. Process-lifetime cache, because
# the inputs only change on a reseed; at 355 projects across a couple of radii
# it stays a few hundred entries.
_EVIDENCE_CACHE: dict[tuple[int, float], NeighborhoodEvidence] = {}
_BUS_STOP_CACHE: dict[tuple[int, float], int] = {}

# Zoning covers most of Busan but not every buffer, and a project with no
# overlapping polygon produces no row. Cached as an explicit zero so it is not
# re-queried on every keystroke for the rest of the process.
_NO_ZONE_EVIDENCE = NeighborhoodEvidence(
    residential_ratio=0.0, commercial_ratio=0.0, green_ratio=0.0, source="zoning"
)


def _split_cached[T](
    cache: dict[tuple[int, float], T], project_ids: list[int], radius_meters: float
) -> tuple[dict[int, T], list[int]]:
    """Partition ids into what the cache already answers and what must be read."""
    hits: dict[int, T] = {}
    misses: list[int] = []
    for project_id in project_ids:
        cached = cache.get((project_id, radius_meters))
        if cached is None:
            misses.append(project_id)
        else:
            hits[project_id] = cached
    return hits, misses


async def _load_bus_stop_cells(
    session: AsyncSession,
    project_ids: list[int],
    radius_meters: float,
) -> dict[int, int]:
    """Bus-stop-flagged cells within the radius, per project."""
    counts, missing = _split_cached(_BUS_STOP_CACHE, project_ids, radius_meters)
    if not missing:
        return counts

    rows = await session.execute(  # ty:ignore[deprecated]
        text(
            """
            SELECT p.id AS project_id, count(u.id) AS cells
            FROM housing_project p
            JOIN use_area_cell u
              ON u.bus_stop AND ST_DWithin(p.geom, u.geom, :radius)
            WHERE p.id = ANY(CAST(:project_ids AS INTEGER[])) AND p.geom IS NOT NULL
            GROUP BY p.id
            """
        ),
        {"project_ids": missing, "radius": radius_meters},
    )
    for row in rows:
        counts[row.project_id] = int(row.cells)
    for project_id in missing:
        # Absent from the result set means zero cells, which is worth caching too.
        _BUS_STOP_CACHE[(project_id, radius_meters)] = counts.setdefault(project_id, 0)
    return counts


async def _load_neighborhood_evidence(
    session: AsyncSession,
    project_ids: list[int],
    radius_meters: float,
) -> dict[int, NeighborhoodEvidence]:
    evidence, missing = _split_cached(_EVIDENCE_CACHE, project_ids, radius_meters)
    if not missing:
        return evidence

    rows = await session.execute(  # ty:ignore[deprecated]
        text(
            """
            WITH buffers AS (
                SELECT id AS project_id,
                       geom AS point_geog,
                       ST_Buffer(ST_Transform(geom::geometry, 5186), :radius) AS geom
                FROM housing_project
                WHERE id = ANY(CAST(:project_ids AS INTEGER[])) AND geom IS NOT NULL
            ), clipped AS (
                SELECT b.project_id, b.geom AS buffer_geom, z.zone_code,
                       ST_Intersection(b.geom, ST_Transform(z.geom::geometry, 5186)) AS geom
                FROM buffers b
                JOIN commercial_zone z
                  ON z.zone_code IS NOT NULL
                 AND ST_DWithin(b.point_geog, z.geom, :radius)
                 AND ST_Intersects(b.geom, ST_Transform(z.geom::geometry, 5186))
            )
            SELECT project_id,
                   LEAST(1, COALESCE(
                       ST_Area(ST_UnaryUnion(ST_Collect(geom) FILTER (WHERE zone_code LIKE 'UQA1%')))
                       / NULLIF(MAX(ST_Area(buffer_geom)), 0), 0
                   )) AS residential_ratio,
                   LEAST(1, COALESCE(
                       ST_Area(ST_UnaryUnion(ST_Collect(geom) FILTER (WHERE zone_code LIKE 'UQA2%')))
                       / NULLIF(MAX(ST_Area(buffer_geom)), 0), 0
                   )) AS commercial_ratio,
                   LEAST(1, COALESCE(
                       ST_Area(ST_UnaryUnion(ST_Collect(geom) FILTER (WHERE zone_code LIKE 'UQA4%')))
                       / NULLIF(MAX(ST_Area(buffer_geom)), 0), 0
                   )) AS green_ratio
            FROM clipped
            GROUP BY project_id
            """
        ),
        {"project_ids": missing, "radius": radius_meters},
    )
    for row in rows.mappings():
        evidence[row["project_id"]] = NeighborhoodEvidence(
            residential_ratio=round(float(row["residential_ratio"]), 4),
            commercial_ratio=round(float(row["commercial_ratio"]), 4),
            green_ratio=round(float(row["green_ratio"]), 4),
            source="zoning",
        )
    for project_id in missing:
        _EVIDENCE_CACHE[(project_id, radius_meters)] = evidence.setdefault(
            project_id, _NO_ZONE_EVIDENCE
        )
    return evidence


def _rest_score(evidence: NeighborhoodEvidence) -> float:
    if evidence.source == "unavailable":
        return 50
    residential = evidence.residential_ratio or 0
    commercial = evidence.commercial_ratio or 0
    green = evidence.green_ratio or 0
    return _clamp(45 + residential * 40 + green * 30 - commercial * 25)


def _candidate_statement(req: LifestyleRecommendationRequest):
    stmt = select(HousingProject).where(col(HousingProject.geom).is_not(None))
    if req.district:
        stmt = stmt.where(HousingProject.source_district == req.district)
    if req.type:
        stmt = stmt.where(HousingProject.type == req.type)
    if req.min_area_m2:
        stmt = stmt.where(
            select(col(HousingUnit.id))
            .where(
                HousingUnit.project_id == HousingProject.id,
                col(HousingUnit.area_m2) >= req.min_area_m2,
            )
            .exists()
        )
    if req.min_room_count:
        stmt = stmt.where(
            select(col(HousingUnit.id))
            .where(
                HousingUnit.project_id == HousingProject.id,
                col(HousingUnit.room_count) >= req.min_room_count,
            )
            .exists()
        )
    if req.elevator_required:
        stmt = stmt.where(
            select(col(HousingUnit.id))
            .where(
                HousingUnit.project_id == HousingProject.id,
                col(HousingUnit.has_elevator).is_(True),
            )
            .exists()
        )
    if req.parking_required:
        stmt = stmt.where(
            select(col(HousingUnit.id))
            .where(
                HousingUnit.project_id == HousingProject.id,
                col(HousingUnit.parking_spots) > 0,
            )
            .exists()
        )
    if req.deposit_max is not None:
        stmt = stmt.where(col(HousingProject.id).in_(affordable_projects(req.deposit_max)))
    if req.rent_max is not None:
        stmt = stmt.where(col(HousingProject.id).in_(rent_affordable_projects(req.rent_max)))
    return stmt.limit(200)


async def recommend_lifestyle(
    session: AsyncSession,
    req: LifestyleRecommendationRequest,
) -> list[LifestyleRecommendationResult]:
    category_names = [p.category_name for p in req.preferences]
    weight_by_category = {p.category_name: p.weight for p in req.preferences}

    result = await session.exec(_candidate_statement(req))
    candidates = list(result.all())
    if not candidates:
        return []

    ids = [candidate.id for candidate in candidates if candidate.id is not None]
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
                partition_by=(col(HousingProject.id), col(CommercialPoi.category_name)),
                order_by=dist,
            )
            .label("rn"),
        )
        .join(CommercialPoi, col(CommercialPoi.category_name).in_(category_names))
        .where(col(HousingProject.id).in_(ids), within)
        .subquery()
    )
    point_result = await session.execute(  # ty:ignore[deprecated]
        sa_select(ranked).where(ranked.c.rn <= POIS_PER_CATEGORY)
    )

    matches_by_project: dict[int, dict[str, tuple[int, float]]] = {}
    for project_id, category_name, poi_count, nearest in match_rows:
        matches_by_project.setdefault(project_id, {})[category_name] = (poi_count, float(nearest))

    pois_by_project: dict[int, dict[str, list[MatchedPoiPoint]]] = {}
    for row in point_result:
        pois_by_project.setdefault(row.project_id, {}).setdefault(row.category_name, []).append(
            MatchedPoiPoint(
                name=row.biz_name,
                lat=row.lat,
                lng=row.lng,
                distance_meters=float(row.dist),
            )
        )

    summaries = await to_summaries(session, candidates)
    neighborhood_by_project = await _load_neighborhood_evidence(session, ids, req.radius_meters)
    bus_stops_by_project = await _load_bus_stop_cells(session, ids, req.radius_meters)

    results: list[LifestyleRecommendationResult] = []
    for housing in summaries:
        by_category = matches_by_project.get(housing.id, {})
        pois_for_project = pois_by_project.get(housing.id, {})
        category_scores: dict[str, float] = {}
        matches: list[MatchedPoi] = []
        for category_name in category_names:
            hit = by_category.get(category_name)
            if not hit:
                matches.append(MatchedPoi(category_name=category_name, count=0, nearest_meters=None, pois=[]))
                category_scores[category_name] = 0
                continue
            count, nearest_meters = hit
            category_scores[category_name] = _category_score(count, nearest_meters, req.radius_meters)
            matches.append(
                MatchedPoi(
                    category_name=category_name,
                    count=count,
                    nearest_meters=nearest_meters,
                    pois=pois_for_project.get(category_name, []),
                )
            )

        cafe_score = _group_score(category_scores, CAFE_CATEGORIES)
        gym_score = _group_score(category_scores, GYM_CATEGORIES)
        convenience_score = _group_score(category_scores, CONVENIENCE_CATEGORIES)
        pharmacy_score = _group_score(category_scores, PHARMACY_CATEGORIES)
        gas_score = _group_score(category_scores, GAS_CATEGORIES)
        food_score = _group_score(category_scores, FOOD_CATEGORIES)

        fun_demands = [
            (cafe_score, req.routine.cafe if req.routine else 1),
            (gym_score, req.routine.exercise if req.routine else 1),
            (food_score, req.routine.dining if req.routine else 1),
        ]
        fun_weight = sum(weight for _, weight in fun_demands)
        fun_score = sum(score * weight for score, weight in fun_demands) / fun_weight if fun_weight else 50

        destination_distance = None
        if (
            req.destination_lat is not None
            and req.destination_lng is not None
            and housing.lat is not None
            and housing.lng is not None
        ):
            destination_distance = _haversine_meters(
                housing.lat,
                housing.lng,
                req.destination_lat,
                req.destination_lng,
            )
        destination_score = _destination_score(destination_distance)
        work_amenity_score = cafe_score * 0.4 + convenience_score * 0.3 + pharmacy_score * 0.2 + gas_score * 0.1
        # Bus access is the only transit signal in the provided data (BSST_YN
        # per cell). Saturating at TRANSIT_FULL_CELLS keeps a downtown grid
        # from dwarfing a perfectly walkable suburb.
        bus_stop_cells = bus_stops_by_project.get(housing.id, 0)
        transit_score = min(1.0, bus_stop_cells / TRANSIT_FULL_CELLS) * 100
        commute_score = (
            destination_score * (1 - TRANSIT_WEIGHT) + transit_score * TRANSIT_WEIGHT
            if destination_distance is not None
            else transit_score
        )
        destination_weight = 0.45 + min(req.destination_frequency or 0, 7) / 7 * 0.4
        work_score = (
            commute_score * destination_weight + work_amenity_score * (1 - destination_weight)
            if destination_distance is not None or bus_stop_cells > 0
            else work_amenity_score
        )

        neighborhood = neighborhood_by_project.get(
            housing.id,
            NeighborhoodEvidence(
                residential_ratio=None,
                commercial_ratio=None,
                green_ratio=None,
                source="unavailable",
            ),
        )
        neighborhood = neighborhood.model_copy(update={"bus_stop_cells": bus_stop_cells})
        rest_score = _rest_score(neighborhood)

        axis_weights = (req.life_stats.fun, req.life_stats.work, req.life_stats.rest) if req.life_stats else (34.0, 33.0, 33.0)
        axis_total = sum(axis_weights) or 100
        lifestyle_score = (fun_score * axis_weights[0] + work_score * axis_weights[1] + rest_score * axis_weights[2]) / axis_total

        routine_details: list[RoutineFitItem] = []
        if req.routine:
            activity_inputs: list[tuple[RoutineActivity, float, float, RoutineEvidence]] = [
                (
                    "commute",
                    req.routine.commute,
                    commute_score if destination_distance is not None or bus_stop_cells > 0 else work_score,
                    "destination" if destination_distance is not None else "nearbyPoi" if bus_stop_cells > 0 else "proxy",
                ),
                ("focus", req.routine.focus, cafe_score * 0.7 + convenience_score * 0.3, "nearbyPoi"),
                ("cafe", req.routine.cafe, cafe_score, "nearbyPoi"),
                ("exercise", req.routine.exercise, gym_score, "nearbyPoi"),
                ("dining", req.routine.dining, food_score, "nearbyPoi"),
                ("culture", req.routine.culture, 50, "unavailable"),
                (
                    "walking",
                    req.routine.walking,
                    rest_score,
                    "zoning" if neighborhood.source == "zoning" else "unavailable",
                ),
                (
                    "homeRest",
                    req.routine.home_rest,
                    rest_score,
                    "zoning" if neighborhood.source == "zoning" else "unavailable",
                ),
            ]
            routine_details = [
                RoutineFitItem(activity=activity, requested=requested, score=round(score, 1), evidence=evidence)
                for activity, requested, score, evidence in activity_inputs
                if requested > 0
            ]
            routine_total = sum(item.requested for item in routine_details)
            routine_score = (
                sum(item.requested * item.score for item in routine_details) / routine_total if routine_total else lifestyle_score
            )
        else:
            category_weight_total = sum(weight_by_category.values())
            routine_score = (
                sum(category_scores.get(name, 0) * weight for name, weight in weight_by_category.items()) / category_weight_total
                if category_weight_total
                else lifestyle_score
            )

        housing_score = _housing_fit(housing, req)
        affordability_parts = [
            part
            for part in (
                _affordability_component(housing.min_deposit, req.deposit_max),
                _affordability_component(housing.min_rent, req.rent_max),
            )
            if part is not None
        ]
        affordability_score = sum(affordability_parts) / len(affordability_parts) if affordability_parts else 78
        match_rate = lifestyle_score * 0.42 + routine_score * 0.28 + housing_score * 0.18 + affordability_score * 0.12

        results.append(
            LifestyleRecommendationResult(
                housing=housing,
                score=round(match_rate, 1),
                match_rate=round(match_rate, 1),
                breakdown=LifestyleMatchBreakdown(
                    lifestyle=round(lifestyle_score, 1),
                    routine=round(routine_score, 1),
                    housing=round(housing_score, 1),
                    affordability=round(affordability_score, 1),
                ),
                life_axes=LifeAxisScores(
                    fun=round(fun_score, 1),
                    work=round(work_score, 1),
                    rest=round(rest_score, 1),
                ),
                neighborhood=neighborhood,
                destination_distance_meters=round(destination_distance, 1) if destination_distance is not None else None,
                routine_details=routine_details,
                matches=matches,
            )
        )

    results.sort(key=lambda item: item.score, reverse=True)
    return results
