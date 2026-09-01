/* ============================================================
   08 - Journey Complete — Figma 283:1419.
   Phase R0: three garment-art tiles (the order's items), centred
   title + 16px sub, four-row 16px receipt (deposit / balance /
   delivery / total), Leave a Review / Book Again. Gap 16, 20px
   inner top padding, centred column.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, infoCard, infoRow, cta } from '../components.js';
import { reset } from '../state.js';

function renderScreen() {
  return `${chrome('home')}
<div class="body" data-s="08-journey-complete">
  <div class="done-tiles" aria-hidden="true">
    <span class="done-tile"><img src="assets/garments/done-suit-jacket.png" alt=""></span>
    <span class="done-tile"><img src="assets/garments/done-suit-jacket.png" alt=""></span>
    <span class="done-tile"><img src="assets/garments/done-suit-jacket.png" alt=""></span>
  </div>
  <h1 class="t-title c-ink center">All done!</h1>
  <p class="t-body w-500 c-500 center">Your garments are back with you, tailored to fit. Thank you for using Taily.</p>
  ${infoCard([
    infoRow('Initial Deposit - 7/7/26', '−$20'),
    infoRow('Balance - 7/17/26', '−$340'),
    infoRow('Delivery - 7/17/26', '$10'),
    infoRow('Total - 7/17/26', '$350', { total: true }),
  ].join(''), { heading: 'RECEIPT · #TLY-2026-4417' })}
  <div class="actions">
    ${cta('Leave a Review', { attrs: 'data-act="review"' })}
    ${cta('Book Again', { variant: 'secondary', attrs: 'data-act="again"' })}
  </div>
</div>`;
}

function wire(root) {
  root.querySelector('[data-act="again"]')?.addEventListener('click', () => { reset(); go('01-home'); });
  root.querySelector('[data-act="review"]')?.addEventListener('click', () => go('09-bookings'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('08-journey-complete', renderScreen, wire);
