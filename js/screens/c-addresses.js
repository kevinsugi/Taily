/* ============================================================
   c-addresses — Saved addresses. The places tailors visit and the default new bookings start from.
   Focal: the default address row. One card--list of rows (P3-1, the c-cards topology); a row opens a sheet with Make default / Remove
   (D-133, D-229). Add = a sheet; remove is immediate with Undo, no confirm. S-27 (pre-MVP B2, D-379): the add / edit form is the shared
   addressFields() (street, unit, ZIP, access notes — the same four as the booking's address sheet) and a row's sheet can Edit address.
   Screen-local UI: state.ui['c-addresses'] = { add: draft | undefined }.
   Spec: M5-spec.md §C3.
   ============================================================ */
import { register, render as go, currentScreen } from '../app.js';
import { state } from '../state.js';
import {
  chrome, headingRow, actionBar, emptyState, field, chipGroup, checkRow, cta, listRow, textLink, sheetOverlay, toast, wireChipGroups, banner, esc, addressFields,
} from '../components.js';
import { withLatency } from '../sim.js';
import { ADDRESS_LABELS, SHOP_CITY } from '../data.js';
import * as A from '../account.js';

const ID = 'c-addresses';

const ui = () => (state.ui[ID] ??= {});
const list = () => state.customer.addresses ?? [];
const sorted = () => list().slice().sort((a, b) => Number(!!b.default) - Number(!!a.default));   // default first, saved order after
const onScreen = () => currentScreen() === ID;

/* ---------- the list ---------- */
const lines = (a) => `${a.street}${a.unit ? `, ${a.unit}` : ''}, ${a.city}, ${a.state} ${a.zip}`;

function view() {
  const head = `${chrome('account')}`;
  const title = headingRow('<h1 class="t-title">Saved addresses</h1>');
  const rows = sorted();
  if (!rows.length) {
    return `${head}<main class="body ${ID}" data-s="${ID}">
  ${title}
  <div class="${ID}__empty" data-empty="addresses">${emptyState({
    title: 'No saved addresses',
    body: 'Add where you’d like tailors to visit.',
    ctaLabel: 'Add an address', ctaAct: 'add', art: 'Accessories',
  })}</div>
</main>`;
  }
  const items = rows.map((a) => listRow({
    title: esc(a.label), sub: esc(lines(a)), act: 'address', attrs: `data-id="${esc(a.id)}"${a.default ? ' data-default="true"' : ''}`,
    right: a.default ? '<span class="list-row__tag t-micro w-700">Default</span>' : '',
  })).join('');
  return `${head}<main class="body body--with-bar ${ID}" data-s="${ID}">
  ${title}
  <div class="${ID}__list card card--list">${items}</div>
  <p class="t-small c-600 ${ID}__note">New bookings start from your default address.</p>
</main>
${actionBar({ ctaLabel: 'Add an address', ctaAct: 'add', busy: false })}`;
}

/* ---------- the address sheet (Make default · Remove address, as c-cards' card sheet) ---------- */
function rowHtml(a, { busy = '', error = '' } = {}) {
  const lock = !!busy;
  return `<div class="${ID}-sheet" data-view="address">
  <p class="t-body c-700 ${ID}-sheet__lines">${esc(a.street)}${a.unit ? `, ${esc(a.unit)}` : ''}<br>${esc(a.city)}, ${esc(a.state)} ${esc(a.zip)}</p>
  ${a.notes ? `<p class="t-small c-600 ${ID}-sheet__notes">Access: ${esc(a.notes)}</p>` : ''}
  ${a.default ? `<p class="t-small c-600 ${ID}-sheet__default">Your default address. New bookings start here.</p>` : ''}
  ${error ? banner({ tone: 'error', title: error, text: 'Nothing changed. Try again.' }) : ''}
  <div class="${ID}-sheet__links">
    ${textLink('Edit address', { act: 'edit', disabled: lock })}
    ${a.default ? '' : textLink(busy === 'make-default' ? 'Updating…' : 'Make default', { act: 'make-default', disabled: lock })}
    ${textLink(busy === 'remove' ? 'Removing…' : 'Remove address', { act: 'remove', tone: 'danger', disabled: lock })}
  </div>
</div>`;
}

function openRow(id) {
  const a0 = list().find((a) => a.id === id);
  if (!a0) return;
  sheetOverlay(rowHtml(a0), { header: a0.label, dataS: 'address', confirm: false }, (holder, close) => {
    const body = () => holder.querySelector(`.${ID}-sheet`);
    const current = () => list().find((a) => a.id === id);
    const lock = (on) => { holder.dataset.locked = on ? 'true' : 'false'; };
    const swap = (opts) => { const a = current(); if (a) body().outerHTML = rowHtml(a, opts); };

    const removeIt = () => {
      if (holder.dataset.locked === 'true') return;
      const label = current()?.label ?? 'Address';
      swap({ busy: 'remove' }); lock(true);
      withLatency(() => {
        if (!holder.isConnected) return;
        lock(false);
        const res = A.removeAddress(id);
        if (!res.ok) {                                              // D-140 / A-14: the banner sits in the sheet, where she acted; the toast echoes it
          swap({ error: 'Couldn’t remove this address' });
          toast('Couldn’t remove the address', { tone: 'error' });
          return;
        }
        const nid = typeof res.newDefault === 'object' ? res.newDefault?.id : res.newDefault;   // the promoted address (id or the address itself)
        const promoted = nid ? list().find((a) => a.id === nid)?.label ?? '' : '';
        close({ instant: true });
        go(ID);
        toast(`Address removed${promoted ? `. ${promoted} is now your default.` : ''}`, {
          action: 'Undo',
          onAction: () => {
            A.restoreAddress(res.removed, res.index);
            if (onScreen()) go(ID);
            toast(`${label} restored`);
          },
        });
      });
    };

    const makeIt = () => {
      if (holder.dataset.locked === 'true') return;
      swap({ busy: 'make-default' }); lock(true);
      withLatency(() => {
        if (!holder.isConnected) return;
        lock(false);
        A.setDefaultAddress(id);
        close({ instant: true });
        go(ID);
        toast('Default address updated');
      });
    };

    holder.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled) return;
      if (el.dataset.act === 'remove') removeIt();
      else if (el.dataset.act === 'make-default') makeIt();
      else if (el.dataset.act === 'edit') { close({ instant: true }); openAdd({ editId: id }); }   // S-27
    });
  });
}

/* ---------- the add sheet ---------- */
const firstLabel = () => (list().some((a) => a.label === 'Home') ? 'Work' : 'Home');

function addHtml(d, errors = {}, busy = false) {
  const first = list().length === 0;
  return `<form class="${ID}-sheet" data-view="${d.editId ? 'edit' : 'add'}" novalidate>
  <fieldset class="${ID}-sheet__fields"${busy ? ' disabled aria-busy="true"' : ''}>
    ${chipGroup({ name: 'label', label: 'Label', options: ADDRESS_LABELS.map((l) => ({ value: l, label: l })), value: d.label })}
    ${addressFields({ values: d, errors, zipHelper: `Taily is in ${SHOP_CITY.city} for now.` })}
    ${d.editId ? '' : checkRow({ id: 'make-default', label: 'Use as my default address', checked: first || !!d.makeDefault, disabled: first })}
  </fieldset>
  ${cta('Save address', { busy, busyLabel: 'Saving…', attrs: 'data-act="save-address"' })}
</form>`;
}

/** Add an address, or (S-27) edit one: `{ editId }` prefills the form and saves through A.updateAddress. */
function openAdd({ editId = null } = {}) {
  const was = editId ? list().find((a) => a.id === editId) : null;
  const seed = was ?? ui().add ?? {};
  delete ui().add;
  const d = { editId: was?.id ?? null, label: seed.label ?? firstLabel(), street: seed.street ?? '', unit: seed.unit ?? '', zip: seed.zip ?? '', notes: seed.notes ?? '', makeDefault: !!seed.makeDefault };
  sheetOverlay(addHtml(d), { header: was ? 'Edit address' : 'Add an address', dataS: was ? 'edit-address' : 'add-address', confirm: false }, (holder, close) => {
    const swap = (errors = {}, busy = false) => {
      holder.querySelector(`.${ID}-sheet`).outerHTML = addHtml(d, errors, busy);
      holder.dataset.locked = busy ? 'true' : 'false';
    };
    wireChipGroups(holder);
    holder.addEventListener('chip', (e) => { if (e.detail.name === 'label') d.label = e.detail.value; });
    holder.addEventListener('input', (e) => {
      const t = e.target;
      if (t.id === 'zip') t.value = t.value.replace(/\D/g, '').slice(0, 5);
      if (['street', 'unit', 'zip', 'notes'].includes(t.id)) d[t.id] = t.value;
    });
    holder.addEventListener('change', (e) => { if (e.target.id === 'make-default') d.makeDefault = e.target.checked; });

    const save = () => {
      if (holder.dataset.locked === 'true') return;
      for (const k of ['street', 'unit', 'zip', 'notes']) d[k] = holder.querySelector(`#${k}`).value.trim();
      const errors = A.addressErrors(d);
      if (Object.keys(errors).length) {                                    // a field problem: under the field, focus on the first
        swap(errors);
        holder.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }
      swap({}, true);
      withLatency(() => {
        if (!holder.isConnected) return;
        const fields = { label: d.label, street: d.street, unit: d.unit, zip: d.zip, notes: d.notes };
        const res = d.editId ? A.updateAddress(d.editId, fields) : A.addAddress({ ...fields, makeDefault: d.makeDefault });
        if (!res.ok) {                                                     // the model said no: show it where it belongs
          swap(res.errors ?? {});
          holder.querySelector('[aria-invalid="true"]')?.focus();
          return;
        }
        close({ instant: true });
        go(ID);
        toast(d.editId ? 'Address updated' : 'Address saved');
      });
    };
    holder.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="save-address"]')) { e.preventDefault(); save(); }
    });
    holder.addEventListener('submit', (e) => { e.preventDefault(); save(); });
    holder.querySelector('#street')?.focus();
  });
}

function wire(root) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || e.target.closest('.screen-sheet--overlay')) return;
    switch (el.dataset.act) {
      case 'add': openAdd(); break;
      case 'address': openRow(el.dataset.id); break;
      default: break;
    }
  });
}

register(ID, view, wire);
