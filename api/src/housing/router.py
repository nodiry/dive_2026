from fastapi import APIRouter, HTTPException

from src.database import SessionDep
from src.housing import service as housing_service
from src.housing.schemas import (
    HousingSearchQuery,
    HousingSummary,
    HousingType,
    NeighborhoodProfile,
)

router = APIRouter()


@router.get("", response_model=list[HousingSummary])
async def get_housing_list(
    session: SessionDep,
    depositMax: float | None = None,
    rentMax: float | None = None,
    builtAfter: int | None = None,
    roomCount: float | None = None,
    minAreaM2: float | None = None,
    elevatorRequired: bool | None = None,
    parkingRequired: bool | None = None,
    district: str | None = None,
    type: HousingType | None = None,
) -> list[HousingSummary]:
    query = HousingSearchQuery(
        deposit_max=depositMax,
        rent_max=rentMax,
        built_after=builtAfter,
        room_count=roomCount,
        min_area_m2=minAreaM2,
        elevator_required=elevatorRequired,
        parking_required=parkingRequired,
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


@router.get("/{housing_id}/neighborhood", response_model=NeighborhoodProfile)
async def get_housing_neighborhood(housing_id: int, session: SessionDep, radiusMeters: float = 500) -> NeighborhoodProfile:
    profile = await housing_service.get_neighborhood_profile(session, housing_id, min(max(radiusMeters, 100), 2000))
    if profile is None:
        raise HTTPException(status_code=404, detail="not found")
    return profile
