"""
Pydantic mirror of packages/shared/src/schemas.ts. Field names are Python
snake_case internally, camelCase over the wire (alias_generator) — this keeps
the exact same JSON contract the frontend's Zod schemas already validate
against, even though the two are no longer literally the same source file
now that the backend is Python.

If you change a field here, change packages/shared/src/schemas.ts to match,
and vice versa — there is no automated check that they stay in sync.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

HousingType = Literal["purchased", "redevelopment", "integrated", "happy"]

# 상권업종대분류명 — see docs/DATA_MODEL.md Part 2 for why this taxonomy, not the OT deck's.
PoiCategory = Literal[
    "retail",
    "real_estate",
    "food",
    "facility_leasing",
    "healthcare",
    "education",
    "lodging",
    "arts_sports",
    "repair_personal",
    "science_tech",
]


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class HousingSummary(ApiModel):
    id: int
    type: HousingType
    project_name: str
    address: str
    lat: float | None
    lng: float | None
    built_date: str | None
    total_units: float | None
    min_deposit: float | None
    min_rent: float | None


class HousingSearchQuery(ApiModel):
    deposit_max: float | None = None
    built_after: int | None = None
    room_count: float | None = None
    district: str | None = None
    type: HousingType | None = None


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


class PoiCategorySummary(ApiModel):
    category_name: str
    count: int
