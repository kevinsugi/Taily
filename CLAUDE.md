# Taily v4 prototype

Visual source of truth: Figma `spK8ZHnsPlWEuD8zRmf5sY`, page "User - Main Flow 2" (`277:2636`). Components page `183:2293`.
Screens (id → node): see `scripts/screens.json`. Behaviour source of truth: `js/state.js` (ported from v3, do not redesign).

## Rules

- Match Figma exactly: px, weights, colors, line-heights from `get_design_context`. Never round, "improve", or re-space.
- Colors, spacing, radius, type sizes ONLY through `css/tokens.css` variables. No literal hex/px for those outside `tokens.css`.
- Type comes from the Figma type scale — `size/10, 12, 16, 24, 28, 32, 36`, every text node bound to it. 12 / 16 / 28 carry most of the UI; hierarchy via **weight + color**, never by inventing a size. Families: `family/serif` = Cormorant Garamond (headings), `family/sans` = Hanken Grotesk (everything else).
- Components live in `css/components.css` + `js/components.js`, one class per Figma variant. Add a variant there before using it in a screen. Never fork a component inside a screen.
- Screens: 390 wide, background `var(--neutral-50)`; `.status-bar` absolute 0/0 h44; `.top-nav` absolute 0/44 h56; `.body` padding-top **128**, sides **20**.
- If Figma looks wrong or inconsistent, STOP and report it; do not fix it silently.

Workflow per screen: `get_design_context` (per top-level child for tall frames) → `js/screens/<id>.js` → `npm run diff -- <id>` → ≤1% → commit `feat(screen): <id>`.

`ref/` PNGs are Figma exports @2x (`npm run refs`, needs `FIGMA_TOKEN`). Re-export if Figma changed.

No build step. Plain HTML/CSS/JS. Deploys to GitHub Pages from `main`.

## Verified in Phase 0

All 17 frames were normalised before any code was written. These are measured, not assumed:

- **Content offset is 128 on every screen.** Status Bar and Top Nav are absolute instances at `(0,0) 390×44` and `(0,44) 390×56`. Side padding 20 (content width 350).
- **Every color is bound to a `Taily/Colors` variable.** No literal fills remain, so `tokens.css` can be generated straight from the variables.
- **All spacing is on the 4px grid** and bound to `space/4–40`, except the 128 top offset and one 48 (no variable exists at those values).
- **CTA is 54px tall** in both variants (Default and Secondary) and 350 wide, across all 26 instances.
- Sheet scrims are `ink @ 0.4` node opacity over the app background — not a flat grey.

Components added in Phase 0, on the Components page:

- `Time Chip` `501:1039` — `State=Default | Selected`, 94×45, r12. Used by 07A / 07B.
- `Select Time` `502:1035` — label + chevron trigger, 129×37, r8. Used by 07A / 07B.

## Type API (css/base.css)

Nothing outside `base.css` sets `font-size`. Compose with a type class + a weight modifier + a colour utility.

| class | Figma |
|---|---|
| `.t-title` | Cormorant **Medium** 28 / 34px — page titles. `.w-600` for the SemiBold ones. |
| `.t-section` | Cormorant SemiBold 20 / 24px — section headers (Upcoming Appointments) and the 02a sheet title (`.sheet__title`). **20 is off the type scale** — see inconsistencies below. |
| `.t-body` | Hanken 16 / 21px, Regular |
| `.t-small` | Hanken 12 / 16px, Medium |
| `.t-caps` | Hanken 12 / 16px SemiBold, uppercase, +1px tracking |
| `.t-micro` | Hanken 10 / 13px SemiBold |

Weights: `.w-400 .w-500 .w-600 .w-700`. Colours: `.c-ink .c-700 .c-600 .c-500 .c-400 .c-300 .c-white .c-accent .c-accent-ink .c-sage .c-success .c-warning .c-error .c-info`.

Line-heights are the px Figma actually renders — `lineHeight` is AUTO on nearly every node, resolving to ≈1.31 for Hanken and ≈1.21 for Cormorant, rounded to whole px. Do not write `normal`.

Chrome lives in `js/components.js`: `statusBar(time)`, `topNav(active)`, `chrome(active, time)`.

## Component library (Phase 3)

`css/components.css` + `js/components.js` (27 render fns) + `components.html` gallery. One class per Figma variant. Icons are exact Figma vectors in `js/icons.js` (generated from `assets/icons/`, currentColor). Figma strokes are INSIDE — bordered hug-height components use `box-shadow: inset 0 0 0 1px …`, never `border`, or they grow 2px. Key fns: `cta, ctaSmall, statusPill (9), timeChip, selectTime, filterPill, garmentTile, apptCard, statusHero (6), summaryCard, garmentCard (4), progressBar (4), bubble, timeline, deliveryWindow, infoCard/infoRow/metaRow/feeRow, methodRow, sheet, wheel`. Motion: press scale + sheet drawer per the animate skill; `prefers-reduced-motion` handled.

## Deliberate deviations from the frames (Kevin-directed)

- **03's map is a placeholder** (`.map-card--placeholder`, media-placeholder fill + note) — it will become a live Google Map centred on the user's location. The frame shows a map raster, so `npm run diff -- 03-finding-tailor` reads ~1.3% and is expected to exceed the 1% gate until the real map lands.

## Known Figma inconsistencies — do not silently fix

- **Top Nav `Active` state**: `04c` / `04d` use `Active=Bookings`, but all nine "body" screens (03, 05, M1, 06, 06a, 07, 07a, 07b, 08) use `Active=Home` even though they are post-booking. Build what Figma shows; raise it rather than correcting it.
- `apple-pay-badge` / `google-pay-badge` on `04a` are plain frames by decision (brand marks), not components.
- `09-bookings` is a top-level tab, not a step in the booking flow; its number is a filing convention only.
- `T2 / Chat Bubble` master text is **14px — off the type scale** (kept verbatim in `.bubble`). Photo-tile gradient starts at `#E2DCD1`, one digit off `neutral-200`. The 02a sheet draws a 40×4 grabber where 04a/04b use 36×4. All three await Kevin's call.
- The Confirmed pill on 01's appointment card draws its ring at **full `--info` strength** where the Status Pill master specifies the text colour at 35% — instance vs master disagree. The 03 meta rows use **text glyphs (◉ ▤ ✂)** whose scissors renders upright in Figma's font but left-facing in Segoe. Both raised, not silently fixed.
- The Aug 2026 serif headers — `Upcoming Header` (`532:958` on 01/01a) and the 02a sheet title (`277:2921`) — are **literal 20px, unbound to any size variable** (no `size/20` exists). Built verbatim via `--size-20` in `tokens.css` (marked as not-a-Figma-variable) + `.t-section` / `.sheet__title`. Raised, awaiting Kevin's call.
- The updated sheet frames (02a/04a/04b) draw the full 02 screen dimmed behind the scrim (was a flat backdrop) — built via `view02()` in `.sheet-backdrop`. 02a's picker sheet (358 tall at y490) and 04b's sheet (286 at y559) overflow the 844 frame by 4px / 1px; reproduced with negative `bottom` offsets, not padding changes.

## v3

`taily-prototype-v3.html` is the archived v3 prototype and the behaviour reference. `js/data.js` and `js/state.js` are ported from it. Do not port v3 CSS or markup — visuals are rebuilt from Figma.
