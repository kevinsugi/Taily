/* ============================================================
   03 - Order Status / Delivery Scheduled — Figma 775:5513 (round 16,
   Kevin). The status screen for a ready order whose delivery is
   scheduled (Bookings / Home card → here, outside the 05 flow): Ready
   pill + "Delivery Scheduled" hero, "We will text you when your courier
   is on the way.", then the garments card opening with a "Delivery
   Details" block (address, the window), the PostAppt cards and the rows
   (Alterations / Concierge fee - Paid / Total / Due at delivery). No CTA.
   The route render keeps the frame: the $280 two-card order, Thu, Jul 23
   · 5:00 PM to 88 Leonard Street, 10013.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, orderCards, orderRows, visitBlock, receiptDates, headingRow } from '../components.js';
import { state, finalOrder } from '../state.js';
import { FINAL_ORDER_REMOVED } from '../fixtures.js';
import { currentAppt } from './03-status-confirmed.js';
import { wirePhotoViewer } from './03.3-photo-viewer.js';

const live = () => !!window.__tailyNavigated;
const FRAME = { window: 'Thu, Jul 23 · 5:00 PM', address: '88 Leonard Street, 10013' };

export function viewDeliveryScheduled(s) {
  const a = currentAppt(s) ?? {};
  const f = live() && a.fulfilment?.window ? a.fulfilment : FRAME;
  const o = live() && a.fulfilment?.window ? finalOrder(a) : FINAL_ORDER_REMOVED();
  const rows = [
    `◉&nbsp;&nbsp;${f.address ?? a.place ?? FRAME.address} `,
    `▤&nbsp;&nbsp;${f.window}`,
  ];
  return `${chrome('home')}
<div class="body" data-s="03-status-delivery-scheduled">
  ${headingRow(statusHero({ pill: 'ready', variant: 'ready', title: 'Delivery Scheduled' }))}
  <p class="status-hero__body">We will text you when your courier is on the way.</p>
  <div class="garments-card">
      ${visitBlock(rows, { title: 'Delivery Details' })}
      ${orderCards(o, { variant: 'PostAppt' })}
      ${orderRows(o.totals, { feeDesc: `Paid ${receiptDates(a).fee}`, due: 'Due at delivery' })}
  </div>
</div>`;
}

function wire(root) {
  wirePhotoViewer(root);
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('03-status-delivery-scheduled', viewDeliveryScheduled, wire);
