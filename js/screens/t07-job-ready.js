/* ============================================================
   T07 - Job Ready — Figma 449:847.
   "Ready for handoff." + two-line body, When/Where/Items detail
   card, Mark Picked Up / Message Sarah / View All Appointments,
   "View Order Summary" disclosure. Active=T-Calendar.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { cta, feeRow } from '../components.js';
import { deliver } from '../state.js';
import { tailorChrome, wireTailorNav, backHeader, detailRow, orderDropdown, orderCards } from '../tailor-components.js';
import { job, jobView } from '../tailor-data.js';

function renderScreen(s) {
  const v = jobView(job(s));
  return `${tailorChrome('calendar')}
<div class="body" data-s="t07-job-ready">
  <div class="t-status">
    ${backHeader('Ready for handoff.')}
    <p class="t-body c-500">Sarah will pick up her items.<br>Payment will be processed upon pickup.</p>
  </div>
  <div class="t-detail-card">
    ${detailRow('When', 'Fri, Jul 17 · 3:00 PM')}
    ${detailRow('Where', '1025 Broadway')}
    ${detailRow('Items', '3 Suit Jackets')}
  </div>
  <div class="t-actions">
    ${cta('Mark Picked Up', { attrs: 'data-act="picked-up"' })}
    ${cta('Message Sarah', { variant: 'secondary', attrs: 'data-act="message"' })}
    ${cta('View All Appointments', { variant: 'secondary', attrs: 'data-act="home"' })}
  </div>
  ${orderDropdown()}
  <div class="garments-card order-summary" hidden>
    ${orderCards(v, { variant: 'Appt_View' })}
    ${feeRow('$36', 'Taily Fee (10%)', { line: true })}
    ${feeRow('$324', 'Your Payout')}
  </div>
</div>`;
}

export function wireOrderDropdown(root) {
  const btn = root.querySelector('[data-act="order-summary"]');
  const panel = root.querySelector('.order-summary');
  btn?.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    btn.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
  });
}

function wire(root) {
  wireTailorNav(root);
  wireOrderDropdown(root);
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('t01-home'));
  root.querySelector('[data-act="picked-up"]')?.addEventListener('click', () => { deliver(); go('t08-job-complete'); });
  root.querySelector('[data-act="message"]')?.addEventListener('click', () => go('10-messages'));
  root.querySelector('[data-act="home"]')?.addEventListener('click', () => go('t01-home'));
}

register('t07-job-ready', renderScreen, wire);
