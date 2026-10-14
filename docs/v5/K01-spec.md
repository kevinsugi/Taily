# K-01 — Edit the job at the fitting → send the final order for approval (build instructions)

Oct 13, 2026 · spec writer / design director (Opus) · branch `V5` · follows Kevin's **K-01** (LOCKED, end of `DECISIONS.md`).
Builders read **§0 + §A (signatures) + their cluster** + `docs/v5/CONTEXT.md`. Calls this spec had to make are **D-120…D-125**
in `DECISIONS.md`, cited inline. This spec **amends M4-spec §C1 / §C2 / §B2** and **replaces D-103's "No changes, start the
work" path**; everything in M4 not named here is unchanged. Money copy is dollar amounts from `js/money.js` on `appt.money` /
`priceChangeView()` / `SCENARIOS` only (`fmtExact` on every screen here, `fmtNeg` for the Taily fee), never a typed amount,
never a percentage.

**Order:** (1) Model + component builder §A (serial) → (2) two screen builders in parallel: §C1 "Edit job" (`t-adjust`,
`t-job` fitting/waiting/approved) and §C2 "Final order" (`c-price-change`, `c-booking` / `c-bookings` copy) → (3) Integrator §D.

**K-01 done when:** `npm run check` green incl. the new journeys J6 + J6b; by hand at normal latency: Amara taps Start fitting →
lands on **Edit the job** → adds a **Pants / Jeans** item with **Hem pants**, removes **Take in jacket sides** → "Send to Sarah for
approval" → t-job says Waiting on Sarah with what she sent → Sarah opens Bookings → **Review your final order** shows the
Pants / Jeans card tagged **New item**, the jacket-sides row struck **Removed**, Total $160.00 → $130.00, deposit **$16.00
Paid · Stays the same**, new balance $114.00 → **Approve and start** → c-booking In progress → Amara's t-job reads "Sarah
approved your changes. You take home $120.50." and "The work" lists Pants / Jeans. And the no-change path: fitting → Send with
nothing touched → Sarah sees "No changes" → Approve and start → In progress. There is no path from the fitting to the work
that skips Sarah's approval.

---

## 0. Direction

**Who.** Amara is at Sarah's kitchen table (or her own bench), the garments on, pins in her mouth. Sarah has just said "oh —
can you also do these jeans?" and "actually leave the jacket sides". Amara needs to *edit the ticket right there, with Sarah
watching the total move*, then hand it to Sarah's phone in one tap. Sarah needs to *see the order she is agreeing to — every
item, every service, the new total — and say yes*, so the cutting can begin. Both read the same ticket.

**Feel — v4's "Approve your final order", in v5's ink.** The best part of v4 (t04 → t05 → 04 Review & Approve) was that the
fitting *is* the editor: garment cards you add to and strike from, and the customer approves the final order before tailoring.
v5 keeps its calm, exact language (white cards on `--neutral-50`, serif heads, tabular dollars, the struck-old-price correction
mark from M4) and borrows v4's **NEW** marking: added items and services carry a **"New"** / **"New item"** tag in a filled
`--success` badge on a `--success-bg` tint (v4's green), removed ones are struck through with a **"Removed"** tag, re-priced ones
keep M4's struck old amount + **"New price"**. Text tags always — never colour alone.

**Signature — "the same ticket on both sides" (continued from M4).** Amara's waiting screen ("The order you sent") and Sarah's
review ("What changed") print the SAME `changeList` from the SAME `priceChangeView()` with the SAME strings: garment types,
tags, labels, struck and new amounts, the summary line ("1 item added · 1 service removed"), the totals. Flip persona to check.

- **One focal element:** t-adjust = the garment cards (the ticket being edited); t-job--waiting = "You'll take home" figure;
  c-price-change = the "New total" / "Total" figure. One filled CTA per state, in the sticky bar.
- **Approval is always the gate** (D-120): `fitting → price-change (pending) → in-progress` only via Sarah's approve. The
  model id `price-change` stays (it is the 12-status model's "waiting for the customer's approval"); only the words change.
- Type, layout, rhythm, cards, 44 px targets, `prefers-reduced-motion`, async busy verbs, "results speak twice" — as M4 §0.

---

## A. MODEL + COMPONENTS (Component builder — serial, before the screens)

### A1. `js/state.js` — transitions

**`startFitting(id)`** unchanged (confirmed, from the slot start).

**`confirmNoChange` is retired** (D-120): delete the export, remove it from `T`, from CONTEXT.md's API list and from every
caller (§D lists them). Nothing moves `fitting → in-progress` except `approvePriceChange`.

**`sendPriceChange(id, lines, { note = '' } = {})`** — "send the final order". Same allowed states as M4 (`fitting`, or revise
on `price-change` while `pending|messaged`). `lines` is the whole final order: `[{ garmentId, garmentType, serviceId, label,
cents }]`. A **new item** is simply lines whose `garmentId` is not in `a.job.garments` (ids `n1`, `n2`, … — D-121); removing an
item = sending none of its lines. Validation, in this order, fail codes:
- `no-items` — `lines` empty (replaces the M4 `price-missing` for an empty array).
- `price-invalid` — any `cents` not a whole-dollar amount from `cents(1)` to `cents(TAILOR_LIMITS.PRICE_MAX)`.
- `garment-type` — a line's `garmentType` not in `GARMENT_TYPES`, or a booked `garmentId` with a different type.
- `service-type` — `serviceId` not in `servicesForType(garmentType)`.
- `service-not-offered` — a line NOT in the booked lines whose `serviceId` has no price in the tailor's `prices`.
- `duplicate-line` — two lines with the same `garmentId:serviceId`.
- `max-items` — more than `MAX_ITEMS` (10) distinct `garmentId`s.
- `note-long` — as M4.
Unchanged lines are allowed (the "no changes" order). Stores:
```js
a.priceChange = { lines, marks: priceMarks(a.lines, lines), changed: marks.length > 0, sentAt, state: 'pending',
                  note, noteMasked, revisions };
```
`changed` is the one flag every consumer uses to tell "Sarah approved your changes" from "Sarah approved the order as
booked" (§C1 t-job, §C2 c-booking). Thread lines (D-123): first send customer `"${first} sent your final order"` / tailor `"You
sent the final order"`; revise `"${first} updated your final order"` / `"You updated the final order"`.

**`approvePriceChange(id)`** — as M4 (lines replaced, money repriced with the captured deposit, balance updated, `state:
'approved'`, `in-progress`), plus: **rebuild `a.job.garments` from the approved lines** — booked garments that still have lines,
in booked order, `services` = their line `serviceId`s in line order, `photos` kept; then new garments in first-appearance order
`{ id, type: garmentType, services, photos: 0, added: true }`. (So `requestView` / `workList` on t-job and the item counts on
c-booking show the approved order.) Thread line: customer `"You approved the order"` / tailor `"${customer.first} approved the
order"`.

`messageAboutPriceChange`, the R4-2-C-02 "messaged on Sarah's first message" rule and `lastSpeakerSince` — unchanged.

### A2. `js/state.js` — `priceChangeView(appt, lines = …)` extended (DOM-free)
Adds, without changing existing fields:
- `garments[i].kind`: `'added'` (id not among the booked lines' garments) · `'removed'` (booked, no lines in `lines`) ·
  `'changed'` (any row not `same`) · `'same'`. Garment order: booked order, then added garments in `lines` order. A removed
  garment keeps its rows (all `removed`); an added garment's rows are all `added`.
- `changed` (boolean, any row not `same`) · `counts: { itemsAdded, itemsRemoved, servicesAdded, servicesRemoved, repriced }` —
  `servicesAdded` / `servicesRemoved` count only rows on garments that are neither added nor removed (the item tag covers
  those).
`before` / `after` / `delta` / note fields unchanged (`after` keeps the captured deposit, D-23).

### A3. `js/fixtures/money-scenarios.js` + `js/fixtures/common.js`
- `SCENARIOS` gains (same `repriced()` helper, deposit as captured):
  - `priceItem` — the J6 recipe: seed lines **minus** `jacket-sides` **plus** a new item `{ garmentId: 'n1', garmentType:
    'Pants / Jeans', serviceId: 'hem-pants', cents: cents(AMARA.prices['hem-pants']) }`.
  - `priceItemRemoved` — seed lines minus every `g1` (Suit Pant) line.
  Reference values (never typed in fixtures): priceItem services $95.00 · total $130.00 · balance $114.00 · fee −$9.50 ·
  payout $120.50 · priceItemRemoved services $100.00 · total $135.00 · balance $119.00 · fee −$10.00 · payout $125.00 · deposit
  $16.00 throughout.
- `driveTo` price recipes gain `'item'` (= priceItem), `'item-removed'` (= priceItemRemoved), `'unchanged'` (the booked lines
  as sent). **Targets after `price-change` with no `priceChange` option now send `'unchanged'` and approve it** (replaces
  `confirmNoChange`; D-120) — so every in-progress / ready / returning / completed seed has `priceChange = { changed: false,
  state: 'approved' }`. `PRICE_NOTES` gains `item: 'Sarah asked me to hem her jeans too, and the jacket sides already fit.'`,
  `'item-removed': 'The suit pants fit as they are, so I took them off the order.'`, `unchanged: ''`.
- `changedLines` builds the new recipes from `AMARA.prices` (the existing `5000` / `4000` literals become
  `cents(AMARA.prices.sleeves + 5)` / `cents(AMARA.prices.taper)` while the file is open).

### A4. Components (`js/components.js`, CSS `css/components-v5.css`, gallery blocks in `js/gallery.js`)
1. **`changeList({ garments, format = fmtExact })`** — extended (D-122):
   - Row `added`: tag text **"New"** (was "Added"), tag = filled `--success` with `--white` text (10/600 caps tracking, sentence
     case per D-111; white on `#4F7A5B` = 4.9:1), row tint `--success-bg` (was `--accent-bg`); label + amount ink w-600.
   - Garment `kind === 'added'`: the garment block becomes a `--success-bg` panel (`--radius-md`, padding 12) with the type
     (t-body w-600) followed by tag **"New item"**; its rows render as plain `same`-style rows in ink w-600 (no per-row tag, no
     per-row tint — the item tag says it once).
   - Garment `kind === 'removed'`: type `<s>` c-600 + tag **"Removed"**; rows struck (label `<s>` c-600, amount `<s>` c-500,
     `sr-only` "removed, was"), no per-row tag.
   - `repriced` / `removed` rows on kept garments, and `same` rows — unchanged from M4.
   - A garment without `kind` renders exactly as today (back-compat).
   Gallery: one block with a kept garment (same · New · New price · Removed), a New item garment and a Removed garment.
2. **`changeSummary(counts)`** — NEW. One t-small c-700 line, `data-summary`: the non-zero parts joined with " · " in this order
   — `n item(s) added` · `n item(s) removed` · `n service(s) added` · `n service(s) removed` · `n new price(s)`; all zero →
   **"No changes. Same items, same price as booked."** Words only, no money. Gallery: changed · unchanged.
3. Re-accept `sys-components` once.

### A5. `js/focus.js` — `statusWord` (D-123)
Customer on `price-change`: `{ pill: 'action', label: pick('Approve order', 'Approve') }` (was "Approve new price" / "New
price"). Tailor words unchanged ("Waiting on Sarah" / "Waiting", "Reply to Sarah" / "Reply").

### A6. Model test additions (`scripts/v5/model-test.mjs`)
Replace the `confirmNoChange` block with: `T.confirmNoChange === undefined`; from `fitting`, `markReady` → `not-in-progress`
(no shortcut). Add: `sendPriceChange(id, a.lines)` → ok, `changed === false`, status `price-change`; approve → `in-progress`,
money = `SCENARIOS.seed`. `driveTo('price-change', { priceChange: 'item' })` → `priceChangeView` garment kinds `['same'
(g1), 'changed' (g2), 'added' (n1)]`, `counts` `{ itemsAdded: 1, itemsRemoved: 0, servicesAdded: 0, servicesRemoved: 1,
repriced: 0 }`, `after.total === SCENARIOS.priceItem.total`, `after.deposit === SCENARIOS.seed.deposit`; approve →
`a.job.garments.map(g => g.type)` = `['Suit Pant', 'Suit Jacket', 'Pants / Jeans']`, `a.money.payout ===
SCENARIOS.priceItem.payout`. `'item-removed'` → garment g1 `removed`, `counts.itemsRemoved === 1`, approve → job has one
garment. Errors: `[]` → `no-items`; `cents: 2550` → `price-invalid`; `{ garmentType: 'Skirt', serviceId: 'sleeves' }` →
`service-type`; `bridal` on a new Formal Dress → `service-not-offered`; a duplicated line → `duplicate-line`; 11 garments →
`max-items`; a note with an email → stored masked (unchanged order too).

---

## B. Copy + navigation (both clusters)

### B1. Status words (amends M4-spec §B2)
| model state | customer (detail / list short) | tailor (detail / list short) |
|---|---|---|
| fitting | `fitting` "Fitting" | `fitting` "Fitting" |
| price-change · pending | `action` **"Approve order" / "Approve"** | `waiting` "Waiting on Sarah" / "Waiting" |
| price-change · messaged | `action` "Approve order" / "Approve" | as D-112 |
List "since" steps: c-bookings `STEP['price-change']` **"Final order"** (was "New price"); t-home **"Order sent"** (was "Price sent").

### B2. Navigation (amends M4 §B4)
- Tailor: t-job (visit) **Start fitting** → `T.startFitting` → draft `{ apptId, mode: 'new' }` → **t-adjust** (toast "Fitting
  started"). t-job (fitting) **Review the order** (`data-act="edit-order"`) → t-adjust. t-adjust **Send** → t-job (waiting,
  `{ fresh: true }`). t-job (waiting / messaged / replied) **Edit the order** (`data-act="revise"`) → t-adjust (`mode:
  'revise'`). t-adjust Back → t-job (dirty → leave modal).
- Customer: unchanged — Bookings row → `statusScreen` → c-price-change → Approve and start → c-booking (in-progress, `{ fresh:
  true }`) · Message → c-thread.

---

## C1. CLUSTER "Edit job" — `t-adjust` (rebuilt), `t-job` (fitting / waiting / approved states)

### t-adjust — "Edit the job" (T5, the fitting screen)
- **Purpose:** at the fitting, turn what Amara and Sarah agree into the final order — items and services added, removed or
  re-priced from her own price list — and send it to Sarah for approval. Always sent, even unchanged.
- **Focal:** the garment cards (the ticket); the outcome rides in the action bar lead.
- **Data:** appt rule as M4 (`fitting` or `price-change`, else empty state). **The draft always edits against the BOOKED order**
  (D-121), so the marks on this screen are the marks Sarah will see:
  ```js
  state.ui['t-adjust'] = { apptId, mode: 'new'|'revise', prices: { [key]: '50' }, removed: [key], added: [{ garmentId, serviceId }],
                           items: [{ id: 'n1', type: 'Pants / Jeans' }], removedItems: [garmentId], note, tried, seq }
  ```
  `key = ${garmentId}:${serviceId}`. `mode: 'revise'` seeds the draft from the sent order (`draftFromSent(a)`, screen-local):
  `prices` = sent cents that differ from booked, `removed` = booked keys absent from the sent lines (a booked garment with none
  left → `removedItems`), `added` / `items` = sent lines on keys / garments not booked, `note` = the sent note, `seq` = highest
  `n<k>` + 1. Draft lines = booked lines (minus removed keys and removed items) + added lines (price from `myTailor().prices`),
  each overridden by `d.prices[key]`. A booked garment whose every line is removed counts as a removed item. `pv =
  priceChangeView(a, previewLines)` (invalid prices fall back to their start cents for the preview, as M4). `changed` (for the
  bar copy) = `pv.changed`; in revise, `edited` = draft lines or note differ from what was sent.
- **Layout:** `chrome('home', { persona: 'tailor' })` · `headingRow(hero, { backRow: true })`: t-caps c-600 **"AT THE FITTING"**
  · `.t-title` **"Edit the job"** (revise: **"Edit the order you sent"**) · t-body c-700 `Add or remove items and services with
  ${first}, then send ${first} the final order. You start the work once ${first} approves.` · revise only: `banner({ tone: 'info',
  text: \`${first} hasn’t approved yet. Sending again replaces the order ${first} is looking at.\` })` · 24 ·
  **one card per garment** (white, `--radius-lg`, inset neutral-200 — the M4 `.t-adjust__card`), in booked order then new items:
  - **Card head** (min-height 44, flex): t-body w-600 garment type · tag (new item: **"New item"**, success fill as `changeList`)
    · right: text button **"Remove item"** (`data-act="remove-item" data-garment="${id}"`, t-small w-600, underline, 44×44 hit,
    `aria-label="Remove ${type}"`).
  - **Rows** — M4's adjust row (label | `$` input 96 | ✕ 44), marks: added on a booked item → tag **"New"** (success); re-priced
    vs booked → `was <s>$45.00</s>` + **"New price"**; removed row stays in place struck + **"Removed"** + **Undo** (M4). Rows on a
    new item carry no per-row tag. Price errors under the row at Send only (M4 copy).
  - `listRow({ title: '+ Add a service', act: 'add-service' })` + `data-garment` — hidden when nothing addable (M4).
  - **New item card**: inset 1px `--success` instead of neutral-200 (the v4 green, quietly) and the "New item" tag.
  - **Removed booked item** (D-121): the card collapses — head with the type `<s>` c-600 + tag **"Removed"** + button **"Undo"**
    (`data-act="undo-item"`, 44, t-body w-600); under it each of its services as a struck t-small line `label · $amount`
    (`data-money`), so Amara sees what goes. No inputs.
  - After the last card: a white card holding `listRow({ title: '+ Add an item', act: 'add-item' })`. At `MAX_ITEMS` the button
    gets `disabled aria-disabled="true"` and a t-small c-600 line under it: `Up to ${MAX_ITEMS} items on one job.`
  - Error slot under the cards (Send only): `banner({ tone: 'error', text: 'Keep at least one item with a service on this job.' })`.
  32 · `textArea` note (M4, label `Note to ${first} (optional)`) · 32 · `.t-h2` "What changes" · `changeSummary(pv.counts)` · 8 ·
  the two `deltaFigure`s (`${first} pays` total / `You take home` payout, both `was` booked — "Same as booked" when unchanged) ·
  `tailorBreakdown(pv.after)` · t-small c-600 `${first}’s ${fmtExact(deposit)} deposit stays the same. The balance is due when
  the order is ready.` (M4).
- **Action bar — ONE primary, always** (D-120): `actionBar({ ctaLabel: mode === 'revise' ? 'Send the updated order' : \`Send to
  ${first} for approval\`, ctaAct: 'send', busy, busyLabel: 'Sending…', disabled: mode === 'revise' && !edited, note: mode ===
  'revise' && !edited ? 'Change something to send it again.' : '', lead: pv.changed ? \`You take home <b
  data-money>${fmtExact(pv.after.payout)}</b>\` : \`No changes · You take home <b data-money>${fmtExact(pv.after.payout)}</b>\` })`.
  In `new` mode Send is enabled from the first render — an untouched order is sent as "no changes". No secondary.
- **Add an item (`t-adjust--add-item`, O)** — one sheet, two steps (`sheetOverlay(…, { header, confirm: false, dataS:
  't-adjust-add-item' })`):
  1. header **"Add an item"** · `role="radiogroup" aria-label="Item type"` · `optionRow({ name: 'type', value: type, title: type,
     sub: \`From ${fmtExact(cents(minPrice))}\`, act: 'pick-type' })` for each `GARMENT_TYPES` key (catalog order) where
     `servicesForType(type)` ∩ `myTailor().prices` is non-empty; `minPrice` = the lowest of those prices.
  2. (`t-adjust--add-item-service`, O) the same sheet re-renders: header **`What does the ${type} need?`** · a 44 px text button
     **"Choose another item"** (`data-act="pick-back"`) · `role="radiogroup" aria-label="Services"` · `optionRow({ name:
     'service', value: id, title: SERVICES[id].label, sub: \`Your price ${fmtExact(cents(price))}\`, act: 'pick-service' })` for
     her priced services of that type. Tap → `id = 'n' + d.seq++`, push `{ id, type }` to `d.items` and `{ garmentId: id,
     serviceId }` to `d.added` → close → `go(ID)` → focus that row's price input; `aria-live` toast-free (the card appearing is
     the result). An item is never created without a service (D-121).
- **Add a service (`t-adjust--add`, O)** — M4's sheet, unchanged; works on new items too.
- **Remove item:**
  - booked item → add to `d.removedItems` → re-render collapsed (above) → focus its Undo. **Undo** clears `removedItems` and
    every `removed` key of that garment (all its services come back at their draft prices) → focus "Remove item".
  - new item → removed outright (drop from `d.items`, its `d.added` entries and `d.prices` keys) with `toast(\`${type}
    removed.\`, { action: 'Undo', onAction })` restoring exactly what was dropped → focus "+ Add an item".
  - ✕ on the last live service of a booked item → that item becomes Removed (same collapsed card); on the last service of a
    new item → the new item is removed (toast + Undo).
- **Send:** `tried = true`; validate prices (M4 copy), "no item with a service left" (banner above), note length → first
  invalid field focused, no send. Else `withLatency` → `T.sendPriceChange(a.id, lines, { note })` → ok: delete the draft,
  `setFocus`, `go('t-job', { fresh: true })`, toast `Sent to ${first} for approval.` (revise: `Updated order sent to
  ${first}.`). Model errors map: `no-items` → the banner; `price-invalid` → under the field; anything else → toast "Something
  went wrong. Try again." and stay.
- **Leave (`t-adjust--leave`, O):** Back with an edited draft → `leaveModal({ title: 'Leave without sending?', body: \`${first}
  can’t approve the order until you send it. Your edits won’t be kept.\` })`. Untouched → straight to t-job.
- **No appt:** M4 empty state, body `You can edit the job during a fitting.`
- **FLOWS (`FLOWS_t_adjust` in m4.js, group 'M4 · Edit job', prefix `PC_`; existing entries keep their keys, expects updated):**
  - `t-adjust` ◆ (the unchanged default — `t-adjust--unchanged` is the same render, so it is NOT a separate key) ·
    `S.driveTo('fitting')` · `{ has: ['Edit the job', 'Hem pants', 'Shorten sleeves', 'Take in jacket sides', 'Add a service',
    'Add an item', 'No changes', 'Send to Sarah for approval', fmtExact(SCENARIOS.seed.payout)], sel: '[data-act="send"]:not([disabled])' }`
  - `t-adjust--edited` · as M4 (Sleeves +$5, Taper added) · `{ has: ['New', 'New price', 'Taper legs', fmtExact(priceAdded.total),
    fmtExact(priceAdded.payout), fmtNeg(priceAdded.tailyFee), 'up', '1 service added'], not: 'Added' }`
  - `t-adjust--item-added` · `const a = S.driveTo('fitting'); S.state.ui['t-adjust'] = { apptId: a.id, mode: 'new', prices: {},
    removed: ['g2:jacket-sides'], added: [{ garmentId: 'n1', serviceId: 'hem-pants' }], items: [{ id: 'n1', type: 'Pants / Jeans'
    }], removedItems: [], note: '', seq: 2 };` · `{ has: ['New item', 'Pants / Jeans', 'Removed', '1 item added',
    fmtExact(SCENARIOS.priceItem.total), fmtExact(SCENARIOS.priceItem.payout), 'down'] }`
  - `t-adjust--remove-item` · fitting + draft `removedItems: ['g1']` · `{ has: ['Removed', 'Undo', '1 item removed',
    fmtExact(SCENARIOS.priceItemRemoved.total), fmtExact(SCENARIOS.priceItemRemoved.payout)], sel: '[data-act="undo-item"][data-garment="g1"]' }`
  - `t-adjust--add-item` O · `S.driveTo('fitting')` · click `['[data-act="add-item"]']` · `{ has: ['Add an item', 'Pants / Jeans',
    'Shirt / Blouse', 'Skirt'], sel: '[data-s="t-adjust-add-item"] [data-act="pick-type"]' }`
  - `t-adjust--add-item-service` O · as above + click `'[data-act="pick-type"][data-value="Pants / Jeans"]'` · `{ has: ['What does
    the Pants / Jeans need', 'Hem pants', 'Taper legs', fmtExact(cents(AMARA.prices['hem-pants'])), 'Choose another item'] }`
  - `t-adjust--max-items` · fitting + a draft with `MAX_ITEMS − 2` new `'Shirt / Blouse'` items each with `repair` (built in a
    loop from `MAX_ITEMS`) · `{ has: [\`Up to ${MAX_ITEMS} items\`], sel: '[data-act="add-item"][disabled]' }`
  - `t-adjust--error` · as M4 · `{ has: 'Enter a price', sel: '[aria-invalid="true"]' }`
  - `t-adjust--add` O · as M4 (header "Add to Suit Pant").
  - `t-adjust--revise` · `driveTo('price-change', { priceChange: 'item' })` + `{ apptId, mode: 'revise' }` · `{ has: ['Edit the
    order you sent', 'Sending again replaces', 'New item', 'Pants / Jeans', 'Removed', \`${[...PRICE_NOTES.item].length} /
    ${TAILOR_LIMITS.NOTE_MAX}\`], sel: '[data-act="send"][disabled]' }`
  - `t-adjust--leave` O · as M4 (`t-adjust--edited` + Back) · `{ has: ['Leave without sending?', 'Keep editing'] }`
- **Accept checks:** every price input has its service name as `<label for>`; every add / remove / undo ≥ 44 with a named
  `aria-label`; a removed thing is struck and recoverable, never silently gone; the totals and take-home move as she edits; one
  filled button; Send works with zero edits and the bar says "No changes".

### t-job — fitting / waiting / approved (amends M4 §C2, replaces D-103's middle step)
- **visit:** unchanged layout; **Start fitting** now lands on **t-adjust** (B2), toast "Fitting started".
- **fitting (`t-job--fitting`)** — reached by Back from t-adjust: note `Go through each piece with ${first}. Add or remove
  items and services, then send ${first} the final order. You start the work once ${first} approves.` · bar `lead: You take
  home …payout` · primary **"Review the order"** (`edit-order`) → t-adjust (`mode: 'new'`) · secondary `Message ${first}`. **No
  "No changes, start the work", no "Adjust price".**
- **waiting (`t-job--waiting`)** — title `Waiting for ${first} to approve` · note `You sent the final order at ${fmtTime(sentAt)}.
  Start the work once ${first} approves.` · `deltaFigure({ label: 'You’ll take home', … was })` · t-small changed: `${first}
  sees a new total of $X (was $Y).` / unchanged: `${first} sees the total as booked, ${fmtExact(total)}.` · Your note · `.t-h2`
  **"The order you sent"** · `changeSummary(pv.counts)` · `changeList({ garments: pv.garments })` · "Your payout if approved" +
  `tailorBreakdown(pv.after)` · bar primary `Message ${first}`, secondary **"Edit the order"** (`revise`). messaged / replied
  (D-112) keep their titles and notes, with the same blocks and the same "Edit the order" secondary.
- **waiting, unchanged (`t-job--waiting-unchanged`, new key):** the same layout; the summary reads "No changes…", the figure
  "Same as booked", the list shows every booked row plain.
- **in-progress** — note `${first} approved the order. Mark it ready when the work is done. ${first} then picks how to get it back
  and pays the balance.` **approved with changes (`t-job--approved`)** = `a.priceChange.changed`: banner `${first} approved your
  changes. You take home ${fmtExact(a.money.payout)}.` and "Price updated after the fitting" captions — **every** place that
  tested `priceChange.state === 'approved'` (t-job `fine` / `updated`, completed payout caption) tests `priceChange?.changed &&
  state === 'approved'`, so an as-booked job never claims its price was updated. "The work" now lists new items (from the
  rebuilt `job.garments`).
- **FLOWS (in `FLOWS_t_job`, prefix `TJ4_`):** `t-job--fitting` `{ has: ['Fitting', 'Review the order', 'Message Sarah',
  fmtExact(seed.payout)], not: ['No changes, start the work', 'Adjust price', 'make it'] }` · `t-job--waiting` `{ has: ['Waiting on
  Sarah', 'The order you sent', 'Taper legs', 'New', fmtExact(priceAdded.payout), fmtExact(priceAdded.total), 'Edit the order'] }`
  · `t-job--waiting-unchanged` · `S.driveTo('price-change', { priceChange: 'unchanged' })` · `{ has: ['Waiting on Sarah', 'No
  changes', 'Same as booked', fmtExact(seed.total), 'Edit the order'], not: ['Removed', 'New price'] }` · `t-job--messaged` /
  `--replied` — expects swap "Change the new price" → "Edit the order" · `t-job--approved` `{ has: ['approved your changes',
  fmtExact(priceAdded.payout), 'Mark ready'] }` · `t-job--in-progress` `{ has: ['Work in progress', 'approved the order', 'Mark
  ready'], not: 'approved your changes' }`.

---

## C2. CLUSTER "Final order" — `c-price-change` (→ "Review your final order"), `c-booking` / `c-bookings` copy

### c-price-change — "Review your final order" (C9, v4's 04 Review & Approve)
- **Purpose:** show Sarah the order she is agreeing to — what was added, removed, re-priced, or that nothing changed — and the
  money, then **Approve and start** or **Message Amara**. No reject path (MASTER-PLAN §2).
- **Focal:** the `deltaFigure` ("New total", or "Total" when unchanged).
- **Data:** as M4 + `changed = pv.changed`, `pv.counts`.
- **Layout:** `chrome('bookings')` · `headingRow(statusHero({ pill: 'action', pillLabel: 'Approve order', title: 'Review your
  final order', body }), { backRow: true })` — body changed: `${first} updated your order at the fitting. Approve it and
  ${first} starts the work. Nothing more is charged until it’s ready.` · unchanged: `${first} checked everything at the fitting
  and nothing changed. Approve it and ${first} starts the work. Nothing more is charged until it’s ready.` · messaged banner
  `You messaged ${first} about the order. Approve when you’re ready, or keep talking in chat.` · revised line `${first} updated
  the order again at ${time}.` · 24 · `deltaFigure({ label: changed ? 'New total' : 'Total', cents: after.total, was:
  before.total })` · note quote (M4) · 32 · `.t-h2` **changed ? "What changed" : "Your order"** · `changeSummary(pv.counts)` · 8 ·
  `changeList({ garments: pv.garments })` — new items as the green **New item** panel, removed items struck with **Removed**,
  services **New** / **New price** / **Removed** · 32 · `.t-h2` "Price" · `moneyRows`: `Services` (caption changed ? `${first}’s
  final prices` : none) · Home-visit fee · Rush fee · `changed ? 'New total' : 'Total'` · Deposit `Paid` · **Stays the same** ·
  `changed ? 'New balance' : 'Balance'` · Due when ready · refund row (M4) · t-small c-600 `There’s no charge today. If something
  doesn’t look right, message ${first} before you approve.`
- **Action bar:** `actionBar({ ctaLabel: 'Approve and start', ctaAct: 'approve', busy, busyLabel: 'Approving…', lead: \`${changed
  ? 'New balance' : 'Balance'} <b data-money>${fmtExact(after.balance)}</b>\`, secondaryLabel: messaged ? 'Open chat' : \`Message
  ${first}\`, secondaryAct: 'message' })`. Approve → toast `Order approved. ${first} can start the work.` → c-booking.
- **States (data-driven, one layout):** ◆ added (New service + New price) · `--item-added` · `--item-removed` · `--removed` ·
  `--repriced` · `--messaged` · `--unchanged`.
- **FLOWS (`FLOWS_c_price_change`, prefix `PC_`):**
  - `c-price-change` ◆ · `driveTo('price-change')` · `{ has: ['Review your final order', 'Approve order', 'What changed', '1 service
    added', 'Taper legs', 'New', 'New price', fmtExact(priceAdded.total), fmtExact(priceAdded.balance), fmtExact(seed.total),
    fmtExact(seed.deposit), 'Stays the same', 'Approve and start', 'Message Amara'], not: ['Reject', 'Decline', 'Added'] }`
  - `c-price-change--item-added` · `{ priceChange: 'item' }` · `{ has: ['New item', 'Pants / Jeans', 'Hem pants', 'Removed', 'Take in
    jacket sides', '1 item added', '1 service removed', 'down', fmtExact(SCENARIOS.priceItem.total),
    fmtExact(SCENARIOS.priceItem.balance), fmtExact(SCENARIOS.seed.deposit)] }`
  - `c-price-change--item-removed` · `{ priceChange: 'item-removed' }` · `{ has: ['Removed', 'Suit Pant', '1 item removed',
    fmtExact(SCENARIOS.priceItemRemoved.total), fmtExact(SCENARIOS.priceItemRemoved.balance)], not: 'New item' }`
  - `c-price-change--removed` · expects as M4 + `'1 service removed'`.
  - `c-price-change--repriced` · `{ has: ['New price', '1 new price', fmtExact(priceRepriced.total), fmtExact(priceRepriced.balance)],
    not: ['New item', 'Removed'] }`
  - `c-price-change--messaged` · `{ has: ['You messaged Amara', 'Open chat', 'Approve and start'] }`
  - `c-price-change--unchanged` · `{ priceChange: 'unchanged' }` · `{ has: ['Review your final order', 'Your order', 'No changes',
    'Same as booked', 'Hem pants', 'Shorten sleeves', 'Take in jacket sides', fmtExact(seed.total), fmtExact(seed.balance),
    'Approve and start'], not: ['New total', 'New balance', 'Removed', 'New price'] }`
- **Accept checks:** flip to Amara on every state — t-job--waiting's "The order you sent" prints the same summary, tags,
  labels and amounts; deposit row Paid + Stays the same; exactly Approve (filled) and Message (outline); every change carries a
  text tag; the unchanged order still needs the tap.

### c-booking / c-bookings — copy only (D-123)
- c-booking `fitting` body: `${f} is going through the order with you. You’ll approve the final order here before any work
  starts.` · `price-change` cfg title `Review your final order` · `in-progress` body `You approved the order. You’ll pay the
  ${fmtExact(balance)} balance when it’s ready.` · timeline step 2: current `${first} goes through the order with you`, done
  **`Order approved · ${money(confirmedTotal(a))}`** · the "Updated after the fitting" caption only when
  `a.priceChange?.changed`.
- c-bookings / t-home "since" steps per §B1; c-bookings list pill comes from `statusWord` (short "Approve").
- FLOWS: `c-booking--in-progress` expect `'Price confirmed'` → `'approved the order'`.

---

## D. INTEGRATION (Integrator)

1. **Callers of `confirmNoChange`** → send-unchanged + approve: `js/fixtures/common.js` (`driveTo`, §A3), `js/fixtures/m3.js`
   `c-bookings--ready` setup (`S.T.startFitting(b.id); S.T.sendPriceChange(b.id, b.lines); S.T.approvePriceChange(b.id);
   S.T.markReady(b.id);` — `b` is the live appt, its booked lines are the unchanged order), `scripts/v5/model-test.mjs` (§A6). `grep -rn confirmNoChange js scripts/v5` must come back
   empty (v4 folders excepted).
2. **`docs/v5/SCREENS.md`** (then `node scripts/v5/lib/gen-inventory.mjs`):
   - `t-adjust` row → purpose "T5 Edit the job at the fitting: add / remove items and services, re-price → send the final order
     for approval (K-01)"; states `t-adjust` ◆ (no changes, Send on) · `t-adjust--edited` · · `t-adjust--item-added` · ·
     `t-adjust--remove-item` · · `t-adjust--max-items` · · `t-adjust--error` · · `t-adjust--add` O · `t-adjust--add-item` O ·
     `t-adjust--add-item-service` O · `t-adjust--revise` · · `t-adjust--leave` O (adds the D-109 keys the row was missing).
   - `c-price-change` row → purpose "C9 Review your final order: items and services added / removed / re-priced, or no changes →
     Approve and start or Message (K-01)"; states ◆ · `--item-added` · · `--item-removed` · · `--removed` · · `--repriced` · ·
     `--messaged` · · `--unchanged` ·.
   - `t-job` M4 list: `t-job--fitting` note "(Review the order)"; add `t-job--waiting-unchanged` ·.
   All new keys tagged **M4** (K-01 is an M4 follow-up; no new milestone).
3. **`scripts/v5/journeys.mjs`** — M4-spec §D4's J6–J8 were never added to the file (only J1–J5 exist). K-01 adds:
   - **J6 edit the job → Sarah approves → tailoring.** `flow('t-job--visit')` → `[data-act="start-fitting"]` → at `t-adjust` has
     `Edit the job`, `No changes` → `[data-act="add-item"]` → `[data-act="pick-type"][data-value="Pants / Jeans"]` →
     `[data-act="pick-service"][data-value="hem-pants"]` → at `t-adjust` has `New item`, `Pants / Jeans` →
     `[data-act="remove-line"][data-key="g2:jacket-sides"]` → `[data-act="send"]` → at `t-job` has `Waiting on Sarah`, `The order
     you sent`, `New item`, `fmtExact(S.priceItem.total)`, `fmtExact(S.priceItem.payout)` · `flip()` → `[data-nav="bookings"]` →
     `.appt-row` → at `c-price-change` has `Review your final order`, `New item`, `Pants / Jeans`, `Removed`, `Take in jacket
     sides`, `1 item added`, `fmtExact(S.priceItem.total)`, `fmtExact(S.priceItem.balance)`, `fmtExact(S.seed.deposit)`, `Stays
     the same` → `[data-act="approve"]` → at `c-booking` has `In progress`, `approved the order`, `fmtExact(S.priceItem.balance)`
     · `flip()` → t-home `.appt-row` → at `t-job` has `approved your changes`, `fmtExact(S.priceItem.payout)`, `Pants / Jeans`,
     `Mark ready`. (`New item` must also be read on the tailor side before the flip — the same-ticket check.)
   - **J6b no changes still needs approval.** `flow('t-job--fitting')` → `[data-act="edit-order"]` → `[data-act="send"]` → at
     `t-job` has `Waiting on Sarah`, `No changes` · `flip()` → Bookings → `.appt-row` → at `c-price-change` has `No changes`,
     `fmtExact(S.seed.total)`, `Approve and start` → `[data-act="approve"]` → at `c-booking` has `In progress` · `flip()` → t-home
     `.appt-row` → at `t-job` has `Work in progress`, `approved the order`, not `approved your changes`.
   - J7 / J8 from M4-spec §D4 are still owed (logged in PROGRESS.md, not part of K-01).
   - Header comment lists J6, J6b.
4. `docs/v5/CONTEXT.md` "M4 additions": `sendPriceChange` = the final order (garment-level adds/removes via `garmentId`,
   `n<k>` ids, error codes, `changed`), `approvePriceChange` rebuilds `job.garments`, `confirmNoChange` removed, `priceChangeView`
   `changed` / `counts` / garment `kind`, `changeSummary(counts)`, changeList "New" / "New item" (success), `statusWord` "Approve
   order", `SCENARIOS.priceItem` / `priceItemRemoved`, driveTo recipes `item` / `item-removed` / `unchanged` and the
   send-unchanged default.
5. `npm run check -- --accept-new` (new keys), then re-accept only the intended baselines (§E), then `npm run check` green.
   Figma: the D-119 frames `t-adjust` and `c-price-change` are stale after K-01 — re-sync them in the next Figma pass.

## E. Baselines that will change (re-accept these, nothing else)

- **New:** `t-adjust--item-added`, `t-adjust--remove-item`, `t-adjust--max-items`, `t-adjust--add-item`,
  `t-adjust--add-item-service`, `c-price-change--item-added`, `c-price-change--item-removed`, `c-price-change--unchanged`,
  `t-job--waiting-unchanged`.
- **Changed (intended):** `sys-components` (changeList / changeSummary blocks) · `t-adjust`, `t-adjust--edited`, `t-adjust--error`,
  `t-adjust--add`, `t-adjust--revise`, `t-adjust--leave` (hero, cards, bar) · `c-price-change`, `--removed`, `--repriced`,
  `--messaged` (title, pill, summary, New tags, CTA) · `t-job--fitting` (bar), `t-job--waiting`, `--messaged`, `--replied` (heading,
  summary, New tag, "Edit the order"), `t-job--approved` (banner), `t-job--in-progress`, `t-job--mark-ready` (note) · `c-booking`
  states whose timeline shows step 2 done or current — `c-booking--fitting`, `--in-progress`, `--returning-pickup`,
  `--returning-dropoff`, `--returning-courier`, `--completed` ("Order approved · $X") · `c-bookings` / `t-home` / `c-thread` /
  `t-thread` only if a baseline shows a price-change row or the changed system lines (the diff will say; accept only those).
- **Must NOT change** (if they move, it is a bug — usually a missing `priceChange.changed` gate): `t-job--ready`,
  `t-job--returning-*`, `t-job--courier`, `t-job--completed`, `c-ready*`, `c-complete`, `c-review*`, every M1–M3 baseline.
