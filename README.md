# DIVE 2026 — 상권·취향 기반 공공임대주택 추천 서비스

Recommendation service for BMC (부산도시공사) × Sundosoft's DIVE 2026 hackathon
track. See `PLAN.md` for the full project plan and timeline, and
`docs/DATA_MODEL.md` before touching ingestion/schema code.

## Stack

- **api/** — Bun + TypeScript + Express, `Bun.sql` (Postgres/PostGIS). No `pg`.
- **client/** — Vite + React 19 + TypeScript + Tailwind v4 + React Router + TanStack Query.
- **packages/shared/** — Zod schemas shared between api and client (single source of truth for API contracts).
- **Postgres + PostGIS** via Docker, for spatial queries (housing near matching commercial POIs).

## Getting the sample data

The sample data (~560MB, ~98MB zipped) is **not in git** — it's distributed
separately via Google Drive as a zip. Ask a teammate for the current link.

1. Download and unzip it.
2. Drop the resulting `samples/` folder directly into the **repo root**
   (as a sibling of `api/`, `client/`, `docs/` — not inside any of them).
3. Run `bun run seed` (see Quick start below). It finds everything itself —
   no configuration, no manual file placement beyond step 2.

If `samples/` is missing or incomplete, every ingestion script fails fast with
a clear message telling you what to do, rather than a cryptic file-not-found
error.

## Quick start

Requires [Bun](https://bun.com), Docker, and GDAL (`brew install gdal`, used
by the shapefile ingestion steps).

```bash
bun install                     # installs + links all workspaces
docker compose up -d db         # starts PostGIS on localhost:5433
cp .env.example api/.env        # fill in KAKAO_REST_API_KEY if you have it
cp client/.env.example client/.env  # fill in VITE_KAKAO_MAP_KEY if you have it (different key, same Kakao app)
bun run migrate                 # applies api/src/db/migrations/*.sql
bun run seed                    # loads everything in samples/ — housing, POI, GIS layers (~80s)
bun run dev:api                 # http://localhost:3000
bun run dev:client              # http://localhost:5173 (separate terminal)
```

Verify the API is alive and seeded:

```bash
curl http://localhost:3000/api/health
curl "http://localhost:3000/api/housing?depositMax=30000000&builtAfter=2015"
```

Note: PostGIS runs on **5433**, not 5432 — many dev machines already have a
native Postgres on 5432, and it silently wins over `localhost:5432` connections.

## Layout

```
api/
  src/db/
    client.ts              # Bun.sql connection
    migrate.ts              # runs api/src/db/migrations/*.sql (idempotent)
    migrations/             # 001_init, 002_poi_fields, 003_gis_layers
    seedHousing.ts          # loads samples/housing/*.csv — see docs/DATA_MODEL.md
    seedPoi.ts               # loads samples/poi/business_busan.csv (155k rows)
    seedGis.ts               # loads samples/gis/*.shp via ogr2ogr
    queries/housing.ts      # condition-based search + detail lookup
    queries/recommendations.ts  # lifestyle-based recommendation scoring
  src/lib/
    csv.ts                  # encoding-aware CSV parsing (EUC-KR and UTF-8) + field normalizers
    gis.ts                  # ogr2ogr wrapper (argv-array spawn, not Bun's shell tag — see comments)
    geocode.ts               # Kakao Local API address geocoding
    paths.ts                 # SAMPLES_DIR + friendly missing-samples error
  src/scripts/               # thin CLI entrypoints (migrate/seed/ingest-*/geocode)
  index.ts                   # Express app + routes
client/
  src/pages/                  # Home, Search, Recommend, Detail — one route each
  src/components/
    Layout.tsx                # nav shell
    HousingCard.tsx           # shared result-card, used by Search and Recommend
    TagStrip.tsx               # signature "neighborhood tag" motif — hero on Home, match breakdown on results
    KakaoMap.tsx               # loads Kakao SDK from VITE_KAKAO_MAP_KEY; graceful placeholder if unset
  src/lib/
    api.ts                    # typed fetch client, validates responses against @dive2026/shared
    queries.ts                 # TanStack Query hooks
packages/shared/src/schemas.ts  # Zod contracts used by both api and client
samples/                     # gitignored — drop-in data, see "Getting the sample data" above
docs/DATA_MODEL.md           # field-by-field mapping from raw source files to schema
PLAN.md                      # phased project plan
```

## API

- `GET /api/health`
- `GET /api/housing?depositMax=&builtAfter=&roomCount=&district=&type=` — condition-based search
- `GET /api/housing/:id` — detail lookup
- `POST /api/recommendations/lifestyle` — lifestyle-based ranking, body:
  `{ preferences: [{ categoryName: "카페", weight: 1 }], district?, depositMax?, radiusMeters? }`.
  Returns `[]` until housing is geocoded (see Current state below) — that's
  correct behavior, not a bug.
- `GET /api/poi/categories` — distinct `category_name` values with counts, powers the frontend's category picker (real values only — don't hardcode Korean category labels, see `docs/DATA_MODEL.md` Part 2).

## Current state (see PLAN.md for what's next)

- ✅ Housing CSVs, commercial POI (155,103 rows), admin boundaries (192),
  zoning (3,307), buildings (379,711) — all real data, ingested and verified
  end-to-end (`bun run seed` runs the whole pipeline from a clean DB in ~80s).
- ✅ Condition-based search and lifestyle-recommendation endpoints — both
  built, tested live (including score ranking, filters, and edge cases) with
  temporarily-backfilled test coordinates, then reverted to keep the DB honest.
- ✅ CORS enabled — ready for `client/` to call it from a different origin.
- ⏳ **Geocoding is the one real blocker.** `housing_project.geom` is `NULL`
  for all rows — the Kakao geocoding client (`api/src/lib/geocode.ts`) and
  batch script (`bun run geocode`) are built and tested for their error path,
  but need a live `KAKAO_REST_API_KEY` to actually run. Get one, drop it in
  `api/.env`, run `bun run geocode`, and the recommendation endpoint starts
  returning real results with no other code changes.
- ⏳ `industry_population_grid` (sgis) — genuinely blocked, not just pending:
  the population CSVs have no boundary geometry to place them with (see
  `docs/DATA_MODEL.md` Part 4).
- ✅ Frontend — all 4 pages built (Home, Search, Recommend, Detail), verified
  live in a real browser (Playwright: full click-through, zero console errors,
  mobile viewport checked). `KakaoMap` shows a clean placeholder instead of
  crashing since no `VITE_KAKAO_MAP_KEY` is set yet — same for Recommend
  results, which are honestly empty until housing is geocoded.

**Note on `client/node_modules`:** if you ever see "Invalid hook call" /
"multiple copies of React" errors, it means a workspace package's
`node_modules` has a stale non-symlinked copy from before it joined the
workspace. Fix: delete `node_modules` + `bun.lock` in every workspace *and*
the root, then `bun install` once from the root. Don't `bun install` inside
an individual workspace package — always run it from the repo root.
