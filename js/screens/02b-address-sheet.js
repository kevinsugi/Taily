/* ============================================================
   02B - Address Sheet V1 (Structured form) — Figma 538:1382.
   Ink@0.6 scrim (heavier than the 0.4 the other sheets use — frame
   truth, raised) over 02, with a structured home-visit address form:
   serif title + sub, 11px caps field labels, street (pin icon) /
   apt + zip / entry notes inputs, save-as-home toggle, Save Address
   CTA, centred footnote.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { sheet, sheetOverlay, cta, wireSheetA11y } from '../components.js';
import { state } from '../state.js';
import { view02 } from './02-appointment-details.js';
import { ICON_LOCATION_PIN } from '../icons.js';

function esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function formContent(c) {
  return `<div class="addr-head">
  <h1 class="t-title c-ink">Where should we come?</h1>
  <p class="addr-sub">Home visit address</p>
</div>
<div class="field-group">
  <span class="field-label">STREET ADDRESS</span>
  <label class="field">${ICON_LOCATION_PIN}<input class="field__input" name="street" value="${esc(c.street)}"></label>
</div>
<div class="field-row">
  <div class="field-group">
    <span class="field-label">APT / UNIT</span>
    <label class="field"><input class="field__input" name="unit" value="${esc(c.unit)}"></label>
  </div>
  <div class="field-group">
    <span class="field-label">ZIP</span>
    <label class="field"><input class="field__input" name="zip" value="${esc(c.zip)}"></label>
  </div>
</div>
<div class="field-group">
  <span class="field-label">ENTRY NOTES (OPTIONAL)</span>
  <label class="field field--notes"><input class="field__input" name="notes" value="${esc(c.notes)}"></label>
</div>
<div class="addr-toggle-row">
  <span>Save as my home address</span>
  <button type="button" class="toggle${c.saveHome === false ? ' toggle--off' : ''}" data-act="toggle-save" role="switch" aria-checked="${c.saveHome !== false}" aria-label="Save as my home address"></button>
</div>
${cta('Save Address', { attrs: 'data-act="save-address"' })}
<p class="t-small c-500 addr-note">Your tailor sees this only after accepting your request.</p>`;
}

function wireForm(root, onSave) {
  root.querySelector('[data-act="toggle-save"]')?.addEventListener('click', (e) => {
    const t = e.currentTarget;
    t.classList.toggle('toggle--off');
    t.setAttribute('aria-checked', String(!t.classList.contains('toggle--off')));
  });
  root.querySelector('[data-act="save-address"]')?.addEventListener('click', () => {
    const val = (n) => root.querySelector(`[name="${n}"]`)?.value?.trim() ?? '';
    state.contact.street = val('street') || state.contact.street;
    state.contact.unit = val('unit');
    state.contact.zip = val('zip');
    state.contact.notes = val('notes');
    state.contact.saveHome = !root.querySelector('[data-act="toggle-save"]')?.classList.contains('toggle--off');
    onSave?.();
  });
}

/** Open the address form over the live screen (01's address line or 02's pill). */
export function openAddressOverlay() {
  sheetOverlay(formContent(state.contact), { dataS: '02b-address-sheet' }, (root, close) => {
    wireForm(root, () => {
      /* update the opener's live DOM in place — no re-render flash */
      const pill = document.querySelector('#screen [data-act="address"].filter-pill__box');
      if (pill?.firstChild?.nodeType === Node.TEXT_NODE) {
        pill.firstChild.nodeValue = `${state.contact.street}, ${state.contact.unit}`;
      }
      const homeLine = document.querySelector('#screen [data-addr-text]');
      if (homeLine) homeLine.textContent = `${state.contact.street}, ${state.userLoc}`;
      close();
    });
  });
}

function renderScreen() {
  return `<div class="screen-sheet" data-s="02b-address-sheet">
  <div class="sheet-backdrop" aria-hidden="true">${view02(state)}</div>
  ${sheet(formContent(state.contact))}
</div>`;
}

function wire(root) {
  const dismiss = () => { back() || go('02-appointment-details'); };
  root.querySelectorAll('[data-act="sheet-cancel"]').forEach((el) => el.addEventListener('click', dismiss));
  wireSheetA11y(root, dismiss);
  wireForm(root, dismiss);
}

register('02b-address-sheet', renderScreen, wire);
