# Taily v5 — agent context (read this, not the repo)

Plain HTML/CSS/JS, no build step, branch `V5`. Serve: `npm run serve` (127.0.0.1:4173). Gate: `npm run check`.
Plans: `docs/v5/MASTER-PLAN.md` (rules §2, §10) · screens: `docs/v5/SCREENS.md` · calls made: `docs/v5/DECISIONS.md`
· milestone specs `docs/v5/M#-spec.md` · ledger `docs/v5/PROGRESS.md`. Never read `docs/HISTORY.md`, `UX-LOOP.md`,
`js/v4/`, `js/screens/v4/`, `scripts/v4/` or `js/garment-icons.js`. Read code with `grep -n` / `sed -n` ranges.

## File map

| path | what | writer |
|---|---|---|
| `js/money-config.js` | `MONEY` rates + `POLICY` timers — the ONLY place rates / windows live | spec-approved edits only |
| `js/money.js` | money fns, integer cents in/out, `fmt / fmtExact / fmtNeg` | model |
| `js/dates.js` | ISO date helpers + formatters | model |
| `js/data.js` | catalog (`GARMENT_TYPES`, `GARMENT_ICONS`, `SERVICES`), seed (`TAILORS` = Amara, `CUSTOMER` = Sarah, `SEED_JOB`, `BLANK_TAILOR`), `DEMO_NOW`, `ZIP_INFO`, labels | model |
| `js/state.js` | `state`, transitions, selectors, `statusScreen` (DOM-free) | model |
| `js/tailor-data.js` | tailor-side selectors (`MY_TAILOR_ID`, `myTailor`, `currentCustomer`, `inbox`, `requestView`, `jobAddress`) | model |
| `js/components.js` + `css/components-v5.css` | shared render fns (HTML strings) | component builder |
| `js/scheduler.js` | the Scheduler wheel (`scheduler`, `slotColumns`, `readSlot`) | component builder |
| `js/screens/<id>.js` + `css/screens/<id>.css` | one screen | its screen builder |
| `js/fixtures/m#.js` | that milestone's `FLOWS_<screen_id>` arrays (one per screen, pre-scaffolded) | each builder: own array only |
| `js/fixtures/common.js` | `driveTo(target, opts)` | model |
| `js/fixtures/money-scenarios.js` · `scripts/v5/money.mjs` | `SCENARIOS` (seed, rush, shop, courier, priceAdded, priceRemoved, lateCancel, earlyCancel, noShow) computed from `estimate()` / `quote()` on the seed; fixture `expect`s import the first, Node scripts the second. Never type a dollar amount | model |
| `js/flows.js` · `js/flow-menu.js` | Test-flows registry + menu | integrator |
| `js/app.js` | router, `SCREEN_MODULES`, persona gate | integrator |
| `js/inventory.js` | `MILESTONES`, `BUILT`, `SCREENS` (mirror of SCREENS.md; generated: `node scripts/v5/lib/gen-inventory.mjs`) | integrator |
| `index.html` | CSS links | integrator |
| `scripts/v5/*.mjs` | `check` → model test → flows (+ journeys) → visual → hygiene | integrator |
| `ref/v5/<flow-key>.png` | self-baselines | integrator (`--accept-new` / `--accept`) |

## Rules

- **Screen builders edit only** their `js/screens/<id>.js`, `css/screens/<id>.css` and their own `FLOWS_<id>` array in
  `js/fixtures/m#.js`. Shared files (`app.js`, `flows.js`, `inventory.js`, `index.html`, `components*`, `state.js`,
  `data.js`, `money*`) are someone else's: report what you need in your structured output instead.
- Screen pattern:
  ```js
  import { register, render as go } from '../app.js';
  import { state, T, statusScreen, now } from '../state.js';
  import { chrome, cta, moneyRows } from '../components.js';
  const ID = 'c-tailors';
  function view(s) { return `${chrome('home')}<main class="body ${ID}">…</main>`; }
  function wire(root) { root.addEventListener('click', (e) => { const a = e.target.closest('[data-act]'); /* … */ }); }
  register(ID, view, wire);
  ```
  `view` is pure (reads `state`, returns HTML); `wire` attaches listeners and calls transitions, then `go(nextId)`.
  Screens never import another screen, never call `Date.now()` (use `now()`), never hard-code money.
- **Money**: dollar amounts only, never percentages, in every rendered string (lint fails on `%` in `[data-money]`
  or near fee/deposit/payout copy). Amounts come from `js/money.js` on `appt.money` / `estimate()`; print with
  `fmtExact` in breakdowns, `fmt` in lists, `fmtNeg` for the Taily fee. Money elements carry `data-money`.
- **Design**: tokens only (`css/tokens.css`); type = `.t-display` 32 · `.t-title` 28 · `.t-h2` 24 (serif) ·
  `.t-body` 16 · `.t-small` 12 · `.t-caps` 12 · `.t-micro` 10 (sans) + `.w-400…700` + `.c-*`. Never `.t-section` (20).
  Screen 390 wide, `--neutral-50`; status bar h44, top nav h56, `.body` padding-top 128, sides 20. Strokes inside →
  `box-shadow: inset 0 0 0 1px …`. Every tappable ≥ 44×44 (`data-hit="inline"` only for in-text links with a padded
  hit area). Visible labels, error next to the field, loading feedback, `prefers-reduced-motion`.
- Persona comes from the id: `c-` customer, `t-` / `to-` tailor, `sys-` unchanged.

## Tokens

Color: `--ink --white --neutral-50/100/200/300/400/500/600/700 --accent-base --accent-bg --accent-ink --sage
--success(-bg) --warning(-bg) --error(-bg) --info(-bg) --media-placeholder`. Space: `--space-4/8/12/16/20/24/28/32/40`.
Radius: `--radius-sm 8 / md 12 / lg 16 / 20 / xl 24 / full`. Size (v5 allowed): `--size-10/12/16/24/28/32/36`.
Fonts: `--font-serif` Cormorant Garamond (headings), `--font-sans` Hanken Grotesk (UI).

## Model API (M0, built; contract in M0-spec §A)

- money (cents): `cents(d)`, `linesFor(tailor, garments) → lines[] (+ .missing)`, `servicesTotal(lines)`, `rushFor(tailor, visitIso, needByIso)
  → { days, cents }`, `depositFor(services, homeFee)`, `tailyFeeFor(services)`, `payoutFor({ services, homeFee, rush })`,
  `courierQuote(miles) → { miles, cents }`, `quote({ lines, homeFee, rush, courier, deposit }) → { services, homeFee, rush,
  courier, total, deposit, balance, refund, tailyFee, payout }`, `estimate(tailor, job, slotIso?)` (= quote + `rushDays`, `lines`,
  `missing`; the rush tier is read from `slotIso`, null → no rush, D-28), `cancelTerms(appt, nowMs) → { window: 'early'|'late',
  refund, kept }`, `noShowPayout(deposit)`, `fmt` (`$25` / `$4.50`), `fmtExact` (`$16.00`), `fmtNeg` (`−$12.50`).
- statuses (`STATUSES`; `TERMINAL` = declined cancelled completed): `requested suggested declined expired confirmed fitting
  price-change in-progress ready returning completed cancelled` (`cancel.reason`: `withdrawn switched customer-early
  customer-late tailor-cant-make-it no-show`). `appt.payments.deposit.state`: `authorized captured released refunded kept`.
- transitions (take an appt id, return `{ ok, appt, ... } | { ok: false, error }`; all also on `T`): `requestBooking({ tailorId,
  slotStart, cardId, threeDS })`, `withdrawRequest`, `tailorAccept`, `tailorSuggest(id, slotStart)`, `acceptSuggestion`,
  `findAnotherTailor`, `tailorDecline(id, reason)`, `expireRequest`, `tryAgain` (errors: not-expired no-retries slot-passed
  slot-unavailable card-declined), `cancelBooking`, `rescheduleBooking(id, slotStart)`, `tailorCantMakeIt(id, reason)`,
  `markNoShow`, `startFitting`, `sendPriceChange(id, lines)`, `confirmNoChange`, `approvePriceChange`,
  `messageAboutPriceChange`, `markReady`, `chooseReturn(id, option)`, `payBalance(id, cardId, { threeDS })`, `markCompleted`,
  `leaveReview(id, { stars, text, photos })`, `sendMessage(tailorId, from, { text, photos }) → { ok, masked, message }`.
  Job: `setJob(patch)`, `newJob()`, `addGarment(type)`, `removeGarment(id)`, `setServices(garmentId, ids)`,
  `validateJob(job, step?: 'what'|'where') → { ok, errors }`. Tailor: `setTailorSection(section, patch) → { ok, tailor, valid,
  errors, bookable }`, `validateSection(section, data) → { ok, errors }`, `blankTailor()` (D-20), `bookable(tailor)`.
- selectors: `now()`, `nowIso()`, `setClock(iso)`, `advanceClock(min) → { now, expired[] }`, `tick()`, `msLeft(appt)`, `getAppt`,
  `tailorById`, `apptsFor(persona)`, `activeAppt()`, `threadFor(tailorId)`, `threadReadOnly(tailorId)`, `maskContact(text)
  → { text, masked }`, `eligible(tailor, job) → { ok, reason: 'zip'|'shop-off'|'hidden'|'declined'|'nothing-open'|null }`,
  `openSlots(tailorId, visitType, { until, exclude }) → ISO start strings` (D-28; wall-clock, DST-safe), `nextOpening(...same)`,
  `estimateNext(tailor, job)`, `tailorsFor(job) → { rows: [{ tailor, quote, distanceMi, nextOpening, declined }], empty:
  null|'zip'|'shop'|'nothing-open'|'none-left' }`, `statusScreen(appt, persona)`. Other exports: `state`, `T`, `reset()`, `SECTIONS`.
  Sim knobs: `state.sim.{ latency, card, courier, network, push, send, session }`.
- tailor-data.js: `MY_TAILOR_ID`, `myTailor()`, `currentCustomer()`, `inbox() → { requests, upcoming }` (appts), `jobAddress(appt)`,
  `requestView(appt) → { garments: [{ id, type, photos, services: [{ id, label, cents }] }], lines, visitLabel, place, when,
  needBy, estimate, tailyFee, payout, expiresAt, money }`.
- Seed: Amara Reyes (Reyes Tailoring, 312 Metropolitan Ave, Williamsburg 11211; home zips 11211 11222 11206 11237,
  home fee $35, rush $40 / $25 / $15 for ≤1 / 2 / 3 days). Sarah Chen, 145 N 7th St 2R, 11211. Demo clock Tue Oct 13
  10:00 AM. Seed job: Suit Pant hem $25 + Suit Jacket sleeves $45 + sides $55 → services $125.00, home fee $35.00,
  total $160.00, deposit $16.00, balance $144.00, Taily fee −$12.50, payout $147.50.

## Components (M0; `js/components.js`, scheduler in `js/scheduler.js`) — every fn returns an HTML string

Signatures (options all optional unless shown). Shell: `statusBar(time)` `topNav(active, items)` `chrome(active, { persona, time })`
`headingRow(innerHtml)` `backButton()` `esc(v)`. Buttons/links: `cta(label, { variant: default|secondary, disabled, attrs })`
`ctaSmall(label, { attrs })` `linkRow(label, { attrs })` `timeChip(label, { selected, attrs })` `selectTime(label, { attrs })`
`filterPill(caption, value, { open, options, attrs, error })` `statusPill(status, label)`. Tiles/cards: `garmentTile(type, { qty, attrs })`
`photoTile(kind: add|photo, { removable })` `selector(type, value, options, { attrs, chevron })` `summaryCard({ initials, name, rows,
verified, badges, tag, user, attrs })` `visitBlock(rows, { title })` `trustBadges(list, { wide, user })` `trustCard(p, { popup })`
`infoCard(rowsHtml, { heading })` `infoRow(label, value, { small, total })` `metaRow(glyph, text)` `methodRow(label, icon)`
`timeline(steps)` `progressBar(stage)` `statusHero({ variant, pill, pillLabel, title, titleLine2, body, rowLabel, rowValue, extra })`
`feeRow(price, desc, { line, info, muted, caption })`. People: `avatar({ initials, photo, size })`
`tailorRow({ id, name, initials, photo, verified, rating, distanceMi, quote, nextOpening, visitType, declined })`
`ratingSummary({ avg, count })` `stars({ value, input, name })` `reviewRow({ name, initials, stars, date, text, photos })`
`priceRow({ label, cents, note, muted })`. Time/chat: `countdown({ expiresAt, now, suffix })` `bubble(text, side)`
`chatBubble({ text, side, time, photos, status, masked })` `privacyNote()` `readOnlyBanner({ text, ctaLabel, ctaAct })`
`composer({ value, disabled, placeholder })`. Forms: `field({ id, label, value, type, inputmode, autocomplete, placeholder, helper,
error, prefix, suffix, maxlength, disabled, attrs })` `codeInput({ id, length, value, error, label })` `toggle({ id, label, checked,
disabled, helper })` `checkRow({ id, label, checked, caption, error, attrs })` `chipGroup({ name, label, options, value, multi, variant:
chips|segmented, error })` `stepper({ steps, current, done })` `listRow({ title, sub, right, act, chevron })`. States: `skeleton({ kind,
count })` `emptyState({ title, body, ctaLabel, ctaAct, secondaryLabel, secondaryAct })` `banner({ tone, title, text, actionLabel,
actionAct, dismissible })` `toast(msg, { tone })`. Money (print dollars only, `data-money`): `moneyRows([{ label, cents, caption,
status, kind: default|negative|subtotal|total|muted|changed }])` `customerBreakdown(q, { stage: estimate|booked|ready|paid, tailorFirst,
depositState })` — pass `depositState: appt.payments.deposit.state` so a pending request reads "On hold", not "Paid" —
`tailorBreakdown(q)`. Overlays: `sheet(html, { open, header, grabber, variant })` `sheetOverlay(html, { header, variant, dataS }, wireFn)`
`modalOverlay(html, { dataS, instant }, wireFn)` `closeOverlay({ instant })` `overlayOpen()`. Wheel: `wheel(columns)` `wheelScroll(columns)`
`wireWheel(root, onChange, rowH)`; scheduler.js: `scheduler({ title, sub, columns, note, cta, ctaAct, inline })` `slotColumns(slots,
selectedIso)` `readSlot(root, slots)` `readScheduler` `timeColumns` `readTime`.
Wiring (call from a screen's `wire`): `wireStars(root)` `wireToggles(root)` (emits `toggle` { id, checked }) `wireChipGroups(root)` (emits
`chip` { name, value, values }) `wireComposer(root, onSend)` `wireSheetA11y(root, dismiss)`.

## FLOWS / EXPECT contract (every milestone)

```js
// js/fixtures/m1.js
export const FLOWS_c_tailors = [
  { key: 'c-tailors--empty-zip',        // `${screen}` or `${screen}--${state}`, /^[a-z0-9.-]+$/, unique; = ?flow= key = ref/v5/<key>.png
    screen: 'c-tailors',                // must land here (data-screen)
    group: 'M1 · Booking', title: 'Tailors near you — zip outside', note: 'Sarah in 11201',
    setup: (S) => { S.T.setJob({ zip: '11201', address: null }); },   // real transitions / sim knobs only
    click: [],                          // optional: selectors pressed after render (overlays)
    expect: { has: 'No tailors', not: 'Est.', sel: '[data-empty="zip"]' },  // money strings via fmt*()
    visual: true },                     // default true
];
```

`S = { state, T, driveTo, setClock, advanceClock, sim, job, tailor, appt }`. Every state key in SCREENS.md for the
milestone needs an entry; the harness fails on a missing key, a wrong screen or persona, an unmet `expect`, a console
error, a `%` in money copy, a target under 44 px, or a visual diff above 0.10 %.
