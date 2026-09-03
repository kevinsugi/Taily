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
import { completeAppointment } from '../state.js';
import { view05 } from './05-appointment-reminder.js';

function modalHtml() {
  return `<div class="modal">
  <h2 class="modal__title modal__title--success">Appointment Confirmed!</h2>
  <div class="modal__row"><span class="modal__glyph c-success">✓</span><span>Marco will message you when he arrives.</span></div>
  <div class="modal__row"><span class="modal__glyph c-accent-ink">!</span><div>Please prepare:<ul class="modal__list"><li>Your garments.</li><li>The shoes you plan to wear with them.</li></ul></div></div>
  <div class="modal__actions">
    ${cta('Confirm', { attrs: 'data-act="confirm-appt"' })}
  </div>
</div>`;
}

function wireModal(root) {
  root.querySelector('[data-act="confirm-appt"]')?.addEventListener('click', () => {
    completeAppointment();
    go('04d-appointment-complete');
  });
}

/** Open the popup over the live screen (05's Confirm Appointment). */
export function openConfirmPopup() {
  modalOverlay(modalHtml(), { dataS: '05c-appointment-confirmed' }, wireModal);
}

/* Route registration keeps the frame-verbatim render for the diff
   harness: 05 as backdrop, scrim, modal. */
function renderScreen(s) {
  return `<div class="screen-sheet" data-s="05c-appointment-confirmed">
  <div class="sheet-backdrop" aria-hidden="true">${view05(s)}</div>
  <div class="modal-scrim"></div>
  ${modalHtml()}
</div>`;
}

register('05c-appointment-confirmed', renderScreen, wireModal);
