# M7: World-class polish (build instructions)

Oct 14, 2026 · design director (Opus) · branch `V5` · follows Kevin's **K-03** (LOCKED, `DECISIONS.md`) and his M7 approval:
**no bottom tab bar (web app), the top nav becomes icons, avatars stay initials, signatures are the garment illustrations and a
stitched dash divider.** Builders read **§0 + §A + their §B cluster + §D** and `docs/v5/CONTEXT.md`. Calls this spec had to make are
**D-186…D-199** in `DECISIONS.md`, cited inline.

**What M7 is.** A visual and copy pass over every screen. **No behaviour, money, transition, state key or flow changes**, except
the ones listed here: the booking flow bar (D-186), the Verified sheet (D-189), the ⓘ info sheets (D-191), the t-job ••• menu
(D-195), the "Required" photo state (D-196) and the copy cuts in §B. Money stays dollars only, through `fmt / fmtExact / fmtNeg /
fmtColumn`; no amount is added, removed or re-precisioned. Every visual baseline changes (§D3).

**Order.** (1) **System builder**: all of §A (tokens, `base.css`, `components.css`, `components-v5.css`, `components.js`,
`icons.js`, the `sys-components` gallery block "M7 · polish"), serial, `npm run check` may fail on visuals and on the §D1 expects
only. (2) **Four cluster builders in parallel** (§C): each takes its §B rows, its own screen JS/CSS and its own `FLOWS_<id>` arrays.
(3) **Integrator** §D: SCREENS.md + inventory (new state keys), lint rule, `--accept` every visual key, journeys.

**M7 done when** `npm run check` is green and, by hand at 390 wide: the top nav is four 24 px line icons with an ink active state
and an accent stitch under it, a dot on Bookings / Messages when something waits; tapping **Next** on c-job swaps the nav for the
**flow bar** (‹ · "2 of 5" · ✕) until the request is sent; every avatar is a warm circle with initials; no blue anywhere; every
status is a dot + a word; section headings are small sans caps; prices, visit details, reviews and breakdowns sit flat on the beige
with air between groups; totals sit under a **stitched dash**; every garment shows its illustration, including photo placeholders
and empty states; each screen has exactly one filled button; secondary actions are text links; Amara's fitting card says
**Required** quietly until she taps Send.

---

## 0. Direction

**Who.** Sarah books between meetings on her phone; Amara answers between fittings with pins in her mouth. Both glance, decide,
put the phone down. The app should feel like a good tailor's counter: a calm linen surface, a ledger in pencil, the garment on the
hanger in front of you. Not a dashboard.

**Domain.** Fitting, pinning, hem, seam allowance, chalk mark, thread, tape measure, garment bag, ticket stub, receipt book.
**Color world.** Unbleached linen (`--neutral-50`), tissue paper (`--white`), chalk (`--neutral-200`), basting thread brown
(`--accent-base`), pencil graphite (`--ink`), pin-cushion sage (`--sage`), tag ochre (`--warning`), brick (`--error`). No denim blue.
**Signatures (only these two, K-03).** (1) The **garment illustrations** wherever a garment appears: cards, booking, inbox,
threads, photo placeholders, empty states. (2) The **stitched dash** above a total, like the perforation on a ticket stub.
**Rejecting.** Floating white cards for everything → flat linen with air; serif section headings → small sans caps, serif only for
titles and hero money; coloured pill badges → a dot and a word; outline secondary buttons → text links; grey placeholder tiles →
the garment drawn on a soft tint; text tabs in the nav → icons.

**Squint test target.** Each screen reads as: title (serif) → one focal fact or figure → quiet groups of rows → one black button.

---

## A. System

### A1. Tokens — append to `css/tokens.css` (one "M7 (K-03)" block at the end of `:root`, comments as shown)

```css
  /* ---------- M7 (K-03) — not Figma variables; tokenised so screens never use literals ---------- */
  /* rhythm: tight inside a group, air between groups */
  --rhythm-tight: var(--space-8);      /* label → value, row → row inside one group */
  --rhythm-group: var(--space-12);     /* section heading → its first row; stacked controls */
  --rhythm-section: var(--space-32);   /* between sections on a page */
  --rhythm-major: var(--space-40);     /* hero block → first section; last section → page actions */

  /* text roles */
  --text-footnote: var(--neutral-600); /* 6.5:1 on --neutral-50, 7.0:1 on --white (K-03 #12) */

  /* status: dot colour + word ink (K-03 #7 — no blue anywhere) */
  --status-action: var(--accent-base);    --status-action-ink: var(--accent-ink);   --status-action-halo: var(--accent-bg);
  --status-pending: var(--warning);       --status-pending-ink: var(--warning-ink);
  --status-progress: var(--sage);         --status-progress-ink: var(--neutral-700);
  --status-done: var(--success);          --status-done-ink: var(--success-ink);
  --status-stop: var(--error);            --status-stop-ink: var(--error-ink);
  --status-calm: var(--neutral-500);      --status-calm-ink: var(--neutral-700);

  /* surfaces: ONE depth strategy — interactive containers are tissue white with a chalk ring, nothing else lifts */
  --card-bg: var(--white);
  --card-ring: var(--neutral-200);
  --hairline: var(--neutral-100);

  /* avatar: initials on a warm tint (K-03 — no black squares) */
  --avatar-bg: var(--accent-bg);
  --avatar-ink: var(--accent-ink);
  --avatar-ring: color-mix(in srgb, var(--accent-base) 22%, transparent);

  /* the stitched dash (signature 2) */
  --stitch-ink: var(--neutral-400);
  --stitch-dash: 6px;
  --stitch-gap: 4px;
  --stitch-w: 1.5px;

  /* motion (K-03 #11) */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --dur-press: 120ms;
  --dur-sheet-in: 280ms;
  --dur-sheet-out: 200ms;
  --dur-modal: 220ms;
  --press-scale: 0.97;
```

Also: remove the `--ease-out` declaration from `css/components.css`'s `:root` (tokens.css owns it now; same value). `--ease-drawer`
stays defined but no sheet uses it. `--info` / `--info-bg` stay in tokens.css (Figma variables) but **nothing may use them** — the
integrator adds a hygiene rule (§D2).

**Blue removed (every current use):** `.pill--confirmed` (→ status dot, A5.6) · `.banner--info` → `background: var(--accent-bg);
color: var(--accent-ink)` (class name kept; `t-job--rescheduled` selects it) · `.toast--info` → `background: var(--ink)` ·
`.money-row--changed .money-row__amt` → `color: var(--accent-ink)` · `.progress--confirmed` (border + first segment) →
`var(--accent-base)` · `.c-info` utility → `color: var(--accent-ink)`.

**Contrast (K-03 #12):** every footnote / caption / helper uses `--text-footnote` (`.c-600`). Grep each screen for `t-small c-500`,
`t-micro c-500` and `c-400` on text; move them to `c-600`. Row chevrons (`.list-row__chevron`, `.where__chevron`,
`.job-item__chevron`, `.thread-context__chevron`, `.appt-row__chevron`) move from `--neutral-400` (2.4:1) to `--neutral-500`
(3.8:1, the D-163 control ink). Disabled-link colour stays `--neutral-400` (disabled is exempt).

Checkpoint. *Intent:* calm, warm, glanceable. *Palette:* linen / tissue / chalk / thread brown; status colours are the warm
semantics already in the file, blue retired. *Depth:* one strategy, chalk ring on tissue, only for things you can touch.
*Surfaces:* page `--neutral-50`, container `--white`, sheet `--neutral-50` (unchanged). *Typography:* unchanged scale. *Spacing:* 4
base; 8 / 12 inside, 32 / 40 between.

### A2. Type roles (K-03 #3)

| role | class | where |
|---|---|---|
| Page title | `.t-title` serif 28 (unchanged) | the one `h1` per screen; `statusHero` title; sheet / modal titles (they are the overlay's page title); `empty-state__title` |
| Hero money | `.t-display` serif 32 | the one focal amount: t-request / t-job / t-payout / t-earnings take-home, deltaFigure, requestCard take-home (`.t-h2` money stays serif) |
| **Section heading** | **`sectionHead()` → `h2.t-caps.c-600`** (sans 12 / 600 / caps / +1 px, neutral-600) | every former `h2.t-h2` section heading, `visit-block__title`, `info-card__heading`, `c-cards__section`, `to-returns` "Getting it back" |
| **Hero fact** (new) | **`.t-figure`** sans 24 / 600 / line-height 29px / `letter-spacing: -0.01em` / `font-variant-numeric: tabular-nums` / ink | a non-money focal fact: the visit time on c-booking / t-job / t-request, c-request's "2h left" and suggested time, t-earnings "Nothing scheduled" |
| Body, row, caption | `.t-body` / `.t-small` + `.w-*` + `.c-*` (unchanged) | |

Rules: **no serif anywhere else** (grep each screen for `t-h2`; a `t-h2` that is not money or an overlay title becomes `sectionHead`
or `.t-figure`). `.rating-summary__avg` (serif 24) is deleted with `ratingSummary` (A5.8). `.trust-card__name`, `.visit-block__title`,
`.sheet--picker .sheet__title` (20 serif) keep serif only where they are an overlay title.

**Harness note (D-192):** the click-through matches `innerText`, which applies `text-transform`. Section-heading copy stays sentence
case in source; any `expect.has` / `not` string that is a section heading must be written in CAPS. Every one we know of is listed in
§D1; builders fix any other the check reports.

Add to `base.css` next to `.t-h2`:
```css
.t-figure { font-family: var(--font-sans); font-size: var(--size-24); line-height: 29px; font-weight: 600; letter-spacing: -0.01em; color: var(--ink); font-variant-numeric: tabular-nums lining-nums; }
```

### A3. Spacing rhythm (K-03 #9) — layout utilities in `components-v5.css`

```css
.sec { display: flex; flex-direction: column; gap: var(--rhythm-tight); margin-top: var(--rhythm-section); }
.sec--first, .heading-stack + .sec, .heading-row + .sec { margin-top: var(--rhythm-major); }   /* hero → first group */
.sec__body { display: flex; flex-direction: column; gap: var(--rhythm-tight); }
.sec-head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-8); min-height: 16px; margin-bottom: var(--space-4); }
.sec-head__title { margin: 0; }
.sec-head__aside { display: inline-flex; align-items: center; gap: var(--space-4); }
.page-actions { display: flex; flex-direction: column; align-items: stretch; gap: var(--rhythm-group); margin-top: var(--rhythm-major); }
```

Every screen wraps each group in `<section class="sec">` (heading + content), and drops its own `__h2 { margin-top: … }` rules.
Inside a group: 8 between rows, 12 between stacked controls. Between groups: 32. Hero → first group and last group → in-page
actions: 40. The `.body` top (128) and sides (20) are unchanged; `.body--with-bar` bottom padding unchanged.

Checkpoint. *Hierarchy:* space is the separator, not lines. *Spacing:* 8 / 12 / 32 / 40 only; a screen CSS file may not introduce
another vertical gap between groups.

### A4. Flat vs card (K-03 #2) — one depth strategy (D-193)

- **`.card`** (new, `components-v5.css`) = the only container: `background: var(--card-bg); border-radius: var(--radius-lg);
  box-shadow: inset 0 0 0 1px var(--card-ring); padding: var(--space-16);` (`.card--list` padding `0 var(--space-16)` for row lists).
  Use it **only** for interactive groups: a tappable row / ticket (tailorRow, requestCard, apptRow, threadRow, thread-list,
  threadContext), a list of tappable rows (c-account, t-shop setup, earnings payout list), a form group with controls (t-adjust
  garment card, c-job item card, to-where toggle groups, to-returns options, to-availability days, t-shop status toggle, c-complete
  rating), the courierCard while it carries a Try again.
- **Flat** (no background, no ring, no padding) for reference content: price lists, money breakdowns, visit details, timelines, "About",
  reviews, returns, "Where", hold / cancellation terms, the take-home hero, the next-payout hero, the account identity block, the
  fee explainer, the profile's price list "On your profile".
- **Drop shadows are deleted**: `.summary-card` and `.trust-card` lose `0 6px 16px …` (they become `.card` look). No other shadow
  except sheets / modals / toasts / the push banner (overlays).
- `infoCard(rowsHtml, { heading })` now renders **flat**: `<div class="info-block">` (`display:flex; flex-direction:column; gap:
  var(--rhythm-tight)`), heading via `sectionHead`. `.info-card` the class keeps its white look only for legacy hosts; `tailorRow`
  stops using it (gets `.card`), `to-where__card` uses `.card`.
- `moneyRows` / `customerBreakdown` / `tailorBreakdown` / `receiptBlock` render **flat** (A5.10): `.money-rows` loses background,
  ring and side padding; rows lose the hairline between them (`.money-row + .money-row` box-shadow removed), row padding-block
  `var(--space-8)`; the stitch sits above the total row.
- `timeline()` renders **flat**: `.timeline` loses its white card and padding; the dots and the 1 px connector stay.
- `customerPreview()` keeps its framed preview (it depicts a card): outer frame `--neutral-100` radius-xl padding 8, inner `.card`.

Checkpoint. *Depth:* borders-only, chalk ring, for touchable things. *Surfaces:* linen page; tissue only under a finger. Squint:
the eye finds the touchable blocks immediately because they are the only white.

### A5. Components (before → after). All in `js/components.js` + `css/components-v5.css` unless noted; gallery blocks for each in `sys-components` "M7 · polish".

#### A5.1 Nav icons — `js/icons.js` (new export `NAV_ICONS`, 24 viewBox, `stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"`, `aria-hidden="true" focusable="false"`, class `nav-icon`)

```js
const NAV24 = (d) => `<svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
export const NAV_ICONS = {
  /* house: roof, walls, door */
  home: NAV24('<path d="M3.75 10.5 12 3.75l8.25 6.75"/><path d="M5.75 9v11.25h12.5V9"/><path d="M10 20.25v-5.5h4v5.5"/>'),
  /* calendar page with a tick */
  bookings: NAV24('<rect x="3.75" y="5.25" width="16.5" height="15" rx="2.5"/><path d="M3.75 9.75h16.5"/><path d="M8.25 3v4.5M15.75 3v4.5"/><path d="m9.25 15 2 2 3.5-3.75"/>'),
  /* speech bubble with a tail */
  messages: NAV24('<path d="M6.75 16.5A2.25 2.25 0 0 1 4.5 14.25v-7.5A2.25 2.25 0 0 1 6.75 4.5h10.5a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25H10.5l-3.75 3.75z"/>'),
  /* head and shoulders */
  account: NAV24('<circle cx="12" cy="8.25" r="3.75"/><path d="M4.5 20.25c.75-3.75 3.75-6 7.5-6s6.75 2.25 7.5 6"/>'),
  /* storefront: scalloped awning, walls, door */
  shop: NAV24('<path d="M4.5 10.5v9.75h15V10.5"/><path d="M3 8.25 4.5 3.75h15L21 8.25a2.25 2.25 0 0 1-4.5 0 2.25 2.25 0 0 1-4.5 0 2.25 2.25 0 0 1-4.5 0 2.25 2.25 0 0 1-4.5 0z"/><path d="M10 20.25V15h4v5.25"/>'),
  /* banknote */
  earnings: NAV24('<rect x="3" y="6" width="18" height="12" rx="2.25"/><circle cx="12" cy="12" r="2.75"/><path d="M6.75 9.75h.01M17.25 14.25h.01"/>'),
};
/* 16 px line glyphs (same family, 1.5 stroke) */
export const ICON_INFO = `<svg class="icon-16" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6.25"/><path d="M8 7.25v4M8 4.9h.01"/></svg>`;
export const ICON_VERIFIED = `<svg class="icon-16" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M8 1.75 9.6 2.95l2-.1.6 1.9 1.6 1.2-.7 1.95.7 1.95-1.6 1.2-.6 1.9-2-.1L8 14.25 6.4 13.05l-2 .1-.6-1.9-1.6-1.2.7-1.95-.7-1.95 1.6-1.2.6-1.9 2 .1z"/><path d="m5.75 8.1 1.5 1.5 3-3.1"/></svg>`;
export const ICON_MORE = `<svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/></svg>`;
export const ICON_CHAT = /* 16 px bubble for "Message Sarah" links */ `<svg class="icon-16" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.5 11A1.5 1.5 0 0 1 3 9.5v-5A1.5 1.5 0 0 1 4.5 3h7A1.5 1.5 0 0 1 13 4.5v5a1.5 1.5 0 0 1-1.5 1.5H7l-2.5 2.5z"/></svg>`;
export const ICON_DIRECTIONS = `<svg class="icon-16" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2.5 7.4 13.5 2.5 8.6 13.5 7.4 8.6z"/></svg>`;
export const ICON_CALENDAR = `<svg class="icon-16" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" focusable="false"><rect x="2.5" y="3.5" width="11" height="10" rx="1.75"/><path d="M2.5 6.5h11M5.5 2v2.5M10.5 2v2.5"/></svg>`;
```

#### A5.2 Top nav (K-03 #6, D-187) — `topNav()` / `chrome()`

Before: four 12 px text links, the active one bold with a 2 px accent stitch under the label, an 8 px dot after the label.
After: same `<nav class="top-nav" aria-label="Primary">`, logo left, four **icon links** right:

```html
<a class="top-nav__link is-active" href="#" data-nav="home" aria-label="Home" title="Home" aria-current="page">
  <span class="top-nav__icon">{NAV_ICONS.home}<span class="top-nav__dot" aria-hidden="true"></span></span>
  <span class="sr-only">, 2 new</span>          <!-- only when badges[key] > 0 (unchanged wording) -->
</a>
```
- `NAV` items keep their keys and labels (labels become `aria-label` + `title`). Order unchanged: customer Home · Bookings ·
  Messages · Account; tailor Home · Shop · Earnings · Messages. `data-nav` unchanged (journeys click it).
- Link box 44 × 44, `display:inline-flex; align-items:center; justify-content:center; border-radius: var(--radius-md)`; group gap
  `var(--space-4)`; `margin-right: calc(-1 * var(--space-8))` stays.
- Inactive: icon `color: var(--neutral-600)`. Hover (hover devices): `color: var(--ink); background: var(--neutral-50)`. Active:
  `color: var(--ink)`, the svg `stroke-width: 1.75`, and the **stitch** under the icon: `.top-nav__link.is-active::after { content:'';
  position:absolute; bottom: 4px; left: 50%; width: 16px; height: 2px; margin-left: -8px; border-radius: 1px; background:
  var(--accent-base); }` (delete `.top-nav__stitch` span and its CSS, and the label raster shim). Focus-visible: `outline: 2px solid
  var(--accent-ink); outline-offset: 2px`.
- Unread dot: `.top-nav__dot` absolute `top: -2px; right: -3px; width: 8px; height: 8px; border-radius: 50%; background:
  var(--accent-base); box-shadow: 0 0 0 2px var(--white)`; rendered only when the count > 0.
- Press: `transform: scale(var(--press-scale))` on `:active` (A5.14).

Checkpoint. *Intent:* a web app's quiet header; wayfinding by shape. *Hierarchy:* active = ink + stitch, the rest graphite.
*Palette:* graphite / ink / thread brown. *Depth:* none. *Typography:* none visible (accessible names only). *Spacing:* 44 targets,
4 gap.

#### A5.3 Booking flow bar (K-03 #6, D-186) — new `flowBar({ step, total = 5, back = true, exitAct = 'exit-booking', exitLabel = 'Leave booking' })`

Replaces `chrome('home')` + the in-body `bookingSteps(n)` on **c-where, c-tailors, c-tailor (booking context only), c-book, c-pay**.
c-job keeps the nav (it is the Home tab) and keeps `bookingSteps(0)` in its body. Onboarding already has no nav
(`onboardingHeader`, unchanged except A5.14 press).

```
statusBar() +
<div class="flow-bar" role="navigation" aria-label="Booking">
  <button class="back" data-act="back" aria-label="Back">‹</button>         // 44 × 44, the existing backButton() markup
  <div class="flow-bar__steps">{bookingSteps(step) compact: 5 segments + "n of 5"}</div>
  <button class="flow-bar__exit" data-act="exit-booking" aria-label="Leave booking" title="Leave booking">{ICON_CLOSE 16}</button>
</div>
```
- `.flow-bar`: absolute at top 44, 390 × 56, `--white`, `box-shadow: inset 0 -1px 0 var(--bottom-border)` (same as `.top-nav`),
  `padding-inline: var(--space-12)`, grid `44px 1fr 44px`, gap 8. Steps segments 3 px (the compact stepper), "2 of 5" right of them.
- The page heading drops its inline Back: `headingRow('<h1 …>', { back: false })` on these screens (the bar owns Back).
- **✕ Leave booking** → `go('c-job')` (Home). The draft job is kept (it already lives in `state.job`); no confirm, nothing was sent.
  Wire in each screen's `wire` (`data-act="exit-booking"`). c-pay while busy: ✕ disabled like the bar's Back.
- c-tailor: booking context = it was opened from c-tailors (existing `profile` / `preview` flags false). `profile` (from Bookings /
  Messages) keeps `chrome('bookings')`; `preview` (tailor's own profile) keeps its banner and no nav (unchanged).
- Expects keep working: "n of 5" is still in the DOM (in the bar).

Checkpoint. *Intent:* a focused errand with one way forward and one way out. *Hierarchy:* the step count is the only text.
*Depth:* same as the nav. *Spacing:* 44 / 1fr / 44.

#### A5.4 Avatar (K-03 #1)

Before: 64 / 56 / 40 rounded squares, ink fill, white initials (`.avatar` in `components.css`; `--sm` r12, `--md` r16, `--lg` r24).
After: **circles** on a warm tint. `.avatar { width: 56px; height: 56px; border-radius: var(--radius-full); background:
var(--avatar-bg); color: var(--avatar-ink); box-shadow: inset 0 0 0 1px var(--avatar-ring); font-family: var(--font-sans);
font-weight: 600; letter-spacing: 0.02em; }` · `--sm` 40 (size 16) · `--md` 56 (16) · `--lg` 80 (24, weight 600). All radius
`--radius-full`. Muted rows (`.appt-row--muted .avatar`, `.thread-row--closed .avatar`) keep `--neutral-100` / `--neutral-600` and lose
the ring. `avatar({ photo: true })` (the "add a photo" circle on to-profile / miniProfile) = the same tinted circle with the initials
(or a 24 px `ICON_CAMERA` when there are none yet) — never a grey disc (`.avatar--placeholder` / `.avatar--photo` → tint). The summary
card's inline `.avatar` (64 px ink) follows the same rule. Applies everywhere `avatar()` / `.avatar` renders: tailorRow, c-tailor head,
reviews, apptRow, requestCard, threadRow, threadHead, t-job customer, c-account, miniProfile, previews.

Checkpoint. *Intent:* a person, not a database row. *Palette:* thread-brown ink on its own tint. *Typography:* sans 600, no serif.

#### A5.5 Section heading — `sectionHead(title, { id = '', count = null, aside = '' } = {})`

```html
<div class="sec-head"><h2 class="t-caps c-600 sec-head__title" id="{id}">{title}</h2>{count/aside → <span class="sec-head__aside t-small c-600 tabular">…</span>}</div>
```
`aside` is HTML (an `infoButton`, a "See all" link, a count). Use with `<section class="sec" aria-labelledby="{id}">`. Replaces every
section `h2.t-h2`, `visitBlock`'s serif title (`visitBlock(rows, { title, flush, action })` now emits `sectionHead(title, { aside:
action })` + rows; the first row may be a `.t-figure` — see screens), `infoCard`'s heading, `c-cards__section`, t-home's
`__head` (h2 + count), `to-services__head`, `to-availability__caps`. Existing caps labels (`t-caps c-600` "YOU TAKE HOME", "NEXT
PAYOUT", "WHAT CUSTOMERS SEE", "THE VISIT") already match and stay.

Checkpoint. *Hierarchy:* a whisper above the group; the content leads. *Typography:* sans 12 / 600 / caps / +1 px / neutral-600.

#### A5.6 Status dot — `statusPill(status, label)` keeps its name, keys and labels; renders a dot + a word (K-03 #7, D-188)

Before: rounded chips in 6 colours with a 14 px glyph (`.pill--*`, blue for Confirmed, ink for Completed). After:
```html
<span class="status status--{tone}"><span class="status__dot" aria-hidden="true"></span><span class="status__word">{label}</span></span>
```
`.status { display:inline-flex; align-items:center; gap: var(--space-8); font: 600 var(--size-12)/16px var(--font-sans); white-space:
nowrap; color: var(--status-{tone}-ink); }` · `.status__dot { width: 8px; height: 8px; border-radius: 50%; background:
var(--status-{tone}); flex-shrink: 0; }` · `.status--action .status__dot { box-shadow: 0 0 0 3px var(--status-action-halo); }` and
`.status--action { font-weight: 700; }` (your move is the loudest — D-95 keeps its meaning without a filled chip).

Tone map (replace `PILL_VARIANTS[*].cls` with `tone`; glyphs dropped from the status, `PILL_ICONS` stay exported for nothing else):

| tone | keys |
|---|---|
| `action` | suggested, action |
| `pending` | requested, new-request, awaiting-customer, waiting, price-change |
| `progress` | confirmed, fitting, in-progress, tailoring |
| `done` | ready, returning, completed |
| `stop` | declined, cancelled, withdrawn, expired |
| `calm` | calm |

Hosts: `.appt-row__pill`, `.thread-row__pill`, `.thread-context__pill`, `.request-card__pill`, `statusHero`'s pill row, t-payout
`__why`, t-job payout state, t-shop "Bookable" / "Paused" (use `statusPill` with a `done` / `pending` look: add keys `bookable`
(done, "Bookable") and `paused` (pending, "Paused")). Muted rows: `.appt-row--muted:not(.appt-row--kept) .status` → `calm` colours.
Delete `.pill--*` colour rules (keep `.pill` only if a non-status chip still uses it — none should).

Checkpoint. *Intent:* status is a fact, not a sticker. *Palette:* the warm semantics; a dot carries colour, the word stays readable
(all inks ≥ 4.5:1 on white and linen). *Depth:* none.

#### A5.7 Verified mark + sheet (K-03 #7, D-189)

- `verifiedMark({ act = 'verified' , inert = false })` → `<button type="button" class="verified" data-act="verified"
  aria-haspopup="dialog">{ICON_VERIFIED}<span>Verified</span></button>`; `inert: true` renders a `<span class="verified">` (inside a
  button host like `tailorRow`). `.verified { display:inline-flex; align-items:center; gap: var(--space-4); color:
  var(--success-ink); font: 600 var(--size-12)/16px var(--font-sans); min-height: 44px; }` (inert: `min-height: auto`).
- `openVerifiedSheet({ first })` → `sheetOverlay` (dataS `verified`, header "Verified by Taily") with three rows, `metaRow` with
  `ICON_VERIFIED` in `--success`, copy exactly: **"ID verified"** / "Taily checked a government ID." · **"Background check"** /
  "Cleared before the first booking." · **"Insured"** / "Covered while working on your garments." Title row in `.t-body w-600`, line
  in `.t-small c-600`. Labels come from `TRUST_BADGES` (data.js, unchanged).
- Replaces: c-tailor's ✓ after the name + the three green `trustBadges` chips (→ one mark on the rating line, tap → sheet);
  `tailorRow`'s green "✓ Verified" chip (→ inert mark on the meta line); `summaryCard`'s ✓ and badges; `trustCard`'s "✓ Taily-verified"
  + badges. `trustBadges()` stays exported for the gallery only.

#### A5.8 Rating (K-03 #7, D-190) — `ratingLine({ avg, count, anchor = '' })`

Before: `ratingSummary` = serif "4.9" + five stars + "37 reviews", shown twice on c-tailor. After: **"★ 4.9 (37)"** once:
`<span class="rating-line"><span class="rating-line__star" aria-hidden="true">★</span> <span class="tabular">4.9</span> <span class="c-600">(37)</span></span>`
with `aria-label="Rated 4.9 out of 5 from 37 reviews"`; with `anchor` it is an `<a href="#reviews">` (44 px tall) that scrolls to the
Reviews section. Star in `--accent-base`, number `t-small w-600 ink`. `ratingSummary` is deleted (gallery: replace). `reviewRow`
keeps its 5 small stars per review. `tailorRow` meta already prints `★ 4.9 (37) · 0.6 mi` (one dot: allowed).

#### A5.9 Buttons: one primary per screen (K-03 #8, D-195)

- `cta()` unchanged (filled ink = THE primary; `danger` filled only inside a destructive confirm sheet). `cta(…, { variant:
  'secondary' })` (outline) is now **only** allowed as the second button of a confirm sheet / modal ("Keep booking", "Stay signed in")
  and in empty states with two equal paths. Everywhere else a secondary becomes a text link.
- New `textLink(label, { act, tone = 'default' | 'danger' | 'muted', icon = '', attrs = '' })` →
  `<button type="button" class="text-link text-link--{tone}" data-act="{act}">{icon}<span>{label}</span></button>`;
  `.text-link { display:inline-flex; align-items:center; justify-content:center; gap: var(--space-8); min-height: 44px; padding-inline:
  var(--space-8); background:none; border:0; font: 600 var(--size-16)/21px var(--font-sans); color: var(--accent-ink); }` ·
  `--danger { color: var(--error-ink); }` · `--muted { color: var(--neutral-700); }` · disabled `color: var(--neutral-400)`.
- `actionBar({ … secondaryLabel, secondaryAct, tertiaryLabel, tertiaryAct, tertiaryTone })` keeps its signature; it now renders the
  secondary and tertiary as **text links** in one `.action-bar__links` row under the primary (`display:flex; justify-content:center;
  gap: var(--space-24)`; one link → centred). `tertiaryTone: 'danger'` → `text-link--danger`. Delete the two-column outline row and
  `.cta--secondary-danger`. Same `data-act`s.
- New option `softDisabled` (boolean) on `actionBar` / `cta`: the primary looks disabled (`.cta--disabled`, `aria-disabled="true"`)
  but has **no** `disabled` attribute, so a tap reaches the screen (used by t-adjust Send, D-196). The note keeps
  `aria-describedby`.
- `emptyState({ … secondaryLabel })`: secondary → `textLink`. New `art` option (A5.12).
- New `moreMenu({ label = 'More actions', act = 'more' })` → a 44 × 44 `<button class="more-btn" data-act="more" aria-label="More
  actions" title="More actions" aria-haspopup="dialog">{ICON_MORE}</button>`; and `openMoreMenu(items, { title = 'More' })` →
  `sheetOverlay` (dataS `more`) with one `listRow` per item `{ label, act, sub, tone }` (`tone: 'danger'` → title in
  `--error-ink`, no chevron); choosing an item closes the menu and dispatches the item's `data-act` on the screen (the screen's
  existing handler opens its own sheet). Used on t-job only (§B).

Checkpoint. *Hierarchy:* one black button wins; links whisper; red text only for leaving or cancelling.

#### A5.10 Stitched dash divider (signature 2, D-197) — `stitchDivider()`

`<hr class="stitch" aria-hidden="true">` · `.stitch { display:block; width:100%; height: var(--stitch-w); margin: var(--space-8) 0;
border:0; background: repeating-linear-gradient(90deg, var(--stitch-ink) 0 var(--stitch-dash), transparent var(--stitch-dash)
calc(var(--stitch-dash) + var(--stitch-gap))); }`. **Used only:** (1) inside `moneyRows`, directly above the first `kind: 'total'` row
(replaces that row's top hairline) — so every customer / tailor breakdown, receipt and payout carries exactly one; (2) on the
c-complete / c-booking (completed) receipt, between the "In-store pickup · Thu, Oct 15" line and the rows. Nowhere else: list
separators stay `--hairline`, sections are separated by space.

#### A5.11 Info button + info sheets (K-03 #4, D-191)

- `infoButton(key, { label })` → `<button type="button" class="info-btn" data-info="{key}" aria-label="{label}" title="{label}"
  aria-haspopup="dialog">{ICON_INFO}</button>` (44 × 44 hit, 16 px glyph `--neutral-600`, sits in a `sec-head__aside` or after an
  amount). `wireInfo(root)` (call in `wire`) opens `openInfoSheet(key, ctx)`.
- `INFO` registry (`components.js`), copy exactly (ctx: `first` = tailor or customer first name, amounts via `fmtExact`, hours from
  `POLICY`):
  - `pricing` "How pricing works": "Estimates use each tailor’s own price list." · "At the fitting, the tailor sends you the final
    order. Nothing changes until you approve it." · "You pay the balance when your order is ready."
  - `deposit` "About the deposit": "The deposit is held on your card, and charged only when the tailor accepts." · "It comes off your
    final total." · "Free cancellation until {POLICY.CANCEL_WINDOW_H} hours before the visit. After that, the deposit is kept."
  - `fitting` (tailor) "At the fitting": "You can add or remove items and services, and change prices." · "{first} approves the final
    order before you start."
  - `fee` (tailor) "The Taily fee": "Taily’s fee comes only from your service prices." · "Home-visit and rush fees are yours in full."
    · "Customers pay for the courier. It never comes out of your payout." · "If a customer cancels within
    {POLICY.CANCEL_WINDOW_H} hours, you keep their deposit, with no fee."
  - `payouts` (tailor) "When you get paid": "Taily pays out every Friday for jobs you completed before that day." · "Job payouts are
    after the Taily fee. Kept deposits and no-show pay have no fee."
  - `privacy` "Your privacy": "Phone numbers and emails stay private on Taily." · "Only your neighborhood is shared until a tailor
    accepts."
  Each row is a `metaRow('', text)` with a 16 px `ICON_INFO`-family bullet; sheet dataS `info-{key}`. Copy that is moved into a sheet
  is **removed** from the page (it is no longer in `innerText` unless the sheet is open; §D1 lists the expects).
- **Kept inline** (decision-changing): the deposit hold line and the cancellation cut-off (money), "Only your neighborhood is
  shared…" / "Full address after you accept" / "Phone numbers and emails … hidden" (privacy), every amount and every "Due when ready".

#### A5.12 Garment illustrations as placeholders (signature 1, K-03 #1/#10, D-194)

- New `photoStub({ type = '', tone = 0, size = 'thumb' | 'tile' | 'stage', kind = 'photo', alt = '' })` = the same rendering as
  `docPhoto` (token-tone gradient `--t0…--t3`, the garment illustration at 70 %, a ±3–4° tilt; unknown type → `ICON_HANGER`), sized
  `thumb` 56 / `tile` 72 / `stage` full. `docPhoto` becomes a thin wrapper of it. Replaces every grey or beige empty tile:
  - `photoTile('photo')` (c-job item photo, c-review / review-row photos, to-profile work photos, c-tailor About photos) →
    `photoStub({ type })` (the host passes the garment; portfolio photos cycle the tailor's garment types: `GARMENT_TYPES` in order,
    tone = index % 4).
  - chat photos (`.chat-bubble__tile`, `.composer__thumb-tile`, the attach tray) → `photoStub({ type: <the thread's appointment's
    first garment>, size: 'thumb' })`; no appointment → hanger.
  - `workList`'s 44 px photo thumbnail (t-request / t-job "1 photo") → `photoStub` of that garment.
  - `openPhotoViewer` stage → `photoStub({ size: 'stage' })`.
  - `trustCard` photo (180 px) → `photoStub({ type: 'Suit Jacket', size: 'stage' })` at 180 px tall.
  - `--media-placeholder` is no longer used by any screen (lint: §D2).
- `emptyState({ …, art = '' })`: `art` = a garment type → a 96 px illustration in a 120 px `--accent-bg` circle above the title
  (`garmentIcon(art, { size: 'hero' })`, new size `hero` 96). Per screen in §B.
- `garmentIcon` sizes gain `hero` (96, no well, used on c-welcome / to-done / empty states).
- Every place a garment name prints shows `garmentIcon` next to it (already true for changeList / workList / t-adjust / c-pay "Your
  order"); M7 adds: requestCard (first garment's 32 px icon next to "n items · n services"), apptRow / threadRow sub line (no — rows
  keep the avatar; the person is the subject), c-ready "Your order", c-complete receipt items, t-payout job card, t-earnings payout rows
  (24 px inline before "Suit Pant, Suit Jacket").

#### A5.13 Required vs error on the fitting photo rows (K-02 follow-up, D-196) — `docsEditor({ …, missing, tried = false })`

- **Pristine** (`missing[kind] && n === 0 && !tried`): the row head shows the label left and **"Required"** right (`<span
  class="t-small w-600 c-600 docs-editor__req" data-missing-msg="{kind}">Required</span>`, in the slot where "n of 4" shows); the
  camera tile keeps its dashed `--neutral-500` ring; no glyph, no red.
- **Tried** (`tried` true): today's message `<p class="docs-editor__missing t-small" data-missing-msg="{kind}" role="alert">{ICON_ALERT}
  Add at least one {kind} photo.</p>` in `--error-ink`, and the camera tile ring turns `--error` (`.docs-editor__row[data-missing=
  "true"][data-tried="true"] .docs-editor__add { border-color: var(--error); }`). "Required" disappears.
- t-adjust sets `d.tried = true` when (a) Amara taps **Send** while photos are missing (Send is `softDisabled`, not `disabled`, in that
  case only; it still is hard-`disabled` for "Change something to send it again."), then focuses the first `[data-missing-msg]` and
  re-renders; (b) she tries to leave (Back / nav / ✕) with photos missing — set before the leave modal opens. The bar note ("Add before
  and pinned photos for n item(s).") stays, in `--text-footnote` until tried, `--error-ink` after.

#### A5.14 Motion (K-03 #11)

- Press: one rule for every tappable surface — `.cta, .text-link, .top-nav__link, .more-btn, .info-btn, .tailor-row, .request-card,
  .appt-row, .thread-row, .thread-context, .list-row, .option-row, .garment-tile:not(.garment-tile--selected), .chip, .time-chip,
  .where__card, .docs-editor__add, .photo-tile--add { transition: transform var(--dur-press) var(--ease-out); }` and `:active:not(
  :disabled):not([aria-disabled="true"]) { transform: scale(var(--press-scale)); }`. Remove the old 0.98 / 140 ms / 160 ms / opacity .6
  press rules (`tailor-row`, `appt-row`, `request-card`, `option-row`). Never `transition: all`.
- Sheets: `.sheet-host .sheet { transition: transform var(--dur-sheet-out) var(--ease-out), opacity var(--dur-sheet-out)
  var(--ease-out); }` · open `[data-open="true"] .sheet { transition-duration: var(--dur-sheet-in); }` (replaces 300 / 400 ms
  `--ease-drawer`); scrim the same durations. Modals: `--dur-modal` with `--ease-out`, enter from `translateY(8px) scale(0.98)` +
  opacity 0 (never from scale 0). The push banner: `--dur-sheet-in`.
- Reduced motion (`prefers-reduced-motion: reduce` and `html.is-test`): transforms off for press, sheets and modals; opacity / colour
  transitions stay (≤ 150 ms). The existing reduced-motion blocks in `components.css` / `components-v5.css` are merged into one block
  that lists every selector above.

#### A5.15 Other shared changes

- `statusHero`: pill row → `statusPill` (dot + word); title `.t-title`; `body` in `.t-body c-700`, max 2 lines of copy (screens
  enforce by §B cuts); `rowLabel/rowValue` → caps label + `.t-figure`.
- `tailorRow`: `.card` look (no `info-card` class); verified → inert `verifiedMark`; "Includes $35 home-visit fee" and "Next opening …"
  unchanged.
- `requestCard`: place line breaks the "·" chain: line 1 `{visitLabel}`, line 2 `{place}` (neighborhood, zip printed "Williamsburg
  11211" with a thin space, no dot); the take-home stays serif `.t-h2` money.
- `privacyNote()`: keeps the copy; renders as one `t-small c-600` line with the 16 px `ICON_INFO` glyph (not the circled "i" span).
- `changeSummary(counts)`: when three or more parts, render one part per line (no "·" chain).
- `rushLadder(rush)`: renders rows (`Ready within 1 day` … `+$40`) as a flat 2-column list, never a "·" chain; empty "No rush fees."
- `courierCard`: flat in the ready state (rows + stitch above "Courier total"); keeps a `.card` only in `failed` (it has Try again).
- `readOnlyBanner`: its CTA is the primary; `secondaryLabel` → `textLink`.
- `onboardingHeader`: "Finish later" → `textLink` (accent) at 44 px — already a text button; keep, apply A5.14 press.
- `banner` info tone warm (A1). `toast` info tone ink.
- `threadContext`: `.card` look; pill → status dot; sub keeps one "·".
- `summaryCard`, `trustCard`: gallery-only after M7; restyle per A4 / A5.4 / A5.7 so the gallery is not stale.

---

## B. Screen checklist (every id in `js/inventory.js`)

Legend: **Cut** = delete the copy. **→ⓘ key** = move into that info sheet (A5.11) and add `infoButton(key)` where named.
**Flat** = A4 flat. **Head** = section heading → `sectionHead` caps. **Link** = secondary → `textLink`. **Art** = empty-state garment.
**·** = break a chain of two or more "·". Unless a row says otherwise, every screen also gets: avatar (A5.4), status dot (A5.6),
nav icons (A5.2), `.sec` rhythm (A3), press (A5.14), footnote colour (A1). Expect changes are listed per row as **Exp:** and again in §D1.

### Cluster 1: customer booking

**c-welcome** — Cut the `TRUST` three-checkmark list and its `metaRow`s. Add a hero illustration above the title: `garmentIcon('Suit
Jacket', { size: 'hero' })` in a 160 px `--accent-bg` circle, tilted −4°, centred, `margin-bottom: var(--rhythm-section)`. Title stays
`.t-display`. Lead → ONE line: **"Real prices up front. Your deposit is held, not charged, until the tailor accepts."** (`t-body
c-600`). Apple / Google outline buttons stay outline (two equal sign-in paths, A5.9 exception); "or" separator `c-600`. Legal + "Join
Taily" lines unchanged. **Exp:** keeps `'held, not charged'`; nothing else.

**c-phone / c-code / c-name** — No nav (unchanged). Headings already serif titles. Only: footnote colour, press, field rhythm (label →
field 4, field → field `--rhythm-group`). c-code "Resend code in 0:30" unchanged. **Exp:** none.

**c-job** — Keeps `chrome('home')` + `bookingSteps(0)`. Lead "Tap a garment to add it. You’ll choose what to do with each one." →
**"Tap a garment to add it."** "Your items" `h2.t-h2` + "2 items" → Head with count. Item cards stay `.card` (interactive). Item photo:
the beige `photoTile('photo')` → `photoStub({ type: g.type })`; caption "Photos help the tailor quote (optional)" → **"Optional"**.
Service summary: two services keep "Shorten sleeves · Take in jacket sides"; three or more print "{first}, {second} +{n} more"
(·). Services sheet caption "Pick all that apply. Each tailor prices these on their profile." → **"Pick all that apply."**
c-job--active: the active `apptRow` card stays; "BOOK SOMETHING ELSE" already caps. Photo sheet "Cancel" outline → Link.
**Exp:** none (c-job keeps `'Shorten sleeves · Take in jacket sides'`).

**c-where** — `flowBar({ step: 1 })` replaces `chrome` + `bookingSteps(1)`; title without Back. Address / need-by cards stay
(buttons). Keep "Only your neighborhood is shared until a tailor accepts." (privacy). Rush line "⚑ Rush fees may apply for this date.
You’ll see them on each tailor before you book." → **"Rush fees may apply for this date."** with a 16 px `ICON_ALERT` in
`--warning` instead of ⚑. Need-by sheet caption "Pick the day you need it back. The visit is at least a day before." → **"Pick the day
you need it back."** Address sheet unchanged. **Exp:** none.

**c-tailors** — `flowBar({ step: 2 })`. Count line "1 tailor" + "Sort: Recommended" stays; add `infoButton('pricing', { label: 'How
pricing works' })` after the count. Cut the bottom note "Estimates come from each tailor’s own price list. You approve the final order
at the fitting." (→ⓘ pricing). tailorRow per A5.15 (card, inert Verified, dot-free meta). Empty states (`zip`, `shop`,
`nothing-open`, `none-left`, declined banner): `emptyState` secondary → Link; Art `'Suit Pant'` on zip / shop / none-left. Loading
skeleton: circle avatar. **Exp:** none (all copy kept).

**c-tailor** — Booking context: `flowBar({ step: 2 })` (it is still "3 of 5" — the step index is the existing `bookingSteps(2)`); profile
context: `chrome('bookings')` unchanged; preview unchanged. Head: `avatar` lg circle; name `.t-title`; sub "Reyes Tailoring ·
Williamsburg · 12 years" → line 1 **"Reyes Tailoring"** `t-body w-600 c-700`, line 2 **"Williamsburg · 12 years"** `t-small c-600` (·);
rating + verified on ONE line: `ratingLine({ anchor: '#reviews' })` then `verifiedMark()` (tap → Verified sheet, new state
`c-tailor--verified`); cut the three `trustBadges`; "Next opening Thu, Oct 15 · 5:00 PM" stays (t-small w-600 c-700). "Ask a
question" outline → Link **"Ask a question"** (accent, `ICON_CHAT`), directly under the head. Sections (each `.sec`, Head, Flat):
"Your estimate" (Head + `infoButton('pricing')` aside; rows flat with stitch above "Estimated total"; Cut "You approve the final order
at the fitting before any work starts." →ⓘ pricing) · "About" (bio + work photos as `photoStub` 72 px cycling garment types) · "Prices"
(flat rows, "See all 10 prices" Link; rush: "Rush fees" caps sub-label + `rushLadder` rows instead of the "·" sentence) · "Where"
(flat metaRows; "0.6 mi from you" and "$35 home-visit fee" kept) · "Getting it back" (flat) · "Reviews" (`id="reviews"`; cut the repeated
`ratingSummary`; list of `reviewRow`; "See all 37 reviews" Link). No-reviews copy "No reviews yet. Every Taily tailor is ID verified
and background checked." → **"No reviews yet."** + keep "New on Taily" in the head. Declined / reviewed variants keep their bar.
**Exp:** `c-tailor` `'Your estimate'` → `'YOUR ESTIMATE'`; `c-tailor--reviewed` not `'Your estimate'` → `'YOUR ESTIMATE'` and its
`${count+1} reviews` must still match (the "See all {n} reviews" link prints it — keep that link whenever count > 0). New state
`c-tailor--verified` (click `[data-act="verified"]`, has `['Verified by Taily', 'ID verified', 'Background check', 'Insured']`, sel
`[data-s="verified"]`).

**c-book** — `flowBar({ step: 3 })`. "Amara Reyes · At my place · 60-minute visit" → line 1 **"Amara Reyes"** `t-body w-600`, line 2
**"At my place · 60-minute visit"** `t-small c-600` (·). Cut "Only Amara’s open times before Fri, Oct 23 are shown." The scheduler
card stays (interactive). "You won’t be charged yet. Next you’ll see the full price and the deposit." → **"Nothing is charged yet."**
(money, kept short). no-slots empty state: secondary "Message Amara" → Link; Art `'Suit Jacket'`. **Exp:** none.

**c-pay** — `flowBar({ step: 4 })`. Visit block → Head "Your visit" with "Change time" Link aside; rows: **`.t-figure` "Thu, Oct 15 ·
5:00 PM"**, then "At my place" (· broken off), "145 N 7th St, 2R, Brooklyn", "2 items · 3 services". "Your order" Head, garment rows
flat with icons. "Price" Head + `infoButton('deposit')`; breakdown flat + stitch above "Estimated total". Hold explainer `infoCard` with
3 rows → **Flat, 2 rows** with 16 px icons: **"We hold {deposit} now. You’re only charged if Amara accepts. If she declines or doesn’t
reply, it’s released in full."** and the existing cancellation row (`cancelRow`, unchanged copy: "Free cancellation until …" / shop
"This visit is less than …"). "Pay with" Head, method row stays `.card` (button). Bar: cut the note "You pay the $144.00 balance when
your order is ready." (the breakdown says "Due when ready"). Add-card sheet: keep "Your card is stored by our payment provider, not by
Taily." 3-DS sheet: "Cancel" outline stays (confirm-sheet exception). **Exp:** `c-pay` keeps `'released in full'`; `c-pay--method`
`'Pay with'` is the sheet title (unchanged) — if it only matched the page heading, change to `'PAY WITH'`.

**sys-index** — Dev index: tokens only; status keys render as dots if it shows any. No copy change. **Exp:** none.

**sys-components** — Gallery: the system builder adds the "M7 · polish" block (nav icons inactive / active / dot, flowBar, avatar 3
sizes + muted, sectionHead with count and ⓘ, `.t-figure`, status dot every tone, verifiedMark + sheet, ratingLine, textLink 3 tones,
actionBar with links, moreMenu, stitchDivider in a breakdown, infoButton + one INFO sheet, photoStub 4 tones + hanger, emptyState with
art, docsEditor pristine Required vs tried). Replace the gallery entries of deleted components (`ratingSummary`). **Exp:** none.

### Cluster 2: customer post-booking, account, messages

**c-request** — Hero body "We’ll text you the moment Amara replies." kept. Countdown "2h left" → `.t-figure` (sans); "Reply by 12:00 PM"
`t-small c-600`. Cut the push-off line "Notifications are off, so we’ll text you when Amara replies." Soon line "Amara has 10m left to
reply. If there’s no reply, your hold is released." → **"Amara has 10m left to reply."** "Your request" visit block → Head + rows
(· "Thu, Oct 15 · 5:00 PM · At my place" → `.t-figure`-free rows: "Thu, Oct 15 · 5:00 PM" then "At my place"). "What happens next" Head,
timeline Flat. Footnote "If Amara declines or doesn’t reply, the hold is released and your job stays saved.{late}" → **"If Amara
declines or doesn’t reply, your hold is released."**{late sentence kept verbatim — money}. "Price" Head + `infoButton('deposit')`,
flat breakdown + stitch. Actions: "Message Amara" primary (page-actions); "Withdraw request" `textLink` danger (already a red text
button — make it the component). Suggested: "NEW TIME" caps + suggested time `.t-figure`; "You asked for …" kept; "Amara is holding this
time until …" kept; "Accept new time" primary, "Find another tailor" → Link. Declined / withdrawn / passed / expired: primary unchanged,
every outline secondary ("Message Amara", "Find another tailor") → Links in one row. Expired "Holds $16.00 again · Amara has until …"
kept. Withdraw sheet: danger + outline (confirm exception). push-prompt overlay unchanged copy. Empty: Art `'Suit Jacket'`. **Exp:**
none (all asserted copy kept).

**c-bookings** — Section headings "Upcoming" / "In progress" / "Past" → Head. Rows unchanged (cards, dot status). Push banner warm
warning unchanged. Empty: Art `'Formal Dress'`; "Start a booking" primary. **Exp:** `c-bookings` `'Upcoming'` → `'UPCOMING'`, `'Past'`
→ `'PAST'`; `c-bookings--ready` `'Past'` → `'PAST'` (keep `'In progress'`: the status word still prints it), not `'Upcoming'` →
`'UPCOMING'`; `c-bookings--empty` not `'Upcoming'` → `'UPCOMING'`.

**c-booking** — Hero (dot + title + ≤ 2-line body). Visit block: Head "Visit", first row **`.t-figure` "Thu, Oct 15 · 5:00 PM"** (was
the serif 24 visit-block title), then "At my place · 60 min", address, "2 items · 3 services". "What happens next" Head + flat
timeline. "Price" / "Receipt" Head + `infoButton('deposit')` (not on Receipt), flat + stitch; policy line "Free cancellation until Wed,
Oct 14 · 5:00 PM. After that, the $16.00 deposit is kept." kept (money). Actions (page-actions): "Message Amara" primary; "Reschedule"
outline → Link; "Cancel booking" → `textLink` danger; both links in one row. Late: "To change the time now, message Amara." kept (it
replaces Reschedule). Cancelled / can't-make-it / no-show: cut "Think this is a mistake? Message Amara." (the Message link remains);
"Find another tailor" outline → Link. M4 bodies: fitting "Amara is going through the order with you. You’ll approve the final order
here before any work starts." → **"Amara is going through the order with you."**; in-progress "You approved the order. You’ll pay the
$144.00 balance when it’s ready." kept (money); dropoff "Amara will bring it to your door and message you to agree a time. You’ve paid
in full." → **"Amara will bring it to your door. You’ve paid in full."**; pickup policy "Message Amara if you’re coming outside shop
hours. Amara marks the order completed when you have it." → Cut first sentence. "Your order" / "Your review" Head. Completed: "Book
Amara again" primary, "Message Amara" Link; receipt stitch (A5.10 #2). Reschedule sheet: "Keep current time" outline stays (sheet).
Cancel sheet unchanged (danger + outline). **Exp:** `c-booking--in-progress` `'Your order'` → `'YOUR ORDER'`; `c-booking--docs`
`'Your order'` → `'YOUR ORDER'`; `c-booking--completed` `'Your review'` → `'YOUR REVIEW'`; `c-booking--fitting` keeps `'going through
the order'`; `c-booking--returning-dropoff` keeps `'drop it off'` (the title "Amara will drop it off" is unchanged).

**c-price-change** — Hero body → **"Amara updated your order at the fitting. Approve it and Amara starts the work."** (changed) /
**"Amara checked everything at the fitting. Nothing changed."** (unchanged); cut "Nothing more is charged until it’s ready." (the
balance row says "Due when ready"). "NEW TOTAL" deltaFigure stays (hero money). Note quote stays; masked line kept (privacy). "What
changed" / "Your order" Head; `changeSummary` one part per line when ≥ 3. Cut "Amara photographed each item before and after
pinning." (the Before | Pinned tabs say it). Revised line "Amara updated the order again at 5:12 PM." kept. "Price" Head, flat +
stitch above "New total" / "Total". Cut "If something doesn’t look right, message Amara before you approve." Bar: "Approve and start"
primary; "Message Amara" / "Open chat" → Link. Messaged banner (info → warm). **Exp:** `c-price-change` `'What changed'` → `'WHAT
CHANGED'`; `c-price-change--unchanged` `'Your order'` → `'YOUR ORDER'`; `c-price-change--docs` remove `'photographed each item'` (add
`'Amara’s comment'` already there); keep everything else.

**c-ready** — Hero bodies kept (they are one sentence each). "How do you want it back?" / "Getting it back" Head. Return options stay
one `.card` radiogroup (interactive); option subs break the "·" chain: pickup **"Reyes Tailoring, 312 Metropolitan Ave"** with
**"Free"** right-aligned in the row's value slot (`t-body w-600`), dropoff "Amara brings it to 145 N 7th St, 2R" + "Free", courier "Uber,
today · priced when you choose it" (one dot, kept). Single-option line "Amara offers in-store pickup for this order." kept. courierCard
per A5.15. "Your order" Head with garment icons. "Price" Head, flat + stitch. Bar: Pay primary; "Message Amara" → Link; disabled note
"Choose how to get it back first." kept. Pay sheet: "Your $16.00 deposit is already taken off." kept; "Pay with" caps label. Declined
banner unchanged. **Exp:** `c-ready` `'How do you want it back?'` → `'HOW DO YOU WANT IT BACK?'`, `'Your order'` → `'YOUR ORDER'`.

**c-complete** — Hero "All done" (dot done). Rating block stays `.card` (interactive): "How did Amara do?" → `t-body w-600` (not
serif); "Your rating" label; stars; hint "Tap a star to rate. Reviews show on Amara’s profile." → **"Shown on Amara’s profile."**
"Receipt" Head; the "In-store pickup · Thu, Oct 15" line, then **stitch** (A5.10 #2), then flat rows (stitch again above Total — the
one inside moneyRows); "Balance paid with Visa •••• 4242." kept. Bar: "Leave a review" primary; **cut "Done"** (D-195: Back and the
nav already leave); "Message Amara" → Link. **Exp:** `c-complete` `'Receipt'` → `'RECEIPT'`.

**c-review** — Form: "Your rating" stars; textarea helper "The work, the fit, how it went. Phone numbers and emails are hidden." →
**"Phone numbers and emails are hidden."**; "Photos (optional)" + add tile; added photos → `photoStub({ type: <the order's first
garment> })`; "Up to 3 photos." kept. Submitted: "See Amara’s profile" primary, "Back to Bookings" → Link. Empty: Art `'Skirt'`.
**Exp:** none.

**c-messages** — Cut the sub "One conversation per tailor, from your first question to the review." Thread rows: one `.card`
thread-list (interactive) unchanged; status dot. Empty: Art `'Shirt / Blouse'`. Loading skeleton circle avatar. **Exp:** none.

**c-thread** — Head: circle avatar; sub "Reyes Tailoring · Williamsburg" (one dot) kept. Context row `.card` with status dot. Privacy note
kept as a single footnote line with `ICON_INFO` (A5.15). Bubbles unchanged; photos → `photoStub` of the booking's first garment
(no booking → hanger). New-question empty text kept. Read-only: "Find another tailor" primary, "Start a different job with Amara" →
Link. Attach sheet: rows unchanged. Failed / masked unchanged. **Exp:** none.

**c-account** — Identity block **Flat**: 80 px circle avatar, name **`t-body w-700`** (was serif `.t-h2`), phone `t-body`, email `t-small
c-600`; Cut "You sign in with this number." List of three rows stays `.card--list` (interactive). "Sign out" outline → `textLink`
(muted ink, not danger — signing out loses nothing). Version micro line `c-600`. Sign-out modal unchanged (danger + outline). **Exp:**
none.

**c-addresses** — Address rows stay cards; labels "Home" / "Work" `t-body w-600`. Note "New bookings start from your default address.
Changing it doesn’t move a booking you’ve already made." → **"New bookings start from your default address."** Empty: Art
`'Accessories'`; body "Add the address where you’d like tailors to visit. You can also type one in when you book." → **"Add where
you’d like tailors to visit."** Add sheet unchanged. **Exp:** none.

**c-cards** — "Cards" / "Other ways to pay" (`t-body w-600`) → Head. Card rows stay cards. Card sheet: "Make default" / "Add a card"
outline → Links; Remove confirm (danger + outline) unchanged; "Your card is stored by our payment provider, not by Taily." kept. Info
banner warm. Empty: Art `'Accessories'`. **Exp:** none.

**c-orders** — Cut "Tap an order to see its receipt." Rows unchanged (cards). Empty: Art `'Formal Dress'`. **Exp:** none.

### Cluster 3: tailor onboarding + shop

**t-phone** — No nav. Eyebrow "FOR TAILORS" kept. Lead "Set your own prices and hours. We’ll text you a code — no passwords." →
**"Set your own prices and hours."** Steps line "Next: six short steps — profile, services and prices, where you work, return options,
hours and payouts. About 10 minutes, and you can finish later." → **"Next: six short steps, about 10 minutes. You can finish
later."** Helper "US numbers only. Message and data rates may apply." kept (legal). "Looking for a tailor? Book one" kept. **Exp:**
keeps `'six short steps'`.

**t-code** — As c-code. **Exp:** none.

**to-profile** — `onboardingHeader` (no nav). Lead "This is the first thing customers see. Keep it short and personal." → **"This is the
first thing customers see."** Photo: the grey rounded square → 80 px tinted circle avatar with initials (camera glyph while the name is
empty); "Add a photo" small outline → Link; note "Optional. Helps customers recognise you at the door." → **"Optional."** Helpers:
name "Customers see your full name." kept; shopName helper "Shown under your name, like a shop sign." Cut; bio helper kept. Work photos:
label kept; tiles → `photoStub` cycling garment types; note "Up to 6. Before-and-after shots work well." → **"Up to 6."** Preview:
framed, miniProfile with circle avatar. Resume banner warm. **Exp:** none.

**to-services** — Lead "Tick what you do and set your usual price. At the fitting you can add or remove items and services. The customer
approves the final order before you start." → **"Tick what you do and set your usual price."** Fee line ("Taily keeps $10.00 of every
$100.00 of services. Home-visit and rush fees are yours in full.") kept + `infoButton('fee')`. "SERVICES" + "3 selected" → Head with
count. Service list stays one `.card` (interactive). Row captions: garment lists "Suit Pant · Pants / Jeans · Skirt" → **commas**
("Suit Pant, Pants / Jeans, Skirt") (·); "You take home $22.50 · Taily fee $2.50" kept (one dot). "On your profile" grey card → Flat
list under a Head. Bar lead "3 services on your profile" kept. Unsaved modal unchanged. **Exp:** none (the take-home line keeps its one
dot).

**to-where** — Lead "Turn on one or both. Customers only see the visit types you offer." → **"Turn on one or both."** Toggle groups
stay `.card`s. Shop helper "30-minute visits at your shop." / home "60-minute visits at the customer’s place." kept. Cut "Customers in
these ZIP codes can book a home visit." Fee helper "Added to every home visit and paid to you in full. If a customer cancels within 24
hours, you keep their deposit instead." → **"Paid to you in full."** + `infoButton('fee')` beside the field label (the cancellation
rule moves to the fee sheet). Pickup consequence note kept. Preview card: `.card` + circle avatar; foot line "Includes $35 home-visit
fee" kept. **Exp:** none (`to-where` keeps `'Includes $35 home-visit fee'`).

**to-returns** — Lead "Pick every option you offer. The customer chooses one when the order is ready." → **"Pick every option you
offer."** Options stay one `.card`; captions kept (courier keeps "nothing comes out of your payout"). Preview "Getting it back" (`t-body
w-600`) → Head inside the preview. **Exp:** none.

**to-availability** — Lead "Set your usual week. Each request still needs your OK, and you have 2 hours to reply." → **"Set your usual
week. You have 2 hours to reply to each request."** Segmented control stays. "SHOP HOURS" caps → Head. Note home "Home visits are 60
minutes. Leave time to travel between them." → **"Home visits are 60 minutes."** (shop note unchanged). Day rows stay one `.card`.
**Exp:** none (`to-availability--single` keeps `'SHOP HOURS'`, `'Shop visits are'`).

**to-payouts** — Lead kept. Fee section **Flat**: Head "The Taily fee" + `infoButton('fee')`; the sentence **`t-body w-600 ink`** (was
serif `.t-h2`), amounts unchanged; the four ✓ points → **one** line kept: **"Home-visit and rush fees are yours in full."** (the
other three move to the fee sheet). "Your bank account" Head; fields; "Only the last 4 digits are shown in the app." kept (privacy).
Edit mode "Current account" caps block Flat. Resume banner warm. **Exp:** check the full `to-payouts` `has` list (the line is cut in the
expect dump): it must not assert the moved bullets; if it does, drop them.

**to-done** — Status-bar only (unchanged). The ✓ circle → `garmentIcon('Suit Jacket', { size: 'hero' })` in a 120 px `--accent-bg`
circle (signature). Title kept. Lead "Customers near you can find you and send requests now. We’ll text you each one — you have 2
hours to reply." → **"Customers near you can book you now. You have 2 hours to reply to each request."** "HOW A CUSTOMER IN WILLIAMSBURG
SEES YOU" caps kept; preview framed; caption "Example job: Suit Pant · Suit Jacket · Home visit" → **"Example job: suit pant and suit
jacket, home visit"** (·). "What happens next" Head; steps: 1 kept, 2 kept, 3 "At the fitting you can add or remove items and services.
The customer approves the final order before you start." → **"At the fitting, send the final order. You start once the customer
approves."** Rush line kept. Bar: "Go to my shop" primary, "See my profile as a customer" → Link. **Exp:** `to-payouts--returned`
`'What happens next'` → `'WHAT HAPPENS NEXT'`.

**t-shop** — Status block stays `.card` (toggle): status → `statusPill('bookable')` / `statusPill('paused', 'Paused · customers can’t
send requests')`; Cut "Customers can find and book you." Toggle helper (paused) "Jobs you already booked are not affected." kept.
Incomplete banner unchanged. "WHAT CUSTOMERS SEE" preview framed; caption "For the sample job: Suit Pant · Suit Jacket · Home visit" →
**"Sample job: suit pant and suit jacket, home visit"** (·). "Your setup" Head; list stays `.card--list`; rush summary "1 day +$40 · 2
days +$25 · 3 days +$15" → **"1 day +$40, 2 days +$25, 3 days +$15"** (·); "Needs attention" flag stays error ink. "Sign out" outline →
`textLink` muted. **Exp:** `t-shop` keeps `'Bookable'`, `` `1 day +${fmt(…)}` ``; `t-shop--paused` keeps `'Paused · customers can’t send
requests'`.

**t-rush** — `chrome('shop')` (editing). Lead "Charge extra when a customer needs it back soon after the visit. 4 days or more is always
free." kept (two short sentences, both decision). Note "Rush fees are yours in full — Taily takes no fee on them." → **"Rush fees are
yours in full."** Fields stay. Preview ladder → `rushLadder` rows (·). **Exp:** keeps `'yours in full'`, `'4 days or more'`.

### Cluster 4: tailor inbox, job, earnings, messages

**t-home** — Date caps + "Hi, Amara" kept. Summary "1 new request · 1 upcoming visit" kept (one dot). Section heads "New requests" /
"Waiting on Sarah" / "Upcoming" / "In progress" / "Recent" → Head with count. None line "No new requests right now. You’ll get a
notification when one comes in." → **"No new requests right now."** requestCard per A5.15 (visit / place lines, first garment icon next
to "2 items · 3 services", countdown kept, take-home serif). apptRows unchanged (dot status). Paused line "Paused · Turn back on" kept
(the button is a Link). Push banner / push sheet copy unchanged. Empty: Art `'Suit Jacket'`, body "When a customer books you, the
request shows up here. You’ll have 2 hours to answer each one." kept. **Exp:** `t-home` `'New requests'` → `'NEW REQUESTS'`,
`'Upcoming'` → `'UPCOMING'`; `t-home--push-denied` / `t-home--no-upcoming` / `t-home--paused` `'New requests'` → `'NEW REQUESTS'`;
`t-home--no-requests` `'Upcoming'` → `'UPCOMING'` and its not `'NEW REQUESTS 1'` stays (now a real check); `t-home--in-progress` `'In
progress'` → `'IN PROGRESS'`, not `'Upcoming'` → `'UPCOMING'`; `sys-offline-tailor` `'New requests'` → `'NEW REQUESTS'`.

**t-request** — Hero: status dot "New request" + "Sarah C." title. Take-home: the white box → **Flat** hero ("YOU TAKE HOME" caps,
`.t-display` money, "after the $12.50 Taily fee" `t-body c-700`) + `infoButton('fee')`. Countdown strip (bordered) → **Flat** status
line: countdown `t-small w-600` + "Answer by 12:00 PM" (soon: warning ink, "Expires soon · answer by"). "THE VISIT" Head; time row
**`.t-figure`** (was serif `.t-h2`); "Home visit · 60 min, until 6:00 PM", "Williamsburg · 11211", "Full address after you accept" kept
(privacy), "Needed by Fri, Oct 23 · 8 days after the visit" kept. "The work" Head + `infoButton('fitting')`; workList with garment
icons, photo thumb → `photoStub`; Cut the footnote "At the fitting you can add or remove items and services. Sarah approves the final
order before you start." (→ⓘ fitting). "Your take-home" Head, flat + stitch. Bar: Accept primary; "Suggest time" → Link; "Decline" →
`textLink` danger. Suggested: Message primary; "Back to Home" → Link; "Withdraw suggestion" → danger Link. Expired / declined / passed:
"Back to Home" primary unchanged. Decline sheet intro "Sarah is told right away and her hold is released. A reason helps her — it’s
shown to her." → **"Sarah is told right away and her hold is released. She sees your reason."** Withdraw sheet intro kept. Empty: Art
`'Suit Pant'`. **Exp:** `t-request` — check its full `has` list (cut in the dump) for `'At the fitting you can add or remove'`; drop it
if present. Others unchanged.

**t-suggest** — Lead kept. Scheduler card stays. "You take home $147.50." kept; rush-window line kept. "Answer by 12:00 PM." kept.
no-slots empty: secondary → Link; Art `'Suit Jacket'`. **Exp:** none.

**t-job** — Hero notes shortened (keep the asserted phrases):
- fitting: "Go through each piece with Sarah. Take a before and a pinned photo of each, add or remove items and services, then send
  Sarah the final order. You start the work once Sarah approves." → **"Take a before and a pinned photo of each item, then send Sarah
  the final order."**
- approved: "Sarah approved the order. Mark it ready when the work is done. Sarah then picks how to get it back and pays the balance."
  → **"Sarah approved the order. Mark it ready when the work is done."**
- messaged: "Sarah messaged you instead of approving. Reply in chat. Sarah can approve once you’ve talked, or you can edit the order." →
  **"Sarah messaged you instead of approving. Reply in chat, or edit the order."**
- ready: kept (asserts "plus the courier if she picks it").
- courier: "Sarah paid the balance and booked a Taily courier. Have the order ready at Reyes Tailoring, then tap Handed to courier when
  it leaves with them." → **"Sarah paid and booked a Taily courier. Tap Handed to courier when it leaves your shop."**
- completed: "Sarah Chen’s order, completed Thu, Oct 15. Thanks for the careful work." → **"Completed Thu, Oct 15."**
- others (accepted, replied, waiting, pickup, dropoff, cancelled, can't-make-it, no-show) unchanged.
Visit block: Head "Visit"; time **`.t-figure`**; rows; "Directions" / "Add to calendar" outline pills → two Links with `ICON_DIRECTIONS` /
`ICON_CALENDAR` in one row. Customer block **Flat**: circle avatar + name + "Customer"; its inline "Message Sarah" filled button → Link
with `ICON_CHAT` (the bar owns the one primary; when there is no bar, it is the page-actions primary). "The work" Head with docs. "Your
take-home" Head, flat + stitch; fine print "Your payout arrives the Friday after you mark the job completed. The order can change at the
fitting." → **"Your payout arrives the Friday after you mark the job completed."** + `infoButton('payouts')` in the Head aside;
"Price updated after the fitting." kept. **"Something wrong?" section → ••• menu** (D-195): `moreMenu()` at the right end of the Back
row (`heading-row--back`), shown while either action is available; `openMoreMenu([{ label: 'I can’t make it', sub: 'Cancel this visit
and refund Sarah', act: 'cant-make-it', tone: 'danger' }, { label: 'Mark as no-show', sub: 'If Sarah isn’t there by 5:15 PM', act:
'no-show', tone: 'danger' }])` (same availability rules as today; the wait line becomes the no-show row's `sub`); new state `t-job--more`.
Waiting-on: "The order you sent" Head; "Your take-home if approved" Head; unsent line kept. Completed: payout hero flat (YOU TAKE HOME,
display money, status dot + "Arrives …"), "See the payout" Link, "Back to Home" outline → Link, "Sarah can leave a review now." kept.
Mark-ready sheet unchanged. Can't-make-it / no-show sheets unchanged. Empty: Art `'Suit Pant'`. **Exp:** `t-job` replace `'make it'`
with sel `'[data-act="more"]'` (keep has `['Confirmed', 'Visit with Sarah Chen', '145 N 7th St']`); `t-job--visit` drop `'Something
wrong?'` (add sel `'[data-act="more"]'`; keep `.action-bar`); `t-job--cant-make-it` click `['[data-act="more"]',
'[data-act="cant-make-it"]']`; `t-job--no-show` click `['[data-act="more"]', '[data-act="no-show"]']`; `t-job--docs` / `t-job--completed`
`'The work'` → `'THE WORK'`; `t-job--waiting` `'The order you sent'` → `'THE ORDER YOU SENT'`; `t-job--ready` `'Ways back you offered'`
→ CAPS if it is the section heading; `t-job--fitting` keeps `'Take a before and a pinned photo of each'`. New state `t-job--more`
(click `[data-act="more"]`, has `['I can’t make it', 'Mark as no-show']`, sel `[data-s="more"]`). Journey J5 starts from
`t-job--cant-make-it` (unchanged entry, new clicks).

**t-adjust** — Eyebrow "AT THE FITTING" + title kept. Notes "Take a before photo and a pinned photo of each item. Add or remove items
and services with Sarah, then send Sarah the final order. You start the work once Sarah approves." → **"Photograph each item before and
after pinning, then send Sarah the final order."** Garment cards stay `.card`; "Remove item" stays a small text button; docsEditor per
A5.13 (Required → error after Send / leave). Comment helper "What you pinned and why. Phone numbers and emails are hidden." →
**"Phone numbers and emails are hidden."** "+ Add an item" card stays. Note field helper "Say what you found at the fitting. Phone
numbers and emails are hidden." → **"Phone numbers and emails are hidden."** "What changes" Head; deltaFigures stay (hero money);
breakdown flat + stitch; fine "Sarah’s $16.00 deposit stays the same. The balance is due when the order is ready." → **"Sarah’s $16.00
deposit stays the same."** Bar lead "No changes · Sarah pays $160.00 · You take home $147.50" → two columns, no dots: left **"Sarah pays
$160.00"**, right **"You take home $147.50"** (`t-small c-600`, amounts `w-600 ink`; the change summary lives in the page). Send:
`softDisabled` while photos are missing (A5.13), hard-`disabled` for "Change something to send it again." Revise info banner warm.
Leave modal unchanged copy. **Exp:** `t-adjust` `'Add at least one before photo'` → `'Required'` (and drop `'Add …pinned photo'` if
listed); `t-adjust--photos-missing` add `click: ['[data-act="send"]']` (has unchanged: the error copy appears after the tap; sel
unchanged — the message keeps `data-missing-msg`); `t-adjust--item-docs` keeps the bar note; its sel `[data-missing-msg="pinned"]` also
matches the pristine "Required" span. New state `t-adjust--photos-required` (pristine: has `['Required', 'Add before and pinned photos for
1 item']`, not `'Add at least one'`, sel `'[data-act="send"][aria-disabled="true"]:not([disabled])'`).

**t-earnings** — Next payout card → **Flat** hero: "NEXT PAYOUT" caps + `infoButton('payouts')`, `.t-display` amount, "Arrives Fri, Oct 23
· to Chase ••6789" `t-small c-600`, "1 job · after the Taily fee" kept; the payout rows below it → `.card--list` (tappable), each with a
24 px garment icon before "Suit Pant, Suit Jacket". Failed: banner unchanged; merged "Fri, Oct 23 · $X once your bank is fixed" →
`.t-figure`-sized sans (was serif `.t-h2`, it is a sentence, not hero money); "Fix bank details" outline → it is the page's primary
(failed state only) → filled `cta`. "Nothing scheduled" → `.t-figure`; its body kept. "Paid" Head; groups: date + "Paid to Chase
••6789", rows in `.card--list`. Cut the footer "Job payouts are after the Taily fee. Kept deposits and no-show pay have no fee. Taily
pays out every Friday." (→ⓘ payouts). Empty: Art `'Accessories'`; body kept (asserts "every Friday"). **Exp:** `t-earnings*` — any
`'Paid'` that matched the heading must become `'PAID'` (the payout status word "Paid" may still match; builder confirms).

**t-payout** — Status dot + "YOUR PAYOUT" caps + `.t-display` amount; "Paid Fri, Oct 16 · to Chase ••6789" kept. Job card → `.card`
`listRow`-style button ("Open the job" becomes the row's chevron action, title "Sarah Chen", sub line 1 "Thu, Oct 15 · 5:00 PM", sub
line 2 "Home visit" (·), "2 items · 3 services" with the first garment icon). "How it adds up" Head + flat breakdown + stitch above
"Your payout". Fine lines kept ("No Taily fee on a kept deposit." / no-show); courier line "The courier was paid by Sarah. It isn’t
part of your payout." → **"Sarah paid the courier. It isn’t part of your payout."** Failed: bar primary unchanged. **Exp:** none.

**t-messages** — Cut the lede "One conversation per customer, linked to its request or job." Rows as c-messages. Empty: Art
`'Shirt / Blouse'`. **Exp:** none.

**t-thread** — As c-thread (circle avatar, context card, privacy line, photo stubs). Read-only text "You declined this request, so the
conversation is closed. Sarah can send you a new request for a different job." → **"You declined this request, so the conversation is
closed."** Empty-thread text kept. **Exp:** none.

### System-wide states hosted by screens

`sys-offline` / `sys-offline-tailor` banner: ink-on-linen (no blue), "Retry" `textLink`. `sys-session-expired*` sheet: motion A5.14,
"Sign out" `textLink` muted. `sys-push-prompt*` modal: "Not now" `textLink` muted (one primary "Turn on notifications").
`sys-error-toast` / error banner unchanged. **Exp:** none.

---

## C. Clusters (parallel builders after §A lands)

| cluster | screens | notes |
|---|---|---|
| **1 · Customer booking** | c-welcome, c-phone, c-code, c-name, c-job, c-where, c-tailors, c-tailor, c-book, c-pay, sys-index, sys-components | owns the flowBar adoption (D-186) on 5 screens; sys-components only re-checks the gallery the system builder wrote |
| **2 · Customer post-booking, account, messages** | c-request, c-bookings, c-booking, c-price-change, c-ready, c-complete, c-review, c-messages, c-thread, c-account, c-addresses, c-cards, c-orders | most copy cuts; many CAPS expects |
| **3 · Tailor onboarding + shop** | t-phone, t-code, to-profile, to-services, to-where, to-returns, to-availability, to-payouts, to-done, t-shop, t-rush | fee ⓘ sheet adoption |
| **4 · Tailor inbox, job, earnings, messages** | t-home, t-request, t-suggest, t-job, t-adjust, t-earnings, t-payout, t-messages, t-thread | t-job ••• menu, t-adjust Required state (D-196) |

Each builder edits only its screens' JS / CSS and their `FLOWS_<id>` arrays (`js/fixtures/m1…m5.js`), runs `npm run check` (visual
diffs expected — do not accept; the integrator does), and reports in structured JSON: files changed, expects changed, new state keys
needed, anything the system layer is missing.

---

## D. Integration

**D1. Expect changes (all known; builders fix any other CAPS / moved-copy miss the check reports).**
`c-tailor` 'Your estimate'→'YOUR ESTIMATE' · `c-tailor--reviewed` not 'Your estimate'→'YOUR ESTIMATE' · `c-bookings` 'Upcoming'→
'UPCOMING', 'Past'→'PAST' · `c-bookings--ready` 'Past'→'PAST', not 'Upcoming'→'UPCOMING' · `c-bookings--empty` not 'Upcoming'→
'UPCOMING' · `c-booking--in-progress` / `c-booking--docs` 'Your order'→'YOUR ORDER' · `c-booking--completed` 'Your review'→'YOUR
REVIEW' · `c-price-change` 'What changed'→'WHAT CHANGED' · `c-price-change--unchanged` 'Your order'→'YOUR ORDER' ·
`c-price-change--docs` drop 'photographed each item' · `c-ready` 'How do you want it back?'→'HOW DO YOU WANT IT BACK?', 'Your
order'→'YOUR ORDER' · `c-complete` 'Receipt'→'RECEIPT' · `to-payouts--returned` 'What happens next'→'WHAT HAPPENS NEXT' · `t-home`,
`t-home--push-denied`, `t-home--no-upcoming`, `t-home--paused`, `sys-offline-tailor` 'New requests'→'NEW REQUESTS' · `t-home`,
`t-home--no-requests` 'Upcoming'→'UPCOMING' · `t-home--in-progress` 'In progress'→'IN PROGRESS', not 'Upcoming'→'UPCOMING' · `t-job`
'make it'→ sel `[data-act="more"]` · `t-job--visit` drop 'Something wrong?' · `t-job--cant-make-it` / `t-job--no-show` clicks via
`[data-act="more"]` · `t-job--docs`, `t-job--completed` 'The work'→'THE WORK' · `t-job--waiting` 'The order you sent'→'THE ORDER YOU
SENT' · `t-adjust` 'Add at least one before photo'→'Required' · `t-adjust--photos-missing` + click Send · `to-payouts`, `t-request` —
verify no moved copy is asserted.

**D2. Harness / lint (integrator).** `scripts/v5/lint.mjs` hygiene: fail on `var(--info` and `var(--media-placeholder` outside
`tokens.css`; fail on a CSS `box-shadow` with a blur radius outside the overlay selectors (`.sheet`, `.modal`, `.toast`,
`.push-banner`, `.scheduler-popup`). The 44 px lint covers the new `text-link`, `info-btn`, `more-btn`, nav icons, `flow-bar__exit`.

**D3. Inventory + visuals.** SCREENS.md + `js/inventory.js` (regenerate): add `M7` to `MILESTONES` ({ id: 'M7', name: 'Polish' }) and
`BUILT`; new states `c-tailor--verified` (overlay), `t-job--more` (overlay), `t-adjust--photos-required` (state), all `m: 'M7'`.
Every visual key changes: `npm run visual -- --accept <all keys>` after review, listed in the commit body as "M7: every key re-baselined
(polish)". Journeys: J5 path through the ••• menu.

**D4. Figma** (after review, MASTER-PLAN §5): update the Taily Design System components (nav icons, avatar, status dot, section
heading, text link, stitch divider, info sheet, photo stub) and the screen frames on `User - v5`, `Tailor - v5`, `Tailor - Onboarding
v5`; 3 spot checks.

**Decisions:** D-186 flow bar · D-187 nav icons · D-188 status dot tones · D-189 Verified sheet · D-190 rating once · D-191 info
sheets · D-192 CAPS expects · D-193 one depth strategy · D-194 photo stubs · D-195 one primary, c-complete Done cut, t-job ••• menu ·
D-196 Required vs error · D-197 stitch placement · D-198 welcome · D-199 avatar tint for both personas.
