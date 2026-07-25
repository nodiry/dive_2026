from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import JSON
from sqlmodel import DateTime, Field, Relationship, String

from src.models import Base, utcnow


class AIMessageRole(StrEnum):
    USER = "user"
    MODEL = "model"


class AIMessage(Base, table=True):
    __tablename__ = "ai_message"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    chat_id: UUID = Field(foreign_key="ai_conversation.id", ondelete="CASCADE", index=True)
    role: AIMessageRole = Field(sa_type=String(32))
    content: str
    # Housing surfaced by this (model) reply — ids only, rehydrated to full
    # summaries on read so history restores its map widgets.
    housing_ids: list[int] | None = Field(default=None, sa_type=JSON)
    # Deterministic result metadata from the executed search tool. The
    # frontend restores alert actions from this instead of parsing AI prose.
    search_context: dict | None = Field(default=None, sa_type=JSON)
    sent_date: datetime = Field(default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False)

    chat: "AIConversation" = Relationship(back_populates="messages")


class AIConversation(Base, table=True):
    __tablename__ = "ai_conversation"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: int = Field(foreign_key="user.id", ondelete="CASCADE", index=True)
    title: str

    messages: list[AIMessage] = Relationship(back_populates="chat", cascade_delete=True)
