from uuid import UUID

from fastapi import APIRouter, HTTPException

from src.auth.dependencies import CurrentUser
from src.database import SessionDep
from src.game import service as game_service
from src.game.schemas import GameAnswerRequest, GameCreateRequest, GameSessionOut, GameSummary

router = APIRouter()


@router.post("", response_model=GameSessionOut)
async def post_game(body: GameCreateRequest, current_user: CurrentUser, session: SessionDep) -> GameSessionOut:
    assert current_user.id is not None
    try:
        return await game_service.create_game(session, current_user.id, body.theme, body.conversation_id)
    except Exception as error:
        raise HTTPException(status_code=502, detail="game generation failed") from error


@router.get("", response_model=list[GameSummary])
async def get_games(current_user: CurrentUser, session: SessionDep) -> list[GameSummary]:
    assert current_user.id is not None
    return await game_service.list_games(session, current_user.id)


@router.get("/{game_id}", response_model=GameSessionOut)
async def get_game(game_id: UUID, current_user: CurrentUser, session: SessionDep) -> GameSessionOut:
    assert current_user.id is not None
    game = await game_service.get_game(session, current_user.id, game_id)
    if game is None:
        raise HTTPException(status_code=404, detail="not found")
    return game


@router.patch("/{game_id}/answers", response_model=GameSessionOut)
async def patch_answers(
    game_id: UUID,
    body: GameAnswerRequest,
    current_user: CurrentUser,
    session: SessionDep,
) -> GameSessionOut:
    assert current_user.id is not None
    game = await game_service.save_progress(session, current_user.id, game_id, body.answers)
    if game is None:
        raise HTTPException(status_code=404, detail="not found")
    return game


@router.post("/{game_id}/answers", response_model=GameSessionOut)
async def post_answers(
    game_id: UUID,
    body: GameAnswerRequest,
    current_user: CurrentUser,
    session: SessionDep,
) -> GameSessionOut:
    assert current_user.id is not None
    game = await game_service.answer_game(session, current_user.id, game_id, body.answers)
    if game is None:
        raise HTTPException(status_code=404, detail="not found")
    return game
