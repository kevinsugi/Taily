# Taily v6 — visual redesign spec (design director)

Branch `V6` (from V5 8a3bff7). Read `docs/v6/BRIEF.md` first: its locked table (V6-K-01) beats K-03 and both skills. Everything
else from V5 is kept: every screen, flow, state, transition, money rule, copy decision, K-01..K-06, D-01..D-221, the booking flow
bar, the Test-flows menu and the harness. **V6 is CSS + markup-class + icon work. No transition, selector, fixture setup or copy
changes** except the ones listed by name here (§A10, §B "expects"). Calls made while writing this spec are `V6-D-##` in
`docs/v6/DECISIONS.md`.

Method: `redesign-existing-projects` (Scan → Diagnose → Fix, targeted upgrades on the existing vanilla-CSS stack, never a
rewrite) with `minimalist-ui` as the aesthetic. Phone-only adaptations of the skills are stated where they apply (macro
whitespace → 40/48 px rhythm, bento grids → not used, hero imagery → the garment illustrations).

---

## 0. Scan + Diagnose (V5 at 8a3bff7, from ~25 before-shots in `.shots/V6/before/` and the CSS/JS survey)

Stack: plain HTML/CSS/JS, no build; tokens in `css/tokens.css` (Figma-generated), type classes in `css/base.css`, shared
components in `js/components.js` (HTML strings) + `css/components.css` (v4 chassis) + `css/components-v5.css`; icons are hand-drawn
SVG strings in `js/icons.js`, a few more in `components.js` (`GLYPH`, `TILE_PLUS/MINUS`) and four screens (c-pay, c-cards, c-ready,
c-review), plus unicode glyphs (`‹ ✕ ✓ ★ ●`) used as icons.

| # | Finding (skill audit line) | Where | V6 fix |
|---|---|---|---|
| D1 | Font with little character at UI sizes; Cormorant's old-style figures and low x-height make 28 px titles read small and soft; only 500/600 weights | every h1, `.t-display` money | Instrument Serif titles (tight tracking, 1.1 leading) + Geist UI; money moves to Geist (§A2) |
| D2 | Serif money (`$147.50`, `$205.00`, `$112.50`) mixes proportional serif figures with sans tabular rows | t-request, t-job, t-earnings, t-home, c-price-change | `.t-money` / `.t-figure` Geist 600 tabular |
| D3 | A brand accent (camel `#A17C4E` / `#7C5D34`) carries links, active nav stitch, avatars, timeline "current", tags, countdowns, the unread dot — the most-used colour on screen, competing with status | ~50 rules | pure warm monochrome; links = ink + underline; active = ink + weight (§A3) |
| D4 | Status = an 8 px dot + word: weak at list density, colours only differ by hue on a tiny dot | appt rows, thread rows, headings | small uppercase pastel pills (§A4) |
| D5 | Two black slabs per screen: the segmented control's selected option is a full ink fill (c-where, to-availability) next to the ink CTA | segmented | white thumb on a sunk track; ink stays the one primary (V6-D-12) |
| D6 | Soft/pill geometry: 20 px button radius, 16 px cards, 24 px sheets, rounded-full inputs in the composer | `.cta`, `.card`, `.sheet`, composer | crisp 6 / 12 radii (§A5) |
| D7 | Gradients in a flat system: garment-tile selected gradient (`--tile-gradient`), photo-stub gradients | garment tile, `docPhoto`, `photoStub` | flat tones / ink ring (V6-D-16) |
| D8 | Icons: hand-drawn 1.5-stroke set + unicode `‹ ✕ ✓ ★` glyphs (font-dependent, misaligned optically: the flow-bar `‹` and sheet `✕` sit 1–2 px off the icon set) | nav, sheets, check rows, stars | Phosphor Regular, inlined (§A6) |
| D9 | Icon-only nav (labels only in `aria-label`) | top nav | icon + 11 px label (§A7) |
| D10 | All-caps section labels everywhere (`YOUR ORDER`, `PRICE`, `WHAT HAPPENS NEXT`) shouting at 12 px | `sectionHead`, `t-caps` | sentence-case `.t-label`; uppercase only inside pills (V6-D-05) |
| D11 | Secondary text `--neutral-600`/`-500-ink` at 12 px is small for a phone (captions under money rows, meta lines) | `.t-small` | 13 px, warm grey that passes 4.5:1 (V6-D-01) |
| D12 | Tight vertical rhythm for an "editorial" product: 32 between sections, body starts 16 under the nav | `.sec`, `--body-top` | 40 / 48 rhythm, body-top 124 (V6-D-20) |
| D13 | White status bar + white nav + white action bar on a linen page = three white bands cutting the canvas | chrome | chrome sits on the canvas, separated by 1 px `#EAEAEA` rules; action bar translucent canvas + blur (V6-D-14) |
| D14 | Circle avatars with a tinted accent ring (generic) | `avatar` | squircle initials (§A8) |
| D15 | No hover / entry motion: press scale only; screens mount all at once | global | hover lift, scroll-entry fade-up, list stagger (§A9) |
| D16 | Empty-state art = garment in a 120 px tinted disc, centred (symmetric, generic) | `emptyState`, c-welcome, to-done | left-aligned offset tile (V6-D-17) |
| D17 | Orphans in titles / notes ("send Sarah the final order." wraps 1 word) | headings, notes | `text-wrap: balance` on h1/h2, `pretty` on p |

What stays (already good): one primary per screen, sticky action bar, stitched dash above totals, coloured garment illustrations,
K-05 garment row, K-06 Back in the nav, flat reference content vs carded interactive groups (D-193), 44 px targets, forced-colors
rules, reduced-motion handling.

---

## §A SYSTEM

### A1. Fonts — `index.html` (integrator)

Replace the Cormorant/Hanken link (line 11) and its comment with:

```html
<!-- V6: Instrument Serif 400 (+italic) titles · Geist 400/500/600/700 UI · Geist Mono 400/500 meta (codes, last-4, routing) -->
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
```

Keep both `preconnect` lines. Tokens (`css/tokens.css`):

```css
--font-serif: 'Instrument Serif', 'Iowan Old Style', 'Palatino Linotype', Georgia, 'Times New Roman', serif;
--font-sans:  'Geist', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;
--font-mono:  'Geist Mono', 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
```

Instrument Serif has ONE weight (400) — `.t-display/.t-title/.t-h2` set `font-synthesis: none` so a stray `.w-600` never fakes
bold; builders delete `w-600`/`w-500` from serif elements they touch (V6-D-28). Geist Mono is used ONLY for: the SMS code input
digits, card / bank last-4 masks (`•••• 4242`, `••6789`), routing / account number inputs, ZIP chips (V6-D-21).

### A2. Type scale + tracking — `css/base.css`

Scale = **11 / 13 / 16 / 24 / 32 / 40** (`--size-11 --size-13 --size-16 --size-24 --size-32 --size-40`). Line-heights unitless.

| class | family | size / lh | weight | tracking | role |
|---|---|---|---|---|---|
| `.t-display` | serif | 40 / 1.05 | 400 | −0.03em | c-welcome + to-done hero titles, sys-index title |
| `.t-title` | serif | 32 / 1.1 | 400 | −0.02em | every page `h1` |
| `.t-h2` | serif | 24 / 1.15 | 400 | −0.02em | modal titles, empty-state titles, sheet body headings |
| `.t-money` **new** | sans | 32 / 1.1 | 600 | −0.03em | hero money (t-request, t-job payout, t-earnings, t-payout, c-price-change delta), tabular |
| `.t-figure` | sans | 24 / 1.15 | 600 | −0.02em | visit time, countdown, card money (t-home request card, c-tailors Est.), tabular |
| `.t-body` | sans | 16 / 1.5 | 400 | 0 | rows, paragraphs |
| `.t-label` **new** | sans | 13 / 1.4 | 500 | 0 | section heads, eyebrows, field labels, "You take home" labels — sentence case, `--text-muted` |
| `.t-small` | sans | 13 / 1.45 | 400 | 0 | captions, helpers, footnotes, meta lines |
| `.t-caps` | sans | 11 / 1.2 | 600 | +0.06em, uppercase | ONLY pills, tags and the day divider |
| `.t-micro` | sans | 11 / 1.3 | 500 | 0 | nav labels, photo-stack count, badges |

Rules: `h1, h2, .t-display, .t-title, .t-h2 { text-wrap: balance }`; `p { text-wrap: pretty }`; `[data-money], .tabular, .t-money,
.t-figure { font-variant-numeric: tabular-nums lining-nums }`. Body colour `--text` (#2F3437); titles, money, names, CTA text and
totals `--ink` (#111) (V6-D-10). `.w-400/500/600/700` stay. Hierarchy by size step + weight + ink vs muted, never a new size.

**Token sweep (foundation, mechanical, all CSS incl. `css/screens/*.css` and `flow-menu.css`):** `--size-10|11 → --size-11`,
`--size-12|14 → --size-13` (the chat bubble 14 → `--size-16`), `--size-20 → --size-24` (sheet picker title becomes Geist 16, see A10),
`--size-28|30 → --size-32`, `--size-36 → --size-40`; any `line-height: Npx` that sits next to a swept size becomes the class's
unitless ratio. Then delete the old size tokens. **Lint rule 2** (`scripts/v5/lint.mjs`) allows exactly
`--size-11|13|16|24|32|40` (V6-D-04). Swap `t-caps c-600` → `t-label` in `components.js` (`sectionHead`, `statusHero` row label,
`customerPreview` title, `requestCard` "You take home", `deltaFigure` label) and in screens (each builder, own files); the
thread day divider keeps `.t-caps`.

### A3. Palette — `css/tokens.css` (monochrome + pastels; literal hex lives ONLY here)

```css
/* V6 canvas + ink (warm monochrome, no brand accent) */
--canvas: #F7F6F3;        /* page, status bar, nav, flow bar, sheets' scrim-side */
--surface: #FFFFFF;       /* cards, sheets, modals, inputs */
--surface-sunk: #F1F0EC;  /* segmented track, wells, skeleton, avatar ground, disabled CTA */
--surface-hover: #FBFBFA; /* list-row hover on white */
--ink: #111111;           /* titles, money, names, CTA fill, active nav, links */
--ink-hover: #333333;     /* CTA hover */
--text: #2F3437;          /* body copy */
--text-muted: #6B6A66;    /* secondary TEXT: 5.0:1 on canvas, 5.4:1 on white (V6-D-01) */
--text-faint: #787774;    /* glyphs, placeholders, inactive icons (brief's muted grey; never small text) */
--border: #EAEAEA;        /* THE 1 px rule: cards, dividers, outline buttons, chips */
--hairline: rgba(0, 0, 0, 0.06); /* row separators inside cards / lists */
--border-strong: #D9D8D3; /* input boundary at rest, dashed add tiles (V6-D-02) */
--control-ring: #8F8E89;  /* checkbox / radio / toggle-off ring: 3.0:1 non-text contrast (V6-D-02) */
--stitch-ink: #B4B3AE;    /* the stitched dash */

/* the four pastels (+ a neutral) — the ONLY colour besides garment illustrations */
--pastel-red-bg: #FDEBEC;    --pastel-red-ink: #9F2F2D;    /* 6.3:1 */
--pastel-blue-bg: #E1F3FE;   --pastel-blue-ink: #1F6C9F;   /* 5.0:1 */
--pastel-green-bg: #EDF3EC;  --pastel-green-ink: #346538;  /* 6.1:1 */
--pastel-yellow-bg: #FBF3DB; --pastel-yellow-ink: #956400; /* 4.6:1 */
--pastel-grey-bg: #F1F0EC;   --pastel-grey-ink: #5F5E5A;   /* 5.7:1 — neutral, not a colour */

/* photo-stub tones (flat, no gradients — V6-D-16) */
--photo-t0: #EFEDE8; --photo-t1: #F3F1ED; --photo-t2: #E9E6E0; --photo-t3: #EDEFEA;
--ambient: #E7E1D6;        /* the radial blob's warm light (A9) */
```

**Legacy tokens re-pointed (so un-touched rules go monochrome on day one; screens then migrate):**
`--white #FFF` · `--neutral-50: var(--canvas)` · `--neutral-100 #F1F0EC` · `--neutral-200 #EAEAEA` · `--neutral-300 #D9D8D3` ·
`--neutral-400 #B4B3AE` · `--neutral-500 #787774` · `--neutral-500-ink #6B6A66` · `--neutral-600 #5F5E5A` · `--neutral-700 #3F3E3B` ·
`--accent-base: var(--ink)` · `--accent-ink: var(--ink)` · `--accent-bg: var(--surface-sunk)` · `--sage: var(--neutral-600)` ·
`--success/--success-ink: var(--pastel-green-ink)`, `--success-bg: var(--pastel-green-bg)` · `--warning/--warning-ink:
var(--pastel-yellow-ink)`, `--warning-bg: var(--pastel-yellow-bg)` · `--error/--error-ink: var(--pastel-red-ink)`, `--error-bg:
var(--pastel-red-bg)` · `--info: var(--pastel-blue-ink)`, `--info-bg: var(--pastel-blue-bg)` (lint still bans `var(--info)` in
v5 CSS — use `--pastel-blue-*`) · `--media-placeholder: var(--border)` · `--text-footnote: var(--text-muted)`. **Delete**
`--tile-gradient`, `--component`, `--status-action-halo`. Utilities: `.c-accent`/`.c-accent-ink` → ink, `.c-info` →
`--pastel-blue-ink`, `.c-500` → `--text-muted`, new `.c-muted` (`--text-muted`) and `.c-text` (`--text`).
`::selection { background: var(--border); color: var(--ink) }`. Focus ring (components-v5 line 16): `outline: 2px solid var(--ink);
outline-offset: 2px`. Desktop backdrop (`@media (min-width:391px) body`) → `--surface-sunk`.

### A4. Status pills — `statusPill(status, label)` (markup kept, CSS restyled)

Markup stays `span.status.status--{tone}` (+ `.status__dot`, + `.status__word`) so `model-test.mjs:986` and every `sel` keep
passing. CSS: `.status { display:inline-flex; align-items:center; height:22px; padding:0 8px; border-radius:var(--radius-full);
background:var(--status-{tone}-bg); color:var(--status-{tone}-ink); font: 600 var(--size-11)/1 var(--font-sans);
letter-spacing:.06em; text-transform:uppercase; white-space:nowrap }` · `.status__dot { display:none }` (the pill is the
signal; the calm tone used to differ by shape — now it differs by being grey). Muted past rows keep their pill tone (no fade).

Tone tokens: `--status-action-{bg,ink}` = yellow · `--status-pending-*` = blue · `--status-progress-*` = blue ·
`--status-done-*` = green · `--status-stop-*` = red · `--status-calm-*` = grey (V6-D-03). Keep the old single-name tokens
(`--status-action` etc.) = the tone's ink, for any glyph still using them.

| statusPill key | label (unchanged) | tone | pastel | meaning |
|---|---|---|---|---|
| `new-request` | New request | action | yellow | tailor must answer |
| `suggested` | New time | action | yellow | customer must answer |
| `action` | Your move / per-label ("Approve order", "Pay now") | action | yellow | action needed |
| `requested` | Requested / Request sent | pending | blue | in flight, waiting on the other side |
| `awaiting-customer` | Awaiting customer | pending | blue | info |
| `waiting` | Waiting on customer | pending | blue | info |
| `price-change` | Price change / Order sent | pending | blue | info |
| `paused` | Paused | pending → **action** | yellow | the shop is not bookable: her move (V6-D-03) |
| `confirmed` | Confirmed / Accepted | progress | blue | scheduled |
| `fitting` | Fitting | progress | blue | info |
| `in-progress` | In progress | progress | blue | info |
| `tailoring` | Tailoring | progress | blue | info |
| `returning` | On its way | done | green | success |
| `ready` | Ready | done | green | success |
| `completed` | Completed / Paid | done | green | success |
| `bookable` | Bookable | done | green | success |
| `declined` | Declined | stop | red | error |
| `cancelled` | Cancelled (late / by tailor / no-show) | stop | red | error |
| `withdrawn` | Withdrawn | stop | red | error |
| `expired` | Expired | stop | red | error |
| `calm` | Cancelled (early) / No reply | calm | grey | neutral, no fault |

`paused` is the only key whose tone changes (`PILL_VARIANTS.paused.tone = 'action'`; update the one model-test line if it asserts
`paused`, it does not today). Tags that are not statuses reuse the pill chassis with `.tag` + `.tag--{blue|red|green|yellow|grey}`
(new CSS classes on the same rules): changeList "New" / "New price" / "New item" = blue, "Removed" = grey (V6-D-15); "Default"
(c-addresses, c-cards) = grey; "Required" (docs editor) = grey, red once `tried`; request-card countdown when soon = yellow.

### A5. Shapes, borders, shadows

```css
--radius-4: 4px;   /* inner: checkbox box, segmented thumb, photo-stack stubs */
--radius-6: 6px;   /* buttons, inputs, chips, filter pills, selects, toasts, tags-as-squares, photo tiles */
--radius-12: 12px; /* cards, sheets (top corners), modals, banners, scheduler, garment tiles, offset art tiles (MAX) */
--radius-full: 999px; /* pills, toggles, radio, unread dot, count badge, grabber only */
/* legacy remap, then migrate: --radius-sm: 6 · --radius-md: 12 · --radius-lg: 12 · --radius-20: 6 · --radius-xl: 12 */
--shadow-hover: 0 2px 8px rgba(0, 0, 0, 0.04);     /* interactive card lift on hover devices */
--shadow-float: 0 4px 16px rgba(0, 0, 0, 0.04);    /* menus, dropdowns, push card */
--shadow-overlay: 0 12px 40px rgba(0, 0, 0, 0.045);/* sheets, modals, toasts (ultra-diffuse, < .05) */
--scrim: rgba(17, 17, 17, 0.32);
```

Borders stay inset box-shadows (Figma strokes inside): card = `box-shadow: inset 0 0 0 1px var(--border)`. No other shadow
anywhere. Lint's blurred-shadow rule still passes (`var(--shadow-hover)` carries no literal lengths); keep it.

### A6. Icons — Phosphor Regular, inlined (no runtime library)

**Build step (foundation):** new `scripts/v6/phosphor.mjs` (Node, no deps) — for each name in the table, `curl -sfL
https://unpkg.com/@phosphor-icons/core@2.1.1/assets/regular/<name>.svg -o assets/phosphor/<name>.svg` (and
`assets/fill/star-fill.svg` → `assets/phosphor/star-fill.svg`), then writes **`js/phosphor.js`** (GENERATED header, MIT credit):
`export const PH = { house: '<path d="…"/>', … }` (the inner markup of each file). Commit both the SVGs and `js/phosphor.js`;
add `assets/phosphor/LICENSE` (Phosphor MIT). Add `js/phosphor.js` to lint's `SKIP_JS` (path decimals trip the rate regex).
All names below were checked to exist at 2.1.1.

`js/icons.js` keeps every export NAME (components compile unchanged) and rebuilds them through one helper:

```js
import { PH } from './phosphor.js';
export const ph = (name, { size = 16, cls = 'icon-16' } = {}) =>
  `<svg class="ph ${cls}" width="${size}" height="${size}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${PH[name]}</svg>`;
```

Phosphor glyphs are filled outlines: delete every `stroke`/`stroke-width` rule on icons (`.top-nav__link.is-active .nav-icon
{ stroke-width }`, `.icon-16` stroke rules, etc.). Size = the icon's job: nav 22, Back/close-in-bar 24, controls 20, inline/meta 16,
in-chip 14, badge 12. Colour = `currentColor` (inactive `--text-faint`, active / ink contexts `--ink`, tone contexts the pastel ink).

| V5 export / glyph | used by | Phosphor (regular) | px |
|---|---|---|---|
| `NAV_ICONS.home` | nav | `house` | 22 |
| `NAV_ICONS.bookings` | nav | `calendar-check` | 22 |
| `NAV_ICONS.messages` | nav | `chat-circle` | 22 |
| `NAV_ICONS.account` | nav | `user` | 22 |
| `NAV_ICONS.shop` | nav | `storefront` | 22 |
| `NAV_ICONS.earnings` | nav | `money` | 22 |
| `NAV_BACK`; `backButton()` text `‹`; `flowBar` `‹` | nav Back, flow bar, onboarding bar | `caret-left` | 24 |
| `ICON_MORE` | t-job ••• | `dots-three` | 24 |
| `ICON_CLOSE`; sheet `✕`; banner `✕`; flow-bar exit; c-job item ✕; t-adjust ✕ | close / remove | `x` | 20 (16 in banners) |
| sheet header `✓`; `selector` option `✓` | confirm / selected | `check` | 20 / 16 |
| `check-row__box ✓`; `option-row__check ✓`; timeline/stepper done `✓` | checked marks (white on ink) | `check` | 14 / 12 |
| `ICON_INFO` | ⓘ buttons, privacy note, info sheet rows | `info` | 16 |
| `ICON_VERIFIED` | verified mark + sheet | `seal-check` | 16 |
| `ICON_CHAT` | "Ask a question", "Message Sarah" links | `chat-circle` | 16 |
| `ICON_DIRECTIONS` | t-job Directions | `navigation-arrow` | 16 |
| `ICON_CALENDAR` | Add to calendar | `calendar-plus` | 16 |
| `ICON_LOCK` (components) ; c-pay `lock` | masked token, hold explainer | `lock-simple` | 14 / 16 |
| c-pay `clock`; `ICON_CAL_CLOCK` | hold explainer, calendar rows, "Next opening" | `clock` | 16 |
| c-pay `check` | hold explainer | `check-circle` | 16 |
| `ICON_ALERT`; c-pay `warn` | docs missing msg, warnings | `warning` | 16 |
| `ICON_IMAGE` | attach sheet "Choose from library" | `image` | 20 |
| `ICON_CAMERA`; c-review `CAMERA` | photo add tiles, attach, composer, avatar add | `camera` | 20 (24 in c-review / to-profile) |
| `ICON_CANCEL` (photo-tile remove) ; c-review `CLOSE` | remove a photo | `x` 12 in a 20 px ink disc, white glyph | 12 |
| `ICON_BELL` | push prompt / push-denied banner | `bell` | 16 |
| `ICON_WIFI_OFF` | offline banner | `wifi-slash` | 16 |
| `CHEVRON_DOWN`, `CHEVRON_10`, `SELECTOR_CHEVRON`, `TILE_CHEVRON` | selects, selector, filter pill, garment tile | `caret-down` | 16 (12 in pills, 20 tile) |
| `CHEVRON_RIGHT` (link-row, method-row, appt-row, thread-context, list-row) | row affordance | `caret-right` | 16 |
| `ICON_CAL_PREV` / `ICON_CAL_NEXT`; docs-viewer `‹ ›` | prev / next | `caret-left` / `caret-right` | 16 / 20 |
| `ICON_CARD`; c-pay/c-cards/c-ready `CARD_GLYPH` | payment method lead | `credit-card` | 24 |
| c-pay `ADD_CARD_GLYPH` | "Add a card" lead | `plus` | 20 |
| `ICON_ADD`, `ICON_ADD_CIRCLE`, `TILE_PLUS`, "+ Add a service/item/comment" text `+` | add | `plus` | 16 |
| `TILE_MINUS` | garment tile − | `minus` | 16 |
| `ICON_LOCATION_PIN`, `ICON_CAL_PIN` | address rows | `map-pin` | 16 |
| `META_ICONS.shop` / `.home` / `.bag` / `.truck` | where / getting-it-back rows, return options | `storefront` / `house` / `bag-simple` / `truck` | 16 (20 in c-ready option rows) |
| `ICON_EDIT` | filter-pill pencil | `pencil-simple` | 14 |
| `ICON_HANGER` | garment fallback | `coat-hanger` | 24 |
| `ICON_PIN` | Pinned photo badge | `push-pin` | 12 |
| rating `★` (`ratingLine`, `stars`, `reviewRow`, tailorRow) | ratings | `star-fill` (filled, ink) / `star` (unrated, `--text-faint`) — the ONE non-Regular glyph (V6-D-07) | 14 / 28 input |
| failed message Retry, courier "Try again" lead | retry | `arrow-clockwise` | 16 |
| `PILL_ICONS` | — | **delete** (unused since M7, V6-D-24) | — |

Not Phosphor (kept): the device status-bar glyph, the script Taily logo, the garment illustrations, the Apple Pay mark.
Screens with private SVG strings (c-pay, c-cards, c-ready, c-review) import from `icons.js` instead (screen builders).

### A7. Chrome: status bar, top nav, flow bar, onboarding bar, action bar

- **Status bar**: `--canvas` (was white). Time 13/600 ink.
- **Top nav** (`topNav`): `--canvas`, 56 h, bottom rule `inset 0 -1px 0 var(--border)`. Left: logo (74×34, ink) or — K-06 —
  the Back (`caret-left` 24 in a 44×44 button, glyph edge on the 20 px gutter). Right: four links, each `min-width:56px;
  height:52px`, column = icon 22 + 2 px + `.top-nav__label.t-micro` (visible label = the item's label; markup change in
  `topNav`: add `<span class="top-nav__label">${label}</span>` inside the link, drop `title`, keep `aria-label` = label + count so
  the accessible name starts with the visible label). Inactive: `--text-faint` icon, `--text-muted` label. Hover (hover devices):
  ink. Active: ink icon, label 600 ink, and a 20×2 px ink bar flush on the nav's bottom rule (replaces the 16 px accent stitch).
  Unread: 8 px **ink** dot with a 2 px canvas ring at the icon's top-right (V6-D-25). Gap 0 between links; they fit:
  20 + 74 + 4×56 + 20 = 338 ≤ 390.
- **Flow bar** (booking 2–5): canvas, bottom rule; `caret-left` 24 · compact stepper · `x` 22. **Onboarding bar**: canvas,
  `caret-left` + "Finish later" text link (ink, underline).
- **Compact stepper** (`stepper` compact, `bookingSteps`, `onboardingSteps`): label "Step 2 of 5 · Where and when" `.t-label`
  (`--text-muted`, the step name 500 ink); 2 px segments, radius 1, gap 4: done + current = ink, upcoming = `--border`
  (current no longer accent; the label names it).
- **Action bar** (`actionBar`): `background: color-mix(in srgb, var(--canvas) 92%, transparent); backdrop-filter: blur(12px)`,
  top rule `inset 0 1px 0 var(--border)`, padding 12 / 20 / 20 (+ safe area). Lead line `.t-small` muted with the money span
  600 ink. Primary CTA full width; secondary/tertiary = text links in one centred row, 24 apart.
- `.body` padding-top `var(--body-top)` = **124** (nav bottom 100 + 24). Side gutter 20 unchanged.

### A8. Components — before → after

Rhythm tokens: `--rhythm-tight 8` (row↔row) · `--rhythm-group 12` (head → first row, stacked controls) · `--rhythm-section`
**40** (was 32) · `--rhythm-major` **48** (was 40; hero → first section, last section → page actions) · `--card-pad` **20**
(was 16) · `--space-48` new. This is the phone version of the skill's macro whitespace (V6-D-20).

| Component | V5 (before) | V6 (after) |
|---|---|---|
| **Primary CTA** `.cta` | ink, 54 h, radius 20, Hanken 16/600, linen text, scale .97 | ink `#111`, **48 h**, **radius 6**, Geist 16/500, white text; hover `--ink-hover`; `:active` scale **.98**; transition bg 200ms + transform 120ms |
| Secondary `.cta--secondary` | white, 1 px neutral-300 | white, `inset 0 0 0 1px var(--border)`, ink text; hover `--surface-hover` |
| Danger `.cta--danger` | brick fill | `--pastel-red-ink` fill, white text (7.2:1) |
| Disabled / soft-disabled | flat neutral-200 + neutral-600 | `--surface-sunk` fill, `--text-muted` text, `inset 0 0 0 1px var(--border)`; no hover, no press |
| Busy | spinner | same; spinner 16 px, 1.5 px ring in currentColor at .3 + top segment solid |
| `cta-small` | white, neutral-300 ring, 12/600 | 44 min h (36 visual + hit), radius 6, `--border` ring, Geist 13/500, 16 px icon lead (`navigation-arrow`, `calendar-plus`); `--filled` = ink |
| **Text link** `.text-link` | accent ink 16/600, no underline | ink 16/500, `text-decoration: underline 1px; text-underline-offset: 4px; text-decoration-color: var(--stitch-ink)`; hover decoration ink; `--danger` = `--pastel-red-ink` + its own underline; `--muted` = `--text-muted`; 16 px Phosphor lead when given |
| **Card** `.card` | white, radius 16, chalk ring, pad 16 | white, **radius 12**, `inset 0 0 0 1px var(--border)`, **pad 20**; `.card--list` pads sides 20, rows 16 vertical with `--hairline` between. Interactive cards (tailor-row, request-card, appt-row, thread-row, thread-context, list-row cards, garment-tile, where card) get hover lift (A9). Reference content stays flat (D-193 kept) |
| Info block / reference rows | flat on linen | flat on canvas; rows separated by `--hairline` only when they are a list |
| **Section head** `sectionHead` | `h2.t-caps.c-600` 12/600 uppercase +1px | `h2.t-label` 13/500 sentence case `--text-muted`; count / aside right (13 muted); ⓘ `info` 16 `--text-faint`. Margin: `--rhythm-section` above, `--rhythm-group` below |
| **Heading** `headingRow` (K-06) | dot status line · Cormorant 28 h1 · notes | status **pill** line, 12 px, then `.t-title` 32 serif, 8 px, notes `.t-body` `--text-muted` max 34em. All flush left on the 20 gutter |
| **Status hero** `statusHero` | dot + serif title + caps row | pill + `.t-title`; row label `.t-label`, row value `.t-figure` |
| **Inputs** `field`, textarea, `codeInput`, `selectTime`, card fields | white, radius 12, 48 h, neutral-500 ring | white, **radius 6**, 48 h, `inset 0 0 0 1px var(--border-strong)`; hover `--control-ring`; focus `inset 0 0 0 1px var(--ink)` + global 2 px outline; label above `.t-label` (ink 500), helper `.t-small` muted, affix (`$`) `--text-faint`; error: ring `--pastel-red-ink`, message `.t-small` 500 red ink with `warning` 14 lead, directly under. Code input digits Geist Mono 24, `letter-spacing: .4em`. Textarea counter right, red when over |
| **Toggle** | 52×44 hit, ink track on, white outlined off | track 40×24 radius full in a 44 hit; on = ink track + white 18 knob; off = `--surface-sunk` track + `inset 0 0 0 1px var(--control-ring)` + `--text-faint` knob; 200ms knob transform |
| **Check row** box | 24, radius 8, ✓ text | 20, **radius 4**, `inset 0 0 0 1.5px var(--control-ring)`; checked = ink fill + white `check` 14 |
| **Option row** (radio) | ring, fills ink with ✓ | 20 circle, `--control-ring` ring; checked = ink fill + white `check` 12; row hover `--surface-hover` |
| **Chips / time chips** | white, bisque ring, ink selected, rounded | radius 6, white, `--border` ring, Geist 13/500 ink; selected = ink fill, white text |
| **Segmented** | oat track, rounded-full, selected = ink fill | `--surface-sunk` track radius 6 pad 3; options radius 4; selected = white thumb + `inset 0 0 0 1px var(--border)` + ink 600 text; unselected `--text-muted` 500; caption line 11 muted (V6-D-12) |
| **Filter pill** | caption + 44 box, pencil | caption `.t-label`; box radius 6, `--border` ring, white, value 16/500 ink, `pencil-simple` 14 faint; error ring red |
| **Selector** (service picker) | sunk row, chevron | inside a card: `--surface-sunk` row radius 6, 48 h, `caret-right` 16; menu = white radius 12 `--shadow-float` |
| **Sheet** | linen, radius 24 top, 36×4 grabber, ✕ · title · ✓ | **white**, radius **12** top, top rule `--border`, grabber 36×4 `--border-strong`, header row `x` 20 · title Geist 16/600 centred · `check` 20; scrim `--scrim`; `--shadow-overlay`; 280 / 200 ms kept |
| **Modal** | tissue, radius 24, serif title | white, **radius 12**, pad 24, `.t-h2` serif title, `--shadow-overlay`; enters from `translateY(8px) scale(.98)` 220 ms (kept) |
| **Toast** | ink pill, radius 20, 12/600 | ink, **radius 6**, Geist 13/500 white, pad 10/14, `--shadow-overlay`; success adds `check-circle` 16; error tone = `--pastel-red-bg` + red ink + `warning` 16; Undo = white underlined 500 (V6-D-26) |
| **Banner** | tinted, radius 12, title 16/600 | `--pastel-{tone}-bg`, radius 12, no border, pad 12/16; Phosphor tone glyph 16 (`info` blue, `warning` yellow, `warning` red, `check-circle` green, `wifi-slash` offline, `bell` push) in the tone ink; title 16/600 tone ink; text 13 `--text`; action = underlined text link in tone ink; dismiss `x` 16 |
| **Sys offline banner** | warning tint under nav | yellow pastel, `wifi-slash`, Retry = `cta-small` |
| **Push card** (in-app) | ink card over status bar | white, radius 12, `--border` ring + `--shadow-float`, `bell` 16, Geist 13, slides down (kept, gated) |
| **List row** `listRow` / `linkRow` / `methodRow` | 16 rows, chevron | title 16/500 ink, sub 13 muted, `caret-right` 16 faint, 56 min h, hairline between, hover `--surface-hover` |
| **Money rows** `moneyRows`, `customerBreakdown`, `tailorBreakdown` | label 16/500, amount 16/600, total 700, stitch above total | label 16/400 `--text`, caption 13 muted, amount 16/500 ink tabular; subtotal 600; **total 600 ink + label 600**; negative (Taily fee) `--text-muted`; changed amount ink 600 + blue "New price" tag; struck old amount `--text-faint`. Stitch kept |
| **Stitched dash** (signature) | 1.5 px, 6/4 Dust | kept: 1 px tall, 6 px dash / 4 px gap, `--stitch-ink`, 12 px above, 8 below; still exactly above the first total + the receipt line |
| **Price row** / prices list / rush ladder | 16 rows | same type as money rows; hairline between; amounts `fmt` precision rules unchanged |
| **Tailor row** `tailorRow` | avatar circle 40, Est. Hanken 24/600, accent "Next opening" | card r12 pad 20; squircle 40; name 16/600 ink; meta 13 muted with `star-fill` 12 ink + rating 500; `seal-check` 14 green-ink "Verified"; Est. `.t-figure` 24; hairline; "Includes …" 13 muted; "Next opening …" 13/500 **ink** with `clock` 14 faint; declined = whole row `--text-muted`, grey "Declined this job" tag |
| **Request card** (tailor inbox) | white r16, serif payout, 2 px ochre ring when soon | card r12 pad 20; squircle 40 + name 16/600 + meta 13; countdown 13/600 ink, **soon = yellow pill** (no ring, V6-D-27); `--suggested` shows the blue "Waiting on Sarah" pill; garment strip; hairline; "You take home" `.t-label` + `.t-figure` money + fee 13 muted |
| **Appt row** | 72 px, circle avatar, dot status, accent | card r12; squircle 40; name 16/600; time line 13 with garment inline 16; **pill** right-top; amount 16/600 tabular; caret-right 16; past rows: pill keeps tone, text muted |
| **Thread row / thread head / context** | circle avatar, dot | squircle 40; name 16/600 + time 13 muted; preview 13 muted 1 line; unread count = 18 px ink circle, white Geist 11/600 (was accent); context row = card r12, pill + `.t-body` 600 time, sub 13, `caret-right` |
| **Chat bubble** | ink me / white them, radius ~16 | me = ink, white text 16/1.45, radius 12 with 4 px bottom-right; them = white + `--border` ring, radius 12 / 4 bottom-left; time 11 muted; system line 13 muted centred; day divider `.t-caps` 11 faint centred; masked token = grey pill with `lock-simple` 12; failed = red ink 13 "Not sent" + `arrow-clockwise` Retry link |
| **Composer** | camera circle, pill input, sunk Send | camera button 44×44 radius 6 `--border` ring; input radius 6 48 h `--border-strong`; Send = ink radius 6 44 h (disabled = sunk/muted); hint 13 with `info` 14; photo tray thumbs 48 radius 6 |
| **Avatar** `avatar` | tinted accent circle + 22% ring | **squircle**: `border-radius: 30%`, `@supports (corner-shape: squircle) { border-radius: 50%; corner-shape: squircle }`; `--surface-sunk` ground, `inset 0 0 0 1px var(--border)`, initials Geist 600 ink (sm 40 and md 56 → 16 px, lg 80 → 24 px); muted = same ground, `--text-muted` initials; `photo:true` (add) = dashed `--border-strong` + `camera` 24 (V6-D-13) |
| **Garment head** (K-05) | bare 40 icon → underlined name 16/600 | kept exactly; underline 1 px **ink**, offset 4, skip-ink (it is NOT a link: links use the lighter `--stitch-ink` underline + 500 weight); tag = blue/grey pill; struck name for removed |
| **Photo stack** | 32 stubs, −12 overlap, linen ring, "n photos" 12/600 | 32 stubs radius 4, −12 overlap, 2 px **white** ring (canvas on flat rows), count `.t-micro` 500 muted; 44 h button |
| **Doc photo / photo stub** | gradient tone, tilted garment, white pin badge | flat `--photo-t0..t3` ground, radius 6, garment at 70% tilted −4/+3 (kept), pin badge = 20 white disc + `push-pin` 12 ink + `--border` ring |
| **Photo tile add** | dashed square, camera | radius 6, 1 px **dashed** `--border-strong`, `camera` 20 faint; hover ink; remove badge = 20 ink disc + white `x` 12 |
| **Garment tile** (c-job picker) | 110 h r16, tile gradient when selected | 110 h, **radius 12**, white, `--border` ring; label 13/500; selected = `inset 0 0 0 1.5px var(--ink)` (no gradient) + count label 13/600 + −/+ row (`minus`/`plus` 16) under a hairline; hover lift |
| **Garment strip** (c-request, c-booking) | 32 wells | 32 white squares radius 6 + `--border` ring, garment 24 inside; "2 items · 3 services" 13 muted |
| **Timeline** `timeline` / `progressBar` | ink ✓ discs, accent current ring, oat upcoming | done = 20 ink disc + white `check` 12; current = 20 ring 1.5 px ink + 6 px ink dot; upcoming = 20 ring 1 px `--border-strong`; 1 px `--border` connector; step title 13/600 ink (upcoming `--text-muted` 500), sub 13 muted |
| **Stepper** (full) | — | same as compact (A7) |
| **Scheduler / wheel** (`scheduler`, `wheel`) | white card, sunk selected band | card r12 `--border`; band = `--surface-sunk` radius 6; rows Geist 16 tabular, selected 600 ink, others 400 `--text-faint`; title `.t-h2` serif → **Geist 16/600** inside a card (the page h1 already says it) ; footnote ("Sarah sees …") `.t-label` |
| **Countdown** | t-figure / accent text | `.t-figure` on c-request; inline 13/600 ink elsewhere; soon = yellow pill |
| **Delta figure** | caps label + serif display amount | `.t-label` + `.t-money` + "Was $160.00 · up $45.00" 13 muted |
| **Note quote** `noteQuote` | tinted card | no fill: 2 px `--border-strong` left rule, pad-left 16; label `.t-label`; quote 16/400 `--text` with curly quotes (V6-D-19) |
| **Change list** `changeList` | accent tags, accent item wash | rows as money rows; "New" / "New price" / "New item" = blue tag; "Removed" = grey tag + struck row; NO wash on a new item (V6-D-15); `changeSummary` 13 muted |
| **Work list** `workList` | 16 rows, 44 thumb | garment heads + money rows; photo thumbs 44 radius 6 |
| **Docs editor** | dashed tiles, "Required" text | "Before photos" / "Pinned photos" `.t-label` + grey "Required" tag (red after `tried`); add tile as above; missing msg red 13 with `warning`; Save = `cta-small --filled`, Cancel = text link |
| **Courier card** | truck head, skeleton, error | card r12; `truck` 20 + "0.6 mi · from → to" 13 muted; ready = money rows; loading = skeleton + 13 live text; failed = red banner chassis inside + `arrow-clockwise` "Try again" `cta-small` |
| **Verified mark / sheet** | check badge | `seal-check` 14 `--pastel-green-ink` + "Verified" 13/500 green ink; sheet rows `seal-check` 16 |
| **Trust badges** | success-bg pills | grey tags, sentence case 13/500, radius 6 (not uppercase — they are facts, not statuses) |
| **Rating line / stars / review row** | `★` text accent | `star-fill` ink / `star` faint; input stars 28 in 44 hits, hover/selected fill ink; review row squircle 40, date 13 muted |
| **Info button / sheet** | ⓘ 16 | `info` 16 `--text-faint`, 44 hit; sheet rows `info` 16 |
| **More menu** | ••• | `dots-three` 24; menu = sheet |
| **ZIP chips** | rounded pills with × | radius 6, white, `--border` ring, ZIP in Geist Mono 13/500 ink, neighbourhood 13 muted, `x` 12 |
| **Day hours** (to-availability) | rows with selects | card list; toggle right; selects radius 6 Geist tabular; "–" `--text-faint` |
| **Customer preview / mini profile** | white card + caps title | `.t-label` title above a card r12 holding the real `tailorRow` markup (inert) |
| **Skeleton** | sunk lines shimmer | `--surface-sunk` blocks radius 6 (cards radius 12 with `--border`), opacity pulse 1.4 s (no shimmer gradient); off under reduced motion / is-test |
| **Empty state** `emptyState` | garment in 120 tinted disc, centred, serif title | **left-aligned**: offset tile = 112 white square radius 12 `--border` ring, behind it a 112 `--surface-sunk` square offset 8/8; garment hero 80 tilted −4 inside; `.t-h2` title 16 below; body 16 muted max 30em; CTA + text link left-aligned (V6-D-17) |
| **Leave modal** | tissue modal | modal chassis above |
| **Read-only banner** (threads) | tinted | grey banner (pastel-grey), `lock-simple` 16 |
| **Flow-menu** (Test flows, dev) | — | tokens only; no redesign beyond the remap |

### A9. Motion

Tokens: `--ease-out: cubic-bezier(.23,1,.32,1)` (press, sheets — kept) · `--ease-enter: cubic-bezier(.16,1,.3,1)` ·
`--dur-enter: 600ms` · `--enter-y: 12px` · `--stagger: 80ms` · `--dur-hover: 200ms` · `--dur-press: 120ms` ·
`--press-scale: 0.98` · `--dur-sheet-in 280ms` / `--dur-sheet-out 200ms` / `--dur-modal 220ms` (kept).

1. **Press**: the existing one-rule list (`components-v5.css` "press") keeps working with `--press-scale .98`.
2. **Hover lift** (hover devices only):
   ```css
   @media (hover: hover) {
     :is(.tailor-row, .request-card, .appt-row, .thread-row, .thread-context, .garment-tile, .where__card, .card--hover) {
       transition: box-shadow var(--dur-hover) ease, transform var(--dur-press) var(--ease-out); }
     :is(.tailor-row, .request-card, .appt-row, .thread-row, .thread-context, .garment-tile, .where__card, .card--hover):hover {
       box-shadow: inset 0 0 0 1px var(--border), var(--shadow-hover); }
     .cta:hover:not(:disabled):not([aria-disabled="true"]) { background: var(--ink-hover); }
     .text-link:hover { text-decoration-color: currentColor; }
     :is(.list-row, .option-row, .method-row):hover { background: var(--surface-hover); }
   }
   ```
3. **Scroll entry + stagger** — new integrator file `js/motion.js`, called from `app.js render()` right after the screen's
   `wire` (and after `wireSystem`): `wireReveal(el, id)`.
   ```js
   /* js/motion.js — V6 entry motion. Content is visible at rest: nothing hides unless html.motion-ok is set, and that is set
      only when the page is NOT in test mode and the viewer has no reduced-motion preference. Runs once per screen ARRIVAL,
      never on a same-screen re-render (render() runs on every interaction). */
   let last = null;
   const motionOk = () => !document.documentElement.classList.contains('is-test')
     && 'IntersectionObserver' in window && matchMedia('(prefers-reduced-motion: no-preference)').matches;
   const SKIP = '.action-bar, .sheet, .modal, .toast, .top-nav, .status-bar, .flow-bar, .ob-bar, .sys-banner';
   const LISTS = '.card--list, [role="list"], .appt-list, .request-list, .thread-list';
   export function wireReveal(root, screenId) {
     const arrival = screenId !== last; last = screenId;
     if (!arrival || !motionOk()) return;
     document.documentElement.classList.add('motion-ok');
     const blocks = [...root.querySelectorAll('.body > *')].filter((el) => !el.matches(SKIP));
     for (const list of root.querySelectorAll(`.body ${LISTS}`)) {
       [...list.children].slice(0, 12).forEach((item, i) => { item.dataset.stagger = ''; item.style.setProperty('--i', Math.min(i, 8)); });
     }
     let batch = 0;
     const io = new IntersectionObserver((entries) => {
       const ins = entries.filter((e) => e.isIntersecting);
       ins.forEach((e, k) => { e.target.style.setProperty('--i', Math.min(batch + k, 5)); e.target.classList.add('is-in'); io.unobserve(e.target); });
       batch = 0;   // only the first (above-the-fold) batch cascades; later blocks enter on their own
     }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
     blocks.forEach((el) => { el.dataset.reveal = ''; io.observe(el); });
   }
   ```
   ```css
   /* components-v5.css "V6 motion" */
   @media (prefers-reduced-motion: no-preference) {
     html.motion-ok [data-reveal] { opacity: 0; transform: translateY(var(--enter-y)); }
     html.motion-ok [data-reveal].is-in { opacity: 1; transform: none;
       transition: opacity var(--dur-enter) var(--ease-enter), transform var(--dur-enter) var(--ease-enter);
       transition-delay: calc(var(--i, 0) * var(--stagger)); }
     html.motion-ok [data-reveal].is-in [data-stagger] { animation: v6-rise var(--dur-enter) var(--ease-enter) both;
       animation-delay: calc(var(--i, 0) * var(--stagger) + 120ms); }
     @keyframes v6-rise { from { opacity: 0; transform: translateY(var(--enter-y)); } }
   }
   @media (prefers-reduced-motion: reduce) {
     html.motion-ok [data-reveal] { opacity: 1 !important; transform: none !important; }
     [data-stagger] { animation: none !important; }
   }
   ```
   `html.is-test` already kills transitions/animations (base.css), and `motion-ok` is never added there, so harness shots and
   expects see final state. Focus restore (`pendingFocus`) and `a[data-anchor]` scroll are unaffected (transform only). Overlays,
   bars, the system banner and sheets never reveal. `will-change` not used.
4. **Ambient blob** — only on c-welcome, c-complete and to-done (V6-D-09). The screen adds
   `<div class="ambient" aria-hidden="true"></div>` as the first child of its `main` (screen-owned markup); CSS in components-v5:
   ```css
   .ambient { position: fixed; inset: 0; max-width: 390px; margin-inline: auto; pointer-events: none; z-index: 0;
     background: radial-gradient(60% 40% at 30% 18%, var(--ambient), transparent 70%); opacity: .04; }
   .ambient ~ * { position: relative; z-index: 1; }
   @media (prefers-reduced-motion: no-preference) { html:not(.is-test) .ambient { animation: v6-drift 24s ease-in-out infinite alternate; } }
   @keyframes v6-drift { to { transform: translate3d(8%, 6%, 0) scale(1.08); } }
   ```
   (Static in tests → deterministic baselines.)
5. Skeleton pulse, toggle knob, push-card slide, sheets/modals: unchanged timings; all already gated.

### A10. Harness, lint, gallery (integrator)

- `scripts/v5/clickthrough-flows.mjs` and `scripts/v5/journeys.mjs`: `norm` lower-cases (`String(s).replace(/\s+/g,' ').trim()
  .toLowerCase()`) — pills render uppercase via CSS and section heads go sentence case, both of which change `innerText` case
  (39 uppercase literals in m1–m5 + journeys, plus every sentence-case pill word such as m3:21 'Confirmed') (V6-D-06). After the
  change re-run and fix any `not:` that now matches a different-case string (none found in the survey).
- `scripts/v5/lint.mjs`: rule 2 allows `--size-11|13|16|24|32|40`; `SKIP_JS` adds `js/phosphor.js`; keep every other rule.
- `js/fixtures/m0.js:14` expect `'Taily v5'` → `'Taily v6'` with the sys-index title copy (V6-D-22); c-account footnote
  "Taily prototype · v6".
- Visual baselines: every key changes. Each cluster re-accepts its own keys after review (`npm run visual -- --accept <key>`,
  listed in the commit); foundation accepts `sys-components` + `sys-index`.
- `sys-components` gallery gains a "V6" group: palette swatches, every `statusPill` key as a pill, tags, the type scale, every
  Phosphor icon (from `PH`) at 16/20/22, avatar sizes + muted, CTA states (default/hover-class/disabled/busy), card + hover-class,
  inputs (rest/focus/error), toggle/check/radio, segmented, empty-state offset tile, stitched dash.

### A11. Build order (foundation before clusters)

1. Foundation (one agent): A1 fonts · A3 tokens + remaps · A2 type classes + size sweep + lint rule 2 · A5 radii/shadows ·
   A6 phosphor script + `js/phosphor.js` + `icons.js` rebuild + unicode glyph swaps in `components.js` · A4 pills · A7 chrome ·
   A8 every shared component · A9 `js/motion.js` + CSS + app.js hook · A10 harness/lint/gallery. `npm run check` (visual step
   expected to fail on diffs only; no flow/expect/lint failures).
2. Four clusters in parallel (§C), screen files only, then `npm run check` sequentially, review, accept visuals.

---

## §B SCREEN CHECKLIST (every id in `js/inventory.js`)

**Applies to every screen (done by the foundation, verify only):** fonts; canvas chrome; nav icon + label; Back `caret-left`;
`--body-top` 124; `.sec` 40 / hero 48; sentence-case section heads; pills; Phosphor icons through `icons.js`; CTA 48/r6; cards r12
pad 20; inputs r6; sheets/modals/toasts/banners; money rows; stitch; squircle avatars; reveal motion. **Each builder:** remove
screen-CSS literals that fight the system (old radii, `--size-*` px line-heights, accent colours, `t-caps c-600` → `t-label`,
`w-600` on serif, `.t-display` money → `.t-money`), re-check wraps at 390 with the new metrics, keep every class / data-attr
used by expects. Expects: none change except where listed (the case-insensitive harness absorbs pill / heading case).

### Cluster 1 — customer booking

| id | visual changes | containers | pills | icons | expects |
|---|---|---|---|---|---|
| `c-welcome` | Hero art becomes the left-aligned offset tile (garment jacket); title `.t-display` 40 left, max 9em; body 16 muted max 30em; 48 between hero → actions; "or" divider = hairline with 13 muted "or"; legal 13 muted, links ink underlined; ambient blob | flat; Apple/Google = secondary CTAs (white, `--border`) | — | — (brand marks unchanged) | none |
| `c-phone` | Back-only bar on canvas; `.t-title`; field r6 48; helper 13 muted; action bar canvas+blur | flat | — | `caret-left` | none (`--invalid` red ring + message, `--sending` busy CTA) |
| `c-code` | Code box Geist Mono 24 tracked; "Change number" text link ink (was accent); resend 13 muted; wrong/expired = red field + message | flat | — | `caret-left`, `warning` | none |
| `c-name` | Two fields r6; errors under each | flat | — | — | none |
| `c-job` | Compact stepper (ink segments) first; title; garment tile grid 3-up gap 8, tiles r12 + ink ring when selected, −/+ `minus`/`plus`; "Your items" `.t-label` + count; item cards r12 pad 20 with K-05 head, service selector sunk row r6, `x` 20 remove; photo add tile dashed r6 + `camera`; max / no-service banners as pastel | item cards = cards; tile grid = tiles; rest flat | — | `plus` `minus` `x` `camera` `caret-right` `caret-down` | none |
| `c-where` | Flow bar; Visit segmented = white thumb; address + need-by = cards r12 with "Change" text links (ink underline); footnote 13 muted; address sheet white r12; need-by sheet; zip-invalid / required / past = red message under the card | address + need-by cards | — | `caret-left` `x` `map-pin` `pencil-simple` | none |
| `c-tailors` | Flow bar; filter pills r6 + `pencil-simple`; "1 tailor" 13 muted + `info`; "Sort: Recommended" text link ink; tailor row per A8; empty states = offset tile left-aligned; loading skeleton r12; sort sheet option rows; booked / declined rows | tailor rows = cards | grey "Declined this job" tag | `star-fill` `seal-check` `clock` `info` | none |
| `c-tailor` | Header: squircle 56 + name `.t-title` + shop 16 muted + meta 13; "Ask a question" link with `chat-circle`; estimate breakdown flat + stitch; About 16 `--text` max 34em; Prices / Rush fees lists with hairlines; Where + Getting it back meta rows with `storefront` `house` `bag-simple` `truck`; reviews with squircle 40 + `star-fill`; "See all" links ink | flat (reference) | — | as listed + `info` | none |
| `c-book` | Flow bar; tailor meta 13 muted; scheduler card r12 (title Geist 16/600), band sunk r6; action bar lead | scheduler card | — | — | none |
| `c-pay` | Flow bar; "Your visit" `.t-label` + `.t-figure` time, "Change time" text link ink; order garment heads; breakdown + stitch; hold explainer meta rows (`lock-simple`, `clock`, `check-circle`, `warning` via icons.js — delete the screen's private SVGs); Pay with method row card r12 with `credit-card` 24 + `caret-right`; CTA label drops `.t-h2` (Geist 16/500 "Hold $16.00 and send request"); 3DS / processing modals r12; declined red banner; rush / shop variants | method row card | — | listed | none |
| `c-request` | Status pill line (Request sent = blue; New time = yellow; Declined/Expired = red; withdraw → calm grey) above `.t-title`; countdown `.t-figure` + 13 muted deadline; visit rows; garment strip; timeline per A8; price + stitch; Message = primary, Withdraw = danger text link; suggested time in a card r12 with `.t-figure`; declined note-quote left rule; withdraw sheet | suggested-time card; rest flat | requested/suggested/declined/expired/calm | `check` (timeline) | none |
| `sys-index` | Title `.t-display` "Taily v6"; milestone list rows hairline; overlay keys = grey tags (no accent ring) | flat | — | `caret-right` | **m0.js:14 `'Taily v5'` → `'Taily v6'`** |

### Cluster 2 — customer post-booking + account + messages

| id | visual changes | containers | pills | icons | expects |
|---|---|---|---|---|---|
| `c-bookings` | Tab root `.t-title`; "Upcoming" / "Past" `.t-label`; appt rows per A8 (r12 cards, squircle, pill top-right, amount 600, `caret-right`); push-denied = blue banner `bell`; empty offset tile | appt rows = cards | every booking tone | `caret-right` `bell` | none |
| `c-booking` (16) | Pill line per state (confirmed/fitting/in-progress blue, returning/completed green, cancelled/no-show/cant-make-it red, early-cancel calm grey); `.t-title`; Visit `.t-figure`; garment strip; timeline; price + stitch; footnote 13 muted; Message primary + Reschedule / Cancel links (Cancel danger); cancel / cancel-late sheets (white r12, danger CTA red fill, Keep = secondary); reschedule scheduler card; docs viewer sheet (`caret-left/right` 20, Before/Pinned segmented white thumb); returning courier card r12; completed receipt with stitch | courier card, scheduler; rest flat | all booking tones | `x` `check` `caret-*` `truck` `bag-simple` `house` | none |
| `c-price-change` (8) | Yellow "Approve order" pill; `.t-title`; delta figure `.t-label` + `.t-money` 32 + 13 muted was/up; note-quote left rule; "What changed" + `changeSummary`; change list tags blue / grey, no item wash, struck rows; photo stacks; price + stitch; action bar lead "New balance …" + Approve primary + Message link; photo viewer | flat | action | `caret-*` `push-pin` | none |
| `c-ready` (12) | Green "Ready" pill; return options = option rows in a card r12 (`bag-simple` `house` `truck` 20, "Free" 13/600 ink, radio per A8); courier loading skeleton / failed red banner with `arrow-clockwise`; pay sheet; soft-disabled Pay (sunk) + note 13 muted; processing modal; pay-failed red banner; refund green banner; order + price + stitch | return-options card, courier card | done | listed + `credit-card` (replace private CARD_GLYPH) | none |
| `c-complete` | Green "Completed" pill; `.t-title`; strip; "How did Amara do?" rating card r12 with input stars 28 (`star`/`star-fill`); receipt + stitch; ambient blob | rating card | done | `star` `star-fill` `bag-simple` | none |
| `c-review` (4) | `.t-title`; rating label `.t-label`; input stars 28; textarea r6 + counter; photos add tiles dashed r6 + `camera` 24 (icons.js), remove badge ink disc + `x`; error red banner; submitted = green banner / toast | flat | — | `star` `star-fill` `camera` `x` | none |
| `c-messages` (3) | Tab root; thread rows r12 cards with squircle, pill, ink unread count; skeleton rows; empty offset tile | thread rows = cards | booking tones | — | none |
| `c-thread` (11) | Thread head (squircle 40, name 16/600, sub 13 muted); context row card r12 with pill + `caret-right`; privacy note 13 muted + `info`; day divider `.t-caps` 11 faint; bubbles per A8; system lines; composer per A8; attach sheet rows `camera` / `image`; failed / offline red text + Retry; masked token grey pill + `lock-simple`; read-only grey banner + `lock-simple`; expired | context row card | booking tones | listed | none |
| `c-account` (2) | Tab root; profile block: squircle 80 (`--avatar-lg`, initials 24) + name 16/600 + phone Geist + email 13 muted; list rows in a card r12 (`.card--list`, `caret-right`); Sign out = text link; footnote "Taily prototype · v6" 11 faint; sign-out modal r12 serif `.t-h2` | list card | — | `caret-right` | none |
| `c-addresses` (4) | `.t-title`; address cards r12 pad 20; "Default" grey tag (radius full, caps); Remove = danger link, Make default = ink link; add sheet fields r6; error under field; empty offset tile; action bar | address cards | grey tag | `map-pin` (optional lead) | none |
| `c-cards` (5) | Card rows in a card list with `credit-card` 24 (icons.js), last-4 Geist Mono, "Default" grey tag, `caret-right`; Apple Pay row; remove modal; in-use yellow banner; add sheet card fields r6 | card list | grey tag | `credit-card` `caret-right` | none |
| `c-orders` (3) | Past appt rows (pill keeps tone); skeleton; empty offset tile | appt rows | done / stop / calm | `caret-right` | none |

### Cluster 3 — tailor onboarding + shop (+ the component gallery)

| id | visual changes | containers | pills | icons | expects |
|---|---|---|---|---|---|
| `t-phone` (3) | As c-phone; "saved" state; join copy link ink underline (was accent) | flat | — | `caret-left` | none |
| `t-code` (4) | As c-code | flat | — | `caret-left` `warning` | none |
| `to-profile` (3) | Onboarding bar (`caret-left`, "Finish later" ink link); stepper ink segments; `.t-title`; photo add = squircle 80 dashed + `camera` 24 + "Add a photo" ink link; fields r6; textarea counter; work-photo tiles dashed r6; errors red | flat | — | listed | none |
| `to-services` (6) | Service rows in a card list: check box 20 r4, name 16/500, garments 13 muted, price input r6 (`$` affix faint, Geist tabular), "You take home $22.50 · Taily fee $2.50" 13 muted; fee note 13 muted + `info`; "On your profile" summary flat list with hairlines; missing-price red | services card list | — | `check` `info` | none |
| `to-where` (6) | Two toggle cards r12 (shop / home) with fields r6 inside; ZIP chips r6 Geist Mono + `x` 12; fee field; neighbourhood 13 muted; errors red | toggle cards | — | `x` | none |
| `to-returns` (3) | Check rows in a card list; "What customers see" `.t-label` + preview card (returns rows with `bag-simple` `house` `truck`) | card list, preview card | — | listed | none |
| `to-availability` (5) | Shop / Home segmented white thumb (caption 11 muted); "Shop hours" `.t-label` + note; day rows card list: day 16/500, toggle, time selects r6 Geist tabular, "–" faint; overlap / range errors red under the row | day card list | — | `caret-down` | none |
| `to-payouts` (4) | Taily-fee explainer: `.t-label` + 16/500 ink sentence ("On $100.00 of services, Taily keeps $10.00 …"), note 13 muted, `info`; bank fields r6 with routing / account Geist Mono; helpers 13 muted; returned red banner | flat | — | `info` | none |
| `to-done` (1) | Offset-tile hero left-aligned; `.t-display` "You're bookable"; body muted; "How a customer in Williamsburg sees you" `.t-label` + preview card; "What happens next" numbered list: 24 px `--surface-sunk` squares radius 6 with Geist Mono 13 numerals; CTA + link; ambient blob | preview card | — | — | none |
| `t-shop` (3) | Tab root `.t-title`; status card r12: green "Bookable" / yellow "Paused" pill + "Taking requests" toggle row; "What customers see" `.t-label` + preview card; "Your setup" list rows card (`caret-right`, sub 13 muted); incomplete = yellow banner + row note red 13; Sign out link | status card, preview card, setup list card | bookable / paused | `caret-right` | none |
| `t-rush` (3) | `.t-title`; toggle row; tier fields r6 inside a card (labels `.t-label`, `$` faint); "4 days or more · No rush fee" row; "What customers see" preview; soft-disabled Save + note; unsaved leave modal | tiers card, preview card | — | — | none |
| `sys-components` (1) | Gallery re-shot with every V6 component; add the "V6" group (A10) | — | all | all | none |

### Cluster 4 — tailor inbox / job / earnings / messages

| id | visual changes | containers | pills | icons | expects |
|---|---|---|---|---|---|
| `t-home` (14) | Tab root "Hi, Amara" `.t-title`; meta 13 muted; "New requests" / "Upcoming" `.t-label` + counts; request cards per A8 (money `.t-figure`, not serif `.t-h2`); soon = yellow countdown pill (no ring); suggested = blue "Waiting on Sarah"; retried; upcoming appt rows; in-progress rows; push card (white, `bell`); push-denied blue banner; paused yellow banner; empty / no-requests / no-upcoming = 16 muted line or offset tile | request cards, appt rows | new-request, waiting, confirmed, in-progress … | `bell` `caret-right` | none |
| `t-request` (15) | Yellow "New request" pill; `.t-title` "Sarah C."; deadline line 13/600 ink (yellow pill when soon); "You take home" `.t-label` + **`.t-money`** (was serif `.t-display w-600`) + fee 13 muted; visit `.t-figure` + rows; work list; take-home breakdown + stitch; action bar Accept + "Suggest time" / "Decline" (danger) links; decline sheet option rows; accepting / declining busy; declined / expired / retried / suggested / withdraw states with their pills; rush + shop variants | flat; sheets | new-request, waiting, declined, expired, calm | `info` `check` | none |
| `t-suggest` (3) | `.t-title`; body 16 muted; scheduler card (Geist 16/600 title); "Sarah sees …" `.t-label` (was caps); footnotes 13 muted; sending busy | scheduler card | — | — | none |
| `t-job` (31) | Pill per status; `.t-title` "Visit with Sarah Chen" + `dots-three` 24; Visit `.t-figure` + rows; Directions / Add to calendar `cta-small` with `navigation-arrow` / `calendar-plus`; customer row squircle 40; work list + docs (photo stacks, flat stubs, pin badge); take-home + stitch; payout figure **`.t-money`** (was `.t-display`); Message primary; mark-ready sheet (check rows + courier note); can't-make-it sheet (option rows); no-show; more sheet; courier card (tailor); waiting / approved / replied / messaged banners (blue / green); completed-paid / failed (green / red banners) | courier card, sheets; rest flat | every tailor tone | listed + `check` `x` | none |
| `t-adjust` (20) | Eyebrow "At the fitting" `.t-label`; `.t-title` "Edit the job"; garment cards r12 pad 20 (K-05 head, service rows with price inputs r6 + `x` 20, "+ Add a service" list row with `plus` 16 + `caret-right`); docs editor per A8 (grey "Required" tags → red when tried, dashed add tiles, flat stubs); comment textarea; "Remove item" danger link; "Add an item" card row; note textarea + counter; "What changes" + summary; take-home + stitch; action bar two-column lead + Send (soft-disabled sunk) + note; add-item sheet (garment tiles r12); leave modal; photo viewer; error red banner | garment cards, add-item card row | — | `plus` `x` `camera` `push-pin` `warning` `caret-right` | none |
| `t-earnings` (7) | Tab root; "Next payout" `.t-label` + **`.t-money`** (was `.t-display`) + "Arrives Fri, Oct 23 · to Chase ••6789" 13 muted (last-4 Geist Mono); payout rows card r12 (garment inline 24, name 16/600, items 13 muted, amount 16/600, `caret-right`); "Paid" sections; failed red banner + merged `.t-figure`; kept; skeleton; empty offset tile | payout row cards | — | `caret-right` `info` | none |
| `t-payout` (4) | Pill (Paid green / failed red / kept red / no-show red); `.t-title`; `.t-money` amount; meta 13 muted; job row card; "How it adds up" `.t-label` + breakdown + stitch | job row card | done / stop | `caret-right` | none |
| `t-messages` (3) | As c-messages (tailor wording) | thread rows | new-request, confirmed … | — | none |
| `t-thread` (7) | As c-thread (tailor reader) | context row card | tailor tones | listed | none |

---

## §C CLUSTERS

Foundation first (§A11). Then four builders in parallel, each touching only its screens' `js/screens/<id>.js` +
`css/screens/<id>.css` (+ its own `FLOWS_<id>` arrays only if a listed expect changes). Balance: screen count 12 / 12 / 12 / 9; the
fourth cluster is the heaviest in states (t-job 31, t-adjust 20, t-request 15, t-home 14) but most of its change is inherited from
the foundation's work list / docs editor / request card, so per-screen CSS work is comparable.

1. **customer-booking** — c-welcome, c-phone, c-code, c-name, c-job, c-where, c-tailors, c-tailor, c-book, c-pay, c-request, sys-index
2. **customer-post-booking-account-messages** — c-bookings, c-booking, c-price-change, c-ready, c-complete, c-review, c-messages, c-thread, c-account, c-addresses, c-cards, c-orders
3. **tailor-onboarding-shop** — t-phone, t-code, to-profile, to-services, to-where, to-returns, to-availability, to-payouts, to-done, t-shop, t-rush, sys-components
4. **tailor-inbox-job-earnings-messages** — t-home, t-request, t-suggest, t-job, t-adjust, t-earnings, t-payout, t-messages, t-thread

---

## §D CLAUDE.md for V6 (text for the orchestrator to apply — the spec writer does not edit CLAUDE.md, V6-D-23)

Change the first heading line and the intro sentence to:

```md
# Taily v6 prototype — rulebook

Plain HTML/CSS/JS, no build step, branch `V6` = the v5 prototype with a visual redesign (`docs/v6/BRIEF.md`,
`docs/v6/V6-spec.md`, calls in `docs/v6/DECISIONS.md`). Every v5 screen, flow, state, money and copy rule below still holds.
`V5` stays the v5 branch; v4 lives on `main`; its rulebook is archived verbatim at the end of `docs/HISTORY.md`
("v4 rulebook (archived Oct 2026)").
```

Replace the whole `## Design rules (kept from v4)` section with:

```md
## Design rules (V6 — minimalist warm monochrome)

- Colours, spacing, radius, type sizes ONLY through `css/tokens.css` variables; no literal hex / px font-size outside
  `tokens.css` / `base.css` (hygiene step enforces it).
- **Fonts:** Instrument Serif (one weight, `font-synthesis: none`) for `.t-display` 40 · `.t-title` 32 · `.t-h2` 24, tracking
  −0.02 to −0.03em, line-height 1.05–1.15; Geist for everything else; Geist Mono only for codes, last-4 masks, routing/account
  digits and ZIP chips. Loaded from Google Fonts in `index.html`.
- **Type scale** 11 / 13 / 16 / 24 / 32 / 40 via `.t-display .t-title .t-h2 .t-money .t-figure .t-body .t-label .t-small .t-caps
  .t-micro` + `.w-*` + `.c-*` (`base.css`). Money is Geist (`.t-money` hero, `.t-figure` card, rows 16), tabular, never serif.
  Section heads are sentence-case `.t-label`; uppercase only inside pills / tags. Hierarchy by size step + weight + ink vs muted.
- **Palette:** canvas `--canvas` #F7F6F3, surfaces white, ink #111 (titles, money, CTA, links, active), body `--text` #2F3437,
  secondary `--text-muted` #6B6A66, glyphs `--text-faint` #787774, rules `--border` #EAEAEA / `--hairline`. **No brand accent**:
  links = ink + underline; active = ink + weight.
- **Pastels** are the only colour besides the garment illustrations: red / blue / green / yellow (`--pastel-*-bg` + `-ink`) +
  neutral grey, mapped by meaning — error / info / success / action-needed — through `statusPill` (small uppercase pills) and
  `.tag`, banners and field errors. The tone map lives in `V6-spec.md` §A4.
- **Shapes:** buttons, inputs, chips 6 px; cards, sheets, modals, banners 12 px max; pills / toggles / radios full. 1 px
  `--border` drawn INSIDE (`box-shadow: inset 0 0 0 1px …`, Figma strokes are inside). No shadows except `--shadow-hover`
  (interactive cards on hover devices) and `--shadow-float` / `--shadow-overlay` (< .05 alpha) on overlays. No gradients
  (the ambient blob is the one sanctioned radial light, three screens).
- **Icons:** Phosphor Regular only, inlined from `js/phosphor.js` (generated by `scripts/v6/phosphor.mjs` from
  `@phosphor-icons/core@2.1.1`) through `ph()` / the named exports in `js/icons.js`; never a unicode glyph as an icon, never a
  runtime icon library. Ratings use `star-fill` (the one Fill glyph). Avatars are squircle initials. Garment illustrations and
  the stitched dash above totals are the signatures — keep them.
- **Layout:** phone only, 390 wide on the canvas; status bar 0/0 h44 + top nav 0/44 h56 (icon + label; Back replaces the logo,
  K-06), `.body` padding-top `--body-top` 124, sides 20; rhythm 8 / 12 / 40 / 48; card padding 20. One ink primary per screen.
- **Motion:** press `scale(.98)`; hover lift; entry fade-up 12 px / 600 ms `cubic-bezier(.16,1,.3,1)` + 80 ms stagger via
  `js/motion.js` (IntersectionObserver, on screen arrival only). Everything gated by `prefers-reduced-motion`; `html.is-test`
  disables all motion and content is always visible at rest. Animate transform / opacity only.
- Add a component variant in `js/components.js` / `css/components-v5.css` before using it; never fork a component inside a
  screen. 44 px touch targets, visible labels, errors next to the field, loading feedback, reduced motion.
```

Also in `## Harness`: add "text expects match case-insensitively (V6-D-06)". In `## How v5 is built`, the Figma line reads
"V6 pages `User - v6`, `Tailor - v6`, `Tailor - Onboarding v6` + a `V6` component section; V4 and V5 pages are never touched".
Everything else in CLAUDE.md stays as is.
