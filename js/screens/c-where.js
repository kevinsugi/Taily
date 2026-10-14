/* ============================================================
   c-where — C2 Where and when. M1 spec §C2.
   Visit type, where, and the need-by date: the three filters for the tailor list.
   Focal: the visit-type segmented control.
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, T, now, tailorsFor } from '../state.js';
import {
  flowBar, headingRow, chipGroup, field, actionBar, cta, sheetOverlay, wireChipGroups, wireWheel, esc, ICON_ALERT,
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

function openAddress() {
  const a = state.job.address ?? {};
  const base = state.customer.address ?? {};
  const html = `<div class="where-sheet__fields">
  ${field({ id: 'street', label: 'Street address', value: a.street ?? '', autocomplete: 'address-line1' })}
  ${field({ id: 'unit', label: 'Apt, suite or unit (optional)', value: a.unit ?? '', autocomplete: 'address-line2' })}
  ${field({ id: 'city', label: 'City', value: a.city ?? base.city ?? '', autocomplete: 'address-level2' })}
  ${field({ id: 'zip', label: 'ZIP code', value: a.zip ?? state.job.zip ?? '', inputmode: 'numeric', maxlength: 5, autocomplete: 'postal-code' })}
</div>
${cta('Save address', { attrs: 'data-act="save-address"' })}`;
  sheetOverlay(html, { header: 'Your address', dataS: `${ID}-address`, confirm: false }, (holder, close) => {
    holder.querySelector('#zip').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5); });
    const save = () => {
      const val = (id) => holder.querySelector(`#${id}`).value.trim();
      const street = val('street'); const zip = val('zip');
      const bad = {};
      if (!street) bad.street = 'Enter your street address.';
      if (!/^\d{5}$/.test(zip)) bad.zip = 'Enter a 5-digit ZIP code.';
      ['street', 'zip'].forEach((id) => setFieldError(holder, id, bad[id] ?? ''));
      const first = ['street', 'zip'].find((id) => bad[id]);
      if (first) { holder.querySelector(`#${first}`).focus(); return; }
      T.setJob({ address: { street, unit: val('unit'), city: val('city'), state: 'NY', zip }, zip });
      close();
      go(ID);
      requestAnimationFrame(() => document.querySelector('#screen [data-act="edit-address"]')?.focus({ preventScroll: true }));
    };
    holder.querySelector('[data-act="save-address"]').addEventListener('click', save);
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
    if (ok) { ui().submitted = false; go('c-tailors'); return; }
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
