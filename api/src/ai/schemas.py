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
    # A data URL ("data:image/png;base64,...") for a document the user wants
    # read — a 모집공고, a pay slip, a resume. Passed inline to the model and
    # deliberately never stored: these carry personal data and the extracted
    # text is the only part worth keeping.
    image: str | None = Field(default=None, max_length=8_000_000)


class AiSearchResponse(ApiModel):
    reply: str
    housing: list[HousingSummary]
    conversation_id: UUID
    # Set when the turn produced a 하루 deck to play, from /game or from the
    # model deciding a game fits the request.
    game_id: UUID | None = None


class ConversationSummary(ApiModel):
    id: UUID
    title: str
    created_at: datetime


class ConversationMessage(ChatMessage):
    housing: list[HousingSummary] = []
    game_id: UUID | None = None


class ConversationDetail(ApiModel):
    id: UUID
    title: str
    messages: list[ConversationMessage]
