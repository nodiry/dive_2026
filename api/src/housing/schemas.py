from typing import Literal, cast

from src.housing.models import HousingProject
from src.models import ApiModel

HousingType = Literal["purchased", "redevelopment", "integrated", "happy"]


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
    min_area_m2: float | None
    max_area_m2: float | None
    min_rooms: float | None
    max_rooms: float | None
    has_elevator: bool | None
    parking_spots: float | None

    @classmethod
    def from_project(
        cls,
        p: HousingProject,
        lat,
        lng,
        deposit,
        rent,
        min_area,
        max_area,
        min_rooms,
        max_rooms,
        has_elevator,
        parking_spots,
    ) -> "HousingSummary":
        assert p.id is not None
        assert p.type is not None

        return cls(
            id=p.id,
            type=cast(HousingType, p.type),
            project_name=p.project_name,
            address=p.address,
            lat=lat,
            lng=lng,
            built_date=p.built_date.isoformat() if p.built_date else None,
            total_units=p.total_units,
            min_deposit=deposit,
            min_rent=rent,
            min_area_m2=min_area,
            max_area_m2=max_area,
            min_rooms=min_rooms,
            max_rooms=max_rooms,
            has_elevator=has_elevator,
            parking_spots=parking_spots,
        )


class HousingSearchQuery(ApiModel):
    deposit_max: float | None = None
    rent_max: float | None = None
    built_after: int | None = None
    room_count: float | None = None
    min_area_m2: float | None = None
    elevator_required: bool | None = None
    parking_required: bool | None = None
    district: str | None = None
    type: HousingType | None = None


class NeighborhoodCategory(ApiModel):
    category: str
    count: int


class NeighborhoodZone(ApiModel):
    zone_type: str
    share: float


class NeighborhoodProfile(ApiModel):
    radius_meters: float
    poi_total: int
    categories: list[NeighborhoodCategory]
    zones: list[NeighborhoodZone]
