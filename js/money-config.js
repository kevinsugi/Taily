/* ============================================================
   Taily v5 — fee settings (mirrors CORE-JOURNEY "Taily fee settings").
   The ONLY file where a rate, a fee window or a timer may live.
   Human units (dollars, hours, minutes), frozen. Every other module
   reads from here; the hygiene lint fails on a rate literal elsewhere.
   ============================================================ */
export const MONEY = Object.freeze({
  TAILY_FEE_RATE: 0.15,     // K-53 (was 0.10): of the services subtotal only (not home-visit fee, rush, courier) — from the tailor's payout.
                            //   Rendered as a percent ONLY on to-fee (money.js feePercent; the lint scopes it); everywhere else in dollars
  DEPOSIT_RATE: 0.10,       // of (services + home-visit fee), authorized at request, captured on accept
  COURIER_MARKUP: 0.10,     // on top of the courier quote, paid by the customer, kept by Taily
  COURIER_BASE: 8.00,       // prototype: simulated Uber API quote (K-43, D-299) — $8 base …
  COURIER_PER_MILE: 2.50,   // … + $2.50 per mile (data.js milesBetween: where the courier collects → the customer's ZIP, S-42) …
  COURIER_PEAK: 3.50,       // … + $3.50 for a delivery window starting in the evening peak (production: the live Uber API quote per window)
  COURIER_PEAK_FROM_H: 17,  // prototype: the simulated peak = windows starting 5:00 PM …
  COURIER_PEAK_TO_H: 19,    // … up to (not including) 7:00 PM
  FEE_EXAMPLE_SERVICES: 100, // the round services total the payouts step explains the Taily fee with (display only, not a rate, D-63)
  COURIER_ABSORB: 3.00,     // K-53 (Q6): at Pay the courier is re-quoted; Taily absorbs a difference above the window price she saw up to this —
                            //   more than this and she sees the new price first. (K-53, Q7: the D-06 no-show floor NO_SHOW_COMP is gone — the deposit only)
  PRICE_RANGE_SPREAD: 0.20, // Study-1 C3: a service's recommended range = base ± this share, never rendered as a rate
  PRICE_ROUND: 5,           // Study-1 C3: range ends rounded to the nearest $5
  GARMENT_PROTECTION_CAP: 500, // D-21 (pre-MVP A2): Taily's garment protection pays up to this per order for loss or damage (COUNSEL: placeholder cap)
});

export const POLICY = Object.freeze({
  CANCEL_WINDOW_H: 24,      // 24 h or more before the visit → full refund; inside → deposit kept (the 'until' is inclusive, M6-M-11)
  REQUEST_EXPIRY_H: 2,      // tailor reply window
  SUGGEST_EXPIRY_H: 24,     // a suggested time stays open this long, or until MIN_LEAD_H before it starts, whichever is first (D-154)
  MAX_RETRIES: 2,           // "Try again" count after an expiry
  EXPIRING_SOON_MIN: 15,    // countdown turns to the warning state
  NO_SHOW_WAIT_MIN: 15,     // tailor can mark a no-show this long after the start
  MIN_LEAD_H: 3,            // earliest bookable slot from now (D-17)
  CODE_TTL_MIN: 10,         // a sign-in SMS code works for 10 min, then it expires (D-33)
  CODE_RESEND_S: 30,        // "Resend code" unlocks 30 s after the last send (D-33)
  JUST_BOOKED_MIN: 60,      // a booking reads as just confirmed (You’re booked / You accepted) this long after the accept (D-73)
  HANDOFF_AUTO_H: 48,       // Study-1 A3: a pickup the tailor marked without Sarah's code completes on its own after this long (K-37: no drop-off)
  BALANCE_HOLD_H: 114,      // K-53 (d2, Q5): the balance hold Taily places ON ITS OWN when the tailor marks the order ready (a merchant-initiated
                            //   authorization on the saved card) lives this long — Visa's 4 days 18 hours. Measured from the READY time: every pickup
                            //   time and courier window offered ends inside its whole days (4), and it is captured at the handoff or on that last day
                            //   (ready + 4 days) — with no way back / time chosen by then: captured anyway, set to in-store pickup. (Retires D-312's
                            //   READY_DEFAULT_D 14, D-04's UNCLAIMED_CAPTURE_D 6 from Pay and HANDOFF_PICK_DAYS 5.)
  REVIEW_REMINDER_D: 7,     // Study-1 A4: the review reminder shows this many days after completion when no review was left
  HANDOFF_SLOT_MIN: 30,     // K-40: pickup times start every half hour of the open hours; a courier delivery window is this long
  COURIER_COLLECT_LEAD_MIN: 15, // K-40: the courier collects from the tailor this long before the delivery window starts (inside her open hours)
  COURIER_CHANGE_CUTOFF_MIN: 60, // K-40 (D-295): Sarah can move a courier window until this long before the collection
  REMINDER_H: 48,           // K-51: the reminder ("Please confirm your appointment", C7) goes out this long before the visit (K-41 had 26 h) — only to a
                            //   visit booked at least this far ahead
  REMINDER_NUDGE_H: 26,     // K-51: the nudge (C8, "Confirm by … or cancel it without penalty") this long before the visit when she hasn't confirmed —
                            //   2 h before the free window closes (K-43 had 6 h). Booked < REMINDER_H ahead → the nudge is the first ask; booked < this → no
                            //   prompt at all (the plain CANCEL_WINDOW_H rule, no auto-cancel)
  REMINDER_AUTOCANCEL_H: 3, // K-43 (D-300): still unconfirmed this long before the visit → the visit is cancelled (customer late-cancel money) — only after a DELIVERED reminder to an opted-in number (D-02)
  /* ---- pre-MVP A1 (K-48): texts, waiting states, visit day, courier ---- */
  WAIT_REMIND_1_H: 24,      // D-03: first reminder text for an unanswered final order / edit / ready order
  WAIT_REMIND_2_H: 72,      // D-03: the second (last) reminder text
  FINAL_ORDER_REVIEW_D: 7,  // D-03: a final order unanswered this long goes to Taily review
  ABANDONED_CLOSE_D: 30,    // D-03: an order still not collected this long after the charge (K-53: at the latest the hold's last day) is closed
  PROBLEM_REVIEW_H: 72,     // D-01 (K-48.1): a reported handoff problem still open this long goes to Taily review
  VISIT_CHECK_H: 2,         // D-11 (K-48.5): the visit start + this with nothing recorded → ask both "Did the visit happen?"
  VISIT_CHECK_ADMIN_H: 4,   // K-48.5 (Kevin, K-50): still unanswered this long after the visit START → the admin is notified (the ask is at start + VISIT_CHECK_H)
  VISIT_CHECK_CANCEL_H: 24, // D-11 → K-51: still unanswered this long after asking → closed by evidence: the tailor's "I'm here" → the customer's no-show;
                            //   nothing recorded → "Not confirmed", the deposit on hold (no refund)
  VISIT_HOLD_DISPUTE_H: 72, // K-51: a visit closed "Not confirmed" keeps the deposit on hold this long; if neither side disputes it, the tailor keeps it
  TRAVEL_BUFFER_MIN: 30,    // D-13: free time kept before and after a home visit in the tailor's calendar
  START_REMIND_MIN: 60,     // Kevin (K-48 follow-up): the tailor's "your visit starts at …" text this long before the start; at the start one more text, "Your fitting has started…"
  CHAT_TEXT_GAP_MIN: 15,    // Kevin (K-48 follow-up): a chat message texts the first unread one, then at most one per conversation per this many minutes while unread
  PICKUP_REMIND_H: 2,       // "Pickup today" text this long before the picked pickup time
  NOTICE_WINDOW_H: 48,      // DG-2 A: a cancellation this close to the visit gets a one-time notice card on Home
  VISIT_TOOLS_H: 3,         // S-32: On my way / I'm here show from this long before the visit
  COURIER_REPORT_H: 24,     // S-35: after a courier delivery, "Didn't get it?" stays open this long
  /* DG-4 / K-48 (D-352, Kevin Oct 18): a tailor is listed and can take bookings only once all four checks passed (ID and profile photo,
     background check, years tailoring, payout and tax info). false = listed while the review runs (the Verified check still waits). */
  LIVE_REQUIRES_VERIFIED: true,
  PAYOUT_FIX_D: 9,          // DG-4 prototype: the payments partner's deadline to confirm paused tax info (production: the partner's own date)
  PAYOUT_RUN_H: 9,          // K-54 F5 (D-452): the weekly payout run goes out at this hour on each payout Friday; the demo clock crossing it runs it (tick)
  /* ---- MVP readiness, track L (K-52 / K-53) ---- */
  SOCIAL_SIGN_IN: false,    // K-53 Q9: phone-only sign-in for the pilot — Continue with Apple / Google stay in the code, hidden while false (D-423)
  NOTICE_OPTIONS_H: Object.freeze([12, 24, 48]), // K-53 a4 (S-34): a tailor's minimum-notice choices after Taily's own MIN_LEAD_H, the shortest (D-425)
  TIME_OFF_AHEAD_D: 180,    // K-53 a4 (S-34): time off can be set up to this many days ahead
  SLOW_TEXT_FROM_H: 8,      // K-53 Q10: slow reminders (the 72 h nudges, the review reminder) go out only from 8:00 AM …
  SLOW_TEXT_TO_H: 21,       // … until 9:00 PM; one that falls due at night goes the next morning. Time-critical texts stay round the clock (D-428)
  /* ---- pre-MVP A2 (K-48.1, DG-1 B): Taily Help ---- */
  HELP_REPLY_H: 24,         // D-01: Taily replies to a Help message within this long ("Reply by …" on the case strip)
  GARMENT_REPORT_H: 48,     // D-21: loss or damage is reported within this long of getting the order back (garment protection)
});
