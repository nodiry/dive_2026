from sqlmodel import desc, func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.poi.models import CommercialPoi
from src.poi.schemas import PoiCategorySummary


async def list_poi_categories(session: AsyncSession, limit: int = 40) -> list[PoiCategorySummary]:
    count = func.count()
    result = await session.exec(
        select(CommercialPoi.category_name, count).group_by(CommercialPoi.category_name).order_by(desc(count)).limit(limit)
    )
    return [PoiCategorySummary(category_name=name, count=n) for name, n in result.all() if name is not None]
