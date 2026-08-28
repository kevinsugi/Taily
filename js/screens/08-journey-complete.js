/* ============================================================
   08 - Journey Complete — Figma 283:1419.
   Info-bg success badge (green ✓), Completed pill, centred title
   + sub, receipt card, Leave a Review / Book Again. Gap 16,
   48px inner top padding, centred column.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusPill, infoCard, infoRow, cta } from '../components.js';
import { reset } from '../state.js';

function renderScreen() {
  return `${chrome('home')}
<div class="body" data-s="08-journey-complete">
  <span class="success-badge"><span class="success-badge__check">✓</span></span>
  ${statusPill('completed')}
  <h1 class="t-title c-ink center">All done.</h1>
  <p class="t-small c-500 center">Your garments are back with you, tailored to fit. Thanks for using Taily.</p>
  ${infoCard([
    infoRow('Final order', '$280', { small: true }),
    infoRow('Deposit credited', '−$20', { small: true }),
    infoRow('Delivery', '$10', { small: true }),
    infoRow('Total paid', '$270', { total: true }),
  ].join(''), { heading: 'RECEIPT · #TLY-2026-4417' })}
  ${cta('Leave a Review', { attrs: 'data-act="review"' })}
  ${cta('Book Again', { variant: 'secondary', attrs: 'data-act="again"' })}
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
