from datetime import date

from geoalchemy2 import Geometry
from sqlmodel import cast, col, func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.housing.models import HousingPrice, HousingProject, HousingUnit
from src.housing.schemas import HousingSearchQuery, HousingSummary


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
