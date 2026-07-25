from datetime import datetime
from uuid import UUID

from pydantic import Field

from src.housing.schemas import HousingSummary
from src.models import ApiModel

# The generated deck must speak the vocabulary the client already renders and
# the recommender already scores, so both are closed sets rather than free text.
TRAIT_KEYS = [
    "affordability",
    "cafe",
    "commercial",
    "commute",
    "convenience",
    "destination",
    "dining",
    "exercise",
    "food",
    "fun",
    "green",
    "home",
    "housing",
    "parking",
    "pharmacy",
    "residential",
    "rest",
    "space",
    "walking",
    "work",
]
ICON_KEYS = [
    "balance",
    "brunch",
    "car",
    "city",
    "clock",
    "cluster",
    "coffee",
    "coin",
    "compass",
    "dining",
    "dumbbell",
    "expand",
    "home",
    "leaf",
    "longRoad",
    "moonTree",
    "park",
    "pharmacy",
    "quiet",
    "shopAway",
    "smallHome",
    "sofa",
    "sparkleHome",
    "train",
    "transit",
    "wallet",
    "window",
]


class LocalizedText(ApiModel):
    ko: str
    en: str


class GameOption(ApiModel):
    id: str
    title: LocalizedText
    caption: LocalizedText
    meaning: LocalizedText
    icon: str
    chips: list[LocalizedText] = Field(default_factory=list)
    traits: dict[str, float] = Field(default_factory=dict)


class GameQuestion(ApiModel):
    id: str
    kicker: LocalizedText
    title: LocalizedText
    description: LocalizedText
    options: list[GameOption]


class GameStats(ApiModel):
    fun: float
    work: float
    rest: float


class GameResult(ApiModel):
    stats: GameStats
    top_traits: list[str]
    categories: list[str]
    summary: LocalizedText
    housing: list[HousingSummary]


class GameSessionOut(ApiModel):
    id: UUID
    theme: str
    questions: list[GameQuestion]
    answers: dict[str, str] | None
    result: GameResult | None
    created_at: datetime


class GameSummary(ApiModel):
    id: UUID
    theme: str
    completed: bool
    created_at: datetime


class GameCreateRequest(ApiModel):
    theme: str | None = None
    conversation_id: UUID | None = None


class GameAnswerRequest(ApiModel):
    answers: dict[str, str]
