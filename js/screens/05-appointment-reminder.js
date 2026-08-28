/* ============================================================
   05 - Appointment Reminder — Figma 308:4108.
   SemiBold heading + Order Summary (SemiBold n500 serif title,
   fixed tailor card, garments card with photo pairs, prepare
   card) + Confirm/Message/Reschedule actions + cancel line.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, summaryCard, garmentCard, feeRow, cta } from '../components.js';
import { completeAppointment } from '../state.js';

function renderScreen() {
  return `${chrome('home')}
<div class="body" data-s="05-appointment-reminder">
  <h1 class="t-title w-600 c-ink">Please Confirm Tomorrows Appointment.</h1>
  <div class="summary">
    <h2 class="t-title w-600 c-500 summary__title">Order Summary</h2>
    ${summaryCard({ fixed: true, initials: 'SC', name: 'Marco Tailor', rows: ['◉&nbsp;&nbsp;88 Leonard Street ', '▤&nbsp;&nbsp;Thu, Jul 9 · 9:30 AM', '▤&nbsp;&nbsp;Need By: Thurs, Sep 1'] })}
    <div class="garments-card">
      ${garmentCard({ variant: 'ViewOnly', type: 'Suit Jacket', qty: 1, price: '$120', services: ['Hem / Adjust Length'], photos: 2 })}
      ${garmentCard({ variant: 'ViewOnly', type: 'Suit Jacket', qty: 1, price: '$80', services: ['Sleeve / Adjust Length'], photos: 2 })}
      ${feeRow('$20', '10% Deposit - Paid 7/7/26')}
      ${feeRow('$180', 'Est. Balance - Confirmed at Appointment')}
    </div>
    <div class="prepare-card">
      <p class="t-body w-500 c-500">Please prepare:</p>
      <p class="t-body c-700 prepare-card__list">▪&nbsp;&nbsp;Your garments<br>▪&nbsp;&nbsp;The shoes you plan to wear with them</p>
    </div>
  </div>
  <div class="actions">
    ${cta('Confirm Appointment', { attrs: 'data-act="confirm"' })}
    ${cta('Message Marco', { variant: 'secondary', attrs: 'data-act="message"' })}
    ${cta('Reschedule', { variant: 'secondary', attrs: 'data-act="reschedule"' })}
    <button type="button" class="cancel-line" data-act="cancel">Cancel request — deposit refunded</button>
  </div>
</div>`;
}

function wire(root) {
  root.querySelector('[data-act="confirm"]')?.addEventListener('click', () => { completeAppointment(); go('06-order-status'); });
  root.querySelector('[data-act="message"]')?.addEventListener('click', () => go('m1-message-tailor'));
  root.querySelector('[data-act="reschedule"]')?.addEventListener('click', () => go('02a-date-time-sheet'));
  root.querySelector('[data-act="cancel"]')?.addEventListener('click', () => go('01-home'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('05-appointment-reminder', renderScreen, wire);
