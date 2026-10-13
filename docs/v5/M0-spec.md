# M0 — Foundation spec (build instructions)

Oct 13, 2026 · spec writer (Opus) · branch `V5`. Workers read **their section** + `docs/v5/CONTEXT.md`, never
the whole repo. Decisions this spec had to take are logged as D-03…D-24 in `DECISIONS.md` and cited inline.
Money copy is always dollar amounts, never percentages.

**Worker order:** (1) Model worker §A → (2) Component builder §B → (3) Harness worker §C (may start after §A)
→ (4) Integrator §D, who runs `npm run check` and owns every shared registration.

**M0 done when:** `npm run check` is green; the app boots to `sys-index`; `sys-components` shows every §B
component; the v4 code is archived, not deleted; `docs/v5/PROGRESS.md` says M0 code done.

---

## A. MODEL (Model worker)

All model files are **DOM-free ES modules** (Node imports them in the model test). They import only each other:
`money-config.js` ← `money.js` ← `dates.js` / `data.js` ← `state.js` ← `tailor-data.js`. No `document`, no `window`,
no `components.js`.

### A1. Archive first, then rewrite (keep / rename / delete)

1. `git mv js/screens/*.js js/screens/v4/` (65 files). `git mv js/fixtures.js js/tailor-data.js js/tailor-components.js js/v4/`.
   Copy (not move) `js/state.js js/data.js js/components.js js/flows.js js/scheduler.js` → `js/v4/`, then rewrite the
   originals. Archived files keep their broken relative imports: they are never loaded (v4 runs from `main`).
2. Keep / rename / delete from v4:

| v4 thing | v5 fate |
|---|---|
| `GARMENT_TYPES`, `GARMENT_ICONS` (re-export of `garment-icons.js`, never read it) | **keep** in `data.js` |
| `TRUST_BADGES` | **keep** in `data.js` (`['ID verified', 'Background check', 'Insured']`); drop `TRUST_BADGES_MATCHING` |
| `money()` | **replace** with `fmt / fmtExact / fmtNeg` in `money.js` |
| `itemsLabel` | **keep** in `data.js` |
| `parseWhen / fmtWhen / fmtDay / mdy / shiftDay / withinHours / isAfter` (parse "Jul 12" strings) | **rewrite** in `js/dates.js` over ISO strings (A4); same output grammar ("Thu, Oct 15 · 5:00 PM", "Thu, Oct 15", "10/15/26") |
| `scheduler.js` (`scheduler()`, `SCHED_ROW`, `timeColumns`, `dateColumn`, `readScheduler`, `settle`, `readTime`, `OPEN_MIN / CLOSE_MIN`, `timeLabel / timeMinutes`) | **keep**; its `strip / addDays / dayDiff / dayStamp / dayLabel` re-export from `dates.js`; import `fmtDay` from `dates.js`. Component builder adds `slotColumns / readSlot` (§B) |
| `JOB_TYPES`, `ADD_SERVICES`, `VISIT_FEE_*`, `FEE_LABEL`, `RUSH_LADDER`, `rushFee*`, `visitFee*`, `feeTier*`, `apptTotals`, `payout*`, `NO_SHOW_COMP` (data.js), `SEED_*`, `TAILORS` (4 Manhattan tailors), `APPT_*`, `NEED_BY_OPTS`, `STUDIO_HOURS`, `WHEEL_MINS`, `proposal*`, `handoffWindows`, `tailorName / tailorFirst / TAILOR_MATCHING`, `PAY_LABELS`, order ids | **delete** (archived in `js/v4/data.js`) |
| state.js v4 transitions (`requestTailor … deliver`, `statusScreen`, `STATUS_*`, address helpers, `draftFinalOrder`) | **delete**; v5 machine below |
| `js/icons.js` | **keep** unchanged |

### A2. `js/money-config.js` — the fee settings table (the only place rates live)

Mirrors CORE-JOURNEY "Taily fee settings". Human units (dollars, hours), frozen. **No other file may contain a rate
or one of these numbers** (hygiene lint, §C4).

```js
export const MONEY = Object.freeze({
  TAILY_FEE_RATE: 0.10,     // of the services subtotal only (not home-visit fee, rush, courier) — from the tailor's payout
  DEPOSIT_RATE: 0.10,       // of (services + home-visit fee), authorized at request, captured on accept
  COURIER_MARKUP: 0.10,     // on top of the courier quote, paid by the customer, kept by Taily
  COURIER_BASE: 8.00,       // mocked Uber quote: $8 base …
  COURIER_PER_MILE: 2.50,   // … + $2.50 per mile
  NO_SHOW_COMP: 25,         // floor the tailor is paid on a no-show (D-06)
});
export const POLICY = Object.freeze({
  CANCEL_WINDOW_H: 24,      // > 24 h before the visit → full refund; within → deposit kept
  REQUEST_EXPIRY_H: 2,      // tailor reply window
  MAX_RETRIES: 2,           // "Try again" count after an expiry
  EXPIRING_SOON_MIN: 15,    // countdown turns to the warning state
  NO_SHOW_WAIT_MIN: 15,     // tailor can mark a no-show this long after the start
  MIN_LEAD_H: 3,            // earliest bookable slot from now (D-17)
});
```

### A3. `js/money.js` — money functions (integer cents in, integer cents out) (D-03)

Every function returns **integer cents**; only `fmt*` return strings. Round half-up to the cent once per order
(`Math.round`), never per line (D-16). Names and signatures are fixed:

| fn | returns |
|---|---|
| `cents(dollars)` | `Math.round(dollars * 100)` |
| `linesFor(tailor, garments)` | `[{ garmentId, garmentType, serviceId, label, cents }]` from `tailor.prices` (dollars → cents); a service the tailor doesn't price is skipped and reported in `.missing` (array prop on the result) |
| `servicesTotal(lines)` | sum of `lines[].cents` |
| `rushFor(tailor, visitIso, needByIso)` | `{ days, cents }` — `days` = calendar days visit → need-by (`dates.dayDiff`); tier = the first `tailor.rush` entry with `days <= entry.days`, `cents(entry.fee)`; 4+ days or empty ladder → 0 (the **tailor's own** ladder) |
| `depositFor(services, homeFee)` | `Math.round(MONEY.DEPOSIT_RATE * (services + homeFee))` |
| `tailyFeeFor(services)` | `Math.round(MONEY.TAILY_FEE_RATE * services)` |
| `payoutFor({ services, homeFee, rush })` | `services − tailyFeeFor(services) + homeFee + rush` (courier never reaches the tailor, D-04) |
| `courierQuote(miles)` | `{ miles, cents: Math.round(cents(MONEY.COURIER_BASE + MONEY.COURIER_PER_MILE * miles) * (1 + MONEY.COURIER_MARKUP)) }` |
| `quote({ lines, homeFee = 0, rush = 0, courier = 0, deposit = null })` | `{ services, homeFee, rush, courier, total, deposit, balance, refund, tailyFee, payout }` — `total = services + homeFee + rush + courier`; `deposit = deposit ?? depositFor(services, homeFee)` (a booked appointment passes its captured deposit: a price change never changes it); `balance = max(0, total − deposit)`; `refund = max(0, deposit − total)` (D-23) |
| `estimate(tailor, job, slotIso = null)` | `quote(...)` for a draft job: `homeFee = job.visitType === 'home' ? cents(tailor.home.fee) : 0`; `rush` from `rushFor(tailor, slotIso ?? nextOpening, job.needBy)`; adds `rushDays` |
| `cancelTerms(appt, nowMs)` | `{ window: 'early' | 'late', refund, kept }` — early when `slot.start − now > POLICY.CANCEL_WINDOW_H` h: refund = deposit; late: kept = deposit, paid to the tailor in full (D-05) |
| `noShowPayout(deposit)` | `max(deposit, cents(MONEY.NO_SHOW_COMP))` (D-06) |
| `fmt(c)` | `"$25"` when whole dollars, else `"$4.50"` — price lists, list-row estimates, rush ladder, chips |
| `fmtExact(c)` | `"$16.00"` — every breakdown / receipt / payout row |
| `fmtNeg(c)` | `"−$12.50"` (U+2212) — the Taily fee row and refunds-out |

**Golden numbers** (the model test asserts these literals; Sarah's seed job with Amara, A5):

| scenario | services | home | rush | courier | total | deposit | balance | Taily fee | payout |
|---|---|---|---|---|---|---|---|---|---|
| seed, home, need-by Fri Oct 23 | 12500 | 3500 | 0 | 0 | 16000 | 1600 | 14400 | 1250 | 14750 |
| rush: need-by Fri Oct 16, visit Thu Oct 15 (1 day) | 12500 | 3500 | 4000 | 0 | 20000 | 1600 | 18400 | 1250 | 18750 |
| shop visit | 12500 | 0 | 0 | 0 | 12500 | 1250 | 11250 | 1250 | 11250 |
| seed + courier 0.6 mi | 12500 | 3500 | 0 | 1045 | 17045 | 1600 | 15445 | 1250 | 14750 |
| price change: + Taper $40, Sleeves $45→$50 | 17000 | 3500 | 0 | 0 | 20500 | 1600 | 18900 | 1700 | 18800 |
| price change: − Take in sides | 7000 | 3500 | 0 | 0 | 10500 | 1600 | 8900 | 700 | 9800 |
| late cancel → tailor keeps | kept 1600 | | | | | | | | 1600 |
| no-show → tailor paid | max(1600, 2500) | | | | | | | | 2500 |

### A4. `js/dates.js` — ISO date helpers (D-09)

Visit times are local ISO strings `'2026-10-15T17:00'`; need-by is `'2026-10-23'`. Month names keep the v4 table
(`Sep`). Exports: `toDate(iso)`, `isoMinute(date)`, `isoDay(date)`, `addDays(d, n)`, `addMinutes(d, n)`, `strip(d)`,
`dayDiff(a, b)` (calendar days), `weekdayKey(d)` (`'mon'…'sun'`), `minutesOf('17:30')`, `fmtWhen(iso)` →
"Thu, Oct 15 · 5:00 PM", `fmtDay(iso)` → "Thu, Oct 15", `fmtTime(iso)` → "5:00 PM", `fmtShort(iso)` → "Oct 15",
`fmtMdy(iso)` → "10/15/26", `fmtCountdown(ms)` → "2h" / "2h 5m" / "52m" / "Expired", `dayStamp / dayLabel` (scheduler).
**Nothing calls `Date.now()` or `new Date()` without an argument** except `state.js`'s clock init — screens read
`now()` from `state.js`.

### A5. `js/data.js` — catalog + the Brooklyn seed (fictional)

```js
export const DEMO_NOW = '2026-10-13T10:00';            // Tue — the frozen demo clock (D-09)
export const MAX_ITEMS = 10;                            // garments per job (D-11)
export const VISIT_MINUTES = { shop: 30, home: 60 };    // slot lengths (D-17); starts on :00 / :30, 9 AM–9 PM
export const VISIT_LABEL = { customer: { home: 'At my place', shop: 'At the shop' }, tailor: { home: 'Home visit', shop: 'Shop visit' } };
export const RETURN_LABEL = { pickup: 'In-store pickup', dropoff: 'Home drop-off', courier: 'Taily courier' };
export const PRIVACY_NOTE = 'Phone numbers and emails stay private on Taily.';
export const ZIP_INFO = {                               // mock geography: neighborhood + miles from the seed shop
  '11211': { hood: 'Williamsburg', miles: 0.6 }, '11222': { hood: 'Greenpoint', miles: 1.4 },
  '11206': { hood: 'East Williamsburg', miles: 1.5 }, '11237': { hood: 'Bushwick', miles: 2.3 },
  '11201': { hood: 'Brooklyn Heights', miles: 3.9 },   // the "zip outside" toggle
};
export const SHOP_RADIUS_MI = 5;                        // shop visits list shops within this distance (D-19)
```

`SERVICES` (catalog, id → `{ label, garments: [GARMENT_TYPES keys] }`), 11 entries:
`hem-pants` Hem pants (Suit Pant, Pants / Jeans) · `taper` Taper legs (Suit Pant, Pants / Jeans) · `waist` Take in or
let out waist (Suit Pant, Pants / Jeans, Skirt) · `sleeves` Shorten sleeves (Suit Jacket, Jacket, Shirt / Blouse) ·
`jacket-sides` Take in jacket sides (Suit Jacket, Jacket) · `shirt-take-in` Take in shirt (Shirt / Blouse) · `dress-hem`
Hem dress or skirt (Formal Dress, Dress / Jumpsuit, Skirt) · `dress-take-in` Take in dress (Formal Dress, Dress /
Jumpsuit) · `zipper` Replace zipper (Suit Pant, Pants / Jeans, Skirt, Dress / Jumpsuit, Jacket) · `repair` Repair or patch
(all 9 types) · `bridal` Bridal gown alterations (Formal Dress) — **not offered** by the seed tailor.

`TAILORS` = one tailor, id `amara` (`MY_TAILOR_ID` lives in `tailor-data.js`):

```js
{ id: 'amara', name: 'Amara Reyes', shopName: 'Reyes Tailoring', initials: 'AR', photo: null, workPhotos: 4, years: 12,
  bio: 'Tailoring in Williamsburg since 2014. I fit at my shop on Metropolitan Ave or at your place, and I show you every pin before I cut.',
  verified: true, badges: TRUST_BADGES,
  shop: { enabled: true, street: '312 Metropolitan Ave', city: 'Brooklyn', state: 'NY', zip: '11211', hood: 'Williamsburg' },
  home: { enabled: true, zips: ['11211', '11222', '11206', '11237'], fee: 35 },
  prices: { 'hem-pants': 25, taper: 40, waist: 35, sleeves: 45, 'jacket-sides': 55, 'shirt-take-in': 30,
            'dress-hem': 50, 'dress-take-in': 65, zipper: 30, repair: 20 },          // dollars; 10 services
  rush: [{ days: 1, fee: 40 }, { days: 2, fee: 25 }, { days: 3, fee: 15 }],          // 4+ days free
  returns: { pickup: true, dropoff: true, courier: true },
  availability: {                                                                     // no overlap between the two
    shop: { tue: [['10:00', '18:00']], wed: [['10:00', '18:00']], thu: [['10:00', '16:00']], fri: [['10:00', '18:00']], sat: [['13:00', '17:00']] },
    home: { mon: [['17:00', '20:00']], thu: [['17:00', '20:00']], sat: [['09:00', '12:00']] } },
  rating: { avg: 4.9, count: 37 },
  reviews: [   // newest first; shown on the profile with the average + count
    { id: 'r1', name: 'Priya S.', initials: 'PS', stars: 5, date: '2026-09-28', photos: 0, text: 'Hemmed three pairs of work pants in two days. She pinned everything at my place so the length was right with my shoes.' },
    { id: 'r2', name: 'Marcus T.', initials: 'MT', stars: 5, date: '2026-09-14', photos: 1, text: 'Took in a suit jacket I had given up on. It fits like it was made for me.' },
    { id: 'r3', name: 'Jenna L.', initials: 'JL', stars: 4, date: '2026-08-30', photos: 0, text: 'Great work on a dress hem. The return took a day longer than planned, but she messaged ahead.' },
    { id: 'r4', name: 'Dev R.', initials: 'DR', stars: 5, date: '2026-08-11', photos: 0, text: 'Fast zipper replacement at a fair price. Easy to book.' } ],
  payouts: { bank: 'Chase', last4: '6789', holder: 'Amara Reyes' },
  onboarding: { profile: true, services: true, where: true, returns: true, availability: true, payouts: true } }
```

`CUSTOMER` (Sarah): `{ id: 'sarah', first: 'Sarah', last: 'Chen', initials: 'SC', phone: '(718) 555-0142', email:
'sarah.chen@example.com', address: { street: '145 N 7th St', unit: '2R', city: 'Brooklyn', state: 'NY', zip: '11211' },
cards: [{ id: 'visa-4242', brand: 'Visa', last4: '4242', exp: '08/28', default: true }], applePay: true }`.

`SEED_JOB` (Sarah's draft, C1–C2 prefilled): `{ garments: [{ id: 'g1', type: 'Suit Pant', services: ['hem-pants'], photos: 0 },
{ id: 'g2', type: 'Suit Jacket', services: ['sleeves', 'jacket-sides'], photos: 1 }], visitType: 'home', zip: '11211',
address: <CUSTOMER.address>, needBy: '2026-10-23', declinedBy: [], hiddenTailors: [] }`.
With the clock at Tue Oct 13 10:00 the first **home** opening is **Thu Oct 15 · 5:00 PM** and the first **shop** opening
**Tue Oct 13 · 1:00 PM** (MIN_LEAD_H). `BLANK_TAILOR` = the same shape with every section empty / `enabled: false`,
`onboarding` all false, same id (onboarding flows overwrite `amara`, D-20).

### A6. `js/state.js` — v5 state, machine, transitions

```js
export const state = {
  persona: 'customer',                 // 'customer' | 'tailor' (D-21; v4 said 'user')
  clock: { now: <ms of DEMO_NOW> },
  session: { customer: { signedIn: true }, tailor: { signedIn: true } },
  customer, tailors, job,              // deep clones of CUSTOMER, TAILORS, SEED_JOB
  appts: [],                           // every appointment; both personas read the same objects
  threads: {},                         // { [tailorId]: { tailorId, customerId, messages: [] } } — one per pair
  payouts: [],                         // tailor ledger rows { apptId, cents, state: 'pending'|'paid'|'failed', date }
  sim: { latency: 'normal', card: 'ok', courier: 'ok', network: 'online', push: 'default', send: 'ok', session: 'valid' },
  ui: {},                              // screen-local transient UI only; the model never reads it
};
```

**Appointment** `{ id, customerId, tailorId, job (frozen copy: garments, visitType, zip, address, needBy), lines (price
snapshot from linesFor — later price-list edits never change a booking), slot: { start, end }, status, requestedAt,
expiresAt, retries, suggested: null | { start, at }, declineReason, money (quote snapshot, cents), payments: { deposit:
{ cents, state: 'authorized'|'captured'|'released'|'refunded'|'kept' }, balance: { cents, state: 'pending'|'due'|'paid'|'failed' } },
priceChange: null | { lines, marks: [{ garmentId, serviceId, kind: 'added'|'removed'|'repriced', from, to }], sentAt, state:
'pending'|'approved'|'messaged' }, returnOption, courier: null | { miles, cents, state }, cancel: null | { by, reason, at,
refund, kept, tailorPaid }, review, history: [{ status, at }] }`. Ids `A-1001`, `A-1002`… (module counter reset by `reset()`).

**State machine** (the draft is `state.job`, not an appointment):

```
draft ─requestBooking→ requested ─tailorAccept→ confirmed ─startFitting→ fitting ─sendPriceChange→ price-change ─approvePriceChange→ in-progress
                         │  ├─tailorSuggest→ suggested ─acceptSuggestion→ confirmed     └─confirmNoChange→ in-progress ─markReady→ ready
                         │  │                         └─findAnotherTailor→ cancelled(switched)            ready ─payBalance→ returning ─markCompleted→ completed
                         │  ├─tailorDecline→ declined (terminal; thread read-only; job back to draft, tailor in job.declinedBy)
                         │  ├─expireRequest→ expired ─tryAgain (retries < MAX_RETRIES)→ requested   (expired with retries = MAX → final; tailor in job.hiddenTailors)
                         │  └─withdrawRequest→ cancelled(withdrawn)
confirmed ─cancelBooking→ cancelled(customer-early | customer-late) · ─tailorCantMakeIt→ cancelled(tailor-cant-make-it) · ─markNoShow→ cancelled(no-show)
```

Transitions: pure, mutate `state`, take an **appointment id**, return `{ ok: true, appt }` or `{ ok: false, error }`
(a guard failure never throws; an unknown id throws). Each success pushes `history` and, where noted, a system
message into the pair's thread.

| fn(signature) | guard (else `error`) | effect |
|---|---|---|
| `setJob(patch)` / `addGarment(type)` / `removeGarment(id)` / `setServices(garmentId, ids)` | `MAX_ITEMS` (`'max-items'`) | edits `state.job` |
| `validateJob(job, step: 'what'|'where')` | — | `{ ok, errors: { field: code } }`: `no-garments`, `no-service:<gid>`, `zip-invalid` (not 5 digits), `address-required` (home without street), `needby-past` (before tomorrow) |
| `requestBooking({ tailorId, slotStart, cardId })` | job valid; `eligible()` ok; slot in `openSlots`; tailor not in `job.declinedBy` (`'declined'`); `sim.card`: `'declined'` → `'card-declined'`, `'3ds'` → `'needs-3ds'` (call again with `{ threeDS: true }`) | new appt `requested`, deposit `authorized`, `expiresAt = now + REQUEST_EXPIRY_H`; thread ensured; system msg "Request sent" |
| `withdrawRequest(id)` | `requested` or `suggested` | `cancelled` (`withdrawn`), hold `released`, job back to draft (D-22) |
| `tailorAccept(id)` | `requested`, `now < expiresAt` (`'expired'`) | `confirmed`, deposit `captured`; msg "Amara accepted" |
| `tailorSuggest(id, slotStart)` | `requested`; slot open | `suggested` (no expiry, D-14) |
| `acceptSuggestion(id)` | `suggested` | `confirmed` at `suggested.start`, deposit `captured` |
| `findAnotherTailor(id)` | `declined`, `suggested`, or expired-final | copies the job back to `state.job` (kept); `suggested` → `cancelled` (`switched`), hold released |
| `tailorDecline(id, reason = '')` | `requested` | `declined`, hold `released`, `job.declinedBy += tailorId`, thread read-only |
| `expireRequest(id)` | `requested` (forced by the clock tick or a flow) | `expired`, hold `released`; if `retries === MAX_RETRIES` → `job.hiddenTailors += tailorId` (D-07) |
| `tryAgain(id)` | `expired`, `retries < MAX_RETRIES` (`'no-retries'`) | `requested`, `retries + 1`, new `expiresAt`, hold re-`authorized` |
| `cancelBooking(id)` | `confirmed` | `cancelTerms`: early → `refunded`; late → `kept`, `cancel.tailorPaid = deposit` |
| `rescheduleBooking(id, slotStart)` | `confirmed`, window early (`'too-late'`), slot open | new slot, stays `confirmed` (D-12) |
| `tailorCantMakeIt(id, reason)` | `confirmed` | `cancelled` (`tailor-cant-make-it`), deposit `refunded`, job back to draft |
| `markNoShow(id)` | `confirmed`, `now ≥ start + NO_SHOW_WAIT_MIN` (`'too-early'`) | `cancelled` (`no-show`), deposit `kept`, `cancel.tailorPaid = noShowPayout(deposit)` |
| `startFitting(id)` | `confirmed`, `now ≥ slot.start` (`'too-early'`) | `fitting` |
| `sendPriceChange(id, lines)` | `fitting`; every line has `cents > 0` (`'price-missing'`) | `price-change`, `priceChange.marks` computed vs `appt.lines` |
| `confirmNoChange(id)` | `fitting` | `in-progress` |
| `approvePriceChange(id)` | `price-change` pending | `appt.lines = priceChange.lines`, `money = quote({ …, deposit: captured })`, `in-progress` |
| `messageAboutPriceChange(id)` | `price-change` pending | `priceChange.state = 'messaged'` (stays `price-change`; disputes settle in chat) |
| `markReady(id)` | `in-progress` | `ready`, balance `due` |
| `chooseReturn(id, option)` | `ready`; option offered by the tailor (`'not-offered'`) | sets `returnOption`; courier → `courier = { miles: ZIP_INFO[zip].miles, state: sim.courier === 'fail' ? 'failed' : 'ready', cents }` |
| `payBalance(id, cardId)` | `ready`, return chosen, courier quote `ready` if courier; `sim.card` | balance `paid`, `returning` (or `failed` + `'card-declined'`) |
| `markCompleted(id)` | `returning` | `completed`, payout row `pending` |
| `leaveReview(id, { stars, text, photos })` | `completed`, no review, `1 ≤ stars ≤ 5` (`'stars-required'`), photos ≤ 3 | review saved; tailor `rating` recomputed (avg to 1 decimal, count + 1) |
| `sendMessage(tailorId, from, { text, photos })` | not read-only (`'read-only'`); `sim.send` | `maskContact(text)`; returns `{ ok, masked }` |
| `maskContact(text)` | — | `{ text, masked }`: phones `/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g` → "[phone hidden]", emails → "[email hidden]" |
| `setTailorSection(section, patch)` / `validateSection(section, data)` | per-section rules (M2 fills in) | edits `tailors[0]`; `bookable = all 6 onboarding flags` |
| `now()` / `setClock(iso)` / `advanceClock(minutes)` | — | `advanceClock` runs `tick()`: expires every `requested` past `expiresAt` |

**Selectors:** `getAppt(id)`, `apptsFor(persona)`, `activeAppt()` (newest non-terminal of the customer's),
`threadFor(tailorId)`, `threadReadOnly(tailorId)` (latest appt for the pair is `declined` and no newer one),
`eligible(tailor, job)` → `{ ok, reason: 'zip' | 'shop-off' | 'nothing-open' | 'declined' | 'hidden' }`,
`openSlots(tailorId, visitType, { until })` (A5 rules: lengths, :00/:30, ≥ now + MIN_LEAD_H, date before `until`
(the need-by, D-18), no overlap with that tailor's `requested`/`suggested`/`confirmed` appts), `nextOpening(...)`,
`tailorsFor(job)` → `{ rows: [{ tailor, quote, distanceMi, nextOpening, declined }], empty: null | 'zip' | 'shop' |
'nothing-open' | 'none-left' }` (precedence: zip/shop filter → hidden → slots; a declined tailor stays as a row with
`declined: true`).

**`statusScreen(appt, persona = state.persona)`** — THE status → screen map (table in `SCREENS.md`):
customer `requested|suggested|declined|expired → c-request`, `price-change → c-price-change`, `ready → c-ready` while
the balance is unpaid, `completed → c-complete` until reviewed, everything else `c-booking`; tailor `requested|
suggested|declined|expired → t-request`, everything else `t-job`. Also export `T` (one object holding every transition above, so screens and flow setups call `T.tailorAccept(id)`), `STATUSES`, `TERMINAL = ['declined',
'cancelled', 'completed']` and `reset()` (restores every field above, keeps `sim.latency`).

### A7. `js/tailor-data.js` (new)

`MY_TAILOR_ID = 'amara'`, `myTailor()`, `inbox()` → `{ requests, upcoming }`, `jobAddress(appt)` (neighborhood + zip
until accepted, full street + unit after), `requestView(appt)` → `{ garments, lines, visitLabel, place, when, needBy,
estimate, tailyFee, payout, expiresAt }`.

### A8. Test-flows toggles and sim knobs (for later milestones; real data, never fixture fields)

| toggle | how a setup reaches it |
|---|---|
| zip outside | `setJob({ zip: '11201', address: null })` with `visitType: 'home'` → `empty: 'zip'` |
| shop off | `setTailorSection('where', { shop: { enabled: false } })` + `setJob({ visitType: 'shop' })` → `empty: 'shop'` |
| need-by too early | `setJob({ needBy: '2026-10-15' })` (home: first opening Thu Oct 15 is not before it) → `empty: 'nothing-open'` |
| previously declined | `driveTo('declined')` → back on the list, row `declined: true` |
| rush | `setJob({ needBy: '2026-10-16' })` → `rushDays 1`, +$40.00 |
| card declined / 3-D Secure | `state.sim.card = 'declined' | '3ds'` |
| courier loading / failed | `state.sim.courier = 'loading' | 'fail'` |
| offline, push denied, send fails, session expired | `state.sim.network / push / send / session` |
| loading skeletons | `state.sim.latency = 'hold'` (the harness boots with `?test=1` → `'instant'`) |

### A9. `js/fixtures/common.js` — `driveTo` (M0 writes it; every milestone reuses it)

`driveTo(target, { visitType = 'home', rush = false, priceChange = 'added' | 'removed' | 'repriced', returnOption =
'pickup' }) → appt` composes **only** the A6 transitions plus clock moves, starting from `reset()` state. Targets:
`requested, suggested, declined, expired, expired-2, expired-final, confirmed, cancelled-early, cancelled-late,
cant-make-it, no-show, fitting, price-change, in-progress, ready, returning, completed, reviewed`. Recipe: request
the first open slot (home: Thu Oct 15 5:00 PM) → accept → for late cancel `setClock('2026-10-15T09:00')`; for fitting
`setClock(slot.start)`; for no-show `setClock(start + 20 min)`; expiries `advanceClock(121)`.

---

## B. COMPONENTS (Component builder)

**Where:** shared render fns in `js/components.js`, styles in a NEW `css/components-v5.css` (v4 `components.css`
stays as is). All return HTML strings; behaviour goes in `wire*` helpers. Rules: tokens only (`css/tokens.css`), Figma
type scale only (10/12/16/24/28/32/36 via `.t-*` classes), every tappable ≥ 44×44 px, visible labels, errors next to
the field, `prefers-reduced-motion` respected, money elements carry `data-money` and print via `fmt*` only.

**First, fix `components.js` for the new `data.js`:** delete the v4-only exports that import removed names —
`garmentCard, additionalSelector, apptCard, cardList, cardStatus, TERMINAL_CARD_STATUSES, isTerminalStatus,
requestCard, tailorTrust, orderCards, apptRows, receiptDates, dueBase, dueAtHandoff, rushCaptionFor, feeLabelFor,
orderRows, feeTierNote, receiptRows, deliveryWindow` (all archived in `js/v4/components.js`). Keep and reuse:
`statusBar, topNav, chrome, cta, ctaSmall, statusPill, timeChip, selectTime, linkRow, garmentTile, photoTile, selector,
summaryCard, trustBadges, trustCard, visitBlock, headingRow, backButton, statusHero, sheet, sheetOverlay,
modalOverlay, closeOverlay, overlayOpen, wireSheetA11y, toast, wheel, wheelScroll, wireWheel, methodRow, bubble,
timeline, infoCard, infoRow, metaRow, feeRow, progressBar`.

**Type classes** (`base.css`, the one type block): add `.t-h2` (serif, `--size-24`, line-height 29px, 600) and
`.t-display` (serif, `--size-32`, 38px, 500). v5 code never uses `.t-section` (it is size 20, off-scale).

| fn(params) | states | extends / tokens |
|---|---|---|
| `chrome(active, { persona = 'customer' })`; `NAV.customer = [home, bookings, messages, account]`, `NAV.tailor = [home, shop, earnings, messages]` | active tab | `topNav(active, items)` |
| `statusPill(status, label?)` — add v5 keys: `suggested` (awaiting-customer, "New time"), `fitting` (tailoring, "Fitting"), `price-change` (awaiting-customer, "Price change"), `in-progress` (tailoring, "In progress"), `returning` (ready, "On its way"), `withdrawn` (cancelled) | 12 statuses | existing `PILL_VARIANTS` |
| `avatar({ initials, photo = null, size = 'sm'|'md'|'lg' })` | photo / initials | `.avatar`, 40 / 56 / 80 |
| `tailorRow({ id, name, initials, photo, verified, rating, distanceMi, quote, nextOpening, visitType, declined = false })` | default · rush (caption "+ $40 rush fee") · declined (dimmed, note "Declined this job", `aria-disabled`) · skeleton via `skeleton('tailor-row')` | a `<button data-act="open-tailor" data-id>` card: avatar + name ✓ + `trustBadges`, "★ 4.9 (37) · 0.6 mi", "Est. $160" (`fmt`, `data-money`) + caption "Includes $35 home-visit fee", "Next opening Thu, Oct 15 · 5:00 PM"; `.info-card` chassis, white, `--radius-lg` |
| `priceRow({ label, cents, note = '', muted = false })` | default · muted ("Not offered") | label left / `fmt` right, `data-money`, hairline between rows |
| `ratingSummary({ avg, count })` · `stars({ value = 0, input = false, name = 'stars' })` | display · input (5 radio buttons, 44 px each, `aria-label="4 stars"`) | ★ glyphs, `--accent-ink` |
| `reviewRow({ name, initials, stars, date, text, photos = 0 })` | text · no text · photos | `avatar sm`, `fmtShort(date)`, `photoTile` thumbs |
| `countdown({ expiresAt, now, suffix = 'left' })` | normal · soon (≤ `EXPIRING_SOON_MIN`, `--warning`) · expired (`--error`, "Expired") | `<span role="timer" data-countdown>`; text from `fmtCountdown`; no interval (D-09) |
| `chatBubble({ text, side = 'them'|'me', time, photos = 0, status = 'sent'|'sending'|'failed', masked = false })` | sent · sending · failed ("Not sent · Retry", 44 px button `data-act="retry"`) · masked (note under a `me` bubble: `PRIVACY_NOTE`) · photo | `bubble()` / `.bubble` |
| `privacyNote()` · `readOnlyBanner({ text, ctaLabel = 'Find another tailor', ctaAct = 'find-another' })` · `composer({ value = '', disabled = false, placeholder = 'Message' })` | composer: empty (send disabled) · typing · disabled (read-only) | `banner` + `cta` |
| `field({ id, label, value = '', type = 'text', inputmode, autocomplete, placeholder, helper = '', error = '', prefix = '', suffix = '', maxlength, attrs })` · `codeInput({ id, length = 6, value = '', error = '' })` | default · focus · filled · error (replaces helper, `aria-invalid`, `aria-describedby`, `--error` text + inset 1px error stroke) · disabled | label 12/16 600 neutral-700 above, input min-height 48, white, `--radius-md`, inset 1px `--neutral-200` stroke |
| `stepper({ steps, current, done = [] })` | per step: done · current · todo | "Step 2 of 6 · Services prices" + `.progress` segments (done ink, current accent-ink, todo neutral-100) |
| `toggle({ id, label, checked = false, disabled = false, helper = '' })` | on · off · disabled | `<button role="switch" aria-checked>`; row ≥ 44 |
| `checkRow({ id, label, checked = false, caption = '', attrs })` | checked · unchecked · error | 44 px row, inset stroke box |
| `chipGroup({ name, label, options: [{ value, label, disabled, caption }], value, multi = false, variant = 'chips'|'segmented', error = '' })` | selected · disabled · error; segmented = visit type ("At my place" / "At the shop") | `.chip` / `.chip--selected`, `role="radiogroup"` or `aria-pressed` |
| `listRow({ title, sub = '', right = '', act, chevron = true })` | default · with value | `linkRow` / `CHEVRON_RIGHT` |
| `skeleton({ kind = 'line'|'tailor-row'|'card'|'thread', count = 1 })` | static under reduced motion | `--neutral-100` blocks, `aria-busy="true"` wrapper, sr-only "Loading" |
| `emptyState({ title, body, ctaLabel, ctaAct, secondaryLabel, secondaryAct })` | with / without CTAs | `.t-h2` title, `.t-body` neutral-600, `cta` |
| `banner({ tone = 'info'|'success'|'warning'|'error', title = '', text, actionLabel, actionAct, dismissible = false })` · `toast(msg, { tone = 'neutral' })` | 4 tones; error → `role="alert"` | `--{tone}-bg` fill + `--{tone}` text |
| `moneyRows(rows)` — row `{ label, cents, caption, status, kind = 'default'|'negative'|'subtotal'|'total'|'muted'|'changed' }` | the kinds | `<div class="money-rows" data-money>`; `fmtExact`, `fmtNeg` for `negative`; throws in dev if a label contains `%` |
| `customerBreakdown(q, { stage = 'estimate'|'booked'|'ready'|'paid', tailorFirst })` | per stage | Services · Home-visit fee · Rush fee (caption "Need-by 1 day after the visit") · Taily courier · **Total** · Deposit ("Due today" / "Paid") · Balance ("Due when ready" / "Paid") — zero rows omitted |
| `tailorBreakdown(q)` | — | Services · Home-visit fee · Rush fee · Taily fee **−$12.50** (`negative`) · **Your payout $147.50** (`total`) — no courier row (D-04) |
| `slotColumns(slots, selectedIso)` · `readSlot(root, slots)` (in `scheduler.js`) | — | the Scheduler's day column = days that have open slots; time columns limited to that day's slots |

---

## C. HARNESS (Harness worker, per D-01)

1. `git mv` every v4 script into `scripts/v4/` (`bands, check, clickthrough*, diff, export-refs, figma-find, money,
   refs-check, text-parity, screens.json, lib/`) — unrun. `git mv ref/*.png ref/v4/`. **Keep `scripts/serve.mjs`.**
   `.gitignore`: replace `!ref/*.png` with `!ref/v4/*.png` and `!ref/v5/*.png`; add `diff/`.
2. `package.json`: name `taily-v5-prototype`; scripts `check: node scripts/v5/check.mjs`, `serve: node scripts/serve.mjs`,
   `model: node scripts/v5/model.test.mjs`, `flows: node scripts/v5/flows.mjs`, `visual: node scripts/v5/visual.mjs`,
   `hygiene: node scripts/v5/hygiene.mjs`. Drop `refs`, `refs:check`, `diff`, `figma:find`.
3. Shared: `scripts/v5/lib/server.mjs` (static server on port 0, same MIME table as `serve.mjs`) and
   `scripts/v5/lib/browser.mjs` (Chromium, viewport 390×844, `deviceScaleFactor: 2`, `reducedMotion: 'reduce'`,
   opens `/?test=1`, collects `pageerror` + console errors + `flow "…"` warnings). `PASS` / `FAIL  desc  detail` lines.
4. `scripts/v5/check.mjs` runs **sequentially** (never in parallel — screenshots corrupt), quiet unless a step fails
   (`--verbose` streams), one summary block, exit 1 on any failure. Passes `--accept-new` through to visual.
   1. **model** — `model.test.mjs` in Node (no browser): every A3 golden number; `fmt / fmtExact / fmtNeg`; rush tiers
      days 0–4; transition guards (accept after expiry fails, `tryAgain` after 2 retries fails, late cancel keeps
      $16.00, no-show pays $25.00, reschedule inside 24 h fails); `tailorsFor` empty reasons for the four A8 toggles;
      `maskContact` on "call me at 718-555-0199 or sarah@x.com"; `statusScreen` for every status × persona.
      `scripts/v5/money.mjs` exports the scenario numbers computed by `js/money.js` for journeys / flows.
   2. **flows** — `flows.mjs`: (a) registry: keys unique and `/^[a-z0-9.-]+$/`; every entry's `screen` registered;
      every registered screen has ≥ 1 entry; every `js/inventory.js` state key of a milestone in `BUILT` has an entry.
      (b) for each entry: `window.Taily.runFlow(key)` → `#screen[data-screen] === entry.screen`,
      `html[data-persona]` matches, `expect` holds, no console error, no "nothing to click" warning, the **money lint**
      (no `%` in any `[data-money]` text; no `/(fee|deposit|refund|payout|balance|courier|total)[^.\n]{0,40}\d\s?%/i`
      in visible text) and the **target lint** (every visible `button, a, input, select, textarea, [role=button],
      [role=switch], [data-act]` in `#screen` and open overlays ≥ 44×44, unless `data-hit="inline"`). (c) menu
      behaviour: trigger opens, tabs switch, clicking an entry runs it, Escape closes, `?flow=<key>` boots it, persona
      flip keeps state. (d) from M3: `scripts/v5/journeys.mjs` (cross-persona: book as Sarah → accept as Amara →
      Sarah sees `c-booking--confirmed`) runs here when the file exists.
   3. **visual** — `visual.mjs`: for every entry with `visual !== false`, run the flow, await `document.fonts.ready`,
      screenshot `#screen` (full height), compare with `ref/v5/<key>.png` (pixelmatch threshold 0.1); gate ≤ 0.10 %
      mismatching pixels; diffs to `diff/v5/<key>.png`. No baseline → FAIL "no baseline" unless `--accept-new`
      (writes missing ones only — the first-build rule). `npm run visual -- --accept <key|prefix*> …` re-baselines on
      purpose (Integrator only; list the keys in the commit body). Stale baselines (no entry) → FAIL.
   4. **hygiene** — `hygiene.mjs` (static): literal hex / px font-size in `css/` outside `tokens.css` / `base.css`
      (v4 allowlist `#E2DCD1`); in v5 CSS (`css/components-v5.css`, `css/screens/*.css`) only the scale tokens
      `--size-10|12|16|24|28|32|36`; no rate literals in `js/` outside `js/money-config.js` (regex
      `/(?<![\w.])0?\.10?(?!\d)|\b(10|24)\s?%/`, skipping `js/v4/`, `js/screens/v4/`, `js/garment-icons.js`, `js/icons.js` (SVG matrices)); no
      `Date.now()` / argument-less `new Date()` in `js/screens/` or `js/components.js`; screen files import no other
      screen file.
5. **The FLOWS / EXPECT contract** (every milestone follows it; full text in `CONTEXT.md`): an entry is
   `{ key, screen, persona?, group, title, note?, setup?(S), click?: [selector], expect: { has?, not?, sel? }, visual? }`.
   `has` / `not` are a string or an array matched against the visible text of `#screen` + open overlays; `sel` must
   match an element. Dollar strings in `expect` are computed with `fmt*` from `js/money.js`, never typed by hand.
   `setup(S)` composes real transitions only; `S = { state, T, driveTo, setClock, advanceClock, sim, job, tailor, appt }`.

---

## D. INTEGRATION (Integrator)

1. **Register v5 only.** `app.js`: `SCREEN_MODULES = ['sys-index', 'sys-components']` (one line per screen id, grouped
   by milestone comments). Persona from the id: `c-` → customer, `t-` / `to-` → tailor, `sys-` keeps the current one;
   set `document.documentElement.dataset.persona` on every render. `PERSONA_HOME = { customer: 'c-job', tailor:
   't-home' }`, falling back to `sys-index` while unregistered (used by Back at the root and the persona flip). Boot:
   `?flow=` → `runFlow`; else `?screen=` → that id; else `sys-index`. `?test=1` sets `state.sim.latency = 'instant'`
   and adds `html.is-test` (base.css: transitions / animations off, caret hidden). Remove the v4 "Profile" toast.
   Expose `window.Taily = { render, back, register, registered, currentScreen, state, runFlow, flows: ALL_FLOWS }`.
2. **Screens** follow the pattern `register(id, view, wire)` in `js/screens/<id>.js`, styles in `css/screens/<id>.css`
   (Integrator adds the `<link>`). M0 builds two:
   - `sys-index` — title "Taily v5" (`.t-display`), sub "Prototype index · demo clock Tue, Oct 13 · 10:00 AM";
     one section per milestone M0–M6 from `js/inventory.js` (`MILESTONES`, `BUILT`): name, built / todo pill, and for
     built ones each screen as a `listRow` (`?screen=<id>`) with its state keys as links (`?flow=<key>`). Unbuilt
     milestones show their screen count only.
   - `sys-components` — the §B gallery: one labelled block per component, every state side by side, using seed
     data (Amara's row, Sarah's breakdown $160.00 / $16.00 / $144.00, the tailor breakdown −$12.50 / $147.50).
3. **`index.html`**: title "Taily"; links `tokens, base, components, components-v5, flow-menu` + `css/screens/*.css`;
   `git mv css/screens.css css/tailor.css css/v4/` and drop their links.
4. **Test flows menu** (`flow-menu.js`): keep the panel, trigger, Escape / outside-click, `?flow=`; tabs **Customer ·
   Tailor · System** (entries filtered by `persona`, `system` for `sys-*` screens); groups = `entry.group`. The footer
   flip renders `PERSONA_HOME` of the other side without resetting. Emptied of v4 entries.
5. **`js/flows.js`** (rewritten): `resetDemo()` = `reset()` + `state.ui = {}`; builds `S`; `ALL_FLOWS` = the
   concatenation of every `FLOWS_*` export of `js/fixtures/m0.js … m6.js` (one `import * as M#` line per milestone);
   `findFlow`, `prepareFlow(key)` (reset → `setup(S)` → persona from the screen id), `runFlow` stays in
   `flow-menu.js`. `js/fixtures/m0.js`: `FLOWS_sys = [{ key: 'sys-index', screen: 'sys-index', group: 'M0 · System',
   title: 'Index', expect: { has: ['Taily v5', 'M1'] } }, { key: 'sys-components', screen: 'sys-components', group:
   'M0 · System', title: 'Component gallery', expect: { has: ['$147.50', '−$12.50'] } }]` (strings via `fmt*`).
   Each later milestone's `m#.js` is pre-scaffolded with one `export const FLOWS_<screen_id_with_underscores> = [];`
   per screen so parallel builders each edit only their own array.
6. **`js/inventory.js`** (D-13): `MILESTONES`, `BUILT = ['M0']`, `SCREENS = [{ id, m, persona, title, states: [{ key,
   m, kind: 'frame'|'state'|'overlay' }] }]` transcribed from `SCREENS.md` (all milestones). `scripts/screens.json` is
   archived to `scripts/v4/`.
7. Run `npm run check -- --accept-new` once (baselines for the two M0 keys), then `npm run check` green. Update
   `PROGRESS.md` (M0 code done, next: Figma pages). Do not commit; the orchestrator does.
