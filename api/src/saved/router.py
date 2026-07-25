from fastapi import APIRouter, HTTPException

from src.auth.dependencies import CurrentUser
from src.database import SessionDep
from src.housing.schemas import HousingSummary
from src.saved import service as saved_service

router = APIRouter()


@router.get("", response_model=list[HousingSummary])
async def get_saved(current_user: CurrentUser, session: SessionDep) -> list[HousingSummary]:
    assert current_user.id is not None
    return await saved_service.list_saved(session, current_user.id)


@router.post("/{housing_id}", status_code=204)
async def post_save(housing_id: int, current_user: CurrentUser, session: SessionDep) -> None:
    assert current_user.id is not None
    ok = await saved_service.save_housing(session, current_user.id, housing_id)
    if not ok:
        raise HTTPException(status_code=404, detail="housing not found")


@router.delete("/{housing_id}", status_code=204)
async def delete_save(housing_id: int, current_user: CurrentUser, session: SessionDep) -> None:
    assert current_user.id is not None
    await saved_service.unsave_housing(session, current_user.id, housing_id)
