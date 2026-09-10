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
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { cta, toast } from '../components.js';
import { state, completeAppointment } from '../state.js';
import { tailorChrome, wireTailorNav, backHeader, orderCards, payoutRows } from '../tailor-components.js';
import { job, jobView, draftFor, orderMarks, orderTotals, bookedGarments, writeFinalOrder, tailorUi, isFixture } from '../tailor-data.js';

function renderScreen(s) {
  const a = job(s);
  const draft = draftFor(s, a, { fixture: isFixture() });
  const marks = orderMarks(draft, bookedGarments(a));
  return `${tailorChrome('calendar')}
<div class="body" data-s="t05-confirm-final-pricing">
  ${backHeader('Confirm Details', 'Reviewed with Sarah at the visit')}
  <div class="garments-card">
    ${orderCards(draft, { variant: 'Appt_View', marks })}
    ${payoutRows(orderTotals(draft))}
  </div>
  <div class="t-actions">
    ${cta('Send to Sarah for Approval', { attrs: 'data-act="send"' })}
    ${cta('Review Details', { variant: 'secondary', attrs: 'data-act="review"' })}
  </div>
</div>`;
}

function wire(root) {
  wireTailorNav(root);
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('t04-appointment-details'));
  root.querySelector('[data-act="review"]')?.addEventListener('click', () => back() || go('t04-appointment-details'));
  root.querySelector('[data-act="send"]')?.addEventListener('click', () => {
    const a = job(state);
    if (!a || jobView(a).canon !== 'confirmed') { toast('Already sent to Sarah'); return; }
    writeFinalOrder(a, draftFor(state, a, { fixture: isFixture() }));
    completeAppointment();                 // confirmed → awaiting-approval
    tailorUi(state).draft = null;
    toast('Sent to Sarah for approval');
    go('t01-home');                        // T06 sits on Home, not on the editor (R1-T-07)
    go('t06-appointment-status');
  });
}

register('t05-confirm-final-pricing', renderScreen, wire);
