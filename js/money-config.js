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
  COURIER_BASE: 8.00,       // mocked Uber quote: $8 base …
  COURIER_PER_MILE: 2.50,   // … + $2.50 per mile
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
  UNCLAIMED_CAPTURE_D: 7,   // Study-1 A2: the held balance is captured this many days after the hold if the order is still not handed over
  REVIEW_REMINDER_D: 7,     // Study-1 A4: the review reminder shows this many days after completion when no review was left
  HANDOFF_PICK_DAYS: 7,     // K-40 (D-295): a pickup time / courier window can be picked up to this many days ahead (= UNCLAIMED_CAPTURE_D)
  HANDOFF_SLOT_MIN: 30,     // K-40: pickup times start every half hour of the open hours; a courier delivery window is this long
  COURIER_COLLECT_LEAD_MIN: 15, // K-40: the courier collects from the tailor this long before the delivery window starts (inside her open hours)
  COURIER_CHANGE_CUTOFF_MIN: 60, // K-40 (D-295): Sarah can move a courier window until this long before the collection
  REMINDER_LEAD_H: 2,       // K-41 (D-296): the 24-hour reminder goes out this long BEFORE the free window closes (CANCEL_WINDOW_H + this = 26 h before the visit)
  REMINDER_NUDGE_H: 3,      // K-41 (D-296): one more push this long before the visit when Sarah never confirmed
});
