# New data audit (2026-07-25 event-day drop)

Findings from auditing the hackathon's real data drop against the seeding
pipeline built on the sample data. Read alongside `docs/DATA_MODEL.md`,
which documents the *sample* data currently in `samples/`. Nothing in this
audit has been applied yet, no code has been changed.

**Where the drop lives:** `../new_data/` (sibling of this repo, not inside
it), containing:

```
new_data/
  2026_DIVE_해커톤_제공데이터_부산도시공사/     6 housing CSVs (Part 1)
  2026_DIVE_해커톤_제공데이터_선도소프트/       9 zipped shapefiles + 컬럼정의서.xlsx (Part 2)
  [참고자료]부산도시공사 모집공고/              공고문 hwpx/pdf, reference only
  [참고자료]선도소프트 원천데이터 링크/          source links (Part 3)
```

Headline: the housing pipeline still maps 1:1 onto the new files and the
joins are cleaner than the sample's, but four format changes break the
ingest silently. The Sundosoft drop is a different shape entirely from
what `seed_poi.py` reads today, and it unblocks the population grid that
`DATA_MODEL.md` Part 4 records as impossible.

---

## Part 1 — BMC housing CSVs

Source: `new_data/2026_DIVE_해커톤_제공데이터_부산도시공사/`

### File mapping

| Current `samples/housing/` | New file | Rows (old → new) |
|---|---|---|
| `combined_units.csv` | `행복, 통합, 재개발 주택정보_20260630.csv` | 2,219 → 5,933 |
| `purchased_units.csv` | `매입임대 주택정보_20260630.csv` | 308 → 3,121 |
| `purchased_price.csv` | `매입임대 표준보증금 및 임대료_20260630.csv` | 325 → 3,859 |
| `redevelopment_price.csv` | `재개발임대 표준보증금 및 임대료_20260630.csv` | 2 → 20 |
| `integrated_price.csv` | `통합공공임대 표준보증금 및 임대료_20260630.csv` | 324 → 324 |
| `happy_price.csv` | `행복주택 표준보증금 및 임대료_20260630.csv` | 25 → 195 |

### What still works, unchanged

Verified against the new files, no code change needed for any of these:

- `HOUSING_TYPE_MAP` — the new `임대주택유형` values are exactly
  `통합공공임대주택` / `재개발임대주택` / `행복주택` (combined file) and
  `매입임대` (purchased file).
- `strip_dong_suffix()` — still doing real work. 2,818 of 3,121 purchased
  unit addresses carry the `(동명,건물명)` suffix that the price file omits.
- `district_from_address()` — all 355 distinct addresses resolve a district.
- `elevator_from_label()` — still the literal `설치` / `미설치`.
- `to_number()` — numbers lost their comma grouping (`1,134` is now `395`
  style plain digits), and some carry trailing whitespace (`"139000 "`).
  Both are already handled.

### The 4 breaking changes

**1. Encoding flipped to UTF-8 (with BOM), except one file.**

`read_csv()` in `api/scripts/lib/csv_utils.py` defaults to `euc-kr`, which
now either raises or mangles.

| File | Encoding |
|---|---|
| `행복, 통합, 재개발 주택정보` | utf-8-sig |
| `매입임대 주택정보` | utf-8-sig |
| `재개발임대 표준보증금 및 임대료` | utf-8-sig |
| `통합공공임대 표준보증금 및 임대료` | utf-8-sig |
| `행복주택 표준보증금 및 임대료` | utf-8-sig |
| `매입임대 표준보증금 및 임대료` | **euc-kr** (the only holdout) |

Do not hardcode one encoding for the set. Detecting per file by trying
`utf-8-sig` then falling back to `euc-kr` was tested against all 6 and
correctly identifies each, because EUC-KR Korean text reliably fails a
UTF-8 decode and vice versa.

**2. Four columns renamed, all by appending a unit.**

These fail *silently*: `row.get()` returns `None`, `to_number(None)`
returns `None`, and the ingest completes with null columns and no error.

| Old name | New name | Read by |
|---|---|---|
| `전용면적` | `전용면적(제곱미터)` | both unit files → `housing_unit.area_m2` |
| `표준보증금` | `표준보증금(원)` | 3 price files → `housing_price.deposit` |
| `표준임대료` | `표준임대료(원)` | 3 price files → `housing_price.rent` |
| `가구인원수` | `가구인원수(명)` | integrated price → `segment.householdSize` |

**3. Built-date format changed to ISO.**

`준공일자` (combined) and `사용승인일` (purchased) went from `20251130` to
`2019-10-06`. `date_from_yyyymmdd()` regex-matches `\d{8}` and so returns
`None` for **every row**. Verified: 20 distinct `준공일자` values and 314
distinct `사용승인일` values, all ISO, none parseable by the current helper.

**4. Registered-date format changed to a bare ISO date.**

`등록일` went from `01-14-2026 08:19:46` (MM-DD-YYYY plus time) to
`2026-01-14` (date only, no time). `timestamp_from_mmddyyyy()` returns
`None` for **every row** across all 4 price files.

### Non-breaking changes worth knowing

- `순위` in the purchased price file was the literal string `NA` in the
  sample, and is a real integer (`1`) now. `to_number` handles both.
- `소득구간` went from `"01"` to `"1"`. It only lands in the
  `housing_price.segment` jsonb, which nothing in the API or client
  currently reads, so this is inert.
- New `평형타입` column on the combined units file (values like `19A`),
  replacing the sample's `주택형` on that same file. Neither is read by
  `seed_housing.py`. Note the *price* files still use `주택형`, which is
  read, and that one did not change.
- `주택명` in the purchased price file is now a real building name
  (`'20년 공공리모델링주택(남산동)`) rather than a bare dong name
  (`광안동`). The leading apostrophe is a genuine part of the name
  (shorthand for 2020년), not an Excel artifact to strip.

### Join integrity: better than the sample

All verified against the new files:

| Join | Result |
|---|---|
| 재개발임대 price `사업지구` → combined `임대주택명` | 11/11 matched |
| 통합공공임대 price `사업지구` → combined `임대주택명` | 1/1 matched |
| 행복주택 price `사업지구` → combined `임대주택명` | 7/7 matched |
| 매입임대 price 주소 → units 주소 (after `strip_dong_suffix`) | **336/336 matched** |
| 매입임대 units 주소 with no price row | **0** |

The purchased-housing gap documented in `DATA_MODEL.md` Part 1 ("BMC
independently sampled the two files") is gone. Both files now cover the
same 336 addresses exactly.

### Scale, and what it means for geocoding

| | Sample | New |
|---|---|---|
| `housing_project` rows | 41 | **355** |
| — 매입임대 | ~30 | 336 |
| — 재개발임대주택 | — | 11 |
| — 행복주택 | — | 7 |
| — 통합공공임대주택 | — | 1 |
| Districts covered | 2 (수영구, 기장군) | **15 of 16** |

Districts present: 금정구, 기장군, 남구, 동구, 동래구, 부산진구, 북구,
사상구, 사하구, 서구, 수영구, 연제구, 영도구, 중구, 해운대구. Only 강서구
is absent, because BMC has no listed housing there.

Consequences:

- `just geocode` goes from 41 to 355 Kakao Local API calls. At the current
  `asyncio.sleep(0.1)` politeness delay that is roughly 1 to 2 minutes,
  well inside Kakao's daily quota. `KAKAO_REST_API_KEY` required.
- `upsert_project` preserves `geom` on conflict, which is good, but the 41
  sample-era projects that do not exist in the new data would linger as
  stale rows with valid geoms. A clean load (`docker compose down -v`,
  then migrate, seed, geocode) is the right move rather than a re-seed on
  top.

---

## Part 2 — Sundosoft partner data

Source: `new_data/2026_DIVE_해커톤_제공데이터_선도소프트/`

This is **not** the same shape as what `seed_poi.py` ingests today. The
current POI source is `samples/poi/business_busan.csv`, the raw
소상공인시장진흥공단 CSV from data.go.kr. The new drop is Sundosoft's own
*fused* product: 9 zipped shapefiles across 3 datasets and 4 years.
Column semantics are documented in the drop's own `컬럼정의서.xlsx`
(3 sheets: 상가-건물, 인구-업종, 상권-주거).

### 01. 상가-건물 융합데이터

Years 21 through 24. Latest is `24년/부산_26.zip` → layer `STORE_BUD_26`.

- **161,449 features**, Polygon geometry (building footprints), EPSG:5181.
- Also carries `LO` / `LA` (경도/위도) columns. **All 161,449 rows have
  valid Busan WGS84 coordinates**, verified by bounds check. So this can
  populate `commercial_poi.geom` as a POINT with no reprojection work.
- `.cpg` says **UTF8**.

Column mapping onto the existing `commercial_poi` table is 1:1:

| `commercial_poi` | `STORE_BUD_26` | Current CSV equivalent |
|---|---|---|
| `category` | `CMSC_L_NM` | `상권업종대분류명` |
| `category_name` | `CMSC_S_NM` | `상권업종소분류명` |
| `biz_name` | `CM_NM` | `상호명` |
| `address` | `RDNMADR`, fallback `LNNO_ADRES` | `도로명주소` / `지번주소` |
| `district` | `SIGNGU_NM` | `시군구명` |
| `geom` | `LO`, `LA` | `경도`, `위도` |

Taxonomy compatibility, verified by querying the shapefile directly:

- `CMSC_L_NM` yields **exactly the 10 keys already in
  `MAJOR_CATEGORY_MAP`**, no unmapped values: 음식 (56,173), 소매 (40,484),
  수리·개인 (20,870), 과학·기술 (13,252), 교육 (7,736), 예술·스포츠 (6,160),
  부동산 (6,046), 시설관리·임대 (5,778), 숙박 (2,646), 보건의료 (2,304).
- `CMSC_S_NM` has **246 distinct values** against the current data's 247.
- The lifestyle categories the recommendation engine matches on all exist:
  카페 (7,643), 편의점 (2,753), 헬스장 (993).

So swapping the POI source needs no change to `PoiCategory`,
`client/src/constants/poi.ts`, `personas.ts`, or the recommendation
service's `category_name` matching. Only `seed_poi.py` changes, from CSV
parsing to ogr2ogr staging.

Beyond the POI columns, this layer also carries building attributes the
current `building` table lacks: `GRND_FLCT` / `UNDR_FLCT` (floors above
and below ground), `RGST_BD_NM` (건축물대장건물명), `BD_PRPS_CD`
(건물용도코드), `PNU` (필지고유번호), `FLR_INFO` / `HO_INFO`.

### 02. 인구-5대업종 가맹점 융합데이터

Years 22 through 24. Latest is `24년/POP_STORE_부산광역시.zip`.

**This unblocks `DATA_MODEL.md` Part 4.** That section records the sgis
population grid as unusable because the download had "no coordinates, no
geometry, anywhere." This file is the same grid *with* its boundaries.

- **79,935 features**, Polygon geometry, EPSG:5179, `.cpg` = UTF-8.
- Cell size is **exactly 100m x 100m** (verified: mean polygon area's
  square root is 100.0).
- `GID` is the SGIS grid-tile code (e.g. `마라151697`), the same code
  family as the filenames in `samples/population_grid_UNPLACEABLE/`.
- Total `P_Val` = **3,256,463**, which matches Busan's real population.
  Good sanity signal that this is the full-city grid, not a sample.

Attributes per cell:

- Population: `P_Val` total, `P_M` / `P_W` by gender, and the same three
  splits per decade band `P_20_*` through `P_60_*` (18 population fields).
- Franchise store counts: `D_COFFEE`, `D_CSV` (편의점), `D_KFOOD` (한식),
  `D_PHARM` (약국), `D_SALON` (이미용).
- `SD_CD` / `SD_ID` 시도 identifiers.

Cross-check against dataset 01: `sum(D_COFFEE)` = 7,643, which is exactly
the 카페 count in `STORE_BUD_26`. The two datasets are internally
consistent.

The `industry_population_grid` table (`api/src/gis/models.py`) is already
migrated and empty, with `geom` MULTIPOLYGON, `industry_mix` jsonb, and
`population_density` numeric. The 5 `D_*` counts fit `industry_mix`
directly. `population_density` would be `P_Val` scaled to persons per km²
(each cell is 0.01 km², so `P_Val * 100`). The age and gender breakdown
has no home in the current schema.

### 03. 상권-주거 융합데이터

Years 23 and 24. Latest is `24년/STORE_USE_AREA_부산광역시.zip`.

- **29,441 features**, Polygon, EPSG:5186, `.cpg` = UTF-8.
- Same 18 population fields and 5 `D_*` store counts as dataset 02, plus:
  - `UCODE` / `UNAME` — 용도지역 (zoning) per cell. Top values:
    자연녹지지역 (6,818), 일반상업지역 (5,471), 제3종일반주거지역 (4,720),
    미지정 (1,875), 준공업지역 (1,177), 준주거지역 (1,085),
    제1종일반주거지역 (236).
  - `BSST_YN` — 버스정류장여부, a per-cell bus-stop flag.

This is a pre-joined population-plus-zoning-plus-transit layer. The
zoning labels are the same vocabulary as `commercial_zone.zone_type`,
which the Detail page's neighborhood profile TagStrip already renders.

### Landmine: hardcoded shapefile encoding

`api/scripts/lib/gis.py#ogr2ogr_to_staging` sets
`SHAPE_ENCODING=EUC-KR` unconditionally:

```python
env = {**os.environ, "SHAPE_ENCODING": "EUC-KR"}
```

That is correct for the vworld layers in `samples/gis/`, but **every**
Sundosoft `.cpg` declares UTF-8. `SHAPE_ENCODING` overrides the `.cpg`
sidecar, so loading any new layer through this helper mangles all Korean
text (상호명, 업종명, 용도지역명). The encoding needs to become a
parameter before any of these files are ingested.

Full `.cpg` inventory across the drop:

| Dataset | Year | `.cpg` |
|---|---|---|
| 상가-건물 | 21 | UTF-8 |
| 상가-건물 | 22 | *(none)* |
| 상가-건물 | 23 | UTF8 |
| 상가-건물 | 24 | UTF8 |
| 인구-업종 | 22 | UTF-8 |
| 인구-업종 | 23 | **949** (CP949 / EUC-KR) |
| 인구-업종 | 24 | UTF-8 |
| 상권-주거 | 23 | UTF-8 |
| 상권-주거 | 24 | UTF-8 |

Note the 23년 인구-업종 file is the one exception. If only the 24년 files
are used, UTF-8 is uniform.

---

## Part 3 — source links, unchanged

`[참고자료]선도소프트 원천데이터 링크/원천데이터 링크.txt` lists the same 5
sources already used to build `samples/gis/`:

1. 부산시 행정구역도 (vworld dsId=30603) → `admin_boundary`
2. 소상공인시장진흥공단 상가정보 (data.go.kr 15083033) → current `commercial_poi`
3. 인구격자 데이터 (sgis) → the blocked Part 4 grid
4. 용도지역지구도 (vworld dsId=24) → `commercial_zone`
5. 행안부 도로명주소 건물 (vworld dsId=30056) → `building`

So `samples/gis/` needs no re-download. One footnote: link #4 now
specifies **three** sub-datasets (국토계획/도시지역, 관리지역, 농림지역).
`seed_gis.py` loads `LSMD_CONT_UQ111`, the 도시지역 half only. Whether the
other two matter depends on whether any housing sits in 관리지역 or
농림지역, which is unlikely inside Busan's urban core but not verified.

---

## Summary of required changes

Ordered by whether they are forced or optional.

### Forced, to seed the new housing data at all

1. `lib/csv_utils.py#read_csv` — per-file encoding detection
   (`utf-8-sig` then `euc-kr`), and drop or repurpose the `encoding` param
   (`seed_poi.py` passes `encoding="utf-8"` today).
2. `lib/csv_utils.py` — date parsing must accept ISO. `date_from_yyyymmdd`
   needs `%Y-%m-%d` alongside `%Y%m%d`; `timestamp_from_mmddyyyy` needs
   bare `%Y-%m-%d` alongside `%m-%d-%Y %H:%M:%S`.
3. `seed_housing.py` — read the 4 renamed columns. Tolerating both
   spellings keeps the committed `samples.zip` loadable for teammates who
   have not swapped data yet.
4. File placement: the 6 new CSVs need to land in `samples/housing/` under
   the names `paths.py` and `seed_housing.py` expect, or those paths need
   updating.
5. Clean reload rather than re-seed, so the 41 sample-era projects do not
   linger.

### Forced, before ingesting any Sundosoft shapefile

6. `lib/gis.py#ogr2ogr_to_staging` — make `SHAPE_ENCODING` a parameter.

### Open decisions, not yet made

- **POI source swap.** Move `commercial_poi` off `business_busan.csv` onto
  `STORE_BUD_26`. It is a drop-in on taxonomy, coordinates, and schema,
  and partner-data usage is in the judging rubric (`docs/REQUIREMENTS.md`).
  Cost is rewriting `seed_poi.py` from CSV parsing to ogr2ogr staging.
- **Population grid.** Seed `industry_population_grid` from `POP_STORE`.
  Low risk on its own. Optionally rewire the density heat layer to read
  real 100m cells, which would retire the "구-level uniform across each 구's
  동s" caveat in `CONTEXT.md`, but that touches the
  `GET /api/districts/density` endpoint and the KakaoMap canvas overlay.
- **상권-주거 layer.** No table exists for it. Its per-cell zoning and
  bus-stop flag would be new capability rather than a swap.
