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
});

export const POLICY = Object.freeze({
  CANCEL_WINDOW_H: 24,      // > 24 h before the visit → full refund; within → deposit kept
  REQUEST_EXPIRY_H: 2,      // tailor reply window
  MAX_RETRIES: 2,           // "Try again" count after an expiry
  EXPIRING_SOON_MIN: 15,    // countdown turns to the warning state
  NO_SHOW_WAIT_MIN: 15,     // tailor can mark a no-show this long after the start
  MIN_LEAD_H: 3,            // earliest bookable slot from now (D-17)
  CODE_TTL_MIN: 10,         // a sign-in SMS code works for 10 min, then it expires (D-33)
  CODE_RESEND_S: 30,        // "Resend code" unlocks 30 s after the last send (D-33)
  JUST_BOOKED_MIN: 60,      // a booking reads as just confirmed (You’re booked / You accepted) this long after the accept (D-73)
});
