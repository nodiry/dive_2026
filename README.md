# DIVE 2026 — 상권·취향 기반 공공임대주택 추천 서비스

A public-housing recommendation service for BMC(부산도시공사) × Sundosoft's
DIVE 2026 hackathon track — recommend public rental housing by matching a
citizen's lifestyle/commercial-district preferences (or hard search
conditions) against real Busan housing and commercial data.

## Docs map

- **`docs/REQUIREMENTS.md`** — what to build: problem statement, the two
  required user flows, provided data, judging rubric, feature checklist.
  Start here if you're new.
- **`docs/PLAN.md`** — timeline, team roles, open risks.
- **`docs/TECHNICAL.md`** — architecture decisions, stack, Docker layout,
  data model, recommendation algorithm, known gotchas.
- **`docs/CODE.md`** — repo file map, API reference, script reference.
- **`docs/STYLE_GUIDE.md`** — the UI rulebook: palette, type, radii,
  component recipes. Read before adding or restyling any UI.
- **`docs/DESIGN.md`** — the original design brief (palette rationale, the
  `TagStrip` motif); superseded on specifics by STYLE_GUIDE.md.
- **`docs/DATA_MODEL.md`** — field-by-field mapping from raw source files
  (CSV/SHP) to the database schema. Read before touching ingestion/schema
  code.

## Quick start — 2 steps

```bash
git clone <this repo>
just onboard
```

That's it. `just onboard` (→ `scripts/onboard.sh`) does everything:

1. Checks host prerequisites and fails fast with install hints if any are
   missing.
2. Creates `api/.env` / `client/.env` from their `.env.example` files if
   missing (never overwrites an existing one).
3. Unzips `samples.zip` → `samples/` if not already unzipped.
4. Installs dependencies (`bun install` in `client/` + `uv sync` for the api).
5. Builds and starts `db` + `api` + `client` in Docker.
6. Runs alembic migrations and seeds the database from the host.
7. **Geocodes housing addresses**, if a `KAKAO_REST_API_KEY` is present in
   `api/.env`. On a truly fresh clone (no keys yet) this step just prints
   instructions instead of failing — everything else still works without
   it (search, condition filters, detail pages). Once you add real Kakao
   keys, just re-run `just onboard` and geocoding runs automatically.

Safe to re-run any time — every step is idempotent.

Host prerequisites: **Docker, Bun, uv, just, GDAL** (`brew install just gdal`
covers the last two on macOS). Migrations and seeding run on the host
against the dockerized Postgres, which is why uv and GDAL are needed
locally. Run `just` with no arguments (here or in `api/`) to list every
available task.

Then:

- API: http://localhost:3000
- Frontend: http://localhost:5173

Verify:

```bash
curl http://localhost:3000/health
curl "http://localhost:3000/api/housing?depositMax=30000000&builtAfter=2015"
```

## Kakao keys

Get both at https://developers.kakao.com/console/app — **two different
keys from the same app, not interchangeable:**

- `KAKAO_REST_API_KEY` (`api/.env`) — server-side geocoding calls.
- `VITE_KAKAO_MAP_KEY` (`client/.env`) — browser JS-SDK key.

Add them to the `.env` files `just onboard` created, then re-run
`just onboard` (it'll rebuild and geocode) — or manually:

```bash
just up
just geocode
```

**If the map shows "지도를 표시할 수 없습니다" even with a key set:** the JS key
needs its allowed domain registered — Kakao Developers console → your app →
플랫폼 설정 → Web 플랫폼 → 사이트 도메인, add `http://localhost:5173`. Without
this, Chrome blocks the SDK response as `ERR_BLOCKED_BY_ORB` (Kakao returns a
401 to browser-origin requests from unregistered domains) — a Kakao console
setting, not a bug in this repo. Full detail in `docs/TECHNICAL.md`.

**Never commit a real key** — `.env` files are gitignored; `.env.example`
files must stay blank placeholders. If a real key ever ends up in a
committed file, rotate it in the Kakao console immediately.

`samples.zip` (~98MB) is committed to this repo, no separate download step
needed. To regenerate it after adding more sample data:
`zip -r -X samples.zip samples -x samples/'*.DS_Store'` from the repo root,
then re-commit.

## Current state (see `docs/PLAN.md` for what's next)

- Both mandatory flows live and fully interactive: condition search and
  lifestyle recommendation, filtering live with no search buttons.
- Explore screen: clustered price-bubble pins (cluster click filters the
  list), viewport-synced right list panel, floating filter panel, persona
  presets, per-category weight sliders with live re-ranking, search-radius
  circle on selection.
- Detail page: stat tiles, static locator map, and the neighborhood
  profile (POI density + zoning mix via PostGIS) — the feature that makes
  the Sundosoft zoning layer load-bearing.
- Real data seeded: housing CSVs, 155,103 commercial POIs, admin
  boundaries (192), zoning (3,307), buildings (379,711); housing geocoded
  via Kakao.
- Backend on SQLModel + alembic + uv with a domain-driven layout; frontend
  on zustand + TanStack Query + react-i18next + motion, ko/en throughout.
- 하루스탯 부산: 생활 이력서와 주간 루틴을 실제 BMC/GIS 추천식에
  연결하고, 설명 가능한 FUN·WORK·REST 점수·상위 후보 비교·조건 완화
  시뮬레이터를 제공.
- 정책 리포트: 실제 적재 주택의 위치정보, 승강기, 주차, 노후도 결측을
  집계해 추천 준비도를 표시.
- Blocked: `industry_population_grid` (sgis) — the population CSVs ship no
  boundary geometry (see `docs/DATA_MODEL.md` Part 4).
- Pending: compare view, AI prompt-to-filters (the navbar search pill is
  reserved for it), event-day city-wide dataset swap.
