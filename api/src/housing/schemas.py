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

    @classmethod
    def from_project(cls, p: HousingProject, lat, lng, deposit, rent) -> "HousingSummary":
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
        )


class HousingSearchQuery(ApiModel):
    deposit_max: float | None = None
    built_after: int | None = None
    room_count: float | None = None
    district: str | None = None
    type: HousingType | None = None
