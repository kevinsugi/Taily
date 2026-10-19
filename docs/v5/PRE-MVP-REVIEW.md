# Pre-MVP design review (director, Oct 18 2026) — text export of https://claude.ai/artifact/4GUmvuxn7qo8iEDs8a9UCN
# Findings B-xx (blockers), S-xx (should-fix), P-xx (polish), D-xx (decisions — see K-48 in DECISIONS.md for Kevin's answers), SF-xx (small fixes, already applied in 528ad2e), DG-x (design gaps, mockups https://claude.ai/artifact/6BkkvP1KHBTGyJhP7posug).

Pre-MVP Design Review
    Taily v5 · branch V5 · HEAD 5b5f10d · Oct 18, 2026
    Pre-MVP Design Review
    A design-director pass over both personas, onboarding, system timers and launch compliance, merged from six reviewers and re-checked against the code and live renders. Every blocker and should-fix below was confirmed in the code or in a render before it made this list.
      15 blockers
      42 should-fix
      34 polish
      24 decisions for Kevin
      44 small fixes going in now
      4 design gaps being mocked
      Verdict
      Blockers
      Should-fix
      Polish
      Missing features
      Benchmarks
      Compliance
      Consistency + a11y
      Decisions
      Small fixes
      Design gaps
      Coverage
  Verdict
    The happy path is close to MVP-ready. Booking, the fitting, approval, the way back and payouts read clearly on both sides, the visual system is consistent (no off-scale type, no serif money, clean reflow at 320 px), and money is dollars-only everywhere. What is not ready is everything around the happy path. Three cross-persona bugs can show the two people different money or lock them out of each other mid-job. Several states have no clock and no exit, so garments and money can sit forever. There is no way to reach Taily at all. And the notification and payout layer is too thin to send texts legally or pay a tailor. Most of the money and copy breaks are small, safe fixes that are going in now. The rest needs about a dozen product calls from you and four design pieces before infrastructure starts.
      The top 5
        Fix the three cross-persona money/state bugs now: chat locks on a live job (B-01), Approve applies a revision Sarah never saw (B-02), and a rush due-date edit shows Sarah $160.00 while Amara is told $200.00 (B-03).
        Give both personas a way to reach Taily, with a "Taily is reviewing" dispute state for no-shows, missing orders and stalled approvals (B-05).
        Write the notification matrix before building SMS: only 4 events send a text today, and a tailor is never told her visit was cancelled (B-06, B-08).
        Give every waiting state a clock and an end: final order, edit, ready, problem reported, unclaimed (B-07, B-14).
        Make tailor onboarding real: verification behind the Verified check, hosted payout identity and tax info, the Tailor Agreement, and no accidental go-live from Finish later (B-04, B-11, B-12).
  Blockers 15
  A person cannot finish a core task, or the two personas disagree about money or state. Fix before MVP infrastructure starts.
        B-01BlockerSmall fix
        Declining a second request locks the chat for a job that is still in progress, on both sides
        Persona Both
Screens c-thread, t-thread, c-booking, c-price-change
Kind UX break
Size S
          Evidence
Re-run: driveTo('in-progress'), then addRequest(), then Amara declines the new request. threadReadOnly returns true while the first job is still in progress. The header still says "In progress · Thu, Oct 15 · 5:00 PM", but the composer is replaced by "Amara declined this request, so this chat is closed." Chat is the only channel for disagreeing with the final order (K-30), for edits, for pickup changes and for "sort it out in chat", so both people lose it mid-job. Cause: js/state.js:204-207 only reads the pair's latest appointment.
          Proposed fix
Keep the thread writable while any appointment with this tailor is still live: const mine = state.appts.filter((a) => a.tailorId === tailorId); const latest = mine.at(-1); return !!latest && latest.status === 'declined' && !mine.some((a) => !TERMINAL.includes(a.status) && a.status !== 'expired'); Add FLOWS c-thread--declined-active and t-thread--declined-active.
        Re-run at 390. The live job sits above "this chat is closed".
        B-02BlockerEngineeringNeeds mockup (1 banner state)
        Approve applies whatever order is current, not the one on Sarah's screen
        Persona Both
Screens c-price-change, c-price-change--edit, t-adjust
Kind UX break · money
Size M
          Evidence
Re-run: Sarah's c-price-change shows "$205.00 New total". Amara re-sends every line $50.00 higher (sendPriceChange succeeds while pending). Sarah taps Approve on the unchanged screen. The model goes to in-progress with a $405.00 total and c-booking says "Pay the $389.00 balance". approvePriceChange (state.js:987) and approveJobEdit (state.js:1370) take no version. On two real phones this is an ordinary race, because revising stays open while the order is pending (D-26).
          Proposed fix
Pass the revision Sarah saw: approvePriceChange(id, { revision }) and approveJobEdit(id, { revision }) fail 'revised' when it differs. On that error, re-render with a warning banner: "Amara updated the order while you were looking. New total $405.00 (was $205.00). Check it before you approve." The infrastructure API must carry the same version (optimistic concurrency); apply it to acceptSuggestion and a re-quoted courier hold too.
        B-03BlockerSmall fix
        A due-date-only edit on a rush job: Sarah sees $160.00, Amara is told Sarah sees $200.00
        Persona Both
Screens c-price-change--edit, t-job--edit-pending
Kind Consistency · money
Size S
          Evidence
Re-run: driveTo('in-progress', { rush: true }), then an edit with the same lines and a later due date. The $40.00 rush fee correctly drops. Sarah's header reads "$160.00 Total" with no "was", no change line and no mention of the removed rush fee. Amara reads "Was $187.50 · down $40.00 · Sarah sees the total as before, $200.00." Both screens key off ev.changed, which only tracks line edits (c-price-change.js:96, t-job.js:447).
          Proposed fix
Use const moved = ev.after.total !== ev.before.total. On c-price-change, show "New total" and the delta lines when priced || moved, and add a row "Rush fee · Removed, later due date · $0.00" when the rush dropped. In t-job.js:447 switch the sentence on moved. Add FLOWS c-price-change--edit-due-rush and t-job--edit-pending-rush.
          Sarah: $160.00, no "was".
          Amara: told Sarah sees $200.00.
        B-04BlockerSmall fix
        Finish later on Payouts silently takes the tailor live
        Persona Onboarding, customer
Screens to-payouts, t-phone--saved, c-tailors
Kind UX break
Size S
          Evidence
Re-run: on ?flow=to-payouts, type a routing and account number, tap Finish later. She lands on "Your progress is saved · Sign in … to pick up where you left off", but the model has live: true and Sarah's tailor list shows her (1 row). Signing back in goes straight to t-home, so she never sees to-done "You're bookable". Cause: finishLater() calls T.setPayouts (to-payouts.js:240), and setTailorSection sets live as soon as the tailor is bookable (state.js:407).
          Proposed fix
Only "Finish and go live" may publish. In finishLater(): const t = myTailor(); const wouldGoLive = SECTIONS.filter((s) => s !== 'payouts').every((s) => t.onboarding[s]); if (!wouldGoLive) T.setPayouts({ ...draftOf() }); (import SECTIONS from state.js). Bank numbers are retyped on return, which is also the safer default for account data. Add FLOWS to-payouts--finish-later.
        Says "saved". The model already lists her to customers.
        B-05BlockerNeeds mockupNeeds decision
        There is no way to reach Taily: every dispute ends in the other party's chat
        Persona Both
Screens c-account, t-shop, c-booking--no-show, t-job--tailor-no-show, c-booking--handoff-problem, t-job--handoff-problem, c-price-change, c-complete
Kind Missing feature
Size L
          Evidence
A grep for help, support or contact across every c-, t- and to- screen finds nothing. The dead ends:
              c-booking--no-show: "Amara … keeps your deposit. If you were there, message Amara." Her only recourse is the person who kept the $16.00.
              t-job--tailor-no-show: "Sarah reported you didn't show up … Nothing is paid out", with only Message. First report wins (Study-1 default 8).
              Handoff problem: both sides are told "sort it out in chat" and both timers pause with no limit.
              c-price-change has no decline (K-30) and no timeout, so a disagreement never ends.
              After completion (including auto-completion) there is no "something isn't right".
              SMS HELP replies (needed for carrier registration) have nowhere to point.
          Proposed fix
Design gap DG-1: a Help row in c-account and t-shop; "Get help with this order" on c-booking, c-complete, c-price-change and t-job from confirmed on; "That's not right" on a no-show report or a problem report, which moves both personas to "Taily is reviewing · we reply by …" with money frozen. K-30 is unchanged: chat stays the first step, support is the fallback. Decision D-01 sets what support can do.
        c-booking--no-show: the only path is the other party.
        B-06BlockerNeeds decisionNeeds mockup
        The other person is almost never told: a cancelled visit just disappears from the tailor's Home
        Persona Both
Screens t-home, c-job, c-request, t-job, system texts
Kind Missing feature
Size L
          Evidence
Only four events send a text: a new request to the tailor (system.js:213) and the customer's reminder, nudge and auto-cancel (flow-menu.js:201). Nothing reaches Amara for a late cancel, an auto-cancel 3 hours before a home visit, a reschedule, an approval, a way back chosen or moved, a problem or a no-show report. Her Home then reads "Nothing upcoming" with no trace of the visit (cancelled is filtered out of ACTIVE), so after an auto-cancel at 2:00 PM she can still travel to a 5:00 PM home visit. Sarah gets nothing for accepted, declined, a suggested time, expired, final order, edit, ready, courier or completion, although c-request promises "We'll text you the moment Amara replies." Onboarding drop-offs get no follow-up either.
          Proposed fix
Decision D-02: a notification matrix (event × recipient × copy starting "Taily:" × link landing on statusScreen for that persona × quiet hours). Design gap DG-2: one-time notice cards on t-home and c-job for cancellations within 48 hours of the visit ("Sarah cancelled today's 5:00 PM visit · You keep her $16.00"), and a Demo-action text for every row so the copy can be reviewed. Add a model test that every timer-driven change writes a thread line for both readers.
        t-home after the auto-cancel: no trace, no text.
        B-07BlockerNeeds decision
        Five waiting states have no clock and no exit, so garments and money can sit forever
        Persona Both
Screens c-price-change, t-job--waiting, t-job--edit-pending, c-ready, t-job--ready, t-job--handoff-problem, t-job--handoff-unclaimed, t-earnings
Kind Missing feature
Size L
          Evidence
tick() (state.js:95) runs timers only for requested, suggested, awaiting-handoff and confirmed. Without an end:
              Final order pending: 10 days later both lists still say "Reply needed", past the due date, with Sarah's garments at the shop.
              Edit pending: Mark ready is disabled ("Sarah hasn't answered your changes yet.") and Amara cannot withdraw. Re-sending the approved order fails no-change, and no withdrawJobEdit exists.
              Ready: if Sarah never picks a way back, the job never ends and Amara is never paid.
              Problem reported: both timers pause indefinitely.
              Unclaimed: Sarah is charged after 7 days, but payouts are only created at completion, so t-earnings reads "No earnings yet" while Taily holds $144.00 for a finished $147.50 job.
          Proposed fix
Decision D-03 sets the clocks. Recommended: reminder texts at 24 and 72 hours for a pending final order, edit or ready order; final order unanswered for 7 days goes to Taily review; ready for 14 days defaults to in-store pickup and starts the 7-day clock; pay the tailor when the unclaimed charge happens; close abandoned orders 30 days after the charge with a storage notice. Add withdrawJobEdit(id) and a "Withdraw changes" link on t-job--edit-pending (no K-30 conflict, Sarah still can't decline). Add "Overdue · due Fri, Oct 23" to both lists, and an "On the way" section on t-earnings.
        B-08BlockerSmall fix (copy)Needs decision
        Texts are the only channel (K-43), but there is no SMS consent, and an undelivered reminder still forfeits the deposit
        Persona Both
Screens c-phone, t-phone, c-booking--auto-cancelled, t-home, system texts
Kind Compliance
Size M
          Evidence
c-phone and t-phone say only "US numbers only. Message and data rates may apply." (c-phone.js:12, t-phone.js:14). No message types, frequency, STOP or HELP, no Terms and Privacy links at the consent point, and text bodies carry no brand name. Carriers reject 10DLC campaigns for exactly this (Twilio 30924), and a rejected campaign means no notifications at all. The reminder is stamped as sent from the clock alone (state.js:1499) and the auto-cancel keeps the deposit (state.js:1518) even if she replied STOP or the text never arrived. Making texts a condition of booking is itself a rejection reason (Twilio 30923).
          Proposed fix
Now (copy): c-phone helper "We'll text you a sign-in code and updates about your bookings from Taily. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help." t-phone the same with "new requests and updates about your jobs". Start every text body with "Taily: ". Decision D-02: make booking texts a separate opt-in with an email and in-app fallback, auto-cancel only after a delivered reminder to an opted-in number, and bring back a "Texts are off" banner on t-home and c-bookings.
        B-09BlockerNeeds decision
        Apple or Google sign-in skips the phone number, so she gets no texts and can be auto-cancelled
        Persona Customer
Screens c-welcome, c-phone, c-code, c-name, sys-session-expired
Kind UX break
Size S
          Evidence
c-welcome.js:46-55: Apple or Google calls A.signInWith(provider) and goes straight to c-job, skipping c-phone, c-code and c-name. D-301 sends texts "to the phone verified at sign-in", and the re-auth sheet asks for "the code we sent to" her phone. A social sign-in customer gets no reply text, no 24-hour reminder, is auto-cancelled with the $16.00 kept, and cannot re-authenticate.
          Proposed fix
After Apple or Google, route to c-phone with "Add your mobile number. We text you when your tailor replies and before your visit.", then c-code, then c-name only if the provider gave no name. The screens exist; only routing changes. Or drop social sign-in for MVP (decision D-07).
        B-10BlockerSmall fix
        Losing the deposit for not confirming the reminder is never disclosed before paying
        Persona Customer
Screens c-pay, c-booking, c-request, deposit info sheet
Kind Compliance · copy
Size S
          Evidence
c-pay lists the hold and "Free cancellation until Wed, Oct 14 · 5:00 PM". The deposit sheet (components.js:1214-1218) still says only "Free cancellation until 24 hours before the visit." Neither mentions that confirming the reminder ends the free window early (c-booking--cancel-confirmed: "Cancel and lose the $16.00 deposit"), that an unconfirmed visit is cancelled 3 hours before with the deposit kept (D-300), or that not being there forfeits it. The rule first appears when the reminder arrives or after the loss.
          Proposed fix
Add a c-pay info row after the cancel row (skip it when no reminder will be sent): We'll text you the day before to confirm. If you don't confirm ${POLICY.REMINDER_AUTOCANCEL_H} hours before the visit, we cancel it and ${first} keeps the ${money(dep)} deposit. Add to the deposit sheet: "The day before, we text you to confirm. Once you confirm, the tailor keeps the deposit if you cancel or aren't there." plus the same auto-cancel line.
        B-11BlockerNeeds decisionNeeds mockup
        The Verified check promises an ID check, background check and insurance that nothing collects
        Persona Both
Screens c-tailor--verified, c-tailors, to-profile, to-done, t-shop
Kind Compliance
Size L
          Evidence
The popover lists "ID verified · Background check · N years of experience · Insured" (K-15). BLANK_TAILOR has verified: false, badges: [], years: 0 and no to- step collects any of it. "Finish and go live" publishes immediately with no review. The to-profile preview hard-codes verified: true (to-profile.js:84), so a blank tailor sees a check her real card (to-done) doesn't show. Unbacked safety claims to customers are a deception risk, and an NYC background check must follow the Fair Chance process plus an FCRA disclosure.
          Proposed fix
Now: to-profile.js:84 verified: !!t.verified. Decision D-05 + design gap DG-4: a "Get verified" step (ID and selfie, background-check consent, insurance upload with expiry, years), "Under review" on to-done and t-shop, and the check shown to customers only when every item passed. K-15's popover stays; it just becomes true.
        A blank tailor's preview already shows the check.
        B-12BlockerNeeds decisionNeeds mockup
        The payouts step cannot legally pay a tailor: no identity, tax ID, W-9 or Tailor Agreement
        Persona Onboarding
Screens to-payouts, t-phone, t-shop, t-earnings
Kind Compliance
Size L
          Evidence
to-payouts asks for Name on the account, Routing number and Account number only (to-payouts.js:107-109), then "Finish and go live". No legal name, date of birth, address, SSN last 4 or EIN, business type, W-9 certification, 1099 e-delivery consent or processor terms. t-earnings has no tax documents. The tailor path (c-welcome "Join Taily" → t-phone) shows no Terms or Privacy line at all, and going live accepts no Tailor Agreement (contractor status, fees, cancellation and no-show rules). NYC's Freelance Isn't Free Act expects written terms once an engagement reaches $800 (counsel to confirm whether Taily is the hiring party).
          Proposed fix
Now (copy): t-phone legal line "By continuing you agree to Taily's Tailor Terms and Privacy Policy." and above "Finish and go live": "By going live you agree to the Taily Tailor Agreement." Decision D-06 + DG-4: rebuild step 6 on the processor's hosted onboarding (Stripe Connect Express), keep Taily's fee card, and design the Verifying / Action needed / Verified states on to-payouts, t-shop and t-earnings, plus a Tax documents row.
        B-13BlockerNeeds decision
        A tailor who skips one of the job's services is listed with a lower estimate, then booking fails with a generic error
        Persona Both
Screens to-services, c-tailors, c-tailor, c-pay
Kind UX break · money
Size M
          Evidence
tailorsFor (state.js:534-556) never checks the quote's missing services, so a tailor without "Take in jacket sides" shows "$105 Est." for Sarah's $160 job, and c-tailor's estimate silently drops the line. requestBooking then fails service-not-offered (state.js:600), which c-pay maps to "Something went wrong on our side" (c-pay.js:276), so retrying never works. The prototype hides it only because the seed tailor prices all 10 services; real tailors won't.
          Proposed fix
Decision D-08. Recommended: hide tailors who can't do every requested item (with an empty-state reason), give service-not-offered its own c-pay message, and tell tailors in to-services: "Customers only see you when you offer every service their order needs."
        B-14BlockerNeeds decision
        The 7-day balance hold (K-27) can outlive the card authorization, and a re-quoted courier raises it with no card check
        Persona System, both
Screens c-ready, c-booking--change-window, c-booking--handoff-unclaimed, t-job--handoff-unclaimed
Kind Compliance · money
Size M
          Evidence
UNCLAIMED_CAPTURE_D 7 and HANDOFF_PICK_DAYS 7 land exactly on a card-not-present authorization's 7-day life (Stripe); Visa merchant-initiated holds are shorter. A reported problem pauses the clock past it (unclaimedAt adds the paused time). Moving the courier window re-quotes the hold upward ($154.45 to $158.30, D-299), which needs a new authorization that can be declined. captureHold has no failure branch, and no screen covers "we couldn't charge your card" or the tailor's view of it. K-27 is kept; this is where it breaks in production.
          Proposed fix
Decision D-04. Recommended: capture by day 6 and cap pick days at 5, convert any paused dispute to capture or release before expiry, and design "Your card needs attention · update it to keep your pickup" (customer) and "Payment issue on Sarah's side · your payout is waiting" (tailor).
        B-15BlockerNeeds mockup
        A tailor with no shop can go live with the courier as her only way back, but her pickup address is never collected
        Persona Tailor, onboarding
Screens to-where, to-returns, t-shop, t-job--handoff-courier
Kind Missing feature
Size M
          Evidence
With the shop off, to-returns makes Taily courier the only option, captioned "We send a courier to collect it from your home". handoffSlots says the courier collects from her home address (state.js:1074), but BLANK_TAILOR stores a shop street only, and no step or Shop row asks for a home address. Every order a home-only tailor finishes needs a courier with nowhere to go.
          Proposed fix
When the shop is off and the courier is on, ask in to-returns: "Where should the courier collect finished orders?" (street, apt or floor, ZIP, notes for the courier), marked private and required for that step. Summarize it on t-shop: "Courier collects from 40 Mercer St".
  Should-fix for launch 42
  Confusing, inconsistent, or a feature people will expect on day one. Grouped by journey.
        S-01Should-fixSmall fix
        Home shows only the newest booking, which can hide the 24-hour reminder or an approve card on an older one
        Persona Customer
Screens c-job, c-job--reminder
Kind UX break
Size S
          Evidence
A confirmed visit with the reminder due plus a newer request: Home shows "Amara Reyes · No reply · Thu, Oct 15 · 6:00 PM" and no "Still on for tomorrow?" card. activeRow() uses activeAppt(), the newest live appointment (c-job.js:64). Missing that card means auto-cancel with the deposit kept. An older order waiting on approve or ready hides the same way.
          Proposed fix
const a = visitReminder() ?? apptsFor('customer').find((x) => ['price-change', 'ready', 'suggested'].includes(x.status) || x.edit?.state === 'pending') ?? activeAppt();
        The reminder for Thursday's visit is not shown.
        S-02Should-fixSmall fix
        Home drops the Confirm card in the "missed" state, 3 hours before the auto-cancel
        Persona Customer
Screens c-job, c-booking--reminder-missed
Kind UX break
Size S
        Evidence
After the nudge, Home shows a plain row; c-booking says "Confirm by 2:00 PM or we'll cancel the visit". c-job.js:83 checks reminderDue(a), which is the asked state only. That came from D-296(4), defaulted before K-43 added the auto-cancel; Kevin approved D-296 items 1, 2, 3, 7 and 9, not 4.
        Proposed fix
Show the prompt when ['asked', 'missed'].includes(reminderState(a)); for missed use "Confirm by ${fmtTime(autoCancelAt(a))} or we'll cancel" and the c-booking rule line. Log it as a D-## overriding D-296(4).
        S-03Should-fixSmall fix
        Shop-visit reminders say "aren't home" and "Confirm, I'll be home"
        Persona Both
Screens c-job--reminder, c-booking--reminder, -reminder-confirmed, -reminder-missed, t-job--reminder-confirmed
Kind Copy
Size S
        Evidence
D-296(9) gives shop visits the same prompt, but the strings are fixed: c-booking.js:174, 204, 211, 218, the CTA at :219, c-job.js:86 and t-job.js:523 ("If she isn't home, you're paid $25.00").
        Proposed fix
const away = a.job.visitType === 'home' ? 'aren’t home' : 'don’t come to the shop'; in each rule; CTA "Confirm, I'll be there" for shop visits; t-job "If she doesn't come, you're paid …".
        S-04Should-fixSmall fixNeeds decision
        After the visit time passes, the booking still says "less than 24 hours away" and offers Cancel, which forfeits the deposit
        Persona Both
Screens c-booking, c-booking--no-show-link, c-bookings, t-job--visit
Kind UX break
Size M
          Evidence
Two days after a Thursday visit with nothing recorded, c-booking still shows "The visit is less than 24 hours away. If you cancel now, Amara keeps your $16.00 deposit.", "To change the time now, message Amara." and Cancel booking (c-booking.js:176-181). If the tailor was the no-show, cancelling forfeits $16.00 instead of a refund. It stays under Upcoming; t-job keeps "Start fitting". No timer resolves it.
          Proposed fix
Now: once now() >= slot.start, policy "Your visit was at 5:00 PM. If Amara didn't come, tap Tailor didn't show up? to get your $16.00 back.", and hide Cancel, Reschedule, the late line and Add to calendar. Decision D-11: at start plus 2 hours, ask both "Did the visit happen?"; unanswered after 24 hours becomes a cancel with a refund.
        Saturday, for Thursday's visit.
        S-05Should-fixSmall fix
        Home and Bookings rows show the wrong amount, time and place after a way back is chosen or an edit is pending
        Persona Customer (tailor rows too)
Screens c-job--active, c-bookings, t-home
Kind Consistency
Size S
          Evidence
Edit pending: "Approve · $160 · Total", while the screen it opens says "New total $175.00". Pickup: Home "$160 · At my place", Bookings "$144 · At my place" for an in-store pickup, and neither shows the picked time (Fri, Oct 16 · 5:30 PM). Courier: "since 5:00 PM" instead of the window. t-home shows "Ready for pickup" with no hint Sarah missed it. Code: c-job.js:73-79, c-bookings.js:68-91.
          Proposed fix
In both row builders: awaiting-handoff uses the held balance, chargedWhen(a.returnOption), the handoff slot and "At Reyes Tailoring" or "Delivered to my place"; edit-pending uses jobEditView(a).after.total with "Reply needed" in the action tone; a missed pickup reads "Missed 5:30 PM pickup" on both sides.
        Row says $160; the approval says $175.00.
        S-06Should-fixNeeds decision
        "I got it" can close and charge the order before the pickup time or the courier delivery
        Persona Both
Screens c-booking--handoff-pickup, c-booking--handoff-courier, t-job--handoff-pickup
Kind UX break
Size S
          Evidence
On Thursday, with pickup booked for Fri, Oct 16 · 5:30 PM, the page ends with "I got it" and "Have it already? Tap I got it to close the order." Tapping it charges $144.00 and completes the tailor's job while the garments are still at the shop, skipping the pickup code (c-booking.js:373-376).
          Proposed fix
Decision D-09. Recommended: show "I got it" only after Amara marks it handed over, the courier delivers, or the pickup slot has started. Before that, the pickup code is the only action.
          Pickup is Friday…
          …but she can close it Thursday.
        S-07Should-fixSmall fix
        Sarah can move her pickup past the 7-day charge
        Persona Customer
Screens c-booking--change-time, c-booking--handoff-unclaimed
Kind UX break
Size S
        Evidence
Re-run: hold Thu, Oct 15 · 5:00 PM, charge due Thu, Oct 22 · 5:00 PM. On Friday she moves pickup to the last slot offered, Fri, Oct 23 · 12:00 PM, and it is accepted. She is then charged "after 7 days" while her pickup is still scheduled. handoffSlots counts 7 days from now, not from the hold (state.js:1087), against D-295(1)'s stated intent.
        Proposed fix
const until = Math.min(from + POLICY.HANDOFF_PICK_DAYS * DAY_MS, appt?.status === 'awaiting-handoff' ? (unclaimedAt(appt) ?? Infinity) : Infinity); Add FLOWS c-booking--change-time-capped.
        S-08Should-fixSmall fix
        After paying, neither side sees the date the 7-day charge happens
        Persona Both
Screens c-booking--handoff-pickup, c-booking--handoff-courier, t-job--handoff-pickup
Kind Copy
Size S
        Evidence
c-ready says "If you haven't got it 7 days after you choose, we'll charge the $144.00 then". Once she pays, c-booking shows "$144.00 Charged at pickup" with no date; the next mention is after the fact. t-job never mentions it.
        Proposed fix
c-booking, while the balance is held and no problem is open: "If you haven't got it by Thu, Oct 22 · 5:00 PM, we'll charge the $144.00 then." t-job: "If Sarah hasn't collected by Thu, Oct 22, we charge her." Both use unclaimedAt(a).
        S-09Should-fixSmall fix
        Charged after 7 days, then marked picked up: the banner and the "I didn't get it" sheet both say the wrong thing
        Persona Customer
Screens c-booking--handoff-unclaimed, c-booking--not-received
Kind Copy
Size S
        Evidence
The strip says "Amara marked it picked up" next to "Amara still keeps it for you until you pick it up" (c-booking.js:358). The not-received sheet says "Nothing is charged while you sort it out in chat." after she was charged $144.00 (c-booking.js:630).
        Proposed fix
Add && !marked to the unclaimed banner. Sheet: when the balance is no longer held, "You've already been charged $144.00. We'll keep the order open while you sort it out." Add FLOWS c-booking--not-received-charged.
        S-10Should-fixSmall fix
        After Sarah reports "I didn't get it", Amara has no Picked up button, although the model allows it
        Persona Tailor
Screens t-job--handoff-problem
Kind UX break
Size S
        Evidence
t-job.js:222 gives the problem state Message only. markHandedOver and confirmPickup both work there and restart the 48 hours. If Sarah comes back to the shop, Amara can't enter her code.
        Proposed fix
h.problemAt ? problemBar({ secondaryLabel: 'Picked up', secondaryAct: 'picked-up' }). Add FLOWS t-job--handoff-problem-remark.
        S-11Should-fixSmall fix
        A request Sarah withdrew shows Amara "Couldn't accept the request. Try again."
        Persona Both
Screens t-request, t-job, c-request--withdraw
Kind UX break
Size S
        Evidence
Re-run: withdraw while t-request is open, then Accept: toast "Couldn't accept the request. Try again." (t-request.js:277); retrying can never work. t-job for a withdrawn or switched request falls through to "Visit confirmed". The reverse race on c-request toasts "Couldn't withdraw the request. It's still open." when it is in fact now a paid booking.
        Proposed fix
On failure, check the appointment: if cancelled with reason withdrawn or switched, go to t-home and toast "Sarah withdrew this request." or "Sarah chose another tailor.". Add a t-job copy branch "Sarah withdrew her request · Nothing is owed. The time is open again." On c-request not-pending: go to the booking and toast "Amara just accepted. You're booked."
        S-12Should-fixEngineering
        Offline doesn't stop payments: Accept and Pay succeed under "You're offline"
        Persona System
Screens sys-offline, t-request, c-ready, c-pay, c-booking, t-job
Kind UX break
Size M
        Evidence
Only sendMessage checks the network (state.js:1605). With the offline banner up, Accept toasts "Accepted. Sarah has been told." and Pay holds the balance. Only requestBooking simulates a server error.
        Proposed fix
One failure pattern for every state change: busy, then an inline error by the button, "You're offline. Nothing was sent or charged." with Retry. A shared network guard in the T wrappers. This becomes the API error contract.
        S-13Should-fixNeeds decision
        No quiet hours: requests expire overnight, and a 9:00 AM visit is nudged at 3:00 AM and cancelled at 6:00 AM
        Persona Both
Screens t-request, c-request--expired, c-booking--reminder-missed, c-booking--auto-cancelled
Kind UX break
Size M
        Evidence
The 2-hour reply window (state.js:587) and the suggestion window ignore the hour: a 10:30 PM request expires at 12:30 AM, spends one of Sarah's two retries and counts against Amara. A Saturday 9:00 AM visit gets its nudge at 3:00 AM and is auto-cancelled at 6:00 AM with $16.00 kept. K-43's 6-hour and 3-hour rules stay; this is how they break for early visits.
        Proposed fix
Decision D-10: quiet hours 9 PM to 8 AM. The reply clock starts at the tailor's next open hour; texts due in quiet hours go out the evening before; the strips show the real deadline ("Amara replies by 11:00 AM tomorrow").
        S-14Should-fixSmall fix
        c-ready never has a Back, and c-request has one only when opened from Bookings
        Persona Customer
Screens c-ready, c-request
Kind UX break
Size S
          Evidence
Re-run: Bookings → ready row → c-ready shows the logo, no Back. c-ready.js never imports navBackMark, while c-complete and c-price-change do. c-request shows Back only when backTarget() === 'c-bookings' (c-request.js:33, 85, 106), so from Home or the thread's context card there is no way back. K-06 requires a visible in-app Back.
          Proposed fix
Render ${navBackMark()}${hero} in c-ready. In c-request use backTarget() !== 'c-pay', so Back hides only straight after sending.
        Reached from Bookings, no Back.
        S-15Should-fixSmall fix
        Strip-led pages announce only a person's name, so screen readers and the tab title skip the state
        Persona Both
Screens c-price-change, c-booking--handoff-*, t-job (about 30 states), t-request
Kind Accessibility
Size S
        Evidence
About 80 states have an h1 of "Amara Reyes" or "Sarah Chen" with the state in the page strip above it. app.js:236-239 focuses the h1 and announce() (app.js:390-396) writes only the h1 to the live region and document.title, so 30 t-job states are all titled "Sarah Chen · Taily", and a re-render that keeps the h1 announces nothing.
        Proposed fix
No visual change: in announce() prefix the page strip text ("Approve your final order · Amara changed it at the fitting — Amara Reyes"); give the page strip id="page-strip" and the h1 aria-describedby="page-strip".
        S-16Should-fixSmall fix
        Toasts may go unannounced, and Undo toasts vanish after 5 seconds
        Persona Both
Screens c-booking, t-job, t-adjust, c-ready
Kind Accessibility
Size S
        Evidence
components.js:761-783 creates a pre-filled role=status element, which screen readers announce unreliably. "Note deleted. Undo" auto-dismisses at 5000 ms with no pause on hover or focus (WCAG 2.2.1).
        Proposed fix
Add persistent polite and assertive live regions next to #route-status in index.html; toast() clears then sets their text. Action toasts stay at least 10 s and pause on pointerenter and focusin.
        S-17Should-fixSmall fix (CTA)Engineering (rem)
        Type ignores the user's text size, and fixed-height buttons overprint at double text size
        Persona Both
Screens t-adjust, c-job, c-tailors, t-home
Kind Accessibility
Size M
          Evidence
The --size-* tokens are px, so browser text settings do nothing. Simulating double text size: "Send to Sarah for approval" overprints "Your payout $147.50" in t-adjust (fixed .cta{height:54px}, components.css:31), c-job garment tiles clip, the c-tailors filter row pushes "Need by" off screen. Zoom reflow at 320 is clean.
          Proposed fix
Now: .cta{height:auto;min-height:54px;padding-block:var(--space-12)}. Before MVP: move size and line-height tokens to rem on a 16 px root, wrap the filter pill row, and use min-height on garment tiles; re-check the K-12 money heroes.
        t-adjust bar at double text size.
        S-18Should-fixEngineering
        The Verified check is a role=button span nested inside the tailor-row button
        Persona Customer
Screens c-tailors, t-shop, to-profile, to-done
Kind Accessibility
Size M
        Evidence
verifiedCheck({ inline: true }) (components.js:1051) renders a focusable span inside <button class="tailor-row">. Nested interactive content is invalid and screen readers fold the check into the card's name. K-25 already solved this for the t-home request card with a stretched link.
        Proposed fix
Make tailorRow an <article> whose name is a stretched-link button, with the Verified check as a real sibling button above the overlay. No visual change.
        S-19Should-fixSmall fix
        Turning home visits off doesn't recheck Availability, so the tailor stays offline
        Persona Tailor
Screens t-shop--incomplete, to-where--edit
Kind UX break
Size S
        Evidence
setTailorSection re-validates only the section saved (state.js:405-407), but whether Availability and Returns are valid depends on where she works. Toast "Saved. Customers see the change now." while t-shop still says "Customers can't book you right now".
        Proposed fix
After line 406: if (section === 'where') for (const s of ['returns', 'availability']) t.onboarding[s] = validateSection(s, t).ok;
        S-20Should-fixSmall fix
        Turning the shop off when pickup is the only way back makes her unbookable, but the toast says customers see the change
        Persona Tailor
Screens to-where--edit, t-shop
Kind Copy
Size S
        Evidence
Note: "In-store pickup will turn off too"; toast: "Saved. In-store pickup is off. Customers see the change now." She now has no way back, so she is offline (to-where.js:97, 252).
        Proposed fix
When pickup is her only return option, note: "In-store pickup will turn off too. It's your only way to get orders back, so customers can't book you until you turn on the Taily courier." Toast: "Saved. Customers can't book you until you add a return option." with a Return options action.
        S-21Should-fixNeeds mockup
        A tailor who isn't live lands on Home and Shop with no prompt to finish setting up
        Persona Onboarding
Screens t-home, t-shop, t-earnings
Kind UX break
Size S
        Evidence
PERSONA_HOME.tailor = 't-home' whether or not she is live (app.js:41). t-home reads "No requests yet … Check your hours"; t-shop says "Finish where you work so customers can book you again" ("again" to someone never live). Finish later always signs her out, so continuing needs a new code.
        Proposed fix
Send a non-live tailor to her next step, and lead t-home with "Finish setting up · 2 steps left" plus Continue. Drop "again" when she was never live. Consider keeping the session on Finish later.
        S-22Should-fixEngineering
        Unsaved Shop edits are lost without warning when she taps the top nav
        Persona Tailor
Screens to-*--edit, t-rush
Kind UX break
Size M
        Evidence
Each edit screen checks for unsaved changes only on its Back. Change Hem pants to $33, tap Home: no "Leave without saving?", and the draft is discarded next time.
        Proposed fix
One guard in app.js's nav handler: call the current screen's optional canLeave() (a third argument to register) and show the existing leave modal when it returns false.
        S-23Should-fixNeeds mockup
        Account and Shop have no Help, legal links, profile editing, text settings or Delete account
        Persona Both
Screens c-account, t-shop, c-name
Kind Missing feature · compliance
Size M
        Evidence
c-account: a read-only profile showing "sarah.chen@example.com" (never collected; c-name asks only for names), then Saved addresses, Payment methods, Past orders, Sign out. t-shop: setup rows and Sign out. Neither can change the phone that all texts go to, turn texts off, open Terms or Privacy, get help, or delete the account (an App Store requirement once native ships). Her full public profile is reachable only once, from to-done.
        Proposed fix
Design gap DG-3: Account v2 (Personal info with phone change by code, optional email for receipts, Texts, Help, Legal, Delete account with a confirm sheet blocked while a booking is open) and a matching Account group in t-shop (Phone for texts, Verification, Help, Terms, See your full profile, Sign out with confirm).
        S-24Should-fixSmall fix (notice)Needs decision (pages)
        Terms and Privacy are a toast, and the notice isn't next to the button that creates the account
        Persona Customer
Screens c-welcome, c-phone, c-pay
Kind Compliance
Size S
        Evidence
"By continuing you agree to Taily's Terms and Privacy Policy." sits under the Apple and Google buttons; both links toast "Terms and Privacy aren't in this prototype yet." (c-welcome.js:45). c-phone, where the account is made, has no notice. No written cancellation and refund policy exists although money rules are enforced.
        Proposed fix
Now: on c-phone above Send code, "By tapping Send code, you agree to Taily's Terms and Privacy Policy." kept separate from the SMS consent line. Before launch: hosted Terms, Privacy, Cancellation and refunds, and Accessibility pages; log agreement version and time at sign-up.
        S-25Should-fixSmall fix (copy)Needs mockup (email)
        The receipt row says $144.00 while Past orders says $160, and there is no receipt to keep
        Persona Customer
Screens c-complete, c-complete--receipt, c-orders
Kind Consistency
Size S
        Evidence
c-complete: "Receipt · Charged $144.00 · Visa •••• 4242"; c-orders: "Completed · $160 · Paid" for the same order. No receipt number, charge dates, company details, email or download, though c-orders--empty promises "Finished orders and their receipts show up here."
        Proposed fix
Receipt row: "Paid $160.00 · Visa •••• 4242" (the expanded breakdown already splits deposit and balance). Later: receipt number, charge dates, Taily's legal name, and "Email receipt" once Account v2 collects an email.
        S-26Should-fixNeeds mockup
        "See all 37 reviews" goes nowhere
        Persona Customer
Screens c-tailor
Kind Missing feature
Size S
        Evidence
c-tailor.js:222 toasts "Not built yet". The rating link in the stat strip has the same dead end.
        Proposed fix
A c-tailor--reviews sheet: average and count, newest first through reviewRow, with the caption "From customers who booked through Taily."
        S-27Should-fixNeeds mockup
        Sarah can't leave notes for the tailor or access notes for a home visit, and booking ignores her saved addresses
        Persona Both
Screens c-job, c-where--address-sheet, c-addresses, c-booking, t-request, t-job
Kind Missing feature
Size M
        Evidence
No note field exists in c-job, c-where, c-addresses or data.js, so "hem for 2-inch heels" or "buzz 2R" can't reach Amara, and K-43's courier lobby drop has no instructions. The c-where address sheet edits a single address and doesn't offer Home or Work from c-addresses (and the two forms differ). A confirmed booking can't change its address.
        Proposed fix
Optional "Notes for Amara" on the request (masked like chat), "Access notes" on a saved address, a saved-address picker at the top of the c-where sheet, all shown on t-request and the t-job visit block. Interim copy on c-booking: "Need to add something? Show Amara at the fitting. She can add it to your final order."
        S-28Should-fixSmall fix
        In-progress orders never show their due date
        Persona Customer
Screens c-booking--in-progress
Kind Copy
Size S
        Evidence
"Amara is working on it" with no date; the same screen on Oct 26 for an Oct 23 due date. The edit screen already shows "New due date … was …", so the concept is familiar.
        Proposed fix
c-booking.js:246: Tailoring step sub Due ${fmtDay(a.job.needBy)} while current. The overdue state ties to B-07.
        S-29Should-fixSmall fix
        After Sarah lets a suggested time lapse, the next screen says Amara "didn't reply in time"
        Persona Customer
Screens c-request--suggested-passed, c-tailors--none-left
Kind Copy
Size S
        Evidence
Find another tailor then shows "Amara didn't reply in time, and no other tailors cover 11211 yet." (c-tailors.js:77), though Amara did reply.
        Proposed fix
"We won't show Amara for this request again, and no other tailors cover 11211 yet. Another ZIP may open more."
        S-30Should-fixSmall fix
        "Start a new request" and "New request to Amara" wipe the items the banner just said were saved
        Persona Customer
Screens c-tailors--declined, c-tailor--declined, c-thread--read-only
Kind Copy
Size S
        Evidence
Banner: "Your items and services are saved." The button lands on an empty c-job. c-thread's "New request to Amara" calls T.newJob() (c-thread.js:219) and never preselects Amara.
        Proposed fix
Label "Start over with new items"; banner body "Your items are saved for other tailors. To book Amara, start over with different work." c-thread: label "Start a new request" and copy "To talk again, start a new request with Amara."
        S-31Should-fixSmall fix
        Amara can't message Sarah from a new request before accepting
        Persona Tailor
Screens t-request
Kind Missing feature
Size S
        Evidence
Accept, Suggest time and Decline only; the thread already exists (t-thread--pending) and the message act is wired (t-request.js:254). The customer side has "Ask a question".
        Proposed fix
In the requested state, add a "Message Sarah" text link with the chat icon to the top note.
        S-32Should-fixNeeds mockup
        Visit day has no call, "on my way" or "I'm here", and no report or block
        Persona Both
Screens t-job--visit, c-booking, c-thread, t-thread, t-job--no-show
Kind Missing feature · safety
Size M
        Evidence
Numbers are masked, so at a walk-up "2R" the only channel is chat. A no-show can be marked 20 minutes after the start with no arrival evidence. The t-job ••• menu has only Cancel and Mark as no-show; threads have no menu. A tailor entering a stranger's home has no report, block or safety entry.
        Proposed fix
On the visit day: a masked Call tile next to Message, tailor "On my way" and "I'm here" (texts Sarah), "I'm here" required before Mark as no-show and shown as evidence, "Report or block" in thread and job menus, and a Safety link. Masked calling is decision D-14.
        S-33Should-fixNeeds decision
        Amara can't move a confirmed visit, only cancel it and refund Sarah
        Persona Both
Screens t-job--more, c-booking--cancel-late
Kind Missing feature
Size M
        Evidence
c-booking--cancel-late says "To change the time now, message Amara.", but Amara's only tool is Cancel appointment. An agreed change becomes a tailor cancel, a new request, a new hold and a new 2-hour wait.
        Proposed fix
Decision D-12: "Suggest a new time" in the confirmed ••• menu reusing t-suggest; Sarah sees Accept or Keep the current time on c-booking; deposit and cancel window move with the visit.
        S-34Should-fixNeeds decisionNeeds mockup
        Availability has no travel time between home visits, no time off and one window per day
        Persona Tailor
Screens to-availability, t-shop, c-book
Kind Missing feature
Size L
        Evidence
busyIntervals blocks only the visit's own minutes, and touching intervals are allowed, so a 5:00 PM Williamsburg home visit can be followed by 6:00 PM in Bushwick, and a 5:30 PM shop visit by a 6:00 PM home visit. Time off is the all-or-nothing Taking requests switch. Minimum notice is fixed at 3 hours.
        Proposed fix
Decision D-13: POLICY.TRAVEL_BUFFER_MIN 30 around home visits; a Time off list in Availability shown on t-shop as "Away Oct 20–27"; up to 2 windows a day; a Minimum notice choice.
        S-35Should-fixNeeds mockup
        The courier handoff has no lifecycle: no "handed to courier", no failed delivery, no proof of a lobby drop
        Persona Both
Screens t-job--handoff-courier, c-booking--handoff-courier, c-complete--courier
Kind Missing feature
Size L
        Evidence
t-job--handoff-courier: "Have it bagged by then" and no action. Completion happens only through the Demo action courierDelivered, which charges $158.30 at once, and reportNotReceived requires a tailor mark, so a lobby drop can never be reported missing.
        Proposed fix
Design the states the delivery partner will report: courier assigned, collected (tailor taps "Handed to courier"), delivered with a photo, then a 24-hour "Didn't get it?" window; failures for courier didn't come (rebook free) and delivery failed (back to Amara).
        S-36Should-fixSmall fix
        Tailor onboarding never says requests arrive by text, what she's held to, or when a job counts as complete
        Persona Onboarding, tailor
Screens to-done, to-payouts, to-availability, t-phone, c-welcome, t-job
Kind Copy
Size S
        Evidence
            to-done: "Customers near you can book you now. You have 2 hours to reply" without saying how she'll hear (K-43 texts).
            to-done's steps never mention the required Before and Pinned photos (K-02) or that pay comes after the customer has her order.
            to-payouts and the payouts sheet: "jobs you completed before that day", but since Study-1 she never completes a job herself.
            t-job fine print "the Friday after Sarah gets her order" gives Oct 16 for an auto-completed job paid Oct 23 (t-job.js:416, 500).
            to-availability "Set your usual week." over pre-filled hours that go live with one tap.
            t-phone tells a returning tailor about "six short steps", also under "Your progress is saved".
        Proposed fix
Exact strings are in the small-fix list (SF-28 to SF-32).
        S-37Should-fixSmall fix
        An empty business name (it's optional) prints ", 312 Metropolitan Ave"
        Persona Both
Screens c-tailor, c-ready, c-booking, t-job
Kind UX break
Size S
        Evidence
String joins assume shopName: c-tailor.js:127, c-ready.js:85, t-job.js:642, and the c-booking Directions query.
        Proposed fix
Join with [t.shopName, t.shop.street, …].filter(Boolean).join(', '); ideally one shopPlace(t) helper in components.js.
        S-38Should-fixNeeds decision
        Years of experience is never collected, so a new tailor's card shows no trust signal
        Persona Both
Screens to-profile, c-tailors, c-tailor
Kind Missing feature
Size S
        Evidence
BLANK_TAILOR.years is 0 and to-profile has no field; onboarding fixtures copy the seed's 12 years. K-19's "N years tailoring" slot is empty for exactly the new tailor it was designed for, and K-15's "5+ is the onboarding minimum" isn't enforced.
        Proposed fix
Decision D-18: add "Years tailoring" (whole number) after Business name; block under 5 with "Taily tailors have at least 5 years of experience." or route to a waitlist.
        S-39Should-fixNeeds mockup
        Onboarding previews show things customers never see
        Persona Tailor
Screens to-services, to-where, t-rush, to-profile
Kind Consistency
Size S
        Evidence
to-services previews a price list ("+ 6 more") though c-tailor shows only "Your estimate" rows; to-where shows "Includes $35 home visit fee", a string no customer sees; t-rush previews a 4-step ladder that customers never see. Five different headings ("Your card on the list", "On your profile", "What customers see", "Preview", "What customers will see").
        Proposed fix
Preview exactly what c-tailor renders: an estimate row, the Where block with the fee line, the single rush row a rushed customer sees. Use "What customers see" everywhere.
        S-40Should-fixSmall fix
        Pinned fitting photos are required, but neither side is told photos will be taken
        Persona Both
Screens t-adjust--photos-required, c-booking
Kind Compliance · copy
Size S
        Evidence
D-178 requires a pinned photo per garment, usually worn by the customer at home. t-adjust says only "Add at least one pinned photo."; the customer timeline says "You approve the final order".
        Proposed fix
t-adjust docs helper: "Ask before you take photos of Sarah. Keep faces out of the shot." c-booking "Visit and fitting" sub: "Amara pins and photographs your garments · you approve the final order".
        S-41Should-fixNeeds decision
        No garment damage or loss promise, while a courier lobby drop counts as delivered
        Persona Both
Screens c-ready--courier-picked, c-tailor--verified, c-complete
Kind Policy
Size M
        Evidence
K-43: "If you're not home, the courier leaves it in your building's lobby. It still counts as delivered." Nothing says who bears a lost suit; "Insured" in the Verified popover is unexplained.
        Proposed fix
Decision D-21: a "Taily garment promise" with a dollar cap and a 48-hour report window, linked from c-pay, the courier card and the Insured line.
        S-42Should-fixEngineering
        Every shop address is saved as Brooklyn and distances are measured from the seed shop
        Persona Both
Screens to-where, c-tailor, c-booking
Kind Infrastructure
Size M
        Evidence
A tailor at 40 Mercer St, 10013 is stored as "Brooklyn, NY" (SHOP_CITY, data.js:98, D-60), and "0.6 mi from you" is Sarah's ZIP's distance to Amara's shop. Directions use the same text. No suite or floor field.
        Proposed fix
Infra spec: address autocomplete and geocoding, distance from her own shop, unserved ZIPs rejected with "Taily isn't in that area yet.", an optional suite or buzzer field.
  Polish 34
    Show the 34 polish items
      P-01Countdowns drop the day Small fix
c-request--suggested, t-request--suggested: "24h left · by 10:00 AM" for tomorrow. components.js:2059 → "by tomorrow 10:00 AM".
      P-02Missed pickup time has no day, and stays the "Now" step Small fix
c-booking.js:316 use fmtWhen; :329 sub "Pick a new time" when missed; t-job.js:255 same day rule.
      P-03Auto-completed job says picked up on the completion date Small fix
t-job returnedLine: use handoff.markedAt for pickup ("Thu, Oct 15", not "Sat, Oct 17").
      P-04Review reminder never expires and its copy goes stale Small fix (copy)
"Your order came back on Thu, Oct 15." and skip the card on c-complete where the stars already ask. A "Not now" dismiss needs a component variant.
      P-05"taily courier" lowercased in chat and Messages Small fix
state.js:1216 lowercases only the pickup label.
      P-06Ready screen tells Amara "Sarah pays the $0.00 balance, plus the courier" Small fix
t-job.js:453: refund wording when the balance is zero; courier clause only when courier is offered.
      P-07Accepted shop visit says "Her full address is below." Small fix
t-job.js:82: "She's coming to your shop." for shop visits.
      P-08Pickup code sheet switches from "Sarah" to "Customer" Small fix
t-job.js:696: "Sarah doesn't have the code?"
      P-09Edit order intro says photos can change; they are locked Small fix
t-adjust.js:380: "Your private notes are yours to change any time. A new price, due date or work needs Sarah's approval."
      P-10Visit screen repeats its title Small fix
t-job.js:208: "Start it when you're with Sarah."
      P-11"Answer by 12:00 PM." on Suggest another time is ambiguous Small fix
t-suggest.js:71: "Send it by 12:00 PM, or the request expires."
      P-12Rush requests aren't marked near the date Small fix
t-request visit row: "1 day after the visit · rush, $40.00 to you".
      P-13Two names for the bank fix button Small fix
"Fix bank details" in t-earnings.js:83, 95 and t-payout.js:103 → "Update bank details" (K-20 wording).
      P-14"Charged at handoff" jargon in c-ready's price block Small fix
components.js chargedWhen fallback "Charged when you get it"; chargedPhrase fallback "when you get it".
      P-15Mixed money precision in the Home reminder card Small fix
"Est. $160" next to "$16.00 deposit" (D-70); format both through one fmtColumn.
      P-16Date format drift Small fix
noteStamp and the photo caption use "Thu, Oct 15, 5:00 PM"; use fmtWhen ("Thu, Oct 15 · 5:00 PM") at components.js:2845 and :2886.
      P-17Same action, different labels Small fix
"Take photo" vs "Take a photo"; "Go to Home" vs "Back to Home"; private notes say "Only you…" twice (NOTE_EMPTY → "Measurements, fabric notes, reminders.").
      P-18c-cards--remove has two titles Small fix
Drop the serif h2 and pass "Remove Visa •••• 4242?" as the sheet title.
      P-19Two-line Pay reason wraps at 320 and the bar grows Small fix
c-ready.js:100 "Pick a delivery window first."
      P-20Refund timing said on one cancelled state only Small fix
Append "It can take a few business days to show on your card." to cant-make-it and tailor-no-show.
      P-21Reviews aren't labelled as from bookings Small fix
c-tailor Reviews head caption "From customers who booked through Taily."
      P-22Onboarding stepper hides step names and done states from screen readers Small fix
Give the default stepper the booking stepper's nav + ol + aria-current markup.
      P-23Garment stepper counts aren't announced; struck rows say "Removed" twice Small fix
A polite live region on c-job; drop the duplicate sr-only "removed".
      P-24"Pick up where you left off" banner reads three ways Small fix
One sentence from one helper: "3 of 6 steps done. 3 to go before customers can book you."
      P-25Photo guidance was cut from to-profile Small fix
to-profile.js:120 "Up to 6. Before-and-after shots in daylight work best. Ask before showing a customer's face."
      P-26Shop edits don't say booked jobs keep their terms Small fix
Edit-mode helper "Changes apply to new requests. Jobs you've already booked keep their price, place and times." and one toast "Saved. New requests use this now."
      P-27c-review forks the field label Engineering
Add a section variant to field/textArea; delete the screen override (c-review.css:37).
      P-28Tailor Sign out has no confirm and is muted, the customer's is red with a confirm Small fix
Reuse the c-account sheet on t-shop; FLOWS t-shop--sign-out.
      P-29Paused Shop preview falls back to an old card with a truncated bio Engineering
Build the K-19 row ignoring takingRequests while paused.
      P-30About lets you type past 300; the card line stops at 110 Engineering
Same hard stop on About; update to-profile--errors.
      P-31Tappable card outlines are 1.25:1 against the page Needs decision
Interactive cards get a neutral-500 ring or a chevron (WCAG 1.4.11).
      P-32Destructive confirms use two containers Needs decision
Pick the bottom sheet (the majority) for sign-out and leave-without-saving too.
      P-33Two Message controls on tailor handoff screens Needs mockup
Header pill plus the inline "Message Sarah" link; keep one.
      P-34Outside coverage dead-ends with no waitlist Needs mockup
"Text me when a tailor covers 11201" on c-tailors--empty-zip; drop the need-by promise when the only tailor is hidden.
  Missing MVP features
  Things a real launch needs that the prototype doesn't model yet. Linked items have a finding above.
      Customer
        Get help on every order and in Account (B-05)
        Something not right? after completion: ask for an adjustment, or Taily help, with a redo window
        Account v2: profile edit, phone change, email for receipts, texts, legal, delete (S-23)
        Emailed receipts with number, dates, payment method (S-25)
        Notes for the tailor and access notes (S-27)
        Saved-address picker in booking, edit address
        All reviews list (S-26)
        Waitlist outside coverage (P-34)
        Tipping, after MVP (D-20)
      Tailor
        Texts for every event and cancelled visits that stay visible (B-06)
        Withdraw changes on a pending edit (B-07)
        Suggest a new time on a confirmed visit (S-33)
        Visit-day tools: on my way, I'm here, masked call, report or block (S-32)
        Time off and travel buffer (S-34)
        Courier states: handed to courier, failed delivery (S-35)
        Customer history: "Booked you before · 1 order", notes carried over
        Earnings: paid this year, jobs in flight, tax documents
        Reviews: see all, reply publicly, report a review
        Finished photos at Mark ready, as handoff evidence
        Notes before the fitting (D-19)
      Onboarding
        Get verified: ID, background check, insurance, years (B-11)
        Hosted payout identity and W-9, with status states (B-12)
        Tailor Agreement clickwrap and Terms on t-phone (B-12)
        Courier pickup address for tailors with no shop (B-15)
        Years tailoring field (S-38)
        Resume texts at 24 and 72 hours for an unfinished setup
        Finish setting up banner for a tailor who isn't live (S-21)
        Cover photo crop preview for the profile hero
        Geocoded shop address (S-42)
      Platform
        SMS service with 10DLC registration, delivery receipts, STOP and HELP, quiet hours
        Support console with refund, release and capture actions
        Versioned approvals (optimistic concurrency) (B-02)
        One API error contract for offline and server failures (S-12)
        Authorization renewal or day-6 capture (B-14)
        Random pickup codes (today derived from the id, state.js:1224) and signed, expiring text links
        Times stored in UTC plus the tailor's zone; rules evaluated in that zone
        Scheduled payout job with idempotency
        Deep link route /a/:apptId resolving to statusScreen; today a reload re-runs the flow
        Web app shell: manifest, theme colour, remove the drawn 9:41 status bar, rem type
        Legal pages: Terms, Privacy, Tailor Agreement, Cancellation and refunds, Accessibility
  Benchmarks
  What peers do where Taily has a gap. Legal points marked counsel need a lawyer's confirmation.
      TopicPeersTaily today
        Help on every orderUber, Uber Eats, TaskRabbit and Rover put Help on each trip or task with the order attached; Rover mediates before its Guarantee pays (Rover Guarantee).None (B-05)
        No-show by the providerTaskRabbit waives the fee and routes the dispute to support; Uber and Lyft charge a rider no-show only after the driver waited at the pickup point.First report wins, no contest, no arrival evidence
        Rescheduling by the providerTaskRabbit Taskers suggest a new time and, once agreed, it moves in the task (TaskRabbit).Tailor can only cancel (S-33)
        Request reply windowAirbnb gives hosts 24 hours and an expiry costs the guest nothing (Airbnb).2 hours, wall-clock, overnight (S-13)
        Masked callingUber routes calls through a proxy number (Uber).Chat only
        Card holdsStripe card-not-present authorizations last 7 days, then release (Stripe); Uber and Airbnb explain pending holds.7-day hold on the 7-day edge (B-14)
        SMS opt-inCarriers reject 10DLC campaigns without message types, frequency, rates, STOP at the consent point (Twilio 30924) or when texts are required to buy (Twilio 30923).Missing (B-08)
        Provider onboardingStripe Connect needs date of birth and SSN last 4 before payouts (Stripe); Rover and TaskRabbit hold providers as pending until ID and background checks clear.Bank numbers only (B-12)
        Background checks in NYCThe Fair Chance Act has covered independent contractors since 2021 (Morgan Lewis), plus an FCRA disclosure. Counsel.Claimed, not collected (B-11)
        Contractor termsThumbtack, TaskRabbit and Rover providers accept an agreement; NYC Freelance Isn't Free expects written terms from $800 (Hughes Hubbard). Counsel.None
        Tax reporting1099-K at $20,000 and 200 transactions, or 1099-NEC at $2,000 for 2026 payments, depending on the payment model (CPA Practice Advisor).No TIN, no tax documents
        Receipts and issuesUber, TaskRabbit and Airbnb email itemized receipts; Uber Eats and Rinse put Report an issue on the receipt.In-app only, no issue path
        ReviewsThumbtack marks "Hired on Thumbtack" and lets pros reply; the FTC review rule (16 CFR 465) bans suppressing honest negative reviews.One-way, unlabelled
        TipsUber, TaskRabbit and Rover offer in-app tips that go entirely to the provider.None (after MVP)
        Checked, not a gapClothing alterations are a non-taxable service in New York (TSB-M-02(4)S); estimates already include home and rush fees, in line with NYC's proposed all-in pricing rule.OK for NYC; revisit for other states
  Launch compliance checklist
  Not legal advice. Items need counsel sign-off before launch.
      ItemStatusWhere it belongs
        Customer Terms and Privacy acceptancePartial notice on c-welcome, links are toastsc-phone (next to Send code), hosted pages
        Tailor Terms, Privacy and Tailor AgreementMissingt-phone, above "Finish and go live" on to-payouts
        SMS consent (types, frequency, rates, STOP, HELP, links)Missingc-phone, t-phone
        Brand name in every text, welcome textMissingsystem texts
        Texts setting and opted-out stateMissingc-account, t-shop, t-home banner
        Deposit hold disclosureHavec-welcome, c-pay, c-request
        Cancellation terms before payingHavec-pay
        Reminder auto-cancel forfeiture before payingMissingc-pay, deposit info sheet
        All-in estimate (home and rush fees included)Havec-tailors, c-tailor
        Refund timingPartial one stateevery refund state on c-booking
        Receipts the customer can keepPartial in-app onlyc-complete, email
        Payout identity (KYC), TIN, W-9Missingto-payouts (hosted)
        1099 tax documentsMissingt-earnings
        Background check consent (FCRA, NYC Fair Chance)Missingnew Get verified step
        Verified claims backed by real checksMissingc-tailor popover, to-profile
        Account deletion and data requestsMissingc-account, t-shop
        Accessibility statement with contactMissingLegal page
        WCAG 2.1 AA basicsMostly see S-15 to S-18app.js, components.js
        Phone and email masking in chatHavec-thread, t-thread
        Fitting photo noticeMissingt-adjust, c-booking, Privacy Policy
        Review provenance and a neutral moderation policyPartial only bookers reviewc-tailor, t-job--completed-rated
        Garment loss and damage policyMissingc-pay, courier card, Help
        NY sales tax on alterationsNot neededrevisit outside New York
  Consistency + accessibility
  The baseline is strong. Across all 368 flows: no off-scale font size, no serif outside titles, no serif money, every control has an accessible name, every image has alt text, heading order is clean, muted greys pass on linen (4.7:1 and up), reduced motion is respected and reflow is clean at 320 px. What's left are breaks between patterns.
      Accessibility
        State hidden from focus, announcements and tab titles on strip-led pages (S-15)
        Toasts inserted pre-filled; Undo gone in 5 s (S-16)
        Type ignores user text size; fixed CTA height overprints (S-17)
        Nested interactive Verified check (S-18)
        Onboarding stepper and garment stepper not announced (P-22, P-23)
        Card outlines below 3:1 (P-31)
        Not tested: VoiceOver, TalkBack, iOS Safari
      Consistency
        Home, Bookings and t-home rows disagree with their screens (S-05)
        "Edit order" (K-47) next to "Edit the order" (D-297) opening different screens (D-15)
        Tailor "on hold" vs customer "charged at pickup" (D-17)
        Missing Back on c-ready and most c-request entries (S-14)
        Two address forms, two destructive-confirm containers, two bank-fix labels (P-13, P-32)
        Previews that don't match what customers see (S-39)
        K-05 underlined item names read as links (D-24)
  Decisions Kevin needs to make 24
  Each is a question with my recommendation. None reopens a K-## call; where one touches a K-## decision, it says so.
    D-01 · What can Taily support do, and how fast?Recommend: an in-app Help thread with the order attached; support can refund or keep a deposit, release or capture a hold, cancel, and pause a payout; reply within 1 business day; any problem open 72 hours goes to support automatically.
B-05
    D-02 · Which events text whom, and are booking texts optional?Recommend: adopt the matrix in B-06; booking texts are a separate opt-in with email and in-app fallback; auto-cancel only after a delivered reminder to an opted-in number.
B-06, B-08 · builds on K-43
    D-03 · When does each waiting state end?Recommend: reminders at 24 and 72 hours; final order 7 days then Taily review; ready 14 days then default pickup and the 7-day clock; pay the tailor at the unclaimed charge; abandoned 30 days after the charge; tailors can withdraw a pending edit.
B-07 · K-30 unchanged
    D-04 · How do we keep the K-27 hold inside the card authorization?Recommend: capture by day 6 and cap pick days at 5; a paused dispute must capture or release before expiry; design the card-failed state for both sides.
B-14 · K-27 kept
    D-05 · Does verification gate going live?Recommend: yes for launch. "Finish" submits for review ("We review in 1–2 days"); the Verified check shows only when every K-15 item passed.
B-11 · K-15 kept
    D-06 · Hosted payout onboarding or our own form?Recommend: Stripe Connect Express hosted onboarding; we design only the status states and keep the fee card.
B-12
    D-07 · Keep Apple and Google sign-in?Recommend: keep them, followed by a required phone and code.
B-09
    D-08 · Show tailors who can't do every item?Recommend: hide them, and say so in to-services.
B-13
    D-09 · When may Sarah tap "I got it"?Recommend: only after the tailor marks it, the courier delivers, or the pickup slot has started.
S-06
    D-10 · Quiet hours?Recommend: 9 PM to 8 AM; reply clock starts at the tailor's next open hour; early-visit nudges go out the evening before.
S-13 · K-43 timings kept
    D-11 · What if the visit time passes with nothing recorded?Recommend: at start plus 2 hours ask both "Did the visit happen?"; unanswered after 24 hours becomes a cancel with a refund.
S-04
    D-12 · Can the tailor suggest a new time for a confirmed visit?Recommend: yes; Sarah accepts or keeps the current time.
S-33
    D-13 · Travel time between home visits?Recommend: a fixed 30-minute buffer for MVP, editable later.
S-34
    D-14 · No-show disputes and masked calls?Recommend: the other side gets "That's not right", which moves both to review; require "I'm here" before Mark as no-show; masked calling after MVP.
B-05, S-32 · revises Study-1 default 8
    D-15 · Rename "Edit the order" to "Change final order"?Recommend: yes, so the two buttons that open different screens no longer read the same.
D-297 under K-43; K-47 unchanged
    D-16 · Fix the to-services intro "approve big changes"?Recommend: "At the fitting you can change it, and the customer approves the final order before you start."
K-38 approved the current string
    D-17 · Should Amara's screens say "charged at pickup" instead of "on hold"?Recommend: yes on the tailor side, so she uses Sarah's words; keep "Hold $16.00" on the deposit, which really is released on decline.
D-302 kept both deliberately
    D-18 · Collect years of experience and enforce 5?Recommend: collect it; under 5 goes to a waitlist.
S-38 · K-15, K-19
    D-19 · Private notes before the fitting?Recommend: yes, open notes from confirmed.
changes Study-1 default 14
    D-20 · Tipping?Recommend: after MVP; an optional tip on c-complete with no Taily fee.
    D-21 · Garment loss and damage promise?Recommend: a dollar cap per order through the tailor's insurance, reported within 48 hours.
S-41
    D-22 · Override D-296(4) so Home shows the Confirm card in the missed state?Recommend: yes; it was defaulted before K-43's auto-cancel. Applied now as a small fix, logged as a D-##.
S-02
    D-23 · Tell customers their bank may show the balance as pending?Recommend: yes, one line under the Pay sheet: "Your bank may show it as pending until then."
side effect of K-44
    D-24 · Underlined item names read as links. Make them do something?Recommend: make the name open that item's services popover (K-25) rather than drop K-05's underline.
K-05
  Small fixes being applied now 44
  Copy, labels, aria, missing back paths and contained logic fixes. No new design decision and no K-## conflict. Each lands with a FLOWS key where it adds a state.
    SF-01 · Thread stays writable while a job is live (state.js threadReadOnly) — B-01
    SF-02 · Finish later on Payouts never takes her live — B-04
    SF-03 · Edit with only a due-date money change shows "New total" and the removed rush fee on both sides — B-03
    SF-04 · Deposit sheet and c-pay disclose the reminder and auto-cancel rule — B-10
    SF-05 · SMS consent helpers on c-phone and t-phone; "Taily: " prefix on texts — B-08
    SF-06 · t-phone Tailor Terms line; Tailor Agreement line above "Finish and go live" — B-12
    SF-07 · to-profile preview verified: !!t.verified — B-11
    SF-08 · Home picks the reminder or action booking first — S-01
    SF-09 · Home shows the Confirm card in the missed state — S-02
    SF-10 · Shop-visit reminder wording — S-03
    SF-11 · After the visit start: no Cancel, Reschedule or late line; new policy line — S-04
    SF-12 · Home and Bookings rows for handoff and pending edits; tailor missed-pickup row — S-05
    SF-13 · Pickup and courier slots capped at the 7-day charge — S-07
    SF-14 · Charge date shown after paying, both sides — S-08
    SF-15 · Unclaimed banner and not-received sheet after a charge — S-09
    SF-16 · Picked up available on a reported problem — S-10
    SF-17 · Withdraw and accept race messages; t-job withdrawn copy — S-11
    SF-18 · Back on c-ready and c-request — S-14
    SF-19 · Announce the page strip with the h1 — S-15
    SF-20 · Persistent toast live regions; action toasts 10 s with pause — S-16
    SF-21 · .cta min-height instead of height — S-17
    SF-22 · Saving Where rechecks Returns and Availability — S-19
    SF-23 · Shop-off-with-pickup-only note and toast — S-20
    SF-24 · c-phone Terms notice above Send code — S-24
    SF-25 · Receipt row "Paid $160.00" — S-25
    SF-26 · Tailoring step shows the due date — S-28
    SF-27 · Suggested-time-lapsed copy on c-tailors — S-29
    SF-28 · Declined banners: "Start over with new items" and thread copy — S-30
    SF-29 · Message Sarah link on t-request — S-31
    SF-30 · to-done lead and steps (texts, photos, payday) — S-36
    SF-31 · Payouts lead, payouts sheet and t-job payout fine print — S-36
    SF-32 · to-availability pre-filled lead; t-phone and c-welcome returning-tailor copy — S-36
    SF-33 · Shop place lines skip an empty business name — S-37
    SF-34 · Fitting photo consent copy — S-40
    SF-35 · Countdowns and missed pickups include the day — P-01, P-02
    SF-36 · Auto-completed pickup date; courier capitalised — P-03, P-05
    SF-37 · Tailor copy: ready line, shop-visit accepted, pickup code, edit intro, visit title, suggest deadline, rush row — P-06 to P-12
    SF-38 · "Update bank details" everywhere — P-13
    SF-39 · Customer copy: charged fallback, reminder precision, refund timing, review provenance, review reminder — P-04, P-14, P-15, P-20, P-21
    SF-40 · Date formats and label unification — P-16, P-17
    SF-41 · c-cards single title; c-ready short courier reason — P-18, P-19
    SF-42 · Stepper and garment-stepper a11y — P-22, P-23
    SF-43 · Resume banner sentence; photo guidance; shop-edit helper — P-24, P-25, P-26
    SF-44 · Tailor Sign out confirm sheet — P-28
  Design gaps being mocked now 4
      DG-1 · Help and disputes
        Problem: no path to Taily; disputes end in the other party's chat (B-05).
        Screens: c-account, t-shop, c-booking, c-complete, c-price-change, t-job, a new Help page and a "Taily is reviewing" state.
        Direction: a quiet "Get help with this order" text link at the end of each booking and job; a Help page (contact, policies); a review state in the same strip pattern for both personas with money frozen and a reply-by time.
      DG-2 · Notices and the text catalogue
        Problem: cancellations vanish; most events reach nobody (B-06).
        Screens: t-home, c-job, the Demo-action text banner, a "Texts are off" banner.
        Direction: one-time notice cards built from reminderCard ("Sarah cancelled today's 5:00 PM visit · You keep her $16.00"); a text catalogue board with each event's "Taily:" copy and landing screen.
      DG-3 · Account v2 and the Shop account group
        Problem: no profile editing, texts, legal, help or delete (S-23).
        Screens: c-account, Personal info, Texts, Delete account sheet; t-shop Account group.
        Direction: reuse the existing list rows; Delete account as a danger link with a confirm sheet blocked while a booking is open.
      DG-4 · Get verified and payout status
        Problem: Verified claims and payouts rest on nothing collected (B-11, B-12).
        Screens: a verification step, to-payouts handing off to hosted onboarding, to-done "Under review", t-shop and t-earnings status rows.
        Direction: a checklist with per-item status (Pending, Verified, Needs info, Expires) and one clear next action.
  Coverage
      Walked
        All 368 FLOWS keys through automated design-system and a11y checks, and at 320 px
        All 180 customer keys rendered with text dumps; about 110 tailor keys; every onboarding state
        A real tailor sign-up typed by hand, Finish later on every step, resumes, Shop edits against live jobs
        A cross-persona matrix of 28 booking states as Sarah and as Amara
        Journeys: decline while in progress, reminder with a second request, lapse, cancel after start, early "I got it", withdraw races, offline, reload, 9 AM visit timers, pickup past the charge, rush edits, 10-day pending order
        Director re-runs for every blocker and should-fix (.shots/dr-director/verify*.mjs)
      Not walked
        Real VoiceOver and TalkBack sessions, iOS Safari, a real phone keyboard
        Widths under 320 px; an axe run
        Live Stripe, Twilio or courier behaviour
        Figma parity and visual-regression baselines
        Legal conclusions (marked counsel)
        The app has no dark mode, so it wasn't checked
  Taily v5 · pre-MVP design review · merged from six lenses: customer journey, tailor journey, onboarding, system and money, consistency and accessibility, benchmarks and compliance.
