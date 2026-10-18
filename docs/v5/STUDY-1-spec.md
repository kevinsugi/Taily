# Taily v5 — Study-1 build spec (STUDY-1-spec.md)

Source: Kevin's tailor-usability Study-1 spec (items A1–D, Oct 16 2026). Branch `feat/tailor-study-1` (from main = V5 737ffc0).
**Local commits only. No push / merge until Kevin approves the review page (D).** Money = integer cents via `money.js`, dollars only on
screen; every rate/window in `money-config.js`; demo clock `now()`; every new state = a FLOWS entry. Kevin's spec used v4 vocabulary
(`mirror`, `JOB_TYPES`, Python edits, `node --check`, /opt/pw-browsers) — v5 equivalents: shared appointment in `state.js`, `SERVICES`,
ES modules, `npm run check` + `npm run stamp`, `scripts/v5/shoot.mjs` (Playwright, 390 wide).

## 1. Gap map

| Item | v5 today | Must change | Screens (cust / tailor) | Shared files |
|---|---|---|---|---|
| A1 new stage | `STATUSES` state.js:35 `ready → returning → completed`; `chooseReturn` :1033 / `payBalance` :1056 set `returning`; `markCompleted` :1072 tailor-only; `statusScreen` :1148; words focus.js:72; pill components.js:180 | Rename `returning` → **`awaiting-handoff`** everywhere (~70 refs / 17 files) + flow keys `c-booking--returning-{pickup,pickup-many,dropoff,courier}`, `t-job--returning-{pickup,dropoff}`, `t-job--courier` → `--handoff-*` (+ ref PNGs). CLAUDE.md "State" bullet + CONTEXT.md | c-booking / t-job, c-bookings, t-home | state.js, focus.js, components.js, tailor-data.js, common.js, CLAUDE.md, CONTEXT.md |
| A2 hold | Deposit authorized at request, captured on accept (state.js:617). Balance PAID at c-ready (`payBalance`, "Pay $144.00", sheet "Pay the balance" c-ready.js:170/258). `payments.balance.state` pending/due/paid/failed | `holdBalance` replaces `payBalance`; balance states `held` → `captured` (`captureReason: 'handoff' \| 'unclaimed'`); `tick()` captures after `POLICY.UNCLAIMED_CAPTURE_D`; c-ready hold line + unclaimed rule; receipts/rows "On hold" / "Charged"; INFO `pricing` copy | c-ready, c-booking, c-bookings, c-complete receipt / t-job strip | state.js, money-config.js, components.js (`customerBreakdown` stage `held`, INFO) |
| A3 confirm handoff | t-job CTA "Mark completed" / "Handed to courier" (t-job.js:192–210) → `markCompleted`. Customer can't act. No code/photo/timer | `a.handoff = { code, heldAt, markedBy, markedAt, photo, autoAt, problemAt }`; `confirmPickup(id, code)`, `markHandedOver(id, { photo })` (drop-off photo required; pickup w/o code allowed), `confirmReceived(id)` (customer, any method), `reportNotReceived(id)`, `courierDelivered(id)`, private `completeHandoff(a, by)`; `tick()` auto-completes at `autoAt`. Remove "Handed to courier" | c-booking (code, I got it / I didn't get it, countdown) / t-job (Picked up + code sheet, Delivered + photo sheet, countdown) | state.js, components.js (`handoffCode`, `autoCompleteLine`), data.js `HANDOFF_CODE_LEN` |
| A4 Job Done | c-complete (K-17): stars, receipt, Message. "Book Amara again" only on c-booking completed (c-booking.js:532 → c-job → LIST). Timeline "Rate the fit" (c-booking.js:252). t-home "Recent" = 1 row (t-home.js:53/120) | c-complete bar: primary `Leave a review`, secondary `Book Amara again`, Message as link. Book again carries `{ visitType, zip, address }` + `ui.booking.again`; c-where → c-tailor. `reviewReminderDue(a)` selector (completed, no review, now ≥ completedAt + 7d) → Home card + Bookings row link. t-home "Recent" → "Completed" (all, newest first, payout) | c-complete, c-job, c-bookings, c-booking, c-where, c-tailor / t-home | state.js, components.js (`reminderCard`), money-config.js `REVIEW_REMINDER_D` |
| A5 no-show / cancel | `tailorCantMakeIt` (state.js:753) refunds deposit any time; ••• "I can't make it" (t-job.js:151, sheet :420). Customer no-show `markNoShow` :764 keeps deposit; customer cancel <24h keeps deposit (`cancelTerms` money.js:87). No customer "tailor didn't show" | Menu item → `Cancel appointment`; inside `CANCEL_WINDOW_H` the sheet warns + `cancel.late = true`. New `reportTailorNoShow(id)` (confirmed, now ≥ start + `NO_SHOW_WAIT_MIN`): cancelled, reason `tailor-no-show`, deposit refunded, draft restored, no payout. c-booking link `Tailor didn't show up?`. Customer rules unchanged | c-booking / t-job | state.js, focus.js |
| B1 edit after fitting | After `approvePriceChange` (state.js:940) order + photos locked (`docsEditable` :788). In-progress CTA "Mark ready" only. c-price-change = fitting final order, Approve + Message (no reject, §2) | `a.edit = { lines, needBy, reason, photo, workDone, sentAt, state: pending\|approved\|declined }`; `sendJobEdit`, `approveJobEdit`, `declineJobEdit`; `markReady` fails `edit-pending`; customer with a pending edit (still in-progress) → c-price-change edit mode. t-adjust `mode:'edit'` (reason required, photo prompt, work done ≤ approved total, due-date sheet) | c-price-change, c-ready (partial), c-booking, c-complete / t-job, t-adjust, t-home | state.js, focus.js, components.js |
| B2 private notes | None. t-adjust "Note to Sarah about the whole order" (t-adjust.js:296) is SENT (`priceChange.note`) and shown on c-price-change.js:70 / t-job.js:250 | `a.notes = [{ id, text, photos, at }]` + add/update/remove note / photo. t-adjust's note → private "General notes"; `sendPriceChange` drops `note`; fixtures PRICE_NOTES → notes. Attach via `openAttachSheet` | c-price-change (loses note quote) / t-job (Notes), t-adjust | state.js, components.js (`privateNotes`), data.js `NOTES_LIMITS` |
| C1 card vs about | to-profile.js:111–118 card line before About; preview at BOTTOM (live, D-250) | Preview to the top, sticky under the onboarding bar, live. New labels + placeholders. `textArea({ placeholder })` | to-profile | components.js (`textArea`, `customerPreview({ sticky })`) |
| C2 110 limit | `CARD_LINE_MAX` 110 (data.js:48); counter always visible; no maxlength; over-limit blocks Next (`to-profile--card-line-over`) | `textArea({ maxlength })` hard stop; paste cut to 110 + notice; at 110 counter + border error tone (valid). `-over` flow → `-max` + `-trimmed`; add `c-tailors--card-line-max` | to-profile, c-tailors | components.js |
| C3 pricing help | to-services lead "Tick what you do and set your usual price." (to-services.js:106). `SERVICES` has NO base prices | `SERVICES[id].base` (dollars); `MONEY.PRICE_RANGE_SPREAD 0.20`, `PRICE_ROUND 5`; `priceRange(id)` in money.js; intro copy, range caption per row, `Use recommended prices` | to-services | data.js, money-config.js, money.js |
| C4 flat visit fee | to-where "Home-visit fee" + "Paid to you in full." (to-where.js:37/116); customer rows "Home-visit fee" | Tailor label `Home visit fee (flat, per visit)` + helper; customer rows `Home visit fee` + caption `Flat, per visit`; c-tailor helper sentence | to-where / c-tailor, c-pay, c-ready, c-price-change, c-booking | components.js (breakdowns, INFO `fee`) |
| C5 neighborhoods | to-where `zipList` (to-where.js:115); `ZIP_INFO` 5 Brooklyn zips; `eligible()` on `home.zips`; c-tailor raw zips; t-shop "n ZIP codes" | `BOROUGHS`, `NEIGHBORHOODS [{ id, name, borough, zips, tile:{x,y} }]` (mock); `home.hoods` source of truth, `home.zips` derived; error `hoods-required`; `hoodPicker` + `hoodMap` (SVG tiles) | to-where / c-tailor, t-shop | data.js, state.js (`SECTION_RULES.where`), components.js |

## 2. Interpretations (listed for Kevin's approval on the review page)

Locked-rule conflicts — Kevin's newer instruction wins, logged as K-## when approved:
- **K-27 (A1–A3; conflicts with MASTER-PLAN §2 "balance paid when Ready")**: balance HELD when the customer picks a way back, captured at handoff. Hold = services + rush + courier − deposit. D-156 refund case (deposit > total): nothing held, refund settles at the choice as today. Declined/3DS card at hold keeps `c-ready--pay-failed` / `--pay-another-way`, relabelled.
- **K-28 (A4)**: Job Done without a fit check; review reminder at completion + 7 days is a selector (no new status).
- **K-29 (A5)**: tailor no-show = cancel reason `tailor-no-show`, deposit refunded in full, no payout. Tailor cancel inside 24h = warning + `cancel.late`; refund unchanged. "Booking fee" = v5's **deposit**. Customer "lose it once confirmed at the 24-hour reminder" = existing rule (cancel <24h → tailor keeps deposit, D-157); v5 has no 24h reminder prompt — unchanged.
- **K-30 (B1; extends §2 "no reject path")**: that rule stays for the FITTING final order; a post-fitting edit (in-progress, before Mark ready) can be declined. **OVERRULED by Kevin (Oct 17): no decline — Sarah approves or messages; the tailor revises (resend replaces).**
- **K-31 (B2)**: the whole-order note becomes private → c-price-change / t-job lose "Amara's note on the order". (Alternative: keep it shared + add separate private notes.)
- **K-32 C1–C2, K-33 C3, K-34 C4, K-35 C5**: copy and UI rules; ±20% spread is a rate in `MONEY`, never rendered.

Build defaults (D-254+):
1. State id `awaiting-handoff` (hyphen: v5 status convention + flow-key regex `/^[a-z0-9.-]+$/`); renamed outright, no alias; pill tone `done`.
2. 7-day clock starts at the hold (`handoff.heldAt`). Capture → `balance.state='captured', captureReason='unclaimed'`; status stays; tailor payout still waits for completion. A reported problem pauses BOTH 48h and 7-day timers.
3. 48h timer starts when the tailor marks Delivered (drop-off) or Picked up without a code. Customer "I got it" always completes immediately. Countdown = floor(hours left) ("47h" right after); under 1h "less than 1h". Auto-completion stamped at `autoAt`.
4. Pickup without code: link `Customer doesn't have the code?` → `markHandedOver` (no photo) → 48h. Wrong code → `code-wrong` inline error. Code = 4 digits derived from the appointment id (stable baselines).
5. "I didn't get it": `problemAt` set, timers paused, banners both sides, system line in the thread. Sarah can still tap "I got it"; Amara can mark Delivered again with a new photo (restarts 48h).
6. Courier: no tailor CTA; `courierDelivered` completes immediately; simulated by the Test-flows Demo action.
7. "garment" in the hold line is Kevin's word, plural for 2+ items; elsewhere D-209 glossary (order / items).
8. No-show link from start + `NO_SHOW_WAIT_MIN` (15 min), only while `confirmed`. First report wins; no dispute path.
9. Book again: new draft = same `visitType`, `zip`, `address`, no garments, `ui.booking = { tailorId, again: true }`; c-where Next → c-tailor (or c-tailors if no longer eligible).
10. Tailor Completed list: t-home "Recent" → "Completed", newest first, payout + caption, "Partial work" pill. t-earnings unchanged.
11. B1 "what's being done" = order lines edited in t-adjust `mode:'edit'` against the APPROVED order; "due date" = `job.needBy` (later date can only lower rush). "Notes and photos change freely" = B2 private notes; fitting photos stay locked (D-175).
12. *(Superseded by the K-30 overrule — removed.)* "Work done so far $X" = ALL-IN amount Sarah pays if she declines, whole dollars, $0 … approved total. Decline: balance = X − deposit (refund if negative); payout = services part − Taily fee + home fee share; status → `ready` with every return offered; `outcome:'partial'` carried to completion → "Returned, partial work".
13. One pending edit at a time; resending replaces it; Mark ready disabled with a note while pending.
14. Private notes: ≤ 500 chars, ≤ 4 photos per note; t-job from `fitting` on; read-only once completed; no sharing anywhere.
15. C2 counter keeps the house "0 / 110" format; at exactly 110 red but valid (Next works).
16. "Use recommended prices" fills only TICKED services with an empty price; never ticks; disabled with a note when nothing is ticked.
17. C4: "Home visit fee" (no hyphen) on both sides; customer rows caption "Flat, per visit"; c-tailor full helper sentence.
18. C5: tile map (one rounded tile per neighborhood grouped by borough, selected = accent), mock zips; seed Amara = Williamsburg (11211, 11249), Greenpoint (11222), East Williamsburg (11206), Bushwick (11237).

## 3. Demo clock and Test flows

`advanceClock(min)` fires timers; `tick()` gains: awaiting-handoff with `autoAt ≤ now` and no problem → `completeHandoff(a,'auto')`; awaiting-handoff, hold not captured, `heldAt + UNCLAIMED_CAPTURE_D ≤ now`, no problem → capture. `setClock` does not tick → fixtures use `advanceClock`. POLICY: `HANDOFF_AUTO_H: 48`, `UNCLAIMED_CAPTURE_D: 7`, `REVIEW_REMINDER_D: 7`. MONEY: `PRICE_RANGE_SPREAD: 0.20`, `PRICE_ROUND: 5`.

Test flows → **Demo actions** footer row in `flow-menu.js` (acts on `activeAppt()` without reset, re-renders, `redirectIfMoved`): "Courier delivers", "+1 hour", "+48 hours", "+7 days". Outside `.screen`, harness never sees it.

`driveTo` targets added (common.js): `awaiting-handoff`, `handed-over`, `problem`, `auto-completed`, `unclaimed`, `review-reminder`, `tailor-no-show`, `cant-make-it-late`, `edit-pending`, `edit-declined`, `partial-completed` (the last two removed with the K-30 overrule).

FLOWS keys (new / renamed):
- WS-A customer: `c-ready` (re) · `c-ready--pay` (sheet "Hold the balance") · `c-booking--handoff-pickup` · `-handoff-pickup-many` · `-handoff-dropoff` · `-handoff-delivered` · `-handoff-problem` · `-handoff-courier` · `-handoff-unclaimed` · `c-booking--got-it` · `c-booking--not-received` · `c-booking--no-show-link` · `c-booking--no-show-report` · `c-booking--tailor-no-show` · `c-booking--cant-make-it-late` · `c-complete` (re) · `c-complete--auto` · `c-complete--courier` · `c-complete--review-reminder` · `c-job--review-reminder` · `c-bookings--review-reminder` · `c-job--book-again` · `c-tailor--book-again`.
- WS-A tailor: `t-job--handoff-pickup` · `t-job--picked-up` · `t-job--picked-up-wrong` · `t-job--handoff-pickup-marked` · `t-job--handoff-dropoff` · `t-job--delivered` · `t-job--delivered-photo-missing` · `t-job--handoff-delivered` · `t-job--handoff-problem` · `t-job--handoff-courier` · `t-job--handoff-unclaimed` · `t-job--completed-auto` · `t-job--cancel` · `t-job--cancel-late` · `t-job--tailor-no-show` · `t-home--completed` · `t-home--handoff`.
- WS-B: `t-job--in-progress` (re) · `t-job--notes` · `t-job--note-editor` · `t-job--note-attach` · `t-adjust--notes` · `t-adjust--edit` · `t-adjust--edit-errors` · `t-adjust--edit-due` · `t-job--edit-pending` · `c-price-change--edit` · `c-price-change--edit-due` (K-30 overrule removed `c-price-change--decline`, `c-ready--partial`, `t-job--ready-partial`, `c-complete--partial`, `c-booking--completed-partial`, `t-job--completed-partial`, `t-home--completed-partial`).
- WS-C: `to-profile` (re) · `to-profile--card-line` (re) · `to-profile--card-line-max` (replaces `-over`) · `to-profile--card-line-trimmed` · `to-profile--about` · `c-tailors--card-line-max` · `to-services` (re) · `to-services--recommended` · `to-services--recommended-none` · `to-where` (re) · `to-where--hoods` · `to-where--hoods-borough` · `to-where--hoods-none` · `c-tailor` / `c-tailor--home-only` / `c-pay` (re, fee wording).
- Study tab (end): sections "Handoff & done" and "Edit after the fitting".

## 4. Build plan

- **Phase 0** (one local commit): rename `returning` → `awaiting-handoff`, `payBalance` → `holdBalance` (behaviour unchanged), rename flow keys + ref PNGs, update model-test / journeys / study keys; add POLICY/MONEY constants, data.js `HANDOFF_CODE_LEN`, `NOTES_LIMITS`, `SERVICES[].base`, `BOROUGHS`, `NEIGHBORHOODS`, seed `home.hoods`; empty fixture modules `js/fixtures/s1a.js`, `s1b.js`, `s1c.js` wired into flows; marked append-only blocks `/* S1-A */ /* S1-B */ /* S1-C */` in components.js / components-v5.css / model-test. `npm run check` green.
- **WS-C** (C1–C5, onboarding) in parallel with WS-A, separate worktree; merges first.
- **WS-A** (A1–A5) on the feature branch; journeys J15 (pickup code), J16 (drop-off → problem → I got it), J17 (48h auto + 7-day capture).
- **WS-B** (B1–B2) after WS-A; journey J18 (edit → decline → partial → handoff; after the K-30 overrule: edit → Mark ready waits → Sarah messages → Amara revises → Sarah approves → Mark ready).
- Per merge: `node scripts/v5/lib/gen-inventory.mjs` if present, `npm run check -- --accept-new`, accept listed re-baselines, `npm run stamp`, local commit.
- **D**: review page artifact; no push until Kevin approves; then log K-27…K-35 + D-254… in DECISIONS.md, push branch, merge to main `--no-ff` (and V5).

Payment / timing:

| Moment | Customer card | Tailor |
|---|---|---|
| Request sent | $16.00 deposit authorized | — |
| Tailor accepts | deposit captured | — |
| Customer cancels ≥24h / <24h / no-show | refunded / kept / kept | — / $16.00 / max(deposit, $25) |
| Tailor cancels (warning <24h) / tailor no-show reported | deposit refunded in full | no payout |
| Ready → picks a way back | balance $144.00 (+ courier) HELD | — |
| Handoff: code / I got it / courier delivered / 48h after tailor marks it | hold captured | payout queued next Friday |
| 7 days in awaiting-handoff, no problem | hold captured; job still open | payout at handoff |
| "I didn't get it" | nothing captured; timers paused | — |
| Edit approved (declined removed, K-30 overrule) | new balance at Ready | payout on new total |

## 5. Copy deck (verbatim; seed amounts; dollars only)

- **c-ready (A2)**: CTA `Hold $144.00` (sheet `Hold the balance`, busy `Holding…`) · `We’ll hold $144.00 now and charge it when you get your garment.` (2+ items: `…your garments.`) · `If you haven’t got it 7 days after you choose, we’ll charge the $144.00 then. Amara still keeps it for you until you do.` · `Your card was declined. Nothing was held. Try another card.`
- **Receipts/rows**: `On hold · Visa •••• 4242` · `Charged $144.00 · Visa •••• 4242` · c-bookings `On hold` / `Charged`.
- **c-booking handoff**: `Ready for pickup · show your code at the shop` · `Your pickup code` / `8153` / `Show this code when you pick up.` · `Amara will drop it off · agree on a time in chat` · `Amara delivered it · photo below` · `On its way · arrives 6:00–6:30 PM` · `I got it` · `I didn’t get it` · `Completes automatically in 47h unless you report a problem` · got-it sheet `Got everything?` / `We’ll charge the $144.00 on hold and close the order.` / `Yes, I got it` / `Not yet` · not-received sheet `Didn’t get it?` / `We’ll stop the automatic completion and tell Amara. Nothing is charged while you sort it out in chat.` / `Report a problem` / `Keep waiting` · `You reported a problem. We’ve stopped the automatic completion and told Amara.` · `We charged the $144.00 on hold after 7 days. Amara still keeps it for you until you pick it up.`
- **t-job handoff**: `In-store pickup · Sarah’s $144.00 is on hold` · `Home drop-off · agree on a time in chat` · `Courier booked · arrives 6:00–6:30 PM · completes on delivery` · `Picked up` · `Delivered` · `Enter Sarah’s pickup code` / `4-digit code` / `Confirm pickup` / `That code doesn’t match. Ask Sarah to check her booking.` / `Customer doesn’t have the code?` · `Mark as delivered` / `Add a photo of the drop-off. Sarah sees it.` / `Add a photo to mark it delivered.` / `Mark delivered` · `Completes automatically in 47h unless Sarah reports a problem` · `Sarah says she didn’t get it. Sort it out in chat.` · `Sarah’s $144.00 was charged after 7 days. You’re paid when she picks it up.` · toast `Done. Sarah has her order.`
- **A4**: `Order complete · Thu, Oct 15` (auto: `Completed automatically · Sat, Oct 17`) · `Leave a review` · `Book Amara again` · reminder `How did Amara do?` / `It’s been a week since your order came back. Your review helps other customers.` / `Leave a review` · timeline `Leave a review` (replaces `Rate the fit`) · c-tailor `Booking again with Amara` · t-home `Completed`, `Paid Fri, Oct 16` / `Payout pending`.
- **A5**: `Cancel appointment` / `Sarah gets her $16.00 deposit back` · `Cancel this appointment?` · `The visit is less than 24 hours away. Sarah will be refunded her $16.00 deposit in full, and she may not find another tailor in time.` · `Tailor didn’t show up?` · `Amara didn’t show up?` / `We’ll cancel the visit and refund your $16.00 deposit in full. Your order stays saved so you can rebook.` / `Report a no-show` / `Keep waiting` · `Amara didn’t show up` / `Your $16.00 deposit is refunded in full.` · `Amara cancelled less than 24 hours before your visit. Your $16.00 deposit is refunded in full.` · `Sarah reported you didn’t show up` / `Her $16.00 deposit was refunded. Nothing is paid out for this job.`
- **B1**: `Edit the job` · `Reason for the change (Sarah sees this)` / `Tell Sarah why you’re changing it.` · `Add a photo so the customer sees why` · `Work done so far` / `What Sarah pays if she says no. Up to $160.00.` / `Enter a whole-dollar amount up to $160.00.` · `Due date` · `Send to Sarah` / `Change the price, the due date or the work to send it.` · `Waiting on Sarah to approve your changes` · `Sarah hasn’t answered your changes yet.` · `Amara edited your order` · `Amara’s reason` · `New due date Fri, Oct 23 · was Tue, Oct 20` · `If you decline, you pay $40.00 for the work done so far and get your items back.` · `Approve changes` / `Decline and get my items back` / `Message Amara` · `Decline the changes?` / `You’ll pay $40.00 for the work done so far. Your $16.00 deposit counts toward it, so $24.00 is left. Then choose how to get your items back.` · `Returned, partial work` · pill `Partial work`. *K-30 overruled: the work-done, If-you-decline, Decline sheet and partial-work strings are removed; the edit mode adds `Something not right? Message Amara to change it before the work is finished.` (D-293).*
- **B2**: `General notes` · `Only you can see these notes.` · `Add a note` · `Add photo` (`Take a photo` / `Choose from library`) · empty `Measurements, fabric notes, reminders. Only you see them.`
- **C1–C2**: `Card line — the one sentence customers see in search results` · `About — the full bio on your profile` · placeholders `Example: I’ve been tailoring luxury clothes for 10 years and frequently work with designers for fashion week` and `Example: I’ve tailored luxury and designer clothing for 10 years, including looks for fashion week. I specialize in suits, coats and eveningwear, and I pin every fitting myself. I make home visits in SoHo, Tribeca, the West Village and Williamsburg.` · `0 / 110` · `Trimmed to 110 characters.` · 110-char test line `Savile Row trained. Suits, shirts and eveningwear for 20 years. I pin every fitting myself, studio or at home.`
- **C3**: intro `This is what customers see when they book. Set what you’d charge for a typical job. You can adjust after the fitting, but the customer has to approve big changes.` · `Most NYC tailors charge $20–$30.` · `Use recommended prices` · `Tick the services you offer first.` · toast `Filled 3 empty prices. Prices you typed are unchanged.`
- **C4**: `Home visit fee (flat, per visit)` / `Charged once per home visit, no matter how long it takes.` · customer `Home visit fee` + `Flat, per visit` · c-tailor `$35 home visit fee · Charged once per home visit, no matter how long it takes.` · `Enter your home visit fee, or 0 for none.`
- **C5**: `Neighborhoods you visit` · `Manhattan` `Brooklyn` `Queens` `Bronx` `Staten Island` · `Where customers can book a home visit` · `Pick at least one neighborhood.` · t-shop `Home visits in 4 neighborhoods, $35 fee` · c-tailor `Comes to you in Williamsburg, Greenpoint, East Williamsburg and Bushwick`.
- **INFO**: pricing `When your order is ready, we hold the balance and charge it when you get your items.` · deposit `If the tailor cancels or doesn’t show up, you get it back in full.`

## 6. C3 price ranges (low = base × 0.8, high = base × 1.2, each rounded to $5; mid = rounded midpoint)

| Service (id) | Base | Range | Mid |
|---|---|---|---|
| Hem pants (hem-pants) | $25 | $20–$30 | $25 |
| Taper legs (taper) | $40 | $30–$50 | $40 |
| Take in or let out waist (waist) | $35 | $30–$40 | $35 |
| Shorten sleeves (sleeves) | $45 | $35–$55 | $45 |
| Take in jacket sides (jacket-sides) | $55 | $45–$65 | $55 |
| Take in shirt (shirt-take-in) | $30 | $25–$35 | $30 |
| Hem dress or skirt (dress-hem) | $50 | $40–$60 | $50 |
| Take in dress (dress-take-in) | $65 | $50–$80 | $65 |
| Replace zipper (zipper) | $30 | $25–$35 | $30 |
| Repair or patch (repair) | $20 | $15–$25 | $20 |

Base = Amara's seed prices (v5 has no `JOB_TYPES` base list), so every midpoint equals her price. K-33: the bridal row ($250 proposed, $200–$300) is removed with the service. Verify ids against data.js when building.
