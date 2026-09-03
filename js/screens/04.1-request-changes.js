/* ============================================================
   RC1 - Request Changes — Figma 559:3265.
   05 dimmed under an ink@45% scrim + centred modal (y281): ✂ badge,
   serif-24 title, centred 14px body (two paragraphs), Sounds Good
   CTA. Opened from Request Changes on 06A / 06B; Sounds Good
   dismisses back to the review.
   ============================================================ */

import { register, render as go } from '../app.js';
import { cta, modalOverlay } from '../components.js';
import { viewReminder } from './03-status-reminder.js';

function modalHtml() {
  return `<div class="modal modal--center">
  <span class="modal__badge" aria-hidden="true">✂</span>
  <h2 class="modal__title">Talk it over with Marco</h2>
  <p class="modal__body">Please work together with Marco to come to an agreement regarding your items.<br><br>Tailoring prices are non-negotiable.</p>
  <div class="modal__actions">
    ${cta('Sounds Good', { attrs: 'data-act="sounds-good"' })}
  </div>
</div>`;
}

function wireModal(root, close) {
  root.querySelector('[data-act="sounds-good"]')?.addEventListener('click', () => close());
}

/** Open the popup over the live screen (06A / 06B). */
export function openRequestChanges() {
  modalOverlay(modalHtml(), { dataS: '04.1-request-changes' }, wireModal);
}

/* Route registration keeps the frame-verbatim render for the diff
   harness: the frame draws 05 as its backdrop. */
function renderScreen(s) {
  return `<div class="screen-sheet" data-s="04.1-request-changes">
  <div class="sheet-backdrop" aria-hidden="true">${viewReminder(s)}</div>
  <div class="modal-scrim"></div>
  ${modalHtml()}
</div>`;
}

function wire(root) {
  wireModal(root, () => go('04-review-approve-modified'));
}

register('04.1-request-changes', renderScreen, wire);
