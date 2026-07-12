# DIVE 2026 — 상권·취향 기반 공공임대주택 추천 서비스
## Project Plan

Track partner: **부산도시공사(BMC) × ㈜선도소프트(Sundosoft)**
Event: DIVE 2026, BEXCO Exhibition Center 2, 4F — **on-site build 7/25 14:00 → 7/26 14:00 (24h)**
Track lock-in deadline: **7/13 18:00** (first-come, 12 teams/track cap)
Doc author: solo prep 7/12 → ~7/19, then 2 teammates join

---

## 1. Problem statement (from the track deck)

Busan lost ~240k residents in 10 years; ~50% of people who win the public-housing
lottery decline to move in. The stated root causes:

- Housing is discovered through flat, supply-side notices (size, deposit) with no
  sense of the neighborhood.
- No way to check nearby commercial infrastructure (cafés, gyms, convenience
  stores) without manually searching after reading a notice.
- No personalization to lifestyle/taste.

**What we're building:** a web (and optionally app) service where a citizen can
either (a) describe their lifestyle/consumption habits and get housing ranked by
how well the surrounding commercial district matches, or (b) enter hard
conditions (deposit ceiling, building age, room count) and get filtered matches —
both example flows are explicitly given in the track deck (p.9):

> "내가 자주 가는 카페, 헬스장, 편의점이 가까운 임대주택 어디야?"
> "5년 이내 신축, 보증금 3천만원 미만 주택 추천해줘"

Deliverable per the deck: **앱/웹 서비스** (app/web service).

## 2. Judging rubric — build to this, not just to "cool"

| Category | Points | What it rewards |
|---|---|---|
| 문제 정의 (Problem definition) | 15 | Clear, specific problem framing |
| 발제사 데이터 활용 (Use of partner data) | 15 | BMC + Sundosoft data actually load-bearing, not decorative |
| 창의성/차별성 | 15 | A genuinely different angle vs. a filter form |
| 데이터 기반 문제해결 | 20 | Real collection → analysis → insight pipeline |
| 서비스 완성도 (UI/UX) | 20 | Feels finished, intuitive, working end-to-end |
| 정책 활용 가능성 | 15 | Could BMC plausibly deploy this? |

Takeaway: **explainable scoring + polished UI beats a black-box model.** Don't
spend the week on ML sophistication — spend it on a clean, defensible geo-scoring
pipeline and a UI that doesn't feel like a form.

## 3. Data inventory (what we actually have vs. what's still pending)

### BMC — tabular, real sample CSVs (Suyeong-gu / Gijang-gun) — ✅ ingested
- `행복, 통합, 재개발 주택정보(샘플)` — unit-level: address, 준공일자(built date),
  세대수, 주택형, 동/호, 방수, 전용면적, 승강기, 주차대수
- `매입임대 주택정보(샘플)` — same shape for 매입임대 (purchased-rental) stock
- 4× 보증금/임대료 tables — deposit & rent per project/unit-type, some segmented
  by 소득구간(income bracket)/공급계층(supply class, e.g. 청년/대학생)
- Full city-wide dataset ships **day-of** via the public data portal — treat
  everything now as a schema reference, not final volume.

### Sundosoft's own promised deliverable — still not out
`[참고자료]선도소프트 원천데이터 링크/원천데이터 링크.txt` is 5 links to *public
open-data portals* Sundosoft used to build their fused layers — not the
deliverable itself. The deck (p.10) says the real deliverable is 3 SHP layers
(상가-건물 융합정보, 5대업종-인구 융합정보, 상권-주거 융합정보) via Google Drive,
noted as "추후 제공 예정" — still not out as of this writing. We're not waiting
on it; we're sourcing the same raw layers ourselves from the 5 reference links.

### The 5 reference links — sourcing progress

| # | Source | Status | Covers |
|---|---|---|---|
| 1 | vworld 행정구역도 | ✅ downloaded + **ingested** (`admin_boundary`, 192 rows) | city-wide 동 boundary polygons, all 16 districts |
| 2 | data.go.kr 소상공인시장진흥공단 상가정보 | ✅ downloaded + **ingested** (`commercial_poi`, 155,103 rows) | this is Sundosoft's 상가-건물 융합정보 raw source — cafés/gyms/convenience stores/etc, real coordinates on every row |
| 3 | sgis 인구격자 데이터 | ⚠️ downloaded, **genuinely blocked** — no boundary geometry in the download, can't be placed spatially (see `docs/DATA_MODEL.md` Part 4) | would feed `industry_population_grid` |
| 4 | vworld 용도지역지구도 | ✅ downloaded + **ingested** (`commercial_zone`, 3,307 rows) — but the download had *two* files, and one (`AL_D011`) turned out to be a scattered nationwide preview sample, not real Busan coverage; only the other one (`LSMD_CONT_UQ111`) was usable | zoning polygons |
| 5 | vworld 도로명주소 건물 | ✅ downloaded + **ingested** (`building`, 379,711 rows) as reference data — tested as a free geocoding shortcut (name-matching against housing project names), only 3/41 projects resolve unambiguously, **not usable as the primary geocoding strategy** | building footprints |

All 5 links are now sourced. Data quality varies a lot — some data.go.kr/vworld
downloads are exactly what they claim to be, one (link #4's `AL_D011`) wasn't,
and link #3 is missing a piece it needs (grid geometry) that isn't part of the
statistics download at all. Full details, gotchas, and CRS notes for every
layer are in `docs/DATA_MODEL.md`.

## 4. Architecture decisions

| Concern | Decision | Why |
|---|---|---|
| Language | TypeScript everywhere | your call, and both scaffolds already match |
| Backend runtime | Bun + **Express** (`Bun.sql` for Postgres) | team decision — popular/familiar choice over `Bun.serve()`; `api/CLAUDE.md` updated to stop contradicting this |
| Database | **PostgreSQL + PostGIS** (Docker) | you have real spatial data (SHP) and need `ST_DWithin`/KNN for "housing near matching cafés" — this is the one call to get right early |
| SHP ingestion | `ogr2ogr` (GDAL, installed) straight into PostGIS | far more reliable than parsing `.shp` in JS |
| Geocoding | Kakao/VWorld geocoding API | BMC's address field is a road-name string with no lat/lng — you must geocode before anything spatial works |
| Frontend | Vite + React 19 + TS (already scaffolded) + Tailwind | fast to onboard 2 more devs, no CSS bikeshedding |
| Map | Kakao Maps JS SDK | best Korean address/POI support, free tier fine |
| Shared contracts | `packages/shared` with Zod schemas | single source of truth for API request/response so 3 people don't drift |
| Data fetching | TanStack Query | standard, low-ceremony |

### Repo hygiene — ✅ done
- Single monorepo, `api`/`client`/`packages/shared` bun workspaces, `git init`
  at root. `client`'s old orphan `.git` (empty, zero commits) is gone.
- `.env.example` at root (`DATABASE_URL`, `KAKAO_MAP_KEY`, `KAKAO_REST_API_KEY`)
  — never commit real keys. Note the two Kakao keys are **not interchangeable**
  (JS key for the browser map SDK, REST key for server-side geocoding).
- `docker-compose.yml` with `postgis/postgis`, mapped to **port 5433** (not
  5432 — see §4 architecture table).
- `samples/` (the ~560MB raw data) is **not in git** — gitignored, distributed
  as a zip via Google Drive, dropped into the repo root by hand. Every
  ingestion script fails fast with an actionable message if it's missing
  (`api/src/lib/paths.ts#requireSamplesDir`).
- `bun run seed` — one command that loads *everything* in `samples/` (housing,
  POI, admin boundary, zoning, buildings) into local Postgres from a clean
  clone, in ~80 seconds. This is the single highest-leverage thing for
  onboarding a new teammate.

## 5. Data model — ✅ implemented and verified against real data

```
housing_project
  id, type ('happy'|'integrated'|'redevelopment'|'purchased'), project_name,
  address, geom geography(Point) [NULL until geocoded — see §7], built_date,
  total_units, source_district

housing_unit
  id, project_id -> housing_project, dong, ho, room_count,
  area_m2, has_elevator, parking_spots

housing_price
  id, project_id, unit_type, deposit, rent, registered_at,
  segment jsonb  -- shape varies per type, see docs/DATA_MODEL.md

commercial_poi        -- ✅ 155,103 rows (data.go.kr 상가정보, link #2)
  id, geom geography(Point), category, category_name, biz_name, address, district

admin_boundary        -- ✅ 192 rows (vworld 행정구역도, link #1)
  id, emd_code, emd_name, sgg_code, geom geography(MultiPolygon)

commercial_zone       -- ✅ 3,307 rows (vworld 용도지역지구, link #4)
  id, zone_type, geom geography(MultiPolygon)   -- only ~500 rows have a non-null zone_type, rest are history entries

building              -- ✅ 379,711 rows (vworld 도로명주소 건물, link #5) — reference only, not a geocoding shortcut
  id, buld_name, emd_code, geom geography(MultiPolygon)

industry_population_grid   -- ❌ still empty — sgis data has no boundary geometry, genuinely blocked (docs/DATA_MODEL.md Part 4)
  id, geom geography(Polygon), industry_mix jsonb, population_density
```

`segment` ended up as jsonb rather than fixed columns — each housing type
segments price by a genuinely different dimension (income bracket+household
size for 통합공공임대, supply class for 행복주택, protection class for
재개발임대, rank+unit-name for 매입임대). Full mapping, plus every gotcha found
while ingesting (EUC-KR encoding, 매입임대's address format mismatch, CRS
reprojection per layer, the bad zoning file) are in **`docs/DATA_MODEL.md`** —
read that before touching any schema or `seed*.ts` file.

## 6. API surface — ✅ v1 built and verified live

- `GET /api/housing?depositMax=&builtAfter=&roomCount=&district=&type=` — condition-based search (example 2 in the deck)
- `GET /api/housing/:id` — detail lookup
- `POST /api/recommendations/lifestyle` — body: `{ preferences: [{categoryName, weight}], district?, depositMax?, radiusMeters? }` → ranked housing with per-category score breakdown (example 1). Tested live with temporarily-backfilled coordinates (reverted afterward) — ranking, filters, and empty-result edge cases all correct. Returns `[]` today only because no housing is geocoded yet, not because the logic is wrong.

Dropped from the original plan: `GET /api/areas/:code/stats` (dashboard/
creativity nice-to-have) — not built, not blocking anything, revisit if there's
spare time later.

## 7. Recommendation logic — ✅ implemented as planned, blocked only on geocoding

1. Hard filters first (deposit ceiling, district; room count/built-year on the
   condition-search endpoint) — plain SQL `WHERE`/`HAVING`.
2. For remaining candidates, per-category proximity via PostGIS `ST_DWithin`
   against `commercial_poi`, matched on `category_name` (e.g. "카페", "헬스장",
   "편의점" — see `docs/DATA_MODEL.md` Part 2 on why `category_name`, not the
   broader `category`, is the right granularity).
3. Score per category = `weight × matched_count × closeness`, where closeness
   is 1 at distance 0 and 0 at the radius edge — rewards both quantity and
   proximity, stays explainable.
4. Response includes the full per-category breakdown (count + nearest distance
   for every requested category, including zero-match ones) — serves the
   UI/UX and 정책 활용 가능성 rubric lines directly, since a black-box score is
   neither trustworthy nor demoable.

**The only remaining gap is geocoding, not the scoring logic.**
`housing_project.geom` is `NULL` for every row — `api/src/lib/geocode.ts`
(Kakao Local API client) and `bun run geocode` (batch script, skips
already-geocoded rows) are built and ready, just need a live
`KAKAO_REST_API_KEY`. The moment that key exists and `bun run geocode` runs
once, the recommendation endpoint starts returning real results with zero
other code changes.

Optional differentiator (창의성, if time allows): blend in
`industry_population_grid` to characterize a neighborhood's "vibe" — currently
blocked (§3, link #3), revisit only if the boundary geometry gets sourced.

## 8. Frontend screens (v1)

1. Preference intake (lifestyle checklist + budget + district) — the taste quiz
2. Recommendation results — ranked cards + map, each with its score breakdown
3. Condition-based search — classic filter form, reuses the same result view
4. Housing detail — unit specs, deposit/rent, nearby amenities list, mini-map
5. (nice-to-have) Compare / save favorites

## 9. Timeline

### Phase 0 — today/tomorrow (7/12–7/13)
- [ ] Confirm track selection in Discord team channel before **7/13 18:00**
- [x] All 5 reference-link data sources sourced (§3) — huge shift from "we don't have the files" to "all downloaded, 4 of 5 usable"
- [ ] Get Kakao Maps JS key **and** REST API key (two different keys, same app) — **the one credential actually blocking end-to-end demo results**
- [x] `git init` at root, bun workspaces (`api`, `client`, `packages/shared`) + Docker Compose + `.env.example`

### Phase 1 — solo week (7/12–~7/19)
- [x] PostGIS running locally via Docker — **note: mapped to port 5433, not 5432**, since many dev machines already have a native Postgres bound to 5432 that silently wins over `localhost:5432`
- [x] Ingestion scripts: all 6 BMC sample CSVs → `housing_project`/`housing_unit`/`housing_price`, verified end-to-end (2,527 units / 676 price rows loaded, 0 unmatched)
- [x] Commercial POI ingestion: 155,103 real Busan businesses (data.go.kr 상가정보) → `commercial_poi`, spatial radius query verified using the GIST index
- [x] `ogr2ogr` → PostGIS for admin boundary (192 rows), zoning (3,307 rows), and buildings (379,711 rows) — all verified with real Busan coordinates. `industry_population_grid` stays empty — genuinely blocked, not just unsourced (docs/DATA_MODEL.md Part 4)
- [x] Geocoding **infrastructure** built (Kakao Local API client + `bun run geocode` batch script, tested for its error path) — but blocked on getting a live `KAKAO_REST_API_KEY`. Tested name-matching against the building layer as a free alternative; only ~7% unambiguous match rate, not usable as the real strategy (docs/DATA_MODEL.md Part 3)
- [x] `bun run seed` working end-to-end from clean clone — loads housing + POI + all 3 usable GIS layers in ~80s, from a 98MB zip dropped into the repo root
- [x] API v1: condition search (`GET /api/housing`, `GET /api/housing/:id`) — verified live against seeded data, on Express
- [x] API v1: lifestyle recommendation endpoint — built, scoring verified live (temporarily-backfilled test coordinates, reverted after). Returns `[]` today only because no housing is geocoded yet
- [ ] Frontend skeleton: routing, map component wired to Kakao SDK, preference intake screen, results list rendering real API data — **next up, nothing else blocks starting this**
- [x] `docs/DATA_MODEL.md` + root `README.md` written — covers every gotcha found across housing CSVs, POI data, and all 3 GIS layers
- [ ] Split remaining work into clearly scoped modules for 2 incoming teammates (e.g. Person A: frontend map/preference screens; Person B: frontend detail/results screens; you: geocoding once the key lands, integration, demo data, API hardening)

### Phase 2 — team of 3 (~7/19–7/24)
- [ ] Feature-complete UI/UX pass, both flows working smoothly
- [ ] Verify ETL abstraction can point at the full city-wide dataset without code changes (only re-run ingestion against new files)
- [ ] Seed a realistic demo dataset for rehearsal (don't wait for event day to test the demo path)
- [ ] Pitch deck + rehearsed walkthrough

### Phase 3 — event (7/25–7/26)
- [ ] Swap sample ingestion for the full released dataset (this is why the ETL scripts must be data-agnostic, not hardcoded to Suyeong-gu/Gijang-gun)
- [ ] Final polish, deploy, submit, present

## 10. Open risks

- **Geocoding is now the single blocking dependency** for demoing the
  lifestyle recommendation flow with real results — everything else it needs
  (POI data, scoring logic, API endpoint) is done and verified. Get the Kakao
  REST key early; don't let this slip to the week of the event.
- Geocoding volume/rate limits once full city-wide data lands — cache
  aggressively (skip already-geocoded rows, which `bun run geocode` already
  does), geocode incrementally.
- `industry_population_grid` may simply stay empty for the whole project —
  the "vibe" differentiator (§7) is a nice-to-have, not load-bearing, so this
  isn't a critical risk, just a lost creativity opportunity if never resolved.
- Track deck explicitly says pre-event time is meant for "understanding + review,
  not development" — building now is still the right call (normal hackathon
  practice), just keep the architecture flexible since the *real* dataset only
  exists on 7/25.
- The OT deck's data descriptions have now been wrong three times (Sundosoft's
  own SHP samples not actually being in the linked Drive folder; the POI
  category taxonomy being stale; and one of link #4's two zoning files being a
  scattered nationwide preview sample, not real Busan coverage) — treat the
  deck as directional only, always verify against the real files (row counts,
  coordinate extents, actual field values) before building on top of anything
  it describes.
