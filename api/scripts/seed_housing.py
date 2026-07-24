"""
Loads BMC's 6 sample CSVs (Suyeong-gu / Gijang-gun only) into
housing_project / housing_unit / housing_price. Re-run safely — projects
are upserted on (type, project_name, address); units/prices are re-appended,
so wipe the DB volume (`docker compose down -v`) for a clean re-seed.

Field mapping is documented in docs/DATA_MODEL.md — read that before
touching this file, the Korean column names are not self-explanatory.
"""

import asyncio
import json
from datetime import date

import asyncpg

from scripts.db import close_pool, get_pool
from scripts.lib.csv_utils import (
    date_from_yyyymmdd,
    district_from_address,
    elevator_from_label,
    read_csv,
    strip_dong_suffix,
    timestamp_from_mmddyyyy,
    to_number,
)
from scripts.lib.paths import SAMPLES_DIR, require_samples_dir

DATA_DIR = SAMPLES_DIR / "housing"

HOUSING_TYPE_MAP = {
    "통합공공임대주택": "integrated",
    "재개발임대주택": "redevelopment",
    "행복주택": "happy",
}


async def upsert_project(
    conn: asyncpg.Connection,
    type_: str,
    project_name: str,
    address: str,
    built_date: date | None,
    total_units: float | None,
) -> int:
    row = await conn.fetchrow(
        """
        INSERT INTO housing_project (type, project_name, address, built_date, total_units, source_district)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (type, project_name, address)
        DO UPDATE SET built_date = COALESCE(EXCLUDED.built_date, housing_project.built_date),
                      total_units = COALESCE(EXCLUDED.total_units, housing_project.total_units)
        RETURNING id
        """,
        type_,
        project_name,
        address,
        built_date,
        total_units,
        district_from_address(address),
    )
    return row["id"]


async def find_project_id(conn: asyncpg.Connection, type_: str, project_name: str) -> int | None:
    row = await conn.fetchrow(
        "SELECT id FROM housing_project WHERE type = $1 AND project_name = $2 LIMIT 1",
        type_,
        project_name,
    )
    return row["id"] if row else None


async def find_project_id_by_address(conn: asyncpg.Connection, type_: str, address: str) -> int | None:
    row = await conn.fetchrow("SELECT id FROM housing_project WHERE type = $1 AND address = $2 LIMIT 1", type_, address)
    return row["id"] if row else None


async def ingest_combined_housing_info(conn: asyncpg.Connection) -> None:
    """Covers 통합공공임대/재개발임대/행복주택 — the one file that lists all three."""
    rows = read_csv(DATA_DIR / "combined_units.csv")
    print(f"combined housing info: {len(rows)} rows")
    project_ids: dict[str, int] = {}

    for row in rows:
        type_ = HOUSING_TYPE_MAP.get(row.get("임대주택유형", ""))
        if not type_:
            print(f"unknown 임대주택유형, skipping: {row.get('임대주택유형')}")
            continue
        key = f"{type_}|{row.get('임대주택명')}|{row.get('주소')}"
        project_id = project_ids.get(key)
        if not project_id:
            project_id = await upsert_project(
                conn,
                type_,
                row.get("임대주택명", ""),
                row.get("주소", ""),
                date_from_yyyymmdd(row.get("준공일자")),
                to_number(row.get("세대수")),
            )
            project_ids[key] = project_id

        await conn.execute(
            """
            INSERT INTO housing_unit (project_id, dong, ho, room_count, area_m2, has_elevator, parking_spots)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            project_id,
            row.get("동"),
            row.get("호"),
            to_number(row.get("방수")),
            to_number(row.get("전용면적")),
            elevator_from_label(row.get("승강기설치구분")),
            to_number(row.get("주차대수")),
        )


async def ingest_purchased_housing(conn: asyncpg.Connection) -> None:
    """매입임대 has no project-name field in the unit file — borrow it from the price file's 주택명, keyed by address."""
    price_rows = read_csv(DATA_DIR / "purchased_price.csv")
    name_by_address: dict[str, str] = {}
    for row in price_rows:
        address = strip_dong_suffix(row.get("주소", ""))
        if address not in name_by_address:
            name_by_address[address] = row.get("주택명") or address

    unit_rows = read_csv(DATA_DIR / "purchased_units.csv")
    print(f"purchased housing info: {len(unit_rows)} rows")
    project_ids: dict[str, int] = {}

    for row in unit_rows:
        address = strip_dong_suffix(row.get("주소", ""))
        project_id = project_ids.get(address)
        if not project_id:
            project_id = await upsert_project(
                conn,
                "purchased",
                name_by_address.get(address, address),
                address,
                date_from_yyyymmdd(row.get("사용승인일")),
                to_number(row.get("세대수")),
            )
            project_ids[address] = project_id

        await conn.execute(
            """
            INSERT INTO housing_unit (project_id, ho, room_count, area_m2, has_elevator, parking_spots)
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            project_id,
            row.get("호"),
            to_number(row.get("방수")),
            to_number(row.get("전용면적")),
            elevator_from_label(row.get("승강기설치구분")),
            to_number(row.get("주차대수")),
        )

    print(f"purchased housing price: {len(price_rows)} rows")
    for row in price_rows:
        project_id = await find_project_id_by_address(conn, "purchased", strip_dong_suffix(row.get("주소", "")))
        if not project_id:
            print(f"no matching purchased project for address: {row.get('주소')}")
            continue
        segment = json.dumps({"rank": to_number(row.get("순위")), "unitName": row.get("호명")})
        await conn.execute(
            """
            INSERT INTO housing_price (project_id, deposit, rent, segment, registered_at)
            VALUES ($1, $2, $3, $4::jsonb, $5)
            """,
            project_id,
            to_number(row.get("평균표준보증금")),
            to_number(row.get("평균표준임대료")),
            segment,
            timestamp_from_mmddyyyy(row.get("등록일")),
        )


async def ingest_price_file(conn: asyncpg.Connection, filename: str, type_: str, segment_fn) -> None:
    rows = read_csv(DATA_DIR / filename)
    print(f"{filename}: {len(rows)} rows")
    for row in rows:
        project_id = await find_project_id(conn, type_, row.get("사업지구", ""))
        if not project_id:
            print(f"no matching project for 사업지구: {row.get('사업지구')}")
            continue
        segment = json.dumps(segment_fn(row))
        await conn.execute(
            """
            INSERT INTO housing_price (project_id, unit_type, deposit, rent, segment, registered_at)
            VALUES ($1, $2, $3, $4, $5::jsonb, $6)
            """,
            project_id,
            row.get("주택형"),
            to_number(row.get("표준보증금")),
            to_number(row.get("표준임대료")),
            segment,
            timestamp_from_mmddyyyy(row.get("등록일")),
        )


async def ingest_housing() -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        # housing_project rows are upserted (ON CONFLICT), so geocoded geom
        # values survive a re-seed — but unit/price are plain appends, so wipe
        # them first or re-running onboarding twice silently doubles them.
        await conn.execute("TRUNCATE housing_unit, housing_price")
        await ingest_combined_housing_info(conn)
        await ingest_purchased_housing(conn)
        await ingest_price_file(
            conn,
            "redevelopment_price.csv",
            "redevelopment",
            lambda row: {"protectionClass": row.get("보호구분명")},
        )
        await ingest_price_file(
            conn,
            "integrated_price.csv",
            "integrated",
            lambda row: {
                "incomeBracket": row.get("소득구간"),
                "householdSize": to_number(row.get("가구인원수")),
            },
        )
        await ingest_price_file(conn, "happy_price.csv", "happy", lambda row: {"supplyClass": row.get("공급계층명")})
    print("housing ingestion complete")


async def main() -> None:
    require_samples_dir()
    await ingest_housing()
    await close_pool()


if __name__ == "__main__":
    asyncio.run(main())
