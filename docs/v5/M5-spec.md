# M5 — Messaging, accounts, earnings, system spec (build instructions)

Oct 13, 2026 · spec writer / design director (Opus) · branch `V5`. Builders read **§0 + §A (signatures only) + §B + their
cluster** + `docs/v5/CONTEXT.md`. Calls this spec had to make are **D-128…D-143** in `DECISIONS.md`, cited inline. Money copy
is always dollar amounts from `js/money.js` on `appt.money` / `state.payouts` / `SCENARIOS` (`fmtColumn` per list, `fmtExact`
in every breakdown, `fmtNeg` for the Taily fee), never percentages, never a typed amount — fixtures derive every dollar and
payout date from `SCENARIOS` / `PAYOUT_DAYS` / `AMARA`.

**Order:** (1) Model + component builder §A (serial) → (2) four screen builders, clusters §C1–§C4, in parallel → (3)
Integrator §D (registrations, system layer in `app.js`, SCREENS.md + inventory keys, journeys J7–J9, CONTEXT.md).

**M5 done when:** `npm run check` green (incl. journeys J1–J9); every M5 key in `js/inventory.js` has a FLOWS entry; by hand
with normal latency: Sarah opens Amara's profile → Ask a question → Amara (persona flip) sees "Sarah C." in Messages with an
unread 1 and replies → Sarah books from the thread's "No booking yet" row → the SAME thread now carries "You sent a request"
and a countdown in its header → Sarah types her phone number, sees the live hint, sends: both sides show "phone hidden", only
Sarah sees the privacy note under her bubble → Amara accepts → thread reads "Amara accepted" / "You accepted". Account: add a
Work address, make it default, remove it with Undo; add a Mastercard, make it default, remove the Visa (the open booking moves
to the Mastercard, the sheet said so). Earnings: next payout $112.50 on Fri, Oct 23, Paid $147.50 on Fri, Oct 16; a failed run
→ Fix bank details → payout scheduled again. Offline banner + Retry on both personas; session expired → re-auth sheet.

---

## 0. Direction (applies to every M5 screen)

**Who — the same two people, now between the moments.**
- **Sarah**, on the train or at her desk, wants to *ask before she commits*, then *keep one conversation with Amara* that she
  can find again from Messages, her booking, or a push. Later she *tidies her account*: where tailors come, which card pays,
  what she paid.
- **Amara**, between fittings with chalk on her fingers, wants to *answer a question in one thumb*, *never lose a customer's
  context* (which job is this about, how long until the request expires), and on Friday *see exactly what lands in her bank*
  and why — in dollars, job by job.

**Feel:** the counter of a small shop. A conversation is a slip pinned to the ticket — the job it belongs to is always one tap
above it. Money is a pay envelope: one figure on the front, the slip inside lists every job and the Taily fee in dollars.
Quiet, exact, no surprises: what is hidden is said to be hidden ("phone hidden"), what failed says what happened and what
didn't (nothing charged, message not sent), and every dead end has a way forward.

**Signature — "the thread is pinned to the ticket."** Every thread screen carries a **context row** (`threadContext`) directly
under the header: the job's status pill, its visit time and a link to it — on both personas, built from the same appointment
with `statusWord` (§B2 of M3/M4). The same message list component (`threadMessages`) renders both sides from the reader's point
of view, so the text, order, day dividers, masked tokens and photos are identical except for "You" vs the name. Reviewers flip
persona on any thread state to check.

- **One focal element per screen** (named per screen): the conversation + composer (threads), the newest thread (lists), the
  profile card (Account), the next-payout figure `.t-display` (Earnings), the payout figure (Payout). Never two filled CTAs;
  destructive confirms use `cta` `danger` as their one filled button (D-79).
- **Type:** `.t-display` 32 (one money figure per screen) · `.t-title` 28 screen title · `.t-h2` 24 section heads ·
  `.t-body` 16 · `.t-small` 12 · `.t-caps` 12. Hierarchy by weight + colour first (600 ink / 500 neutral-700 / 400
  neutral-600). Money, times, counts `tabular-nums`. Typographic apostrophes (’) in copy; FLOWS `expect` strings avoid
  apostrophes and never assert caps-transformed labels (innerText follows `text-transform`).
- **Layout:** 390 wide, `--neutral-50`, sides 20, `.body` padding-top 128; sticky bars → `.body--with-bar`. Rhythm 8 inside a
  group, 24 between groups, 32 before a section head. Cards white, `--radius-lg`, `box-shadow: inset 0 0 0 1px
  var(--neutral-200)`. Lists are rows on one white card separated by 1 px inset lines, not separate cards. Every target ≥ 44.
- **Async:** every send / save / remove / verify / retry goes through `withLatency` (busy verb, inputs locked, `aria-busy`);
  `?test=1` → instant. Lists (Messages ×2, Past orders, Earnings) show `skeleton` rows on their first load (D-141).
- **Results speak twice:** the screen shows the new state AND a short toast confirms it. Never only a toast (§B3).
- **Progressive disclosure:** add-address, add-card, card actions, attach photo, sign-out confirm, re-auth and the push ask
  live in sheets / modals; the list shows only what is needed to choose.
- `prefers-reduced-motion`: sheets fade, spinners and skeleton shimmer stop.

Before writing each component, builders state the interface-design checkpoint in their head: intent (who, verb), hierarchy
(focal + how it wins), palette (tokens only: ink, neutrals, accent for the one action, semantic only for status), depth (inset
1 px strokes, no shadows), typography (serif headings, Hanken UI, weight before size), spacing (8 base; 8 / 24 / 32).

---

## A. MODEL + COMPONENTS (Component builder — serial, before the screens)

Everything DOM-free goes in the model files; every DOM-touching shared helper goes in `components.js` or the NEW
`js/system.js`. Add the model tests in A9. Then update `sys-components` with a gallery block for each new component.

### A1. `js/data.js`
- `CHAT_LIMITS = { PHOTOS_MAX: 3 }` (photos per message, D-131).
- `ADDRESS_LABELS = ['Home', 'Work', 'Other']`.
- `CUSTOMER.addresses = [{ id: 'home', label: 'Home', street: '145 N 7th St', unit: '2R', city: 'Brooklyn', state: 'NY',
  zip: '11211', default: true }]` — `CUSTOMER.address` stays and always equals the default address's fields (or `null` when
  none is saved). Build `address` from the same literal so nothing is typed twice.
- `PAYOUT_KIND_LABEL = { job: 'Job', 'kept-deposit': 'Late cancellation', 'no-show': 'No-show' }`.

### A2. `js/dates.js`
- `payoutDay(iso) → 'YYYY-MM-DD'` — the Friday strictly after that day (a Friday → the next Friday), D-24. `state.js`
  `payoutDate` is replaced by it (same result).

### A3. `js/state.js` — sim knobs + transitions (DOM-free)
- `freshSim()` adds `payout: 'ok'` and `server: 'ok'`. Documented values: `network 'online'|'offline'` · `send 'ok'|'fail'`
  (**one-shot**: the next send fails, then the knob returns to `'ok'` — a dropped connection, D-130) · `session
  'valid'|'expired'` · `push 'default'|'prompt'|'granted'|'denied'` (`'prompt'` = the soft ask shows on its host, D-139) ·
  `payout 'ok'|'failed'` · `server 'ok'|'error'` (one-shot, D-140).
- Threads: `ensureThread` adds `read: { customer: 0, tailor: 0 }` (the highest message sequence number each reader has seen;
  `m12` → 12). `post()` keeps ids `m<n>`.
- `sendMessage(tailorId, from, { text, photos })`, in this order: unknown-tailor · read-only · `empty` · `too-many-photos`
  (count > `CHAT_LIMITS.PHOTOS_MAX`) · `offline` (`sim.network === 'offline'`) · `send-failed` (`sim.send === 'fail'`; set it
  back to `'ok'` before returning) · then post as today. On success also set `read[from]` to the new message's number (your own
  message is never unread).
- `markThreadRead(tailorId, reader)` → `{ ok }` — `read[reader]` = the last message's number. No-op without a thread.
- `requestBooking`: first line after the job validation — `if (state.sim.server === 'error') { state.sim.server = 'ok'; return
  fail('server-error'); }` (nothing authorized).
- `newJob()`: `zip: state.customer.address?.zip ?? state.job.zip`, `address: state.customer.address ? { ...state.customer.address
  } : null` (Sarah may have removed every address, D-133).
- Payouts: `addPayout` writes `{ apptId, cents, state: 'pending', date: payoutDay(nowIso()), kind, createdAt: nowIso() }`.
  `settlePayouts()` → `{ ok, paid: [], failed: [] }` — the weekly Friday run (D-136): every `pending` payout whose `date` ≤
  today becomes `paid` (`paidAt = nowIso()`, `bank`, `last4` snapshotted from the tailor) or, when `sim.payout === 'failed'`,
  `failed` (`failedAt`, same snapshot). Never called by `tick()` / `advanceClock()`; fixtures call it.
- `setPayouts(...)`: on success, every `failed` payout becomes `pending` again with `date = payoutDay(nowIso())`,
  `retried: true`; returns `{ ..., requeued: <count>, requeuedCents }`.
- Add to `T`: `markThreadRead`, `settlePayouts`.

### A4. `js/state.js` — selectors (exported, not on `T`)
- `threadAppt(tailorId) → appt | null` (D-129): the pair's newest appointment that is not terminal and not finally expired;
  else the newest that is not withdrawn / switched; else null (a question asked before any booking).
- `unreadCount(tailorId, reader) → number` — messages after `read[reader]` written by the other person (`from` is
  `'tailor'` for the customer reader, `'customer'` for the tailor). System lines never count (D-128).
- `threadPreview(msg, reader) → string` — system: the reader's text (`tailorText ?? text` for the tailor); own message:
  `You: <text>`; photos only: `Photo` / `2 photos`; text + photos: `Photo · <text>`; masked tokens print without brackets
  (`[phone hidden]` → `phone hidden`).
- `threadsFor(reader) → [{ tailorId, thread, last, unread, appt, readOnly }]` — threads with ≥ 1 message for that reader
  (customer: every thread; tailor: `MY_TAILOR_ID`'s), newest `last.at` first, ties by sequence.

### A5. `js/tailor-data.js`
- `threadCustomerName() → 'Sarah C.' | 'Sarah Chen'` — full name once ANY appointment of the pair was accepted (D-74, D-129).
- `payoutsView() → { next: { date, cents, items } | null, failed: { cents, items, retryDate } | null, history: [{ date,
  state: 'paid', cents, bank, last4, items }], paidTotal }` — groups `state.payouts` by `date` + `state`. `next` = the
  earliest pending date (re-queued ones included, with `items[i].retried`). `items[i] = { apptId, cents, kind, title
  (customerName(appt)), sub, retried }` with `sub` = job: garment types joined ", " + " · " + `fmtDay(slot.start)`;
  kept-deposit: `Late cancellation · deposit kept`; no-show: `No-show · ${fmtDay(slot.start)}`. History newest first.
- `payoutDetail(apptId) → { payout, appt, view: requestView(appt) } | null`.

### A6. `js/account.js` (customer side, DOM-free)
- `addAddress({ label, street, unit, zip, makeDefault })` → `{ ok, address } | { ok: false, errors: { street:
  'street-required', zip: 'zip-invalid', label: 'label-required' } }`. City / state from `SHOP_CITY` (D-133). id
  `addr-<n>`. `makeDefault` (or no address yet) makes it the default.
- `removeAddress(id)` → `{ ok, removed, index, newDefault }` — removing the default promotes the first remaining one;
  removing the last sets `customer.address = null`. `restoreAddress(removed, index)` (Undo) puts it back where it was,
  default flag included. `setDefaultAddress(id)`. Every change keeps `customer.address` in step.
- `setDefaultCard(id)` → `{ ok }`. `removeCard(id)` → `{ ok, removed, movedTo: cardId | null, appts: [ids] } | { ok: false,
  error: 'unknown-card' | 'in-use' }` (D-134): a card is **in use** when an appointment that is not terminal and not finally
  expired has `cardId === id`. In use and the only card → `in-use`. In use with another card → removal succeeds and those
  appointments' `cardId` moves to the new default (`movedTo`). Removing the default promotes the first remaining card.
  `cardInUse(id) → appt | null` (selector for the sheet copy).
- `reauth(code, who = 'customer')` → `verifyCode(code, who)`; on ok also `state.sim.session = 'valid'`. `expireSession(who)`
  sets `sim.session = 'expired'` (test hook only).

### A7. Fixtures (`js/fixtures/common.js`, `money-scenarios.js`)
- `money-scenarios.js`: `PAYOUT_DAYS = { first: payoutDay(SEED_SLOT), second: payoutDay(SECOND_SLOT_AFTER) }` ('2026-10-16',
  '2026-10-23' — computed, never typed).
- `common.js`: `CHAT` copy (not money):
  `ask: 'Can you take in a jacket at the shoulders?'` ·
  `reply: 'Yes. Shoulders need a fitting, so book a visit and I’ll pin it on you.'` ·
  `after: 'See you on Thursday. Have the jacket on so I can pin the sleeves.'` ·
  `later: 'Is Thursday still good for you?'` ·
  `photo: 'This is the jacket. The sleeves are the problem.'` ·
  `late: 'Running ten minutes late, sorry!'` ·
  `phoneCustomer: \`Text me at ${CUSTOMER.phone} if you’re running late.\`` ·
  `phoneTailor: \`Easier to call me: ${AMARA.phone}\`` ·
  `email: \`Or email me at ${CUSTOMER.email}\``.
- `askAmara({ reply = true } = {})` — does NOT reset: `setClock('2026-10-13T09:30')` → Sarah sends `CHAT.ask` →
  `setClock('2026-10-13T09:42')` → (reply) Amara sends `CHAT.reply` → `setClock(DEMO_NOW)`. Real `sendMessage` only.
- `driveTo(target, { ask = false, ... })` — when `ask`, calls `askAmara()` right after `reset()`, before the booking. No other
  change (every existing flow stays identical).
- `completeJob(id, { returnOption = 'pickup' } = {})` — the real chain on an accepted appointment: `setClock(slot.start)` →
  `startFitting` → `sendPriceChange(id, appt.lines copy, { note: '' })` → `approvePriceChange` → `markReady` → `chooseReturn`
  → `payBalance(id, 'visa-4242')` → `markCompleted`. Throws on failure.
- `earningsTo(kind)` — `kind: 'pending' | 'paid' | 'failed' | 'kept'`:
  `pending` = `driveTo('completed')` (one pending payout, `PAYOUT_DAYS.first`) ·
  `paid` = pending → `setClock(\`${PAYOUT_DAYS.first}T18:00\`)` → `T.settlePayouts()` → `T.setJob({ visitType: 'shop' })` →
  `addRequest({ accept: true, after: SECOND_SLOT_AFTER })` → `completeJob(that.id)` (now Sat, Oct 17; next payout
  `SCENARIOS.shop.payout` on `PAYOUT_DAYS.second`, history `SCENARIOS.seed.payout` paid on `PAYOUT_DAYS.first`) ·
  `failed` = pending → setClock as above → `state.sim.payout = 'failed'` → `T.settlePayouts()` ·
  `kept` = `driveTo('cancelled-late')` (a pending kept-deposit payout `SCENARIOS.lateCancel.tailorPaid`).

### A8. Components (`js/components.js` + `css/components-v5.css`) — NEW and extended
NEW:
- `threadMessages(messages, { reader, now, failed = [], sending = null })` — the one renderer both thread screens use
  (signature, D-128). Output `<div class="thread" aria-live="polite">`: a **day divider** (`.t-caps c-600`, centered, `Today`
  when `isoDay(at) === isoDay(now)`, else `fmtDay(at)`) before the first message of each day; **system lines** as centered
  `.t-small c-600` text (customer reads `text`, tailor reads `tailorText ?? text`) with the time; **bubbles** via
  `chatBubble` with `side = from === reader ? 'me' : 'them'`, `time = fmtTime(at)`, `masked`, `photos`, `photoLabel`
  (`Photo from <first name>` / `Your photo`); then `sending` (one bubble, `status: 'sending'`) and each `failed[i]` (`status:
  'failed'`, `id: failed[i].id`). Never prints the reader's own privacy note on the other side's bubbles.
- `threadHead({ initials, photo, name, sub })` — the inner HTML for `headingRow` (root `.thread-head`): 40 px avatar, name `.t-body w-600`, `sub`
  (HTML, may contain a `countdown`) `.t-small c-600`. One line each, ellipsis.
- `threadContext({ pill = '', pillLabel = '', title, sub = '', act = '', id = '' })` — the context row (signature): a ≥ 56 px
  white row with inset stroke, `statusPill(pill, pillLabel)` (omitted when `pill` is ''), title `.t-body w-600 tabular`, sub
  `.t-small c-600`, chevron. A `<button data-act data-id>` when `act` is set, else a static `<div>`.
- `threadRow({ id, act = 'open-thread', name, initials, photo = null, preview, time, unread = 0, pill = '', pillLabel = '',
  closed = false })` — one 72 px `<button>` list row: avatar, name (`w-700` when unread, else `w-600`), time right
  `.t-small tabular`, preview one line ellipsis (`c-700` unread, `c-600` read), optional status pill, unread badge (accent
  fill, white `.t-micro w-700`, min 20 px, with sr-only "n unread"), `closed` → calm pill "Closed". `data-act data-id`.
- `openAttachSheet({ count, max = CHAT_LIMITS.PHOTOS_MAX }, onAdd)` — `sheetOverlay` header "Add a photo", body `.t-small
  c-600` "Photos of the garment help the tailor quote. Up to 3 per message." (number from `max`), then two 56 px rows
  `[data-act="photo-camera"]` "Take a photo" (camera glyph) and `[data-act="photo-library"]` "Choose from library" (image
  glyph). Either calls `onAdd()` then closes. dataS `attach`.
- `cardFields({ values = {}, errors = {} })` + exported `CARD_ERRORS` — the add-card fields lifted from `c-pay` (`#cc-number`,
  `#cc-exp`, `#cc-csc`, `#cc-zip`, same labels, helpers and error copy). c-pay keeps its own copy until M6.
- `skeleton({ kind })` gains `'thread-row'` (avatar + two lines) and `'payout'` (big line + two rows).
Extended:
- `chatBubble({ ..., id = '', photoLabel = 'Photo' })` — `failed` retry becomes `<button data-act="retry" data-id="${id}">Not
  sent · Retry</button>` (≥ 44 px hit); photos render as `<button type="button" class="chat-bubble__photo" data-act="view-photo"
  data-type="${photoLabel}" data-count="${n}" aria-label="View ${n} photo(s)">` (64 px tiles; `wirePhotoViewer` opens them);
  the text's `[phone hidden]` / `[email hidden]` tokens render as `<span class="masked-token"><lock glyph aria-hidden>phone
  hidden</span>` (neutral-100 fill, `--radius-sm`, `.t-small w-600`).
- `composer({ value, disabled, placeholder, hint = '', photos = 0, max = CHAT_LIMITS.PHOTOS_MAX })` — `hint` (non-empty) shows a
  `.t-small c-700` line with the info glyph above the input, `id="composer-hint"`, `aria-live="polite"`, and the input gets
  `aria-describedby="composer-hint"`; `photos > 0` shows a tray of 64 px placeholder tiles above the input, each with a 44 px
  `[data-act="remove-attachment"][data-index]` ✕ (aria-label "Remove photo n"); send is enabled when text OR photos; at `max`
  the camera button is disabled with aria-label "3 photos added, the most per message". The form carries
  `data-photos="${photos}"`.
- `wireComposer(root, onSend)` — submits when the text is non-empty OR `form.dataset.photos > 0`; calls `onSend(text)` (text may
  be ''); toggles send on input with the same rule.
- `readOnlyBanner({ text, ctaLabel, ctaAct, secondaryLabel = '', secondaryAct = '' })` — optional outline secondary under the
  primary.
- `listRow({ ..., attrs = '' })` — extra attributes on the button (`data-id`).
- `tailorBreakdown(q, { feeAfterServices = false, feeCaption = '' } = {})` — when true the Taily fee row sits right under
  Services with `feeCaption` (D-137). Default order unchanged (t-job / t-request baselines untouched).

### A9. NEW `js/system.js` (DOM side, shared; the router and host screens call it)
- `SYSTEM_EXEMPT = ['c-welcome', 'c-phone', 'c-code', 'c-name', 't-phone', 't-code', 'sys-index', 'sys-components']`.
- `systemBanner(s) → html | ''` — when `s.sim.network === 'offline'`: `<div class="sys-banner" data-sys="offline" role="status">`
  with a wifi-off glyph, title `.t-small w-700` "You’re offline", text `.t-small` "Some things won’t load or send until
  you’re back.", and a 44 px `[data-act="sys-retry"]` "Retry" (busy "Checking…"). Pinned under the top bar (fixed, inside the
  390 column, `--warning-bg` fill, `--ink` text, inset bottom stroke); `#screen.has-sys-banner .body` adds its height to the
  padding-top (token sum, no literal px).
- `wireSystem(root, screenId, { go })` — (1) `sys-retry` → busy → `withLatency` → `state.sim.network = 'online'` → `go(screenId,
  { replace: true })` → toast "You’re back online" (success) (D-138: Retry simulates the reconnect). (2) When `state.sim.session
  === 'expired'` and the screen is not exempt → `openReauth(state.persona, { go })` once per render.
- `openReauth(who, { go })` — `sheetOverlay` header "Sign in again", dataS `sys-reauth`, `holder.dataset.locked = 'true'`
  (no ✕, scrim or Escape). On open (once, guarded by `state.ui.reauth`) `A.sendCode(phone, who)` (customer:
  `state.customer.phone`; tailor: `myTailor().phone`). Body: "Your session timed out. To keep your account safe, enter the code we sent to
  (718) 555-0142." (the phone from the model), `codeInput({ id: 'reauth-code' })` with errors under it (`code-wrong` "That code
  isn’t right. Check the text and try again.", `code-expired` "That code has expired. Send a new one.", `code-format` "Enter
  all 6 digits."), a `resend` link ("Resend code in 0:30" disabled → "Resend code"), `cta` "Verify" (busy "Checking…"), and a
  secondary `[data-act="reauth-sign-out"]` "Sign out" → `A.signOut(who)` → `go(who === 'tailor' ? 't-phone' : 'c-welcome',
  { fresh: true })`. Verify → `A.reauth(code, who)` → close → toast "You’re signed in" → `go(screenId, { replace: true })`.
- `openPushPrompt({ title, body }, { onDone })` — `modalOverlay` dataS `sys-push`, `role="alertdialog"`: a bell glyph, title
  `.t-h2`, body `.t-body c-700`, primary `[data-act="push-on"]` "Turn on notifications", secondary `[data-act="push-later"]`
  "Not now". On → `state.sim.push = 'granted'`, close, toast "Notifications are on" (success). Not now / Escape →
  `state.sim.push = 'denied'`, close. Both then `onDone()` (the host re-renders so the denied banner / note shows).

### A10. Model tests (`scripts/v5/model-test.mjs`)
mask both patterns on both senders; `send-failed` is one-shot; `offline` fails until online; `too-many-photos` at 4;
`unreadCount` counts only the other person and resets on `markThreadRead`; own send never unread; `threadAppt` prefers the
active appt, skips withdrawn; `threadPreview` (system for both readers, "You: ", "2 photos", "phone hidden"); `server-error`
one-shot authorizes nothing; `settlePayouts` pays only due pending payouts and snapshots the bank; `failed` + `setPayouts` →
pending on the next Friday; `payoutsView` grouping and `paidTotal`; `removeCard` in-use only card → error, in use with another
card → appts move to the default; `removeAddress` of the default promotes, of the last → `customer.address === null` and
`newJob()` still works; `restoreAddress` restores order and default.

---

## B. Shared data + copy (all clusters)

### B1. Seed facts (derived — never typed)
Thread copy = `CHAT` (A7). Sarah's phone `CUSTOMER.phone`, Amara's `AMARA.phone`, bank `${AMARA.payouts.bank}
••${AMARA.payouts.last4}` (same format as t-shop). Money: `SCENARIOS.seed.total / payout / deposit`, `SCENARIOS.shop.payout`,
`SCENARIOS.lateCancel.tailorPaid`, `SCENARIOS.earlyCancel.refund`. Dates: `PAYOUT_DAYS.first / .second` via `fmtDay`, visit
`fmtWhen(SEED_SLOT)`.

### B2. Messaging rules (CORE-JOURNEY "Messaging rules" → behaviour)
| Thread appt (`threadAppt`) | Composer | Header sub (customer / tailor) | Context row (both) |
|---|---|---|---|
| none (question before booking) | on | `Reyes Tailoring · Williamsburg` / `Asking before booking` | customer: "No booking yet" · "See Amara’s prices and open times" → c-tailor; tailor: static "No request yet" · "Sarah is asking before booking" |
| requested | on | `Request sent · <countdown "2h left">` / `New request · <countdown "2h left"> to reply` | pill + `fmtWhen(slot)` + visit label · "View request" → c-request / t-request |
| suggested, confirmed … completed, cancelled | on | shop · hood / `fmtWhen · visit label` | pill + time · "View booking" / "Open job" → `statusScreen` |
| expired (any tries) | on | as above | pill "No reply" → c-request (Try again lives there) |
| declined | **off** — read-only banner | as above | pill "Declined" |

Pills come from `statusWord(appt, persona, { short: true })` (no new words). The countdown is the `countdown` component
(warning ring ≤ 15 min, D-09 — no interval). Masking applies to every message on both sides (`maskContact`); the sender sees
`PRIVACY_NOTE` under their own masked bubble; the receiver sees only the "phone hidden" / "email hidden" token. A live hint
above the composer ("Phone numbers and emails are hidden when you send.") appears while the draft contains one (D-130).

### B3. Error + feedback pattern (system-wide, D-140)
1. **Field problem** → the message under the field (`field` / `codeInput` error, `role="alert"`), shown on submit, focus moves
   to the first bad field. Never only at the top.
2. **Action failed** → an error `banner` directly above the action that failed (in the sheet, or above the action bar):
   what happened, what did NOT happen with money ("Nothing was charged / held / sent"), and the way forward as its action. The
   failed control stays enabled for a retry.
3. **Toast** → echoes the result in ≤ 6 words ("Card removed", "Message not sent", "Couldn’t send your request"); never the
   only carrier of an error; Undo (5 s) only for reversible removes (D-71); cleared on screen change.
4. **Loading** → busy CTA with a verb ("Saving…", "Removing…", "Checking…"); lists show `skeleton` rows; a sent message shows
   "Sending…" under the bubble.
5. **Offline** → the system banner (A9) on every screen; sends fail into "Not sent · Retry".

### B4. Payout words (both Earnings screens)
| payout state | pill (`statusPill`) | line |
|---|---|---|
| pending | `waiting`, "Scheduled" | `Arrives ${fmtDay(date)} · to Chase ••6789` |
| pending, `retried` | `waiting`, "Scheduled" | `Sending again ${fmtDay(date)} · to Chase ••6789` |
| paid | `completed`, "Paid" | `Paid ${fmtDay(date)} · to Chase ••6789` (the snapshot bank) |
| failed | `declined`, "Didn’t go through" | `Chase ••6789 sent it back` |

### B5. Navigation map (M5)
- Customer tabs: Messages → `c-messages` · Account → `c-account`. Tailor tabs: Earnings → `t-earnings` · Messages →
  `t-messages` (routes already in `NAV_ROUTES`).
- Into a thread: c-messages row → `state.ui.thread = { tailorId }` → `c-thread`; c-tailor Ask / c-request / c-booking /
  c-price-change Message → `c-thread` (they already go there; c-thread reads `state.ui.thread?.tailorId ??
  state.ui.booking?.tailorId ?? tailors[0].id`). t-messages row → `t-thread`; t-job / t-request Message → `t-thread`.
- Out of a thread: context row → `setFocus(a.id)` → `statusScreen(a, persona)`; customer pre-booking row → `state.ui.booking =
  { tailorId }` → `c-tailor`; read-only "Find another tailor" → `c-tailors`; "Start a different job with Amara" → `T.newJob()`
  → `c-job` `{ fresh: true }`.
- Account: `c-account` → `c-addresses` / `c-cards` / `c-orders` (Back returns); `c-orders` row → `setFocus` →
  `statusScreen(a, 'customer')` (c-booking with its Receipt, or c-complete). Sign out → `c-welcome` `{ fresh: true }`.
- Earnings: row → `setFocus(apptId)` → `t-payout`; "Open the job" → `t-job`; "Fix bank details" → `to-payouts` (edit mode,
  live tailor); after save `back()` returns to Earnings.

---

## C1. CLUSTER "Customer messaging" — `c-thread` (M5 states), `c-messages` (NEW)

Files: `js/screens/c-thread.js` + `css/screens/c-thread.css`, `js/screens/c-messages.js` + css. FLOWS: keep `c-thread--new` in
`m1.js` (update its `expect` only if copy moved); add `export const FLOWS_c_thread = [...]` to `m5.js` (new array, yours) and
fill `FLOWS_c_messages`. Group `'M5 · Messages'`, helper prefix `CM_`.

### c-thread — C12 one conversation with one tailor
**Purpose:** ask before booking and keep talking through the review, in one place, with the job one tap away.
**Focal:** the conversation's newest message + the composer pinned at the bottom (the composer is the only filled control).

**Layout top → bottom**
1. `chrome('messages')`.
2. `headingRow(threadHead({ initials: t.initials, photo: t.photo, name: t.name, sub }), { back: true })` — `sub` per §B2.
3. `threadContext(...)` per §B2 (customer column), 8 below the header.
4. `privacyNote()` (quiet, 16 below).
5. Messages: `threadMessages(thread.messages, { reader: 'customer', now: now(), failed: ui.failed, sending: ui.sending })`, 24
   below. No messages → the M1 empty state + suggestion chips (unchanged copy: "Ask Amara a question", "No booking needed…").
6. Foot (sticky, `.c-thread__foot`): read-only → `readOnlyBanner({ text: \`${first} declined this request, so this chat is
   closed. Send ${first} a new request for a different job to chat again.\`, ctaLabel: 'Find another tailor', ctaAct:
   'find-another', secondaryLabel: \`Start a different job with ${first}\`, secondaryAct: 'new-job' })` (D-132); else
   `composer({ value: ui.draft, placeholder: \`Message ${first}\`, hint, photos: ui.photos ?? 0 })` with `hint` = `maskContact(
   draft).masked ? 'Phone numbers and emails are hidden when you send.' : ''`.

**Data:** `t = tailorById(ui.thread?.tailorId ?? ui.booking?.tailorId ?? tailors[0].id)`; `threadFor(t.id)`;
`threadAppt(t.id)`; `threadReadOnly(t.id)`; `statusWord(a, 'customer', { short: true })`; `msLeft` via `countdown({ expiresAt,
now: now() })`. `state.ui['c-thread'] = { draft, photos, failed: [{ id, text, photos }], sending }` (D-34, D-130).

**Behaviour (wire)**
- On every render: `T.markThreadRead(t.id, 'customer')` (no re-render).
- Input → `ui.draft`; toggle the hint element in place (no re-render while typing).
- Send → `ui.sending = { text, photos }`, `ui.draft = ''`, `ui.photos = 0`, `go(ID)` → `withLatency` → `T.sendMessage(t.id,
  'customer', { text, photos })` → ok: `ui.sending = null`, `go(ID)`, scroll to the bottom; `r.masked` adds nothing else (the
  bubble note says it). Fail (`send-failed` / `offline`): push `{ id: 'f<n>', text, photos }` to `ui.failed`, `ui.sending =
  null`, `go(ID)`, toast "Message not sent" (error).
- `retry` [data-id] → remove from `ui.failed`, same send path (one-shot failure → the retry succeeds online).
- `attach-photo` → `openAttachSheet({ count: ui.photos }, () => { ui.photos = Math.min(max, (ui.photos ?? 0) + 1); go(ID); })`.
  `remove-attachment` → `ui.photos - 1`.
- `wirePhotoViewer(root)` (bubble photos). `open-appt` → `setFocus(id)` → `go(statusScreen(a, 'customer'))`. `open-profile` →
  `state.ui.booking = { ...(state.ui.booking ?? {}), tailorId: t.id }` → `go('c-tailor')`. `find-another` → `go('c-tailors')`.
  `new-job` → `T.newJob()` → `go('c-job', { fresh: true })`. Suggestion chips unchanged (fill, never send).

**States** (all `screen: 'c-thread'`; setups use real transitions; `driveTo` resets)
| key | kind | setup | click | expect |
|---|---|---|---|---|
| `c-thread` ◆ (M5) | frame | `driveTo('confirmed', { ask: true }); T.sendMessage('amara', 'tailor', { text: CHAT.after })` | — | has `Can you take in a jacket`, `You sent a request`, `Amara accepted`, `See you on Thursday`, `Confirmed`, `fmtWhen(SEED_SLOT)`, `Today`; sel `.thread-context` |
| `c-thread--new` (M1) | frame | (seed) | — | unchanged |
| `c-thread--question` · (NEW, D-142) | state | `askAmara()` | — | has `No booking yet`, `book a visit`, `Can you take in a jacket`; not `You sent a request` |
| `c-thread--pending` · | state | `driveTo('requested', { ask: true })` | — | has `Request sent`, `2h left`, `You sent a request`; sel `.thread-head [data-countdown]` |
| `c-thread--masked` · | state | `driveTo('confirmed', { ask: true }); ui['c-thread'] = { draft: CHAT.phoneCustomer }` | `[data-act="send"]` | has `phone hidden`, `Phone numbers and emails stay private on Taily`; not `555-0142`; sel `.chat-msg--me .chat-msg__note` |
| `c-thread--failed` · | state | `driveTo('confirmed', { ask: true }); sim.send = 'fail'; ui draft = CHAT.late` | `[data-act="send"]` | has `Running ten minutes late`, `Not sent`, `Retry`; sel `[data-act="retry"]` |
| `c-thread--photo` · | state | `driveTo('confirmed', { ask: true }); T.sendMessage('amara', 'customer', { text: CHAT.photo, photos: 2 })` | — | has `The sleeves are the problem`; sel `.chat-bubble__photo[data-act="view-photo"]` |
| `c-thread--attach` O (NEW, D-142) | overlay | `driveTo('confirmed')` | `[data-act="attach-photo"]` | has `Add a photo`, `Take a photo`, `Choose from library`, `Up to 3 per message` |
| `c-thread--read-only` ◆ | frame | `driveTo('declined', { ask: true })` | — | has `Amara declined`, `this chat is closed`, `Find another tailor`, `Start a different job with Amara`; not `Send`; sel `.read-only` |

**Acceptance:** the first ◆ is the booked conversation (`?screen=c-thread`); context row present whenever an appt exists and
≥ 56 px; countdown only while requested; masked token visible on her bubble with the note under it; Retry ≥ 44; the composer
never covers the last message (body bottom padding = foot height); read-only has no composer and both ways forward; photos
open the viewer; flip persona on `c-thread` → t-thread shows the same lines in the same order with "You accepted" / "Sarah sent
a request".

### c-messages — C12 Messages tab
**Purpose:** find a conversation again. **Focal:** the top (newest) thread row.

**Layout:** `chrome('messages')` → `headingRow('<h1 class="t-title">Messages</h1>', { back: false })` → `.t-small c-600`
"One conversation per tailor, from your first question to the review." → one white card of `threadRow`s (24 below) → nothing
else. Loading (first visit, D-141): `skeleton({ kind: 'thread-row', count: 3 })` in the card's place.

**Row data** (`threadsFor('customer')`): `name: tailor.name`, `initials`, `photo`, `preview: threadPreview(last, 'customer')`,
`time`: `fmtTime(last.at)` today else `fmtShort(last.at)`, `unread: unreadCount(id, 'customer')`, pill from
`statusWord(threadAppt(id), 'customer', { short: true })` (none before a booking), `closed: readOnly`. Tap → `state.ui.thread
= { tailorId }` → `go('c-thread')`.

**Empty:** `emptyState({ title: 'No messages yet', body: 'Ask a tailor a question from their profile. No booking needed.',
ctaLabel: 'Find a tailor', ctaAct: 'home' })` → `c-job`.

| key | kind | setup | expect |
|---|---|---|---|
| `c-messages` ◆ | frame | `driveTo('confirmed', { ask: true }); T.sendMessage('amara', 'tailor', { text: CHAT.after })` | has `Messages`, `Amara Reyes`, `See you on Thursday`, `Confirmed`, `1 unread`; sel `.thread-row` |
| `c-messages--empty` · | state | (seed) | has `No messages yet`, `Find a tailor`; not `Amara Reyes` |
| `c-messages--loading` · (NEW, D-141) | state | `askAmara(); sim.latency = 'hold'` | sel `.skeleton--thread-row` (`visual: true`) |

**Acceptance:** unread row bold with a visible count and sr text; preview follows the reader's point of view; a closed thread
says "Closed"; rows ≥ 72; tapping opens that tailor's thread; the list survives a persona flip unchanged.

---

## C2. CLUSTER "Tailor messaging" — `t-thread` (M5 states), `t-messages` (NEW)

Files: `js/screens/t-thread.js` + css, `js/screens/t-messages.js` + css. FLOWS: in `m3.js` `FLOWS_t_thread` **remove
`t-thread--declined`** (replaced by `t-thread--read-only`; the integrator deletes its baseline) and keep `t-thread` ◆; add the
M5 entries to `m5.js` `FLOWS_t_thread`; fill `FLOWS_t_messages`. Group `'M5 · Tailor messages'`, prefix `TM_`.

### t-thread — T9 the same thread, from Amara's side
**Purpose:** answer fast and never lose which job a message is about. **Focal:** the composer + newest message.

**Layout** (mirrors c-thread; same components): `chrome('messages', { persona: 'tailor' })` → `headingRow(threadHead({
initials: customerInitials(), name: threadCustomerName(), sub }))` → `threadContext` (§B2 tailor column) → `privacyNote()` →
`threadMessages(messages, { reader: 'tailor', now: now(), failed, sending })` or, empty, `.t-body c-600` "No messages yet. Say
hello or ask about the fit." → foot: read-only → `readOnlyBanner({ text: \`You declined this request, so the conversation is
closed. ${sarah} can send you a new request for a different job.\`, ctaLabel: 'Back to Home', ctaAct: 'home' })`; else
`composer({ value, placeholder: \`Message ${sarah}\`, hint, photos })` (same hint rule).

**Data:** the thread is `threadFor(MY_TAILOR_ID)`; context = `threadAppt(MY_TAILOR_ID)` (replaces the M3 `jobOf()`; D-129).
No thread and no appt → the M3 empty state ("No conversation yet", Go to Home). `state.ui['t-thread']` = same shape as
c-thread. Sends `T.sendMessage(MY_TAILOR_ID, 'tailor', …)`; `markThreadRead(MY_TAILOR_ID, 'tailor')` on render.

**Behaviour:** identical to c-thread (send / sending / failed / retry / attach / remove / view photo). `open-appt` →
`setFocus(a.id)` → `go(statusScreen(a, 'tailor'))`. `home` → `personaHome('tailor')`.

| key | kind | setup | click | expect |
|---|---|---|---|---|
| `t-thread` ◆ (M3) | frame | unchanged (`driveTo('confirmed')`) | — | unchanged + sel `.thread-context` |
| `t-thread--question` · (NEW) | state | `askAmara({ reply: false })` | — | has `Sarah C.`, `Asking before booking`, `Can you take in a jacket`; not `Sarah Chen` |
| `t-thread--pending` · (NEW) | state | `driveTo('requested', { ask: true })` | — | has `New request`, `2h left`, `Sarah sent a request`, `Sarah C.`; not `Sarah Chen` |
| `t-thread--masked` · | state | `driveTo('confirmed', { ask: true }); ui['t-thread'] = { draft: CHAT.phoneTailor }` | `[data-act="send"]` | has `phone hidden`, `Phone numbers and emails stay private on Taily`; not `555-0118`; sel `.chat-msg--me .chat-msg__note` |
| `t-thread--failed` · | state | `driveTo('confirmed'); sim.send = 'fail'; ui draft = CHAT.after` | `[data-act="send"]` | has `Not sent`, `Retry` |
| `t-thread--photo` · | state | `driveTo('confirmed', { ask: true }); T.sendMessage('amara', 'customer', { text: CHAT.photo, photos: 2 })` | `.chat-bubble__photo` | has `Photo from Sarah`, `1 of 2` (the viewer open over the thread) |
| `t-thread--read-only` · | state | `driveTo('declined', { ask: true })` | — | has `You declined this request`, `Back to Home`; not `Send`; sel `.read-only` |

**Acceptance:** "Sarah C." until any accept, "Sarah Chen" after; the street address never appears in the thread header or
context before the accept (the context row uses the neighborhood only, as t-request); system lines read from Amara's side
("You accepted", "Sarah sent a request"); same masked token / note rules as C1.

### t-messages — T9 Messages tab
**Layout:** `chrome('messages', { persona: 'tailor' })` → `headingRow('<h1 class="t-title">Messages</h1>', { back: false })` →
`.t-small c-600` "One conversation per customer. Requests and jobs link from each one." → card of `threadRow`s
(`threadsFor('tailor')`, name `threadCustomerName()`, pill `statusWord(appt, 'tailor', { short: true })`). Loading = skeleton.
Empty: `emptyState({ title: 'No messages yet', body: 'When a customer asks a question or sends a request, the conversation
shows up here.', ctaLabel: 'Go to Home', ctaAct: 'home' })`. Tap → `go('t-thread')`.

| key | kind | setup | expect |
|---|---|---|---|
| `t-messages` ◆ | frame | `driveTo('requested', { ask: true }); T.sendMessage('amara', 'customer', { text: CHAT.later })` | has `Messages`, `Sarah C.`, `Is Thursday still good`, `New request`, `1 unread`; not `Sarah Chen`; sel `.thread-row` |
| `t-messages--empty` · | state | (seed) | has `No messages yet`, `Go to Home` |

**Acceptance:** as c-messages; the tailor never sees Sarah's surname before an accept.

---

## C3. CLUSTER "Customer account" — `c-account`, `c-addresses`, `c-cards`, `c-orders` (all NEW)

Files: four screens + css. FLOWS: `m5.js` `FLOWS_c_account / c_addresses / c_cards / c_orders`. Group `'M5 · Account'`,
prefix `CA_`. Imports `import * as A from '../account.js'`.

### c-account — C13 Account home
**Purpose:** see who you are on Taily and reach your addresses, cards and orders. **Focal:** the profile card.

**Layout:** `chrome('account')` → `headingRow('<h1 class="t-title">Account</h1>', { back: false })` → **profile card** (white,
`--radius-lg`): `avatar({ initials, size: 'lg' })`, name `.t-h2` "Sarah Chen", phone `.t-body tabular` "(718) 555-0142", email
`.t-small c-600`, caption `.t-small c-600` "You sign in with this number." (D-133: read-only in the prototype) → 24 → one card
of three `listRow`s: "Saved addresses" sub = default address one line (`145 N 7th St, 2R · Default`) or "None saved",
right = count; "Payment methods" sub = default method (`Visa •••• 4242 · Default`, or "Apple Pay" when no card) right = count of
cards; "Past orders" sub = `1 order` / `${n} orders` / "None yet" → 32 → `cta('Sign out', { variant: 'secondary', attrs:
'data-act="sign-out"' })` → `.t-micro c-600` "Taily prototype · v5".
**Sign out** → `modalOverlay` alertdialog dataS `sign-out`: title "Sign out of Taily?", body "You’ll need your phone number and a
code to sign back in. Your bookings stay as they are.", `cta('Sign out', { variant: 'danger' })` `[data-act="sign-out-ok"]` +
secondary "Stay signed in" `[data-act="sign-out-keep"]` → `A.signOut()` → `go('c-welcome', { fresh: true })`.

| key | kind | setup | click | expect |
|---|---|---|---|---|
| `c-account` ◆ | frame | `driveTo('reviewed')` | — | has `Account`, `Sarah Chen`, `(718) 555-0142`, `Saved addresses`, `145 N 7th St`, `Payment methods`, `Visa •••• 4242`, `Past orders`, `Sign out` |
| `c-account--sign-out` O (NEW) | overlay | (seed) | `[data-act="sign-out"]` | has `Sign out of Taily?`, `Stay signed in` |

### c-addresses — Saved addresses
**Purpose:** keep the places tailors visit; choose the default new bookings start from. **Focal:** the default address card.

**Layout:** `chrome('account')` → `headingRow('<h1 class="t-title">Saved addresses</h1>', { backRow: true })` → address cards
(default first): label `.t-body w-600` + "Default" tag (accent-bg, `.t-micro w-700`), lines `.t-body c-700` (street, unit /
city, state zip), a row of 44 px text buttons: "Make default" `[data-act="make-default"][data-id]` (non-default only) and
"Remove" `[data-act="remove"][data-id]` (`c-error`) → `.t-small c-600` "New bookings start from your default address.
Changing it doesn’t move a booking you’ve already made." → `actionBar({ ctaLabel: 'Add an address', ctaAct: 'add' })`.
**Add sheet** (`sheetOverlay`, header "Add an address", dataS `add-address`): `chipGroup({ name: 'label', label: 'Label',
options: ADDRESS_LABELS, value: ui.label ?? (has Home ? 'Work' : 'Home') })`, `field` "Street address" `#street`
(autocomplete address-line1), "Apt, suite or unit (optional)" `#unit`, "ZIP code" `#zip` (numeric, 5, helper "Taily is in
Brooklyn for now."), `checkRow` "Use as my default address" (checked and disabled when it's the first), `cta('Save address')`
busy "Saving…". Errors under the fields: street "Enter your street address." · zip "Enter a 5-digit ZIP code." (the c-where
copy). Save → `A.addAddress` → close → toast "Address saved" → re-render.
**Remove** → `withLatency` → `A.removeAddress(id)` → re-render → toast `Address removed` (+ `. ${label} is now your default.`
when promoted) with action "Undo" → `A.restoreAddress`. **Make default** → `A.setDefaultAddress` → toast "Default address
updated".
**Empty:** `emptyState({ title: 'No saved addresses', body: 'Add the address where you’d like tailors to visit. You can also
type one in when you book.', ctaLabel: 'Add an address', ctaAct: 'add' })` (no action bar).

| key | kind | setup | click | expect |
|---|---|---|---|---|
| `c-addresses` ◆ | frame | `A.addAddress({ label: 'Work', street: '200 Kent Ave', unit: '', zip: '11249' })` | — | has `Home`, `Default`, `145 N 7th St`, `Work`, `200 Kent Ave`, `Make default`, `Add an address` |
| `c-addresses--empty` · | state | `A.removeAddress('home')` | — | has `No saved addresses`, `Add an address` |
| `c-addresses--add` O (NEW) | overlay | (seed) | `[data-act="add"]` | has `Add an address`, `Street address`, `ZIP code`, `Save address` |
| `c-addresses--error` O (NEW) | overlay | `ui['c-addresses'] = { add: { street: '', zip: '112' } }` | `[data-act="add"]`, `[data-act="save-address"]` | has `Enter your street address.`, `Enter a 5-digit ZIP code.` |

(ZIP 11249 is not in `ZIP_INFO`; that is fine — saved addresses are not a coverage check. If the builder prefers, use
'11222'.)

### c-cards — Payment methods
**Purpose:** choose which card pays and remove ones you no longer use, safely. **Focal:** the default card row.

**Layout:** `chrome('account')` → `headingRow('<h1 class="t-title">Payment methods</h1>', { backRow: true })` → caps-free
section head `.t-body w-600` "Cards" → card of `listRow`s: lead = card glyph, title `${brand} •••• ${last4}`, sub `Expires
${exp}`, right = "Default" tag on the default, `act: 'card'`, `attrs: data-id` → 24 → "Other ways to pay" → static `listRow`
"Apple Pay" sub "Set up in Wallet on this phone" (lead the `pay-badge`, no chevron) → `actionBar({ ctaLabel: 'Add a card',
ctaAct: 'add' })`.
**Card sheet** (dataS `card`, header `${brand} •••• ${last4}`): sub `Expires ${exp}`; when `A.cardInUse(id)` → info line
`Paying for your booking with Amara on ${fmtWhen(slot)}.`; actions: `cta('Make default', { variant: 'secondary' })`
`[data-act="make-default"]` (non-default only) and a 44 px danger text button `[data-act="remove"]` "Remove card".
- Remove → the SAME sheet swaps to the confirm step (D-134): title `.t-h2` `Remove ${brand} •••• ${last4}?`, body "You can add
  it again any time." + (in use, another card exists) `Your booking with Amara on ${fmtWhen} will use ${next} instead.` +
  (default) `${next} becomes your default.`; `cta('Remove card', { variant: 'danger' })` `[data-act="remove-ok"]` busy
  "Removing…" + secondary "Keep card" `[data-act="remove-keep"]`. Done → close → toast "Card removed".
- In use and the only card → no Remove; an info `banner` "You need a card on file while a booking is open. Add another card
  first, then you can remove this one." with action "Add a card" (swaps the sheet to the add form).
**Add sheet** (dataS `add-card`, header "Add a card"): `cardFields({ values: ui.add, errors })` + `cta('Save card')` busy
"Saving…" → `A.addCard` → errors under the fields (`CARD_ERRORS`) / ok → close → toast "Card added". (Sarah's first card
becomes default: `A.addCard` already sets `default: false` — when no card is default after adding, call
`A.setDefaultCard(card.id)`.)
**Empty** (no cards): the "Cards" section shows `emptyState({ title: 'No cards saved', body: 'Add a card to pay deposits and
balances. Apple Pay works too.', ctaLabel: 'Add a card', ctaAct: 'add' })`; Apple Pay row stays; no action bar.

| key | kind | setup | click | expect |
|---|---|---|---|---|
| `c-cards` ◆ | frame | `A.addCard({ number: '5555555555554444', exp: '11/29', cvc: '123', zip: '11211' })` | — | has `Visa •••• 4242`, `Default`, `Mastercard •••• 4444`, `Apple Pay`, `Add a card` |
| `c-cards--empty` · | state | `A.removeCard('visa-4242')` | — | has `No cards saved`, `Apple Pay` |
| `c-cards--remove` O | overlay | `driveTo('confirmed'); A.addCard({ …Mastercard })` | `[data-act="card"][data-id="visa-4242"]`, `[data-act="remove"]` | has `Remove Visa •••• 4242?`, `will use Mastercard •••• 4444 instead`, `becomes your default`, `Keep card` |
| `c-cards--in-use` O (NEW) | overlay | `driveTo('confirmed')` | `[data-act="card"][data-id="visa-4242"]` | has `Paying for your booking with Amara`, `Add another card first`; not `Remove card` |
| `c-cards--add` O (NEW) | overlay | (seed) | `[data-act="add"]` | has `Card number`, `Expiry`, `Security code`, `Save card` |

### c-orders — Past orders + receipts
**Purpose:** find what you paid and open a receipt. **Focal:** the newest order row.

**Data (D-135):** `apptsFor('customer')` that were ever confirmed (`history` has `confirmed`) and are `completed` or
`cancelled` (incl. no-show), newest visit first. Amount column via `fmtColumn`: completed → `a.money.total` caption "Paid";
cancelled early / by the tailor → `a.cancel.refund` caption "Refunded"; late / no-show → `a.cancel.kept` caption "Kept"
(`kept: true` on the row).
**Layout:** `chrome('account')` → `headingRow('<h1 class="t-title">Past orders</h1>', { backRow: true })` → card of `apptRow`s
(`name: tailor.name`, `when: fmtDay(slot.start)`, `place: \`${items} items · ${services} services\``, pill from `statusWord(a,
'customer', { short: true })`, `amountText`, `amountCaption`, `muted: true`) → `.t-small c-600` "Tap an order to see its
receipt." Loading = skeleton (D-141). Tap → `setFocus(id)` → `go(statusScreen(a, 'customer'))`.
**Empty:** `emptyState({ title: 'No past orders yet', body: 'Finished orders and their receipts show up here.', ctaLabel:
'Start a booking', ctaAct: 'home' })`.

| key | kind | setup | expect |
|---|---|---|---|
| `c-orders` ◆ | frame | `driveTo('reviewed'); addRequest({ accept: true, after: SECOND_SLOT_AFTER }); T.cancelBooking(that.id)` | has `Past orders`, `Completed`, `fmtExact(SCENARIOS.seed.total)`, `Paid`, `Cancelled`, `fmtExact(SCENARIOS.earlyCancel.refund)`, `Refunded`; sel `.appt-row` |
| `c-orders--empty` · | state | (seed) | has `No past orders yet`, `Start a booking` |

**Acceptance (C3):** every remove is either undoable (address) or confirmed in place (card) — never both, never neither; the
default is marked by text, not colour alone; every field has a visible label and its error under it; money in Past orders is
one precision; no screen shows Sarah's card number beyond the last 4.

---

## C4. CLUSTER "Earnings + system" — `t-earnings`, `t-payout` (NEW); system states on `c-job`, `t-home`, `c-bookings`, `c-request`, `c-pay`, `to-done`

Files: `js/screens/t-earnings.js`, `js/screens/t-payout.js` + css; small M5 edits in `t-home.js`, `c-request.js`, `c-pay.js`,
`to-done.js` (no other cluster touches them). FLOWS: `m5.js` `FLOWS_t_earnings`, `FLOWS_t_payout`, `FLOWS_sys_*` (add
`export const FLOWS_sys_push_prompt_customer = []`). Group `'M5 · Earnings'` / `'M5 · System'`, prefix `TE_`.

### t-earnings — T8 Earnings
**Purpose:** know what lands in the bank on Friday and why. **Focal:** the next-payout figure.

**Layout:** `chrome('earnings', { persona: 'tailor' })` → `headingRow('<h1 class="t-title">Earnings</h1>', { back: false })`
→ (failed) error `banner({ title: 'Your Friday payout didn’t go through', text: \`${bank} sent back <span data-money>$X</span>.
Check your bank details and we’ll send it again on ${fmtDay(retryDate)}.\`, actionLabel: 'Fix bank details', actionAct:
'fix-bank' })` → **next payout card** (white): `deltaFigure({ label: 'Next payout', cents: next.cents, caption: \`Arrives
${fmtDay(next.date)} · to ${bank}\` })` + `.t-small c-600` `${n} job(s) · after the Taily fee` + the payout's job rows
(`listRow({ title, sub, right: amount, act: 'open-payout', attrs: data-id })`). No pending → the card reads "Nothing scheduled"
`.t-h2` + "Every Friday, Taily pays you for the jobs you completed before that day." (D-152) → 32 → `h2.t-h2` "Paid" → per Friday a group: header
row (`fmtDay(date)` `.t-body w-600`, amount right `w-600`, sub `Paid to ${bank}` + `statusPill('completed', 'Paid')`) then
its job rows → footer `.t-small c-600` "Every amount is after the Taily fee. Taily pays out every Friday." Precision:
`fmtColumn` over every amount on the screen. Loading = `skeleton({ kind: 'payout' })` (D-141).
**Empty** (no payouts at all): `emptyState({ title: 'No earnings yet', body: 'When you complete a job, its payout shows up here.
Taily pays out every Friday.', ctaLabel: 'Go to Home', ctaAct: 'home' })`.
**Wire:** `open-payout` → `setFocus(id)` → `go('t-payout')`; `fix-bank` → `go('to-payouts')`; `home` → `personaHome`.

| key | kind | setup | expect |
|---|---|---|---|
| `t-earnings` ◆ | frame | `earningsTo('paid')` | has `Earnings`, `fmtExact(SCENARIOS.shop.payout)`, `fmtDay(PAYOUT_DAYS.second)`, `Paid`, `fmtExact(SCENARIOS.seed.payout)`, `fmtDay(PAYOUT_DAYS.first)`, `Chase ••6789`, `after the Taily fee` (bank from `AMARA`) |
| `t-earnings--empty` · | state | (seed) | has `No earnings yet`, `every Friday` |
| `t-earnings--pending` · | state | `earningsTo('pending')` | has `fmtExact(SCENARIOS.seed.payout)`, `Arrives fmtDay(PAYOUT_DAYS.first)`; not `Paid to` |
| `t-earnings--failed` · | state | `earningsTo('failed')` | has `go through`, `Fix bank details`, `fmtExact(SCENARIOS.seed.payout)`, `fmtDay(PAYOUT_DAYS.second)`; sel `.banner--error` |
| `t-earnings--loading` · (NEW, D-141) | state | `earningsTo('pending'); sim.latency = 'hold'` | sel `.skeleton--payout` |

### t-payout — T8 one job's payout
**Purpose:** see how one job became one payout, in dollars. **Focal:** the payout figure.

**Data:** `payoutDetail(state.ui.apptId)` (fallback: the newest payout). **Layout:** `chrome('earnings', { persona: 'tailor'
})` → `headingRow(..., { backRow: true })` with the B4 pill + `deltaFigure({ label: 'Your payout', cents, caption: B4 line })`
→ (failed) error banner + "Fix bank details" → **The job** card: `customerName(appt)` `.t-body w-600`, `fmtWhen(slot.start)`
· visit label, `${items} items · ${services} services`, `linkRow('Open the job', { attrs: 'data-act="open-job"' })` → **How it
adds up** (`h2.t-h2`):
- kind `job`: `tailorBreakdown(appt.money, { feeAfterServices: true, feeCaption: \`On the ${fmtExact(services)} of services
  only\` })` (D-137) — Services · Taily fee −$12.50 · Home-visit fee · Rush fee · Your payout. Courier job → `.t-small c-600`
  "The courier was paid by Sarah. It isn’t part of your payout." (D-04).
- kind `kept-deposit`: `moneyRows([{ label: 'Deposit kept', cents, caption: 'Sarah cancelled within 24 hours of the visit'
  }, { label: 'Your payout', cents, kind: 'total' }])` + "No Taily fee on a kept deposit."
- kind `no-show`: same with "No-show pay" / "Sarah didn’t show up".
All amounts `fmtExact`, `data-money`. `actionBar` only when failed (`Fix bank details`).

| key | kind | setup | expect |
|---|---|---|---|
| `t-payout` ◆ | frame | `earningsTo('paid'); setFocus(state.appts[0].id)` | has `Your payout`, `Paid`, `fmtExact(SCENARIOS.seed.payout)`, `fmtExact(SCENARIOS.seed.services)`, `fmtNeg(SCENARIOS.seed.tailyFee)`, `fmtExact(SCENARIOS.seed.homeFee)`, `of services only`, `Open the job` |
| `t-payout--kept` · (NEW) | state | `earningsTo('kept'); setFocus(state.appts[0].id)` | has `Deposit kept`, `fmtExact(SCENARIOS.lateCancel.tailorPaid)`, `No Taily fee`, `Scheduled` |

### System states (hosts; keys from SCREENS.md "System-wide patterns"; D-138…D-140)
The banner and re-auth sheet come from the router + `system.js` (A9, D4) — the hosts need no code for them. The push prompt
and the error toast need small host edits (below).
- **t-home** (`wire`): `if (state.sim.push === 'prompt') openPushPrompt({ title: 'Don’t miss a request', body: \`Requests
  expire after ${POLICY.REQUEST_EXPIRY_H} hours. Turn on notifications and we’ll tell you the moment one comes in.\` }, {
  onDone: () => go('t-home', { replace: true }) })`. "Not now" leaves the existing denied banner.
- **to-done**: its "Go to Home" sets `state.sim.push = 'prompt'` when it is `'default'` (first launch, D-139).
- **c-request** (`wire`): same with `{ title: \`Know when ${first} replies\`, body: \`${first} has ${POLICY.REQUEST_EXPIRY_H}
  hours to answer. Turn on notifications to see the reply the moment it lands, even before our text.\` }`. When `sim.push === 'denied'` and
  the request is pending, one `.t-small c-600` line under the countdown: "Notifications are off, so we’ll text
  you when Amara replies." (D-151) No code path sets `'prompt'` on the customer side (the M1–M4 journeys must not be interrupted, D-139).
- **c-pay**: map `res.error === 'server-error'` to the existing `generic` banner (copy: "Something went wrong on our side.
  Nothing was held. Try again.") and also `toast('Couldn’t send your request', { tone: 'error' })`; the Pay CTA stays enabled.

| key | screen | setup | click | expect |
|---|---|---|---|---|
| `sys-offline` | `c-job` | `sim.network = 'offline'` | — | has `offline`, `Retry`; sel `[data-sys="offline"]` |
| `sys-offline-tailor` | `t-home` | `driveTo('requested'); sim.network = 'offline'` | — | has `offline`, `Retry`, `New requests`; sel `[data-sys="offline"]` |
| `sys-session-expired` | `c-bookings` | `driveTo('confirmed'); sim.session = 'expired'` | — | has `Sign in again`, `(718) 555-0142`, `Verify`, `Sign out`; sel `[data-s="sys-reauth"]` |
| `sys-push-prompt` | `t-home` | `driveTo('requested'); sim.push = 'prompt'` | — | has `Turn on notifications`, `Not now`, `expire after 2 hours` (hours from `POLICY`) |
| `sys-push-prompt-customer` (NEW) | `c-request` | `driveTo('requested'); sim.push = 'prompt'` | — | has `Know when Amara replies`, `Turn on notifications` |
| `sys-error-toast` | `c-pay` | `sim.server = 'error'` | `[data-act="pay"]` | has `Something went wrong`, `Nothing was held`; sel `.banner--error` |

**Acceptance (C4):** the figure on Earnings is the sum of the next Friday's payouts and its job rows add up to it; every
amount is after the Taily fee and says so; the fee appears in dollars on t-payout with what it was taken from; a failed payout
always shows the amount, the bank, the retry date and the fix; system banner never covers the heading (body padding grows);
re-auth cannot be dismissed but has Sign out; the push ask explains the benefit before asking and "Not now" is equal-weight
secondary; error pattern §B3 holds on c-pay.

---

## D. INTEGRATION (Integrator)

1. `app.js` `SCREEN_MODULES` M5 block: `'c-messages', 'c-account', 'c-addresses', 'c-cards', 'c-orders', 't-earnings',
   't-payout', 't-messages'`; `index.html` CSS links.
2. **System layer in `render()`** (D-138): after `el.innerHTML = entry.view(state)` → `const sys = systemBanner(state); if
   (sys) { el.insertAdjacentHTML('afterbegin', sys); } el.classList.toggle('has-sys-banner', !!sys);`; after `entry.wire?.(el)`
   → `wireSystem(el, id, { go: render })`. Skip both for `SYSTEM_EXEMPT` ids' re-auth only (the banner shows everywhere).
3. `SCREENS.md` + `js/inventory.js`: add the D-142 keys tagged **M5** (`c-thread--question` ·, `c-thread--attach` O,
   `t-thread--question` ·, `t-thread--pending` ·, `c-messages--loading` ·, `c-account--sign-out` O, `c-addresses--add` O,
   `c-addresses--error` O, `c-cards--in-use` O, `c-cards--add` O, `t-earnings--loading` ·, `t-payout--kept` ·,
   `sys-push-prompt-customer` → `c-request`). **Fix `scripts/v5/lib/gen-inventory.mjs`** so the "System-wide patterns" table
   becomes states of their HOST screens (`{ key: 'sys-offline', m: 'M5', kind: 'state' }` under `c-job`, etc.) instead of the
   bogus `sys-offline` pseudo-screens with a `state.sim.network = 'offline'` key. Remove the M3-only key `t-thread--declined`
   and its baseline `ref/v5/t-thread--declined.png` (replaced by `t-thread--read-only`). `BUILT` += `'M5'`.
4. **`scripts/v5/journeys.mjs`** — add (owed since D-125, D-143; same reporter / `flip()` / `at()`; type with `page.fill`):
   - **J7 courier return, money identical both sides.** `flow('t-job--in-progress')` → `[data-act="mark-ready"]` →
     `[data-act="ready-ok"]` → t-job has `Waiting on Sarah` · flip → `[data-nav="bookings"]` → `.appt-row` → c-ready →
     `[data-act="return"][data-value="courier"]` → has `fmtExact(S.courierQuote.quote)`, `fmtExact(S.courierQuote.markup)`,
     `fmtExact(S.courierQuote.cents)`, `Pay ${fmtExact(S.courier.balance)}` → `[data-act="pay"]` → `[data-act="pay-ok"]` →
     c-booking has `Out for delivery`, `fmtExact(S.courierQuote.cents)` · flip → `.appt-row` → t-job has `Courier booked`,
     the same three courier amounts, `Not taken from your payout`, `fmtExact(S.seed.payout)`.
   - **J8 completed → review visible on c-tailor.** `flow('t-job--returning-pickup')` → `[data-act="complete"]` → t-job has
     `Job completed`, `fmtExact(S.seed.payout)` · flip → Bookings → `.appt-row` → c-complete → `[data-act="leave-review"]` →
     click `label` of `input[name="stars"][value="5"]` → `[data-act="post"]` → has `Thanks, Sarah` → `[data-act="see-profile"]`
     → c-tailor has `Sarah C.`, `${AMARA.rating.count + 1} reviews` · flip → `Taily.render('t-job')` → assert
     `[aria-label="5 out of 5 stars"]` exists (aria, not innerText).
   - **J9 one thread from question to booking, masked both sides.** `flow('c-tailor')` → `[data-act="ask"]` → `page.fill(
     '#composer-input', CHAT.ask)` → `[data-act="send"]` → c-thread has `Can you take in a jacket`, `No booking yet` · flip →
     `[data-nav="messages"]` → t-messages has `Sarah C.`, `1 unread` → `.thread-row` → t-thread has the question; fill
     `CHAT.reply` → send · flip → `[data-nav="messages"]` → c-messages has `Amara Reyes`, `book a visit` → `.thread-row` →
     `[data-act="open-profile"]` → c-tailor → `[data-act="pick-time"]` → c-book `[data-act="slot-next"]` → c-pay
     `[data-act="pay"]` → c-request → `[data-act="message"]` → c-thread has `Can you take in a jacket`, `book a visit`, `You sent
     a request`, `2h left` → fill `CHAT.phoneCustomer` → c-thread shows the hint `hidden when you send` → send → has `phone
     hidden`, `stay private on Taily`; not `555-0142` · flip → `[data-nav="messages"]` → `.thread-row` → t-thread has `phone
     hidden`, `Sarah sent a request`, `New request`; not `555-0142`; `.chat-msg--them .chat-msg__note` count 0 → `[data-act=
     "open-appt"]` → t-request `[data-act="accept"]` → `[data-nav="messages"]` → `.thread-row` → t-thread has `You accepted`,
     `Sarah Chen` · flip → `[data-nav="messages"]` → `.thread-row` → c-thread has `Amara accepted`, `Confirmed`.
5. `docs/v5/CONTEXT.md`: M5 additions (sim knobs, thread selectors, `markThreadRead`, `settlePayouts`, `payoutsView`,
   `payoutDetail`, `threadCustomerName`, account fns, `payoutDay`, `PAYOUT_DAYS`, `CHAT`, `askAmara`, `completeJob`,
   `earningsTo`, the new components and `system.js`).
6. `npm run check -- --accept-new`, then `npm run check` green. Intended re-accepts: `c-thread--new` and `t-thread` (context
   row / header), `sys-components` (gallery). Nothing else should move: list any other diff and treat it as a bug.

---

## E. Acceptance checklist (every M5 screen; reviewers use this)

- **One thread, both sides:** flip persona on every thread state — same messages, same order, same day dividers, same
  masked tokens; only "You" / names and system-line wording change (reader's point of view). Context row on both.
- **Privacy:** no typed phone or email reaches the other side; the sender sees the note under their bubble; the live hint shows
  before sending; Amara never sees "Chen" or the street before an accept.
- **Every state has a way forward:** read-only → Find another tailor + Start a different job; failed send → Retry; offline →
  Retry; session expired → Verify or Sign out; failed payout → Fix bank details; empty lists → a CTA.
- **Money honesty:** Earnings and Payout print dollars only, after the Taily fee, with the fee in dollars on the payout and the
  payout date + bank; the courier is never Amara's money; Past orders say Paid / Refunded / Kept in words; one precision per
  screen (`fmtColumn`), `data-money` on every amount, no `%`.
- **Safe removes:** address remove = Undo toast; card remove = in-sheet confirm (danger) that names what moves; the only card
  of an open booking can't be removed.
- One focal element; one filled CTA per state; ≥ 44 px targets (Retry, ✕ on attachments, Make default / Remove, thread rows,
  context row, banner actions); visible labels; errors under fields; busy verbs; skeletons on first list load; reduced motion.
