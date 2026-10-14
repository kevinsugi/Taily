/* ============================================================
   c-job — C1 What needs work (Home tab). M1 spec §C2.
   Garments + the services for each one. No prices here (per tailor, D-45).
   Focal: the garment grid while empty; the "Your items" list once filled.
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, T, activeAppt, statusScreen, tailorById, priceChangeView } from '../state.js';
import {
  chrome, bookingSteps, garmentTile, photoTile, actionBar, checkRow, cta, listRow, apptRow,
  sheetOverlay, toast, esc, garmentIcon,
} from '../components.js';
import { GARMENT_TYPES, SERVICES, MAX_ITEMS, itemsLabel, servicesForType } from '../data.js';
import { CHEVRON_RIGHT } from '../icons.js';
import { fmtColumn } from '../money.js';
import { fmtWhen } from '../dates.js';
import { VISIT_LABEL } from '../data.js';
import { setFocus, statusWord } from '../focus.js';

const ID = 'c-job';
const MAX_PHOTOS = 3;   // per garment (D-42)

/* ---------- typed / transient UI: which garments show the "choose a service" error ---------- */
const ui = () => (state.ui[ID] ??= { errors: {} });

const serviceText = (g) => g.services.map((id) => SERVICES[id]?.label).filter(Boolean).join(' · ');

function itemCard(g) {
  const hasErr = !!ui().errors[g.id];
  const errId = `svc-err-${g.id}`;
  const thumbs = Array.from({ length: g.photos }, () => photoTile('photo')).join('');
  const addPhoto = g.photos < MAX_PHOTOS
    ? `<button type="button" class="job-item__add" data-act="add-photo" data-id="${g.id}" aria-label="Add a photo of the ${esc(g.type)}">${photoTile('add')}</button>`
    : '';
  return `<article class="job-item" data-id="${g.id}">
  <div class="job-item__head">
    ${garmentIcon(g.type)}
    <span class="job-item__type t-body w-600">${esc(g.type)}</span>
    <button type="button" class="job-item__remove" data-act="remove-garment" data-id="${g.id}" aria-label="Remove ${esc(g.type)}"><span aria-hidden="true">✕</span></button>
  </div>
  <button type="button" class="job-item__services${hasErr ? ' job-item__services--error' : ''}" data-act="pick-services" data-id="${g.id}"${hasErr ? ` aria-invalid="true" aria-describedby="${errId}"` : ''}>
    <span class="job-item__services-text t-body ${g.services.length ? 'c-700' : 'c-accent-ink'}">${g.services.length ? esc(serviceText(g)) : 'Choose what needs doing'}</span>
    ${CHEVRON_RIGHT.replace('method-row__chevron', 'job-item__chevron')}
  </button>
  ${hasErr ? `<p class="field__msg field__msg--error" id="${errId}" data-error="service" role="alert">Choose at least one service.</p>` : ''}
  <div class="job-item__photos">
    <div class="photo-tiles">${thumbs}${addPhoto}</div>
    <p class="job-item__caption t-small c-600">Photos help the tailor quote (optional)</p>
  </div>
</article>`;
}

/** D-168: Home leads with the booking in flight — one appointment row, then the wizard under "Book something else". */
function activeRow() {
  const a = activeAppt();
  if (!a) return '';
  const t = tailorById(a.tailorId) ?? state.tailors[0];
  const w = statusWord(a, 'customer', { short: true });
  const row = {
    id: a.id, name: t.name, initials: t.initials, status: w.pill, pillLabel: w.label,
    when: fmtWhen(a.status === 'suggested' && a.suggested ? a.suggested.start : a.slot.start), place: VISIT_LABEL.customer[a.job.visitType],
  };
  let cents = a.money.total;
  if (a.status === 'price-change') { cents = priceChangeView(a).after.total; row.amountCaption = 'Approve order'; row.captionTone = 'action'; }
  else if (a.status === 'ready') { cents = a.money.balance; row.amountCaption = 'Pay now'; row.captionTone = 'action'; }
  else if (a.status === 'suggested') { row.amountCaption = 'New time'; row.captionTone = 'action'; }
  const fmtAmt = fmtColumn([cents]);
  if (a.status !== 'requested' && a.status !== 'suggested' && a.status !== 'expired') row.amountText = ['confirmed', 'fitting'].includes(a.status) ? `Est. ${fmtAmt(cents)}` : fmtAmt(cents);
  return `<section class="${ID}__active" data-active-appt aria-label="Your booking">${apptRow(row)}</section>
  <p class="t-caps c-600 ${ID}__book-else">Book something else</p>`;
}

function view() {
  const { garments } = state.job;
  const count = (type) => garments.filter((g) => g.type === type).length;
  const full = garments.length >= MAX_ITEMS;
  const tiles = Object.keys(GARMENT_TYPES).map((type) => {
    const qty = count(type);
    const off = full && qty === 0 ? ' disabled aria-disabled="true"' : '';
    return garmentTile(type, { qty, attrs: `data-act="add-garment" data-type="${esc(type)}"${off}`, addDisabled: full });
  }).join('');
  const helper = full ? `You can add up to ${MAX_ITEMS} items per visit.` : '';
  const items = garments.length
    ? `<section class="job__items" aria-labelledby="job-items-h">
    <div class="job__items-head"><h2 class="t-h2" id="job-items-h">Your items</h2><span class="t-small c-600 job__count">${itemsLabel(garments.length, 'item')}</span></div>
    ${garments.map(itemCard).join('')}
  </section>`
    : '';
  return `${chrome('home')}<main class="body body--with-bar ${ID}">
  ${activeRow()}
  ${bookingSteps(0)}
  <h1 class="t-title job__title">What needs work?</h1>
  <p class="t-body c-600 job__lead">Tap a garment to add it. You’ll choose what to do with each one.</p>
  <div class="tile-grid job__grid"${full ? ' data-max="true"' : ''}>${tiles}</div>
  ${helper ? `<p class="t-small c-600 job__helper" data-helper>${helper}</p>` : ''}
  ${items}
</main>${actionBar({
    ctaLabel: 'Next: where and when', ctaAct: 'next', disabled: !garments.length,
    note: garments.length ? '' : 'Add at least one garment to continue.',
  })}`;
}

/* ---------- overlays ---------- */
function openServices(root, id) {
  const g = state.job.garments.find((x) => x.id === id);
  if (!g) return;
  const rows = servicesForType(g.type).map((sid) => checkRow({
    id: `svc-${sid}`, label: SERVICES[sid].label, checked: g.services.includes(sid), attrs: `data-service="${sid}"`,
  })).join('');
  const html = `<p class="t-small c-600">Pick all that apply. Each tailor prices these on their profile.</p>
<div class="job-svc__list">${rows}</div>
<div class="job-svc__cta">${cta('Done', { attrs: 'data-act="services-done"' })}</div>`;
  sheetOverlay(html, { header: `${esc(g.type)} — what needs doing?`, dataS: `${ID}-services`, confirm: false }, (holder, close) => {
    const done = () => {
      const ids = [...holder.querySelectorAll('[data-service]:checked')].map((el) => el.dataset.service);
      T.setServices(g.id, ids);
      if (ids.length) delete ui().errors[g.id];
      close();
      go(ID);
      requestAnimationFrame(() => document.querySelector(`#screen [data-act="pick-services"][data-id="${g.id}"]`)?.focus({ preventScroll: true }));
    };
    holder.querySelector('[data-act="services-done"]').addEventListener('click', done);
  });
}

function openPhoto(root, id) {
  const g = state.job.garments.find((x) => x.id === id);
  if (!g || g.photos >= MAX_PHOTOS) return;
  const html = `<div class="job-photo__list">${listRow({ title: 'Take photo', act: 'photo-take' })}${listRow({ title: 'Choose from library', act: 'photo-library' })}</div>
${cta('Cancel', { variant: 'secondary', attrs: 'data-act="photo-cancel"' })}`;
  sheetOverlay(html, { header: 'Add a photo', dataS: `${ID}-photo`, confirm: false }, (holder, close) => {
    const add = () => {
      T.setJob({ garments: state.job.garments.map((x) => (x.id === id ? { ...x, photos: Math.min(MAX_PHOTOS, x.photos + 1) } : x)) });
      close();
      go(ID);
      toast('Photo added');
    };
    holder.querySelector('[data-act="photo-take"]').addEventListener('click', add);
    holder.querySelector('[data-act="photo-library"]').addEventListener('click', add);
    holder.querySelector('[data-act="photo-cancel"]').addEventListener('click', () => close());
  });
}

/* ---------- wiring ----------
   Listeners go on the screen's own <main> / action bar (replaced on every render), never on the
   shared #screen element, so nothing stacks up across renders or screens. */
function wire(root) {
  const main = root.querySelector('main');
  const bar = root.querySelector('.action-bar');
  const refocus = (sel) => requestAnimationFrame(() => root.querySelector(sel)?.focus({ preventScroll: true }));

  main.addEventListener('click', (e) => {
    const tile = e.target.closest('[data-act="add-garment"]');
    if (tile) {
      if (tile.disabled) return;
      const type = tile.dataset.type;
      if (e.target.closest('[data-minus]')) {
        const last = [...state.job.garments].reverse().find((g) => g.type === type);
        if (last) { T.removeGarment(last.id); delete ui().errors[last.id]; }
      } else if (state.job.garments.length < MAX_ITEMS) {
        T.addGarment(type);
      }
      go(ID);
      const side = e.target.closest('[data-minus]') ? '[data-minus]' : '[data-plus]';
      const sel = `[data-act="add-garment"][data-type="${CSS.escape(type)}"]`;
      refocus(root.querySelector(sel + side) ? sel + side : sel);
      return;
    }
    const open = e.target.closest('[data-act="open-appt"]');
    if (open) {
      const a = activeAppt();
      if (a) { setFocus(a.id); go(statusScreen(a, 'customer')); }
      return;
    }
    const rm = e.target.closest('[data-act="remove-garment"]');
    if (rm) {
      T.removeGarment(rm.dataset.id);
      delete ui().errors[rm.dataset.id];
      go(ID);
      return;
    }
    const pick = e.target.closest('[data-act="pick-services"]');
    if (pick) { openServices(root, pick.dataset.id); return; }
    const photo = e.target.closest('[data-act="add-photo"]');
    if (photo) openPhoto(root, photo.dataset.id);
  });

  bar.addEventListener('click', (e) => {
    const next = e.target.closest('[data-act="next"]');
    if (!next || next.disabled) return;
    const { ok, errors } = T.validateJob(state.job, 'what');
    if (ok) {
      ui().errors = {};
      go('c-where');
      return;
    }
    ui().errors = {};
    Object.keys(errors).filter((k) => k.startsWith('service:')).forEach((k) => { ui().errors[k.slice(8)] = true; });
    go(ID);
    const first = document.querySelector('#screen [data-error="service"]')?.closest('.job-item');
    if (first) {
      first.scrollIntoView({ block: 'center' });
      first.querySelector('[data-act="pick-services"]')?.focus({ preventScroll: true });
    }
  });
}

register(ID, view, wire);
