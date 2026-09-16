/* ============================================================
   03 - Order Status / Tailoring — Figma 308:3578.
   Phase R8: the Active Job Card hero gave way to the family chassis —
   status pill + serif title ("Tailoring in Progress.") in a gap-4
   group, a 12-gapped sub line, the Tailor Summary Card (Appt /
   Need-by rows), then the garments card (PostAppt Before/Pinned
   cards + fee rows) and the plain three-CTA bar. The pill and sub
   mirror the ORDER's real status. Active=Bookings.
   UX-LOOP R1-U-04 (code-only): the hero title, the primary CTA and a
   "View final order ›" row follow the LIVE status — awaiting-approval
   → "Approve your final order." + Review Final Order; ready →
   Schedule Pickup / Delivery; scheduled → the window + Change;
   delivered → View Receipt. The harness's 'confirmed' load still
   renders the frame's Tailoring fixture unchanged (UX-007 precedent).
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, summaryCard, tailorTrust, cta, toast, orderCards, orderRows, feeTierNote, apptRows, visitBlock, headingRow } from '../components.js';
import { openTailorDetails } from './03.4-tailor-details.js';
import { fmtWhen, fmtDay } from '../data.js';
import { state, apptEntry, canonicalStatus, isTerminal, markReady, deliver, finalOrder, orderModified, statusScreen } from '../state.js';
import { wirePhotoViewer } from './03.3-photo-viewer.js';
import { pointAtTerminal } from './03.1-reschedule-popup.js';
import { currentAppt } from './03-status-confirmed.js';

/* Kept for older imports; the helper lives in data.js now. */
export { rowPrice } from '../data.js';

/** 04 Default when the tailor changed nothing, 04 Modified otherwise. */
export const reviewScreen = (a) => (orderModified(finalOrder(a)) ? '04-review-approve-modified' : '04-review-approve');

/* Dynamic: renders whatever appointment currentAppt points at. The
   order comes from finalOrder(): the appointment's own reviewed order
   once the appointment happened, else the frames' $360 fixture (the
   harness deep link with the seed still 'confirmed'). The pinned date
   stays the frame's fiction. Exported: PV3 draws this screen (dimmed)
   as its frame backdrop. */
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
  const method = a.fulfilment?.method === 'delivery' ? 'Delivery' : 'Pickup';
  const apptDay = fmtDay(a.when, 'Sun, Jul 12').replace(/^\w+, /, '');   // "Jul 12"
  /* UX-007: the sub follows the status. R2-U-02: the tailoring line
     names the appointment's own day ("All details confirmed on Sun,
     Jul 12." — the frame was synced to this grammar in round 3). */
  const frameNote = `All details confirmed on ${fmtDay(a.when, 'Sun, Jul 12')}. We will let you know as soon as your items are ready.`;
  const note = {
    'awaiting-approval': `Measured and pinned at your appointment on ${apptDay}. Review and approve the final order to start tailoring.`,
    tailoring: frameNote,
    /* Phase R6: once a window is scheduled, the handoff waits on the
       tailor's confirmation (the window label carries its date, R2-U-02) */
    'ready-for-pickup': a.fulfilment
      ? `${method} scheduled · ${a.fulfilment.window}. ${first} will confirm the handoff.`
      : 'Your items are ready. Tap the order below — or use your appointment card — to choose how you’d like them back.',
    delivered: 'Delivered. Tap the order below to see your receipt.',
  }[canon] ?? frameNote;
  /* R1-U-04: hero title + primary CTA per live status. R2-U-11: the
     tailoring state leads with Message Marco (the appointment already
     happened — nothing to add to a calendar); the frame's CTA bar was
     synced to it in round 3, so the harness load renders it too. */
  const hero = {
    'awaiting-approval': { title: 'Approve your final order.', label: 'Review Final Order', act: 'review-order' },
    tailoring: { title: 'Tailoring in Progress.', label: `Message ${first}`, act: 'message', noMessage: true },
    'ready-for-pickup': a.fulfilment
      ? { title: `${method} · ${a.fulfilment.window}`, label: 'Change Pickup / Delivery', act: 'schedule' }
      : { title: 'Your items are ready.', label: 'Schedule Pickup / Delivery', act: 'schedule' },
    delivered: { title: 'Delivered.', label: 'View Receipt', act: 'receipt' },
  }[canon] ?? { title: 'Tailoring in Progress.', label: `Message ${first}`, act: 'message', noMessage: true };
  const o = finalOrder(a);
  const t = o.totals;
  /* R7 pricing rows: Alterations / Visitation fee — paid / [Additional
     visitation fee — 5 items now, $50 tier] / [Delivery] / Total / Due
     at handoff (the fee was charged on acceptance; alterations + the
     rest at handoff). R7-U-02: a re-tiered fee is explained here and on
     04 (caption + fee-note); the note goes once the order is delivered
     (nothing left to charge at handoff). Figma sync pending (the frame
     draws Subtotal / -$20 Deposit / Due). */
  const rows = orderRows(t, { feeDesc: 'Visitation fee — paid', due: canon === 'delivered' ? 'Paid at handoff' : 'Due at handoff', tier: true })
    + (canon === 'delivered' ? '' : `\n    ${feeTierNote(t)}`);

  return `${chrome('bookings')}
<div class="body" data-s="03-status-tailoring">
  ${headingRow(statusHero({ pill: pillKey, title: hero.title, titleWeight: 600 }))}
  <p class="status-hero__body">${note}</p>
  ${summaryCard({ ...tailorTrust(a), initials: a.initials ?? 'MT', name: a.name ?? 'Marco Tailor' })}
  <div class="garments-card" data-act="review">
    ${visitBlock(apptRows(a))}
    ${orderCards(o, { variant: 'PostAppt' })}
    ${rows}
  </div>
  <div class="cta-bar cta-bar--plain">
    ${cta(hero.label, { attrs: `data-act="${hero.act}"` })}
    ${hero.noMessage ? '' : cta(`Message ${first}`, { variant: 'secondary', attrs: 'data-act="message"' })}
  </div>
</div>`;
}

function wire(root) {
  /* R3-U-05: a status screen reached (by back / forward) for an
     appointment that already ended shows its 03/Cancelled instead —
     03/Requested's guard, adopted family-wide. `replace` keeps the
     dead screen out of the stack. */
  const cur = currentAppt(state);
  if (window.__tailyNavigated && isTerminal(cur)) {
    setTimeout(() => { pointAtTerminal(cur); go('03-status-cancelled', { replace: true }); }, 0);
    return;
  }
  /* Round 10 (Kevin): while the final order awaits approval, 04 IS the
     screen — a status view reached here (back, a deep link, a resend)
     hands over to it. */
  if (window.__tailyNavigated && canonicalStatus(cur.status) === 'awaiting-approval') {
    setTimeout(() => go(statusScreen(cur), { replace: true }), 0);
    return;
  }
  root.querySelector('[data-act="bookings"]')?.addEventListener('click', () => go('09-bookings'));
  root.querySelector('[data-act="message"]')?.addEventListener('click', () => go('10-messages'));
  root.querySelector('[data-act="calendar"]')?.addEventListener('click', () => toast('Added to your calendar'));   // UX-004
  /* R1-U-04 primary CTAs / link row */
  root.querySelectorAll('[data-act="review-order"]').forEach((el) => el.addEventListener('click', (e) => {
    e.stopPropagation();
    go(reviewScreen(apptEntry()));
  }));
  root.querySelector('[data-act="schedule"]')?.addEventListener('click', () => go('05-items-ready'));
  root.querySelector('[data-act="receipt"]')?.addEventListener('click', () => go('03-status-summary'));
  // Tapping the order, by status (Phase R5, Kevin — 07 is reachable
  // ONLY once the tailor marks the order ready):
  //   awaiting-approval → the final-order review (06A / 06B)
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
    if (s2 === 'awaiting-approval') go(reviewScreen(cur2));
    else if (s2 === 'tailoring') { markReady(cur2); go('03-status-tailoring', { replace: true }); }
    else if (s2 === 'ready-for-pickup') {
      if (cur2?.fulfilment) { deliver(cur2); go('06-journey-complete'); }
      else go('05-items-ready');
    }
    else if (s2 === 'delivered') go('03-status-summary');
  });
  wirePhotoViewer(root);
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

register('03-status-tailoring', viewTailoring, wire);
