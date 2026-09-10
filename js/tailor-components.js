/* ============================================================
   Tailor flow — components (Phase T, fast build).
   Tailor-only render functions; user-flow components are reused
   from components.js wherever a frame instances the same master.
   Styles live in css/tailor.css. Figma: "TAILOR — T/ COMPONENTS"
   section 210:647 (Active Job Card 470:3993, T2 rows 457:*,
   Tailor - Garment Card 238:5113).
   ============================================================ */

import { statusBar, topNav, statusPill, progressBar, ctaSmall, photoTile, selector, additionalSelector, toast } from './components.js';
import { GARMENT_TYPES, JOB_TYPES, GARMENT_ICONS } from './data.js';
import { ICON_ADD_CIRCLE } from './icons.js';
import { render as go } from './app.js';
import { state } from './state.js';
import { job, jobTarget } from './tailor-data.js';

const T_NAV = [['t-home', 'Home'], ['t-calendar', 'Calendar'], ['t-shop', 'Shop']];

/** Top Nav Active=T-Home | T-Calendar | T-Shop + status bar. */
export function tailorChrome(active = 'home', time = '9:41') {
  return statusBar(time) + '\n' + topNav(`t-${active}`, T_NAV);
}

/** Tailor nav routing: Home → T01, Calendar → the job's status screen. */
export function wireTailorNav(root) {
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    const k = el.dataset.nav;
    if (k === 't-home') go('t01-home');
    else if (k === 't-calendar') { const a = job(state); go(a ? jobTarget(a) : 't01-home'); }
    else toast('Shop is outside this prototype');
  }));
}

/** Back chevron + serif title (+ 16px sub) — the T04–T07 header row. */
export function backHeader(title, sub = '', { back = true } = {}) {
  return `<div class="t-header">
  ${back ? '<button type="button" class="t-back" data-act="back" aria-label="Back">‹</button>' : ''}
  <div class="t-heading">
    <h1 class="t-title c-ink">${title}</h1>
    ${sub ? `<p class="t-body c-500">${sub}</p>` : ''}
  </div>
</div>`;
}

/** "New Requests" / "Active Jobs · View All" section row. */
export function sectionRow(label, right = '') {
  return `<div class="t-section-row"><span class="t-body w-600 c-500">${label}</span>${right ? `<button type="button" class="t-link" data-act="view-all">${right}</button>` : ''}</div>`;
}

/** T01 New Request card (455:3661) — timer strip + details + two small CTAs. */
export function requestCard({ payout, name, meta, address, lines = [], expires = 'EXPIRES IN 1H 24M', where = '88 Leonard St, 4B · 1.2 mi' }) {
  return `<article class="req-card">
  <div class="req-card__timer"><span>${expires}</span><span>${where}</span></div>
  <div class="req-card__details">
    <div class="req-card__who">
      <div class="req-card__name"><b>${payout}</b><span>|</span><span>${name}</span></div>
      <div class="req-card__meta"><span>${meta}</span><span>◉ <b>${address}</b></span></div>
    </div>
    <ul class="req-card__items">${lines.map((l) => `<li>${l}</li>`).join('')}</ul>
    <div class="req-card__actions">
      ${ctaSmall('View Details', { attrs: 'data-act="view-details"' }).replace('class="cta-small"', 'class="cta-small cta-small--dark"')}
      ${ctaSmall('Decline', { attrs: 'data-act="decline"' })}
    </div>
  </div>
</article>`;
}

/** Active Job Card (470:3993) — date badge, name/meta, payout, progress, pill + right text. */
export function jobCard({ month, day, name, meta, payout, status = 'confirmed', pillLabel, stage = 'confirmed', right = '', rightInk = false, attrs = '' }) {
  return `<article class="job-card" ${attrs}>
  <div class="job-card__top">
    <div class="appt-card__date"><span class="appt-card__month">${month}</span><span class="appt-card__day">${day}</span></div>
    <div class="job-card__info"><span class="job-card__name">${name}</span><span class="job-card__meta">${meta}</span></div>
    <div class="job-card__pay"><span class="job-card__payout">${payout}</span><span class="job-card__paylabel">Payout</span></div>
  </div>
  ${progressBar(stage)}
  <div class="job-card__bottom${rightInk ? ' job-card__bottom--ink' : ''}">${statusPill(status, pillLabel)}<span>${right}</span></div>
</article>`;
}

/** T2 / Detail Row — label left, SemiBold value right. */
export function detailRow(label, value) {
  return `<div class="t-detail-row"><span class="t-detail-row__label">${label}</span><span class="t-detail-row__value">${value}</span></div>`;
}

/** T2 / Price Row — Item | Muted (fees) | Total. */
export function priceRow(label, value, { muted = false, total = false } = {}) {
  const cls = ['price-row', muted ? 'price-row--muted' : '', total ? 'price-row--total' : ''].filter(Boolean).join(' ');
  return `<div class="${cls}"><span>${label}</span><span class="price-row__value">${value}</span></div>`;
}

/** T2 / Radio Row — single-select reason. */
export function radioRow(label, { selected = false, attrs = '' } = {}) {
  return `<button type="button" class="radio-row${selected ? ' radio-row--selected' : ''}" role="radio" aria-checked="${selected}" ${attrs}><span class="radio-row__dot"></span><span>${label}</span></button>`;
}

export const hairline = () => '<div class="hairline"></div>';

/** "View Order Summary ⌃" serif disclosure (T07/T08). */
export function orderDropdown(open = false) {
  return `<button type="button" class="order-dropdown${open ? ' is-open' : ''}" data-act="order-summary" aria-expanded="${open}">
  <span>View Order Summary</span>
  <svg class="order-dropdown__chevron" width="16" height="8" viewBox="0 0 16 8" fill="none" aria-hidden="true"><path d="M1 7L8 1L15 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
</button>`;
}

/**
 * Tailor - Garment Card (238:5113) — Appt (editable at the visit) and
 * Appt_View (T05/T06 review). Chip + rows reuse the user garment-card
 * classes; the upload/comment rows are tailor-only.
 */
export function tailorGarmentCard({ variant = 'Appt_View', type = 'Suit Jacket', qty = 1, price = '$120', priceInfo = false, services = ['Hem / Adjust Length'], index = 0 }) {
  const art = GARMENT_ICONS[type] ? `<span class="garment-card__artbox"><img class="garment-card__art" src="${GARMENT_ICONS[type]}" alt="${type}"></span>` : '';
  const chip = `<div class="garment-card__chip">${art}<span class="garment-card__price${priceInfo ? ' garment-card__price--info' : ''}">${price}</span></div>`;
  const gi = ` data-gi="${index}"`;
  let rows;
  if (variant === 'Appt') {
    rows = `<div class="garment-card__row">
      ${selector('quantity', String(qty), ['1', '2', '3', '4', '5'], { attrs: `data-sel="qty"${gi}` })}
      ${selector('item', type, Object.keys(GARMENT_TYPES), { attrs: `data-sel="item"${gi}` })}
    </div>
    ${services.map((s, j) => `<div class="garment-card__service">${selector('job', s.label ?? s, Object.keys(JOB_TYPES), { attrs: `data-sel="job" data-ji="${j}"${gi}` })}</div>`).join('')}
    ${additionalSelector({ attrs: `data-sel="add"${gi}` })}
    <div class="tgc__group"><span class="tgc__label">Upload Before Photos</span><div class="photo-tiles">${photoTile('add')}</div></div>
    <div class="tgc__group"><span class="tgc__label">Upload Pinned Photos</span><div class="photo-tiles">${photoTile('add')}</div></div>
    <button type="button" class="tgc__comment" data-act="comment">${ICON_ADD_CIRCLE}<span>Add Comment</span></button>`;
  } else {
    rows = `<div class="garment-card__row garment-card__row--tight"><span>${qty}</span><span>${type}</span></div>
    ${services.map((s) => `<div class="garment-card__service${s.added ? ' garment-card__service--info' : ''}">${s.label ?? s}</div>`).join('')}
    <div class="tgc__group"><span class="tgc__label">Before Photos</span><div class="photo-tiles">${photoTile('add')}</div></div>
    <div class="tgc__group"><span class="tgc__label">Pinned Photos</span><div class="photo-tiles">${photoTile('add')}</div></div>
    <span class="tgc__comment-view">“Comment”</span>`;
  }
  return `<article class="garment-card tgc${variant === 'Appt' ? '' : ' garment-card--view'}">
  ${chip}
  <div class="garment-card__content tgc__content">${rows}</div>
  <button type="button" class="garment-card__close" data-act="remove-garment"${gi} aria-label="Remove garment">✕</button>
</article>`;
}

/** The three post-appointment cards + fee rows (T05/T06/T07/T08 summary). */
export function orderCards(v, { variant = 'Appt_View', showAdded = false } = {}) {
  const card1 = showAdded
    ? tailorGarmentCard({ variant, price: '$200', priceInfo: true, services: ['Hem / Adjust Length', { label: 'Sleeve / Adjust Length', added: true }], index: 0 })
    : tailorGarmentCard({ variant, price: variant === 'Appt' ? '$200' : '$120', services: variant === 'Appt' ? ['Hem / Adjust Length', 'Sleeve / Adjust Length'] : ['Hem / Adjust Length'], index: 0 });
  return `${card1}
    ${tailorGarmentCard({ variant, price: '$80', services: ['Sleeve / Adjust Length'], index: 1 })}
    ${tailorGarmentCard({ variant, price: '$80', services: ['Sleeve / Adjust Length'], index: 2 })}`;
}
