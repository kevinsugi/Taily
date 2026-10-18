/* ============================================================
   Taily v5 — fee settings (mirrors CORE-JOURNEY "Taily fee settings").
   The ONLY file where a rate, a fee window or a timer may live.
   Human units (dollars, hours, minutes), frozen. Every other module
   reads from here; the hygiene lint fails on a rate literal elsewhere.
   ============================================================ */
export const MONEY = Object.freeze({
  TAILY_FEE_RATE: 0.10,     // of the services subtotal only (not home-visit fee, rush, courier) — from the tailor's payout
  DEPOSIT_RATE: 0.10,       // of (services + home-visit fee), authorized at request, captured on accept
  COURIER_MARKUP: 0.10,     // on top of the courier quote, paid by the customer, kept by Taily
  COURIER_BASE: 8.00,       // prototype: simulated Uber API quote (K-43, D-299) — $8 base …
  COURIER_PER_MILE: 2.50,   // … + $2.50 per mile (ZIP_INFO miles) …
  COURIER_PEAK: 3.50,       // … + $3.50 for a delivery window starting in the evening peak (production: the live Uber API quote per window)
  COURIER_PEAK_FROM_H: 17,  // prototype: the simulated peak = windows starting 5:00 PM …
  COURIER_PEAK_TO_H: 19,    // … up to (not including) 7:00 PM
  FEE_EXAMPLE_SERVICES: 100, // the round services total the payouts step explains the Taily fee with (display only, not a rate, D-63)
  NO_SHOW_COMP: 25,         // floor the tailor is paid on a no-show (D-06)
  PRICE_RANGE_SPREAD: 0.20, // Study-1 C3: a service's recommended range = base ± this share, never rendered as a rate
  PRICE_ROUND: 5,           // Study-1 C3: range ends rounded to the nearest $5
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
  UNCLAIMED_CAPTURE_D: 6,   // Study-1 A2 + D-04 (K-48): the held balance is captured this many days after the hold if the order is still not handed over — by day 6, inside a card hold's 7-day life (was 7)
  REVIEW_REMINDER_D: 7,     // Study-1 A4: the review reminder shows this many days after completion when no review was left
  HANDOFF_PICK_DAYS: 5,     // K-40 (D-295) + D-04 (K-48): a pickup time / courier window can be picked up to this many days ahead (was 7; stays before the day-6 capture)
  HANDOFF_SLOT_MIN: 30,     // K-40: pickup times start every half hour of the open hours; a courier delivery window is this long
  COURIER_COLLECT_LEAD_MIN: 15, // K-40: the courier collects from the tailor this long before the delivery window starts (inside her open hours)
  COURIER_CHANGE_CUTOFF_MIN: 60, // K-40 (D-295): Sarah can move a courier window until this long before the collection
  REMINDER_LEAD_H: 2,       // K-41 (D-296): the 24-hour reminder goes out this long BEFORE the free window closes (CANCEL_WINDOW_H + this = 26 h before the visit)
  REMINDER_NUDGE_H: 6,      // K-43 (D-300): one more text this long before the visit when Sarah never confirmed (was 3)
  REMINDER_AUTOCANCEL_H: 3, // K-43 (D-300): still unconfirmed this long before the visit → the visit is cancelled (customer late-cancel money) — only after a DELIVERED reminder to an opted-in number (D-02)
  /* ---- pre-MVP A1 (K-48): texts, waiting states, visit day, courier ---- */
  WAIT_REMIND_1_H: 24,      // D-03: first reminder text for an unanswered final order / edit / ready order
  WAIT_REMIND_2_H: 72,      // D-03: the second (last) reminder text
  FINAL_ORDER_REVIEW_D: 7,  // D-03: a final order unanswered this long goes to Taily review
  READY_DEFAULT_D: 14,      // D-03: a ready order with no way back chosen this long defaults to in-store pickup and starts the capture clock
  ABANDONED_CLOSE_D: 30,    // D-03: an order still not collected this long after the charge is closed
  PROBLEM_REVIEW_H: 72,     // D-01 (K-48.1): a reported handoff problem still open this long goes to Taily review
  VISIT_CHECK_H: 2,         // D-11 (K-48.5): the visit start + this with nothing recorded → ask both "Did the visit happen?"
  VISIT_CHECK_ADMIN_H: 4,   // K-48.5: still unanswered this long after asking → the admin is notified
  VISIT_CHECK_CANCEL_H: 24, // D-11: still unanswered this long after asking → cancelled, the deposit refunded
  TRAVEL_BUFFER_MIN: 30,    // D-13: free time kept before and after a home visit in the tailor's calendar
  START_REMIND_MIN: 60,     // Kevin (K-48 follow-up): the tailor's "your visit starts at …" text this long before the start; at the start one more text, "Your fitting has started…"
  CHAT_TEXT_GAP_MIN: 15,    // Kevin (K-48 follow-up): a chat message texts the first unread one, then at most one per conversation per this many minutes while unread
  PICKUP_REMIND_H: 2,       // "Pickup today" text this long before the picked pickup time
  NOTICE_WINDOW_H: 48,      // DG-2 A: a cancellation this close to the visit gets a one-time notice card on Home
  VISIT_TOOLS_H: 3,         // S-32: On my way / I'm here show from this long before the visit
  COURIER_REPORT_H: 24,     // S-35: after a courier delivery, "Didn't get it?" stays open this long
});
