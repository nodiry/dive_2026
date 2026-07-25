from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from src.housing.schemas import HousingSummary, HousingType
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


NoMatchReason = Literal[
    "district_inventory_empty",
    "criteria_no_match",
    "unsupported_region",
    "data_unavailable",
]


class AlertCriteria(ApiModel):
    district: str | None = None
    deposit_max: float | None = None
    built_after: int | None = None
    room_count: float | None = None
    type: HousingType | None = None


class NoMatchContext(ApiModel):
    reason: NoMatchReason
    criteria: AlertCriteria
    district_inventory_count: int | None = None
    matching_count: Literal[0] = 0
    criteria_key: str | None = None


class AiAction(ApiModel):
    type: Literal["subscribe_housing_alert", "relax_filters"]


def actions_for_no_match(context: NoMatchContext | None) -> list[AiAction]:
    if context is None or context.reason in {"unsupported_region", "data_unavailable"}:
        return []
    relax = AiAction(type="relax_filters")
    if context.criteria_key is None:
        return [relax]
    subscribe = AiAction(type="subscribe_housing_alert")
    if context.reason == "district_inventory_empty":
        return [subscribe]
    return [relax, subscribe]


class AiSearchResponse(ApiModel):
    reply: str
    housing: list[HousingSummary]
    conversation_id: UUID
    message_id: UUID
    # Set when the turn produced a 하루 deck to play, from /game or from the
    # model deciding a game fits the request.
    game_id: UUID | None = None
    no_match: NoMatchContext | None = None
    actions: list[AiAction] = Field(default_factory=list)


class ConversationSummary(ApiModel):
    id: UUID
    title: str
    created_at: datetime


class ConversationMessage(ChatMessage):
    id: UUID
    housing: list[HousingSummary] = Field(default_factory=list)
    game_id: UUID | None = None
    no_match: NoMatchContext | None = None
    actions: list[AiAction] = Field(default_factory=list)


class ConversationDetail(ApiModel):
    id: UUID
    title: str
    messages: list[ConversationMessage]
