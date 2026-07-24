"""
Batch-geocodes every housing_project row that doesn't have a geom yet.
Safe to re-run any time — only touches rows where geom IS NULL, so it
never re-geocodes (and never re-spends API quota on) rows already done.

Requires KAKAO_REST_API_KEY.
"""

import asyncio

from scripts.db import close_pool, get_pool
from scripts.lib.geocode import geocode_address


async def main() -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, address FROM housing_project WHERE geom IS NULL ORDER BY id")

        print(f"geocoding {len(rows)} housing_project rows without a geom...")
        succeeded = 0
        failed = 0

        for row in rows:
            try:
                result = await geocode_address(row["address"])
                if not result:
                    print(f"no geocode result for #{row['id']}: {row['address']}")
                    failed += 1
                    continue
                await conn.execute(
                    """
                    UPDATE housing_project
                    SET geom = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                    WHERE id = $3
                    """,
                    result.lng,
                    result.lat,
                    row["id"],
                )
                succeeded += 1
            except Exception as err:  # noqa: BLE001 — report and keep going, one bad row shouldn't kill the batch
                print(f"geocode failed for #{row['id']}: {row['address']} — {err}")
                failed += 1
            await asyncio.sleep(0.1)  # polite rate limit

        print(f"geocoding complete: {succeeded} succeeded, {failed} failed")
    await close_pool()


if __name__ == "__main__":
    asyncio.run(main())
