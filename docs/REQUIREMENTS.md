# Requirements & Features

Source of truth: `docs/부산도시공사x선도소프트_글로벌_데이터_해커톤_OT발표자료(최종).pdf`
(track partner OT deck, 18p). This doc distills it into actionable
requirements — go back to the PDF itself if anything here seems ambiguous.

## Track partners

- **부산도시공사 (BMC)** — 주거복지·도시개발 지방공기업. Supplies public
  housing data and is the eventual deployment channel (청약센터 운영 등 정책
  실행 주체).
- **㈜선도소프트 (Sundosoft)** — GIS·데이터 분석 전문기업. Supplies
  commercial-district/GIS fused data and space-analysis expertise.
- Consortium framing (p.6): BMC has the housing data and citizen channel but
  can't capture individual lifestyle taste; Sundosoft has the commercial/GIS
  analysis capability but no direct citizen-facing service. The service we
  build is explicitly the thing that fuses both gaps.

## Problem statement (p.8)

- Busan's registered population fell ~240,000 over 2016→2025 (3,498,529 →
  3,255,964).
- Root cause named in the deck: low income relative to housing cost pushes
  residents to cheaper satellite cities outside Busan.
- **~50% of public-housing lottery winners decline to move in** (source:
  LH·SH·GH submitted data on 입주 포기 현황) — this is the core pain point,
  not just "population decline" in the abstract.
- Named failure modes of the *current* system:
  1. Supply-side, one-way information (공급자 중심 일방향 정보) — citizens
     can't get qualitative/environmental context about a listing.
  2. No surrounding commercial-infrastructure info — citizens have to
     manually search around a listing's address after reading a notice.
  3. No intelligent recommendation accounting for individual lifestyle taste.

## The service (p.9)

> **"상권·취향 기반 공공임대주택 추천 서비스"** — 공급자 중심의 단순조건(면적,
> 보증금 등) 공고 확인 방식에서 벗어나, 시민 개인이 선호하는 생활 인프라
> (상권, 편의시설, 문화공간 등)와 취향을 고려한 수요자 맞춤형 공공임대 추천
> 서비스 개발.

Two concrete example flows, both explicitly given in the deck — **both must
be built**, not just one:

1. **Lifestyle/taste-based:**
   > "내가 자주 가는 카페, 헬스장, 편의점이 가까운 임대주택 어디야?"
   → citizen inputs lifestyle/consumption preferences → service recommends
   housing near a matching commercial district.
2. **Condition-based:**
   > "5년 이내의 완공된 신축 아파트면서 보증금 3천만원 미만에 입주 할 수 있는
   > 주택 추천해줘"
   → citizen inputs hard housing conditions → service filters/recommends
   matching units.

**Deliverable (산출물):** 앱/웹 서비스 개발 (app/web service).

## Provided data (p.10–16)

### BMC — housing data (CSV)

| # | File | Notes |
|---|---|---|
| 1 | 행복, 통합, 재개발 주택정보 | unit-level: address, 준공일자, 세대수, 주택형, 동/호, 방수, 전용면적(m²), 승강기, 주차대수 |
| 2 | 매입임대 주택정보 | same shape, for 매입임대 stock |
| 3 | 행복주택 보증금_임대료 | deposit/rent, segmented by 공급계층 (e.g. 청년) |
| 4 | 통합공공임대 보증금_임대료 | deposit/rent, segmented by 소득구간 + 가구인원수 |
| 5 | 재개발임대 보증금_임대료 | deposit/rent, segmented by 보호구분 |
| 6 | 매입임대 보증금_임대료 | deposit/rent, ranked by 순위/호명 |

Sample scope: Suyeong-gu + Gijang-gun only, 2023/2026 data. **The deck states
the full city-wide dataset is provided on the event day itself** (본 대회
시) — everything built now must treat these samples as a schema reference,
not final volume, and the ETL must be data-agnostic (not hardcoded to these
two districts).

### Sundosoft — GIS fused data (SHP)

| # | File | Notes |
|---|---|---|
| 1 | 부산시 상가-건물 융합정보 | commercial + building fused, 2021–2024, source: 도로명주소 건물 + 소상공인시장진흥공단 상가정보 |
| 2 | 부산시 주요 5대업종-인구 융합정보 | population × top-5-industry fused, 2022–2024 |
| 3 | 부산시 주요상권 및 용도지역 융합정보 | commercial-district × zoning fused, 2023–2024 |

Sample scope: Suyeong-gu only. **As of this writing these 3 files were never
actually placed in the linked Drive folder** ("최종 데이터는 추후 구글드라이브를
통해 제공 예정") — see `docs/DATA_MODEL.md` for how we substituted the same
raw public-data-portal sources Sundosoft itself used (the 원천데이터 링크
listed on the same slide) to build equivalent layers ourselves rather than
waiting.

## Judging rubric (p.17) — build to this, not just to "cool"

| Category | Points | What it rewards |
|---|---|---|
| 문제 정의 (Problem definition) | 15 | Clear, specific problem framing |
| 발제사 데이터 활용 (Use of partner data) | 15 | BMC + Sundosoft data actually load-bearing, not decorative |
| 창의성 및 차별성 | 15 | A genuinely different angle vs. a filter form |
| 데이터 기반 문제해결능력 | 20 | Real collection → analysis → insight pipeline |
| 서비스 완성도 (UI/UX) | 20 | Feels finished, intuitive, working end-to-end |
| 정책 활용 가능성 | 15 | Could BMC plausibly deploy/scale this? |

Takeaway: **explainable scoring + polished UI beats a black-box model.**
Spend time on a clean, defensible geo-scoring pipeline and a UI that doesn't
feel like a form — not on ML sophistication for its own sake.

## Required features — derived checklist

- [x] Lifestyle/taste-based recommendation flow (example 1)
- [x] Condition-based search flow (example 2)
- [x] Explainable, per-category score breakdown (not a black box) — serves
      both 서비스 완성도 and 정책 활용 가능성 lines directly
- [x] Real BMC housing data ingested and load-bearing
- [x] Real Sundosoft-equivalent commercial/GIS data ingested and load-bearing
      (commercial POI, admin boundaries, zoning — see `docs/TECHNICAL.md`)
- [x] Map / spatial visualization of results
- [x] Web app, multi-page
- [ ] Differentiator beyond the two example flows (창의성 rubric line) —
      candidate: population/industry-mix "neighborhood vibe" scoring, currently
      blocked on missing grid geometry, see `docs/DATA_MODEL.md` Part 4
- [ ] Policy-deployability angle for the pitch (정책 활용 가능성) — frame in
      the final presentation, not just in code
