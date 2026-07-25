# Session Context (handoff)

Working notes for continuing this repo with fresh context. Read with
`README.md`, `docs/ARCHITECTURE.md`, `docs/STYLE_GUIDE.md`, `docs/NEW_DATA.md`.
Accurate as of 2026-07-26 (event day, build ends 14:00).

## What this is

DIVE 2026 hackathon (BMC × 선도소프트): 상권·취향 기반 공공임대주택 추천
서비스, branded **하루** (Haru). Deliverable is a web app + mobile app.
Rubric (100): 문제정의 15, 제공데이터 활용 15, 창의성 15, 데이터기반 문제해결 20,
서비스 완성도 20, 정책 활용성 15 — see `docs/REQUIREMENTS.md`.

## Stack

- `api/` FastAPI + SQLModel async + alembic + uv, PostGIS on :5433, api :3000.
  Domains: `housing, poi, gis, recommendation, auth, saved, ai, game`.
  ETL in `api/scripts/` (host-run, needs GDAL). `just` recipes for everything.
- `client/` Vite + React 19 + Tailwind 4, zustand, TanStack Query, react-i18next,
  motion. Runs on HOST (`bun run dev`, :5173 — the Kakao-whitelisted origin).
- `mobile/` Expo SDK 54 + expo-router, Reanimated 4, Kakao in a WebView.
  Runs in Expo Go. Fonts: Pretendard bundled in `assets/fonts`.
- Alembic head: `c6873a3d23cb`. Run `just seed` then `just geocode` after a
  fresh DB; `just onboard` does everything (drop the 선도소프트 zip at repo root).

## Data actually loaded (verified in the running DB)

| Table | Rows | Source |
|---|---|---|
| `housing_project` | 355 | BMC CSVs, all geocoded, 15 구/군 |
| `commercial_poi` | 155,103 | SEMAS 상가정보 CSV |
| `industry_population_grid` | 79,935 | 선도소프트 **02** 인구-5대업종 (100m cells) |
| `use_area_cell` | 29,441 | 선도소프트 **03** 상권-주거 (5,793 with a bus stop) |
| `district_store_trend` | 764 | 선도소프트 **01** 상가-건물, 4 years |
| `admin_boundary` | 192 | 법정동 + population/youth_share interpolated from 02 |

All three partner datasets are queried by shipped features. `building`
(379k rows) is loaded but unused.

## Features (all working)

**Web** — Explore (map hero, 조건/취향 modes, personas, weight sliders, POI
pins + trails, clustering, population **and** amenity heat layers, district
outline); Detail (map/roadview, stat tiles, neighborhood profile, 상권 trend
badge, 2030 share, bus-stop chip, share button + Kakao Map link); AI chat
(Gemini tool-calling, inline map card, fullscreen map, image upload, markdown
incl. tables, **card game**); Life Match (하루스탯 + teammate's dual-path
LifeDeck + "지도에서 보기" bridge into Explore); Policy (supply-vs-demand gap
by 동, zero-supply callout, readiness audit); 찜, About (data provenance), auth.

**Mobile** — full parity: drawer nav, Explore with both heat layers, AI chat
with image upload + card game, Detail with share + all chips, Policy with the
supply gap, Life Match, 찜, auth.

**The card game** (`/api/games`, `api/src/game/`): Gemini authors a 5-card deck
constrained to the 20 traits + 27 icons the app already scores, so a run ends
in real housing recommendations. Triggered by `/game [theme]`, by the keywords
게임/테스트/game/quiz, or by the button on the empty chat screen. Progress saves
per card; `ai_message.game_id` replays the deck when a chat is reopened.

## Judged weak spots (honest)

1. **The mobile app has never run on a physical device.** It typechecks and
   bundles for iOS/Android; nothing more is known. Highest remaining risk.
2. Walking distances are straight-line haversine, now honestly labelled
   직선 N분. Kakao directions would make them real.
3. Store-trend totals swing 113k → 160k → 150k → 159k across 2021-24, so some
   "상권 축소" badges are collection artifacts. The 3-year window mitigates it.
4. No tests anywhere.
5. `industry_population_grid` is aggregated per 동 for the map and Policy; the
   per-cell demographic bands are still unused.
6. CORS falls back to `["*"]` with `allow_credentials=True` when
   `FRONTEND_ORIGINS` is unset — invalid combo, will break auth on Azure.
   **Not fixed at the user's instruction.**

## Gotchas worth remembering

- Kakao CustomOverlay content must NOT be `position:absolute` or the anchor
  offset computes to 0 (this made the heat canvas paint in one quadrant).
  It also needs `display:block` or the canvas picks up baseline space.
- Heat ramp normalizes on the **p95** of density, not the max: the median 동 is
  ~8k/km² against a ~50k max, so max-anchoring left the whole city cool.
- 선도소프트 shapefiles are UTF-8 (`.cpg`); the government ones are EUC-KR.
  `stage_zipped_shapefile(..., encoding=)` handles both.
- Alembic autogenerate proposes renaming every index in the schema (SQLModel
  naming change). Strip that noise from new migrations, keep only your table.
- `HousingCard` renders a `<div role=button>` (not a Link) whenever `onSelect`
  or `onToggleSave` is passed — pass `onSelect` or clicking does nothing.
- Tailwind v4 preflight sets `button { cursor: default }`; a base rule in
  `styles/index.css` restores the pointer app-wide.
- In a React Native flex column, an icon without `shrink-0` loses **height**
  when content overflows, turning circles into ovals.
- Uploaded images are passed inline to Gemini and never stored (PII).
- `mobile/shared/schemas.ts` is a hand-copy of `client/src/shared/schemas.ts`.
  Update both.

## Pending

1. **Commit.** A large uncommitted changeset sits on `main` (game feature,
   supply endpoint, dataset 03, mobile parity, rebrand). Teammates push to the
   same branch; pull with a scoped `git stash push -- <paths>` then pop.
2. Run the mobile app on a device.
3. Optional: route the primary trail, feed transit into more of the scoring,
   compare view (phase 5, never started).
