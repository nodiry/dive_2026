import asyncio

from scripts.db import close_pool
from scripts.lib.paths import require_samples_dir
from scripts.seed_gis import ingest_gis
from scripts.seed_housing import ingest_housing
from scripts.seed_poi import ingest_poi
from scripts.seed_population import auto_ingest as ingest_population


async def main() -> None:
    require_samples_dir()
    await ingest_housing()
    await ingest_poi()
    await ingest_gis()
    # after gis so admin_boundary exists; soft-skips when no source is present
    await ingest_population()
    await close_pool()


if __name__ == "__main__":
    asyncio.run(main())
