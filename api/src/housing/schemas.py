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


# Full-city stock is a few hundred projects, so the default clears it; the cap
# only exists so a bad caller can't ask us to serialize the whole table.
DEFAULT_HOUSING_LIMIT = 2000
MAX_HOUSING_LIMIT = 5000


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
    bus_stop_nearby: bool | None = None
    limit: int = DEFAULT_HOUSING_LIMIT


class NeighborhoodCategory(ApiModel):
    category: str
    count: int


class NeighborhoodZone(ApiModel):
    zone_type: str
    share: float


class NeighborhoodTrendPoint(ApiModel):
    year: int
    count: int


class NeighborhoodProfile(ApiModel):
    radius_meters: float
    poi_total: int
    categories: list[NeighborhoodCategory]
    zones: list[NeighborhoodZone]
    # 법정동-level extras from the 선도소프트 data; null/empty when the
    # project isn't geocoded or the trend/population seeds haven't run
    emd_name: str | None = None
    store_trend: list[NeighborhoodTrendPoint] = []
    trend_label: Literal["rising", "stable", "declining"] | None = None
    youth_share: float | None = None
    # Cells inside the radius flagged BSST_YN in the 선도소프트 상권-주거 data;
    # the only public-transit signal in any of the provided datasets.
    bus_stop_cells: int = 0
