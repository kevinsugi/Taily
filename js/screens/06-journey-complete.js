/* ============================================================
   08 - Journey Complete — Figma 283:1419.
   Phase R1: three garment-art tiles (the order's items), centred
   title + 16px sub, then the 04E-style order summary (order number
   over a garments card: 3 ViewOnly cards + -$20 / $20 Delivery /
   $360 Total rows), Leave a Review / Book Again. Gap 16, 20px
   inner top padding, centred column.
   UX-LOOP R1-U-07/13/14: receipt rows shared with 03/Summary
   (fulfilment-aware); Book Again clears the garments / selection only
   (the delivered order stays in Bookings); a second review toasts.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, cta, toast, orderCards, receiptRows } from '../components.js';
import { state, clearGarments, finalOrder } from '../state.js';
import { wirePhotoViewer } from './03.3-photo-viewer.js';
import { openLeaveReview, tailorName } from './06.1-leave-review.js';
import { currentAppt } from './03-status-confirmed.js';

/* Exported: 08C draws this screen (dimmed) as its frame backdrop. */
export function viewComplete(s) {
  const a = currentAppt(s);
  const o = finalOrder(a);

  return `${chrome('home')}
<div class="body" data-s="06-journey-complete">
  <div class="done-tiles" aria-hidden="true">
    <span class="done-tile"><img src="assets/garments/done-suit-jacket.png" alt=""></span>
    <span class="done-tile"><img src="assets/garments/done-suit-jacket.png" alt=""></span>
    <span class="done-tile"><img src="assets/garments/done-suit-jacket.png" alt=""></span>
  </div>
  <h1 class="t-title c-ink center">All done!</h1>
  <p class="t-body w-500 c-500 center">Your garments are back with you, tailored to fit. Thank you for using Taily.</p>
  <div class="garments-card">
      ${orderCards(o, { variant: 'PostAppt' })}
      ${receiptRows(a, o.totals)}
  </div>
  <div class="actions">
    ${cta('Leave a Review', { attrs: 'data-act="review"' })}
    ${cta('Book Again', { variant: 'secondary', attrs: 'data-act="again"' })}
  </div>
</div>`;
}

function wire(root) {
  wirePhotoViewer(root);
  /* R1-U-13: a fresh booking starts empty — the completed order is
     kept (Past Bookings on 09) */
  root.querySelector('[data-act="again"]')?.addEventListener('click', () => {
    clearGarments();
    state.ui ??= {};
    state.ui.homeSelection = {};
    go('01-home');
  });
  /* Phase R6 (Kevin): Leave a Review opens the 08C review sheet; once
     sent, a second tap acknowledges instead (R1-U-14) */
  root.querySelector('[data-act="review"]')?.addEventListener('click', () => {
    const a = currentAppt(state);
    if (a.review) { toast(`You already reviewed ${tailorName(a).split(' ')[0]}`); return; }
    openLeaveReview();
  });
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('06-journey-complete', viewComplete, wire);
