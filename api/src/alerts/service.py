from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.sql import func
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.ai.models import AIConversation, AIMessage, AIMessageRole
from src.ai.schemas import AlertCriteria, NoMatchContext, actions_for_no_match
from src.alerts.models import HousingAlertSubscription
from src.alerts.schemas import HousingAlertPublic, HousingAlertStats


class AlertSourceNotFound(Exception):
    pass


def _to_public(row: HousingAlertSubscription) -> HousingAlertPublic:
    assert row.id is not None
    return HousingAlertPublic(
        id=row.id,
        criteria=AlertCriteria.model_validate(row.criteria_json),
        criteria_key=row.criteria_hash,
        source_message_id=row.source_message_id,
        created_at=row.created_at,
    )


async def _active_by_key(
    session: AsyncSession, user_id: int, criteria_hash: str
) -> HousingAlertSubscription | None:
    result = await session.exec(
        select(HousingAlertSubscription).where(
            HousingAlertSubscription.user_id == user_id,
            HousingAlertSubscription.criteria_hash == criteria_hash,
            HousingAlertSubscription.status == "active",
        )
    )
    return result.first()


async def subscribe_from_message(
    session: AsyncSession, user_id: int, message_id: UUID
) -> HousingAlertPublic:
    message = await session.get(AIMessage, message_id)
    if message is None or message.role != AIMessageRole.MODEL or not message.search_context:
        raise AlertSourceNotFound

    conversation = await session.get(AIConversation, message.chat_id)
    if conversation is None or conversation.user_id != user_id:
        raise AlertSourceNotFound

    context = NoMatchContext.model_validate(message.search_context)
    if (
        context.criteria_key is None
        or not any(action.type == "subscribe_housing_alert" for action in actions_for_no_match(context))
    ):
        raise AlertSourceNotFound

    existing = await _active_by_key(session, user_id, context.criteria_key)
    if existing is not None:
        return _to_public(existing)

    criteria = context.criteria
    row = HousingAlertSubscription(
        user_id=user_id,
        district=criteria.district,
        housing_type=criteria.type,
        deposit_max=criteria.deposit_max,
        built_after=criteria.built_after,
        room_count=criteria.room_count,
        criteria_json=criteria.model_dump(mode="json", exclude_none=True),
        criteria_hash=context.criteria_key,
        source_conversation_id=conversation.id,
        source_message_id=message.id,
    )
    session.add(row)
    try:
        await session.commit()
        await session.refresh(row)
    except IntegrityError:
        await session.rollback()
        existing = await _active_by_key(session, user_id, context.criteria_key)
        if existing is None:
            raise
        row = existing
    return _to_public(row)


async def list_active(session: AsyncSession, user_id: int) -> list[HousingAlertPublic]:
    result = await session.exec(
        select(HousingAlertSubscription)
        .where(
            HousingAlertSubscription.user_id == user_id,
            HousingAlertSubscription.status == "active",
        )
        .order_by(col(HousingAlertSubscription.created_at).desc())
    )
    return [_to_public(row) for row in result.all()]


async def cancel(session: AsyncSession, user_id: int, alert_id: int) -> None:
    result = await session.exec(
        select(HousingAlertSubscription).where(
            HousingAlertSubscription.id == alert_id,
            HousingAlertSubscription.user_id == user_id,
            HousingAlertSubscription.status == "active",
        )
    )
    row = result.first()
    if row is None:
        return
    row.status = "cancelled"
    row.updated_at = datetime.now(UTC)
    session.add(row)
    await session.commit()


async def aggregate_stats(session: AsyncSession) -> HousingAlertStats:
    active = HousingAlertSubscription.status == "active"
    active_alerts = (
        await session.exec(
            select(func.count()).select_from(HousingAlertSubscription).where(active)
        )
    ).one()
    unique_users = (
        await session.exec(
            select(func.count(func.distinct(HousingAlertSubscription.user_id)))
            .select_from(HousingAlertSubscription)
            .where(active)
        )
    ).one()
    new_last_7_days = (
        await session.exec(
            select(func.count())
            .select_from(HousingAlertSubscription)
            .where(
                active,
                col(HousingAlertSubscription.created_at) >= datetime.now(UTC) - timedelta(days=7),
            )
        )
    ).one()
    top_row = (
        await session.exec(
            select(HousingAlertSubscription.district, func.count().label("alert_count"))
            .where(active, col(HousingAlertSubscription.district).is_not(None))
            .group_by(HousingAlertSubscription.district)
            .order_by(func.count().desc(), col(HousingAlertSubscription.district))
            .limit(1)
        )
    ).first()
    return HousingAlertStats(
        active_alerts=active_alerts,
        unique_users=unique_users,
        new_last_7_days=new_last_7_days,
        top_district=top_row[0] if top_row else None,
        top_district_count=top_row[1] if top_row else 0,
    )
