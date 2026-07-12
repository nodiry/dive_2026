/**
 * Loads BMC's 6 sample CSVs (Suyeong-gu / Gijang-gun only) into
 * housing_project / housing_unit / housing_price. Re-run safely — projects
 * are upserted on (type, project_name, address); units/prices are re-appended,
 * so wipe the DB volume (`docker compose down -v`) for a clean re-seed.
 *
 * Field mapping is documented in docs/DATA_MODEL.md — read that before
 * touching this file, the Korean column names are not self-explanatory.
 */
import { sql } from "./client";
import {
  readCsv,
  toNumber,
  dateFromYYYYMMDD,
  timestampFromMMDDYYYY,
  districtFromAddress,
  elevatorFromLabel,
  stripDongSuffix,
} from "../lib/csv";
import { SAMPLES_DIR } from "../lib/paths";

const DATA_DIR = new URL("housing/", SAMPLES_DIR);
const file = (name: string) => new URL(name, DATA_DIR);

const HOUSING_TYPE_MAP: Record<string, string> = {
  통합공공임대주택: "integrated",
  재개발임대주택: "redevelopment",
  행복주택: "happy",
};

async function upsertProject(opts: {
  type: string;
  projectName: string;
  address: string;
  builtDate: string | null;
  totalUnits: number | null;
}): Promise<number> {
  const rows = await sql`
    INSERT INTO housing_project (type, project_name, address, built_date, total_units, source_district)
    VALUES (${opts.type}, ${opts.projectName}, ${opts.address}, ${opts.builtDate}, ${opts.totalUnits}, ${districtFromAddress(opts.address)})
    ON CONFLICT (type, project_name, address)
    DO UPDATE SET built_date = COALESCE(EXCLUDED.built_date, housing_project.built_date),
                  total_units = COALESCE(EXCLUDED.total_units, housing_project.total_units)
    RETURNING id
  `;
  return rows[0].id as number;
}

async function findProjectId(type: string, projectName: string): Promise<number | null> {
  const rows = await sql`SELECT id FROM housing_project WHERE type = ${type} AND project_name = ${projectName} LIMIT 1`;
  return rows[0]?.id ?? null;
}

async function findProjectIdByAddress(type: string, address: string): Promise<number | null> {
  const rows = await sql`SELECT id FROM housing_project WHERE type = ${type} AND address = ${address} LIMIT 1`;
  return rows[0]?.id ?? null;
}

/** Covers 통합공공임대/재개발임대/행복주택 — the one file that lists all three. */
async function ingestCombinedHousingInfo() {
  const rows = await readCsv(file("combined_units.csv"));
  console.log(`combined housing info: ${rows.length} rows`);
  const projectIds = new Map<string, number>();

  for (const row of rows) {
    const type = HOUSING_TYPE_MAP[row["임대주택유형"] ?? ""];
    if (!type) {
      console.warn("unknown 임대주택유형, skipping:", row["임대주택유형"]);
      continue;
    }
    const key = `${type}|${row["임대주택명"]}|${row["주소"]}`;
    let projectId = projectIds.get(key);
    if (!projectId) {
      projectId = await upsertProject({
        type,
        projectName: row["임대주택명"] ?? "",
        address: row["주소"] ?? "",
        builtDate: dateFromYYYYMMDD(row["준공일자"]),
        totalUnits: toNumber(row["세대수"]),
      });
      projectIds.set(key, projectId);
    }

    await sql`
      INSERT INTO housing_unit (project_id, dong, ho, room_count, area_m2, has_elevator, parking_spots)
      VALUES (${projectId}, ${row["동"]}, ${row["호"]}, ${toNumber(row["방수"])}, ${toNumber(row["전용면적"])}, ${elevatorFromLabel(row["승강기설치구분"])}, ${toNumber(row["주차대수"])})
    `;
  }
}

/** 매입임대 has no project-name field in the unit file — borrow it from the price file's 주택명, keyed by address. */
async function ingestPurchasedHousing() {
  const priceRows = await readCsv(file("purchased_price.csv"));
  const nameByAddress = new Map<string, string>();
  for (const row of priceRows) {
    const address = stripDongSuffix(row["주소"] ?? "");
    if (!nameByAddress.has(address)) nameByAddress.set(address, row["주택명"] ?? address);
  }

  const unitRows = await readCsv(file("purchased_units.csv"));
  console.log(`purchased housing info: ${unitRows.length} rows`);
  const projectIds = new Map<string, number>();

  for (const row of unitRows) {
    const address = stripDongSuffix(row["주소"] ?? "");
    let projectId = projectIds.get(address);
    if (!projectId) {
      projectId = await upsertProject({
        type: "purchased",
        projectName: nameByAddress.get(address) ?? address,
        address,
        builtDate: dateFromYYYYMMDD(row["사용승인일"]),
        totalUnits: toNumber(row["세대수"]),
      });
      projectIds.set(address, projectId);
    }

    await sql`
      INSERT INTO housing_unit (project_id, ho, room_count, area_m2, has_elevator, parking_spots)
      VALUES (${projectId}, ${row["호"]}, ${toNumber(row["방수"])}, ${toNumber(row["전용면적"])}, ${elevatorFromLabel(row["승강기설치구분"])}, ${toNumber(row["주차대수"])})
    `;
  }

  console.log(`purchased housing price: ${priceRows.length} rows`);
  for (const row of priceRows) {
    const projectId = await findProjectIdByAddress("purchased", stripDongSuffix(row["주소"] ?? ""));
    if (!projectId) {
      console.warn("no matching purchased project for address:", row["주소"]);
      continue;
    }
    const segment = JSON.stringify({ rank: toNumber(row["순위"]), unitName: row["호명"] });
    await sql`
      INSERT INTO housing_price (project_id, deposit, rent, segment, registered_at)
      VALUES (${projectId}, ${toNumber(row["평균표준보증금"])}, ${toNumber(row["평균표준임대료"])}, ${segment}::jsonb, ${timestampFromMMDDYYYY(row["등록일"])})
    `;
  }
}

async function ingestPriceFile(opts: {
  file: string;
  type: string;
  segment: (row: Record<string, string>) => Record<string, unknown>;
}) {
  const rows = await readCsv(file(opts.file));
  console.log(`${opts.file}: ${rows.length} rows`);
  for (const row of rows) {
    const projectId = await findProjectId(opts.type, row["사업지구"] ?? "");
    if (!projectId) {
      console.warn("no matching project for 사업지구:", row["사업지구"]);
      continue;
    }
    const segment = JSON.stringify(opts.segment(row));
    await sql`
      INSERT INTO housing_price (project_id, unit_type, deposit, rent, segment, registered_at)
      VALUES (${projectId}, ${row["주택형"]}, ${toNumber(row["표준보증금"])}, ${toNumber(row["표준임대료"])}, ${segment}::jsonb, ${timestampFromMMDDYYYY(row["등록일"])})
    `;
  }
}

export async function ingestHousing(): Promise<void> {
  await ingestCombinedHousingInfo();
  await ingestPurchasedHousing();
  await ingestPriceFile({
    file: "redevelopment_price.csv",
    type: "redevelopment",
    segment: (row) => ({ protectionClass: row["보호구분명"] }),
  });
  await ingestPriceFile({
    file: "integrated_price.csv",
    type: "integrated",
    segment: (row) => ({ incomeBracket: row["소득구간"], householdSize: toNumber(row["가구인원수"]) }),
  });
  await ingestPriceFile({
    file: "happy_price.csv",
    type: "happy",
    segment: (row) => ({ supplyClass: row["공급계층명"] }),
  });
  console.log("housing ingestion complete");
}
