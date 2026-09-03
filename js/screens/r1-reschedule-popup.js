/* ============================================================
   R1 - Reschedule Popup — Figma 558:1867.
   05 dimmed under an ink@45% scrim + centred modal (y248): serif-24
   title, three glyph rows (✕ error / ↻ accent / ✓ success),
   Reschedule / Cancel + Go Back CTAs. Opened from 04C's / 05's
   Reschedule / Cancel, the 01/09 card Reschedule, and 03's cancel
   line (mode 'cancel' — cancel-worded per UX-003); confirming runs
   cancelAppointment() (deposit refunded, v3 semantics), stashes the
   appointment for 05X, and lands there.
   UX-003: the rows quote the ACTUAL appointment (when / tailor /
   deposit). The frame still draws the "Thursday's 7:00 PM" fixture —
   text-parity ALLOWs it.
   ============================================================ */

import { register, render as go } from '../app.js';
import { cta, modalOverlay } from '../components.js';
import { state, apptEntry, cancelAppointment } from '../state.js';
import { view05 } from './05-appointment-reminder.js';

function modalHtml(mode = 'reschedule') {
  const a = apptEntry() ?? {};
  const first = (a.name ?? 'Marco Tailor').split(' ')[0];
  const deposit = a.totals?.deposit ?? 20;
  const cancelMode = mode === 'cancel';
  return `<div class="modal">
  <h2 class="modal__title">${cancelMode ? 'Before you cancel' : 'Before you reschedule'}</h2>
  <div class="modal__row"><span class="modal__glyph c-error">✕</span><span>${a.when ?? 'Sunday Jul 12, 7PM'} with ${first} is cancelled</span></div>
  <div class="modal__row"><span class="modal__glyph c-accent-ink">↻</span><span>A new order starts with your items copied over</span></div>
  <div class="modal__row"><span class="modal__glyph c-success">✓</span><span>Your $${deposit} deposit is refunded.</span></div>
  <div class="modal__actions">
    ${cta(cancelMode ? 'Cancel Request' : 'Reschedule / Cancel', { attrs: 'data-act="confirm-reschedule"' })}
    ${cta('Go Back', { variant: 'secondary', attrs: 'data-act="go-back"' })}
  </div>
</div>`;
}

function wireModal(root, close) {
  root.querySelector('[data-act="confirm-reschedule"]')?.addEventListener('click', () => {
    const res = cancelAppointment();
    state.lastCancelled = res?.appointment ?? null;   // 05X renders this
    go('05x-appointment-cancelled');
  });
  root.querySelector('[data-act="go-back"]')?.addEventListener('click', () => close());
}

/** Open the popup over the live screen. mode 'cancel' (03's cancel
    line) swaps in cancel wording. */
export function openReschedulePopup(mode = 'reschedule') {
  modalOverlay(modalHtml(mode), { dataS: 'r1-reschedule-popup' }, wireModal);
}

/* Route registration keeps the frame-verbatim render for the diff
   harness: 05 as backdrop, scrim, modal (seed data = the fixture). */
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
