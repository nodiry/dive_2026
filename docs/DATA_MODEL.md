# Data model — source data → Postgres

Read this before touching anything under `api/app/db*`, `api/app/scripts/`,
or the migrations. The raw files are genuinely confusing — this doc is the
result of actually loading them and fixing what broke. (Backend is Python/
FastAPI now, not the original Bun/Express/TypeScript — see PLAN.md §4. The
data gotchas below are unchanged either way; only the file paths moved.)

**Where the data lives:** `samples/` at the repo root — gitignored (it's
~560MB), distributed as a separate zip via Google Drive. See root `README.md`
for the drop-in/seed instructions. Every path below is relative to `samples/`.

```
samples/
  housing/        6 BMC CSVs (Part 1)
  poi/            business_busan.csv (Part 2)
  gis/            admin_boundary/, zoning/, zoning_unverified/, building/ (Part 3)
  population_grid_UNPLACEABLE/   (Part 4 — currently unusable, see below)
```

## Part 1 — BMC housing CSVs (`samples/housing/`)

### Gotcha #1: encoding

All 6 CSVs are **EUC-KR encoded, not UTF-8**. Reading them with the wrong
encoding silently mangles every Korean field into replacement characters —
always read them via `api/app/lib/csv_utils.py#read_csv`, which defaults to
`encoding="euc-kr"`.

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
| 매입임대 (purchased) | `purchased` | `purchased_units.csv` | `purchased_price.csv` |
| 재개발임대 (redevelopment) | `redevelopment` | `combined_units.csv` (filtered by `임대주택유형`) | `redevelopment_price.csv` |
| 통합공공임대 (integrated) | `integrated` | same combined file | `integrated_price.csv` |
| 행복주택 (happy) | `happy` | same combined file | `happy_price.csv` |

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

- `사용승인일` / `준공일자` (both mean "built/completion date") are `YYYYMMDD`
  strings (e.g. `20251130`) — parsed via `dateFromYYYYMMDD`.
- `등록일` (registered date, price files only) is `MM-DD-YYYY HH:MM:SS` — parsed
  via `timestampFromMMDDYYYY`. Don't confuse the field order with the built-date
  format, they're different despite both being dates.
- `승강기설치구분` is the literal string `설치`/`미설치` (installed/not) →
  boolean via `elevatorFromLabel`.
- Numeric fields (`세대수`, `표준보증금`, `주차대수`, ...) are comma-grouped
  strings like `"1,134"` — always go through `toNumber`, never `Number()`.
- `순위` (rank, purchased-price file only) uses the literal string `NA` for
  missing — `toNumber` treats `NA` as `null`.
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
`api/app/scripts/seed_poi.py`. **155,103 rows, every one with valid
coordinates already — no geocoding needed for this file.**

- **Encoding: UTF-8**, not EUC-KR — the opposite of the BMC CSVs. The file's own
  read-me (`poi/README.txt`) explains why: an older EUC-KR extract was
  corrupting business names, so this cut switched to UTF-8. `read_csv()` takes
  an explicit `encoding` param (`"euc-kr"` default, pass `"utf-8"` for this
  file) — don't assume one encoding for every source file in this project.
- **`category`** = `상권업종대분류명` (major category). The OT deck's slide
  implied an 8-category scheme (D/F/L/N/O/P/Q/R) — **that's stale.** The real
  2026 data uses 10 categories: 소매, 부동산, 음식, 시설관리·임대, 보건의료, 교육,
  숙박, 예술·스포츠, 수리·개인, 과학·기술 (mapped to `PoiCategory` in
  `packages/shared/src/schemas.ts` and mirrored in `api/app/models.py`).
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

Loaded via `api/app/scripts/seed_gis.py`, which shells out to `ogr2ogr`
(GDAL) — **never hand-parse `.shp` in code.** Uses `subprocess.run()` with an
argv list (not `shell=True`), so Korean/paren/comma filenames never need
shell-escaping (`api/app/lib/gis.py`).

| Folder | Source | Table | Rows | Status |
|---|---|---|---|---|
| `gis/admin_boundary/` | vworld 행정구역도 (link #1) | `admin_boundary` | 192 | ✅ loaded |
| `gis/zoning/` | vworld 용도지역지구, LSMD_CONT_UQ111 (link #4) | `commercial_zone` | 3,307 | ✅ loaded |
| `gis/zoning_unverified/` | vworld 용도지역지구, AL_D011 (link #4, other file) | — | — | ❌ **not loaded, see below** |
| `gis/building/` | vworld 도로명주소 건물, TL_SPBD_BULD (link #5) | `building` | 379,711 | ✅ loaded, reference-only (see geocoding note) |

### `gis/zoning_unverified/` — do not load this one

Link #4's download contained *two* shapefiles. `AL_D011_00_20260709` looked
like the real zoning data at a glance, but inspection showed it's a **scattered
nationwide preview sample** — only 480 features total, region codes (`A4`
field) spanning ~17 different provinces with only 2-3 incidentally in Busan.
That's not usable regional coverage; it reads like a generic/default VWorld
catalog preview rather than a real Busan extract. `LSMD_CONT_UQ111` (loaded
into `commercial_zone`) is the real one — confirmed by its feature count
(3,307), its extent matching Busan exactly, and real zone-type Korean text
(`준공업지역`, `일반상업지역`, `자연녹지지역`, `1종일반주거지역`, etc.) once
decoded. If you re-download link #4, request a Busan-scoped export explicitly
rather than trusting whatever comes back by default.

Also worth knowing: only ~500 of `commercial_zone`'s 3,307 rows have a non-null
`zone_type` — the rest are administrative-history entries (this LSMD_CONT
layer is a "designation history" table; most rows only carry an `NTFDATE` /
`REMARK`, not an actual zone label). Filter `WHERE zone_type IS NOT NULL` for
anything that needs a real zone classification.

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
`api/app/lib/geocode.py` + `docker compose exec api python -m
app.scripts.geocode_housing` successfully geocoded all 41 `housing_project`
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
later, `api/app/scripts/seed_gis.py` is the place to add the ingestion — the
`industry_population_grid` table (jsonb `industry_mix` + `population_density`
per polygon) is already migrated and waiting, just empty.
