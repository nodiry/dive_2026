from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.config import app_config
from src.database import engine
from src.router import api_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title="DIVE 2026 API",
    version=app_config.APP_VERSION,
    docs_url="/docs" if app_config.SHOW_DOCS else None,
    redoc_url=None,
    openapi_url="/openapi.json" if app_config.SHOW_DOCS else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=app_config.CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"error": "invalid request", "issues": exc.errors()},
    )


@app.get("/api/health", include_in_schema=False)
@app.get("/health", include_in_schema=False)
async def health():
    return {
        "status": "ok",
        "version": app_config.APP_VERSION,
        "software": "DIVE 2026 API",
    }


app.include_router(api_router)
