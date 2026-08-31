/* ============================================================
   04D - Appointment Complete — Figma 308:3578.
   Tailoring hero (title + Est. Delivery row, no pill), Order
   Summary (n500 serif title, tight gap, garments card), plain
   three-CTA bar. Active=Bookings.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, garmentCard, feeRow, cta } from '../components.js';
import { JOB_TYPES } from '../data.js';

/* Per-garment price: the appointment's totals.rows when the flow built
   them (bookingLines snapshot), else recomputed from JOB_TYPES — both
   agree at multiplier 1. */
function rowPrice(g, rows, i) {
  if (rows?.[i]?.amount != null) return `$${rows[i].amount}`;
  const amt = Math.round(g.jobs.reduce((s, j) => s + (JOB_TYPES[j]?.price ?? 0), 0)) * g.qty;
  return `$${amt}`;
}

/* Dynamic: renders whatever appointment currentAppt points at (the
   seed data equals the frame fixture, so the direct diff load still
   matches 308:3578 exactly). Est. Delivery and the deposit-paid date
   stay the frame's fiction — no such dates exist in state yet. */
function renderScreen(s) {
  const cur = s.currentAppt ?? { list: 'upcoming', index: 0 };
  const a = s[cur.list]?.[cur.index] ?? s.upcoming[0] ?? {};
  const first = (a.name ?? 'Marco Tailor').split(' ')[0];
  const t = a.totals ?? { total: 200, deposit: 20 };
  const cards = (a.garments ?? []).map((g, i) => garmentCard({
    variant: 'ViewOnly', type: g.type, qty: g.qty,
    price: rowPrice(g, t.rows, i), services: g.jobs, photos: g.photos ?? 0,
  })).join('\n      ');

  return `${chrome('bookings')}
<div class="body" data-s="04d-appointment-complete">
  ${statusHero({ pill: false, title: `${first} is tailoring your items.`, rowLabel: 'Est. Delivery Date:', rowValue: 'July 15, 2026' })}
  <div class="summary summary--tight">
    <h2 class="t-title c-500 summary__title">Order Summary</h2>
    <div class="garments-card">
      ${cards}
      ${feeRow(`$${t.deposit}`, '10% Deposit - Paid 7/7/26')}
      ${feeRow(`$${t.total - t.deposit}`, 'Est. Balance - Confirmed at Appointment')}
    </div>
  </div>
  <div class="cta-bar cta-bar--plain">
    ${cta('Add to Calendar', { attrs: 'data-act="calendar"' })}
    ${cta(`Message ${first}`, { variant: 'secondary', attrs: 'data-act="message"' })}
    ${cta('View All Appointments', { variant: 'secondary', attrs: 'data-act="bookings"' })}
  </div>
</div>`;
}

function wire(root) {
  root.querySelector('[data-act="bookings"]')?.addEventListener('click', () => go('09-bookings'));
  root.querySelector('[data-act="message"]')?.addEventListener('click', () => go('m1-message-tailor'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (el.dataset.nav === 'home') go('01-home');
      if (el.dataset.nav === 'bookings') go('09-bookings');
    });
  });
}

register('04d-appointment-complete', renderScreen, wire);
