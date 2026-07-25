# Design System (original brief)

> **Superseded on specifics by `docs/STYLE_GUIDE.md`** — that file is the
> living UI rulebook and reflects the current implementation (top chip
> navbar, floating filter panel, right list panel, clustered price pins,
> custom Select, toasts). This document keeps the original design intent:
> palette rationale, typography rules, and the `TagStrip` motif, which all
> still hold. File paths below may be stale (styles now live in
> `client/src/styles/index.css`; the saved list is a zustand store).

## Palette

Generated from the dark-purple brand color (deep plum structure, vivid
violet accent, gold counterpoint) — defined as Tailwind v4 `@theme` tokens
in `client/src/styles/index.css`. Hexes below are current; the palette was
originally Busan-themed (marine/terracotta) and was regenerated from plum
on 2026-07-25:

| Token | Hex | Use |
|---|---|---|
| `plum` | `#261c3b` | primary text, headings, nav active state |
| `plum-light` | `#38295a` | hover/raised plum surfaces |
| `lilac` | `#f5f3f8` | page background |
| `lilac-dim` | `#e9e5f0` | placeholder/empty-state background |
| `violet` | `#6d4aff` | **the signature accent** — CTAs, the lifestyle-recommend flow, focus rings |
| `violet-dark` | `#5636d6` | violet text/hover on light violet backgrounds |
| `gold` | `#d9a441` | sparse highlight — reserve it, don't dilute it |
| `slate` | `#625c72` | secondary text |
| `slate-light` | `#948da6` | borders, dividers |

Rule of thumb: **plum for structure/text, violet for the one thing on
a screen that matters, slate for everything secondary.** If you reach for a
color not in this table, you're probably fighting the system — use an
opacity variant of an existing token instead (e.g. `bg-violet/10`,
`border-slate-light/30`), which is the pattern used everywhere already.

## Type

- **Pretendard** (loaded via CDN in `index.css`) for everything — handles
  Korean and Latin text in one family, no separate Korean/English font pair
  to juggle.
- `font-mono` (system stack) is used deliberately, not incidentally: eyebrow
  labels (`text-sm uppercase tracking-wide`, see the `Explore.tsx` hero
  overlay), the sublabel inside `TagStrip` tags (e.g. distances), and
  numeric data (deposit/rent in `HousingCard`). Mono for *data*, sans for
  *language* is the pattern — keep it when adding new numeric displays.

## The signature motif — `TagStrip`

The one thing that should look the same everywhere it appears:
`client/src/components/TagStrip.tsx`. It's a row of rounded-pill chips
representing neighborhood/category matches, in two variants:

- **`hero`** — large pills, shown once, in `Explore.tsx`'s centered
  empty-state overlay (before a first search) — the actual pitch: this
  product matches by what's *nearby*, not a filter form.
- **`compact`** — small pills, used under every preference-mode result card
  as the literal "why this matched" explanation (e.g. "카페 · 3곳 · 32m").
  Built from `aggregateMatchesByIcon()` (`lib/poiIcons.ts`), which rolls the
  raw per-`category_name` matches back up to one tag per icon the user
  actually picked (the grouped "음식점" button alone can match ~10 raw
  category names — the card shows one aggregated tag, not ten).

Don't introduce a second chip/tag component for similar data — extend
`TagStrip`'s variants instead.

## Layout patterns

- Non-map pages (`About`, `Detail`, wrapped in `PageShell`) use
  `mx-auto max-w-5xl px-6 py-{12,16}` — a centered column, not full-bleed.
  The map screen (`Explore`, via `MapShell`) is the one deliberate
  exception: fullscreen (`fixed inset-0`), with everything else floating on
  top as translucent overlay panels (`bg-lilac/95 backdrop-blur`, same
  treatment as `PageShell`'s header) — a Google/Kakao-Maps-desktop pattern,
  not a boxed layout. `MapShell`'s overlay wrapper is
  `pointer-events-none`; each floating panel (`ExploreNavbar`,
  `ResultsListPanel`, the hero overlay) opts back into
  `pointer-events-auto` individually so map drags/clicks still reach the
  map in the gaps between panels.
- Rounded corners scale with the size of the element: `rounded-full` for
  pills/nav/inputs, `rounded-2xl` for cards and the floating results panel,
  `rounded-3xl` for the largest single surfaces (the `Explore` hero
  overlay). Don't mix — a card with `rounded-lg` will look like a lilacake
  next to everything else.
- Borders are always a low-opacity tint of a theme color
  (`border-slate-light/30`, `border-violet/30`), never a flat gray —
  this is what keeps the light backgrounds from looking like default
  browser chrome.
- `HousingCard` is the one result-card component, used for criteria
  results, preference results, and the saved/찜 list — it takes a
  `children` slot for flow-specific extras (e.g. preference mode passes a
  compact `TagStrip` as the match breakdown) and optional `onSelect`/
  `saved`/`onToggleSave` props. Add new per-flow content through the
  `children` slot or new optional props, don't fork the card. Note: when
  `onSelect` or `onToggleSave` is passed, the card renders as a `div` with
  `role="button"`, not a native `<button>`/`<a>` — it contains other
  interactive elements (the save heart, the "상세보기" link), and
  interactive content can't nest inside interactive content.
- A small qualitative **map-pin palette** (`lib/poiIcons.ts`,
  `POI_ICON_COLORS`) extends the core theme for the 6 preference-mode
  categories, since map pins need to be visually distinguishable from each
  other in a way shades of one hue can't provide. It stays harmonious with
  the core palette (reuses `violet`/`gold`, adds a muted blue/violet/
  green/amber) rather than reaching for saturated primaries.

## Empty / placeholder states

`KakaoMap.tsx` sets the pattern: every non-happy-path state (no key, no
coordinates yet, SDK load error) gets its own honest, specific message in
a dashed-border `lilac-dim` box — never a blank box, never a generic
"something went wrong." Follow this for any new component that can fail or
have nothing to show.

## Mode toggle & icons

- The 조건/취향 mode switch (`ModeToggle.tsx`) is a **two-state scale, not
  two independent buttons** — selecting one always deselects the other
  (`aria-pressed` on both, reflecting the mutual exclusivity). Use this
  pattern for any future binary mode switch, don't build a fresh toggle
  component per case.
- Icons are **`lucide-react`**, the one icon dependency in this project —
  don't add a second icon library. Used sparingly: the preference-mode
  category bar, a handful of navbar utility buttons (찜 목록/서비스 소개), and
  the save heart. Most of the UI still communicates through the palette,
  type, and `TagStrip`, not iconography — keep it that way.
- The save/찜 heart (`HousingCard`) uses a filled `violet` heart when
  saved, an outlined `slate-light` one otherwise — the only place a filled
  icon is used as a state indicator in this app; don't reuse that specific
  treatment for anything that isn't a save/favorite action.

## Language

Korean is the default and primary language (`client/src/lib/i18n/`, default
locale `"ko"`); English is a secondary toggle stored in `localStorage`. When
adding UI text, add it to `translations.ts` for both locales — never inline
a hardcoded Korean or English string in a component.
