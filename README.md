# DIVE 2026 — 상권·취향 기반 공공임대주택 추천 서비스

Recommendation service for BMC (부산도시공사) × Sundosoft's DIVE 2026 hackathon
track. See `PLAN.md` for the full project plan and timeline, and
`docs/DATA_MODEL.md` before touching ingestion/schema code.

## Stack

- **api/** — Python + FastAPI + asyncpg, running in Docker. (Originally Bun/Express/TypeScript — replaced; see PLAN.md for why.)
- **client/** — Vite + React 19 + TypeScript + Tailwind v4 + React Router + TanStack Query, running in Docker.
- **packages/shared/** — Zod schemas used by the frontend to validate API responses. No longer literally shared code with the backend (which is Python now) — `api/app/models.py` is a hand-kept Pydantic mirror of the same shapes. Keep both in sync manually if you change either.
- **Postgres + PostGIS** via Docker, for spatial queries (housing near matching commercial POIs).

Everything runs in Docker — `db`, `api`, and `client` are all containers
orchestrated by the root `docker-compose.yml`. There is no supported way to
run this outside Docker anymore.

## Quick start — 3 steps

```bash
git clone <this repo>
bun install
bun run onboard
```

That's the whole flow. `bun run onboard` (→ `scripts/onboard.sh`) does
everything: creates `api/.env` / `client/.env` from their `.example` files if
missing, unzips `samples.zip` → `samples/` if not already unzipped, builds
and starts `db` + `api` + `client` in Docker, then runs migrations and seeds
the database (~80s total). Safe to re-run any time — it's idempotent.

Requires Docker (that's it — GDAL, Python, Bun's own runtime deps, Postgres
all run inside containers; you don't need any of them installed on your host
beyond Bun itself, which just runs the onboarding script).

Then:

- API: http://localhost:3000
- Frontend: http://localhost:5173

Verify:

```bash
curl http://localhost:3000/api/health
curl "http://localhost:3000/api/housing?depositMax=30000000&builtAfter=2015"
```

**Kakao keys aren't in `bun run onboard`** — the map and live geocoding won't
work until you add them (housing search/detail and the UI otherwise work
fine without them). After onboarding:

```bash
# edit api/.env: KAKAO_REST_API_KEY=...
# edit client/.env: VITE_KAKAO_MAP_KEY=...
docker compose up -d --build
bun run geocode
```

`samples.zip` (~98MB) **is committed to this repo** — no separate download
step needed. If you ever need to regenerate it (e.g. after adding more
sample data): `zip -r -X samples.zip samples -x samples/'*.DS_Store'` from
the repo root, then re-commit.

**Kakao keys — two different keys from the same app, not interchangeable:**
`KAKAO_REST_API_KEY` (`api/.env`) is for server-side geocoding calls.
`VITE_KAKAO_MAP_KEY` (`client/.env`) is the browser JS-SDK key. Get both at
https://developers.kakao.com/console/app.

**If the map shows "지도를 표시할 수 없습니다" even with a key set:** the JS key
needs its allowed domain registered — Kakao Developers console → your app →
플랫폼 설정 → Web 플랫폼 → 사이트 도메인, add `http://localhost:5173`. Without
this, Chrome blocks the SDK response as `ERR_BLOCKED_BY_ORB` (Kakao returns a
401 to browser-origin requests from unregistered domains) — that's a Kakao
console setting, not a bug in this repo.

Note: PostGIS is reachable on host port **5433**, not 5432 — many dev machines
already have a native Postgres on 5432, and it would otherwise silently win
over `localhost:5432` connections. Containers talk to each other using the
service name `db` on the internal Docker network, not this host port.

## Layout

```
docker-compose.yml          # orchestrates db + api + client
api/
  Dockerfile                 # python:3.12-slim + gdal-bin (for ogr2ogr)
  requirements.txt
  app/
    main.py                  # FastAPI app + routes
    db.py                    # asyncpg connection pool
    models.py                 # Pydantic schemas (camelCase over the wire — mirrors packages/shared)
    migrations/               # 001_init, 002_poi_fields, 003_gis_layers (plain SQL, language-agnostic)
    queries/
      housing.py               # condition-based search + detail lookup
      recommendations.py        # lifestyle-based recommendation scoring
      poi.py                    # category picker data
    lib/
      csv_utils.py              # encoding-aware CSV parsing (EUC-KR and UTF-8) + field normalizers
      gis.py                    # ogr2ogr subprocess wrapper (argv list, not shell=True)
      geocode.py                 # Kakao Local API address geocoding
      paths.py                   # SAMPLES_DIR + friendly missing-samples error
    scripts/                   # migrate.py, seed.py, seed_housing.py, seed_poi.py, seed_gis.py, geocode_housing.py
client/
  Dockerfile                 # oven/bun — build context is the repo root (needs packages/shared)
  src/pages/                  # Home, Search, Recommend, Detail — one route each
  src/components/
    Layout.tsx                # nav shell
    HousingCard.tsx           # shared result-card, used by Search and Recommend
    TagStrip.tsx                # signature "neighborhood tag" motif — hero on Home, match breakdown on results
    KakaoMap.tsx                # loads Kakao SDK from VITE_KAKAO_MAP_KEY; graceful placeholder if unset/blocked
  src/lib/
    api.ts                    # typed fetch client, validates responses against @dive2026/shared
    queries.ts                 # TanStack Query hooks
packages/shared/src/schemas.ts  # Zod contracts the frontend validates against
samples.zip                  # committed (~98MB) — bun run onboard unzips this automatically
samples/                     # gitignored (the unzipped ~560MB form — regenerated from samples.zip, not itself committed)
scripts/onboard.sh           # the whole 3-step onboarding flow
docs/DATA_MODEL.md           # field-by-field mapping from raw source files to schema
PLAN.md                      # phased project plan
```

## API

- `GET /api/health`
- `GET /api/housing?depositMax=&builtAfter=&roomCount=&district=&type=` — condition-based search
- `GET /api/housing/:id` — detail lookup
- `POST /api/recommendations/lifestyle` — lifestyle-based ranking, body:
  `{ preferences: [{ categoryName: "카페", weight: 1 }], district?, depositMax?, radiusMeters? }`.
  Returns `[]` until housing is geocoded (`bun run geocode`) — that's correct
  behavior, not a bug.
- `GET /api/poi/categories` — distinct `category_name` values with counts, powers the frontend's category picker (real values only — don't hardcode Korean category labels, see `docs/DATA_MODEL.md` Part 2).

## Current state (see PLAN.md for what's next)

- ✅ Full stack running in Docker (db + api + client), verified end-to-end with a from-scratch volume: migrate → seed → every endpoint hit for real.
- ✅ Housing CSVs, commercial POI (155,103 rows), admin boundaries (192), zoning (3,307), buildings (379,711) — all real data.
- ✅ **Geocoding is live** — all 41 housing_project rows successfully geocoded via the Kakao REST API. The lifestyle recommendation endpoint now returns real, ranked results (verified live, e.g. "카페" preference correctly ranks a housing project with 75 cafés within 500m, closest 11m away, above sparser areas).
- ✅ Frontend — all 4 pages built, verified in a real browser against the live Dockerized backend with real data.
- ⏳ **Map rendering is blocked on a Kakao console setting**, not code — see the note under Quick start. Once the domain is registered, maps should render immediately with no code changes.
- ⏳ `industry_population_grid` (sgis) — genuinely blocked, not just pending: the population CSVs have no boundary geometry to place them with (see `docs/DATA_MODEL.md` Part 4).

**Note on `client/node_modules`:** if you ever see "Invalid hook call" /
"multiple copies of React" errors when *not* using Docker, it means a
workspace package's `node_modules` has a stale non-symlinked copy. This
shouldn't happen anymore since everything runs in Docker now, but if you do
run `bun install` locally for editor tooling: always run it from the repo
root, never inside an individual workspace package.
