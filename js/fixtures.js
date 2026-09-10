/* ============================================================
   Harness fixtures for the UX-LOOP round 3 Figma sync.
   Every live-only state built code-first in round 2 (expiry, decline,
   tailor cancel / no-show, proposed time, removals, request changes,
   waiting handoff) gained a sibling Figma frame in round 3. The
   frames are duplicates of their base frame with only the state's
   copy changed, so each variant route renders the SAME seed
   appointment (Kevin / Sarah's Jul 12 visit with Marco) pushed into
   that state — nothing here touches `state`, and the base screens'
   own deep links are unchanged.
   ============================================================ */

import { SEED_UPCOMING, SEED_FINAL_ORDER } from './data.js';
import { state } from './state.js';
import { FIXTURE_T06 } from './tailor-data.js';

const clone = (v) => JSON.parse(JSON.stringify(v));

/** The seed appointment (`mine`, Jul 12) with `overrides` applied. */
export const seedAppt = (overrides = {}) => ({ ...clone(SEED_UPCOMING[0]), ...overrides });

/* ---------- terminal outcomes (R2-U-04/05/07, R2-T-05/06) ---------- */
export const APPT_EXPIRED = () => seedAppt({ status: 'expired', cancelledBy: 'none', reason: 'expired', wasRequested: true });
export const APPT_DECLINED = () => seedAppt({ status: 'declined', cancelledBy: 'tailor', reason: 'declined', wasRequested: true });
export const APPT_TAILOR_CANCELLED = () => seedAppt({ status: 'cancelled', cancelledBy: 'tailor', reason: 'cant-make-it', wasRequested: false });
export const APPT_NO_SHOW = () => seedAppt({ status: 'cancelled', cancelledBy: 'tailor', reason: 'no-show', wasRequested: false });
export const APPT_WITHDRAWN = () => seedAppt({ status: 'cancelled', cancelledBy: 'customer', reason: 'customer', wasRequested: true });

/* ---------- proposed time (R2-U-03 / R2-T-04): the next day, 11 AM ---------- */
export const PROPOSED_WHEN = 'Jul 13, 11:00 AM';
/* R6: a request still matching has NO tailor yet (name / initials /
   tailorId null, `matching`) — the 03 New Time hero reads "A tailor
   proposed a new time", the 09 Closed Cards request card "Matching you
   with a tailor" (frames edited to match in round 6). */
export const MATCHING = { name: null, initials: null, tailorId: null, matching: true };
export const APPT_MATCHING = () => seedAppt({ status: 'searching', ...MATCHING });
export const APPT_PROPOSED = () => seedAppt({ status: 'searching', ...MATCHING, proposed: { when: PROPOSED_WHEN, by: 'tailor', at: 'Sun, Jul 12' } });

/* ---------- post-visit states on the frames' $360 final order ---------- */
const finalOrder = () => ({ garments: clone(SEED_FINAL_ORDER.garments), totals: clone(SEED_FINAL_ORDER.totals) });
/** T06 "Sarah has questions": awaiting approval, Request Changes sent
    (R2-T-09). Cards itemize the T06 frame's $120 / $80 / $80 (the
    CLAUDE.md quirk) against the $360 total. */
export const APPT_QUESTIONS = () => seedAppt({ status: 'awaiting-approval', changesRequestedAt: 'Sun, Jul 12', revisedAt: 'Sun, Jul 12', garments: clone(FIXTURE_T06), totals: clone(SEED_FINAL_ORDER.totals) });
/** T07 "waiting for Sarah to schedule": ready, no handoff chosen yet (R2-T-07). */
export const APPT_READY_WAITING = () => seedAppt({ status: 'ready-for-pickup', readyAt: 'Thu, Jul 16', revisedAt: 'Sun, Jul 12', ...finalOrder() });

/* ---------- a garment dropped at the visit (R2-T-08) ----------
   Booked: g1 Hem $120 + g2 Sleeve $80. At the visit g1 gained a Sleeve
   (+$80), g2 was removed and a third jacket was added → $280. */
export const REMOVED_G2 = { id: 'g2', type: 'Suit Jacket', jobs: ['Sleeve / Adjust Length'], qty: 1, amount: 80 };
export const FINAL_ORDER_REMOVED = () => ({
  garments: [clone(SEED_FINAL_ORDER.garments[0]), clone(SEED_FINAL_ORDER.garments[2])],
  totals: { subtotal: 280, visitFee: 0, total: 280, deposit: 20 },
  removed: [clone(REMOVED_G2)],
});
/** The tailor's T05 draft for the same visit (no id on the added jacket). */
export const DRAFT_REMOVED = () => {
  const [g1, g7] = FINAL_ORDER_REMOVED().garments;
  delete g1.addedJobs; delete g7.added; delete g7.id;
  return [g1, g7];
};

/** A throwaway state view: the live `state` with these lists swapped in. */
export const withLists = ({ upcoming = [], past = [] }, s = state) => ({ ...s, upcoming, past, lastCancelled: null, currentAppt: { list: 'upcoming', index: 0 } });
