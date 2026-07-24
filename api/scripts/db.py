import asyncpg
from src.database import db_config

DATABASE_URL = db_config.URL.replace("postgresql+asyncpg://", "postgresql://", 1)

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(DATABASE_URL)
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
