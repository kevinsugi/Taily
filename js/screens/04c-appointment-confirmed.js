/* ============================================================
   04C - Appointment Confirmed — Figma 277:2844.
   Two-line SemiBold hero, Order Summary (tailor card + white
   garments card with ViewOnly cards + fee rows + prepare card),
   three-CTA bar with top hairline. Active=Bookings.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { chrome, statusHero, summaryCard, garmentCard, feeRow, cta } from '../components.js';
import { state } from '../state.js';
import { openReschedulePopup } from './r1-reschedule-popup.js';

function renderScreen(s) {
  return `${chrome('bookings')}
<div class="body" data-s="04c-appointment-confirmed">
  ${statusHero({ pill: false, title: 'Your Appointment is Confirmed.', titleWeight: 600 })}
  <div class="summary">
    <h2 class="t-title c-500 summary__title">Order Summary</h2>
    ${summaryCard({ fixed: true, initials: 'MT', name: 'Marco Tailor', rows: ['◉&nbsp;&nbsp;88 Leonard Street ', '▤&nbsp;&nbsp;Fri, Jul 17 · 7:00PM', '▤&nbsp;&nbsp;Need By: Friday Jul 17'] })}
    <div class="garments-card">
      ${garmentCard({ variant: 'ViewOnly', type: 'Suit Jacket', qty: 1, price: '$120', services: ['Hem / Adjust Length'], photos: 2 })}
      ${garmentCard({ variant: 'ViewOnly', type: 'Suit Jacket', qty: 1, price: '$80', services: ['Sleeve / Adjust Length'], photos: 2 })}
      ${feeRow('$200', 'Subtotal - Confirmed at Appointment', { line: true })}
      ${feeRow('-$20', '10% Deposit - Paid 7/7/26', { line: true })}
      ${feeRow('$180', 'Balance')}
    </div>
    <div class="prepare-card">
      <p class="t-body w-500 c-500">Please prepare:</p>
      <ul class="t-body c-700 prepare-list"><li>Your garments</li><li>The shoes you plan to wear with them</li></ul>
    </div>
  </div>
  <div class="cta-bar">
    ${cta('Add to Calendar', { attrs: 'data-act="calendar"' })}
    ${cta('Message Tailor', { variant: 'secondary', attrs: 'data-act="message"' })}
    ${cta('Reschedule / Cancel', { variant: 'secondary', attrs: 'data-act="reschedule"' })}
    ${cta('View All Appointments', { variant: 'secondary', attrs: 'data-act="bookings"' })}
  </div>
</div>`;
}

function wire(root) {
  root.querySelector('[data-act="bookings"]')?.addEventListener('click', () => go('09-bookings'));
  root.querySelector('[data-act="reschedule"]')?.addEventListener('click', () => openReschedulePopup());
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (el.dataset.nav === 'home') go('01-home');
      if (el.dataset.nav === 'bookings') go('09-bookings');
    });
  });
}

register('04c-appointment-confirmed', renderScreen, wire);
