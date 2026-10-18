/* ============================================================
   c-pay — C5b Review and send request (booking step 5 of 5; holds the deposit and sends the request; title per D-52).
   Focal: the CTA "Hold $16.00 and send request". The deposit is only HELD
   here (authorized) and charged when the tailor accepts (D-38).
   Booking draft: state.ui.booking { tailorId, slot, cardId } (D-36).
   Screen-local flags: state.ui['c-pay'] { busy, error, info, focus }.
   ============================================================ */
import { register, render as go, back } from '../app.js';
import { state, T, tailorById, openSlots, now, priceChangeView, coversJob } from '../state.js';
import {
  flowBar, headingRow, visitBlock, customerBreakdown, infoCard, metaRow, methodRow, actionBar, banner,
  emptyState, sheetOverlay, optionRow, listRow, field, cta, toast, esc, changeList, withPhotos, wirePhotoViewer, sectionHead, textLink, infoButton,
} from '../components.js';
import * as A from '../account.js';
import { withLatency } from '../sim.js';
import { fmtExact, estimate, cancelTerms } from '../money.js';
import { fmtWhen, addMinutes, toDate } from '../dates.js';
import { VISIT_LABEL, VISIT_MINUTES } from '../data.js';
import { POLICY } from '../money-config.js';

const ID = 'c-pay';

const ui = () => (state.ui[ID] ??= {});
const booking = () => (state.ui.booking ??= {});
const firstOf = (t) => (t?.name || 'The tailor').split(' ')[0];
const money = (cents) => `<span data-money>${fmtExact(cents)}</span>`;

const CARD_GLYPH = '<svg width="28" height="20" viewBox="0 0 28 20" fill="none" aria-hidden="true"><rect x="0.75" y="0.75" width="26.5" height="18.5" rx="3.25" stroke="currentColor" stroke-width="1.5"/><path d="M1 6.5h26" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 14h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const GLYPH = {
  lock: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" stroke-width="1.5"/></svg>',
  clock: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.5V8l2.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 8.2l1.8 1.8 3.2-3.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  warn: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2.2l6.2 11H1.8L8 2.2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6.6v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="11.6" r="0.9" fill="currentColor"/></svg>',
};

/** The cancellation promise for THIS slot, from the model (D-50): free until the cutoff, or already inside the late window. */
function cancelRow(slot, depositCents, first) {
  const terms = cancelTerms({ slot: { start: slot }, payments: { deposit: { cents: depositCents } } }, now());
  if (terms.window === 'late') {
    return metaRow(GLYPH.warn, `This visit is less than ${POLICY.CANCEL_WINDOW_H} hours away. If you cancel after ${esc(first)} accepts, ${esc(first)} keeps the ${money(depositCents)} deposit.`);
  }
  const cutoff = addMinutes(slot, -POLICY.CANCEL_WINDOW_H * 60);
  return metaRow(GLYPH.check, `Free cancellation until ${fmtWhen(cutoff)}. After that, ${esc(first)} keeps the ${money(depositCents)} deposit.`);
}

/** SF-04: the reminder and its auto-cancel, said before she pays — only when a reminder will go out (the visit is at least
    CANCEL_WINDOW_H + REMINDER_LEAD_H away, D-296). */
function reminderRow(slot, depositCents, first) {
  const away = toDate(slot).getTime() - now();
  if (away < (POLICY.REMINDER_LEAD_H + POLICY.CANCEL_WINDOW_H) * 3600000) return '';
  return metaRow(GLYPH.clock, `We’ll text you the day before to confirm. If you don’t confirm ${POLICY.REMINDER_AUTOCANCEL_H} hours before the visit, we cancel it and ${esc(first)} keeps the ${money(depositCents)} deposit.`);
}

/* ---------- data ---------- */
function read() {
  const t = tailorById(state.ui.booking?.tailorId) ?? state.tailors[0];
  const job = state.job;
  const slots = openSlots(t.id, job.visitType, { until: job.needBy });
  const slot = state.ui.booking?.slot ?? slots[0] ?? null;
  const q = slot ? estimate(t, job, slot) : null;
  const c = state.customer;
  const methods = [
    ...c.cards.map((x) => ({ id: x.id, label: `${x.brand} •••• ${x.last4}`, sub: `Expires ${x.exp}`, kind: 'card' })),
    ...(c.applePay ? [{ id: 'apple-pay', label: 'Apple Pay', sub: '', kind: 'apple' }] : []),
  ];
  const def = c.cards.find((x) => x.default) ?? c.cards[0];
  const wanted = state.ui.booking?.cardId ?? def?.id ?? 'apple-pay';
  const method = methods.find((m) => m.id === wanted) ?? methods[0];
  return { t, job, slot, q, methods, method };
}

function visitRows({ t, job, slot }) {
  const home = job.visitType === 'home';
  const a = job.address ?? state.customer.address;
  const where = home
    ? [a.street, a.unit, a.city].filter(Boolean).join(', ')
    : [t.shopName, t.shop?.street].filter(Boolean).join(', ');
  const items = job.garments.length;
  const services = job.garments.reduce((n, g) => n + g.services.length, 0);
  /* K-10: icon rows — the visit time is the one strong fact; the tailor and the visit type ride under it */
  return [
    { icon: 'calendar', value: fmtWhen(slot), strong: true, detail: [`With ${esc(t.name)}`, `${VISIT_LABEL.customer[job.visitType]} · ${VISIT_MINUTES[job.visitType]} min`] },
    { icon: home ? 'home' : 'shop', value: esc(where) },
    { icon: 'hanger', value: `${items} ${items === 1 ? 'item' : 'items'} · ${services} ${services === 1 ? 'service' : 'services'}` },
  ];
}

/** C-06: "Your order" — the same plain rows c-booking shows once the order is approved, here from the estimate's lines. */
function orderBlock({ job }, q) {
  if (!q.lines?.length) return '';
  const pseudo = { lines: q.lines, money: q, payments: { deposit: { cents: q.deposit } }, job };
  const garments = withPhotos(priceChangeView(pseudo, q.lines).garments, job);
  return `<section class="sec" aria-labelledby="pay-h-order">${sectionHead('Your order', { id: 'pay-h-order' })}
  <div class="c-pay__order">${changeList({ garments })}</div></section>`;
}

/* ---------- view ---------- */
function alertHtml(r) {
  const u = ui();
  if (!coversJob(r.t, state.job)) u.error = 'services';   // K-48.2: she stopped pricing an item since Sarah picked her — said before she pays
  if (u.error === 'declined') {
    return banner({ tone: 'error', title: 'Your card was declined', text: `${esc(r.method.label)} didn’t go through, and nothing was held.` });
  }
  if (u.error === 'taken') {
    return banner({ tone: 'error', text: 'That time was just taken. Pick another time.', actionLabel: 'Pick a time', actionAct: 'pick-time' });
  }
  if (u.error === 'services') {
    /* B-13 / K-48.2 (D-354): she changed her prices since — its own message and a way on, not "something went wrong" */
    return banner({ tone: 'error', title: `${esc(r.t.name.split(' ')[0])} doesn’t offer every service you picked`, text: 'Nothing was held. Pick another tailor or change your items.', actionLabel: 'See other tailors', actionAct: 'other-tailors' });
  }
  if (u.error === 'generic') {
    return banner({ tone: 'error', text: 'Something went wrong on our side. Nothing was held. Try again.' });
  }
  if (u.info === '3ds-cancelled') {
    return banner({ tone: 'info', text: 'Verification cancelled. Nothing was held.' });
  }
  return '';
}

function view() {
  const r = read();
  const { t, q, method } = r;
  const first = firstOf(t);
  const busy = !!ui().busy;
  const head = flowBar({ step: 4, busy });
  if (!q) {
    return `${head}<main class="body ${ID}" data-s="${ID}">
  ${headingRow('<h1 class="t-title">Review and send request</h1>', { back: false })}
  <div class="c-pay__empty">${emptyState({ title: 'Pick a time first', body: `Choose one of ${first}’s open times, then come back to review the price.`, ctaLabel: 'Pick a time', ctaAct: 'pick-time' })}</div>
</main>`;
  }
  const u = ui();
  const alert = alertHtml(r);
  const methodBtn = methodRow(`<span class="c-pay__method-name">${esc(method.label)}</span>${method.sub ? `<span class="c-pay__method-sub">${esc(method.sub)}</span>` : ''}`, method.kind)
    .replace('<button type="button" class="method-row"', `<button type="button" class="method-row c-pay__method" data-act="change-method"${busy ? ' disabled aria-disabled="true"' : ''}`);

  return `${head}<main class="body body--with-bar ${ID}" data-s="${ID}"${busy ? ' aria-busy="true"' : ''}>
  ${headingRow('<h1 class="t-title">Review and send request</h1>', { back: false })}
  <section class="sec c-pay__visit" aria-label="Your visit">
    ${visitBlock(visitRows(r), { title: 'Your visit', flush: true, action: textLink('Change time', { act: 'back', disabled: busy }) })}
  </section>
  ${orderBlock(r, q)}
  <section class="sec" aria-labelledby="pay-h-price">
    ${sectionHead('Price', { id: 'pay-h-price', aside: infoButton('deposit', { label: 'About the deposit' }) })}
    ${customerBreakdown(q, { stage: 'estimate', tailorFirst: first, depositState: 'to-hold' })}
  </section>
  <section class="sec c-pay__hold" aria-label="The deposit hold">${infoCard([
    metaRow(GLYPH.lock, `We hold ${money(q.deposit)} now. You’re only charged if ${esc(first)} accepts. If ${esc(first)} declines or doesn’t reply, it’s released in full.`),
    cancelRow(r.slot, q.deposit, first),
    reminderRow(r.slot, q.deposit, first),
  ].join(''))}</section>
  <section class="sec" aria-labelledby="pay-h-method">
    ${sectionHead('Pay with', { id: 'pay-h-method' })}
    ${methodBtn}
  </section>
  <div class="c-pay__alert" tabindex="-1">${alert}</div>
</main>
${actionBar({
    /* C-11: after a decline the failed card is still the one selected — the bar offers another card, never a silent retry */
    ctaLabel: u.error === 'declined' ? 'Use another card' : `Hold ${fmtExact(q.deposit)} and send request`, ctaAct: u.error === 'declined' ? 'change-method' : 'pay', busy, busyLabel: 'Sending request…',
    disabled: u.error === 'services', note: u.error === 'services' ? `${esc(first)} doesn’t offer every service you picked` : '',   // K-48.2 (D-354)
  })}`;
}

/* ---------- sheets ---------- */
const CARD_ERR = {
  number: 'Enter the full card number.',
  exp: 'Enter a valid expiry, like 08/28.',
  cvc: 'Enter the 3 or 4 digit code.',
  zip: 'Enter a 5-digit ZIP code.',
};

/* a dashed card outline with a plus — the add row's lead, the same 32 px column as the option rows' glyphs */
const ADD_CARD_GLYPH = '<svg width="28" height="20" viewBox="0 0 28 20" fill="none" aria-hidden="true"><rect x="0.75" y="0.75" width="26.5" height="18.5" rx="3.25" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2.5"/><path d="M14 6v8M10 10h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

function methodSheetHtml({ methods, method }) {
  return `<div class="c-pay-sheet" data-view="method">
  <div class="c-pay-sheet__group" role="radiogroup" aria-label="Pay with">${methods.map((m) => optionRow({
    name: 'method', value: m.id, title: esc(m.label), sub: esc(m.sub), checked: m.id === method.id, act: 'method',
    lead: m.kind === 'apple' ? '<span class="pay-badge">Pay</span>' : CARD_GLYPH,
  })).join('')}</div>
  ${listRow({ title: 'Add a card', act: 'add-card', lead: ADD_CARD_GLYPH })}
</div>`;
}

function addCardHtml(v = {}, errors = {}) {
  return `<form class="c-pay-sheet c-pay-sheet--card" data-view="add-card" novalidate>
  ${field({ id: 'cc-number', label: 'Card number', value: v.number ?? '', inputmode: 'numeric', autocomplete: 'cc-number', placeholder: '1234 1234 1234 1234', maxlength: 19, error: errors.number ? CARD_ERR.number : '' })}
  <div class="c-pay-sheet__pair">
    ${field({ id: 'cc-exp', label: 'Expiry', value: v.exp ?? '', inputmode: 'numeric', autocomplete: 'cc-exp', placeholder: 'MM/YY', maxlength: 5, error: errors.exp ? CARD_ERR.exp : '' })}
    ${field({ id: 'cc-csc', label: 'Security code', value: v.cvc ?? '', inputmode: 'numeric', autocomplete: 'cc-csc', maxlength: 4, helper: '3 or 4 digits on the back', error: errors.cvc ? CARD_ERR.cvc : '' })}
  </div>
  ${field({ id: 'cc-zip', label: 'ZIP code', value: v.zip ?? '', inputmode: 'numeric', autocomplete: 'postal-code', maxlength: 5, error: errors.zip ? CARD_ERR.zip : '' })}
  <p class="t-small c-600 c-pay-sheet__note">Your card is stored by our payment provider, not by Taily.</p>
  ${cta('Save card', { attrs: 'data-act="save-card"' })}
</form>`;
}

function threeDsHtml({ q, method }, busy = false) {
  return `<div class="c-pay-sheet" data-view="3ds">
  <p class="t-body">Your bank asks you to confirm this hold.</p>
  <div class="c-pay-sheet__bank">
    <span class="t-small c-600 w-600">Taily</span>
    <span class="t-money t-money--md" data-money>Hold ${fmtExact(q.deposit)}</span>
    <span class="t-small c-600">${esc(method.label)}</span>
  </div>
  ${cta('Confirm', { busy, busyLabel: 'Confirming…', attrs: 'data-act="3ds-ok"' })}
  ${cta('Cancel', { variant: 'secondary', disabled: busy, attrs: 'data-act="3ds-cancel"' })}
</div>`;
}

const digits = (s) => String(s).replace(/\D/g, '');
function formatCardInput(el) {
  const d = digits(el.value).slice(0, 16);
  if (el.id === 'cc-number') el.value = d.replace(/(.{4})/g, '$1 ').trim();
  else if (el.id === 'cc-exp') el.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2, 4)}` : d;
  else if (el.id === 'cc-csc') el.value = d.slice(0, 4);
  else if (el.id === 'cc-zip') el.value = d.slice(0, 5);
}

function openMethodSheet() {
  sheetOverlay(methodSheetHtml(read()), { header: 'Pay with', dataS: 'c-pay--method', confirm: false }, (holder, close) => {
    const title = holder.querySelector('.sheet__title');
    const swap = (html, header, view) => {
      holder.querySelector('.c-pay-sheet').outerHTML = html;
      title.textContent = header;
      holder.dataset.view = view;
    };
    const saveCard = () => {
      const f = holder.querySelector('form');
      const v = { number: f.querySelector('#cc-number').value, exp: f.querySelector('#cc-exp').value, cvc: f.querySelector('#cc-csc').value, zip: f.querySelector('#cc-zip').value };
      const res = A.addCard(v);
      if (!res.ok) {
        swap(addCardHtml(v, res.errors), 'Add a card', 'add-card');
        holder.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }
      booking().cardId = res.card.id;
      if (ui().error === 'declined') ui().error = null;
      close();
      go(ID);
      toast('Card added');
    };
    holder.dataset.view = 'method';
    holder.addEventListener('input', (e) => { if (e.target.matches('#cc-number, #cc-exp, #cc-csc, #cc-zip')) formatCardInput(e.target); });
    holder.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      switch (a.dataset.act) {
        case 'method': {
          const prev = read().method.id;
          const id = a.dataset.value;
          booking().cardId = id;
          if (ui().error === 'declined' && id !== prev) { A.useOtherMethod(); ui().error = null; }
          close();
          go(ID);
          break;
        }
        case 'add-card': swap(addCardHtml(), 'Add a card', 'add-card'); holder.querySelector('#cc-number')?.focus(); break;
        case 'save-card': saveCard(); break;
        default:
      }
    });
    holder.addEventListener('submit', (e) => { e.preventDefault(); saveCard(); });
  });
}

/* ---------- paying ---------- */
let cancelWait = null;
const onScreen = () => document.getElementById('screen')?.dataset.screen === ID;

/** The request went through: clear the draft and leave the booking behind (Back can't return to a paid form). */
function sent() {
  state.ui.booking = {};
  delete state.ui[ID];
  go('c-request', { fresh: true });
}

/** Ask the model to send the request. `done(res)` runs after the simulated wait. */
function attempt({ threeDS = false } = {}, done) {
  const { t, slot, method } = read();
  const res = T.requestBooking({ tailorId: t.id, slotStart: slot, cardId: method.id, ...(threeDS ? { threeDS: true } : {}) });
  done(res);
}

function fail(res) {
  const u = ui();
  u.busy = false;
  u.focus = true;
  if (res.error === 'card-declined') u.error = 'declined';
  else if (res.error === 'slot-unavailable') u.error = 'taken';
  else if (res.error === 'service-not-offered' || res.error === 'services') u.error = 'services';
  else u.error = 'generic';
  /* D-140: the banner above the Pay button carries the error; the toast only echoes it (never the only carrier) */
  if (res.error === 'server-error') toast('Couldn’t send your request', { tone: 'error' });
  go(ID);
}

function openThreeDs() {
  const r = read();
  const cancel = () => { const u = ui(); u.busy = false; u.error = null; u.info = '3ds-cancelled'; u.focus = true; go(ID); };
  sheetOverlay(threeDsHtml(r), { header: 'Confirm with your bank', dataS: 'c-pay--3ds', confirm: false }, (holder, close) => {
    let working = false;
    const confirm = () => {
      if (working) return;
      working = true;
      holder.querySelector('.c-pay-sheet').outerHTML = threeDsHtml(r, true);
      cancelWait = withLatency(() => {
        attempt({ threeDS: true }, (res) => {
          close();
          if (res.ok) sent(); else fail(res);
        });
      });
    };
    holder.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a || working) return;
      if (a.dataset.act === '3ds-ok') confirm();
      else if (a.dataset.act === '3ds-cancel' || a.dataset.act === 'sheet-cancel') { close(); cancel(); }
    });
  });
}

function pay() {
  const u = ui();
  if (u.busy) return;
  u.busy = true; u.error = null; u.info = null;
  go(ID);
  cancelWait?.();
  cancelWait = withLatency(() => {
    if (!onScreen()) { u.busy = false; return; }
    attempt({}, (res) => {
      if (res.ok) { sent(); return; }
      if (res.error === 'needs-3ds') { u.busy = false; go(ID); openThreeDs(); return; }
      fail(res);
    });
  });
}

/* ---------- wire ---------- */
/* #screen is the same element on every render — drop the previous render's delegate before adding ours */
let offClick = null;

function wire(root) {
  const u = ui();
  wirePhotoViewer(root);   // the item rows' customer-photo stacks (K-04)
  /* Back → the time picker (steps history when there is one) */
  const backBtn = root.querySelector('.back[data-act="back"]');
  if (backBtn) {
    backBtn.dataset.wired = '1';
    if (u.busy) { backBtn.disabled = true; backBtn.setAttribute('aria-disabled', 'true'); }
    backBtn.addEventListener('click', () => { if (!back()) go('c-book'); });
  }
  if (u.focus) {
    u.focus = false;
    root.querySelector('.c-pay__alert')?.focus({ preventScroll: false });
  }

  offClick?.();
  const onClick = (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || a.classList.contains('back') || e.target.closest('.screen-sheet--overlay')) return;
    switch (a.dataset.act) {
      case 'back': if (!back()) go('c-book'); break;
      case 'change-method': if (!ui().busy) openMethodSheet(); break;
      case 'pay': pay(); break;
      case 'pick-time': go('c-book', { replace: true }); break;
      case 'other-tailors': ui().error = null; go('c-tailors'); break;
      default:
    }
  };
  root.addEventListener('click', onClick);
  offClick = () => root.removeEventListener('click', onClick);
}

register(ID, view, wire);
