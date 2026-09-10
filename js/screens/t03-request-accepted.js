/* ============================================================
   T03 - Request Accepted — Figma 449:714.
   "Booking Confirmed!" hero, the same order summary as T02,
   Back to Home / Message Sarah. Active=T-Home.
   ============================================================ */

import { register, render as go } from '../app.js';
import { statusHero, summaryCard, garmentCard, feeRow, cta } from '../components.js';
import { tailorChrome, wireTailorNav } from '../tailor-components.js';
import { CUSTOMER, CUSTOMER_ROWS } from '../tailor-data.js';

function renderScreen() {
  return `${tailorChrome('home')}
<div class="body" data-s="t03-request-accepted">
  ${statusHero({ pill: false, title: 'Booking Confirmed!', body: 'We let Sarah know you’re coming and added the visit to your calendar.' })}
  <div class="summary">
    ${summaryCard({ initials: 'MT', name: CUSTOMER.name, rows: CUSTOMER_ROWS })}
    <div class="garments-card">
      ${garmentCard({ variant: 'ViewOnly', type: 'Suit Jacket', qty: 1, price: '$120', services: ['Hem / Adjust Length'], photos: 2 })}
      ${garmentCard({ variant: 'ViewOnly', type: 'Suit Jacket', qty: 1, price: '$80', services: ['Sleeve / Adjust Length'], photos: 2 })}
      ${feeRow('$20', 'Taily Fee (10%)', { line: true })}
      ${feeRow('$180', 'Your Payout')}
    </div>
  </div>
  <div class="t-actions">
    ${cta('Back to Home', { attrs: 'data-act="home"' })}
    ${cta('Message Sarah', { variant: 'secondary', attrs: 'data-act="message"' })}
  </div>
</div>`;
}

function wire(root) {
  wireTailorNav(root);
  root.querySelector('[data-act="home"]')?.addEventListener('click', () => go('t01-home'));
  root.querySelector('[data-act="message"]')?.addEventListener('click', () => go('10-messages'));
}

register('t03-request-accepted', renderScreen, wire);
