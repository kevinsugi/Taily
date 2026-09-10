/* ============================================================
   T05 - Confirm Final Pricing — Figma 449:809.
   "Confirm Details" + "Reviewed with Sarah at the visit"; the
   modified order (card 1 shows the added Sleeve + $200 in info),
   $36 / $324, Send to Sarah for Approval / Review Details.
   Sending = completeAppointment() → the user's 03/Tailoring
   (awaiting-approval) and 04/Modified. Active=T-Calendar.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { feeRow, cta } from '../components.js';
import { completeAppointment } from '../state.js';
import { tailorChrome, wireTailorNav, backHeader, orderCards } from '../tailor-components.js';
import { job, jobView } from '../tailor-data.js';

function renderScreen(s) {
  const v = jobView(job(s));
  return `${tailorChrome('calendar')}
<div class="body" data-s="t05-confirm-final-pricing">
  ${backHeader('Confirm Details', 'Reviewed with Sarah at the visit')}
  <div class="garments-card">
    ${orderCards(v, { variant: 'Appt_View', showAdded: true })}
    ${feeRow('$36', 'Taily Fee (10%)', { line: true })}
    ${feeRow('$324', 'Your Payout')}
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
  root.querySelector('[data-act="send"]')?.addEventListener('click', () => { completeAppointment(); go('t06-appointment-status'); });
}

register('t05-confirm-final-pricing', renderScreen, wire);
