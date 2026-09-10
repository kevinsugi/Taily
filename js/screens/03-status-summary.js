/* ============================================================
   04E - Order Summary — Figma 533:3946.
   Completed-appointment receipt: "Order Summary" hero with an Items
   Received row, ViewOnly garments card with deposit + balance-paid
   fee rows, single secondary View All Appointments CTA.
   Active=Bookings. Opened from a completed appointment card.
   UX-LOOP R1-U-07: the receipt rows are 06's (fulfilment-aware —
   a pickup order shows no delivery fee); Items Received reads the
   delivered day. The harness's seed load (still pre-appointment)
   renders the frames' $360 delivery fixture via finalOrder().
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, summaryCard, cta, orderCards, apptRows, receiptRows } from '../components.js';
import { finalOrder } from '../state.js';
import { wirePhotoViewer } from './03.3-photo-viewer.js';
import { currentAppt } from './03-status-confirmed.js';

function renderScreen(s) {
  const a = currentAppt(s);
  const o = finalOrder(a);

  return `${chrome('bookings')}
<div class="body" data-s="03-status-summary">
  ${statusHero({ pill: 'completed', title: 'Order Summary', rowLabel: 'Items Received:', rowValue: a.deliveredAt ?? 'July 17, 2026' })}
  ${summaryCard({ fixed: true, initials: a.initials ?? 'MT', name: a.name ?? 'Marco Tailor', rows: apptRows(a) })}
  <div class="garments-card">
    ${orderCards(o, { variant: 'PostAppt' })}
    ${receiptRows(a, o.totals)}
  </div>
  <div class="cta-bar cta-bar--plain">
    ${cta('View All Appointments', { variant: 'secondary', attrs: 'data-act="bookings"' })}
  </div>
</div>`;
}

function wire(root) {
  wirePhotoViewer(root);
  root.querySelector('[data-act="bookings"]')?.addEventListener('click', () => go('09-bookings'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (el.dataset.nav === 'home') go('01-home');
      if (el.dataset.nav === 'bookings') go('09-bookings');
    });
  });
}

register('03-status-summary', renderScreen, wire);
