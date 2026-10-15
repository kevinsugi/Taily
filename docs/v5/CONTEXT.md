# Taily v5 — agent context (read this, not the repo)

Plain HTML/CSS/JS, no build step, branch `V5`. Serve: `npm run serve` (127.0.0.1:4173). Gate: `npm run check`.
Plans: `docs/v5/MASTER-PLAN.md` (rules §2, §10) · screens: `docs/v5/SCREENS.md` · calls made: `docs/v5/DECISIONS.md`
· milestone specs `docs/v5/M#-spec.md` · ledger `docs/v5/PROGRESS.md`. Never read `docs/HISTORY.md`, `UX-LOOP.md`,
`js/v4/`, `js/screens/v4/`, `scripts/v4/` or `js/garment-icons.js`. Read code with `grep -n` / `sed -n` ranges.

## File map

| path | what | writer |
|---|---|---|
| `js/money-config.js` | `MONEY` rates + `POLICY` timers (incl. `CODE_TTL_MIN` 10, `CODE_RESEND_S` 30) — the ONLY place rates / windows live | spec-approved edits only |
| `js/sim.js` | `withLatency(done) → cancel()` — every simulated network wait: `state.sim.latency` instant → sync, normal → `LATENCY_MS` 700, hold → never (D-35). Set the busy flag first | component builder |
| `js/account.js` | DOM-free sign-in model (D-33): `phoneDigits formatPhone validatePhone signOut sendCode codeStatus resendCode verifyCode saveName signInWith addCard useOtherMethod` | component builder |
| `js/money.js` | money fns, integer cents in/out, `fmt / fmtExact / fmtNeg / fmtColumn` | model |
| `js/dates.js` | ISO date helpers + formatters | model |
| `js/data.js` | catalog (`GARMENT_TYPES`, `GARMENT_ICONS`, `SERVICES`), seed (`TAILORS` = Amara, `CUSTOMER` = Sarah, `SEED_JOB`, `BLANK_TAILOR`), `DEMO_NOW`, `ZIP_INFO`, labels | model |
| `js/state.js` | `state`, transitions, selectors, `statusScreen` (DOM-free) | model |
| `js/tailor-data.js` | tailor-side selectors (`MY_TAILOR_ID`, `myTailor`, `currentCustomer`, `inbox`, `requestView`, `jobAddress`) | model |
| `js/components.js` + `css/components-v5.css` | shared render fns (HTML strings) | component builder |
| `js/system.js` | M5 system layer (DOM): `SYSTEM_EXEMPT systemBanner wireSystem openReauth openPushPrompt` (+ `reauthHtml` `pushPromptHtml` for the gallery) | component builder |
| `js/scheduler.js` | the Scheduler wheel (`scheduler`, `slotColumns`, `readSlot`) | component builder |
| `js/screens/<id>.js` + `css/screens/<id>.css` | one screen | its screen builder |
| `js/fixtures/m#.js` | that milestone's `FLOWS_<screen_id>` arrays (one per screen, pre-scaffolded) | each builder: own array only |
| `js/fixtures/common.js` | `driveTo(target, opts)` | model |
| `js/fixtures/money-scenarios.js` · `scripts/v5/money.mjs` | `SCENARIOS` (seed, rush, shop, courier, priceAdded, priceRemoved, lateCancel, earlyCancel, noShow) computed from `estimate()` / `quote()` on the seed; fixture `expect`s import the first, Node scripts the second. Never type a dollar amount | model |
| `js/flows.js` · `js/flow-menu.js` | Test-flows registry + menu; `setBootLatency(v)` (app.js boot) — `resetDemo()` restores `sim.latency` to it, so a `'hold'` flow never leaks (D-35) | integrator |
| `js/app.js` | router, `SCREEN_MODULES`, persona gate | integrator |
| `js/inventory.js` | `MILESTONES`, `BUILT`, `SCREENS` (mirror of SCREENS.md; generated: `node scripts/v5/lib/gen-inventory.mjs`) | integrator |
| `index.html` | CSS links | integrator |
| `scripts/v5/*.mjs` | `check` → model test → flows (+ journeys) → visual → hygiene | integrator |
| `ref/v5/<flow-key>.png` | self-baselines | integrator (`--accept-new` / `--accept`) |

## Cold links

`?screen=<id>` boots that screen in its PRIMARY state: `primaryFlow(id)` (`js/flows.js`) = the FLOWS entry keyed exactly `<id>`
(the ◆ entry), else the screen's first entry; `app.js` runs its `setup` (and `click`s) through `runFlow(key, { keepUrl: true })`, so the
link stays `?screen=`. A screen with no entry renders on the seed. Consequence for every milestone: each screen's FIRST / ◆ entry must be its
meaningful default state (`?screen=c-request` shows the request, not "No open requests"). `?flow=<key>` is unchanged.

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
  `render()` gives `wire` a fresh `#screen` node every time (D-47), so `root.addEventListener` is safe and never stacks. A
  timer or async callback started in `wire` must re-render with `go()`, not hold `root` across renders.
  Screens never import another screen, never call `Date.now()` (use `now()`), never hard-code money.
- **Money**: dollar amounts only, never percentages, in every rendered string (lint fails on `%` in `[data-money]`
  or near fee/deposit/payout copy). Amounts come from `js/money.js` on `appt.money` / `estimate()`; print with
  `fmtExact` in breakdowns, `fmt` in lists, `fmtNeg` for the Taily fee. **One precision per column / list / screen (D-70, D-98):** if any amount in a group — or anywhere on the same screen section / card — has cents, show all with cents (`$36.00`, `$18.00`) — format a group with `fmtColumn(listOfCents)` (returns `fmt` or `fmtExact`); a screen with a `fmtExact` breakdown prints its other amounts exact too (`workList` does; `priceRow` / `tailorRow` take `format`). Money elements carry `data-money`.
- **Design**: tokens only (`css/tokens.css`); type = `.t-display` 32 · `.t-title` 28 · `.t-h2` 24 (serif) ·
  `.t-body` 16 · `.t-small` 12 · `.t-caps` 12 · `.t-micro` 10 (sans) + `.w-400…700` + `.c-*` (line-heights are unitless ratios, K-04). No off-scale serif: `.t-section` is gone.
  Screen 390 wide, `--neutral-50`; status bar h44, top nav h56, `.body` padding-top `var(--body-top)` (116, K-04 / D-204; was 128), sides 20. Strokes inside →
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
  refund, kept }`, `noShowPayout(deposit)`, `fmt` (`$25` / `$4.50`), `fmtExact` (`$16.00`), `fmtNeg` (`−$12.50`), `fmtColumn(cents[]) → fmt | fmtExact` (D-70).
- statuses (`STATUSES`; `TERMINAL` = declined cancelled completed): `requested suggested declined expired confirmed fitting
  price-change in-progress ready returning completed cancelled` (`cancel.reason`: `withdrawn switched customer-early
  customer-late tailor-cant-make-it no-show`). `appt.payments.deposit.state`: `authorized captured released refunded kept`.
- transitions (take an appt id, return `{ ok, appt, ... } | { ok: false, error }`; all also on `T`): `requestBooking({ tailorId,
  slotStart, cardId, threeDS })`, `withdrawRequest`, `tailorAccept`, `tailorSuggest(id, slotStart)`, `acceptSuggestion`,
  `findAnotherTailor`, `tailorDecline(id, reason)`, `expireRequest`, `tryAgain` (errors: not-expired no-retries slot-passed
  slot-unavailable card-declined), `cancelBooking`, `rescheduleBooking(id, slotStart)`, `tailorCantMakeIt(id, reason)`,
  `markNoShow`, `startFitting`, `sendPriceChange(id, lines)`, `approvePriceChange`,
  `messageAboutPriceChange`, `markReady`, `chooseReturn(id, option)`, `payBalance(id, cardId, { threeDS })`, `markCompleted`,
  `leaveReview(id, { stars, text, photos })`, `sendMessage(tailorId, from, { text, photos }) → { ok, masked, message }`. System thread lines carry `text` (customer reader) and `tailorText` (tailor reader), D-98.
  Job: `setJob(patch)`, `newJob()`, `addGarment(type)`, `removeGarment(id)`, `setServices(garmentId, ids)`,
  `validateJob(job, step?: 'what'|'where') → { ok, errors }`. Tailor: `setTailorSection(section, patch) → { ok, tailor, valid,
  errors, bookable, live }`, `validateSection(section, data) → { ok, errors }`, `blankTailor()` (D-20), `bookable(tailor)`.
- selectors: `justConfirmed(appt)` (D-73: confirmed and < `POLICY.JUST_BOOKED_MIN` 60 min since the last accept), `now()`, `nowIso()`, `setClock(iso)`, `advanceClock(min) → { now, expired[] }`, `tick()`, `msLeft(appt)`, `getAppt`,
  `tailorById`, `apptsFor(persona)`, `activeAppt()`, `threadFor(tailorId)`, `threadReadOnly(tailorId)`, `maskContact(text)
  → { text, masked }`, `eligible(tailor, job) → { ok, reason: 'zip'|'shop-off'|'hidden'|'declined'|'nothing-open'|null }`,
  `openSlots(tailorId, visitType, { until, exclude }) → ISO start strings` (D-28; wall-clock, DST-safe), `nextOpening(...same)`,
  `estimateNext(tailor, job)`, `tailorsFor(job) → { rows: [{ tailor, quote, distanceMi, nextOpening, declined }], empty:
  null|'zip'|'shop'|'nothing-open'|'none-left' }`, `statusScreen(appt, persona)`. Other exports: `state`, `T`, `reset()`, `SECTIONS`.
  Sim knobs: `state.sim.{ latency, card, courier, network, push, send, session }`.
- tailor-data.js: `MY_TAILOR_ID`, `myTailor()`, `currentCustomer()`, `inbox() → { requests, upcoming }` (appts), `jobAddress(appt)`
  (neighborhood + zip before the accept and again once cancelled, D-88), `customerName(appt)` ("Sarah C." until accepted, then "Sarah Chen", D-74)
  `customerInitials()`, `suggestSlots(appt, { limit }) → ISO[]` (D-77: open slots before the need-by, none overlapping the requested visit; seed first = `SUGGESTED_SLOT`)
  `payoutOf(appt) → { cents, state, date, kind } | null`,
  `requestView(appt) → { garments: [{ id, type, photos, services: [{ id, label, cents }] }], lines, visitLabel, place, when,
  needBy, estimate, tailyFee, payout, expiresAt, money, customer: { name, initials }, whenEnd, minutes, needByDays, retries, suggested (fmtWhen | null), items, serviceCount }`.
- `js/focus.js` (M3, D-72, DOM-free): `setFocus(id)` (= `state.ui.apptId`) · `focusAppt(screenId, persona?)` (the focused appt when it belongs to the persona and `statusScreen` is that screen, else the persona's newest appt for that screen, skipping withdrawn / switched; else null) · `redirectIfMoved(screenId, go, { has }?)` (in `wire`: forwards to the appt's `statusScreen` with `{ replace: true }`; returns true when it did). Navigators call `setFocus(a.id)` before `go`.
- `data.js` (M3): `DECLINE_REASONS`, `CANT_MAKE_IT_REASONS` (D-76). `money-scenarios.js` (M3): `SUGGESTED_SLOT` `'2026-10-15T18:00'`, `SECOND_SLOT_AFTER` `'2026-10-17T00:00'`. `fixtures/common.js` (M3): `addRequest({ accept = false, after = null })` — a second request for the current draft job at the first open slot >= `after` through the real transitions (does NOT reset; D-86).
- Seed: Amara Reyes (Reyes Tailoring, 312 Metropolitan Ave, Williamsburg 11211; home zips 11211 11222 11206 11237,
  home fee $35, rush $40 / $25 / $15 for ≤1 / 2 / 3 days). Sarah Chen, 145 N 7th St 2R, 11211. Demo clock Tue Oct 13
  10:00 AM. Seed job: Suit Pant hem $25 + Suit Jacket sleeves $45 + sides $55 → services $125.00, home fee $35.00,
  total $160.00, deposit $16.00, balance $144.00, Taily fee −$12.50, payout $147.50.

## Sign-in + sim (M1; `js/account.js`, `js/sim.js` — import as `import * as A from '../account.js'`)

- `phoneDigits(raw)` 10 national digits · `formatPhone(raw)` `(718) 555-0142` (progressive) · `validatePhone(raw)` → `{ ok } | error 'phone-invalid'`
  · `signOut()` · `sendCode(raw) → { ok, phone, isNew } | phone-invalid` (isNew = number ≠ Sarah's) · `codeStatus() → { phone, isNew,
  msToResend, expired } | null` · `resendCode()` (`too-soon` | `no-code`) · `verifyCode(code)` (`no-code` `code-format` `code-expired`
  `code-wrong` for `000000`; ok → `{ ok, isNew }`, existing signs in, new waits for `saveName`) · `saveName({ first, last })` →
  `{ ok } | { ok: false, errors: { first: 'first-required', last: 'last-required' } }` · `signInWith('apple'|'google')` ·
  `addCard({ number, exp, cvc, zip })` → `{ ok, card } | { ok: false, errors: { number: 'card-number', exp: 'card-exp', cvc:
  'card-cvc', zip: 'card-zip' } }` (also clears `sim.card` 'declined', D-40) · `useOtherMethod()`.
- `withLatency(done) → cancel()` — `'instant'` runs `done` synchronously, `'normal'` after `LATENCY_MS` (700), `'hold'` never.

## Components (M0; `js/components.js`, scheduler in `js/scheduler.js`) — every fn returns an HTML string

Signatures (options all optional unless shown). Shell: `statusBar(time)` `topNav(active, items, { badges, back })` (K-06 / D-221: `back` puts the 44 px Back chevron where the logo is) `navBackButton()` `withNavBack(html)` (app.js render runs every built screen through it) `chrome(active, { persona, time })`
`headingRow(innerHtml, { back, status, trailing, sticky, whole })` (K-06, D-221: status line, h1 row, notes, all flush on the 20 px gutter; NO Back in the heading: `back` (default true) leaves a `<!--nav-back-->` marker and `withNavBack` swaps the nav logo for the Back chevron, or seats a Back-only bar on a screen with a status bar and no nav; `back: false` = tab root / flow bar / onboarding bar; `statusHero` hands its pill up through a `<!--status-->` marker) `backButton()` (the plain "‹" the flow bar and onboarding bar keep) `esc(v)`. Buttons/links: `cta(label, { variant: default|secondary|danger, disabled, busy, busyLabel, attrs })` (`danger` = error fill + white text, the ONE filled button of a destructive confirm sheet, D-79) (disabled → `disabled aria-disabled="true"`; busy = spinner + busyLabel, `aria-busy`, disabled)
`ctaSmall(label, { attrs })` `linkRow(label, { attrs })` `timeChip(label, { selected, attrs })` `selectTime(label, { attrs })`
`filterPill(caption, value, { open, options, attrs, error, edit })` (`edit` = pencil glyph, for a pill that opens another screen) `statusPill(status, label)` (`calm` = neutral "cancelled early" / "no reply" pill, D-98; `suggested` = filled accent "your move" pill, `waiting` = outlined accent, D-95). Tiles/cards: `garmentTile(type, { qty, attrs })`
`photoTile(kind: add|photo, { removable })` `selector(type, value, options, { attrs, chevron })` `summaryCard({ initials, name, rows,
verified, badges, tag, user, attrs })` `visitBlock(rows, { title })` `trustBadges(list, { wide, user })` `trustCard(p, { popup })`
`infoCard(rowsHtml, { heading })` `infoRow(label, value, { small, total })` `metaRow(glyph, text, { icon: shop|home|bag|truck })` `methodRow(label, icon)`
`timeline(steps)` `progressBar(stage)` `statusHero({ variant, pill, pillLabel, title, titleLine2, body, rowLabel, rowValue, extra })`
`feeRow(price, desc, { line, info, muted, caption })`. People: `avatar({ initials, photo, size })`
`tailorRow({ id, name, initials, photo, verified, rating, distanceMi, quote, nextOpening, visitType, declined })`
`ratingLine({ avg, count, anchor })` `stars({ value, input, name })` `reviewRow({ name, initials, stars, date, text, photos })`
`priceRow({ label, cents, note, muted })`. Time/chat: `countdown({ expiresAt, now, suffix })` `bubble(text, side)`
`chatBubble({ text, side, time, photos, status, masked })` `privacyNote()` `readOnlyBanner({ text, ctaLabel, ctaAct })`
`composer({ value, disabled, placeholder })`. Forms: `field({ id, label, value, type, inputmode, autocomplete, placeholder, helper,
error, prefix, suffix, maxlength, disabled, attrs })` `codeInput({ id, length, value, error, label })` `toggle({ id, label, checked,
disabled, helper })` `checkRow({ id, label, checked, caption, error, attrs })` `chipGroup({ name, label, options, value, multi, variant:
chips|segmented, error })` `stepper({ steps, current, done, variant: default|compact })` `bookingSteps(current)` (`BOOKING_STEPS`, 0-based; the compact 5-segment "n of 5" row, first in `.body` on the booking path) `actionBar({ ctaLabel, ctaAct, disabled, busy, busyLabel, lead, note, secondaryLabel, secondaryAct, tertiaryLabel, tertiaryAct, tertiaryTone: default|danger })` (secondary + tertiary = a two-column outline row under the primary, D-80; sticky bottom bar — a SIBLING of `main.body` inside `#screen`, body gets `.body--with-bar`; `lead` = HTML with a `data-money` amount; `note` is `aria-describedby` of a disabled CTA; CTA is `[data-act=ctaAct]`) `optionRow({ name, value, title, sub, checked, lead, act })` (single-select `role=radio` row for sheets; wrap rows in `role="radiogroup"`; emits `data-act=act data-name data-value`) `listRow({ title, sub, right, act, chevron, lead })`. States: `skeleton({ kind,
count })` `emptyState({ title, body, ctaLabel, ctaAct, secondaryLabel, secondaryAct })` `banner({ tone, title, text, actionLabel,
actionAct, dismissible })` `toast(msg, { tone, action, onAction, ms })` (`action` = inline Undo button; a toast is cleared on any screen change and sits above a sticky action bar, D-71) `clearToasts()`. Money (print dollars only, `data-money`): `moneyRows([{ label, cents, caption,
status, kind: default|negative|subtotal|total|muted|changed }])` `customerBreakdown(q, { stage: estimate|booked|ready|paid, tailorFirst,
depositState })` — pass `depositState: appt.payments.deposit.state` so a pending request reads "On hold", not "Paid" (`'to-hold'` → "Held today", c-pay before the request is sent, D-38) —
`tailorBreakdown(q)`. Overlays: `sheet(html, { open, header, grabber, variant })` `sheetOverlay(html, { header, variant, dataS }, wireFn)`
`modalOverlay(html, { dataS, instant }, wireFn)` `closeOverlay({ instant })` `overlayOpen()`. Wheel (columns are keyboard listboxes, `{ width, rows, sel, label }`): `wheel(columns)` `wheelScroll(columns)` `wheelCol` `wheelRows` `markWheelRow(col, idx)`
`wireWheel(root, onChange, rowH)`; scheduler.js: `scheduler({ title, sub, columns, note, cta, ctaAct, inline, compact })` (`cta: ''` = no inline button; `compact` = 3-row wheel) `slotColumns(slots,
selectedIso)` `readSlot(root, slots)` `readScheduler` `timeColumns` `readTime` `wireTimeWheel(root)` (the availability time wheel: 9 AM–9 PM on :00 / :30 only, hour / minute rows follow the period — D-71).
Wiring (call from a screen's `wire`): M2 components (tailor onboarding + Shop): `ONBOARDING_STEPS` (`[{ id, label, screen }]` ×6: profile services where returns availability payouts) `onboardingSteps(current, done = [])` ("Step n of 6 · label"; `current` id|index, `done` ids) `onboardingHeader({ editing = false, back = true })` (onboarding: status bar + 56px `.ob-bar` with Back and a 44px `data-act="finish-later"`; editing: `chrome('shop', { persona: 'tailor' })`) `textArea({ id, label, value, rows = 4, max, helper, error })` (live `data-count` "n / max", no maxlength) `serviceRow({ id, label, caption, checked, price, payoutCents, error })` (caption string, or an array → one nowrap span per item) (`payoutText` = the take-home already formatted for its column, `fmtColumn`, D-70) (checkbox `#svc-<id>` `data-act="svc"`; checked → `$` input `#price-<id>` + `[data-take]` "You get $X", hidden while payoutCents null) `zipList({ zips, input, error, inputError, suggestions })` (chips `data-act="zip-remove"` / `zip-suggest`, `#zip-add`, `data-act="zip-add"`) `dayHours({ sched, day, label, open, close, error })` (switch `#day-<sched>-<day>`; time buttons `data-act="time" data-edge="open|close"`; open/close are labels) `customerPreview({ title = 'What customers see', html, caption })` (inert body; caps title on every screen, no overrides) `miniProfile({ name, initials, photo, shopName, bio })` (the tailor's own card in a preview; `data-pv` hooks; `bio: null` omits it) `returnsRows(returns, { empty })` (c-tailor's "Getting it back" metaRows, shared with to-returns) `rushLadder(rush)` (`[{ days, fee }]` dollars; `.rush-tier` nowrap spans; empty "No rush fees.") `leaveModal({ title, body })` (alertdialog for `modalOverlay`; `data-act="keep-editing"` primary / `discard` secondary). Extended: `checkRow({ …, disabled })` `avatar({ photo: true })` (placeholder circle, no img).
M3 components: `requestCard({ id, act = 'open-request', name, initials, visitLabel, place, when, items, services, payoutCents, feeCents, expiresAt, now, status = 'requested'|'suggested', waitingOn, retries })` (tailor inbox ticket, one `<button data-act data-id>`: countdown — warning ring when <= `EXPIRING_SOON_MIN` — or a "Waiting on <name>" pill, when + "n items · n services", then YOU TAKE HOME `.t-h2` take-home over "after the $Y Taily fee"; suggested = muted money; `retries > 0` → "Sent again") `apptRow({ id, act = 'open-appt', name, initials, when, place, status, pillLabel, amountText, amountCaption, captionTone: default|action, muted })` (72 px list row, `<button data-act data-id>`: avatar, name / when / place, `statusPill` above an optional `data-money` amount + caption, chevron; muted = past; a muted row's pill is neutral unless `kept: true` (money kept / tailor ended it, D-98)).
`workList(v, { estimateLabel })` (R3: "The work" garments + services + estimate, all `fmtExact` (D-98); a garment's photos = a 44 px thumbnail button `data-act="view-photo"` — call `wirePhotoViewer(root)` in `wire`; `openPhotoViewer({ title, count })` = the placeholder viewer sheet; shared by t-request / t-job; `v` = `requestView`) `noteQuote({ label, text })` (the tailor's-note card on c-request--declined and c-booking--cant-make-it); `requestCard` also takes `asked` (suggested state: "Sarah asked for …", and shows the pill in its own row).
`wireStars(root)` `wireToggles(root)` (emits `toggle` { id, checked }) `wireChipGroups(root)` (emits
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

## Tailor onboarding model (M2; D-55…D-67, spec `docs/v5/M2-spec.md` §A)

- Tailor fields: `phone` (seed `(347) 555-0118` = the existing account), `live` (true the first time all six sections are valid, never back; seed Amara live), `payouts.routing`. Mode of a `to-*` screen: `editing = !!myTailor().live`.
- `data.js`: `TAILOR_LIMITS { BIO_MAX 300, WORK_PHOTOS_MAX 6, PRICE_MAX 999, FEE_MAX 200, RUSH_MAX 200 }` `RUSH_TIERS [1,2,3]` `SHOP_CITY` `DEFAULT_WEEK` `DAY_KEYS` `DAY_LABEL` `ROUTING_BANKS`; `MONEY.FEE_EXAMPLE_SERVICES` (display-only fee example base).
- `state.js`: `validateSection(section, data)` returns `{ field: code }` (profile name-required bio-required bio-long · services no-services price-<id> price-missing|price-invalid · where where-required street-required zip-invalid zips-required fee-missing fee-invalid · returns return-required pickup-needs-shop · availability <type> hours-required, <type>-<day> hours-range, overlap-<day> hours-overlap · payouts holder-required routing-invalid account-invalid bank-required). `setTailorSection` REPLACES `prices` / `availability` (deep-merges the rest) and sets `live`. `setPayouts({ holder, routing, account })` (stores only `last4`; blank account keeps it only while the routing number is unchanged, D-69), `validateRush({ on, fees: {1,2,3} })` (`d<n>`: fee-missing fee-invalid fee-order), `setRush(draft)`, `nextSection(tailor?)` — all on `T`.
- `account.js`: every session fn takes a trailing `who = 'customer' | 'tailor'` (`signOut sendCode codeStatus resendCode verifyCode`); `verifyCode(code, 'tailor')` → `{ ok, isNew, next }` (new number → `blankTailor()` + `phone`, `next: 'profile'`; existing → `next: nextSection()`).
- `fixtures/common.js`: `onboardTo(step, { phone })` + `NEW_TAILOR_PHONE` — reset → blank tailor signed in → every section before `step` saved with the seed's values through the real setters (`'done'` = live).

## M4 additions (fitting to completion; spec `docs/v5/M4-spec.md` §A, D-99…D-111)

- `data.js`: `REVIEW_LIMITS { TEXT_MAX 500, PHOTOS_MAX 3 }` · `STAR_WORDS` (`['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']`, index = stars) · `TAILOR_LIMITS.NOTE_MAX` 200.
- `money.js`: `courierQuote(miles) → { miles, quote, markup, cents }` (`quote + markup === cents`; 0.6 mi = $9.50 + $0.95 = $10.45).
- `state.js` transitions: `markReady(id, { returns } = {})` (`returns` ⊆ `'pickup'|'dropoff'|'courier'`, default every Shop return that is on; errors `return-required` `not-offered`; stores `a.returnOffer`) · `chooseReturn` also fails `not-offered` outside `returnOffer(a)`; `a.courier = { miles, quote, markup, cents, state }` (amounts 0 unless `ready`) · `sendPriceChange(id, lines, { note = '' } = {})` — from `fitting`, or REVISE on `price-change` while `priceChange.state` is `pending|messaged` (status unchanged, state → `pending`, `revisions + 1`, thread "<Tailor> changed the updated price" / "You changed the updated price"); `note` trimmed, `note-long` over `NOTE_MAX`, stored masked (`priceChange.note`, `.noteMasked`); marks always vs the booked lines · `leaveReview` → `text-long` over `TEXT_MAX`, stored text masked, photos limit from `REVIEW_LIMITS`.
- `state.js` selectors (DOM-free, exported, not on `T`): `returnOffer(appt) → string[]` (RETURN_LABEL order) · `priceChangeView(appt, lines = appt.priceChange?.lines ?? appt.lines) → { garments: [{ id, type, rows: [{ key, label, kind: 'same'|'added'|'repriced'|'removed', from, to }] }], before (= appt.money), after (quote, deposit unchanged, + rushDays), delta, note, noteMasked, sentAt, state, revisions }`.
- `focus.js`: `statusWord(appt, persona, { short = false } = {}) → { pill, label }` — the §B2 table for every status (M3 words unchanged); `pill` is a `statusPill` key.
- `fixtures/money-scenarios.js`: `SCENARIOS.priceRepriced` (Sleeves +$5 only) · `SCENARIOS.courierQuote` (= `courierQuote(0.6)`). `fixtures/common.js`: `PRICE_NOTES { added, removed, repriced }` (copy only); `driveTo('price-change' …)` sends `PRICE_NOTES[recipe]` as the note.
- Components (`components.js`, CSS `components-v5.css`, gallery blocks in `sys-components`):
  `statusPill('action', label = 'Your move')` — generic accent-filled `pill--action` (D-95 whose-move tone).
  `changeList({ garments, format = fmtExact })` — `garments` = `priceChangeView().garments`; per garment a `.t-body w-600` type + `role="list"` rows (`role="listitem"`, ≥ 44 px, `data-money`, `data-kind`): `same` · `added` (accent-bg tint + "Added" tag) · `repriced` (old amount `<s>` neutral-500 with sr-only "was", "New price" tag) · `removed` (label + amount struck, "Removed" tag). Tags are sentence case (D-111).
  `deltaFigure({ label, cents, was = null, caption = '' })` — caps label, `.t-display` `fmtExact` amount, "Was $X · up $Y" / "down $Y" in words, "Same as booked" when unchanged (R4-2-T-08; none when `was` is null), optional caption; `data-money`.
  `courierCard({ state = 'ready'|'loading'|'failed', quote, markup, cents, miles, from, to, note, retryAct = 'courier-retry' })` — truck head + "<miles> mi · from → to"; ready = Uber quote / Taily courier fee / Courier total + `note`; loading = skeleton + `aria-live` "Getting a price from Uber…"; failed = `role="alert"` + secondary `[data-act=retryAct]` "Try again".
- Review round 2 (D-116…D-118): `state.js` `returnAddress()` (street + unit, the one drop-off / courier address line on both sides) · `payBalance` records `payments.balance.failedCardId` on a decline · a customer `sendMessage` marks a pending price change `messaged` (opening the chat does not) · `focus.js` `sinceText(appt)` ("since 5:00 PM" / "since Thu, Oct 15", both personas' In progress rows) · `statusWord` short form of every waiting case is "Waiting" · `sheetOverlay` ignores ✕ / scrim / Escape while `holder.dataset.locked === 'true'`.

## K-01 additions (edit the job at the fitting → final order; spec `docs/v5/K01-spec.md`, D-120…D-125)

- `state.js`: `confirmNoChange` is GONE — nothing moves `fitting → in-progress` except `approvePriceChange`. `sendPriceChange(id, lines, { note })` is "send the final order": `lines` = the whole order `[{ garmentId, garmentType, serviceId, label, cents }]`; a new item = lines on a `garmentId` not booked (`n1`, `n2`, …), removing an item = sending none of its lines; an unchanged order is allowed. Errors: `no-items` `price-invalid` (whole dollars $1–`PRICE_MAX`) `garment-type` `service-type` `service-not-offered` `duplicate-line` `max-items` `note-long` (+ `not-fitting`). Stores `priceChange.changed` (false when nothing moved — the one flag for "approved your changes" vs "approved the order"). `approvePriceChange` also rebuilds `a.job.garments` from the approved lines (booked order, then new items `{ …, photos: 0, added: true }`). Thread lines: "<Tailor> sent your final order" / "You sent the final order" (revise: "updated"), "You approved the order" / "<Customer> approved the order".
- `priceChangeView` adds `garments[i].kind` (`same` `changed` `added` `removed`), `changed`, `counts { itemsAdded itemsRemoved servicesAdded servicesRemoved repriced }`.
- `focus.js statusWord`: customer on `price-change` = `action` "Approve order" (short "Approve"). c-bookings step "Final order", t-home step "Order sent".
- `fixtures`: `SCENARIOS.priceItem` (− Take in jacket sides, + Pants / Jeans · Hem pants) · `SCENARIOS.priceItemRemoved` (− the Suit Pant). `driveTo` price recipes `item` `item-removed` `unchanged`; targets past `price-change` without a `priceChange` option send the unchanged order and approve it, so every in-progress / ready / … seed has `priceChange = { changed: false, state: 'approved' }`. `PRICE_NOTES` gains `item` `item-removed` `unchanged`.
- Components: `changeList` row `added` = "New" (the accent tag, D-202: accent-bg ground, accent-ink text, no green tint; a changed price is not a success); garment `kind: 'added'` = a light accent wash + "New item" tag (same accent tag) with plain rows; `kind: 'removed'` = struck type + "Removed" tag, struck rows. `changeSummary(counts)` = the one-line "1 item added · 1 service removed" / "No changes. Same items, same price as booked."
- t-adjust draft: `state.ui['t-adjust'] = { apptId, mode: 'new'|'revise', prices, removed, added, items, removedItems, note, tried, seq }`, always against the BOOKED order; `mode: 'revise'` with no other fields seeds itself from the sent order. t-job gates every "price updated" claim on `priceChange.changed && state === 'approved'`.

## M5 components (messaging, accounts, earnings, system; spec `docs/v5/M5-spec.md` §A8–A9, D-128…D-143)

- `threadMessages(messages, { reader: 'customer'|'tailor', now, failed = [], sending = null, peer = '' })` — the ONE message list both thread screens render: `<div class="thread" aria-live="polite">`; day dividers ("Today" when `isoDay(at) === isoDay(now)`, else `fmtDay`), system lines in the reader's wording (`text` / `tailorText ?? text`) + time, `chatBubble` me/them by reader, then the `sending` bubble and each `failed[i]` (`{ text, photos, masked, id }`, Retry carries `data-id`). `peer` (optional first name) → photo label "Photo from <peer>" (own: "Your photo").
- `threadHead({ initials, photo, name, sub })` — inner HTML for `headingRow` (`.thread-head`: 40 px avatar, name, `sub` HTML, may hold a `countdown`). `threadContext({ pill, pillLabel, title, sub, act, id })` — the context row (≥ 56 px; pill + visit time, sub, chevron); `<button data-act data-id>` when `act` is set, else a static div; `title` / `sub` are plain text. `threadRow({ id, act = 'open-thread', name, initials, photo, preview, time, unread = 0, pill, pillLabel, closed = false })` — 72 px Messages row (`<button data-act data-id>`); unread bolds name + preview and shows a count badge with sr-only "n unread"; `closed` → calm "Closed" pill. Wrap rows in `<div class="thread-list">` (one white card, inset separators).
- `openAttachSheet({ count, max = CHAT_LIMITS.PHOTOS_MAX }, onAdd)` — "Add a photo" sheet (dataS `attach`), rows `[data-act="photo-camera"]` / `photo-library`; either calls `onAdd()` then closes.
- `cardFields({ values, errors })` + `CARD_ERRORS` — `#cc-number #cc-exp #cc-csc #cc-zip` (lifted from c-pay; any truthy `errors.number|exp|cvc|zip` prints that field's copy under it). Markup only: the host owns the form, the note and the Save button.
- `skeleton({ kind })` + `'thread-row'` `'payout'`. `chatBubble({ …, id, photoLabel })` (Retry = `<button data-act="retry" data-id>`; photos = one 64 px tile row as a `[data-act="view-photo"]` button, opened by `wirePhotoViewer`; `[phone hidden]` / `[email hidden]` print as a masked-token pill). `composer({ value, disabled, placeholder, hint, photos, max })` — `hint` = live `#composer-hint` (aria-live, always in the DOM, empty = zero height) + `aria-describedby`; `photos` = 64 px tray with 44 px `[data-act="remove-attachment"][data-index]`; Send on when text OR a photo; camera disabled at `max`; form `data-photos`. `wireComposer(root, onSend)` submits when text or `form.dataset.photos > 0` (`onSend('')` for a photo-only message). `readOnlyBanner({ …, secondaryLabel, secondaryAct })` · `listRow({ …, attrs })` (extra attributes on the button, e.g. `data-id="home"`) · `tailorBreakdown(q, { feeAfterServices, feeCaption })` (fee row directly under Services with the caption; t-payout only).
- Glyph exports: `ICON_LOCK ICON_CLOSE ICON_IMAGE ICON_BELL ICON_WIFI_OFF`. Limit read through `DATA.CHAT_LIMITS?.PHOTOS_MAX ?? 3` until the model builder's `CHAT_LIMITS` lands in `data.js`.
- `js/system.js`: `SYSTEM_EXEMPT` (the pre-session screens + sys-index / sys-components); `systemBanner(s)` → `<div class="sys-banner" data-sys="offline">` (pinned absolute under the top bar, 390 wide; `#screen.has-sys-banner .body` grows by `--sys-banner-h`) or `''`; `wireSystem(root, screenId, { go })` — toggles `has-sys-banner` + measures the banner, `[data-act="sys-retry"]` → "Checking…" → `sim.network = 'online'` → `go(screenId, { replace: true })` → success toast; an expired session on a non-exempt screen → `openReauth(state.persona, { go, screenId })`; `openReauth(who, { go, screenId })` — locked sheet (dataS `sys-reauth`, `holder.dataset.locked`, ✕ hidden), texts a code once (`state.ui.reauth`), `#reauth-code`, `reauth-verify` / `reauth-resend` / `reauth-sign-out`; verify → `sim.session = 'valid'` → toast "You’re signed in" → `go(screenId, { replace: true })`; sign out → `t-phone` / `c-welcome` (`fresh`); `openPushPrompt({ title, body }, { onDone })` — `modalOverlay` dataS `sys-push`, `role="alertdialog"`, `push-on` (→ `sim.push = 'granted'` + toast) / `push-later`, Escape and scrim (→ `'denied'`); `onDone()` runs after either, before the toast. Gallery blocks: `sys-components` "M5 · messaging, accounts, earnings, system".

## M5 model (spec `docs/v5/M5-spec.md` §A1–A7, D-128…D-146)

- `state.sim` adds `payout` (`'ok'|'failed'`) and `server` (`'ok'|'error'`, one-shot). `sim.send = 'fail'` is ONE-SHOT (the next send fails, then `'ok'`); `sim.network = 'offline'` fails every send (`offline`) until online. `sendMessage` error order: `unknown-tailor read-only empty too-many-photos offline send-failed`. `requestBooking` fails once with `server-error` (nothing authorized) when `sim.server = 'error'`.
- Threads: `thread.read = { customer, tailor }` (highest message number seen; `m12` → 12). `markThreadRead(tailorId, reader)` (also on `T`); a send marks the thread read for the sender. Selectors (exported, not on `T`): `threadAppt(tailorId)` (D-129) · `unreadCount(tailorId, reader)` · `threadPreview(msg, reader)` · `threadsFor(reader) → [{ tailorId, thread, last, unread, appt, readOnly }]`. `tailor-data.js` `threadCustomerName()` ("Sarah C." until ANY appointment of the pair was accepted).
- Payouts (`state.payouts` rows: `{ apptId, cents, state: 'pending'|'paid'|'failed', date, kind, createdAt, retried?, bank?, last4? }`): `dates.js` `payoutDay(iso)` · `T.settlePayouts()` → `{ ok, paid, failed }` (the weekly run; clock moves never call it; snapshots the bank) · `setPayouts` re-queues failed payouts (`requeued`, `requeuedCents`, `retried: true`) · `tailor-data.js` `payoutsView() → { next, failed, history, paidTotal }` and `payoutDetail(apptId) → { payout, appt, view }`.
- `data.js`: `CHAT_LIMITS { PHOTOS_MAX 3 }` · `ADDRESS_LABELS` · `PAYOUT_KIND_LABEL` · `CUSTOMER.addresses` (`customer.address` mirrors the default or is `null`; `newJob()` copes with `null`).
- `account.js`: `addAddress removeAddress restoreAddress setDefaultAddress setDefaultCard removeCard cardInUse reauth expireSession` (shapes in M5-spec §A6; `removeAddress` → `{ ok, removed, index, newDefault: id | null }`).
- Fixtures: `common.js` `CHAT` (thread copy), `askAmara({ reply })`, `driveTo(target, { ask })`, `completeJob(id, { returnOption })`, `earningsTo('pending'|'paid'|'failed'|'kept')`; `money-scenarios.js` `PAYOUT_DAYS { first, second }`.
- Router: `render()` inserts `systemBanner(state)` and calls `wireSystem(el, id, { go: render })` on every screen (D-146); `SCREEN_MODULES` lists the 8 M5 screens. `js/inventory.js` `BUILT` includes M5; the "System-wide patterns" rows of SCREENS.md are states of their host screens (`gen-inventory.mjs` skips that table as screens).
- Journeys J7 (courier), J8 (review on the profile), J9 (one thread, masked both sides) in `scripts/v5/journeys.mjs`.

## K-02 additions — document the fitting, garment icons (spec `docs/v5/K02-spec.md`, D-175…D-183)

- `data.js`: `FITTING_LIMITS { PHOTOS_MAX 4, COMMENT_MAX 200 }` · `DOC_KINDS ['before','pinned']` · `DOC_LABEL`.
- State: `a.docs` (the tailor's WORKING docs, `{ [garmentId]: { before: Photo[], pinned: Photo[], comment, commentMasked } }`, ids `g…` booked or `n…` draft new item), `a.docSeq`, `a.priceChange.docs` (the SENT snapshot, written by `sendPriceChange` for exactly the sent garments; the only thing the customer ever sees). `Photo = { id: 'p<k>', kind, at, tone: (k-1) % 4 }`.
- Transitions (on `T`): `addFittingPhoto(id, gid, kind)` → `{ photo }` (`not-editable · unknown-garment · photo-kind · too-many-photos`) · `removeFittingPhoto(id, gid, photoId)` → `{ photo, index }` (`not-editable · not-found`) · `restoreFittingPhoto(id, gid, photo, index)` (`… duplicate`) · `setFittingComment(id, gid, text)` → `{ masked }` (`comment-long`, stored masked). Editable while `status === 'fitting'` or the sent order is `pending|messaged`; locked after approval.
- `sendPriceChange` error order: `not-fitting · no-items · price-invalid · garment-type · service-type · service-not-offered · duplicate-line · max-items · photos-missing · note-long`. `photos-missing` carries `missing: [{ garmentId, before, pinned }]` (true = that kind is missing) for every garment in `lines`; removed garments are exempt, the comment is optional.
- Selectors (exported from `state.js`, not on `T`): `docsEditable docGarment docsOf(appt, gid, { sent }) docsFor(appt, 'customer'|'tailor') docsMissing(appt, ids) docsDiffer(appt, ids) nextItemId(appt)`. `requestView(appt).garments[i].docs`.
- Components (`components.js`, CSS in `components-v5.css`): `garmentIcon(type, { size: 'card'|'row'|'inline', alt })` (the ONE helper; hanger fallback) · `docPhoto(photo, { type, size })` · `docsEditor({ garmentId, type, docs, missing, commentDraft, commentError, busy, first })` · `garmentDocs({ garmentId, type, docs, commentLabel, idPrefix, tab })` (read-only Before | Pinned tabs, `[data-docs]`) · `openDocsViewer({ … editable, onRemove(photo, { garmentId, kind, index }) })` · `wireGarmentDocs(root, { lookup(gid) → { type, docs }, by, editable, onRemove })` · `changeList({ docs, commentLabel })` and `workList(v, { docs, commentLabel })` (both now lead every garment head with the icon; `workList` docs ids use prefix `work`). Icons: `ICON_HANGER ICON_PIN` (`icons.js`).
- Screens: t-adjust draft adds `comments` / `commentErrors` (open editors only; photos and saved comments live on the appointment); Send is off while any live garment lacks a photo kind (bar note "Add before and pinned photos for n item(s)."). t-job passes `docs: true` everywhere "The work" renders and adds "The work" to the completed job; c-price-change / c-booking show `a.priceChange.docs`.
- Fixtures: `common.js` `FITTING_COMMENTS`, `documentFitting(id, { lines, level: 'min'|'full' })`, `driveTo(target, { docs: 'none'|'min'|'full' })` (default `'none'` at the fitting, `'min'` past it; `completeJob` documents first); `S.documentFitting` on the flows toolkit. Journeys J6 / J6b walk the photo steps (helper `press(sel)`).

## M7 foundation (polish, K-03; spec `docs/v5/M7-spec.md` §A, D-186…D-199)

- **Tokens** (`tokens.css` "M7" block): `--rhythm-tight/group/block/section/major` (8/12/24/32/40; `--space-2` for 2 px text-group gaps; D-228) · `--text-footnote` · `--status-{action,pending,progress,done,stop,calm}` (+ `-ink`, action `-halo`) · `--card-bg/ring`, `--hairline` · `--avatar-bg/ink/ring` · `--stitch-*` · `--ease-out/in-out` · `--dur-press/sheet-in/sheet-out/modal` · `--press-scale`. `--info*` and `--media-placeholder` stay defined but NOTHING may use them (no blue; photo stubs). `base.css`: `.t-figure` (sans 24/600 hero fact); `.c-info` is now accent-ink.
- **Type roles**: serif only for the page `h1`, sheet / modal titles, `.t-display` hero money (and `.t-h2` money). Section headings = `sectionHead()` (`h2.t-caps.c-600`), hero facts = `.t-figure`. Footnotes / captions `.c-600` (never `.c-500` / `.c-400` text).
- **Layout utilities** (`components-v5.css`): `.card` (the ONE container: white + chalk ring + 16, only for interactive groups; `.card--list`), `.info-block`, `.sec` (+ `.sec--first`), `.sec__body`, `.sec-head`, `.page-actions`, `.page-actions__links`, `.tabular`. A group = `<section class="sec" aria-labelledby>` with `sectionHead(title, { id })`. Reference content (prices, visit rows, breakdowns, timelines, reviews, terms) is flat; `infoCard()` is now flat (`.info-block`, caps heading); `.info-card` the class is legacy white only (gallery, `to-where`, `c-pay__hold`, `c-tailor__sec` until their cluster builders migrate).
- **Nav**: `topNav(active, items, { badges })` = logo + four 44 x 44 icon links (`NAV_ICONS` in `icons.js`: home bookings messages account shop earnings; label = `aria-label` + `title`; dot `.top-nav__dot` + sr-only count when badge > 0; active = ink, 1.75 stroke, 16 px accent stitch via `::after`). `data-nav` unchanged. **No bottom tab bar** (web app).
- **Booking flow bar**: `flowBar({ step, total = 5, back = true, exitAct = 'exit-booking', exitLabel, busy })` — status bar + 56 px bar (Back · compact "n of 5" stepper · ✕ Leave booking). Replaces `chrome()` + `bookingSteps()` on c-where / c-tailors / c-tailor (booking context) / c-book / c-pay (`step` is 0-based: 1 2 2 3 4 as `bookingSteps` today). c-job keeps `chrome('home')` + `bookingSteps(0)`. The heading drops its Back (`headingRow(h, { back: false })`). **`app.js` handles `[data-act="exit-booking"]` globally** (→ `c-job`, draft job kept, no confirm): screens do NOT wire it; a disabled (`busy`) ✕ never fires. The sys banner mounts after `.flow-bar` as it does after `.top-nav`. Onboarding keeps `onboardingHeader()` (no nav).
- **Components (new)**: `sectionHead(title, { id, count, aside })` · `textLink(label, { act, tone: default|danger|muted, icon, attrs, disabled })` (`.text-link`, 44 px) · `stitchDivider()` (`hr.stitch`) · `verifiedMark({ inert })` + `openVerifiedSheet()` + `verifiedSheetHtml()` · `ratingLine({ avg, count, anchor })` · `infoButton(key, { label, first })` + `openInfoSheet(key, ctx)` + `infoSheetHtml(key, ctx)` + `INFO_KEYS` (`pricing deposit fitting fee payouts privacy`, copy in `INFO`) · `moreMenu({ label, act })` + `openMoreMenu(items: [{ label, act, sub, tone }], { title })` (choosing a row closes the sheet and presses `[data-act=act]` on the screen) · `photoStub({ type, tone, size: thumb|tile|stage|fill, kind, alt, seed })` · exports `NAV_ICONS ICON_INFO ICON_VERIFIED ICON_MORE ICON_CHAT ICON_DIRECTIONS ICON_CALENDAR`.
- **Wired globally in `app.js` render** (screens never wire them): `wireInfo(root)` (`[data-info]`, reads `data-first`), `wireVerified(root)` (`[data-act="verified"]`), `a[data-anchor]` smooth-scroll (ratingLine anchor), `exit-booking`.
- **Components (changed, signatures backward-compatible)**: `statusPill(status, label)` renders `span.status.status--{tone}` (dot + word; tones `action pending progress done stop calm`; new keys `bookable` `paused`; `.pill*` CSS deleted) · `avatar` = tinted circle (`photo: true` = same circle, initials or camera) · `actionBar({ …, softDisabled })` — secondary + tertiary are `.action-bar__links` text links (same `data-act`s; `tertiaryTone: 'danger'` = red link; `.cta--secondary-danger` / `.action-bar__row` gone) · `cta(…, { softDisabled })` (looks disabled, `aria-disabled`, NO `disabled` attr) · `emptyState({ …, art })` (`art` = a garment type; secondary = text link; title `.t-title`) · `moneyRows` flat, one `.stitch` directly above the first `kind: 'total'` (so every breakdown carries exactly one) · `visitBlock(rows, { title, flush, action })` = `sectionHead(title, { aside: action })` + flat rows (title is now CAPS; put the visit time in the first row as `.t-figure`) · `tailorRow` = `.card`, inert Verified on the meta line · `requestCard({ …, garment })` (`.card`, visit / place on two lines, place `·` → thin space, optional 24 px garment icon before "n items · n services") · `threadContext` `.card` · `statusHero` `rowLabel/rowValue` = caps label + `.t-figure` · `privacyNote` / composer hint use `ICON_INFO` · `rushLadder` = flat two-column rows ("Ready within 1 day" … "+$40", last "4+ days" "No rush fee") · `changeSummary` one part per line from three parts · `readOnlyBanner` secondary = text link · `docPhoto` = wrapper of `photoStub` · `photoTile('photo', { type, tone, removable })` = a stub (host sizes `.photo-tile`) · `chatBubble / threadMessages / composer` take `photoType` (the garment on the chat photo stubs) · `openPhotoViewer({ title, count, type })` (the trigger's `data-garment` / `data-type` supplies `type`) · `reviewRow({ …, photoType })` · `docsEditor({ …, tried })` — pristine = quiet "Required" (`[data-missing-msg]`), `tried` = error line + red camera ring (`data-tried`) · `garmentIcon` size `hero` 96. (`ratingSummary` and `.rating-summary*` were deleted in K-04.)
- **Motion**: ONE press rule (`:active` scale `--press-scale`, `--dur-press`) for every tappable surface (list in `components-v5.css` "press"); sheets 280 ms in / 200 ms out, modals 220 ms from `translateY(8px) scale(0.98)`; reduced motion / `html.is-test` drop transforms, keep ≤ 150 ms opacity / colour. No `transition: all`.
- **Gallery**: `sys-components` "M7 · polish" blocks (nav icons, flowBar, avatar, sectionHead, `.t-figure`, textLink, actionBar links + softDisabled, moreMenu, stitch in a breakdown, verified, info sheet, photoStub, emptyState art, docsEditor pristine vs tried).

## K-04 additions (B1 · shared layout, components, system; D-203…D-213)

- **Heading**: `headingRow(inner, { back = true, status = '', trailing = '', sticky = false, whole = false })` → `.heading-lead` (status / eyebrow) · `.heading-row` (Back + `.heading-row__body` h1, `.heading-row__trail`) · `.heading-after` · notes. `.body` padding-top is `var(--body-top)` (116). The booking flow bar and onboarding bar keep their own Back (D-205).
- **Item row**: `garmentHead({ type, kind, tag, photos, trailing, as })` (K-05 / D-220: bare 40 px icon → name underlined → tag … stack / control; a removed name is struck, not underlined) used by `changeList`, `workList`, t-adjust and c-job. `photoStack({ garmentId, type, source: 'fitting'|'customer', count, photos, owner })` = up to 3 overlapping 32 px stubs + "n photos", one button `[data-act="view-photos"][data-source]`; `withPhotos(garments, job)` maps the customer's counts onto `changeList` garments; `changeList({ …, photoOwner })`; `garmentDocs` is the comment only. `wireGarmentDocs` opens the fitting stack, `wirePhotoViewer` the customer stack.
- **Compact stepper** reads "Step n of 5 · name" above the track (flow bar and c-job). Disabled CTAs are flat neutral-200; busy CTAs are `aria-disabled` + `aria-busy` (no `disabled`; `app.js` swallows clicks on them). Toggle off = outlined white track + grey knob.
- **Router** (`app.js`): same-screen focus restore (`pendingFocus`), lazy screens (`loadScreen`, `registered()` = known ∪ loaded), `loadTools()` loads `flows.js` + fixtures + `flow-menu.js` on `?flow=` / `?screen=` / `?test=1` / first input; `Taily.runFlow` is a lazy wrapper; `Taily.flows` fills in on load. sys-components imports the gallery with top-level `await`.
- **Copy + glossary (B2–B4, D-209…D-217)**: customer side = request / booking / order / items and services; tailor side = request / job / the work; "job" never appears on a customer screen. Deposit ownership is always named ("Amara keeps the $16.00 deposit", never "the deposit is kept"); rush is "Need-by N days after the visit" everywhere customers read it (only the t-rush editor says "Ready within"); the word "turnaround" is gone; a masked account reads "Visa •••• 4242" (four dots); the confirmed pill says "Confirmed" on both sides. One `·` per line (K-03 wins over report proposals, D-210).
- **Tokens + lint (B1, B5)**: `--body-top`, `--shadow-float`, `--shadow-overlay`, `--hairline` replaces `--bottom-border` (deleted); `--ease-drawer`, `--size-8` and `--size-18` are deleted; base semantic colours (`--neutral-500`, `--success`, `--error`, `--warning`, `--accent-base`) never set text (use the `-ink` twins). `.t-*` line-heights are unitless (`calc(34 / 28)`, … so 1× renders as before). `scripts/v5/lint.mjs` rules 7–8 fail a base glyph colour as a text colour (chevron / icon / glyph / star / close selectors are exempt) and any `--bottom-border` in v5 CSS.
