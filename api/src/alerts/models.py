from uuid import UUID

from sqlalchemy import JSON, CheckConstraint, Index, String, text
from sqlmodel import Field

from src.models import Base


class HousingAlertSubscription(Base, table=True):
    __tablename__ = "housing_alert_subscription"
    __table_args__ = (
        CheckConstraint("status IN ('active', 'cancelled')", name="status"),
        Index(
            "housing_alert_subscription_active_key",
            "user_id",
            "criteria_hash",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
        Index("housing_alert_subscription_created_at_idx", "created_at"),
    )

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", ondelete="CASCADE", index=True)
    district: str | None = Field(default=None, index=True)
    housing_type: str | None = Field(default=None, index=True)
    deposit_max: float | None = None
    built_after: int | None = None
    room_count: float | None = None
    criteria_json: dict = Field(sa_type=JSON)
    criteria_hash: str = Field(sa_type=String(64))
    source_conversation_id: UUID | None = Field(
        default=None,
        foreign_key="ai_conversation.id",
        ondelete="SET NULL",
        index=True,
    )
    source_message_id: UUID | None = Field(
        default=None,
        foreign_key="ai_message.id",
        ondelete="SET NULL",
        index=True,
    )
    status: str = Field(default="active", sa_type=String(32), index=True)
