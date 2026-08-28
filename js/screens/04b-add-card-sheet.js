/* ============================================================
   04B - Add Card Sheet — Figma 277:2967.
   Scrim + default sheet: title, card field (icon + placeholders),
   Next CTA, security note.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { sheet, cta } from '../components.js';
import { ICON_CARD } from '../icons.js';

function renderScreen() {
  const content = `<h1 class="t-title c-ink">Add card</h1>
<div class="card-field">
  ${ICON_CARD}
  <span class="card-field__num">1234 1234 1234 1234</span>
  <span>MM/YY</span>
  <span>CVC</span>
</div>
${cta('Next', { disabled: true, attrs: 'data-act="next"' })}
<p class="t-small c-500 sheet__sub">Saved securely — charged only when your tailor confirms the appointment.</p>`;

  return `<div class="screen-sheet" data-s="04b-add-card-sheet">
  ${sheet(content)}
</div>`;
}

function wire(root) {
  const host = root.querySelector('.sheet-host');
  if (window.__tailyNavigated && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    host.dataset.open = 'false';
    requestAnimationFrame(() => requestAnimationFrame(() => { host.dataset.open = 'true'; }));
  }
  root.querySelector('[data-act="next"]')?.addEventListener('click', () => go('04c-appointment-confirmed'));
  root.querySelectorAll('[data-act="sheet-cancel"]').forEach((el) =>
    el.addEventListener('click', () => { back() || go('04a-payment-sheet'); }));
}

register('04b-add-card-sheet', renderScreen, wire);
