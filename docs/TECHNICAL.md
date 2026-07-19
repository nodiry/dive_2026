# Technical Reference

Architecture, stack decisions, data model, and the recommendation algorithm.
For what to *build* see `docs/REQUIREMENTS.md`; for where code actually lives
see `docs/CODE.md`; for raw-file-level ingestion gotchas see
`docs/DATA_MODEL.md`.

## Stack

| Concern | Decision | Why |
|---|---|---|
| Backend | Python + FastAPI + asyncpg | see "Why the switch" below |
| Frontend | Vite + React 19 + TS + Tailwind v4 + React Router + TanStack Query | fast to onboard new devs, no CSS bikeshedding |
| Database | PostgreSQL + PostGIS (Docker) | real spatial data (SHP) needs `ST_DWithin`/KNN for "housing near matching cafés" |
| Deployment | Docker for everything (db + api + client, one `docker-compose.yml`) | reproducible for teammates, no host Python/Bun-version drift |
| SHP ingestion | `ogr2ogr` (GDAL, in the api image) straight into PostGIS | far more reliable than parsing `.shp` in application code |
| Geocoding | Kakao Local API (REST key) | BMC's address field is a road-name string with no lat/lng |
| Map | Kakao Maps JS SDK (JS key) | best Korean address/POI support, free tier fine |
| API contracts | `packages/shared` Zod schemas (frontend) mirrored by hand in `api/app/models.py` (Pydantic) | no longer literally shared code across the language boundary — keep both in sync manually when either changes |

### Why the switch from Bun/Express to Python/FastAPI

Team decision, not a technical failure of the TS stack (it was fully working
— condition search, recommendation scoring, all ingestion — before the
switch). The full TS implementation was ported faithfully: same SQL, same
migrations (the `.sql` files didn't need to change at all — migrations are
plain SQL, language-agnostic), same field-mapping gotchas, same API contract
(routes, JSON shapes, camelCase over the wire).

One real bug surfaced during the port: **asyncpg is strict about parameter
types** — it rejects a Python string for a `date`/`timestamp`-typed column
parameter (`postgres.js`/Bun.sql coerced this automatically; asyncpg does
not). Every date/timestamp value goes through real `datetime.date`/
`datetime.datetime` objects before hitting the DB — see
`api/app/lib/csv_utils.py`.

## Docker layout

Three services, one `docker-compose.yml` at the repo root:

- **db** — `postgis/postgis:16-3.4`, host port **5433** (not 5432 — many dev
  machines already have a native Postgres on 5432, which would otherwise
  silently win over `localhost:5432` connections). Containers talk to each
  other via the service name `db` on the internal Docker network.
- **api** — `python:3.12-slim` + `gdal-bin`, port 3000, hot-reloads via a
  bind-mounted `api/app` volume.
- **client** — `oven/bun:1`, port 5173, build context is the *repo root*
  (needs `packages/shared` as a bun workspace member), hot-reloads via
  bind-mounted `client/src` + `packages/shared/src`.

## Onboarding automation

`bun run onboard` → `scripts/onboard.sh` does the entire flow in one
command, and is safe to re-run (idempotent) at any point:

1. Create `api/.env` / `client/.env` from `.env.example` if missing (never
   overwrites an existing one — your real keys survive re-runs).
2. Unzip `samples.zip` → `samples/` if not already unzipped.
3. `docker compose up -d --build` (db + api + client).
4. Wait for the api container, then run migrations — wrapped in a retry
   loop because Postgres's own init sequence briefly restarts even after
   `pg_isready`/compose `service_healthy` reports ready (temp startup for
   initdb scripts → shutdown → real startup); a connection attempt landing
   in that gap gets `ECONNREFUSED` otherwise.
5. Seed the database (housing + POI + GIS layers).
6. **Geocode housing addresses** — only if `api/.env` has a non-empty
   `KAKAO_REST_API_KEY`. On a genuinely fresh clone (no keys yet) this step
   prints instructions and exits cleanly instead of failing; once you add
   real keys and re-run `bun run onboard`, this step runs for real.

This was verified against an actual simulated fresh clone (deleted both
`.env` files, deleted `samples/`, wiped the DB volume with
`docker compose down -v`) — both with and without Kakao keys present — not
just written and assumed to work.

`housing_project` rows are upserted (`ON CONFLICT`) during seeding, so
re-seeding never wipes an already-geocoded `geom` column. `housing_unit`,
`housing_price`, and `commercial_poi` are `TRUNCATE`d before each re-insert
so re-running the seed never silently duplicates rows.

## Data model

```
housing_project
  id, type ('happy'|'integrated'|'redevelopment'|'purchased'), project_name,
  address, geom geography(Point) [NULL until geocoded], built_date,
  total_units, source_district

housing_unit
  id, project_id -> housing_project, dong, ho, room_count,
  area_m2, has_elevator, parking_spots

housing_price
  id, project_id, unit_type, deposit, rent, registered_at,
  segment jsonb  -- shape varies per housing type, see docs/DATA_MODEL.md

commercial_poi        -- 155,103 rows (data.go.kr 상가정보)
  id, geom geography(Point), category, category_name, biz_name, address, district

admin_boundary        -- 192 rows (vworld 행정구역도)
  id, emd_code, emd_name, sgg_code, geom geography(MultiPolygon)

commercial_zone       -- 3,307 rows (vworld 용도지역지구)
  id, zone_type, geom geography(MultiPolygon)   -- only ~500 rows have non-null zone_type, rest are history entries

building              -- 379,711 rows (vworld 도로명주소 건물) -- reference only, not a geocoding shortcut
  id, buld_name, emd_code, geom geography(MultiPolygon)

industry_population_grid   -- still empty, genuinely blocked (docs/DATA_MODEL.md Part 4)
  id, geom geography(Polygon), industry_mix jsonb, population_density
```

`segment` is jsonb rather than fixed columns because each housing type
segments price by a genuinely different dimension (income bracket + household
size for 통합공공임대, supply class for 행복주택, protection class for
재개발임대, rank + unit-name for 매입임대). Full field-by-field mapping and
every ingestion gotcha (encoding, CRS, address-format mismatches, the bad
zoning file) is in `docs/DATA_MODEL.md`.

## Recommendation algorithm

1. Hard filters first (deposit ceiling, district; room count/built-year on
   the condition-search endpoint) — plain SQL `WHERE`/`HAVING`.
2. For remaining candidates, per-category proximity via PostGIS
   `ST_DWithin` against `commercial_poi`, matched on `category_name` (e.g.
   "카페", "헬스장", "편의점" — see `docs/DATA_MODEL.md` Part 2 on why
   `category_name`, not the broader `category`, is the right granularity).
3. Score per category = `weight × matched_count × closeness`, where
   closeness is 1 at distance 0 and 0 at the radius edge — rewards both
   quantity and proximity, stays explainable.
4. Response includes the full per-category breakdown (count + nearest
   distance for every requested category, including zero-match ones) —
   a black-box score is neither trustworthy nor demoable, and this directly
   serves the 서비스 완성도 / 정책 활용 가능성 rubric lines.

Verified live with real geocoded data: a housing project with 75 cafés
within 500m (closest 11m) correctly outranks sparser candidates.

## Known gotchas / debugging notes

- **asyncpg date/timestamp strictness** — see "Why the switch" above.
- **Postgres init-restart race** — see "Onboarding automation" above.
- **Kakao map `ERR_BLOCKED_BY_ORB`** — if the map shows a "couldn't load"
  placeholder, the JS key's allowed domain isn't registered: Kakao
  Developers console → app → 플랫폼 설정 → Web 플랫폼 → 사이트 도메인, add
  `http://localhost:5173`. Kakao returns HTTP 401 to browser-origin requests
  from unregistered domains, which Chromium then blocks as
  `ERR_BLOCKED_BY_ORB` — a console setting, not a code bug.
- **Two Kakao keys, not interchangeable** — `KAKAO_REST_API_KEY` (`api/.env`)
  is for server-side geocoding; `VITE_KAKAO_MAP_KEY` (`client/.env`) is the
  browser JS-SDK key. Both come from the same Kakao app, at
  https://developers.kakao.com/console/app.
- **Secrets hygiene** — `.env` files are gitignored and must never be
  committed; `.env.example` files must only ever contain placeholder/blank
  values. A real key was accidentally committed to `client/.env.example`
  once during this project (commit `3b2f9b9`) — if you ever find a real
  secret in a committed file, rotate it immediately in the relevant
  console; editing the file afterward does not undo the exposure once it's
  been pushed.
- **Tailwind v4 `@import` ordering warning** — `client/src/index.css` logs a
  harmless PostCSS warning about `@import` ordering (Tailwind's own
  `@import "tailwindcss"` expands inline to a large block, which trips a
  strict "no other statements before @import" check for the following
  Pretendard font import). The font still loads fine in the browser; this
  is a build-time notice only, not a runtime bug.
- **`client/node_modules` stale copies** — "Invalid hook call"/"multiple
  copies of React" errors when running things outside Docker mean a
  workspace package's `node_modules` has a stale non-symlinked copy. Always
  run `bun install` from the repo root, never inside an individual
  workspace package.
