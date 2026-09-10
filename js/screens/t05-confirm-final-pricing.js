/* ============================================================
   T05 - Confirm Final Pricing — Figma 449:809.
   "Confirm Details" + "Reviewed with Sarah at the visit"; the draft
   order with what changed at the visit in semantic/info (card 1's
   added Sleeve + $200, the added third jacket), fee rows,
   Send to Sarah for Approval / Review Details. Active=T-Calendar.

   UX-LOOP R1-T-03/06/07: Send writes the draft into a.garments /
   a.totals (the shared final order), runs completeAppointment(),
   toasts, and lands on T06 with T01 beneath it so back never returns
   to the editor; a second Send only toasts.
   Round 2: marks match garments by id and booked garments dropped at
   the visit render as "Removed at the visit — …" lines (R2-T-08);
   Send passes the tapped job and checks the transition before
   toasting (R2-T-02).
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { cta, toast } from '../components.js';
import { state } from '../state.js';
import { tailorChrome, wireTailorNav, backHeader, orderCards, payoutRows, removedRows } from '../tailor-components.js';
import { current, jobView, draftFor, orderMarks, orderTotals, bookedGarments, writeFinalOrder, tailorOf, isFixture, isTerminalJob, T } from '../tailor-data.js';

/** Exported: `forced` = { draft, booked } renders a given at-visit draft
    against its booking (round-3 frame "T05 - Confirm Final Pricing / Removed"). */
export function viewPricing(s, forced = null) {
  const a = current(s);
  const fixture = isFixture() && !forced;
  const draft = forced?.draft ?? draftFor(s, a, { fixture });
  const { marks, removed } = orderMarks(draft, forced?.booked ?? bookedGarments(a));
  return `${tailorChrome('calendar')}
<div class="body" data-s="t05-confirm-final-pricing">
  ${backHeader('Confirm Details', 'Reviewed with Sarah at the visit')}
  <div class="garments-card">
    ${orderCards(draft, { variant: 'Appt_View', marks })}
    ${fixture ? '' : removedRows(removed)}
    ${payoutRows(orderTotals(draft))}
  </div>
  <div class="t-actions">
    ${cta('Send to Sarah for Approval', { attrs: 'data-act="send"' })}
    ${cta('Review Details', { variant: 'secondary', attrs: 'data-act="review"' })}
  </div>
</div>`;
}

export function wire(root) {
  /* R5-T-01/02: a closed job reached through history or a deep link is off
     the calendar — leave the editor instead of drawing it. */
  { const a0 = current(state); if (window.__tailyNavigated && a0 && isTerminalJob(a0)) { toast('This job is no longer on your calendar'); setTimeout(() => go('t01-home', { replace: true }), 0); return; } }
  wireTailorNav(root);
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('t04-appointment-details'));
  root.querySelector('[data-act="review"]')?.addEventListener('click', () => back() || go('t04-appointment-details'));
  root.querySelector('[data-act="send"]')?.addEventListener('click', () => {
    const a = current(state);
    /* R4-T-03: a stale T05 reached through history for a job that has
       since closed (Sarah cancelled) — say so, and leave the editor */
    if (a && isTerminalJob(a)) { toast('This job is no longer on your calendar'); go('t01-home', { replace: true }); return; }
    /* R2-T-02: the transition names its job and must succeed before
       anything is written or announced */
    if (!a || jobView(a).canon !== 'confirmed' || !T.complete(a)) { toast('Already sent to Sarah'); return; }
    writeFinalOrder(a, draftFor(state, a, { fixture: isFixture() }));
    tailorOf(a).draft = null;
    toast('Sent to Sarah for approval');
    go('t01-home');                        // T06 sits on Home, not on the editor (R1-T-07)
    go('t06-appointment-status');
  });
}

register('t05-confirm-final-pricing', viewPricing, wire);
