/* ============================================================
   R1 - Reschedule Popup — Figma 558:1867.
   05 dimmed under an ink@45% scrim + centred modal (y248): serif-24
   title, three glyph rows (✕ error / ↻ accent / ✓ success),
   Reschedule / Cancel + Go Back CTAs. Opened from 04C's / 05's
   Reschedule / Cancel, the 01/09 card Reschedule, and 03's cancel
   line (mode 'cancel' — cancel-worded per UX-003).
   UX-003: the rows quote the ACTUAL appointment (when / tailor /
   fee). The frame still draws the "Thursday's 7:00 PM" fixture —
   text-parity ALLOWs it.
   UX-LOOP R1-U-03: cancel mode (a request no tailor has confirmed)
   says the card hold is released — nothing was charged; confirming
   withdraws it (cancelAppointment) and lands on 03/Cancelled.
   UX-LOOP round 6 (Kevin): "rescheduling" = cancel + resubmit the same
   job for a new tailor. Reschedule mode's confirm runs
   rescheduleAppointment(): the visit is cancelled, the items,
   requested time, need-by and visit type are copied into the booking
   form, and the popup lands on 02 (replace) with the "Appointment
   cancelled — send the same job…" toast. The customer never chooses
   the tailor. The registered route (harness deep link) keeps the
   frame's rows.
   UX-LOOP round 7 (Kevin's money model v2): the 12-hour rule is gone.
   The Concierge fee is refunded in full until the customer confirms
   the visit on the 24-hour prompt (`a.feeLocked`) — the ✓ / ✕ row
   says which: "✓ Your $25 Concierge fee is refunded" / "✕ Your $25
   Concierge fee is non-refundable (you confirmed the visit)". Figma
   sync pending (the frame's row still says deposit).
   ============================================================ */

import { register, render as go } from '../app.js';
import { cta, modalOverlay, toast } from '../components.js';
import { money, fmtWhen, tailorFirst } from '../data.js';
import { state, apptEntry, cancelAppointment, rescheduleAppointment, copyItemsOver } from '../state.js';
import { viewReminder } from './03-status-reminder.js';

const live = () => !!window.__tailyNavigated;
const row = (glyph, tone, text) => `<div class="modal__row"><span class="modal__glyph ${tone}">${glyph}</span><span>${text}</span></div>`;

/** The fee row of the reschedule popup (R7): refunded until the visit
    is confirmed, non-refundable after. */
export const feeRowFor = (a) => {
  const fee = money(a?.totals?.visitFeeCharged ?? a?.totals?.visitFee ?? 25);
  return a?.feeLocked
    ? row('✕', 'c-error', `Your ${fee} Concierge fee is non-refundable (you confirmed the visit)`)
    : row('✓', 'c-success', `Your ${fee} Concierge fee is refunded`);
};

function modalHtml(mode = 'reschedule') {
  const a = apptEntry() ?? {};
  const first = tailorFirst(a, 'your tailor');
  const when = fmtWhen(a.when, 'Sunday Jul 12, 7PM');
  const cancelMode = mode === 'cancel';
  let rows;
  if (cancelMode) {
    /* withdrawing a request no tailor has accepted (unchanged) */
    rows = [
      row('✕', 'c-error', `Your ${when} request is withdrawn`),
      row('↻', 'c-accent-ink', 'A new order starts with your items copied over'),
      row('✓', 'c-success', 'Nothing was charged — the hold on your card is released'),
    ];
  } else if (live()) {
    /* R7: the fee row follows feeLocked, then the reschedule promise */
    rows = [
      row('✕', 'c-error', `Your ${when} with ${first} is cancelled`),
      feeRowFor(a),
      row('↻', 'c-accent-ink', 'Your items and time are kept — we’ll find you a new tailor'),
    ];
  } else {
    /* the frame's fixture rows (harness deep link) */
    rows = [
      row('✕', 'c-error', `Your ${when} with ${first} is cancelled`),
      row('↻', 'c-accent-ink', 'A new order starts with your items copied over'),
      feeRowFor(a),
    ];
  }
  return `<div class="modal">
  <h2 class="modal__title">${cancelMode ? 'Before you cancel' : 'Before you reschedule'}</h2>
  ${rows.join('\n  ')}
  <div class="modal__actions">
    ${cta(cancelMode ? 'Cancel Request' : 'Reschedule / Cancel', { attrs: 'data-act="confirm-reschedule"' })}
    ${cta('Go Back', { variant: 'secondary', attrs: 'data-act="go-back"' })}
  </div>
</div>`;
}

/* R1-U-09: the cancelled order's garments become the next booking's
   starting point (02 cards + 01 tile badges). The rule lives in
   state.js since round 6 (rescheduleAppointment uses it); re-exported
   for 03/Cancelled's re-request CTAs (R2-U-04/05/07). */
export { copyItemsOver };

/** After a terminal transition the entry sits in state.past (R2-U-07);
    point currentAppt at it so 03/Cancelled and chat read that entry. */
export function pointAtTerminal(a) {
  const i = state.past.indexOf(a);
  if (i >= 0) state.currentAppt = { list: 'past', index: i };
}

export const RESCHEDULE_TOAST = 'Appointment cancelled — send the same job to find a new tailor';

function wireModal(root, close, mode = 'reschedule') {
  root.querySelector('[data-act="confirm-reschedule"]')?.addEventListener('click', () => {
    const a = apptEntry();
    const cancelMode = mode === 'cancel';
    /* R6: reschedule = cancel + resubmit (items, time, need-by and visit
       type restored on the form); cancel mode only withdraws */
    const res = cancelMode ? cancelAppointment(a) : rescheduleAppointment(a);   // stashes state.lastCancelled for 05X
    /* R4-U-01: the substrate refuses once the appointment happened —
       the measured order is Marco's to change, not this popup's */
    if (!res && a) {
      toast(`This order can’t be cancelled here — message ${tailorFirst(a, 'your tailor')}`);
      close();
      return;
    }
    if (res && a && cancelMode) { copyItemsOver(a); }
    if (res && a) pointAtTerminal(a);
    /* R2-U-01: close the overlay BEFORE navigating — otherwise the page
       stays scroll-locked and the next back gesture is swallowed.
       R3-U-05: the next screen REPLACES the status screen it was
       opened from, so back lands on 01 / 09, never on a "Confirmed"
       ghost with a live Reschedule / Cancel. */
    close();
    if (cancelMode) { go('03-status-cancelled', { replace: true }); return; }
    go('02-appointment-details', { replace: true });
    toast(RESCHEDULE_TOAST);
  });
  root.querySelector('[data-act="go-back"]')?.addEventListener('click', () => close());
}

/** Open the popup over the live screen. mode 'cancel' (03's cancel
    line) swaps in cancel wording. */
export function openReschedulePopup(mode = 'reschedule') {
  modalOverlay(modalHtml(mode), { dataS: '03.1-reschedule-popup' }, (root, close) => wireModal(root, close, mode));
}

/* Route registration keeps the frame-verbatim render for the diff
   harness: 05 as backdrop, scrim, modal (seed data = the fixture). */
function renderScreen(s) {
  return `<div class="screen-sheet" data-s="03.1-reschedule-popup">
  <div class="sheet-backdrop" aria-hidden="true">${viewReminder(s)}</div>
  <div class="modal-scrim"></div>
  ${modalHtml()}
</div>`;
}

function wire(root) {
  wireModal(root, () => go('03-status-reminder'));
}

register('03.1-reschedule-popup', renderScreen, wire);
