/* ============================================================
   c-where — C2 Where and when. M1 spec §C2.
   Visit type, where, and the need-by date: the three filters for the tailor list.
   Focal: the visit-type segmented control.
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, T, now, tailorsFor, tailorById, eligible, savedAddressOf } from '../state.js';
import {
  flowBar, headingRow, chipGroup, field, actionBar, cta, sheetOverlay, wireChipGroups, wireWheel, esc, ICON_ALERT, addressFields, ADDRESS_ERRORS, optionRow, sectionHead,
} from '../components.js';
import { scheduler, dateColumn, dayRows, readScheduler, SCHED_ROW } from '../scheduler.js';
import { addDays, strip, dayDiff, isoDay, fmtDay } from '../dates.js';
import { SHOP_RADIUS_MI } from '../data.js';
import { CHEVRON_RIGHT } from '../icons.js';

const ID = 'c-where';
const NEEDBY_DAYS = 60;

const ui = () => (state.ui[ID] ??= {});
const tomorrow = () => addDays(strip(new Date(now())), 1);

const MSG = {
  zip: 'Enter a 5-digit ZIP code.',
  address: 'Add your street address so the tailor can find you.',
  needByPast: 'That date has passed. Pick tomorrow or later.',
  needByMissing: 'Pick a date.',
};

/** Errors on screen: a past need-by is already wrong on arrival; the rest appear once Next has been pressed. */
function errorsNow() {
  const { errors } = T.validateJob(state.job, 'where');
  const out = {};
  if (errors.needBy === 'needby-past') out.needBy = MSG.needByPast;
  if (ui().submitted) {
    if (errors.zip) out.zip = MSG.zip;
    if (errors.address) out.address = MSG.address;
    if (errors.needBy === 'needby-required') out.needBy = MSG.needByMissing;
  }
  return out;
}

const hasRush = () => tailorsFor(state.job).rows.some((r) => r.quote.rush > 0);   // D-39

function addressBlock(job, err) {
  const a = job.address;
  const street = a?.street ? `${esc(a.street)}${a.unit ? `, ${esc(a.unit)}` : ''}` : '';
  const lines = street
    ? `<span class="where__card-main t-body w-600">${street}</span><span class="where__card-sub t-small c-600">${esc(a.city)}, ${esc(a.state ?? 'NY')} ${esc(a.zip ?? job.zip)}</span>`
    : '<span class="where__card-main t-body w-600 c-accent-ink">Add your address</span>';
  const errId = 'address-msg';
  return `<div class="where__group">
  <span class="where__label t-small w-600 c-700" id="address-label">Your address</span>
  <button type="button" class="where__card${err ? ' where__card--error' : ''}" data-act="edit-address" id="address-card" aria-labelledby="address-label address-card"${err ? ` aria-invalid="true" aria-describedby="${errId}"` : ''}>
    <span class="where__card-text">${lines}</span>
    ${street ? '<span class="where__card-action t-body w-600 c-accent-ink">Change</span>' : CHEVRON_RIGHT.replace('method-row__chevron', 'where__chevron')}
  </button>
  ${err ? `<p class="field__msg field__msg--error" id="${errId}" role="alert">${err}</p>` : ''}
  <p class="t-small c-600">Only your neighborhood is shared until a tailor accepts.</p>
</div>`;
}

function needByBlock(job, err) {
  const has = !!job.needBy;
  return `<div class="where__group">
  <span class="where__label t-small w-600 c-700" id="needby-label">Need it by</span>
  <button type="button" class="where__card where__card--date${err ? ' where__card--error' : ''}" data-act="edit-needby" aria-labelledby="needby-label needby-value"${err ? ' aria-invalid="true" aria-describedby="needby-msg"' : ''}>
    <span class="where__card-text"><span class="where__card-main t-body w-600${has ? '' : ' c-accent-ink'}" id="needby-value">${has ? fmtDay(job.needBy) : 'Pick a date'}</span></span>
    <span class="where__card-action t-body w-600 c-accent-ink">Change</span>
  </button>
  ${err ? `<p class="field__msg field__msg--error" id="needby-msg" role="alert">${err}</p>` : ''}
  <p class="where__rush t-small w-600" data-rush${hasRush() ? '' : ' hidden'}><span class="where__rush-icon" aria-hidden="true">${ICON_ALERT}</span><span>A date this soon can add a rush fee. Each tailor’s price includes it.</span></p>
</div>`;
}

function view() {
  const job = state.job;
  const err = errorsNow();
  const place = job.visitType === 'shop'
    ? field({
      id: 'zip', label: 'Your ZIP code', inputmode: 'numeric', maxlength: 5, autocomplete: 'postal-code', value: job.zip ?? '',
      helper: `We’ll show shops within ${SHOP_RADIUS_MI} miles.`, error: err.zip ?? '',
    })
    : addressBlock(job, err.address ?? err.zip ?? '');
  return `${flowBar({ step: 1 })}<main class="body body--with-bar ${ID}">
  ${headingRow('<h1 class="t-title">Where and when</h1>', { back: false })}
  <div class="where__form">
    ${chipGroup({
    name: 'visit', label: 'Visit', variant: 'segmented', value: job.visitType,
    options: [{ value: 'home', label: 'At my place', caption: 'The tailor comes to you' }, { value: 'shop', label: 'At the shop', caption: 'You visit the tailor' }],
  })}
    ${place}
    ${needByBlock(job, err.needBy ?? '')}
  </div>
</main>${actionBar({ ctaLabel: 'See tailors', ctaAct: 'next' })}`;
}

/* ---------- field errors inside the address sheet ---------- */
function setFieldError(holder, id, msg) {
  const wrap = holder.querySelector(`#${id}`)?.closest('.field');
  if (!wrap) return;
  const input = wrap.querySelector('input');
  let p = wrap.querySelector('.field__msg');
  wrap.classList.toggle('field--error', !!msg);
  if (msg) {
    input.setAttribute('aria-invalid', 'true');
    if (!p) { p = document.createElement('p'); p.id = `${id}-msg`; wrap.appendChild(p); }
    p.className = 'field__msg field__msg--error';
    p.setAttribute('role', 'alert');
    p.textContent = msg;
    input.setAttribute('aria-describedby', p.id);
  } else {
    input.removeAttribute('aria-invalid');
    p?.remove();
    input.removeAttribute('aria-describedby');
  }
}

/* S-27 (pre-MVP B2, D-379): the address sheet starts with her saved addresses (one tap books there), then the same four fields as
   Saved addresses — street, unit, ZIP (city from it), access notes — for an address used for this booking only. */
const oneLine = (a) => `${a.street}${a.unit ? `, ${a.unit}` : ''}, ${a.city} ${a.zip}`;
function addressSheetHtml(values, errors = {}) {
  const saved = state.customer.addresses ?? [];
  const current = savedAddressOf();
  const picker = saved.length ? `<section class="where-sheet__saved" aria-labelledby="where-saved-h">
  ${sectionHead('Saved addresses', { id: 'where-saved-h' })}
  <div class="where-sheet__group" role="radiogroup" aria-labelledby="where-saved-h">${saved.map((a) => optionRow({
    name: 'saved', value: a.id, title: esc(a.label), sub: esc(oneLine(a)), checked: current?.id === a.id, act: 'saved-address',
  })).join('')}</div>
</section>` : '';
  return `<div class="where-sheet">
${picker}
<section class="where-sheet__other" aria-labelledby="where-other-h">
  ${saved.length ? sectionHead('Another address', { id: 'where-other-h' }) : '<h2 class="sr-only" id="where-other-h">Your address</h2>'}
  <div class="where-sheet__fields">${addressFields({ values, errors })}</div>
  ${cta(saved.length ? 'Use this address' : 'Save address', { attrs: 'data-act="save-address"' })}
</section>
</div>`;
}

function openAddress() {
  const a = state.job.address ?? {};
  const values = savedAddressOf() ? { zip: '' } : { street: a.street ?? '', unit: a.unit ?? '', zip: a.zip ?? state.job.zip ?? '', notes: a.notes ?? '' };
  const done = () => requestAnimationFrame(() => document.querySelector('#screen [data-act="edit-address"]')?.focus({ preventScroll: true }));
  sheetOverlay(addressSheetHtml(values), { header: 'Your address', dataS: `${ID}-address`, confirm: false }, (holder, close) => {
    holder.addEventListener('input', (e) => { if (e.target.id === 'zip') e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5); });
    const save = () => {
      const val = (id) => holder.querySelector(`#${id}`).value.trim();
      const r = T.setJobAddress({ street: val('street'), unit: val('unit'), zip: val('zip'), notes: val('notes') });
      ['street', 'zip', 'notes'].forEach((id) => setFieldError(holder, id, r.ok ? '' : (r.errors[id] ? ADDRESS_ERRORS[id] : '')));
      if (!r.ok) { holder.querySelector(`#${['street', 'zip', 'notes'].find((id) => r.errors[id])}`)?.focus(); return; }
      close();
      go(ID);
      done();
    };
    holder.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el) return;
      if (el.dataset.act === 'save-address') save();
      else if (el.dataset.act === 'saved-address') { T.useSavedAddress(el.dataset.value); close(); go(ID); done(); }
    });
  });
}

function openNeedBy() {
  const start = tomorrow();
  const rows = dayRows(start, NEEDBY_DAYS);
  const sel = state.job.needBy ? Math.max(0, Math.min(NEEDBY_DAYS - 1, dayDiff(start, state.job.needBy))) : 0;
  const columns = [dateColumn(rows, sel)];
  /* R1-2-C-03: header (title + ✕) → caption → wheel → Done, like every other M1 sheet; the card drops its own title */
  const html = `<p class="t-small c-600">Pick the day you need it back.</p>
${scheduler({ title: '', columns, cta: 'Done', ctaAct: 'needby-done', inline: true })}`;
  sheetOverlay(html, { header: 'Need it by', dataS: `${ID}-needby`, confirm: false }, (holder, close) => {
    wireWheel(holder, null, SCHED_ROW);
    holder.querySelector('[data-act="needby-done"]').addEventListener('click', () => {
      const [{ index }] = readScheduler(holder, columns);
      T.setJob({ needBy: isoDay(addDays(start, index)) });
      close();
      go(ID);
      requestAnimationFrame(() => document.querySelector('#screen [data-act="edit-needby"]')?.focus({ preventScroll: true }));
    });
  });
}

/* ---------- wiring ----------
   Listeners go on this screen's own <main> / action bar (replaced on every render), never on the
   shared #screen element, so they cannot stack up across renders or screens. */
function wire(root) {
  const main = root.querySelector('main');
  const bar = root.querySelector('.action-bar');
  wireChipGroups(main);

  main.addEventListener('chip', (e) => {
    if (e.detail.name !== 'visit') return;
    T.setJob({ visitType: e.detail.value });
    go(ID);
    requestAnimationFrame(() => document.querySelector(`#screen [data-chip-group="visit"] [data-value="${e.detail.value}"]`)?.focus({ preventScroll: true }));
  });

  main.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="edit-address"]')) openAddress();
    else if (e.target.closest('[data-act="edit-needby"]')) openNeedBy();
  });

  /* the ZIP is saved on change, and the rush caption follows in place — a re-render here would swallow
     the click that caused the blur */
  const zip = main.querySelector('#zip');
  if (zip) {
    zip.addEventListener('input', () => { zip.value = zip.value.replace(/\D/g, '').slice(0, 5); });
    zip.addEventListener('change', () => {
      T.setJob({ zip: zip.value });
      main.querySelector('[data-rush]').hidden = !hasRush();
    });
  }

  bar.addEventListener('click', (e) => {
    const next = e.target.closest('[data-act="next"]');
    if (!next || next.disabled) return;
    if (zip) T.setJob({ zip: zip.value });
    const { ok, errors } = T.validateJob(state.job, 'where');
    if (ok) {
      ui().submitted = false;
      /* Study-1 A4 (default 9): "Book again" goes straight to that tailor's profile while she still serves this place; else the list */
      const again = state.ui.booking?.again ? tailorById(state.ui.booking.tailorId) : null;
      go(again && eligible(again, state.job).ok ? 'c-tailor' : 'c-tailors');
      return;
    }
    ui().submitted = true;
    go(ID);
    const target = errors.zip && state.job.visitType === 'shop' ? '#zip'
      : errors.address || errors.zip ? '[data-act="edit-address"]'
        : '[data-act="edit-needby"]';
    document.querySelector(`#screen ${target}`)?.focus();
  });

  /* c-tailors / c-book empty states send Sarah here to change the date */
  if (ui().openNeedBy) {
    ui().openNeedBy = false;
    openNeedBy();
  }
}

register(ID, view, wire);
