import asyncio

from scripts.db import close_pool
from scripts.lib.paths import require_samples_dir
from scripts.seed_gis import ingest_gis
from scripts.seed_housing import ingest_housing
from scripts.seed_poi import ingest_poi


async def main() -> None:
    require_samples_dir()
    await ingest_housing()
    await ingest_poi()
    await ingest_gis()
    await close_pool()


if __name__ == "__main__":
    asyncio.run(main())
