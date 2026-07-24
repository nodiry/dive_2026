# Code Reference

File-by-file map of the repo and the API surface. For *why* things are
built this way see `docs/TECHNICAL.md`; for the raw data feeding all this
see `docs/DATA_MODEL.md`; for how the UI must look see
`docs/STYLE_GUIDE.md`.

## Repo layout

```
justfile                     # root task runner: onboard/install/up/down/migrate/seed/geocode/api/client
docker-compose.yml           # db + api (+ client behind the "full" profile)
package.json                 # bun workspaces only (client, packages/*) — no scripts
scripts/onboard.sh           # full onboarding flow (prereq checks, env files, unzip, install, up, migrate, seed, geocode)
samples.zip                  # committed (~98MB) — onboarding unzips to samples/ (gitignored)

api/
  justfile                   # install/dev/format/lint/typecheck/test/check/migration/migrate/downgrade/seed/geocode
  pyproject.toml + uv.lock   # uv-managed deps (FastAPI, SQLModel, alembic, geoalchemy2, asyncpg)
  alembic/                   # migrations (autogenerate; geoalchemy2-aware env.py, PostGIS internals excluded)
  Dockerfile                 # python:3.13-slim + uv; runs uvicorn src.main:app on :3000 (--reload)
  scripts/                   # host-run ETL (asyncpg, NOT SQLModel — bulk executemany)
    db.py                    #   asyncpg pool for scripts, URL derived from src.database
    seed.py                  #   seed_housing -> seed_poi -> seed_gis
    seed_housing.py          #   6 BMC CSVs -> housing_project/housing_unit/housing_price
    seed_poi.py              #   155k-row POI CSV -> commercial_poi (maps Korean 대분류 -> English slug)
    seed_gis.py              #   ogr2ogr for admin_boundary/commercial_zone/building
    geocode_housing.py       #   Kakao geocoding for housing_project rows with geom IS NULL
    lib/                     #   csv_utils (EUC-KR handling), gis (ogr2ogr wrapper), geocode, paths
  src/
    main.py                  # app factory: CORS, validation handler, docs gating, lifespan
    config.py                # pydantic-settings (SettingsBase + AppSettings/app_config, reads api/.env)
    database.py              # DatabaseConfig (env DATABASE_URL, +asyncpg dialect), engine, async_session, SessionDep
    router.py                # api_router (prefix /api) + /api/health
    models.py                # NAMING_CONVENTION, utcnow, Base, ApiModel (camelCase wire contract)
    housing/                 # models (SQLModel tables) / schemas / service / router
    poi/                     # commercial_poi table, categories endpoint
    recommendation/          # lifestyle scoring (SQLModel selects + one sa_select window query)
    gis/models.py            # admin_boundary, commercial_zone, building, industry_population_grid

client/
  package.json               # standalone bun app inside the workspace
  vite.config.ts             # path aliases (@api/@components/@constants/@hooks/@layout/@pages/@stores/@styles/@type/@utils)
  .prettierrc                # single quotes, one attribute per line
  src/
    main.tsx                 # QueryClientProvider + BrowserRouter; imports @hooks/i18n side-effect
    App.tsx                  # MotionConfig(reducedMotion) + routes (ROUTES constants) + ToastList
    api/                     # client.ts (axios instance) + housing/recommendation/poi xAPI modules (zod-validated)
    hooks/                   # useHousing (search/detail/neighborhood), useRecommendation, usePoiCategories,
                             #   useDebouncedValue, i18n/ (i18next init + LanguageDetector)
    stores/                  # useExploreStore (mode/filters/weights/persona/radius/selection/panel),
                             #   useSavedHousingStore (찜, zustand persist), useToastStore
    constants/               # api (BASE_URL), path (ROUTES), districts, personas, poi (icons/colors/groups),
                             #   i18n/koTranslation.json + enTranslation.json
    utils/                   # cn (clsx+tailwind-merge), money (formatWon), filters
    types/explore.ts         # ExploreMode, PanelView
    styles/index.css         # @theme palette tokens, range slider, global scrollbars
    layout/                  # PageShell (About/Detail shell), LanguageMenu
    components/
      ui/Select.tsx          # custom dropdown (portaled listbox) — native <select> is banned
      HousingCard.tsx        # the one result card (panel + rail variants)
      TagStrip.tsx           # signature chip motif
      KakaoMap.tsx           # map engine: price-bubble pins, clustering, bounds clamp, circle, focus, staticView
      ToastList.tsx          # toast renderer for useToastStore
      explore/               # ExploreNavbar (brand/mode/pill/utils), FilterPanel (floating live filters),
                             #   ListPanel (right viewport-synced list), MapShell, ModeToggle, controls.tsx
    pages/                   # Explore (map screen), Detail (stat tiles + locator map + neighborhood), About

packages/shared/src/schemas.ts  # zod API contract (mirrored by hand in api pydantic schemas)
docs/                        # this folder; STYLE_GUIDE.md governs all UI work
```

## API surface

All routes return camelCase JSON; validation errors return
`{"error": "invalid request", "issues": [...]}` with status 400.

- `GET /health` — liveness + version (root level, not under /api).
- `GET /api/health` — `{"ok": true}` (kept for the original contract).
- `GET /api/housing?depositMax=&builtAfter=&roomCount=&district=&type=` —
  condition search. All params optional.
- `GET /api/housing/:id` — single project summary.
- `GET /api/housing/:id/neighborhood?radiusMeters=500` — neighborhood
  profile: POI counts by major category + zoning mix (share of the radius
  area per 용도지역), computed in PostGIS. Radius clamped to 100–2000m.
- `POST /api/recommendations/lifestyle` — body
  `{preferences: [{categoryName, weight}], district?, depositMax?, radiusMeters}`;
  returns ranked results with per-category breakdown + top-5 nearest POIs
  each (for map pins/trails).
- `GET /api/poi/categories` — distinct `category_name` values with counts.

## Tasks (run via just)

| Where | Recipe | What it does |
|---|---|---|
| root | `just onboard` | the whole setup flow (idempotent) |
| root | `just up` / `just down` | docker compose up/down (db + api) |
| root | `just migrate` / `seed` / `geocode` | delegate to api/justfile |
| root | `just client` | host Vite dev server on :5173 (the Kakao-whitelisted port) |
| api/ | `just migration "msg"` | alembic autogenerate revision (host, against localhost:5433) |
| api/ | `just migrate` | alembic upgrade head |
| api/ | `just seed` / `just geocode` | host-run ETL (needs GDAL + samples/) |
| api/ | `just check` | ruff format + lint + ty + pytest |
