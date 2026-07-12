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

## 3. Data inventory (what we actually have vs. what's just a link)

### BMC — tabular, already have real sample CSVs (Suyeong-gu / Gijang-gun)
- `행복, 통합, 재개발 주택정보(샘플)` — unit-level: address, 준공일자(built date),
  세대수, 주택형, 동/호, 방수, 전용면적, 승강기, 주차대수
- `매입임대 주택정보(샘플)` — same shape for 매입임대 (purchased-rental) stock
- 4× 보증금/임대료 tables — deposit & rent per project/unit-type, some segmented
  by 소득구간(income bracket)/공급계층(supply class, e.g. 청년/대학생)
- Full city-wide dataset ships **day-of** via the public data portal — treat
  everything now as a schema reference, not final volume.

### Sundosoft — GIS, **we don't actually have the files yet**
This is the "list of links" you're annoyed about, and it's two different things
mixed together:
1. `[참고자료]선도소프트 원천데이터 링크/원천데이터 링크.txt` — 5 links to
   *public open-data portals* (vworld, data.go.kr, sgis) that Sundosoft used to
   *build* their fused layers. These are optional raw sources, not the deliverable.
2. The deck itself (p.10) says the real deliverable is 3 SHP layers (상가-건물
   융합정보, 5대업종-인구 융합정보, 상권-주거 융합정보) via a **Google Drive
   folder link**, with a note "최종 데이터는 추후 구글드라이브를 통해 제공 예정"
   — i.e. even Sundosoft's own sample may not be fully dropped yet.

**Action item #1 (do this today):** open
`https://drive.google.com/drive/folders/19Z-o2HbYlaLVRkkizo93KCSWbRIs4oaw` and
check whether the actual `.shp` sample files are there. If not, ask in the
Discord track channel — don't wait, since spatial schema drives your DB design.

## 4. Architecture decisions

| Concern | Decision | Why |
|---|---|---|
| Language | TypeScript everywhere | your call, and both scaffolds already match |
| Backend runtime | Bun (`Bun.serve`, `Bun.sql`) | already scaffolded in `api/`, per its `CLAUDE.md` |
| Database | **PostgreSQL + PostGIS** (Docker) | you have real spatial data (SHP) and need `ST_DWithin`/KNN for "housing near matching cafés" — this is the one call to get right early |
| SHP ingestion | `ogr2ogr` (GDAL) straight into PostGIS | far more reliable than parsing `.shp` in JS |
| Geocoding | Kakao/VWorld geocoding API | BMC's address field is a road-name string with no lat/lng — you must geocode before anything spatial works |
| Frontend | Vite + React 19 + TS (already scaffolded) + Tailwind | fast to onboard 2 more devs, no CSS bikeshedding |
| Map | Kakao Maps JS SDK | best Korean address/POI support, free tier fine |
| Shared contracts | `packages/shared` with Zod schemas | single source of truth for API request/response so 3 people don't drift |
| Data fetching | TanStack Query | standard, low-ceremony |

### Repo hygiene (fix before teammates join)
- Root `dive_2026/` is not a git repo; `client/` has its own orphan `.git`.
  Decide: single monorepo (recommended) — `git init` at root, fold `client/.git`
  history in or just drop it (it's a fresh scaffold, no real history to lose),
  add `api/`, `client/`, `packages/shared/` as one repo with bun workspaces.
- `.env.example` at root (`DATABASE_URL`, `KAKAO_MAP_KEY`, etc.) — never commit
  real keys.
- `docker-compose.yml` with a `postgis/postgis` image so nobody installs Postgres
  locally.
- `bun run seed` — one command that loads all sample CSV/SHP into local Postgres.
  This is the single highest-leverage thing for onboarding: a new teammate should
  go from `git clone` to a running app with real-looking data in under 10 minutes.

## 5. Data model — ✅ implemented and verified against real BMC sample data

```
housing_project
  id, type ('happy'|'integrated'|'redevelopment'|'purchased'), project_name,
  address, geom geography(Point) [NULL until geocoded], built_date, total_units,
  source_district

housing_unit
  id, project_id -> housing_project, dong, ho, room_count,
  area_m2, has_elevator, parking_spots

housing_price
  id, project_id, unit_type, deposit, rent, registered_at,
  segment jsonb  -- shape varies per type, see docs/DATA_MODEL.md

commercial_poi        -- from 상가-건물 융합정보 (SHP) — empty, pending Sundosoft data
  id, geom geography(Point), category, category_name, biz_name

industry_population_grid   -- from 5대업종-인구 융합정보 (SHP) — empty, pending
  id, geom geography(Polygon), industry_mix jsonb, population_density

commercial_zone       -- from 상권-주거 융합정보 (SHP) — empty, pending
  id, geom geography(Polygon), zone_type
```

`segment` ended up as jsonb rather than fixed columns — each housing type
segments price by a genuinely different dimension (income bracket+household
size for 통합공공임대, supply class for 행복주택, protection class for
재개발임대, rank+unit-name for 매입임대). Full mapping, plus two real gotchas
found while ingesting (EUC-KR encoding, and 매입임대's address format mismatch
between its two source files) are in **`docs/DATA_MODEL.md`** — read that
before touching the schema or `seedHousing.ts`.

## 6. API surface (v1)

- `GET /api/housing?deposit_max=&built_after=&room_count=&district=` — condition-based search (example 2 in the deck)
- `POST /api/recommendations/lifestyle` — body: preferred POI categories + weights + budget → ranked housing with score breakdown (example 1)
- `GET /api/housing/:id` — detail + nearby POIs within radius, grouped by category
- `GET /api/areas/:code/stats` — commercial/industry context for a district (dashboard/creativity angle)

## 7. Recommendation logic (v1 — explainable, no ML needed)

1. Hard filters first (deposit ceiling, room count, built-year, district) — plain SQL `WHERE`.
2. For remaining candidates, precompute per-category proximity via PostGIS
   `ST_DWithin`/`<->` KNN against `commercial_poi` (e.g. counts/nearest-distance
   within 300m/500m per category).
3. Score = weighted sum of per-category proximity scores, weights = user's
   selected preference strength.
4. Return ranked list **with the "why"** (e.g. "카페 3곳, 헬스장 1곳 — 320m
   이내") — this directly serves the UI/UX and 정책 활용 가능성 rubric lines,
   since a black-box score is neither trustworthy nor demoable.

Optional differentiator (창의성, if time allows): blend in
`industry_population_grid` to characterize a neighborhood's "vibe" (youth-heavy
vs. family-heavy commercial mix) as a secondary match dimension.

## 8. Frontend screens (v1)

1. Preference intake (lifestyle checklist + budget + district) — the taste quiz
2. Recommendation results — ranked cards + map, each with its score breakdown
3. Condition-based search — classic filter form, reuses the same result view
4. Housing detail — unit specs, deposit/rent, nearby amenities list, mini-map
5. (nice-to-have) Compare / save favorites

## 9. Timeline

### Phase 0 — today/tomorrow (7/12–7/13)
- [ ] Confirm track selection in Discord team channel before **7/13 18:00**
- [x] Checked the Google Drive folder — it's real, but currently only has the 5-link reference txt (action item #1). Sundosoft's actual SHP samples aren't out yet; sourcing them is manual, from vworld/data.go.kr/sgis (accounts opened, files pending)
- [ ] Get Kakao Maps API key
- [x] `git init` at root, bun workspaces (`api`, `client`, `packages/shared`) + Docker Compose + `.env.example`

### Phase 1 — solo week (7/12–~7/19)
- [x] PostGIS running locally via Docker — **note: mapped to port 5433, not 5432**, since many dev machines already have a native Postgres bound to 5432 that silently wins over `localhost:5432`
- [x] Ingestion scripts: all 6 BMC sample CSVs → `housing_project`/`housing_unit`/`housing_price`, verified end-to-end (2,527 units / 676 price rows loaded, 0 unmatched). `ogr2ogr` → PostGIS for SHP layers still pending real Sundosoft files (stub in `api/src/scripts/ingest-gis.ts`)
- [ ] Geocoding step for BMC addresses (batch script, cache results — don't re-geocode on every run)
- [x] `bun run seed` working end-to-end from clean clone (migrate + ingest-housing; ingest-gis is a no-op stub for now)
- [x] API v1: condition search (`GET /api/housing`, `GET /api/housing/:id`) — verified live against seeded data
- [ ] API v1: lifestyle recommendation endpoint (heuristic scoring) — blocked on Sundosoft POI data existing
- [ ] Frontend skeleton: routing, map component wired to Kakao SDK, preference intake screen, results list rendering real API data
- [x] `docs/DATA_MODEL.md` + root `README.md` written — includes two real gotchas found while ingesting (EUC-KR encoding, 매입임대 address-format mismatch across its two files)
- [ ] Split remaining work into clearly scoped modules for 2 incoming teammates (e.g. Person A: recommendation engine + ingestion refinement; Person B: detail/compare screens + map polish; you: integration, demo data, API hardening)

### Phase 2 — team of 3 (~7/19–7/24)
- [ ] Feature-complete UI/UX pass, both flows working smoothly
- [ ] Verify ETL abstraction can point at the full city-wide dataset without code changes (only re-run ingestion against new files)
- [ ] Seed a realistic demo dataset for rehearsal (don't wait for event day to test the demo path)
- [ ] Pitch deck + rehearsed walkthrough

### Phase 3 — event (7/25–7/26)
- [ ] Swap sample ingestion for the full released dataset (this is why the ETL scripts must be data-agnostic, not hardcoded to Suyeong-gu/Gijang-gun)
- [ ] Final polish, deploy, submit, present

## 10. Open risks

- Sundosoft SHP schema unknown until the Drive folder is actually checked — could reshape the data model.
- Geocoding volume/rate limits once full city-wide data lands — cache aggressively, geocode incrementally.
- Track deck explicitly says pre-event time is meant for "understanding + review,
  not development" — building now is still the right call (normal hackathon
  practice), just keep the architecture flexible since the *real* dataset only
  exists on 7/25.
