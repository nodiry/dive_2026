# Session Context (handoff)

Working notes for continuing work on this repo with low/fresh context.
Read together with `README.md`, `docs/CODE.md`, `docs/TECHNICAL.md`,
`docs/STYLE_GUIDE.md` (all updated and accurate as of 2026-07-25).

## What this is

DIVE 2026 hackathon (BMC × Sundosoft track): 상권·취향 기반 공공임대주택
추천 서비스. On-site build 7/25 14:00 → 7/26 14:00. Judging rubric favors
explainable scoring + polished UI + partner-data usage (see
`docs/REQUIREMENTS.md`).

## Team & workflow

- The user (zhen) owns frontend direction and works through Claude; two
  teammates commit directly (they recently: moved shared zod schemas from
  `packages/shared` INTO `client/src/shared` with alias `@shared`; rebuilt
  trails as routed paths with walk-times; added POI category icons;
  changed `justfile` install to `cd client && bun install`).
- User preferences: no em dashes in user-facing copy; custom Select
  component everywhere (native `<select>` banned); follow ob-frontend
  conventions (see below); discuss design options before big rewrites.

## Stack snapshot

- Backend `api/`: FastAPI + SQLModel async + alembic (geoalchemy2-aware
  env.py) + uv; domain layout `src/{housing,poi,recommendation,gis}` with
  models/schemas/service/router per domain. ETL in `api/scripts/` on raw
  asyncpg (host-run, needs GDAL). `just` recipes for everything.
- DB: `imresamu/postgis:16-3.4` (arm64) on :5433. api container :3000
  (slim, no gdal/alembic; `pull_policy: build`; src bind-mounted).
- Frontend `client/`: Vite/React19/Tailwind4, zustand stores, TanStack
  Query + axios (zod-validated in `src/api/*`), react-i18next
  (`constants/i18n/{ko,en}Translation.json`), motion, path aliases,
  prettier single-quotes. Runs on HOST (`bun run dev`, :5173 = Kakao
  whitelisted). Client docker service behind `full` profile.
- ob-frontend conventions source: `client/CS-ONBOARDING/ob-frontend`
  (gitignored reference clone).

## Current feature state (all working)

- Explore: full-map hero; single-row navbar (brand, mode toggle, inert
  search pill reserved for future AI prompt-to-filters, 찜/about/lang);
  floating FilterPanel top-left (live filters, no search buttons
  anywhere — criteria debounced 350ms, preference auto-runs 450ms);
  right ListPanel synced to map viewport; clustered price-bubble pins
  (cluster click filters list, chip to clear); personas; weight sliders
  with animated re-ranking; radius circle + routed dotted trails
  (primary) + faint dotted connectors (tier-2) + POI pins in two tiers
  (hero 30px ringed w/ hover tooltip name·distance·walk-time; others
  22px); pin clicks stopPropagation (else map click clears selection);
  Busan pan clamp + setMaxLevel(10); initial view Suyeong level 6, first
  fit-all skipped.
- Detail: stat tiles, staticView locator map (no drag/zoom), neighborhood
  profile card (POI density bars + zoning mix TagStrip) matching map
  height (absolute-inset column trick).
- Population density heat layer (NEW, just built): toggle 인구 밀도
  bottom-left of map + heat-ramp legend. Backend:
  `admin_boundary.population` column (alembic rev e8939c897461),
  `scripts/seed_population.py` (CSV `code,population`; 8-digit 법정동
  exact or 5-digit 구 distributed by area),
  `samples/population/busan_population.csv` = official busan.go.kr
  figures 2024-12-31 (구-level, all 192 polygons seeded),
  `GET /api/districts/density` (name/pop/area/density/centroid/rings,
  simplified). Frontend: canvas heat overlay in KakaoMap (grayscale
  radial blobs at centroids, area-scaled radius, density^0.55 intensity,
  colorized via 256-LUT marine→gold→terracotta), redraws on map idle,
  fades out on zoom_start. The canvas lives INSIDE the map as a
  CustomOverlay (zIndex 5, anchored at map center, sized to container)
  so it paints above tiles but below pins — a sibling canvas was
  invisible because Kakao's z-indexed panes join the wrapper's stacking
  context and painted over it (it flashed before tiles loaded).

## Pending / queue

1. **Checkpoint commit — overdue and critical** (huge uncommitted work;
   suggested message exists in history: frontend redesign + phases +
   density layer; teammates committing concurrently).
2. Compare view (2–3 찜 homes side by side) — phase 5, not started.
3. AI prompt-to-filters via the navbar pill — awaiting teammate decision
   (rule-based vs LLM); AI only needs to output the existing filter-state
   shape.
4. Event-day full-city dataset swap: re-run `just seed` + `just geocode`
   when BMC releases files (ETL is data-agnostic; geocoding rate-limited).
5. Optional: finer population CSV (법정동-level) drop-in upgrade;
   neighborhood profile radius could follow the user's radius slider.

## Gotchas worth remembering

- sqlmodel select typed ≤4 entities → use `sqlalchemy.select` for wider
  (with `# ty: ignore[deprecated]` on session.execute for Row tuples);
  wrap model attrs in `col()`.
- geoalchemy2 auto-creates `idx_*_geom` GiST indexes — alembic env.py
  filters them + include_name whitelists only our tables (tiger!).
- Kakao: no maxBounds (clamp on center_changed), no heatmap layer (hence
  canvas), map 'click' synthesized from mousedown/mouseup (stop the whole
  pointer sequence on overlays), CustomOverlay tooltips must be
  position:absolute or the pin shifts.
- `commercial_poi.category` = English slug (mapped at ingest);
  `category_name` = Korean 소분류 ("카페") — recommendations match on
  category_name.
- admin_boundary codes are 법정동 (8-digit), NOT 행정동 — MOIS 행정동 CSVs
  don't join directly.
- DB URLs need `postgresql+asyncpg://` dialect (host .env localhost:5433,
  compose db:5432). ogr2ogr URL strips the `+asyncpg`.
- Heat/choropleth data honesty: current density is 구-level uniform across
  each 구's 동s — say so if judges ask; upgrade path is a finer CSV.
