/* ============================================================
   06A - Review & Approve Final Order — Figma 308:3171.
   SemiBold heading + 3-line sub, garments card with PostAppt
   cards (Before/Pinned photo rows) + fee rows, three-CTA bar.
   Gap 16.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, garmentCard, feeRow, cta } from '../components.js';
import { approveOrder } from '../state.js';
import { openRequestChanges } from './04.1-request-changes.js';
import { wirePhotoViewer } from './03.3-photo-viewer.js';

function renderScreen() {
  return `${chrome('home')}
<div class="body" data-s="04-review-approve">
  <div class="heading">
    <h1 class="t-title w-600 c-ink">Approve your final order.</h1>
    <p class="t-body w-500 c-500">Marco measured and pinned at your appointment. Review the final details and pricing before tailoring starts.</p>
  </div>
  <div class="garments-card">
    ${garmentCard({ variant: 'PostAppt', type: 'Suit Jacket', qty: 1, price: '$120', services: ['Hem / Adjust Length'], beforePhotos: 4, pinnedPhotos: 4 })}
    ${garmentCard({ variant: 'PostAppt', type: 'Suit Jacket', qty: 1, price: '$80', services: ['Sleeve / Adjust Length'], beforePhotos: 4, pinnedPhotos: 4 })}
    ${feeRow('$200', 'Subtotal', { line: true })}
    ${feeRow('-$20', '10% Deposit - Paid 7/7/26', { line: true })}
    ${feeRow('$180', 'Due at Pickup / Delivery')}
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
  root.querySelector('[data-act="approve"]')?.addEventListener('click', () => { approveOrder(); go('03-status-tailoring'); });
  root.querySelector('[data-act="changes"]')?.addEventListener('click', () => openRequestChanges());
  root.querySelector('[data-act="bookings"]')?.addEventListener('click', () => go('09-bookings'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('04-review-approve', renderScreen, wire);
