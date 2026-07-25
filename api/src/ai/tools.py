import copy
from typing import Any

from google.genai import types
from sqlmodel.ext.asyncio.session import AsyncSession

from src.housing import service as housing_service
from src.housing.schemas import HousingSearchQuery, HousingSummary
from src.poi import service as poi_service
from src.recommendation import service as recommendation_service
from src.recommendation.schemas import LifestylePreference, LifestyleRecommendationRequest

DEFAULT_RESULT_LIMIT = 10
MAX_RESULT_LIMIT = 20

SEARCH_HOUSING_TOOL: dict[str, Any] = {
    "name": "search_housing",
    "description": (
        "Search Busan public rental housing by hard conditions: max deposit, minimum "
        "construction year, room count, district, or housing program type. Use this when "
        "the user gives concrete filters rather than lifestyle preferences."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "district": {
                "type": "string",
                "description": "Busan district (구/군), e.g. 수영구, 해운대구",
            },
            "depositMax": {"type": "number", "description": "Maximum deposit in KRW (not 만원)"},
            "builtAfter": {"type": "integer", "description": "Minimum construction/approval year, e.g. 2020"},
            "roomCount": {"type": "number"},
            "type": {
                "type": "string",
                "enum": ["purchased", "redevelopment", "integrated", "happy"],
                "description": "매입임대=purchased, 재개발임대=redevelopment, 통합공공임대=integrated, 행복주택=happy",
            },
            "limit": {"type": "integer", "default": DEFAULT_RESULT_LIMIT},
        },
    },
}

# `categories.items.enum` is filled in at request time from the real
# commercial_poi category_name values (see build_tools) — without it Gemini
# would guess plausible-looking Korean category strings that don't actually
# exist in the data and silently match nothing.
RECOMMEND_LIFESTYLE_TOOL_TEMPLATE: dict[str, Any] = {
    "name": "recommend_lifestyle",
    "description": (
        "Recommend housing near the user's preferred lifestyle categories (cafes, gyms, "
        "restaurants, pharmacies, etc), ranked by how many matching places are nearby and "
        "how close they are. Use this when the user describes what they want nearby rather "
        "than hard filters."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "categories": {
                "type": "array",
                "items": {"type": "string", "enum": []},
                "description": "Real commercial category names the user cares about, at least one.",
            },
            "district": {"type": "string"},
            "depositMax": {"type": "number", "description": "Maximum deposit in KRW (not 만원)"},
            "radiusMeters": {"type": "number", "default": 500},
            "limit": {"type": "integer", "default": DEFAULT_RESULT_LIMIT},
        },
        "required": ["categories"],
    },
}


async def build_tools(session: AsyncSession) -> list[Any]:
    categories = await poi_service.list_poi_categories(session, limit=60)

    recommend_tool = copy.deepcopy(RECOMMEND_LIFESTYLE_TOOL_TEMPLATE)
    recommend_tool["parameters"]["properties"]["categories"]["items"]["enum"] = [c.category_name for c in categories]

    return [types.Tool(function_declarations=[SEARCH_HOUSING_TOOL, recommend_tool])]


def _describe_housing(results: list[HousingSummary]) -> str:
    """A compact text summary fed back to Gemini as the tool result — not
    shown to the user (the UI renders `housing` directly as cards)."""
    if not results:
        return "No matching housing found."
    lines = [
        f"- id={h.id} {h.project_name} ({h.type}), {h.address}, deposit={h.min_deposit}, rent={h.min_rent}, built={h.built_date}"
        for h in results
    ]
    return f"Found {len(results)} result(s):\n" + "\n".join(lines)


async def dispatch_tool(session: AsyncSession, name: str, args: dict[str, Any]) -> tuple[str, list[HousingSummary]]:
    limit = min(int(args.get("limit") or DEFAULT_RESULT_LIMIT), MAX_RESULT_LIMIT)

    if name == "search_housing":
        query = HousingSearchQuery(
            deposit_max=args.get("depositMax"),
            built_after=args.get("builtAfter"),
            room_count=args.get("roomCount"),
            district=args.get("district"),
            type=args.get("type"),
        )
        results = (await housing_service.search_housing(session, query))[:limit]
        return _describe_housing(results), results

    if name == "recommend_lifestyle":
        category_names: list[str] = args.get("categories") or []
        if not category_names:
            return "No categories given.", []
        preferences = [LifestylePreference(category_name=c, weight=1.0) for c in category_names]
        req = LifestyleRecommendationRequest(
            preferences=preferences,
            district=args.get("district"),
            deposit_max=args.get("depositMax"),
            radius_meters=args.get("radiusMeters") or 500,
        )
        ranked = await recommendation_service.recommend_lifestyle(session, req)
        results = [r.housing for r in ranked[:limit]]
        return _describe_housing(results), results

    return f"Unknown tool '{name}'.", []
