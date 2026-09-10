/* ============================================================
   05 - Appointment Reminder — Figma 308:4108.
   SemiBold heading + Order Summary (SemiBold n500 serif title,
   fixed tailor card, garments card with photo pairs, prepare
   card) + Confirm / Message / Reschedule-Cancel actions (the cancel
   line moved into the R1 popup in Phase R2).
   UX-LOOP R1-U-02/08/18: renders the live appointment through the
   same summary as 03/Confirmed (rows "Sun, Jul 12 · 7:00 PM"; R7
   pricing rows). Reached from 03/Confirmed's tailor card (R1-U-01).
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, summaryCard, cta, apptRows } from '../components.js';
import { money } from '../data.js';
import { state, isTerminal, isPostAppointment, autoCancelUnconfirmed } from '../state.js';
import { openReschedulePopup, pointAtTerminal } from './03.1-reschedule-popup.js';
import { openConfirmPopup } from './03.2-appointment-confirmed.js';
import { bookingSummary, currentAppt, confirmedPill } from './03-status-confirmed.js';

/* UX-LOOP round 7 (Kevin): the 24-hour reminder IS the confirmation
   prompt. Under the summary, before Confirm: "Confirming makes your
   $25 visitation fee non-refundable. Cancel before confirming for a
   full refund." Confirming (03.2) runs confirmAppointment() — the
   pill then reads "Confirmed · fee non-refundable" and the line goes.
   Unconfirmed 12 hours before the visit → Taily auto-cancels with a
   full refund (autoCancelUnconfirmed). DEMO affordance (live only):
   tapping the hero title = "12 hours pass without confirming" →
   03/Cancelled's unconfirmed variant. Figma sync pending (the frame
   has no such line). */
export const nonRefundableLine = (a) => (a?.feeLocked ? '' : `<p class="t-small c-500 fee-warning" data-fee-warning>Confirming makes your ${money(a?.totals?.visitFeeCharged ?? a?.totals?.visitFee ?? 25)} visitation fee non-refundable. Cancel before confirming for a full refund.</p>`);

/* Exported: R1 / RC1 / 05X draw this screen (dimmed) as their frame
   backdrop. */
export function viewReminder(s) {
  const a = currentAppt(s);
  const first = (a.name ?? 'Marco Tailor').split(' ')[0];
  return `${chrome('home')}
<div class="body" data-s="03-status-reminder">
  ${statusHero({ ...confirmedPill(a), title: 'Please Confirm Tomorrow’s Appointment', titleWeight: 600 })}
  <div class="summary">
    ${summaryCard({ fixed: true, initials: a.initials ?? 'MT', name: a.name ?? 'Marco Tailor', rows: apptRows(a) })}
    <div class="garments-card">
      ${bookingSummary(a)}
    </div>
    <div class="prepare-card">
      <p class="t-body w-500 c-500">Please prepare:</p>
      <ul class="t-body c-700 prepare-list"><li>Your garments</li><li>The shoes you plan to wear with them</li></ul>
    </div>
  </div>
  ${nonRefundableLine(a)}
  <div class="actions">
    ${cta('Confirm Appointment', { attrs: 'data-act="confirm"' })}
    ${cta(`Message ${first}`, { variant: 'secondary', attrs: 'data-act="message"' })}
    ${cta('Reschedule / Cancel', { variant: 'secondary', attrs: 'data-act="reschedule"' })}
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
  /* R4-U-01: an appointment that already happened shows its
     03/Tailoring — never a stale reminder with Reschedule / Cancel */
  if (window.__tailyNavigated && isPostAppointment(cur)) {
    setTimeout(() => go('03-status-tailoring', { replace: true }), 0);
    return;
  }
  /* Phase R4 (Kevin): Confirm Appointment opens the 05C popup; its
     Confirm runs completeAppointment() and lands on 04D. */
  root.querySelector('[data-act="confirm"]')?.addEventListener('click', () => openConfirmPopup());
  root.querySelector('[data-act="message"]')?.addEventListener('click', () => go('10-messages'));
  root.querySelector('[data-act="reschedule"]')?.addEventListener('click', () => openReschedulePopup());
  /* DEMO (R7, live only): the hero title = "12 hours pass without
     confirming" → Taily cancels, the fee is refunded → 03/Cancelled */
  if (window.__tailyNavigated) {
    root.querySelector('.status-hero__title')?.addEventListener('click', () => {
      if (!autoCancelUnconfirmed(cur)) return;
      pointAtTerminal(cur);
      go('03-status-cancelled', { replace: true });
    });
  }
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('03-status-reminder', viewReminder, wire);
