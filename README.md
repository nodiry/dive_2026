# DIVE 2026 — 상권·취향 기반 공공임대주택 추천 서비스

A public-housing recommendation service for BMC(부산도시공사) × Sundosoft's
DIVE 2026 hackathon track — recommend public rental housing by matching a
citizen's lifestyle/commercial-district preferences (or hard search
conditions) against real Busan housing and commercial data.

## Docs map
- **`docs/ARCHITECTURE.md`** — current product overview and end-to-end
  architecture: screens, services, data flow, recommendation scoring,
  deployment, and extension boundaries. Start here for the whole system.
- **`docs/AZURE_VM_DEPLOY.md`** — deployment of the PostGIS database and
  FastAPI backend on an Azure Linux VM, with an optional separate HTTPS
  Compose stack and one-shot containerized seed/geocoding jobs.
- **`docs/REQUIREMENTS.md`** — what to build: problem statement, the two
  required user flows, provided data, judging rubric, feature checklist.
  Start here for the original problem and judging context.
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

## Quick start — 3 steps

```bash
git clone <this repo>
# drop 2026_DIVE_해커톤_제공데이터_선도소프트.zip at the repo root (see below)
just onboard
```

### The one external file you need (EN)

Everything the core app needs ships in the committed `samples.zip` — the
only manual file is the **선도소프트 handout zip**, which unlocks the
population-density layer and industry grid:

1. Download `2026_DIVE_해커톤_제공데이터_선도소프트.zip` from the hackathon
   handout (Google Drive). **Do not rename it and do not unzip it** — the
   auto-added suffix like `-20260725T120419Z-1-001` is fine; onboarding
   matches any `2026_DIVE*.zip`.
2. Put the zip file at the **repo root** (next to `justfile` and
   `samples.zip`).
3. Run `just onboard`. It unzips both archives (repairing the Korean
   filenames that break plain `unzip`), installs everything, starts Docker,
   migrates, seeds (housing + POI + GIS + population), and geocodes if a
   Kakao key is set.

Skipping the zip is fine — everything still runs except the population
density layer, and you can re-run `just onboard` any time after adding it.

### 실행 방법 (KO) — 서버 배포하는 분 필독

핵심 데이터는 저장소에 포함된 `samples.zip`에 다 들어 있고, **수동으로
넣어야 하는 파일은 선도소프트 제공데이터 zip 하나뿐**입니다 (인구밀도
레이어 + 격자 데이터용):

1. 해커톤 구글 드라이브에서 `2026_DIVE_해커톤_제공데이터_선도소프트.zip`을
   다운로드하세요. **이름을 바꾸지 말고, 압축도 풀지 마세요** — 다운로드시
   자동으로 붙는 `-20260725T120419Z-1-001` 같은 접미사가 있어도 그대로
   두면 됩니다 (`2026_DIVE*.zip` 패턴이면 스크립트가 알아서 찾습니다).
2. zip 파일을 **저장소 최상위 폴더**(= `justfile`, `samples.zip`이 있는
   위치)에 넣으세요. `samples/` 안이 아니라 프로젝트 루트입니다.
3. `api/.env`에 `KAKAO_REST_API_KEY`, `client/.env`에 `VITE_KAKAO_MAP_KEY`를
   설정하세요 (없으면 지오코딩/지도만 빠지고 나머지는 동작합니다).
4. 저장소 루트에서 실행:

   ```bash
   just onboard
   ```

   이 한 번으로 전부 처리됩니다: 필수 도구 확인 → `.env` 생성 → 두 zip
   압축 해제(한글 파일명 깨짐 자동 복구) → 의존성 설치 → Docker(db+api)
   기동 → 마이그레이션 → 시딩(주택 + 상권 POI + GIS + 인구) → 지오코딩.
   몇 번을 다시 실행해도 안전합니다 (멱등).

5. 확인: `curl http://localhost:3000/health` → `{"status":"ok",...}`,
   프론트는 `just client` (호스트에서 Vite, :5173).

필수 도구: **Docker, Bun, uv, just, GDAL** (Ubuntu:
`apt install gdal-bin unzip` + [just](https://just.systems) +
[uv](https://docs.astral.sh/uv/) + [bun](https://bun.sh)). 시딩과
마이그레이션은 호스트에서 Docker 안의 Postgres(포트 5433)로 실행되기
때문에 uv/GDAL이 서버에도 필요합니다. Azure VM 배포 절차는
`docs/AZURE_VM_DEPLOY.md` 참고 — zip 파일 배치 규칙은 위와 동일합니다.

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

`samples.zip` (~90MB) is committed to this repo, no separate download step
needed — it holds everything the core seeds use (BMC housing CSVs, POI, GIS
shapefiles, reference docs). One extra download unlocks the population
density layer:

- **선도소프트 융합데이터**: download
  `2026_DIVE_해커톤_제공데이터_선도소프트.zip` from the hackathon handout
  and drop it at the repo root — `just onboard` unzips it into `samples/`
  and the seed picks it up (population + industry grid). See
  `docs/DATA_MODEL.md` Part 5.
- SGIS population grid (unusable without its boundary file, nothing reads
  it) → optional, `samples/population_grid_UNPLACEABLE/`.

To regenerate the zip after a data update, from the repo root:

```sh
cd samples && zip -r -X ../samples.zip . \
  -x "population_grid_UNPLACEABLE/*" \
  -x "2026_DIVE_해커톤_제공데이터_선도소프트/0*" \
  -x "*.DS_Store"
```

then re-commit (keep it under GitHub's 100MB file limit).

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
- Real data seeded: housing CSVs (355 projects city-wide), 155,103
  commercial POIs, admin boundaries (192, with interpolated population),
  zoning (3,308, every polygon labeled), buildings (379,711),
  industry/population grid (79,935 cells); housing geocoded via Kakao.
- Backend on SQLModel + alembic + uv with a domain-driven layout; frontend
  on zustand + TanStack Query + react-i18next + motion, ko/en throughout.
- 하루스탯 부산: 생활 이력서와 주간 루틴을 실제 BMC/GIS 추천식에
  연결하고, 설명 가능한 FUN·WORK·REST 점수·상위 후보 비교·조건 완화
  시뮬레이터를 제공.
- 정책 리포트: 실제 적재 주택의 위치정보, 승강기, 주차, 노후도 결측을
  집계해 추천 준비도를 표시.
- `industry_population_grid` and the population density layer are filled
  from the 선도소프트 POP_STORE grid when the handout zip is present (see
  `docs/DATA_MODEL.md` Parts 4-5) — the old SGIS blocker is resolved.
- Pending: compare view, event-day dataset swaps.


# TODO:
* add share button to share the kakao map link
