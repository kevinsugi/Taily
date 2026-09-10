/* ============================================================
   T06 - Appointment Status — Figma 473:6324 (Marco's 03/Tailoring).
   Job card (need-by badge, $324, status pill, 3 Suit Jackets),
   three Appt_View cards itemised $120/$80/$80, $36 / $324,
   Mark Ready / Back to Appointments. Active=T-Calendar.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { feeRow, cta, toast } from '../components.js';
import { state, approveOrder, markReady } from '../state.js';
import { tailorChrome, wireTailorNav, backHeader, jobCard, orderCards } from '../tailor-components.js';
import { job, jobView, CUSTOMER } from '../tailor-data.js';

function renderScreen(s) {
  const a = job(s);
  const v = jobView(a);
  /* deep-linked with the seed's 'confirmed' → the frame's Tailoring fixture */
  const shown = v.post ? v : jobView({ ...a, status: 'tailoring' });
  return `${tailorChrome('calendar')}
<div class="body" data-s="t06-appointment-status">
  ${backHeader('Appointment Status')}
  <div class="summary">
    ${jobCard({ month: 'JUL', day: '17', name: CUSTOMER.name, meta: 'Need by: Fri, Jul 17', payout: '$324', status: shown.pill, pillLabel: shown.pillLabel, stage: shown.stage, right: '3 Suit Jackets' })}
    <div class="garments-card">
      ${orderCards(shown, { variant: 'Appt_View' })}
      ${feeRow('$36', 'Taily Fee (10%)', { line: true })}
      ${feeRow('$324', 'Your Payout')}
    </div>
  </div>
  <div class="t-actions">
    ${cta('Mark Ready', { attrs: 'data-act="ready"' })}
    ${cta('Back to Appointments', { variant: 'secondary', attrs: 'data-act="home"' })}
  </div>
</div>`;
}

function wire(root) {
  wireTailorNav(root);
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('t01-home'));
  root.querySelector('[data-act="home"]')?.addEventListener('click', () => go('t01-home'));
  root.querySelector('[data-act="ready"]')?.addEventListener('click', () => {
    const v = jobView(job(state));
    /* demo shortcut: Sarah approves on the spot if she hasn't yet */
    if (v.canon === 'confirmed') { /* deep-linked fixture: nothing to advance */ }
    if (v.canon === 'awaiting-approval') { approveOrder(); toast('Sarah approved the final order'); }
    markReady();
    go('t07-job-ready');
  });
}

register('t06-appointment-status', renderScreen, wire);
