from fastapi import APIRouter

from src.database import SessionDep
from src.gis import service as gis_service
from src.gis.schemas import DistrictBoundary, DistrictDensity, DistrictSupply

router = APIRouter()


@router.get("/boundaries", response_model=list[DistrictBoundary])
async def get_district_boundaries(session: SessionDep) -> list[DistrictBoundary]:
    return await gis_service.list_boundaries(session)


@router.get("/density", response_model=list[DistrictDensity])
async def get_district_density(session: SessionDep) -> list[DistrictDensity]:
    return await gis_service.list_density(session)


@router.get("/supply", response_model=list[DistrictSupply])
async def get_district_supply(session: SessionDep) -> list[DistrictSupply]:
    return await gis_service.list_supply(session)
