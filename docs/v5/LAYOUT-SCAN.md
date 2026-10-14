# v5 layout scan, mechanical pass (layout.md step 2)

Scan date 2026-10-14, branch `V5` at `c3d15e6` (K-08). This is a report only: no file under `js/`, `css/`, `index.html`,
`scripts/` or `ref/` was changed. The brief is the incumbent system: DESIGN.md, `css/tokens.css`, K-01..K-08 and the D-## log.
Each finding is marked **REAL** (a problem inside that system), **CHECK** (plausible, needs a call) or **FP** (false positive,
explained by a locked or defaulted decision).

## 0. What was run

| Pass | Command / method | Result |
|---|---|---|
| A1 | `impeccable detect --json --scope layout css js/screens js/components.js index.html` | `[]`, 0 findings |
| A2 | same, no `--scope` (all domains, files) | 5 findings, 3 outside `css/v4/`; none are layout (see §4) |
| A3 | `impeccable detect --json --viewport 390x844 <45 URLs ?screen=<id>&test=1>` (rendered, all domains) | 325 findings; 2 in the layout domain, both in the `sys-components` gallery |
| A4 | same as A3 with `--scope layout` | 2: `monotonous-spacing`, `nested-cards` (sys-components) |
| B1 | Playwright probe, all 286 `ref/v5` flow keys at **390x844, 375x667, 320x568**: page `scrollWidth`, elements past the `#screen` edge (outside scrollers), clipped text, open sheet / modal geometry vs the viewport, action-bar height | see §1 |
| B2 | Playwright probe, 286 flows at 390x844: flex/grid children that add a margin on top of the parent's `gap`; computed padding / margin / gap values off the 0/4/8/12/16/20/24/28/32/40 scale | see §2 |
| C | Source scan of every v5-loaded stylesheet (`base`, `components`, `components-v5`, `flow-menu`, `screens/*`) for literal px in spacing props, fixed sizes, `z-index`, sticky / fixed, overflow, `nowrap`, negative margins, `vh`, sibling-combinator margins, `safe-area`; inline `style=` in `js/` | see §2 and §3 |

The file-mode detector (A1) cannot resolve tokens or the cascade. The rendered probes (B1, B2) and the source scan (C) carry
the evidence below.

---

## 1. Overflow and container findings (rendered evidence)

### L-01 REAL (P1 at short viewports): bottom sheets have no max-height, so a tall sheet runs off the top of the viewport
- **Where:** `css/components.css:937` `.sheet { position: absolute; inset: auto 0 0 0; … }`: no `max-height`, no `overflow-y`. The
  holder is pinned to the visible viewport (`js/components.js:575-581`), and the page is frozen while the sheet is open.
- **Evidence (B1, 320x568):** `t-adjust--add-item` sheet h628 top −60; `c-addresses--error` h615 top −47; `c-addresses--add`
  h595 top −27. The grabber, title and Cancel are off-screen and can't be reached because page scroll is frozen. A screenshot
  confirms it: the "Add an item" sheet opens mid-list with no header. Close calls: `t-request--decline` (top 18), `c-pay--add-card`
  (top 70) and `c-booking--reschedule` (top 48). At 375x667 every sheet fits.
- **Why it matters:** a 390-wide phone in Safari with its toolbars and the keyboard up has well under 568 px. Sheets that hold
  inputs (address, card, decline reason) are the ones that grow.
- **Fix direction (inside the system):** `.sheet { max-height: calc(100% - var(--space-40)); }`, with the content region
  (`.sheet__body`) set to `overflow-y: auto` so the header and grabber stay put. This is a shared component change.

### L-02 REAL (P2): a nowrap chip wider than the column is clipped on BOTH edges (centred overflow)
- **Where:** `css/components.css:105` `.chip { white-space: nowrap }` with `css/screens/c-thread.css:10`
  `.c-thread__empty .chip-group__options { justify-content: center; }`.
- **Evidence (B1, 320x568, `c-thread--new`):** the chip "Can you take in a jacket at the shoulders?" measures left −7 / right 327
  on a 320 column. With centred justification the overflow splits to both sides, and `.screen { overflow: clip }`
  (`css/base.css:90`) cuts off the first and last glyphs without a scrollbar. It fits at 390. Any longer suggested question or
  longer localized string breaks it at 390 too.
- **Fix direction:** chips in a wrapping chip group should wrap their text (`white-space: normal; text-wrap: balance`) or take
  `max-width: 100%`. Alternatively, use `justify-content: safe center` on the options row.

### L-03 CHECK (P2): `.screen { overflow: clip }` hides horizontal overflow instead of surfacing it
- **Where:** `css/base.css:89-90`. This is intentional: the comment explains how it stops Chrome's focus-scroll panning.
- **Risk:** any overflow (L-02 is the live example) is silently cut off and never shows as a scrollbar or as `docX` in the harness.
  B1 found `document.scrollWidth` = viewport on all 858 flow×viewport runs, but that check can't see clipped content. Suggest a
  harness lint that flags elements whose rect crosses `#screen`'s edge (the B1 probe logic) so clipping can't hide a regression.

### L-04 REAL (P2): `viewport-fit=cover` with no safe-area insets anywhere
- **Where:** `index.html:5` sets `viewport-fit=cover`. `grep env(safe-area` finds 0 matches in v5 CSS.
- **Affected:** the sticky `.action-bar` (`css/components-v5.css:309-313`, bottom padding `--space-20`), the thread composers
  `.c-thread__foot` / `.t-thread__foot` (`css/screens/c-thread.css:11-13`, `t-thread.css:10-11`), and the fixed `.toast`
  (`css/components.css:1500`, `bottom: var(--space-24)`). On a notched iPhone the primary button sits partly over the home indicator.
  In landscape the 20 px gutters fall under the sensor housing.
- **Fix direction:** `padding-bottom: calc(var(--space-20) + env(safe-area-inset-bottom))` on the three bottom bars and
  `bottom: calc(var(--space-24) + env(safe-area-inset-bottom))` on the toast. Alternatively, drop `viewport-fit=cover`.

### L-05 CHECK (P3): overlay holder geometry is measured once
- **Where:** `js/components.js:575-581` (sheet) and `:634-640` (modal) set `position: fixed` plus top / height from
  `getBoundingClientRect()` and `innerHeight` at open time. Nothing listens for `resize` or `visualViewport`.
- **Risk:** rotating the device, or the iOS keyboard shrinking the visual viewport while a sheet with an input is open, leaves
  the holder at the old height. Combined with L-01, a focused field can end up under the keyboard.

### L-06 CHECK (P3): centred modals have no max-height
- **Where:** `css/components-v5.css:537` `.modal--leave` and `:810` `.modal--push` (`top: 50%; translate: 0 -50%`).
- **Evidence:** at 320x568 the push modal is 369 px tall and fits (top 99). A landscape phone (about 390 px tall) or 200 % text
  zoom pushes it past both edges with no scroll. A low-cost guard is `max-height: calc(100% - var(--space-40)); overflow-y: auto`.

### L-07 CHECK (P3): `.stage` uses `100vh` but `.screen` uses `100dvh`
- **Where:** `css/base.css:67` (`.stage { min-height: 100vh }`) vs `:81-82` (`.screen { min-height: 100dvh }`).
- **Risk:** on mobile Safari `100vh` is the large viewport, so the document is always about one toolbar height taller than the
  screen. Short screens scroll a little for no reason, and a strip of body ground shows below `.screen`. The ground is the same
  `--neutral-50`, so it isn't visible, but the extra scroll is real. Use `100dvh` on `.stage` too, with `100vh` as the fallback.

### L-08 FP: `sys-components` overflows at 320
- B1 flags the gallery's chrome demos (status bar, top nav, flow bar, ob bar) at 390 wide inside a 320 column (R+70). The gallery
  is a dev page that draws the chrome at design width. No product screen overflows at 320, 375 or 390.

---

## 2. Spacing and rhythm findings

### S-01 REAL (P2): an undeclared "24 / 16" step sits between the rhythm tokens, which the Space-Is-The-Separator rule forbids
- DESIGN.md (Layout, Named Rules): *"A screen stylesheet may not invent another vertical gap between groups."* The four rhythm
  tokens are 8 / 12 / 32 / 40.
- **Evidence (C, counts over `css/screens/*` + `components-v5.css`):** `margin…: var(--space-24)` **39×** and `var(--space-16)` **39×**,
  vs `--rhythm-section` 44×, `--rhythm-group` 16×, `--rhythm-tight` 13×, `--rhythm-major` 8×. 58 rules are a plain
  `margin-top: var(--space-24|16)`. Examples:
  - onboarding title under the stepper, the same rule copied into 5 files: `to-availability.css:4`, `to-profile.css:4`,
    `to-returns.css:4`, `to-where.css:4`, `to-payouts.css:3` (`.stepper + … { margin-top: var(--space-24) }`)
  - empty / loading blocks: `t-earnings.css:26-27`, `t-job.css:14`, `t-adjust.css:42`, `t-payout.css:11`
  - alerts / banners under the heading: `t-earnings.css:3`, `t-job.css:4`, `t-payout.css:4` (16)
  - `t-adjust.css:4-5` (content 24, info 24), `t-job.css:23,25-26` (delta 24, quote 16 / 24), `c-tailor.css:15` (banner 24)
- **Reading:** either 24 is a real fifth rhythm role ("block under the heading": banner, stepper → title, empty state), and it
  should be named in `tokens.css` + DESIGN.md (e.g. `--rhythm-block`), or the uses should snap to 12 / 32. Today each screen picks.
  The 5-file stepper→title copy should be one shared rule (`.stepper + .heading-row` / `.ob-title`) owned by the Integrator.

### S-02 REAL (P3): a child margin stacked on the parent's `gap` builds ad-hoc composite intervals
- B2 found flex/grid children that add a margin to the parent's gap. The resulting sums (12+12=24, 8+12=20, 8+8=16, 8+4=12,
  16+8=24) are rhythm values that no token names, set per screen:

| Parent gap → child margin | Flows | Source |
|---|---|---|
| `.sec` 8 → `div` +12 (= 20) | 20 (t-adjust) | `t-adjust.css:40` `.t-adjust__breakdown { margin-top: var(--rhythm-group) }` |
| `.sec` 8 → `p` +8 (= 16) | 18 (t-job) | `t-job.css:13` `.t-job__fine`, `t-payout.css:10` |
| `.empty-state` 12 → actions +12 (= 24) | 17 | `components-v5.css:382` `.empty-state__actions { margin-top: var(--space-12) }` |
| `.sec__body` 8 → `.c-tailor__rush` +12 | 7 | `c-tailor.css:32` |
| `.sec` 8 → policy / note +4 (= 12) | 13 | `c-booking.css:6`, `c-request.css:7`, `to-payouts.css:16` |
| `.sec` 8 → courier +8, receipt card +12, stitch +8 | 7 | `c-ready.css:16`, `components-v5.css:818`, `.stitch` `components-v5.css:949` |
| `.sec--first` 4 → `p` +12 | 1 | `c-request.css:18` |
| `.sheet` 16 → `.job-photo__cancel` +12 | 1 | `c-job.css:42` |
| `.c-cards-sheet` 12 → links +4 / actions +8 | 2 | `c-cards.css:14` and the stack rule |
| `.to-services__preview-body` 8 → more +8 | 2 | `to-services.css:14` |

- **Negative margins that cancel a gap**, which is the misuse layout.md warns about: the child fights its container's rhythm.
  - `c-job.css:32` `.job-item > .field__msg { margin-top: calc(-1 * var(--space-4)) }` (gap 12 → 8)
  - `c-ready.css:22` `.c-ready-sheet__group { margin-top: calc(-1 * var(--space-8)) }` (gap 16 → 8)
  - `t-thread.css:5` `.t-thread__note { margin-top: calc(-1 * var(--space-4)) }` (`.body` gap 12 → 8, 7 flows)
  - `to-where.css:12` `.to-where__pickup-note { margin: calc(-1 * var(--space-4)) 0 0 }`
  - `components-v5.css:500` `.zip-list--error .zip-list__chips { margin: calc(-1 * var(--space-8)) }`
- **Fix direction:** nest the tighter pair in its own sub-group with the smaller gap (field + message, heading + note) and drop
  the negative margin. For the additive cases, use a sub-group or the matching rhythm token on the parent.

### S-03 CHECK (P3): screens re-declare `.sec`'s top margin through sibling combinators
- `components-v5.css:38` already gives `.sec` 32 and the "after the heading / first" case 40. Five screens patch it again:
  `c-tailor.css:18` (four selectors), `t-earnings.css:6`, `t-home.css:4`, `t-request.css:8` (`hero + .sec` → major) and
  `t-earnings.css:21` / `to-profile.css:11` (`group + group` → group). The values are rhythm tokens, so this is legal, but the
  "hero → first section = major" rule appears three times in three screens. It could be one shared `.hero + .sec` rule.

### S-04 REAL (P3): a 2 px micro-step is used everywhere but isn't on the scale
- 37 source declarations use a literal `2px` (`gap: 2px` on the label/caption stacks: `components-v5.css:132,142,230,250,259,326,339,408,411,521,570,580,590,724-725,735,738,797,980,1008,1009,1042`,
  `flow-menu.css:167`, `c-tailor.css:5`, `c-where.css:14`, `sys-index.css:18`; `padding: 2px var(--space-8)` on tags:
  `components-v5.css:664`, `c-addresses.css:11`, `c-cards.css:6`, `t-earnings.css:31`; `margin-top: 2px`:
  `t-request.css:24`, `t-shop.css:7`, `components-v5.css:874`; `padding-top: 2px` glyph nudges `:968,978`).
- B2: `2px` is the most common off-scale computed value (in 119 flows on `.money-row__text`).
- It is consistent (name → caption is always 2), so it reads as a deliberate micro-step. It should be `--space-2` in `tokens.css`
  and DESIGN.md's scale ("4 px base") rather than 37 literals. The hygiene step does not catch it because it checks colour and
  font-size only.

### S-05 REAL (P3): other literal offsets in v5 rules
| file:line | value | note |
|---|---|---|
| `components-v5.css:642` | `.heading-row__trail { margin: -5px … -5px auto }` | optical centring of a 44 px ••• on a 34 px title line; magic −5 |
| `components-v5.css:84` | `.sheet__cancel { margin-left: -12px }` | should be `calc(-1 * var(--space-12))` like its siblings |
| `components-v5.css:91` | `.back::after { inset: … -11px }` | hit-area expansion, odd 11 |
| `components-v5.css:192` | `.chat-msg__retry { padding-block: 12px; margin-block: -12px }` | literal instead of `--space-12` |
| `components-v5.css:543` | `.toast__action { margin: -14px 0 }` | off-grid, pairs with the toast's 10 px padding |
| `components-v5.css:600` | `.appt-row__garment { margin-block: -4px }` | literal instead of `--space-4` |
| `components.css:1509` | `.toast { padding: 10px var(--space-16) }` | off-grid, kept from v4 and commented "off-grid" |
| `components.css:1306-7` | `.modal { left: 32px; right: 32px }` | v5 modals override with `--space-20`; the base literal is dead for v5 variants |
| `c-tailor.css:37` | `padding-left: calc(var(--space-8) + 20px)` | hangs text under the glyph; the 20 is the glyph box (`components-v5.css:376` `flex: 0 0 20px`), so this is a coupling without a token |
| `to-done.css:9` | `padding-top: 3px` | optical nudge to the 28 px number disc |
| `c-review.css:18` | `top/right: -22px` | half of the 44 hit box, fine as `calc(-1 * 44px / 2)` but literal |
| `components-v5.css:66` | `.top-nav__dot { top: -2px; right: -3px }` | badge offset, acceptable |

### S-06 REAL (P3): chrome geometry (44 / 100 / 390) is repeated as literals
- The status bar's 44 appears as `inset: 44px …` in `base.css:137`, `components-v5.css:452` (ob-bar) and `:952` (flow-bar),
  and as `calc(44px + …)` padding-top in `c-welcome.css:4,34`, `to-done.css:2` and `sys-index.css:4`.
  `--chrome-h: calc(var(--space-40) * 2 + var(--space-20))` (`components-v5.css:785`) spells out 100 indirectly. `--body-top: 116px`
  (`tokens.css:148`) is the third copy of the same geometry.
- `max-width: 390px` is re-declared on 10 children of the already-capped `.stage` / `.screen`: `base.css:66,80,102,139`,
  `components-v5.css:311,452,786,952`, `c-thread.css:12`, `t-thread.css:11`.
- **Consequence:** in standalone mode `.status-bar` is `display: none` (`base.css:130`) but every 44 px offset stays, leaving a
  blank band. Suggest `--status-h: 44px`, `--nav-h: 56px` and `--column: 390px` in `tokens.css`, with `--body-top` and
  `--chrome-h` derived from them.

### S-07 CHECK (P3): fixed text measures in px
- `components-v5.css:187` `.chat-msg__meta { max-width: 262px }`, `:190` `.chat-msg__note { max-width: 260px }`,
  `:369` `.empty-state__title/__body { max-width: 320px }`, `:476` `.service-row__price { width: 96px }`,
  `:507` `.day-hours__time { min-width: 110px }`, `t-adjust.css:11` grid `minmax(0,1fr) 96px 52px` (has a 340 px query at `:48`).
  None break at 320 (B1). The two chat caps (262 vs 260) are inconsistent with each other and should be one `%` or `ch` measure
  tied to the bubble's max-width.

---

## 3. Sticky and stacking

### Z-01 REAL (P3): the z-index values are an unnamed ad-hoc ladder
All v5-loaded `z-index` values:

| z | element | file:line |
|---|---|---|
| 1 | `.c-welcome__legal .c-welcome__link`, `.flow-menu__heading` | `c-welcome.css:31`, `flow-menu.css:143` |
| 2 | `.status-bar`, `.top-nav`, `.ob-bar`, `.flow-bar`, `.sys-banner` | `base.css:104,141`, `components-v5.css:452,952,786` |
| 3 | `.sheet-scrim`, `.modal-scrim`, `.modal`, `.review-sheet`, `.trust-card--popup`, `.scheduler-popup` | `components.css:935,1302,1305,1423,604,1655` |
| 4 | `.sheet`, `.heading-row--sticky` | `components.css:940`, `components-v5.css:644` |
| 5 | `.action-bar`, `.c-thread__foot`, `.t-thread__foot`, `.selector__menu` | `components-v5.css:309`, `c-thread.css:12`, `t-thread.css:11`, `components.css:783` |
| 9 | `.push-banner` | `components-v5.css:793` |
| 10 | `.screen-sheet--overlay` (sheet + modal holder) | `components-v5.css:423` |
| 20 | `.stage-caption` (dev chrome) | `flow-menu.css:15` |
| 30 | `.toast` (fixed) | `components.css:1505` |

- **No live collision found.** Sheets and modals sit at 3/4 *inside* the z10 fixed holder, which is its own stacking context, so
  they beat the z5 action bar. `heading-row--sticky` (4) sits under the push banner (9) and over the sys-banner (2), as intended.
- **Latent:** the raw `.sheet` (z4) and `.modal` (z3) rank *below* `.action-bar` (z5). If either is ever mounted outside the
  overlay holder (the `sys-components` `.sheet-demo` does this), the action bar paints over it. Out-of-context use
  (`.trust-card--popup`, `.selector__menu`, `.scheduler-popup`) is v4 carry-over with no v5 caller.
- **Fix direction:** `--z-chrome 2 / --z-sticky 5 / --z-banner 9 / --z-overlay 10 / --z-toast 30` in `tokens.css`, and give
  `.sheet`/`.modal` values relative to their holder.

### Z-02 CHECK (P3): the thread composer bar doesn't follow K-07's bottom-bar treatment
- `c-thread.css:11-14` / `t-thread.css:10-11`: sticky bottom, **white** ground with a **permanent** `inset 0 1px 0 var(--neutral-200)`
  hairline. K-07 / K-08 make the sticky bottom button bar `--neutral-50`, with the hairline only while content continues
  (`#screen[data-more]`). K-07 names the action bar specifically, so the composer may be deliberately different (an input
  surface). That needs a director call: follow K-07 or log the exception as a D-##.

### Z-03 FP: sticky works under `overflow: clip`
- `.screen { overflow: clip }` does not create a scroll container, so `position: sticky` on `.action-bar`,
  `.heading-row--sticky`, the thread foots and `.job-svc__cta` (inside its own `overflow-y: auto` list, `c-job.css:39-40`) all
  resolve against the document scroll. This is correct.

### Z-04 FP: chrome scrolls away (K-08)
- `.status-bar` / `.top-nav` / `.flow-bar` / `.ob-bar` are `position: absolute`, not sticky. That is K-08's locked "NOT pinned",
  not a missing sticky header. `heading-row--sticky` pinning at `top: 0` on the thread screens (AU-P2-4) is consistent with it.

---

## 4. Detector findings and their classification

| Rule (detector) | Where | Verdict |
|---|---|---|
| `monotonous-spacing` "~4px used 28/31 times" | `sys-components` (gallery) | **FP**: gallery spec labels, not a product screen |
| `nested-cards` `.change-list__garment--new > .garment-docs > figure.garment-docs__comment` | gallery; also renders on `c-price-change--item-added`, `t-adjust--item-added` | **CHECK (P3)**: accent "new item" panel (`components-v5.css:674`) holds a white ringed comment panel (`:885,896`, K2-1-01). Two containers deep. D-193 keeps white + ring for *interactive* groups, and the comment is reference content. Consider a flat quote (left stitch / indent) inside the panel. |
| `cream-palette` (rgb 247,244,239 / 239,234,226) | every screen, `index.html` | **FP**: `--neutral-50` linen is the locked identity (DESIGN.md, K-07/K-08) |
| `repeating-stripes-gradient` | 12 screens | **FP**: the `.stitch` dash (`components-v5.css:949`), "signature 2" in `tokens.css` |
| `kicker-above-heading` "At the fitting" / "For tailors" | `t-adjust`, `t-phone` | **FP for layout**: copy decided in D-123 (t-adjust) and onboarding. Typography domain, not structure |
| `repeated-container-text` "Amara Reyes" ×3 | gallery `thread-list` demo | **FP**: three demo rows of the same fixture |
| `undersized-ui-text` 10 px | `c-account` version stamp, `c-cards__tag` / `c-addresses__tag` "Default", gallery labels | **Type domain, out of scope**. `t-micro` 10 is on the locked Figma scale. Hand to typography / polish |
| `low-contrast` #aba294 on #f7f4ef ×128 | gallery `.vname` labels only | **FP for product** (dev gallery) |
| `low-contrast` placeholder "••••••" 1.8:1 | `c-code`, `t-code`, gallery | **Colour domain, out of scope**: placeholder ink `--neutral-300`-ish on white. Hand to a11y |
| `design-system-radius` 1px | `base.css:185` (active-tab stitch) | **FP**: a 2 px-tall stitch bar, not a shape radius |
| `em-dash-overuse` | `sys-index` | **FP**: dev index |

B2 off-scale computed values that are **FP**: `padding-top 116` (`--body-top`, D-204), `padding-bottom 126/150/174/202`
(`--bar-h` + 24, measured by the router), `.sr-only` −1 px, `.garment-tile__ctl` 6 px (resolved `margin-top: auto`), and
`margin-left` 118/299 (resolved `auto` pushes).

---

## 5. Documentation drift found while scanning

- **D-01 REAL:** DESIGN.md's Layout section still says the status bar is "(white)" and the nav is "(white, inside 1 px bottom rule)".
  K-07 / K-08 made both `--neutral-50` with no rule.
- **D-02 REAL:** CLAUDE.md says "`.body` padding-top 128". D-204 / `--body-top` made it 116 (DESIGN.md is already correct).
- **D-03:** DESIGN.md's spacing scale lists no 2 px step (S-04) and no fifth rhythm role (S-01).

---

## 6. Ranked list for the synthesis step

| # | id | sev | one line |
|---|---|---|---|
| 1 | L-01 | P1 | Sheets have no max-height: 3 sheets lose their header at 320x568 (`components.css:937`) |
| 2 | L-04 | P2 | `viewport-fit=cover` with zero safe-area insets: the action bar / composer / toast sit on the home indicator |
| 3 | L-02 | P2 | Nowrap chip centred in a wrapping group clips both edges at 320 (`components.css:105`, `c-thread.css:10`) |
| 4 | S-01 | P2 | 78 screen-level `space-24/16` margins form an unnamed fifth rhythm, against the Space-Is-The-Separator rule |
| 5 | L-03 | P2 | `overflow: clip` hides overflow from the harness; add an edge-crossing lint |
| 6 | S-02 | P3 | Gap + child margin composites and 5 negative margins that cancel a gap |
| 7 | Z-01 | P3 | Unnamed z ladder; raw `.sheet`/`.modal` rank below `.action-bar` outside the holder |
| 8 | S-06 | P3 | 44 / 100 / 390 chrome geometry repeated as literals; standalone leaves a 44 px blank band |
| 9 | S-04 | P3 | 37 literal `2px` micro-steps: tokenise as `--space-2` |
| 10 | L-05/L-06/L-07 | P3 | Overlay measured once; modals uncapped; `.stage` 100vh vs `.screen` 100dvh |
| 11 | Z-02 | P3 | Thread composer bar: white + permanent hairline vs K-07 bottom-bar treatment (needs a call) |
| 12 | S-03/S-05/S-07 | P3 | Repeated `.sec` overrides, stray literal offsets, fixed px text measures |
| 13 | nested-cards | P3 | Comment panel inside the new-item panel |
| 14 | D-01/D-02 | doc | DESIGN.md chrome (white / rule) and CLAUDE.md 128 are stale |
