/* ============================================================
   R1 - Reschedule Popup — Figma 558:1867.
   05 dimmed under an ink@45% scrim + centred modal (y248): serif-24
   title, three 14px glyph rows (✕ error / ↻ accent / ✓ success),
   Reschedule / Cancel + Go Back CTAs. Opened from 04C's and 05's
   Reschedule / Cancel buttons; confirming cancels the appointment
   (deposit refunded, v3 semantics) and lands on 05X.
   NB the frame's "Thursday’s 7:00 PM" row is fiction that predates
   the Jul 12 date — carried verbatim.
   ============================================================ */

import { register, render as go } from '../app.js';
import { cta, modalOverlay } from '../components.js';
import { cancelAppointment } from '../state.js';
import { view05 } from './05-appointment-reminder.js';

function modalHtml() {
  return `<div class="modal">
  <h2 class="modal__title">Before you reschedule</h2>
  <div class="modal__row"><span class="modal__glyph c-error">✕</span><span>Thursday’s 7:00 PM with Marco is cancelled</span></div>
  <div class="modal__row"><span class="modal__glyph c-accent-ink">↻</span><span>A new order starts with your items copied over</span></div>
  <div class="modal__row"><span class="modal__glyph c-success">✓</span><span>Your $20 deposit is refunded.</span></div>
  <div class="modal__actions">
    ${cta('Reschedule / Cancel', { attrs: 'data-act="confirm-reschedule"' })}
    ${cta('Go Back', { variant: 'secondary', attrs: 'data-act="go-back"' })}
  </div>
</div>`;
}

function wireModal(root, close) {
  root.querySelector('[data-act="confirm-reschedule"]')?.addEventListener('click', () => {
    cancelAppointment();
    go('05x-appointment-cancelled');
  });
  root.querySelector('[data-act="go-back"]')?.addEventListener('click', () => close());
}

/** Open the popup over the live screen (04C / 05). */
export function openReschedulePopup() {
  modalOverlay(modalHtml(), { dataS: 'r1-reschedule-popup' }, wireModal);
}

/* Route registration keeps the frame-verbatim render for the diff
   harness: 05 as backdrop, scrim, modal. */
function renderScreen(s) {
  return `<div class="screen-sheet" data-s="r1-reschedule-popup">
  <div class="sheet-backdrop" aria-hidden="true">${view05(s)}</div>
  <div class="modal-scrim"></div>
  ${modalHtml()}
</div>`;
}

function wire(root) {
  wireModal(root, () => go('05-appointment-reminder'));
}

register('r1-reschedule-popup', renderScreen, wire);
