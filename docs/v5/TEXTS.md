# Taily text catalogue (pre-MVP A1 · D-02 / DG-2 A · K-43 D-301 · K-48.4)

Generated from `js/texts.js` by `node scripts/v5/texts-doc.mjs` — do not edit by hand. 94 texts: 48 to the customer, 44 to the tailor, 2 to the admin.

**Rules.** When the text service is connected, every notification is a text message (SMS) with its own unique link into the web app
(`taily.app/r/XXXXXX`, shown here as `<link>`), for both people, no exceptions. Every text starts with "Taily: ". **No quiet hours**
(K-48.4): a text goes out the moment its event happens, at any hour. Each event fires through one function, `state.js notify(appt, event)`,
which records it in `state.outbox`: sent when the person's texts are on, otherwise held back as `off` — the app shows the same news (the
in-app fallback). Booking texts are the customer's own opt-in (an unticked box at sign-up, Account → Texts); a STOP reply turns texts off,
START (or the switch) back on with a confirmation text. Sign-in codes always go. The K-43 auto-cancel happens only after a **delivered**
reminder to an opted-in number; otherwise the plain 24-hour rule applies.

**Timings (POLICY, js/money-config.js).** Tailor start reminder 60 minutes before the visit; at the start time ONE text,
"Your fitting has started. Please take all notes here:" (it replaces a second start reminder, so she never gets two at once). Chat: a text for
the first unread message, then at most one per conversation every 15 minutes while messages stay unread. Waiting
states: reminders at 24 h and 72 h; a final order unanswered 7 days goes to Taily review;
K-53: the balance is held on her saved card when the order is ready (a 114-hour hold); every time offered falls within 4 days of
ready, and on that day the balance is charged — with no way back chosen, the order is set to in-store pickup; an uncollected order closes 30 days after the charge. "Did the visit happen?" 2 h after the start, the admin
4 h after the START (K-48.5, Kevin's K-50 fix); 24 h after asking it is decided by the evidence (K-51): the tailor
tapped I'm here → the customer's no-show; nothing recorded → closed "Not confirmed" with the deposit on hold, and the tailor keeps it if neither side
disputes within 72 h. Pickup today 2 h before the pickup time.

**The visit reminder (K-51).** The reminder (C7) 48 h before the visit; the nudge (C8) 26 h before it if she hasn't confirmed
("Confirm by" = the 24 h free window's end). Booked less than 48 h ahead: no C7, the nudge is the first ask; less than
26 h: no prompt, the plain 24-hour rule. Confirming no longer closes the free window early (K-53): it always ends 24 h before the visit,
and still unconfirmed then (after a delivered C7 or C8) she gets the free-window-closed text. Still unconfirmed 3 h before the visit → cancelled (C9, K-43).

**Numbering (K-51).** C1… to the customer, T1… to the tailor, A1… to the admin, in catalogue order (`textNo(id)`); new texts go at the end of their block.

Rows marked A2 / B1 are fired by those tracks (support, verification) through the same `notify()`. **The admin (A2, K-48.1: support = the CEO)**
gets a text for every new Help case, safety report or block and every Taily review (A1's included), and for a message on an open case (at most
one per case every 15 minutes while unread); those texts start "Taily admin: ".

## To the customer (48)

| No. | Event | Text (exactly as sent) | When it goes out | Link lands on | Fired by |
|---|---|---|---|---|---|
| C1 | `request-sent` | Taily: Your request is with Amara for Thu, Oct 15 · 5:00 PM. She has 2 hours to answer. We’re holding $16.00 on your Visa until then. <link> | She sends a request (or sends it again) | c-request | A1 |
| C2 | `accepted` | Taily: Amara accepted. You’re booked Thu, Oct 15 · 5:00 PM at your place. Free to cancel until Wed, Oct 14 · 5:00 PM. <link> | The tailor accepts | c-booking | A1 |
| C3 | `suggested` | Taily: Amara can’t do 5:00 PM and suggested Thu, Oct 15 · 6:00 PM. Accept it or pick another tailor: <link> | The tailor suggests another time | c-request | A1 |
| C4 | `declined` | Taily: Amara can’t take this one, so we released the $16.00 hold. See tailors who can: <link> | The tailor declines | c-request | A1 |
| C5 | `expired` | Taily: Amara didn’t answer in time, so nothing was charged. Send your request again or to another tailor: <link> | No answer within 2 hours | c-request | A1 |
| C6 | `suggestion-ended` | Taily: The time Amara suggested has passed, so we released the $16.00 hold. Send Amara a new request or find another tailor: <link> | The suggested time passed, or the tailor withdrew it | c-request | A1 |
| C7 | `reminder` | Taily: Please confirm your appointment: Amara · Thu, Oct 15 · 5:00 PM at your place. Free to change until Wed, Oct 14 · 5:00 PM. Confirm or change: <link> | 48 hours before the visit, booked at least that far ahead (K-41 → K-51) | c-job | A1 |
| C8 | `nudge` | Taily: You haven’t confirmed your 5:00 PM visit with Amara tomorrow. Confirm by 5:00 PM today or cancel it without penalty: <link> | 26 hours before the visit, not confirmed yet; the first ask when booked less than 48 hours ahead (K-43 → K-51) | c-booking | A1 |
| C9 | `auto-cancel` | Taily: We cancelled your 5:00 PM visit with Amara because you didn’t confirm by 2:00 PM. Amara keeps your $16.00 deposit. <link> | 3 hours before the visit, still not confirmed after a delivered reminder (K-43, D-02) | c-booking | A1 |
| C10 | `cant-make-it` | Taily: Amara can’t make it Thu, Oct 15 · 5:00 PM. Your $16.00 deposit is refunded and your order is saved. Find another tailor: <link> | The tailor cancels the visit | c-booking | A1 |
| C11 | `no-show-marked` | Taily: Amara marked you as not there for your 5:00 PM visit, so she keeps your $16.00 deposit. Were you there? Tell us: <link> | The tailor marks a no-show | c-booking | A1 |
| C12 | `no-show-disputed-c` | Taily: Amara says she came to your 5:00 PM visit. Taily is looking into it and will message you: <link> | The tailor says your no-show report isn’t right | c-booking | A1 |
| C13 | `tailor-move` | Taily: Amara asked to move your visit to Sat, Oct 17 · 9:00 AM. Accept the new time or keep Thu, Oct 15 · 5:00 PM: <link> | The tailor asks to move a confirmed visit (D-12) | c-booking | A1 |
| C14 | `tailor-on-way` | Taily: Amara is on her way to your 5:00 PM visit. <link> | The tailor taps On my way (S-32) | c-booking | A1 |
| C15 | `tailor-here` | Taily: Amara is at your door for your 5:00 PM visit. <link> | The tailor taps I’m here (S-32) | c-booking | A1 |
| C16 | `visit-check` | Taily: Did your 5:00 PM visit with Amara happen? Tell us: <link> | 2 hours after the start with nothing recorded (D-11) | c-booking | A1 |
| C17 | `visit-closed` | Taily: Nobody confirmed your Thu, Oct 15 · 5:00 PM visit with Amara, so we closed it as not confirmed. Your $16.00 deposit is on hold. If neither of you disputes it by Mon, Oct 19 · 7:00 PM, Amara keeps it. Didn’t happen? Tell us: <link><br>**If the tailor tapped I’m here:** Taily: You didn’t tell us if your Thu, Oct 15 · 5:00 PM visit with Amara happened, and Amara tapped I’m here at 5:00 PM, so it counts as a no-show. Amara keeps your $16.00 deposit. Were you there? Tell us: <link> | “Did the visit happen?” unanswered for 24 hours: decided by the evidence (K-51) | c-booking | A1 |
| C18 | `final-order` | Taily: Amara sent your final order: $205.00 (was $160.00). Approve it so she can start: <link> | The tailor sends the final order | c-price-change | A1 |
| C19 | `final-order-updated` | Taily: Amara updated your final order: $205.00. Check it and approve it: <link> | The tailor sends the final order again | c-price-change | A1 |
| C20 | `final-order-24h` | Taily: Amara is waiting for you to approve your final order ($205.00). Approve it so she can start: <link> | 24 hours after the final order, not approved (D-03) | c-price-change | A1 |
| C21 | `final-order-72h` | Taily: Your final order from Amara still needs your approval. Until you approve it, she can’t start, and your order will be ready later. Approve it here: <link> | 72 hours after the final order, not approved (D-03) | c-price-change | A1 |
| C22 | `final-order-review` | Taily: Your final order from Amara has waited 7 days, so Taily is stepping in to help you both. We’ll message you: <link> | 7 days after the final order, not approved → Taily review (D-03) | c-price-change | A1 |
| C23 | `edit-sent` | Taily: Amara edited your order. Review the change and approve it: <link> | The tailor edits the order after the fitting | c-price-change | A1 |
| C24 | `edit-24h` | Taily: Amara is waiting for you to approve the changes to your order: <link> | 24 hours after an edit, not approved (D-03) | c-price-change | A1 |
| C25 | `edit-72h` | Taily: Amara can’t finish your order until you answer her changes. The longer it waits, the later it’s ready. Review them: <link> | 72 hours after an edit, not approved (D-03) | c-price-change | A1 |
| C26 | `edit-withdrawn` | Taily: Amara withdrew her changes. Your order stays as you approved it. <link> | The tailor withdraws a pending edit (D-03) | c-booking | A1 |
| C27 | `ready` | Taily: Your order from Amara is ready. We’re holding $144.00 on your Visa. Choose pickup or delivery by Mon, Oct 19 · 5:00 PM, then pay: <link><br>**If the card declines the hold:** Taily: Your order from Amara is ready, but your Visa didn’t go through for the $144.00 balance. Update your card: <link> | The tailor marks the order ready (K-53: the balance is held on the saved card at once) | c-ready | A1 |
| C28 | `ready-24h` | Taily: Your order from Amara is ready and waiting. Choose how to get it back: <link> | 24 hours after ready, no way back chosen (D-03) | c-ready | A1 |
| C29 | `ready-72h` | Taily: Your order is still waiting at Reyes Tailoring. Choose pickup or delivery by Mon, Oct 19 · 5:00 PM, or we’ll charge the $144.00 and set it to in-store pickup: <link> | 72 hours after ready, no way back chosen (D-03) | c-ready | A1 |
| C30 | `ready-default` | Taily: Your order has been ready for 4 days, so we charged your $144.00 balance and set it to in-store pickup. Pick a time to collect it: <link> | 4 days after ready (the hold’s last day), no way back chosen → charged, in-store pickup (K-53, was D-03’s 14 days) | c-booking | A1 |
| C31 | `pickup-today` | Taily: Pickup today at 5:30 PM at Reyes Tailoring, 312 Metropolitan Ave. Have your pickup code ready: <link> | 2 hours before the pickup time | c-booking | A1 |
| C32 | `missed-pickup` | Taily: You missed your 5:30 PM pickup at Reyes Tailoring. Pick a new time: <link> | 30 minutes after the pickup time, not picked up | c-booking | A1 |
| C33 | `courier-on-way` | Taily: Your courier has your order. It arrives 5:00–5:30 PM. If you’re not home, it’s left in your lobby. <link> | The tailor hands the order to the courier (S-35) | c-booking | A1 |
| C34 | `delivered` | Taily: Delivered at 5:12 PM to your building’s lobby. You were charged $158.30. Didn’t get it? Tell us within 24 hours: <link> | The courier delivers (S-35) | c-complete | A1 |
| C35 | `delivery-failed` | Taily: The courier couldn’t deliver your order, so it’s going back to Amara. Pick a new delivery window, no extra charge: <link> | The courier can’t deliver (S-35) | c-booking | A1 |
| C36 | `picked-up-marked` | Taily: Amara marked your order as picked up. Confirm you got it, or tell us if you didn’t: <link> | The tailor marks it picked up without the code | c-booking | A1 |
| C37 | `completed` | Taily: You were charged $144.00 for your order with Amara. Your receipt: <link> | The order is handed over (pickup code, Confirm received, or 48 hours after the tailor marked it) | c-complete | A1 |
| C38 | `unclaimed-charged` | Taily: We charged your $144.00 balance because your order has been ready for 4 days. Amara keeps your order for 30 days. Pick a time: <link> | 4 days after ready (the hold’s last day), paid but not collected (K-53, was D-04’s 6 days after paying) | c-booking | A1 |
| C39 | `abandoned` | Taily: Your order with Amara wasn’t collected within 30 days of the charge, so we closed it. <link> | 30 days after the charge, still not collected (D-03) | c-booking | A1 |
| C40 | `card-failed` | Taily: We couldn’t charge your card for $144.00. Update your card to finish your order with Amara: <link> | Charging the balance fails (D-04) | c-booking | A1 |
| C41 | `message` | Taily: Amara sent you a message. Reply here: <link> | A new chat message: the first unread one, then at most one per 15 minutes per conversation | c-thread | A1 |
| C42 | `review-reminder` | Taily: How did Amara do? Leave a review: <link> | 7 days after completion, no review (K-28) | c-review | A1 |
| C43 | `texts-on` | Taily: Texts are on. We’ll text you about your bookings. Msg & data rates may apply. Reply STOP to opt out, HELP for help. <link> | She turns booking texts on (or replies START) | c-texts | A1 |
| C44 | `taily-replied` | Taily: We replied about your order with Amara. Read it: <link> | Taily support replies (DG-1) | c-case | A2 |
| C45 | `case-decided` | Taily: We looked into your order with Amara and made a decision. Details: <link> | Taily support decides a case (DG-1) | c-case | A2 |
| C46 | `help-replied` | Taily: We replied to your message. Read it: <link> | Taily support replies to (or closes) a Help message with no order attached (DG-1) | c-case | A2 |
| C47 | `help-reply` | Taily: Need help? Message Taily here, or open a booking and tap Get help. Reply STOP to opt out: <link> | She replies HELP to any Taily text (B-05: carriers require an answer) | c-help | A2 |
| C48 | `free-window-closed` | Taily: Your free change window for your 5:00 PM visit with Amara has closed. Confirm now so it isn’t cancelled: <link> | 24 hours before the visit (the free window’s end), still not confirmed after a delivered reminder (K-53) | c-booking | A1 |

## To the tailor (44)

| No. | Event | Text (exactly as sent) | When it goes out | Link lands on | Fired by |
|---|---|---|---|---|---|
| T1 | `request` | Taily: New request from Sarah C.: a home visit on Thu, Oct 15 at 5:00 PM. Your payout: $141.25. Reply within 2 hours: <link> | A new request (or the same request sent again) | t-request | A1 |
| T2 | `request-soon` | Taily: 15 minutes left to answer Sarah C. for Thu, Oct 15 · 5:00 PM (payout $141.25): <link> | 15 minutes before a request expires | t-request | A1 |
| T3 | `suggestion-accepted` | Taily: Sarah accepted Thu, Oct 15 · 5:00 PM. You’re booked. <link> | The customer accepts the time you suggested | t-job | A1 |
| T4 | `withdrawn` | Taily: Sarah withdrew her request for Thu, Oct 15 · 5:00 PM. Nothing to do. <link> | The customer withdraws her request | t-home | A1 |
| T5 | `switched` | Taily: Sarah chose another tailor, so her request for Thu, Oct 15 · 5:00 PM is closed. <link> | The customer picks another tailor instead of your suggested time | t-home | A1 |
| T6 | `cancelled-early` | Taily: Sarah cancelled Thu, Oct 15 · 5:00 PM, more than 24 hours ahead. Nothing is owed. The time is open again. <link> | The customer cancels 24 hours or more ahead | t-job | A1 |
| T7 | `cancelled-late` | Taily: Sarah cancelled today’s 5:00 PM visit. You keep her $16.00 deposit, paid Fri, Oct 16. <link> | The customer cancels inside 24 hours | t-job | A1 |
| T8 | `rescheduled` | Taily: Sarah moved her visit to Thu, Oct 15 · 5:00 PM. <link> | The customer moves the visit | t-job | A1 |
| T9 | `auto-cancel-t` | Taily: Sarah didn’t confirm, so we cancelled today’s 5:00 PM visit. You keep her $16.00 deposit. <link> | 3 hours before the visit, the customer never confirmed (K-43) | t-job | A1 |
| T10 | `tailor-no-show` | Taily: Sarah says you didn’t come to the 5:00 PM visit, so her $16.00 deposit was refunded. Not right? Tell us: <link> | The customer reports that you didn’t come | t-job | A1 |
| T11 | `no-show-disputed` | Taily: Sarah says she was there at 5:00 PM. Your $16.00 no-show pay is on hold while Taily looks into it: <link> | The customer says your no-show mark isn’t right (D-14) | t-job | A1 |
| T12 | `move-accepted` | Taily: Sarah accepted the new time. Your visit is now Thu, Oct 15 · 5:00 PM. <link> | The customer accepts the new time you asked for (D-12) | t-job | A1 |
| T13 | `move-kept` | Taily: Sarah is keeping Thu, Oct 15 · 5:00 PM. <link> | The customer keeps the current time (D-12) | t-job | A1 |
| T14 | `start-soon` | Taily: Your visit with Sarah starts at 5:00 PM at 145 N 7th St, 2R. Tap I’m here when you arrive: <link> | 60 minutes before the visit | t-job | A1 |
| T15 | `fitting-started` | Taily: Your fitting has started. Please take all notes here: <link> | At the visit’s start time (one text then: it replaces a second start reminder) | t-job | A1 |
| T16 | `customer-on-way` | Taily: Sarah is on her way to your shop for the 1:00 PM visit. <link> | The customer taps On my way (shop visits, S-32) | t-job | A1 |
| T17 | `customer-here` | Taily: Sarah is at your shop for the 1:00 PM visit. <link> | The customer taps I’m here (shop visits, S-32) | t-job | A1 |
| T18 | `visit-check-t` | Taily: Did your 5:00 PM visit with Sarah happen? Tell us: <link> | 2 hours after the start with nothing recorded (D-11) | t-job | A1 |
| T19 | `visit-closed-t` | Taily: Nobody confirmed your Thu, Oct 15 · 5:00 PM visit with Sarah, so we closed it as not confirmed. Her $16.00 deposit is on hold. If neither of you disputes it by Mon, Oct 19 · 7:00 PM, you keep it: <link><br>**If you tapped I’m here:** Taily: Sarah didn’t tell us if the Thu, Oct 15 · 5:00 PM visit happened, and you tapped I’m here at 5:00 PM, so it counts as her no-show. Your $16.00 no-show pay comes Fri, Oct 23. <link> | “Did the visit happen?” unanswered for 24 hours: decided by the evidence (K-51) | t-job | A1 |
| T20 | `final-approved` | Taily: Sarah approved the final order. Your payout: $141.25. You can start. <link> | The customer approves the final order | t-job | A1 |
| T21 | `final-order-review-t` | Taily: Sarah hasn’t approved your final order in 7 days, so Taily is stepping in to help you both. We’ll message you: <link> | 7 days after the final order, not approved → Taily review (D-03) | t-job | A1 |
| T22 | `edit-approved` | Taily: Sarah approved your changes. Your payout: $154.00. <link> | The customer approves your changes | t-job | A1 |
| T23 | `pickup-set` | Taily: Sarah picks up Fri, Oct 16 · 5:30 PM at your shop. Ask for her pickup code. <link> | The customer pays and picks a pickup time | t-job | A1 |
| T24 | `courier-booked` | Taily: A courier collects Sarah’s order Fri, Oct 16 at 4:45 PM. Have it packaged by then. <link> | The customer pays and picks a courier window | t-job | A1 |
| T25 | `handoff-moved` | Taily: Sarah moved her pickup to Fri, Oct 16 · 5:30 PM. <link> | The customer moves her pickup time or delivery window | t-job | A1 |
| T26 | `not-received` | Taily: Sarah says she didn’t get her order. Your $141.25 payout waits until it’s sorted. Answer here: <link> | The customer says she didn’t get her order | t-job | A1 |
| T27 | `delivery-missing-t` | Taily: Sarah says the courier’s delivery didn’t reach her. Taily is looking into it and will message you. <link> | The customer says a courier delivery never reached her (within 24 hours, S-35) | t-job | A1 |
| T28 | `delivery-failed-t` | Taily: The courier couldn’t deliver Sarah’s order and is bringing it back to you. Sarah picks a new window. <link> | The courier can’t deliver (S-35) | t-job | A1 |
| T29 | `ready-default-t` | Taily: Sarah didn’t choose a delivery method in 4 days, so we set her order to in-store pickup and charged her card. Your $141.25 payout comes Fri, Oct 23. <link> | 4 days after ready (the hold’s last day), no way back chosen → charged, in-store pickup (K-53) | t-job | A1 |
| T30 | `unclaimed-t` | Taily: Sarah hasn’t collected her order, so we charged her card for the balance. Your $141.25 payout comes Fri, Oct 23. Please keep her order for 30 days. <link> | 4 days after ready (the hold’s last day), paid but not collected (K-53, D-03) | t-job | A1 |
| T31 | `abandoned-t` | Taily: Sarah’s order wasn’t collected within 30 days of the charge, so we closed it. <link> | 30 days after the charge, still not collected (D-03) | t-job | A1 |
| T32 | `card-failed-t` | Taily: We couldn’t charge Sarah’s card. Your $141.25 payout is waiting until she updates it. <link> | Charging the customer’s balance fails (D-04) | t-job | A1 |
| T33 | `job-done-t` | Taily: Sarah has her order. Job done. Your $141.25 payout comes Fri, Oct 16. <link> | The order is handed over (not by your own code entry) | t-job | A1 |
| T34 | `card-fixed-t` | Taily: Sarah updated her card and paid. Your $141.25 payout comes Fri, Oct 16. <link> | The customer’s new card goes through (D-04) | t-job | A1 |
| T35 | `payout-sent` | Taily: Your $141.25 payout is on its way to Chase •••• 6789. <link> | The Friday payout run pays it | t-earnings | A1 |
| T36 | `payout-failed` | Taily: Your $141.25 payout didn’t go through. Chase •••• 6789 sent it back. Update your bank details: <link> | The bank sends a payout back | to-payouts | A1 |
| T37 | `message-t` | Taily: Sarah sent you a message. Reply here: <link> | A new chat message: the first unread one, then at most one per 15 minutes per conversation | t-thread | A1 |
| T38 | `new-review` | Taily: Sarah left you 5 stars. Read her review: <link> | The customer leaves a review | t-job | A1 |
| T39 | `texts-on-t` | Taily: Texts are on. We’ll text you new requests and job updates. Msg & data rates may apply. Reply STOP to opt out, HELP for help. <link> | She turns texts back on (or replies START) | t-texts | A1 |
| T40 | `verified` | Taily: You’re verified. Customers near you can book you now. <link> | Verification passes (DG-4) | t-shop | B1 |
| T41 | `check-action-needed` | Taily: We need one more thing to verify you: your ID. Finish it here: <link> | A verification check needs something from her (DG-4 B: ID & Profile Photo, Background Check, Years Tailoring, Payout & Tax Info; no insurance — Taily provides it) | t-shop | B1 |
| T42 | `taily-replied-t` | Taily: We replied about your job with Sarah. Read it: <link> | Taily support replies (DG-1) | t-case | A2 |
| T43 | `help-replied-t` | Taily: We replied to your message. Read it: <link> | Taily support replies to (or closes) a Help message with no job attached (DG-1) | t-case | A2 |
| T44 | `help-reply-t` | Taily: Need help? Message Taily here, or open a job and tap More, then Get help. Reply STOP to opt out: <link> | She replies HELP to any Taily text (B-05: carriers require an answer) | t-help | A2 |

## To the admin (2)

| No. | Event | Text (exactly as sent) | When it goes out | Link lands on | Fired by |
|---|---|---|---|---|---|
| A1 | `admin-case` | Taily admin: New case TY-4821: No-show disputed · from Sarah Chen · order A-1001. Open it: <link> | A new Help case, a safety report or block, or any Taily review opens (A1’s reviews included; K-48.5: a visit nobody answered 4 hours after its start) | a-case | A2 |
| A2 | `admin-message` | Taily admin: Sarah wrote on case TY-4821. Reply: <link> | Someone writes on an open case (at most one text per case every 15 minutes while unread) | a-case | A2 |
