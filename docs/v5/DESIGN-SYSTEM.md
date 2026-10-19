# Taily design system — engineering handoff (K-53 a6)

For the engineers building the MVP from the v5 prototype. The prototype is the spec: reuse its tokens and component CSS as they are
(the readiness plan's a6 recommendation) and port the HTML builders to your framework with the **same markup and class names**, so
the CSS keeps working. `DESIGN.md` (repo root) is the full design language; `components.html` / the `sys-components` screen is the
living gallery; this page is the short version: where things live, how to reuse them, and the rules the harness enforces.

## Where things live

| What | File | Notes |
|---|---|---|
| Design tokens | `css/tokens.css` | colours (+ `-ink` text twins and `-bg` grounds), spacing 2…40 + the five rhythm roles, radii, type sizes (`--size-*`, **rem** on a 16 px root), line-height ratios (`--lh-*`), surfaces (`--card-ring`, `--card-ring-tap`, `--hairline`), shadows, chrome geometry (`--status-h`, `--nav-h`, `--body-top`, `--column`), `--touch` 44, z-index ladder, motion (`--ease-out`, `--dur-*`, `--press-scale`) |
| Base + type classes | `css/base.css` | reset, `.t-display .t-title .t-h2 .t-figure .t-money .t-money--md .t-body .t-small .t-caps .t-micro`, weights `.w-400…700`, colours `.c-*`, status bar / top nav chrome, test-mode switches |
| Component styles | `css/components.css` (kept v4 atoms), `css/components-v5.css` (everything v5) | one rule set per component; variants as BEM modifiers (`.cta--two`, `.banner--warning`, `.reminder-card--dismissible`) |
| Screen styles | `css/screens/<id>.css` | **layout only** (gaps, order, a screen's own grid); never a colour, size or new component look |
| Component builders | `js/components.js` (+ `js/scheduler.js`, `js/system.js` for the system layer) | pure functions returning HTML strings, plus `wire*` / `open*` helpers that attach behaviour or open an overlay |
| Money | `js/money-config.js` (`MONEY`, `POLICY`: every rate, fee and timer) → `js/money.js` | integer cents; print with `fmt` (whole dollars when whole), `fmtExact` (always cents), `fmtNeg` (U+2212), `fmtColumn` (one precision for a group) |
| Dates | `js/dates.js` | `fmtWhen` "Thu, Oct 15 · 5:00 PM", `fmtDay`, `fmtTime`, `fmtTimeRange`, `dayWord`; the prototype runs on a frozen clock (`now()`) |
| Status → screen | `js/state.js` `statusScreen(appt, persona)` | THE map from an appointment's state to the screen each person sees; texts and deep links land through it |
| Copy | screens + `js/texts.js` (94 texts) + `js/policies.js` (policy / legal drafts) | frozen in `docs/v5/COPY-DECK.md` |
| Gallery | `js/gallery.js` → `components.html` and the `sys-components` screen | every shared component and variant on the seed data |
| Screens + states | `docs/v5/SCREENS.md` → `js/inventory.js` | every screen id and state key; each state is a Test-flows entry in `js/fixtures/*.js` |
| Baselines | `ref/v5/<flow-key>.png` | 390 × 844 @2x renders of every state |

## Reusing a component

1. Find it in the gallery (`components.html`), then its builder in `js/components.js` — the doc comment above each builder lists its
   options, states and the decision that shaped it.
2. Call the builder with data, never with pre-formatted money: pass cents and let it format (`moneyRows`, `customerBreakdown`,
   `tailorBreakdown`, `requestHead({ payoutCents })`).
3. Wire behaviour with the matching helper (`wireToggles`, `wireChipGroups`, `wireStars`, `wireComposer`, `wireGarmentDocs`,
   `wirePhotoViewer`, `wireTextLimit`, `wireHelpThread`); popovers (`[data-verified]`, `[data-peek]`) are delegated app-wide.
4. Need something it can't do? Add a **variant** to the builder and its CSS in `components-v5.css` (and a gallery specimen) first —
   never fork a component inside a screen, never restyle it from a screen stylesheet.
5. Overlays: `sheet()` (bottom sheet chassis), `confirmSheet` / `leaveSheet` (a question with one filled button + Cancel),
   `confirmAction` (a confirm that runs an action with its own busy + error line), `openInfoSheet`, `openMoreMenu`, `anchorPopover`.
   **Every confirm is a bottom sheet** (P-32, D-375); the centred modal is for system moments only.

## Rules the harness enforces (`npm run check`)

- **Tokens only.** No hex, rgba or literal px font-size outside `tokens.css` / `base.css`; font sizes only from the scale
  10 / 12 / 16 / 24 / 28 / 32 / 36 (`--size-*`); vertical gaps between groups only through `--rhythm-*` in screen CSS.
- **Dollars only.** Money copy is dollar amounts, never percentages ("Taily fee −$18.75", "Deposit $16.00"); no rate literal outside
  `money-config.js`. The **one exception** is the tailor's fee explainer `to-fee`: "Taily’s 15% covers:" prints through
  `money.js feePercent()` inside `[data-fee-rate]`, and both lints scope the exception to that screen (K-53, D-406).
- **Sans money, serif titles.** Cormorant Garamond is for page titles and overlay titles only. Every amount — hero money included — is
  Hanken Grotesk 600 with tabular lining figures (`.t-money`, `.t-money--md`, `data-money`). Hierarchy by weight and colour, never a
  new size.
- **44 px targets.** Every control is at least 44 × 44. A control that must look small (Verified, Back, the rating link) keeps an
  invisible 44 px hit area on `::before` and carries `data-hit="inline"`.
- **Text in a colour uses the `-ink` token** (`--error-ink`, `--success-ink`, `--accent-ink`, `--neutral-500-ink`); base colours are for
  dots, glyphs, strokes and fills.
- **Cards are for touch.** Tissue white + an inside 1 px ring (`box-shadow: inset 0 0 0 1px …`, strokes are always inside) only for
  interactive groups; a card that is ONE tap target uses `--card-ring-tap` (3:1). Reference content sits flat on the linen.
- **One filled button per screen**; every other action is a text link. Two-line CTA (`cta(label, { sub })`, `actionBar({ ctaSub })`):
  the amount on line one, when it is charged on line two (K-46) — e.g. "Reserve · $16.00 deposit / Charged only if Amara accepts".
- **No console errors, no `%` in money, every state lands on its screen and persona, visuals within 0.1 %** of the baseline.

## Motion

- Press: `transform: scale(var(--press-scale))` (0.97) over `--dur-press` 120 ms `--ease-out`. Transform and colour only — never
  `transition: all`.
- Sheets in 280 ms / out 200 ms (`--dur-sheet-in` / `--dur-sheet-out`), modals 220 ms from `translateY(8px) scale(0.98)` (never from
  `scale(0)`), toasts and the text banner slide only when motion is allowed.
- `prefers-reduced-motion: reduce` (and the harness's `html.is-test`) turns transforms off; opacity / colour stay short.

## Accessibility contract

- One `h1` per screen, focused on navigation; a state strip above it is `#page-strip` and describes the `h1` (announced together).
- Toasts speak through two persistent live regions (`#toast-live`, `#toast-alert`); action toasts last 10 s and pause on hover / focus.
- Busy controls stay focusable: `aria-busy` + `aria-disabled`, never `disabled`; handlers ignore `[aria-busy]`.
- Errors sit next to the field (`field__msg--error`, `role="alert"`); a disabled CTA is described by the reason it waits.
- Cards with one action are stretched links (`request-card`, `tailor-row`): one button laid over the card, any second control (the
  Verified check, the item cluster) a real sibling button above it — never a control inside a button.
- Type follows the reader's text size: sizes are rem, line heights unitless, and the reflow tiers are **em** media queries
  (`max-width: 18.75em` = 300 px at 16 px — the 200 % zoom / large-text tier). Keep spacing and touch targets in px.

## Chrome and the web-app shell

- The prototype draws a 9:41 status bar only in the admin's test session and the gallery (`html.device-frame`); a real visitor's own
  device draws its status bar, so `--status-h` is the top safe-area inset. Production drops the drawn bar entirely.
- `manifest.json` (standalone, portrait, theme `#F7F4EF` = `--neutral-50`, icon `assets/app-icon.svg`) and the theme-colour / Apple
  web-app metas live in `index.html`.
- Top nav (icon only, no bottom tab bar), the booking flow bar, the onboarding bar and the sticky action bar all sit on the linen page
  ground; only the action bar / composer draw a hairline, and only while content scrolls under them.

## Cache-busting (stamps)

`npm run stamp` rewrites the `?v=<hash>` on every stylesheet, modulepreload and the main script, and the import map, in `index.html`
and `components.html`, so a deploy loads as one consistent set (D-246). `npm run check` fails first if a stamp is stale. Never
hand-edit the `stamp:importmap` block. In production the bundler's content-hashed file names do the same job.

## Prototype-only (don't port)

The Test-flows menu, persona switch and Demo actions (admin test session only), `state.sim` knobs, the frozen clock, the fixture files,
`?flow=` / `?screen=` / `?study=` boots, the mock geocoder (`ZIP_XY`), the simulated payments / texts / courier / verification. The
domain rules in `js/state.js` (transitions, timers, `statusScreen`) are the server's spec, not client code.
