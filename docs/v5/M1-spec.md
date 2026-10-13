# M1 — Customer booking spec (build instructions)

Oct 13, 2026 · spec writer / design director (Opus) · branch `V5`. Builders read **§0 + their cluster** + `docs/v5/CONTEXT.md`.
Calls this spec had to make are D-33…D-46 in `DECISIONS.md` and are cited inline. Money copy is always dollar amounts
from `js/money.js` (`fmt` lists · `fmtExact` breakdowns), never percentages, never a typed amount.

**Order:** (1) Component builder §A (serial; also writes the two tiny shared modules and the POLICY keys) → (2) four screen
builders, clusters §C1–§C4, in parallel → (3) Integrator §D.

**M1 done when:** `npm run check` green; every M1 state key in `js/inventory.js` has a FLOWS entry; the full path
`c-welcome → c-phone → c-code → c-name → c-job → c-where → c-tailors → c-tailor → c-book → c-pay → c-request` can be clicked
through by hand in the browser with normal latency.

---

## 0. Direction (applies to every M1 screen)

**Who:** Sarah, 30s, Williamsburg, on her phone between things — a suit that needs fixing before an event. She has never met
these tailors; she wants to know *what it costs, when, and that it’s safe* before she commits a cent.
**Feel:** a calm tailor’s counter — paper, chalk, pins. Unhurried but quick. Every screen asks one question.

- **One focal element per screen** (named per screen below). It wins by size or the ink fill; everything else is demoted to
  neutral-600 text or secondary (outline) buttons. Never two filled CTAs on one screen.
- **Type** (only these): screen title `.t-title` 28 serif · section heads `.t-h2` 24 serif · body `.t-body` 16 Hanken ·
  captions `.t-small` 12 · caps labels `.t-caps` 12. Hierarchy by weight + colour first (600 ink / 500 neutral-700 / 400
  neutral-600), size second. Money values use `font-variant-numeric: tabular-nums`.
- **Layout:** 390 wide, `--neutral-50` page, side padding 20. Signed-in screens: `chrome('home')` (status bar + top nav),
  `.body` padding-top 128. Sign-in screens (`c-welcome/phone/code/name`): `statusBar()` only, no top nav, body padding-top
  `calc(44px + var(--space-32))`. Section rhythm: 8 inside a group, 24 between groups, 32 before a section head.
- **The booking path** `c-job → c-where → c-tailors → c-tailor → c-book/c-pay` shows `bookingSteps(n)` (§A1) as the first
  thing in `.body`, then the heading row. The primary action sits in `actionBar` (§A2), always the same place, so Sarah’s
  thumb never hunts for "next". (D-37)
- **Forms:** visible labels (never placeholder-only), errors under the field they belong to (`field({ error })` /
  `chipGroup({ error })`), shown **after** the user presses the CTA — never while typing — except stale data that is
  already wrong on arrival (a past need-by). Focus moves to the first invalid field on a failed submit.
- **Async:** every action that "talks to the server" goes through `withLatency` (§A5): the CTA turns busy
  (`cta({ busy })`, inputs disabled, `aria-busy`), then completes. `?test=1` → instant; `sim.latency = 'hold'` → stays busy
  (the Test-flows loading / sending / processing states).
- **Money honesty:** the customer always sees the exact dollar amount that will move, the word for what happens to it
  ("held", "charged", "released") and when. Estimates say they are estimates; the final price is confirmed at the fitting.
- **Shared booking draft** (D-36): `state.ui.booking = { tailorId, slot, cardId }` — set by c-tailors (tailorId), c-book
  (slot), c-pay (cardId); each reader defaults when missing (`state.tailors[0].id`, the first open slot, the default card),
  so every Test-flows entry works without setting it. Cleared by c-pay after `requestBooking` succeeds.
- **Typed drafts** (D-34): text a user has typed but not submitted lives in `state.ui['<screen id>']` (e.g.
  `state.ui['c-phone'] = { phone }`). Flow setups may seed these to stand in for typing; they never seed model data.
- **Re-render** a screen in place with `go(ID)` (same id → no history push). Leaving the booking for the request uses
  `go('c-request', { fresh: true })` so Back can’t return to a paid form.
- Apostrophes in copy are typographic (’). FLOWS `expect` strings below avoid apostrophes on purpose.

---

## A. COMPONENTS + shared helpers (Component builder — serial, before the screens)

Tokens only, `css/components-v5.css`, every target ≥ 44 px, add each new piece to `sys-components` (gallery block per state)
and accept its baseline. Do not touch the existing signatures except as listed.

### A1. `stepper({ …, variant: 'default' | 'compact' })` + `bookingSteps(current)` — NEW variant + helper

- `export const BOOKING_STEPS = ['What needs work', 'Where and when', 'Tailors near you', 'Tailor', 'Book'];`
- `bookingSteps(current)` (0-based) = `stepper({ steps: BOOKING_STEPS, current, done: [0…current-1], variant: 'compact' })`.
- **compact** markup: `<nav class="stepper stepper--compact" aria-label="Booking progress">` → an `<ol class="stepper__bar">` of 5
  `<li class="stepper__seg stepper__seg--done|current|todo">` each holding an `.sr-only` label (`aria-current="step"` on
  current) + a right-aligned `<span class="stepper__count t-small c-600 w-600">2 of 5</span>`. One row, 16 tall, segments
  3 px high, radius full, gap `--space-4`; done `--ink`, current `--accent-ink`, todo `--neutral-200`. Not interactive (no
  target lint). Margin-bottom `--space-16` before the heading row.
- States: step 1…5 (gallery shows 1, 3, 5).

### A2. `actionBar({ ctaLabel, ctaAct, disabled = false, busy = false, busyLabel = '', lead = '', note = '', secondaryLabel = '', secondaryAct = '' })` — NEW

The bottom action area of every booking step and the sign-in forms. `position: sticky; bottom: 0` as the last child of `.body`,
full bleed (negative side margins = the body padding are NOT allowed — render it outside `<main class="body">` as a sibling
`<div class="action-bar">` inside `#screen`, width 390), `--white` fill, `box-shadow: inset 0 1px 0 var(--neutral-200)`,
padding `--space-12` 20 `--space-20`.
- `lead` (optional): one line above the button, left `t-small c-600` text + right money (`data-money`), e.g.
  `Est. $160 · 2 items` — screens pass the HTML, money via `fmt`.
- the CTA: `cta(ctaLabel, { disabled, busy, busyLabel, attrs: 'data-act="<ctaAct>"' })`, full width.
- `secondaryLabel` → a full-width `cta(…, { variant: 'secondary' })` under it (gap 8).
- `note` → `t-small c-600` centred under the buttons (e.g. the disabled reason). When `disabled`, the note is linked with
  `aria-describedby`.
- The screen adds `.body--with-bar` (padding-bottom `calc(var(--space-40) * 3)`) so content never hides under the bar.
- States: default · disabled + note · busy · with lead · with secondary.

### A3. `cta(label, { …, busy = false, busyLabel = '' })` — extend + fix

- **Fix:** `disabled: true` must also emit `disabled aria-disabled="true"` (today it only adds the class). FLOWS select on
  `[aria-disabled="true"]`.
- **busy:** label becomes `busyLabel || label`, a 16 px spinner (border ring, `--white` on ink / `--ink` on secondary) leads the
  label, `aria-busy="true" disabled`. Under `prefers-reduced-motion` and `html.is-test` the spinner does not rotate.

### A4. `optionRow({ name, value, title, sub = '', checked = false, lead = '', act = 'option' })` — NEW

A single-select row for sheets (c-tailors sort, c-pay payment method). `<button type="button" role="radio" aria-checked
data-act="<act>" data-name data-value>`: min-height 56, `lead` (an icon / card badge HTML) 32 wide, title `t-body w-600`,
`sub` `t-small c-600`, a 24 px check ring right (filled `--ink` with ✓ when checked). Rows separated by a hairline
(`inset 0 -1px 0 var(--neutral-100)`); the group is `role="radiogroup"` on the screen’s wrapper.
States: unchecked · checked · with sub · with lead.

### A5. `js/sim.js` — NEW, DOM-free (timers only)

```js
import { state } from './state.js';
export const LATENCY_MS = 700;
/** Run `done` after the simulated network delay: 'instant' → now (synchronously), 'normal' → LATENCY_MS, 'hold' → never.
    Returns cancel(). Screens set their busy flag BEFORE calling. */
export function withLatency(done) { … }
```

### A6. `js/account.js` — NEW, DOM-free (sign-in model, D-33)

Mutates only `state.session.customer` and `state.customer`; imports `state, now` from `state.js`, `POLICY` from
`money-config.js`. Every fn returns `{ ok, … } | { ok: false, error }`.

| fn | behaviour |
|---|---|
| `phoneDigits(raw)` | the 10 national digits (strips +1, spaces, punctuation) |
| `formatPhone(raw)` | `(718) 555-0142` (partial input formats progressively: `(718) 55`) |
| `validatePhone(raw)` | `{ ok }` or `error: 'phone-invalid'` (not 10 digits, or area code starting 0/1) |
| `signOut()` | `session.customer = { signedIn: false, pending: null }` |
| `sendCode(raw)` | validates; `session.customer.pending = { phone: formatPhone(raw), sentAt: now(), isNew }` where `isNew = phoneDigits(raw) !== phoneDigits(state.customer.phone)` |
| `codeStatus()` | `{ phone, isNew, msToResend, expired }` — `msToResend = max(0, sentAt + POLICY.CODE_RESEND_S·1000 − now())`, `expired = now() ≥ sentAt + POLICY.CODE_TTL_MIN·60000`; `null` without a pending code |
| `resendCode()` | `error: 'too-soon'` while `msToResend > 0`; else new `sentAt` |
| `verifyCode(code)` | `'no-code'` · `'code-format'` (not 6 digits) · `'code-expired'` · `'code-wrong'` (exactly `000000`, the demo’s wrong code) · else ok: existing → `signedIn: true`, returns `{ ok, isNew: false }`; new → returns `{ ok, isNew: true }` (signed in after `saveName`) |
| `saveName({ first, last })` | errors `{ first: 'first-required', last: 'last-required' }` (trimmed empty); ok → `state.customer.first/last/initials/phone` set from the pending phone, `signedIn: true`, `pending: null` |
| `signInWith(provider)` | `'apple' | 'google'` → signs in as the seed customer (`signedIn: true`) |
| `addCard({ number, exp, cvc, zip })` | errors per field: `number` `card-number` (not 15–16 digits), `exp` `card-exp` (not `MM/YY` or before Oct 2026 by the demo clock), `cvc` `card-cvc` (not 3–4 digits), `zip` `card-zip` (not 5 digits); ok → pushes `{ id: 'card-<last4>', brand: number starts 4 ? 'Visa' : 5 ? 'Mastercard' : 3 ? 'Amex' : 'Card', last4, exp, default: false }` to `state.customer.cards`, returns `{ ok, card }`, and clears a simulated decline (`state.sim.card = 'ok'`, D-40) |
| `useOtherMethod()` | clears a simulated decline when the customer switches to a method other than the declined one (D-40) |

### A7. `customerBreakdown(q, { depositState: 'to-hold' })` — one new deposit word

Add `'to-hold': 'Held today'` to `DEPOSIT_STATUS` (D-38). c-pay passes it; nothing else changes.

### A8. `js/money-config.js` — two POLICY keys (spec-approved edit)

`CODE_TTL_MIN: 10` (an SMS code works for 10 min) and `CODE_RESEND_S: 30` (resend unlocks after 30 s). Comment each.

---

## B. Shared copy + data per screen (all clusters read this table)

| need | source |
|---|---|
| estimate on a row / profile / pay | `tailorsFor(job).rows[i].quote` (list) · `estimateNext(tailor, job)` (profile) · `estimate(tailor, job, slot)` (c-book note, c-pay) |
| open slots | `openSlots(tailorId, job.visitType, { until: job.needBy })`; next after need-by: `nextOpening(tailorId, visitType)` (no `until`) |
| eligibility / declined | `eligible(tailor, job)` (`reason === 'declined'`) and `tailorsFor(job).rows[i].declined` |
| deposit hold window | `POLICY.REQUEST_EXPIRY_H` ("2 hours") · cancel window `POLICY.CANCEL_WINDOW_H` ("24 hours") |
| visit labels | `VISIT_LABEL.customer[job.visitType]`, length `VISIT_MINUTES[visitType]` ("60-minute visit") |
| dates | `fmtWhen` "Thu, Oct 15 · 5:00 PM", `fmtDay` "Fri, Oct 23", `fmtTime` "12:00 PM" |
| fixtures | `import { SCENARIOS } from './money-scenarios.js'; import { fmt, fmtExact } from '../money.js'; import * as A from '../account.js';` at the top of `js/fixtures/m1.js` (the first builder to need a line adds it; others keep it) |

---

## C1. CLUSTER "Account + Ask" — `c-welcome`, `c-phone`, `c-code`, `c-name`, `c-thread` (M1 stub)

### c-welcome — entry

- **Purpose:** start signing in; phone first, Apple / Google as quieter options.
- **Focal:** the ink `Continue with phone` CTA.
- **Layout (top→bottom):** statusBar · 64 px gap · the Taily logo (the nav wordmark, 74×34, ink) · `.t-display` (32 serif)
  "A tailor near you, booked in five steps." · `.t-body c-600` "See each tailor’s own prices, pick a time that suits you, and
  pay only a small deposit to send a request." · 40 gap · three trust lines (`metaRow('✓', …)`, t-small c-700): "Every tailor
  is ID verified and background checked" · "Prices up front, from the tailor’s own list" · "Your deposit is held, not charged,
  until the tailor accepts" · flex spacer · `cta('Continue with phone', { attrs: 'data-act="phone"' })` · 12 gap · an "or"
  divider (hairline both sides, t-small c-500) · `cta('Continue with Apple', { variant: 'secondary', attrs: 'data-act="apple"' })`
  · 8 · `cta('Continue with Google', { variant: 'secondary', attrs: 'data-act="google"' })` · 16 · legal t-small c-600:
  "By continuing you agree to Taily’s Terms and Privacy Policy." ("Terms" / "Privacy Policy" are in-text links,
  `data-hit="inline"`, toast "Not built yet").
- **Wire:** phone → `go('c-phone')`; apple/google → `A.signInWith(p)` (through `withLatency`, the pressed button busy
  "Signing in…") → `go('c-job', { fresh: true })`.
- **FLOWS** (group `M1 · Sign in`):
  - `c-welcome` · setup `A.signOut()` · expect `{ has: ['Continue with phone', 'Continue with Apple', 'Continue with Google', 'held, not charged'] }`
- **Accept:** one filled CTA; Apple/Google are outline; all three ≥ 48 tall; no top nav.

### c-phone — US phone number

- **Focal:** the phone field.
- **Layout:** statusBar · `headingRow('<h1 class="t-title">Your phone number</h1>')` · t-body c-600 "We’ll text you a code to
  sign in. No passwords." · 24 · `field({ id: 'phone', label: 'Mobile number', prefix: '+1', type: 'tel', inputmode: 'tel',
  autocomplete: 'tel-national', placeholder: '(718) 555-0142', value: formatPhone(draft), helper: 'US numbers only. Message and
  data rates may apply.', error })` · `actionBar({ ctaLabel: 'Send code', ctaAct: 'send-code', busy, busyLabel: 'Sending code…' })`.
  Autofocus the input on arrival (not in `?test=1`).
- **States:** `c-phone` default (empty field, CTA enabled — validation happens on press) · `c-phone--invalid`: error
  "Enter a 10-digit US number, like (718) 555-0142." under the field, focus returns to it · `c-phone--sending`: CTA busy, field
  disabled.
- **Wire:** input → `state.ui['c-phone'].phone = value` and reformat in place (`formatPhone`), clear the error on edit. Send →
  `A.validatePhone`; error → re-render with `error`; ok → busy → `withLatency(() => { A.sendCode(phone); go('c-code'); })`.
- **FLOWS:**
  - `c-phone` · setup `A.signOut()` · expect `{ has: ['Your phone number', 'Mobile number', '+1', 'Send code'] }`
  - `c-phone--invalid` · setup `A.signOut(); S.state.ui['c-phone'] = { phone: '718555' }` · click `['[data-act="send-code"]']` · expect `{ has: 'Enter a 10-digit US number', sel: '#phone[aria-invalid="true"]' }`
  - `c-phone--sending` · setup `A.signOut(); S.state.ui['c-phone'] = { phone: '7185550142' }; S.sim.latency = 'hold'` · click `['[data-act="send-code"]']` · expect `{ has: 'Sending code', sel: '[data-act="send-code"][aria-busy="true"]' }`
- **Nav:** Back → c-welcome. Out → c-code.

### c-code — 6-digit SMS code

- **Focal:** the code input (large: 24 Hanken 600, letter-spacing `--space-8`, centred).
- **Layout:** statusBar · `headingRow('<h1 class="t-title">Enter the code</h1>')` · t-body c-600 "We texted a 6-digit code to
  **(718) 555-0142**." + in-text link "Change number" (`data-act="back"`, `data-hit="inline"`) · 24 ·
  `codeInput({ id: 'code', value, error })` · 16 · resend row: while `msToResend > 0` t-small c-600 "Resend code in 0:30"
  (m:ss from `msToResend`); after, a 44 px text button "Resend code" (`data-act="resend"`, `--accent-ink` 600) ·
  `actionBar({ ctaLabel: 'Verify', ctaAct: 'verify', busy, busyLabel: 'Checking…' })`. Typing the 6th digit submits
  automatically (same path as Verify).
- **States:** `c-code` (resend countdown 0:30 — the clock is frozen, D-09) · `c-code--wrong`: error "That code doesn’t match.
  Check your texts and try again." (input keeps the digits, selected) · `c-code--expired` (shown on arrival when
  `codeStatus().expired`): error "This code expired. Send a new one." and Resend enabled, Verify disabled with the bar note "Send a new code to continue." · `c-code--resend`:
  "Resend code" enabled; pressing it → `A.resendCode()`, toast "New code sent", countdown back to 0:30.
- **Wire:** verify → busy → `withLatency(() => { r = A.verifyCode(code); … })`: `code-wrong` / `code-format` ("Enter all 6
  digits.") / `code-expired` → re-render with the error; ok + `isNew` → `go('c-name')`; ok existing → `go('c-job', { fresh: true })`.
- **FLOWS:**
  - `c-code` · setup `A.signOut(); A.sendCode('(718) 555-0142')` · expect `{ has: ['Enter the code', '(718) 555-0142', 'Resend code in 0:30'] }`
  - `c-code--wrong` · setup `…sendCode…; S.state.ui['c-code'] = { code: '000000' }` · click `['[data-act="verify"]']` · expect `{ has: 'Check your texts', sel: '#code[aria-invalid="true"]' }`
  - `c-code--expired` · setup `…sendCode…; S.advanceClock(11)` · expect `{ has: 'This code expired', sel: '[data-act="resend"]:not([disabled])' }`
  - `c-code--resend` · setup `…sendCode…; S.advanceClock(1)` · expect `{ has: 'Resend code', not: 'Resend code in', sel: '[data-act="resend"]:not([disabled])' }`
- **Nav:** Back / Change number → c-phone. Out → c-name (new) or c-job (existing).

### c-name — first + last name (new accounts only)

- **Focal:** the First name field.
- **Layout:** statusBar · `headingRow('<h1 class="t-title">What should we call you?</h1>')` · t-body c-600 "Your tailor sees
  your first name and last initial." · 24 · `field({ id: 'first', label: 'First name', autocomplete: 'given-name', error })` · 16
  · `field({ id: 'last', label: 'Last name', autocomplete: 'family-name', error })` · `actionBar({ ctaLabel: 'Continue',
  ctaAct: 'save-name', busy, busyLabel: 'Saving…' })`.
- **States:** `c-name` · `c-name--error`: "Enter your first name." / "Enter your last name." under each empty field, focus on the
  first invalid one.
- **Wire:** inputs → `state.ui['c-name']`; save → `A.saveName` → errors re-render; ok → busy → `go('c-job', { fresh: true })`.
- **FLOWS:**
  - `c-name` · setup `A.signOut(); A.sendCode('(917) 555-0186'); A.verifyCode('123456')` · expect `{ has: ['What should we call you', 'First name', 'Last name'] }`
  - `c-name--error` · same setup · click `['[data-act="save-name"]']` · expect `{ has: ['Enter your first name', 'Enter your last name'] }`
- **Nav:** Back → c-code. Out → c-job.

### c-thread (M1 stub, key `c-thread--new`) — "Ask a question"

- **Purpose:** ask the tailor anything before booking, no commitment.
- **Focal:** the composer (pinned bottom).
- **Layout:** `chrome('messages')` · heading row: back + avatar sm + "Amara Reyes" (t-body w-600) over "Reyes Tailoring ·
  Williamsburg" (t-small c-600) · `privacyNote()` · empty state centred in the remaining space: `.t-h2` "Ask Amara a question"
  + t-body c-600 "No booking needed. Ask about a fabric, a fit, or timing — the conversation stays here if you book." · three
  suggestion chips (`chipGroup` chips, single, `name: 'ask'`): "Can you work with silk?" · "Can you take in a jacket at the
  shoulders?" · "How long does a hem take?" — tapping one fills the composer (does not send) · `composer({ value: draft,
  placeholder: 'Message Amara' })` pinned bottom (sticky, white, inset top hairline).
- **Data:** tailor = `tailorById(state.ui.booking?.tailorId ?? state.tailors[0].id)`; messages = `threadFor(id).messages`. When
  messages exist, render them with `chatBubble` (`from === 'customer'` → `me`; system messages as a centred t-small c-500 line)
  and hide the empty state. Read-only (`threadReadOnly`) → `readOnlyBanner({ text: 'Amara can’t take this job, so this chat is
  closed.' })` instead of the composer (full M5 rules later).
- **Wire:** `wireComposer(root, text => T.sendMessage(id, 'customer', { text }))` → re-render; on `{ masked: true }` the
  bubble shows the privacy note (component does it).
- **FLOWS** (group `M1 · Booking`):
  - `c-thread--new` · no setup · expect `{ has: ['Ask Amara a question', 'Phone numbers and emails stay private on Taily.'], sel: '.composer' }`
- **Nav:** in from c-tailor "Ask a question", c-book empty state, c-request "Message Amara". Back → previous.

---

## C2. CLUSTER "The job" — `c-job`, `c-where`

### c-job — C1 What needs work (Home tab)

- **Purpose:** say what needs tailoring: garments, and per garment what to do. No prices yet (they’re per tailor, D-45).
- **Focal:** the garment grid while empty; once items exist, the "Your items" list.
- **Layout:** `chrome('home')` · `bookingSteps(0)` · `<h1 class="t-title">What needs work?</h1>` (no Back — it’s the tab root)
  · t-body c-600 "Tap a garment to add it. You’ll choose what to do with each one." · 16 · grid 3×3 of
  `garmentTile(type, { qty, attrs: 'data-act="add-garment" data-type="…"' })` for the 9 `GARMENT_TYPES` (qty = count of that
  type in the job; the tile’s + zone adds, − removes the most recent of that type) — grid gets `data-max="true"` at the cap ·
  helper under the grid t-small c-600: empty "Tap a garment to add it." · max "You can add up to 10 items per visit."
  (`MAX_ITEMS`) · 32 · `.t-h2` "Your items" + t-small c-600 right "2 items" (`itemsLabel`) · one **item card** per garment
  (white, `--radius-lg`, 16 padding, gap 12): row 1 garment icon 40 + type (t-body w-600) + remove ✕ button (44, `aria-label=
  "Remove Suit Pant"`, `data-act="remove-garment" data-id`); row 2 the services as text t-body c-700 joined " · " ("Shorten
  sleeves · Take in jacket sides") or, with none, `--accent-ink` "Choose what needs doing"; the whole row is a 44 px button
  `data-act="pick-services" data-id` with a chevron; row 3 photos: existing `photoTile('photo')` thumbs + an add button wrapping
  `photoTile('add')` (`data-act="add-photo" data-id`, `aria-label="Add a photo of the Suit Pant"`) + caption t-small c-600
  "Photos help the tailor quote (optional)" · error (`[data-error="service"]`, `field__msg--error`) under the services row:
  "Choose at least one service." · `actionBar({ ctaLabel: 'Next: where and when', ctaAct: 'next', disabled: !garments.length,
  note: garments.length ? '' : 'Add at least one garment to continue.' })`.
- **Overlays:**
  - **services** (`sheetOverlay`, header "Suit Pant — what needs doing?"): t-small c-600 "Pick all that apply. Each tailor
    prices these on their profile." · one `checkRow` per `servicesForType(type)` (label = `SERVICES[id].label`, checked when in
    `g.services`) · sticky `cta('Done', data-act="services-done")` → `T.setServices(g.id, ids)` → close → re-render. Zero
    ticked is allowed here (the error shows at Next). No prices anywhere in the sheet.
  - **photo** (`sheetOverlay`, header "Add a photo"): two `listRow`s "Take photo" / "Choose from library" (each 56 tall) +
    secondary `cta('Cancel')`. Either → `T.setJob({ garments: copy with that garment’s photos + 1 })` (max 3 per garment,
    screen constant, D-42) → toast "Photo added" → re-render.
- **Wire:** tiles → `T.addGarment(type)` (error `max-items` → no-op, the grid is already disabled) / `T.removeGarment(id)`;
  next → `T.validateJob(job, 'what')`: `no-service:<gid>` → show the error on those cards, scroll the first into view;
  ok → `go('c-where')`.
- **FLOWS** (group `M1 · Booking`):
  - `c-job--empty` · setup `S.T.newJob()` · expect `{ has: ['What needs work', 'Tap a garment to add it'], sel: '[data-act="next"][aria-disabled="true"]' }`
  - `c-job` · no setup · expect `{ has: ['Suit Pant', 'Suit Jacket', 'Hem pants', 'Shorten sleeves · Take in jacket sides', '2 items', '1 of 5'] }`
  - `c-job--max` · setup `for (let i = 0; i < 8; i += 1) { const r = S.T.addGarment('Pants / Jeans'); S.T.setServices(r.garment.id, ['hem-pants']); }` · expect `{ has: 'You can add up to 10 items per visit', sel: '[data-max="true"]' }`
  - `c-job--no-service` · setup `S.T.addGarment('Skirt')` · click `['[data-act="next"]']` · expect `{ has: 'Choose at least one service', sel: '[data-error="service"]' }`
  - `c-job--services` · click `['[data-act="pick-services"][data-id="g1"]']` · expect `{ has: ['Suit Pant', 'Hem pants', 'Taper legs', 'Replace zipper'], not: '$' }`
  - `c-job--photo` · click `['[data-act="add-photo"][data-id="g1"]']` · expect `{ has: ['Add a photo', 'Take photo', 'Choose from library'] }`
- **Accept:** CTA disabled with a visible reason when empty; the ✕ and + / − never overlap; services sheet shows no money.

### c-where — C2 Where and when

- **Purpose:** visit type, where, and the need-by date — the three filters for the list.
- **Focal:** the visit-type segmented control.
- **Layout:** `chrome('home')` · `bookingSteps(1)` · `headingRow('<h1 class="t-title">Where and when</h1>')` · 24 ·
  `chipGroup({ name: 'visit', label: 'Visit', variant: 'segmented', value: job.visitType, options: [{ value: 'home', label:
  'At my place', caption: 'The tailor comes to you' }, { value: 'shop', label: 'At the shop', caption: 'You visit the tailor' }] })`
  · 24 ·
  - **home:** label t-small w-600 c-700 "Your address" · an address card button (white, `--radius-md`, inset hairline, min 56,
    `data-act="edit-address"`): "145 N 7th St, 2R" (t-body w-600) / "Brooklyn, NY 11211" (t-small c-600) / "Change"
    (`--accent-ink`). With no street: "Add your address" in `--accent-ink`. Error under it: "Add your street address so the
    tailor can find you." Caption t-small c-600: "Only your neighborhood is shared until a tailor accepts."
  - **shop:** `field({ id: 'zip', label: 'Your ZIP code', inputmode: 'numeric', maxlength: 5, autocomplete: 'postal-code',
    value: job.zip, helper: 'We’ll show shops within 5 miles.' (SHOP_RADIUS_MI), error: 'Enter a 5-digit ZIP code.' })`.
  · 24 · label "Need it by" · a date row button (`data-act="edit-needby"`, min 56): `fmtDay(job.needBy)` t-body w-600 +
  "Change" · error under it "That date has passed. Pick a date from tomorrow on." · rush caption (warning tone, t-small w-600
  `--warning`, ⚑ glyph): "Rush fees may apply for this date. You’ll see them on each tailor before you book." — shown when
  `tailorsFor(job).rows.some(r => r.quote.rush > 0)` (D-39) · `actionBar({ ctaLabel: 'See tailors', ctaAct: 'next' })`.
- **Overlays:**
  - **address sheet** (header "Your address"): `field` Street address (`street`, autocomplete `address-line1`) · Apt, suite or
    unit (optional) (`unit`, `address-line2`) · City (`city`) · ZIP code (`zip`, numeric, 5) · `cta('Save address',
    data-act="save-address")`. Save validates street non-empty ("Enter your street address.") and zip 5 digits ("Enter a
    5-digit ZIP code.") inside the sheet; ok → `T.setJob({ address: { street, unit, city, state: 'NY', zip }, zip })` → close →
    re-render.
  - **need-by sheet:** `scheduler({ title: 'Need it by', columns: [dateColumn(dayRows(tomorrow, 60), selectedIndex)],
    cta: 'Done', ctaAct: 'needby-done', inline: false })` in a `sheetOverlay` with t-small c-600 above: "Pick the day you need
    it back. The visit is at least a day before." Done → `readScheduler` → `T.setJob({ needBy: isoDay(date) })` → close →
    re-render (the rush caption updates). `tomorrow = addDays(strip(new Date(now())), 1)`.
- **Wire:** segmented `chip` event → `T.setJob({ visitType })` → re-render. Zip input → `T.setJob({ zip })` on `change`.
  Next → `T.validateJob(job, 'where')`; errors render next to their fields (zip-invalid, address-required, needby-past,
  needby-required → "Pick a date."); ok → `go('c-tailors')`. A flag `state.ui['c-where'].openNeedBy` (set by c-tailors /
  c-book empty states) opens the need-by sheet on arrival, then clears.
- **FLOWS:**
  - `c-where` · no setup · expect `{ has: ['Where and when', 'At my place', '145 N 7th St, 2R', 'Fri, Oct 23', '2 of 5'] }`
  - `c-where--shop` · setup `S.T.setJob({ visitType: 'shop' })` · expect `{ has: ['Your ZIP code', 'within 5 miles'], not: '145 N 7th St' }`
  - `c-where--zip-invalid` · setup `S.T.setJob({ visitType: 'shop', zip: '1121' })` · click `['[data-act="next"]']` · expect `{ has: 'Enter a 5-digit ZIP code', sel: '#zip[aria-invalid="true"]' }`
  - `c-where--address-required` · setup `S.T.setJob({ address: null })` · click `['[data-act="next"]']` · expect `{ has: ['Add your address', 'Add your street address'] }`
  - `c-where--needby-past` · setup `S.T.setJob({ needBy: '2026-10-12' })` · expect `{ has: 'That date has passed' }`
  - `c-where--rush` · setup `S.T.setJob({ needBy: '2026-10-16' })` · expect `{ has: ['Fri, Oct 16', 'Rush fees may apply'] }`
  - `c-where--address-sheet` · click `['[data-act="edit-address"]']` · expect `{ has: ['Street address', 'Apt, suite or unit', 'Save address'] }`
  - `c-where--needby-sheet` · click `['[data-act="edit-needby"]']` · expect `{ has: 'Need it by', sel: '.screen-sheet [data-scheduler]' }`
- **Nav:** Back → c-job. Out → c-tailors.

---

## C3. CLUSTER "Choose a tailor" — `c-tailors`, `c-tailor`

### c-tailors — C3 Tailors near you

- **Purpose:** compare matching tailors by estimate, distance and next opening.
- **Focal:** the tailor row’s estimate.
- **Layout:** `chrome('home')` · `bookingSteps(2)` · `headingRow('<h1 class="t-title">Tailors near you</h1>')` · filter
  summary: a horizontal row of three `filterPill`s, each `data-act="edit-where"` (→ back to c-where; a pencil glyph, not a chevron, since it opens a screen — `filterPill({ edit: true })`; captions t-small c-600): caption "Visit" value
  "At my place" · caption "ZIP" value "11211" · caption "Need by" value "Fri, Oct 23" · 16 · results bar: t-small c-600 left
  "1 tailor" (`itemsLabel(n, 'tailor')`) + right a 44 px text button "Sort: Recommended" (`data-act="sort"`) · 8 · rows:
  `tailorRow({ id, name, initials, photo, verified, rating, distanceMi, quote, nextOpening, visitType, declined })` per
  `tailorsFor(job).rows` (R1 polish: the estimate is the focal element — "Est. $160" at 24 / 600 tabular, right-aligned on the name row;
  one "✓ Verified" chip replaces the badge list, which stays on the profile; then rating · distance, a hairline, the home-visit /
  rush captions and "Next opening …") · 16 · footnote t-small c-600: "Estimates come from each tailor’s own price list. Your tailor confirms
  the price at the fitting." No actionBar (the rows are the action).
- **States:**
  - `c-tailors--loading`: skeleton `skeleton({ kind: 'tailor-row', count: 3 })` in place of the rows; filters + title stay.
    View shows it while `state.ui['c-tailors']?.loadedFor !== filterKey` (`filterKey` = visitType|zip|needBy); wire calls
    `withLatency(() => { ui.loadedFor = filterKey; go(ID) })` (instant under test; hold keeps the skeleton). Changing a filter
    (try-shop / try-home / back from c-where with new values) therefore shows the skeleton again.
  - `c-tailors` default: Amara’s row ("Est. $160", "Includes $35 home-visit fee", "★ 4.9 (37) · 0.6 mi", "Next opening Thu,
    Oct 15 · 5:00 PM").
  - `c-tailors--rush`: the row adds "+ $40 rush fee" (component) and the estimate includes it.
  - `c-tailors--empty-zip` (`data-empty="zip"` on the empty wrapper): `emptyState({ title: 'No tailors visit 11201 yet', body:
    'Taily is growing across Brooklyn. Shops within 5 miles of you may still fit you in.', ctaLabel: 'Try a visit at the shop',
    ctaAct: 'try-shop', secondaryLabel: 'Change address', secondaryAct: 'edit-where' })`. try-shop → `T.setJob({ visitType:
    'shop' })` → re-render (shows loading then results).
  - `c-tailors--empty-shop` (`data-empty="shop"`): title "No shops near 11211 right now", body "Tailors near you are doing home
    visits instead.", CTA "Switch to At my place" (`try-home` → `setJob({ visitType: 'home' })`), secondary "Change ZIP"
    (`edit-where`).
  - `c-tailors--nothing-open` (`data-empty="nothing-open"`): title `Nothing open before ${fmtDay(needBy)}`, body "Tailors near
    you are booked until after your need-by date. A later date opens more times.", CTA "Pick a later date" (`later` →
    `state.ui['c-where'] = { openNeedBy: true }; go('c-where')`), secondary — only for home visits — "Try a visit at the shop"
    (`try-shop`).
  - `c-tailors--declined`: a warning `banner` (the same tone as c-tailor--declined, R1-2-C-07) above the rows: title "Amara can’t take this job", text "Your job details are
    saved. You can still book Amara for a different job." (name from the declined appt’s tailor); her row renders
    `declined: true` (dimmed, "Declined this job", not tappable).
  - `c-tailors--sort` overlay: `sheetOverlay` header "Sort by", a `role="radiogroup"` of 4 `optionRow`s (`act: 'sort-opt'`,
    `name: 'sort'`): Recommended (sub "Rating, distance and price together") · Lowest price · Nearest · Soonest opening.
    Choosing one stores `state.ui['c-tailors'].sort`, closes, updates the Sort button label, re-orders rows (one seed row: no
    visible change, D-43).
- **Wire:** `open-tailor` → `state.ui.booking = { ...state.ui.booking, tailorId: id }; go('c-tailor')`.
- **FLOWS** (group `M1 · Booking`):
  - `c-tailors--loading` · setup `S.sim.latency = 'hold'` · expect `{ has: 'Tailors near you', sel: '.skeleton--tailor-row' }`
  - `c-tailors` · expect `{ has: ['Tailors near you', \`Est. ${fmt(SCENARIOS.seed.total)}\`, \`Includes ${fmt(SCENARIOS.seed.homeFee)} home-visit fee\`, '0.6 mi', 'Next opening Thu, Oct 15 · 5:00 PM', '3 of 5'] }`
  - `c-tailors--rush` · setup `S.T.setJob({ needBy: '2026-10-16' })` · expect `{ has: [\`Est. ${fmt(SCENARIOS.rush.total)}\`, \`+ ${fmt(SCENARIOS.rush.rush)} rush fee\`] }`
  - `c-tailors--empty-zip` · setup `S.T.setJob({ zip: '11201', address: { ...S.job.address, zip: '11201' } })` · expect `{ has: 'No tailors visit 11201 yet', not: 'Est.', sel: '[data-empty="zip"]' }`
  - `c-tailors--empty-shop` · setup `S.T.setTailorSection('where', { shop: { enabled: false } }); S.T.setJob({ visitType: 'shop' })` · expect `{ has: 'No shops near 11211', sel: '[data-empty="shop"]' }`
  - `c-tailors--nothing-open` · setup `S.T.setJob({ needBy: '2026-10-15' })` · expect `{ has: 'Nothing open before Thu, Oct 15', sel: '[data-empty="nothing-open"]' }`
  - `c-tailors--declined` · setup `S.driveTo('declined')` · expect `{ has: ['Declined this job', 'Your job details are saved'], sel: '.tailor-row--declined' }`
  - `c-tailors--sort` · click `['[data-act="sort"]']` · expect `{ has: ['Sort by', 'Recommended', 'Lowest price', 'Nearest', 'Soonest opening'] }`
- **Nav:** Back → c-where. Out → c-tailor; empty-state CTAs as above.

### c-tailor — C4 Tailor profile

- **Purpose:** decide on this tailor: who she is, what *this job* costs with her, when, how it comes back.
- **Focal:** the action bar — "Est. $160 · 2 items" + `Pick a time`.
- **Data:** `t = tailorById(state.ui.booking?.tailorId ?? state.tailors[0].id)`; `q = estimateNext(t, job)`; `el = eligible(t, job)`;
  `next = nextOpening(t.id, job.visitType, { until: job.needBy })`.
- **Layout (top→bottom), sections separated by 32 and a `.t-h2` head:**
  1. `chrome('home')` · `bookingSteps(3)` · `headingRow('')` (Back only).
  2. **Hero:** `avatar({ size: 'lg' })` · `<h1 class="t-title">Amara Reyes</h1>` + ✓ (verified) · t-body c-600 "Reyes
     Tailoring · Williamsburg · 12 years" · 8 · `ratingSummary(t.rating)` (or "New on Taily" t-small c-600 with no reviews) ·
     `trustBadges(t.badges)` · t-small w-600 c-700 "Next opening Thu, Oct 15 · 5:00 PM".
  3. `secondary cta('Ask a question', data-act="ask")` — full width, under the hero (hidden when declined).
  4. **About:** t-body c-700 bio · a row of 4 work-photo tiles (`photoTile('photo')`, 72 px, radius md) labelled
     `aria-label="Work photo 1 of 4"`.
  5. **Your estimate** (`.t-h2`): an `infoCard` of `priceRow`s — one per `q.lines` (label `"Suit Pant · Hem pants"`, `fmt`) ·
     "Home-visit fee" `q.homeFee` (home only) · "Rush fee" `q.rush` with note `Need-by ${q.rushDays} day(s) after the visit`
     (only when > 0) · total row t-body w-600 "Estimated total" `fmt(q.total)` · caption t-small c-600 "Confirmed at the fitting.
     If Amara changes a price, you approve it before work starts." (D-44)
  6. **Prices** (`.t-h2`): `priceRow` for every service she prices (catalog order), **first 4 shown**, then a 44 px text button
     `See all 10 prices` (`data-act="all-prices"`, toggles `state.ui['c-tailor'].allPrices`); services she doesn’t offer are
     omitted. Under it a "Rush fees" sub-block t-small, one nowrap span per tier from `t.rush`:
     "ready within 1 day of the visit +$40 · 2 days +$25 · 3 days +$15 · 4+ days no rush fee" (`fmt(cents(fee))`; "4+" = last tier days + 1;
     the line wraps between tiers only).
  7. **Where** (`.t-h2`): shop block (only `t.shop.enabled`): `metaRow('◉', 'Reyes Tailoring, 312 Metropolitan Ave, Brooklyn,
     NY 11211')` + t-small c-600 "0.6 mi from you". Home block (only `t.home.enabled`): `metaRow('⌂', 'Comes to you in 11211,
     11222, 11206, 11237')` + `${fmt(homeFee)} home-visit fee` t-small c-600.
  8. **Getting it back** (`.t-h2`): one `metaRow` per offered return: "In-store pickup — free" · "Home drop-off — free" · "Taily
     courier — priced when your order is ready, before you pay".
  9. **Reviews** (`.t-h2` + count): `ratingSummary` + the 3 newest `reviewRow`s + 44 px "See all 37 reviews" text button (toast
     "Not built yet"). No reviews → t-body c-600 "No reviews yet. Every Taily tailor is ID verified and background checked."
  10. `actionBar({ lead: 'Est. <b data-money>$160</b> · 2 items', ctaLabel: 'Pick a time', ctaAct: 'pick-time', disabled:
      !el.ok, note: reason })`.
- **States:**
  - `c-tailor` default (both shop + home, 4 reviews).
  - `c-tailor--no-reviews`: no rating stars, "New on Taily", reviews empty copy.
  - `c-tailor--home-only`: no shop address block.
  - `c-tailor--shop-only` (job at the shop): no home block, no home-visit fee row in the estimate.
  - `c-tailor--declined`: warning `banner` under the hero: title "Amara declined this job", text "Your job details are saved.
    You can book Amara for a different job."; Ask a question hidden (the thread is read-only); actionBar disabled with note
    "Not available for this job" and `secondaryLabel: 'Start a different job'` (`new-job` → `T.newJob(); go('c-job',
    { fresh: true })`).
- **Wire:** ask → `go('c-thread')`; pick-time → `go('c-book')`; all-prices → toggle + re-render.
- **FLOWS:**
  - `c-tailor` · expect `{ has: ['Amara Reyes', 'Reyes Tailoring', 'Ask a question', 'Your estimate', \`Est. ${fmt(SCENARIOS.seed.total)}\`, '312 Metropolitan Ave', 'Taily courier', 'Priya S.', '4 of 5'] }`
  - `c-tailor--no-reviews` · setup `S.T.setTailorSection('profile', { reviews: [], rating: { avg: 0, count: 0 } })` · expect `{ has: ['No reviews yet', 'New on Taily'], not: 'Priya' }`
  - `c-tailor--home-only` · setup `S.T.setTailorSection('where', { shop: { enabled: false } })` · expect `{ has: 'Comes to you in', not: '312 Metropolitan Ave' }`
  - `c-tailor--shop-only` · setup `S.T.setTailorSection('where', { home: { enabled: false } }); S.T.setJob({ visitType: 'shop' })` · expect `{ has: ['312 Metropolitan Ave', \`Est. ${fmt(SCENARIOS.shop.total)}\`], not: 'Home-visit fee' }`
  - `c-tailor--declined` · setup `S.driveTo('declined')` · expect `{ has: ['Amara declined this job', 'Start a different job'], not: 'Ask a question', sel: '[data-act="pick-time"][aria-disabled="true"]' }`
- **Nav:** Back → c-tailors. Out → c-book · c-thread · c-job (declined).

---

## C4. CLUSTER "Book + pay" — `c-book`, `c-pay`, `c-request`

### c-book — C5a Pick a time

- **Purpose:** choose one of the tailor’s open slots before the need-by.
- **Focal:** the Scheduler.
- **Data:** `slots = openSlots(t.id, job.visitType, { until: job.needBy })`; selected = `state.ui.booking?.slot` if in `slots`,
  else `slots[0]`.
- **Layout:** `chrome('home')` · `bookingSteps(4)` · `headingRow('<h1 class="t-title">Pick a time</h1>')` · t-body c-600
  "Amara Reyes · At my place · 60-minute visit" · t-small c-600 "Only Amara’s open times before Fri, Oct 23 are shown." · 16 ·
  `scheduler({ title: 'Visit time', columns: slotColumns(slots, selected), note, cta: '', inline: true, compact: true })` (a 3-row wheel, the
  settled row centred; no inline button — Continue lives in the sticky `actionBar({ lead: 'Est. $160', ctaLabel: 'Continue', ctaAct: 'slot-next' })`,
  the lead re-priced on every wheel settle, as on c-tailor) · `note` = when `estimate(t, job, selected).rush > 0`: `RUSH FEE ${fmt(rush)} · VISIT ${days} DAY(S) BEFORE YOUR NEED-BY`
  (caps note, live-updated through `[data-sched-note]` on every wheel settle via `wireWheel` → `readSlot`), else hidden ·
  16 · t-small c-600 centred "You won’t be charged yet. Next you’ll see the full price and the deposit."
- **States:**
  - `c-book` default (first slot Thu, Oct 15 · 5:00 PM).
  - `c-book--no-slots` (`data-empty="no-slots"`, no scheduler): `emptyState({ title: \`No open times before ${fmtDay(needBy)}\`,
    body: \`Amara’s next opening is ${fmtWhen(nextOpening(t.id, visitType))}, too close to your need-by date. The visit has to be at least a day before.\`, ctaLabel: 'Change
    need-by date', ctaAct: 'later', secondaryLabel: 'Message Amara', secondaryAct: 'ask' })`; when there is no opening at all
    the body is "Amara has no open times in the next 4 weeks." (`SLOT_HORIZON_DAYS`).
- **Wire:** wheel settle → `readSlot` → store `state.ui.booking.slot` + update the note; slot-next → `go('c-pay')`; later →
  `state.ui['c-where'] = { openNeedBy: true }; go('c-where')`; ask → `go('c-thread')`.
- **FLOWS:**
  - `c-book` · expect `{ has: ['Pick a time', 'Thu, Oct 15', '60-minute visit', 'Continue', '5 of 5'], sel: '[data-scheduler]' }`
  - `c-book--no-slots` · setup `S.T.setJob({ needBy: '2026-10-15' })` · expect `{ has: ['No open times before Thu, Oct 15', 'Change need-by date', 'Message Amara'], sel: '[data-empty="no-slots"]' }`
- **Nav:** Back → c-tailor. Out → c-pay · c-where · c-thread.

### c-pay — C5b Review and pay the deposit (sends the request)

- **Purpose:** see the whole price, understand the hold, send the request.
- **Focal:** the CTA `Hold $16.00 and send request` (the deposit amount is in the button itself).
- **Data:** `t`, `slot = state.ui.booking?.slot ?? openSlots(…)[0]`, `q = estimate(t, job, slot)`, method = `state.ui.booking?.cardId`
  ?? the default card id (`'apple-pay'` = Apple Pay). `holdH = POLICY.REQUEST_EXPIRY_H`, `cancelH = POLICY.CANCEL_WINDOW_H`.
- **Layout:** `chrome('home')` · `bookingSteps(4)` · `headingRow('<h1 class="t-title">Review and send request</h1>')` (D-52; was "Review and pay deposit") · 16 ·
  `visitBlock([…], { title: 'Your visit' })` rows: "Amara Reyes" · `fmtWhen(slot)` + " · At my place" · "145 N 7th St, 2R,
  Brooklyn" (shop: "Reyes Tailoring, 312 Metropolitan Ave") · "2 items · 3 services" — with two 44 px text buttons right of the
  block: "Change time" (`data-act="back"` → c-book) · 24 · `.t-h2` "Price" ·
  `customerBreakdown(q, { stage: 'estimate', tailorFirst: 'Amara', depositState: 'to-hold' })` (Services · Home-visit fee ·
  Rush fee when any · Estimated total · Deposit **Held today** · Balance Due when ready) · 16 · **hold explainer** `infoCard`
  (accent-bg tint, t-small c-700, 3 lines, each with a glyph): "We hold $16.00 on your card now. You’re only charged if Amara
  accepts." · "No reply within 2 hours, or a decline? The hold is released in full." · "Free cancellation until 24 hours before
  your visit." · 24 · `.t-h2` "Pay with" · a payment method row (`methodRow('Visa •••• 4242', 'card')` / `methodRow('Apple Pay',
  'apple')`, `data-act="change-method"`, sub "Expires 08/28") · the error banner slot (directly under the method row) ·
  `actionBar({ ctaLabel: \`Hold ${fmtExact(q.deposit)} and send request\`, ctaAct: 'pay', busy, busyLabel: 'Sending request…',
  note: \`You pay the ${fmtExact(q.balance)} balance when your order is ready.\` })`.
- **States:**
  - `c-pay` default · `c-pay--rush` (adds "Rush fee $40.00" with caption "Need-by 1 day after the visit"; the deposit is
    unchanged, the balance grows) · `c-pay--shop` (no home-visit fee row; visit row "Tue, Oct 13 · 1:00 PM · At the shop").
  - `c-pay--method` overlay (`sheetOverlay`, header "Pay with"): `role="radiogroup"` of `optionRow`s (`act: 'method'`) — every
    `state.customer.cards` ("Visa •••• 4242", sub "Expires 08/28", lead card glyph) + "Apple Pay" (when `customer.applePay`)
    · a 56 px `listRow({ title: 'Add a card', act: 'add-card', lead: <dashed card + plus glyph> })` (the lead takes the option rows’ 32 px column, so titles line up). Choosing → `state.ui.booking.cardId`; if a decline is
    showing and the method differs, `A.useOtherMethod()` and clear the banner → close → re-render.
  - `c-pay--add-card` overlay (replaces the method sheet content in place, header "Add a card"): `field`s Card number
    (`cc-number`, numeric, `autocomplete="cc-number"`, groups of 4 as typed) · Expiry (`cc-exp`, placeholder "MM/YY") and
    Security code (`cc-csc`, numeric, helper "3 or 4 digits on the back") side by side · ZIP code (`cc-zip`) · t-small c-600 "Your
    card is stored by our payment provider, not by Taily." · `cta('Save card', data-act="save-card")`. Errors next to each field:
    "Enter the full card number." · "Enter a valid expiry, like 08/28." · "Enter the 3 or 4 digit code." · "Enter a 5-digit ZIP
    code." Ok → `A.addCard` → select it → close → re-render, toast "Card added".
  - `c-pay--declined` (`sim.card = 'declined'`, after Pay): error `banner({ tone: 'error', title: 'Your card was declined',
    text: 'Visa •••• 4242 didn’t go through, and nothing was held. Try another card.', actionLabel: 'Change card', actionAct:
    'change-method' })` under the method row; the method stays selected; focus moves to the banner; CTA re-enabled (D-40).
  - `c-pay--3ds` overlay (`sim.card = '3ds'`, after Pay → `requestBooking` returns `needs-3ds`): `sheetOverlay` header
    "Confirm with your bank": t-body "Your bank asks you to confirm this hold." · a white bank panel (inset hairline, r-md):
    "Taily" / `Hold ${fmtExact(q.deposit)}` (t-h2, `data-money`) / "Visa •••• 4242" · `cta('Confirm', data-act="3ds-ok")` ·
    secondary `cta('Cancel', data-act="3ds-cancel")`. Confirm → busy → `requestBooking({ …, threeDS: true })` → success path.
    Cancel → close + info banner "Verification cancelled. Nothing was held."
  - `c-pay--processing` (`sim.latency = 'hold'`, after Pay): CTA busy "Sending request…", method row + Change time disabled,
    `main` `aria-busy="true"`.
- **Wire:** pay → busy → `withLatency(() => { r = T.requestBooking({ tailorId: t.id, slotStart: slot, cardId }) })`:
  ok → `state.ui.booking = {}`; `go('c-request', { fresh: true })` · `card-declined` → banner · `needs-3ds` → 3DS sheet ·
  `slot-unavailable` → error banner "That time was just taken. Pick another time." + action "Pick a time" (→ c-book) · any
  other error → error banner "Something went wrong. Nothing was held. Try again." Never leave the CTA busy after a failure.
- **FLOWS:**
  - `c-pay` · expect `{ has: ['Review and pay deposit', fmtExact(SCENARIOS.seed.services), fmtExact(SCENARIOS.seed.homeFee), fmtExact(SCENARIOS.seed.total), 'Held today', \`Hold ${fmtExact(SCENARIOS.seed.deposit)} and send request\`, 'Visa •••• 4242', 'released in full'] }`
  - `c-pay--rush` · setup `S.T.setJob({ needBy: '2026-10-16' })` · expect `{ has: ['Rush fee', fmtExact(SCENARIOS.rush.rush), fmtExact(SCENARIOS.rush.total), \`Hold ${fmtExact(SCENARIOS.rush.deposit)}\`] }`
  - `c-pay--shop` · setup `S.T.setJob({ visitType: 'shop' })` · expect `{ has: ['At the shop', 'Tue, Oct 13 · 1:00 PM', fmtExact(SCENARIOS.shop.total), \`Hold ${fmtExact(SCENARIOS.shop.deposit)}\`], not: 'Home-visit fee' }`
  - `c-pay--method` · click `['[data-act="change-method"]']` · expect `{ has: ['Pay with', 'Visa •••• 4242', 'Apple Pay', 'Add a card'] }`
  - `c-pay--add-card` · click `['[data-act="change-method"]', '[data-act="add-card"]']` · expect `{ has: ['Add a card', 'Card number', 'Expiry', 'Security code', 'Save card'] }`
  - `c-pay--declined` · setup `S.sim.card = 'declined'` · click `['[data-act="pay"]']` · expect `{ has: ['Your card was declined', 'nothing was held'], sel: '.banner--error' }`
  - `c-pay--3ds` · setup `S.sim.card = '3ds'` · click `['[data-act="pay"]']` · expect `{ has: ['Confirm with your bank', \`Hold ${fmtExact(SCENARIOS.seed.deposit)}\`] }`
  - `c-pay--processing` · setup `S.sim.latency = 'hold'` · click `['[data-act="pay"]']` · expect `{ has: 'Sending request', sel: '[data-act="pay"][aria-busy="true"]' }`
  - (`sys-error-toast` is M5 — not now.)
- **Nav:** Back / Change time → c-book. Out → c-request (fresh history).

### c-request — C6 Request sent (M1 state; M3 adds the outcomes)

- **Purpose:** reassure: the request is out, the money is only held, here’s the clock and what happens next.
- **Focal:** the countdown "2h left".
- **Data:** `a = activeAppt()` (newest open request); `t = tailorById(a.tailorId)`; `countdown({ expiresAt: a.expiresAt, now: now() })`.
- **Layout:** `chrome('bookings')` (no Back — the booking flow is finished; no stepper) · `statusHero({ variant: 'requested',
  pill: 'requested', pillLabel: 'Request sent', title: 'Waiting for Amara', body: \`Amara has 2 hours to reply. We’ll text you
  the moment she does.\` })` · the countdown, large (t-h2 serif, tabular) with t-small c-600 `Reply by ${fmtTime(a.expiresAt)}`
  · 24 · `visitBlock` rows (`fmtWhen(slot)` · At my place · address · items) · 24 · `.t-h2` "What happens next" ·
  `timeline([{ state: 'done', title: 'Request sent', sub: fmtWhen(a.requestedAt) }, { state: 'current', title: 'Amara replies',
  sub: \`Within 2 hours, by ${fmtTime(a.expiresAt)}\` }, { state: 'todo', title: 'You’re booked', sub: \`The ${fmtExact(deposit)}
  deposit is charged when she accepts\` }])` · t-small c-600 "If she declines or doesn’t reply, the hold is released and your
  job stays saved." · 24 · `.t-h2` "Price" · `customerBreakdown(a.money, { stage: 'booked', tailorFirst: 'Amara', depositState:
  a.payments.deposit.state })` (Deposit **On hold**) · 24 · `cta('Message Amara', data-act="message")` (the one filled CTA — the
  chat stays open while waiting) · 8 · secondary `cta('Withdraw request', data-act="withdraw")`.
- **Withdraw** (key `c-request--withdraw`, inventory-tagged M3; built now so the 2-hour wait has an exit, D-41):
  `sheetOverlay` header "Withdraw this request?": t-body `The ${fmtExact(deposit)} hold is released right away. Your job stays
  saved so you can pick another time or tailor.` · `cta('Withdraw request', data-act="withdraw-ok")` · secondary `cta('Keep
  request', data-act="withdraw-keep")`. ok → `T.withdrawRequest(a.id)` → toast `Request withdrawn. ${fmtExact(deposit)} hold
  released.` → `go('c-tailors', { fresh: true })`.
- **No open request** (e.g. `?screen=c-request` cold): `emptyState({ title: 'No open requests', body: 'When you send a request,
  you can follow it here.', ctaLabel: 'Start a booking', ctaAct: 'home' })`.
- **FLOWS:**
  - `c-request` · setup `S.driveTo('requested')` · expect `{ has: ['Request sent', 'Waiting for Amara', '2h left', 'Reply by 12:00 PM', 'On hold', fmtExact(SCENARIOS.seed.deposit), 'Message Amara'] }`
  - `c-request--withdraw` · setup `S.driveTo('requested')` · click `['[data-act="withdraw"]']` · expect `{ has: ['Withdraw this request?', \`The ${fmtExact(SCENARIOS.seed.deposit)} hold is released\`] }`
- **Nav:** Message → c-thread. Withdraw → c-tailors. Top nav as usual.

---

## D. INTEGRATION (Integrator)

1. `app.js` `SCREEN_MODULES` M1 line: `'c-welcome', 'c-phone', 'c-code', 'c-name', 'c-job', 'c-where', 'c-tailors', 'c-tailor',
   'c-book', 'c-pay', 'c-request', 'c-thread'`. `PERSONA_HOME.customer` stays `c-job` (now registered).
2. `index.html`: one `<link>` per new `css/screens/<id>.css`.
3. **Latency reset (D-35):** `flows.js` gains `setBootLatency(v)` (app.js `boot()` calls it with `'instant'` under `?test=1`,
   else `'normal'`); `resetDemo()` restores `state.sim.latency` to that value after `reset()`, so a flow that sets `'hold'`
   never leaks into the next one.
4. `js/inventory.js`: `BUILT = ['M0', 'M1']` (regenerate). Accept new baselines with `npm run check -- --accept-new`
   (list the keys in the summary), then `npm run check` green.
5. The full hand path in §"M1 done when" works with normal latency (verify once in the browser: send code → verify with any
   6 digits → c-job → … → c-request).

---

## E. Acceptance checklist (every screen, reviewers use this)

- One focal element; one filled CTA; secondary actions are outline / text.
- Every tappable ≥ 44×44 (in-text links `data-hit="inline"` with padded hit area); 8 px between adjacent targets.
- Labels visible above every input; errors under the field, `aria-invalid` + `aria-describedby`; focus to the first error.
- Busy CTAs show a spinner + verb ("Sending code…", "Sending request…") and lock inputs; nothing completes silently.
- Loading (skeleton), empty (`emptyState` with a way forward) and error (banner next to the cause) exist where listed.
- Money: dollars only via `fmt*`, `data-money` on every amount; the deposit is "held", only "charged" on accept; estimates
  say "Est." / "Estimated total"; no `%` anywhere.
- `bookingSteps` shows 1–5 of 5 on c-job / c-where / c-tailors / c-tailor / c-book + c-pay, and nowhere else.
- `prefers-reduced-motion`: no spinner rotation, sheet slides become fades.
