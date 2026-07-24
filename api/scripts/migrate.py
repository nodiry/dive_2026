import asyncio
from pathlib import Path

from scripts.db import close_pool, get_pool

MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "migrations"


async def run_migrations() -> None:
    pool = await get_pool()
    files = sorted(p for p in MIGRATIONS_DIR.glob("*.sql"))
    async with pool.acquire() as conn:
        for f in files:
            print(f"applying {f.name}")
            await conn.execute(f.read_text())
    print(f"done — applied {len(files)} migration file(s)")


async def main() -> None:
    await run_migrations()
    await close_pool()


if __name__ == "__main__":
    asyncio.run(main())
