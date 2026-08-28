/* ============================================================
   04A - Payment Method Sheet — Figma 277:2887.
   Scrim + default sheet (36x4 grabber, pad 12/20/32, gap 16):
   title, 12px note, three method rows, centred Cancel.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { sheet, methodRow } from '../components.js';
import { state } from '../state.js';

function renderScreen() {
  const content = `<h1 class="t-title c-ink">How would you like to pay?</h1>
<p class="t-small c-500 sheet__sub">Your card is saved now — the 10% deposit is only charged when a tailor accepts your request.</p>
${methodRow('Apple Pay', 'apple')}
${methodRow('Google Pay', 'google')}
${methodRow('Credit Card', 'card')}
<button type="button" class="sheet__cancel-row" data-act="cancel">Cancel</button>`;

  return `<div class="screen-sheet" data-s="04a-payment-sheet">
  ${sheet(content)}
</div>`;
}

function wire(root) {
  const host = root.querySelector('.sheet-host');
  if (window.__tailyNavigated && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    host.dataset.open = 'false';
    requestAnimationFrame(() => requestAnimationFrame(() => { host.dataset.open = 'true'; }));
  }
  const rows = root.querySelectorAll('.method-row');
  rows[0]?.addEventListener('click', () => { state.payMethod = 'apple'; go('04c-appointment-confirmed'); });
  rows[1]?.addEventListener('click', () => { state.payMethod = 'google'; go('04c-appointment-confirmed'); });
  rows[2]?.addEventListener('click', () => { state.payMethod = 'card'; go('04b-add-card-sheet'); });
  const dismiss = () => { back() || go('02-appointment-details'); };
  root.querySelector('[data-act="cancel"]')?.addEventListener('click', dismiss);
  root.querySelectorAll('[data-act="sheet-cancel"]').forEach((el) => el.addEventListener('click', dismiss));
}

register('04a-payment-sheet', renderScreen, wire);
