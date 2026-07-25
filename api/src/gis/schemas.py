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
