/* ============================================================
   08 - Journey Complete — Figma 283:1419.
   Phase R1: three garment-art tiles (the order's items), centred
   title + 16px sub, then the 04E-style order summary (order number
   over a garments card: 3 ViewOnly cards + -$20 / $20 Delivery /
   $360 Total rows), Leave a Review / Book Again. Gap 16, 20px
   inner top padding, centred column.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, garmentCard, feeRow, cta } from '../components.js';
import { reset } from '../state.js';
import { rowPrice } from './04d-appointment-complete.js';

function renderScreen(s) {
  const cur = s.currentAppt ?? { list: 'upcoming', index: 0 };
  const a = s[cur.list]?.[cur.index] ?? s.upcoming[0] ?? {};
  const t = a.totals ?? { total: 360, deposit: 20 };
  const cards = (a.garments ?? []).map((g, i) => garmentCard({
    variant: 'ViewOnly', type: g.type, qty: g.qty,
    price: rowPrice(g, t.rows, i), services: g.jobs, photos: g.photos ?? 0,
  })).join('\n      ');

  return `${chrome('home')}
<div class="body" data-s="08-journey-complete">
  <div class="done-tiles" aria-hidden="true">
    <span class="done-tile"><img src="assets/garments/done-suit-jacket.png" alt=""></span>
    <span class="done-tile"><img src="assets/garments/done-suit-jacket.png" alt=""></span>
    <span class="done-tile"><img src="assets/garments/done-suit-jacket.png" alt=""></span>
  </div>
  <h1 class="t-title c-ink center">All done!</h1>
  <p class="t-body w-500 c-500 center">Your garments are back with you, tailored to fit. Thank you for using Taily.</p>
  <div class="summary summary--tight">
    <p class="t-body w-500 c-500">#TLY-2026-4417</p>
    <div class="garments-card">
      ${cards}
      ${feeRow(`-$${t.deposit}`, '10% Deposit - Paid 7/7/26', { line: true })}
      ${feeRow('$20', 'Delivery - Paid 7/17/26', { line: true })}
      ${feeRow(`$${t.total - t.deposit + 20}`, 'Total - Paid 7/17/26')}
    </div>
  </div>
  <div class="actions">
    ${cta('Leave a Review', { attrs: 'data-act="review"' })}
    ${cta('Book Again', { variant: 'secondary', attrs: 'data-act="again"' })}
  </div>
</div>`;
}

function wire(root) {
  root.querySelector('[data-act="again"]')?.addEventListener('click', () => { reset(); go('01-home'); });
  root.querySelector('[data-act="review"]')?.addEventListener('click', () => go('09-bookings'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('08-journey-complete', renderScreen, wire);
