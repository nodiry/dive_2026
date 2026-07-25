import hashlib
import json

from src.ai.schemas import AlertCriteria

CRITERIA_VERSION = 1


def criteria_key(criteria: AlertCriteria) -> str:
    payload = json.dumps(
        criteria.model_dump(mode="json", exclude_none=True),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(f"v{CRITERIA_VERSION}:{payload}".encode()).hexdigest()
