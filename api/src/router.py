from fastapi import APIRouter

from src.ai.router import router as ai_router
from src.auth.router import router as auth_router
from src.game.router import router as game_router
from src.gis.router import router as gis_router
from src.housing.router import router as housing_router
from src.poi.router import router as poi_router
from src.recommendation.router import router as recommendation_router
from src.saved.router import router as saved_router

api_router = APIRouter(prefix="/api")

api_router.include_router(housing_router, prefix="/housing", tags=["HOUSING"])
api_router.include_router(poi_router, prefix="/poi", tags=["POI"])
api_router.include_router(gis_router, prefix="/districts", tags=["DISTRICTS"])
api_router.include_router(recommendation_router, prefix="/recommendations", tags=["RECOMMENDATION"])
api_router.include_router(auth_router, prefix="/auth", tags=["AUTH"])
api_router.include_router(saved_router, prefix="/saved", tags=["SAVED"])
api_router.include_router(ai_router, prefix="/ai", tags=["AI"])
api_router.include_router(game_router, prefix="/games", tags=["GAME"])
