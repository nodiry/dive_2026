from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from src.housing.schemas import HousingSummary
from src.models import ApiModel


class ChatMessage(ApiModel):
    role: Literal["user", "assistant"]
    text: str


class AiSearchRequest(ApiModel):
    message: str = Field(min_length=1, max_length=1000)
    # None starts a new conversation; the server owns history now (the
    # response returns the id to continue with).
    conversation_id: UUID | None = None


class AiSearchResponse(ApiModel):
    reply: str
    housing: list[HousingSummary]
    conversation_id: UUID


class ConversationSummary(ApiModel):
    id: UUID
    title: str
    created_at: datetime


class ConversationMessage(ChatMessage):
    housing: list[HousingSummary] = []


class ConversationDetail(ApiModel):
    id: UUID
    title: str
    messages: list[ConversationMessage]
