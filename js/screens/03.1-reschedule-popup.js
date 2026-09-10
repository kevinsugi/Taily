/* ============================================================
   R1 - Reschedule Popup — Figma 558:1867.
   05 dimmed under an ink@45% scrim + centred modal (y248): serif-24
   title, three glyph rows (✕ error / ↻ accent / ✓ success),
   Reschedule / Cancel + Go Back CTAs. Opened from 04C's / 05's
   Reschedule / Cancel, the 01/09 card Reschedule, and 03's cancel
   line (mode 'cancel' — cancel-worded per UX-003); confirming runs
   cancelAppointment() (deposit refunded, v3 semantics; the removed
   appointment lands on state.lastCancelled for 05X) and lands there.
   UX-003: the rows quote the ACTUAL appointment (when / tailor /
   deposit). The frame still draws the "Thursday's 7:00 PM" fixture —
   text-parity ALLOWs it.
   UX-LOOP R1-U-03: cancel mode (a request no tailor has confirmed)
   says the card hold is released — nothing was charged.
   UX-LOOP R1-U-09: "your items copied over" is honoured — confirming
   copies the appointment's garments into the home selection so Start
   Booking is one tap away.
   ============================================================ */

import { register, render as go } from '../app.js';
import { cta, modalOverlay } from '../components.js';
import { money, fmtWhen } from '../data.js';
import { state, apptEntry, cancelAppointment } from '../state.js';
import { viewReminder } from './03-status-reminder.js';

function modalHtml(mode = 'reschedule') {
  const a = apptEntry() ?? {};
  const first = (a.name ?? 'Marco Tailor').split(' ')[0];
  const deposit = a.totals?.deposit ?? 20;
  const when = fmtWhen(a.when, 'Sunday Jul 12, 7PM');
  const cancelMode = mode === 'cancel';
  return `<div class="modal">
  <h2 class="modal__title">${cancelMode ? 'Before you cancel' : 'Before you reschedule'}</h2>
  <div class="modal__row"><span class="modal__glyph c-error">✕</span><span>${cancelMode ? `Your ${when} request is withdrawn` : `${when} with ${first} is cancelled`}</span></div>
  <div class="modal__row"><span class="modal__glyph c-accent-ink">↻</span><span>A new order starts with your items copied over</span></div>
  <div class="modal__row"><span class="modal__glyph c-success">✓</span><span>${cancelMode ? 'Nothing was charged — the hold on your card is released' : `Your ${money(deposit)} deposit is refunded.`}</span></div>
  <div class="modal__actions">
    ${cta(cancelMode ? 'Cancel Request' : 'Reschedule / Cancel', { attrs: 'data-act="confirm-reschedule"' })}
    ${cta('Go Back', { variant: 'secondary', attrs: 'data-act="go-back"' })}
  </div>
</div>`;
}

/* R1-U-09: the cancelled order's garments become the next booking's
   starting point (02 cards + 01 tile badges). Exported: 03/Cancelled's
   re-request CTAs (R2-U-04/05/07) use the same copy-over. */
export function copyItemsOver(a) {
  const garments = JSON.parse(JSON.stringify(a?.garments ?? []));
  garments.forEach((g) => { delete g.added; delete g.addedJobs; delete g.displayPrice; delete g.id; });
  state.garments = garments;
  state.ui ??= {};
  state.ui.homeSelection = garments.reduce((m, g) => { m[g.type] = (m[g.type] ?? 0) + g.qty; return m; }, {});
}

/** After a terminal transition the entry sits in state.past (R2-U-07);
    point currentAppt at it so 03/Cancelled and chat read that entry. */
export function pointAtTerminal(a) {
  const i = state.past.indexOf(a);
  if (i >= 0) state.currentAppt = { list: 'past', index: i };
}

function wireModal(root, close) {
  root.querySelector('[data-act="confirm-reschedule"]')?.addEventListener('click', () => {
    const a = apptEntry();
    const res = cancelAppointment(a);   // stashes state.lastCancelled for 05X
    if (res && a) { copyItemsOver(a); pointAtTerminal(a); }
    /* R2-U-01: close the overlay BEFORE navigating — otherwise the page
       stays scroll-locked and the next back gesture is swallowed */
    close();
    go('03-status-cancelled');
  });
  root.querySelector('[data-act="go-back"]')?.addEventListener('click', () => close());
}

/** Open the popup over the live screen. mode 'cancel' (03's cancel
    line) swaps in cancel wording. */
export function openReschedulePopup(mode = 'reschedule') {
  modalOverlay(modalHtml(mode), { dataS: '03.1-reschedule-popup' }, wireModal);
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
