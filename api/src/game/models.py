from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import JSON
from sqlmodel import DateTime, Field

from src.models import Base


class GameSession(Base, table=True):
    """
    One generated 하루 deck and the run through it.

    The deck itself is stored as JSON rather than normalized into tables: it is
    authored per session by the model, never queried by field, and only ever
    read back whole to replay or resume a run.
    """

    __tablename__ = "game_session"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: int = Field(foreign_key="user.id", ondelete="CASCADE", index=True)
    # The chat that spawned it, when it came from /game rather than the button.
    conversation_id: UUID | None = Field(default=None, foreign_key="ai_conversation.id", ondelete="SET NULL", index=True)
    theme: str
    deck: list[Any] = Field(sa_type=JSON)
    answers: dict[str, str] | None = Field(default=None, sa_type=JSON)
    result: dict[str, Any] | None = Field(default=None, sa_type=JSON)
    completed_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
