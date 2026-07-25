# Technical Reference

Architecture, stack decisions, data model, and the recommendation algorithm.
For what to *build* see `docs/REQUIREMENTS.md`; for where code actually lives
see `docs/CODE.md`; for raw-file-level ingestion gotchas see
`docs/DATA_MODEL.md`; for UI rules see `docs/STYLE_GUIDE.md`.

## Stack

| Concern | Decision | Why |
|---|---|---|
| Backend | Python + FastAPI + SQLModel (async sessions) | domain-driven layout (housing/poi/recommendation/gis), mirrors the team's SHOES-PLATFORM conventions |
| Migrations | alembic autogenerate | geoalchemy2-aware `env.py`; PostGIS/tiger internals excluded from diffs |
| Python deps | uv (`pyproject.toml` + `uv.lock`) | pinned, fast, one lockfile |
| ETL scripts | plain asyncpg (`api/scripts/`, host-run) | bulk `executemany` loading; an ORM buys nothing here |
| Frontend | Vite + React 19 + TS + Tailwind v4 | fast to onboard, no CSS bikeshedding |
| Client state | zustand (`useExploreStore`, `useSavedHousingStore`, `useToastStore`) | server state stays in TanStack Query; the two never overlap |
| Server state | TanStack Query (+ axios client with zod validation) | caching/refetch lifecycle for free |
| i18n | react-i18next, JSON catalogs in `constants/i18n/` | ko default, en toggle, LanguageDetector persistence |
| Animation | motion (`MotionConfig reducedMotion='user'`) | list reordering springs, panel entrances, respects OS setting |
| Database | PostgreSQL + PostGIS (`imresamu/postgis:16-3.4`) | native arm64 image — the official `postgis/postgis` is amd64-only and runs under slow emulation on Apple Silicon |
| SHP ingestion | `ogr2ogr` (GDAL, host-installed) | far more reliable than parsing `.shp` in application code |
| Geocoding | Kakao Local API (REST key) | BMC's address field is a road-name string with no lat/lng |
| Map | Kakao Maps JS SDK (JS key) | best Korean address/POI support |
| Task running | just (root justfile + api/justfile) | one verb set everywhere; bun lives only inside `client/`, no root package.json |
| API contracts | `client/src/shared/schemas.ts` zod schemas, hand-mirrored in `api/src/*/schemas.py` (pydantic, camelCase aliases) | keep both in sync manually when either changes |

### History: two backend ports

The backend was originally Bun/Express/TS, then ported to Python/FastAPI
with raw asyncpg queries, then restructured to SQLModel async sessions in a
domain-driven `src/` layout (SHOES-PLATFORM conventions). The plain-SQL
migrations were replaced by alembic at the same time; the old
`app/`-layout docs and `bun run` script aliases are gone. The ETL scripts
deliberately stayed on raw asyncpg.

### SQLModel typing rules (ty)

- `sqlmodel.select()` is typed for at most 4 entities; use
  `sqlalchemy.select` for wider projections (only the recommendation
  window query needs it).
- Wrap model attributes in `col()` for `.in_()/.is_()/.is_not()` and inside
  `func.*` — SQLModel fields are plain annotations, not `Mapped[]`, so the
  checker otherwise sees `int | None` instead of a column expression.
- Don't switch `session.execute` to `session.exec` for subquery selects —
  `exec` scalar-collapses single-entity selects and would silently drop
  columns (there's one deliberate `# ty: ignore[deprecated]` for this).

## Docker layout

Compose at the repo root, services:

- **db** — `imresamu/postgis:16-3.4` (arm64-native), host port **5433**
  (many dev machines have a native Postgres on 5432).
- **api** — `python:3.13-slim` + uv, port 3000, `pull_policy: build` (every
  `up` rebuilds; layer cache makes no-change rebuilds ~instant),
  `src/` bind-mounted with uvicorn `--reload`. The image contains the
  application and alembic migrations, so `docker compose exec api uv run
  --no-sync alembic upgrade head` works. GDAL and ETL scripts remain
  host-run concerns.
- **client** — behind the `full` profile (`docker compose --profile full up`)
  because day-to-day frontend work runs on the host
  (`just client` → Vite on :5173, the Kakao-whitelisted port).

`.dockerignore` files (one per service — `api/.dockerignore`,
`client/.dockerignore`) keep contexts small; each service builds from its
own directory, not the repo root.

## Onboarding

`just onboard` → `scripts/onboard.sh`, idempotent:

1. Fail-fast host prereq checks: **docker, bun, uv, just, GDAL** (`brew
   install just gdal` covers the last two on macOS).
2. `api/.env` / `client/.env` created from examples if missing.
3. `samples.zip` unzipped to `samples/` if needed; if
   `2026_DIVE_해커톤_제공데이터_선도소프트.zip` sits at the repo root it is
   merged into `samples/` too (population data — optional).
4. `bun install` (in `client/`) + `uv sync` (api venv).
5. `docker compose up -d` (db + api), then host-side
   `alembic upgrade head` in a retry loop (Postgres's init briefly
   restarts after first reporting healthy).
6. Host-side seed (housing + POI + GIS + population when source data is
   present), then geocoding if `KAKAO_REST_API_KEY` is set (skips with
   instructions otherwise).

`DATABASE_URL` must use the `postgresql+asyncpg://` dialect — host `.env`
points at `localhost:5433`, compose overrides with `db:5432` for the
container. `ENVIRONMENT=local` enables `/docs`.

## Data model

```
housing_project   id, type ('purchased'|'redevelopment'|'integrated'|'happy'),
                  project_name, address, geom geography(Point) [NULL until geocoded],
                  built_date, total_units, source_district
                  (355 projects city-wide from the 2026-06-30 BMC handout)
housing_unit      project_id FK, dong, ho, room_count, area_m2, has_elevator, parking_spots
housing_price     project_id FK, unit_type, deposit, rent, registered_at,
                  segment jsonb (shape varies per housing type, see docs/DATA_MODEL.md)
commercial_poi    155,103 rows; category = ENGLISH SLUG of 상권업종대분류명
                  ('retail'/'food'/... mapped at ingest), category_name = Korean
                  소분류 ("카페"...), biz_name, address, district, geom
admin_boundary    192 rows (vworld 행정구역도)
commercial_zone   3,307 rows; only ~500 have non-null zone_type — filter on it
building          379,711 rows, reference only
industry_population_grid  filled from the 선도소프트 POP_STORE grid when present
                          (jsonb industry_mix + population_density; docs/DATA_MODEL.md Parts 4-5)
```

Tables are defined as SQLModel models (`api/src/*/models.py`) with
geoalchemy2 `Geography` columns; alembic autogenerate reproduces the index
names via the naming convention in `src/models.py`. Table models inherit
`SQLModel` directly (not the timestamped `Base`) because seeds insert via
raw SQL.

## Recommendation algorithm

1. Hard filters (deposit/rent ceilings via grouped-min subqueries, district,
   type, minimum area/rooms, elevator, parking)
   on `housing_project`, candidates capped at 200.
2. Per-category proximity via `ST_DWithin` against `commercial_poi`,
   matched on `category_name` (fine granularity — "카페"/"헬스장"/"편의점").
3. FUN uses café, exercise and dining access. WORK combines the user's
   selected destination straight-line distance with nearby work amenities.
   REST uses residential/commercial/green zoning ratios within 700m.
4. Weekly routine fit is a frequency-weighted score. Activities that the
   available data cannot measure return neutral values with `unavailable`
   evidence rather than invented estimates.
5. The final score is lifestyle 42%, routine 28%, housing fit 18%, and
   affordability 12%. The response includes that breakdown plus the top-5
   nearest POIs per category for map pins/trails.

The frontend runs this **live**: there is no search button anywhere.
Criteria fields debounce into an always-on query; preference weights/radius
changes re-run the mutation after 450ms.

### Neighborhood profile (phase 4)

`GET /api/housing/:id/neighborhood` returns POI counts by major category
(`ST_DWithin` group) and the zoning mix: each 용도지역's share of the radius
area via `ST_Buffer` + `ST_Intersection` + `ST_Area` over
`commercial_zone`. This is what makes the zoning layer load-bearing.

VWorld zoning's human-readable `ALIAS` is blank on many records. Alembic
migration `7b7b4257e9c1` adds `commercial_zone.zone_code`, and `seed_gis.py`
extracts the stable `UQAxxx` code from `MNUM`.

## Known gotchas / debugging notes

- **asyncpg date/timestamp strictness** — scripts must pass real
  `datetime.date/datetime` objects, not strings (`api/scripts/lib/csv_utils.py`).
- **Postgres init-restart race** — see Onboarding above.
- **Kakao map `ERR_BLOCKED_BY_ORB`** — the JS key's allowed domain isn't
  registered: Kakao console → 플랫폼 설정 → Web → add `http://localhost:5173`.
- **Two Kakao keys, not interchangeable** — REST key in `api/.env`
  (geocoding), JS key in `client/.env` (map SDK).
- **alembic + geoalchemy2** — geoalchemy2 auto-creates spatial GiST indexes
  during `create_table`; autogenerated revisions must not also emit
  `create_index` for `idx_*_geom` (env.py filters them, plus an
  `include_name` whitelist so PostGIS/tiger internals never enter diffs).
- **Kakao SDK has no maxBounds** — the Busan pan clamp is a
  `center_changed` listener + `setMaxLevel`; the Detail page instead uses
  `staticView` (dragging/zooming disabled).
- **`docker compose up` needs no `--build`** — `pull_policy: build` handles
  it. If a ghcr.io pull is denied, a stale login is being sent:
  `docker logout ghcr.io`.
- **Secrets hygiene** — `.env` files are gitignored; `.env.example` files
  hold placeholders only. If a real key lands in a commit, rotate it.
- **`client/node_modules` stale copies** — always run `bun install` inside
  `client/`, its own standalone bun project (no root workspace).
