# Style Guide

The single reference for how UI in this app looks. Every new component,
page, or tweak follows this — if a choice isn't covered here, extend this
file first, then build. Purely visual: no stack/architecture content
(that's `TECHNICAL.md`) and no component API docs (that's `CODE.md`).

## Palette

Defined as Tailwind `@theme` tokens in `client/src/styles/index.css`.
Generated from the dark-purple brand color: deep plum for structure, its
tints for surfaces, a vivid violet as the single accent, gold as the warm
counterpoint. Never introduce a color outside this table; reach for an
opacity variant instead.

| Token | Hex | Role |
|---|---|---|
| `plum` | `#261c3b` | primary text, headings, dark surfaces |
| `plum-light` | `#38295a` | hover/raised variant of plum surfaces |
| `lilac` | `#f5f3f8` | page background (lavender-tinted off-white) |
| `lilac-dim` | `#e9e5f0` | empty/placeholder background |
| `violet` | `#6d4aff` | THE accent — CTAs, active states, focus rings |
| `violet-dark` | `#5636d6` | violet text/hover on light backgrounds |
| `gold` | `#d9a441` | rare highlight; keep it scarce so it stays special |
| `slate` | `#625c72` | secondary text (purple-grey) |
| `slate-light` | `#948da6` | tertiary text, borders, dividers |

Rules:

- **plum = structure, violet = the one thing that matters, slate =
  everything secondary.** One screen gets at most one violet focal
  point cluster.
- Tints via opacity, not new hexes: `bg-violet/10`, `bg-plum/10`,
  `border-slate-light/30`. White (`bg-white`) is allowed for card surfaces.
- Text on plum surfaces is `text-lilac`, never pure white `#fff`.

## Typography

- **Pretendard** for all text (`font-sans` — already the body default).
  Handles Korean + Latin in one family; never add another text font.
- **Mono for data, sans for language.** `font-mono` is reserved for:
  numbers (prices, counts, distances), eyebrow labels, and the small
  sublabel inside tags. Never set paragraphs in mono.
- Scale in practice:
  - Page/hero title: `text-2xl`–`text-4xl font-bold text-plum`
  - Card title: `text-lg font-bold text-plum` (`truncate` when width-bound)
  - Body/secondary: `text-sm text-slate`
  - Data values: `font-mono text-sm text-plum`
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
existing `rounded-2xl` ones reads as a lilacake.

## Borders, elevation, surfaces

- Borders are always a **low-opacity tint of a theme color**:
  `border border-slate-light/30` (neutral), `border-violet/30`
  (accented). Never flat gray (`border-gray-200` etc.).
- Cards: `bg-white rounded-2xl border border-slate-light/30 p-4` (p-5 for
  roomier standalone cards). Hover (when clickable):
  `hover:border-violet/40 transition-colors` — elevation via border
  color, not shadow.
- Shadows are for **floating** elements only (things overlaying the map or
  page): `shadow-lg`. In-flow cards get borders, not shadows.
- Floating overlay panels (on the map screen): `bg-lilac/95 backdrop-blur`
  + `rounded-2xl` + `shadow-lg`. This translucent-lilac treatment is the
  house style for anything hovering above content.
- Empty/placeholder/error states: `border-2 border-dashed
  border-slate-light/40 bg-lilac-dim rounded-2xl` with an honest, specific
  message (`text-sm text-slate`) — never a blank box, never a generic
  "something went wrong".

## Buttons & links

- **Primary CTA** (max one per view): `rounded-full bg-violet
  text-white font-medium px-5 py-2.5 hover:bg-violet-dark
  transition-colors`.
- **Secondary**: `rounded-full border border-slate-light/40 text-plum
  font-medium px-5 py-2.5 hover:border-violet/40`.
- **Ghost/utility** (navbar icons etc.): `rounded-full p-1 text-slate-light
  hover:text-violet transition-colors`.
- **Text link**: `text-sm font-medium text-violet-dark hover:underline`.
- Disabled: `opacity-40 pointer-events-none` — no separate disabled colors.

## Inputs & controls

- Text/number inputs and selects: `rounded-full border
  border-slate-light/40 bg-white px-4 py-2 text-sm text-plum
  placeholder:text-slate-light`.
- Focus comes from the global ring — `:focus-visible` is `outline-2
  outline-offset-2 outline-violet` (already in `index.css`); don't add
  per-component focus styles that fight it.
- Binary mode switches follow `ModeToggle`: a single `rounded-full`
  segmented control where the active segment is `bg-plum text-lilac` and
  the inactive is transparent `text-slate` — two-state scale, never two
  independent buttons.
- Multi-select category buttons (preference bar): `rounded-full` chip that
  flips `bg-white text-slate border-slate-light/40` →
  `bg-violet/10 text-violet-dark border-violet/40` when
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
  pills — hover `bg-lilac`, selected `bg-violet/10 text-violet-dark
  font-medium`. Placeholder text renders `text-slate-light`.
- Keyboard: Enter/Space/ArrowDown opens, arrows move highlight, Enter
  picks, Escape closes; outside click closes.

## Sliders

- All range inputs use the `.range` class (`index.css`): lilac-dim
  `rounded-full` track, violet thumb with a white ring. Never a bare
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
- Type badges on cards: `inline-block rounded-full bg-plum/10 px-2.5
  py-0.5 text-xs font-medium text-plum`.

## Toasts

(Not built yet — when one is added, this is the style.)

- Position: fixed bottom-center, `bottom-6`, stacking upward with `gap-2`.
- Surface: `bg-plum text-lilac rounded-2xl shadow-lg px-4 py-3 text-sm`,
  entering with a small translate-up + fade (`transition` ~200ms).
- Variant accent = a small leading dot (`size-2 rounded-full`):
  `bg-violet` for errors, `bg-gold` for warnings, `bg-lilac/60` for
  neutral/info. No full-surface red/green toasts — the plum surface is
  constant.
- One line of text; an optional action is a `text-violet` text button
  on the right. Auto-dismiss ~4s except errors.

## Map & pins

- Map pins for the 6 preference categories use `POI_ICON_COLORS`
  (`constants/poi.ts`): cafe `#e2592e` (coral), food `#d9a441`,
  convenience `#3f7fb0`, gym `#c2508a` (rose), pharmacy `#3f9d72`, gas
  `#a8642f`; fallback `#948da6`. These six are the ONLY colors allowed
  outside the core palette, and only on the map/legend. None of them may
  sit close to `violet` — the accent must stay unmistakable on the map.
- The population heat ramp runs cool lavender → violet → hot gold
  (`HEAT_STOPS` in `KakaoMap.tsx`), with the legend swatches mirroring it.
- Housing markers stay plum; the selected housing marker may use
  violet.

## Iconography

- `lucide-react` only, used sparsely: category bar, navbar utilities, the
  save heart. Meaning is carried by palette/type/tags first, icons second.
- Default size `size-4` inline with text, `size-5` for standalone buttons.
- The filled-heart treatment (`fill` + `text-violet` when saved,
  outlined `text-slate-light` otherwise) is exclusive to save/favorite —
  don't reuse filled-state icons for anything else.

## Layout rhythm

- Non-map pages: the map screen is full-bleed (`fixed inset-0`, floating
  panels on top); data-heavy pages (Detail, Life Match, Policy) run fluid
  full-width (`px-6 py-10 sm:px-8`, no max-width) so maps, panels, and
  bar sections get the room. Prose-heavy pages (About, auth) keep a
  centered column (`mx-auto max-w-5xl px-6 py-12`). Intro paragraphs on
  any page still cap their own line length (`max-w-2xl`).
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
  plum. Score is a thin violet bar (`h-1 rounded-full`) on a
  lilac-dim track, scaled relative to the best score in the set, mono value
  beside it.
- Selecting a result pans the map to it and draws the search-radius circle
  (violet stroke, 6% fill) — the scoring radius made visible.
- Vertical rhythm inside cards/panels: small gaps `gap-2`/`gap-3`,
  section spacing `mt-3`–`mt-6`. Between sibling cards: `gap-3`.
- Truncate long Korean names (`truncate` + `min-w-0` on the flex child)
  rather than wrapping card titles to 3+ lines.

## Language & text style

- Korean first, English via the i18n toggle — every visible string exists
  in both locales (`constants/i18n/*Translation.json`), nothing hardcoded.
- No em dashes in user-facing copy — restructure into separate sentences
  or use a comma instead.
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
