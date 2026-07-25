from src.models import ApiModel


class DistrictDensity(ApiModel):
    emd_code: str
    emd_name: str
    population: int
    area_km2: float
    density_per_km2: float
    centroid_lat: float
    centroid_lng: float
    rings: list[list[list[float]]]


class DistrictBoundary(ApiModel):
    sgg_code: str
    rings: list[list[list[float]]]


class DistrictAmenities(ApiModel):
    """The 5 franchise counts carried by every 선도소프트 POP_STORE cell."""

    coffee: int
    convenience: int
    korean_food: int
    pharmacy: int
    salon: int


class DistrictSupply(ApiModel):
    """
    Public-housing supply measured against where people actually live, per
    법정동: BMC stock joined to the 선도소프트 population/industry grid.
    """

    emd_code: str
    emd_name: str
    population: int
    youth_share: float | None
    area_km2: float
    density_per_km2: float
    projects: int
    units: int
    units_per_thousand: float
    amenities: DistrictAmenities
    amenity_total: int
    amenities_per_thousand: float
    # Residents who would be housed if this 동 matched the citywide rate.
    underserved_residents: int
    # 0-100, scaled against the worst 동: where BMC should look next.
    supply_gap: float
