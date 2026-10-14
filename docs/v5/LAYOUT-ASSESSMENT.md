# Taily v5 layout assessment (impeccable `layout`, step 1)

Oct 14 2026 · branch `V5` @ `c3d15e6` (K-08) · report only. No file under `js/`, `css/`, `index.html`, `scripts/` or `ref/`
was edited. Per the brief, the mechanical detector (step 2) was **not** run. Everything below is rendered evidence
(screenshots + DOM measurements) or source evidence (`file:line`).

The incumbent system is the brief: DESIGN.md §Layout (390 column, 20 gutters, `--body-top` 116, rhythm 8 / 12 / 32 / 40,
the Space-Is-The-Separator, Squint and Tissue-Under-A-Finger rules), K-01..K-08 and the D-## log. This report judges
structure inside that system and does not question its identity.

---

## 0. Verdict in one paragraph

At **390** and **320** the structure holds. Every primary state lands with a serif title, one focal fact, quiet groups
and one black button. Across 112 states × 2 widths the DOM checks found **0 horizontal page scroll, 0 off-screen
elements and 0 sub-44 targets**, plus one real overlap (c-ready, below). The page-level rhythm is disciplined (8 → 40 →
32 … 32 → 40 on every status page). The structural failures sit at the **extremes the 390 frame never meets**:

- **200 % zoom (195 CSS px).** Every fixed-width row (the top nav's 4 icons, the star row, the time wheel, the
  t-adjust price grid, the day-hours row, the chip rows) overflows a `.screen` that clips (`overflow: clip`). The result
  is controls that cannot be reached at all.
- **The sticky action bar never gives up height.** It takes up to 49 % of a zoomed viewport and 29 % at 320.
- **Bottom sheets have no height limit,** so at zoom their title and ✕ end up above the top of the screen.
- **`nowrap` money and address runs** push content past the edge when names or addresses are long: the c-ready return
  address, and the take-home amount in the t-adjust bar.
- **No `env(safe-area-inset-*)` anywhere** even though the page sets `viewport-fit=cover`.

At 390 the remaining issues are about rhythm consistency and how much weight each block gets. None of them breaks
anything.

---

## 1. Method (reproducible)

| mode | viewport | what it stands for |
|---|---|---|
| `w390` / `f390` | 390×844 @1x, full page / first viewport | the design width (self-baselines in `ref/v5/<key>.png` match `w390`) |
| `w320` / `f320` | 320×568 @1x | narrowest supported phone (iPhone SE 1st gen) |
| `z200` / `fz200` | 195×422 @2x | **200 % page zoom** on a 390 phone (Safari "aA" zoom, Chrome zoom): 195 CSS px of layout |
| `t200` | 390×844, every `--size-*` doubled via an injected style | text-only scaling stress (fonts grow, px line-heights and px boxes do not) |
| `long` | 320×568, long data injected into `Taily.state` and re-rendered | tailor "Anastasia Konstantinopoulou-Whitfield", shop "Konstantinopoulou Bespoke Tailoring & Alterations Atelier", customer "Maximiliana-Josephine Vanderbilt-Oyelaran", street "1450 Northeast Kingsbridge Terrace Boulevard, Apartment 14R" |
| `i360` / `i430` | 360×800, 430×800 | intermediate widths (common Android, iPhone Pro Max) |

- **Scripts** (all in `.shots/layout/`, which is gitignored):
  - `layout-shoot.mjs <outDir> <flow-key>…`: shots plus per-state metrics JSON (off-screen elements not inside a
    scroller, live ellipsis, line-height < font-size, sub-44 targets, focus order against visual order, gaps between
    the direct children of `main.body`, action-bar height).
  - `contact.mjs` / `board.mjs`: side-by-side sheets.
  - `probe*.mjs`: sheet geometry, intermediate widths, DOM order.
- **Coverage:** 112 flow keys (61 customer + 51 tailor/onboarding, `.shots/layout/keys-*.txt`) × 8 modes, covering
  every family named in the brief.
- **Artifact to ignore:** in Playwright *full-page* captures the sticky `.action-bar` paints where the viewport
  bottom was, so it appears mid-page over content (e.g. `c-job__w390.png`, `c-tailor__w390.png`). It is not a bug.
  Fold (`f*`) captures show the real position.
- **Boards referenced below** (`.shots/layout/`): `squint-c1.png`, `squint-c2.png`, `squint-t1.png`, `squint-t2.png`
  (first viewport @390), `fold320.png`, `z200-a.png`, `z200-b.png`, `overlays.png`, `long-a.png`, `full-a.png`,
  `ready-zoom.png`, `intermediate.png`. Per-state sheets are `out/sheet__<key>.png` (w390 | w320 | z200 | t200 | long)
  and `out/sheet-fold__<key>.png`.

Families used below:

| id | family | states inspected (representative) |
|---|---|---|
| A | Entry & sign-in | c-welcome, c-phone, c-code--wrong, c-name--error, t-phone, t-code--wrong, sys-session-expired |
| B | Customer booking flow | c-job(--empty/--max/--services/--photo), c-where(--zip-invalid/--needby-sheet), c-tailors(--empty-zip/--sort/--loading), c-tailor(--no-reviews), c-book(--no-slots), c-pay(--declined/--method), sys-error-toast |
| C | Status / detail pages | c-request(--suggested/--declined/--withdraw), c-booking--confirmed/--fitting/--in-progress/--cancel/--completed/--returning-courier, c-price-change(--item-added/--photo-viewer), c-ready(--courier/--pay-failed), c-complete; t-request(--decline/--rush), t-job--accepted/--visit/--fitting/--in-progress/--ready/--mark-ready/--completed-paid/--more/--cant-make-it, t-payout(--failed) |
| D | Lists & homes | c-bookings(--empty/--ready), c-orders, c-messages(--empty), t-home(--empty/--paused/--push), t-earnings(--empty/--failed-and-next), t-messages(--empty) |
| E | Forms & editors | to-profile(--errors), to-services(--missing-price), to-where(--zip-invalid), to-availability(--overlap), to-returns, to-payouts(--invalid), to-done, t-shop(--incomplete), t-rush(--invalid), t-suggest(--rush-window), t-adjust(--add-item/--error/--edited/--revise), c-review(--photos), c-account(--sign-out), c-addresses(--add), c-cards(--empty) |
| F | Threads | c-thread(--masked/--read-only), t-thread(--failed) |
| G | Overlays | every sheet / modal state above + sys-push-prompt-customer, sys-offline(-tailor) |

---

## 2. Reading order: the squint test

**System answer: passes at 390 and 320 on all families.** At thumbnail size (`squint-*.png`, 230 px wide) every
screen shows, in order:

1. the serif title, with a status dot+word above it on status pages;
2. one focal fact;
3. caps-labelled groups, where only the interactive ones are white;
4. one ink button, either in the sticky bar or in the in-page actions.

| family | primary | secondary | groups, in order | notes / evidence |
|---|---|---|---|---|
| A | serif promise / "Get booked by customers nearby" | phone field | legal, Apple/Google | `c-welcome__f390`: jacket disc, title, one ink CTA, two white alternates. Clean. |
| B | step title | the garment grid / form / tailor card / wheel / review | stepper on top, bar at bottom | c-job: the picker leads even after items exist; "Your items" (where the service per garment is chosen) is 2nd and sits below the fold at 320 (`fold320.png`, c-job). c-pay: the money breakdown is below the fold at 390; the CTA carries the money ("Hold $16.00 and send request"), so the decision is not hidden. |
| C | status title | **focal fact**: `2h left` (c-request, t-request), `$205.00` new total (c-price-change), `$147.50` take-home (t-request), the visit date (c-booking) | timeline, order, price, page actions | Strongest family. Same skeleton on both personas: `heading-lead 8 → title 8 → notes 40 → sec 32 … → page-actions 40`. **Exception:** t-job--accepted has no ink CTA above the fold and its primary action is a text pair (Directions / Add to calendar), which is acceptable for a waiting state. |
| D | page title | first list group | Upcoming / Past, New requests / Upcoming | t-home: the request card (white, large, `2h left` in accent) correctly outranks the upcoming row. t-earnings: the `$112.50` next payout leads. |
| E | step title | the form card(s) | stepper, fee preview / "what customers see" | to-*: one white card per question and a "what customers see" reference block below it. t-adjust: one tall white card per garment; the bar lead "Sarah pays / You take home" is the focal figure. |
| F | the other party (head row) | message bubbles | context card, privacy note, composer | Ink bubble = mine and white = theirs, which reads instantly. |
| G | sheet title | options | confirm (ink or error-red), secondary outline | `overlays.png` top row: every sheet reads title → body → one strong action → dismiss. |

Where two things compete at a squint:

- **c-tailor** (`full-a.png`, 2540 px at 390). There are three money tables in a row: Your estimate, Prices, Rush fees.
  All are flat, caps-labelled and given equal weight. The estimate is the decision-relevant one, but on a squint it
  carries no more weight than the full price list.
- **t-home request card.** "YOU TAKE HOME" (caps, left) and the serif `$147.50` (right) sit on different baselines in
  the card foot. The eye reads the amount before its label.

---

## 3. Grouping

**System answer: proximity does the work. Containers appear only where the system says they should** (interactive
group = tissue + chalk ring; reference = flat). Measured gaps between direct children of `main.body` across 112 states
at 390: `8` ×116, `32` ×174, `40` ×67, `24` ×40, `16` ×30, `12` ×18, `4` ×12. Within-group spacing is tight and gaps
between groups are generous, as K-03 intends.

What works:

- Status pages separate the hero (title + notes, 8 apart) from the first section by 40 and then step every 32.
- Reference blocks (Visit, Price, What happens next) are flat. Choice blocks (return options, pay-with, filter pills,
  form cards) are white.

Where grouping depends on a container or on chance:

- **t-adjust** (`full-a.png`). Each garment is one white card holding services, two required photo wells, a comment
  link and Remove item: four sub-groups separated only by hairlines and 8 px. At 390 one garment card is about 450 px.
  The card is doing the grouping that air would do elsewhere.
- **Saved items use two topologies.** c-addresses gives each address its own card with inline `Make default / Remove`.
  c-cards puts all cards in one group card with chevrons. c-account is one group card plus a "Sign out" link floating
  32 px below in empty space (`squint-c2.png`). These are three answers to the same "list of my things" question.
- **Thread context.** On c-thread the booking context card, the privacy note and the message list are 4 / 8 / 24 apart.
  On t-thread they are 4 / 8 / **12**. The same component is grouped differently per persona.

---

## 4. Rhythm

**System answer: the page cadence is deliberate (8 / 32 / 40). The *entry* interval (heading → first block) is not
one value, and on long pages the section step stays at 32 throughout.**

The heading → first block distance varies within one family (source: `metrics-*.json`, `gaps`):

| family | 40 | 32 | 24 | 16 |
|---|---|---|---|---|
| D lists | c-bookings, t-earnings, t-home (via t-small) | c-bookings--empty, c-messages--empty | c-messages, c-orders, t-messages, t-home--empty, t-earnings--empty, t-messages--empty | none |
| E account | c-cards | none | c-addresses | none |
| B flow | c-where, c-pay | c-book--no-slots | none | c-job (stepper→title 16, body→grid 16), c-tailors (title→filters 16) |
| E onboarding | none | none | stepper→title **24** (all to-*) | customer stepper→title **16** |

Empty states differ by persona: customer empty states sit 32 under the title, tailor empty states 24.

The constant section step: c-tailor has 6 × 32, c-pay 4 × 32 and t-job 3–4 × 32. Every section gets the same air
whatever its importance, so a long page reads as a stack of equal blocks. The only change of pace is the 40 before
page-actions. This is the "one value repeated until everything has equal weight" pattern from layout.md, but only on
the long pages (c-tailor, c-pay, t-job, t-adjust, c-ready). The short pages have too few sections for it to matter.

---

## 5. Structure (topology)

**System answer: the topology matches the task.** Detail pages are linear documents. Lists are rows. Choices are
white option groups. Flows use a stepper with a sticky bar. Repeated units are genuinely equivalent: tailor rows,
appointment rows (a 4-column grid: avatar / text / status-and-amount / chevron, `components-v5.css:590`), thread rows,
garment tiles and day-hours rows.

Observations:

- **c-job picker.** It keeps leading after the first selection. The 3×3 tile grid (`components.css:232`) is the
  entry tool, but once items exist the job is "choose a service per garment". At 320 that task is entirely below the
  fold and behind an 86 px bar (`fold320.png`). At c-job--max (8 garments) the page is 2876 px.
- **c-tailor duplicates price structure.** Your estimate (computed), Prices (4 + "See all 10") and Rush fees (4 tiers)
  are three flat money tables with the same row anatomy. Where and Getting it back follow as two icon lists, then
  Reviews. That is 7 sections at equal 32 steps, 2540 px at 390.
- **Two shapes for one appointment on the tailor home.** The request card (tall, `request-card`, `components-v5.css:563`)
  and the upcoming row (`appt-row`) describe the same kind of object. This is justified (one needs action, the other
  does not) and it reads that way.
- **Status pages share one skeleton on both personas** (c-booking / t-job / c-request / t-request / c-ready /
  c-price-change). This is the strongest structural asset. Repetition supports recognition here.
- **to-done** shows a "How a customer in Williamsburg sees you" preview as a white `tailor-row` card. It looks
  touchable but it is a preview, which is a small exception to the Tissue rule (to-done, `squint-t1.png`).

---

## 6. Density

**System answer: density fits use frequency.** Daily surfaces (t-home, c-bookings, messages) are sparse. Decision
surfaces (c-pay, c-price-change, t-request) carry the full breakdown. Editors (t-adjust, to-services) are dense
because the task is.

Pressure points:

| state | height @390 | @320 | what drives it |
|---|---|---|---|
| c-job--max | 2876 | 2890 | 8 item cards under a 3-row picker |
| t-adjust--revise | 2898 | 3057 | one card per garment × (services + 2 photo wells + comment), plus what-changes and the money breakdown |
| c-tailor | 2540 | 2603 | 3 money tables + where + returns + 3 reviews |
| t-adjust | 2204 | 2229 | the same, 2 garments |
| c-ready--courier | 1792 | 1799 | return options + order + courier quote + price |

- **Sticky bar weight.** At 320 the bar is 86 px (15 %) for one button. It grows to 110–138 px (19–24 %) with a lead
  row or a text-link pair, and to **162 px (29 %)** on c-price-change, c-ready and t-job--fitting (lead + button +
  link + note). On c-ready at 320 only 2 of 3 return options sit above the bar on first view (`fold320.png`).
- **Sparse screens.** c-account, c-addresses, c-cards and t-earnings--empty leave 40–60 % of the 844 frame empty.
  That is fine for low-frequency settings, but on c-account "Sign out" floats alone mid-screen.

---

## 7. Adaptation

What stays **fixed**:

- the 390 cap (`base.css:64-80`);
- chrome heights: status bar 44, nav 56 (`base.css:96-145`);
- the top-nav link row: 4 × 44 + 3 × 20 gap (`base.css:157-175`) plus Back 44;
- the action-bar padding and stack (`components-v5.css:307-316`);
- the 3-up tile grid; the scheduler wheel; the 4-col appt grid with `nowrap` amount (`components-v5.css:590,602`);
- the t-adjust row `1fr 96px 52px` (`t-adjust.css:11`); the 5-star input row (`components-v5.css:150-160`);
- day-hours time buttons `min-width:110px` (`components-v5.css:507`);
- 64 px `line-height` declarations in `components-v5.css` (81 across all CSS).

What **reflows**: text wraps everywhere, c-tailors filters go 2-up under 375 (`c-tailors.css:28`), t-adjust figures
stack under 340 (`t-adjust.css:48`), the logo shrinks under 360, and c-welcome tightens under 760 tall
(`c-welcome.css:33`). Nothing else has a breakpoint, and there are no container queries.

| condition | result | evidence |
|---|---|---|
| **320** | Holds. 0 off-screen elements, 0 page scroll, 0 sub-44 targets across 112 states. **One defect with seed data:** c-ready "Reyes Tailoring, 312 Metropolitan Ave" is `nowrap` (`c-ready.js:72` → `.nb`, `components-v5.css:650`) and runs under the radio. | `ready-zoom.png` col 1 |
| **360** | Holds (`intermediate.png`). | |
| **430** (large phones) | The frame stays 390 and is centred on a `--neutral-100` backdrop, giving 20 px tinted bars on each side because `@media (min-width:391px)` (`base.css:72`) treats any wide phone as desktop. | `intermediate.png` cols 4–6 |
| **200 % zoom** | **Breaks.** Off-screen elements on 91 of 112 states. **Unreachable controls:** top-nav 3rd/4th icon clipped on every tabbed screen (`top-nav__links` right edge 236 > 195), so Account (customer) and Earnings (tailor) cannot be reached; the 5th star on c-review / c-complete (right edge 230–250), so a 5-star review cannot be given; the AM/PM wheel column on c-book / t-suggest (172–216); the day-hours closing-time buttons on to-availability (177–287); the Remove × on every t-adjust service row (148–200); zip-chip remove on to-where; rush-tier fees on c-tailor and t-rush. **Overlaps:** t-home request-card name collides with `2h left`; c-ready / c-price-change photo stack sits over the garment name; c-messages thread row collapses to "Amara …". | `z200-a.png`, `z200-b.png`, `out/metrics-*.json` → `z200.clipped` |
| **text 200 %** (stress) | Unitless type classes scale (`base.css:207-290`), but px line-heights on `.status-hero__title`, `.cta`, `.money-row__*`, `.field__label/__msg`, `.status__word`, `.list-row__title`, `.avatar` and the status-bar time overlap their own lines. 2 or more overlapping elements on every state; top offenders: status-bar time 112, cta 47, status word 46, status-hero title 30, field msg 24. | `out/sheet__c-booking--confirmed.png` col 4 |
| **landscape** | Not shot. By arithmetic, on an 844×390 viewport the 86–162 px bar takes 22–42 %. | |
| **localisation** | Not pseudo-localised. 28 non-ellipsis `nowrap` rules (`grep 'white-space: nowrap'`) are the expansion-risk list: money columns, `.nb`, `.rush-tier`, `.t-adjust__lead-pair`, `.service-row__part`, tags. | |

**DOM / focus order vs visual order: agrees.** Every screen is `status-bar > nav > main.body > action-bar`, matching
the visual top → bottom (the bar is DOM-last and visually last). Headings are one H1 per screen with H2 per section.

The automated order check flagged inversions, which all turned out to be false positives or minor:

- **Sheets (14 flags).** These sit after the page in the DOM, but focus is moved to the first control and trapped
  (`components.js:480-506`), so order is correct.
- **c-job grid (1 flag).** Same-row items with different tops.
- **to-where (1 flag, minor).** The fee ⓘ (`to-where.js:116`) comes after the fee input in the DOM but sits beside the
  label above it.

---

## 8. Extremes

| extreme | result | evidence |
|---|---|---|
| **Long names / addresses** (320) | Truncation works where it is designed in (`appt-row__name`, `thread-row`, `thread-head`, `request-card__place`). The name column in appt rows shrinks to about 70 px ("Anastasia K…") because the status+amount column keeps its full `nowrap` width. Headings wrap cleanly to 3 lines (c-tailor, t-request). **Two clip past the edge:** the c-ready return option (shop name + street, right edge 513 / 420) and the **t-adjust bar lead "Maximiliana-Josephine pays $160.00 · You take home $147.50"**, whose take-home amount is pushed off-screen (right edge 356 > 320; `t-adjust.css:68` `.t-adjust__lead-pair { white-space: nowrap }`). Rendered money becomes invisible. | `long-a.png` col 1, `ready-zoom.png` col 2 |
| **Empty states** | One shared pattern (disc + title + body + one button), centred, reads well on both personas. The only difference is the 32 vs 24 offset above. | `squint-c2.png` (c-bookings--empty, c-tailors--empty-zip), `squint-t1.png` (t-home--empty) |
| **Overlays** | At 390/320 sheets and modals are well proportioned (`overlays.png` top row). **At 200 % zoom bottom sheets overflow upward:** `.sheet` is `position:absolute; inset:auto 0 0 0` in a fixed host with no `max-height` or `overflow` (`components.css:937`). Measured: c-booking--cancel sheet top **−101 px** (✕ and title off-screen), c-job--services −55 px. Only `.photo-viewer` / `.docs-viewer` cap at 70vh (`components-v5.css:625,921`). Modals fit (c-account--sign-out 17→406). | `overlays.png` bottom row; `probe.mjs` output |
| **Sticky elements** | The action bar is the only pinned element (K-08 un-pinned the nav). It never collapses. At 200 % it covers 20–49 % of the viewport: **t-request 206/422**, c-price-change / c-ready 178/422, t-adjust 150/422. The visible content window on t-request drops to about 216 px, roughly 3 lines of body copy. | `z200-b.png` col 1–3 |
| **Safe areas** | `index.html:5` sets `viewport-fit=cover`, but **no `env(safe-area-inset-*)` appears in any stylesheet.** On notched or home-indicator iPhones (installed PWA, where the fake status bar is hidden by `base.css:130`), content and the 20 px bottom padding of the action bar / sheet sit under the system UI, against a 34 px home indicator. | `grep -rn safe-area css/` → none |
| **Small targets** | 0 sub-44 at 390 / 320 (inline links carry `data-hit`). Under zoom or text stress only: c-tailors "Need by" pill shrinks to 18×44 at text 200 %; to-where ZIP input 39×48 at zoom; photo-viewer "Previous" 28×44 at zoom. | `metrics-*.json` → `small` |

---

## 9. Findings, ranked (for the synthesis step, nothing applied)

| # | sev | where | finding |
|---|---|---|---|
| L1 | P1 | top nav, all tabbed screens | At 200 % zoom the 4-icon row overflows the clipped `.screen`, so the 3rd/4th destination cannot be reached. The row has no compact form. |
| L2 | P1 | `.sheet` (`components.css:937`) | No `max-height` / internal scroll, so at 200 % zoom (and on short landscape) the sheet header and ✕ go above the viewport. |
| L3 | P1 | `.action-bar` (`components-v5.css:307`) | The bar never yields height. It takes 15–29 % of the viewport at 320 and 20–49 % at 200 %. Lead rows, notes and text-link pairs stack under the button with no compact or collapsed variant. |
| L4 | P1 | stars, wheel, day-hours, t-adjust row, zip chips, rush tiers | Fixed-width inline rows have no wrap or stack path. At 200 % zoom real inputs fall off-screen (5-star rating, PM, closing time, remove service). |
| L5 | P1 | t-adjust bar lead (`t-adjust.css:68`) | With a long customer first name the `nowrap` pair pushes "You take home $X" past the 320 edge, hiding money. |
| L6 | P1 | safe areas | `viewport-fit=cover` with zero `env(safe-area-inset-*)`. The action bar, sheets and chrome ignore the notch and home indicator. |
| L7 | P2 | c-ready return options (`c-ready.js:72`, `.nb`) | The shop + street run is unbreakable and hits the radio at 320 with seed data, and goes off-screen with long data. |
| L8 | P2 | px line-heights (64 in `components-v5.css`) | Text scaling overlaps lines in the status-hero title, CTA, money rows and field labels. The type classes are already ratios (K-04); the components are not. |
| L9 | P2 | heading → first block | 16 / 24 / 32 / 40 within the same family (lists, account sub-pages, empty states by persona, stepper → title 16 customer vs 24 onboarding, thread note → messages 24 vs 12). |
| L10 | P2 | long detail pages (c-tailor, c-pay, t-job, t-adjust, c-ready) | Every section is 32 apart, so priority is carried only by caps labels. c-tailor stacks three same-anatomy money tables. |
| L11 | P2 | c-job | The picker leads after items exist. The per-garment service task sits below the fold at 320. |
| L12 | P3 | `base.css:72` | Phones wider than 390 get the desktop backdrop (20 px bars at 430). |
| L13 | P3 | saved-item lists | c-addresses (card per item, inline actions), c-cards (grouped rows, chevrons) and c-account (group + floating Sign out) are three topologies for one pattern. |
| L14 | P3 | appt-row with long names | The status+amount column keeps full `nowrap` width, so the name column drops to about 70 px at 320. |
| L15 | P3 | t-home request card foot | The caps label and serif amount sit on different baselines (amount read before label). |
| L16 | P3 | to-where fee ⓘ | DOM after the input, visually above it (focus order nit). |
| L17 | P3 | to-done preview | A white tailor-row card used as a non-interactive preview bends the Tissue rule. |

Inputs for the spatial thesis (next step, not decided here):

- **Primary paths:** Customer: pick garments → service per garment → where/when → tailor → time → pay. Tailor:
  request → accept/suggest → fitting edit → mark ready.
- **Must stay together:** status + title + focal fact; each money table with its total; each garment with its services
  and photos.
- **Must separate:** decisions (white) from reference (flat); the sticky action from content it might cover.
- **Density:** current at 390. The bar and the fixed inline rows are the parts that must adapt at 320, 200 % and in
  landscape.
