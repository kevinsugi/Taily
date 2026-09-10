/* ============================================================
   RC1 - Request Changes — Figma 559:3265.
   05 dimmed under an ink@45% scrim + centred modal (y281): ✂ badge,
   serif-24 title, centred 14px body (two paragraphs), Sounds Good
   CTA. Opened from Request Changes on 06A / 06B.
   UX-LOOP R2-T-09: Sounds Good is the request — it stamps
   `a.changesRequestedAt` (requestChanges) and opens the chat with a
   canned customer bubble ("Can we talk about the changes before I
   approve?") so Marco's side (T06 line, T01 "Sarah has questions")
   has something to answer. The bubble is queued on
   `a.pendingChatSeed`; 10-messages (tailor-owned) appends it to the
   thread on its next render and clears the field. Approval clears
   the flag (approveOrder). The harness route keeps the frame's
   dismiss-only behaviour.
   ============================================================ */

import { register, render as go } from '../app.js';
import { cta, modalOverlay } from '../components.js';
import { apptEntry, requestChanges } from '../state.js';
import { viewReminder } from './03-status-reminder.js';

export const CHANGES_BUBBLE = 'Can we talk about the changes before I approve?';

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

function wireModal(root, close, { live = true } = {}) {
  root.querySelector('[data-act="sounds-good"]')?.addEventListener('click', () => {
    if (!live) { close(); return; }
    const a = apptEntry();
    if (a) { requestChanges(a); a.pendingChatSeed = CHANGES_BUBBLE; }
    close();
    go('10-messages');
  });
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
  wireModal(root, () => go('04-review-approve-modified'), { live: false });
}

register('04.1-request-changes', renderScreen, wire);
