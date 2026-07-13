import asyncio

from app.db import close_pool
from app.lib.paths import require_samples_dir
from app.scripts.migrate import run_migrations
from app.scripts.seed_gis import ingest_gis
from app.scripts.seed_housing import ingest_housing
from app.scripts.seed_poi import ingest_poi


async def main() -> None:
    require_samples_dir()
    await run_migrations()
    await ingest_housing()
    await ingest_poi()
    await ingest_gis()
    await close_pool()


if __name__ == "__main__":
    asyncio.run(main())
