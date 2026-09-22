/* ============================================================
   05.2 - Window Confirmed / Dated — Figma 609:2779 (Window Confirmed /
   Modal Type=Delivered 584:9308). 05 dimmed under the scrim + the
   centred modal at 232: success check badge, serif-24 success "Delivery
   confirmed.", "We will text you when your driver is on the way.", the
   n50 detail card (When / Where / Items), Done → 03 / Delivery Scheduled.
   Round 16 (Kevin): the third step of 05 → 05.1 → 05.2 (the frame's
   backdrop still draws the round-6 delivery options — raised).
   ============================================================ */

import { register, render as go } from '../app.js';
import { cta, modalOverlay } from '../components.js';
import { viewItemsReady } from './05-items-ready.js';
import { FRAME_MODAL } from './05.1-confirm-delivery.js';

function modalHtml({ when, where, items } = FRAME_MODAL) {
  return `<div class="modal modal--confirm">
  <span class="confirm-check" aria-hidden="true"><span class="confirm-check__dot">✓</span></span>
  <h2 class="modal__title modal__title--success">Delivery confirmed.</h2>
  <p class="modal__sub">We will text you when your driver is on the way.</p>
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

function wireModal(root, close) {
  /* R2-U-01: close the overlay BEFORE navigating (scroll lock / back) */
  root.querySelector('[data-act="window-done"]')?.addEventListener('click', () => { close?.({ instant: true }); go('03-status-delivery-scheduled'); });
}

/** Open over the live 05 after chooseFulfilment(). */
export function openDeliveryConfirmed(details) {
  modalOverlay(modalHtml(details), { dataS: '05.2-delivery-confirmed' }, wireModal);
}

/* Route registration keeps the frame-verbatim render for the diff harness. */
function renderScreen(s) {
  return `<div class="screen-sheet" data-s="05.2-delivery-confirmed">
  <div class="sheet-backdrop" aria-hidden="true">${viewItemsReady(s)}</div>
  <div class="modal-scrim"></div>
  ${modalHtml()}
</div>`;
}

register('05.2-delivery-confirmed', renderScreen, (root) => wireModal(root, null));
