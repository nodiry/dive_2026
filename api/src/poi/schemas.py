from typing import Literal

from src.models import ApiModel

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


class PoiCategorySummary(ApiModel):
    category_name: str
    count: int
