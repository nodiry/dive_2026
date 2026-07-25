from datetime import datetime
from uuid import UUID

from src.ai.schemas import AlertCriteria
from src.models import ApiModel


class AlertCreateRequest(ApiModel):
    message_id: UUID


class HousingAlertPublic(ApiModel):
    id: int
    criteria: AlertCriteria
    criteria_key: str
    source_message_id: UUID | None
    created_at: datetime


class HousingAlertStats(ApiModel):
    active_alerts: int
    unique_users: int
    new_last_7_days: int
    top_district: str | None
    top_district_count: int
