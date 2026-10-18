/* ============================================================
   c-ready — C10 pick a way back, then PAY the balance (K-27, Study-1 A2: authorized now, charged at the handoff; K-44 wording).
   Focal: the "How do you want it back?" radio group; the amount lives in the Pay button.
   Only the options Amara offers for this order render (returnOffer); nothing is pre-chosen
   unless there is exactly one. The Taily courier is three dollar lines before Pay enables.
   K-40 (T1): a When row under the chosen way back opens the Scheduler in a sheet (openHandoffTime) — a pickup time, or a courier
   delivery window (its fee shows once a window is picked); Pay waits for it. K-37: no Home drop-off.
   Which appointment: focusAppt (D-72). Screen-local flags: state.ui['c-ready'] { apptId, quoting, cardId }.
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, T, tailorById, returnOffer, returnAddress, priceChangeView, slotText, courierMiles } from '../state.js';
import {
  chrome, headingRow, customerBreakdown, moneyRows, courierCard, optionRow, actionBar, banner, emptyState,
  sheetOverlay, cta, toast, esc, changeList, withPhotos, wirePhotoViewer, wireGarmentDocs, textLink, sectionHead,
  linenStage, hangStage, returnedItems, andList, handoffWhenRow, openHandoffTime, COURIER_LOBBY, CHARGE_CAPTION, chargedPhrase, shopPlace, navBackMark,
} from '../components.js';
import { fmtDay, fmtTime, fmtTimeRange, nb as datesNb } from '../dates.js';
import * as A from '../account.js';
import { withLatency } from '../sim.js';
import { fmtExact } from '../money.js';
import { RETURN_LABEL } from '../data.js';
import { POLICY } from '../money-config.js';
import { META_ICONS } from '../icons.js';
import { focusAppt, setFocus, redirectIfMoved } from '../focus.js';

const ID = 'c-ready';

const firstOf = (t) => (t?.name || 'The tailor').split(' ')[0];
const money = (cents) => `<span data-money>${fmtExact(cents)}</span>`;
const ICON = { pickup: META_ICONS.bag, courier: META_ICONS.truck };
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
  /* K-40: the time picked for the chosen way back (a.handoff.slot; cleared when the way back changes) */
  const slot = sel && a.returnOption === sel ? (a.handoff?.slot ?? null) : null;
  return { a, t, u, first: firstOf(t), offered, sel, c, courierState, failed, failedId, methods, method, slot };
}
/** K-40: the courier fee is only added once a delivery window is picked — until then the money reads as without it. */
function shownMoney(r) {
  const m = r.a.money;
  if (!(r.sel === 'courier' && !r.slot && m.courier > 0)) return m;
  const total = m.total - m.courier;
  return { ...m, courier: 0, total, balance: Math.max(0, total - m.deposit), refund: Math.max(0, m.deposit - total) };
}

function subOf(k, r) {
  const { t, first, c, courierState } = r;
  /* P1-3 (D-224): .nb only on the date / time; the shop + street run breaks between words (a word longer than the line still breaks, D-233) rather than run under the radio */
  if (k === 'pickup') return `<span class="c-ready__place">${esc(shopPlace(t))}</span>`;
  if (r.sel === 'courier' && courierState === 'ready' && r.slot) return `${money(c.cents)} · Uber to your door`;
  if (r.sel === 'courier' && courierState === 'loading') return 'Getting a price…';
  if (r.sel === 'courier' && courierState === 'failed') return 'Price unavailable';
  return 'Uber · priced when you pick a window';   // K-40: never "today" — the window decides when
}

/** K-44 (D-302): the balance CTA label lives here only (Kevin is still choosing the verb) — the action bar and the pay sheet both use it. */
const payLabel = (cents) => `Pay ${fmtExact(cents)}`;
/* K-44 (D-302) → K-46: the Pay button's second line, by the way back (CHARGE_CAPTION, components.js) — shared with the Balance row (D-303). */
/** CR-1b: the action-bar lead — why Pay waits; once it can go, the K-44 caption (a $0 balance: what was chosen, nothing is charged). */
function barLead(r, { zero = false } = {}) {
  if (!r.sel) return 'Choose how to get it back first.';
  if (r.sel === 'courier' && r.courierState === 'loading') return 'Waiting for the courier price.';
  if (r.sel === 'courier' && r.courierState === 'failed') return 'Get a price or choose pickup.';   // SF-41
  if (!r.slot) return r.sel === 'courier' ? 'Pick a delivery window first.' : 'Pick a pickup time first.';   // SF-41
  if (!zero) return CHARGE_CAPTION[r.sel];
  if (r.sel === 'courier') return `<span>Courier · arrives ${esc(fmtDay(r.slot.start).slice(0, 3))} ${esc(fmtTimeRange(r.slot.start, r.slot.end))}</span>${money(r.c.cents)}`;   // the lead is a flex row: words left, the amount right
  return `Pickup ${esc(datesNb(slotText(r.slot)))} · Free`;
}
/** K-40: the When row under the chosen way back (pickup, or a priced courier). */
function whenRow(r) {
  const { sel, slot, first, courierState } = r;
  if (!sel || (sel === 'courier' && courierState !== 'ready')) return '';
  const sub = sel === 'courier'
    ? (slot ? `Delivery window · courier collects ${esc(fmtTime(slot.collectAt))}` : `Courier windows from ${esc(first)}’s open hours`)
    : (slot ? `Pickup time · ${esc(first)} has it ready then` : `From ${esc(first)}’s open hours, next ${POLICY.HANDOFF_PICK_DAYS} days`);
  return `<div class="${ID}__when">${handoffWhenRow({ method: sel, text: slot ? slotText(slot) : '', sub, act: 'pick-time' })}</div>`;
}
const noLonger = (a) => `${firstOf(tailorById(a.tailorId) ?? state.tailors[0])} no longer offers that option. Pick another way back.`;
/** CP-C47: the way back, as a word in a sentence ("Confirm pickup and get $6.50 back"). */
const CHOICE_WORD = { pickup: 'pickup', courier: 'courier' };

/* ---------- view ---------- */
/** "Your order" (K-2-01, D-127): what the balance pays for — the approved lines, plain rows, as on c-booking and Amara's "The work". */
function orderSection(a) {
  if (!a.lines?.length) return '';
  const added = new Set(a.job.garments.filter((g) => g.added).map((g) => g.id));
  const garments = withPhotos(priceChangeView(a, a.lines).garments, a.job).map((g) => (added.has(g.id) ? { ...g, newItem: true } : g));
  return `<section class="sec">${sectionHead('Your order')}
  <div class="${ID}__order">${changeList({ garments, docs: a.priceChange?.docs ?? null, commentLabel: `${firstOf(tailorById(a.tailorId) ?? state.tailors[0])}’s comment` })}</div></section>`;
}

function view() {
  const head = chrome('bookings');
  const r = read();
  if (!r) {
    return `${head}<main class="body ${ID}" data-s="${ID}">
  ${headingRow('<h1 class="t-title">Your order</h1>')}
  <div class="${ID}__empty" data-empty="ready">${emptyState({ title: 'Nothing to pay right now', body: 'When a tailor finishes your order, it shows up here.', ctaLabel: 'Back to Bookings', ctaAct: 'bookings' })}</div>
</main>`;
  }
  const { a, t, first, offered, sel, c, courierState, failed } = r;
  const off = !sel || (sel === 'courier' && courierState !== 'ready') || !r.slot;   // K-40: Pay waits for the time too
  const m = shownMoney(r);
  const zero = m.balance === 0;                                           // D-156: the final order is worth less than the deposit
  const refund = m.refund;
  const confirming = !!r.u.confirming;
  /* one way back offered → nothing to choose (R4-1-C-05, D-113) */
  const only = offered.length === 1 ? offered[0] : null;
  const LINE_FOR = { pickup: `pick it up at ${esc(t.shopName)}`, courier: 'a courier brings it to your door' };
  const body = zero && refund > 0
      ? `${esc(first)} finished the work. Your final total is less than your deposit, so the difference comes back to your card.`   // R5: the amount is on the button and in Price
      : zero
        ? (only ? `${esc(first)} finished the work. Nothing is left to pay, then ${LINE_FOR[only]}.` : `${esc(first)} finished the work. Choose how to get it back. Nothing is left to pay.`)
        : only
          ? `${esc(first)} finished the work. Pay the balance, then ${LINE_FOR[only]}.`
          : `${esc(first)} finished the work. Choose how to get it back. You’re charged once you have it.`;
  /* K-24 (R3): the linen stage carries the title — caps eyebrow + serif title on the linen, the K-22 hang stage under the stitch,
     the body on the page ground directly above the choice. The tag says Ready; the clothes are at the shop until a way back is picked. */
  const items = returnedItems(a);
  const services = items.reduce((n, g) => n + g.services.length, 0);
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const sarah = `${state.customer.first} ${(state.customer.last ?? '').charAt(0)}.`.replace(/ \.$/, '');
  const readyAt = [...a.history].reverse().find((h) => h.status === 'ready')?.at;
  const stage = hangStage({
    types: items.map((g) => g.type), tag: [sarah, 'Ready'], left: `${plural(items.length, 'item')} · ${plural(services, 'service')}`, right: `at ${t.shopName}`,
    label: `${plural(items.length, 'item')} ready: ${andList(items.map((g) => g.type))}, hung on a rail with a tag: ${sarah}, Ready`,
  });
  const hero = `${linenStage({ eyebrow: readyAt ? `Finished · ${fmtDay(readyAt)}` : 'Finished', title: 'Your order is ready', rail: stage, label: 'Your order is ready' })}
  <p class="t-body ${ID}__intro">${body}</p>`;
  /* C-11: one decline pattern (D-140) — the banner sits directly above the action bar, the way forward is another card */
  const alert = r.u.offline   // S-12 (pre-MVP A1): nothing is held while offline
    ? `<div class="${ID}__alert">${banner({ tone: 'error', title: 'You’re offline', text: 'Nothing was charged. Pay again when you’re back.' })}</div>`
    : failed && !zero
    ? `<div class="${ID}__alert">${banner({ tone: 'error', title: 'Your card was declined', text: 'Nothing was charged. Try another card.', actionLabel: 'Use another card', actionAct: 'pay' })}</div>`
    : '';
  const sameCard = failed && r.method?.id === r.failedId;                 // the failed card is still the one selected
  /* "Free" sits in the row's value slot (right-aligned, t-body w-600) */
  const rows = offered.map((k) => optionRow({
    name: 'return', value: k, title: `<span class="${ID}__opt">${esc(RETURN_LABEL[k])}${k === 'courier' ? '' : `<span class="${ID}__opt-val">Free</span>`}</span>`, sub: subOf(k, r), checked: sel === k, lead: ICON[k], act: 'return',
  })).join('');
  const single = offered.length === 1
    ? `<p class="t-small c-600 ${ID}__single">${esc(first)} offers ${esc(RETURN_LABEL[offered[0]].toLowerCase())} for this order.</p>` : '';
  /* K-40: the courier card (and its fee) once a window is picked; the wait / failure states as before */
  const courier = sel === 'courier' && (courierState !== 'ready' || r.slot)
    ? `<div class="${ID}__courier">${courierCard({
      state: courierState, ...(courierState === 'ready' ? c : { miles: c?.miles ?? courierMiles(a) }),   // the distance is known before the price
      from: t.shopName, to: streetOf(), note: `Added to your balance. ${COURIER_LOBBY}`,   // K-43 (D-298): it never comes back
    })}${courierState === 'failed' && offered.length === 1 ? textLink(`Message ${first}`, { act: 'message' }) : ''}</div>` : '';
  /* K-27 (Study-1 A2) + K-44: when she is charged, and the unclaimed rule, shown where the way back is chosen */
  const bal = m.balance;
  const things = items.length > 1 ? 'garments' : 'garment';
  const feeLater = sel === 'courier' && courierState === 'ready' && !r.slot;   // K-40: the courier fee joins the hold with the window
  const hold = zero ? '' : feeLater ? `<div class="${ID}__hold" data-hold>
  <p class="t-body c-700">You’ll be charged ${money(bal)} plus the courier fee when you get your ${things}.</p>
  <p class="t-small c-600">If you haven’t got it ${POLICY.UNCLAIMED_CAPTURE_D} days after you choose, we’ll charge it then. ${esc(first)} still keeps it for you until you do.</p>
</div>` : `<div class="${ID}__hold" data-hold>
  <p class="t-body c-700">You’ll be charged ${money(bal)} when you get your ${things}.</p>
  <p class="t-small c-600">If you haven’t got it ${POLICY.UNCLAIMED_CAPTURE_D} days after you choose, we’ll charge the ${money(bal)} then. ${esc(first)} still keeps it for you until you do.</p>
</div>`;
  return `${head}<main class="body body--with-bar ${ID}" data-s="${ID}">
  ${navBackMark()}${hero}
  <section class="sec">${sectionHead(only ? 'Getting it back' : 'How do you want it back?', { id: 'ready-ways' })}
  <div class="${ID}__group card card--list" role="radiogroup" aria-labelledby="ready-ways">${rows}</div>
  ${single}
  ${whenRow(r)}
  ${courier}
  ${hold}</section>
  ${orderSection(a)}
  <section class="sec">${sectionHead('Price')}
  ${customerBreakdown(m, { stage: 'ready', tailorFirst: first, depositState: a.payments.deposit.state, confirmed: true, wayBack: sel ?? '' })}</section>
  ${alert}
</main>
${actionBar({
    ctaLabel: zero ? (refund > 0 ? `Confirm${sel ? ` ${CHOICE_WORD[sel]}` : ''} and get ${fmtExact(refund)} back` : 'Confirm') : sameCard ? 'Use another card' : payLabel(m.balance),
    ctaAct: zero ? 'confirm' : 'pay', disabled: off, busy: confirming, busyLabel: 'Confirming…',
    /* K-46 (D-303): Pay carries its caption — or, disabled, the reason it waits — as its own second line; a $0 balance keeps the lead */
    ...(zero ? { lead: barLead(r, { zero }) } : sameCard ? {} : { ctaSub: barLead(r) }),   // "Use another card" (the card just failed) carries no charge line
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
  <div class="${ID}-sheet__pay">
  <p class="t-caps c-600">Pay with</p>
  <div class="${ID}-sheet__group" role="radiogroup" aria-label="Pay with"${busy ? ' aria-disabled="true"' : ''}>${rows}</div>
  </div>
  <div class="${ID}-sheet__go">
  ${cta(payLabel(a.money.balance), { busy, busyLabel: 'Paying…', sub: CHARGE_CAPTION[a.returnOption] ?? CHARGE_CAPTION.pickup, subId: 'pay-sheet-sub', attrs: 'data-act="pay-ok"' })}
  <p class="t-small c-600 ${ID}-sheet__pending">Your bank may show it as pending until then.</p>
  </div>
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
    if (!res.ok) toast(noLonger(a));
    go(ID);
  });
}

function choose(a, k) {
  const u = ui(a);
  if (k === 'courier') { quoteCourier(a); return; }
  cancelWait?.();
  u.quoting = false;
  const res = T.chooseReturn(a.id, k);
  if (!res.ok) toast(noLonger(a));
  go(ID);
}

/** The toast's second sentence after the hold (K-40): when and where it comes back. */
const handoffTail = (appt, r) => (appt.returnOption === 'courier'
  ? ` The courier arrives ${slotText(appt.handoff?.slot)}.`
  : ` Pick it up at ${r.t.shopName || r.t.shop.street}, ${slotText(appt.handoff?.slot)}.`);

/** K-40 (T1): the When row opens the Scheduler sheet — pick the pickup time or the courier window (customer only). */
function openWhen(r) {
  const { a, t, first } = r;
  if (!a.returnOption && r.sel) T.chooseReturn(a.id, r.sel);          // a single offer is pre-chosen on screen only
  const courier = a.returnOption === 'courier';
  openHandoffTime(a, {
    mode: 'pick', first,
    place: courier ? `${t.shopName || t.shop?.street || 'Your tailor'} → ${streetOf()} · ${a.courier?.miles ?? 0} mi` : [t.shopName, t.shop?.street].filter(Boolean).join(' · '),
    dataS: courier ? `${ID}--courier-window` : `${ID}--pick-time`,
    onDone: () => go(ID),
    onMessage: () => { setFocus(a.id); go('c-thread'); },
  });
}

/** D-156: nothing to pay (the final order is worth less than the deposit) — no pay sheet; confirming settles the refund. */
function confirmZero(r) {
  const { a, u } = r;
  if (u.confirming) return;
  u.confirming = true;
  u.offline = false;
  go(ID);
  cancelWait?.();
  cancelWait = withLatency(() => {
    u.confirming = false;
    if (!a.returnOption && r.offered.length === 1 && r.offered[0] !== 'courier') T.chooseReturn(a.id, r.offered[0]);
    const res = T.holdBalance(a.id, a.cardId ?? r.method?.id ?? null, { threeDS: true });
    if (!onScreen()) {
      if (res.ok && res.appt.money.refund > 0) toast(`${fmtExact(res.appt.money.refund)} is on its way back to your card.`, { tone: 'success' });
      return;
    }
    if (res.ok) {
      const tail = handoffTail(res.appt, r);
      setFocus(a.id);
      go('c-booking', { fresh: true });
      toast(res.appt.money.refund > 0 ? `${fmtExact(res.appt.money.refund)} is on its way back to your card.${tail}` : `Confirmed.${tail}`, { tone: 'success' });
    } else if (res.error === 'offline') {
      u.offline = true;
      go(ID);
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
        u.offline = false;
        busy = true;
        paint();
        cancelWait?.();
        cancelWait = withLatency(() => {
          let res;
          if (!a.returnOption && r.offered.length === 1 && r.offered[0] !== 'courier') T.chooseReturn(a.id, r.offered[0]);
          res = T.holdBalance(a.id, cardId, { threeDS: true });
          busy = false;
          holder.dataset.locked = 'false';
          close();
          /* the router took the screen away mid-payment (browser Back): the charge still lands, say so */
          if (!onScreen()) {
            if (res.ok) toast(`You’ll be charged ${fmtExact(res.appt.payments.balance.cents)} ${chargedPhrase(res.appt.returnOption)}.`, { tone: 'success' });
            else if (res.error === 'card-declined') toast('Your card was declined. Nothing was charged.', { tone: 'error' });
            return;
          }
          if (res.ok) {
            const tail = handoffTail(res.appt, r);
            setFocus(a.id);
            go('c-booking', { fresh: true });
            toast(`You’ll be charged ${fmtExact(res.appt.payments.balance.cents)} ${chargedPhrase(res.appt.returnOption)}.${tail}`, { tone: 'success' });
          } else if (res.error === 'card-declined') {
            go(ID);
          } else if (res.error === 'offline') {   // S-12
            u.offline = true;
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
  /* K-04 (D-207): the item rows' photo stacks — the fitting photos once Amara documented the fitting, else the customer's own */
  wirePhotoViewer(root);
  if (r) {
    wireGarmentDocs(root, {
      by: `Taken by ${r.first}`,
      lookup: (gid) => {
        const docs = r.a.priceChange?.docs?.[gid];
        const type = priceChangeView(r.a, r.a.lines).garments.find((g) => g.id === gid)?.type ?? '';
        return docs ? { type, docs } : null;
      },
    });
  }

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
  /* keyboard focus stays on the row just chosen: the router restores it across the re-renders (AU-P1-2a) */

  root.addEventListener('click', (e) => {
    if (e.target.closest('.screen-sheet--overlay')) return;
    const el = e.target.closest('[data-act]');
    const act = el?.dataset.act;
    if (!act || el.disabled) return;
    switch (act) {
      case 'return': if (el.dataset.value !== r.sel) choose(a, el.dataset.value); break;
      case 'courier-retry': state.sim.courier = 'ok'; choose(a, 'courier'); break;   // D-105
      case 'pay': openPay(read()); break;
      case 'pick-time': openWhen(read()); break;
      case 'confirm': confirmZero(read()); break;
      case 'message': setFocus(a.id); go('c-thread'); break;
      default:
    }
  });
}

register(ID, view, wire);
