/* ============================================================
   c-addresses — Saved addresses. The places tailors visit and the default new bookings start from.
   Focal: the default address card. Add = a sheet (D-133); remove is immediate with Undo, no confirm.
   Screen-local UI: state.ui['c-addresses'] = { add: draft | undefined, busy: { kind, id } | null }.
   Spec: M5-spec.md §C3.
   ============================================================ */
import { register, render as go, currentScreen } from '../app.js';
import { state } from '../state.js';
import {
  chrome, headingRow, actionBar, emptyState, field, chipGroup, checkRow, cta, sheetOverlay, toast, wireChipGroups, banner, esc,
} from '../components.js';
import { withLatency } from '../sim.js';
import { ADDRESS_LABELS, SHOP_CITY } from '../data.js';
import * as A from '../account.js';

const ID = 'c-addresses';
const MSG = { street: 'Enter your street address.', zip: 'Enter a 5-digit ZIP code.' };

const ui = () => (state.ui[ID] ??= {});
const list = () => state.customer.addresses ?? [];
const sorted = () => list().slice().sort((a, b) => Number(!!b.default) - Number(!!a.default));   // default first, saved order after
const onScreen = () => currentScreen() === ID;

/* ---------- the list ---------- */
function card(a, busy) {
  const mine = busy?.id === a.id;
  const lock = busy ? ' disabled aria-disabled="true"' : '';
  const verb = mine ? { 'make-default': 'Updating…', remove: 'Removing…' }[busy.kind] : null;
  return `<article class="${ID}__card" data-id="${esc(a.id)}"${a.default ? ' data-default="true"' : ''}${mine ? ' aria-busy="true"' : ''}>
  <div class="${ID}__head">
    <h2 class="t-body w-600 ${ID}__label">${esc(a.label)}</h2>
    ${a.default ? `<span class="${ID}__tag t-micro w-700">Default</span>` : ''}
  </div>
  <p class="t-body c-700 ${ID}__lines">${esc(a.street)}${a.unit ? `, ${esc(a.unit)}` : ''}<br>${esc(a.city)}, ${esc(a.state)} ${esc(a.zip)}</p>
  <div class="${ID}__actions">
    ${a.default ? '' : `<button type="button" class="${ID}__btn t-body w-600 c-accent-ink" data-act="make-default" data-id="${esc(a.id)}"${lock}>${mine && busy.kind === 'make-default' ? verb : 'Make default'}</button>`}
    <button type="button" class="${ID}__btn t-body w-600 c-error" data-act="remove" data-id="${esc(a.id)}"${lock}>${mine && busy.kind === 'remove' ? verb : 'Remove'}</button>
  </div>
  ${ui().error?.id === a.id ? `<div class="${ID}__error" role="alert">${banner({ tone: 'error', title: ui().error.title, text: ui().error.text })}</div>` : ''}
</article>`;
}

function view() {
  const head = `${chrome('account')}`;
  const title = headingRow('<h1 class="t-title">Saved addresses</h1>', { backRow: true });
  const rows = sorted();
  if (!rows.length) {
    return `${head}<main class="body ${ID}" data-s="${ID}">
  ${title}
  <div class="${ID}__empty" data-empty="addresses">${emptyState({
    title: 'No saved addresses',
    body: 'Add the address where you’d like tailors to visit. You can also type one in when you book.',
    ctaLabel: 'Add an address', ctaAct: 'add',
  })}</div>
</main>`;
  }
  const busy = ui().busy ?? null;
  return `${head}<main class="body body--with-bar ${ID}" data-s="${ID}"${busy ? ' aria-busy="true"' : ''}>
  ${title}
  <div class="${ID}__cards">${rows.map((a) => card(a, busy)).join('')}</div>
  <p class="t-small c-600 ${ID}__note">New bookings start from your default address. Changing it doesn’t move a booking you’ve already made.</p>
</main>
${actionBar({ ctaLabel: 'Add an address', ctaAct: 'add', busy: false })}`;
}

/* ---------- the add sheet ---------- */
const firstLabel = () => (list().some((a) => a.label === 'Home') ? 'Work' : 'Home');

function addHtml(d, errors = {}, busy = false) {
  const first = list().length === 0;
  return `<form class="${ID}-sheet" data-view="add" novalidate>
  <fieldset class="${ID}-sheet__fields"${busy ? ' disabled aria-busy="true"' : ''}>
    ${chipGroup({ name: 'label', label: 'Label', options: ADDRESS_LABELS.map((l) => ({ value: l, label: l })), value: d.label })}
    ${field({ id: 'street', label: 'Street address', value: d.street, autocomplete: 'address-line1', error: errors.street ?? '' })}
    ${field({ id: 'unit', label: 'Apt, suite or unit (optional)', value: d.unit, autocomplete: 'address-line2' })}
    ${field({ id: 'zip', label: 'ZIP code', value: d.zip, inputmode: 'numeric', maxlength: 5, autocomplete: 'postal-code', helper: `Taily is in ${SHOP_CITY.city} for now.`, error: errors.zip ?? '' })}
    ${checkRow({ id: 'make-default', label: 'Use as my default address', checked: first || !!d.makeDefault, disabled: first })}
  </fieldset>
  ${cta('Save address', { busy, busyLabel: 'Saving…', attrs: 'data-act="save-address"' })}
</form>`;
}

function openAdd() {
  const seed = ui().add ?? {};
  delete ui().add;
  const d = { label: seed.label ?? firstLabel(), street: seed.street ?? '', unit: seed.unit ?? '', zip: seed.zip ?? '', makeDefault: !!seed.makeDefault };
  sheetOverlay(addHtml(d), { header: 'Add an address', dataS: 'add-address', confirm: false }, (holder, close) => {
    const swap = (errors = {}, busy = false) => {
      holder.querySelector(`.${ID}-sheet`).outerHTML = addHtml(d, errors, busy);
      holder.dataset.locked = busy ? 'true' : 'false';
    };
    wireChipGroups(holder);
    holder.addEventListener('chip', (e) => { if (e.detail.name === 'label') d.label = e.detail.value; });
    holder.addEventListener('input', (e) => {
      const t = e.target;
      if (t.id === 'zip') t.value = t.value.replace(/\D/g, '').slice(0, 5);
      if (t.id === 'street') d.street = t.value;
      if (t.id === 'unit') d.unit = t.value;
      if (t.id === 'zip') d.zip = t.value;
    });
    holder.addEventListener('change', (e) => { if (e.target.id === 'make-default') d.makeDefault = e.target.checked; });

    const save = () => {
      if (holder.dataset.locked === 'true') return;
      d.street = holder.querySelector('#street').value.trim();
      d.unit = holder.querySelector('#unit').value.trim();
      d.zip = holder.querySelector('#zip').value.trim();
      const errors = {};
      if (!d.street) errors.street = MSG.street;
      if (!/^\d{5}$/.test(d.zip)) errors.zip = MSG.zip;
      if (Object.keys(errors).length) {                                    // a field problem: under the field, focus on the first
        swap(errors);
        holder.querySelector(errors.street ? '#street' : '#zip')?.focus();
        return;
      }
      swap({}, true);
      withLatency(() => {
        if (!holder.isConnected) return;
        const res = A.addAddress({ label: d.label, street: d.street, unit: d.unit, zip: d.zip, makeDefault: d.makeDefault });
        if (!res.ok) {                                                     // the model said no: show it where it belongs
          const e = {};
          if (res.errors.street) e.street = MSG.street;
          if (res.errors.zip) e.zip = MSG.zip;
          swap(e);
          holder.querySelector('[aria-invalid="true"]')?.focus();
          return;
        }
        close({ instant: true });
        go(ID);
        toast('Address saved');
      });
    };
    holder.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="save-address"]')) { e.preventDefault(); save(); }
    });
    holder.addEventListener('submit', (e) => { e.preventDefault(); save(); });
    holder.querySelector('#street')?.focus();
  });
}

/* ---------- remove · make default ---------- */
function remove(id) {
  const label = list().find((a) => a.id === id)?.label ?? 'Address';
  ui().error = null;
  ui().busy = { kind: 'remove', id };
  go(ID);
  withLatency(() => {
    ui().busy = null;
    if (!onScreen()) return;
    const res = A.removeAddress(id);
    go(ID);
    if (!res.ok) {                                                   // D-140 / A-14: the banner sits on the address, the toast only echoes it
      ui().error = { id, title: 'Couldn’t remove this address', text: 'Nothing changed. Try again.' };
      go(ID);
      toast('Couldn’t remove it', { tone: 'error' });
      return;
    }
    const nid = typeof res.newDefault === 'object' ? res.newDefault?.id : res.newDefault;   // the promoted address (id or the address itself)
    const promoted = nid ? list().find((a) => a.id === nid)?.label ?? '' : '';
    toast(`Address removed${promoted ? `. ${promoted} is now your default.` : ''}`, {
      action: 'Undo',
      onAction: () => {
        A.restoreAddress(res.removed, res.index);
        go(ID);
        toast(`${label} restored`);
      },
    });
  });
}

function makeDefault(id) {
  ui().busy = { kind: 'make-default', id };
  go(ID);
  withLatency(() => {
    ui().busy = null;
    if (!onScreen()) return;
    A.setDefaultAddress(id);
    go(ID);
    toast('Default address updated');
  });
}

function wire(root) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || e.target.closest('.screen-sheet--overlay')) return;
    switch (el.dataset.act) {
      case 'add': if (!ui().busy) openAdd(); break;
      case 'remove': if (!ui().busy) remove(el.dataset.id); break;
      case 'make-default': if (!ui().busy) makeDefault(el.dataset.id); break;
      default: break;
    }
  });
}

register(ID, view, wire);
