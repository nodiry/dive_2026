/**
 * Loads 소상공인시장진흥공단's 상가(상권)정보 dataset (Busan slice, 2026.03 cut,
 * data.go.kr — this is Sundosoft's 상가-건물 융합정보 raw source, per PLAN.md §3)
 * into commercial_poi. ~155k rows, every one with valid coordinates already —
 * no geocoding needed for this file, unlike BMC's housing addresses.
 *
 * category = 상권업종대분류명 (10 real categories, see PoiCategory in
 * packages/shared — the OT deck's 8-category list was stale).
 * category_name = 상권업종소분류명 (finest granularity — "카페"/"헬스장"/
 * "편의점" all exist at this level, matching the deck's example query).
 */
import { sql } from "./client";
import { readCsv, toNumber } from "../lib/csv";
import { SAMPLES_DIR } from "../lib/paths";

const FILE = new URL("poi/business_busan.csv", SAMPLES_DIR);

const MAJOR_CATEGORY_MAP: Record<string, string> = {
  소매: "retail",
  부동산: "real_estate",
  음식: "food",
  "시설관리·임대": "facility_leasing",
  보건의료: "healthcare",
  교육: "education",
  숙박: "lodging",
  "예술·스포츠": "arts_sports",
  "수리·개인": "repair_personal",
  "과학·기술": "science_tech",
};

const BATCH_SIZE = 2000; // 7 params/row -> 14,000 params/batch, well under Postgres's 65535 limit

async function insertBatch(
  rows: {
    category: string;
    categoryName: string;
    bizName: string;
    address: string;
    district: string;
    lng: number;
    lat: number;
  }[],
) {
  const values: string[] = [];
  const params: unknown[] = [];
  rows.forEach((r, i) => {
    const b = i * 7;
    values.push(
      `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, ST_SetSRID(ST_MakePoint($${b + 6}, $${b + 7}), 4326)::geography)`,
    );
    params.push(r.category, r.categoryName, r.bizName, r.address, r.district, r.lng, r.lat);
  });
  await sql.unsafe(
    `INSERT INTO commercial_poi (category, category_name, biz_name, address, district, geom) VALUES ${values.join(",")}`,
    params,
  );
}

export async function ingestPoi(): Promise<void> {
  console.log("reading 상가(상권)정보 CSV (this file is ~80MB, may take a few seconds)...");
  const rows = await readCsv(FILE, "utf-8");
  console.log(`상가(상권)정보: ${rows.length} rows`);

  const unknownMajors = new Set<string>();
  let skippedBadGeo = 0;
  const batch: Parameters<typeof insertBatch>[0] = [];

  for (const row of rows) {
    const major = row["상권업종대분류명"] ?? "";
    const category = MAJOR_CATEGORY_MAP[major];
    if (!category) {
      unknownMajors.add(major);
      continue;
    }
    const lng = toNumber(row["경도"]);
    const lat = toNumber(row["위도"]);
    if (lng == null || lat == null) {
      skippedBadGeo++;
      continue;
    }
    batch.push({
      category,
      categoryName: row["상권업종소분류명"] ?? "",
      bizName: row["상호명"] ?? "",
      address: row["도로명주소"] || row["지번주소"] || "",
      district: row["시군구명"] ?? "",
      lng,
      lat,
    });
    if (batch.length >= BATCH_SIZE) {
      await insertBatch(batch.splice(0, batch.length));
    }
  }
  if (batch.length > 0) await insertBatch(batch);

  if (unknownMajors.size > 0) {
    console.warn("unmapped 상권업종대분류명 values (rows skipped):", [...unknownMajors]);
  }
  if (skippedBadGeo > 0) {
    console.warn(`skipped ${skippedBadGeo} rows with missing/invalid coordinates`);
  }
  console.log("POI ingestion complete");
}
