from fastapi import APIRouter, HTTPException

from src.database import SessionDep
from src.housing import service as housing_service
from src.housing.schemas import HousingSearchQuery, HousingSummary, HousingType

router = APIRouter()


@router.get("", response_model=list[HousingSummary])
async def get_housing_list(
    session: SessionDep,
    depositMax: float | None = None,
    builtAfter: int | None = None,
    roomCount: float | None = None,
    district: str | None = None,
    type: HousingType | None = None,
) -> list[HousingSummary]:
    query = HousingSearchQuery(
        deposit_max=depositMax,
        built_after=builtAfter,
        room_count=roomCount,
        district=district,
        type=type,
    )
    return await housing_service.search_housing(session, query)


@router.get("/{housing_id}", response_model=HousingSummary)
async def get_housing_detail(housing_id: int, session: SessionDep) -> HousingSummary:
    housing = await housing_service.get_housing_id(session, housing_id)
    if not housing:
        raise HTTPException(status_code=404, detail="not found")
    return housing
