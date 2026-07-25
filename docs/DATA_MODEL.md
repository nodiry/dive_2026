# Data model — source data → Postgres

Read this before touching anything under `api/scripts/` or the alembic
migrations. The raw files are genuinely confusing — this doc is the
result of actually loading them and fixing what broke. (The backend has been ported twice — Bun/TS to Python/asyncpg to
SQLModel/alembic. The data gotchas below survived all of it; only file
paths moved.)

**Where the data lives:** `samples/` at the repo root — gitignored.
`samples.zip` is committed to the repo and `just onboard` unzips it
automatically. The zip holds everything the seeds need; the heavy
not-yet-ingested extras (Part 5, Part 4) are manual drop-ins. Every path
below is relative to `samples/`.

```
samples/
  2026_DIVE_해커톤_제공데이터_부산도시공사/   6 BMC CSVs, 2026-06-30 handout (Part 1)
  2026_DIVE_해커톤_제공데이터_선도소프트/     컬럼정의서.xlsx in the zip; the 01/02/03
                                              융합데이터 year-zips come from the handout zip
                                              dropped at the repo root (Part 5)
  [참고자료]부산도시공사 모집공고/            recruitment-notice hwp/pdf, reference only
  [참고자료]선도소프트 원천데이터 링크/       원천데이터 링크.txt — the 5 raw-source links
  poi/            business_busan.csv (Part 2 — raw source behind link #2)
  gis/            admin_boundary/, zoning/, building/ (Part 3 — links #1/#4/#5)
  population_grid_UNPLACEABLE/   (Part 4 — unusable, manual drop-in, link #3)
```

## Part 1 — BMC housing CSVs (`samples/2026_DIVE_해커톤_제공데이터_부산도시공사/`)

The 2026-06-30 city-wide handout: two Korean-named subfolders, read in
place with their original names (`매입임대주택 상세 정보 및 평균보증금,
평균임대료/` and `통합공공임대, 행복주택, 재개발임대주택 상세 정보 및
보증금, 임대료/`). It supersedes the old Suyeong-gu/Gijang-gun-only sample
that lived in `samples/housing/` — same six files logically, ~8x the rows
(city-wide), several renamed columns, new date formats, and new encodings.
The old cut's rows are a strict subset (verified: every old project key
exists in the new files), so re-seeding over an old database upserts
cleanly and keeps existing geocodes.

### Gotcha #1: encoding — mixed *within* the handout

Five of the six CSVs are **UTF-8 with a BOM**, but `매입임대 표준보증금 및
임대료_20260630.csv` is **CP949**. `read_csv` defaults to
`encoding="auto"` (tries `utf-8-sig`, falls back to `cp949`) — never assume
one encoding per dataset, or even per folder.

### Gotcha #2: purchased-housing addresses don't match between its two files

`purchased_units.csv` (unit info) suffixes every address with a
`(동명[,건물명])` annotation that `purchased_price.csv` omits:

```
unit file:  부산광역시 수영구 수영로606번길 100(광안동,명성갤러리3)
price file: 부산광역시 수영구 수영로606번길 100
```

`strip_dong_suffix()` in `csv_utils.py` strips the trailing `(...)` before
either file is used as a join key. Some of these addresses also contain a
literal comma *inside* the quoted CSV field — Python's `csv` module handles
RFC4180 quoting (embedded commas in quoted fields) natively, so this is a
non-issue in the Python port; it required a hand-rolled parser in the
original TS version.

### The 4 housing types → one schema

| BMC label | `housing_project.type` | Unit info file | Price file |
|---|---|---|---|
| 매입임대 (purchased) | `purchased` | `매입임대 주택정보` | `매입임대 표준보증금 및 임대료` |
| 재개발임대 (redevelopment) | `redevelopment` | `행복, 통합, 재개발 주택정보` (filtered by `임대주택유형`) | `재개발임대 표준보증금 및 임대료` |
| 통합공공임대 (integrated) | `integrated` | same combined file | `통합공공임대 표준보증금 및 임대료` |
| 행복주택 (happy) | `happy` | same combined file | `행복주택 표준보증금 및 임대료` |

(Exact paths, including the `_20260630` suffix, are constants at the top of
`api/scripts/seed_housing.py` — a future handout re-cut only touches those.)

`redevelopment`/`integrated`/`happy` join cleanly on `사업지구` (price file) =
`임대주택명` (unit file) — no normalization needed there, unlike `purchased`.

### Why `housing_price.segment` is jsonb, not columns

Every housing type segments price by a *different* dimension — there's no
shared column to normalize onto without either dropping data or adding a dozen
nullable columns:

| Type | Segment fields | Example |
|---|---|---|
| purchased | `rank`, `unitName` | `{"rank": null, "unitName": "101"}` |
| redevelopment | `protectionClass` (보호구분명) | `{"protectionClass": "일반"}` |
| integrated | `incomeBracket` (소득구간), `householdSize` (가구인원수) | `{"incomeBracket": "01", "householdSize": 1}` |
| happy | `supplyClass` (공급계층명) | `{"supplyClass": "청년"}` |

### Other field mappings worth knowing

- Several columns gained unit suffixes in the 2026-06-30 cut:
  `전용면적(제곱미터)`, `표준보증금(원)`, `표준임대료(원)`, `가구인원수(명)`
  (previously bare names), and the combined file's `주택형` became `평형타입`
  (not read by the seed). The purchased-price file's columns are unchanged.
- `사용승인일` / `준공일자` (both mean "built/completion date") are ISO
  `YYYY-MM-DD` in the current cut (`YYYYMMDD` in older ones) — `parse_date`
  accepts both.
- `등록일` (registered date, price files only) is a bare ISO `YYYY-MM-DD` in
  the current cut (`MM-DD-YYYY HH:MM:SS` in older ones) — `parse_timestamp`
  accepts both.
- `승강기설치구분` is the literal string `설치`/`미설치` (installed/not) →
  boolean via `elevator_from_label`.
- Numeric fields are plain digits in the current cut, comma-grouped
  (`"1,134"`) in older ones, sometimes with trailing spaces — always go
  through `to_number`.
- `순위` (rank, purchased-price file only) is empty when missing (`NA` in
  older cuts) — `to_number` treats both as `null`.
- Re-seeding over an older cut can leave a renamed project's old row behind
  with zero units — `ingest_housing` transfers its geocode to the
  replacement row and deletes unit-less leftovers at the end.
- `source_district` on `housing_project` is derived from the address itself
  (`부산광역시 (\S+구|군)` regex in `districtFromAddress`), not hardcoded to
  Suyeong-gu/Gijang-gun — keeps working once the full city-wide dataset lands.
- Some purchased-housing addresses in the unit-info sample have no matching row
  in the price sample and vice versa — a real gap in the sample data (BMC
  independently sampled the two files), not a bug. `projectName` falls back to
  the raw address when no price-file name is available.

## Part 2 — commercial POI (`samples/poi/`, table `commercial_poi`)

Source: 소상공인시장진흥공단's 상가(상권)정보 dataset, Busan slice, 2026.03 cut
(data.go.kr — this is what's behind Sundosoft's "상가-건물 융합정보"). Loaded via
`api/scripts/seed_poi.py`. **155,103 rows, every one with valid
coordinates already — no geocoding needed for this file.**

- **Encoding: UTF-8**, not EUC-KR — the opposite of the BMC CSVs. The file's own
  read-me (`poi/README.txt`) explains why: an older EUC-KR extract was
  corrupting business names, so this cut switched to UTF-8. `read_csv()` takes
  an explicit `encoding` param (`"euc-kr"` default, pass `"utf-8"` for this
  file) — don't assume one encoding for every source file in this project.
- **`category`** = `상권업종대분류명` (major category), stored as its English
  slug (`retail`/`food`/... — `MAJOR_CATEGORY_MAP` in `seed_poi.py`). The OT deck's slide
  implied an 8-category scheme (D/F/L/N/O/P/Q/R) — **that's stale.** The real
  2026 data uses 10 categories: 소매, 부동산, 음식, 시설관리·임대, 보건의료, 교육,
  숙박, 예술·스포츠, 수리·개인, 과학·기술 (mapped to `PoiCategory` in
  `client/src/shared/schemas.ts`).
  Verify category taxonomies against real data before hardcoding a schema.
- **`category_name`** = `상권업종소분류명` (minor category, 247 distinct values)
  — deliberately the finest granularity, because "카페", "헬스장", and "편의점"
  all exist as their own 소분류 values — the exact vocabulary the deck's example
  query uses. Lifestyle-preference matching should filter/score on
  `category_name`, not just `category`.
- The nationwide download is split by province (Seoul/Gyeonggi/etc. are
  250-350MB each) — **only the Busan file is kept** in `samples/poi/`; the
  other 17 provinces were deleted after confirming Busan-only coverage is all
  this project needs (that was the single biggest contributor to the original
  ~2GB raw download).
- Bulk-inserted via `asyncpg`'s `executemany()` in batches of 2,000 rows
  against a fixed parameterized `INSERT ... VALUES (..., ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography)`
  query — much simpler than the original TS version's hand-built multi-row
  `VALUES` string, since `executemany` handles batching natively.
- `address` prefers `도로명주소`, falling back to `지번주소` if blank.
- `district` = `시군구명` (matches `housing_project.source_district`'s format).

## Part 3 — GIS shapefiles (`samples/gis/`)

Loaded via `api/scripts/seed_gis.py`, which shells out to `ogr2ogr`
(GDAL) — **never hand-parse `.shp` in code.** Uses `subprocess.run()` with an
argv list (not `shell=True`), so Korean/paren/comma filenames never need
shell-escaping (`api/scripts/lib/gis.py`).

| Folder | Source | Table | Rows | Status |
|---|---|---|---|---|
| `gis/admin_boundary/` | vworld 행정구역도 (link #1) | `admin_boundary` | 192 | ✅ loaded |
| `gis/zoning/` | vworld 용도지역지구, AL_D124 도시지역 Busan slice (link #4) | `commercial_zone` | 3,308 | ✅ loaded, **every row labeled** |
| `gis/building/` | vworld 도로명주소 건물, TL_SPBD_BULD (link #5) | `building` | 379,711 | ✅ loaded, reference-only (see geocoding note) |

### The zoning-source story (link #4) — how we got to AL_D124

Three sources were tried, in this order:

1. **`AL_D011_00_20260709`** (first download's second file) — a scattered
   nationwide preview sample, 480 features across ~17 provinces, useless.
   Was kept as `gis/zoning_unverified/` for a while; deleted now.
2. **`LSMD_CONT_UQ111_26_202606`** — real Busan coverage (3,307 features)
   but it's a *designation-history* table: only ~500 rows carried an
   `ALIAS` zone label; the rest were history entries. The original
   `commercial_zone` load and the "filter `zone_type IS NOT NULL`" rule
   came from this era.
3. **`AL_D124_00_20260719`** (full nationwide 국토계획/도시지역 file,
   ~1GB download) — the current-state layer. Its Busan slice
   (`A4 LIKE '26%'`, 3,308 features, ~10MB) has a human-readable zone name
   (`A6`: 제2종일반주거지역/자연녹지지역/…) on **every** row and the
   `UQAxxx` code directly in `A5`. This slice is what now ships as
   `gis/zoning/AL_D124_26_20260719.*` inside `samples.zip` — the 1GB
   nationwide download is **not** needed by teammates.

Neighborhood zoning shares now cover ~99.5% of a radius area instead of
the sparse coverage the LSMD labels gave. `WHERE zone_type IS NOT NULL`
still works (it's now a no-op filter).

**관리지역 (AL_D125) / 농림지역 (AL_D126): Busan has none.** Verified
against the nationwide files: zero polygons with Busan district codes, and
zero polygons spatially intersecting the Busan admin boundary (the nearby
hits in a bbox check are all 김해/양산, 경남). The 원천데이터 링크's "use 3
layers" note is generic nationwide advice — for Busan, 도시지역 alone is
complete coverage. Don't spend time re-downloading these.

### CRS gotchas

- `admin_boundary` and `commercial_zone` source shapefiles ship with a `.prj`
  (EPSG:5186, Korea 2000 / Central Belt 2010) — `ogr2ogr -t_srs EPSG:4326` picks
  the source SRS up automatically from it.
- `building` (`TL_SPBD_BULD.Busan.shp`) has **no `.prj` file**. Verified by
  testing: `-s_srs EPSG:5179` (Korea 2000 / Unified CS, the standard CRS for
  this national address-building dataset) reprojects correctly — sample
  building centroids land at real Busan coordinates (129.0x, 35.1x). If you
  ever re-derive this file and it lands somewhere absurd, that's the parameter
  to double check first.
- All three source layers have **EUC-KR-encoded DBF attribute text** — pass
  `SHAPE_ENCODING=EUC-KR` as an env var to `ogr2ogr`, confirmed against each
  file's `.cst` sidecar where present.
- `-nlt PROMOTE_TO_MULTI` is required on every layer — Busan's boundaries
  include islands/exclaves that export as MultiPolygon, and a plain Polygon
  target column rejects those rows. `commercial_zone` was originally defined
  as `Polygon` in `001_init.sql` before any real zoning data existed; migration
  `003_gis_layers.sql` widens it to `MultiPolygon`.

### Geocoding via `building` — tested, doesn't work well enough to use

The obvious idea: match `housing_project.project_name` against `building.
buld_name` to backfill `housing_project.geom` for free. **Tested against the
real data — don't do this as the primary geocoding strategy:**

- Only 6 of 41 housing projects get any exact name match at all.
- Of those 6, only **3 resolve to one unambiguous physical location**
  (두산킹덤, 명성하이빌, 명성갤러리3). The rest match the *same name* at
  multiple different sites across the city — e.g. "센텀뷰" matches 6 distinct
  locations, so blindly taking any one of them risks placing a housing project
  at the wrong building entirely, which is worse than leaving it ungeocoded.

**Verdict: real geocoding requires the Kakao geocoding API** (address string →
lat/lng), not this shapefile — **and that's what's actually running now.**
`api/scripts/lib/geocode.py` + `just geocode` (host-run) successfully geocoded all 41 `housing_project`
rows via the Kakao Local API. `building` is still loaded because building
footprints are legitimate reference data (map rendering, potential future
road-name+building-number matching if a road-code lookup table is ever
sourced), just not what actually solved geocoding.

## Part 4 — population grid (`samples/population_grid_UNPLACEABLE/`) — blocked

sgis's 인구격자 (population grid) download is 150 CSVs (~176MB), format:

```
2024,가다,in_age_002,5
```

`(year, grid_tile_code, stat_field, value)` — **no coordinates, no geometry,
anywhere in this download.** `가다`/`가라`/`나사`/etc. are SGIS's grid-tile
codes at 5 resolutions (100m/500m/1km/10km/100km, encoded in the filename
suffix), but decoding a tile code into an actual bounding box requires either:

1. SGIS's grid-boundary shapefile (distributed separately from the statistics
   CSVs — **not what was downloaded here**), or
2. SGIS's documented grid-origin/cell-size formula, reimplemented by hand.

Neither is in hand right now. **This data cannot be placed on a map or joined
to anything spatially until the boundary file is sourced.** Don't attempt a
guessed coordinate mapping — a silently-wrong grid placement is worse than an
honestly-empty `industry_population_grid` table. If you get the boundary file
later, `api/scripts/seed_gis.py` is the place to add the ingestion — the
`industry_population_grid` table (jsonb `industry_mix` + `population_density`
per polygon) is already migrated and waiting, just empty.

Because it's unusable, this folder is **excluded from `samples.zip`** — if
you want it locally, download link #3 yourself into
`samples/population_grid_UNPLACEABLE/`. The 선도소프트 POP_STORE shapefiles
(Part 5) carry population *with* geometry and are what actually fills
`industry_population_grid` and the density layer now.

### Population sources — `seed_population.py` picks automatically

`api/scripts/seed_population.py` (runs inside `just seed`, after GIS) fills
`admin_boundary.population` (the density heat layer) from the first
available source:

1. `samples/population/busan_population.csv` — a hand-aggregated
   `code,population` CSV (실제 주민등록 figures; 8-digit 법정동 codes match
   exactly, 5-digit 구 codes distribute across member 동 by area). Not
   distributed anywhere — if a teammate has it, dropping it in wins over
   source 2. Explicit path: `just population <csv>` (api/).
2. The 선도소프트 POP_STORE grid (Part 5), latest year found — each grid
   cell's 총인구 (`P_Val`) is split across the admin boundaries it overlaps
   proportionally to overlap area (areal interpolation). The same pass
   fills `industry_population_grid` (franchise counts + density/km² per
   cell). Slight coastal undercount is inherent (cell fractions over water
   attribute nothing) — fine for a relative choropleth.

Neither present → soft skip; seeding continues, the layer stays empty.

## Part 5 — 선도소프트 융합데이터 (`samples/2026_DIVE_해커톤_제공데이터_선도소프트/`)

The 2026 handout's second half: three fusion datasets as per-year shapefile
zips (2021–2024, ~143MB zipped, ~2.5GB unzipped — which is why they are
**not in `samples.zip`**). **How teammates get them:** drop
`2026_DIVE_해커톤_제공데이터_선도소프트.zip` at the repo root — `just
onboard` unzips it into this folder (tolerating a nested top-level dir) —
or copy the `01.`/`02.`/`03.` folders in by hand.

These files contain **stores and population, not housing** — the 41→355
housing-project jump came from the BMC CSVs (Part 1), which ship in
`samples.zip`; nothing here adds houses.

| Folder | Contents | Ingested? |
|---|---|---|
| `01. 상가-건물 융합데이터/` | STORE_BUD shapefiles, 21–24년 | no — the raw 상가정보 behind it is already loaded as `commercial_poi` (Part 2) |
| `02. 인구-5대업종 가맹점 융합데이터/` | POP_STORE shapefiles, 22–24년 | **yes** — `seed_population.py` fills `admin_boundary.population` + `industry_population_grid` from the latest year (see Part 4) |
| `03. 상권-주거 융합데이터/` | STORE_USE_AREA shapefiles, 23–24년 | no — zoning ratios already come from `commercial_zone` (Part 3) |

`컬럼정의서.xlsx` (the column dictionary for all three) is small and ships
in `samples.zip`. The inner shapefile zips have **EUC-KR-mangled inner
filenames in some years** — `seed_population.py` extracts via Python
`zipfile` and finds the `.shp` by extension, never by name. Encodings of
DBF text vary by year (check each `.cpg`), but only numeric columns are
read, so it doesn't bite. When ingesting `01`/`03` later, follow the same
staging pattern.
