/* ============================================================
   07C - Confirmed — Figma 576:9219 (Window Confirmed / Modal
   580:2230). 07B dimmed under an ink@45% scrim + centred 350-wide
   modal: success check badge, serif-24 success title, sub, n50
   detail card (When / Where / Items), Done. Opened when the user
   confirms a pickup or delivery window on 07A/07B; Done lands on
   Home (the Ready card keeps the scheduled window; the tailor
   confirms the handoff later — see 04D).
   The route render keeps the frame's fixture (Pickup confirmed. /
   Sat, Aug 30 / 1025 Broadway / 2 items); the live modal quotes the
   actual selection.
   ============================================================ */

import { register, render as go } from '../app.js';
import { cta, modalOverlay } from '../components.js';
import { state, apptEntry } from '../state.js';
import { view07b } from './07b-delivery-options.js';

function modalHtml({ method = 'Pickup', when = 'Sat, Aug 30 · 5:00–6:00 PM', where = '1025 Broadway', items = '2 items · pressed & bagged', first = 'Marco' } = {}) {
  return `<div class="modal modal--confirm">
  <span class="confirm-check" aria-hidden="true"><span class="confirm-check__dot">✓</span></span>
  <h2 class="modal__title modal__title--success">${method} confirmed.</h2>
  <p class="modal__sub">${first} has your window. We’ll remind you an hour before.</p>
  <div class="detail-card">
    <div class="detail-row"><span class="detail-row__label">When</span><span class="detail-row__value">${when}</span></div>
    <div class="detail-row"><span class="detail-row__label">Where</span><span class="detail-row__value">${where}</span></div>
    <div class="detail-row"><span class="detail-row__label">Items</span><span class="detail-row__value">${items}</span></div>
  </div>
  <div class="modal__actions">
    ${cta('Done', { attrs: 'data-act="window-done"' })}
  </div>
</div>`;
}

function wireModal(root) {
  root.querySelector('[data-act="window-done"]')?.addEventListener('click', () => go('01-home'));
}

/** Open over the live 07A/07B after chooseFulfilment(). */
export function openWindowConfirmed({ method, when }) {
  const a = apptEntry() ?? {};
  const first = (a.name ?? 'Marco Tailor').split(' ')[0];
  const n = (a.garments ?? []).reduce((s, g) => s + g.qty, 0) || a.count || 2;
  modalOverlay(modalHtml({
    method: method === 'delivery' ? 'Delivery' : 'Pickup',
    when,
    where: method === 'delivery' ? `${state.contact.street}, ${state.contact.unit}` : '1025 Broadway',
    items: `${n} items · pressed & bagged`,
    first,
  }), { dataS: '07c-window-confirmed' }, wireModal);
}

/* Route registration keeps the frame-verbatim render for the diff
   harness: 07B as backdrop, scrim, fixture modal. */
function renderScreen(s) {
  return `<div class="screen-sheet" data-s="07c-window-confirmed">
  <div class="sheet-backdrop" aria-hidden="true">${view07b(s)}</div>
  <div class="modal-scrim"></div>
  ${modalHtml()}
</div>`;
}

register('07c-window-confirmed', renderScreen, wireModal);
