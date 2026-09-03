/* ============================================================
   05X - Appointment Cancelled V1 (Summary kept) — Figma 558:3817.
   05's chassis with a one-line heading, the same order summary
   (fixture kept per the frame name), a refund card in place of the
   prepare card, and a single Back to Home CTA. Reached from R1's
   Reschedule / Cancel confirm. Gap 12, heading at the bare 128.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, summaryCard, garmentCard, feeRow, cta } from '../components.js';

function renderScreen() {
  return `${chrome('home')}
<div class="body" data-s="05x-appointment-cancelled">
  <h1 class="t-title w-600 c-error">Appointment Cancelled</h1>
  <div class="summary">
    <h2 class="t-title w-600 c-500 summary__title">Order Summary</h2>
    ${summaryCard({ fixed: true, initials: 'MT', name: 'Marco Tailor', rows: ['◉&nbsp;&nbsp;88 Leonard Street ', '▤&nbsp;&nbsp;Fri, Jul 17 · 7:00PM', '▤&nbsp;&nbsp;Need By: Friday Jul 17'] })}
    <div class="garments-card">
      ${garmentCard({ variant: 'ViewOnly', type: 'Suit Jacket', qty: 1, price: '$120', services: ['Hem / Adjust Length'], photos: 2 })}
      ${garmentCard({ variant: 'ViewOnly', type: 'Suit Jacket', qty: 1, price: '$80', services: ['Sleeve / Adjust Length'], photos: 2 })}
      ${feeRow('$200', 'Subtotal - Confirmed at Appointment', { line: true })}
      ${feeRow('$20', '10% Deposit - Paid 7/7/26', { line: true })}
      ${feeRow('$180', 'Balance')}
    </div>
    <div class="prepare-card">
      <p class="t-body w-500 c-500">Refund on the way</p>
      <p class="t-body c-700">Your $20 deposit will be returned to Visa •••• 4242. Please rebook whenever you’re ready.</p>
    </div>
  </div>
  <div class="actions">
    ${cta('Back to Home', { attrs: 'data-act="home"' })}
  </div>
</div>`;
}

function wire(root) {
  root.querySelector('[data-act="home"]')?.addEventListener('click', () => go('01-home'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('05x-appointment-cancelled', renderScreen, wire);
