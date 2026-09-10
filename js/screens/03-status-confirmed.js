/* ============================================================
   04C - Appointment Confirmed — Figma 277:2844.
   Two-line SemiBold hero, Order Summary (tailor card + white
   garments card with ViewOnly cards + fee rows + prepare card),
   three-CTA bar with top hairline. Active=Bookings.
   UX-LOOP R1-U-02: the summary renders the LIVE appointment (the
   seed IS the frame's $200 fixture). R1-U-01 demo affordance: tapping
   the tailor summary card = "the day before arrives" → 03/Reminder.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, summaryCard, feeRow, cta, toast, orderCards, apptRows, receiptDates } from '../components.js';
import { money } from '../data.js';
import { state, isTerminal, isPostAppointment } from '../state.js';
import { openReschedulePopup, pointAtTerminal } from './03.1-reschedule-popup.js';

/** The pre-appointment order summary shared by 03/Confirmed and
    03/Reminder: ViewOnly cards, subtotal, -deposit, balance. */
export function bookingSummary(a) {
  const t = a?.totals ?? { subtotal: 200, deposit: 20 };
  const subtotal = t.subtotal ?? t.total ?? 200;
  const deposit = t.deposit ?? 20;
  return `${orderCards({ garments: a?.garments, totals: t }, { variant: 'ViewOnly' })}
      ${feeRow(money(subtotal), 'Subtotal - Confirmed at Appointment', { line: true })}
      ${feeRow(money(-deposit), `10% Deposit - Paid ${receiptDates(a).deposit}`, { line: true })}
      ${feeRow(money(subtotal - deposit), 'Balance')}`;
}

export const currentAppt = (s) => {
  const cur = s.currentAppt ?? { list: 'upcoming', index: 0 };
  return s[cur.list]?.[cur.index] ?? s.upcoming[0] ?? {};
};

function renderScreen(s) {
  const a = currentAppt(s);
  return `${chrome('bookings')}
<div class="body" data-s="03-status-confirmed">
  ${statusHero({ pill: 'confirmed', title: 'Appointment Confirmed', titleWeight: 600 })}
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
  <div class="cta-bar">
    ${cta('Add to Calendar', { attrs: 'data-act="calendar"' })}
    ${cta('Message Tailor', { variant: 'secondary', attrs: 'data-act="message"' })}
    ${cta('Reschedule / Cancel', { variant: 'secondary', attrs: 'data-act="reschedule"' })}
    ${cta('View All Appointments', { variant: 'secondary', attrs: 'data-act="bookings"' })}
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
  /* R4-U-01: the guard covers "not the status this view renders" — an
     appointment that already happened shows its 03/Tailoring (back
     after the visit must never offer Reschedule / Cancel on a measured
     order). Deep links keep the frame's fixture. */
  if (window.__tailyNavigated && isPostAppointment(cur)) {
    setTimeout(() => go('03-status-tailoring', { replace: true }), 0);
    return;
  }
  root.querySelector('[data-act="bookings"]')?.addEventListener('click', () => go('09-bookings'));
  root.querySelector('[data-act="reschedule"]')?.addEventListener('click', () => openReschedulePopup());
  /* UX-004: Message works like 04D's; Calendar acknowledges */
  root.querySelector('[data-act="message"]')?.addEventListener('click', () => go('10-messages'));
  root.querySelector('[data-act="calendar"]')?.addEventListener('click', () => toast('Added to your calendar'));
  /* DEMO (R1-U-01): the tailor card is "the day before arrives" → the
     reminder, the only road to 03.2 and the appointment happening.
     R4-U-01: it REPLACES this screen (one family, one history entry). */
  root.querySelector('.summary-card')?.addEventListener('click', () => go('03-status-reminder', { replace: true }));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (el.dataset.nav === 'home') go('01-home');
      if (el.dataset.nav === 'bookings') go('09-bookings');
    });
  });
}

register('03-status-confirmed', renderScreen, wire);
