/* ============================================================
   04D - Appointment Complete — Figma 308:3578.
   Tailoring hero (title + Est. Delivery row, no pill), Order
   Summary (n500 serif title, tight gap, garments card), plain
   three-CTA bar. Active=Bookings.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, garmentCard, feeRow, cta } from '../components.js';

function renderScreen() {
  return `${chrome('bookings')}
<div class="body" data-s="04d-appointment-complete">
  ${statusHero({ pill: false, title: 'Marco is tailoring your items.', rowLabel: 'Est. Delivery Date:', rowValue: 'July 15, 2026' })}
  <div class="summary summary--tight">
    <h2 class="t-title c-500 summary__title">Order Summary</h2>
    <div class="garments-card">
      ${garmentCard({ variant: 'ViewOnly', type: 'Suit Jacket', qty: 1, price: '$120', services: ['Hem / Adjust Length'], photos: 2 })}
      ${garmentCard({ variant: 'ViewOnly', type: 'Suit Jacket', qty: 1, price: '$80', services: ['Sleeve / Adjust Length'], photos: 2 })}
      ${feeRow('$20', '10% Deposit - Paid 7/7/26')}
      ${feeRow('$180', 'Est. Balance - Confirmed at Appointment')}
    </div>
  </div>
  <div class="cta-bar cta-bar--plain">
    ${cta('Add to Calendar', { attrs: 'data-act="calendar"' })}
    ${cta('Message Marco', { variant: 'secondary', attrs: 'data-act="message"' })}
    ${cta('View All Appointments', { variant: 'secondary', attrs: 'data-act="bookings"' })}
  </div>
</div>`;
}

function wire(root) {
  root.querySelector('[data-act="bookings"]')?.addEventListener('click', () => go('09-bookings'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (el.dataset.nav === 'home') go('01-home');
      if (el.dataset.nav === 'bookings') go('09-bookings');
    });
  });
}

register('04d-appointment-complete', renderScreen, wire);
