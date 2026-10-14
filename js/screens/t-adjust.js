/* ============================================================
   t-adjust — T5 adjust the price after the fitting (M4-spec §C1).
   Amara turns what she found at the fitting into a new price Sarah can
   approve: re-price, remove or add a service, add a note, send. The
   correction marks (Added / New price / Removed, old price struck) show
   as she edits. Focal: the editable lines; the outcome rides in the
   action bar lead. Draft lives in state.ui['t-adjust'] (D-34).
   Modes: 'new' (from the fitting) · 'revise' (Sarah hasn't approved yet).
   ============================================================ */
import { register, render as go, currentScreen } from '../app.js';
import { state, T, getAppt, apptsFor, priceChangeView } from '../state.js';
import { myTailor } from '../tailor-data.js';
import { setFocus } from '../focus.js';
import { fmt, fmtExact, cents } from '../money.js';
import { SERVICES, servicesForType, TAILOR_LIMITS } from '../data.js';
import { withLatency } from '../sim.js';
import {
  chrome, headingRow, banner, emptyState, listRow, optionRow, textArea, deltaFigure, tailorBreakdown, actionBar,
  sheetOverlay, modalOverlay, leaveModal, toast, esc,
} from '../components.js';

const ID = 't-adjust';
const ADJUSTABLE = ['fitting', 'price-change'];

const firstOf = () => state.customer.first;
const ui = () => state.ui[ID];
const keyOf = (garmentId, serviceId) => `${garmentId}:${serviceId}`;
const inputId = (r) => `price-${r.garmentId}-${r.serviceId}`;

/* ---------- which appointment, which draft ---------- */
const adjustable = (a) => !!a && ADJUSTABLE.includes(a.status) && apptsFor('tailor').includes(a);

/** The appointment being adjusted: the draft's own, else the focused one, else the newest in a fitting / price-change. */
function target() {
  const own = getAppt(state.ui[ID]?.apptId);
  if (adjustable(own)) return own;
  const focused = getAppt(state.ui.apptId);
  if (adjustable(focused)) return focused;
  return apptsFor('tailor').find(adjustable) ?? null;
}

/** Make sure `state.ui['t-adjust']` is a full draft for `a` (a flow may hand over only { apptId, mode }). */
function ensureDraft(a) {
  const mode = a.status === 'price-change' ? 'revise' : 'new';
  let d = state.ui[ID];
  if (!d || d.apptId !== a.id) d = state.ui[ID] = { apptId: a.id, mode };
  d.mode ??= mode;
  d.prices ??= {};
  d.removed ??= [];
  d.added ??= [];
  d.note ??= d.mode === 'revise' ? a.priceChange?.note ?? '' : '';
  d.tried ??= false;
  return d;
}

/* ---------- the draft as rows ---------- */
/** Whole-dollar price → { cents } | { error }. */
function parsePrice(raw) {
  const s = String(raw ?? '').trim().replace(/^\$\s*/, '');
  if (s === '') return { error: 'price-missing' };
  if (!/^\d+$/.test(s)) return { error: 'price-invalid' };
  const n = Number(s);
  if (n < 1 || n > TAILOR_LIMITS.PRICE_MAX) return { error: 'price-invalid' };
  return { cents: cents(n) };
}
const ERR = {
  'price-missing': 'Enter a price.',
  'price-invalid': `Enter a whole-dollar price up to ${fmt(cents(TAILOR_LIMITS.PRICE_MAX))}.`,
};

/** Rows per garment: the start lines (minus nothing — removed ones stay, struck) + the added ones. */
function build(a, d) {
  const start = d.mode === 'revise' ? a.priceChange?.lines ?? a.lines : a.lines;
  const prices = myTailor().prices ?? {};
  const garments = (a.job?.garments ?? []).map((g) => ({ id: g.id, type: g.type, rows: [] }));
  const bucket = (line) => {
    let g = garments.find((x) => x.id === line.garmentId);
    if (!g) { g = { id: line.garmentId, type: line.garmentType ?? '', rows: [] }; garments.push(g); }
    return g;
  };
  const booked = new Map(a.lines.map((l) => [keyOf(l.garmentId, l.serviceId), l.cents]));
  const make = (line, startCents, isAdded) => {
    const key = keyOf(line.garmentId, line.serviceId);
    const raw = d.prices[key] ?? String(line.cents / 100);
    const parsed = parsePrice(raw);
    return {
      key, garmentId: line.garmentId, garmentType: line.garmentType, serviceId: line.serviceId, label: SERVICES[line.serviceId]?.label ?? line.label,
      startCents, raw, parsed, fallback: line.cents, added: isAdded, removed: !isAdded && d.removed.includes(key),
      bookedCents: booked.get(key) ?? null,
    };
  };
  for (const l of start) bucket(l).rows.push(make(l, l.cents, false));
  for (const x of d.added) {
    const g = garments.find((y) => y.id === x.garmentId);
    const price = prices[x.serviceId];
    if (!g || typeof price !== 'number' || g.rows.some((r) => r.serviceId === x.serviceId)) continue;
    g.rows.push(make({ garmentId: g.id, garmentType: g.type, serviceId: x.serviceId, label: SERVICES[x.serviceId]?.label, cents: cents(price) }, null, true));
  }
  return garments;
}
const liveRows = (garments) => garments.flatMap((g) => g.rows).filter((r) => !r.removed);

/** The lines the preview prices: an invalid price falls back to what the row started at. */
const previewLines = (garments) => liveRows(garments).map((r) => ({
  garmentId: r.garmentId, garmentType: r.garmentType, serviceId: r.serviceId, label: r.label, cents: r.parsed.cents ?? r.fallback,
}));

function isChanged(a, d, garments) {
  if (garments.some((g) => g.rows.some((r) => r.removed || r.added))) return true;
  if (liveRows(garments).some((r) => !r.added && (r.parsed.error || r.parsed.cents !== r.startCents))) return true;
  return d.mode === 'revise' && d.note.trim() !== (a.priceChange?.note ?? '');
}

/** Errors the screen shows after Send was pressed. */
function checks(a, d, garments) {
  const rows = liveRows(garments);
  const fields = {};
  for (const r of rows) if (r.parsed.error) fields[r.key] = r.parsed.error;
  return {
    fields,
    empty: rows.length === 0,
    note: d.note.trim().length > TAILOR_LIMITS.NOTE_MAX ? `Keep the note under ${TAILOR_LIMITS.NOTE_MAX} characters.` : '',
  };
}

/* ---------- view ---------- */
const tag = (text, tone) => `<span class="change-list__tag change-list__tag--${tone} t-micro">${text}</span>`;

function markHtml(r) {
  if (r.removed) return tag('Removed', 'removed');
  if (r.added || r.bookedCents == null) return tag('Added', 'added');
  if (r.bookedCents !== (r.parsed.cents ?? r.fallback)) {
    return `<span class="t-small c-600">was <s>${fmtExact(r.bookedCents)}</s></span>${tag('New price', 'repriced')}`;
  }
  return '';
}

function rowHtml(r, errors, busy) {
  const id = inputId(r);
  const label = esc(r.label);
  if (r.removed) {
    return `<div class="${ID}__row ${ID}__row--removed" data-key="${esc(r.key)}">
    <div class="${ID}__label"><span class="t-body c-600"><s>${label}</s></span><span class="${ID}__mark" data-live="mark-${esc(r.key)}">${markHtml(r)}</span></div>
    <s class="${ID}__was t-body" data-money>${fmtExact(r.startCents)}</s>
    <button type="button" class="${ID}__btn t-body w-600" data-act="undo-line" data-key="${esc(r.key)}"${busy ? ' disabled' : ''} aria-label="Undo remove ${label}">Undo</button>
    <div class="${ID}__err" data-live="err-${esc(r.key)}"></div>
  </div>`;
  }
  const err = errors.fields[r.key] ? ERR[errors.fields[r.key]] : '';
  return `<div class="${ID}__row" data-key="${esc(r.key)}">
    <div class="${ID}__label"><label class="t-body" for="${id}">${label}</label><span class="${ID}__mark" data-live="mark-${esc(r.key)}" data-money>${markHtml(r)}</span></div>
    <div class="field__box ${ID}__box${err ? ` ${ID}__box--error` : ''}">
      <span class="field__affix" aria-hidden="true">$</span>
      <input class="field__input" id="${id}" name="${id}" type="text" inputmode="numeric" autocomplete="off" maxlength="6" value="${esc(r.raw)}" data-key="${esc(r.key)}"${err ? ` aria-invalid="true" aria-describedby="${id}-msg"` : ''}${busy ? ' disabled' : ''}>
    </div>
    <button type="button" class="${ID}__btn ${ID}__btn--x" data-act="remove-line" data-key="${esc(r.key)}"${busy ? ' disabled' : ''} aria-label="Remove ${label}"><span aria-hidden="true">✕</span></button>
    <div class="${ID}__err" data-live="err-${esc(r.key)}">${err ? `<p class="field__msg field__msg--error t-small" id="${id}-msg" role="alert">${esc(err)}</p>` : ''}</div>
  </div>`;
}

/** Services Amara prices for this garment type that are not already on it. */
function addable(g) {
  const prices = myTailor().prices ?? {};
  return servicesForType(g.type).filter((id) => typeof prices[id] === 'number' && !g.rows.some((r) => r.serviceId === id));
}

function garmentHtml(g, errors, busy) {
  const more = addable(g).length > 0;
  return `<section class="${ID}__garment" aria-label="${esc(g.type)}">
    <h2 class="t-body w-600 ${ID}__type">${esc(g.type)}</h2>
    <div class="${ID}__card">${g.rows.map((r) => rowHtml(r, errors, busy)).join('')}${more ? `<div class="${ID}__add">${listRow({ title: '+ Add a service', act: 'add-service' }).replace('data-act="add-service"', `data-act="add-service" data-garment="${esc(g.id)}"${busy ? ' disabled' : ''}`)}</div>` : ''}</div>
  </section>`;
}

function view() {
  const a = target();
  const chromeHtml = chrome('home', { persona: 'tailor' });
  if (!a) {
    return `${chromeHtml}<main class="body ${ID}" data-s="${ID}--none">
  <div class="${ID}__empty" data-empty="no-job">${emptyState({ title: 'Nothing to adjust', body: 'You can adjust the price during a fitting.', ctaLabel: 'Go to Home', ctaAct: 'home' })}</div>
</main>`;
  }
  const d = ensureDraft(a);
  const first = firstOf();
  const revise = d.mode === 'revise';
  const garments = build(a, d);
  const changed = isChanged(a, d, garments);
  const errors = d.tried ? checks(a, d, garments) : { fields: {}, empty: false, note: '' };
  /* no service left: the figures hold the start values until one is added back (R4-1-T-04) */
  const none = liveRows(garments).length === 0;
  const startLines = d.mode === 'revise' ? a.priceChange?.lines ?? a.lines : a.lines;
  const pv = none ? { ...priceChangeView(a, startLines), delta: 0 } : priceChangeView(a, previewLines(garments));
  const frozen = none ? priceChangeView(a, startLines) : null;
  const busy = !!d.busy;
  const deposit = pv.after.deposit;
  const hero = `<p class="t-caps c-600 ${ID}__eyebrow">After the fitting</p><h1 class="t-title">${revise ? 'Change the new price' : 'Adjust the price'}</h1>`
    + `<!--notes--><div class="status-hero__notes"><p class="t-body c-700">Change what ${esc(first)} pays for this job. ${esc(first)} approves the new price before you start the work.</p></div><!--/notes-->`;
  return `${chromeHtml}<main class="body body--with-bar ${ID}" data-s="${ID}${revise ? '--revise' : ''}" data-appt="${esc(a.id)}">
  ${headingRow(hero, { backRow: true })}
  <div class="${ID}__content"${busy ? ' inert aria-busy="true"' : ''}>
  ${revise ? `<div class="${ID}__info">${banner({ tone: 'info', text: `${esc(first)} hasn’t approved yet. Sending again replaces the price ${esc(first)} is looking at.` })}</div>` : ''}
  <div class="${ID}__garments">${garments.map((g) => garmentHtml(g, errors, busy)).join('')}</div>
  <div class="${ID}__empty-err" data-live="empty">${errors.empty ? banner({ tone: 'error', text: 'Keep at least one service on this job.' }) : ''}</div>
  <div class="${ID}__note">${textArea({ id: 'adjust-note', label: `Note to ${first} (optional)`, value: d.note, rows: 3, max: TAILOR_LIMITS.NOTE_MAX, helper: 'Say what you found at the fitting. Phone numbers and emails are hidden.', error: errors.note })}</div>
  <h2 class="t-h2 ${ID}__h2">What changes</h2>
  <div class="${ID}__figures" data-live="figures">
    ${none ? deltaFigure({ label: `${first} pays`, cents: frozen.after.total }) : deltaFigure({ label: `${first} pays`, cents: pv.after.total, was: pv.before.total })}
    ${none ? deltaFigure({ label: 'You take home', cents: frozen.after.payout }) : deltaFigure({ label: 'You take home', cents: pv.after.payout, was: pv.before.payout })}
    ${none ? `<p class="t-small c-600 ${ID}__frozen">Add a service back to see the new price</p>` : ''}
  </div>
  <div class="${ID}__breakdown" data-live="breakdown">${tailorBreakdown(pv.after)}</div>
  <p class="t-small c-600 ${ID}__fine" data-money>${esc(first)}’s ${fmtExact(deposit)} deposit stays the same. The balance is due when the order is ready.</p>
  </div>
</main>
${actionBar({
    ctaLabel: revise ? 'Send the new price' : `Send to ${first}`, ctaAct: 'send', disabled: !changed && !busy, busy, busyLabel: 'Sending…',
    note: !changed ? 'Change a price, add or remove a service to send.' : '',
    lead: none ? 'Add a service back to see the new price' : `You take home <b data-money>${fmtExact(pv.after.payout)}</b>`,
  })}`;
}

/* ---------- in-place updates (typing never re-renders the field) ---------- */
function patch(root) {
  const tpl = document.createElement('template');
  tpl.innerHTML = view();
  tpl.content.querySelectorAll('[data-live]').forEach((next) => {
    const cur = root.querySelector(`[data-live="${next.dataset.live}"]`);
    if (cur && cur.outerHTML !== next.outerHTML) cur.replaceWith(next);
  });
  const bar = root.querySelector('.action-bar');
  const nextBar = tpl.content.querySelector('.action-bar');
  if (bar && nextBar && bar.outerHTML !== nextBar.outerHTML) bar.replaceWith(nextBar);
  /* invalid state of the inputs and the note, copied without touching the focused element */
  tpl.content.querySelectorAll('.field__input[data-key]').forEach((next) => {
    const cur = root.querySelector(`#${CSS.escape(next.id)}`);
    if (!cur) return;
    for (const attr of ['aria-invalid', 'aria-describedby']) {
      if (next.hasAttribute(attr)) cur.setAttribute(attr, next.getAttribute(attr)); else cur.removeAttribute(attr);
    }
    cur.closest('.field__box')?.classList.toggle(`${ID}__box--error`, next.hasAttribute('aria-invalid'));
  });
  const noteNext = tpl.content.querySelector('.text-area');
  const noteCur = root.querySelector('.text-area');
  if (noteNext && noteCur) {
    const msgNext = noteNext.querySelector('.field__msg');
    const msgCur = noteCur.querySelector('.field__msg');
    if (msgNext && msgCur) { msgCur.textContent = msgNext.textContent; msgCur.className = msgNext.className; if (msgNext.hasAttribute('role')) msgCur.setAttribute('role', 'alert'); else msgCur.removeAttribute('role'); }
    noteCur.classList.toggle('field--error', noteNext.classList.contains('field--error'));
    const ta = noteCur.querySelector('textarea');
    if (noteNext.classList.contains('field--error')) ta.setAttribute('aria-invalid', 'true'); else ta.removeAttribute('aria-invalid');
  }
}

/** Re-render the screen, keep the scroll, and put focus on `sel` (a selector inside #screen). */
function rerender(sel) {
  const y = window.scrollY;
  go(ID);
  window.scrollTo(0, y);
  if (sel) document.querySelector(`#screen ${sel}`)?.focus({ preventScroll: true });
}

/* ---------- actions ---------- */
function openAdd(a, garmentId) {
  const d = ui();
  const g = build(a, d).find((x) => x.id === garmentId);
  if (!g) return;
  const prices = myTailor().prices ?? {};
  const rows = addable(g).map((id) => optionRow({
    name: 'service', value: id, title: esc(SERVICES[id].label), sub: `Your price ${fmtExact(cents(prices[id]))}`, act: 'pick-service',
  })).join('');
  sheetOverlay(`<div class="${ID}-sheet"><div role="radiogroup" aria-label="Services">${rows}</div></div>`,
    { header: `Add to ${esc(g.type)}`, confirm: false, dataS: `${ID}-add` }, (holder, close) => {
      holder.addEventListener('click', (e) => {
        const el = e.target.closest('[data-act="pick-service"]');
        if (!el) return;
        const serviceId = el.dataset.value;
        d.added.push({ garmentId, serviceId });
        close({ instant: true });
        rerender(`#price-${CSS.escape(garmentId)}-${CSS.escape(serviceId)}`);
      });
    });
}

function openLeave(a) {
  modalOverlay(leaveModal({ title: 'Leave without sending?', body: `Your price changes won’t be sent to ${firstOf()}.` }), { dataS: `${ID}-leave` }, (holder, close) => {
    holder.querySelector('[data-act="keep-editing"]')?.addEventListener('click', () => close());
    holder.querySelector('[data-act="discard"]')?.addEventListener('click', () => {
      close({ instant: true });
      leave(a);
    });
  });
}
function leave(a) {
  delete state.ui[ID];
  if (a) setFocus(a.id);
  go('t-job');
}

function send(a) {
  const d = ui();
  if (d.busy) return;
  d.tried = true;
  const garments = build(a, d);
  const errors = checks(a, d, garments);
  const firstBad = Object.keys(errors.fields)[0];
  if (firstBad || errors.empty || errors.note) {
    const row = garments.flatMap((g) => g.rows).find((r) => r.key === firstBad);
    rerender(row ? `#${CSS.escape(inputId(row))}` : errors.note ? '#adjust-note' : null);
    if (errors.empty) document.querySelector('#screen [data-live="empty"]')?.scrollIntoView({ block: 'center' });
    return;
  }
  const lines = liveRows(garments).map((r) => ({
    garmentId: r.garmentId, garmentType: r.garmentType, serviceId: r.serviceId, label: r.label, cents: r.parsed.cents,
  }));
  const note = d.note;
  d.busy = true;
  rerender();
  withLatency(() => {
    d.busy = false;
    if (currentScreen() !== ID) return;
    const r = T.sendPriceChange(a.id, lines, { note });
    if (r.ok) {
      delete state.ui[ID];
      setFocus(a.id);
      go('t-job', { fresh: true });
      toast(`New price sent to ${firstOf()}.`, { tone: 'success' });
    } else {
      delete state.ui[ID];
      setFocus(a.id);
      go('t-job', { replace: true });
      toast(r.error === 'not-fitting' ? `${firstOf()} already answered this price.` : 'Something went wrong. Try again.', { tone: 'error' });
    }
  });
}

/* ---------- wiring ---------- */
function wire(root) {
  const a = target();
  if (!a) {
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="home"]')) go('t-home', { fresh: true });
    });
    return;
  }
  const d = ensureDraft(a);

  root.querySelectorAll('.back[data-act="back"]').forEach((btn) => {
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      if (ui().busy) return;
      const garments = build(a, ui());
      if (isChanged(a, ui(), garments)) openLeave(a); else leave(a);
    });
  });

  root.addEventListener('click', (e) => {
    if (e.target.closest('.screen-sheet--overlay')) return;
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const act = el.dataset.act;
    if (act === 'send') send(a);
    else if (act === 'add-service') openAdd(a, el.dataset.garment);
    else if (act === 'remove-line') {
      const key = el.dataset.key;
      const wasAdded = d.added.findIndex((x) => keyOf(x.garmentId, x.serviceId) === key);
      if (wasAdded >= 0) {
        const { garmentId } = d.added[wasAdded];
        d.added.splice(wasAdded, 1);
        delete d.prices[key];
        rerender(`[data-act="add-service"][data-garment="${CSS.escape(garmentId)}"]`);
      } else {
        if (!d.removed.includes(key)) d.removed.push(key);
        rerender(`[data-act="undo-line"][data-key="${CSS.escape(key)}"]`);
      }
    } else if (act === 'undo-line') {
      const key = el.dataset.key;
      d.removed = d.removed.filter((k) => k !== key);
      rerender(`[data-act="remove-line"][data-key="${CSS.escape(key)}"]`);
    }
  });

  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t.matches('.field__input[data-key]')) {
      d.prices[t.dataset.key] = t.value;
      patch(root);
    } else if (t.id === 'adjust-note') {
      d.note = t.value;
      const n = [...t.value].length;
      const count = root.querySelector('[data-count]');
      if (count) { count.textContent = `${n} / ${TAILOR_LIMITS.NOTE_MAX}`; count.classList.toggle('text-area__count--over', n > TAILOR_LIMITS.NOTE_MAX); }
      patch(root);
    }
  });
}

register(ID, view, wire);
