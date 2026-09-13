/* ============================================================
   05C - Appointment Confirmed — Figma 570:8329.
   05 dimmed under an ink@45% scrim + centred modal (y248):
   success-green serif-24 title, ✓/! glyph rows (the ! row carries a
   real bulleted prepare list), single Confirm CTA. Opened from 05's
   Confirm Appointment; confirming runs completeAppointment() (the
   appointment "happens") and lands on 04D.
   ============================================================ */

import { register, render as go } from '../app.js';
import { cta, modalOverlay } from '../components.js';
import { apptEntry, confirmAppointment, completeAppointment, draftFinalOrder, statusScreen } from '../state.js';
import { viewReminder, reminderFee } from './03-status-reminder.js';
import { currentAppt } from './03-status-confirmed.js';

/* R7-U-01: the tap that locks the fee says so — a ! row between the
   frame's two: "Your $25 visitation fee is now non-refundable."
   (amount from the appointment; live and fixture alike — Figma sync
   pending). */
function modalHtml(a) {
  return `<div class="modal">
  <h2 class="modal__title modal__title--success">Appointment Confirmed!</h2>
  <div class="modal__row"><span class="modal__glyph c-success">✓</span><span>Marco will message you when he arrives.</span></div>
  <div class="modal__row" data-fee-locked-row><span class="modal__glyph c-accent-ink">!</span><span>Your ${reminderFee(a)} visitation fee is now non-refundable.</span></div>
  <div class="modal__row"><span class="modal__glyph c-accent-ink">!</span><div>Please prepare:<ul class="modal__list"><li>Your garments.</li><li>The shoes you plan to wear with them.</li></ul></div></div>
  <div class="modal__actions">
    ${cta('Confirm', { attrs: 'data-act="confirm-appt"' })}
  </div>
</div>`;
}

function wireModal(root, close) {
  root.querySelector('[data-act="confirm-appt"]')?.addEventListener('click', () => {
    /* DEMO (UX-LOOP R1-U-02): the appointment "happens" — Marco's
       at-visit review writes the reviewed order into the appointment
       (the frames' +Sleeve / +jacket fiction; a no-op once the tailor
       side has sent its own), then the order awaits approval. */
    const a = apptEntry();
    /* R7: the customer's confirmation locks the visitation fee
       (confirmedAt + feeLocked) BEFORE the appointment happens */
    confirmAppointment(a);
    draftFinalOrder(a);
    completeAppointment(a);
    /* R2-U-01: close the overlay BEFORE navigating (scroll lock / back).
       R4-U-01: the 03 family supersedes itself — 03/Tailoring REPLACES
       the reminder, so back never lands on a stale "Please Confirm
       Tomorrow's Appointment" / "Appointment Confirmed" with a live
       Reschedule / Cancel for an order Marco has already measured. */
    close?.();
    /* round 10 (Kevin): the final order awaits approval → 04 is the screen */
    go(statusScreen(a), { replace: true });
  });
}

/** Open the popup over the live screen (05's Confirm Appointment). */
export function openConfirmPopup() {
  modalOverlay(modalHtml(apptEntry()), { dataS: '03.2-appointment-confirmed' }, wireModal);
}

/* Route registration keeps the frame-verbatim render for the diff
   harness: 05 as backdrop, scrim, modal. */
function renderScreen(s) {
  return `<div class="screen-sheet" data-s="03.2-appointment-confirmed">
  <div class="sheet-backdrop" aria-hidden="true">${viewReminder(s)}</div>
  <div class="modal-scrim"></div>
  ${modalHtml(currentAppt(s))}
</div>`;
}

register('03.2-appointment-confirmed', renderScreen, wireModal);
