/* ============================================================
   c-cards — Payment methods. Choose which card pays and remove the ones you no longer use, safely.
   Focal: the default card row. One sheet per card (Make default · Remove card → confirm in place, D-134);
   a card paying for an open booking can only go when another card exists — the booking moves to it.
   Spec: M5-spec.md §C3.
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, tailorById } from '../state.js';
import {
  chrome, headingRow, listRow, actionBar, emptyState, banner, cardFields, cta, textLink, sectionHead, sheetOverlay, toast, esc, tag,
} from '../components.js';
import { ICON_CARD } from '../icons.js';
import { withLatency } from '../sim.js';
import { fmtWhen } from '../dates.js';
import { fmtExact } from '../money.js';
import * as A from '../account.js';

const ID = 'c-cards';

const cards = () => state.customer.cards ?? [];
const label = (c) => `${c.brand} •••• ${c.last4}`;
/* the masked number reads digit by digit: last-4 in Geist Mono (V6-D-21) */
const labelHtml = (c) => `${esc(c.brand)} •••• <span class="mono">${esc(c.last4)}</span>`;
const firstName = (t) => (t?.name || 'your tailor').split(' ')[0];

/* ---------- the list ---------- */
function view() {
  const list = cards();
  const rows = list.map((c) => listRow({
    title: labelHtml(c), sub: `Expires ${esc(c.exp)}`, act: 'card', attrs: `data-id="${esc(c.id)}"`, lead: ICON_CARD,
    right: c.default ? tag('Default', 'grey', { cls: `${ID}__tag` }) : '',
  })).join('');
  const cardsBlock = list.length
    ? `<div class="${ID}__list card card--list">${rows}</div>`
    : `<div class="${ID}__empty" data-empty="cards">${emptyState({
      title: 'No cards saved', body: 'Add a card to pay deposits and balances. Apple Pay works too.', ctaLabel: 'Add a card', ctaAct: 'add', art: 'Accessories',
    })}</div>`;
  const apple = state.customer.applePay === false ? '' : `<section class="sec">${sectionHead('Other ways to pay')}
  <div class="${ID}__list card card--list">${listRow({ title: 'Apple Pay', sub: 'Set up in Wallet on this phone', lead: '<span class="pay-badge">Pay</span>', chevron: false })}</div></section>`;
  return `${chrome('account')}<main class="body${list.length ? ' body--with-bar' : ''} ${ID}" data-s="${ID}">
  ${headingRow('<h1 class="t-title">Payment methods</h1>')}
  <section class="sec sec--first">${sectionHead('Cards')}
  ${cardsBlock}</section>
  ${apple}
</main>${list.length ? actionBar({ ctaLabel: 'Add a card', ctaAct: 'add' }) : ''}`;
}

/* ---------- sheet bodies ---------- */
/** Who the card is paying for, and where the booking goes if it's removed. */
function usage(c) {
  const appt = A.cardInUse(c.id);
  const rest = cards().filter((x) => x.id !== c.id);
  const next = c.default ? rest[0] : (rest.find((x) => x.default) ?? rest[0]);
  const t = appt ? tailorById(appt.tailorId) : null;
  return { appt, rest, next: next ?? null, who: firstName(t), when: appt ? fmtWhen(appt.slot.start) : '' };
}

function cardHtml(c, { busy = false, error = '' } = {}) {
  const u = usage(c);
  const stuck = !!u.appt && !u.rest.length;                 // the only card, paying for an open booking: no Remove (D-134)
  return `<div class="${ID}-sheet" data-view="card">
  <p class="t-body c-muted ${ID}-sheet__sub">Expires ${esc(c.exp)}</p>
  ${u.appt ? `<p class="t-body ${ID}-sheet__use">Paying for your booking with ${esc(u.who)} on <span class="${ID}-sheet__when">${esc(u.when)}</span>.</p>` : ''}
  ${stuck ? `${banner({ tone: 'warning', text: 'You need a card on file while a booking is open. Add another card first, then you can remove this one.' })}
  <div class="${ID}-sheet__links">${textLink('Add a card', { act: 'add-from-sheet' })}</div>` : ''}
  ${error ? banner({ tone: 'error', title: error, text: 'Nothing changed.' }) : ''}
  <div class="${ID}-sheet__links">
    ${c.default ? '' : textLink(busy ? 'Updating…' : 'Make default', { act: 'make-default', disabled: busy })}
    ${stuck ? '' : textLink('Remove card', { act: 'remove', tone: 'danger', disabled: busy })}
  </div>
</div>`;
}

function confirmHtml(c, { busy = false, error = '' } = {}) {
  const u = usage(c);
  const nextLabel = u.next ? label(u.next) : '';
  const nb = (t) => `<span class="${ID}-sheet__nowrap">${esc(t)}</span>`;   // R5-1-C-05: never break inside a card name or a date
  const lines = [];
  if (u.appt && u.next) lines.push(`The <span class="${ID}-sheet__nowrap" data-money>${fmtExact(u.appt.money.balance)}</span> balance for your booking with ${esc(u.who)} on ${nb(u.when)} will be charged to ${nb(nextLabel)} instead.`);
  if (c.default && u.next) lines.push(`${nb(nextLabel)} becomes your default.`);
  lines.push('You can add it again any time.');
  return `<div class="${ID}-sheet" data-view="confirm">
  <h2 class="t-h2 ${ID}-sheet__title">Remove <span class="${ID}-sheet__nowrap">${esc(label(c))}</span>?</h2>
  <div class="${ID}-sheet__body">${lines.map((l) => `<p class="t-body c-muted">${l}</p>`).join('')}</div>
  ${error ? banner({ tone: 'error', title: error, text: 'Nothing was removed.' }) : ''}
  <div class="${ID}-sheet__actions ${ID}-sheet__actions--stack">
    ${cta('Remove card', { variant: 'danger', busy, busyLabel: 'Removing…', attrs: 'data-act="remove-ok"' })}
    ${cta('Keep card', { variant: 'secondary', disabled: busy, attrs: 'data-act="remove-keep"' })}
  </div>
</div>`;
}

function addHtml(v = {}, errors = {}, busy = false) {
  return `<form class="${ID}-sheet" data-view="add" novalidate>
  <fieldset class="${ID}-sheet__fields"${busy ? ' disabled aria-busy="true"' : ''}>${cardFields({ values: v, errors })}</fieldset>
  <p class="t-small c-muted">Your card is stored by our payment provider, not by Taily.</p>
  ${cta('Save card', { busy, busyLabel: 'Saving…', attrs: 'data-act="save-card"' })}
</form>`;
}

/* ---------- sheet wiring ---------- */
const digits = (s) => String(s).replace(/\D/g, '');
function formatCardInput(el) {
  const d = digits(el.value).slice(0, 16);
  if (el.id === 'cc-number') el.value = d.replace(/(.{4})/g, '$1 ').trim();
  else if (el.id === 'cc-exp') el.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2, 4)}` : d;
  else if (el.id === 'cc-csc') el.value = d.slice(0, 4);
  else if (el.id === 'cc-zip') el.value = d.slice(0, 5);
}

/** Open the sheet on the add form, or on a card (`cardId`). */
function openSheet({ cardId = null } = {}) {
  const c0 = cardId ? cards().find((c) => c.id === cardId) : null;
  const html = c0 ? cardHtml(c0) : addHtml();
  sheetOverlay(html, { header: c0 ? label(c0) : 'Add a card', dataS: c0 ? 'card' : 'add-card', confirm: false }, (holder, close) => {
    const title = holder.querySelector('.sheet__title');
    const body = () => holder.querySelector(`.${ID}-sheet`);
    const lock = (on) => { holder.dataset.locked = on ? 'true' : 'false'; };
    const current = () => cards().find((c) => c.id === cardId);
    const swap = (htmlNext, header, view) => {
      body().outerHTML = htmlNext;
      if (header) title.textContent = header;
      holder.dataset.view = view;
    };
    const gone = () => { close({ instant: true }); go(ID); };      // the card vanished underneath the sheet

    const saveCard = () => {
      if (holder.dataset.locked === 'true') return;
      const f = holder.querySelector('form');
      const v = { number: f.querySelector('#cc-number').value, exp: f.querySelector('#cc-exp').value, cvc: f.querySelector('#cc-csc').value, zip: f.querySelector('#cc-zip').value };
      swap(addHtml(v, {}, true), null, 'add'); lock(true);
      withLatency(() => {
        if (!holder.isConnected) return;
        const res = A.addCard(v);
        lock(false);
        if (!res.ok) {
          swap(addHtml(v, res.errors), null, 'add');
          holder.querySelector('[aria-invalid="true"]')?.focus();
          return;
        }
        if (!cards().some((x) => x.default)) A.setDefaultCard(res.card.id);   // Sarah's first card is her default
        close({ instant: true });
        go(ID);
        toast('Card added');
      });
    };

    const removeCard = () => {
      if (holder.dataset.locked === 'true') return;
      const c = current();
      if (!c) { gone(); return; }
      swap(confirmHtml(c, { busy: true }), 'Remove card', 'confirm'); lock(true);
      withLatency(() => {
        if (!holder.isConnected) return;
        const res = A.removeCard(c.id);
        lock(false);
        if (!res.ok) {                                                       // action failed: the banner sits above the buttons, the button stays on
          const why = res.error === 'in-use' ? 'This card is paying for your open booking' : 'Couldn’t remove this card';
          swap(confirmHtml(c, { error: why }), 'Remove card', 'confirm');
          return;
        }
        close({ instant: true });
        go(ID);
        toast('Card removed');
      });
    };

    const makeDefault = () => {
      if (holder.dataset.locked === 'true') return;
      const c = current();
      if (!c) { gone(); return; }
      swap(cardHtml(c, { busy: true }), null, 'card'); lock(true);
      withLatency(() => {
        if (!holder.isConnected) return;
        A.setDefaultCard(c.id);
        lock(false);
        close({ instant: true });
        go(ID);
        toast('Default card updated');
      });
    };

    holder.dataset.view = c0 ? 'card' : 'add';
    holder.addEventListener('input', (e) => { if (e.target.matches('#cc-number, #cc-exp, #cc-csc, #cc-zip')) formatCardInput(e.target); });
    holder.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      switch (a.dataset.act) {
        case 'make-default': makeDefault(); break;
        case 'remove': { const c = current(); if (c) { swap(confirmHtml(c), 'Remove card', 'confirm'); holder.querySelector('[data-act="remove-keep"]')?.focus(); } break; }
        case 'remove-ok': removeCard(); break;
        case 'remove-keep': { const c = current(); if (c) { swap(cardHtml(c), label(c), 'card'); holder.querySelector('[data-act="remove"]')?.focus(); } break; }
        case 'add-from-sheet': swap(addHtml(), 'Add a card', 'add'); holder.querySelector('#cc-number')?.focus(); break;
        case 'save-card': e.preventDefault(); saveCard(); break;
        default:
      }
    });
    holder.addEventListener('submit', (e) => { e.preventDefault(); saveCard(); });
  });
}

function wire(root) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || e.target.closest('.screen-sheet--overlay')) return;
    if (el.dataset.act === 'card') openSheet({ cardId: el.dataset.id });
    else if (el.dataset.act === 'add') openSheet();
  });
}

register(ID, view, wire);
