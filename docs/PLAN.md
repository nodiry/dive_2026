# Project Plan

For *what* to build see `docs/REQUIREMENTS.md`; for *how* it's built see
`docs/TECHNICAL.md` and `docs/CODE.md`. This doc is timeline, team, and risk
— not architecture.

Track partner: **부산도시공사(BMC) × ㈜선도소프트(Sundosoft)**
Event: DIVE 2026, BEXCO Exhibition Center 2, 4F — **on-site build 7/25 14:00 → 7/26 14:00 (24h)**
Track lock-in deadline: **7/13 18:00** (first-come, 12 teams/track cap)
Doc author: solo prep 7/12 → ~7/19, then 2 teammates join

## Team & roles

- Solo prep week (7/12–~7/19): full-stack scaffold, data ingestion,
  backend, and a first frontend pass — one person.
- From ~7/19: 2 more teammates join. Suggested split once they're up to
  speed (adjust to actual strengths):
  - **Person A** — map polish + compare/favorites feature
  - **Person B** — UI/UX polish + pitch deck
  - **You** — integration, demo data rehearsal, edge cases, ongoing backend

Ramp-up note: the backend is Python/FastAPI/asyncpg (see `docs/TECHNICAL.md`
"Why the switch" for context) — flag this to teammates who might expect the
original TS stack, so it's not a day-one surprise.

## Timeline

### Phase 0 — track lock-in (7/12–7/13) — done
- [x] Track selection confirmed
- [x] All 5 reference-link data sources sourced (`docs/DATA_MODEL.md`)
- [x] `git init`, bun workspaces, Docker Compose, `.env.example` files

### Phase 1 — solo week (7/12–~7/19) — done
- [x] Full stack containerized (db + api + client, no host dependencies beyond Docker)
- [x] Backend ported Bun/Express/TS → Python/FastAPI/asyncpg
- [x] All ingestion scripts (housing, POI, GIS layers) verified end-to-end
- [x] Geocoding live via Kakao REST API
- [x] API v1: condition search, detail lookup, lifestyle recommendation, POI categories
- [x] Frontend built and verified in a real browser (Explore/Detail/About;
      fully redesigned since — see docs/STYLE_GUIDE.md)
- [x] Korean/English language toggle (`client/src/lib/i18n/`)
- [x] One-command onboarding (now `just onboard`) — verified against an
      actual simulated fresh clone (deleted `.env` files, deleted
      `samples/`, wiped the DB volume), including automatic geocoding once
      Kakao keys are present
- [x] `docs/` rewritten into `REQUIREMENTS.md` / `TECHNICAL.md` / `CODE.md` /
      `DATA_MODEL.md` + this plan + root `README.md`

### Phase 2 — team of 3 (~7/19–7/24)
- [x] Fullscreen-map redesign: `Home`/`Search`/`Recommend` merged into one
      `Explore` screen, map fills the viewport, navbar/results float on top
      (Google/Kakao-Maps-desktop style) — see `docs/CODE.md` and
      `docs/DESIGN.md` for the new component structure
- [x] 조건/취향 mode toggle in the navbar, condensed filter bar per mode
- [x] Preference mode: real-category icon bar (카페/편의점/헬스장/약국/주유소
      + grouped 음식점), individual matched-POI pins on the map, animated
      trail from a selected house to its nearest match per category
      (straight line + moving dot — no routing API, see `docs/TECHNICAL.md`)
- [x] Backend: `POST /api/recommendations/lifestyle` now returns individual
      `pois` (name/lat/lng/distance, top 5 per category) alongside the
      existing aggregate count/nearest, for the map pins/trail
- [x] 찜 (save) list — localStorage-only, no backend/auth, `Heart` toggle on
      every result card, dedicated panel in the navbar
- [x] About page — problem statement, BMC/Sundosoft blurbs
- [x] 하루스탯 부산 `/life-match` — 생활 이력서, 주간 루틴 프리셋,
      FUN/WORK/REST, 0–100 매치 리포트, 상위 3개 비교, 집 이력서 모달,
      조건 시뮬레이터
- [x] 추천식 정규화 — 생활권 42% + 루틴 28% + 주택 조건 18% + 가격
      여유 12%, 필수조건(월세/면적/방/승강기/주차) 선필터
- [ ] Verify ETL abstraction can point at the full city-wide dataset without
      code changes (only re-run ingestion against new files)
- [ ] Seed a realistic demo dataset for rehearsal (don't wait for event day
      to test the demo path)
- [ ] Differentiator beyond the two example flows, if time allows (see
      `docs/REQUIREMENTS.md` "Required features" — population/vibe scoring
      is the leading candidate, currently blocked, see `docs/DATA_MODEL.md`
      Part 4)
- [ ] Pitch deck + rehearsed walkthrough, explicitly framed against the
      judging rubric (`docs/REQUIREMENTS.md`)

### Phase 3 — event (7/25–7/26)
- [ ] Swap sample ingestion for the full released dataset (this is why the
      ETL scripts must be data-agnostic, not hardcoded to Suyeong-gu/Gijang-gun)
- [ ] Final polish, deploy, submit, present

## Open risks

- Geocoding volume/rate limits once full city-wide data lands — cache
  aggressively (skip already-geocoded rows, which `geocode_housing.py`
  already does), geocode incrementally.
- Mid-project language switch (TS→Python) means teammates need to ramp on
  Python/FastAPI/asyncpg — flagged above, revisit if it's actually slowing
  the team down.
- `industry_population_grid` may simply stay empty for the whole project —
  the "vibe" differentiator is a nice-to-have, not load-bearing.
- Track deck explicitly says pre-event time is meant for "understanding +
  review, not development" — building now is still the right call (normal
  hackathon practice), just keep the architecture flexible since the *real*
  dataset only exists on 7/25.
- The OT deck's data descriptions have been wrong three times already
  (Sundosoft's own SHP samples not actually being in the linked Drive
  folder; the POI category taxonomy being stale; one of the zoning files
  being a scattered nationwide preview sample, not real Busan coverage) —
  treat the deck as directional, always verify against the real files
  before building on top of anything it describes.
- Keep secrets out of committed files — `.env.example` files must only ever
  contain placeholders. A real key was accidentally committed once (see
  `docs/TECHNICAL.md` "Known gotchas"); if it happens again, rotate the key
  immediately, don't just edit the file.
