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
import { chrome, statusHero, summaryCard, tailorTrust, trustCard, cta, toast, orderCards, apptRows, receiptDates, orderRows } from '../components.js';
import { tailorProfile } from '../data.js';
import { openTailorDetails } from './03.4-tailor-details.js';
import { state, isTerminal, isPostAppointment, statusScreen } from '../state.js';
import { openReschedulePopup, pointAtTerminal } from './03.1-reschedule-popup.js';
import { wireBookingPhotos } from './03.3-photo-viewer.js';

/* R7 (Kevin's money model v2): the summary prices the BOOKED order —
   "Alterations (est.)" / "Visitation fee — charged 7/7/26" (the fee
   was charged when the tailor accepted) / "Total" — and says the
   alterations are paid at handoff. No deposit row. Figma sync pending
   (the 03/Confirmed and 03/Reminder frames still draw Subtotal /
   -$20 Deposit / Balance). */
export const ALTERATIONS_NOTE = 'Alterations are paid at pickup or delivery.';

/** The pre-appointment order summary shared by 03/Confirmed and
    03/Reminder: ViewOnly cards + the R7 pricing rows + the note. */
export function bookingSummary(a) {
  const t = a?.totals ?? { alterations: 200, visitFee: 25, visitFeeCharged: 25, total: 225 };
  return `${orderCards({ garments: a?.garments, totals: t }, { variant: 'ViewOnly' })}
      ${orderRows(t, { est: true, feeDesc: `Visitation fee — charged ${receiptDates(a).fee}` })}
      <p class="t-small c-500 fee-note">${ALTERATIONS_NOTE}</p>`;
}

/** The hero pill once the customer confirmed the visit on the 24-hour
    prompt (R7): the fee is locked. */
export const confirmedPill = (a) => (a?.feeLocked ? { pill: 'confirmed', pillLabel: 'Confirmed · fee non-refundable' } : { pill: 'confirmed' });

export const currentAppt = (s) => {
  const cur = s.currentAppt ?? { list: 'upcoming', index: 0 };
  return s[cur.list]?.[cur.index] ?? s.upcoming[0] ?? {};
};

/** Exported (round 8): `03-status-confirmed-locked` renders it with the
    fee-locked seed (frame "03 - Order Status / Confirmed Locked"). */
/* Round 14 (Kevin): 03/Confirmed is the "Meet Marco" layout (694:3361) —
   the profile card (photo, ✓ Taily-verified, badges, bio) above a garments
   card that opens with a "Visit Details" block (address / time / need-by).
   `layout: 'card'` keeps the summary-card layout the Confirmed Locked frame
   (644:6051) still draws — raised as an inconsistency. */
export function viewConfirmed(s, { layout = 'profile' } = {}) {
  const a = currentAppt(s);
  const profile = layout === 'profile' ? (tailorProfile(a) ?? tailorProfile()) : null;
  return `${chrome('bookings')}
<div class="body" data-s="03-status-confirmed">
  ${statusHero({ ...confirmedPill(a), title: 'Appointment Confirmed', titleWeight: 600 })}
  <div class="summary">
    ${profile ? trustCard(profile) : summaryCard({ fixed: true, ...tailorTrust(a), initials: a.initials ?? 'MT', name: a.name ?? 'Marco Tailor', rows: apptRows(a) })}
    <div class="garments-card">
      ${profile ? `<div class="visit-block"><span class="visit-block__title">Visit Details</span>${apptRows(a).map((r) => `<span class="summary-card__row">${r}</span>`).join('')}</div>` : ''}
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
  </div>
</div>`;
}

export function wire(root) {
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
    setTimeout(() => go(statusScreen(cur), { replace: true }), 0);   // round 10: 04 while awaiting approval
    return;
  }
  root.querySelector('[data-act="bookings"]')?.addEventListener('click', () => go('09-bookings'));
  /* Round 9 (Kevin): the booking cards' photo tiles open the 03.3 viewer
     (booking mode) — same popup as the post-appointment Before/Pinned rows */
  wireBookingPhotos(root);
  root.querySelector('[data-act="reschedule"]')?.addEventListener('click', () => openReschedulePopup());
  /* UX-004: Message works like 04D's; Calendar acknowledges */
  root.querySelector('[data-act="message"]')?.addEventListener('click', () => go('10-messages'));
  root.querySelector('[data-act="calendar"]')?.addEventListener('click', () => toast('Added to your calendar'));
  /* DEMO (R1-U-01): "the day before arrives" → the reminder, the only road
     to 03.2 and the appointment happening. R4-U-01: it REPLACES this screen.
     Round 14: the tailor card now opens 03.4, so the demo moved to the hero title. */
  root.querySelector('.status-hero__title')?.addEventListener('click', () => go('03-status-reminder', { replace: true }));
  root.querySelectorAll('.trust-card, .summary-card').forEach((c) => c.addEventListener('click', () => openTailorDetails(cur)));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (el.dataset.nav === 'home') go('01-home');
      if (el.dataset.nav === 'bookings') go('09-bookings');
    });
  });
}

register('03-status-confirmed', viewConfirmed, wire);
