# M4 — Fitting → completion spec (build instructions)

Oct 13, 2026 · spec writer / design director (Opus) · branch `V5`. Builders read **§0 + §A (signatures only) + §B + their
cluster** + `docs/v5/CONTEXT.md`. Calls this spec had to make are **D-99…D-110** in `DECISIONS.md`, cited inline. Money copy is
always dollar amounts from `js/money.js` on `appt.money` / `priceChangeView()` / `SCENARIOS` (`fmtExact` everywhere on these
screens — every M4 screen carries an exact breakdown, so one precision per screen, D-98 · `fmtNeg` for the Taily fee), never
percentages, never a typed amount (fixtures derive from `SCENARIOS` / `AMARA.prices`).

**Order:** (1) Model + component builder §A (serial) → (2) four screen builders, clusters §C1–§C4, in parallel → (3)
Integrator §D (registrations, SCREENS.md + inventory keys, journeys J6–J8, CONTEXT.md).

**M4 done when:** `npm run check` green (incl. journeys J1–J8); every M4 key in `js/inventory.js` has a FLOWS entry; by hand
with normal latency: Amara starts the fitting → removes "Take in jacket sides" → sends → Sarah sees the same rows marked
"Removed", the new total and the unchanged **$16.00** deposit → Approves → Amara marks ready (all three ways back) → Sarah picks
Taily courier ($9.50 + $0.95 = $10.45), pays → both sides show the courier → Amara marks completed (payout + Friday date) →
Sarah leaves 5 stars → c-tailor shows "Sarah C." first and the count +1.

---

## 0. Direction (applies to every M4 screen)

**Who — the same two people, the second half of the ticket.**
- **Amara**, at Sarah's door or her bench, pins in her mouth. She needs to *tell Sarah the real price before she cuts, then
  move the job along* — one thumb, one obvious next step, and always "what I take home" in dollars.
- **Sarah**, at work, gets "Amara updated the price". She needs to *see exactly what changed and what it costs her*, say
  yes or ask, and later *get her clothes back the way that suits her* and pay once, knowing the number before she taps.

**Feel:** the ticket travels through the shop. It gets a pencilled correction (price change, with the old figure struck
through, never erased), a "ready" tag, a hand-off, a paid stamp. Calm, exact, nothing hidden: the deposit line never moves,
the courier is three honest numbers, and Amara never sees a charge that isn't hers.

**Signature — "the same ticket on both sides" (continued).** The price-change rows (`changeList`), the return card and the
receipt lines are printed from the SAME data with the SAME strings on both personas: the service labels and line amounts, the
visit time `fmtWhen(slot.start)`, Sarah's new total (Amara sees "Sarah sees a new total of $X"), the courier's three numbers,
the status word (§B2). Reviewers flip persona on any state to check. **The correction mark** is M4's visual signature: an
amended price shows the old amount struck through in `--neutral-500` before the new one, plus a text tag ("Added", "New
price", "Removed") — never colour alone.

- **One focal element per screen** (named per screen), winning by size (`.t-display` 32 for the one money figure that
  matters on that screen) or the ink fill. Never two filled CTAs. Destructive confirms are not needed in M4 (no cancel paths).
- **Type:** `.t-display` 32 (one figure per screen: new total / take-home / payout) · `.t-title` 28 screen title · `.t-h2` 24
  section heads and the visit time · `.t-body` 16 · `.t-small` 12 · `.t-caps` 12. Hierarchy by weight + colour first (600 ink
  / 500 neutral-700 / 400 neutral-600). Money, times `tabular-nums`. Typographic apostrophes (’) in copy; FLOWS `expect`
  strings avoid apostrophes.
- **Layout:** 390 wide, `--neutral-50`, sides 20, `.body` padding-top 128; a sticky `actionBar` makes the body
  `.body--with-bar`. Rhythm 8 inside a group, 24 between groups, 32 before a section head. Cards white, `--radius-lg`,
  `box-shadow: inset 0 0 0 1px var(--neutral-200)`. Every target ≥ 44 (stars, remove / undo buttons, photo tiles, option rows).
- **Which appointment (D-72):** detail screens read `focusAppt(ID)`; navigators call `setFocus(a.id)` first; `wire` calls
  `redirectIfMoved(ID, go)`. `t-adjust` and `c-review` are not `statusScreen` targets — their data rule is in their section.
- **Async:** Start fitting, No changes, Send price, Approve, Mark ready, courier quote, Pay, Mark completed, Post review all go
  through `withLatency` (CTA busy + verb, inputs locked, `aria-busy`); `?test=1` → instant.
- **Results speak twice:** the screen shows the new state (hero + money) AND a short toast confirms it. Never only a toast.
- **Money honesty:** Sarah always sees the deposit **Paid · stays the same**, the balance and when it's due, and the courier
  as quote + fee = total. Amara always sees "You take home $X" with the Taily fee in dollars; the courier is never her money.
- **Progressive disclosure:** the add-service list, the mark-ready options and the pay methods live in sheets; the review
  text and photos are optional and below the stars.
- `prefers-reduced-motion`: sheets fade, spinners and skeleton shimmer stop.

---

## A. MODEL + COMPONENTS (Component builder — serial, before the screens)

Tokens only, `css/components-v5.css`. Add each new component to `sys-components` (one gallery block per listed state) and
re-accept that baseline. Keep existing signatures (extensions are additive). `scripts/v5/model-test.mjs` gains §A9.
`npm run check` green before handing over.

### A1. `js/data.js`
```js
export const REVIEW_LIMITS = { TEXT_MAX: 500, PHOTOS_MAX: 3 };                       // D-107
export const STAR_WORDS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];        // index = stars
// TAILOR_LIMITS gains NOTE_MAX: 200                                                  // D-101
```

### A2. `js/money.js` (D-100)
`courierQuote(miles) → { miles, quote, markup, cents }` — `quote = cents(COURIER_BASE + COURIER_PER_MILE * miles)`,
`cents = round(quote * (1 + COURIER_MARKUP))` (unchanged value), `markup = cents − quote`. Seed 0.6 mi → 950 / 95 / 1045.

### A3. `js/state.js` — transitions (DOM-free)
- `markReady(id, { returns } = {})` (D-99): `returns` = array of `'pickup'|'dropoff'|'courier'`; default = every key with
  `tailor.returns[k] === true`. Fail `return-required` when empty, `not-offered` when one isn't in the tailor's Shop
  returns. Stores `a.returnOffer` (RETURN_LABEL order). Rest unchanged.
- `chooseReturn(id, option)`: also fail `not-offered` when `option` ∉ `returnOffer(a)`. `a.courier` stores
  `{ miles, quote, markup, cents, state }` (quote / markup 0 unless `state === 'ready'`).
- `sendPriceChange(id, lines, { note = '' } = {})` (D-101): allowed when `status === 'fitting'` (as now) OR `status ===
  'price-change'` with `priceChange.state` `pending|messaged` (revise: status unchanged, `state` → `pending`, `sentAt` now,
  `revisions += 1`, thread line customer "<Tailor> changed the updated price" / tailor "You changed the updated price").
  `note` trimmed, `> TAILOR_LIMITS.NOTE_MAX` → fail `note-long`, stored masked (`maskContact(note).text`, `noteMasked`).
  Marks are always `priceMarks(a.lines, lines)` (the booked lines).
- `leaveReview`: text `> REVIEW_LIMITS.TEXT_MAX` → fail `text-long`; stored text = `maskContact(text).text` (D-107).

### A4. `js/state.js` — selectors (DOM-free, export + add to `T`-free selector list in CONTEXT)
- `returnOffer(appt) → string[]` — `appt.returnOffer ?? keys of tailor.returns that are true`, RETURN_LABEL order.
- `priceChangeView(appt, lines = appt.priceChange?.lines ?? appt.lines) →`
  `{ garments: [{ id, type, rows: [{ key, label, kind: 'same'|'added'|'repriced'|'removed', from, to }] }], before, after,
  delta, note, noteMasked, sentAt, state, revisions }` — rows per garment in booked order, added rows last in their garment;
  `label` = `SERVICES[serviceId].label`; `from`/`to` cents (null where absent); `before = appt.money` (booked quote);
  `after = quote({ lines, homeFee: m.homeFee, rush: m.rush, deposit: appt.payments.deposit.cents })` (+ `rushDays`);
  `delta = after.total − before.total`. Works for a draft (t-adjust passes its lines) and for the pending change.

### A5. `js/focus.js` — `statusWord(appt, persona, { short = false } = {}) → { pill, label }` (D-108)
The §B2 table for every status (M3 words unchanged, M4 rows added). Lists pass `short: true`. Callers keep their own M3
logic if they like; every M4 status MUST come from here.

### A6. `js/fixtures/common.js` + `money-scenarios.js`
- `driveTo('price-change' …)` passes a note per recipe (copy, not money): added → `'The sleeve lining has to move too, and
  tapering the legs will sit better with the shorter jacket.'` · removed → `'Once the sleeves are done the jacket sides
  already fit, so I took that off.'` · repriced → `'The sleeve lining has to move too.'` Export `PRICE_NOTES` (that map).
- `SCENARIOS` gains `priceRepriced` (Sleeves +$5 only, same `repriced()` helper) and `courierQuote: courierQuote(0.6)`.
  Reference values (never typed in fixtures): priceAdded services $170.00 · total $205.00 · balance $189.00 · fee −$17.00 ·
  payout $188.00; priceRemoved $70.00 · $105.00 · $89.00 · −$7.00 · $98.00; priceRepriced $130.00 · $165.00 · $149.00 ·
  −$13.00 · $152.00; courier $9.50 + $0.95 = $10.45, balance with courier $154.45; seed payout $147.50.

### A7. Components (`js/components.js`) — NEW + extensions
1. **`statusPill('action', label)`** — extend `PILL_VARIANTS` with `'action': { cls: 'pill--action', icon: 'new_request',
   label: 'Your move' }` (the D-95 accent fill, generic).
2. **`changeList({ garments, format = fmtExact })`** — NEW (the correction mark). `garments` = `priceChangeView().garments`.
   Per garment: `.t-body w-600` type, then one row per entry, `data-money`, min-height 44, padding 12 0, hairline between:
   - `same` → label (t-body c-700) · amount (t-body, tabular).
   - `added` → row tint `--accent-bg` (radius-sm, inset padding 12), label t-body w-600 + tag `Added` (t-caps 10/600
     `--accent-ink`) · amount t-body w-600.
   - `repriced` → label + tag `New price` · right: `<s class="change-list__was">$45.00</s>` (t-small `--neutral-500`,
     `<span class="sr-only">was</span>`) then the new amount t-body w-600.
   - `removed` → label `<s>` c-600 + tag `Removed` (`--neutral-600`) · amount `<s>` c-500 (`sr-only` "removed, was").
   `role="list"` / rows `role="listitem"`. States: same · added · repriced · removed (one gallery block with all four).
3. **`deltaFigure({ label, cents, was = null, caption = '' })`** — NEW. t-caps c-600 `label` · `.t-display` tabular
   `fmtExact(cents)` (`data-money`) · t-small c-700 `Was ${fmtExact(was)} · up ${fmtExact(d)}` / `· down ${fmtExact(-d)}` /
   `· no change` (words, not only a sign) · optional t-small c-600 caption. States: up · down · no `was`.
4. **`courierCard({ state = 'ready'|'loading'|'failed', quote = 0, markup = 0, cents = 0, miles = 0, from = '', to = '',
   note = '', retryAct = 'courier-retry' })`** — NEW. White card, inset neutral-200, padding 16, `metaRow('', 'Taily courier',
   { icon: 'truck' })` head + t-small c-600 `${miles} mi · ${from} → ${to}`:
   - `ready` → `moneyRows([{ label: 'Uber quote', cents: quote }, { label: 'Taily courier fee', cents: markup }, { label:
     'Courier total', cents, kind: 'total' }])` + t-small c-600 `note`.
   - `loading` → `skeleton({ kind: 'line', count: 3 })` + t-small c-600 "Getting a price from Uber…" in `aria-live="polite"`.
   - `failed` → t-body w-600 "Couldn’t get a courier price" · t-small c-600 "Uber didn’t answer. Try again, or pick another
     way back." · `cta('Try again', { variant: 'secondary', attrs: \`data-act="${retryAct}"\` })`. `role="alert"` on the text.
   States: ready (customer note) · ready (tailor note) · loading · failed.

### A8. CSS
`.change-list*`, `.delta-figure*`, `.courier-card*` in `components-v5.css`, tokens only; tag letter-spacing per `.t-caps`.

### A9. Model test additions
`markReady(id, { returns: ['pickup'] })` → `returnOffer` = `['pickup']`, then `chooseReturn(id, 'courier')` → `not-offered`;
`markReady(id, { returns: [] })` → `return-required`; `courierQuote(0.6)` → quote + markup === cents === 1045 (via
`SCENARIOS.courierQuote`); `priceChangeView(driveTo('price-change'))` has one `added` (taper) and one `repriced` (sleeves)
row and `after.total === SCENARIOS.priceAdded.total`, `after.deposit === SCENARIOS.seed.deposit`; removed recipe → one
`removed` row, `after.balance === SCENARIOS.priceRemoved.balance`; revise: on `price-change` + `messageAboutPriceChange`,
`sendPriceChange(id, removedLines, { note: 'call 718 555 0100' })` → ok, state `pending`, note masked, marks vs booked
lines; `sendPriceChange` from `in-progress` → `not-fitting`; `leaveReview` text with an email → stored masked; 501-char text
→ `text-long`; `payoutOf(driveTo('completed'))` = `{ cents: SCENARIOS.seed.payout, state: 'pending', date: '2026-10-16' }`;
`statusWord` returns `{ pill: 'action', label: 'Approve new price' }` for a customer on `price-change`.

---

## B. Shared data + copy (all clusters)

### B1. Seed facts (all derived — never typed into a screen or fixture)
| what | source | prints |
|---|---|---|
| visit / fitting | `fmtWhen(SEED_SLOT)`; `driveTo('fitting')` sets the clock there | Thu, Oct 15 · 5:00 PM |
| booked money | `SCENARIOS.seed` | services $125.00 · home fee $35.00 · total $160.00 · deposit $16.00 · balance $144.00 · fee −$12.50 · payout $147.50 |
| price added | `SCENARIOS.priceAdded` / `priceChangeView` | Shorten sleeves ~~$45.00~~ $50.00 · Taper legs $40.00 Added · total $205.00, up $45.00 · balance $189.00 · payout $188.00 |
| price removed | `SCENARIOS.priceRemoved` | Take in jacket sides ~~$55.00~~ Removed · total $105.00, down $55.00 · balance $89.00 · payout $98.00 |
| courier | `SCENARIOS.courierQuote` · `a.courier` | 0.6 mi · Uber quote $9.50 + Taily courier fee $0.95 = $10.45 |
| payout date | `payoutOf(a).date` after `markCompleted` at the fitting clock | Fri, Oct 16 |
| shop | `tailor.shopName`, `tailor.shop.street` | Reyes Tailoring · 312 Metropolitan Ave |
| Sarah's address | `state.customer.address` | 145 N 7th St, 2R |

### B2. Status words, both perspectives (D-87 + D-108) — from `statusWord(appt, persona, { short })`
| model state | customer pill (detail / list short) | tailor pill (detail / list short) |
|---|---|---|
| fitting | `fitting` "Fitting" | `fitting` "Fitting" |
| price-change · pending | `action` "Approve new price" / "New price" | `waiting` "Waiting on Sarah" |
| price-change · messaged | `action` "Approve new price" / "New price" | `action` "Reply to Sarah" / "Reply" |
| in-progress | `in-progress` "In progress" | `in-progress` "In progress" |
| ready (unpaid) | `action` "Ready" | `waiting` "Waiting on Sarah" |
| returning · pickup | `returning` "Ready for pickup" / "Pickup" | `returning` "Ready for pickup" / "Pickup" |
| returning · dropoff | `returning` "Return scheduled" / "Drop-off" | `action` "To drop off" |
| returning · courier | `returning` "Out for delivery" / "Courier" | `returning` "Courier booked" / "Courier" |
| completed | `completed` "Completed" | `completed` "Completed" |
Names come from data (`firstOf(tailor)`, `state.customer.first`).

### B3. Return options — one copy table for both sides (D-99, D-106)
| option | label (`RETURN_LABEL`) | icon | customer line | tailor line |
|---|---|---|---|---|
| pickup | In-store pickup | `bag` | `${shopName} · ${shop.street} · Free` | `At ${shopName}, ${shop.street}` |
| dropoff | Home drop-off | `home` | `${first} brings it to ${street}, ${unit} · Free` | `You bring it to ${street}, ${unit}` |
| courier | Taily courier | `truck` | `Delivered by Uber today · priced when you pick it` | `${customerFirst} pays the courier. It’s not taken from your payout.` |

### B4. Navigation map
- Tailor: t-home Upcoming row → **t-job** (`setFocus`). t-job: Start fitting → t-job (fitting) · No changes → t-job
  (in-progress) · Adjust price → **t-adjust** (`state.ui['t-adjust'] = { apptId, mode: 'new' }`) → Send → t-job (waiting,
  `{ fresh: true }`) · Change the new price → t-adjust (`mode: 'revise'`) · Message / Reply → t-thread · Mark ready (sheet) →
  t-job (ready) · Mark completed → t-job (completed).
- Customer: Bookings → row → `statusScreen(a)`: price-change → **c-price-change** → Approve → **c-booking** (in-progress,
  `{ fresh: true }`) · Message → c-thread; ready → **c-ready** → Pay → c-booking (returning, `{ fresh: true }`); completed
  (no review) → **c-complete** → star / Leave a review → **c-review** → Post → c-review (submitted) → See profile →
  **c-tailor** · Back to Bookings; completed + reviewed → c-booking (completed).
- Back: c-price-change / c-ready / c-complete → c-bookings; c-review → c-complete (submitted: → c-bookings); t-adjust →
  t-job (dirty → leave modal).

---

## C1. CLUSTER "Price change, both sides" — `t-adjust` (NEW), `c-price-change` (NEW)

### t-adjust — T5 adjust the price after the fitting
- **Purpose:** turn what Amara found at the fitting into a new price Sarah can approve, without leaving her price list.
- **Focal:** the editable lines (the correction marks appear as she edits); the outcome rides in the action bar lead.
- **Data:** `a = getAppt(state.ui['t-adjust']?.apptId) ?? getAppt(state.ui.apptId)` if its status is `fitting` or
  `price-change`, else the newest tailor appt with one of those statuses (else the empty fallback). `d = state.ui['t-adjust']`
  (create `{ apptId: a.id, mode: a.status === 'price-change' ? 'revise' : 'new', prices: {}, removed: [], added: [], note:
  revise ? a.priceChange.note : '', tried: false }` when missing or for another appt). `start = mode === 'revise' ?
  a.priceChange.lines : a.lines`. Draft lines = start (minus `removed`) + `added` (label from `SERVICES`, price from
  `myTailor().prices[id]`), each price overridden by `d.prices[key]` (string, whole dollars). `pv = priceChangeView(a,
  validDraftLines)` (invalid prices fall back to their start cents for the live preview). `changed` = draft differs from
  `start` (any price, add, remove; in revise also the note). Key = `${garmentId}:${serviceId}`.
- **Layout:** `chrome('home', { persona: 'tailor' })` · `headingRow(hero, { backRow: true })`, hero = t-caps c-600 "AFTER THE
  FITTING" · `.t-title` "Adjust the price" (revise: "Change the new price") · t-body c-700 `Change what ${first} pays for
  this job. ${first} approves the new price before you start the work.` · revise only: `banner({ tone: 'info', text:
  \`${first} hasn’t approved yet. Sending again replaces the price ${first} is looking at.\` })` · 24 ·
  per garment (`.t-h2`-less group: t-body w-600 garment type, 8): one **adjust row** per draft line — a 3-column grid
  `label | $ input 96 | 44 button`:
  - label `<label for="price-<garmentId>-<serviceId>">` t-body (the visible field label) + under it the mark: added → tag
    "Added"; repriced vs booked → t-small `<s>was ${fmtExact(from)}</s>` + tag "New price"; unchanged → nothing.
  - input `type="text" inputmode="numeric" autocomplete="off"`, `$` prefix, value = the dollar string, `aria-describedby`
    its error; error → red inset ring + t-small `--error` under the row: `Enter a price.` / `Enter a whole-dollar price up
    to ${fmt(cents(TAILOR_LIMITS.PRICE_MAX))}.` (to-services copy).
  - remove button `data-act="remove-line" data-key="${key}"` (✕ glyph, 44×44, `aria-label="Remove ${label}"`).
  - a removed line stays in place: label `<s>` c-600 + tag "Removed", amount `<s>` c-500, button "Undo" (`data-act="undo-line"`,
    44 tall, t-body w-600).
  - after the rows: `listRow({ title: '+ Add a service', act: 'add-service' })` with `data-garment="${id}"` (the builder adds
    the attribute on the button) — hidden when every service for that garment type in her list is already on it.
  32 · `textArea({ id: 'adjust-note', label: \`Note to ${first} (optional)\`, value: d.note, rows: 3, max:
  TAILOR_LIMITS.NOTE_MAX, helper: 'Say what you found at the fitting. Phone numbers and emails are hidden.' })` · 32 ·
  `.t-h2` "What changes" · two figures side by side (two columns, gap 16): `deltaFigure({ label: \`${first} pays\`, cents:
  pv.after.total, was: pv.before.total })` · `deltaFigure({ label: 'You take home', cents: pv.after.payout, was:
  pv.before.payout })` (on 390 the two `.t-display` figures each get 165 px: if a figure overflows, stack them) · 8 ·
  `tailorBreakdown(pv.after)` · t-small c-600 `${first}’s ${fmtExact(deposit)} deposit stays the same. The balance is due when
  the order is ready.`
- **Action bar:** `actionBar({ ctaLabel: mode === 'revise' ? 'Send the new price' : \`Send to ${first}\`, ctaAct: 'send',
  disabled: !changed, busy, busyLabel: 'Sending…', note: !changed ? 'Change a price, add or remove a service to send.' : '',
  lead: \`You take home <b data-money>${fmtExact(pv.after.payout)}</b>\` })`.
- **Add-service sheet (`t-adjust--add`, O):** `sheetOverlay(…, { header: \`Add to ${garment type}\`, confirm: false })` ·
  `<div role="radiogroup" aria-label="Services">` `optionRow({ name: 'service', value: id, title: SERVICES[id].label, sub:
  \`Your price ${fmtExact(cents(price))}\`, act: 'pick-service' })` for every `servicesForType(type)` id with a price in
  `myTailor().prices` and not already on the garment (a removed line re-added = Undo). Tap → push `{ garmentId, serviceId }`
  to `d.added` → close → `go(ID)` → focus that row's input.
- **Send:** `tried = true`; validate each live line (`price-missing` / `price-invalid`: whole number 1…PRICE_MAX); none
  left → error banner above the bar `Keep at least one service on this job.` (D-102). Any error → focus the first invalid
  input, no send. Else `withLatency` → `T.sendPriceChange(a.id, lines /* cents */, { note: d.note })` → ok: `delete
  state.ui['t-adjust']`, `setFocus(a.id)`, `go('t-job', { fresh: true })`, toast `New price sent to ${first}.` · `note-long`
  → error under the textarea `Keep the note under ${TAILOR_LIMITS.NOTE_MAX} characters.`
- **Leave (`t-adjust--leave`, O):** Back with `changed` → `modalOverlay(leaveModal({ title: 'Leave without sending?', body:
  \`Your price changes won’t be sent to ${first}.\` }))` (`keep-editing` / `discard` → delete draft, `go('t-job')`). Clean → `go('t-job')`.
- **No appt:** `emptyState({ title: 'Nothing to adjust', body: 'You can adjust the price during a fitting.', ctaLabel: 'Go to
  Home', ctaAct: 'home' })`.
- **FLOWS (`FLOWS_t_adjust` in m4.js, group 'M4 · Price change', import prefix `PC_`):**
  - `t-adjust` · `S.driveTo('fitting')` · `{ has: ['Adjust the price', 'Hem pants', 'Shorten sleeves', 'Take in jacket
    sides', 'Add a service', fmtExact(SCENARIOS.seed.payout)], sel: '[data-act="send"][disabled]' }`
  - `t-adjust--edited` · `const a = S.driveTo('fitting'); S.state.ui['t-adjust'] = { apptId: a.id, mode: 'new', prices: {
    'g2:sleeves': String(AMARA.prices.sleeves + 5) }, removed: [], added: [{ garmentId: 'g1', serviceId: 'taper' }], note: '' };`
    · `{ has: ['Added', 'New price', 'Taper legs', fmtExact(SCENARIOS.priceAdded.total), fmtExact(SCENARIOS.priceAdded.payout),
    fmtNeg(SCENARIOS.priceAdded.tailyFee), 'up'] }`
  - `t-adjust--error` · as `t-adjust` + `S.state.ui['t-adjust'] = { apptId: a.id, mode: 'new', prices: { 'g1:hem-pants': '' },
    removed: [], added: [] };` · click `['[data-act="send"]']` · `{ has: 'Enter a price', sel: '[aria-invalid="true"]' }`
  - `t-adjust--add` · `S.driveTo('fitting')` · click `['[data-act="add-service"][data-garment="g1"]']` · `{ has: ['Add to
    Suit Pant', 'Taper legs', fmtExact(cents(AMARA.prices.taper))], not: 'Hem pants' }`
  - `t-adjust--revise` · `const a = S.driveTo('price-change'); S.state.ui['t-adjust'] = { apptId: a.id, mode: 'revise' };` ·
    `{ has: ['Change the new price', 'Sending again replaces', 'Taper legs', PRICE_NOTES.added.slice(0, 20)] }`
  - `t-adjust--leave` · as `t-adjust--edited` · click `['[data-act="back"]']` · `{ has: ['Leave without sending?'] }`
- **Accept checks:** labels visible above nothing — every input has its service name as `<label for>`; errors under the
  field and only after Send; remove / undo / add are ≥ 44; the old price is struck, never deleted; take-home and Sarah's
  total both shown in dollars; Send disabled with a reason until something changed.

### c-price-change — C9 review the adjusted price (Approve or Message)
- **Purpose:** show Sarah exactly what changed and what it costs her, then let her approve or talk first. No reject path (§2).
- **Focal:** `deltaFigure` "New total" (`.t-display`).
- **Data:** `a = focusAppt('c-price-change')`; `t = tailorById(a.tailorId)`; `first`; `pv = priceChangeView(a)`;
  `messaged = a.priceChange.state === 'messaged'`.
- **Layout:** `chrome('bookings')` · `headingRow(statusHero({ pill: 'action', pillLabel: 'Approve new price', title:
  \`${first} updated the price\`, body }), { backRow: true })`, body t-body c-700 `After the fitting, ${first} changed your
  order. Nothing more is charged until it’s ready.` · messaged: `banner({ tone: 'info', text: \`You messaged ${first} about
  the price. Approve when you’re ready, or keep talking in chat.\` })` · revised (`pv.revisions > 0`): t-small c-600
  `${first} changed the price again at ${fmtTime(pv.sentAt)}.` · 24 · `deltaFigure({ label: 'New total', cents: pv.after.total,
  was: pv.before.total })` · 16 · `noteQuote({ label: \`${first}’s note\`, text: pv.note })` when set · 32 · `.t-h2` "What
  changed" · `changeList({ garments: pv.garments })` · 32 · `.t-h2` "Price" · `moneyRows([{ label: 'Services', cents:
  pv.after.services, caption: \`${first}’s new prices\` }, homeFee > 0 && { label: 'Home-visit fee', cents }, rush > 0 &&
  { label: 'Rush fee', cents }, { label: 'New total', cents: pv.after.total, kind: 'total' }, { label: 'Deposit', cents:
  deposit, caption: 'Stays the same', status: 'Paid' }, { label: 'New balance', cents: pv.after.balance, status: 'Due when
  ready' }, pv.after.refund > 0 && { label: 'Refund to your card', cents: pv.after.refund, caption: 'When your order is
  ready' }])` · t-small c-600 `There’s no charge today. If something doesn’t look right, message ${first} before you approve.`
- **Action bar:** `actionBar({ ctaLabel: 'Approve new price', ctaAct: 'approve', busy, busyLabel: 'Approving…', lead: \`New
  balance <b data-money>${fmtExact(pv.after.balance)}</b>\`, secondaryLabel: messaged ? 'Open chat' : \`Message ${first}\`,
  secondaryAct: 'message' })`.
- **Approve:** `withLatency` → `T.approvePriceChange(a.id)` → `setFocus` → `go('c-booking', { fresh: true })` + toast `New
  price approved. ${first} can start the work.` **Message:** pending → `T.messageAboutPriceChange(a.id)`; then `go('c-thread')`.
- **States:** `--removed` (one Removed row, "down", lower balance) · `--repriced` (one New price row) · `--messaged` (banner,
  "Open chat") — same layout, data-driven.
- **FLOWS (`FLOWS_c_price_change`, group 'M4 · Price change', prefix `PC_`):**
  - `c-price-change` · `S.driveTo('price-change')` · `{ has: ['Approve new price', 'updated the price', 'Taper legs', 'Added',
    'New price', fmtExact(SCENARIOS.priceAdded.total), fmtExact(SCENARIOS.priceAdded.balance), fmtExact(SCENARIOS.seed.total),
    fmtExact(SCENARIOS.seed.deposit), 'Stays the same', 'Message Amara', 'note'], not: ['Reject', 'Decline'] }`
  - `c-price-change--removed` · `S.driveTo('price-change', { priceChange: 'removed' })` · `{ has: ['Removed', 'Take in jacket
    sides', 'down', fmtExact(SCENARIOS.priceRemoved.total), fmtExact(SCENARIOS.priceRemoved.balance)] }`
  - `c-price-change--repriced` · `S.driveTo('price-change', { priceChange: 'repriced' })` · `{ has: ['New price',
    fmtExact(SCENARIOS.priceRepriced.total), fmtExact(SCENARIOS.priceRepriced.balance)], not: 'Added' }`
  - `c-price-change--messaged` · `const a = S.driveTo('price-change'); S.T.messageAboutPriceChange(a.id);` · `{ has: ['You
    messaged Amara', 'Open chat', 'Approve new price'] }`
- **Accept checks:** the deposit row says Paid + "Stays the same"; the struck old price and a text tag on every changed row;
  exactly two choices (Approve filled, Message outline); same row labels / amounts as t-job--waiting.

---

## C2. CLUSTER "Tailor job loop" — `t-job` (M4 states), `t-home` (Upcoming pills)

### t-job — T4–T6 from the fitting to completed (extends the M3 screen)
- **Purpose:** at each step, the one next thing Amara does, what Sarah sees, and what she takes home.
- **Focal:** per state — the visit card (visit / fitting), the take-home `deltaFigure` (waiting / messaged), the return card
  (ready / returning), the payout figure (completed).
- **Data:** as M3 + `pv = priceChangeView(a)` when `a.priceChange`; `returnOffer(a)`; `payoutOf(a)`; `statusWord(a,
  'tailor')`; `t = myTailor()`; `first = state.customer.first`.
- **Shared rules (D-103):** before `slot.start` on `confirmed` → the M3 layout, untouched. From the start (and every M4
  status) the screen gets a sticky `actionBar` with the status action as primary and `Message ${first}` as secondary
  (`data-act="message"`); the customer row keeps the avatar + name but loses its filled Message CTA. Hero = `statusHero` with
  the §B2 pill. "The work" (`workList(v)`) and "Your payout" (`tailorBreakdown(a.money)`) stay below on every state except
  where noted. Visit-day actions (can't make it / no-show) show only while `confirmed` (as M3).
- **Per state:**
  - **visit (`t-job--visit`, confirmed, now ≥ start):** pill confirmed · title `Visit with ${name}` · note t-body c-700
    `It’s time for the fitting. Start it when you’re with ${first}.` · bar primary "Start fitting" (`start-fitting`, busy
    "Starting…") → `T.startFitting` → `go(ID)` + toast "Fitting started". The no-show line/row stays in "Something wrong?".
  - **fitting (`t-job--fitting`):** pill fitting · title `Fitting with ${name}` · note `Check each piece against the estimate.
    If the price changes, ${first} approves it before you start the work.` · bar `lead: You take home <b data-money>…payout</b>`,
    primary "No changes, start the work" (`no-change`, busy "Saving…") → `T.confirmNoChange` → toast `Price confirmed. ${first}
    has been told.`; secondary "Adjust price" (`adjust`) → `state.ui['t-adjust'] = { apptId, mode: 'new' }`, `go('t-adjust')`.
  - **waiting (`t-job--waiting`, price-change pending):** pill waiting "Waiting on Sarah" · title `Waiting for ${first} to
    approve` · note `You sent a new price at ${fmtTime(pv.sentAt)}. Don’t start the work until ${first} approves.` · 24 ·
    `deltaFigure({ label: 'You’ll take home', cents: pv.after.payout, was: pv.before.payout })` · t-small c-600 `${first} sees
    a new total of ${fmtExact(pv.after.total)} (was ${fmtExact(pv.before.total)}).` · `noteQuote({ label: 'Your note', text })`
    when set · `.t-h2` "What changed" · `changeList({ garments: pv.garments })` · `.t-h2` "Your payout if approved" ·
    `tailorBreakdown(pv.after)` (replaces the booked breakdown and "The work" on this state) · bar primary `Message ${first}`,
    secondary "Change the new price" (`revise`) → `state.ui['t-adjust'] = { apptId, mode: 'revise' }`, `go('t-adjust')`.
  - **messaged (`t-job--messaged`):** pill action "Reply to Sarah" · title `${first} wants to talk about the price` · note
    `${first} messaged you instead of approving. Reply in chat. ${first} can approve once you’ve talked, or you can change
    the price.` · when a customer message exists after `pv.sentAt`: `noteQuote({ label: \`${first}’s latest message\`, text })`
    · same blocks as waiting · bar primary `Reply to ${first}` (`message`), secondary "Change the new price".
  - **in-progress (`t-job--in-progress`):** pill in-progress · title "Work in progress" · note `Mark it ready when the work is
    done. ${first} then picks how to get it back and pays the balance.` · bar primary "Mark ready" (`mark-ready`).
  - **approved (`t-job--approved`, in-progress + `priceChange.state === 'approved'`):** as in-progress plus, above the visit
    card, `banner({ tone: 'success', text: \`${first} approved the new price. You take home ${fmtExact(a.money.payout)}.\` })`;
    the payout section caption "Price updated after the fitting".
  - **Mark ready sheet (`t-job--mark-ready`, O):** `sheetOverlay(…, { header: 'Mark the order ready?', confirm: false })` ·
    t-body c-700 `${first} is told right away, picks how to get it back from the options you tick, then pays the
    ${fmtExact(a.money.balance)} balance.` · t-small w-600 c-600 "Ways back for this order" · `checkRow({ id:
    \`ret-${k}\`, label: RETURN_LABEL[k], caption: §B3 tailor line, checked: true })` per option with `t.returns[k]` · error
    (none ticked, under the group): "Tick at least one way to get it back." · `cta('Mark ready', { busyLabel: 'Marking
    ready…', attrs: 'data-act="ready-ok"' })` · 8 · `cta('Not yet', { variant: 'secondary', attrs: 'data-act="ready-keep"' })`.
    ok → `T.markReady(a.id, { returns })` → close → `go(ID)` + toast `${first} has been told it’s ready.`
  - **ready (`t-job--ready`):** pill waiting · title `Ready. Waiting for ${first}` · note `${first} is choosing how to get it
    back and paying the ${fmtExact(a.money.balance)} balance. You’ll see the choice here.` · `visitBlock(returnOffer(a).map(k
    => metaRow('', RETURN_LABEL[k], { icon })), { title: 'Ways back you offered' })` · bar primary `Message ${first}` only.
  - **returning · pickup (`t-job--returning-pickup`):** pill returning "Ready for pickup" · title `${first} will pick it up` ·
    note `${first} paid the balance and will collect it at your shop. Mark the job completed when it’s handed over.` ·
    `visitBlock([metaRow('', shopName, { icon: 'bag' }), shop street + zip], { title: 'In-store pickup' })` · bar primary
    "Mark completed" (`complete`, busy "Completing…").
  - **returning · dropoff (`t-job--returning-dropoff`):** pill action "To drop off" · title `Drop it off at ${first}’s` · note
    `${first} paid the balance. Agree a time in chat, then mark the job completed when it’s delivered.` · `visitBlock([full
    address of state.customer.address], { title: 'Home drop-off' })` · bar primary "Mark completed".
  - **courier (`t-job--courier`):** pill returning "Courier booked" · title "A courier is coming" · note `${first} paid the
    balance and booked a Taily courier. Have the order ready at ${shopName}, then mark it completed once it’s delivered.` ·
    `courierCard({ state: 'ready', ...a.courier, from: shopName, to: street, note: \`Paid by ${first}. Not taken from your
    payout.\` })` (D-100) · payout breakdown unchanged (no courier row) · bar primary "Mark completed".
  - Mark completed → `withLatency` → `T.markCompleted(a.id)` → `go(ID)` + toast `Job completed. ${fmtExact(payout)} is paid out
    ${fmtDay(payoutOf(a).date)}.`
  - **completed (`t-job--completed`, ◆):** no action bar · pill completed · title "Job completed" · note `Completed
    ${fmtDay(last history at)}. Thanks for the careful work.` · 24 · focal payout card (white, padding 20): t-caps c-600 "YOUR
    PAYOUT" · `.t-display` `fmtExact(a.money.payout)` (`data-money`) · t-small c-700 `Pending · paid out
    ${fmtDay(payoutOf(a).date)} to ${t.payouts.bank} •••• ${t.payouts.last4}` · 16 · `tailorBreakdown(a.money)` (services,
    home-visit fee, rush, Taily fee −, your payout) + caption "Price updated after the fitting" when approved · 32 · review:
    `a.review` → `.t-h2` `${first}’s review` · `reviewRow({ name: '<first> <last initial>.', initials, stars, date, text,
    photos })`; else t-small c-600 `${first} can leave a review now.` · "The work" collapsed out (it's in the payout) ·
    `cta('Back to Home', { variant: 'secondary', attrs: 'data-act="home"' })`.
- **FLOWS (append to `FLOWS_t_job` in m3.js, group 'M4 · Job', prefix `TJ4_`):**
  - `t-job--visit` · `S.driveTo('confirmed'); S.setClock(SEED_SLOT);` · `{ has: ['time for the fitting', 'Start fitting',
    'Message Sarah'], sel: '.action-bar' }`
  - `t-job--fitting` · `S.driveTo('fitting')` · `{ has: ['Fitting', 'No changes, start the work', 'Adjust price',
    fmtExact(SCENARIOS.seed.payout)], not: 'make it' }`
  - `t-job--waiting` · `S.driveTo('price-change')` · `{ has: ['Waiting on Sarah', 'Taper legs', 'Added',
    fmtExact(SCENARIOS.priceAdded.payout), fmtExact(SCENARIOS.priceAdded.total), 'Change the new price'] }`
  - `t-job--messaged` · `const a = S.driveTo('price-change'); S.T.messageAboutPriceChange(a.id); S.T.sendMessage(a.tailorId,
    'customer', { text: 'Could we keep the sleeves at the old price?' });` · `{ has: ['Reply to Sarah', 'keep the sleeves'] }`
  - `t-job--approved` · `S.driveTo('in-progress', { priceChange: 'added' })` · `{ has: ['approved the new price',
    fmtExact(SCENARIOS.priceAdded.payout), 'Mark ready'] }`
  - `t-job--in-progress` · `S.driveTo('in-progress')` · `{ has: ['In progress', 'Work in progress', 'Mark ready'], not: 'approved' }`
  - `t-job--mark-ready` · as `t-job--in-progress` · click `['[data-act="mark-ready"]']` · `{ has: ['Mark the order ready?',
    'In-store pickup', 'Home drop-off', 'Taily courier', 'not taken from your payout', fmtExact(SCENARIOS.seed.balance)] }`
  - `t-job--ready` · `S.driveTo('ready')` · `{ has: ['Waiting on Sarah', 'Ways back you offered', fmtExact(SCENARIOS.seed.balance)] }`
  - `t-job--returning-pickup` · `S.driveTo('returning')` · `{ has: ['Ready for pickup', 'pick it up', 'Reyes Tailoring',
    'Mark completed'] }`
  - `t-job--returning-dropoff` · `S.driveTo('returning', { returnOption: 'dropoff' })` · `{ has: ['To drop off', '145 N 7th
    St', 'Mark completed'] }`
  - `t-job--courier` · `S.driveTo('returning', { returnOption: 'courier' })` · `{ has: ['Courier booked',
    fmtExact(SCENARIOS.courierQuote.quote), fmtExact(SCENARIOS.courierQuote.markup), fmtExact(SCENARIOS.courierQuote.cents),
    'Not taken from your payout', fmtExact(SCENARIOS.seed.payout)] }`
  - `t-job--completed` · `S.driveTo('completed')` · `{ has: ['Job completed', fmtExact(SCENARIOS.seed.payout),
    fmtNeg(SCENARIOS.seed.tailyFee), 'Pending', 'paid out', 'Chase', 'can leave a review'] }` (the Friday date is asserted by
    the model test via `payoutOf`, not typed here)
- **t-home:** Upcoming `pillOf(a)` → `statusWord(a, 'tailor', { short: true })` for every M4 status (confirmed keeps its M3
  "Accepted / Confirmed"). No new key; journeys J6–J8 cover it.
- **Accept checks:** exactly one filled button (the bar's primary) from the visit start; Message is always one tap away; the
  courier card never sits inside the payout and says who paid; payout shows its date and bank; struck old prices on waiting.

---

## C3. CLUSTER "Customer return + pay" — `c-ready` (NEW)

### c-ready — C10 pick a way back, then pay the balance
- **Purpose:** choose how the clothes come back (only what Amara offers for this order), see the exact balance, pay once.
- **Focal:** the "How do you want it back?" radio group; the amount lives in the Pay button.
- **Data:** `a = focusAppt('c-ready')`; `t`; `first`; `offered = returnOffer(a)`; `sel = a.returnOption ?? (offered.length
  === 1 ? offered[0] : null)`; `u = state.ui['c-ready'] ?? {}` (`quoting`, `cardId`); `c = a.courier`; `courierState =
  u.quoting || c?.state === 'loading' ? 'loading' : c?.state`; `failed = a.payments.balance.state === 'failed'`.
- **Layout:** `chrome('bookings')` · `headingRow(statusHero({ pill: 'action', pillLabel: 'Ready', title: 'Your order is
  ready', body: \`${first} finished the work. Choose how to get it back, then pay the balance.\` }), { backRow: true })` ·
  failed: `banner({ tone: 'error', title: 'Payment didn’t go through', text: \`Your ${cardLabel} was declined. Nothing was
  charged.\`, actionLabel: 'Pay another way', actionAct: 'pay' })` · 24 · `.t-h2#ready-ways` "How do you want it back?" · 8 ·
  `<div role="radiogroup" aria-labelledby="ready-ways">` `optionRow({ name: 'return', value: k, title: RETURN_LABEL[k], sub,
  checked: sel === k, lead: icon, act: 'return' })` per offered option, sub from §B3 customer line; courier sub by state:
  ready → `${fmtExact(c.cents)} · delivered today`, loading → "Getting a price…", failed → "Price unavailable" · single
  offer: t-small c-600 under the group `${first} offers ${RETURN_LABEL[k].toLowerCase()} for this order.` · courier selected:
  16 · `courierCard({ state: courierState, ...c, from: t.shopName, to: street, note: 'Added to your balance.' })` · 32 ·
  `.t-h2` "Price" · `customerBreakdown(a.money, { stage: 'ready', tailorFirst: first, depositState: a.payments.deposit.state,
  confirmed: true })` (Taily courier row appears when quoted; Balance "Due now"; refund row when D-23 applies).
- **Action bar:** `actionBar({ ctaLabel: \`Pay ${fmtExact(a.money.balance)}\`, ctaAct: 'pay', disabled: !sel || (sel ===
  'courier' && courierState !== 'ready'), note })` — note: none chosen → "Choose how to get it back first."; loading →
  "Waiting for the courier price."; failed → "Try the courier price again, or pick another way back."
- **Pick an option (`data-act="return"`):** pickup / dropoff → `T.chooseReturn(a.id, k)` → `go(ID)`. courier → `u.quoting =
  true`, `go(ID)`, `withLatency(() => { u.quoting = false; T.chooseReturn(a.id, 'courier'); go(ID); })`. **Try again
  (`courier-retry`)** → `state.sim.courier = 'ok'` (D-105) then the courier path.
- **Pay sheet (`c-ready--pay`, O):** `sheetOverlay(…, { header: 'Pay the balance', confirm: false })` · `moneyRows([{ label:
  'Balance', cents: a.money.balance, kind: 'total' }])` · t-small c-600 `Your ${fmtExact(deposit)} deposit is already taken
  off.` · t-small w-600 c-600 "Pay with" · radiogroup `optionRow({ name: 'card', value: id, title: \`${brand} ••••
  ${last4}\`, sub: \`Expires ${exp}\`, act: 'card' })` per saved card + Apple Pay row when `customer.applePay` (default card
  checked; `u.cardId` remembers) · `cta(\`Pay ${fmtExact(a.money.balance)}\`, { busyLabel: 'Paying…', attrs:
  'data-act="pay-ok"' })`. Single offer + nothing chosen → Pay first calls `T.chooseReturn(a.id, offered[0])`. Changing
  method → `A.useOtherMethod()` (clears a decline, D-40).
- **Processing (`c-ready--processing`, O):** the pay-ok CTA busy, method rows `aria-disabled`, sheet `aria-busy`.
- **Pay:** `withLatency` → `T.payBalance(a.id, cardId, { threeDS: true })` (D-104) → ok: `closeOverlay()`, `setFocus`,
  `go('c-booking', { fresh: true })` + toast `Paid ${fmtExact(paid)}.` + pickup " Ready for pickup at <shop>." / dropoff
  ` ${first} will drop it off.` / courier " Your courier is on the way." · `card-declined` → `closeOverlay()`, `go(ID)`
  (banner) · `courier-unavailable` / `return-required` → toast "Choose how to get it back first."
- **FLOWS (`FLOWS_c_ready`, group 'M4 · Ready', prefix `CR_`):**
  - `c-ready` · `S.driveTo('ready')` · `{ has: ['Your order is ready', 'How do you want it back?', 'In-store pickup', 'Home
    drop-off', 'Taily courier', 'Free', 'Due now', fmtExact(SCENARIOS.seed.balance)], sel: '[data-act="pay"][disabled]' }`
  - `c-ready--pickup-only` · `const a = S.driveTo('in-progress'); S.T.markReady(a.id, { returns: ['pickup'] });` · `{ has:
    ['In-store pickup', 'for this order', `Pay ${fmtExact(SCENARIOS.seed.balance)}`], not: ['Home drop-off', 'Taily courier'] }`
  - `c-ready--courier-loading` · `const a = S.driveTo('ready'); S.state.sim.courier = 'loading'; S.T.chooseReturn(a.id,
    'courier');` · `{ has: ['Getting a price from Uber', 'Waiting for the courier price'], sel: '.skeleton' }`
  - `c-ready--courier` · `const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'courier');` · `{ has: ['Uber quote', 'Taily
    courier fee', fmtExact(SCENARIOS.courierQuote.quote), fmtExact(SCENARIOS.courierQuote.markup),
    fmtExact(SCENARIOS.courier.courier), `Pay ${fmtExact(SCENARIOS.courier.balance)}`] }`
  - `c-ready--courier-failed` · as above with `S.state.sim.courier = 'fail'` before `chooseReturn` · `{ has: ['get a courier price', 'Try
    again', 'pick another way back'], not: 'Uber quote' }`
  - `c-ready--pay` · `const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'pickup');` · click `['[data-act="pay"]']` · `{ has:
    ['Pay the balance', 'Visa •••• 4242', 'Apple Pay', 'deposit is already taken off', fmtExact(SCENARIOS.seed.balance)] }`
  - `c-ready--pay-failed` · `… chooseReturn(pickup); S.state.sim.card = 'declined'; S.T.payBalance(a.id, 'visa-4242');` · `{ has:
    ['Payment didn', 'Nothing was charged', 'Pay another way'], sel: '.banner--error' }`
  - `c-ready--processing` · `… chooseReturn(pickup); S.state.sim.latency = 'hold';` · click `['[data-act="pay"]',
    '[data-act="pay-ok"]']` · `{ has: 'Paying', sel: '[aria-busy="true"]' }`
- **Accept checks:** only offered options render; nothing is pre-chosen unless only one option exists; the courier is three
  dollar lines before Pay is enabled; a failure always leaves another way out; the Pay label always equals the Balance row;
  decline banner stays after the sheet closes; radio rows are a labelled `radiogroup`, each ≥ 44.

---

## C4. CLUSTER "Customer status + review" — `c-booking` (M4 states), `c-bookings` (M4 rows), `c-complete` (NEW), `c-review` (NEW), `c-tailor--reviewed`

### c-booking — C8 M4 states (extends the M3 screen)
- **Timeline (D-110), every live state:** `timeline([{ Booked, done, fmtWhen(confirmedAt) }, { 'Visit and fitting', fitting:
  current "<first> confirms the final price" / later: done \`Price confirmed · ${fmtExact(total at in-progress)}\` }, {
  'Tailoring', in-progress: current / later done }, { 'Ready', ready: current "Pay the balance" / returning+: done \`Paid
  ${fmtExact(a.payments.balance.cents)}\` / before the price is confirmed (confirmed / fitting / price-change): todo \`Pay the balance, est. ${fmtExact(balance)}\`; from in-progress on: todo \`Pay the ${fmtExact(balance)} balance\` (D-113) }, { 'Back with you',
  returning: current (§B2 customer label) / completed: done }])`.
- **Price section:** fitting → `customerBreakdown(a.money, { stage: 'booked', … })` (Estimated total); in-progress →
  `confirmed: true` (Total) + caption t-small c-600 "Updated after the fitting" when approved; returning / completed →
  `stage: 'paid', confirmed: true` (Balance Paid, courier row if any). Cancel / Reschedule never show after `confirmed`.
- **Per state (hero via `head()` with §B2 pill; actions: `Message ${first}` filled unless noted):**
  - `c-booking--fitting`: title `Fitting with ${first}` · body `${first} is checking the fit. If the price changes, you’ll
    approve it here before any work starts.`
  - `c-booking--in-progress`: title `${first} is working on it` · body `Price confirmed. You’ll pay the
    ${fmtExact(a.money.balance)} balance when it’s ready.`
  - `c-booking--returning-pickup`: title "Ready for pickup" · body `Pick it up at ${shopName}. You’ve paid in full.` ·
    `visitBlock([metaRow('', shopName, { icon: 'bag' }), street + ', Brooklyn, NY ' + zip], { title: 'In-store pickup' })` ·
    t-small c-600 `Message ${first} if you’re coming outside shop hours. ${first} marks the order completed when you have it.`
  - `c-booking--returning-dropoff`: title `${first} will drop it off` · body `${first} will bring it to your door and message
    you to agree a time. You’ve paid in full.` · `visitBlock([Sarah's address], { title: 'Home drop-off' })`.
  - `c-booking--returning-courier`: title "On its way to you" · body `A Taily courier is bringing it from ${shopName} today.
    You’ve paid in full.` · `courierCard({ state: 'ready', ...a.courier, from: shopName, to: street, note: 'Paid with your
    balance.' })`.
  - `c-booking--completed` (completed + reviewed): pill completed · title "Completed" · body `${first} completed your order on
    ${fmtDay(completedAt)}.` · `.t-h2` "Your review" `reviewRow(own review as on the profile)` · receipt breakdown · actions:
    `cta(\`Book ${first} again\`, 'book-again')` (→ `T.newJob()`, `state.ui.booking = { tailorId }`, `go('c-job')`) filled ·
    secondary `Message ${first}`.
- **FLOWS (append to `FLOWS_c_booking` in m3.js, group 'M4 · Bookings', prefix `CB4_`):**
  - `c-booking--fitting` · `S.driveTo('fitting')` · `{ has: ['Fitting', 'checking the fit', 'Estimated total',
    fmtExact(SCENARIOS.seed.total)], not: ['Cancel booking', 'Reschedule'] }`
  - `c-booking--in-progress` · `S.driveTo('in-progress')` · `{ has: ['In progress', 'working on it', 'Price confirmed',
    fmtExact(SCENARIOS.seed.balance)], not: 'Estimated total' }`
  - `c-booking--returning-pickup` · `S.driveTo('returning')` · `{ has: ['Ready for pickup', 'Reyes Tailoring', 'paid in full',
    'Paid'] }`
  - `c-booking--returning-dropoff` · `S.driveTo('returning', { returnOption: 'dropoff' })` · `{ has: ['Return scheduled',
    'drop it off', '145 N 7th St'] }`
  - `c-booking--returning-courier` · `S.driveTo('returning', { returnOption: 'courier' })` · `{ has: ['Out for delivery',
    fmtExact(SCENARIOS.courierQuote.quote), fmtExact(SCENARIOS.courierQuote.markup), fmtExact(SCENARIOS.courier.courier)] }`
  - `c-booking--completed` · `S.driveTo('reviewed')` · `{ has: ['Completed', 'Your review', 'Perfect fit', 'Book Amara again'] }`

### c-bookings — M4 rows (D-110)
`pillFor` → `statusWord(a, 'customer', { short: true })` for M4 statuses. Upcoming: fitting `Est. ${amt(total)}`; price-change
amount = `priceChangeView(a).after.total`, caption "Reply needed" (`captionTone: 'action'`); in-progress amount total,
caption "Total"; ready amount = balance, caption "Pay now" (action); returning amount total, caption "Paid". Past completed:
amount total, caption "Paid", or "Leave a review" (action) when `!a.review`. All amounts through the screen's one `fmtColumn`.
- **FLOWS (append to `FLOWS_c_bookings`, prefix `CB4_`):** `c-bookings--ready` · `S.driveTo('completed'); const b =
  addRequest({ accept: true, after: SECOND_SLOT_AFTER }); S.setClock(b.slot.start); S.T.startFitting(b.id);
  S.T.confirmNoChange(b.id); S.T.markReady(b.id);` · `{ has: ['Upcoming', 'Past', 'Ready', 'Pay now', 'Completed', 'Leave a
  review'] }`

### c-complete — C11 order completed: receipt + review prompt
- **Purpose:** close the loop: it's done, here's what you paid, how did it go?
- **Focal:** the review card's five stars.
- **Data:** `a = focusAppt('c-complete')`; `t`; `first`; card = `state.customer.cards.find(c => c.id === a.balanceCardId)`.
- **Layout:** `chrome('bookings')` · `headingRow(statusHero({ pill: 'completed', title: 'All done', body: \`${first} marked
  your order completed. Thanks for booking with Taily.\` }), { backRow: true })` · 24 · review card (white, padding 20,
  centred): `.t-h2#rate-label` `How did ${first} do?` · 12 · `stars({ input: true, name: 'rate', value: 0 })` (5 × 44) · 8 ·
  t-small c-600 `Tap a star to rate. Reviews show on ${first}’s profile.` · 32 · `.t-h2` "Receipt" · `metaRow('',
  \`${RETURN_LABEL[a.returnOption]} · ${fmtDay(completedAt)}\`, { icon })` · `customerBreakdown(a.money, { stage: 'paid',
  tailorFirst: first, depositState: a.payments.deposit.state, confirmed: true })` · t-small c-600 `Balance paid with
  ${cardLabel}.`
- **Action bar:** `actionBar({ ctaLabel: 'Leave a review', ctaAct: 'leave-review', secondaryLabel: 'Done', secondaryAct:
  'done' })` → c-review / c-bookings.
- **Wire:** star change → `state.ui['c-review'] = { apptId: a.id, stars: n }` → `go('c-review')` (D-107). Leave a review →
  `state.ui['c-review'] = { apptId: a.id }` → `go('c-review')`.
- **FLOWS (`FLOWS_c_complete`, group 'M4 · Completed', prefix `CC_`):** `c-complete` · `S.driveTo('completed')` · `{ has:
  ['All done', 'How did Amara do?', 'Receipt', 'Paid', fmtExact(SCENARIOS.seed.total), fmtExact(SCENARIOS.seed.balance),
  'Leave a review'], sel: '[data-stars]' }`
- **Accept checks:** stars are a labelled radiogroup, each ≥ 44; the receipt matches the paid breakdown line for line.

### c-review — stars, optional text, up to 3 photos
- **Purpose:** a quick, honest review that shows on Amara's profile.
- **Focal:** the star rating (required).
- **Data:** `a = getAppt(state.ui['c-review']?.apptId ?? state.ui.apptId)` when it's the customer's and `completed`, else
  the newest completed customer appt; `d = state.ui['c-review']` (`stars`, `text`, `photos`, `tried`); `t`; `first`.
- **Layout — form:** `chrome('bookings')` · `headingRow(\`<h1 class="t-title">Review ${first}</h1><p class="t-body c-700">Shown on
  ${first}’s profile as ${customer.first} ${customer.last[0]}.</p>\`, { backRow: true })` · 24 · t-body w-600 `#stars-label` "Your
  rating" · 8 · `stars({ input: true, name: 'stars', value: d.stars })` + t-small c-700 `STAR_WORDS[d.stars]` (aria-live) ·
  error (tried, no stars): t-small `--error` `role="alert"` "Choose a star rating." directly under the stars
  (`aria-describedby`) · 32 · `textArea({ id: 'review-text', label: 'Tell others about it (optional)', value: d.text, rows:
  5, max: REVIEW_LIMITS.TEXT_MAX, helper: 'The work, the fit, how it went. Phone numbers and emails are hidden.' })` · 32 ·
  t-body w-600 "Photos (optional)" · row of `photoTile('photo', { removable: true })` tiles (64 px; the ✕ is a 44 px
  `data-act="remove-photo"` button) + an add tile `<button data-act="add-photo" aria-label="Add a photo">` hidden at
  `PHOTOS_MAX` · t-small c-600 `Up to ${PHOTOS_MAX} photos.` / at max `You’ve added ${PHOTOS_MAX} photos, the most a review
  can have.`
- **Action bar:** `actionBar({ ctaLabel: 'Post review', ctaAct: 'post', busy, busyLabel: 'Posting…' })`.
- **Post:** `tried = true`; no stars → focus the first star, error shown; else `withLatency` → `T.leaveReview(a.id, { stars,
  text, photos })` → ok: `go(ID)` (renders submitted) + toast `Thanks. Your review is on ${first}’s profile.` · `text-long` →
  textArea error `Keep it under ${TEXT_MAX} characters.`
- **Submitted (`c-review--submitted`, ◆; `a.review` exists):** no action bar · `headingRow(statusHero({ pill: 'completed',
  pillLabel: 'Posted', title: \`Thanks, ${customer.first}\`, body: \`Your review is now on ${first}’s profile.\` }))` · 24 ·
  card: `ratingSummary(t.rating)` · `reviewRow({ name: 'Sarah C.', initials, stars, date, text, photos })` · 24 ·
  `cta(\`See ${first}’s profile\`, 'see-profile')` (→ `state.ui.booking = { tailorId: t.id }`, `go('c-tailor')`) · 8 ·
  `cta('Back to Bookings', { variant: 'secondary', attrs: 'data-act="bookings"' })`.
- **FLOWS (`FLOWS_c_review`, group 'M4 · Completed', prefix `CV_`):**
  - `c-review` · `S.driveTo('completed')` · `{ has: ['Review Amara', 'Your rating', 'Tell others about it', 'Photos', 'Post
    review'], not: 'Choose a star rating' }`
  - `c-review--error` · as `c-review` · click `['[data-act="post"]']` · `{ has: 'Choose a star rating', sel: '[role="alert"]' }`
  - `c-review--photos` · `const a = S.driveTo('completed'); S.state.ui['c-review'] = { apptId: a.id, stars: 4, text: 'Sleeves
    are perfect.', photos: REVIEW_LIMITS.PHOTOS_MAX };` · `{ has: ['Great', 'the most a review can have'], not: 'Add a photo' }`
  - `c-review--submitted` · `S.driveTo('reviewed')` · `{ has: ['Thanks, Sarah', 'Sarah C.', 'Perfect fit', `${AMARA.rating.count
    + 1} reviews`, 'See Amara'] }`

### c-tailor--reviewed (append to `FLOWS_c_tailor` in m1.js, group 'M4 · Completed', prefix `CT4_`)
`c-tailor--reviewed` · `S.driveTo('reviewed')` · `{ has: ['Sarah C.', 'Perfect fit', `${AMARA.rating.count + 1} reviews`] }`
— no c-tailor code change: `leaveReview` puts the review first and updates the rating; check the first `.review-row` is Sarah's.

- **Accept checks (cluster):** after the fitting the booking never says "Estimated" once the price is confirmed; returning
  states say "paid in full"; review errors next to the stars; photos capped at 3 with a reason; the posted review reads the
  same on c-review, c-booking--completed, c-tailor and t-job--completed.

---

## D. INTEGRATION (Integrator)

1. `app.js` `SCREEN_MODULES` M4 block: `'c-price-change', 'c-ready', 'c-complete', 'c-review', 't-adjust'`; `index.html`
   CSS links (`css/screens/<id>.css`).
2. `js/fixtures/m4.js`: the five arrays exist; fixtures import `SCENARIOS, SEED_SLOT, SECOND_SLOT_AFTER, AMARA` from
   `./money-scenarios.js`, `PRICE_NOTES, addRequest` from `./common.js`, `fmt*`, `cents` from `../money.js`, `fmtWhen / fmtDay`
   from `../dates.js`, `REVIEW_LIMITS` from `../data.js` — each cluster with its own prefix (PC_, CR_, CC_, CV_; TJ4_ / CB4_ /
   CT4_ in m3.js / m1.js).
3. `SCREENS.md` + `js/inventory.js` (regenerate): add the D-109 keys tagged **M4** (`c-price-change--messaged` ·,
   `c-ready--processing` O, `c-booking--completed` ·, `c-bookings--ready` ·, `c-tailor--reviewed` ·, `c-review--photos` ·,
   `t-job--visit` ·, `t-job--mark-ready` O, `t-adjust--add` O, `t-adjust--revise` ·, `t-adjust--leave` O); fix the
   `c-price-change--repriced` note (D-109). `BUILT` += `'M4'`.
4. **`scripts/v5/journeys.mjs`** — add (same reporter, persona flips via `#flow-trigger` → `#persona-toggle`):
   - **J6 price change approved.** `runFlow('t-job--fitting')` → `[data-act="adjust"]` → `t-adjust` → `[data-act="remove-line"]
     [data-key="g2:jacket-sides"]` → `[data-act="send"]` → `t-job` has `Waiting on Sarah`, `fmtExact(priceRemoved.total)`,
     `fmtExact(priceRemoved.payout)` · flip → `[data-nav="bookings"]` → `.appt-row` → `c-price-change` has `Removed`, `Take in
     jacket sides`, `fmtExact(priceRemoved.total)`, `fmtExact(priceRemoved.balance)`, `fmtExact(seed.deposit)` →
     `[data-act="approve"]` → `c-booking` has `In progress`, `fmtExact(priceRemoved.balance)` · flip → t-home `.appt-row` →
     `t-job` has `approved the new price`, `fmtExact(priceRemoved.payout)`.
   - **J7 courier return.** `runFlow('t-job--in-progress')` → `[data-act="mark-ready"]` → `[data-act="ready-ok"]` → `t-job` has
     `Waiting on Sarah` · flip → Bookings → `.appt-row` → `c-ready` → `[data-act="return"][data-value="courier"]` → has
     `fmtExact(courierQuote.cents)`, `Pay ${fmtExact(courier.balance)}` → `[data-act="pay"]` → `[data-act="pay-ok"]` →
     `c-booking` has `Out for delivery`, `fmtExact(courierQuote.cents)` · flip → t-home `.appt-row` → `t-job` has `Courier
     booked`, `fmtExact(courierQuote.quote)`, `Not taken from your payout`, `fmtExact(seed.payout)`.
   - **J8 completed → review visible.** `runFlow('t-job--returning-pickup')` → `[data-act="complete"]` → `t-job` has `Job
     completed`, `fmtExact(seed.payout)` · flip → Bookings → Past `.appt-row` → `c-complete` → `[data-act="leave-review"]` →
     `c-review` → click `input[name="stars"][value="5"]` → `[data-act="post"]` → has `Thanks, Sarah` → `[data-act="see-profile"]`
     → `c-tailor` has `Sarah C.`, `${AMARA.rating.count + 1} reviews` · flip → `Taily.render('t-job')` has `review` and the
     star label `5 out of 5 stars`.
5. `docs/v5/CONTEXT.md`: §A additions (`returnOffer`, `priceChangeView`, `statusWord`, `markReady` / `sendPriceChange` /
   `courierQuote` shapes, `REVIEW_LIMITS`, `STAR_WORDS`, `NOTE_MAX`, `PRICE_NOTES`, new SCENARIOS keys), the three new
   components and `statusPill('action')`.
6. `npm run check -- --accept-new` (list new keys), then `npm run check` green. Re-accept only `sys-components` and any M3
   baseline whose change is intended (none expected: pre-start t-job and confirmed c-booking are unchanged).

---

## E. Acceptance checklist (every M4 screen; reviewers use this)

- **Same ticket both sides:** flip persona on any M4 state — the changed rows (labels, struck old amounts, new amounts),
  Sarah's new total, the courier's three numbers, the visit time and the status word agree (§B2, §B3).
- **Money honesty:** the deposit never changes after the fitting and says so; the balance is shown before every pay tap and
  equals the Pay label; the courier is Uber quote + Taily courier fee = total and is never in Amara's payout; Amara's payout
  shows the Taily fee in dollars and its pay-out date. Dollars only via `fmt*`, `data-money` on every amount, no `%`.
- **No reject path:** c-price-change offers exactly Approve and Message; no cancel after the fitting starts.
- One focal element; one filled CTA per state; the next step is always in the sticky bar from the visit start (tailor) and
  on c-price-change / c-ready / c-complete / c-review (customer).
- Every tappable ≥ 44 (stars, option rows, check rows, remove / undo / add, photo tiles and their ✕, sheet buttons).
- Visible labels on every input (price fields, note, review text); errors next to the field, shown at submit; busy verbs on
  every async action; loading (courier skeleton), error (courier failed, card declined) and empty (no appt) states each have
  a way forward.
- Text, not colour alone: "Added / New price / Removed" tags; "up / down" words on deltas; star word under the stars.
- Reduced motion respected; toasts confirm, the screen shows the result.
