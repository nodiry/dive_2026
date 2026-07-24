from fastapi import APIRouter

from src.database import SessionDep
from src.poi import service as poi_service
from src.poi.schemas import PoiCategorySummary

router = APIRouter()


@router.get("/categories", response_model=list[PoiCategorySummary])
async def get_poi_categories(session: SessionDep) -> list[PoiCategorySummary]:
    return await poi_service.list_poi_categories(session)
