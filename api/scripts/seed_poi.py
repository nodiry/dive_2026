"""
Loads 소상공인시장진흥공단's 상가(상권)정보 dataset (Busan slice, 2026.03 cut,
data.go.kr — this is Sundosoft's 상가-건물 융합정보 raw source, per PLAN.md §3)
into commercial_poi. ~155k rows, every one with valid coordinates already —
no geocoding needed for this file, unlike BMC's housing addresses.

category = 상권업종대분류명 (10 real categories, see PoiCategory in
packages/shared — the OT deck's 8-category list was stale).
category_name = 상권업종소분류명 (finest granularity — "카페"/"헬스장"/
"편의점" all exist at this level, matching the deck's example query).
"""

import asyncio

from scripts.db import close_pool, get_pool
from scripts.lib.csv_utils import read_csv, to_number
from scripts.lib.paths import SAMPLES_DIR, require_samples_dir

FILE = SAMPLES_DIR / "poi" / "business_busan.csv"

MAJOR_CATEGORY_MAP = {
    "소매": "retail",
    "부동산": "real_estate",
    "음식": "food",
    "시설관리·임대": "facility_leasing",
    "보건의료": "healthcare",
    "교육": "education",
    "숙박": "lodging",
    "예술·스포츠": "arts_sports",
    "수리·개인": "repair_personal",
    "과학·기술": "science_tech",
}

INSERT_SQL = """
    INSERT INTO commercial_poi (category, category_name, biz_name, address, district, geom)
    VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography)
"""


async def ingest_poi() -> None:
    print("reading 상가(상권)정보 CSV (this file is ~80MB, may take a few seconds)...")
    rows = read_csv(FILE, encoding="utf-8")
    print(f"상가(상권)정보: {len(rows)} rows")

    unknown_majors: set[str] = set()
    skipped_bad_geo = 0
    batch: list[tuple] = []

    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("TRUNCATE commercial_poi")
        for row in rows:
            major = row.get("상권업종대분류명", "")
            category = MAJOR_CATEGORY_MAP.get(major)
            if not category:
                unknown_majors.add(major)
                continue
            lng = to_number(row.get("경도"))
            lat = to_number(row.get("위도"))
            if lng is None or lat is None:
                skipped_bad_geo += 1
                continue
            batch.append(
                (
                    category,
                    row.get("상권업종소분류명", ""),
                    row.get("상호명", ""),
                    row.get("도로명주소") or row.get("지번주소") or "",
                    row.get("시군구명", ""),
                    lng,
                    lat,
                )
            )
            if len(batch) >= 2000:
                await conn.executemany(INSERT_SQL, batch)
                batch = []
        if batch:
            await conn.executemany(INSERT_SQL, batch)

    if unknown_majors:
        print(f"unmapped 상권업종대분류명 values (rows skipped): {unknown_majors}")
    if skipped_bad_geo:
        print(f"skipped {skipped_bad_geo} rows with missing/invalid coordinates")
    print("POI ingestion complete")


async def main() -> None:
    require_samples_dir()
    await ingest_poi()
    await close_pool()


if __name__ == "__main__":
    asyncio.run(main())
