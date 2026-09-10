/* ============================================================
   04A - Payment Method Sheet — Figma 277:2887.
   Scrim + default sheet (36x4 grabber, pad 12/20/32, gap 16):
   title, 12px note, three method rows, centred Cancel.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { sheet, sheetOverlay, methodRow, wireSheetA11y } from '../components.js';
import { money } from '../data.js';
import { state, requestTailor, bookingLines } from '../state.js';
import { view02, ensureGarments } from './02-appointment-details.js';
import { openAddCardOverlay } from './02.4-add-card-sheet.js';

/* R7 (Kevin): the sheet holds the visitation fee for the LIVE item
   count — charged when a tailor accepts; the alterations are paid at
   handoff. Figma sync pending (the frame's sub still says deposit). */
function payContent() {
  ensureGarments();
  const fee = money(bookingLines(null).visitFee);
  return `<h1 class="t-title c-ink">How would you like to pay?</h1>
<p class="t-small c-500 sheet__sub">Hold your ${fee} visitation fee — charged when a tailor accepts. Alterations are paid at pickup or delivery.</p>
${methodRow('Apple Pay', 'apple')}
${methodRow('Google Pay', 'google')}
${methodRow('Credit Card', 'card')}
<button type="button" class="sheet__cancel-row" data-act="cancel">Cancel</button>`;
}

/** Open the payment sheet over the live screen (nothing behind re-renders). */
export function openPaymentOverlay() {
  sheetOverlay(payContent(), { dataS: '02.3-payment-sheet' }, (root, close) => {
    const rows = root.querySelectorAll('.method-row');
    // close() first — it restores the scroll freeze after the slide-out
    rows[0]?.addEventListener('click', () => { state.payMethod = 'apple'; close(); requestTailor(); go('03-status-requested', { replace: true }); });
    rows[1]?.addEventListener('click', () => { state.payMethod = 'google'; close(); requestTailor(); go('03-status-requested', { replace: true }); });
    /* R1-U-21: ✕ / Escape on the card sheet reopens this one */
    rows[2]?.addEventListener('click', () => { state.payMethod = 'card'; close(); openAddCardOverlay({ onCancel: openPaymentOverlay }); });
    root.querySelector('[data-act="cancel"]')?.addEventListener('click', close);
  });
}

function renderScreen() {
  return `<div class="screen-sheet" data-s="02.3-payment-sheet">
  <div class="sheet-backdrop" aria-hidden="true">${view02(state)}</div>
  ${sheet(payContent())}
</div>`;
}

function wire(root) {
  const host = root.querySelector('.sheet-host');
  if (window.__tailyNavigated && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    host.dataset.open = 'false';
    requestAnimationFrame(() => requestAnimationFrame(() => { host.dataset.open = 'true'; }));
  }
  const rows = root.querySelectorAll('.method-row');
  // paying sends the request: the machine enters `searching` (03);
  // the tailor accepting moves it to confirmed (04c).
  rows[0]?.addEventListener('click', () => { state.payMethod = 'apple'; requestTailor(); go('03-status-requested', { replace: true }); });
  rows[1]?.addEventListener('click', () => { state.payMethod = 'google'; requestTailor(); go('03-status-requested', { replace: true }); });
  rows[2]?.addEventListener('click', () => { state.payMethod = 'card'; go('02.4-add-card-sheet'); });
  const dismiss = () => { back() || go('02-appointment-details'); };
  root.querySelector('[data-act="cancel"]')?.addEventListener('click', dismiss);
  root.querySelectorAll('[data-act="sheet-cancel"]').forEach((el) => el.addEventListener('click', dismiss));
  wireSheetA11y(root, dismiss);
}

register('02.3-payment-sheet', renderScreen, wire);
