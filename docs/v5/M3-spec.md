# M3 — Request loop spec (build instructions)

Oct 13, 2026 · spec writer / design director (Opus) · branch `V5`. Builders read **§0 + §A (signatures only) + §B + their
cluster** + `docs/v5/CONTEXT.md`. Calls this spec had to make are **D-72…D-88** in `DECISIONS.md`, cited inline. Money copy
is always dollar amounts from `js/money.js` on `appt.money` / `SCENARIOS` (`fmtExact` in breakdowns, sentences and cards ·
`fmt` / `fmtColumn` in lists · `fmtNeg` for the Taily fee), never percentages, never a typed amount.

**Order:** (1) Model + component builder §A (serial: policy key, reasons, selectors, `focus.js`, fixtures helpers, NEW
components, gallery) → (2) four screen builders, clusters §C1–§C4, in parallel → (3) Integrator §D (registrations,
inventory, **`scripts/v5/journeys.mjs`** — the cross-persona click-through).

**M3 done when:** `npm run check` green (incl. the new journeys step); every M3 key in `js/inventory.js` has a FLOWS entry;
by hand, with normal latency: Sarah sends the seed request (c-pay) → View as Tailor → t-home shows it → t-request → Accept →
t-job shows Sarah's full address → View as Customer → Bookings → the booking reads **Confirmed**, same date, same
**Services $125.00 / Home-visit fee $35.00**, Deposit **Paid**.

---

## 0. Direction (applies to every M3 screen)

**Who — two people, one appointment.**
- **Amara** (tailor), between fittings, phone buzzes: "New request · 2h to reply". She has ninety seconds. She needs to know
  *what the work is, when and where, and what she takes home* — then answer with one thumb.
- **Sarah** (customer), waiting on a reply with $16.00 held on her card. She needs to know *what happened, what happened to
  her money, and what to do next* — in one glance, with one obvious button.

**Feel:** the tailor's order book. A ticket pinned to the board (the request), a line in the appointment book (the booking),
a stamp when it's settled (Confirmed, Cancelled, Refunded). Calm, exact, no drama — even bad news (declined, expired,
can't make it) is told plainly with the money outcome first and the way forward second.

**Signature — "the same ticket on both sides."** Every appointment is printed with the SAME strings on both personas:
the visit time `fmtWhen(slot.start)` ("Thu, Oct 15 · 5:00 PM"), the same Services and Home-visit fee rows, the same status
word (table §B2). Reviewers check this by flipping persona on any state.

- **One focal element per screen** (named per screen). It wins by size (`.t-display` 32 for a money figure, `.t-h2` 24 serif
  for a time) or the ink fill. Never two filled CTAs. Destructive confirmations use the new `cta({ variant: 'danger' })`
  (§A7) as the sheet's one filled button, with an outline "Keep …" beside it (D-79).
- **Type** only: `.t-display` 32 (take-home figure on t-request only) · `.t-title` 28 screen title · `.t-h2` 24 section
  heads and the visit time · `.t-body` 16 · `.t-small` 12 · `.t-caps` 12. Hierarchy by weight + colour first (600 ink /
  500 neutral-700 / 400 neutral-600). Money, times, countdowns `tabular-nums`. Typographic apostrophes (’) in copy; FLOWS
  `expect` strings avoid apostrophes.
- **Layout:** 390 wide, `--neutral-50`, sides 20, `.body` padding-top 128. Rhythm 8 inside a group, 24 between groups, 32
  before a section head. Cards white, `--radius-lg`, `box-shadow: inset 0 0 0 1px var(--neutral-200)`. Every target ≥ 44.
- **Which appointment (D-72):** detail screens never guess with `activeAppt()`. They read `focusAppt(ID)` (§A5); whoever
  navigates to a detail calls `setFocus(appt.id)` first. In `wire`, call `redirectIfMoved(ID, go)` so a screen whose
  appointment moved on (accepted while Sarah sat on c-request) forwards to `statusScreen(appt)`.
- **Async:** Accept, Send suggestion, Decline, Try again, Accept new time, Cancel, Move, Can't make it, Mark no-show all go
  through `withLatency` (CTA busy + verb, inputs locked, `aria-busy`). `?test=1` → instant.
- **Results speak twice:** after every state change, the screen itself shows the new state (hero + money outcome) AND a
  short toast confirms it (D-71: toasts clear on screen change). Never only a toast.
- **Money honesty:** the customer always sees the amount + its word (On hold → Paid → Refunded / Kept / Released) and when.
  The tailor always sees "You take home $X after the $Y Taily fee" — never the customer's total as if it were hers.
- **Privacy (D-74):** before Amara accepts she sees **"Sarah C."** and **"Williamsburg · 11211"**; after accepting, **"Sarah
  Chen"** and the full address; on a cancelled job the street is hidden again (D-88).
- `prefers-reduced-motion`: sheets fade, spinners don't rotate, countdown never animates.

---

## A. MODEL + COMPONENTS (Component builder — serial, before the screens)

Tokens only, `css/components-v5.css`. Add each new component to `sys-components` (one gallery block per listed state) and
re-accept that baseline. Keep existing signatures. Model test (`scripts/v5/model-test.mjs`) gains the asserts in §A8.
`npm run check` green before handing over.

### A1. `js/money-config.js` (spec-approved edit, D-73)
`POLICY.JUST_BOOKED_MIN: 60` — "a booking reads as just confirmed (You’re booked / You accepted) for this long after the
accept". Nothing else.

### A2. `js/data.js` (D-76)
```js
export const DECLINE_REASONS = ['Fully booked that week', 'Not work I take on', 'Too far for a home visit', 'Can’t finish by the need-by date'];
export const CANT_MAKE_IT_REASONS = ['Family emergency', 'I’m unwell', 'Shop closed unexpectedly', 'Something came up'];
```
(The first entry of each is what `driveTo('declined' | 'cant-make-it')` already passes.)

### A3. `js/state.js` — one selector (DOM-free)
`justConfirmed(appt) → boolean`: `appt.status === 'confirmed'` and the LAST history entry with status `confirmed` is less
than `POLICY.JUST_BOOKED_MIN` minutes before `now()`. Export it and add to the CONTEXT selector list. (acceptSuggestion also
writes `confirmed`, so accepting a new time reads as just booked too.)

### A4. `js/tailor-data.js` — selectors
- `customerName(appt)` → `"Sarah C."` until the appointment was ever accepted (history has `confirmed`), then `"Sarah Chen"`
  (`state.customer.first/last`). Also `customerInitials()` → `"SC"`.
- `jobAddress(appt)` (change, D-88): a **cancelled** home visit returns `"<hood> · <zip>"` again, never the street.
- `requestView(appt)` gains: `customer: { name: customerName(appt), initials }`, `whenEnd: fmtTime(slot.end)`,
  `minutes: VISIT_MINUTES[visitType]`, `needByDays: dayDiff(slot.start, job.needBy)`, `retries: appt.retries`,
  `suggested: appt.suggested ? fmtWhen(appt.suggested.start) : null`, `items` (garment count), `serviceCount`.
- `suggestSlots(appt, { limit = null } = {})` (D-77): `openSlots(a.tailorId, a.job.visitType, { until: a.job.needBy,
  exclude: a.id })` minus every slot that overlaps the requested visit `[slot.start, slot.end)`. Seed → first is
  `2026-10-15T18:00` (Thu, Oct 15 · 6:00 PM).
- `payoutOf(appt)` → the `state.payouts` entry for this appointment (`{ cents, state, date, kind }`) or `null`.

### A5. `js/focus.js` — NEW, DOM-free (D-72)
```js
setFocus(id)                    // state.ui.apptId = id
focusAppt(screenId, persona = personaOf(screenId))
  // getAppt(state.ui.apptId) if it belongs to `persona` and statusScreen(a, persona) === screenId;
  // else the first of apptsFor(persona) (newest first) whose statusScreen is screenId and which is not a
  // withdrawn / switched cancellation; else null.
redirectIfMoved(screenId, go)   // in wire(): if state.ui.apptId names an appointment whose statusScreen(a) !== screenId
                                // (and is a registered screen) → go(that screen, { replace: true }); returns true when it did.
```
Imports `state, getAppt, apptsFor, statusScreen` only. Screens never read `activeAppt()` for detail views any more
(c-request switches too, §C3).

### A6. `js/fixtures/common.js` + `js/fixtures/money-scenarios.js` (D-77, D-86)
- `driveTo('suggested')` suggests `suggestSlots(appt)[0]` (was: the first other slot, a 30-min shift).
- NEW `addRequest({ accept = false, after = null } = {})` → a second request for the CURRENT draft job: first
  `openSlots(amara, job.visitType, { until: job.needBy })` slot `>= after` (ISO) via the real `T.requestBooking({ …,
  cardId: 'visa-4242' })`, then `T.tailorAccept` when `accept`. Throws on failure. Does NOT reset. Used for multi-row lists.
- `money-scenarios.js` exports `SUGGESTED_SLOT = '2026-10-15T18:00'` beside `SEED_SLOT` (comment: "first open slot that
  doesn't overlap the seed visit; driveTo('suggested')"), and `SECOND_SLOT_AFTER = '2026-10-17T00:00'` (the `after` the
  list flows pass → Sat, Oct 17 · 9:00 AM). Model test asserts both (§A8).

### A7. Components (`js/components.js`) — NEW + extensions

1. **`cta(label, { variant: 'danger' })`** — extend. Fill `--error`, text `--white`, same size / radius / busy spinner as
   default. Hover/active darken via `filter: brightness(.94)`; focus ring as default. For the ONE filled button in a
   destructive confirm sheet. States: default · busy · disabled.
2. **`actionBar({ …, tertiaryLabel = '', tertiaryAct = '', tertiaryTone = 'default' | 'danger' })`** — extend (D-80). When
   both `secondaryLabel` and `tertiaryLabel` are set, they render side-by-side under the primary in `.action-bar__row`
   (two equal columns, gap 8, each an outline `cta` 48 tall); `tertiaryTone: 'danger'` = outline with `--error` text and
   inset `--error` 1px. Both disabled while `busy`. States: primary only · primary + secondary (unchanged) · primary + split row.
3. **`requestCard({ id, act = 'open-request', name, initials, visitLabel, place, when, items, services, payoutCents,
   feeCents, expiresAt, now, status = 'requested', waitingOn = '', retries = 0 })`** — NEW. The tailor inbox ticket. A
   `<button type="button" class="request-card" data-act="${act}" data-id="${id}">` card, white, `--radius-lg`, inset
   `--neutral-200`, padding 16, min-height 44:
   - row 1: `avatar({ initials, size: 'sm' })` + name (t-body 600) + t-small c-600 `${visitLabel} · ${place}`; right:
     `countdown({ expiresAt, now })` for `requested`, or `statusPill('suggested', 'Waiting on ' + waitingOn)` for `suggested`.
   - row 2: t-small c-700 `${when}` · `${items} items · ${services} services` (singulars handled).
   - row 3 (divider hairline above): t-caps c-600 "YOU TAKE HOME" left; right `.t-h2` tabular `fmtExact(payoutCents)`
     (`data-money`) over t-small c-600 `after the ${fmtExact(feeCents)} Taily fee`.
   - `retries > 0` → t-small c-600 "Sent again" chip after the name.
   - States: requested · soon (countdown `soon` → card ring `--warning`) · suggested (muted money: c-600, no countdown) · retried.
   - Accessible name: `aria-label="${name}, ${when}, you take home ${fmtExact(payoutCents)}, ${countdown text}"`.
4. **`apptRow({ id, act = 'open-appt', name, initials, when, place, status, pillLabel, amountText = '', amountCaption = '',
   muted = false })`** — NEW. One line in an appointment list (c-bookings, t-home Upcoming). `<button class="appt-row"
   data-act data-id>`, min-height 72, padding 12 16, white card: avatar 40 · text column (name t-body 600; `when` t-small
   c-700 tabular; `place` t-small c-600) · right column: `statusPill(status, pillLabel)` above `amountText` (t-body 600
   tabular, `data-money`) + `amountCaption` (t-small c-600). Chevron right. `muted` → name c-700, avatar neutral (past
   rows). States: default · with amount · muted.

Gallery blocks: danger CTA (default/busy) · action bar with split row · requestCard ×4 states · apptRow ×3 states.

### A8. Model test additions
`justConfirmed` true right after `driveTo('confirmed')`, false after `advanceClock(POLICY.JUST_BOOKED_MIN)`;
`driveTo('suggested').suggested.start === SUGGESTED_SLOT`; `suggestSlots` never overlaps the requested visit;
`customerName` is "Sarah C." on `requested`, "Sarah Chen" on `confirmed`; `jobAddress` on `driveTo('confirmed')` contains
"145 N 7th St" and on `driveTo('cant-make-it')` does not; `addRequest({ after: SECOND_SLOT_AFTER })` after
`driveTo('confirmed')` yields 2 appts, the new one `requested` at `2026-10-17T09:00`; `payoutOf(driveTo('no-show')).cents
=== SCENARIOS.noShow.paid`.

---

## B. Shared data + copy (all clusters)

### B1. Seed facts used below (all derived — never typed into a screen)
| what | source | prints |
|---|---|---|
| visit | `fmtWhen(SEED_SLOT)` | Thu, Oct 15 · 5:00 PM (home, 60 min, ends 6:00 PM) |
| suggested | `fmtWhen(SUGGESTED_SLOT)` | Thu, Oct 15 · 6:00 PM |
| reply by | `fmtTime(a.expiresAt)` | 12:00 PM (2h after the 10:00 AM demo clock) |
| need-by | `fmtDay(job.needBy)` | Fri, Oct 23 |
| customer money | `a.money` / `SCENARIOS.seed` | services $125.00 · home fee $35.00 · est. total $160.00 · deposit $16.00 · balance $144.00 |
| tailor money | `a.money` | Taily fee −$12.50 · you take home $147.50 |
| early cancel | `cancelTerms` / `SCENARIOS.earlyCancel` | refund $16.00 |
| late cancel | `SCENARIOS.lateCancel` | kept $16.00 (paid to Amara, D-05) |
| no-show | `SCENARIOS.noShow.paid` | Amara is paid $25.00; Sarah's $16.00 deposit is kept (D-06) |
| cancel cutoff | `fmtWhen(slot.start − POLICY.CANCEL_WINDOW_H h)` | Wed, Oct 14 · 5:00 PM |

### B2. One status vocabulary, two perspectives (D-87)
| model state | customer pill (`statusPill(key, label)`) | tailor pill |
|---|---|---|
| requested | `requested` "Request sent" | `new-request` "New request" |
| suggested | `suggested` "New time suggested" | `awaiting-customer` "Waiting on Sarah" |
| declined | `declined` "Declined" | `declined` "Declined" |
| expired | `expired` "No reply" | `expired` "Expired" |
| confirmed | `confirmed` "Confirmed" | `confirmed` "Confirmed" (just accepted: "Accepted") |
| cancelled · customer-early / -late | `cancelled` "Cancelled" | `cancelled` "Cancelled by Sarah" |
| cancelled · tailor-cant-make-it | `cancelled` "Cancelled by Amara" | `cancelled` "Cancelled" |
| cancelled · no-show | `cancelled` "No-show" | `cancelled` "No-show" |
Names come from data (`firstOf(tailor)`, `customerName(appt)`); the table's names are the seed's.

### B3. Navigation map
- Customer: c-pay → c-request (requested) ⇄ outcome states; suggested → Accept → **c-booking** (just confirmed) · Find
  another → **c-tailors**; declined → Find another → c-tailors (row "Declined this job"); expired → Try again → c-request
  (requested) · final → See other tailors → c-tailors (none-left); Bookings tab (`[data-nav="bookings"]`) → **c-bookings**
  → row → `statusScreen(a)` (c-request or c-booking); c-booking → Message → c-thread; cancelled / can't-make-it → c-tailors
  or c-book.
- Tailor: persona home + `[data-nav="home"]` → **t-home** → request card → **t-request** → Accept → **t-job** · Suggest
  time → **t-suggest** → Send → t-request (suggested) · Decline sheet → t-request (declined); upcoming row → t-job;
  t-job → Message → **t-thread** (M3 stub, D-81). t-code (existing tailor) → `personaHome()` = t-home (D-84).
- Every navigation to a detail screen: `setFocus(a.id)` then `go(id)`. Leaving a finished decision for its result screen
  uses `{ fresh: true }` (Back can't return to an Accept button that no longer applies).

---

## C1. CLUSTER "Tailor inbox + decide" — `t-home`, `t-request`, `t-suggest` (+ one line in `t-code`)

### t-home — T1 inbox
- **Purpose:** what needs an answer now, then what's coming up.
- **Focal:** the first request card's "You take home $147.50" (it is the only `.t-h2` money on the page).
- **Data:** `const { requests, upcoming } = inbox()`; per request `requestView(a)`; `now()`; `state.sim.push`.
- **Layout (top→bottom):** `chrome('home', { persona: 'tailor' })` · `headingRow(…, { back: false })` with t-caps c-600
  date `TUESDAY, OCT 13` (from `now()`, `fmtDay` upper-cased) and `.t-title` "Hi, Amara" (`firstOf(myTailor())`), then
  t-small c-600 summary `1 new request · 1 upcoming visit` (counts; "No new requests" when 0) ·
  **push-denied banner** (below) · 24 · `.t-h2` "New requests" + t-small c-600 count · 8 · one `requestCard` per request
  (gap 12; `status` = a.status, `waitingOn` = first name) · 32 · `.t-h2` "Upcoming" · 8 · one `apptRow` per upcoming job
  (`name: customerName(a)`, `when: fmtWhen`, `place: requestView(a).place`, `status: 'confirmed'`, `amountText`: payouts
  formatted together with `fmtColumn(upcoming.map(a => a.money.payout))`, `amountCaption: 'You take home'`).
  - No requests but upcoming exists: under "New requests" a t-body c-600 line "No new requests right now. You’ll get a
    notification when one comes in." (no card).
  - No upcoming but requests exist: under "Upcoming" t-body c-600 "Nothing booked yet."
- **Empty (`t-home--empty`, nothing at all):** heading as above, then `emptyState({ title: 'No requests yet', body: 'When a
  customer books you, the request shows up here. You’ll have 2 hours to answer each one.', ctaLabel: 'Check your hours',
  ctaAct: 'hours' })` (`2` from `POLICY.REQUEST_EXPIRY_H`). hours → `go('to-availability')` (edit mode, Amara is live).
- **Push denied (`state.sim.push === 'denied'`):** `banner({ tone: 'warning', title: 'Notifications are off', text:
  'Requests expire after 2 hours. Turn on notifications so you don’t miss one.', actionLabel: 'Open Settings',
  actionAct: 'push-settings' })` directly under the summary line. Action (prototype, D-85): `state.sim.push = 'granted'`,
  `go(ID)`, toast "Notifications are on". Not dismissible.
- **Wire:** `open-request` → `setFocus(id)`, `go('t-request')`; `open-appt` → `setFocus(id)`, `go('t-job')`. The card has
  no Accept of its own (D-75): the decision is one tap on t-request, where a push notification also lands.
- **FLOWS (`FLOWS_t_home`, group 'M3 · Tailor'):**
  - `t-home` · setup `S.driveTo('confirmed'); addRequest({ after: SECOND_SLOT_AFTER });` · expect `{ has: ['Hi, Amara',
    'New requests', 'Sarah C.', 'You take home', fmtExact(SCENARIOS.seed.payout), \`after the ${fmtExact(SCENARIOS.seed.tailyFee)} Taily fee\`,
    '2h left', 'Upcoming', 'Sarah Chen', fmtWhen(SEED_SLOT)], sel: '.request-card' }`
  - `t-home--empty` · no setup · expect `{ has: ['No requests yet', 'Check your hours'], not: 'You take home' }`
  - `t-home--push-denied` · setup as `t-home` + `S.sim.push = 'denied'` · expect `{ has: ['Notifications are off', 'Open Settings'] }`
- **Accept checks:** first card is the soonest expiry; tapping anywhere on a card opens it; the countdown reads the demo
  clock (no interval); amounts `data-money`.

### t-request — T2/T3 the request card (decide in one tap)
- **Purpose:** everything Amara needs to decide, then Accept · Suggest time · Decline.
- **Focal:** **"You take home $147.50"** (`.t-display` 32, 600, tabular) with "after the $12.50 Taily fee" under it.
- **Data:** `a = focusAppt('t-request')`; `v = requestView(a)`; `t = myTailor()`; `countdown({ expiresAt: a.expiresAt, now: now() })`.
- **Layout — `requested` (◆):** `chrome('home', { persona: 'tailor' })` ·
  `headingRow(statusPill('new-request') + .t-title v.customer.name)` (Back → t-home) — if `v.retries > 0` t-small c-600
  under the title "Sarah sent this again after it expired." ·
  **expiry strip** (row, 44 tall, white card): `countdown` (left) + t-small c-700 `Answer by ${fmtTime(a.expiresAt)}`; in the
  `soon` state the strip gets `--warning-bg` and the text reads `Expires soon · answer by 12:00 PM` in `--warning-ink` ·
  24 · **take-home card** (white, radius-lg, padding 20): t-caps c-600 "YOU TAKE HOME" · `.t-display` `fmtExact(v.payout)`
  (`data-money`) · t-body c-700 `after the ${fmtExact(v.tailyFee)} Taily fee` · 16 · `tailorBreakdown(v.money)` (Services ·
  Home-visit fee · Rush fee if any · Taily fee −$12.50 · Your payout $147.50) ·
  32 · `.t-h2` "The visit" · `visitBlock([...], { title: fmtWhen(a.slot.start), flush: true })` rows:
  `${v.visitLabel} · ${v.minutes} min, until ${v.whenEnd}` · `${v.place}` + t-small c-600 "Full address after you accept"
  (home only; shop visits show the shop address and no caption) · `Needed by ${v.needBy} · ${v.needByDays} days after the visit` ·
  32 · `.t-h2` "The work" · per garment a group: t-body 600 garment type (+ t-small c-600 `1 photo` when photos) then one
  `priceRow({ label, cents })` per service (her own prices) · last row `priceRow({ label: 'Estimate from your prices',
  cents: v.estimate })` 600 · t-small c-600 "You can adjust the price after the fitting." ·
  sticky `actionBar({ ctaLabel: 'Accept', ctaAct: 'accept', busyLabel: 'Accepting…', secondaryLabel: 'Suggest time',
  secondaryAct: 'suggest', tertiaryLabel: 'Decline', tertiaryAct: 'decline', tertiaryTone: 'danger' })` (body
  `.body--with-bar`).
- **Accept:** busy → `T.tailorAccept(a.id)` → ok: `go('t-job', { fresh: true })` + toast `Accepted. Sarah has been told.`;
  error `expired`: `go(ID)` (renders expired) + toast `This request expired before you accepted.` (tone error).
- **Suggest time:** `go('t-suggest')` (focus unchanged).
- **Decline sheet (`t-request--decline`, O):** `sheetOverlay(…, { header: 'Decline this request?', dataS:
  't-request--decline', confirm: false })`: t-body c-700 "Sarah is told right away and her hold is released. A reason
  helps her — it’s shown to her." · `chipGroup({ name: 'reason', label: 'Reason (optional)', options: DECLINE_REASONS,
  value: ui().reason ?? null })` (tap again to clear) · 24 · `cta('Decline request', { variant: 'danger', busyLabel:
  'Declining…', attrs: 'data-act="decline-ok"' })` · 8 · `cta('Keep request', { variant: 'secondary', attrs:
  'data-act="decline-keep"' })`. ok → `T.tailorDecline(a.id, reason ?? '')` → close → `go(ID)` + toast "Request declined".
- **`suggested` (`t-request--suggested`):** heading pill `awaiting-customer` "Waiting on Sarah" + title v.customer.name ·
  notes: t-body c-700 `You suggested ${v.suggested}. Sarah can accept it or choose another tailor.` · `visitBlock` title
  `v.suggested`, rows: `Sarah asked for ${fmtWhen(a.slot.start)}` · place · need-by · take-home card (same, with t-small c-600
  "Same price for the new time." — D-25) · the work · no action bar; inline secondary `cta('Message Sarah', data-act="message")`.
- **`expired` (`t-request--expired`, ◆):** pill `expired` + `.t-title` "This request expired" · t-body c-700 `You didn’t
  answer within ${POLICY.REQUEST_EXPIRY_H} hours, so Sarah’s hold was released.` + (retries left) ` Sarah can send it
  again — it will show up here as a new request.` / (none left) ` This job has gone to other tailors.` · the take-home
  card **muted** (amount c-500, label "YOU WOULD HAVE TAKEN HOME", no breakdown) · the visit + work blocks · one filled
  `cta('Back to requests', data-act="home")` (→ t-home). No Accept / Suggest / Decline anywhere.
- **`declined` (`t-request--declined`):** pill `declined` + `.t-title` "You declined this request" · t-body c-700 "Sarah has
  been told and her hold released." · if `a.declineReason`: t-small c-600 `Your reason: ${reason}` · visit + work blocks
  (take-home card muted) · `cta('Back to requests', data-act="home")`.
- **No focus appt:** `emptyState({ title: 'No open requests', body: 'New requests show up on Home.', ctaLabel: 'Go to Home',
  ctaAct: 'home' })`.
- **FLOWS (`FLOWS_t_request`):**
  - `t-request` · `S.driveTo('requested')` · `{ has: ['New request', 'Sarah C.', '2h left', 'Answer by 12:00 PM', 'You take
    home', fmtExact(SCENARIOS.seed.payout), \`after the ${fmtExact(SCENARIOS.seed.tailyFee)} Taily fee\`, fmtNeg(SCENARIOS.seed.tailyFee),
    fmtWhen(SEED_SLOT), 'Williamsburg · 11211', 'Full address after you accept', 'Needed by Fri, Oct 23',
    fmtExact(SCENARIOS.seed.services), 'Accept', 'Suggest time', 'Decline'], not: ['145 N 7th St', 'Chen'] }`
  - `t-request--soon` · `S.driveTo('requested'); S.advanceClock(110);` · `{ has: ['10m left', 'Expires soon'], sel: '[data-countdown][data-state="soon"]' }`
  - `t-request--expired` · `S.driveTo('expired')` · `{ has: ['This request expired', 'Sarah can send it again', 'Back to requests'], not: ['Suggest time'] }`
  - `t-request--decline` · `S.driveTo('requested')` · click `['[data-act="decline"]']` · `{ has: ['Decline this request?', 'Reason (optional)', 'Fully booked that week', 'Keep request'] }`
  - `t-request--declined` · `S.driveTo('declined')` · `{ has: ['You declined this request', 'Your reason: Fully booked that week'] }`
  - `t-request--suggested` · `S.driveTo('suggested')` · `{ has: ['Waiting on Sarah', fmtWhen(SUGGESTED_SLOT), 'Same price'] }`
- **Accept checks:** the take-home figure is the largest text; no customer street or last name before accepting; Accept /
  Suggest time / Decline all visible without scrolling (sticky bar); expired + declined show no decision buttons.

### t-suggest — T3 suggest another time
- **Purpose:** offer Sarah one of Amara's own open times instead.
- **Focal:** the Scheduler wheel.
- **Data:** `a = focusAppt('t-request')` (it is still a request); `slots = suggestSlots(a)`; pick in `state.ui['t-suggest'].slot`
  (default `slots[0]`).
- **Layout:** `chrome('home', { persona: 'tailor' })` · `headingRow(backButton() + .t-title 'Suggest another time')` ·
  notes t-body c-700 `Sarah asked for ${fmtWhen(a.slot.start)}. Pick one of your open times before her need-by date,
  ${fmtDay(a.job.needBy)}.` · 24 · `scheduler({ columns: slotColumns(slots, picked), compact: true, cta: '', note:
  \`Sarah sees: ${fmtWhen(picked)}\` })` (note updates in place on wheel change via `readSlot`) · 16 · t-small c-600
  `Same price — you take home ${fmtExact(a.money.payout)}.` · t-small c-600 `Answer by ${fmtTime(a.expiresAt)}.` ·
  `actionBar({ ctaLabel: 'Send suggestion', ctaAct: 'send-suggestion', busyLabel: 'Sending…' })`.
- **Send:** `T.tailorSuggest(a.id, picked)` → ok: `go('t-request', { fresh: true })` (suggested state) + toast "Suggestion
  sent to Sarah"; `slot-unavailable` → error `banner` above the wheel "That time was just taken. Pick another." and re-render;
  `expired` → `go('t-request')` + toast "This request expired."
- **No slots:** `emptyState({ title: \`No open times before ${fmtDay(needBy)}\`, body: 'Add hours to your week, or decline
  this request.', ctaLabel: 'Edit availability', ctaAct: 'hours', secondaryLabel: 'Back to the request', secondaryAct:
  'back-request' })` (code-only state, no key).
- **FLOWS (`FLOWS_t_suggest`):** `t-suggest` · `S.driveTo('requested')` · `{ has: ['Suggest another time',
  fmtWhen(SEED_SLOT), \`Sarah sees: ${fmtWhen(SUGGESTED_SLOT)}\`, 'Send suggestion', fmtExact(SCENARIOS.seed.payout)], sel: '[data-scheduler]' }`
- **Accept checks:** only her open slots, none overlapping the asked-for visit; keyboard wheel works; busy state on Send.

### t-code (one line, D-84)
Existing-account route `go('t-shop', …)` → `go(personaHome(), { fresh: true })` (now t-home). Re-accept t-code baselines
only if they change (they shouldn't).

---

## C2. CLUSTER "Tailor job" — `t-job`, `t-thread` (M3 stub)

### t-job — T4 upcoming job
- **Purpose:** where, when, who — and the two things that can go wrong (she can't make it / Sarah doesn't show).
- **Focal:** the visit card: `fmtWhen(slot.start)` as a `.t-h2` title over the **full address** (home) / shop address.
- **Data:** `a = focusAppt('t-job')`; `v = requestView(a)`; `justConfirmed(a)`; `payoutOf(a)`; `now()`; `t = myTailor()`.
- **Layout — confirmed:** `chrome('home', { persona: 'tailor' })` · heading row (Back → t-home):
  - **just accepted (`t-job--accepted`, ◆):** `statusPill('confirmed', 'Accepted')` + `.t-title` "You accepted Sarah’s
    request" · notes t-body c-700 "Sarah has been told and her deposit is paid. Her full address is below."
  - **upcoming (`t-job`, ◆):** `statusPill('confirmed')` + `.t-title` `Visit with ${v.customer.name}`.
  - if the last history entry is `rescheduled`: `banner({ tone: 'info', text: \`Sarah moved this visit to ${fmtWhen(slot)}.\` })`.
  24 · **visit card** = `visitBlock(rows, { title: fmtWhen(a.slot.start) })` rows: `${v.visitLabel} · ${v.minutes} min, until
  ${v.whenEnd}` · `jobAddress(a)` (t-body 600) · `Needed by ${v.needBy}` · 16 · **customer row**: `avatar({ initials })` +
  t-body 600 `Sarah Chen` + t-small c-600 "Customer" · `cta('Message Sarah', data-act="message")` (the one filled CTA) ·
  32 · `.t-h2` "The work" (same garment / priceRow groups as t-request) · 32 · `.t-h2` "Your payout" · `tailorBreakdown(a.money)`
  · t-small c-600 "Paid out the Friday after you mark the job completed. The price can change after the fitting." ·
  32 · **visit-day actions** (t-small c-600 group head "Something wrong?"):
  - before the start (`now < slot.start`): `listRow({ title: 'I can’t make it', sub: 'Cancel this visit and refund Sarah',
    act: 'cant-make-it' })` with title in `--error`.
  - from the start until start + `POLICY.NO_SHOW_WAIT_MIN`: t-small c-600 `If Sarah isn’t there by ${fmtTime(start + 15 min)},
    you can mark a no-show.`
  - from start + 15 min: `listRow({ title: 'Sarah didn’t show up', sub: \`You’re paid ${fmtExact(noShowPayout(deposit))} for
    your time\`, act: 'no-show' })` (D-82; the payout comes from `noShowPayout`, never typed).
  (M4 adds "Start fitting" as the filled CTA at the start time; leave a `<!-- M4: start fitting -->` slot above the actions.)
- **Can't make it (`t-job--cant-make-it`, O):** `sheetOverlay` header "Can’t make it?" · t-body c-700 `Sarah is told right
  away and gets her ${fmtExact(deposit)} deposit back in full. Her job stays saved so she can rebook.` ·
  `chipGroup({ name: 'reason', label: 'Reason (optional, shown to Sarah)', options: CANT_MAKE_IT_REASONS })` ·
  `cta('Cancel the visit', { variant: 'danger', busyLabel: 'Cancelling…', attrs: 'data-act="cant-ok"' })` · 8 ·
  `cta('Keep the visit', { variant: 'secondary', attrs: 'data-act="cant-keep"' })`. ok → `T.tailorCantMakeIt(a.id, reason ??
  '')` → close → `go(ID)` + toast "Visit cancelled. Sarah has been refunded."
- **No-show (`t-job--no-show`, O):** header "Mark Sarah as a no-show?" · t-body c-700 `It’s ${fmtTime(now)} — ${minutes}
  minutes past the start. Sarah’s ${fmtExact(deposit)} deposit is kept and you’re paid ${fmtExact(noShowPayout(deposit))}
  for your time.` · `cta('Mark as no-show', { variant: 'danger', busyLabel: 'Saving…', attrs: 'data-act="no-show-ok"' })` ·
  `cta('Keep waiting', { variant: 'secondary', attrs: 'data-act="no-show-keep"' })`. ok → `T.markNoShow` → `go(ID)` + toast
  "Marked as a no-show". `too-early` → toast `You can mark a no-show from ${time}.`
- **Cancelled states** (status `cancelled`, address = hood · zip per D-88, no visit-day actions, one secondary
  `cta('Back to Home', data-act="home")`; heading pill per §B2):
  - `t-job--cant-make-it-done`: title "Visit cancelled" · t-body c-700 `Sarah has been told and refunded her
    ${fmtExact(cancel.refund)} deposit. Nothing is paid out for this job.` · t-small c-600 `Your reason: ${cancel.note}` when set.
  - `t-job--no-show-done`: title "Marked as a no-show" · `moneyRows([{ label: 'No-show pay', cents: cancel.tailorPaid,
    kind: 'total', status: \`Paid out ${fmtDay(payoutOf(a).date)}\` }])` · t-body c-700 "Sarah has been told. Her deposit was kept."
  - `t-job--cancelled` (customer-early): title "Sarah cancelled" · t-body c-700 "She cancelled more than 24 hours before the
    visit, so nothing is owed. The time is open again for new requests."
  - `t-job--cancelled-late`: title "Sarah cancelled" · t-body c-700 `She cancelled less than 24 hours before the visit, so
    you keep her ${fmtExact(cancel.tailorPaid)} deposit.` · `moneyRows([{ label: 'Kept deposit', cents: cancel.tailorPaid,
    kind: 'total', status: \`Paid out ${fmtDay(payoutOf(a).date)}\` }])`.
  (`24` = `POLICY.CANCEL_WINDOW_H` everywhere.)
- **Message:** `go('t-thread')` (focus unchanged).
- **FLOWS (`FLOWS_t_job`):**
  - `t-job--accepted` · `S.driveTo('confirmed')` · `{ has: ['Accepted', 'You accepted', 'Sarah Chen', '145 N 7th St, 2R',
    fmtWhen(SEED_SLOT), 'Message Sarah', fmtExact(SCENARIOS.seed.payout), fmtNeg(SCENARIOS.seed.tailyFee)] }`
  - `t-job` · `S.driveTo('confirmed'); S.advanceClock(POLICY.JUST_BOOKED_MIN);` · `{ has: ['Confirmed', 'Visit with Sarah
    Chen', '145 N 7th St', 'make it'], not: 'You accepted' }`
  - `t-job--cant-make-it` · as `t-job` · click `['[data-act="cant-make-it"]']` · `{ has: ['make it?',
    fmtExact(SCENARIOS.seed.deposit), 'Family emergency', 'Keep the visit'] }`
  - `t-job--no-show` · `S.driveTo('confirmed'); S.setClock(isoMinute(addMinutes(SEED_SLOT, POLICY.NO_SHOW_WAIT_MIN + 5)));`
    · click `['[data-act="no-show"]']` · `{ has: ['Mark Sarah as a no-show?', fmtExact(SCENARIOS.noShow.paid), fmtExact(SCENARIOS.seed.deposit)] }`
  - `t-job--cant-make-it-done` · `S.driveTo('cant-make-it')` · `{ has: ['Visit cancelled', 'Your reason: Family emergency',
    fmtExact(SCENARIOS.earlyCancel.refund)], not: '145 N 7th St' }`
  - `t-job--no-show-done` · `S.driveTo('no-show')` · `{ has: ['Marked as a no-show', 'No-show pay', fmtExact(SCENARIOS.noShow.paid), 'Paid out'] }`
  - `t-job--cancelled` · `S.driveTo('cancelled-early')` · `{ has: ['Cancelled by Sarah', 'nothing is owed'] }`
  - `t-job--cancelled-late` · `S.driveTo('cancelled-late')` · `{ has: ['Cancelled by Sarah', 'Kept deposit',
    fmtExact(SCENARIOS.lateCancel.tailorPaid), 'Paid out'] }`
- **Accept checks:** full address only on confirmed; one filled CTA (Message Sarah); "I can’t make it" disappears at the
  start, "didn’t show up" appears 15 min after; sheet buttons ≥ 44; payout copy dollars only.

### t-thread — M3 stub (D-81; full rules M5)
- **Purpose:** the job's chat entry for Amara, so "Message Sarah" is never a dead end.
- **Focal:** the composer, pinned bottom. Mirror `c-thread.js` (M1 stub) from the tailor side.
- **Data:** `threadFor(MY_TAILOR_ID).messages`; `a = focusAppt('t-job') ?? focusAppt('t-request')`; `closed =
  threadReadOnly(MY_TAILOR_ID)`.
- **Layout:** `chrome('messages', { persona: 'tailor' })` · `headingRow(backButton() + avatar SC + t-body 600 customerName(a)
  + t-small c-600 \`${fmtWhen(a.slot.start)} · ${v.visitLabel}\`)` · `privacyNote()` · messages (`system` lines t-small c-500
  centred; `from === 'tailor'` → side `me`; customer → `them`; `chatBubble({ … masked })`) · empty: t-body c-600 "No messages
  yet. Say hello or ask about the fit." · `composer()` → `T.sendMessage(MY_TAILOR_ID, 'tailor', { text })` (`wireComposer`);
  failed send → toast "Message not sent. Try again." · closed → `readOnlyBanner({ text: 'You declined this request, so the
  conversation is closed.', ctaLabel: 'Back to Home', ctaAct: 'home' })` in place of the composer.
- **FLOWS (in m3.js `FLOWS_t_thread`):** `t-thread` · `S.driveTo('confirmed')` · `{ has: ['Sarah Chen', 'Phone numbers and
  emails stay private on Taily.', 'Amara accepted'], sel: '.composer' }`

---

## C3. CLUSTER "Customer request outcomes" — `c-request` (M3 states), `c-tailors--none-left`

### c-request — C6/C7 every outcome
Keep the M1 `requested` layout (and its flows in m1.js) exactly; switch `activeAppt()` → `focusAppt('c-request')` and add
`redirectIfMoved` (confirmed → c-booking). In `wire`, when `state.ui.apptId` is unset and a focus appt exists, `setFocus` it
(c-pay lands here without one), so a later accept forwards Sarah to c-booking. Each outcome replaces the hero + clock + timeline; the visit block stays. Outcome
money is ONE line where nothing is owed any more: `moneyRows([{ label: 'Deposit hold', cents: deposit, status: 'Released' }])`
(declined / expired); the full `customerBreakdown(…, { stage: 'booked', depositState })` stays on requested + suggested.
`first` = `firstOf(tailor)`; `deposit` = `a.payments.deposit.cents`. Message → `state.ui.booking = { …, tailorId }`, `go('c-thread')`.

- **soon (`c-request--soon`):** requested layout; `countdown` renders `soon`; the "Reply by" caption becomes `--warning-ink`
  `Amara has ${fmtCountdown(msLeft(a))} left to reply. If there’s no reply, your hold is released.`
- **suggested (`c-request--suggested`, ◆):** heading `statusPill('suggested', 'New time suggested')` + `.t-title`
  `${first} suggested a new time` · **focal time card** (white, radius-lg, padding 20): t-caps c-600 "NEW TIME" · `.t-h2`
  `fmtWhen(a.suggested.start)` · t-small c-600 `You asked for ${fmtWhen(a.slot.start)}` · 16 · t-body c-700 `Same price. If
  you accept, your ${fmtExact(deposit)} deposit is charged and you’re booked.` · visit block (other rows) · `.t-h2` "Price"
  · breakdown (Deposit **On hold**) · actions: `cta('Accept new time', { busyLabel: 'Booking…', attrs:
  'data-act="accept-time"' })` · 8 · `cta('Find another tailor', { variant: 'secondary', attrs: 'data-act="find-another"' })`
  · text button `Message ${first}` (44, `data-act="message"`). Accept → `T.acceptSuggestion` → `setFocus` →
  `go('c-booking', { fresh: true })` + toast `Booked for ${fmtWhen}`. Find another → `T.findAnotherTailor` →
  `go('c-tailors', { fresh: true })` + toast `${fmtExact(deposit)} hold released.`
- **declined (`c-request--declined`, ◆):** `statusPill('declined')` + `.t-title` `${first} can’t take this job` · notes
  t-body c-700 `Your ${fmtExact(deposit)} hold has been released — you weren’t charged. Your job details are saved.` ·
  if `a.declineReason`: quote card (neutral-100, radius-md, padding 12) t-small c-600 `${first}’s note` + t-body
  `“${reason}”` · visit block (title "Your request") · Deposit hold row (Released) · `cta('Find another tailor',
  'find-another')` (filled) · text button "View messages" (→ c-thread, which renders read-only). Find another →
  `T.findAnotherTailor(a.id)` → `go('c-tailors', { fresh: true })` (shows the "Declined this job" row).
- **expired (`c-request--expired`, ◆ — retries 0):** `statusPill('expired', 'No reply')` + `.t-title` `${first} didn’t reply
  in time` · notes t-body c-700 `Your ${fmtExact(deposit)} hold was released. Send the same request again for another
  ${POLICY.REQUEST_EXPIRY_H} hours, or message ${first} first.` · visit block · Deposit hold row (Released) ·
  `cta(\`Try again (${a.retries + 1} of ${POLICY.MAX_RETRIES})\`, { busyLabel: 'Sending…', attrs: 'data-act="try-again"' })`
  with t-small c-600 under it `Holds ${fmtExact(deposit)} again until ${reply-by of a new window}` (= `fmtTime(now +
  REQUEST_EXPIRY_H)`) · `cta(\`Message ${first}\`, { variant: 'secondary' })` · text button "See other tailors" (→ `go('c-tailors')`,
  job unchanged).
  - Try again → `T.tryAgain(a.id)` → ok: `go(ID)` (requested) + toast `Request sent again. ${fmtExact(deposit)} on hold.`;
    errors as an error `banner` above the CTA (D-85): `slot-passed` "That time has passed. Pick a new time." (action "Pick a
    time" → c-book); `slot-unavailable` "That time was just taken. Pick a new time." (same action); `card-declined` "Your card
    was declined. Choose another way to pay." (action "Pay another way" → c-pay).
- **expired-2 (`c-request--expired-2`, retries 1):** as expired, CTA `Try again (2 of 2)`, notes end with ` Last try: if
  ${first} doesn’t reply this time, we’ll show you other tailors.`
- **expired-final (`c-request--expired-final`, retries 2):** `.t-title` `${first} didn’t reply again` · notes `Your
  ${fmtExact(deposit)} hold was released. ${first} is hidden for this job, so you can choose someone else.` · Deposit hold
  row · `cta('See other tailors', 'find-another')` (filled → `T.findAnotherTailor` → c-tailors) · secondary `Message ${first}`.
  No Try again.
- **withdraw sheet:** switch its confirm to `cta('Withdraw request', { variant: 'danger' })` (D-79); flows unchanged.
- **FLOWS (m3.js `FLOWS_c_request`, group 'M3 · Request outcomes'):**
  - `c-request--soon` · `S.driveTo('requested'); S.advanceClock(110);` · `{ has: ['10m left', 'left to reply'], sel: '[data-countdown][data-state="soon"]' }`
  - `c-request--suggested` · `S.driveTo('suggested')` · `{ has: ['New time suggested', 'suggested a new time',
    fmtWhen(SUGGESTED_SLOT), \`You asked for ${fmtWhen(SEED_SLOT)}\`, 'Same price', 'On hold', 'Accept new time', 'Find another tailor'] }`
  - `c-request--declined` · `S.driveTo('declined')` · `{ has: ['take this job', 'Fully booked that week', 'Released',
    fmtExact(SCENARIOS.seed.deposit), 'Find another tailor'], not: 'Try again' }`
  - `c-request--expired` · `S.driveTo('expired')` · `{ has: ['reply in time', 'Try again (1 of 2)', 'Released', 'Message Amara', 'See other tailors'] }`
  - `c-request--expired-2` · `S.driveTo('expired-2')` · `{ has: ['Try again (2 of 2)', 'Last try'] }`
  - `c-request--expired-final` · `S.driveTo('expired-final')` · `{ has: ['reply again', 'See other tailors'], not: 'Try again' }`
  (The m1.js `c-request` / `c-request--withdraw` entries stay.)
- **Accept checks:** each outcome has exactly one filled CTA; the money word changes (On hold → Released) and the amount is
  printed; declined thread is read-only via c-thread; Try again counts down 1 of 2 → 2 of 2 → none.

### c-tailors--none-left (D-83)
In `js/screens/c-tailors.js`, the `none-left` empty state copy becomes: title `No other tailors for this job yet`, body
`${hiddenFirst} didn’t reply, so ${hiddenFirst} is hidden for this job. Change your need-by date or visit type to see more
tailors.` (first name from `state.job.hiddenTailors[0]`), ctaLabel "Change details" (→ c-where), secondaryLabel `Message
${hiddenFirst}` (→ c-thread). Overrules D-48's copy.
- **FLOWS (m3.js `FLOWS_c_tailors`):** `c-tailors--none-left` · `S.driveTo('expired-final'); S.T.findAnotherTailor(S.appt.id);`
  · `{ has: ['No other tailors for this job yet', 'Change details'], sel: '[data-empty="none-left"]' }`

---

## C4. CLUSTER "Customer bookings" — `c-bookings`, `c-booking`

### c-bookings — Bookings tab
- **Purpose:** every request and visit in one place, sorted by what needs Sarah next.
- **Focal:** the first row of the first non-empty section.
- **Data (D-78):** `apptsFor('customer')` grouped:
  - **Requests** — `requested`, `suggested`, `expired` with retries left; sorted by `expiresAt`.
  - **Upcoming** — `confirmed` (M4 adds fitting … returning); sorted by `slot.start`.
  - **Past** — `cancelled` (except `withdrawn` / `switched`), `declined`, final `expired`, `completed`; newest first; `muted`.
- **Layout:** `chrome('bookings')` · `headingRow(.t-title 'Bookings', { back: false })` · per non-empty section: `.t-h2`
  section title · 8 · `apptRow` per appt (`name: tailor.name`, `initials`, `when: fmtWhen(slot.start)` (suggested → the
  suggested time with `pillLabel` "New time suggested"), `place: VISIT_LABEL.customer[visitType]`, pill per §B2; Requests
  rows `amountCaption`: requested → `${countdown text} to reply`, expired → "No reply"; Upcoming rows `amountText` =
  `Est. ${fmt(total)}` via `fmtColumn`) · gap 12 rows, 32 between sections.
- **Empty (`c-bookings--empty`):** `emptyState({ title: 'No bookings yet', body: 'When you book a tailor, your requests and
  visits show up here.', ctaLabel: 'Start a booking', ctaAct: 'home' })` → c-job.
- **Wire:** `open-appt` → `setFocus(id)`, `go(statusScreen(a, 'customer'))`.
- **FLOWS (`FLOWS_c_bookings`, group 'M3 · Bookings'):**
  - `c-bookings` · `S.driveTo('cancelled-early'); addRequest({ accept: true, after: SECOND_SLOT_AFTER });` · `{ has:
    ['Bookings', 'Upcoming', 'Past', 'Amara Reyes', 'Confirmed', 'Cancelled', fmtWhen(SEED_SLOT)], sel: '.appt-row' }`
  - `c-bookings--empty` · no setup · `{ has: ['No bookings yet', 'Start a booking'] }`
- **Accept checks:** rows ≥ 72 tall, whole row tappable; past rows muted; no withdrawn requests listed.

### c-booking — C8 booking detail
- **Purpose:** the appointment, its money, and the ways to change it.
- **Focal:** the visit time (`visitBlock` title = `fmtWhen(slot.start)`, `.t-h2`).
- **Data:** `a = focusAppt('c-booking')`; `t = tailorById(a.tailorId)`; `first`; `terms = cancelTerms(a, now())`;
  `cutoff = fmtWhen(addMinutes(slot.start, -CANCEL_WINDOW_H*60))`; `justConfirmed(a)`.
- **Layout — confirmed:** `chrome('bookings')` · heading row (Back → c-bookings):
  - **just confirmed (`c-booking--confirmed`, ◆):** `statusPill('confirmed')` + `.t-title` `You’re booked with ${first}` ·
    notes t-body c-700 `${first} accepted your request. Your ${fmtExact(deposit)} deposit is paid.`
  - **upcoming (`c-booking`, ◆):** `statusPill('confirmed')` + `.t-title` `Your visit with ${first}`.
  24 · `visitBlock([...], { title: fmtWhen(a.slot.start), flush: true })` rows: `${VISIT_LABEL.customer[type]} · ${minutes}
  min` · address (home: Sarah's address; shop: shop name + address) · `${items} items · ${services} services` · 32 ·
  `.t-h2` "What happens next" · `timeline([{ done, 'Booked', fmtWhen(confirmedAt) }, { current, 'Visit and fitting',
  \`${first} confirms the final price\` }, { todo, 'Tailoring' }, { todo, 'Ready', \`Pay the balance, est. ${fmtExact(balance)}\` }])`
  · 32 · `.t-h2` "Price" · `customerBreakdown(a.money, { stage: 'booked', tailorFirst: first, depositState:
  a.payments.deposit.state })` (Deposit **Paid**) · t-small c-600 policy line: early → `Free cancellation until ${cutoff}.
  After that, the ${fmtExact(deposit)} deposit is kept.`; late → `Less than 24 hours to go: cancelling now keeps the
  ${fmtExact(deposit)} deposit.` · 24 · actions: `cta(\`Message ${first}\`, 'message')` (filled) · 8 · early only:
  `cta('Reschedule', { variant: 'secondary', attrs: 'data-act="reschedule"' })`; late: t-small c-600 `To change the time
  now, message ${first}.` · 8 · text button "Cancel booking" in `--error`, 44 tall (`data-act="cancel"`).
- **Cancel sheet early (`c-booking--cancel`, O):** header "Cancel this booking?" · t-body c-700 `You’re cancelling more
  than 24 hours before the visit, so your ${fmtExact(refund)} deposit comes back in full.` · `moneyRows([{ label: 'Deposit
  paid', cents: deposit }, { label: 'Refund to your card', cents: terms.refund, kind: 'total' }])` · `cta(\`Cancel and get
  ${fmtExact(terms.refund)} back\`, { variant: 'danger', busyLabel: 'Cancelling…', attrs: 'data-act="cancel-ok"' })` · 8 ·
  `cta('Keep booking', { variant: 'secondary', attrs: 'data-act="cancel-keep"' })`.
- **Cancel sheet late (`c-booking--cancel-late`, O):** same header · t-body c-700 `This visit is less than 24 hours away,
  so the ${fmtExact(kept)} deposit is kept. It pays ${first} for the time set aside. Nothing else is charged.` · `moneyRows([
  { label: 'Deposit paid', cents: deposit }, { label: 'Refund', cents: 0 }, { label: 'Kept', cents: terms.kept, kind: 'total' }])`
  · `cta(\`Cancel booking (${fmtExact(terms.kept)} not refunded)\`, { variant: 'danger', … 'cancel-ok' })` · `cta('Keep booking', secondary)`.
  ok (both) → `T.cancelBooking(a.id)` → close → `go(ID)` + toast early `Booking cancelled. ${fmtExact(refund)} refunded.` /
  late `Booking cancelled.`
- **Reschedule (`c-booking--reschedule`, O, early only, D-12):** `sheetOverlay` header "Pick a new time" · `scheduler({
  columns: slotColumns(slots, picked), compact: true, cta: '', note: \`New time: ${fmtWhen(picked)}\` })` over
  `openSlots(tailorId, visitType, { until: needBy, exclude: a.id })` minus the current start · t-small c-600 `Same price.
  ${first} is told right away.` · `cta('Move my visit', { busyLabel: 'Moving…', attrs: 'data-act="move-ok"' })` ·
  `cta('Keep current time', secondary)`. ok → `T.rescheduleBooking(a.id, picked)` → close → `go(ID)` + toast `Moved to
  ${fmtWhen}. ${first} has been told.`; `too-late` / `slot-unavailable` → error banner inside the sheet.
- **Cancelled states** (no Reschedule / Cancel; heading pill per §B2; visit block title stays the old time, rows dimmed
  c-600; Price section = `moneyRows` of the deposit outcome only):
  - `c-booking--cancelled` (customer-early): title "Booking cancelled" · notes `Your ${fmtExact(refund)} deposit is on its
    way back to your card. It can take a few business days to show.` · `moneyRows([{ label: 'Deposit', cents, status:
    'Refunded' }])` · `cta(\`Book ${first} again\`, 'book-again')` (→ `state.ui.booking = { tailorId }`, `go('c-book')`) ·
    secondary "See other tailors" (→ c-tailors).
  - `c-booking--cancelled-late`: title "Booking cancelled" · notes `The ${fmtExact(kept)} deposit was kept because you
    cancelled less than 24 hours before the visit. Nothing else is charged.` · row status `Kept` · same two actions.
  - `c-booking--cant-make-it` (◆): pill `cancelled` "Cancelled by Amara" · title `${first} can’t make it` · notes
    `${first} cancelled your ${fmtWhen(slot)} visit. Your ${fmtExact(refund)} deposit is refunded in full, and your job is
    saved.` · note card (as declined) `${first}’s note` + `“${cancel.note}”` when set · Deposit row `Refunded` ·
    `cta('Find another tailor', 'find-another')` (filled → `go('c-tailors', { fresh: true })`, the job was restored by the
    model) · secondary `Message ${first}`.
  - `c-booking--no-show`: pill `cancelled` "No-show" · title "Marked as a no-show" · notes `${first} waited until
    ${fmtTime(slot + NO_SHOW_WAIT_MIN)} and marked the visit as missed. The ${fmtExact(kept)} deposit is kept. Nothing else is
    charged.` · Deposit row `Kept` · `cta(\`Message ${first}\`)` (filled — "Think this is a mistake? Message Amara." t-small
    above it) · secondary "See other tailors".
- **No focus appt:** `emptyState({ title: 'No booking to show', body: 'Your requests and visits are in Bookings.',
  ctaLabel: 'Go to Bookings', ctaAct: 'bookings' })`.
- **FLOWS (`FLOWS_c_booking`, group 'M3 · Bookings'):**
  - `c-booking--confirmed` · `S.driveTo('confirmed')` · `{ has: ['Confirmed', 'booked with Amara', 'deposit is paid',
    fmtWhen(SEED_SLOT), 'Paid', fmtExact(SCENARIOS.seed.deposit), fmtExact(SCENARIOS.seed.services),
    fmtExact(SCENARIOS.seed.homeFee), 'Estimated total', 'Message Amara'], not: 'On hold' }`
  - `c-booking` · `S.driveTo('confirmed'); S.advanceClock(POLICY.JUST_BOOKED_MIN);` · `{ has: ['Your visit with Amara',
    'Free cancellation until Wed, Oct 14', 'Reschedule', 'Cancel booking'], not: 'booked with' }`
  - `c-booking--cancel` · as `c-booking` · click `['[data-act="cancel"]']` · `{ has: ['Cancel this booking?',
    \`Cancel and get ${fmtExact(SCENARIOS.earlyCancel.refund)} back\`, 'Keep booking'] }`
  - `c-booking--cancel-late` · `S.driveTo('confirmed'); S.setClock(isoMinute(addMinutes(SEED_SLOT, -120)));` · click
    `['[data-act="cancel"]']` · `{ has: ['less than 24 hours away', \`${fmtExact(SCENARIOS.lateCancel.kept)} not refunded\`, 'Kept'] }`
  - `c-booking--cancelled` · `S.driveTo('cancelled-early')` · `{ has: ['Booking cancelled', 'Refunded', fmtExact(SCENARIOS.earlyCancel.refund)] }`
  - `c-booking--cancelled-late` · `S.driveTo('cancelled-late')` · `{ has: ['Booking cancelled', 'Kept', fmtExact(SCENARIOS.lateCancel.kept)] }`
  - `c-booking--reschedule` · as `c-booking` · click `['[data-act="reschedule"]']` · `{ has: ['Pick a new time', 'Same price', 'Move my visit'], sel: '[data-scheduler]' }`
  - `c-booking--cant-make-it` · `S.driveTo('cant-make-it')` · `{ has: ['Cancelled by Amara', 'make it', 'Family emergency',
    'Refunded', 'Find another tailor'] }`
  - `c-booking--no-show` · `S.driveTo('no-show')` · `{ has: ['Marked as a no-show', 'Kept', fmtExact(SCENARIOS.seed.deposit)] }`
- **Accept checks:** Deposit reads **Paid** (never On hold) once accepted; every cancel shows the exact refund or kept
  amount BEFORE the tap; Reschedule absent inside 24 h; one filled CTA per state.

---

## D. INTEGRATION (Integrator)

1. `app.js` `SCREEN_MODULES` M3 block: `'t-home', 't-request', 't-suggest', 't-job', 't-thread', 'c-bookings', 'c-booking'`;
   `index.html` CSS links. `personaHome('tailor')` now resolves to t-home (D-67 / D-68 backstop closed, D-84).
2. `js/fixtures/m3.js`: scaffold `FLOWS_c_request`, `FLOWS_c_tailors`, `FLOWS_t_thread` beside the existing six (each
   owner fills its own). Fixtures import `SCENARIOS, SEED_SLOT, SUGGESTED_SLOT, SECOND_SLOT_AFTER` from
   `./money-scenarios.js`, `addRequest` from `./common.js`, `fmt*` from `../money.js`, `fmtWhen` / `isoMinute` /
   `addMinutes` from `../dates.js`, `POLICY` from `../money-config.js`.
3. `SCREENS.md` + `js/inventory.js` (regenerate): tag `t-thread` (the ◆ key) **M3** (D-81, like D-41); everything else as listed.
   `BUILT` += `'M3'`.
4. **`scripts/v5/journeys.mjs`** (NEW; check.mjs already runs it when present). Browser, `/?test=1`, same reporter. Persona
   flips go through the real control: `#flow-trigger` → `#persona-toggle`. Assert visible text after each step:
   - **J1 book → accept → Confirmed (the M3 proof).** `runFlow('c-pay')` → click `[data-act="pay"]` → screen `c-request`, has
     `Waiting for Amara`, `On hold`, `fmtWhen(SEED_SLOT)`, `fmtExact(seed.deposit)` · flip → `t-home`, has `Sarah C.`,
     `fmtExact(seed.payout)` · click `.request-card` → `t-request`, has `fmtWhen(SEED_SLOT)`, `Williamsburg · 11211`,
     `fmtExact(seed.services)`, `fmtExact(seed.homeFee)`, `fmtNeg(seed.tailyFee)`; not `145 N 7th St` · click
     `[data-act="accept"]` → `t-job`, has `You accepted`, `Sarah Chen`, `145 N 7th St, 2R`, same `fmtWhen` · flip →
     click `[data-nav="bookings"]` → `c-bookings`, has `Confirmed`, `Amara Reyes`, same `fmtWhen` · click `.appt-row` →
     `c-booking`, has `booked with Amara`, `Paid`, same `fmtWhen`, `fmtExact(seed.services)`, `fmtExact(seed.homeFee)`;
     not `On hold`.
   - **J2 suggest → accept new time.** `runFlow('t-request')` → `[data-act="suggest"]` → `t-suggest` → `[data-act="send-suggestion"]`
     → `t-request` has `Waiting on Sarah`, `fmtWhen(SUGGESTED_SLOT)` · flip → Bookings → row → `c-request` has same
     `fmtWhen(SUGGESTED_SLOT)` · `[data-act="accept-time"]` → `c-booking` has `booked with Amara`, `fmtWhen(SUGGESTED_SLOT)` ·
     flip → t-home Upcoming row has `fmtWhen(SUGGESTED_SLOT)`.
   - **J3 decline → job kept.** `runFlow('t-request--decline')` → `[data-act="decline-ok"]` → `t-request` has `You declined`
     · flip → Bookings → Past row `Declined` → `c-request` has `take this job` → `[data-act="find-another"]` → `c-tailors`
     has `Declined this job`.
   - **J4 customer cancels late → tailor keeps the deposit.** `runFlow('c-booking--cancel-late')` → `[data-act="cancel-ok"]`
     → `c-booking` has `Kept` · flip → t-home (no upcoming) → `Taily.render('t-job')` has `Cancelled by Sarah`,
     `fmtExact(lateCancel.tailorPaid)`.
   - **J5 tailor can't make it → refund.** `runFlow('t-job--cant-make-it')` → `[data-act="cant-ok"]` → flip → Bookings →
     Past → `c-booking` has `Cancelled by Amara`, `Refunded`, `fmtExact(earlyCancel.refund)`.
5. Update `docs/v5/CONTEXT.md`: `justConfirmed`, tailor-data additions, `js/focus.js`, `addRequest` / slot constants,
   `DECLINE_REASONS` / `CANT_MAKE_IT_REASONS`, `POLICY.JUST_BOOKED_MIN`, the new components / variants (§A7).
6. `npm run check -- --accept-new` (list new keys), then `npm run check` green. The withdraw sheet baseline changes (danger
   CTA) — re-accept `c-request--withdraw` only.

---

## E. Acceptance checklist (every M3 screen; reviewers use this)

- **Same ticket both sides:** flip persona on any state — time string, Services / Home-visit fee amounts and status word
  agree (§B2). Deposit: On hold (requested / suggested) → Paid (confirmed) → Refunded / Kept / Released.
- One focal element; one filled CTA (danger fill only inside destructive confirm sheets); secondary = outline / text.
- Tailor: "You take home $X after the $Y Taily fee" on every request card and request; no street address or last name
  before accepting; street hidden again after a cancellation.
- Customer: every outcome states what happened to the money first, then one way forward; declined thread read-only; Try
  again shows "n of 2"; final expiry routes to other tailors.
- Countdowns: normal → soon (≤ 15 min, warning) → expired, from the demo clock; text, not colour alone.
- Every tappable ≥ 44 (cards, rows, chips, sheet buttons, text buttons); visible labels on reason chips; busy verbs on every
  async action; toasts confirm, the screen shows the result.
- Empty states have a way forward (t-home, c-bookings, t-suggest no slots, no-focus fallbacks).
- Dollars only via `fmt*`, `data-money` on every amount, no `%`; reduced motion respected.
