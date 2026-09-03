/* ============================================================
   04D - Appointment Status — Figma 308:3578 (Phase R0: renamed from
   "Appointment Complete"; replaces the deleted 06 - Order Status).
   Phase R4: the serif hero gave way to a white status card (the
   Active Job Card, user side — 570:8929): JUL 17 date badge, name +
   "Need by" line, Tailoring pill, tailoring progress bar, and the
   measured-and-pinned note. Below it the garments card (PostAppt
   Before/Pinned cards + fee rows) and the plain three-CTA bar.
   Active=Bookings.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusPill, progressBar, garmentCard, feeRow, cta, toast } from '../components.js';
import { JOB_TYPES } from '../data.js';
import { apptEntry, canonicalStatus, markReady } from '../state.js';
import { wirePhotoViewer } from './pv3-photo-viewer.js';

/* Per-garment price: the appointment's totals.rows when the flow built
   them (bookingLines snapshot), else recomputed from JOB_TYPES — both
   agree at multiplier 1. Shared with 04e. */
export function rowPrice(g, rows, i) {
  if (rows?.[i]?.amount != null) return `$${rows[i].amount}`;
  const amt = Math.round(g.jobs.reduce((s, j) => s + (JOB_TYPES[j]?.price ?? 0), 0)) * g.qty;
  return `$${amt}`;
}

/* Dynamic: renders whatever appointment currentAppt points at (the
   seed data equals the frame fixture — the modified order — so the
   direct diff load still matches 308:3578 exactly). The pinned date
   and the deposit-paid date stay the frame's fiction — no such dates
   exist in state yet.
   Exported: PV3 draws this screen (dimmed) as its frame backdrop. */
export function view04d(s) {
  const cur = s.currentAppt ?? { list: 'upcoming', index: 0 };
  const a = s[cur.list]?.[cur.index] ?? s.upcoming[0] ?? {};
  const first = (a.name ?? 'Marco Tailor').split(' ')[0];
  /* Phase R5 (Kevin): the status card mirrors the ORDER's real status
     (see the Status Pill component). 'confirmed' only occurs on a
     direct harness load — it renders the frame's Tailoring fixture. */
  const canon = canonicalStatus(a.status ?? 'tailoring');
  const pillKey = {
    'awaiting-approval': 'awaiting-approval', tailoring: 'tailoring',
    'ready-for-pickup': 'ready', delivered: 'completed',
  }[canon] ?? 'tailoring';
  const stage = {
    'awaiting-approval': 'confirmed', tailoring: 'tailoring',
    'ready-for-pickup': 'ready', delivered: 'complete',
  }[canon] ?? 'tailoring';
  /* UX-007: the note follows the status; the tailoring line stays the
     frame's fixture. */
  const note = {
    'awaiting-approval': 'Measured and pinned at your appointment on Thu, Jul 12. Review and approve the final order to start tailoring.',
    tailoring: 'Measured and pinned at your appointment on Thu, Jul 12. We’ll tell you the moment they’re ready.',
    'ready-for-pickup': `Your items are ready. Tap the order below — or use your appointment card — to choose how you’d like them back.`,
    delivered: 'Delivered. Tap the order below to see your receipt.',
  }[canon] ?? 'Measured and pinned at your appointment on Thu, Jul 12. We’ll tell you the moment they’re ready.';
  const t = a.totals ?? { total: 360, deposit: 20 };
  const cards = (a.garments ?? []).map((g, i) => garmentCard({
    variant: 'PostAppt', type: g.type, qty: g.qty,
    price: rowPrice(g, t.rows, i), services: g.jobs,
    beforePhotos: 4, pinnedPhotos: 4,
  })).join('\n    ');

  return `${chrome('bookings')}
<div class="body" data-s="04d-appointment-complete">
  <div class="status-card">
    <div class="status-card__head">
      <div class="appt-card__date"><span class="appt-card__month">${a.month ?? 'JUL'}</span><span class="appt-card__day">${a.day ?? '12'}</span></div>
      <div class="status-card__who">
        <span class="status-card__name">${a.name ?? 'Marco Tailor'}</span>
        <span class="status-card__need">Need by: ${a.needBy ?? 'Fri, Jul 17'}</span>
      </div>
      ${statusPill(pillKey)}
    </div>
    ${progressBar(stage)}
    <p class="status-card__body">${note}</p>
  </div>
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
  root.querySelector('[data-act="calendar"]')?.addEventListener('click', () => toast('Added to your calendar'));   // UX-004
  // Tapping the order, by status (Phase R5, Kevin — 07 is reachable
  // ONLY once the tailor marks the order ready):
  //   awaiting-approval → the final-order review (06B)
  //   tailoring         → DEMO: simulates the tailor finishing
  //                       (markReady) and re-renders — the status card
  //                       and the 01/09 appointment cards flip to Ready
  //   ready-for-pickup  → 07 (also reached via the cards' Schedule
  //                       Pickup / Delivery)
  //   delivered         → the order summary (04E)
  root.querySelector('[data-act="review"]')?.addEventListener('click', () => {
    const s2 = canonicalStatus(apptEntry()?.status);
    if (s2 === 'awaiting-approval') go('06b-review-approve-modified');
    else if (s2 === 'tailoring') { markReady(); go('04d-appointment-complete', { replace: true }); }
    else if (s2 === 'ready-for-pickup') go('07-items-ready');
    else if (s2 === 'delivered') go('04e-order-summary');
  });
  wirePhotoViewer(root);
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (el.dataset.nav === 'home') go('01-home');
      if (el.dataset.nav === 'bookings') go('09-bookings');
    });
  });
}

register('04d-appointment-complete', view04d, wire);
