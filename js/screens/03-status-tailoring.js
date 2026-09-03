/* ============================================================
   03 - Order Status / Tailoring — Figma 308:3578.
   Phase R8: the Active Job Card hero gave way to the family chassis —
   status pill + serif title ("Tailoring in Progress.") in a gap-4
   group, a 12-gapped sub line, the Tailor Summary Card (Appt /
   Need-by rows), then the garments card (PostAppt Before/Pinned
   cards + fee rows) and the plain three-CTA bar. The pill and sub
   mirror the ORDER's real status. Active=Bookings.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, summaryCard, garmentCard, feeRow, cta, toast } from '../components.js';
import { JOB_TYPES } from '../data.js';
import { apptEntry, canonicalStatus, markReady, deliver } from '../state.js';
import { wirePhotoViewer } from './03.3-photo-viewer.js';

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
export function viewTailoring(s) {
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
  /* UX-007: the sub follows the status; the tailoring line stays the
     frame's fixture. */
  const note = {
    'awaiting-approval': 'Measured and pinned at your appointment on July 12. Review and approve the final order to start tailoring.',
    tailoring: 'All details confirmed on July 12. We will let you know as soon as your items are ready.',
    /* Phase R6: once a window is scheduled, the handoff waits on the
       tailor's confirmation */
    'ready-for-pickup': a.fulfilment
      ? `${a.fulfilment.method === 'delivery' ? 'Delivery' : 'Pickup'} scheduled · ${a.fulfilment.window}. ${first} will confirm the handoff.`
      : 'Your items are ready. Tap the order below — or use your appointment card — to choose how you’d like them back.',
    delivered: 'Delivered. Tap the order below to see your receipt.',
  }[canon] ?? 'All details confirmed on July 12. We will let you know as soon as your items are ready.';
  const t = a.totals ?? { total: 360, deposit: 20 };
  const cards = (a.garments ?? []).map((g, i) => garmentCard({
    variant: 'PostAppt', type: g.type, qty: g.qty,
    price: rowPrice(g, t.rows, i), services: g.jobs,
    beforePhotos: 4, pinnedPhotos: 4,
  })).join('\n    ');

  return `${chrome('bookings')}
<div class="body" data-s="03-status-tailoring">
  ${statusHero({ pill: pillKey, title: 'Tailoring in Progress.', titleWeight: 600 })}
  <p class="status-hero__body">${note}</p>
  ${summaryCard({ fixed: true, initials: a.initials ?? 'MT', name: a.name ?? 'Marco Tailor', rows: [`▤&nbsp;&nbsp;Appt: ${a.when ?? 'Sun, Jul 12 · 7:00PM'}`, `▤&nbsp;&nbsp;Need by: ${a.needBy ?? 'Fri, Jul 17'}`] })}
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
  root.querySelector('[data-act="message"]')?.addEventListener('click', () => go('10-messages'));
  root.querySelector('[data-act="calendar"]')?.addEventListener('click', () => toast('Added to your calendar'));   // UX-004
  // Tapping the order, by status (Phase R5, Kevin — 07 is reachable
  // ONLY once the tailor marks the order ready):
  //   awaiting-approval → the final-order review (06B)
  //   tailoring         → DEMO: simulates the tailor finishing
  //                       (markReady) and re-renders — the status card
  //                       and the 01/09 appointment cards flip to Ready
  //   ready, unscheduled → 07 (choose pickup/delivery)
  //   ready, scheduled   → DEMO: the TAILOR confirms the handoff
  //                        (deliver) — 08 opens (Phase R6, Kevin: 08
  //                        only after the tailor confirms)
  //   delivered          → the order summary (04E)
  root.querySelector('[data-act="review"]')?.addEventListener('click', () => {
    const cur2 = apptEntry();
    const s2 = canonicalStatus(cur2?.status);
    if (s2 === 'awaiting-approval') go('04-review-approve-modified');
    else if (s2 === 'tailoring') { markReady(); go('03-status-tailoring', { replace: true }); }
    else if (s2 === 'ready-for-pickup') {
      if (cur2?.fulfilment) { deliver(); go('06-journey-complete'); }
      else go('05-items-ready');
    }
    else if (s2 === 'delivered') go('03-status-summary');
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

register('03-status-tailoring', viewTailoring, wire);
