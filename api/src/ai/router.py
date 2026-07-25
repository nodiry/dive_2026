from fastapi import APIRouter, HTTPException

from src.ai import service as ai_service
from src.ai.schemas import AiSearchRequest, AiSearchResponse
from src.database import SessionDep

router = APIRouter()


@router.post("/search", response_model=AiSearchResponse)
async def post_ai_search(body: AiSearchRequest, session: SessionDep) -> AiSearchResponse:
    try:
        reply, housing = await ai_service.generate_reply(session, body.history, body.message)
    except ai_service.AiSearchError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return AiSearchResponse(reply=reply, housing=housing)
