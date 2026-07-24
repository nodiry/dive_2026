"""
Kakao Local API address search (server-side geocoding). Needs
KAKAO_REST_API_KEY (not KAKAO_MAP_KEY — that's the browser JS-SDK key,
a different key from the same Kakao app).
"""

from dataclasses import dataclass

import httpx
from src.config import app_config

KAKAO_LOCAL_URL = "https://dapi.kakao.com/v2/local/search/address.json"


@dataclass
class GeocodeResult:
    lat: float
    lng: float


async def geocode_address(address: str) -> GeocodeResult | None:
    key = app_config.KAKAO_REST_API_KEY
    if not key:
        raise RuntimeError(
            "KAKAO_REST_API_KEY not set. Get one at https://developers.kakao.com/console/app (REST API key, not the JS key)."
        )

    async with httpx.AsyncClient() as client:
        res = await client.get(
            KAKAO_LOCAL_URL,
            params={"query": address},
            headers={"Authorization": f"KakaoAK {key}"},
        )
    if res.status_code != 200:
        raise RuntimeError(f"Kakao geocode request failed ({res.status_code}): {res.text}")

    documents = res.json().get("documents", [])
    if not documents:
        return None
    doc = documents[0]
    return GeocodeResult(lat=float(doc["y"]), lng=float(doc["x"]))
