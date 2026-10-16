# Taily v5 — screen inventory (all milestones)

Source: `MASTER-PLAN.md` §3 + `CORE-JOURNEY.md`. Written in M0; final ids. The machine copy is
`js/inventory.js` (the Integrator writes it from this file in M0 and keeps it in step; `npm run check`
fails when a built milestone's state key has no `FLOWS` entry). If the two ever disagree, fix both in one commit.

## How to read this

- **id prefixes:** `c-` customer · `t-` tailor · `to-` tailor onboarding · `sys-` system. One id = one
  `js/screens/<id>.js` file = one layout.
- **State key** = the Test-flows key (`?flow=<key>`) and the visual baseline name (`ref/v5/<key>.png`).
  A screen's default state uses the bare id; other states are `<id>--<state>`.
- **Kind:** ◆ = sibling frame (the layout changes → its own Figma frame at sync) · · = code-only state
  (copy / values / a banner change; no extra frame) · O = overlay (sheet / modal opened by the entry's `click`;
  framed as a sibling with the screen behind it).
- **M** on a state overrides the screen's milestone (a screen built in M1 can gain states in M3).
- Every key below must exist in `FLOWS` by the end of its milestone, with an `expect` snippet.
- Money in every state is dollars only (`js/money.js` `fmt*`), never percentages.

Seed numbers referenced below (Sarah's sample job with Amara Reyes, home visit, see `M0-spec.md` §A5):
services $125.00 · home-visit fee $35.00 · total $160.00 · deposit $16.00 · balance $144.00 · Taily fee −$12.50 · payout $147.50.

---

## Customer

| id | M | Purpose | States (key · kind · note) |
|---|---|---|---|
| `c-welcome` | M1 | Entry: continue with phone; Apple / Google secondary | `c-welcome` ◆ |
| `c-phone` | M1 | Enter US phone number | `c-phone` ◆ · `c-phone--invalid` · (error under field) · `c-phone--sending` · (CTA busy) |
| `c-code` | M1 | 6-digit SMS code | `c-code` ◆ (resend in 0:30) · `c-code--wrong` · · `c-code--expired` · · `c-code--resend` · (Resend enabled) |
| `c-name` | M1 | First + last name (new accounts only) | `c-name` ◆ · `c-name--error` · |
| `c-job` | M1 | C1 What needs work (Home tab): garments + a service per garment | `c-job--empty` ◆ (CTA disabled) · `c-job` ◆ (seed: 2 garments, 3 services) · `c-job--active` · (a booking in flight leads Home: its row, then "Book something else", D-168) · `c-job--max` · (10 items, add disabled + helper) · `c-job--no-service` · (garment without a service → field error) · `c-job--services` O (service picker for a garment, prices not shown yet) · `c-job--photo` O (add photo sheet) |
| `c-where` | M1 | C2 Where and when: visit type, address / zip, need-by | `c-where` ◆ (At my place, Sarah's address) · `c-where--shop` · (At the shop: zip only) · `c-where--zip-invalid` · · `c-where--address-required` · · `c-where--needby-past` · · `c-where--rush` · (need-by soon: "Rush fees may apply" caption) · `c-where--address-sheet` O · `c-where--needby-sheet` O (Scheduler, date only) |
| `c-tailors` | M1 | C3 Tailors near you (filtered list, 1 seed row) | `c-tailors--loading` ◆ (skeleton rows) · `c-tailors` ◆ (row: estimate $160, home fee $35, 4.9, 0.6 mi, next opening) · `c-tailors--rush` · (row estimate includes the rush fee) · `c-tailors--booked` · (a tailor she already has a booking with says so on her row) · `c-tailors--empty-zip` ◆ (zip 11201 outside every list) · `c-tailors--empty-shop` · (At the shop, shop off) · `c-tailors--nothing-open` · (need-by before the first opening) · `c-tailors--declined` · (row note "Declined this job", not bookable) · `c-tailors--sort` O (sort sheet: recommended / price / distance / soonest) · M3: `c-tailors--none-left` · (the only tailor hidden after the last expiry) |
| `c-tailor` | M1 | C4 Tailor profile: bio, badges, price list, reviews, return options, shop address, Ask a question | `c-tailor` ◆ · `c-tailor--no-reviews` · · `c-tailor--home-only` · (no shop address block) · `c-tailor--shop-only` · (no home fee) · `c-tailor--declined` · (Book disabled + reason) · M4: `c-tailor--reviewed` · (a fresh review on the profile, D-143) · M7: `c-tailor--verified` O (the tailor's Verified popover: four checks, K-15) |
| `c-book` | M1 | C5a Pick a time: Scheduler limited to the tailor's open slots before the need-by | `c-book` ◆ · `c-book--no-slots` ◆ (empty state: change need-by / message tailor) |
| `c-pay` | M1 | C5b Breakdown + pay the deposit, sends the request | `c-pay` ◆ (deposit $16.00 due today) · `c-pay--rush` · · `c-pay--shop` · (no home-fee row) · `c-pay--method` O (payment method sheet) · `c-pay--add-card` O · `c-pay--declined` · (inline error banner, card kept) · `c-pay--3ds` O (3-D Secure sheet) · `c-pay--processing` · (CTA busy, inputs locked) |
| `c-request` | M1 | C6/C7 request status (also the Bookings target for an open request) | `c-request` ◆ (Request sent, ochre wait band "2h left · until 12:00 PM", chat link) · M3: `c-request--soon` · (≤15 min) · `c-request--suggested` ◆ (accept new time / pick another tailor) · `c-request--declined` ◆ (job kept, Find another tailor) · `c-request--expired` ◆ (Try again 1 of 2 / Message) · `c-request--expired-2` · (Try again 2 of 2) · `c-request--expired-final` · (no retries left → other tailors) · `c-request--expired-passed` · (the visit is too close for another 2-hour wait → Pick a new time, D-94) · `c-request--suggested-passed` · (the suggested time lapsed: hold released, Find another tailor, D-154) · `c-request--withdraw` O (cancel request, hold released) |
| `c-thread` | M1 | Chat with one tailor. M1 = "Ask a question" stub; M5 = full rules | `c-thread--new` ◆ (empty, privacy note, composer) · M5: `c-thread` ◆ (booked conversation) · `c-thread--question` · (asking before booking: No booking yet) · `c-thread--pending` · (countdown in header) · `c-thread--masked` · (number/email hidden + sender note) · `c-thread--failed` · (failed send + Retry) · `c-thread--failed-offline` · (offline send: Retry in view) · `c-thread--photo` · (photo message) · `c-thread--attach` O (Add a photo sheet) · `c-thread--read-only` ◆ (declined: banner + Find another tailor, no composer) · M6: `c-thread--expired` · (no reply to the request: No reply pill, View request, composer stays) |
| `c-bookings` | M3 | Bookings tab: upcoming + past | `c-bookings` ◆ · `c-bookings--empty` · `c-bookings--push-denied` · (a waiting request with notifications off: warning banner, Open Settings) · M4: `c-bookings--ready` · (ready to pay under In progress, one completed) |
| `c-booking` | M3 | C8 booking detail: status, visit, address, money, chat | `c-booking--confirmed` ◆ (just accepted: "You're booked") · `c-booking` ◆ (upcoming) · `c-booking--cancel` O (>24 h: full $16.00 refund) · `c-booking--cancel-late` O (<24 h: $16.00 kept) · `c-booking--cancelled` · (refunded) · `c-booking--cancelled-late` · (kept) · `c-booking--reschedule` O (Scheduler, >24 h only) · `c-booking--cant-make-it` ◆ (tailor cancelled: full refund, Find another tailor, job kept) · `c-booking--no-show` · (marked no-show: deposit kept) · M4: `c-booking--fitting` · · `c-booking--in-progress` · · `c-booking--returning-pickup` · · `c-booking--returning-dropoff` · · `c-booking--returning-courier` · `c-booking--completed` ◆ (paid, back with you: review prompt) · `c-booking--docs` · (Your order with the tailor’s Before / Pinned photos and comment, K-02) · K-15: `c-booking--verified-open` O (tap the tailor’s check: ID verified · Background check · 12 years of experience · Insured) |
| `c-price-change` | M4 | C9 Review your final order: items and services added / removed / re-priced, or no changes → Approve and start or Message (K-01) · with the tailor’s Before / Pinned photos and comments (K-02) | `c-price-change` ◆ (one service added, one re-priced) · `c-price-change--item-added` · (New item card, a service removed) · `c-price-change--item-removed` · (an item struck) · `c-price-change--removed` · (a service removed, balance lower) · `c-price-change--repriced` · (only prices changed) · `c-price-change--messaged` · · `c-price-change--unchanged` · (No changes, still needs the tap; the deposit-exceeds-total refund edge, D-23, is model-tested only) · `c-price-change--docs` · (each garment’s icon, Before | Pinned tabs, Amara’s comment) · `c-price-change--docs-pinned` · (the Pinned tab) · `c-price-change--photo-viewer` O (a photo full size, no Remove) · `c-price-change--comment-masked` · (a phone number hidden) |
| `c-ready` | M4 | C10 pick a return option the tailor offers, then pay the balance | `c-ready` ◆ (3 options) · `c-ready--pickup-only` · · `c-ready--courier-loading` · · `c-ready--courier` · (quote row, e.g. $10.45) · `c-ready--courier-failed` · (retry / other option) · `c-ready--refund` · (final total below the deposit: nothing to pay, "Confirm and get $X back", D-156) · `c-ready--pay` O (balance payment sheet) · `c-ready--pay-failed` · `c-ready--courier-loading-model` · (quote loading, model view) · `c-ready--pay-another-way` · (a declined card: choose another) · `c-ready--processing` O (payment processing sheet) · `c-ready--processing-locked` · (processing: the page is locked) |
| `c-complete` | M4 | C11 order completed: stitch stage + garment tags, Amara’s label with stars, receipt row (K-17) | `c-complete` ◆ · K-17: `c-complete--receipt` · (the receipt row opened in place) |
| `c-review` | M4 | Stars (1–5), optional text, up to 3 photos | `c-review` ◆ · `c-review--error` · (no stars) · `c-review--submitted` ◆ · `c-review--photos` · (up to 3 photos attached) |
| `c-messages` | M5 | Messages tab: one row per tailor thread | `c-messages` ◆ · `c-messages--empty` · · `c-messages--loading` · |
| `c-account` | M5 | C13 Account home: profile, addresses, payment methods, past orders, sign out | `c-account` ◆ · `c-account--sign-out` O (sign out confirm) |
| `c-addresses` | M5 | Saved addresses | `c-addresses` ◆ · `c-addresses--empty` · · `c-addresses--add` O (add sheet) · `c-addresses--error` O (field errors) |
| `c-cards` | M5 | Payment methods | `c-cards` ◆ · `c-cards--empty` · · `c-cards--remove` O (remove card confirm) · `c-cards--in-use` O (only card of an open booking) · `c-cards--add` O (add a card sheet) |
| `c-orders` | M5 | Past orders + receipts | `c-orders` ◆ · `c-orders--empty` · `c-orders--loading` · |

## Tailor — sign-up and onboarding (M2)

| id | M | Purpose | States |
|---|---|---|---|
| `t-phone` | M2 | Tailor sign-up: phone | `t-phone` ◆ · `t-phone--invalid` · · `t-phone--saved` · (after Finish later: "Your progress is saved" banner, number pre-filled, D-57) |
| `t-code` | M2 | SMS code (same errors as `c-code`) | `t-code` ◆ · `t-code--wrong` · · `t-code--expired` · · `t-code--resend` · |
| `to-profile` | M2 | O1 name, photo, short bio, work photos | `to-profile` ◆ (blank) · `to-profile--errors` · (name required, bio too long) · `to-profile--edit` · (from Shop: Save instead of Next) |
| `to-services` | M2 | O2 tick services + set a price each | `to-services` ◆ · `to-services--missing-price` · · `to-services--none` · · `to-services--resume` · ("Pick up where you left off" banner, steps 1 done) · `to-services--edit` · `to-services--unsaved` O (edited a price, then Back: Keep editing / Discard changes) |
| `to-where` | M2 | O3 shop address (optional) + home visits toggle → zips + home-visit fee | `to-where` ◆ (both on) · `to-where--home-only` · · `to-where--none` · (at least one of shop / home) · `to-where--zip-invalid` · · `to-where--fee-missing` · · `to-where--edit` · |
| `to-returns` | M2 | O4 in-store pickup / home drop-off / Taily courier | `to-returns` ◆ · `to-returns--none` · · `to-returns--edit` · |
| `to-availability` | M2 | O5 weekly hours, split shop / home when both | `to-availability` ◆ (split) · `to-availability--single` · (one schedule) · `to-availability--empty` · · `to-availability--overlap` · · `to-availability--edit` · |
| `to-payouts` | M2 | O6 bank details + the Taily fee in dollars ("On a $100.00 order, Taily keeps $10.00 and you get $90.00") | `to-payouts` ◆ · `to-payouts--invalid` · · `to-payouts--edit` · M5: `to-payouts--returned` · |
| `to-done` | M2 | You're bookable confirmation | `to-done` ◆ |
| `t-shop` | M2 | T7 Shop: every onboarding section with its summary, Edit each, Rush fees row | `t-shop` ◆ · `t-shop--incomplete` · (home visits on with no home hours: warning banner, row flagged, D-56) · `t-shop--paused` · (Taking requests off: chip says customers can’t send requests, D-161) |
| `t-rush` | M2 | T7 Rush fees editor (≤1 / 2 / 3 days → $; 4+ days free) | `t-rush` ◆ · `t-rush--invalid` · · `t-rush--unsaved` O (leave without saving?) |

## Tailor — job loop (M3–M5)

| id | M | Purpose | States |
|---|---|---|---|
| `t-home` | M3 | T1 inbox: new requests, then upcoming | `t-home` ◆ (one request + upcoming) · `t-home--empty` ◆ · `t-home--push-denied` · (banner) · `t-home--push` (in-app push card for a new request, D-167) · `t-home--in-progress` · (rows lead with the step and the due date, D-169) · `t-home--paused` · (Paused · Turn back on, D-161) · `t-home--no-requests` · (upcoming only) · `t-home--no-upcoming` · (requests only) · `t-home--soon` · (a request about to expire) · `t-home--suggested` · (waiting on the customer, K-13 bar) · `t-home--suggested-soon` · (last 15 min: error bar) · `t-home--retried` · (Sent again) |
| `t-request` | M3 | T2/T3 request card: garments + estimate, visit type + neighborhood/zip, time, need-by, payout after Taily fee, expiry; Accept · Suggest time · Decline | `t-request` ◆ ("Your payout $147.50", "Taily fee −$12.50") · `t-request--soon` · · `t-request--expired` ◆ · `t-request--decline` O (optional reason) · `t-request--declined` · · `t-request--suggested` · (waiting on the customer: how long she has, Withdraw suggestion, D-154) · `t-request--withdraw` O (withdraw your suggestion, D-79) · `t-request--suggested-passed` · (the suggested time lapsed, D-154) · `t-request--rush` · (rush fee line and take-home) · `t-request--retried` · (sent again after it expired) · `t-request--expired-final` · (no retries left: gone to other tailors) · `t-request--shop` · (shop visit: no address block) · `t-request--accepting` · (Accept busy) · `t-request--declining` O (Decline busy) · `t-request--none` · (no request to show) |
| `t-suggest` | M3 | T3 suggest another time: Scheduler over the tailor's own open slots | `t-suggest` ◆ · `t-suggest--rush-window` · (a 1-day turnaround with no rush fee on this request, D-155) · `t-suggest--sending` · (Send busy) |
| `t-job` | M3 | T4 job detail: full address after accept, chat, actions by status | `t-job--accepted` ◆ (just accepted) · `t-job` ◆ (upcoming) · `t-job--cant-make-it` O · `t-job--no-show` O (15 min after start) · `t-job--cant-make-it-done` · · `t-job--no-show-done` · ($25.00 paid) · `t-job--cancelled` · (customer cancelled >24 h: nothing owed) · `t-job--cancelled-late` · (you keep $16.00) · `t-job--rescheduled` · (the customer moved the visit) · `t-job--empty` · (no job to show) · M4: `t-job--fitting` · (Review the order) · `t-job--waiting` · (final order sent) · `t-job--waiting-unchanged` · (sent as booked) · `t-job--approved` · · `t-job--messaged` · (customer replied in chat instead) · `t-job--replied` · (Amara answered; waiting on Sarah again, D-112) · `t-job--in-progress` · · `t-job--ready` · (waiting for the return choice + balance) · `t-job--returning-pickup` · · `t-job--returning-dropoff` · · `t-job--courier` · (courier booked) · `t-job--completed` ◆ (payout summary) · `t-job--visit` ◆ (visit under way: Start fitting) · `t-job--mark-ready` O (Mark ready sheet) · M6: `t-job--completed-paid` · (Paid, D-172) · `t-job--completed-failed` · (Didn’t go through, link to the payout, D-172) · M4: `t-job--docs` · (The work with Before and Pinned photos and Your comment) · `t-job--docs-pinned` · (the Pinned tab) · `t-job--fitting-docs` · (the fitting after photographing) · `t-job--docs-unsent` · (photos changed since the order was sent, D-183) · M7: `t-job--more` O (the ••• menu: I can’t make it, Mark as no-show) |
| `t-adjust` | M4 | T5 Edit the job at the fitting: add / remove items and services, re-price → send the final order for approval (K-01) · Before / Pinned photos (required) and a comment per item (K-02) | `t-adjust` ◆ (no photos yet, Send off) · `t-adjust--edited` · (changed rows marked, new payout) · `t-adjust--item-added` · (New item card, a service struck) · `t-adjust--remove-item` · (a booked item struck, Undo) · `t-adjust--max-items` · (Add an item off at 10) · `t-adjust--error` · (empty price) · `t-adjust--add` O · (add a service) · `t-adjust--add-item` O · (pick the item type) · `t-adjust--add-item-service` O · (pick its first service) · `t-adjust--revise` · (edit the order Sarah has not approved yet) · `t-adjust--leave` O (leave without sending?) · `t-adjust--docs` · (photographed, a comment, Send on) · `t-adjust--photos-missing` · (one item still needs a photo) · `t-adjust--item-docs` · (a new item needs photos too) · `t-adjust--docs-max` · (four Before photos, no add tile) · `t-adjust--comment` · (writing a comment) · `t-adjust--comment-masked` · (a phone number hidden) · `t-adjust--photo-viewer` O (a photo, Remove photo) · `t-adjust--revise-docs` · (a photo added after sending enables the updated order) · M7: `t-adjust--photos-required` · (nothing tried yet: a quiet Required, Send soft-off, D-196) |
| `t-earnings` | M5 | T8 payouts: upcoming, history | `t-earnings` ◆ · `t-earnings--empty` · · `t-earnings--pending` · · `t-earnings--failed` · (fix bank details) · `t-earnings--failed-and-next` · (sent back + another job scheduled: one card, one Fix button) · `t-earnings--kept` · (a kept deposit says "no Taily fee") · `t-earnings--loading` · |
| `t-payout` | M5 | T8 per-job breakdown (services, home fee, rush, Taily fee −$, payout) | `t-payout` ◆ · `t-payout--kept` · (deposit kept) · `t-payout--no-show` · (no-show pay) · `t-payout--failed` · (the bank sent it back) |
| `t-messages` | M5 | T9 threads list | `t-messages` ◆ · `t-messages--empty` · `t-messages--loading` · (skeleton rows) |
| `t-thread` | M3 | T9 the same thread the customer sees (M3 stub, D-81; full rules M5) | `t-thread` ◆ · M5: `t-thread--question` · · `t-thread--pending` · · `t-thread--masked` · · `t-thread--failed` · · `t-thread--photo` · · `t-thread--read-only` · |

## System

| id | M | Purpose | States |
|---|---|---|---|
| `sys-index` | M0 | Boot screen: milestones M0–M7 and every built screen / state as a deep link | `sys-index` ◆ |
| `sys-components` | M0 | Component gallery (every v5 component in each state) — visual baseline for the component layer | `sys-components` ◆ |

System-wide patterns (M5) have no screen of their own: each key lands on a host screen.

| key | M | Host screen | What shows |
|---|---|---|---|
| `sys-offline` | M5 | `c-job` | offline banner + Retry (`state.sim.network = 'offline'`) |
| `sys-offline-tailor` | M5 | `t-home` | same banner on the tailor side |
| `sys-session-expired` | M5 | `c-bookings` | O re-auth sheet (phone code) |
| `sys-session-expired-tailor` | M5 | `t-home` | O the same re-auth sheet on the tailor side (`state.sim.session = 'expired'`) |
| `sys-push-prompt` | M5 | `t-home` | O push permission prompt (first launch) |
| `sys-push-prompt-customer` | M5 | `c-request` | O soft push ask while a request waits (Test flows only, D-139) |
| `sys-error-toast` | M5 | `c-pay` | toast + inline error pattern after a failed action |

## Status → screen (`statusScreen(appt, persona)`, js/state.js)

| status | customer | tailor |
|---|---|---|
| requested | `c-request` | `t-request` |
| suggested | `c-request` | `t-request` |
| declined / expired | `c-request` | `t-request` |
| confirmed / fitting / in-progress / returning / cancelled | `c-booking` | `t-job` |
| price-change | `c-price-change` | `t-job` |
| ready | `c-ready` (balance unpaid) | `t-job` |
| completed | `c-complete` (no review yet) else `c-booking` | `t-job` |
