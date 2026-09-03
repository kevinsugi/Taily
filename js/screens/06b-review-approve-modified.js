/* ============================================================
   06B - Review & Approve Final Order - Modified — Figma 551:6263.
   06A with the order modified at the appointment: card 1 gains an
   added service, card 3 is a whole added garment, and every touched
   price renders semantic/info. Fee rows: $360 Subtotal / - $20
   Deposit / $340 Due. Gap 16, heading at the bare 128 offset.
   The card fixtures are the frame's fiction (like 06A's) — the $80
   added service + $80 added garment reconcile with the seed's
   modified totals (200 + 80 + 80 = 360).
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, garmentCard, feeRow, cta } from '../components.js';
import { approveOrder } from '../state.js';
import { openRequestChanges } from './rc1-request-changes.js';
import { wirePhotoViewer } from './pv3-photo-viewer.js';

function renderScreen() {
  return `${chrome('home')}
<div class="body" data-s="06b-review-approve-modified">
  <div class="heading">
    <h1 class="t-title w-600 c-ink">Approve your final order.</h1>
    <p class="t-body w-500 c-500">Marco measured and pinned at your appointment. Review the final details and pricing before tailoring starts.</p>
  </div>
  <div class="garments-card">
    ${garmentCard({ variant: 'PostAppt', type: 'Suit Jacket', qty: 1, price: '$200', priceInfo: true, services: ['Hem / Adjust Length', { label: 'Sleeve / Adjust Length', added: true }], beforePhotos: 4, pinnedPhotos: 4 })}
    ${garmentCard({ variant: 'PostAppt', type: 'Suit Jacket', qty: 1, price: '$80', services: ['Sleeve / Adjust Length'], beforePhotos: 4, pinnedPhotos: 4 })}
    ${garmentCard({ variant: 'PostAppt', type: 'Suit Jacket', qty: 1, price: '$80', added: true, services: ['Sleeve / Adjust Length'], beforePhotos: 4, pinnedPhotos: 4 })}
    ${feeRow('$360', 'Subtotal', { line: true, info: true })}
    ${feeRow('-$20', '10% Deposit - Paid 7/7/26', { line: true, info: true })}
    ${feeRow('$340', 'Due at Pickup / Delivery', { info: true })}
  </div>
  <div class="cta-bar">
    ${cta('Approve Final Order', { attrs: 'data-act="approve"' })}
    ${cta('Request Changes', { variant: 'secondary', attrs: 'data-act="changes"' })}
    ${cta('View All Appointments', { variant: 'secondary', attrs: 'data-act="bookings"' })}
  </div>
</div>`;
}

function wire(root) {
  wirePhotoViewer(root);
  /* Phase R4 (Kevin): approving lands back on 04D with the order in
     'tailoring' (the home/bookings cards reflect it). */
  root.querySelector('[data-act="approve"]')?.addEventListener('click', () => { approveOrder(); go('04d-appointment-complete'); });
  root.querySelector('[data-act="changes"]')?.addEventListener('click', () => openRequestChanges());
  root.querySelector('[data-act="bookings"]')?.addEventListener('click', () => go('09-bookings'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('06b-review-approve-modified', renderScreen, wire);
