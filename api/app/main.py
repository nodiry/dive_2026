import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.models import (
    HousingSearchQuery,
    HousingSummary,
    HousingType,
    LifestyleRecommendationRequest,
    LifestyleRecommendationResult,
    PoiCategorySummary,
)
from app.queries.housing import get_housing_by_id, search_housing
from app.queries.poi import list_poi_categories
from app.queries.recommendations import recommend_lifestyle

app = FastAPI(title="DIVE 2026 API")

# client/ runs on a different origin (Vite dev server) — needed from day one of frontend work.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"error": "invalid request", "issues": exc.errors()})


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True}


@app.get("/api/housing", response_model=list[HousingSummary])
async def get_housing_list(
    depositMax: float | None = None,
    builtAfter: int | None = None,
    roomCount: float | None = None,
    district: str | None = None,
    type: HousingType | None = None,
) -> list[HousingSummary]:
    query = HousingSearchQuery(
        deposit_max=depositMax, built_after=builtAfter, room_count=roomCount, district=district, type=type
    )
    return await search_housing(query)


@app.get("/api/housing/{housing_id}", response_model=HousingSummary)
async def get_housing_detail(housing_id: int) -> HousingSummary:
    housing = await get_housing_by_id(housing_id)
    if not housing:
        raise HTTPException(status_code=404, detail="not found")
    return housing


@app.post("/api/recommendations/lifestyle", response_model=list[LifestyleRecommendationResult])
async def post_lifestyle_recommendation(body: LifestyleRecommendationRequest) -> list[LifestyleRecommendationResult]:
    return await recommend_lifestyle(body)


@app.get("/api/poi/categories", response_model=list[PoiCategorySummary])
async def get_poi_categories() -> list[PoiCategorySummary]:
    return await list_poi_categories()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 3000)), reload=True)
