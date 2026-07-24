# Style Guide

The single reference for how UI in this app looks. Every new component,
page, or tweak follows this — if a choice isn't covered here, extend this
file first, then build. Purely visual: no stack/architecture content
(that's `TECHNICAL.md`) and no component API docs (that's `CODE.md`).

## Palette

Defined as Tailwind `@theme` tokens in `client/src/index.css`. Grounded in
Busan (harbor navy, sea-mist, Gamcheon rooftop orange) — never introduce a
color outside this table; reach for an opacity variant instead.

| Token | Hex | Role |
|---|---|---|
| `marine` | `#0f2430` | primary text, headings, dark surfaces |
| `marine-light` | `#1c3a4a` | hover/raised variant of marine surfaces |
| `mist` | `#f2f5f3` | page background |
| `mist-dim` | `#e6ebe8` | empty/placeholder background |
| `terracotta` | `#e2592e` | THE accent — CTAs, active states, focus rings |
| `terracotta-dark` | `#c04824` | terracotta text/hover on light backgrounds |
| `gold` | `#d9a441` | rare highlight; keep it scarce so it stays special |
| `slate` | `#5b6b70` | secondary text |
| `slate-light` | `#8a969a` | tertiary text, borders, dividers |

Rules:

- **marine = structure, terracotta = the one thing that matters, slate =
  everything secondary.** One screen gets at most one terracotta focal
  point cluster.
- Tints via opacity, not new hexes: `bg-terracotta/10`, `bg-marine/10`,
  `border-slate-light/30`. White (`bg-white`) is allowed for card surfaces.
- Text on marine surfaces is `text-mist`, never pure white `#fff`.

## Typography

- **Pretendard** for all text (`font-sans` — already the body default).
  Handles Korean + Latin in one family; never add another text font.
- **Mono for data, sans for language.** `font-mono` is reserved for:
  numbers (prices, counts, distances), eyebrow labels, and the small
  sublabel inside tags. Never set paragraphs in mono.
- Scale in practice:
  - Page/hero title: `text-2xl`–`text-4xl font-bold text-marine`
  - Card title: `text-lg font-bold text-marine` (`truncate` when width-bound)
  - Body/secondary: `text-sm text-slate`
  - Data values: `font-mono text-sm text-marine`
  - Eyebrow: `font-mono text-sm uppercase tracking-wide text-slate`
  - Fine print/captions: `text-xs text-slate-light`
- Weights: `font-bold` for titles, `font-medium` for labels/links/badges,
  regular otherwise. No `font-black`, no `font-light`.

## Radius scale

Radius grows with element size — never mix tiers on same-size elements:

| Element | Radius |
|---|---|
| pills, chips, badges, nav items, inputs, buttons | `rounded-full` |
| cards, panels, toasts, dropdowns | `rounded-2xl` |
| largest single surfaces (hero overlay, modal) | `rounded-3xl` |

`rounded-lg`/`rounded-md` are banned — a `rounded-lg` card next to the
existing `rounded-2xl` ones reads as a mistake.

## Borders, elevation, surfaces

- Borders are always a **low-opacity tint of a theme color**:
  `border border-slate-light/30` (neutral), `border-terracotta/30`
  (accented). Never flat gray (`border-gray-200` etc.).
- Cards: `bg-white rounded-2xl border border-slate-light/30 p-4` (p-5 for
  roomier standalone cards). Hover (when clickable):
  `hover:border-terracotta/40 transition-colors` — elevation via border
  color, not shadow.
- Shadows are for **floating** elements only (things overlaying the map or
  page): `shadow-lg`. In-flow cards get borders, not shadows.
- Floating overlay panels (on the map screen): `bg-mist/95 backdrop-blur`
  + `rounded-2xl` + `shadow-lg`. This translucent-mist treatment is the
  house style for anything hovering above content.
- Empty/placeholder/error states: `border-2 border-dashed
  border-slate-light/40 bg-mist-dim rounded-2xl` with an honest, specific
  message (`text-sm text-slate`) — never a blank box, never a generic
  "something went wrong".

## Buttons & links

- **Primary CTA** (max one per view): `rounded-full bg-terracotta
  text-white font-medium px-5 py-2.5 hover:bg-terracotta-dark
  transition-colors`.
- **Secondary**: `rounded-full border border-slate-light/40 text-marine
  font-medium px-5 py-2.5 hover:border-terracotta/40`.
- **Ghost/utility** (navbar icons etc.): `rounded-full p-1 text-slate-light
  hover:text-terracotta transition-colors`.
- **Text link**: `text-sm font-medium text-terracotta-dark hover:underline`.
- Disabled: `opacity-40 pointer-events-none` — no separate disabled colors.

## Inputs & controls

- Text/number inputs and selects: `rounded-full border
  border-slate-light/40 bg-white px-4 py-2 text-sm text-marine
  placeholder:text-slate-light`.
- Focus comes from the global ring — `:focus-visible` is `outline-2
  outline-offset-2 outline-terracotta` (already in `index.css`); don't add
  per-component focus styles that fight it.
- Binary mode switches follow `ModeToggle`: a single `rounded-full`
  segmented control where the active segment is `bg-marine text-mist` and
  the inactive is transparent `text-slate` — two-state scale, never two
  independent buttons.
- Multi-select category buttons (preference bar): `rounded-full` chip that
  flips `bg-white text-slate border-slate-light/40` →
  `bg-terracotta/10 text-terracotta-dark border-terracotta/40` when
  selected.

## Scrollbars

- Global (in `index.css`, both engines): thin 8px, fully rounded thumb in
  `slate-light/50` (hover `/80`), transparent track with a 2px inset so the
  thumb floats. Never default browser scrollbars, never a third-party
  scrollbar library.

## Selects

- Never a native `<select>` — always `components/ui/Select` (custom
  dropdown): `rounded-full` trigger matching inputs, rotating chevron,
  `rounded-2xl` white listbox with `shadow-lg`, options as full-width
  pills — hover `bg-mist`, selected `bg-terracotta/10 text-terracotta-dark
  font-medium`. Placeholder text renders `text-slate-light`.
- Keyboard: Enter/Space/ArrowDown opens, arrows move highlight, Enter
  picks, Escape closes; outside click closes.

## Sliders

- All range inputs use the `.range` class (`index.css`): mist-dim
  `rounded-full` track, terracotta thumb with a white ring. Never a bare
  unstyled `<input type="range">`.
- Slider rows follow the pattern: optional legend dot (`size-2
  rounded-full`, map-pin color when the slider maps to a POI category) +
  `text-xs font-medium` label + slider + right-aligned `font-mono text-xs`
  value. Value always visible, never tooltip-only.

## Chips & tags (`TagStrip`)

The signature motif — one component, two variants, never a second chip
implementation for similar data:

- **hero**: large pills for the empty-state pitch.
- **compact**: small pills under result cards as the "why this matched"
  breakdown; sublabels (counts, distances) inside a tag are
  `font-mono text-[0.85em] opacity-70`.
- Type badges on cards: `inline-block rounded-full bg-marine/10 px-2.5
  py-0.5 text-xs font-medium text-marine`.

## Toasts

(Not built yet — when one is added, this is the style.)

- Position: fixed bottom-center, `bottom-6`, stacking upward with `gap-2`.
- Surface: `bg-marine text-mist rounded-2xl shadow-lg px-4 py-3 text-sm`,
  entering with a small translate-up + fade (`transition` ~200ms).
- Variant accent = a small leading dot (`size-2 rounded-full`):
  `bg-terracotta` for errors, `bg-gold` for warnings, `bg-mist/60` for
  neutral/info. No full-surface red/green toasts — the marine surface is
  constant.
- One line of text; an optional action is a `text-terracotta` text button
  on the right. Auto-dismiss ~4s except errors.

## Map & pins

- Map pins for the 6 preference categories use `POI_ICON_COLORS`
  (`lib/poiIcons.ts`): cafe `#e2592e`, food `#d9a441`, convenience
  `#3f7fb0`, gym `#6b4fa0`, pharmacy `#3f9d72`, gas `#a8642f`; fallback
  `#8a969a`. These six are the ONLY colors allowed outside the core
  palette, and only on the map/legend.
- Housing markers stay marine; the selected housing marker may use
  terracotta.

## Iconography

- `lucide-react` only, used sparsely: category bar, navbar utilities, the
  save heart. Meaning is carried by palette/type/tags first, icons second.
- Default size `size-4` inline with text, `size-5` for standalone buttons.
- The filled-heart treatment (`fill` + `text-terracotta` when saved,
  outlined `text-slate-light` otherwise) is exclusive to save/favorite —
  don't reuse filled-state icons for anything else.

## Layout rhythm

- Non-map pages: centered column `mx-auto max-w-5xl px-6 py-12` (`py-16`
  for airier pages). The map screen is the one full-bleed exception
  (`fixed inset-0`, floating panels on top).
- **Map screen composition — the map is the hero; nothing covers its
  center, ever.** No welcome modals. Controls live in a collapsible
  floating card top-left (auto-collapses after a search; reopens via a
  filter pill showing the active-filter count). Results are a horizontal
  snap rail along the bottom (`HousingCard variant='rail'`, 300px fixed
  width), entering with a short staggered rise (motion, ~50ms/card,
  capped). First-run guidance is a single non-blocking pill at bottom
  center, never an overlay.
- Rank badges on the top-3 preference results: `size-6 rounded-full
  font-mono` — #1 is the one sanctioned use of solid `gold`, #2/#3 are
  marine. Score is a thin terracotta bar (`h-1 rounded-full`) on a
  mist-dim track, scaled relative to the best score in the set, mono value
  beside it.
- Selecting a result pans the map to it and draws the search-radius circle
  (terracotta stroke, 6% fill) — the scoring radius made visible.
- Vertical rhythm inside cards/panels: small gaps `gap-2`/`gap-3`,
  section spacing `mt-3`–`mt-6`. Between sibling cards: `gap-3`.
- Truncate long Korean names (`truncate` + `min-w-0` on the flex child)
  rather than wrapping card titles to 3+ lines.

## Language & text style

- Korean first, English via the i18n toggle — every visible string exists
  in both locales (`lib/i18n/translations.ts`), nothing hardcoded.
- Numbers: format money with `formatWon` (만원-style), distances as `32m`
  / `1.2km`, always in mono.

## Quick don'ts

- No colors outside the palette + the 6 map-pin hexes.
- No second font, no mono paragraphs.
- No `rounded-lg`/`rounded-md`, no flat-gray borders, no shadows on
  in-flow cards.
- No more than one primary CTA per view; gold stays rare.
- No blank or generic empty states.
- No new chip/tag/toggle components when a variant of the existing ones
  can carry it.
