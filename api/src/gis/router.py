from fastapi import APIRouter

from src.database import SessionDep
from src.gis import service as gis_service
from src.gis.schemas import DistrictDensity

router = APIRouter()


@router.get("/density", response_model=list[DistrictDensity])
async def get_district_density(session: SessionDep) -> list[DistrictDensity]:
    return await gis_service.list_density(session)
