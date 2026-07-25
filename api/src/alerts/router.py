from fastapi import APIRouter, HTTPException

from src.alerts import service as alert_service
from src.alerts.schemas import AlertCreateRequest, HousingAlertPublic, HousingAlertStats
from src.auth.dependencies import CurrentUser
from src.database import SessionDep

router = APIRouter()


@router.get("/stats", response_model=HousingAlertStats)
async def get_alert_stats(session: SessionDep) -> HousingAlertStats:
    return await alert_service.aggregate_stats(session)


@router.get("/me", response_model=list[HousingAlertPublic])
async def get_my_alerts(current_user: CurrentUser, session: SessionDep) -> list[HousingAlertPublic]:
    assert current_user.id is not None
    return await alert_service.list_active(session, current_user.id)


@router.post("", response_model=HousingAlertPublic)
async def post_alert(
    body: AlertCreateRequest,
    current_user: CurrentUser,
    session: SessionDep,
) -> HousingAlertPublic:
    assert current_user.id is not None
    try:
        return await alert_service.subscribe_from_message(session, current_user.id, body.message_id)
    except alert_service.AlertSourceNotFound:
        raise HTTPException(status_code=404, detail="alert source not found") from None


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(alert_id: int, current_user: CurrentUser, session: SessionDep) -> None:
    assert current_user.id is not None
    await alert_service.cancel(session, current_user.id, alert_id)
