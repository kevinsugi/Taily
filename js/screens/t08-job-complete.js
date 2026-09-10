/* ============================================================
   T08 - Job Complete — Figma 449:866.
   "Job complete." hero, PAYOUT SUMMARY card ($360 / −$36 / $324,
   deposited Mon, Jul 20), Back to Home, "View Order Summary".
   Active=T-Calendar.
   ============================================================ */

import { register, render as go } from '../app.js';
import { statusHero, cta, feeRow } from '../components.js';
import { tailorChrome, wireTailorNav, priceRow, hairline, orderDropdown, orderCards } from '../tailor-components.js';
import { job, jobView } from '../tailor-data.js';
import { wireOrderDropdown } from './t07-job-ready.js';

function renderScreen(s) {
  const v = jobView(job(s));
  return `${tailorChrome('calendar')}
<div class="body" data-s="t08-job-complete">
  ${statusHero({ pill: false, title: 'Job complete.', body: 'Nice work, Marco. Your payout is on the way.' })}
  <div class="t-detail-card">
    <span class="payout-summary__title">PAYOUT SUMMARY  ·  TLY-2026-4417</span>
    <div class="price-group">
      ${priceRow('Order total', '$360')}
      ${priceRow('Taily fee', '−$36', { muted: true })}
    </div>
    ${hairline()}
    <div class="price-group">
      ${priceRow('Your payout', '$324', { total: true })}
      <span class="payout-summary__note">Deposited to your account · Mon, Jul 20</span>
    </div>
  </div>
  ${cta('Back to Home', { attrs: 'data-act="home"' })}
  ${orderDropdown()}
  <div class="garments-card order-summary" hidden>
    ${orderCards(v, { variant: 'Appt_View' })}
    ${feeRow('$36', 'Taily Fee (10%)', { line: true })}
    ${feeRow('$324', 'Your Payout')}
  </div>
</div>`;
}

function wire(root) {
  wireTailorNav(root);
  wireOrderDropdown(root);
  root.querySelector('[data-act="home"]')?.addEventListener('click', () => go('t01-home'));
}

register('t08-job-complete', renderScreen, wire);
