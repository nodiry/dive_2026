from datetime import date
from typing import Literal

from geoalchemy2 import Geometry
from sqlalchemy import select as sa_select
from sqlmodel import cast, col, func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.gis.models import AdminBoundary, CommercialZone, DistrictStoreTrend, UseAreaCell
from src.housing.models import HousingPrice, HousingProject, HousingUnit
from src.housing.schemas import (
    HousingSearchQuery,
    HousingSummary,
    NeighborhoodCategory,
    NeighborhoodProfile,
    NeighborhoodTrendPoint,
    NeighborhoodZone,
)
from src.poi.models import CommercialPoi

# Walking distance to a bus-stop-flagged cell for the 버스정류장 인접 filter.
TRANSIT_FILTER_RADIUS_M = 400


def affordable_projects(deposit_max: float):
    return (
        select(col(HousingPrice.project_id))
        .group_by(col(HousingPrice.project_id))
        .having(func.min(col(HousingPrice.deposit)) <= deposit_max)
    )


def rent_affordable_projects(rent_max: float):
    return (
        select(col(HousingPrice.project_id))
        .group_by(col(HousingPrice.project_id))
        .having(func.min(col(HousingPrice.rent)) <= rent_max)
    )


async def to_summaries(session: AsyncSession, projects: list[HousingProject]) -> list[HousingSummary]:
    ids = [p.id for p in projects if p.id is not None]
    if not ids:
        return []

    result = await session.exec(
        select(
            HousingPrice.project_id,
            func.min(HousingPrice.deposit),
            func.min(HousingPrice.rent),
        )
        .where(col(HousingPrice.project_id).in_(ids))
        .group_by(col(HousingPrice.project_id))
    )
    price_rows = result.all()
    prices = {pid: (deposit, rent) for pid, deposit, rent in price_rows}

    # sqlmodel.select() is typed for at most 4 entities — use sqlalchemy's
    # select for this 7-column projection (docs/TECHNICAL.md typing rules).
    result = await session.execute(  # ty:ignore[deprecated] -- Row tuples wanted, exec() would scalar-collapse
        sa_select(
            col(HousingUnit.project_id),
            func.min(HousingUnit.area_m2),
            func.max(HousingUnit.area_m2),
            func.min(HousingUnit.room_count),
            func.max(HousingUnit.room_count),
            func.bool_or(HousingUnit.has_elevator),
            func.max(HousingUnit.parking_spots),
        )
        .where(col(HousingUnit.project_id).in_(ids))
        .group_by(col(HousingUnit.project_id))
    )
    unit_rows = result.all()
    units = {
        pid: (min_area, max_area, min_rooms, max_rooms, has_elevator, parking_spots)
        for pid, min_area, max_area, min_rooms, max_rooms, has_elevator, parking_spots in unit_rows
    }

    result = await session.exec(
        select(
            HousingProject.id,
            func.ST_Y(cast(col(HousingProject.geom), Geometry())),
            func.ST_X(cast(col(HousingProject.geom), Geometry())),
        ).where(
            col(HousingProject.id).in_(ids),
            col(HousingProject.geom).is_not(None),
        )
    )
    coord_rows = result.all()
    coords = {pid: (lat, lng) for pid, lat, lng in coord_rows}

    summaries: list[HousingSummary] = []
    for p in projects:
        lat, lng = coords.get(p.id, (None, None))
        deposit, rent = prices.get(p.id, (None, None))
        unit_summary = units.get(p.id, (None, None, None, None, None, None))
        summaries.append(HousingSummary.from_project(p, lat, lng, deposit, rent, *unit_summary))
    return summaries


async def search_housing(session: AsyncSession, query: HousingSearchQuery) -> list[HousingSummary]:
    stmt = select(HousingProject)

    if query.type:
        stmt = stmt.where(HousingProject.type == query.type)
    if query.district:
        stmt = stmt.where(HousingProject.source_district == query.district)
    if query.built_after:
        stmt = stmt.where(col(HousingProject.built_date) >= date(query.built_after, 1, 1))
    if query.room_count:
        stmt = stmt.where(
            select(col(HousingUnit.id))
            .where(
                HousingUnit.project_id == HousingProject.id,
                col(HousingUnit.room_count) >= query.room_count,
            )
            .exists()
        )
    if query.min_area_m2:
        stmt = stmt.where(
            select(col(HousingUnit.id))
            .where(
                HousingUnit.project_id == HousingProject.id,
                col(HousingUnit.area_m2) >= query.min_area_m2,
            )
            .exists()
        )
    if query.elevator_required:
        stmt = stmt.where(
            select(col(HousingUnit.id))
            .where(
                HousingUnit.project_id == HousingProject.id,
                col(HousingUnit.has_elevator).is_(True),
            )
            .exists()
        )
    if query.parking_required:
        stmt = stmt.where(
            select(col(HousingUnit.id))
            .where(
                HousingUnit.project_id == HousingProject.id,
                col(HousingUnit.parking_spots) > 0,
            )
            .exists()
        )
    if query.bus_stop_nearby:
        stmt = stmt.where(
            select(col(UseAreaCell.id))
            .where(
                col(UseAreaCell.bus_stop).is_(True),
                func.ST_DWithin(col(HousingProject.geom), col(UseAreaCell.geom), TRANSIT_FILTER_RADIUS_M),
            )
            .exists()
        )
    if query.deposit_max is not None:
        stmt = stmt.where(col(HousingProject.id).in_(affordable_projects(query.deposit_max)))
    if query.rent_max is not None:
        stmt = stmt.where(col(HousingProject.id).in_(rent_affordable_projects(query.rent_max)))

    result = await session.exec(stmt.order_by(col(HousingProject.id)).limit(query.limit))
    return await to_summaries(session, list(result.all()))


async def get_housing_id(session: AsyncSession, housing_id: int) -> HousingSummary | None:
    project = await session.get(HousingProject, housing_id)
    if project is None:
        return None
    summaries = await to_summaries(session, [project])
    return summaries[0]


def _trend_label(store_trend: list[NeighborhoodTrendPoint]) -> Literal["rising", "stable", "declining"] | None:
    """
    Newest year vs two years prior (a 3-year window), ±5% threshold. The
    window deliberately skips older baselines: the 2021 상가-건물 cut is
    visibly under-collected city-wide (~113k stores vs ~155k in 2022-24),
    so comparing against it would label nearly every 동 "rising".
    """
    if len(store_trend) < 2:
        return None
    baseline = store_trend[-3] if len(store_trend) >= 3 else store_trend[0]
    if baseline.count <= 0:
        return None
    change = (store_trend[-1].count - baseline.count) / baseline.count
    if change >= 0.05:
        return "rising"
    if change <= -0.05:
        return "declining"
    return "stable"


async def get_neighborhood_profile(session: AsyncSession, housing_id: int, radius_meters: float) -> NeighborhoodProfile | None:
    project = await session.get(HousingProject, housing_id)
    if project is None:
        return None
    if project.geom is None:
        return NeighborhoodProfile(radius_meters=radius_meters, poi_total=0, categories=[], zones=[])

    point = select(col(HousingProject.geom)).where(col(HousingProject.id) == housing_id).scalar_subquery()

    poi_count = func.count()
    category_rows = (
        await session.exec(
            select(col(CommercialPoi.category), poi_count)
            .where(func.ST_DWithin(col(CommercialPoi.geom), point, radius_meters))
            .group_by(col(CommercialPoi.category))
            .order_by(poi_count.desc())
        )
    ).all()

    buffer = func.ST_Buffer(point, radius_meters)
    zone_area = func.sum(func.ST_Area(func.ST_Intersection(col(CommercialZone.geom), buffer)))
    zone_rows = (
        await session.exec(
            select(col(CommercialZone.zone_type), zone_area)
            .where(
                col(CommercialZone.zone_type).is_not(None),
                func.ST_DWithin(col(CommercialZone.geom), point, radius_meters),
            )
            .group_by(col(CommercialZone.zone_type))
            .order_by(zone_area.desc())
        )
    ).all()

    circle_area = 3.141592653589793 * radius_meters * radius_meters
    zones = [
        NeighborhoodZone(zone_type=zone_type, share=min(float(area) / circle_area, 1.0))
        for zone_type, area in zone_rows
        if zone_type is not None and area is not None
    ]
    categories = [NeighborhoodCategory(category=category, count=count) for category, count in category_rows]

    # 법정동-level extras: youth share from the interpolated POP_STORE age
    # bands, and the yearly store-count trend for the containing 동.
    boundary = (
        await session.execute(  # ty:ignore[deprecated] -- Row tuple wanted, exec() would scalar-collapse
            sa_select(
                col(AdminBoundary.emd_code),
                col(AdminBoundary.emd_name),
                col(AdminBoundary.youth_share),
            )
            .where(func.ST_Intersects(col(AdminBoundary.geom), point))
            .limit(1)
        )
    ).first()

    emd_name: str | None = None
    youth_share: float | None = None
    store_trend: list[NeighborhoodTrendPoint] = []
    if boundary is not None:
        emd_code, emd_name, raw_share = boundary
        youth_share = float(raw_share) if raw_share is not None else None
        trend_rows = (
            await session.exec(
                select(col(DistrictStoreTrend.year), col(DistrictStoreTrend.store_count))
                .where(col(DistrictStoreTrend.emd_code) == emd_code)
                .order_by(col(DistrictStoreTrend.year))
            )
        ).all()
        store_trend = [NeighborhoodTrendPoint(year=year, count=count) for year, count in trend_rows]

    bus_stop_cells = (
        await session.exec(
            select(func.count(col(UseAreaCell.id))).where(
                col(UseAreaCell.bus_stop).is_(True),
                func.ST_DWithin(col(UseAreaCell.geom), point, radius_meters),
            )
        )
    ).one()

    return NeighborhoodProfile(
        radius_meters=radius_meters,
        poi_total=sum(c.count for c in categories),
        categories=categories,
        zones=zones,
        emd_name=emd_name,
        store_trend=store_trend,
        trend_label=_trend_label(store_trend),
        youth_share=youth_share,
        bus_stop_cells=int(bus_stop_cells or 0),
    )
