/* ============================================================
   T07 - Job Ready — Figma 449:847.
   "Ready for handoff." + two-line body, When/Where/Items detail
   card, Mark Picked Up / Message Sarah / View All Appointments,
   "View Order Summary" disclosure. Active=T-Calendar.
   UX-LOOP R1-T-11: when the customer has chosen a handoff
   (a.fulfilment) the body, When, Where and CTA follow it; otherwise
   the frame's pickup fixture (Fri, Jul 17 · 3:00 PM at 1025 Broadway).
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { cta } from '../components.js';
import { deliver } from '../state.js';
import { tailorChrome, wireTailorNav, backHeader, detailRow, orderDropdown, orderCards, payoutRows } from '../tailor-components.js';
import { job, jobView, isFixture, FIXTURE_FINAL, orderTotals } from '../tailor-data.js';

const SHOP = '1025 Broadway';

function renderScreen(s) {
  const a = job(s);
  const v = jobView(a);
  const fixture = isFixture() || !v.post;
  const f = fixture ? null : a?.fulfilment;
  const delivery = f?.method === 'delivery';
  const body = f
    ? `Sarah chose ${delivery ? `delivery to ${v.address}` : 'pickup at your shop'}.<br>Payment will be processed on handoff.`
    : 'Sarah will pick up her items.<br>Payment will be processed upon pickup.';
  const garments = fixture ? FIXTURE_FINAL : v.garments;
  const totals = fixture ? { fee: 36, payout: 324 } : v;
  return `${tailorChrome('calendar')}
<div class="body" data-s="t07-job-ready">
  <div class="t-status">
    ${backHeader('Ready for handoff.')}
    <p class="t-body c-500">${body}</p>
  </div>
  <div class="t-detail-card">
    ${detailRow('When', f?.window ?? 'Fri, Jul 17 · 3:00 PM')}
    ${detailRow('Where', delivery ? v.address : SHOP)}
    ${detailRow('Items', fixture ? '3 Suit Jackets' : v.itemsLabel)}
  </div>
  <div class="t-actions">
    ${cta(delivery ? 'Mark Delivered' : 'Mark Picked Up', { attrs: 'data-act="picked-up"' })}
    ${cta('Message Sarah', { variant: 'secondary', attrs: 'data-act="message"' })}
    ${cta('View All Appointments', { variant: 'secondary', attrs: 'data-act="home"' })}
  </div>
  ${orderDropdown()}
  <div class="garments-card order-summary" hidden>
    ${orderCards(garments, { variant: 'Appt_View', plain: true })}
    ${payoutRows(fixture ? totals : orderTotals(garments))}
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
