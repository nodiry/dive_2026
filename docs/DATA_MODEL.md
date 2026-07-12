# Data model — BMC sample CSVs → Postgres

Read this before touching `api/src/db/seedHousing.ts` or the schema in
`api/src/db/migrations/001_init.sql`. The raw files are genuinely confusing —
this doc is the result of actually loading them and fixing what broke.

## Gotcha #1: encoding

All 6 BMC sample CSVs are **EUC-KR encoded, not UTF-8**. `Bun.file(...).text()`
will silently mangle every Korean field into `�` replacement characters —
always read them via `api/src/lib/csv.ts#readCsv`, which decodes with
`new TextDecoder("euc-kr")` first.

## Gotcha #2: 매입임대 addresses don't match between its two files

`매입임대 주택정보(샘플)` (unit info) suffixes every address with a
`(동명[,건물명])` annotation that `매입임대 보증금_임대료(샘플)` (price) omits:

```
unit file:  부산광역시 수영구 수영로606번길 100(광안동,명성갤러리3)
price file: 부산광역시 수영구 수영로606번길 100
```

`stripDongSuffix()` in `csv.ts` strips the trailing `(...)` before either file
is used as a join key. Some of these addresses also contain a literal comma
*inside* the quoted CSV field — that's a normal quoted-CSV case handled by the
parser in `csv.ts`, not a bug.

## The 4 housing types → one schema

| BMC label | `housing_project.type` | Unit info source file | Price source file |
|---|---|---|---|
| 매입임대 (purchased) | `purchased` | `매입임대 주택정보(샘플)_수영구.csv` | `매입임대 보증금_임대료(샘플)_수영구.csv` |
| 재개발임대 (redevelopment) | `redevelopment` | `행복, 통합, 재개발 주택정보(샘플)_수영구, 기장군.csv` (filtered by `임대주택유형`) | `재개발임대 보증금_임대료(샘플)_수영구.csv` |
| 통합공공임대 (integrated) | `integrated` | same combined file | `통합공공임대 보증금_임대료(샘플)_기장군.csv` |
| 행복주택 (happy) | `happy` | same combined file | `행복주택 표준보증금 및 임대료(샘플)_기장군.csv` |

`재개발임대`/`통합공공임대`/`행복주택` join cleanly on `사업지구` (price file)
= `임대주택명` (unit file) — no normalization needed there, unlike 매입임대.

## Why `housing_price.segment` is jsonb, not columns

Every housing type segments price by a *different* dimension — there's no
shared column to normalize onto without either dropping data or adding a dozen
nullable columns:

| Type | Segment fields | Example |
|---|---|---|
| purchased | `rank`, `unitName` | `{"rank": null, "unitName": "101"}` |
| redevelopment | `protectionClass` (보호구분명) | `{"protectionClass": "일반"}` |
| integrated | `incomeBracket` (소득구간), `householdSize` (가구인원수) | `{"incomeBracket": "01", "householdSize": 1}` |
| happy | `supplyClass` (공급계층명) | `{"supplyClass": "청년"}` |

## Other field mappings worth knowing

- `사용승인일` / `준공일자` (both mean "built/completion date") are `YYYYMMDD`
  strings (e.g. `20251130`) — parsed via `dateFromYYYYMMDD`.
- `등록일` (registered date, price files only) is `MM-DD-YYYY HH:MM:SS` — parsed
  via `timestampFromMMDDYYYY`. Don't confuse the field order with the built-date
  format, they're different despite both being dates.
- `승강기설치구분` is the literal string `설치`/`미설치` (installed/not) →
  boolean via `elevatorFromLabel`.
- Numeric fields (`세대수`, `표준보증금`, `주차대수`, ...) are comma-grouped
  strings like `"1,134"` — always go through `toNumber`, never `Number()`
  directly.
- `순위` (rank, purchased-price file only) uses the literal string `NA` for
  missing — `toNumber` treats `NA` as `null`.
- `source_district` on `housing_project` is derived from the address itself
  (`부산광역시 (\S+구|군)` regex in `districtFromAddress`), not hardcoded to
  Suyeong-gu/Gijang-gun — this should keep working once the full city-wide
  dataset lands on 7/25.

## What's NOT in place yet

- **Geocoding.** `housing_project.geom` is always `NULL` right now — the CSVs
  only have road-name address strings, no lat/lng. Needed before the map UI or
  any spatial join (proximity to commercial POIs) can work. Batch-geocode via
  Kakao/VWorld and cache results; don't re-geocode on every ingestion run.
- **Sundosoft's GIS layers** (`commercial_poi`, `industry_population_grid`,
  `commercial_zone`) — tables exist, empty. See `api/src/scripts/ingest-gis.ts`
  and `PLAN.md` §3 for why (Sundosoft hasn't shipped real SHP samples; the
  actual sourcing is manual, from vworld/data.go.kr/sgis).
- Some 매입임대 addresses in the unit-info sample have no matching row in the
  price sample and vice versa — that's a real gap in the sample data (BMC
  independently sampled the two files), not a bug. `projectName` falls back to
  the raw address when no price-file name is available.
