import os

import asyncpg

_pool: asyncpg.Pool | None = None

DATABASE_URL = os.environ.get("DATABASE_URL", "postgres://dive:dive@localhost:5433/dive2026")


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
