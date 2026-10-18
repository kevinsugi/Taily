/* ============================================================
   t-adjust — T5 "Final order" at the fitting (K-42; the after-fitting edit mode = "Edit order") (M4-spec §C1, K-01 / D-120…D-124).
   Amara edits the ticket with Sarah watching the total move: add or
   remove items and services, re-price, keep private notes, then send Sarah the
   FINAL order for approval — always sent, even unchanged. The draft
   always edits against the BOOKED order (D-121), so the marks here are
   the marks Sarah sees: New item / New / New price / Removed. Focal: the
   garment cards; the outcome rides in the action bar lead.
   Draft lives in state.ui['t-adjust'] (D-34):
     { apptId, mode: 'new'|'revise'|'edit', prices, removed, added, items, removedItems, tried, seq, comments, commentErrors, noteDraft }
   K-02 (D-175…D-183): every card also documents the garment — Before / Pinned photos (REQUIRED: Send stays off until every item
   in the order has one of each) and an optional comment. Photos and saved comments live on the appointment (T.addFittingPhoto …),
   not in the draft; `comments` holds only the editors that are open with unsaved text.
   Modes: 'new' (from the fitting) · 'revise' (Sarah hasn't approved yet) · 'edit' (Study-1 B1, K-30: after the fitting, before Mark
   ready — the same cards against the APPROVED order, plus the due date, a required reason and an optional photo; Sarah approves or
   messages, never declines (K-30 overruled) — the tailor revises by sending again; draft adds { needBy, reason, photo, seedSig }).
   K-31 (Study-1 B2): the whole-order "Note to Sarah" is gone — the tailor's private General notes take its place (new / revise).
   ============================================================ */
import { register, render as go, currentScreen } from '../app.js';
import { state, T, getAppt, apptsFor, priceChangeView, docsOf, docsMissing, docsDiffer, nextItemId, jobEditView, notesEditable, now } from '../state.js';
import { myTailor } from '../tailor-data.js';
import { setFocus } from '../focus.js';
import { fmt, fmtExact, fmtColumn, cents } from '../money.js';
import { SERVICES, GARMENT_TYPES, servicesForType, TAILOR_LIMITS, MAX_ITEMS, FITTING_LIMITS, DOC_LABEL } from '../data.js';
import { fmtDay, isoDay, addDays, dayDiff } from '../dates.js';
import { ICON_CAMERA } from '../icons.js';
import { withLatency } from '../sim.js';
import {
  chrome, headingRow, banner, emptyState, listRow, optionRow, textArea, deltaFigure, tailorBreakdown, actionBar, changeSummary,
  sheetOverlay, modalOverlay, leaveModal, leaveSheet, toast, esc, garmentIcon, garmentHead, docsEditor, wireGarmentDocs, sectionHead, textLink,
  privateNotes, wirePrivateNotes, openAttachSheet, photoStub, dueChange, wirePhotoViewer, visitBlock,
} from '../components.js';

const ID = 't-adjust';
const ADJUSTABLE = ['fitting', 'price-change'];

const firstOf = () => state.customer.first;
const ui = () => state.ui[ID];
const keyOf = (garmentId, serviceId) => `${garmentId}:${serviceId}`;
const inputId = (r) => `price-${r.garmentId}-${r.serviceId}`;

/* ---------- which appointment, which draft ---------- */
/** At the fitting (or revising the sent order); with `edit` (Study-1 B1) also a job in progress. */
const adjustable = (a, edit = false) => !!a && apptsFor('tailor').includes(a) && (ADJUSTABLE.includes(a.status) || (edit && a.status === 'in-progress'));

/** The appointment being edited: the draft's own, else the focused one, else the newest in a fitting / price-change. */
function target() {
  const edit = state.ui[ID]?.mode === 'edit';
  const own = getAppt(state.ui[ID]?.apptId);
  if (adjustable(own, edit)) return own;
  const focused = getAppt(state.ui.apptId);
  if (adjustable(focused, edit)) return focused;
  return apptsFor('tailor').find((a) => adjustable(a)) ?? null;
}
const isEdit = (d) => d?.mode === 'edit';

const nSeq = (items) => Math.max(0, ...items.map((i) => Number(String(i.id).slice(1)) || 0)) + 1;

/** Revise: rebuild the draft from the order Sarah is looking at, against the BOOKED order (D-121). Edit (Study-1 B1): from the pending
    edit's lines against the APPROVED order (`a.lines`). */
function draftFromSent(a, sent = a.priceChange?.lines ?? a.lines) {
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
  return { prices, removed, added, items, removedItems, seq: nSeq(items) };
}

/** Make sure `state.ui['t-adjust']` is a full draft for `a` (a flow may hand over only { apptId, mode }). */
function ensureDraft(a) {
  const mode = a.status === 'price-change' ? 'revise' : a.status === 'in-progress' ? 'edit' : 'new';
  let d = state.ui[ID];
  if (!d || d.apptId !== a.id) d = state.ui[ID] = { apptId: a.id, mode };
  d.mode ??= mode;
  if (d.mode === 'revise' && d.prices === undefined) Object.assign(d, draftFromSent(a));
  if (d.mode === 'edit' && d.needBy === undefined) {
    /* Study-1 B1: a pending edit is the starting point (sending again replaces it, default 13) */
    const e = a.edit?.state === 'pending' ? a.edit : null;
    if (e && d.prices === undefined) Object.assign(d, draftFromSent(a, e.lines));
    d.needBy = e?.needBy ?? a.job.needBy;
    d.reason ??= e?.reason ?? '';
    d.photo ??= !!e?.photo;
  }
  d.prices ??= {};
  d.removed ??= [];
  d.added ??= [];
  d.items ??= [];
  d.removedItems ??= [];
  d.tried ??= false;
  d.comments ??= {};
  d.commentErrors ??= {};
  /* D-182: an added item never reuses the id of a discarded item that still has photos */
  d.seq = Math.max(d.seq ?? 0, nSeq(d.items), Number(nextItemId(a).slice(1)));
  if (isEdit(d)) d.seedSig ??= editSig(a, d);
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
/** Anything Back would throw away: new → any edit; revise → the draft differs from what was sent (D-123); edit → anything moved since it opened. */
function isEdited(a, d, garments) {
  const rows = liveRows(garments);
  if (rows.some((r) => r.parsed.error)) return true;
  /* K-02: an open comment editor whose text differs from the saved comment is an edit (photos and saved comments are already saved) */
  if (Object.entries(d.comments ?? {}).some(([gid, text]) => text.trim() !== docsOf(a, gid).comment)) return true;
  if (isEdit(d)) return editSig(a, d, garments) !== d.seedSig;
  if (d.mode === 'revise') {
    const sent = (a.priceChange?.lines ?? a.lines).map(lineSig).sort().join('|');
    return previewLines(garments).map(lineSig).sort().join('|') !== sent || docsDiffer(a, liveIds(garments));
  }
  return priceChangeView(a, previewLines(garments)).changed;
}
/** Study-1 B1: everything the edit would send, as one string (Back asks first when it moved since the screen opened). */
function editSig(a, d, garments = build(a, d)) {
  const rows = liveRows(garments).map((r) => `${r.key}:${r.raw}`).sort().join('|');
  return [rows, d.needBy, (d.reason ?? '').trim(), d.photo ? 1 : 0].join('#');
}
/** The edit's lines changed vs the APPROVED order, or its due date did — else there is nothing to send. */
function editChanged(a, d, garments) {
  const cur = previewLines(garments).map(lineSig).sort().join('|');
  return cur !== a.lines.map(lineSig).sort().join('|') || d.needBy !== a.job.needBy;
}

/** Errors the screen shows after Send was pressed. */
function checks(d, garments) {
  const rows = liveRows(garments);
  const fields = {};
  for (const r of rows) if (r.parsed.error) fields[r.key] = r.parsed.error;
  const out = { fields, empty: rows.length === 0, reason: '' };
  if (isEdit(d)) {
    const why = (d.reason ?? '').trim();
    out.reason = !why ? `Tell ${firstOf()} why you’re changing it.` : [...why].length > TAILOR_LIMITS.NOTE_MAX ? `Keep the reason under ${TAILOR_LIMITS.NOTE_MAX} characters.` : '';
  }
  return out;
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

/** `ctx.edit` (Study-1 B1): the fitting photos stay locked after approval (D-175), so an edit's cards have no docs block. */
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
      <div class="${ID}__head">${garmentHead({ type: g.type, tag: g.isNew ? tag('New item', 'new-item') : '', as: 'h2', services: g.rows.filter((r) => !r.removed).length ? g.rows.filter((r) => !r.removed).map((r) => r.label) : null })}</div>
      ${g.rows.map((r) => rowHtml(r, errors, busy, g.isNew)).join('')}${more ? `<div class="${ID}__add">${listRow({ title: '+ Add a service', act: 'add-service' }).replace('data-act="add-service"', `data-act="add-service" data-garment="${esc(g.id)}"${dis}`)}</div>` : ''}
      ${ctx.edit ? '' : docsEditor({
    garmentId: g.id, type: g.type, docs: docsOf(ctx.a, g.id), missing: ctx.missing.get(g.id) ?? { before: false, pinned: false },
    commentDraft: ctx.d.comments[g.id] ?? null, commentError: ctx.d.commentErrors[g.id] ? `Keep the comment under ${FITTING_LIMITS.COMMENT_MAX} characters.` : '', busy, first: ctx.first, tried: ctx.d.tried,
  })}
      <div class="${ID}__remove">${textLink('Remove item', { act: 'remove-item', tone: 'danger', disabled: busy, attrs: `data-garment="${esc(g.id)}" aria-label="Remove item: ${esc(g.type)}"` })}</div>
    </div>
  </section>`;
}

/** A figure with no amount yet (a price in the draft can't be read): the label and a dash. */
const dashFigure = (label) => `<div class="delta-figure"><p class="t-caps c-600 delta-figure__label">${esc(label)}</p><p class="t-money delta-figure__amt" aria-label="not available">—</p></div>`;

function view() {
  const a = target();
  const chromeHtml = chrome('home', { persona: 'tailor' });
  if (!a) {
    return `${chromeHtml}<main class="body ${ID}" data-s="${ID}--none">
  <div class="${ID}__empty" data-empty="no-job">${emptyState({ title: 'Nothing to edit', body: 'You can edit the job during a fitting.', art: 'Suit Jacket', ctaLabel: 'Back to Home', ctaAct: 'home' })}</div>
</main>`;
  }
  const d = ensureDraft(a);
  if (isEdit(d)) return editView(a, d, chromeHtml);
  const first = firstOf();
  const revise = d.mode === 'revise';
  const garments = build(a, d);
  const errors = d.tried ? checks(d, garments) : { fields: {}, empty: false };
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
  const hero = `<p class="t-caps c-600 ${ID}__eyebrow">At the fitting</p><h1 class="t-title">Final order</h1>`   /* K-42 (D-297): one title at the fitting, first send or revise */
    + `<!--notes--><div class="status-hero__notes"><p class="t-body c-700">Photograph each item before and after pinning, then send ${esc(first)} the final order.</p><p class="t-small c-600 ${ID}__consent">Ask before you take photos of ${esc(first)}. Keep faces out of the shot.</p></div><!--/notes-->`;   // SF-34
  /* K-02 (D-178): the card says what is missing, the bar says how many items still need photos */
  const gaps = docsMissing(a, liveIds(garments));
  const missing = new Map(gaps.map((m) => [m.garmentId, m]));
  const missingN = gaps.length;
  /* D-196: missing photos = a soft-disabled Send (a tap tells her what is missing); only "nothing to resend" is a hard disable */
  const softDisabled = !busy && missingN > 0;
  const sendDisabled = !busy && missingN === 0 && revise && !edited;
  const ctx = { a, d, missing, first };
  /* D-126: the bar carries both figures, the customer's first, so the total moves in view while the cards are edited */
  /* P1-3 (D-224): the name may break; the label + amount atom never does */
  const pair = `<span class="${ID}__lead-pair">${esc(first)} <span class="nb">pays <b data-money>${fmtExact(pv.after.total)}</b></span></span><span class="${ID}__lead-pair"><span class="nb">Your payout <b data-money>${fmtExact(pv.after.payout)}</b></span></span>`;
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
  ${notesHtml(a, d, busy)}
  <section class="sec" aria-labelledby="${ID}-changes">
  ${sectionHead('What changes', { id: `${ID}-changes` })}
  <div class="${ID}__summary" data-live="summary">${bad ? '' : changeSummary(real.counts)}</div>
  <div class="${ID}__figures${same ? ` ${ID}__figures--none` : ''}" data-live="figures">${same ? '' : `
    ${bad ? dashFigure(`${first} pays`) : none ? deltaFigure({ label: `${first} pays`, cents: frozen.after.total }) : deltaFigure({ label: `${first} pays`, cents: pv.after.total, was: pv.before.total })}
    ${bad ? dashFigure('Your payout') : none ? deltaFigure({ label: 'Your payout', cents: frozen.after.payout }) : deltaFigure({ label: 'Your payout', cents: pv.after.payout, was: pv.before.payout })}
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

/** K-31 (Study-1 B2): the private General notes in place of the old whole-order note to the customer. */
function notesHtml(a, d, busy) {
  if (!notesEditable(a)) return '';
  return `<div class="${ID}__notes">${privateNotes({ notes: a.notes ?? [], draft: d.noteDraft ?? null, type: a.job.garments[0]?.type ?? '', id: `${ID}-notes`, busy })}</div>`;
}

/* ---------- Study-1 B1: edit the job after the fitting (K-30) ---------- */
/** "Fri, Oct 26" + "3 days later" for the due-date sheet: tomorrow on, from a few days before the approved date to two weeks after it. */
function dueOptions(a) {
  const from = isoDay(addDays(now(), 1));
  const out = [];
  for (let i = -3; i <= 14; i += 1) {
    const day = isoDay(addDays(a.job.needBy, i));
    if (day < from) continue;
    out.push({ day, sub: i === 0 ? 'Current due date' : `${Math.abs(i)} day${Math.abs(i) === 1 ? '' : 's'} ${i > 0 ? 'later' : 'earlier'}` });
  }
  return out;
}
function editView(a, d, chromeHtml) {
  const first = firstOf();
  const garments = build(a, d);
  const errors = d.tried ? checks(d, garments) : { fields: {}, empty: false, reason: '' };
  const none = liveRows(garments).length === 0;
  const bad = liveRows(garments).filter((r) => r.parsed.error).length;
  const busy = !!d.busy;
  const lines = none ? a.lines : previewLines(garments);
  const ev = jobEditView(a, { lines, needBy: d.needBy });
  const pending = a.edit?.state === 'pending';
  const changed = editChanged(a, d, garments);
  const same = !bad && !none && !ev.changed;
  const atMax = garments.length >= MAX_ITEMS;
  const ctx = { a, d, missing: new Map(), first, edit: true };
  const hero = `<p class="t-caps c-600 ${ID}__eyebrow">After the fitting</p><h1 class="t-title">Edit order</h1>`   /* K-42 */
    + `<!--notes--><div class="status-hero__notes"><p class="t-body c-700">Your private notes are yours to change any time. A new price, due date or work needs ${esc(first)}’s approval.</p></div><!--/notes-->`;
  const due = d.needBy !== a.job.needBy
    ? dueChange({ needBy: d.needBy, was: a.job.needBy })
    : `<span>${esc(fmtDay(d.needBy))}</span>`;
  const daysOut = dayDiff(a.slot.start, d.needBy);
  const photo = d.photo
    ? `<div class="${ID}__photo">${photoStub({ type: a.job.garments[0]?.type ?? '', tone: 0, size: 'tile', alt: 'Photo for the change' })}${textLink('Remove photo', { act: 'edit-photo-remove', tone: 'danger', disabled: busy })}</div>`
    : `<div class="card card--list ${ID}__photo-add">${listRow({ title: `Add a photo so the customer sees why`, sub: 'Optional', act: 'edit-photo', lead: ICON_CAMERA, chevron: false })}</div>`;
  const pair = `<span class="${ID}__lead-pair">${esc(first)} <span class="nb">pays <b data-money>${fmtExact(ev.after.total)}</b></span></span><span class="${ID}__lead-pair"><span class="nb">Your payout <b data-money>${fmtExact(ev.after.payout)}</b></span></span>`;
  const lead = none ? 'Add an item or service to see the new total' : bad ? `Fix ${bad} price${bad > 1 ? 's' : ''} to see the new total` : `<span class="${ID}__lead">${pair}</span>`;
  const off = !busy && !changed;
  return `${chromeHtml}<main class="body body--with-bar ${ID}" data-s="${ID}--edit" data-appt="${esc(a.id)}"${d.tried ? ' data-tried="true"' : ''}>
  ${headingRow(hero)}
  <div class="${ID}__content"${busy ? ' inert aria-busy="true"' : ''}>
  ${pending ? `<div class="${ID}__info">${banner({ tone: 'info', text: `${esc(first)} hasn’t answered your changes yet. Sending again replaces them.` })}</div>` : ''}
  <div class="${ID}__garments">${garments.map((g) => garmentHtml(g, errors, busy, ctx)).join('')}
    <div class="card ${ID}__card ${ID}__card--add">${listRow({ title: '+ Add an item', act: 'add-item' }).replace('data-act="add-item"', `data-act="add-item"${atMax || busy ? ' disabled aria-disabled="true"' : ''}`)}${atMax ? `<p class="t-small c-600 ${ID}__max">Up to ${MAX_ITEMS} items on one job.</p>` : ''}</div>
  </div>
  <div class="${ID}__empty-err" data-live="empty">${errors.empty ? banner({ tone: 'error', text: 'Keep at least one item with a service on this job.' }) : ''}</div>
  <section class="sec" aria-labelledby="${ID}-due">
  ${sectionHead('Due date', { id: `${ID}-due` })}
  ${visitBlock([{ icon: 'clock', value: due, strong: true, detail: `${daysOut} day${daysOut === 1 ? '' : 's'} after the fitting` }], { title: '', action: '' })}
  <div class="${ID}__due-change">${textLink('Change the due date', { act: 'edit-due', disabled: busy })}</div>
  </section>
  <section class="sec ${ID}__why" aria-labelledby="${ID}-why">
  ${sectionHead('Why it’s changing', { id: `${ID}-why` })}
  ${textArea({ id: 'edit-reason', label: `Reason for the change (${first} sees this)`, value: d.reason ?? '', rows: 3, max: TAILOR_LIMITS.NOTE_MAX, helper: 'Phone numbers and emails are hidden.', error: errors.reason })}
  ${photo}
  </section>
  <section class="sec" aria-labelledby="${ID}-changes">
  ${sectionHead('What changes', { id: `${ID}-changes` })}
  <div class="${ID}__summary" data-live="summary">${bad ? '' : ev.changed ? changeSummary(ev.counts) : '<p class="t-body c-700">Same items, same price.</p>'}</div>
  <div class="${ID}__figures${same ? ` ${ID}__figures--none` : ''}" data-live="figures">${same ? '' : `
    ${bad ? dashFigure(`${first} pays`) : deltaFigure({ label: `${first} pays`, cents: ev.after.total, was: ev.before.total })}
    ${bad ? dashFigure('Your payout') : deltaFigure({ label: 'Your payout', cents: ev.after.payout, was: ev.before.payout })}`}
  </div>
  <div class="${ID}__breakdown" data-live="breakdown">${bad ? '' : tailorBreakdown(ev.after)}</div>
  <p class="t-small c-600 ${ID}__fine" data-money>${esc(first)}’s ${fmtExact(a.payments.deposit.cents)} deposit stays the same.</p>
  </section>
  </div>
</main>
${actionBar({
    ctaLabel: `Send to ${first}`, ctaAct: 'send', disabled: off, busy, busyLabel: 'Sending…',
    note: off ? 'Change the price, the due date or the work to send it.' : '', lead,
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
  /* invalid state of the inputs, copied without touching the focused element */
  tpl.content.querySelectorAll('.field__input[data-key]').forEach((next) => {
    const cur = root.querySelector(`#${CSS.escape(next.id)}`);
    if (!cur) return;
    for (const attr of ['aria-invalid', 'aria-describedby']) {
      if (next.hasAttribute(attr)) cur.setAttribute(attr, next.getAttribute(attr)); else cur.removeAttribute(attr);
    }
    cur.closest('.field__box')?.classList.toggle(`${ID}__box--error`, next.hasAttribute('aria-invalid'));
  });
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
    name: 'type', value: type, title: esc(type), sub, act: 'pick-type', lead: garmentIcon(type),   /* K-05: bare 40 px icon first, then the name */
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
  const body = isEdit(ui())
    ? `Your changes aren’t sent. ${firstOf()} keeps the order she approved until you send them.`   // Study-1 B1
    : `${firstOf()} can’t approve the order until you send it. Your photos and comments are saved. Item and price changes aren’t.`;
  leaveSheet({ title: 'Leave without sending?', body }, { dataS: `${ID}-leave` }, (holder, close) => {
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

/** Study-1 B1: send the edit. The reason is checked here first, each error next to its field; then the model's own guards. */
function sendEdit(a) {
  const d = ui();
  if (d.busy) return;
  d.tried = true;
  const garments = build(a, d);
  const errors = checks(d, garments);
  const firstBad = Object.keys(errors.fields)[0];
  if (firstBad || errors.empty || errors.reason) {
    const row = garments.flatMap((g) => g.rows).find((r) => r.key === firstBad);
    rerender(row ? `#${q(inputId(row))}` : errors.reason ? '#edit-reason' : null);
    if (errors.empty) document.querySelector('#screen [data-live="empty"]')?.scrollIntoView({ block: 'center' });
    return;
  }
  const lines = liveRows(garments).map((r) => ({
    garmentId: r.garmentId, garmentType: r.garmentType, serviceId: r.serviceId, label: r.label, cents: r.parsed.cents,
  }));
  const payload = { lines, needBy: d.needBy, reason: d.reason, photo: !!d.photo };
  const resend = a.edit?.state === 'pending';
  d.busy = true;
  rerender();
  withLatency(() => {
    d.busy = false;
    if (currentScreen() !== ID) return;
    const r = T.sendJobEdit(a.id, payload);
    if (r.ok) {
      delete state.ui[ID];
      setFocus(a.id);
      go('t-job', { fresh: true });
      toast(resend ? `Updated changes sent to ${firstOf()}.` : `Sent to ${firstOf()}. She can approve or message you.`, { tone: 'success' });
    } else if (r.error === 'not-in-progress') {
      delete state.ui[ID];
      setFocus(a.id);
      go('t-job', { replace: true });
      toast('This job can’t be edited any more.', { tone: 'error' });
    } else {
      rerender();
      toast(r.error === 'no-change' ? 'Change the price, the due date or the work to send it.' : 'Couldn’t send the changes. Try again.', { tone: 'error' });
    }
  });
}

function openDue(a) {
  const d = ui();
  const rows = dueOptions(a).map((o) => optionRow({ name: 'due', value: o.day, title: esc(fmtDay(o.day)), sub: o.sub, checked: o.day === d.needBy, act: 'pick-due' })).join('');
  sheetOverlay(`<div class="${ID}-sheet"><div role="radiogroup" aria-label="Due date">${rows}</div></div>`, { header: 'Due date', confirm: false, dataS: `${ID}--edit-due` }, (holder, close) => {
    holder.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act="pick-due"]');
      if (!el) return;
      d.needBy = el.dataset.value;
      close({ instant: true });
      rerender('[data-act="edit-due"]');
    });
  });
}

function send(a) {
  const d = ui();
  if (d.busy) return;
  if (isEdit(d)) { sendEdit(a); return; }
  if (!saveOpenComments(a, d)) return;
  d.tried = true;
  const garments = build(a, d);
  const errors = checks(d, garments);
  const firstBad = Object.keys(errors.fields)[0];
  if (firstBad || errors.empty) {
    const row = garments.flatMap((g) => g.rows).find((r) => r.key === firstBad);
    rerender(row ? `#${q(inputId(row))}` : null);
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
  const revise = d.mode === 'revise';
  d.busy = true;
  rerender();
  withLatency(() => {
    d.busy = false;
    if (currentScreen() !== ID) return;
    const r = T.sendPriceChange(a.id, lines);
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
        if (!isEdit(ui()) && docsMissing(a, liveIds(build(a, ui()))).length && !ui().tried) { ui().tried = true; rerender(); }
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
    else if (act === 'edit-due') openDue(a);
    else if (act === 'edit-photo') {
      openAttachSheet({ count: 0, max: 1, note: `${firstOf()} sees this photo with your reason.` }, () => { d.photo = true; rerender('[data-act="edit-photo-remove"]'); });
    } else if (act === 'edit-photo-remove') { d.photo = false; rerender('[data-act="edit-photo"]'); }
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
    } else if (t.id === 'edit-reason') {
      d.reason = t.value;
      const n = [...t.value].length;
      const count = root.querySelector('#edit-reason-count');
      if (count) { count.textContent = `${n} / ${TAILOR_LIMITS.NOTE_MAX}`; count.classList.toggle('text-area__count--over', n > TAILOR_LIMITS.NOTE_MAX); }
    }
  });

  /* K-31 (Study-1 B2): the private General notes (new / revise; an edit after the fitting keeps them on the job page) */
  wirePhotoViewer(root);
  if (!isEdit(d) && notesEditable(a)) {
    wirePrivateNotes(root, {
      draft: () => ui()?.noteDraft ?? null,
      setDraft: (nd) => { if (nd) ui().noteDraft = nd; else delete ui().noteDraft; },
      notes: () => a.notes ?? [],
      save: (nd) => (nd.id ? T.updateNote(a.id, nd.id, { text: nd.text, photos: nd.photos }) : T.addNote(a.id, { text: nd.text, photos: nd.photos })),
      remove: (noteId) => T.removeNote(a.id, noteId),
      restore: (note, index) => T.restoreNote(a.id, note, index),
      rerender,
    });
  }
}

register(ID, view, wire);
