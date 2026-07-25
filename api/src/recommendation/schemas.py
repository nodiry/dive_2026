from __future__ import annotations

from typing import Literal

from pydantic import Field

from src.housing.schemas import HousingSummary, HousingType
from src.models import ApiModel


class LifestylePreference(ApiModel):
    category_name: str
    weight: float = Field(ge=0, le=1)


class LifeStatWeights(ApiModel):
    fun: float = Field(ge=0, le=100)
    work: float = Field(ge=0, le=100)
    rest: float = Field(ge=0, le=100)


class WeeklyRoutineInput(ApiModel):
    commute: float = Field(ge=0, le=7)
    focus: float = Field(ge=0, le=7)
    cafe: float = Field(ge=0, le=7)
    exercise: float = Field(ge=0, le=7)
    dining: float = Field(ge=0, le=7)
    culture: float = Field(ge=0, le=7)
    walking: float = Field(ge=0, le=7)
    home_rest: float = Field(ge=0, le=7)


class LifestyleRecommendationRequest(ApiModel):
    preferences: list[LifestylePreference] = Field(min_length=1)
    deposit_max: float | None = None
    rent_max: float | None = None
    min_area_m2: float | None = None
    min_room_count: float | None = None
    elevator_required: bool | None = None
    parking_required: bool | None = None
    district: str | None = None
    type: HousingType | None = None
    life_stats: LifeStatWeights | None = None
    routine: WeeklyRoutineInput | None = None
    destination_lat: float | None = Field(default=None, ge=-90, le=90)
    destination_lng: float | None = Field(default=None, ge=-180, le=180)
    destination_frequency: float | None = Field(default=None, ge=0, le=7)
    radius_meters: float = Field(default=500, gt=0)


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


class LifestyleMatchBreakdown(ApiModel):
    lifestyle: float
    routine: float
    housing: float
    affordability: float


class LifeAxisScores(ApiModel):
    fun: float
    work: float
    rest: float


class NeighborhoodEvidence(ApiModel):
    residential_ratio: float | None
    commercial_ratio: float | None
    green_ratio: float | None
    source: Literal["zoning", "unavailable"]
    # Cells flagged BSST_YN within the radius (선도소프트 상권-주거 data).
    bus_stop_cells: int = 0


RoutineActivity = Literal["commute", "focus", "cafe", "exercise", "dining", "culture", "walking", "homeRest"]
RoutineEvidence = Literal["destination", "nearbyPoi", "zoning", "proxy", "unavailable"]


class RoutineFitItem(ApiModel):
    activity: RoutineActivity
    requested: float
    score: float
    evidence: RoutineEvidence


class LifestyleRecommendationResult(ApiModel):
    housing: HousingSummary
    score: float
    match_rate: float
    breakdown: LifestyleMatchBreakdown
    life_axes: LifeAxisScores
    neighborhood: NeighborhoodEvidence
    destination_distance_meters: float | None
    routine_details: list[RoutineFitItem]
    matches: list[MatchedPoi]
