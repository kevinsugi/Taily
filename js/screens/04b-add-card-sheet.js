/* ============================================================
   04B - Add Card Sheet — Figma 277:2967.
   Scrim + default sheet: title, card field (icon + placeholders),
   Next CTA, security note.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { sheet, sheetOverlay, cta, wireSheetA11y } from '../components.js';
import { state, requestTailor } from '../state.js';
import { ICON_CARD } from '../icons.js';
import { view02 } from './02-appointment-details.js';

function cardContent() {
  return `<h1 class="t-title c-ink">Add card</h1>
<div class="card-field">
  ${ICON_CARD}
  <input class="card-field__input card-field__num" name="cardnum" inputmode="numeric" autocomplete="cc-number" maxlength="19" placeholder="1234 1234 1234 1234" aria-label="Card number">
  <input class="card-field__input card-field__exp" name="exp" inputmode="numeric" autocomplete="cc-exp" maxlength="5" placeholder="MM/YY" aria-label="Expiry date">
  <input class="card-field__input card-field__cvc" name="cvc" inputmode="numeric" autocomplete="cc-csc" maxlength="3" placeholder="CVC" aria-label="Security code">
</div>
${cta('Next', { disabled: true, attrs: 'data-act="next"' })}
<p class="t-small c-500 sheet__sub">Saved securely — charged only when your tailor confirms the appointment.</p>`;
}

/* Live formatting + Next enablement: card number groups in fours,
   expiry inserts the slash; Next lights up once all three are complete. */
function wireCardFields(root) {
  const num = root.querySelector('[name="cardnum"]');
  const exp = root.querySelector('[name="exp"]');
  const cvc = root.querySelector('[name="cvc"]');
  const next = root.querySelector('[data-act="next"]');
  const complete = () =>
    num.value.replace(/\D/g, '').length === 16 && exp.value.length === 5 && cvc.value.length === 3;
  const update = () => next?.classList.toggle('cta--disabled', !complete());
  num?.addEventListener('input', () => {
    num.value = num.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    update();
  });
  exp?.addEventListener('input', () => {
    const d = exp.value.replace(/\D/g, '').slice(0, 4);
    exp.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    update();
  });
  cvc?.addEventListener('input', () => {
    cvc.value = cvc.value.replace(/\D/g, '').slice(0, 3);
    update();
  });
  return complete;
}

/** Open the add-card sheet over the live screen (nothing behind re-renders). */
export function openAddCardOverlay() {
  sheetOverlay(cardContent(), { dataS: '04b-add-card-sheet' }, (root, close) => {
    const complete = wireCardFields(root);
    // close() first — it restores the scroll freeze after the slide-out
    root.querySelector('[data-act="next"]')?.addEventListener('click', () => {
      if (!complete()) return;
      close(); requestTailor(); go('03-finding-tailor');
    });
  });
}

function renderScreen() {
  return `<div class="screen-sheet" data-s="04b-add-card-sheet">
  <div class="sheet-backdrop" aria-hidden="true">${view02(state)}</div>
  ${sheet(cardContent())}
</div>`;
}

function wire(root) {
  const host = root.querySelector('.sheet-host');
  if (window.__tailyNavigated && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    host.dataset.open = 'false';
    requestAnimationFrame(() => requestAnimationFrame(() => { host.dataset.open = 'true'; }));
  }
  const complete = wireCardFields(root);
  root.querySelector('[data-act="next"]')?.addEventListener('click', () => {
    if (!complete()) return;
    requestTailor(); go('03-finding-tailor');
  });
  const dismiss = () => { back() || go('04a-payment-sheet'); };
  root.querySelectorAll('[data-act="sheet-cancel"]').forEach((el) => el.addEventListener('click', dismiss));
  wireSheetA11y(root, dismiss);
}

register('04b-add-card-sheet', renderScreen, wire);
