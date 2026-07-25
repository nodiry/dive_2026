from typing import Literal

from pydantic import Field

from src.housing.schemas import HousingSummary
from src.models import ApiModel


class ChatMessage(ApiModel):
    role: Literal["user", "assistant"]
    text: str


class AiSearchRequest(ApiModel):
    message: str = Field(min_length=1, max_length=1000)
    # The caller (frontend) owns conversation state and replays it each
    # turn — the API itself stays stateless, same as everything else here.
    history: list[ChatMessage] = Field(default_factory=list, max_length=40)


class AiSearchResponse(ApiModel):
    reply: str
    housing: list[HousingSummary]
