# Taily v5: Impeccable technical audit (a11y · performance · theming · responsive · integrity)

Branch `V5` at `f81baad` (post M7 polish). Mode: **Operate** (app UI), refinement review. The incumbent design system is the brief and wins over taste: Cormorant Garamond + Hanken Grotesk, warm neutral tokens, garment illustrations and stitched dash as the only signatures, icon-only top nav, no tab bar (K-01..K-03). Nothing in this report asks to change those. This is a report only: no file under `js/ css/ index.html scripts/ ref/` was edited.

## How it was measured

Read-only Playwright probes ran against `scripts/serve.mjs` with `?test=1`. They live in the session scratchpad, not in the repo.

| Probe | Coverage | What it checks |
|---|---|---|
| DOM audit | **all 286 SCREENS.md states** at 390, the 45 primary screens at 320 / 360 / 375 / 768 / 1280 | text contrast after alpha and opacity compositing, accessible names, keyboard reachability of `data-act` / `role` elements, targets < 44, `img` alt, heading outline, unlabeled inputs, overflow outside the 390 stage, ellipsis truncation, duplicate ids, dangling aria refs, console errors |
| Tab walk | c-job, c-book, c-review, to-availability, to-services, c-tailors, t-request, c-job--services | tab order, visible focus ring, sheet focus trap |
| Activation probe | every enabled button / switch / checkbox in `main` and `.action-bar` on the 43 product screens | presses Enter, then checks whether the screen stayed the same, no overlay opened and focus fell to `<body>` |
| Wheel probe | c-book | listbox ARIA, ArrowDown, a **synthesized CDP touch swipe** (Chromium, mobile emulation) |
| Text resilience | 43 product screens | WCAG 1.4.12 text-spacing override; a 150 % type-token override (`--size-*` × 1.5) |
| Viewport-height probe | 43 screens at 390×664 (iPhone Safari with toolbars) and 375×548 | |
| Forced colors | c-phone, c-job, to-availability | `forcedColors: 'active'` |
| Perf | cold load | request and byte census; 150 ms RTT / 1.6 Mbps / 4× CPU throttle; render cost |
| Rendered type scale | all 286 states | font sizes outside 10/12/16/24/28/32/36 |
| Impeccable detector | `impeccable detect` | tokens, base, components, all v5 screen CSS/JS, index.html |

`sys-index` and `sys-components` are dev galleries and were excluded from the counts. Where a gallery result differs, it is called out.

---

## Audit Health Score

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | **3** | Keyboard focus falls to `<body>` after same-screen re-renders (c-job ×13 controls, c-addresses, c-ready, t-rush). Two contrast misses: scheduler edge rows 4.11:1, success banner 4.25:1. |
| 2 | Performance | **2** | Boot imports all 46 screens, the test fixtures and the gallery before the first paint: 125 requests, 1.15 MB raw JS. The first screen took 8.6 s on throttled 4G + 4× CPU (uncompressed). |
| 3 | Theming | **3** | Tokens are disciplined: no off-scale size renders in any of 286 states. 5 raw shadow literals. No forced-colors support. Dark mode is out of scope (single-mode Figma). |
| 4 | Responsive | **3** | No horizontal scroll at 320–1280, and every target is ≥ 44 at 390. But after the first tap the prototype's "Test flows" pill covers the primary CTA on phones, `.screen{min-height:844px}` adds phantom scroll on real phones, and the visit time truncates at ≤ 375. |
| 5 | Implementation integrity | **3** | Coherent, product-specific system. The detector's two "slop" hits are the brief's own palette and stitched dash (false positives). Isolated literal shadows and duplicate SVG ids. |
| **Total** | | **14/20** | **Good**: address Performance, then the P1s |

## Implementation Integrity Verdict: **PASS**

The implementation expresses one coherent, Taily-specific system:

- **Type and tokens.** Every rendered font size in all 286 states sits on the Figma scale; the probe found zero off-scale sizes. All colors flow through `css/tokens.css`. Secondary text, success, error and warning each have a separate `-ink` text variant that clears 4.5:1 (D-163).
- **Signatures.** The garment watercolors and the stitched dash appear where the brief puts them and nowhere else.
- **Detector results.** The detector raised two "slop" flags:
  - `cream-palette` (`--neutral-100` desktop backdrop)
  - `repeating-stripes-gradient` (the stitched divider)

  Both are **false positives by brief**: the warm-neutral world and the stitched dash are Kevin's K-01..K-03 decisions. Its four advisories are real but isolated (literal `rgba()` shadows and two off-scale radii; see P3-5).

No interchangeable, template-like structure was found.

## Executive summary

- **Score:** 14/20 (Good)
- **Issues:** P0 0 · P1 2 · P2 6 · P3 6
- **Top issues:**
  1. **[P1] The "Test flows" pill covers the primary CTA on every phone after the first tap.** `elementFromPoint` on the CTA returns the pill on c-tailor, c-pay, c-thread (Send) and t-request (Decline).
  2. **[P1] Keyboard / screen-reader focus is lost after in-place re-renders.** It falls to `<body>` on 18 controls across c-job, c-addresses, c-ready and t-rush. The root cause in c-job is a stale `root` after D-47's fresh-node render.
  3. **[P2] The visit time is truncated where it is the point of the element.** "Thu, Oct 15 · 5:00 P…" appears in c-thread / t-thread (14 states at 360, 8 at 375, `c-thread--pending` even at 390). The Need-by pill reads "Fri…" on c-tailors at 360.
  4. **[P2] `.screen { min-height: 844px }` breaks real phone viewports.** At 390×664, c-thread opens scrolled 180 px with the back button and tailor name off-screen, and c-welcome pushes Apple/Google below the fold.
  5. **[P2] Boot is all-or-nothing.** Nothing paints until 73 scripts and 51 stylesheets load.
- **Next steps:** fix both P1s (one CSS rule, and one router-level focus restore), then `adapt` (truncation and viewport height), then `optimize` (boot), then `polish`.

---

## Detailed findings by severity

### P1: Major

#### [P1-1] Prototype "Test flows" pill covers the primary CTA on phones
- **Location:** `css/flow-menu.css:10-21` (`.stage-caption { position: fixed; right: 16px; bottom: 16px; z-index: 20 }`, shown once `html.has-input` is set)
- **Category:** Responsive / Accessibility
- **Evidence:** measured at 390×844 after one tap, without `?test=1`:

  | Screen | Pill rect | CTA rect | `elementFromPoint(cta.right−30, cta.bottom−10)` |
  |---|---|---|---|
  | c-tailor "Pick a time" | 211,796 → 374,828 | 20,770 → 370,824 | `flow-trigger__who` (pill) |
  | c-pay "Hold $16.00 and send request" | 211,796 → 374,828 | 20,770 → 370,824 | pill |
  | c-thread "Send" | 211,796 → 374,828 | 302,778 → 370,822 | pill (Send almost fully covered) |
  | t-request | 234,796 → 374,828 | tertiary "Decline" sits under it | pill |

  The pill sits over the CTA's label ("Pick a ti|me", "Hold $16.00 and s|end request"). Taps on the right ~40 % of the CTA open the test menu instead. At 768 and 1280 the pill sits outside the 390 stage, so the problem is phone-only. That is exactly where the GitHub Pages demo gets shown.
- **Impact:** On a phone, the first real tap makes every bottom CTA partly untappable, and Send is unreachable. Demo users read this as a broken app.
- **WCAG / standard:** 2.5.8 Target Size (obscured target); 1.4.13 (persistent overlay content)
- **Fix:** in `css/flow-menu.css`, dock the pill over the decorative 44 px fake status bar on phone widths and let the panel drop down:
  ```css
  @media (max-width: 430px) {
    .stage-caption { top: var(--space-4); bottom: auto; right: var(--space-8); flex-direction: column-reverse; }
    html.has-toast .stage-caption { bottom: auto; }
  }
  ```
  If you would rather not cover the fake status bar icons, the alternative is a 44×44 icon-only trigger at `bottom: calc(var(--bar-h) + var(--space-8))`. Either way, the pill is outside `.screen`, so no visual baseline changes.
- **Suggested command:** `/impeccable adapt`

#### [P1-2] Focus falls to `<body>` after a same-screen re-render
- **Location:**
  - `js/screens/c-job.js:153`: `refocus` queries the **old** `root`. `render()` replaces `#screen` with a fresh clone (`js/app.js:82-83`, D-47), so the focus call lands on a detached node.
  - Systemic gap: `js/app.js:186-190` restores focus only when `prevScreen !== id`, so same-screen renders keep nothing.
  - Busy CTAs emit `disabled` (`js/components.js:128`), which drops focus while busy.
- **Category:** Accessibility
- **Evidence:** the activation probe found **18 controls** that lose focus, still losing it after a 1.2 s settle:
  - **c-job**, all 13 controls: "Add another / Remove one Suit Jacket|Suit Pant", the 7 add-garment tiles, "Remove Suit Pant|Jacket"
  - **c-addresses**: Remove ×2, Make default
  - **c-ready**: "Taily courier". `u.refocus` is consumed on the first (quoting) render, while the row is disabled. The second render after `withLatency` has nothing left to restore.
  - **t-rush**: the rush-on switch when turning it **off**. Line 81 only refocuses when turning on, and only outside test mode.

  The control cases are fine: to-availability toggles, to-services checkboxes, c-review stars, sheets (trap and Escape verified) and navigation (h1 focus).
- **Impact:** A keyboard or VoiceOver user who adds a garment is thrown back to the top of the document on every press. Building a job of 3 items takes 3 full re-tabs through the nav. Screen readers announce nothing.
- **WCAG / standard:** 2.4.3 Focus Order; 3.2.2 On Input (unexpected context change)
- **Fix:**
  1. **`js/app.js` `render()`.** On a same-screen render, read a focus key from `document.activeElement` before replacing the node, for example `{ id, act: dataset.act, type: dataset.type, value: dataset.value, did: dataset.id, side: 'minus'|'plus'|null }`. Keep it in module scope (`pendingFocus`) so it survives an async second render.
  2. **Restore after `wire()`.** If `document.activeElement` is `<body>` (or outside `#screen`), focus the matching element in the new node with `{ preventScroll: true }`. If it is gone (a removed item), fall back to the nearest list container, else the `h1` (`tabIndex = -1`).
  3. **c-job.js:153.** Change to `requestAnimationFrame(() => document.getElementById('screen').querySelector(sel)?.focus({ preventScroll: true }))`, or delete it once step 2 exists.
  4. **`cta({ busy })`.** Emit `aria-disabled="true" aria-busy="true"` **without** `disabled`, so the pressed button keeps focus. Click handlers already guard on busy state. The visual style stays the same (keep `.cta--busy`).
- **Suggested command:** `/impeccable harden`

### P2: Minor

#### [P2-1] Scheduler edge rows fail text contrast
- **Location:** `css/components.css:1038` and `:1628` (`.wheel__row--edge { color: var(--neutral-500) }`); `:1627` sets the normal rows.
- **Category:** Accessibility
- **Evidence:** 12 px / 500 `#857C6F` on `#FFFFFF` = **4.11:1**, below 4.5. Seen in c-book, c-booking--reschedule, c-where--needby-sheet (all ~60 day rows), t-suggest, t-suggest--rush-window. Per the D-163 token comment, `--neutral-500` is "for glyphs, strokes and control boundaries", not text.
- **Fix:** keep the three-step fade, but shift it onto text-safe tokens:
  ```css
  .wheel--sched .wheel__col--scroll .wheel__row { color: var(--neutral-600); }          /* 7.02:1 */
  .wheel__row--edge,
  .wheel--sched .wheel__col--scroll .wheel__row--edge { color: var(--neutral-500-ink); } /* 5.66:1 */
  ```
  Selected stays `--ink` (17.2:1). Re-baseline with `npm run visual -- --accept` on c-book, c-booking--reschedule, c-where--needby-sheet, t-suggest, t-suggest--rush-window and the gallery.
- **Suggested command:** `/impeccable polish`

#### [P2-2] Success banner text uses the glyph token
- **Location:** `css/components-v5.css:362` (`.banner--success { color: var(--success) }`)
- **Category:** Accessibility
- **Evidence:** `#4F7A5B` on `--success-bg #E9F0EA` = **4.25:1**. It fails for the 12 px `.banner__text` on t-phone--saved ("Sign in with (646) 555-0127 to pick up…") and the 16 px text on t-job--approved. The info, warning and error banners already use `-ink` tokens.
- **Fix:** change it to `.banner--success { background: var(--success-bg); color: var(--success-ink); }` (5.03:1). Re-baseline t-phone--saved and t-job--approved.
- **Suggested command:** `/impeccable polish`

#### [P2-3] The visit time and key labels truncate on common phone widths
- **Location:**
  - `css/components-v5.css:702-704` (`.thread-context__title { white-space: nowrap; text-overflow: ellipsis }`)
  - `css/screens/c-tailors.css:3` (`grid-template-columns: auto auto minmax(0,1fr)`)
  - `css/components-v5.css:715-716` (`.thread-row__head` / `__name`)
- **Category:** Responsive
- **Evidence:** ellipsis truncation measured on leaf text:

  | Element | 390 | 375 | 360 | 320 |
  |---|---|---|---|---|
  | `thread-context__title` "Thu, Oct 15 · 5:00 PM" (c-thread, t-thread) | `c-thread--pending` | 8 states | 14 states | all |
  | `filter-pill__value` Need by (c-tailors) | — | — | 9 states ("Fri…") | "Fri…" |
  | `thread-row__name` (c-messages / t-messages) | — | — | — | "Amar…" (4 letters), "Sarah C." |

- **Impact:** The thread's context card exists to say *when*, and the truncation removes the AM/PM. Messages at 320 shows a row with no recognizable name.
- **Fix:**
  ```css
  /* components-v5.css — let the time drop under the pill instead of clipping */
  .thread-context__line { flex-wrap: wrap; row-gap: 2px; }
  .thread-context__title { white-space: normal; overflow: visible; text-overflow: clip; }
  /* Messages rows: the name keeps its full width; pill + time wrap to their own line */
  .thread-row__head { flex-wrap: wrap; row-gap: 2px; }
  .thread-row__name { flex: 1 0 auto; max-width: 100%; }
  /* c-tailors.css — narrow phones: Visit on its own row, ZIP + Need by share the second */
  @media (max-width: 374px) {
    .c-tailors__filters { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    .c-tailors__filters .filter-pill:first-child { grid-column: 1 / -1; }
  }
  ```
  Only `c-thread--pending`, `t-thread--pending` (if present) and other 390 states where the title is clipped today change at 390. Accept those.
- **Suggested command:** `/impeccable adapt`

#### [P2-4] The fixed 844 px screen height causes phantom scroll and hides the thread header on real phones
- **Location:** `css/base.css:78-81` (`.screen { min-height: 844px }`)
- **Category:** Responsive
- **Evidence:** at 390×664, the visible height of iPhone Safari with toolbars:
  - **Phantom scroll:** every short screen scrolls about 180 px into empty space. For example, c-messages content ends at 258 px while the document is 844 px.
  - **c-thread:** `scrollToEnd()` opens the screen at **scrollY 180**. The top nav and the thread head (back button, "Amara Reyes") start off-screen (`navTop: -136`).
  - **c-welcome:** "Continue with Apple" is cut and Google is fully below the fold. Content ends at 820.
- **Fix:**
  1. `css/base.css`: `.screen { min-height: 100vh; min-height: 100dvh; }`. The harness viewport is 390×844, so the baselines are unchanged. Verify with `npm run check`.
  2. Keep the thread head visible while the thread scrolls: `.c-thread .thread-head, .t-thread .thread-head { position: sticky; top: 0; z-index: 4; background: var(--neutral-50); }`. A new component variant belongs in `components-v5.css` per the rulebook.
  3. c-welcome: tighten the hero to a `min()` height so all three sign-in options fit in 664, for example by capping the illustration disc at `min(…, 22dvh)`.
- **Suggested command:** `/impeccable adapt`

#### [P2-5] Forced-colors (Windows High Contrast) erases the controls' state and boundaries
- **Location:** system-wide. Every stroke is `box-shadow: inset 0 0 0 1px …` (the Figma "strokes inside" rule) and every selected state is a fill. There is no `@media (forced-colors: active)` anywhere in `css/`.
- **Category:** Accessibility / Theming
- **Evidence:** screenshots with `forcedColors: 'active'`:
  - The phone field box disappears, leaving bare text.
  - **Toggles are invisible.** Monday "Closed" and Tuesday open look identical.
  - The selected segment ("Shop" vs "Home visits") cannot be told apart.
  - Selected garment tiles lose their frame while unselected tiles keep one, so the selection reads inverted.
  - The CTAs have no boundary.
  - The Taily logo renders near-invisible.
- **WCAG / standard:** 1.4.11 Non-text Contrast and 1.3.1 under user color overrides
- **Fix:** append to `css/components-v5.css`:
  ```css
  @media (forced-colors: active) {
    .field__box, .cta, .cta-small, .filter-pill__box, .garment-tile, .segmented__opt, .chip, .time-chip,
    .option-row, .tailor-row, .request-card, .appt-row, .thread-list, .composer__input { border: 1px solid CanvasText; }
    .garment-tile--selected, .segmented__opt.is-selected, .chip--selected { outline: 3px solid Highlight; outline-offset: -3px; }
    .toggle::before { background: Canvas; border: 1px solid CanvasText; }
    .toggle[aria-checked="true"]::before { background: Highlight; }
    .toggle__knob { background: CanvasText; }
    .field__box:focus-within { outline: 2px solid Highlight; }
    .top-nav__logo { color: CanvasText; }
  }
  ```
  Normal mode is unaffected, so there is no baseline churn.
- **Suggested command:** `/impeccable harden`

#### [P2-6] Boot loads everything before the first paint
- **Location:** `js/app.js:332` (`await Promise.all(SCREEN_MODULES.map(m => import(...)))` before the first render). `app.js:12-13` statically imports `flows.js` and `flow-menu.js`, which pull every `js/fixtures/m#.js` and `js/gallery.js`. `index.html` holds 51 render-blocking stylesheet links.
- **Category:** Performance
- **Evidence:**
  - **Cold load of `?screen=c-welcome`:** 125 requests. That is 73 scripts (1,154 KB raw, ~372 KB gzip) and 51 stylesheets (248 KB raw, 48 KB gzip).
  - **Largest files:** `components.js` 161 KB, `garment-icons.js` 120 KB (WebP base64, near-incompressible), `fixtures/m4.js` 35 KB, `fixtures/m3.js` 31 KB, `gallery.js` 46 KB.
  - **Throttled:** with 150 ms RTT, 1.6 Mbps and 4× CPU, `Taily.ready` arrived at **8.6 s**, with **no first-contentful-paint before it**: the page is blank until every module resolves. The local server sends uncompressed; GitHub Pages gzips, so expect roughly 3–4 s there, still blank.
  - **Render cost is not the problem:** 0.3–1.1 ms per screen render (c-job 157 nodes, 88 KB HTML because the watercolors are inline data URIs).
- **Fix** (no build step needed):
  1. In `boot()`, import **only** the requested screen's module (plus the one fixture file its `primaryFlow` needs), render, then warm the rest with `requestIdleCallback(() => SCREEN_MODULES.forEach(m => import(...)))`. `go()` should `await import()` a screen that has not loaded yet.
  2. Lazy-import `flow-menu.js` and `gallery.js` on first input (`html.has-input`) or on `sys-` routes.
  3. Leave the CSS links (the no-build rule) but add `<link rel="modulepreload">` for `app.js`, `state.js` and `components.js` so the module waterfall starts in parallel.
- **Suggested command:** `/impeccable optimize`

### P3: Polish

#### [P3-1] Sending dims the confirmation the tailor is reading
- **Location:** `css/screens/t-suggest.css:6` (`.t-suggest__sched[inert] { opacity: .5 }`)
- **Evidence:** on t-suggest--sending, the "Sarah sees · Thu, Oct 15 · 6:00 PM" summary drops to **3.32:1**. It is exempt as inactive UI, but it is the one fact being confirmed.
- **Fix:** scope the dim to `.wheel` inside the scheduler and leave the summary at full ink.

#### [P3-2] Error text uses the glyph token
- **Location:** `components-v5.css:202` (`.field__msg--error`), `:162` (`.countdown--expired`), `:440` (`.text-area__count--over`); `css/screens/c-review.css:11`; `components.css:1574` (`.filter-pill--error`)
- **Evidence:** `--error` on `--neutral-50` is 4.54:1, passing by 0.04, against D-163's own `--error-ink` (5.81:1).
- **Fix:** switch the text uses to `var(--error-ink)` and keep `--error` for strokes and icons.

#### [P3-3] Fixed px line-heights do not track font size
- **Location:** 170 `line-height: Npx` declarations across `base.css`, `components*.css` and screens (6 unitless)
- **Evidence:** page zoom passes WCAG 1.4.4, and the 1.4.12 text-spacing override passes. But a 150 % type-token run crowds or clips text:
  - to-services: "You take home $22.50 · Taily fee $2.50" lines overlap
  - c-pay: the h1 wraps into the next line
  - t-home: the request card place line is clipped
  - `appt-row__name`, `thread-head__name`: clipped
- **Impact:** low on the web. It becomes a Dynamic Type blocker when this ports to native.
- **Fix:** move the `.t-*` classes in `base.css` to unitless ratios (`.t-body` 21/16 = 1.3125, `.t-small` 16/12 = 1.333, …) so they resolve to identical px at 1×, with zero baseline change.

#### [P3-4] Duplicate SVG ids
- **Location:** `js/icons.js:24` (`ICON_CAMERA` carries `id="icon-camera"`, `id="Vector"`, `id="Vector_2"`)
- **Evidence:** duplicated in all 28 c-job / to-profile / t-adjust states. Nothing references them today; they are Figma export leftovers.
- **Fix:** strip the `id` attributes from `ICON_CAMERA`. `TILE_MINUS` / `TILE_PLUS` in `icons.js:28-30` also carry `filter0_d_*` ids, but `components.js:227-228` shadows them, so delete those if they are dead.

#### [P3-5] Literal shadows and radii outside tokens
- **Location:** `components.css:206, 800, 1327, 1530`; `components-v5.css:770` (`rgba(…)` shadows); `components.css:1084` (`border-radius: 6px`); `base.css:188` (`1px`)
- **Evidence:** impeccable detector advisories
- **Fix:** add `--shadow-float: 0 6px 18px color-mix(in srgb, var(--ink) 8%, transparent)` and `--shadow-overlay: 0 16px 40px color-mix(in srgb, var(--ink) 18%, transparent)` to tokens.css and use them. This matches K-03's "one depth strategy", since only floating overlays lift. Map 6px to `--radius-sm` if the Figma value allows.

#### [P3-6] Wheel columns are 43 px wide at 320
- **Location:** c-book and t-suggest at 320 (`div.wheel__col--scroll` measured 43×132)
- **Fix:** `.wheel__col { min-width: 44px; }`. The day column takes the slack.

---

## Patterns and systemic issues

1. **Re-render without a focus contract.** Every in-place state change goes through `go(ID)`, which replaces `#screen`. Each screen re-invents its refocus: c-job (broken), c-ready (`u.refocus`, which misses async), t-rush (`focusTier`, on only), to-services / to-profile (`ui().focus`). A router-level restore (P1-2) retires all of them.
2. **Glyph tokens used as text.** P2-1, P2-2 and P3-2 are the same slip: `--neutral-500`, `--success` and `--error` used where D-163's `-ink` twins exist. A hygiene-lint rule could prevent it. Note: this would be a `scripts/` change, so it is for the orchestrator to decide. The rule would fail `color: var(--(neutral-500|success|error|warning|accent-base))` on any selector that sets `font-size` or carries text.
3. **The phone frame is literal.** `min-height: 844px`, absolute chrome and a fixed-position test pill all assume a 390×844 window. That holds in the harness but not on a real phone (P1-1, P2-4).
4. **Strokes as box-shadow.** This is correct for Figma parity, but it is the reason forced-colors loses every boundary (P2-5). One media block fixes it without touching the rule.

## Positive findings (keep these)

- **Navigation semantics:** `<nav aria-label="Primary">`, `aria-current="page"`, a per-screen `document.title` ("Pick a time · Taily"), a polite `#route-status` announcer, and focus moves to the new `h1` on navigation.
- **Structure across all 286 states:** exactly one `h1` and a `<main>`, no skipped heading levels, zero unnamed controls, zero unlabeled inputs, zero `img` without `alt`, zero dangling `aria-*` references, zero console errors.
- **Touch targets:** zero targets under 44×44 at 390 in all 286 states, with `data-hit="inline"` honored.
- **Overflow:** no horizontal page scroll at 320, 360, 375, 390, 768 or 1280.
- **Forms:** `aria-invalid`, `aria-describedby` and `role="alert"` errors placed next to the field; `autocomplete="one-time-code"`; `inputmode` used.
- **Sheets and modals:** `role="dialog" aria-modal`, a focus trap, Escape, and a lock while committing (verified by the Tab walk).
- **Scheduler wheel:** a real `listbox` with `aria-activedescendant`. ArrowDown advances (Thu → Sat), and a synthesized touch swipe settled on "Thu, Oct 22" without scrolling the page. The scroll handler is debounced at 80 ms with no layout thrash.
- **Motion:** `prefers-reduced-motion` gets intentional alternatives. Press-scale is dropped but the colour feedback stays, the spinner stops, and wheel scroll goes to `auto`. There is no blanket 0.01 ms kill.
- **Type and colour discipline:** no off-scale font size in any rendered state, and `-ink` text tokens exist for every hue.
- **Desktop framing:** at 768 and 1280 the phone column is centred, the sticky bar stays inside the stage, and nothing stretches.

## Recommended actions

1. **[P1] `/impeccable adapt`:** dock the Test-flows pill clear of the CTAs on ≤ 430 px (P1-1).
2. **[P1] `/impeccable harden`:** router-level focus restore on same-screen renders, fix the c-job stale `root`, make busy CTAs keep focus (P1-2).
3. **[P2] `/impeccable polish`:** wheel edge rows to `--neutral-500-ink` / `--neutral-600`, success banner to `--success-ink` (P2-1, P2-2).
4. **[P2] `/impeccable adapt`:** fix the thread-context, Need-by pill and Messages-row truncation; `100dvh` screen; sticky thread head; c-welcome fold (P2-3, P2-4).
5. **[P2] `/impeccable harden`:** `forced-colors` block (P2-5).
6. **[P2] `/impeccable optimize`:** render the boot screen first, idle-load the rest, lazy-load the flow menu, gallery and fixtures, add `modulepreload` (P2-6).
7. **[P3] `/impeccable polish`:** dim only the wheel while sending, `--error-ink` for error text, unitless line-heights, strip the SVG ids, shadow tokens, 44 px wheel columns (P3-1..6).
8. **`/impeccable polish`:** a final pass, then re-run `npm run check` and accept the listed baselines.

You can run these one at a time, all together, or in any order. Re-run `/impeccable audit` after the fixes to see the score move.

*No PRODUCT.md / DESIGN.md exists. This audit treated the code and K-01..K-03 as the design authority. `/impeccable init` and `/impeccable document` can capture them afterwards if wanted.*
