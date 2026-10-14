/* ============================================================
   c-ready — C10 pick a way back, then pay the balance.
   Focal: the "How do you want it back?" radio group; the amount lives in the Pay button.
   Only the options Amara offers for this order render (returnOffer); nothing is pre-chosen
   unless there is exactly one. The Taily courier is three dollar lines before Pay enables.
   Which appointment: focusAppt (D-72). Screen-local flags: state.ui['c-ready'] { apptId, quoting, cardId }.
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, T, tailorById, returnOffer, returnAddress, priceChangeView } from '../state.js';
import {
  chrome, headingRow, statusHero, customerBreakdown, moneyRows, courierCard, optionRow, actionBar, banner, emptyState,
  sheetOverlay, cta, toast, esc, changeList, linkRow,
} from '../components.js';
import * as A from '../account.js';
import { withLatency } from '../sim.js';
import { fmtExact } from '../money.js';
import { RETURN_LABEL, ZIP_INFO } from '../data.js';
import { META_ICONS } from '../icons.js';
import { focusAppt, setFocus, redirectIfMoved } from '../focus.js';

const ID = 'c-ready';

const firstOf = (t) => (t?.name || 'The tailor').split(' ')[0];
const nb = (text) => `<span class="nb">${esc(text)}</span>`;
const money = (cents) => `<span data-money>${fmtExact(cents)}</span>`;
const ICON = { pickup: META_ICONS.bag, dropoff: META_ICONS.home, courier: META_ICONS.truck };
const CARD_GLYPH = '<svg width="28" height="20" viewBox="0 0 28 20" fill="none" aria-hidden="true"><rect x="0.75" y="0.75" width="26.5" height="18.5" rx="3.25" stroke="currentColor" stroke-width="1.5"/><path d="M1 6.5h26" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 14h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

/** Screen-local flags, scoped to the appointment on screen (a different order starts clean). */
function ui(a) {
  const u = (state.ui[ID] ??= {});
  if (a && u.apptId !== a.id) { Object.keys(u).forEach((k) => delete u[k]); u.apptId = a.id; }
  return u;
}

const streetOf = returnAddress;   // one address line on both sides (R4-2-C-06)

/* ---------- data ---------- */
function read() {
  const a = focusAppt(ID);
  if (!a) return null;
  const t = tailorById(a.tailorId) ?? state.tailors[0];
  const u = ui(a);
  const offered = returnOffer(a);
  /* a courier quote in flight IS the choice (R4-2-C-01): the row checks, the skeleton shows and Pay waits */
  const sel = u.quoting ? 'courier' : (a.returnOption ?? (offered.length === 1 ? offered[0] : null));
  const c = a.courier;
  const courierState = sel === 'courier' ? (u.quoting || c?.state === 'loading' || !c ? 'loading' : c.state) : null;
  const failed = a.payments.balance.state === 'failed';
  const cards = state.customer.cards ?? [];
  const methods = [
    ...cards.map((x) => ({ id: x.id, label: `${x.brand} •••• ${x.last4}`, sub: `Expires ${x.exp}`, kind: 'card' })),
    ...(state.customer.applePay ? [{ id: 'apple-pay', label: 'Apple Pay', sub: '', kind: 'apple' }] : []),
  ];
  const def = cards.find((x) => x.default) ?? cards[0];
  /* after a decline, "Pay another way" must not start on the card that was just declined (R4-2-C-04) */
  const failedId = failed ? (a.payments.balance.failedCardId ?? u.cardId ?? def?.id ?? null) : null;
  if (failedId) {
    const m = methods.find((x) => x.id === failedId);
    if (m) m.declined = true;
  }
  const want = u.cardId && u.cardId !== failedId ? u.cardId
    : failedId ? (methods.find((x) => x.id !== failedId)?.id ?? failedId)
      : (def?.id ?? 'apple-pay');
  const method = methods.find((m) => m.id === want) ?? methods[0];
  return { a, t, u, first: firstOf(t), offered, sel, c, courierState, failed, failedId, methods, method };
}

function subOf(k, r) {
  const { t, first, c, courierState } = r;
  /* nowrap segments (D-69(4)): a line breaks between them, never inside one, so "Free" or "it" can't be left alone */
  if (k === 'pickup') return `${nb(t.shopName)} ${nb(`· ${t.shop?.street ?? ''} · Free`)}`;
  if (k === 'dropoff') return `${esc(first)} brings it to ${nb(`${streetOf()} · Free`)}`;
  if (r.sel === 'courier' && courierState === 'ready') return `${money(c.cents)} · delivered today`;
  if (r.sel === 'courier' && courierState === 'loading') return 'Getting a price…';
  if (r.sel === 'courier' && courierState === 'failed') return 'Price unavailable';
  return `${nb('Uber, today')} · ${nb('priced when you choose it')}`;
}

function disabledNote(r) {
  if (!r.sel) return 'Choose how to get it back first.';
  if (r.sel === 'courier' && r.courierState === 'loading') return 'Waiting for the courier price.';
  if (r.sel === 'courier' && r.courierState === 'failed') return 'Try the courier price again, or pick another way back.';
  return '';
}

/* ---------- view ---------- */
/** "Your order" (K-2-01, D-127): what the balance pays for — the approved lines, plain rows, as on c-booking and Amara's "The work". */
function orderSection(a) {
  if (!a.lines?.length) return '';
  const added = new Set(a.job.garments.filter((g) => g.added).map((g) => g.id));
  const garments = priceChangeView(a, a.lines).garments.map((g) => (added.has(g.id) ? { ...g, newItem: true } : g));
  return `<h2 class="t-h2 ${ID}__h2 ${ID}__h2--order">Your order</h2>
  <div class="${ID}__order">${changeList({ garments })}</div>`;
}

function view() {
  const head = chrome('bookings');
  const r = read();
  if (!r) {
    return `${head}<main class="body ${ID}" data-s="${ID}">
  ${headingRow('<h1 class="t-title">Your order</h1>', { backRow: true })}
  <div class="${ID}__empty" data-empty="ready">${emptyState({ title: 'Nothing to pay right now', body: 'When a tailor finishes your order, it shows up here.', ctaLabel: 'Back to Bookings', ctaAct: 'bookings' })}</div>
</main>`;
  }
  const { a, t, first, offered, sel, c, courierState, failed } = r;
  const pillCard = r.methods.find((m) => m.id === r.failedId)?.label ?? 'card';
  const off = !sel || (sel === 'courier' && courierState !== 'ready');
  const zero = a.money.balance === 0;                                     // D-156: the final order is worth less than the deposit
  const refund = a.money.refund;
  const confirming = !!r.u.confirming;
  /* one way back offered → nothing to choose (R4-1-C-05, D-113) */
  const only = offered.length === 1 ? offered[0] : null;
  const LINE_FOR = { pickup: `pick it up at ${esc(t.shopName)}`, dropoff: `${esc(first)} brings it to your door`, courier: 'a courier brings it today' };
  const hero = headingRow(statusHero({
    variant: 'ready', pill: 'action', pillLabel: 'Ready', title: 'Your order is ready',
    body: zero && refund > 0
      ? `${esc(first)} finished the work. Your final total is less than your deposit, so ${fmtExact(refund)} comes back to your card.`
      : zero
        ? (only ? `${esc(first)} finished the work. Nothing is left to pay, then ${LINE_FOR[only]}.` : `${esc(first)} finished the work. Choose how to get it back. Nothing is left to pay.`)
        : only
          ? `${esc(first)} finished the work. Pay the balance, then ${LINE_FOR[only]}.`
          : `${esc(first)} finished the work. Choose how to get it back, then pay the balance.`,
  }), { backRow: true });
  /* C-11: one decline pattern (D-140) — the banner sits directly above the action bar, the way forward is another card */
  const alert = failed && !zero
    ? `<div class="${ID}__alert">${banner({ tone: 'error', title: 'Your card was declined', text: `${esc(pillCard)} didn’t go through, and nothing was charged.`, actionLabel: 'Use another card', actionAct: 'pay' })}</div>`
    : '';
  const sameCard = failed && r.method?.id === r.failedId;                 // the failed card is still the one selected
  const rows = offered.map((k) => optionRow({
    name: 'return', value: k, title: esc(RETURN_LABEL[k]), sub: subOf(k, r), checked: sel === k, lead: ICON[k], act: 'return',
  })).join('');
  const single = offered.length === 1
    ? `<p class="t-small c-600 ${ID}__single">${esc(first)} offers ${esc(RETURN_LABEL[offered[0]].toLowerCase())} for this order.</p>` : '';
  const courier = sel === 'courier'
    ? `<div class="${ID}__courier">${courierCard({
      state: courierState, ...(courierState === 'ready' ? c : { miles: c?.miles ?? ZIP_INFO[a.job.zip]?.miles ?? 0 }),   // the distance is known before the price
      from: t.shopName, to: streetOf(), note: 'Added to your balance.',
    })}${courierState === 'failed' && offered.length === 1 ? linkRow(`Message ${first}`, { attrs: 'data-act="message"' }) : ''}</div>` : '';
  return `${head}<main class="body body--with-bar ${ID}" data-s="${ID}">
  ${hero}
  <h2 class="t-h2 ${ID}__h2" id="ready-ways">${only ? 'Getting it back' : 'How do you want it back?'}</h2>
  <div class="${ID}__group" role="radiogroup" aria-labelledby="ready-ways">${rows}</div>
  ${single}
  ${courier}
  ${orderSection(a)}
  <h2 class="t-h2 ${ID}__h2 ${ID}__h2--price">Price</h2>
  ${customerBreakdown(a.money, { stage: 'ready', tailorFirst: first, depositState: a.payments.deposit.state, confirmed: true })}
  ${alert}
</main>
${actionBar({
    ctaLabel: zero ? (refund > 0 ? `Confirm and get ${fmtExact(refund)} back` : 'Confirm') : sameCard ? 'Use another card' : `Pay ${fmtExact(a.money.balance)}`,
    ctaAct: zero ? 'confirm' : 'pay', disabled: off, busy: confirming, busyLabel: 'Confirming…', note: off ? disabledNote(r) : '',
    secondaryLabel: `Message ${first}`, secondaryAct: 'message',
  })}`;
}

/* ---------- pay sheet ---------- */
function sheetHtml(r, { cardId, busy = false } = {}) {
  const { a, methods } = r;
  const rows = methods.map((m) => optionRow({
    name: 'card', value: m.id, title: esc(m.label), checked: m.id === cardId, act: 'card',
    sub: [m.sub ? esc(m.sub) : '', m.declined ? `<span class="${ID}-sheet__declined c-error w-600">Declined just now</span>` : ''].filter(Boolean).join(' · '),
    lead: m.kind === 'apple' ? '<span class="pay-badge">Pay</span>' : CARD_GLYPH,
  })).join('');
  return `<div class="${ID}-sheet"${busy ? ' aria-busy="true"' : ''}>
  ${moneyRows([{ label: 'Balance', cents: a.money.balance, kind: 'total' }])}
  <p class="t-small c-600">Your ${money(a.payments.deposit.cents)} deposit is already taken off.</p>
  <p class="t-small w-600 c-600">Pay with</p>
  <div class="${ID}-sheet__group" role="radiogroup" aria-label="Pay with"${busy ? ' aria-disabled="true"' : ''}>${rows}</div>
  ${cta(`Pay ${fmtExact(a.money.balance)}`, { busy, busyLabel: 'Paying…', attrs: 'data-act="pay-ok"' })}
</div>`;
}

/* ---------- async ---------- */
let cancelWait = null;
const onScreen = () => document.getElementById('screen')?.dataset.screen === ID;

/** Ask for the courier price (a simulated wait), then show it. `u.quoting` holds the loading state across the re-render. */
function quoteCourier(a) {
  const u = ui(a);
  u.quoting = true;
  go(ID);
  cancelWait?.();
  cancelWait = withLatency(() => {
    u.quoting = false;
    const res = T.chooseReturn(a.id, 'courier');
    if (!onScreen()) return;
    if (!res.ok) toast('That way back is no longer offered.');
    go(ID);
  });
}

function choose(a, k) {
  const u = ui(a);
  u.refocus = k;
  if (k === 'courier') { quoteCourier(a); return; }
  cancelWait?.();
  u.quoting = false;
  const res = T.chooseReturn(a.id, k);
  if (!res.ok) toast('That way back is no longer offered.');
  go(ID);
}

/** D-156: nothing to pay (the final order is worth less than the deposit) — no pay sheet; confirming settles the refund. */
function confirmZero(r) {
  const { a, u } = r;
  if (u.confirming) return;
  u.confirming = true;
  go(ID);
  cancelWait?.();
  cancelWait = withLatency(() => {
    u.confirming = false;
    if (!a.returnOption && r.offered.length === 1 && r.offered[0] !== 'courier') T.chooseReturn(a.id, r.offered[0]);
    const res = T.payBalance(a.id, a.cardId ?? r.method?.id ?? null, { threeDS: true });
    if (!onScreen()) {
      if (res.ok && res.appt.money.refund > 0) toast(`${fmtExact(res.appt.money.refund)} is on its way back to your card.`, { tone: 'success' });
      return;
    }
    if (res.ok) {
      const how = res.appt.returnOption;
      const tail = how === 'pickup' ? ` Ready for pickup at ${r.t.shopName}.`
        : how === 'dropoff' ? ` ${r.first} will drop it off.` : ' Your courier is on the way.';
      setFocus(a.id);
      go('c-booking', { fresh: true });
      toast(res.appt.money.refund > 0 ? `${fmtExact(res.appt.money.refund)} is on its way back to your card.${tail}` : `Confirmed.${tail}`, { tone: 'success' });
    } else {
      go(ID);
      toast('Choose how to get it back first.');
    }
  });
}

function openPay(r) {
  const { a } = r;
  const u = ui(a);
  let cardId = r.method?.id;
  let busy = false;
  sheetOverlay(sheetHtml(r, { cardId }), { header: 'Pay the balance', dataS: `${ID}--pay`, confirm: false }, (holder, close) => {
    /* while paying, the sheet cannot be dismissed (✕, scrim, Escape): closing it would drop the payment (R4-2-C-03) */
    const paint = () => {
      holder.querySelector(`.${ID}-sheet`).outerHTML = sheetHtml(r, { cardId, busy });
      holder.dataset.locked = String(busy);
      const x = holder.querySelector('.sheet__cancel');
      if (x) { x.disabled = busy; if (busy) x.setAttribute('aria-disabled', 'true'); else x.removeAttribute('aria-disabled'); }
    };
    holder.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el || busy) return;
      if (el.dataset.act === 'card') {
        if (el.dataset.value === cardId) return;
        cardId = el.dataset.value;
        u.cardId = cardId;                                          // the decline clears only when paying with another method (pay-ok)
        holder.querySelectorAll('[data-act="card"]').forEach((row) => {
          const on = row.dataset.value === cardId;
          row.classList.toggle('is-checked', on);
          row.setAttribute('aria-checked', String(on));
          row.querySelector('.option-row__check').textContent = on ? '✓' : '';
        });
      } else if (el.dataset.act === 'pay-ok') {
        if (u.quoting) return;                                      // R4-2-C-01: never pay while the courier price is still coming
        if (r.failedId && cardId !== r.failedId) A.useOtherMethod(); // the pre-selected other method clears the decline (D-40)
        busy = true;
        paint();
        cancelWait?.();
        cancelWait = withLatency(() => {
          let res;
          if (!a.returnOption && r.offered.length === 1 && r.offered[0] !== 'courier') T.chooseReturn(a.id, r.offered[0]);
          res = T.payBalance(a.id, cardId, { threeDS: true });
          busy = false;
          holder.dataset.locked = 'false';
          close();
          /* the router took the screen away mid-payment (browser Back): the charge still lands, say so */
          if (!onScreen()) {
            if (res.ok) toast(`Paid ${fmtExact(res.appt.payments.balance.cents)}.`, { tone: 'success' });
            else if (res.error === 'card-declined') toast('Your payment didn’t go through. Nothing was charged.', { tone: 'error' });
            return;
          }
          if (res.ok) {
            const how = res.appt.returnOption;
            const tail = how === 'pickup' ? ` Ready for pickup at ${r.t.shopName}.`
              : how === 'dropoff' ? ` ${r.first} will drop it off.` : ' Your courier is on the way.';
            setFocus(a.id);
            go('c-booking', { fresh: true });
            toast(`Paid ${fmtExact(res.appt.payments.balance.cents)}.${tail}`, { tone: 'success' });
          } else if (res.error === 'card-declined') {
            go(ID);
          } else {
            go(ID);
            toast('Choose how to get it back first.');
          }
        });
      }
    });
  });
}

/* ---------- wire ---------- */
function wire(root) {
  if (redirectIfMoved(ID, go)) return;
  const r = read();

  const backBtn = root.querySelector('.back[data-act="back"]');
  if (backBtn) {
    backBtn.dataset.wired = '1';
    backBtn.addEventListener('click', () => go('c-bookings'));
  }
  if (!r) {
    root.addEventListener('click', (e) => { if (e.target.closest('[data-act="bookings"]')) go('c-bookings', { fresh: true }); });
    return;
  }
  const { a, u } = r;

  /* a single courier offer with no price yet: ask for it */
  if (r.sel === 'courier' && !a.courier && !u.quoting) { quoteCourier(a); return; }
  /* keep keyboard focus on the row just chosen */
  if (u.refocus) {
    const row = root.querySelector(`[data-act="return"][data-value="${u.refocus}"]`);
    u.refocus = null;
    row?.focus({ preventScroll: true });
  }

  root.addEventListener('click', (e) => {
    if (e.target.closest('.screen-sheet--overlay')) return;
    const el = e.target.closest('[data-act]');
    const act = el?.dataset.act;
    if (!act || el.disabled) return;
    switch (act) {
      case 'return': if (el.dataset.value !== r.sel) choose(a, el.dataset.value); break;
      case 'courier-retry': state.sim.courier = 'ok'; choose(a, 'courier'); break;   // D-105
      case 'pay': openPay(read()); break;
      case 'confirm': confirmZero(read()); break;
      case 'message': setFocus(a.id); go('c-thread'); break;
      default:
    }
  });
}

register(ID, view, wire);
