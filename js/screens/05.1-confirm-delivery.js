/* ============================================================
   05.1 - Confirm Delivery — Figma 775:4991 (Window Confirmed / Modal
   Type=Confirmation_screen 580:2192). 05 dimmed under the scrim + a
   centred 350-wide modal at 267: serif "Please Confirm Your Delivery",
   the n50 detail card (When / Where / Items, 16px rows), Confirm /
   Edit Details. Round 16 (Kevin): 05 → 05.1 → 05.2.
   The route render keeps the frame: 05's backdrop with the day chosen
   but no time / address yet, the modal quoting Thu, Jul 23 · 5:00 PM.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { cta, modalOverlay } from '../components.js';
import { state } from '../state.js';
import { viewItemsReady, FRAME_DELIVERY } from './05-items-ready.js';

export const FRAME_MODAL = { when: 'Thu, Jul 23 · 5:00 PM', where: '88 Leonard Street, 10013', items: '2 items' };

function modalHtml({ when, where, items } = FRAME_MODAL) {
  return `<div class="modal modal--confirm modal--delivery">
  <h2 class="modal__title">Please Confirm Your Delivery</h2>
  <div class="detail-card">
    <div class="detail-row"><span class="detail-row__label">When</span><span class="detail-row__value">${when}</span></div>
    <div class="detail-row"><span class="detail-row__label">Where</span><span class="detail-row__value">${where}</span></div>
    <div class="detail-row"><span class="detail-row__label">Items</span><span class="detail-row__value">${items}</span></div>
  </div>
  <div class="modal__actions">
    ${cta('Confirm', { attrs: 'data-act="confirm-delivery"' })}
    ${cta('Edit Details', { variant: 'secondary', attrs: 'data-act="edit-delivery"' })}
  </div>
</div>`;
}

/** Open over the live 05. `onConfirm` runs after the modal closed. */
export function openConfirmDelivery(details, onConfirm) {
  modalOverlay(modalHtml(details), { dataS: '05.1-confirm-delivery' }, (root, close) => {
    root.querySelector('[data-act="confirm-delivery"]')?.addEventListener('click', () => { close({ instant: true }); onConfirm?.(); });
    root.querySelector('[data-act="edit-delivery"]')?.addEventListener('click', () => close());
  });
}

/* Route registration keeps the frame-verbatim render for the diff harness. */
function renderScreen(s) {
  return `<div class="screen-sheet" data-s="05.1-confirm-delivery">
  <div class="sheet-backdrop" aria-hidden="true">${viewItemsReady(s, { ...FRAME_DELIVERY, time: null, address: null })}</div>
  <div class="modal-scrim" data-act="modal-dismiss"></div>
  ${modalHtml()}
</div>`;
}
function wire(root) {
  const dismiss = () => { back() || go('05-items-ready'); };
  root.querySelectorAll('[data-act="modal-dismiss"], [data-act="edit-delivery"]').forEach((el) => el.addEventListener('click', dismiss));
  root.querySelector('[data-act="confirm-delivery"]')?.addEventListener('click', () => go('05.2-delivery-confirmed'));
}

register('05.1-confirm-delivery', renderScreen, wire);
