from fastapi import APIRouter

from src.housing.router import router as housing_router
from src.poi.router import router as poi_router
from src.recommendation.router import router as recommendation_router

api_router = APIRouter(prefix="/api")

api_router.include_router(housing_router, prefix="/housing", tags=["HOUSING"])
api_router.include_router(poi_router, prefix="/poi", tags=["POI"])
api_router.include_router(recommendation_router, prefix="/recommendations", tags=["RECOMMENDATION"])
