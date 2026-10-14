# Taily v5 layout plan (impeccable `layout`, synthesis)

Oct 14 2026 · branch `V5` @ `c3d15e6` (K-08) · **proposals only**. No file under `js/`, `css/`, `index.html`, `scripts/`
or `ref/` was edited. Inputs: `docs/v5/LAYOUT-ASSESSMENT.md` (rendered pass, ids `L#`), `docs/v5/LAYOUT-SCAN.md`
(mechanical pass, ids `L-##`, `S-##`, `Z-##`, `D-0#`), the boards in `.shots/layout/`, and source read in ranges.

Visitor mode: **Operate**. The incumbent system is the brief: DESIGN.md (The Tailor's Counter; Space-Is-The-Separator,
Squint, Tissue-Under-A-Finger), `css/tokens.css`, K-01..K-08 and the D-## log. Nothing here changes identity: no new
colour, type size, radius, shadow, component or signature. Every change is structure, spacing role or adaptation.

**Synthesis in one line.** At the design width the structure is right and both passes agree on that. What fails is
*adaptation*: the 390 frame is treated as a fixed canvas, so overlays, the sticky bar and fixed-width rows break once the
viewport is shorter (320×568, landscape, keyboard up) or narrower (200 % zoom = 195 CSS px), and unbreakable runs hide
money. The second problem is *rhythm naming*: a fifth gap (24) is in heavy use but undeclared, so each screen picks its own
heading-to-content distance.

Where the two passes disagree, this plan resolves it:

| topic | assessment | scan | resolution |
|---|---|---|---|
| sheet overflow | P1 at 200 % zoom | P1 at 320×568 (3 sheets lose their header) | **P1.** It fails at a real phone size, not only under zoom. |
| safe areas | P1 | P2 | **P1.** Installed-PWA users see the CTA over the home indicator. The fix is cheap. |
| c-job service task below the fold | P2 | n/a | **P2**, re-scoped. Source check: tapping a tile only adds a card (`c-job.js:151-161`); it does not open the services sheet. The per-garment task really is hidden until the user presses Next and gets an error. |
| 24 / 16 gaps | "entry interval varies" (L9) | "undeclared fifth rhythm" (S-01) | Same problem seen from two sides. One fix (P2-1). |
| `overflow: clip` on `.screen` | n/a | CHECK | Keep it (it stops Chrome's focus-scroll panning). Add the edge-crossing lint so clipping can't hide regressions (P2-5). |

---

## 1. Spatial thesis

### 1.1 The model (all families)

One linear column. Reading order and DOM order are the same top to bottom:

`chrome (status bar 44 + nav/flow/ob bar 56, scrolls away, K-08) → heading block → focal fact → groups → page actions → sticky action bar`

- **Leads:** the serif title, then exactly one focal fact (a countdown, a figure, a date, or the picker).
- **Supports:** caps-labelled groups. White cards (tissue + ring) mean interactive; flat on linen means reference.
- **Closes:** one ink button. It goes in the sticky bar when the screen is a step or decision, otherwise in `.page-actions`.

The simplest structure that expresses this is a vertical stack whose gaps are named roles. Grids appear only where the
content itself is a grid: garment tiles, the appointment-row columns, money label/amount pairs.

### 1.2 Spacing roles (the rhythm, exact tokens)

Today there are four rhythm tokens plus about 78 unnamed `--space-24` / `--space-16` margins. Proposed ladder:

| role | token | value | use |
|---|---|---|---|
| micro | **`--space-2` (new)** | 2 | name → caption inside one label stack (already used 37× as a literal, S-04) |
| tight | `--rhythm-tight` | 8 | label → value, row → row inside a group, status line → title, title → notes |
| group | `--rhythm-group` | 12 | section head → first row; stacked controls; **stepper → title (new rule)**; field → its message stays at 8 by nesting, not by negative margin |
| block | **`--rhythm-block` (new, = `--space-24`)** | 24 | heading block → an **unlabelled** first block (a list card with no caps head, a form card, an empty state, a banner/alert); sub-block → sub-block inside one section (e.g. Prices → Rush fees) |
| section | `--rhythm-section` | 32 | between labelled sections |
| major | `--rhythm-major` | 40 | heading block → first **labelled** section; last section → `.page-actions` |

The heading-to-first-block rule becomes one sentence: **40 if what follows carries a caps label, 24 if it doesn't.** A caps
label already makes its own pause, so the air before it is larger; an unlabelled block is the direct answer to the title,
so it sits closer. Under this ladder `--space-16` stops being a vertical *between-group* value. It stays legal for
padding, inline gaps and the 16 under the nav (`--body-top`).

Cadence target on long pages: the decision block is tight inside (8/12) and sits 40 from the reference block; the
reference sections are 32 apart; sub-blocks inside one reference section are 24 apart. The aim is three speeds, not one
32 repeated six times (L10).

### 1.3 Per family: task path, grouping, lead vs support, density

| family | primary task path | must stay together | must separate | leads → supports | density |
|---|---|---|---|---|---|
| **A Entry & sign-in** | promise → phone → code → name | field + its error (8) | legal / alternates from the primary CTA (section) | title → field → ink CTA → white alternates | sparse; one question per screen |
| **B Booking flow** (c-job → c-where → c-tailors → c-tailor → c-book → c-pay) | garment → **services for that garment** → where/when → tailor → time → pay | each garment + its services + photos (one card); the estimate + its total + the stitch; the CTA + the money it commits | the decision (estimate, pay-with) from reference (price list, rush ladder, reviews) | step title → the picker/form/tailor card → bar CTA carrying money | medium; one step at a time; the bar holds at most one lead line + CTA |
| **C Status / detail** (both personas) | read status → read focal fact → act (one CTA) | status line + title + notes (8/8); each money table with its total; each garment with services and photo stack | hero (40) from groups; decision groups (white) from reference (flat) | status + serif title → countdown / figure / date → timeline, order, price → page actions | the strongest family; keep the skeleton `8 → 8 → 40 → 32… → 40` |
| **D Lists & homes** | scan → open one row | the rows of one group (hairlines) | groups by time (Upcoming / Past), 32 apart | page title → first group → rest; t-home's request card outranks upcoming rows | sparse; a glance surface |
| **E Forms & editors** (to-*, t-shop, t-rush, t-suggest, t-adjust, c-review, account) | answer the card's question → save | one card per question; field + message | the "what customers see" reference from the editable card | step title → white card(s) → reference block → bar CTA | dense only where the task is (t-adjust, to-services) |
| **F Threads** | read → reply | context card + privacy note (one head block) | head block from the message list (24, both personas) | other party → bubbles → composer | conversation density |
| **G Overlays** | read title → choose → confirm/dismiss | header (grabber, ✕, title, ✓) always visible | the sheet from the page (scrim) | title → options → one strong action | must fit the *visible* viewport, scrolling inside |

### 1.4 Adaptation rules (how the structure changes)

The 390 baselines are the contract. Every rule below is written to produce **zero pixel diff on the existing 390 / 320
baselines** unless the item says otherwise.

1. **Width tiers.** The design width is 390. 320–430 is the supported phone range and must render the baseline structure.
   **≤ 300 CSS px is the "zoom tier"** (200 % zoom on any phone, split view), where fixed rows may compress or reflow.
   Use `@media (max-width: 300px)`, **not** container queries: `container-type` on `.screen` would establish layout
   containment and become the containing block for the `position: fixed` overlay holder and toast
   (`js/components.js:575-581`, `css/components.css:1500`).
2. **Shrink, don't overflow.** A row of fixed 44 px controls declares its columns as `minmax(0, 44px)` / `flex: 0 1 44px`
   with a 32 px floor, so it only compresses in the zoom tier. At 200 % zoom a 32 CSS px target is 64 px at 100 %, so
   physical touch size is still above 44 pt. The 44 px lint (which runs at 390) keeps passing.
3. **Overlays fit the visible viewport.** Sheets and modals cap at the visual viewport minus `--rhythm-major`, scroll
   inside, and keep their header pinned. The holder follows `visualViewport` resize (rotation, keyboard).
4. **The sticky bar yields.** If the bar is taller than a quarter of the viewport, it stops being sticky and flows at the
   end of the page. DOM order already puts it last, so reading order holds.
5. **`nowrap` binds atoms, never runs.** Keep amounts, dates and times unbroken (`.nb` on the atom). Never keep a run that
   contains a person's name, a shop name or a street unbroken.
6. **Line-heights are ratios.** Component line-heights become unitless so text scaling cannot overlap lines (types already
   are, K-04).
7. **Insets are real.** Bottom-pinned and top-offset elements add `env(safe-area-inset-*)`.
8. **Wider than 390.** The column stays 390 (identity). Between 391 and 599 px the ground stays linen, so a large phone
   shows no tinted bars. The desktop backdrop starts at 600.

---

## 2. Ranked fix list

Effort: **S** = one rule or one file, **M** = a shared component plus a few screens, **L** = many screens plus baseline
accepts. "Kevin" names the K/D decision touched. A DEFAULTED amendment gets logged as the next D-##; a K-## conflict
needs Kevin. Owner: shared files (`components*.css/js`, `base.css`, `tokens.css`, `app.js`) belong to the **Integrator**
per CLAUDE.md, and screen files belong to builders.

### P1: things a real user can't reach or can't see

#### P1-1 · Overlays fit the visible viewport · M
- **Screens:** every sheet. Measured failures at 320×568: `t-adjust--add-item` (top −60), `c-addresses--error` (−47),
  `c-addresses--add` (−27); near misses `t-request--decline` (18), `c-booking--reschedule` (48). At 200 %:
  `c-booking--cancel` (−101), `c-job--services` (−55). Modals `.modal--leave` / `.modal--push` have no cap (landscape).
- **Problem:** `.sheet` (`css/components.css:937`) is `position:absolute; inset:auto 0 0 0` with no `max-height` or
  overflow. Page scroll is frozen while it is open, so the grabber, ✕ and title are unreachable (L2, L-01, L-06). The
  holder geometry is measured once at open (`js/components.js:575-581`, `:634-640`; L-05).
- **Change:**
  - `css/components.css` `.sheet`: add `max-height: calc(100% - var(--rhythm-major)); overflow-y: auto;
    overscroll-behavior: contain;`. Make `.sheet__grabber-row` + `.sheet__header` `position: sticky; top: 0;
    background: var(--neutral-50); z-index: 1` (the header is already the first child, so no markup change is needed).
  - `css/components-v5.css` `.modal--leave`, `.modal--push`: `max-height: calc(100% - var(--rhythm-major)); overflow-y: auto;`.
  - `js/components.js`: the overlay holder re-measures on `visualViewport` `resize` (and `window` `resize`), and drops
    the listener on close.
- **Verify:** re-run the B1 probe at 320×568 and 195×422. Every sheet's `top >= 0`. No baseline diff expected at 390.
- **Kevin:** none (DESIGN.md "Sheet" anatomy unchanged).

#### P1-2 · Fixed rows compress in the zoom tier · M
- **Screens:** every tabbed screen (top nav), c-review / c-complete (stars), c-book / t-suggest (wheel), to-availability /
  t-shop (day hours), t-adjust (service row), to-where (zip chips), c-tailor / t-rush (rush tiers). 91 of 112 states have
  off-screen elements at 200 % (`z200-a.png`, `z200-b.png`).
- **Problem:** fixed-width inline rows overflow a clipping `.screen`, so controls become **unreachable**: Account /
  Earnings in the nav (right edge 236 > 195), the 5th star (230–250), AM/PM (172–216), closing-time buttons (177–287),
  Remove × on t-adjust rows (148–200). Overlaps also appear: the t-home request-card name collides with `2h left`, the
  photo stack covers the garment name, and the thread row collapses (L1, L4).
- **Change** (one `@media (max-width: 300px)` block per owning file):
  - `css/base.css` nav: `.top-nav { padding-inline: var(--space-12) } .top-nav__links { gap: 0; min-width: 0 }
    .top-nav__link, .top-nav__back { flex: 0 1 44px; min-width: 32px; width: auto }`. Back + 4 icons = 5 × 32 = 160 ≤ 171.
  - `css/components-v5.css` `.stars--input`: `display: grid; grid-template-columns: repeat(5, minmax(32px, 44px))`
    (safe at every width; compresses only under 220 px), and the rating card padding goes to `--space-12` in the tier.
  - `css/components.css:1014` `.wheel__col`: `min-width: 32px` in the tier; the date column becomes `minmax(0, 1fr)` with
    ellipsis.
  - `.day-hours__times`: `flex-wrap: wrap`, `.day-hours__time { min-width: 0; flex: 1 1 96px }` in the tier.
  - `css/screens/t-adjust.css:11` `.t-adjust__row` in the tier: `grid-template-columns: minmax(0, 1fr) 52px`, label on
    its own row (`grid-column: 1 / -1`), then input + remove. This extends the existing `≤ 340` query at `:48`.
  - Rush tiers and zip chips: allow the label to wrap and keep only the amount `nowrap`.
  - Overlaps: `.request-card` name row and `.garment-head` get `flex-wrap: wrap` in the tier, so the countdown and photo
    stack drop under the name rather than over it.
- **Verify:** z200 pass; `metrics-*.json → z200.clipped` = 0 for interactive elements. Zero diff at 320 / 390.
- **Kevin:** none. D-187 (nav icons) and K-06 (Back in the nav) are kept; only the gaps compress.

#### P1-3 · Money and addresses never clip · S
- **Screens:** t-adjust (bar lead), c-ready / c-ready--courier (return options), c-thread--new (suggested chips).
- **Problem:** `.t-adjust__lead-pair { white-space: nowrap }` (`css/screens/t-adjust.css:68`) pushes
  "You take home $147.50" past the 320 edge with a long first name, so **rendered money disappears** (L5). The c-ready return
  option wraps shop + street in `.nb` (`js/screens/c-ready.js:72`) and runs under the radio **with seed data** at 320
  (`fold320.png`; L7). A centred `nowrap` chip clips both edges at 320 (`components.css:105` + `c-thread.css:10`; L-02).
- **Change:**
  - t-adjust: drop `nowrap` from the pair. Wrap the name in a breakable span and keep only the label+amount atom unbroken:
    `<span class="nb">pays $160.00</span>`, `<span class="nb">You take home $147.50</span>`. The lead keeps
    `flex-wrap: wrap` (already two lines at 390 when needed).
  - c-ready.js:72: `.nb` only on the date/time; the place run gets `overflow-wrap: anywhere` and the option text column
    `min-width: 0`.
  - c-thread: `.c-thread__empty .chip-group__options { justify-content: safe center }`, and `.chip` in a wrapping group gets
    `white-space: normal; text-wrap: balance; max-width: 100%`.
- **Verify:** the `long` probe at 320. Visual accept for `c-ready*` at 320 only (the 390 baseline is unchanged).
- **Kevin:** **amends D-126** ("each pair stays unbroken" becomes "each amount stays with its label"). Log as D-##.

#### P1-4 · Safe areas · S
- **Screens:** every screen with an action bar, the thread composers, the toast, standalone (installed) mode.
- **Problem:** `index.html:5` sets `viewport-fit=cover`, but no stylesheet reads `env(safe-area-inset-*)`. On a notched
  iPhone the CTA sits on the home indicator. In standalone mode `.status-bar` is hidden (`base.css:130`) but every 44 px
  offset stays (L6, L-04, S-06).
- **Change:**
  - `css/tokens.css`: `--safe-top: env(safe-area-inset-top, 0px); --safe-bottom: env(safe-area-inset-bottom, 0px)`.
  - `.action-bar`, `.c-thread__foot`, `.t-thread__foot`, `.sheet`: `padding-bottom: calc(var(--space-20) + var(--safe-bottom))`.
    The sheet keeps its 32: `calc(var(--space-32) + var(--safe-bottom))`.
  - `.toast`: `bottom: calc(var(--space-24) + var(--safe-bottom))`.
  - `@media (display-mode: standalone)`: the nav's top offset becomes `var(--safe-top)` instead of 44, and `--body-top`
    becomes `calc(var(--safe-top) + 56px + var(--space-16))`, which needs the P3-4 chrome tokens.
  - Keep `viewport-fit=cover`. It is right for the installed web app (K-06: web app first).
- **Verify:** both insets are 0 in the harness, so no baseline diff. One manual check on an iOS simulator in standalone.
- **Kevin:** none.

#### P1-5 · The sticky bar yields on short viewports · M
- **Screens:** worst cases c-price-change, c-ready, t-job--fitting, t-request, t-adjust. Bar height at 320: 86–162 px
  (15–29 %). At 200 %: up to **206 / 422 (49 %)**, leaving about 3 lines of content on t-request (L3, `z200-b.png`).
  At 320 only 2 of 3 return options on c-ready sit above the bar.
- **Problem:** the bar never gives up height, and its content has no cap: lead + CTA + link pair + note all stack.
- **Change, in two parts:**
  1. **Content cap (structure).** A bar holds at most: one lead line, the CTA, and one row of links *or* one gating note.
     A note that does not explain why the CTA is disabled moves into the page, as the last line of `.page-actions` or
     under the section it qualifies. Candidates to audit: `c-price-change` (lead + CTA + link + note), `c-ready`
     (D-215 lead stays, because it gates Pay), `t-job--fitting`. This is a screen-file change per screen (builders).
  2. **Release (adaptation).** In `js/app.js`, the `--bar-h` measurement (`:325-326`) also sets `#screen[data-bar-tall]`
     when `bar.offsetHeight > innerHeight * 0.25` (on resize and `visualViewport` resize too, and skipped under
     `html.is-test` the same way `wireScrollEdges` is). In CSS (`components-v5.css:307-313`),
     `#screen[data-bar-tall] .action-bar { position: static }` and
     `#screen[data-bar-tall] .body--with-bar { padding-bottom: var(--rhythm-major) }`. The bar then reads as the page's
     closing block, still last in DOM and focus order.
- **Verify:** at 390×844 no bar is over 25 % (162/844 = 19 %), so there is zero baseline diff. At 320×568 the 162 px bars
  release and the 86 px ones stay sticky. At 200 % all release.
- **Kevin:** **touches K-07** (sticky bar + hairline-on-scroll). The release only happens where the bar would cover more
  than a quarter of the screen, and `[data-more]` is moot when the bar is static. Log as D-## and flag for Kevin.

### P2: rhythm, hierarchy and task-path clarity

#### P2-1 · Name the rhythm; one heading-to-content rule · L
- **Screens:** all lists (c-bookings, c-messages, c-orders, t-messages, t-home, t-earnings, + empty variants), account
  sub-pages (c-addresses, c-cards), all to-* steps, c-job, c-tailors, threads, t-adjust, t-job, t-payout.
- **Problem:** the heading → first-block distance is 16 / 24 / 32 / 40 *within one family* (L9). Empty states are 32 on
  the customer side and 24 on the tailor side. Stepper → title is 16 on the customer side and 24 in onboarding. The
  thread note → messages gap is 24 on c-thread and 12 on t-thread. 78 screen rules use bare `--space-24|16` between
  groups, against the Space-Is-The-Separator rule (S-01). The same stepper rule is copied into 5 files. Five negative
  margins cancel a parent `gap` (S-02).
- **Change:**
  - `css/tokens.css`: add `--space-2: 2px` and `--rhythm-block: var(--space-24)` (§1.2). DESIGN.md Layout lists
    6 roles.
  - `css/components-v5.css` (shared rules, Integrator):
    - `.stepper + .t-title, .stepper + .heading-row { margin-top: var(--rhythm-group) }` (12, both personas). This
      follows the K-06 precedent: what sits above the title belongs to it.
    - `.heading-row ~ .empty-state:first-of-type`, the heading block → unlabelled card / banner:
      `margin-top: var(--rhythm-block)`.
    - `.hero + .sec` → `--rhythm-major` once here, deleting the copies in `t-home.css:4`, `t-earnings.css:6`,
      `t-request.css:8` and `c-tailor.css:18` (S-03).
  - Delete the five `to-*.css` stepper rules (`to-availability.css:4`, `to-profile.css:4`, `to-returns.css:4`,
    `to-where.css:4`, `to-payouts.css:3`).
  - Snap each remaining `margin-top: var(--space-16)` between groups to `--rhythm-group` (12) or `--rhythm-block` (24)
    by role: banners/alerts under a heading → 24; fine print under a group → 12.
  - Negative margins → nested sub-groups with the smaller gap: `c-job.css:32` (field + msg), `c-ready.css:22`,
    `t-thread.css:5`, `to-where.css:12`, `components-v5.css:500` (zip error ring becomes an inner wrapper with its own
    padding).
  - Threads: the note → messages gap is `--rhythm-block` on both personas.
  - Replace the 37 `2px` literals with `--space-2`.
- **Verify:** `npm run check`. Expect visual accepts for to-* (24→12 under the stepper), customer empty states (32→24),
  c-cards (40→24), t-thread (12→24), c-job/c-tailors (16→12). List the keys in the commit. Hygiene: zero
  `var(--space-16|24)` in vertical *margins between siblings* in `css/screens/*`. Consider adding this as a lint.
- **Kevin:** **extends K-03 #9** (uneven rhythm) with a fifth role. This is within the K-03 call, but DESIGN.md's named
  rule changes, so log it as D-##.

#### P2-2 · Long pages get three speeds, not one · M
- **Screens:** c-tailor (2540 px, 6 × 32), t-adjust (2204 / 2898 px), with c-pay and t-job checked after.
- **Problem:** every section is 32 apart, so priority rides only on caps labels (L10). On c-tailor the decision-relevant
  **Your estimate** has the same weight as **Prices** and **Rush fees**: three same-anatomy money tables in a row
  (`full-a.png`). On t-adjust, each ~450 px garment card holds four sub-groups separated only by hairlines and 8 px.
- **Change:**
  - **c-tailor** (`js/screens/c-tailor.js`, `css/screens/c-tailor.css`):
    1. The decision block is hero → act → **Your estimate**, with the estimate `--rhythm-block` (24) under the act group
       rather than a 32 section step. It reads as the tailor's offer to *this* job.
    2. Then `--rhythm-major` (40) to the reference stack.
    3. **Prices** and **Rush fees** become one section, "Prices", with the rush ladder as a sub-block 24 below the list
       under a `t-small` 600 sub-label ("Rush fees"), not a second caps head.
    4. Where + Getting it back stay separate sections at 32; Reviews stays last.
    - Net: 7 caps heads → 5, and a 24/40/32 cadence. Copy is unchanged except one heading demoted to a sub-label (fixture
      expects that assert "RUSH FEES" need an update; D-192).
  - **t-adjust** (`css/screens/t-adjust.css`): inside a garment card, services rows → `--rhythm-block` → docs block
    (Before / Pinned / comment at `--rhythm-tight`) → Remove item. The hairline between services and docs goes; air does
    the work (Space-Is-The-Separator). Cards stay 12 apart (`--rhythm-group`). "What changes" → breakdown stays a 32 step.
- **Verify:** squint board at 390. The estimate total and the t-adjust card boundaries read first. Visual accepts:
  `c-tailor*`, `t-adjust*`.
- **Kevin:** K-04 exception (t-adjust keeps full-width Before / Pinned rows) is **kept**; only the spacing between
  sub-groups changes. D-190 (rating once on the head) is untouched.

#### P2-3 · c-job: the per-garment task follows the tap · S/M
- **Screens:** c-job, c-job--services, c-job--max.
- **Problem:** the source states the intended focal shift ("the garment grid while empty; the 'Your items' list once
  filled", `c-job.js:4`), but the layout never makes it. A tile tap adds a card *below* the 3-row grid
  (`c-job.js:151-161`). At 320 that card, and the "what needs doing" task, is entirely under the fold behind an 86 px bar
  (`fold320.png`). The user discovers it only through Next's error scroll (`c-job.js:195`) (L11).
- **Change:** do **not** reorder the page, because moving the grid under the finger after the first tap is worse. Instead,
  adding a garment (tile tap or ＋) opens the existing services sheet for that new garment (`openServices(root, id)`,
  `c-job.js:103`), which is the `c-job--services` state that already exists. Done or ✕ returns focus to the tile. The
  "Your items" section becomes the review/edit list it was meant to be. Removing (−) does not open anything.
- **Verify:** flows `c-job`, `c-job--services`, `c-job--max` still land; add one flow expect ("tap Suit Pant → sheet
  'Suit Pant — what needs doing?'").
- **Kevin:** **amends D-45's flow** (the sheet still allows saving none; Next still enforces). Log as D-##.

#### P2-4 · Component line-heights become ratios · M
- **Screens:** all. Worst overlaps at text 200 %: status-bar time, `.cta`, `.status__word`, `.status-hero__title`,
  `.field__msg`, `.money-row__*`, `.list-row__title` (L8).
- **Problem:** 64 px line-heights in `components-v5.css`, 78 in `components.css`. Type classes are already ratios (K-04),
  but components re-declare px.
- **Change:** where a component sets `font-size: var(--size-N); line-height: Mpx`, replace with the matching ratio of the
  type scale (16/21 → `1.3125`, 12/16 → `1.3333`, 24/29 → `1.2083`, …). Better still, drop both and apply the existing
  `.t-*` class in the component markup. Define the ratios once as `--lh-*` tokens in `tokens.css`.
- **Verify:** zero diff at 390 (same computed values). The t200 probe shows no self-overlap.
- **Kevin:** none.

#### P2-5 · Harness can see clipped overflow · M
- **Problem:** `.screen { overflow: clip }` (`base.css:89-90`, intentional) makes overflow invisible to the current
  `scrollWidth` check (L-03). That is how L-02 and the c-ready runs shipped.
- **Change:** `scripts/v5/check.mjs` adds an edge-crossing assertion: no visible element outside a scroller crosses
  `#screen`'s rect. Run it at 390 and 320 for every flow, and at **195×422** for a short list of P1 states (nav, stars,
  wheel, day-hours, t-adjust, every sheet).
- **Kevin:** none. It is a harness addition (D-01 lineage).

### P3: consistency and polish of structure

| # | item | screens / files | change | effort | Kevin |
|---|---|---|---|---|---|
| P3-1 | **Saved-item lists use one topology** (L13) | c-addresses, c-cards, c-account | One `card--list` of rows (title, sub, "Default" tag, chevron), with actions in a row sheet (c-cards' pattern). c-addresses drops per-item cards and inline links. "Sign out" moves into `.page-actions` (40 below the list) as a red text link (D-195), not floating 32 below. | M | none |
| P3-2 | **Request card foot reads label → amount** (L15) | t-home `request-card` (`components-v5.css:563`) | Foot becomes `align-items: baseline`, with the caps label on the amount's baseline (or stacked label over amount, left-aligned like t-request's hero). | S | none |
| P3-3 | **Appt-row name column keeps room** (L14) | `appt-row` (`components-v5.css:590,602`) | Third column `minmax(0, max-content)`; under 340 the amount drops under the status word (stack) instead of holding full `nowrap` width. | S | none |
| P3-4 | **Chrome geometry and z-order as tokens** (S-06, Z-01) | `tokens.css`, `base.css`, `components-v5.css` | `--status-h: 44px`, `--nav-h: 56px`, `--column: 390px`; derive `--body-top` and `--chrome-h`; remove 10 repeated `max-width: 390px`. `--z-chrome 2 / --z-sticky 5 / --z-banner 9 / --z-overlay 10 / --z-toast 30`; `.sheet`/`.modal` z set relative to their holder. Prerequisite for P1-4 standalone. | M | none |
| P3-5 | **Wide phones get no bars** (L12) | `base.css:72` | `@media (min-width: 600px)` for the `--neutral-100` backdrop; 391–599 keeps linen. The column stays 390. | S | none |
| P3-6 | **`.stage` uses dynamic height** (L-07) | `base.css:67` | `min-height: 100vh; min-height: 100dvh;` like `.screen`. | S | none |
| P3-7 | **Thread composer follows K-07** (Z-02) | `c-thread.css:11-14`, `t-thread.css:10-11` | Recommended: linen ground + hairline only on `[data-more]`, the field stays white (input surface). Alternative: keep it white with a permanent line and log the exception. | S | **Kevin call** (K-07 names the action bar only) |
| P3-8 | **Flatten the comment inside the new-item panel** (nested-cards) | `components-v5.css:674,885,896` | Read-only comment inside a green new-item panel becomes a flat quote (left `--space-12` indent, `t-small` caption "Comment"), not a white ringed panel. Reference content is flat (D-193). | S | amends **D-185(1)** |
| P3-9 | **to-done preview reads as a preview** (L17) | to-done | Keep the white `tailor-row` (it must look like what customers see), add a caps "Preview" head, and make the row `inert` / `aria-disabled` so it isn't a dead tap. | S | none |
| P3-10 | **Stray literals** (S-05, S-07) | `components-v5.css:84,192,543,600,642`, `components.css:1306-7,1509`, `c-tailor.css:37`, chat caps 262/260 | Tokenise or `calc()` them; the chat caps become one `max-width: 85%` tied to the bubble; the c-tailor glyph hang becomes `--icon-hang`. | S | none |
| P3-11 | **to-where ⓘ order** (L16) | `to-where.js:116` | Move the ⓘ into the label row's DOM, before the input. | S | none |
| P3-12 | **Doc drift** (D-01, D-02, D-03) | DESIGN.md, CLAUDE.md | DESIGN.md Layout: status bar and nav are linen with no rule (K-07/K-08); nav icons are **20** px apart (code), not 4; add `--space-2` and `--rhythm-block`. CLAUDE.md: `.body` padding-top 116 (D-204), not 128. | S | none |

Suggested batching (one builder pass each, then `npm run check` sequentially):
**B1 = P1-1 + P1-2 + P1-4 + P2-4** (shared CSS, zero 390 diff, Integrator). **B2 = P1-3 + P1-5 + P2-3** (screen JS + one
app.js hook). **B3 = P2-1 + P3-12** (rhythm tokens + doc, largest visual accept). **B4 = P2-2 + P3-1..3**.
**B5 = P2-5 + remaining P3.**

---

## 3. Already good: do not change

These are the structural assets both passes confirmed. Any change above that touches one of them is a regression.

1. **The status-page skeleton on both personas:** `status line 8 → title 8 → notes 40 → sec 32 … → page-actions 40`
   (c-request, c-booking, c-ready, c-price-change, t-request, t-job, t-payout). Repetition here is recognition.
2. **The squint order:** serif title → one focal fact → quiet groups → one ink button, at 390 and 320 on every family.
   Focal facts are correct: `2h left`, `$147.50` take-home, `$205.00` new total, the visit date, the `$112.50` payout.
3. **The depth split (D-193):** white + ring only on interactive groups, with reference flat on linen. Nothing in this plan
   adds a container. P2-2 and P3-8 remove hairlines and one nested panel.
4. **DOM order = visual order = focus order:** `status-bar > nav > main.body > action-bar`, one H1 and H2 per section,
   sheets trap and move focus (`components.js:480-506`).
5. **0 horizontal scroll, 0 off-screen elements, 0 sub-44 targets** across 112 states at 390 and 320. The zoom-tier rules
   are scoped so this stays exact.
6. **Chrome per K-06 / K-07 / K-08:** Back in the nav, linen chrome, the nav scrolls away with no line, the flow and
   onboarding bars keep their Back, and the action-bar hairline appears only on `[data-more]`.
7. **Content-shaped grids:** 3-up garment tiles, the 4-column appointment row, filter pills (2-up under 375), and the
   t-adjust 340 px query.
8. **Garment row anatomy (K-05 / D-220):** bare 40 px icon → underlined name → tag → photo stack at the row end, with
   services on the card's left edge.
9. **Money presentation:** the stitched dash once above each total (D-197), tabular amounts, dollar amounts only, and the
   CTA carrying the money it commits ("Hold $16.00 and send request").
10. **Empty states:** one shared pattern (disc, title, body, one button). Only the offset above it changes (P2-1).
11. **Two shapes for one appointment on t-home:** the request card (needs action) versus the upcoming row (does not) is a
    justified difference, not inconsistency.
12. **Density by use frequency:** sparse daily surfaces (homes, lists, messages), full breakdowns on decision surfaces,
    and dense editors only where the task is dense.
13. **`.screen { overflow: clip }`:** keep it. It stops Chrome's focus-scroll panning. P2-5 compensates in the harness.
