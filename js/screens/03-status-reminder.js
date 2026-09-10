/* ============================================================
   05 - Appointment Reminder — Figma 308:4108.
   SemiBold heading + Order Summary (SemiBold n500 serif title,
   fixed tailor card, garments card with photo pairs, prepare
   card) + Confirm / Message / Reschedule-Cancel actions (the cancel
   line moved into the R1 popup in Phase R2).
   UX-LOOP R1-U-02/08/18: renders the live appointment through the
   same summary as 03/Confirmed (rows "Sun, Jul 12 · 7:00 PM",
   deposit "-$20" — frame updated). Reached from 03/Confirmed's tailor
   card (R1-U-01).
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, summaryCard, cta, apptRows } from '../components.js';
import { openReschedulePopup } from './03.1-reschedule-popup.js';
import { openConfirmPopup } from './03.2-appointment-confirmed.js';
import { bookingSummary, currentAppt } from './03-status-confirmed.js';

/* Exported: R1 / RC1 / 05X draw this screen (dimmed) as their frame
   backdrop. */
export function viewReminder(s) {
  const a = currentAppt(s);
  const first = (a.name ?? 'Marco Tailor').split(' ')[0];
  return `${chrome('home')}
<div class="body" data-s="03-status-reminder">
  ${statusHero({ pill: 'confirmed', title: 'Please Confirm Tomorrow’s Appointment', titleWeight: 600 })}
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
  <div class="actions">
    ${cta('Confirm Appointment', { attrs: 'data-act="confirm"' })}
    ${cta(`Message ${first}`, { variant: 'secondary', attrs: 'data-act="message"' })}
    ${cta('Reschedule / Cancel', { variant: 'secondary', attrs: 'data-act="reschedule"' })}
  </div>
</div>`;
}

function wire(root) {
  /* Phase R4 (Kevin): Confirm Appointment opens the 05C popup; its
     Confirm runs completeAppointment() and lands on 04D. */
  root.querySelector('[data-act="confirm"]')?.addEventListener('click', () => openConfirmPopup());
  root.querySelector('[data-act="message"]')?.addEventListener('click', () => go('10-messages'));
  root.querySelector('[data-act="reschedule"]')?.addEventListener('click', () => openReschedulePopup());
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('03-status-reminder', viewReminder, wire);
