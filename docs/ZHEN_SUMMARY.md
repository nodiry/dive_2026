# DIVE 2026 — Hackathon Topic Summary

Track: **부산도시공사(BMC) × ㈜선도소프트(Sundosoft)** — "상권·취향 기반
공공임대주택 추천 서비스" (Commercial District & Preference Based Public
Rental Housing Recommendation Service).

Source: the 18-page OT deck
(`docs/부산도시공사x선도소프트_글로벌_데이터_해커톤_OT발표자료(최종).pdf`,
English translation at `../hackathon_description_EN.pdf`), distilled here
together with what the scaffold already covers.

## The problem being solved

- Busan's registered population fell ~240,000 over 2016–2025 (3,498,529 →
  3,255,964); high housing cost relative to income pushes residents to
  cheaper satellite cities outside Busan.
- The core pain point: **~50% of public rental housing lottery winners give
  up moving in** (LH·SH·GH data). The deck blames three failure modes of the
  current listing system:
  1. Supplier-centered, one-way information — no qualitative/environmental
     context about a listing.
  2. No surrounding commercial-district/amenity info — citizens must search
     around each address manually.
  3. No intelligent recommendation reflecting individual lifestyle.

## What must be built (deliverable: app / web service)

Move beyond "check listings by area/deposit" to a demand-tailored
recommendation service. **Both** example flows from the deck are required:

1. **Lifestyle/preference flow** — "Which rental housing is close to the
   cafes, gyms, and convenience stores I frequent?" → user inputs
   lifestyle/consumption preferences → service recommends housing near a
   matching commercial district.
2. **Condition flow** — "Recommend a newly built apartment (within 5 years)
   with a deposit under 30 million KRW" → user inputs hard conditions →
   service filters matching units.

## Provided data

- **BMC (CSV, 6 files)** — housing info + deposit/rent for 4 rental types
  (행복/통합/재개발/매입임대). Samples cover Suyeong-gu + Gijang-gun only;
  the **full city-wide dataset is only released on event day**, so ingestion
  must stay data-agnostic.
- **Sundosoft (SHP, 3 files)** — store–building fusion, top-5
  industry–population fusion, commercial-district–zoning fusion. The linked
  Drive folder never actually contained them, so this repo rebuilt
  equivalent layers from the same public source data (see
  `docs/DATA_MODEL.md`).

## Judging rubric (100 pts) — build to this

| Criterion | Pts |
|---|---|
| Problem definition | 15 |
| Use of partner data (must be load-bearing, not decorative) | 15 |
| Creativity & differentiation | 15 |
| Data-driven problem solving (collection → analysis pipeline) | 20 |
| Service completeness (UI/UX, end-to-end polish) | 20 |
| Policy applicability (could BMC actually deploy it) | 15 |

Strategy takeaway: explainable scoring + polished UI beats a black-box
model. The two 20-point lines reward a working, intuitive product and a
defensible data pipeline.

## Event logistics

- On-site build: **7/25 14:00 → 7/26 14:00 (24h)**, BEXCO Exhibition
  Center 2, 4F.
- Contacts: Junwoo Kim (BMC, kow6948@bmc.busuan.kr, 051-810-1296),
  Mira Park (Sundosoft, mrpak@sundosoft.co.kr, 070-7703-1043).

## Where the scaffold already stands

Working end-to-end (Docker: PostGIS + FastAPI + React/Vite, one-command
`just onboard`):

- Both required flows implemented — condition search
  (`GET /api/housing`) and lifestyle recommendation
  (`POST /api/recommendations/lifestyle`) with explainable per-category
  score breakdowns (weight × count × closeness via PostGIS `ST_DWithin`).
- Real data ingested: 6 BMC housing CSVs, 155k commercial POIs, admin
  boundaries, zoning, 380k building footprints; housing geocoded via Kakao.
- Frontend: fullscreen Kakao map UI, 조건/취향 mode toggle, result cards
  with match-explanation tags, saved (찜) list, detail/about pages, ko/en
  toggle.

Since this summary was written the project has moved substantially: the
backend was restructured onto SQLModel + alembic + uv (domain-driven
layout), the frontend was fully redesigned (clustered price pins,
viewport-synced list panel, floating live filters, personas, weight
sliders, neighborhood profile on the detail page), and task running moved
to justfiles. See `README.md` "Current state" and `docs/CODE.md` for the
present shape.

Still open (see `docs/PLAN.md`): the event-day city-wide dataset swap,
demo rehearsal, the compare view, the AI prompt-to-filters feature, and
the pitch deck framed against the rubric.
