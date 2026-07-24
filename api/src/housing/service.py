from datetime import date

from geoalchemy2 import Geometry
from sqlmodel import cast, col, func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.gis.models import CommercialZone
from src.housing.models import HousingPrice, HousingProject, HousingUnit
from src.housing.schemas import (
    HousingSearchQuery,
    HousingSummary,
    NeighborhoodCategory,
    NeighborhoodProfile,
    NeighborhoodZone,
)
from src.poi.models import CommercialPoi


def affordable_projects(deposit_max: float):
    return (
        select(col(HousingPrice.project_id))
        .group_by(col(HousingPrice.project_id))
        .having(func.min(col(HousingPrice.deposit)) <= deposit_max)
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
        summaries.append(HousingSummary.from_project(p, lat, lng, deposit, rent))
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
                HousingUnit.room_count == query.room_count,
            )
            .exists()
        )
    if query.deposit_max is not None:
        stmt = stmt.where(col(HousingProject.id).in_(affordable_projects(query.deposit_max)))

    result = await session.exec(stmt.order_by(col(HousingProject.id)).limit(100))
    return await to_summaries(session, list(result.all()))


async def get_housing_id(session: AsyncSession, housing_id: int) -> HousingSummary | None:
    project = await session.get(HousingProject, housing_id)
    if project is None:
        return None
    summaries = await to_summaries(session, [project])
    return summaries[0]


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

    return NeighborhoodProfile(
        radius_meters=radius_meters,
        poi_total=sum(c.count for c in categories),
        categories=categories,
        zones=zones,
    )
