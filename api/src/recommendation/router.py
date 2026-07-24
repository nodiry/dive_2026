from fastapi import APIRouter

from src.database import SessionDep
from src.recommendation import service as recommendation_service
from src.recommendation.schemas import (
    LifestyleRecommendationRequest,
    LifestyleRecommendationResult,
)

router = APIRouter()


@router.post("/lifestyle", response_model=list[LifestyleRecommendationResult])
async def post_lifestyle_recommendation(
    body: LifestyleRecommendationRequest, session: SessionDep
) -> list[LifestyleRecommendationResult]:
    return await recommendation_service.recommend_lifestyle(session, body)
