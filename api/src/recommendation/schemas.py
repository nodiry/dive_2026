from pydantic import Field

from src.housing.schemas import HousingSummary
from src.models import ApiModel


class LifestylePreference(ApiModel):
    category_name: str
    weight: float = Field(ge=0, le=1)


class LifestyleRecommendationRequest(ApiModel):
    preferences: list[LifestylePreference] = Field(min_length=1)
    deposit_max: float | None = None
    district: str | None = None
    radius_meters: float = 500


class MatchedPoiPoint(ApiModel):
    name: str
    lat: float
    lng: float
    distance_meters: float


class MatchedPoi(ApiModel):
    category_name: str
    count: int
    nearest_meters: float | None
    pois: list[MatchedPoiPoint]


class LifestyleRecommendationResult(ApiModel):
    housing: HousingSummary
    score: float
    matches: list[MatchedPoi]
