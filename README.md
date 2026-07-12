# DIVE 2026 — 상권·취향 기반 공공임대주택 추천 서비스

Recommendation service for BMC (부산도시공사) × Sundosoft's DIVE 2026 hackathon
track. See `PLAN.md` for the full project plan and timeline, and
`docs/DATA_MODEL.md` before touching ingestion/schema code.

## Stack

- **api/** — Bun + TypeScript, `Bun.serve()`, `Bun.sql` (Postgres/PostGIS). No Express, no `pg`.
- **client/** — Vite + React 19 + TypeScript.
- **packages/shared/** — Zod schemas shared between api and client (single source of truth for API contracts).
- **Postgres + PostGIS** via Docker, for spatial queries (housing near matching commercial POIs).

## Quick start

Requires [Bun](https://bun.com) and Docker.

```bash
bun install                     # installs + links all workspaces
docker compose up -d db         # starts PostGIS on localhost:5433
cp .env.example api/.env        # then fill in KAKAO_MAP_KEY if you have one
bun run migrate                 # applies api/src/db/migrations/*.sql
bun run seed                    # loads BMC sample CSVs (Suyeong-gu/Gijang-gun only for now)
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
    client.ts            # Bun.sql connection
    migrate.ts            # runs api/src/db/migrations/*.sql (idempotent)
    migrations/001_init.sql
    seedHousing.ts        # loads the 6 BMC sample CSVs — see docs/DATA_MODEL.md
    queries/housing.ts    # condition-based search + detail lookup
  src/lib/csv.ts          # EUC-KR aware CSV parsing + field normalizers
  src/scripts/            # thin CLI entrypoints (migrate/seed/ingest-*)
  index.ts                # Bun.serve() routes
client/                   # Vite + React app (screens not built yet)
packages/shared/src/schemas.ts  # Zod contracts used by both api and client
docs/DATA_MODEL.md        # field-by-field mapping from raw CSVs to schema
PLAN.md                   # phased project plan
```

## Current state (see PLAN.md for what's next)

- ✅ Postgres/PostGIS schema, BMC CSV ingestion (all 6 sample files), condition-search API endpoint — all verified end-to-end against real data.
- ⏳ Sundosoft's GIS layers (`commercial_poi`, `industry_population_grid`, `commercial_zone`) — tables exist, empty. Sundosoft hasn't shipped real SHP samples; sourcing is manual (vworld/data.go.kr/sgis — see `PLAN.md` §3 and `api/src/scripts/ingest-gis.ts`).
- ⏳ Geocoding (`housing_project.geom` is currently always `NULL`) — needed before any map UI or proximity scoring works.
- ⏳ Lifestyle recommendation endpoint, frontend screens — not started.
