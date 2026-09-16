/* ============================================================
   04E - Order Summary — Figma 533:3946.
   Completed-appointment receipt: "Order Summary" hero with an Items
   Received row, ViewOnly garments card with the receipt rows (R7:
   Alterations / Visitation fee — paid / [Delivery] / Total / Paid at
   pickup|delivery), single secondary View All Appointments CTA.
   Active=Bookings. Opened from a completed appointment card.
   UX-LOOP R1-U-07: the receipt rows are 06's (fulfilment-aware —
   a pickup order shows no delivery fee); Items Received reads the
   delivered day. The harness's seed load (still pre-appointment)
   renders the frames' $360 delivery fixture via finalOrder().
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, summaryCard, tailorTrust, cta, orderCards, apptRows, receiptRows, visitBlock, headingRow } from '../components.js';
import { openTailorDetails } from './03.4-tailor-details.js';
import { fmtDay } from '../data.js';
import { finalOrder } from '../state.js';
import { wirePhotoViewer } from './03.3-photo-viewer.js';
import { currentAppt } from './03-status-confirmed.js';

/** Items Received: the delivered stamp, else the handoff day, else —
    live only (UX-LOOP R2-U-10, the seed past bookings) — the
    appointment's own day. The harness deep link keeps the frame's
    "July 17, 2026". */
function receivedOn(a) {
  /* the seed past bookings keep deliveredAt in the 09 card's grammar
     ("Sep 2, 2PM") — one day grammar here */
  if (a.deliveredAt) return fmtDay(a.deliveredAt, a.deliveredAt);
  if (!window.__tailyNavigated) return 'July 17, 2026';
  return fmtDay(a.fulfilment?.date ?? a.fulfilment?.window ?? a.when, 'July 17, 2026');
}

function renderScreen(s) {
  const a = currentAppt(s);
  const o = finalOrder(a);

  return `${chrome('bookings')}
<div class="body" data-s="03-status-summary">
  ${headingRow(statusHero({ pill: 'completed', title: 'Order Summary', rowLabel: 'Items Received:', rowValue: receivedOn(a) }))}
  ${summaryCard({ ...tailorTrust(a), initials: a.initials ?? 'MT', name: a.name ?? 'Marco Tailor' })}
  <div class="garments-card">
    ${visitBlock(apptRows(a))}
    ${orderCards(o, { variant: 'PostAppt' })}
    ${receiptRows(a, o.totals)}
  </div>
</div>`;
}

function wire(root) {
  wirePhotoViewer(root);
  root.querySelector('[data-act="bookings"]')?.addEventListener('click', () => go('09-bookings'));
  /* round 14 (Kevin): the tailor card opens the 03.4 profile popup (no-op while matching) */
  root.querySelector('.summary-card')?.addEventListener('click', () => openTailorDetails());
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (el.dataset.nav === 'home') go('01-home');
      if (el.dataset.nav === 'bookings') go('09-bookings');
    });
  });
}

register('03-status-summary', renderScreen, wire);
