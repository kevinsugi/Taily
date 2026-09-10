/* ============================================================
   T04 - Appointment Details — Figma 455:2587.
   At the visit: customer card + three editable (Appt) garment cards
   with upload rows, fee rows ($36 / $324), Continue + Contact Taily
   Support. Active=T-Calendar.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { summaryCard, feeRow, cta, toast } from '../components.js';
import { tailorChrome, wireTailorNav, backHeader, orderCards } from '../tailor-components.js';
import { job, jobView, CUSTOMER, CUSTOMER_ROWS } from '../tailor-data.js';

function renderScreen(s) {
  const v = jobView(job(s));
  return `${tailorChrome('calendar')}
<div class="body" data-s="t04-appointment-details">
  ${backHeader('Appointment Details', 'Upload all notes and photos below.')}
  <div class="summary">
    ${summaryCard({ initials: 'MT', name: CUSTOMER.name, rows: CUSTOMER_ROWS })}
    <div class="garments-card">
      ${orderCards(v, { variant: 'Appt' })}
      ${feeRow('$36', 'Taily Fee (10%)', { line: true })}
      ${feeRow('$324', 'Your Payout')}
    </div>
  </div>
  <div class="t-actions">
    ${cta('Continue', { attrs: 'data-act="continue"' })}
    ${cta('Contact Taily Support', { variant: 'secondary', attrs: 'data-act="support"' })}
  </div>
</div>`;
}

function wire(root) {
  wireTailorNav(root);
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('t01-home'));
  root.querySelector('[data-act="continue"]')?.addEventListener('click', () => go('t05-confirm-final-pricing'));
  root.querySelector('[data-act="support"]')?.addEventListener('click', () => toast('Taily Support is outside this prototype'));
  root.querySelectorAll('[data-act="comment"], [data-act="remove-garment"], [data-sel]').forEach((el) =>
    el.addEventListener('click', (e) => { e.preventDefault(); toast('Editing at the visit comes in the next round'); }));
}

register('t04-appointment-details', renderScreen, wire);
