/* ============================================================
   t-adjust — T5 "Edit the job" at the fitting (M4-spec §C1, K-01 / D-120…D-124).
   Amara edits the ticket with Sarah watching the total move: add or
   remove items and services, re-price, add a note, then send Sarah the
   FINAL order for approval — always sent, even unchanged. The draft
   always edits against the BOOKED order (D-121), so the marks here are
   the marks Sarah sees: New item / New / New price / Removed. Focal: the
   garment cards; the outcome rides in the action bar lead.
   Draft lives in state.ui['t-adjust'] (D-34):
     { apptId, mode: 'new'|'revise', prices, removed, added, items, removedItems, note, tried, seq, comments, commentErrors }
   K-02 (D-175…D-183): every card also documents the garment — Before / Pinned photos (REQUIRED: Send stays off until every item
   in the order has one of each) and an optional comment. Photos and saved comments live on the appointment (T.addFittingPhoto …),
   not in the draft; `comments` holds only the editors that are open with unsaved text.
   Modes: 'new' (from the fitting) · 'revise' (Sarah hasn't approved yet).
   ============================================================ */
import { register, render as go, currentScreen } from '../app.js';
import { state, T, getAppt, apptsFor, priceChangeView, docsOf, docsMissing, docsDiffer, nextItemId } from '../state.js';
import { myTailor } from '../tailor-data.js';
import { setFocus } from '../focus.js';
import { fmt, fmtExact, fmtColumn, cents } from '../money.js';
import { SERVICES, GARMENT_TYPES, servicesForType, TAILOR_LIMITS, MAX_ITEMS, FITTING_LIMITS, DOC_LABEL } from '../data.js';
import { withLatency } from '../sim.js';
import {
  chrome, headingRow, banner, emptyState, listRow, optionRow, textArea, deltaFigure, tailorBreakdown, actionBar, changeSummary,
  sheetOverlay, modalOverlay, leaveModal, toast, esc, garmentIcon, garmentHead, docsEditor, wireGarmentDocs, sectionHead, textLink,
} from '../components.js';

const ID = 't-adjust';
const ADJUSTABLE = ['fitting', 'price-change'];

const firstOf = () => state.customer.first;
const ui = () => state.ui[ID];
const keyOf = (garmentId, serviceId) => `${garmentId}:${serviceId}`;
const inputId = (r) => `price-${r.garmentId}-${r.serviceId}`;

/* ---------- which appointment, which draft ---------- */
const adjustable = (a) => !!a && ADJUSTABLE.includes(a.status) && apptsFor('tailor').includes(a);

/** The appointment being edited: the draft's own, else the focused one, else the newest in a fitting / price-change. */
function target() {
  const own = getAppt(state.ui[ID]?.apptId);
  if (adjustable(own)) return own;
  const focused = getAppt(state.ui.apptId);
  if (adjustable(focused)) return focused;
  return apptsFor('tailor').find(adjustable) ?? null;
}

const nSeq = (items) => Math.max(0, ...items.map((i) => Number(String(i.id).slice(1)) || 0)) + 1;

/** Revise: rebuild the draft from the order Sarah is looking at, against the BOOKED order (D-121). */
function draftFromSent(a) {
  const sent = a.priceChange?.lines ?? a.lines;
  const list = myTailor().prices ?? {};
  const bookedLine = new Map(a.lines.map((l) => [keyOf(l.garmentId, l.serviceId), l]));
  const bookedIds = new Set(a.lines.map((l) => l.garmentId));
  const sentKeys = new Set(sent.map((l) => keyOf(l.garmentId, l.serviceId)));
  const sentIds = new Set(sent.map((l) => l.garmentId));
  const prices = {};
  const added = [];
  const items = [];
  for (const l of sent) {
    const key = keyOf(l.garmentId, l.serviceId);
    const base = bookedLine.get(key)?.cents ?? (typeof list[l.serviceId] === 'number' ? cents(list[l.serviceId]) : null);
    if (base !== l.cents) prices[key] = String(l.cents / 100);
    if (!bookedLine.has(key)) added.push({ garmentId: l.garmentId, serviceId: l.serviceId });
    if (!bookedIds.has(l.garmentId) && !items.some((i) => i.id === l.garmentId)) items.push({ id: l.garmentId, type: l.garmentType });
  }
  const removed = a.lines.filter((l) => !sentKeys.has(keyOf(l.garmentId, l.serviceId))).map((l) => keyOf(l.garmentId, l.serviceId));
  const removedItems = [...bookedIds].filter((id) => !sentIds.has(id));
  return { prices, removed, added, items, removedItems, note: a.priceChange?.note ?? '', seq: nSeq(items) };
}

/** Make sure `state.ui['t-adjust']` is a full draft for `a` (a flow may hand over only { apptId, mode }). */
function ensureDraft(a) {
  const mode = a.status === 'price-change' ? 'revise' : 'new';
  let d = state.ui[ID];
  if (!d || d.apptId !== a.id) d = state.ui[ID] = { apptId: a.id, mode };
  d.mode ??= mode;
  if (d.mode === 'revise' && d.prices === undefined) Object.assign(d, draftFromSent(a));
  d.prices ??= {};
  d.removed ??= [];
  d.added ??= [];
  d.items ??= [];
  d.removedItems ??= [];
  d.note ??= '';
  d.tried ??= false;
  d.comments ??= {};
  d.commentErrors ??= {};
  /* D-182: an added item never reuses the id of a discarded item that still has photos */
  d.seq = Math.max(d.seq ?? 0, nSeq(d.items), Number(nextItemId(a).slice(1)));
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

/** One card per garment — the booked ones in booked order, then the new items. A booked garment with no live service left
    is a removed item (`gone`), whether Remove item or the last ✕ got it there. */
function build(a, d) {
  const prices = myTailor().prices ?? {};
  const booked = new Map(a.lines.map((l) => [keyOf(l.garmentId, l.serviceId), l.cents]));
  const make = (g, line, isAdded) => {
    const key = keyOf(g.id, line.serviceId);
    const raw = d.prices[key] ?? String(line.cents / 100);
    return {
      key, garmentId: g.id, garmentType: g.type, serviceId: line.serviceId, label: SERVICES[line.serviceId]?.label ?? line.label,
      startCents: isAdded ? null : line.cents, raw, parsed: parsePrice(raw), fallback: line.cents, added: isAdded,
      removed: !isAdded && d.removed.includes(key), bookedCents: booked.get(key) ?? null,
    };
  };
  const addedRows = (g) => d.added.filter((x) => x.garmentId === g.id).map((x) => {
    const price = prices[x.serviceId];
    return typeof price === 'number' ? make(g, { serviceId: x.serviceId, label: SERVICES[x.serviceId]?.label, cents: cents(price) }, true) : null;
  }).filter(Boolean);
  const garments = (a.job?.garments ?? []).map((bg) => {
    const g = { id: bg.id, type: bg.type, isNew: false };
    g.rows = [...a.lines.filter((l) => l.garmentId === bg.id).map((l) => make(g, l, false)), ...addedRows(g)];
    g.gone = d.removedItems.includes(g.id) || g.rows.every((r) => r.removed);
    return g;
  });
  for (const it of d.items) {
    const g = { id: it.id, type: it.type, isNew: true, gone: false };
    g.rows = addedRows(g);
    garments.push(g);
  }
  return garments;
}
const liveIds = (garments) => garments.filter((g) => !g.gone).map((g) => g.id);
const liveRows = (garments) => garments.filter((g) => !g.gone).flatMap((g) => g.rows).filter((r) => !r.removed);

/** The lines the preview prices: an invalid price falls back to what the row started at. */
const previewLines = (garments) => liveRows(garments).map((r) => ({
  garmentId: r.garmentId, garmentType: r.garmentType, serviceId: r.serviceId, label: r.label, cents: r.parsed.cents ?? r.fallback,
}));

const lineSig = (l) => `${l.garmentId}:${l.serviceId}:${l.cents}`;
/** Anything Back would throw away: new → any edit or a note; revise → the draft differs from what was sent (D-123). */
function isEdited(a, d, garments) {
  const rows = liveRows(garments);
  if (rows.some((r) => r.parsed.error)) return true;
  /* K-02: an open comment editor whose text differs from the saved comment is an edit (photos and saved comments are already saved) */
  if (Object.entries(d.comments ?? {}).some(([gid, text]) => text.trim() !== docsOf(a, gid).comment)) return true;
  if (d.mode === 'revise') {
    const sent = (a.priceChange?.lines ?? a.lines).map(lineSig).sort().join('|');
    return previewLines(garments).map(lineSig).sort().join('|') !== sent || d.note.trim() !== (a.priceChange?.note ?? '')
      || docsDiffer(a, liveIds(garments));
  }
  return priceChangeView(a, previewLines(garments)).changed || d.note.trim() !== '';
}

/** Errors the screen shows after Send was pressed. */
function checks(d, garments) {
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

function markHtml(r, inNewItem) {
  if (r.removed) return tag('Removed', 'removed');
  if (inNewItem) return '';
  if (r.added || r.bookedCents == null) return tag('New', 'added');
  if (r.bookedCents !== (r.parsed.cents ?? r.fallback)) {
    return `<span class="t-small c-600">was <s>${fmtExact(r.bookedCents)}</s></span>${tag('New price', 'repriced')}`;
  }
  return '';
}

function rowHtml(r, errors, busy, inNewItem) {
  const id = inputId(r);
  const label = esc(r.label);
  if (r.removed) {
    return `<div class="${ID}__row ${ID}__row--removed" data-key="${esc(r.key)}">
    <div class="${ID}__label"><span class="t-body c-600"><s>${label}</s></span><span class="${ID}__mark" data-live="mark-${esc(r.key)}">${markHtml(r, inNewItem)}</span></div>
    <s class="${ID}__was t-body" data-money>${fmtExact(r.startCents)}</s>
    ${textLink('Undo', { act: 'undo-line', disabled: busy, attrs: `data-key="${esc(r.key)}" aria-label="Undo remove ${label}"` })}
    <div class="${ID}__err" data-live="err-${esc(r.key)}"></div>
  </div>`;
  }
  const err = errors.fields[r.key] ? ERR[errors.fields[r.key]] : '';
  return `<div class="${ID}__row" data-key="${esc(r.key)}">
    <div class="${ID}__label"><label class="t-body" for="${id}">${label}</label><span class="${ID}__mark" data-live="mark-${esc(r.key)}" data-money>${markHtml(r, inNewItem)}</span></div>
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

function garmentHtml(g, errors, busy, ctx) {
  const dis = busy ? ' disabled' : '';
  if (g.gone) {
    return `<section class="${ID}__garment" aria-label="${esc(g.type)}, removed" data-garment="${esc(g.id)}" data-kind="removed">
    <div class="card ${ID}__card ${ID}__card--gone">
      <div class="${ID}__head">${garmentHead({ type: g.type, kind: 'removed', tag: tag('Removed', 'removed'), as: 'h2',
        trailing: textLink('Undo', { act: 'undo-item', disabled: busy, attrs: `data-garment="${esc(g.id)}" aria-label="Undo remove ${esc(g.type)}"` }) })}</div>
      <ul class="${ID}__gone-list">${g.rows.map((r) => `<li class="t-small c-600" data-money><s>${esc(r.label)} · ${fmtExact(r.startCents ?? r.fallback)}</s></li>`).join('')}</ul>
    </div>
  </section>`;
  }
  const more = addable(g).length > 0;
  return `<section class="${ID}__garment" aria-label="${esc(g.type)}" data-garment="${esc(g.id)}" data-kind="${g.isNew ? 'added' : 'kept'}">
    <div class="card ${ID}__card${g.isNew ? ` ${ID}__card--new` : ''}">
      <div class="${ID}__head">${garmentHead({ type: g.type, tag: g.isNew ? tag('New item', 'new-item') : '', as: 'h2' })}</div>
      ${g.rows.map((r) => rowHtml(r, errors, busy, g.isNew)).join('')}${more ? `<div class="${ID}__add">${listRow({ title: '+ Add a service', act: 'add-service' }).replace('data-act="add-service"', `data-act="add-service" data-garment="${esc(g.id)}"${dis}`)}</div>` : ''}
      ${docsEditor({
    garmentId: g.id, type: g.type, docs: docsOf(ctx.a, g.id), missing: ctx.missing.get(g.id) ?? { before: false, pinned: false },
    commentDraft: ctx.d.comments[g.id] ?? null, commentError: ctx.d.commentErrors[g.id] ? `Keep the comment under ${FITTING_LIMITS.COMMENT_MAX} characters.` : '', busy, first: ctx.first, tried: ctx.d.tried,
  })}
      <div class="${ID}__remove">${textLink('Remove item', { act: 'remove-item', tone: 'danger', disabled: busy, attrs: `data-garment="${esc(g.id)}" aria-label="Remove item: ${esc(g.type)}"` })}</div>
    </div>
  </section>`;
}

/** A figure with no amount yet (a price in the draft can't be read): the label and a dash. */
const dashFigure = (label) => `<div class="delta-figure"><p class="t-caps c-600 delta-figure__label">${esc(label)}</p><p class="t-display delta-figure__amt" aria-label="not available">—</p></div>`;

function view() {
  const a = target();
  const chromeHtml = chrome('home', { persona: 'tailor' });
  if (!a) {
    return `${chromeHtml}<main class="body ${ID}" data-s="${ID}--none">
  <div class="${ID}__empty" data-empty="no-job">${emptyState({ title: 'Nothing to edit', body: 'You can edit the job during a fitting.', art: 'Suit Jacket', ctaLabel: 'Go to Home', ctaAct: 'home' })}</div>
</main>`;
  }
  const d = ensureDraft(a);
  const first = firstOf();
  const revise = d.mode === 'revise';
  const garments = build(a, d);
  const errors = d.tried ? checks(d, garments) : { fields: {}, empty: false, note: '' };
  /* no service left: the figures hold the booked values until one is added back (R4-1-T-04) */
  const none = liveRows(garments).length === 0;
  const real = priceChangeView(a, previewLines(garments));
  const frozen = none ? priceChangeView(a, a.lines) : null;
  const pv = none ? { ...frozen, delta: 0 } : real;
  /* M6-T-04: a price that can't be read means no honest total — the figures show a dash until every price is fixed (none left → the booked figures, above) */
  const bad = liveRows(garments).filter((r) => r.parsed.error).length;
  const fix = `Fix ${bad} price${bad > 1 ? 's' : ''} to see the new total`;
  /* M7-2-T-03: nothing moved → the summary line and the breakdown say it once; the two-up figures only when an amount moved */
  const same = !bad && !none && Object.values(real.counts ?? {}).every((v) => !v);
  const busy = !!d.busy;
  const deposit = pv.after.deposit;
  const edited = isEdited(a, d, garments);
  const atMax = garments.length >= MAX_ITEMS;
  const hero = `<p class="t-caps c-600 ${ID}__eyebrow">At the fitting</p><h1 class="t-title">${revise ? 'Edit the order you sent' : 'Edit the job'}</h1>`
    + `<!--notes--><div class="status-hero__notes"><p class="t-body c-700">Photograph each item before and after pinning, then send ${esc(first)} the final order.</p></div><!--/notes-->`;
  /* K-02 (D-178): the card says what is missing, the bar says how many items still need photos */
  const gaps = docsMissing(a, liveIds(garments));
  const missing = new Map(gaps.map((m) => [m.garmentId, m]));
  const missingN = gaps.length;
  /* D-196: missing photos = a soft-disabled Send (a tap tells her what is missing); only "nothing to resend" is a hard disable */
  const softDisabled = !busy && missingN > 0;
  const sendDisabled = !busy && missingN === 0 && revise && !edited;
  const ctx = { a, d, missing, first };
  /* D-126: the bar carries both figures, the customer's first, so the total moves in view while the cards are edited */
  const pair = `<span class="${ID}__lead-pair">${esc(first)} pays <b data-money>${fmtExact(pv.after.total)}</b></span><span class="${ID}__lead-pair">You take home <b data-money>${fmtExact(pv.after.payout)}</b></span>`;
  const lead = none ? 'Add an item or service to see the new total'
    : bad ? fix
      : `<span class="${ID}__lead">${pair}</span>`;
  return `${chromeHtml}<main class="body body--with-bar ${ID}" data-s="${ID}${revise ? '--revise' : ''}" data-appt="${esc(a.id)}"${d.tried ? ' data-tried="true"' : ''}>
  ${headingRow(hero)}
  <div class="${ID}__content"${busy ? ' inert aria-busy="true"' : ''}>
  ${revise ? `<div class="${ID}__info">${banner({ tone: 'info', text: `${esc(first)} hasn’t approved yet. Sending again replaces the order ${esc(first)} is looking at.` })}</div>` : ''}
  <div class="${ID}__garments">${garments.map((g) => garmentHtml(g, errors, busy, ctx)).join('')}
    <div class="card ${ID}__card ${ID}__card--add">${listRow({ title: '+ Add an item', act: 'add-item' }).replace('data-act="add-item"', `data-act="add-item"${atMax || busy ? ' disabled aria-disabled="true"' : ''}`)}${atMax ? `<p class="t-small c-600 ${ID}__max">Up to ${MAX_ITEMS} items on one job.</p>` : ''}</div>
  </div>
  <div class="${ID}__empty-err" data-live="empty">${errors.empty ? banner({ tone: 'error', text: 'Keep at least one item with a service on this job.' }) : ''}</div>
  <section class="sec ${ID}__note">${textArea({ id: 'adjust-note', label: `Note to ${first} about the whole order (optional)`, value: d.note, rows: 3, max: TAILOR_LIMITS.NOTE_MAX, helper: 'Phone numbers and emails are hidden.', error: errors.note })}</section>
  <section class="sec" aria-labelledby="${ID}-changes">
  ${sectionHead('What changes', { id: `${ID}-changes` })}
  <div class="${ID}__summary" data-live="summary">${bad ? '' : changeSummary(real.counts)}</div>
  <div class="${ID}__figures${same ? ` ${ID}__figures--none` : ''}" data-live="figures">${same ? '' : `
    ${bad ? dashFigure(`${first} pays`) : none ? deltaFigure({ label: `${first} pays`, cents: frozen.after.total }) : deltaFigure({ label: `${first} pays`, cents: pv.after.total, was: pv.before.total })}
    ${bad ? dashFigure('You take home') : none ? deltaFigure({ label: 'You take home', cents: frozen.after.payout }) : deltaFigure({ label: 'You take home', cents: pv.after.payout, was: pv.before.payout })}
    ${none ? `<p class="t-small c-600 ${ID}__frozen">Add an item or service to see the new total</p>` : ''}`}
  </div>
  <div class="${ID}__breakdown" data-live="breakdown">${bad ? '' : tailorBreakdown(pv.after)}</div>
  <p class="t-small c-600 ${ID}__fine" data-money>${esc(first)}’s ${fmtExact(deposit)} deposit stays the same.</p>
  </section>
  </div>
</main>
${actionBar({
    ctaLabel: revise ? 'Send the updated order' : `Send to ${first} for approval`, ctaAct: 'send', disabled: sendDisabled, softDisabled, busy, busyLabel: 'Sending…',
    note: !(sendDisabled || softDisabled) ? '' : missingN > 0 ? `Add before and pinned photos for ${missingN} item${missingN > 1 ? 's' : ''}.` : 'Change something to send it again.',
    lead,
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
  const noteNext = tpl.content.querySelector(`.${ID}__note .text-area`);
  const noteCur = root.querySelector(`.${ID}__note .text-area`);
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
const q = (v) => CSS.escape(v);

/* ---------- the two add sheets ---------- */
/** A service she can add: one tap adds it, so it is a plain row with a "+", not a radio (M6-P-12). */
const serviceRow = (id, prices) => listRow({
  title: esc(SERVICES[id].label), sub: `Your price ${fmtExact(cents(prices[id]))}`, right: '+', act: 'pick-service', chevron: false, attrs: `data-value="${esc(id)}"`,
});
function openAdd(a, garmentId) {
  const d = ui();
  const g = build(a, d).find((x) => x.id === garmentId);
  if (!g) return;
  const prices = myTailor().prices ?? {};
  const rows = addable(g).map((id) => serviceRow(id, prices)).join('');
  sheetOverlay(`<div class="${ID}-sheet">${rows}</div>`,
    { header: `Add to ${esc(g.type)}`, confirm: false, dataS: `${ID}-add` }, (holder, close) => {
      holder.addEventListener('click', (e) => {
        const el = e.target.closest('[data-act="pick-service"]');
        if (!el) return;
        const serviceId = el.dataset.value;
        d.added.push({ garmentId, serviceId });
        close({ instant: true });
        rerender(`#price-${q(garmentId)}-${q(serviceId)}`);
      });
    });
}

/** Types Amara prices at least one service for, catalog order, with how many services and their price range (M6-T-11). A service that
    fits any garment ("Repair or patch") is on every type and says nothing about this one, so it is left out; a type with only that
    one reads "Repair only". */
function itemTypes() {
  const prices = myTailor().prices ?? {};
  const everyType = Object.keys(GARMENT_TYPES).length;
  return Object.keys(GARMENT_TYPES).map((type) => {
    const list = servicesForType(type).filter((id) => typeof prices[id] === 'number');
    if (!list.length) return null;
    const own = list.filter((id) => SERVICES[id].garments.length < everyType);
    if (!own.length) return { type, sub: 'Repair only' };
    const lo = Math.min(...own.map((id) => cents(prices[id])));
    const hi = Math.max(...own.map((id) => cents(prices[id])));
    const [from, to] = [lo, hi].map((c) => fmtColumn([lo, hi])(c));
    return { type, sub: `${own.length} service${own.length > 1 ? 's' : ''} · ${lo === hi ? from : `${from}–${to}`}` };
  }).filter(Boolean);
}

/** "Add an item": one sheet, two steps — type, then what it needs. An item is never created without a service (D-121). */
function openAddItem() {
  const d = ui();
  const prices = myTailor().prices ?? {};
  const typeStep = () => `<div role="radiogroup" aria-label="Item type">${itemTypes().map(({ type, sub }) => optionRow({
    name: 'type', value: type, title: esc(type), sub, act: 'pick-type', lead: garmentIcon(type, { size: 'row' }),
  })).join('')}</div>`;
  const serviceStep = (type) => `<div class="${ID}__back">${textLink('Choose another item', { act: 'pick-back' })}</div>
    <div>${servicesForType(type).filter((id) => typeof prices[id] === 'number').map((id) => serviceRow(id, prices)).join('')}</div>`;
  sheetOverlay(`<div class="${ID}-sheet" data-step="type">${typeStep()}</div>`,
    { header: 'Add an item', confirm: false, dataS: `${ID}-add-item` }, (holder, close) => {
      const box = holder.querySelector(`.${ID}-sheet`);
      const title = holder.querySelector('.sheet__title');
      let type = null;
      const show = (step) => {
        box.dataset.step = step;
        box.innerHTML = step === 'type' ? typeStep() : serviceStep(type);
        title.textContent = step === 'type' ? 'Add an item' : `What does the ${type} need?`;
        holder.dataset.s = step === 'type' ? `${ID}-add-item` : `${ID}-add-item-service`;
        box.querySelector('[data-act="pick-back"], .list-row, .option-row')?.focus({ preventScroll: true });
      };
      holder.addEventListener('click', (e) => {
        const el = e.target.closest('[data-act]');
        if (!el) return;
        if (el.dataset.act === 'pick-type') { type = el.dataset.value; show('service'); }
        else if (el.dataset.act === 'pick-back') show('type');
        else if (el.dataset.act === 'pick-service') {
          const serviceId = el.dataset.value;
          const id = `n${d.seq++}`;
          d.items.push({ id, type });
          d.added.push({ garmentId: id, serviceId });
          close({ instant: true });
          rerender(`#price-${q(id)}-${q(serviceId)}`);
        }
      });
    });
}

function openLeave(a) {
  modalOverlay(leaveModal({ title: 'Leave without sending?', body: `${firstOf()} can’t approve the order until you send it. Your photos and comments are saved. Item and price changes aren’t.` }), { dataS: `${ID}-leave` }, (holder, close) => {
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

/* ---------- remove / undo ---------- */
/** A new item goes outright, with an Undo toast that puts back exactly what was dropped. */
function dropNewItem(id) {
  const d = ui();
  const item = d.items.find((i) => i.id === id);
  if (!item) return;
  const at = d.items.indexOf(item);
  const addedOnIt = d.added.filter((x) => x.garmentId === id);
  const priceKeys = Object.keys(d.prices).filter((k) => k.startsWith(`${id}:`));
  const savedPrices = Object.fromEntries(priceKeys.map((k) => [k, d.prices[k]]));
  d.items.splice(at, 1);
  delete d.comments[id];
  delete d.commentErrors[id];
  d.added = d.added.filter((x) => x.garmentId !== id);
  priceKeys.forEach((k) => delete d.prices[k]);
  rerender('[data-act="add-item"]');
  toast(`${item.type} removed.`, {
    action: 'Undo',
    onAction: () => {
      if (currentScreen() !== ID || !state.ui[ID]) return;
      state.ui[ID].items.splice(at, 0, item);
      state.ui[ID].added.push(...addedOnIt);
      Object.assign(state.ui[ID].prices, savedPrices);
      rerender(`[data-act="remove-item"][data-garment="${q(id)}"]`);
    },
  });
}

/* ---------- documentation: photos and the comment (K-02) ---------- */
const addTile = (gid, kind) => `[data-act="add-doc"][data-garment="${q(gid)}"][data-kind="${kind}"]`;
const thumb = (gid, kind, index) => `[data-act="view-doc"][data-garment="${q(gid)}"][data-kind="${kind}"][data-index="${index}"]`;
/** The text button that opens a garment's comment editor: "Edit comment" when one is saved, else "+ Add comment". */
const commentTrigger = (a, gid) => `[data-act="${docsOf(a, gid).comment ? 'edit-comment' : 'add-comment'}"][data-garment="${q(gid)}"]`;

function addDoc(a, gid, kind) {
  const r = T.addFittingPhoto(a.id, gid, kind);
  if (!r.ok) { toast('Couldn’t save the photo. Try again.', { tone: 'error' }); return; }
  const n = docsOf(a, gid)[kind].length;
  rerender(n < FITTING_LIMITS.PHOTOS_MAX ? addTile(gid, kind) : thumb(gid, kind, n - 1));   // at the max the add tile is gone
}

function removeDoc(a, gid, photo, kind, index) {
  const r = T.removeFittingPhoto(a.id, gid, photo.id);
  if (!r.ok) { toast('Couldn’t remove the photo. Try again.', { tone: 'error' }); return; }
  rerender(addTile(gid, kind));
  toast(`${DOC_LABEL[kind]} photo removed.`, {
    action: 'Undo',
    onAction: () => {
      if (currentScreen() !== ID || !state.ui[ID]) return;
      const back = T.restoreFittingPhoto(a.id, gid, photo, r.index ?? index);
      if (back.ok) rerender(thumb(gid, kind, r.index ?? index));
    },
  });
}

function saveComment(a, gid) {
  const d = ui();
  const r = T.setFittingComment(a.id, gid, d.comments[gid] ?? '');
  if (r.ok) {
    delete d.comments[gid];
    delete d.commentErrors[gid];
    rerender(commentTrigger(a, gid));
  } else if (r.error === 'comment-long') {
    d.commentErrors[gid] = 'comment-long';
    rerender(`#comment-${q(gid)}`);
  } else {
    toast('Couldn’t save the comment. Try again.', { tone: 'error' });
  }
}

function removeLine(a, key) {
  const d = ui();
  const garments = build(a, d);
  const g = garments.find((x) => x.rows.some((r) => r.key === key));
  if (!g) return;
  const liveAfter = g.rows.filter((r) => !r.removed && r.key !== key).length;
  const wasAdded = d.added.findIndex((x) => keyOf(x.garmentId, x.serviceId) === key);
  if (g.isNew && liveAfter === 0) { dropNewItem(g.id); return; }
  if (wasAdded >= 0) { d.added.splice(wasAdded, 1); delete d.prices[key]; } else if (!d.removed.includes(key)) d.removed.push(key);
  if (!g.isNew && liveAfter === 0) rerender(`[data-act="undo-item"][data-garment="${q(g.id)}"]`);
  else if (wasAdded >= 0) rerender(`[data-act="add-service"][data-garment="${q(g.id)}"]`);
  else rerender(`[data-act="undo-line"][data-key="${q(key)}"]`);
}

/** K-02: save every open comment editor before the order goes. A comment that is too long stops the send at its field. */
function saveOpenComments(a, d) {
  for (const gid of Object.keys(d.comments)) {
    const r = T.setFittingComment(a.id, gid, d.comments[gid]);
    if (r.ok) { delete d.comments[gid]; delete d.commentErrors[gid]; continue; }
    if (r.error === 'comment-long') {
      d.commentErrors[gid] = 'comment-long';
      rerender(`#comment-${q(gid)}`);
      return false;
    }
  }
  return true;
}

function send(a) {
  const d = ui();
  if (d.busy) return;
  if (!saveOpenComments(a, d)) return;
  d.tried = true;
  const garments = build(a, d);
  const errors = checks(d, garments);
  const firstBad = Object.keys(errors.fields)[0];
  if (firstBad || errors.empty || errors.note) {
    const row = garments.flatMap((g) => g.rows).find((r) => r.key === firstBad);
    rerender(row ? `#${q(inputId(row))}` : errors.note ? '#adjust-note' : null);
    if (errors.empty) document.querySelector('#screen [data-live="empty"]')?.scrollIntoView({ block: 'center' });
    return;
  }
  /* D-196: Send is only soft-disabled while photos are missing — the tap lands here and names what is missing */
  const gaps = docsMissing(a, liveIds(garments));
  if (gaps.length) {
    rerender('[data-missing-msg]');
    document.querySelector('#screen [data-missing-msg]')?.scrollIntoView({ block: 'center' });
    return;
  }
  const lines = liveRows(garments).map((r) => ({
    garmentId: r.garmentId, garmentType: r.garmentType, serviceId: r.serviceId, label: r.label, cents: r.parsed.cents,
  }));
  const note = d.note;
  const revise = d.mode === 'revise';
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
      toast(revise ? `Updated order sent to ${firstOf()}.` : `Sent to ${firstOf()} for approval.`, { tone: 'success' });
    } else if (r.error === 'photos-missing') {
      rerender();
      toast('Add before and pinned photos first.', { tone: 'error' });
    } else if (r.error === 'not-fitting') {
      delete state.ui[ID];
      setFocus(a.id);
      go('t-job', { replace: true });
      toast(`${firstOf()} already answered this order.`, { tone: 'error' });
    } else {
      rerender();
      toast('Couldn’t send the order. Try again.', { tone: 'error' });
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
      if (isEdited(a, ui(), build(a, ui()))) {
        /* D-196: leaving with photos missing shows what is missing, behind the modal */
        if (docsMissing(a, liveIds(build(a, ui()))).length && !ui().tried) { ui().tried = true; rerender(); }
        openLeave(a);
      } else leave(a);
    });
  });

  root.addEventListener('click', (e) => {
    if (e.target.closest('.screen-sheet--overlay')) return;
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const act = el.dataset.act;
    if (act === 'add-doc') addDoc(a, el.dataset.garment, el.dataset.kind);
    else if (act === 'add-comment' || act === 'edit-comment') {
      const gid = el.dataset.garment;
      d.comments[gid] = docsOf(a, gid).comment;
      delete d.commentErrors[gid];
      rerender(`#comment-${q(gid)}`);
    } else if (act === 'save-comment') saveComment(a, el.dataset.garment);
    else if (act === 'cancel-comment') {
      const gid = el.dataset.garment;
      delete d.comments[gid];
      delete d.commentErrors[gid];
      rerender(commentTrigger(a, gid));
    } else if (act === 'send') send(a);
    else if (act === 'add-service') openAdd(a, el.dataset.garment);
    else if (act === 'add-item') openAddItem();
    else if (act === 'remove-line') removeLine(a, el.dataset.key);
    else if (act === 'undo-line') {
      const key = el.dataset.key;
      d.removed = d.removed.filter((k) => k !== key);
      rerender(`[data-act="remove-line"][data-key="${q(key)}"]`);
    } else if (act === 'remove-item') {
      const id = el.dataset.garment;
      if (d.items.some((i) => i.id === id)) dropNewItem(id);
      else { if (!d.removedItems.includes(id)) d.removedItems.push(id); rerender(`[data-act="undo-item"][data-garment="${q(id)}"]`); }
    } else if (act === 'undo-item') {
      const id = el.dataset.garment;
      d.removedItems = d.removedItems.filter((x) => x !== id);
      d.removed = d.removed.filter((k) => !k.startsWith(`${id}:`));
      rerender(`[data-act="remove-item"][data-garment="${q(id)}"]`);
    }
  });

  wireGarmentDocs(root, {
    by: 'Taken by you', editable: true,
    lookup: (gid) => { const g = build(a, ui()).find((x) => x.id === gid); return g ? { type: g.type, docs: docsOf(a, gid) } : null; },
    onRemove: (photo, { garmentId, kind, index }) => removeDoc(a, garmentId, photo, kind, index),
  });

  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t.matches('textarea[id^="comment-"]')) {
      const gid = t.id.slice('comment-'.length);
      d.comments[gid] = t.value;
      const n = [...t.value].length;
      const count = root.querySelector(`#${q(t.id)}-count`);
      if (count) { count.textContent = `${n} / ${FITTING_LIMITS.COMMENT_MAX}`; count.classList.toggle('text-area__count--over', n > FITTING_LIMITS.COMMENT_MAX); }
    } else if (t.matches('.field__input[data-key]')) {
      d.prices[t.dataset.key] = t.value;
      patch(root);
    } else if (t.id === 'adjust-note') {
      d.note = t.value;
      const n = [...t.value].length;
      const count = root.querySelector('#adjust-note-count');
      if (count) { count.textContent = `${n} / ${TAILOR_LIMITS.NOTE_MAX}`; count.classList.toggle('text-area__count--over', n > TAILOR_LIMITS.NOTE_MAX); }
      patch(root);
    }
  });
}

register(ID, view, wire);
