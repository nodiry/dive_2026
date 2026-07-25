from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.housing.models import HousingProject
from src.housing.schemas import HousingSummary
from src.housing.service import to_summaries
from src.saved.models import SavedHousing


async def list_saved(session: AsyncSession, user_id: int) -> list[HousingSummary]:
    result = await session.exec(
        select(HousingProject)
        .join(SavedHousing, col(SavedHousing.housing_project_id) == col(HousingProject.id))
        .where(SavedHousing.user_id == user_id)
        .order_by(col(SavedHousing.id).desc())
    )
    return await to_summaries(session, list(result.all()))


async def save_housing(session: AsyncSession, user_id: int, housing_id: int) -> bool:
    """Returns False if housing_id doesn't exist; idempotent otherwise (saving an already-saved project is a no-op)."""
    project = await session.get(HousingProject, housing_id)
    if project is None:
        return False

    result = await session.exec(
        select(SavedHousing).where(SavedHousing.user_id == user_id, SavedHousing.housing_project_id == housing_id)
    )
    if result.first() is None:
        session.add(SavedHousing(user_id=user_id, housing_project_id=housing_id))
        await session.commit()
    return True


async def unsave_housing(session: AsyncSession, user_id: int, housing_id: int) -> None:
    result = await session.exec(
        select(SavedHousing).where(SavedHousing.user_id == user_id, SavedHousing.housing_project_id == housing_id)
    )
    row = result.first()
    if row is not None:
        await session.delete(row)
        await session.commit()
