/* ============================================================
   04E - Order Summary — Figma 533:3946.
   Completed-appointment receipt: "Order Summary" hero with an Items
   Received row, ViewOnly garments card with deposit + balance-paid
   fee rows, single secondary View All Appointments CTA.
   Active=Bookings. Opened from a completed appointment card.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, garmentCard, feeRow, cta } from '../components.js';
import { rowPrice } from './04d-appointment-complete.js';

/* Dynamic like 04d: renders whatever appointment currentAppt points
   at; the Marco seed equals the frame fixture. The received / paid
   dates stay the frame's fiction — no such dates exist in state. */
function renderScreen(s) {
  const cur = s.currentAppt ?? { list: 'upcoming', index: 0 };
  const a = s[cur.list]?.[cur.index] ?? s.upcoming[0] ?? {};
  const t = a.totals ?? { total: 200, deposit: 20 };
  const cards = (a.garments ?? []).map((g, i) => garmentCard({
    variant: 'ViewOnly', type: g.type, qty: g.qty,
    price: rowPrice(g, t.rows, i), services: g.jobs, photos: g.photos ?? 0,
  })).join('\n    ');

  return `${chrome('bookings')}
<div class="body" data-s="04e-order-summary">
  ${statusHero({ pill: false, title: 'Order Summary', rowLabel: 'Items Received:', rowValue: 'July 15, 2026' })}
  <div class="garments-card">
    ${cards}
    ${feeRow(`$${t.deposit}`, '10% Deposit - Paid 7/7/26')}
    ${feeRow(`$${t.total - t.deposit}`, 'Paid 7/12/26')}
  </div>
  <div class="cta-bar cta-bar--plain">
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

register('04e-order-summary', renderScreen, wire);
