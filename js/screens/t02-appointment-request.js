/* ============================================================
   T02 - Appointment Request — Figma 455:2170.
   "$180 | New Request" header, Order Summary (customer card +
   ViewOnly garment cards + fee rows), Accept / Decline. Active=T-Home.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { summaryCard, garmentCard, feeRow, cta } from '../components.js';
import { state, tailorAccepts } from '../state.js';
import { tailorChrome, wireTailorNav } from '../tailor-components.js';
import { tailorUi, CUSTOMER, CUSTOMER_ROWS } from '../tailor-data.js';

function renderScreen() {
  return `${tailorChrome('home')}
<div class="body" data-s="t02-appointment-request">
  <div class="t-header">
    <button type="button" class="t-back" data-act="back" aria-label="Back">‹</button>
    <h1 class="t-title w-600 c-ink">$180 | New Request</h1>
  </div>
  <div class="summary">
    <h2 class="t-title w-600 c-ink summary__title">Order Summary</h2>
    ${summaryCard({ initials: CUSTOMER.initials, name: CUSTOMER.name, rows: CUSTOMER_ROWS })}
    <div class="garments-card">
      ${garmentCard({ variant: 'ViewOnly', type: 'Suit Jacket', qty: 1, price: '$120', services: ['Hem / Adjust Length'], photos: 2 })}
      ${garmentCard({ variant: 'ViewOnly', type: 'Suit Jacket', qty: 1, price: '$80', services: ['Sleeve / Adjust Length'], photos: 2 })}
      ${feeRow('$20', 'Taily Fee (10%)', { line: true })}
      ${feeRow('$180', 'Your Payout')}
    </div>
  </div>
  <div class="t-actions">
    ${cta('Accept Request · $180', { attrs: 'data-act="accept"' })}
    ${cta('Decline', { variant: 'secondary', attrs: 'data-act="decline"' })}
  </div>
</div>`;
}

function wire(root) {
  wireTailorNav(root);
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('t01-home'));
  root.querySelector('[data-act="accept"]')?.addEventListener('click', () => {
    tailorAccepts();                       // searching → confirmed (no-op if already confirmed)
    tailorUi(state).requestHandled = true;
    go('t03-request-accepted');
  });
  root.querySelector('[data-act="decline"]')?.addEventListener('click', () => go('t03a-decline-request'));
}

register('t02-appointment-request', renderScreen, wire);
