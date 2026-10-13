# M2 — Tailor onboarding + Shop spec (build instructions)

Oct 13, 2026 · spec writer / design director (Opus) · branch `V5`. Builders read **§0 + §B + their cluster** + `docs/v5/CONTEXT.md`.
Calls this spec had to make are **D-55…D-67** in `DECISIONS.md`, cited inline. Money copy is always dollar amounts from
`js/money.js` (`fmt` lists / captions · `fmtExact` breakdowns and the fee sentence), never percentages, never a typed amount.

**Order:** (1) Component + model builder §A (serial: model additions, `account.js` persona param, `onboardTo`, NEW components,
gallery) → (2) three screen builders, clusters §C1–§C3, in parallel → (3) Integrator §D.

**M2 done when:** `npm run check` green; every M2 state key in `js/inventory.js` (incl. the two added here, §D) has a FLOWS
entry; by hand, with normal latency: `t-phone → t-code → to-profile → to-services → to-where → to-returns → to-availability →
to-payouts → to-done → t-shop → (every Edit) → t-rush` clicks through, and after it `?screen=c-tailors` (Sarah) lists the newly
onboarded tailor with the same estimate the tailor's preview showed.

---

## 0. Direction (applies to every M2 screen)

**Who:** Amara, a working tailor in Williamsburg — pins in her apron, phone propped against the sewing machine, five minutes
between fittings. Fluent in her craft, impatient with forms. She is deciding whether Taily is worth her time and **whether the
money is honest**. She wants to see what customers will see and what she will actually take home.
**Feel:** the back room of a good tailor shop — a price card in the window, a chalk-marked week on the wall, a ledger that
adds up. Calm, sure, quick. Every step is one card on the wall.

- **One focal element per screen** (named per screen). Ink fill or size wins; everything else is demoted (neutral-600 text,
  secondary outline buttons). Never two filled CTAs.
- **Type** only: `.t-display` 32 (to-done only) · `.t-title` 28 screen title · `.t-h2` 24 section heads and the fee sentence ·
  `.t-body` 16 · `.t-small` 12 · `.t-caps` 12. Hierarchy by weight + colour first (600 ink / 500 neutral-700 / 400 neutral-600).
  Money and times `tabular-nums`. Typographic apostrophes (’) in copy; FLOWS `expect` strings avoid apostrophes.
- **Signature — "what you take home"**: wherever a tailor types a price, the dollar amount she keeps appears under it, live
  ("You get $22.50"), and wherever she sets something customers see, a **"What customers see"** preview (`customerPreview`,
  §A) shows it in the customer's own component. These two are the M2 signature; reviewers check for both.
- **Two modes, one file per section (D-56).** Each `to-*` screen renders in
  - **onboarding mode** when the tailor is not `live` yet: `onboardingHeader()` (status bar + a 56 px bar: Back ‹ left,
    "Finish later" right; step 1 has no Back), then `onboardingSteps(id)` ("Step 2 of 6 · Services and prices" + six
    segments, done = the tailor's `onboarding` flags) first in `.body`, title, form, `actionBar({ ctaLabel: 'Next', ctaAct:
    'next', busyLabel: 'Saving…' })`. Next validates, saves (through `withLatency`, CTA busy), goes to the next step in order.
  - **edit mode** when `tailor.live` (seed Amara; anyone who finished once): `onboardingHeader({ editing: true })` =
    `chrome('shop', { persona: 'tailor' })`, `headingRow(backButton() + title)`, no stepper, `actionBar({ ctaLabel: 'Save
    changes', ctaAct: 'save', disabled: !dirty, note: dirty ? '' : 'No changes yet.', busyLabel: 'Saving…' })`. Save validates,
    saves, `back() || go('t-shop')`, then `toast('<Section label> saved', { tone: 'success' })`. Back with a dirty draft opens
    `leaveModal` (§A) — wire your own `.back` (`btn.dataset.wired = '1'` before app.js sees it).
- **Drafts (D-34).** What she has typed but not saved lives in `state.ui['<screen id>'].draft`, initialised on first render
  from the model (`ui().draft ??= fromTailor(myTailor())`); a Test-flows setup may seed it (stands in for typing). Saving
  writes the model through `T.setTailorSection` / `T.setPayouts` / `T.setRush` only. `dirty` = `JSON.stringify(draft) !==
  JSON.stringify(fromTailor(t))`. Live captions (payout under a price, fee preview, counter) update **in place** on `input`
  (never re-render while typing — it drops focus and the keyboard). Errors appear only after Next / Save, under their field;
  editing a field clears its own error in place; focus moves to the first invalid field.
- **Layout:** 390 wide, `--neutral-50`, sides 20, `.body` padding-top 128 in both modes (the onboarding bar takes the nav's
  56). Rhythm: 8 inside a group, 24 between groups, 32 before a section head. Cards: white, `--radius-lg`, inset 1px
  `--neutral-200`. Every target ≥ 44 px; switches and checkboxes sit in ≥ 44 px rows.
- **Big, forgiving inputs:** `inputmode="numeric"` for prices / ZIPs / routing / account, whole dollars only (D-59), `$`
  prefix, sensible defaults pre-filled so most steps are "check and Next".
- **Money honesty:** the Taily fee is shown only as dollar amounts derived from `tailyFeeFor` / `payoutFor`; the home-visit
  fee and rush fees are stated as "yours in full"; the courier is "paid by the customer".

---

## A. MODEL + COMPONENTS (Component builder — serial, before the screens)

Tokens only, `css/components-v5.css`; add each new component to `sys-components` (one gallery block per listed state) and
accept its baseline. Do not change existing signatures except as listed. `npm run check` green before handing over.

### A1. `js/data.js` (D-55, D-58, D-59, D-60, D-62, D-63, D-64)

- `TAILORS[0]` gains `phone: '(347) 555-0118'`, `live: true`, `payouts.routing: '021000021'`. `BLANK_TAILOR` gains
  `phone: ''`, `live: false`, `payouts: { bank: '', last4: '', holder: '', routing: '' }`.
- New constants (with a one-line comment each):
  ```js
  export const TAILOR_LIMITS = { BIO_MAX: 300, WORK_PHOTOS_MAX: 6, PRICE_MAX: 999, FEE_MAX: 200, RUSH_MAX: 200 };  // whole dollars
  export const RUSH_TIERS = [1, 2, 3];                       // days after the visit; 4+ days is always free (D-64)
  export const SHOP_CITY = { city: 'Brooklyn', state: 'NY' }; // prototype geography (D-60)
  export const DEFAULT_WEEK = {                              // a new tailor's starting hours (D-62); no overlap
    shop: { tue: ['10:00', '18:00'], wed: ['10:00', '18:00'], thu: ['10:00', '18:00'], fri: ['10:00', '18:00'], sat: ['10:00', '18:00'] },
    home: { mon: ['18:00', '20:00'], thu: ['18:00', '20:00'] } };
  export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  export const DAY_LABEL = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
  export const ROUTING_BANKS = { '021000021': 'Chase', '026009593': 'Bank of America', '021000089': 'Citibank', '026013673': 'TD Bank', '021000322': 'Bank of America' };
  ```

### A2. `js/money-config.js` (spec-approved edit, D-63)

`MONEY.FEE_EXAMPLE_SERVICES: 100` — "the round services total the payouts step explains the Taily fee with (display only,
not a rate)". to-payouts reads it; nothing else.

### A3. `js/state.js` — section rules, three new transitions (DOM-free)

Replace `SECTION_RULES` so each returns `{ field: code }` (codes are what screens map to copy):

| section | rules (in order) |
|---|---|
| profile | `name` `name-required` (trimmed empty) · `bio` `bio-required` (trimmed empty) / `bio-long` (> `BIO_MAX` chars) |
| services | `prices` `no-services` (no key at all) · for each key with `null` / `''` / NaN / ≤ 0: `price-<id>` `price-missing` · non-integer or > `PRICE_MAX`: `price-<id>` `price-invalid` |
| where | `where` `where-required` (neither enabled) · shop on: `street` `street-required`, `shopZip` `zip-invalid` (not 5 digits) · home on: `zips` `zips-required` (empty) / `zip-invalid` (any entry not 5 digits), `fee` `fee-missing` (null / '' / NaN) / `fee-invalid` (non-integer, < 0, > `FEE_MAX`) |
| returns | `returns` `return-required` (none on) · `pickup` `pickup-needs-shop` (pickup on, shop off) |
| availability | for each **enabled** visit type with no window: `shop` / `home` `hours-required` · a window with open ≥ close: `<type>-<day>` `hours-range` · both enabled and the same day's windows intersect (touching is fine): `overlap-<day>` `hours-overlap` |
| payouts | `holder` `holder-required` · `routing` `routing-invalid` (not 9 digits) · `last4` `account-invalid` (not 4 digits) · `bank` `bank-required` |

- `setTailorSection(section, patch)`: `prices` and `availability` in a patch **replace** the tailor's object (not merged), so an
  unticked service / closed day disappears; everything else deep-merges as now. After re-deriving the flag: `if (bookable(t))
  t.live = true` (never set back to false). Returns `{ ok, tailor, valid, errors, bookable, live }`.
- `setPayouts({ holder, routing, account })` — trims; errors `holder` `holder-required`, `routing` `routing-invalid`, `account`
  `account-invalid` (not 4–17 digits; **blank keeps the stored `last4`** when there is one — edit mode). Ok →
  `setTailorSection('payouts', { payouts: { holder, routing, bank: ROUTING_BANKS[routing] ?? 'Your bank', last4 } })`; the
  full account number is never stored. Returns `{ ok, errors?, tailor, bookable, live }`.
- `validateRush({ on, fees: { 1, 2, 3 } })` — `on: false` → ok. Else per tier `d<n>`: `fee-missing` (blank), `fee-invalid`
  (non-integer, < 0, > `RUSH_MAX`), and `fee-order` when a tier is higher than the tier before it (1 day ≥ 2 days ≥ 3 days).
  `setRush(draft)` → validates; ok → `tailor.rush = RUSH_TIERS.map(d => ({ days: d, fee: Number(fees[d]) })).filter(r => r.fee > 0)`
  (off → `[]`). Returns `{ ok, errors?, tailor }`. Rush is not an onboarding section (D-64).
- `nextSection(tailor = state.tailors[0])` → the first `SECTIONS` id whose flag is false, or `null`.
- Add `setPayouts, setRush, validateRush, nextSection` to `T` and to the CONTEXT.md model list.

### A4. `js/account.js` — a `who` parameter (D-55)

Every session fn takes a trailing `who = 'customer'`: `signOut(who)`, `sendCode(raw, who)`, `codeStatus(who)`,
`resendCode(who)`, `verifyCode(code, who)`. `session = () => state.session[who]`. Customer behaviour is unchanged.
Tailor: `isNew = phoneDigits(raw) !== phoneDigits(state.tailors[0].phone)`. `verifyCode(code, 'tailor')` ok →
- existing: `session.tailor = { signedIn: true, pending: null }` → `{ ok, isNew: false, next: nextSection() }`;
- new: `blankTailor()` (D-20), `state.tailors[0].phone = pending.phone`, signed in → `{ ok, isNew: true, next: 'profile' }`.

### A5. `js/fixtures/common.js` — `onboardTo(step, { phone })` (D-66)

```js
export const NEW_TAILOR_PHONE = '(646) 555-0127';
/** reset → blank tailor (D-20) signed in with `phone` → every section BEFORE `step` saved with the seed's values.
    step: 'profile' | 'services' | 'where' | 'returns' | 'availability' | 'payouts' | 'done'. Returns the tailor. */
export function onboardTo(step, { phone = NEW_TAILOR_PHONE } = {}) { … }
```
Section values come from `TAILORS[0]` (seed) through `T.setTailorSection` / `T.setPayouts({ holder, routing, account:
'000123456789' })`, never typed here. `'done'` = all six (live). Throws if a section fails to validate. Fixtures import it
directly (`import { onboardTo, NEW_TAILOR_PHONE } from './common.js'`).

### A6. NEW components (`js/components.js`)

| fn | states (gallery) | spec |
|---|---|---|
| `ONBOARDING_STEPS` + `onboardingSteps(current, done = [])` | step 1 · step 4 with 1–3 done | `ONBOARDING_STEPS = [{ id: 'profile', label: 'Profile', screen: 'to-profile' }, { id: 'services', label: 'Services and prices', screen: 'to-services' }, { id: 'where', label: 'Where you work', screen: 'to-where' }, { id: 'returns', label: 'Return options', screen: 'to-returns' }, { id: 'availability', label: 'Availability', screen: 'to-availability' }, { id: 'payouts', label: 'Payouts', screen: 'to-payouts' }]`. Renders `stepper({ steps: ONBOARDING_STEPS, current, done, variant: 'default' })` ("Step 2 of 6 · Services and prices"). `done` = ids (non-contiguous allowed). |
| `onboardingHeader({ editing = false, back = true })` | onboarding · onboarding step 1 (no back) · editing | onboarding: `statusBar()` + `<div class="ob-bar">` fixed under it, h56, white→`--neutral-50`, `backButton()` left (when `back`), right a 44 px text button `<button class="ob-bar__later t-body w-600" data-act="finish-later">Finish later</button>` (`--accent-ink`). editing: `chrome('shop', { persona: 'tailor' })`. |
| `textArea({ id, label, value = '', rows = 4, max, helper = '', error = '' })` | empty · typing (counter) · over max · error | same chassis as `field` (label, inset box, `field__msg`); a right-aligned `t-small c-600` counter `"<n> / <max>"` with `data-count`, `aria-live="polite"` off (`aria-describedby` points at helper+counter); over max → counter `--error`. **No `maxlength`** (a paste must be able to show `bio-long`). |
| `serviceRow({ id, label, caption, checked, price = '', payoutCents = null, error = '' })` | unchecked · checked empty · checked with price + payout · error | a ≥ 56 px row: left `checkRow`-style box + label (t-body w-500) + caption (t-small c-600); right, only when checked, a 96 px `$` price input (`id="price-<id>"`, `inputmode="numeric"`, `aria-label="Price for <label>"`, `aria-invalid` on error) with, under it, `<span class="service-row__take" data-money data-take>You get $22.50</span>` (t-small w-600 `c-700`; `fmt(payoutCents)`; hidden when null). Error `field__msg--error` under the row, `id="price-<id>-msg"`. Checkbox `data-act="svc" data-id`. |
| `zipList({ zips = [], input = '', error = '', inputError = '', suggestions = [] })` | empty · 4 zips · input error · list error | label `ZIP codes you cover` (t-small w-600). Chips: `<button data-act="zip-remove" data-zip aria-label="Remove 11211">11211 <span c-600>Williamsburg</span> ✕</button>` (h44, `--radius-full`, white, inset stroke; hood from `ZIP_INFO`). Then a row: `field({ id: 'zip-add', label: 'Add a ZIP code', inputmode: 'numeric', maxlength: 5, error: inputError })` + `ctaSmall('Add', { attrs: 'data-act="zip-add"' })` (≥ 44). Then suggestions as small chips `+ 11222` (`data-act="zip-suggest" data-zip`), only those not already listed. List-level `error` under everything. |
| `dayHours({ sched, day, label, open = null, close = null, error = '' })` | closed · open · error | row h ≥ 56: day label (t-body w-600) left; a `toggle` switch right (`id="day-<sched>-<day>"`, label = day label, `data-toggle`). When open, a second line: two 44 px time buttons `<button data-act="time" data-sched data-day data-edge="open">10:00 AM</button>` "–" `…edge="close">6:00 PM</button>` (t-body tabular, inset stroke, `--radius-md`). Closed: "Closed" t-small c-500. Error under the row (`role="alert"`). Times in, as labels ("10:00 AM"). |
| `customerPreview({ title = 'What customers see', html, caption = '' })` | with a tailorRow · with a mini profile · with a text line | `<section class="customer-preview" aria-label="<title>">` caps label (t-caps c-600) + an `inert` container holding `html` (so a tailorRow button inside is not focusable / clickable) on `--neutral-100` with `--radius-xl` padding 12 + optional caption t-small c-600. |
| `rushLadder(rush)` | 3 tiers · 1 tier · empty | the c-tailor ladder line, moved here unchanged (D-54 (5)): tiers sorted, first "ready within 1 day of the visit +$40", then "2 days +$25"…, last "4+ days no rush fee", each a nowrap span (`.rush-tier`), `data-money`; empty → "No rush fees." c-tailor may switch to it (same output, no baseline change). |
| `leaveModal({ title = 'Leave without saving?', body = 'Your changes will be lost.' })` | default | modal HTML for `modalOverlay`: t-h2 title, t-body c-600 body, `cta('Keep editing', { attrs: 'data-act="keep-editing"' })`, `cta('Discard changes', { variant: 'secondary', attrs: 'data-act="discard"' })`; `role="alertdialog"`, `aria-labelledby`. |
| `checkRow({ …, disabled = false })` (extend) | disabled | `disabled` on the input, row neutral-400 text, caption still readable (c-600). |
| `avatar({ photo: true })` (extend, D-58) | placeholder photo | `photo === true` → a `--media-placeholder` filled circle (no `<img>`), the prototype's "added photo". |

---

## B. Shared data + copy (all clusters read this table)

| need | source |
|---|---|
| the tailor | `myTailor()` (`tailor-data.js`) |
| mode | `const editing = !!myTailor().live` (D-56) |
| step ↔ screen | `ONBOARDING_STEPS` (`components.js`); next step = the next entry; after `payouts` → `to-done` |
| done segments | `SECTIONS.filter(s => t.onboarding[s])` |
| per-price take-home | `payoutFor({ services: cents(p) })` → `fmt` ("You get $22.50") |
| fee example | `c = cents(MONEY.FEE_EXAMPLE_SERVICES)`; `fmtExact(c)`, `fmtExact(tailyFeeFor(c))`, `fmtExact(payoutFor({ services: c }))` |
| customer preview row | `tailorsFor(state.job).rows.find(r => r.tailor.id === MY_TAILOR_ID)` → `tailorRow({ ...r.tailor fields, quote: r.quote, distanceMi: r.distanceMi, nextOpening: r.nextOpening, visitType: state.job.visitType })`; none → mini profile fallback (§C3 to-done) |
| visit lengths / reply window | `VISIT_MINUTES.shop` / `.home`, `POLICY.REQUEST_EXPIRY_H` |
| labels | `RETURN_LABEL`, `DAY_LABEL`, `VISIT_LABEL.tailor`, `SERVICES[id].label`, `ZIP_INFO[zip].hood` |
| times | `timeLabel(minutesOf('10:00'))` → "10:00 AM"; back with `timeMinutes('6:00 PM')` → `HH:MM` (`scheduler.js`, `dates.js`) |
| resume banner | `state.ui.onboarding?.resumed` → `banner({ tone: 'info', title: 'Pick up where you left off', text: '<Done labels> done. <n> steps to go before customers can book you.', dismissible: true })` first under the stepper; dismiss or Next clears it. ("Profile is done. 5 steps to go…" for one.) |
| finish later (D-57) | save the draft as typed through the section's setter (the flag reflects validity; errors are not shown), `state.ui['t-phone'] = { saved: true, phone: t.phone }`, `A.signOut('tailor')`, `go('t-phone', { fresh: true })` |
| fixtures | top of `js/fixtures/m2.js`: `import { SCENARIOS, AMARA } from './money-scenarios.js'; import { fmt, fmtExact, cents, tailyFeeFor, payoutFor } from '../money.js'; import { MONEY } from '../money-config.js'; import { onboardTo, NEW_TAILOR_PHONE } from './common.js'; import * as A from '../account.js';` (first builder adds; others keep) |
| groups | `M2 · Tailor sign-up` (t-phone, t-code) · `M2 · Onboarding` (to-*) · `M2 · Shop` (t-shop, t-rush, every `--edit`) |

---

## C1. CLUSTER "Sign up + first steps" — `t-phone`, `t-code`, `to-profile`, `to-services` (+ one link on `c-welcome`)

### t-phone — tailor sign-up: phone

- **Purpose:** start as a tailor with just a phone number; set expectations for the six steps.
- **Focal:** the phone field.
- **Layout:** `statusBar()` (no nav, body padding-top `calc(44px + var(--space-32))` like c-phone) · t-caps c-600 "For tailors" ·
  `headingRow('<h1 class="t-title">Get booked by customers nearby</h1>')` · t-body c-600 "Set your own prices and hours. We’ll
  text you a code — no passwords." · [saved banner, below] · 24 · `field({ id: 'phone', label: 'Mobile number', prefix: '+1',
  type: 'tel', inputmode: 'tel', autocomplete: 'tel-national', placeholder: '(718) 555-0142', helper: 'US numbers only. Message
  and data rates may apply.', error })` · 24 · t-small c-600 "Next: six short steps — profile, services and prices, where you
  work, return options, hours and payouts. About 10 minutes, and you can finish later." · 16 · t-small c-600 "Looking for a
  tailor? <a data-act="customer" data-hit="inline">Book one</a>" (→ `go('c-welcome', { fresh: true })`) ·
  `actionBar({ ctaLabel: 'Send code', ctaAct: 'send-code', busy, busyLabel: 'Sending code…' })`.
- **Saved banner** (`state.ui['t-phone'].saved`): `banner({ tone: 'success', title: 'Your progress is saved', text: 'Sign in with
  <phone> to pick up where you left off.' })` above the field; field pre-filled with that phone.
- **Wire:** a copy of c-phone's (format in place, clear error on edit, Enter submits) with `A.validatePhone`, then busy →
  `withLatency(() => { A.sendCode(raw, 'tailor'); state.ui['t-code'] = {}; go('t-code'); })`.
- **States / FLOWS** (group `M2 · Tailor sign-up`):
  - `t-phone` ◆ · setup `A.signOut('tailor')` · expect `{ has: ['For tailors', 'Mobile number', 'Send code', 'six short steps'], sel: '#phone' }`
  - `t-phone--invalid` · setup `A.signOut('tailor'); S.state.ui['t-phone'] = { phone: '347555' }` · click `['[data-act="send-code"]']` · expect `{ has: 'Enter a 10-digit US number', sel: '#phone[aria-invalid="true"]' }`
  - `t-phone--saved` (NEW key, D-57) · setup `onboardTo('services'); A.signOut('tailor'); S.state.ui['t-phone'] = { saved: true, phone: NEW_TAILOR_PHONE }` · expect `{ has: ['Your progress is saved', NEW_TAILOR_PHONE], sel: '.banner--success' }`
- **Nav:** in from c-welcome "Are you a tailor?", the persona flip, Finish later, t-shop Sign out. Out → t-code, c-welcome.
- **c-welcome (one line, D-65):** under the legal line add t-small c-600 "Are you a tailor? <a data-act="tailor"
  data-hit="inline">Join Taily</a>" → `go('t-phone', { fresh: true })`. Add `'Join Taily'` to the `c-welcome` expect `has`.
  Integrator re-accepts its baseline.
- **Accept:** one filled CTA; persona `tailor`; no top nav; phone error under the field; the in-text links ≥ 44 px hit area.

### t-code — SMS code (tailor)

- **Focal / layout / states / copy:** identical to c-code (M1 §C1), calling every `A.*` with `'tailor'`. Title "Enter the code".
- **Wire on ok:** `r.isNew` → `go('to-profile', { fresh: true })` (the blank profile, D-20). Existing: `r.next === null` →
  `go('t-shop', { fresh: true })` (t-home from M3); else `state.ui.onboarding = { resumed: true }` and
  `go(ONBOARDING_STEPS.find(s => s.id === r.next).screen, { fresh: true })`. `no-code` → `go('t-phone')`.
- **FLOWS** (setup `X` = `A.signOut('tailor'); A.sendCode(NEW_TAILOR_PHONE, 'tailor')`):
  - `t-code` ◆ · setup `X` · expect `{ has: ['Enter the code', NEW_TAILOR_PHONE, 'Resend code in 0:30'] }`
  - `t-code--wrong` · setup `X; S.state.ui['t-code'] = { code: '000000' }` · click `['[data-act="verify"]']` · expect `{ has: 'Check your texts', sel: '#code[aria-invalid="true"]' }`
  - `t-code--expired` · setup `X; S.advanceClock(11)` · expect `{ has: 'This code expired', sel: '[data-act="resend"]:not([disabled])' }`
  - `t-code--resend` · setup `X; S.advanceClock(1)` · expect `{ has: 'Resend code', not: 'Resend code in', sel: '[data-act="resend"]:not([disabled])' }`
- **Nav:** Back / Change number → t-phone. Out → to-profile (new), the first incomplete step (resume), t-shop (live).

### to-profile — O1 Profile

- **Purpose:** who customers are booking. **Focal:** the "Your name" field (onboarding); in edit mode the same.
- **Layout:** header (§0) · `onboardingSteps('profile', done)` · [resume banner] · `headingRow('<h1 class="t-title">Your
  profile</h1>')` · t-body c-600 "This is the first thing customers see. Keep it short and personal." · 24 ·
  **photo row**: `avatar({ initials, photo: draft.photo, size: 'lg' })` + right of it `ctaSmall(draft.photo ? 'Change photo' :
  'Add a photo', { attrs: 'data-act="photo"' })` and t-small c-600 "Optional. Helps customers recognise you at the door." ·
  24 · `field({ id: 'name', label: 'Your name', autocomplete: 'name', helper: 'Customers see your full name.', error })` · 16 ·
  `field({ id: 'shopName', label: 'Business name (optional)', autocomplete: 'organization', helper: 'Shown under your name, like
  a shop sign.' })` · 16 · `textArea({ id: 'bio', label: 'About your work', max: BIO_MAX, rows: 4, helper: 'A line or two: what
  you’re best at and how you work.', error })` · 24 · t-small w-600 "Photos of your work (optional)" + a tile row of
  `photoTile('photo', { removable: true })` × `workPhotos` (each wrapped in a 44 px `data-act="work-remove"` button,
  aria-label "Remove photo n") + an add tile (`data-act="work-add"`, aria-label "Add a photo of your work") while
  < `WORK_PHOTOS_MAX`, caption "Up to 6. Before-and-after shots work well." (6 from the constant) · 32 ·
  `customerPreview({ html: <mini profile: avatar md + name (or "Your name" c-500) t-body w-600 + shopName t-small c-600 + bio,
  2-line clamp, t-small c-700> })` · action bar (§0).
- **Photo sheet:** `sheetOverlay` header "Add a photo", `confirm: false`, rows `listRow` "Take photo" / "Choose from library" /
  `cta('Cancel', secondary)` (c-job pattern); either sets `draft.photo = true`. Work add uses the same sheet (header "Add a
  photo of your work"), `workPhotos + 1`.
- **Initials:** from the draft name (first letters of the first two words, upper-case); updated in place in avatar + preview.
- **Errors → copy:** `name-required` "Enter your name as customers will see it." · `bio-required` "Write a line or two about
  your work." · `bio-long` "Keep it to 300 characters — you’re at <n>." (300 from `BIO_MAX`, n = length).
- **Save:** `T.setTailorSection('profile', { name, shopName, initials, bio, photo: draft.photo || null, workPhotos })`.
- **FLOWS** (group `M2 · Onboarding`):
  - `to-profile` ◆ · setup `onboardTo('profile')` · expect `{ has: ['Step 1 of 6', 'Your profile', 'Your name', 'About your work', 'What customers see', 'Finish later'], not: 'Save changes', sel: '#name' }`
  - `to-profile--errors` · setup `onboardTo('profile'); S.state.ui['to-profile'] = { draft: { name: '', shopName: '', bio: AMARA.bio.repeat(3), photo: false, workPhotos: 0 } }` · click `['[data-act="next"]']` · expect `{ has: ['Enter your name', 'Keep it to 300 characters'], sel: '#name[aria-invalid="true"]' }`
  - `to-profile--edit` (group `M2 · Shop`) · no setup (seed Amara, live) · expect `{ has: ['Your profile', 'Save changes', 'No changes yet', AMARA.name], not: 'Step 1 of 6', sel: '[data-act="save"][disabled]' }`
- **Nav:** onboarding: no Back (step 1); Next → to-services. Edit: Back → t-shop (leaveModal if dirty).
- **Accept:** counter updates live; preview updates live (name, business, bio); one filled CTA.

### to-services — O2 Services and prices

- **Purpose:** tick what she does and price it. **Focal:** the service list with the live "You get" under each price.
- **Layout:** header · stepper · [resume banner] · `headingRow('<h1 class="t-title">Services and prices</h1>')` · t-body c-600
  "Tick what you do and set your usual price. If a job turns out bigger at the fitting, you can adjust it — the customer
  approves first." · t-small c-600 "Under each price is what you take home after the Taily fee." · 24 · a row: t-caps c-600
  "Services" + right t-small c-600 "<n> selected" · [list error] · white card, rows separated by hairlines: one
  `serviceRow` per `SERVICES` id in catalog order (11, incl. Bridal): label `SERVICES[id].label`, caption = garment types
  joined " · " ("Suit Pant · Pants / Jeans"); `repair` (all types) → "Any garment" · 32 · `customerPreview({ title: 'On your
  profile', html: priceRow × the first 4 ticked (catalog order) + "+ n more" t-small c-600 })` · action bar; `lead`: "<n>
  services on your profile" (no money).
- **Behaviour:** ticking a row shows its price input and focuses it (not in `?test=1`); unticking removes the key from
  `draft.prices`. Typing updates `data-take` in place: `You get ${fmt(payoutFor({ services: cents(p) }))}` (hidden when the
  value is not a positive whole number). The counter and preview update in place.
- **Errors → copy:** `no-services` (under the "Services" row) "Pick at least one service you offer." · `price-missing` "Enter a
  price." · `price-invalid` `Enter a whole-dollar price up to ${fmt(cents(PRICE_MAX))}.`
- **Save:** `T.setTailorSection('services', { prices: draft.prices })` (replaces, A3).
- **FLOWS:**
  - `to-services` ◆ · setup `onboardTo('services'); S.state.ui['to-services'] = { draft: { prices: { 'hem-pants': AMARA.prices['hem-pants'], sleeves: AMARA.prices.sleeves, repair: AMARA.prices.repair } } }` · expect `{ has: ['Step 2 of 6', 'Services and prices', '3 selected', `You get ${fmt(payoutFor({ services: cents(AMARA.prices['hem-pants']) }))}`, 'Bridal gown alterations'], sel: '#price-hem-pants' }`
  - `to-services--missing-price` · setup `onboardTo('services'); S.state.ui['to-services'] = { draft: { prices: { 'hem-pants': null, sleeves: AMARA.prices.sleeves } } }` · click `['[data-act="next"]']` · expect `{ has: 'Enter a price', sel: '#price-hem-pants[aria-invalid="true"]' }`
  - `to-services--none` · setup `onboardTo('services')` · click `['[data-act="next"]']` · expect `{ has: 'Pick at least one service you offer', not: 'You get' }`
  - `to-services--resume` · setup `onboardTo('services'); S.state.ui.onboarding = { resumed: true }` · expect `{ has: ['Pick up where you left off', 'Profile is done', '5 steps to go'] }`
  - `to-services--edit` (group `M2 · Shop`) · no setup · expect `{ has: ['Services and prices', 'Save changes', '10 selected', `You get ${fmt(payoutFor({ services: cents(AMARA.prices['hem-pants']) }))}`] }`
- **Nav:** Back → to-profile. Next → to-where. Edit: Back → t-shop.
- **Accept:** every price input labelled; "You get" is the only money under a price, in dollars; no "%" anywhere; 44 px rows.

---

## C2. CLUSTER "Where + when" — `to-where`, `to-returns`, `to-availability`

### to-where — O3 Where you work

- **Purpose:** shop, home visits, or both; for home visits the ZIPs and the fee. **Focal:** the two switches (the decision);
  their details are progressive disclosure under each.
- **Layout:** header · stepper · [resume banner] · `headingRow('<h1 class="t-title">Where do you work?</h1>')` · t-body c-600
  "Turn on one or both. Customers only see the visit types you offer." · 24 ·
  **Shop card** (white card): `toggle({ id: 'shop-on', label: 'Customers come to my shop', helper: '30-minute visits at your
  shop.', checked })` (30 from `VISIT_MINUTES.shop`); when on, below a hairline: `field({ id: 'street', label: 'Shop street
  address', autocomplete: 'address-line1', error })` · 16 · `field({ id: 'shopZip', label: 'ZIP code', inputmode: 'numeric',
  maxlength: 5, autocomplete: 'postal-code', helper: '<hood>, Brooklyn, NY' or 'Brooklyn, NY', error })` · 16 ·
  **Home card**: `toggle({ id: 'home-on', label: 'I visit customers at home', helper: '60-minute visits at the customer’s
  place.' })`; when on: `zipList({ zips, input, inputError, error, suggestions: Object.keys(ZIP_INFO) })` + t-small c-600
  "Customers in these ZIP codes can book a home visit." · 16 · `field({ id: 'fee', label: 'Home-visit fee', prefix: '$',
  inputmode: 'numeric', helper: 'Added to every home visit and paid to you in full — Taily takes no fee on it.', error })` ·
  under it `customerPreview({ html: tailorRow caption line })`: fee > 0 → `Includes ${fmt(cents(fee))} home-visit fee`, fee 0
  → "No home-visit fee", empty → hidden (in place on input) · [where error under the two cards] · action bar.
- **Defaults (blank tailor, D-60):** shop on (fields empty), home off. Turning home on with an empty list adds a valid shop
  ZIP first (smart default). City/state are `SHOP_CITY`; `hood` from `ZIP_INFO` (blank when unknown).
- **ZIP add:** Add / Enter / a suggestion chip: not 5 digits → `inputError` "Enter a 5-digit ZIP code."; already listed →
  "<zip> is already on your list."; ok → appended, input cleared, focus stays in the input. Remove chip → removed.
- **Errors → copy:** `where-required` "Turn on your shop, home visits, or both." · `street-required` "Enter your shop’s
  street address." · `zip-invalid` (shopZip) "Enter a 5-digit ZIP code." · `zips-required` "Add at least one ZIP code." ·
  `fee-missing` "Enter your home-visit fee, or 0 for none." · `fee-invalid` `Enter a whole-dollar fee up to ${fmt(cents(FEE_MAX))}.`
- **Save:** `T.setTailorSection('where', { shop: { enabled, street, zip, hood, ...SHOP_CITY }, home: { enabled, zips, fee: Number(fee) } })`;
  if the shop is now off and `returns.pickup` is on → also `T.setTailorSection('returns', { returns: { pickup: false } })`
  (D-61; if that leaves no return option the tailor is no longer bookable and t-shop says so).
- **FLOWS** (seed draft `W` = `{ shop: { enabled: true, street: AMARA.shop.street, zip: AMARA.shop.zip }, home: { enabled: true, zips: [...AMARA.home.zips], fee: AMARA.home.fee } }`):
  - `to-where` ◆ · setup `onboardTo('where'); S.state.ui['to-where'] = { draft: W }` · expect `{ has: ['Step 3 of 6', 'Where do you work', 'Customers come to my shop', 'I visit customers at home', 'Williamsburg', `Includes ${fmt(cents(AMARA.home.fee))} home-visit fee`], sel: '#home-on[aria-checked="true"]' }`
  - `to-where--home-only` · setup `onboardTo('where'); S.state.ui['to-where'] = { draft: { ...W, shop: { enabled: false, street: '', zip: '' } } }` · expect `{ has: 'ZIP codes you cover', not: 'Shop street address', sel: '#shop-on[aria-checked="false"]' }`
  - `to-where--none` · setup `onboardTo('where'); S.state.ui['to-where'] = { draft: { shop: { enabled: false, street: '', zip: '' }, home: { enabled: false, zips: [], fee: null } } }` · click `['[data-act="next"]']` · expect `{ has: 'Turn on your shop, home visits, or both' }`
  - `to-where--zip-invalid` · setup `onboardTo('where'); S.state.ui['to-where'] = { draft: W, zipInput: '1121' }` · click `['[data-act="zip-add"]']` · expect `{ has: 'Enter a 5-digit ZIP code', sel: '#zip-add[aria-invalid="true"]' }`
  - `to-where--fee-missing` · setup `onboardTo('where'); S.state.ui['to-where'] = { draft: { ...W, home: { ...W.home, fee: null } } }` · click `['[data-act="next"]']` · expect `{ has: 'Enter your home-visit fee, or 0 for none', sel: '#fee[aria-invalid="true"]' }`
  - `to-where--edit` (group `M2 · Shop`) · no setup · expect `{ has: ['Save changes', AMARA.shop.street, '11237'], sel: '[data-act="save"][disabled]' }`
- **Nav:** Back → to-services. Next → to-returns. Edit: Back → t-shop.
- **Accept:** fields only under an ON switch; the fee preview reads exactly like the customer row caption; "%" nowhere.

### to-returns — O4 Return options

- **Purpose:** how finished orders get back. **Focal:** the three option rows.
- **Layout:** header · stepper · [banner] · `headingRow('<h1 class="t-title">How do orders get back?</h1>')` · t-body c-600
  "Pick every option you offer. The customer chooses one when the order is ready." · 24 · white card with three `checkRow`s
  (`id: 'ret-pickup' | 'ret-dropoff' | 'ret-courier'`, `attrs: 'data-act="ret" data-id="<key>"'`): `In-store pickup` caption "The customer collects it from your shop." — **disabled** with caption
  "Needs a shop. Turn it on in Where you work." when `!t.shop.enabled` (D-61) · `Home drop-off` "You bring it back to the
  customer’s door." · `Taily courier` "We send a courier. The customer pays for it — nothing comes out of your payout." ·
  [error under the card] · 24 · `customerPreview({ title: 'On your profile', html: 'Return options: ' + on labels joined " · " })`
  · action bar.
- **Defaults (blank tailor):** pickup = shop on, drop-off = home on, courier off.
- **Errors → copy:** `return-required` "Pick at least one way to get orders back." (`pickup-needs-shop` cannot be reached
  through the disabled row; map it to the same caption text if it ever appears.)
- **Save:** `T.setTailorSection('returns', { returns: draft })`.
- **FLOWS:**
  - `to-returns` ◆ · setup `onboardTo('returns')` · expect `{ has: ['Step 4 of 6', 'How do orders get back', 'In-store pickup', 'Home drop-off', 'Taily courier', 'nothing comes out of your payout'], sel: '#ret-pickup:checked' }`
  - `to-returns--none` · setup `onboardTo('returns'); S.state.ui['to-returns'] = { draft: { pickup: false, dropoff: false, courier: false } }` · click `['[data-act="next"]']` · expect `{ has: 'Pick at least one way to get orders back' }`
  - `to-returns--edit` (group `M2 · Shop`) · no setup · expect `{ has: ['Save changes', 'Taily courier'], sel: '#ret-courier:checked' }`
- **Nav:** Back → to-where. Next → to-availability. Edit: Back → t-shop.

### to-availability — O5 Availability

- **Purpose:** her usual week; split shop / home when she does both. **Focal:** the week list of the selected schedule.
- **Layout:** header · stepper · [banner] · `headingRow('<h1 class="t-title">When can customers book you?</h1>')` · t-body c-600
  "Set your usual week. Each request still needs your OK, and you have 2 hours to reply." (2 from `REQUEST_EXPIRY_H`) · 24 ·
  **both enabled:** `chipGroup({ name: 'sched', variant: 'segmented', value: seg, options: [{ value: 'shop', label: 'Shop',
  caption: '<n> days' }, { value: 'home', label: 'Home visits', caption: '<n> days' }] })` — a schedule with an error shows
  caption "Check hours" instead · 16 · t-small c-600 per schedule: shop "Shop visits are 30 minutes." / home "Home visits are
  60 minutes. Leave time to travel between them." · white card: 7 `dayHours` rows Mon→Sun (`DAY_KEYS`) for the visible
  schedule · [schedule-level error under the card] · action bar. **One schedule only** (shop or home): no segmented control,
  the card heading t-caps "Shop hours" / "Home-visit hours".
- **Defaults (blank tailor, D-62):** `DEFAULT_WEEK` for each enabled type. Turning a day on copies the nearest open day above
  it (else the type's first default window).
- **Time sheet:** a time button → `sheetOverlay(scheduler({ title: '<Day> · <opens|closes>', columns: timeColumns(label), cta:
  'Done', ctaAct: 'time-done' }), { header: 'Shop hours' | 'Home-visit hours', confirm: false })` → `readTime` → draft (as
  `HH:MM`). Wheels are 9 AM–9 PM on :00 / :30 already.
- **Errors → copy:** `hours-required` "Add at least one day of shop hours." / "…of home-visit hours." · `hours-range`
  "Closing time must be after opening time." · `hours-overlap` on BOTH rows: shop row "Overlaps your home-visit hours
  (<from> – <to>)." / home row "Overlaps your shop hours (<from> – <to>)." (the intersection, `timeLabel`). On a failed Next
  the segment holding the first error is selected.
- **Save:** `T.setTailorSection('availability', { availability: { shop: { tue: [['10:00', '18:00']], … }, home: {…} } })`
  (one window per open day, D-62; a disabled type saves `{}`).
- **FLOWS:**
  - `to-availability` ◆ · setup `onboardTo('availability')` · expect `{ has: ['Step 5 of 6', 'When can customers book you', 'Shop', 'Home visits', 'Tuesday', '10:00 AM', '6:00 PM'], sel: '.segmented' }`
  - `to-availability--single` · setup `onboardTo('availability'); S.T.setTailorSection('where', { home: { enabled: false } })` · expect `{ has: 'Shop hours', not: 'Home visits', sel: '[data-act="time"]' }`
  - `to-availability--empty` · setup `onboardTo('availability'); S.T.setTailorSection('where', { home: { enabled: false } }); S.state.ui['to-availability'] = { draft: { shop: {}, home: {} }, seg: 'shop' }` · click `['[data-act="next"]']` · expect `{ has: ['Add at least one day of shop hours', 'Closed'] }`
  - `to-availability--overlap` · setup `onboardTo('availability'); S.state.ui['to-availability'] = { draft: { shop: { thu: ['10:00', '16:00'] }, home: { thu: ['15:00', '20:00'] } }, seg: 'shop' }` · click `['[data-act="next"]']` · expect `{ has: ['Overlaps your home-visit hours', '3:00 PM'] }`
  - `to-availability--edit` (group `M2 · Shop`) · no setup · expect `{ has: ['Save changes', 'Saturday', '1:00 PM'], sel: '[data-act="save"][disabled]' }`
- **Nav:** Back → to-returns. Next → to-payouts. Edit: Back → t-shop.
- **Accept:** each time button ≥ 44 and labelled by its text + `aria-label="<Day> opens 10:00 AM"`; switch rows ≥ 44.

---

## C3. CLUSTER "Payouts + Shop" — `to-payouts`, `to-done`, `t-shop`, `t-rush`

### to-payouts — O6 Payouts

- **Purpose:** bank details, and an honest picture of the Taily fee before she goes live.
- **Focal:** the fee sentence card (onboarding); the bank fields in edit mode.
- **Layout:** header · stepper · [banner] · `headingRow('<h1 class="t-title">How you get paid</h1>')` · t-body c-600 "Taily pays
  you every Friday for the jobs you completed the week before." (D-24) · 24 · **fee card** (white, `--radius-lg`, padding 20):
  t-caps c-600 "The Taily fee" · 8 · `<p class="t-h2" data-money>On a $100.00 order, Taily keeps $10.00 and you get $90.00.</p>`
  (all three from §B "fee example") · 12 · t-small c-700 lines, each a `metaRow('✓', …)`: "The fee comes only from your
  service prices." · if home on: `Your ${fmt(cents(t.home.fee))} home-visit fee is yours in full.` · "Rush fees are yours in
  full." · "Customers pay for the courier. It never comes out of your payout." · 32 · `t-h2` "Your bank account" · 16 ·
  `field({ id: 'holder', label: 'Name on the account', autocomplete: 'name', value: draft.holder ?? t.name, error })` · 16 ·
  `field({ id: 'routing', label: 'Routing number', inputmode: 'numeric', maxlength: 9, helper: bank name when recognised
  (ROUTING_BANKS) else '9 digits, on the bottom left of a check.', error })` · 16 · `field({ id: 'account', label: 'Account
  number', inputmode: 'numeric', maxlength: 17, helper: edit ? 'Leave blank to keep the account ending <last4>.' : '4 to 17
  digits.', error })` · 12 · t-small c-600 "Only the last 4 digits are shown in the app." · action bar: onboarding
  `ctaLabel: 'Finish and go live'`, `busyLabel: 'Setting up payouts…'`; edit `Save changes`.
- **Edit mode extra:** above the fields, `listRow({ title: '<bank> ••<last4>', sub: 'Paid every Friday', chevron: false })`.
- **Errors → copy:** `holder-required` "Enter the name on the account." · `routing-invalid` "Enter the 9-digit routing number." ·
  `account-invalid` "Account numbers are 4 to 17 digits."
- **Save:** `T.setPayouts(draft)`; onboarding ok → `r.live` → `go('to-done', { fresh: true })`; not live (a step left
  incomplete) → go to `nextSection()`'s screen with the resume banner.
- **FLOWS:**
  - `to-payouts` ◆ · setup `onboardTo('payouts')` · expect `{ has: ['Step 6 of 6', 'How you get paid', `On a ${fmtExact(cents(MONEY.FEE_EXAMPLE_SERVICES))} order, Taily keeps ${fmtExact(tailyFeeFor(cents(MONEY.FEE_EXAMPLE_SERVICES)))} and you get ${fmtExact(payoutFor({ services: cents(MONEY.FEE_EXAMPLE_SERVICES) }))}`, `Your ${fmt(cents(AMARA.home.fee))} home-visit fee is yours in full`, 'Finish and go live'] }`
  - `to-payouts--invalid` · setup `onboardTo('payouts'); S.state.ui['to-payouts'] = { draft: { holder: '', routing: '02100', account: '12' } }` · click `['[data-act="next"]']` · expect `{ has: ['Enter the name on the account', 'Enter the 9-digit routing number', 'Account numbers are 4 to 17 digits'], sel: '#holder[aria-invalid="true"]' }`
  - `to-payouts--edit` (group `M2 · Shop`) · no setup · expect `{ has: ['Save changes', `${AMARA.payouts.bank} ••${AMARA.payouts.last4}`, 'Leave blank to keep'] }`
- **Nav:** Back → to-availability. Finish → to-done (fresh). Edit: Back → t-shop.
- **Accept:** the sentence is the only `t-h2` money on screen; zero "%"; all three amounts derive from money fns.

### to-done — You’re bookable

- **Purpose:** the payoff — she is live, sees herself as customers do, knows what happens next.
- **Focal:** the customer preview of her tailor row.
- **Layout:** `statusBar()` only (padding-top `calc(44px + var(--space-32))`) · a 56 px circle `--success-bg` with an ink ✓
  (aria-hidden) · 16 · `<h1 class="t-display">You’re bookable</h1>` · t-body c-600 "Customers near you can find you and send
  requests now. We’ll text you each one — you have 2 hours to reply." · 24 · `customerPreview({ title: 'How a customer in
  <hood> sees you', html: tailorRow(…) , caption: 'Example job: <garment types joined " · "> · <VISIT_LABEL.tailor[visitType]>' })`
  (row from §B on `state.job`; hood `ZIP_INFO[state.job.zip].hood`). No row (her area / hours don't fit the demo job) →
  mini profile (as to-profile) + caption "Your estimate shows when a customer picks something you price." · 32 · `t-h2` "What
  happens next" · three numbered lines (t-body; numbers in 28 px circles, `--neutral-100`): "A customer sends a request with
  their garments and a time." · "Accept, suggest another time, or decline." · "After the fitting you can adjust the price. The
  customer approves it before you start." · 16 · t-small c-600 "Want extra for quick turnarounds? Add rush fees in your
  shop." · `actionBar({ ctaLabel: 'Go to my shop', ctaAct: 'shop', secondaryLabel: 'See my profile as a customer',
  secondaryAct: 'as-customer' })`.
- **Wire:** shop → `go('t-shop', { fresh: true })`; as-customer → `state.ui.booking = { tailorId: MY_TAILOR_ID }`,
  `go('c-tailor')` (persona flips to customer, D-65).
- **FLOWS:**
  - `to-done` ◆ · setup `onboardTo('done')` · expect `{ has: ['bookable', 'How a customer in Williamsburg sees you', `Est. ${fmt(SCENARIOS.seed.total)}`, 'What happens next', 'Go to my shop'], sel: '.customer-preview .tailor-row' }`
- **Accept:** one filled CTA; the preview row is inert (not focusable); the estimate equals what c-tailors shows Sarah.

### t-shop — T7 Shop

- **Purpose:** every onboarding section at a glance, each editable; rush fees. **Focal:** the "What customers see" row.
- **Layout:** `chrome('shop', { persona: 'tailor' })` · `headingRow('<h1 class="t-title">Your shop</h1>')` · status line:
  bookable → a success chip "● Bookable" (`statusPill`-style, `--success-bg`, t-small w-600) + t-small c-600 "Customers can
  find and book you." · not bookable → `banner({ tone: 'warning', title: 'Customers can’t book you right now', text: 'Finish
  <label> to show up again.', actionLabel: 'Fix it', actionAct: 'fix' })` (fix → that section's screen) · 24 ·
  `customerPreview({ title: 'What customers see', html: tailorRow(…), caption: 'For the sample job: <garments> · <visit>' })`
  (same as to-done; none → mini profile) · 32 · `t-h2` "Your setup" · white card of `listRow`s (`act: 'edit' data-id`, via
  `data-act="edit-<id>"`), title = label, sub = summary:
  | row | sub (seed reads) |
  |---|---|
  | Profile | `Amara Reyes · Reyes Tailoring` (`name · shopName`, or name only) |
  | Services and prices | `10 services · $20 to $65` (count · `fmt` of min to max; one price → "1 service · $25") |
  | Rush fees | `rushLadder`-short: `1 day +$40 · 2 days +$25 · 3 days +$15`, or "Off — add a fee for quick turnarounds" |
  | Where you work | `Shop on 312 Metropolitan Ave · Home visits in 4 ZIP codes, $35 fee` (only the parts on) |
  | Return options | `In-store pickup, home drop-off, Taily courier` |
  | Availability | `Shop 5 days · Home visits 3 days` |
  | Payouts | `Chase ••6789 · paid Fridays` |
  An incomplete section's row shows `right: '<span class="c-error t-small w-600">Needs attention</span>'`. · 32 ·
  `cta('Sign out', { variant: 'secondary', attrs: 'data-act="sign-out"' })` (→ `A.signOut('tailor')`, `go('t-phone', { fresh: true })`).
- **Wire:** each edit row → `delete state.ui['<screen>']` then `go('<screen>')` (to-* in edit mode, or `t-rush`).
- **FLOWS** (group `M2 · Shop`):
  - `t-shop` ◆ · no setup · expect `{ has: ['Your shop', 'Bookable', 'What customers see', `Est. ${fmt(SCENARIOS.seed.total)}`, 'Reyes Tailoring', `1 day +${fmt(cents(AMARA.rush[0].fee))}`, `${AMARA.payouts.bank} ••${AMARA.payouts.last4}`] }`
  - `t-shop--incomplete` (NEW key, D-56) · setup `S.T.setTailorSection('availability', { availability: { shop: AMARA.availability.shop, home: {} } })` · expect `{ has: ['Customers can', 'Finish Availability', 'Needs attention'], not: 'Est.', sel: '.banner--warning' }`
- **Nav:** top nav Shop (active). In from to-done, t-code (live), every save. Out → each section, t-rush, t-phone.
- **Accept:** every row ≥ 56 and a real button; summaries are dollars; the preview equals Sarah's row.

### t-rush — T7 Rush fees editor

- **Purpose:** charge for quick turnarounds, on her terms. **Focal:** the three tier fields.
- **Layout:** `chrome('shop', { persona: 'tailor' })` · `headingRow(backButton() + '<h1 class="t-title">Rush fees</h1>')` · t-body
  c-600 "Charge extra when a customer needs it back soon after the visit. 4 days or more is always free." · 24 ·
  `toggle({ id: 'rush-on', label: 'Charge rush fees', checked: draft.on })` · when on, a white card: three `field`s
  `id: 'rush-1' | 'rush-2' | 'rush-3'`, labels "Ready within 1 day of the visit" / "Within 2 days" / "Within 3 days",
  `prefix: '$'`, `inputmode: 'numeric'`, error under each · a static row "4 days or more" + right "No rush fee" (c-600) · 12 ·
  t-small c-600 "Rush fees are yours in full — Taily takes no fee on them." · 24 · `customerPreview({ html: '<p class="t-small
  w-600 c-700">Rush fees</p>' + rushLadder(draftLadder) })` (in place on input) · `actionBar({ ctaLabel: 'Save rush fees',
  ctaAct: 'save', disabled: !dirty, note: dirty ? '' : 'No changes yet.', busyLabel: 'Saving…' })`.
- **Draft:** `{ on, fees: { 1: '40', 2: '25', 3: '15' } }` (strings as typed) from `t.rush` (missing tier → `''`; empty
  ladder → `on: false` with blank fields).
- **Errors → copy:** `fee-missing` "Enter an amount, or 0 for no fee." · `fee-invalid` `Enter a whole-dollar amount up to
  ${fmt(cents(RUSH_MAX))}.` · `fee-order` `Can’t be more than your ${n-1}-day fee (${fmt(cents(prev))}).` ("1-day", "2-day").
- **Wire:** save → `T.setRush(draft)` → errors re-render / ok → `back() || go('t-shop')`, `toast('Rush fees saved', { tone:
  'success' })`. Own `.back`: dirty → `modalOverlay(leaveModal({ body: 'Your rush fee changes will be lost.' }), { dataS:
  't-rush-unsaved' })` — keep-editing closes; discard clears `state.ui['t-rush']` and leaves.
- **FLOWS** (group `M2 · Shop`):
  - `t-rush` ◆ · no setup · expect `{ has: ['Rush fees', 'Ready within 1 day of the visit', '4 days or more', 'yours in full', `+${fmt(cents(AMARA.rush[0].fee))}`], sel: '#rush-1' }`
  - `t-rush--invalid` · setup `S.state.ui['t-rush'] = { draft: { on: true, fees: { 1: String(AMARA.rush[2].fee), 2: String(AMARA.rush[0].fee), 3: '' } } }` · click `['[data-act="save"]']` · expect `{ has: [`more than your 1-day fee (${fmt(cents(AMARA.rush[2].fee))})`, 'Enter an amount, or 0 for no fee'], sel: '#rush-2[aria-invalid="true"]' }`
  - `t-rush--unsaved` O · setup `S.state.ui['t-rush'] = { draft: { on: true, fees: { 1: String(AMARA.rush[0].fee + 10), 2: String(AMARA.rush[1].fee), 3: String(AMARA.rush[2].fee) } } }` · click `['.back']` · expect `{ has: ['Leave without saving', 'Keep editing', 'Discard changes'], sel: '[role="alertdialog"]' }`
- **Accept:** fields only when on; the preview reads exactly like the c-tailor ladder; Save disabled until a change.

---

## D. INTEGRATION (Integrator)

1. Register the 11 screens in `app.js` `SCREEN_MODULES` (M2 block); link their CSS in `index.html`.
2. `SCREENS.md` + `js/inventory.js` (`node scripts/v5/lib/gen-inventory.mjs`): add **`t-phone--saved`** (M2, state) and
   **`t-shop--incomplete`** (M2, state) (D-57, D-56).
3. `c-welcome` baseline changes (the "Join Taily" line) — re-accept it; check the c-tailor ladder is pixel-identical if its
   builder switched to `rushLadder`.
4. Update `docs/v5/CONTEXT.md`: model list (`setPayouts setRush validateRush nextSection`, `live`), `account.js` `who`
   param, `onboardTo`, the new components (§A6).
5. Journey check (add to the journeys script if it has a hook, else verify by hand): `onboardTo('done')` → `tailorsFor(state.job)`
   has one row with `quote.total === SCENARIOS.seed.total`; `onboardTo('services')` → `tailorsFor(state.job).empty === 'zip'` (D-27).
6. `npm run check` green; accept new baselines.

## E. Acceptance checklist (every M2 screen; reviewers use this)

- One focal element; one filled CTA; persona `tailor` (to-done's secondary flips to customer on purpose).
- Onboarding mode: "Step n of 6 · <label>", Finish later, Next; edit mode: Shop nav active, Back, "Save changes" disabled
  until dirty, success toast on save, leave-without-saving on a dirty Back.
- Every field has a visible label; errors appear only after Next / Save, under their field, focus on the first.
- Every price the tailor types shows "You get $…" (services) or "yours in full" (home-visit, rush) — dollars only, no "%".
- Each "What customers see" preview uses the customer component and matches what Sarah sees.
- 44 px targets (switch rows, chips, time buttons, ZIP chips, remove buttons, Finish later); reduced motion respected;
  `withLatency` busy states on Next / Save / Send code / Verify.
