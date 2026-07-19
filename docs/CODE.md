# Code Reference

File-by-file map of the repo and the API surface. For *why* things are
built this way see `docs/TECHNICAL.md`; for the raw data feeding all this
see `docs/DATA_MODEL.md`.

## Repo layout

```
docker-compose.yml          # orchestrates db + api + client
scripts/onboard.sh           # the whole 3-step onboarding flow (git clone, bun install, bun run onboard)
samples.zip                  # committed (~98MB) — bun run onboard unzips this automatically
samples/                     # gitignored (unzipped ~560MB form — regenerated from samples.zip, not itself committed)

api/
  Dockerfile                 # python:3.12-slim + gdal-bin (for ogr2ogr)
  requirements.txt
  .env.example                # DATABASE_URL, PORT, KAKAO_REST_API_KEY
  app/
    main.py                  # FastAPI app + routes + CORS + validation-error handler
    db.py                    # asyncpg connection pool singleton (get_pool/close_pool)
    models.py                 # Pydantic schemas (camelCase over the wire — hand-mirrors packages/shared/src/schemas.ts)
    migrations/               # 001_init, 002_poi_fields, 003_gis_layers (plain SQL, language-agnostic)
    queries/
      housing.py               # condition-based search + detail lookup
      recommendations.py        # lifestyle-based recommendation scoring
      poi.py                    # category picker data
    lib/
      csv_utils.py              # encoding-aware CSV parsing (EUC-KR/UTF-8) + field normalizers (dates, districts, elevator flags)
      gis.py                    # ogr2ogr subprocess wrapper (argv list, never shell=True)
      geocode.py                 # Kakao Local API address geocoding
      paths.py                   # SAMPLES_DIR resolution + friendly missing-samples error
    scripts/
      migrate.py                 # runs .sql files from app/migrations/
      seed.py                    # orchestrates migrate -> seed_housing -> seed_poi -> seed_gis
      seed_housing.py             # ingests all 6 BMC CSVs -> housing_project/housing_unit/housing_price
      seed_poi.py                 # ingests the 155k-row commercial POI CSV -> commercial_poi
      seed_gis.py                 # ogr2ogr for admin_boundary/commercial_zone/building
      geocode_housing.py           # batch-geocodes housing_project rows where geom IS NULL

client/
  Dockerfile                 # oven/bun — build context is the repo root (needs packages/shared)
  .env.example                # VITE_API_URL, VITE_KAKAO_MAP_KEY
  src/
    main.tsx                  # app entry — wraps App in LocaleProvider + QueryClientProvider + BrowserRouter
    App.tsx                    # route table
    index.css                  # Tailwind v4 @theme tokens + Pretendard import + base layer
    pages/
      Home.tsx                  # mode picker (취향으로 찾기 / 조건으로 찾기), hero tag strip
      Recommend.tsx              # lifestyle preference intake + ranked results
      Search.tsx                 # condition-based filter form + results
      Detail.tsx                  # unit specs, deposit/rent, map, nearby-amenities
    components/
      Layout.tsx                  # nav shell, locale switcher
      HousingCard.tsx              # shared result-card (used by Search and Recommend)
      TagStrip.tsx                  # signature "neighborhood tag" motif — hero on Home, match breakdown on results
      KakaoMap.tsx                  # loads Kakao SDK from VITE_KAKAO_MAP_KEY; graceful placeholder if unset/no coords/load error
    lib/
      api.ts                       # typed fetch client, validates responses against @dive2026/shared
      queries.ts                    # TanStack Query hooks
      format.ts                     # display formatters (e.g. formatWon)
      i18n/
        translations.ts              # ko/en string tables + Translations type
        context.tsx                   # LocaleProvider (reads/writes localStorage, sets document.lang)
        localeContext.ts               # LocaleContext + useLocale() hook

packages/shared/
  src/schemas.ts             # Zod contracts the frontend validates API responses against

docs/
  REQUIREMENTS.md            # what to build, straight from the track partner deck
  TECHNICAL.md                # architecture, stack, data model, algorithm, gotchas
  CODE.md                      # this file
  DATA_MODEL.md                 # field-by-field mapping from raw source files to schema
  부산도시공사x선도소프트_...pdf   # the source-of-truth track partner deck

PLAN.md                     # timeline, team roles, risks
README.md                    # entry point — quick start + doc map
```

## API surface

- `GET /api/health` — liveness check, `{"ok": true}`.
- `GET /api/housing?depositMax=&builtAfter=&roomCount=&district=&type=` —
  condition-based search. All params optional; `depositMax` in won,
  `builtAfter` a year, `district`/`type` exact match.
- `GET /api/housing/:id` — single housing project detail, including units
  and price rows.
- `POST /api/recommendations/lifestyle` — lifestyle-based ranking.
  Request body:
  ```json
  {
    "preferences": [{ "categoryName": "카페", "weight": 1 }],
    "district": "수영구",
    "depositMax": 30000000,
    "radiusMeters": 500
  }
  ```
  Returns `[]` until housing is geocoded (`bun run geocode`) — that's
  correct behavior, not a bug. Each result includes a per-category match
  breakdown (count + nearest distance), not just a final score.
- `GET /api/poi/categories` — distinct `category_name` values with counts,
  powers the frontend's category picker. Deliberately not hardcoded —
  see `docs/DATA_MODEL.md` Part 2 for why the real taxonomy differs from
  the track deck's.

All routes return camelCase JSON; validation errors return
`{"error": "invalid request", "issues": [...]}` with a 400 status.

## Scripts (all run via `docker compose exec api python -m app.scripts.<name>`, or the `bun run <name>` shortcuts below)

| Script | `bun run` shortcut | What it does |
|---|---|---|
| `migrate` | `bun run migrate` | applies any un-applied `.sql` files in `app/migrations/` |
| `seed` | `bun run seed` | migrate + seed_housing + seed_poi + seed_gis, in order |
| `seed_housing` | — | ingests the 6 BMC CSVs (idempotent: `TRUNCATE`s unit/price tables, upserts projects) |
| `seed_poi` | — | ingests the 155k-row commercial POI CSV (idempotent: `TRUNCATE`s first) |
| `seed_gis` | — | `ogr2ogr` for admin boundary / zoning / building layers (idempotent: truncates per layer) |
| `geocode_housing` | `bun run geocode` | geocodes any `housing_project` row with `geom IS NULL`, via Kakao Local API, 0.1s rate-limit sleep between calls |

Root `package.json` also exposes: `bun run onboard` (full setup, see
`docs/TECHNICAL.md`), `bun run up`/`down` (docker compose up/down), and
`bun run client` (rebuild/run just the client container).
