/* ============================================================
   04D - Appointment Status — Figma 308:3578 (Phase R0: renamed from
   "Appointment Complete"; replaces the deleted 06 - Order Status).
   Tailoring hero (title + 3-line sub, no pill/row), garments card
   straight under it (no serif title) with PostAppt cards — Before/
   Pinned photo rows, per 06A — + deposit/confirmed fee rows, plain
   three-CTA bar. Active=Bookings.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, garmentCard, feeRow, cta } from '../components.js';
import { JOB_TYPES } from '../data.js';

/* Per-garment price: the appointment's totals.rows when the flow built
   them (bookingLines snapshot), else recomputed from JOB_TYPES — both
   agree at multiplier 1. Shared with 04e. */
export function rowPrice(g, rows, i) {
  if (rows?.[i]?.amount != null) return `$${rows[i].amount}`;
  const amt = Math.round(g.jobs.reduce((s, j) => s + (JOB_TYPES[j]?.price ?? 0), 0)) * g.qty;
  return `$${amt}`;
}

/* Dynamic: renders whatever appointment currentAppt points at (the
   seed data equals the frame fixture — the R0 modified order — so the
   direct diff load still matches 308:3578 exactly). The pinned date
   and the deposit-paid date stay the frame's fiction — no such dates
   exist in state yet. */
function renderScreen(s) {
  const cur = s.currentAppt ?? { list: 'upcoming', index: 0 };
  const a = s[cur.list]?.[cur.index] ?? s.upcoming[0] ?? {};
  const first = (a.name ?? 'Marco Tailor').split(' ')[0];
  const t = a.totals ?? { total: 360, deposit: 20 };
  const cards = (a.garments ?? []).map((g, i) => garmentCard({
    variant: 'PostAppt', type: g.type, qty: g.qty,
    price: rowPrice(g, t.rows, i), services: g.jobs,
    beforePhotos: 4, pinnedPhotos: 4,
  })).join('\n    ');

  return `${chrome('bookings')}
<div class="body" data-s="04d-appointment-complete">
  ${statusHero({ pill: false, title: `${first} is tailoring your items.`, body: `Measured and pinned at your appointment on Thu, Jul 12. We’ll tell you the moment they’re ready.` })}
  <div class="garments-card" data-act="review">
    ${cards}
    ${feeRow(`$${t.total}`, 'Subtotal - Confirmed 7/12/26', { line: true })}
    ${feeRow(`-$${t.deposit}`, '10% Deposit - Paid 7/7/26', { line: true })}
    ${feeRow(`$${t.total - t.deposit}`, 'Due at Pickup / Delivery')}
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
  // demo affordance (ported from the deleted 06's timeline): tapping
  // the order opens the final-order review — the modified variant,
  // since the seed order carries the R0 modification (06B fixture)
  root.querySelector('[data-act="review"]')?.addEventListener('click', () => go('06b-review-approve-modified'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (el.dataset.nav === 'home') go('01-home');
      if (el.dataset.nav === 'bookings') go('09-bookings');
    });
  });
}

register('04d-appointment-complete', renderScreen, wire);
