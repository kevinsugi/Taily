# M6 fixlist (design-director triage)

Source: the M6 audit (customer C, tailor T, model/money M, accessibility A, cross-cutting X, carried-over P3 P).
Rules applied: one item per root cause (merged ids are listed on the item); every P0–P2 accepted unless it contradicts
MASTER-PLAN §2 / DECISIONS / K-01; P3 accepted when cheap and it improves consistency. Money stays in dollars, from
`js/money.js` / `SCENARIOS`, never typed. Next free decision number at triage: **D-154**. The audit's own proposed
numbers (several "D-154", "D-155" …) collide, so they are **renumbered below**. Use these numbers.

## Decision numbers assigned

| D | item | what it decides |
|---|---|---|
| D-154 | X-01 (+T-14, P-25) | A suggested time lapses: at min(suggested start − `MIN_LEAD_H`, suggested-at + `POLICY.SUGGEST_EXPIRY_H` 24). The tailor can withdraw it. Either way the hold is released and the request ends as a final expiry |
| D-155 | T-01 | Amends D-25: on suggest / reschedule, rush = min(booked rush, rush for the new slot). The price never goes up and never charges rush for non-rush work |
| D-156 | M-01 (+M-03, X-06) | A refund below the deposit (D-23) is *pending* at Ready, re-priced by `chooseReturn`, and settled ("Refunded") by `payBalance`. A $0 balance reads "Nothing to pay" and its CTA is "Confirm and get $X back" (amends D-29) |
| D-157 | M-04 (+X-05, M-10) | Late cancel stays deposit-only: no second charge, and the kept deposit goes to the tailor (D-05). The CORE-JOURNEY rows (late cancel, deposit base) are corrected to match §2 and the code. §2's parenthetical is left for Kevin |
| D-158 | C-01 | After a request is sent the booking draft resets (`newJob()`, keeping zip / address / visitType). c-tailors captions a tailor you already have a booking with |
| D-159 | T-09 | Amends D-74: the tailor sees the full name once ANY appointment of the pair was accepted (the `threadCustomerName` rule). The address stays per appointment (D-88) |
| D-160 | T-12 | Amends D-106: on the tailor side the courier card shows the pickup window, from → to and "Paid by Sarah", with no customer money. "Handed to courier" marks the job completed |
| D-161 | T-13 | Shop gets a "Taking requests" toggle. Off makes `eligible()` return `nothing-open`; existing jobs are untouched |
| D-162 | X-16 | Contact info is masked on the tailor's bio and shop name at save |
| D-163 | A-03 (+A-05, A-07, A-17, A-22) | Text-ink tokens `--neutral-500-ink` `--error-ink` `--success-ink`. The plain tokens stay for glyphs and strokes; control boundaries use `--neutral-500` |
| D-164 | T-02 (+P-02) | topNav count badges (closes D-128's deferral) |
| D-165 | T-05 | Amends D-137: one tailor breakdown order everywhere (Services, Taily fee "On the $X of services only", Home-visit fee, Rush fee, total) |
| D-166 | C-04 | Booking steps = What needs work / Where and when / Choose a tailor / Pick a time / Review and send. c-tailors and c-tailor share step 3 |
| D-167 | X-02 | The in-app push notification card for a new request (tailor) |
| D-168 | C-02 | Customer Home leads with the active appointment card when one exists; the wizard follows under "Book something else" |
| D-169 | C-18 (+T-03) | From the fitting onward the past visit time is demoted on both sides. The tailor's job leads with the due (need-by) date and Home sorts In progress by due date |
| D-170 | P-28 | Amends D-106: the customer word for returning · drop-off is "Drop-off" (short) / "Coming to you" (detail), not "Return scheduled" |
| D-171 | P-37 | Amends D-129 / D-149: a thread header sub carries the countdown only, never the word in the context pill |
| D-172 | T-06 (+M-02, M-09) | Tailor money words: per-job figure = "You take home"; "payout" = the bank transfer only; payout states = Pending ("Arrives <Fri>") / Paid ("Paid <Fri>") / Didn't go through |
| D-173 | T-15 | Visit block gets Directions (home visits) and Add to calendar |
| D-174 | P-34 | Non-destructive confirm sheets have ✕ plus one primary, with no "Not yet". Destructive sheets keep D-79 (danger + "Keep …") |

---

## Accepted items

Ordered by batch (the build order). **Merged:** lists the duplicate ids folded into the item.

### Batch 1: Model and money (state.js, money.js, money-config.js, tailor-data.js, focus.js, fixtures, model test, docs)

| id | P | fix |
|---|---|---|
| M6-X-01 (merged: M6-T-14 model, M6-P-25 model) | P0 | Log **D-154**. Add `POLICY.SUGGEST_EXPIRY_H: 24` to money-config. `suggestLapseAt(a) = min(toDate(a.suggested.start) − MIN_LEAD_H h, a.suggested.at + SUGGEST_EXPIRY_H h)` (store `suggested.at` in `tailorSuggest`). (1) `acceptSuggestion` returns `fail('slot-passed')` when `now >= suggestLapseAt(a)`. (2) In `tick()`, a `suggested` appointment past that point becomes `expired`: `retries = MAX` (final), `payments.deposit.state = 'released'`, slot hold cleared, and `say(a, 'Amara’s suggested time passed', 'Your suggested time passed')`. Bookings, `threadAppt` and `isFinalExpiry` then treat it as Past. (3) New `T.withdrawSuggestion(id)` (tailor; only from `suggested`) has the same outcome with the line "Amara withdrew her suggested time" / "You withdrew your suggested time". (4) Model-test: after lapse, accept fails, deposit released, slot back in `openSlots`; the same after withdraw |
| M6-M-01 | P0 | Log **D-156**. `markReady`: `a.payments.refund = { cents: a.money.refund, state: 'pending' }` when > 0. `chooseReturn`: after `repriceMoney`, set `payments.refund.cents = a.money.refund` and delete the entry at 0. `payBalance` success: `payments.refund.state = 'refunded'` when cents > 0. `customerBreakdown` refund row status: "After you choose" (pending) / "Refunded". Add `SCENARIOS.priceBelowDeposit` (shop visit, one line repriced so total < deposit) and a model-test that refund + courier nets `deposit + balance − refund === money.total` |
| M6-T-01 (model) | P1 | Log **D-155** (amends D-25). `tailorSuggest` stores `suggested.rush = min(a.money.rush, rushFor(tailor, slot, needBy).cents)`; `acceptSuggestion` and `rescheduleBooking` apply `min(booked rush, rush for the new slot)` through `repriceMoney`. The deposit is unchanged (it excludes rush). Model-test both directions from the audit: seed → Oct 22 7 PM stays $0 rush; an Oct 22 request → Oct 15 drops to $0 rush, with the total and balance lower |
| M6-M-04 (merged: M6-X-05, M6-M-10) | P1 | Log **D-157** DEFAULTED (deposit-only; overrule = keep max(deposit, home fee) on a late home-visit cancel). Edit CORE-JOURNEY: the late-cancel row becomes "Within 24 hours of the visit the deposit is kept and paid to the tailor". The deposit row becomes "Deposit: 10% of services + home-visit fee (not rush or courier), held at request, charged when the tailor accepts". Do NOT edit MASTER-PLAN §2 (locked); D-157 records that its "(covers the non-refundable home-visit fee)" is descriptive and is flagged for Kevin. `to-where.js` `FEE_HELP` → "Added to every home visit and paid to you in full. If a customer cancels within 24 hours, you keep their deposit instead." |
| M6-C-01 (model) | P1 | Log **D-158**. In `requestBooking`, on success, `state.job = newJob()` keeping `zip`, `address` and `visitType`. `restoreDraft` already restores the job on decline, expiry and cancel; verify with a model-test that a declined request restores it |
| M6-T-09 | P2 | Log **D-159** (amends D-74). `customerName(appt)` returns the full name when any appointment of the pair was ever accepted (reuse `threadCustomerName`'s rule). `jobAddress` stays per appointment (D-88) |
| M6-M-11 | P3 | `money.js cancelTerms`: `hoursAhead >= POLICY.CANCEL_WINDOW_H` (the "until" is inclusive). Apply the same edge to the reschedule rule |
| M6-X-16 | P3 | Log **D-162**. `validateSection('profile')`: store `maskContact(bio).text` / `maskContact(shopName).text` and return soft code `contact-hidden`. to-profile shows "Phone numbers and emails are hidden on your profile." under the field (composer hint pattern) |
| M6-P-17 | P2 | `state.js` threadPreview (≈L156): `.replace(/\[(phone\|email) hidden\]/g, '($1 hidden)')`. Update any messages-row expect that asserts the old string |
| M6-M-14 (model part) | P3 | Add `returnStep(appt, persona)` to `focus.js`, returning the D-106 / D-170 step word ("Ready for pickup", "To drop off" / "Drop-off", "Courier booked" / "Out for delivery"), for t-home rows (Batch 4) |

### Batch 2: Shared components, CSS, router, accessibility (components.js, components-v5.css, components.css, base.css, tokens.css, icons.js, scheduler.js, system.js, app.js)

| id | P | fix |
|---|---|---|
| M6-A-01 | P1 | `width: 390px` → `width: 100%; max-width: 390px` on `.stage .screen .status-bar .top-nav` (base.css), `.action-bar .ob-bar .sys-banner` (components-v5.css), `.c-thread__foot` / `.t-thread__foot`. `.modal--leave/--push/--confirm`: `left/right: var(--space-20); width: auto`. Garment grid (components.css ≈284): `repeat(3, minmax(0, 1fr))`. `@media (max-width: 359px) { .top-nav__links { gap: 0 } .top-nav__link { padding-inline: var(--space-4) } }` plus a smaller logo. `.c-tailor__work { overflow-x: auto }`. The 390 baselines must not change |
| M6-A-03 (merged: M6-A-17, M6-A-22) | P1 | Log **D-163**. Add `--neutral-500-ink: #6E665A` to tokens.css. Switch every TEXT `color: var(--neutral-500)` in components.css / components-v5.css (37 declarations) to it, and keep `--neutral-500` for glyphs and strokes. Wheel edge rows (`.wheel__row--edge`) → `--neutral-500`; near rows → `--neutral-500-ink`. `.field__input::placeholder` and `.composer__input::placeholder` → `--neutral-500-ink` |
| M6-A-05 | P2 | D-163: add `--error-ink: #9A4632` and `--success-ink: #456E50`. Use them for `.banner--error` text and action, `.trust-badge`, `.tailor-row__chip` and `.t-shop__chip` text; keep `--error` / `--success` for icons and strokes |
| M6-A-07 | P2 | D-163: control boundaries `box-shadow: inset 0 0 0 1px var(--neutral-500)` on `.field__box`, `.composer__input` and `.check-row__box`. `.toggle::before` off track and empty `.stars--input .stars__star` → `--neutral-500`. `--neutral-200` stays for dividers only |
| M6-A-06 | P2 | Remove `opacity: .7` from `.chip-group__caption`. `.segmented__opt .chip-group__caption { color: var(--neutral-600) }`, `.segmented__opt.is-selected .chip-group__caption { color: var(--neutral-300) }` |
| M6-A-10 | P2 | `statusHero` emits `<h1 class="status-hero__title">` (styled by class, so there is no visual change). Drop t-payout's sr-only h1 if the hero now supplies one. Every screen must end with exactly one h1 |
| M6-A-04 | P1 | (after A-10) `announce()`: name = first `h1` text, else the entry title; `#route-status` = name; `document.title = name + ' · Taily'`. In `render()`, on a screen change with no overlay open: `h1.tabIndex = -1; h1.focus({ preventScroll: true })`. Add `.body h1:focus { outline: none }` |
| M6-A-08 | P2 | Wherever an `.action-bar` renders (router post-render), set `--bar-h` = `bar.offsetHeight + 16px` on `:root`. `html:has(.action-bar) { scroll-padding-bottom: var(--bar-h) }`; `.body--with-bar { padding-bottom: calc(var(--bar-h) + var(--space-24)) }` |
| M6-A-09 | P2 | `sheet()`: title gets `id="sheet-title-<seq>"` and `.sheet` gets `aria-labelledby`. A headerless sheet points at its first h2, else takes an `ariaLabel` option on `sheetOverlay` |
| M6-A-11 | P2 | `wireChipGroups` (single-select) and a new shared `wireRadioRows` for `optionRow` inside `role="radiogroup"`: roving tabindex (checked, or first = 0, rest −1). Arrow keys move focus and selection and dispatch the existing `chip` / option event |
| M6-A-12 | P2 | `wireWheel`: on a click on a `.wheel__row`, find its index, `markWheelRow(col, idx)`, `scrollTo` (smooth unless reduced motion), `onChange?.()`; set the same `keyed` guard as keydown. Rows min-height 44 px |
| M6-A-14 | P2 | `toast()` default `ms = action ? 5000 : tone === 'error' ? 6000 : 4000`. The c-addresses / c-price-change / c-booking failure cases also get an inline error banner (see Batch 3) |
| M6-A-15 | P2 | `timeline()` → `<ol class="timeline">` / `<li class="step">`, `.step__dot aria-hidden="true"`, sr-only "Done: " / "Now: " / "Next: " before the title, and `aria-current="step"` on the current one |
| M6-A-18 | P3 | Router: insert the system banner after `.top-nav` (`el.querySelector('.top-nav')?.insertAdjacentHTML('afterend', sys) ?? el.insertAdjacentHTML('afterbegin', sys)`) |
| M6-A-21 | P3 | In components-v5.css's reduced-motion block: `.tailor-row:active { transform: none; }` |
| M6-C-22 (merged: M6-T-17, M6-P-10, M6-A-19) | P2 | `icons.js`: redraw `PILL_ICONS.tailoring` as scissors (no diagonal through a ring), same stroke as the other pill icons. Strip all `id` attributes and the `clipPath`/`defs` from every statusPill SVG string. Check in the sys-components gallery and re-accept pill baselines |
| M6-C-25 (merged: M6-P-13) | P2 | `.sheet__close`: `justify-content: center` (keep the optical gutter with `margin-left: -12px`). Replace the 52 px ring with `:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px }`, and no ring on programmatic focus |
| M6-C-15 (merged: M6-P-31) | P2 | `.change-list__row--added`: remove the negative `margin-inline`, keep `padding-inline: var(--space-12)`, `border-radius: var(--radius-sm)`. The tint aligns with the New-item panel at x = 20 |
| M6-P-08 | P2 | `.money-rows { box-shadow: inset 0 0 0 1px var(--neutral-200); }`. Re-accept baselines on both personas |
| M6-T-02 (merged: M6-P-02) | P1 | Log **D-164**. `topNav(active, items, { badges })`: when count > 0, an 8 px `--accent-base` dot after the label plus `<span class="sr-only">, n unread</span>` (or ", n new"). `chrome()` computes it. Tailor home = `inbox().requests.length` + price-change replies waiting on her; tailor messages = Σ `unreadCount(tailorId,'tailor')` over `threadsFor('tailor')`. Customer messages = Σ customer unread; customer bookings = appointments whose `statusWord(a,'customer').pill === 'action'`. Add to the gallery |
| M6-T-05 | P2 | Log **D-165** (amends D-137). `tailorBreakdown(q)`: the default order is Services, Taily fee (caption `On the ${fmtExact(services)} of services only`), Home-visit fee, Rush fee, total. Remove the `feeAfterServices` option and update its callers |
| M6-M-07 | P2 | `tailorRow`: one caption, "Includes $35 home-visit fee and $40 rush fee" / "Includes $40 rush fee" / "Includes $35 home-visit fee" (amounts via `fmt`), with no "+" |
| M6-C-04 | P2 | Log **D-166**. `BOOKING_STEPS = ['What needs work','Where and when','Choose a tailor','Pick a time','Review and send']`. c-tailors and c-tailor → `bookingSteps(2)`, c-book → `(3)`, c-pay → `(4)` |
| M6-P-07 (merged: M6-P-23) | P2 | `workList(v, { final, estimateLabel })`: `final` drops the estimate row and the at-fitting caption; `estimateLabel: null` drops the estimate/total row. t-request and t-job pass `final: TERMINAL.includes(a.status) \|\| a.status === 'expired'`, and pass `estimateLabel: null` wherever `tailorBreakdown` follows on the same screen |
| M6-P-09 | P2 | `courierCard` state `failed`: error glyph before the title, title `color: var(--error-ink)`, keep `role="alert"` |
| M6-C-12 (merged: M6-P-19) | P2 | `.scheduler__note`: build it as `<span class="t-caps">Label</span> <span class="t-small w-600">${fmtWhen(iso)}</span>` (value in sentence case). Used by t-suggest ("Sarah sees") and the c-booking reschedule ("New time"). The c-booking reschedule's "Now:" → "Booked for <time>". `.t-suggest__sched[inert] { opacity: .5 }` (transition only outside reduced motion) |
| M6-C-20 (merged: M6-P-20) | P3 | `scheduler`: when `compact` and the selected row is index 0, render the blank lead row at half height (or `.scheduler--compact` top padding `--space-12`). c-book passes `title: ''` and `compact: slots.length <= 3` |
| M6-P-38 | P3 | `openAttachSheet` note: `Show ${peer} the garment. Up to ${CHAT_LIMITS.PHOTOS_MAX} per message.`; mirror it in gallery.js (≈L407) |
| M6-P-41 | P3 | `.thread-head + .thread-context { margin-top: var(--space-12) }`; context row → privacy note `var(--space-8)` |
| M6-P-42 | P3 | `text-wrap: pretty` on `.c-messages__sub`, `.t-messages__sub`, `.attach-sheet__note` and the `.sys-banner` body |
| M6-P-44 | P3 | chatBubble Retry button: `padding-block: 12px; margin-block: -12px` (44 px target, no added height) |
| M6-X-02 | P2 | Log **D-167**. `system.js pushBanner({ title, body, act: 'push-open' })`: a 390-wide card over the status bar, a `<button>` that calls `setFocus(id)` → `go('t-request')`, auto-dismisses after 6 s, respects reduced motion. Fire it on the tailor persona when a request is created and `sim.push === 'granted'`. Copy: "New request · Sarah C." / "Home visit Thu, Oct 15 · You take home $147.50 · 2h to reply" (from `requestView`). Flow `t-home--push` (expect `[data-act="push-open"]` has `fmtExact(SCENARIOS.seed.payout)`); add to SCREENS.md and regenerate inventory |

### Batch 3: Customer screens (js/screens/c-*.js + css, own FLOWS)

| id | P | fix |
|---|---|---|
| M6-M-03 (merged: M6-X-06) | P1 | c-ready when `a.money.balance === 0`: CTA `a.money.refund > 0 ? \`Confirm and get ${fmtExact(refund)} back\` : 'Confirm'`, skip the pay sheet and call `T.payBalance` directly; balance status "Nothing to pay". Hero body: "Amara finished the work. Your final total is less than your deposit, so $X comes back to your card." Toast (success): `${fmtExact(refund)} is on its way back to your card.` Flow `c-ready--refund`: `driveTo('fitting', { visitType: 'shop' })`, send `SCENARIOS.priceBelowDeposit` lines, approve, `markReady`. Add to SCREENS.md |
| M6-X-01 (screen) (merged: M6-P-25 copy) | P0 | c-request suggested: under the focal card a t-small c-600 line "Amara is holding this time until <fmtWhen(suggestLapseAt)>". When lapsed or withdrawn, the D-94 lapsed pattern: "Amara's suggested time has passed. Your hold is released." (or "Amara withdrew her suggested time…"), primary "Find another tailor", secondary "Message Amara". A tap that races the lapse shows `ERRORS['slot-passed']`. Flow `c-request--suggested-passed` |
| M6-C-01 (screen) | P1 | c-tailors: when the customer has an active appointment with a tailor, caption that row "You have a booking with Amara on Thu, Oct 15" (`fmtDay`) |
| M6-C-02 | P1 | Log **D-168**. c-job: when `activeAppt()` exists, render one `apptRow` above `bookingSteps(0)` with `statusWord(a,'customer')` pill, amount and an action-tone caption ("Pay now" / "Approve order" / "New time"). Tap → `setFocus` + `go(statusScreen(a,'customer'))`. Then a t-caps "Book something else" label above the stepper. Flow `c-job--active` |
| M6-C-03 | P1 | c-name lead: "Tailors see your first name and last initial until they accept your request, then your full name and address." |
| M6-A-02 | P1 | c-welcome: `.c-welcome__tailor { display: block; margin-top: var(--space-20); }`. Verify every point on "Terms" fires `data-act=terms` |
| M6-C-05 | P2 | c-book: ctaLabel "Next: review and send"; lead `Est. ${fmt(total)} · ${n} items` (same as c-tailor). Use "review and send" to match the D-166 step name |
| M6-C-06 | P2 | c-pay: under "Your visit", add the "Your order" block (the c-booking in-progress `changeList` 'same' rows, `fmtExact`). Keep the Services subtotal row in Price |
| M6-C-08 | P2 | c-booking confirmed timeline (≈L138): add `{ state: 'todo', title: 'Back with you' }`, so every state has 5 steps |
| M6-C-09 | P2 | "Find another tailor" everywhere: c-request.js ≈163 / 165 / 174 and c-booking.js ≈100 / 103 (and the D-94 lapsed block). Update expects |
| M6-C-10 | P2 | c-orders amounts via `fmtColumn([...amounts])`. c-bookings Past shows the same D-135 caption (Paid / Refunded / Kept) unless the row has a pending action ("Leave a review"). The audit's alternative (point Past orders at c-bookings, its "D-157") is not taken |
| M6-C-11 | P2 | One decline pattern (D-140) on c-pay and c-ready: an error banner directly above the action bar, "Your card was declined", action "Use another card". While `error === 'declined'` and the selected method is the failed card, the bar CTA is "Use another card" (opens the method sheet) and never silently retries |
| M6-C-13 | P2 | c-booking courier note (≈L217): `Included in the ${fmtExact(a.payments.balance.cents)} you paid when it was ready.` |
| M6-C-14 | P2 | c-tailors: when `rows.every(r => r.declined)`, hide Sort and render the none-left `emptyState` actions under the declined card ("Change need-by date" primary, "Change ZIP" secondary). Keep the banner's "Start a different job" |
| M6-C-17 (merged: M6-P-05) | P2 | The c-request visit block is titled "Your request" in every c-request state (pending, suggested, expired, expired-2, expired-passed, expired-final, declined). c-booking keeps its date-as-title block |
| M6-C-18 | P3 | Log **D-169**. c-booking in-progress / ready / returning / completed: the visit block becomes a t-small meta line "Fitted Thu, Oct 15 · At my place", with no items/services count line above "Your order" |
| M6-M-05 | P2 | c-booking no-show (≈L84): `Amara marked the visit as missed at ${fmtTime(a.cancel.at)}, ${mins} minutes after the start.` (`mins` between `slot.start` and `cancel.at`) |
| M6-M-12 | P3 | c-request expired Try-again caption: `Holds ${fmtExact(deposit)} again · Amara has until ${fmtTime(newExpiry)} to reply` |
| M6-X-03 | P2 | c-ready actionBar `secondaryLabel: \`Message ${first}\``, `secondaryAct: 'message'` → `setFocus(a.id); go('c-thread')`. courier-failed with `returnOffer(a).length === 1`: `linkRow('Message Amara')` under Try again. c-complete: tertiary "Message Amara". Expects get `has: 'Message Amara'` |
| M6-X-13 | P3 | c-tailor: import `TAILOR_LIMITS`; show 4 tiles. When `t.workPhotos > 4`, the 4th is a button "+N" → `openPhotoViewer({ title: 'Amara’s work', count })` |
| M6-A-13 | P2 | c-tailors filter pills: aria-label includes the value, e.g. `Visit: At my place. Change on Where and when`, `ZIP: 11211. …` and `Need by: Fri, Oct 23. …` |
| M6-A-20 | P3 | c-where: label spans get ids; edit-needby / edit-address buttons get `aria-labelledby="<label-id> <own-id>"` |
| M6-A-14 (screens) | P2 | Inline `banner({ tone: 'error' })` next to the control on c-addresses remove failure, c-price-change approve failure and c-booking cancel failure, in addition to the toast |
| M6-C-16 | P3 | c-request pending body: "We'll text you the moment Amara replies." Keep "Reply by 12:00 PM" under the countdown; timeline sub "Usually within the hour" |
| M6-C-19 | P3 | c-bookings ready / in-progress rows: the sub is `sinceText(a)` only ("Since 9:00 AM") |
| M6-C-21 | P3 | c-complete: use c-review's star layout (left-aligned, "Your rating" label, `STAR_WORDS` caption) inside its card |
| M6-C-23 | P3 | c-job: helper `''` when `garments.length === 0` |
| M6-P-06 | P2 | c-request "Withdraw request" → the same 44 px `--error` text button c-booking uses for "Cancel booking", centred under "Message Amara"; keep `data-act="withdraw"` |
| M6-P-11 | P2 | c-booking completed title `All done with ${f}`. One shared receipt block (return metaRow `${RETURN_LABEL[how]} · ${fmtDay(completedAt(a))}` + `customerBreakdown` + "Balance paid with <card>") used by c-booking--completed and c-complete |
| M6-P-14 | P2 | c-account: drop the right-hand counts on Saved addresses / Payment methods. In the profile card, remove the divider and put "You sign in with this number." directly under the phone as t-small c-600 |
| M6-P-15 | P2 | c-cards--in-use: banner without actionLabel, then `cta('Add a card', { variant: 'secondary', attrs: 'data-act="add-from-sheet"' })` |
| M6-P-16 | P2 | c-cards remove confirm: sheet header "Remove card". Body (≈L75): `The ${fmtExact(appt.money.balance)} balance for your booking with ${who} on ${when} will be charged to ${nextLabel} instead.` Append the copy change to D-134 |
| M6-P-26 | P3 | c-price-change footnote: "If something doesn’t look right, message Amara before you approve." |
| M6-P-27 | P3 | c-booking returnBlock drop-off: `${returnAddress()}, ${ZIP_INFO[zip].city}, NY ${zip}` |
| M6-P-28 | P3 | Log **D-170** (amends D-106). `focus.js statusWord` customer returning · dropoff → "Drop-off" (short) / "Coming to you" (detail); the m4Timeline step caption follows |
| M6-P-29 | P3 | c-ready pickup sub: `${nb(shop)} ${nb('· ' + street + ' · Free')}` |
| M6-P-30 | P3 | `customerBreakdown({ servicesCaption })`. c-booking in-progress after an approved change passes `${first}’s final prices · updated at the fitting` and drops the loose "Updated after the fitting" paragraph (≈L259) |
| M6-P-32 | P3 | c-ready payment-success toasts (≈L235, 245): `{ tone: 'success' }` |
| M6-P-37 | P3 | Log **D-171**. Thread header sub = countdown only: customer "2h left for Amara to reply", tailor "2h left to reply". The t-thread--question context sub: "Her request will show here when she books." Update the c-thread--pending / t-thread--pending expects (c-thread and t-thread both) |

### Batch 4: Tailor screens (js/screens/t-*.js, to-*.js + css, own FLOWS)

| id | P | fix |
|---|---|---|
| M6-M-02 (merged: M6-M-09) | P1 | Log **D-172** (with T-06). `tailor-data.js payoutLine(p, bank)`: pending → "Arrives Fri, Oct 16 · to Chase ••6789"; paid → "Paid Fri, Oct 16 · to Chase ••6789"; failed → "Didn’t go through · sends again once your bank details are updated" (error tone, links to t-payout). Use it in t-job `payoutCard` (≈L223), `cancelMoney` (≈L81) and t-home `amountCaption` (≈L111). Flows `t-job--completed-paid`, `t-job--completed-failed` |
| M6-P-01 (merged: M6-M-13) | P1 | t-earnings: `feeNote(items)` → "no Taily fee" when every item is a kept-deposit / no-show, else "after the Taily fee" (≈L73, 90, 95). Footer (≈L114): "Job payouts are after the Taily fee. Kept deposits and no-show pay have no fee. Taily pays out every Friday." Add expect `{ has: 'no Taily fee' }` on an `earningsTo('kept')` flow |
| M6-T-01 (screen) | P1 | t-suggest: wheel rows inside her rush window get a tag "1-day turnaround · no rush fee on this request". Replace the static "Same price" with the live take-home for the selected slot (`fmtExact`), plus "Sarah pays $X less" when D-155 lowers the rush. t-request--suggested's caption reads the same |
| M6-T-03 | P1 | D-169. t-job from fitting onward: the visit block leads with `Due ${fmtDay(needBy)} · in N days` (t-h2), warning tone within 1 day, and "Fitting was Thu, Oct 15" (t-small) under it. t-home In progress rows: `<step> · due Fri, Oct 23`, sorted by need-by, soonest first |
| M6-T-14 (screen) | P2 | D-154. A countdown to `suggestLapseAt` on the t-home waiting card and on t-request--suggested. A tertiary "Withdraw suggestion" → `T.withdrawSuggestion` (confirm sheet, D-79). Flow `t-request--suggested-passed` |
| M6-T-04 | P2 | t-adjust: when any `liveRows(garments)` row has `parsed.error`, lead = `Fix ${n} price${n>1?'s':''} to see the new total` and the What-changes figures show "—". The fallback stays only for none-left (R4-1-T-04) |
| M6-T-06 | P2 | D-172. Per-job figure = "You take home": to-services `serviceRow` "You take home $22.50", the t-job--completed hero, and the `tailorBreakdown` total row label. "Payout" only for the bank transfer (Earnings, t-payout). The t-payout / t-payout--kept / t-job--completed pill is "Pending" with sub "Arrives Fri, Oct 16" (never "Scheduled") |
| M6-T-07 (merged: M6-M-06, M6-P-03) | P2 | to-services: under the lead, one line `Taily keeps ${fmtExact(tailyFeeFor(c))} of every ${fmtExact(c)} of services. Home-visit and rush fees are yours in full.` (`c = cents(MONEY.FEE_EXAMPLE_SERVICES)`); `serviceRow` take-home line "You take home $22.50 · Taily fee $2.50". to-payouts (≈L77): `On ${fmtExact(c)} of services, Taily keeps ${fmtExact(tailyFeeFor(c))} and you take home ${fmtExact(payoutFor({ services: c }))}.` Update expects |
| M6-T-10 | P2 | t-request: the take-home card sits directly under the status hero, above "The visit", in every state. The suggested caption keeps "Same price for the new time." (or the T-01 live line) |
| M6-T-11 | P2 | t-adjust add-item sheet: sub = `${n} services · ${fmtColumn range}` from her prices for that type, excluding any-garment services. A type with only the any-garment service reads "Repair only" |
| M6-T-12 | P2 | Log **D-160** (amends D-106). The tailor variant of `courierCard`: "Courier arrives 2:00–2:30 PM" (a window from the model's courier time), from → to, "Paid by Sarah · nothing comes out of your payout". No quote / fee / total rows. CTA "Handed to courier" → `markCompleted` (the payout clock starts at hand-off) |
| M6-T-13 | P2 | Log **D-161**. Tailor field `takingRequests` (default true) plus `T.setTakingRequests(bool)`; `eligible()` returns `nothing-open` when false. t-shop top: toggle "Taking requests" next to the Bookable chip; off → chip "Paused · customers can't send requests"; t-home summary "Paused · Turn back on". Flow `t-shop--paused` |
| M6-T-15 | P2 | Log **D-173**. t-job visit block (accepted, confirmed, visit): `ctaSmall('Directions')` (maps link from `jobAddress(appt)`, home visits only, `target="_blank" rel="noopener"`) and `ctaSmall('Add to calendar')` (an .ics data link with start/end/address) |
| M6-T-16 | P2 | t-phone, t-code, t-rush and the editing `onboardingHeader` → `headingRow(…, { backRow: true })` (D-93), so title and body share x = 20 |
| M6-M-08 | P2 | t-job ready note: "Sarah is choosing how to get it back, then pays the balance ($144.00, plus the courier if she picks it)." (amount `fmtExact(a.money.balance)`) |
| M6-T-18 (merged: M6-P-43) | P3 | t-earnings failed-and-next: one card "Fri, Oct 23 · $260.00 once your bank is fixed" with both job rows; the returned one tagged "Sent back"; a full-width secondary `cta('Fix bank details')` in the card. The banner keeps only its title, or (failed only) `${bank} sent back ${money}. Update your bank details to get paid.` |
| M6-T-20 (merged: M6-P-39) | P3 | t-request declined / expired / suggested CTA → "Back to Home". `onboardingHeader({ editing, active = 'shop' })`. to-payouts opened from t-earnings / t-payout passes `state.ui['to-payouts'] = { from: 'earnings' }` → `chrome('earnings')`. c-booking / c-complete opened from c-orders (`state.ui.from = 'account'`) → `chrome('account')` |
| M6-T-21 (part) | P3 | t-job--replied: replace "Your note" with "Your reply", quoting Amara's latest message (`lastSpeakerSince`). The "Remind Sarah" part is dropped (see below) |
| M6-A-16 | P3 | t-adjust (≈L222): `aria-label="Remove item: ${esc(g.type)}"` |
| M6-M-14 | P3 | t-home In progress returning rows use `returnStep(a,'tailor')` ("Ready for pickup" / "To drop off" / "Courier booked") |
| M6-P-36 | P3 | t-home `STEP.fitting` → "Started" |
| M6-P-04 | P2 | to-availability: "Shop hours" moves out of the card as a t-caps c-600 label, the visit-length note under it, then the card. The hours-required error goes directly under the card, linked via `aria-describedby` from the first day switch |
| M6-P-12 | P2 | t-adjust add-service sheet: `listRow({ title, sub: \`Your price ${fmt}\`, right: '+', act: 'pick-service' })`, with no radios and no `role="radiogroup"`. One tap still adds |
| M6-P-18 | P2 | t-payout kept / no-show: the items line → "Cancelled by Sarah within 24 hours" / "Sarah didn’t show up", plus the calm `statusPill` from `statusWord(appt,'tailor')`. Drop the duplicate caption on the breakdown row |
| M6-P-21 | P3 | to-where preview: wrap the fee caption in the `customerPreview` white inner card with a hairline-top footer ("Includes $35 home-visit fee", t-small c-600) |
| M6-P-22 | P3 | t-home: no summary line when the tailor has no appointments at all |
| M6-P-24 | P3 | t-request: demote "The visit" to a t-caps c-600 label above the `.t-h2` time |
| M6-P-33 | P3 | t-job--completed payout card: `tailorBreakdown` without the total row; add the metaRow "Picked up at your shop · Thu, Oct 15" (`RETURN_LABEL`) |
| M6-P-34 | P3 | Log **D-174**. t-job--mark-ready sheet: `text-wrap: pretty` on the intro; drop "Not yet" and keep ✕. Rule: a non-destructive confirm sheet = ✕ + one primary; destructive sheets keep D-79 |
| M6-P-35 | P3 | t-home Upcoming empty: "Nothing upcoming." when any appointment exists, "Nothing booked yet." only when `apptsFor('tailor')` is empty |
| M6-P-40 | P3 | t-earnings Paid groups: no `statusPill` in group headers; the group total only when the group has ≥ 2 jobs |

### Batch 5: Copy sweep, flows, docs (cross-persona strings, flow-menu, journeys, SCREENS.md, inventory, PROGRESS)

| id | P | fix |
|---|---|---|
| M6-C-07 (merged: M6-T-08, M6-X-04) | P2 | K-01 / D-123 vocabulary. c-tailors.js ≈114: "Estimates come from each tailor's own price list. You approve the final order at the fitting." c-tailor.js ≈76 estimate caption: "You approve the final order at the fitting before any work starts." c-booking.js ≈136 sub: "You approve the final order". t-request.js ≈55 (live states only, per P-07): "At the fitting you can add or remove items and services. Sarah approves the final order before you start." t-job.js ≈241 / 313: "The order can change at the fitting." to-services.js ≈98 and to-done.js ≈45: "At the fitting you can add or remove items and services. The customer approves the final order before you start." Re-accept affected baselines |
| M6-X-07 | P2 | Add the 26 FLOWS-only keys to SCREENS.md (O: t-job--mark-ready, c-ready--processing, t-request--declining; ◆: c-booking--completed, t-job--visit; the rest ·), plus every new key from Batches 1–4. Run `node scripts/v5/lib/gen-inventory.mjs` |
| M6-X-08 | P2 | journeys.mjs J10 (expiry loop: book → `advanceClock(REQUEST_EXPIRY_H)` → c-request "Try again (1 of 2)" + deposit released → Try again → t-home "Sent again" + `fmtExact(seed.payout)` → expire twice → c-tailors none-left + t-request--expired-final) and J11 (completeJob → t-earnings Pending + payoutDay → `T.settlePayouts()` → Paid; t-payout shows `fmtNeg(seed.tailyFee)` and `fmtExact(seed.payout)`). Add J12 for D-154 (suggest → lapse → both sides final, hold released) |
| M6-X-11 (a–c) | P3 | Flows `sys-session-expired-tailor` (host t-home, `sim.session='expired'`), `t-messages--loading` (latency 'hold'), and `c-bookings--push-denied` (a denied banner: "Turn on notifications to hear the moment Amara replies"). Part (d) is dropped |
| M6-X-12 | P3 | Flow `t-request--rush`: `driveTo('requested', { rush: true })`, expect "Rush fee", `fmtExact(SCENARIOS.rush.rush)`, `fmtExact(SCENARIOS.rush.payout)`, `fmtNeg(SCENARIOS.rush.tailyFee)` |
| M6-X-14 | P3 | Flow `to-services--unsaved` (O): `onboardTo('done')`, edit one price, click back; expect `[data-act="keep-editing"]` |
| M6-X-18 | P3 | Flow `c-thread--expired`: `driveTo('expired')`, `state.ui.thread = { tailorId }`; expect "No reply", "View request", `.composer__input` |
| M6-X-09 | P3 | flow-menu `groupsOf`: explicit `GROUP_ORDER` (customer: Sign in, Booking, Request outcomes, Bookings, Final order, Ready, Completed, Messages, Account, System; tailor: Sign-up, Onboarding, Shop, Tailor, Tailor job, Job, Edit job, Earnings, Tailor messages, System). `tabOf`: `sys-*` keys also list under System |
| M6-X-10 | P3 | m3.js FLOWS_t_thread primary: title "Thread — the booked conversation", note "Accept line, closing message, composer", group "M5 · Tailor messages" (same key) |
| M6-X-17 | P3 | PROGRESS.md: Next action = the M6 fix batches, with the real M2 / M5 review status and the M0 Figma row. Append to D-125: "J7/J8 landed in M5 (D-143)." Log D-154…D-174 in DECISIONS.md if a batch did not already |

---

## Dropped

| id | reason |
|---|---|
| M6-C-24 | Contradicts **D-133**. Address removal is deliberately immediate with Undo and no sheet ("an address is cheap to restore, so Undo beats a confirm"). Cards use a sheet because removing one moves a booking's payment (D-134). The two patterns differ on purpose |
| M6-C-26 | Contradicts **D-93**. c-tailor's backRow *is* the canonical detail header ("the M1 c-tailor pattern") that the status screens were aligned to. Changing the booking-path header family is a wider call than this P3 |
| M6-X-15 | Contradicts **D-133** (profile read-only in the prototype; overrule left to Kevin). The unused email line is flagged for Kevin, not changed |
| M6-T-19 | Changes the locked no-show money (§2 "$25 compensation is kept", **D-06** max(deposit, $25)). A money-rule change for Kevin, not a consistency fix |
| M6-T-21 ("Remind Sarah" part) | A new transition, push and rate limit: a P3 feature, not cheap or consistency. The "Your reply" half is accepted |
| M6-T-22 | A P3 new feature (weekly summary on Home). Not a consistency fix; Earnings owns the figure |
| M6-X-11 (d) | Contradicts **D-141** (one loading skeleton per persona is enough; t-home / c-bookings skeletons are out) |
| M6-M-15 | No defect (a ledger record only) |
| M6-P-45 | A taste call deliberately left by **D-54**. For later only |
| M6-C-10 alt (the audit's "D-157": point Past orders at c-bookings) | Option A (shared precision + captions) is taken. Removing an Account entry contradicts D-135's Past-orders definition |
| Merged duplicates | T-14 / P-25 → X-01 · X-06 → M-03 · X-05 / M-10 → M-04 · P-02 → T-02 · T-17 / P-10 / A-19 → C-22 · P-13 → C-25 · P-31 → C-15 · P-19 → C-12 · P-20 → C-20 · P-05 → C-17 · P-23 → P-07 · M-09 → M-02 · M-13 → P-01 · M-06 / P-03 → T-07 · P-43 → T-18 · P-39 → T-20 · T-08 / X-04 → C-07 · A-17 / A-22 → A-03 |

## For Kevin (overrule options recorded in the D entries)

- D-157: keep max(deposit, home-visit fee) on a late home-visit cancel (needs `cancelTerms` + cancel-sheet copy + `SCENARIOS.lateCancel`), and §2's "(covers the non-refundable home-visit fee)" wording.
- M6-T-19: pay at least the home-visit fee on a home-visit no-show.
- D-154: the suggestion window (24 h) is a new `POLICY` timer.
