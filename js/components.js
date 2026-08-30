/* ============================================================
   Taily v4 — components
   One export per Figma component variant. Phase 2 seeds only the two
   chrome pieces (V2/Status Bar 122:114, Top Nav 197:437); Phase 3 fills
   in the rest of the library.

   Every value comes from css/components.css or css/base.css — never
   inline styles, never literal colours here.
   ============================================================ */

/**
 * Status bar icons, 46x12.
 * This is the exact vector exported from Figma (assets/status-icons.svg),
 * not a hand-drawn approximation: four signal bars, then the battery
 * body, fill and tip. The Figma asset has no wifi glyph.
 * fill/stroke are currentColor so the ink token drives the colour.
 */
const STATUS_ICONS = `
<svg class="status-bar__icons" width="46" height="12" viewBox="0 0 46 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <g clip-path="url(#taily-status-clip)">
    <path d="M2 7H1C0.447715 7 0 7.44772 0 8V10C0 10.5523 0.447715 11 1 11H2C2.55228 11 3 10.5523 3 10V8C3 7.44772 2.55228 7 2 7Z" fill="currentColor"/>
    <path d="M6.5 5H5.5C4.94772 5 4.5 5.44772 4.5 6V10C4.5 10.5523 4.94772 11 5.5 11H6.5C7.05228 11 7.5 10.5523 7.5 10V6C7.5 5.44772 7.05228 5 6.5 5Z" fill="currentColor"/>
    <path d="M11 2.5H10C9.44772 2.5 9 2.94772 9 3.5V10C9 10.5523 9.44772 11 10 11H11C11.5523 11 12 10.5523 12 10V3.5C12 2.94772 11.5523 2.5 11 2.5Z" fill="currentColor"/>
    <path d="M15.5 0H14.5C13.9477 0 13.5 0.447715 13.5 1V10C13.5 10.5523 13.9477 11 14.5 11H15.5C16.0523 11 16.5 10.5523 16.5 10V1C16.5 0.447715 16.0523 0 15.5 0Z" fill="currentColor"/>
    <path d="M39.5 0.5H25.5C23.8431 0.5 22.5 1.84315 22.5 3.5V8.5C22.5 10.1569 23.8431 11.5 25.5 11.5H39.5C41.1569 11.5 42.5 10.1569 42.5 8.5V3.5C42.5 1.84315 41.1569 0.5 39.5 0.5Z" stroke="currentColor"/>
    <path d="M37.4 2H25.6C24.7163 2 24 2.71634 24 3.6V8.4C24 9.28366 24.7163 10 25.6 10H37.4C38.2837 10 39 9.28366 39 8.4V3.6C39 2.71634 38.2837 2 37.4 2Z" fill="currentColor"/>
    <path d="M44.5 4V8C45.5 7.7 46 7 46 6C46 5 45.5 4.3 44.5 4Z" fill="currentColor"/>
  </g>
  <defs><clipPath id="taily-status-clip"><rect width="46" height="12" fill="white"/></clipPath></defs>
</svg>`.trim();

/** V2/Status Bar — 390x44, absolute at 0,0. */
export function statusBar(time = '9:41') {
  return `<div class="status-bar" role="presentation">
  <span class="status-bar__time">${time}</span>
  ${STATUS_ICONS}
</div>`;
}

/**
 * The Taily logo — the exact vector from logo/Taily Logo.svg (assets/taily-logo.svg),
 * not a redraw. fill=currentColor so .top-nav__logo's ink colour drives it.
 * 74x34 keeps the source aspect (131.5:60.74) at the nav wordmark height.
 */
const LOGO = `<svg class="top-nav__logo" viewBox="0 0 131.5 60.74" width="74" height="34" fill="currentColor" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Taily"><path d="M22.73,9.03c-3.62-.89-6.88-1.63-9.34-1.63-5.46,0-6.77,3.57-6.77,5.72,0,3.04,2.41,5.3,6.04,4.99l.95,7.56C6.14,26.93,0,21.47,0,14.17,0,8.24,4.04,1.73,13.86,1.73c7.4,0,16.75,3.73,24.36,3.73,4.2,0,7.14-1.21,9.29-5.46l6.56,2.89c-2.52,6.82-8.35,9.03-14.49,9.03-3.04,0-6.25-.47-9.5-1.15l-9.92,32.6h-7.93L22.73,9.03Z"/><path d="M62.26,16.59l-5.62,18.43c-.58,1.78-.68,3.46.94,3.46,2.36,0,5.41-4.04,8.29-9.92,1,.05,2.47.84,2.99,1.47-3.62,7.93-8.5,13.81-14.49,13.81-3.41,0-4.99-1.84-5.46-4.25-2.36,2.62-5.41,4.25-8.71,4.25-5.25,0-8.77-3.46-8.77-9.61,0-8.77,6.3-18.11,14.59-18.11,3.31,0,5.93,1.68,7.24,4.72l1.31-4.25h7.66ZM46.88,23.2c-3.62,0-7.3,5.25-7.3,9.82,0,2.83,1.47,4.46,3.78,4.46,3.73,0,7.4-5.25,7.4-9.87,0-2.78-1.58-4.41-3.88-4.41Z"/><path d="M77.11,16.59l-5.46,17.85c-.68,2.26-.37,4.04,1.68,4.04,2.94,0,5.77-3.94,8.71-9.92,1,.05,2.47.84,2.99,1.47-3.73,8.14-8.35,13.81-14.7,13.81s-7.66-5.09-5.83-11.18l4.93-16.06h7.66ZM75.54,4.51c2.57,0,4.51,2.05,4.51,4.57s-1.94,4.46-4.51,4.46-4.46-1.94-4.46-4.46,1.94-4.57,4.46-4.57Z"/><path d="M96.38,6.61l-8.56,27.82c-.68,2.26-.37,4.04,1.68,4.04,2.94,0,5.77-3.94,8.71-9.92,1,.05,2.47.84,2.99,1.47-3.73,8.14-8.35,13.81-14.7,13.81s-7.72-5.09-5.83-11.18l8.03-26.04h7.66Z"/><path d="M131.5,30.03c-3.52,7.66-8.08,12.86-15.59,16.38l-.32,1.05c-3.25,10.66-9.29,13.28-13.81,13.28s-7.35-2.57-7.35-6.19c0-6.88,9.61-7.93,14.17-9.19l1.42-4.62c-1.94,1.94-4.1,3.1-6.77,3.1-6.67,0-8.14-5.41-6.35-11.18l4.88-16.06h7.66l-4.83,15.91c-.84,2.68-.68,4.99,2.15,4.99,2.05,0,3.78-1.52,5.25-3.41l5.35-17.48h7.66l-7.66,25.09c5.46-3.31,8.5-7.82,11.13-13.12,1,.05,2.47.84,2.99,1.47ZM107.35,49.45c-4.04,1-8.82,1.94-8.82,4.78,0,1.21.89,2.31,2.57,2.31,2.52,0,4.83-2.57,6.25-7.09Z"/></svg>`;

/** Top Nav — 390x56, absolute at 0,44. `active` is home | bookings | profile. */
export function topNav(active = 'home') {
  const items = [
    ['home', 'Home'],
    ['bookings', 'Bookings'],
    ['profile', 'Profile'],
  ];

  const links = items.map(([key, label]) => {
    const isActive = key === active;
    return `<a class="top-nav__link${isActive ? ' is-active' : ''}" href="#" data-nav="${key}"${isActive ? ' aria-current="page"' : ''}>
      <span>${label}</span>${isActive ? '<span class="top-nav__stitch"></span>' : ''}
    </a>`;
  }).join('\n    ');

  return `<nav class="top-nav" aria-label="Primary">
  ${LOGO}
  <div class="top-nav__links">
    ${links}
  </div>
</nav>`;
}

/** Both chrome pieces, in the order screens use them. */
export function chrome(active = 'home', time = '9:41') {
  return statusBar(time) + '\n' + topNav(active);
}

/* ============================================================
   Atoms — Figma masters: CTA 229:5030, Status Pill 312:826,
   Time Chip 501:1039, Select Time 502:1035, Filter Pill 91:399,
   Garment Tile 252:1235.
   ============================================================ */

import { PILL_ICONS, CHEVRON_DOWN, CHEVRON_10, ICON_CAMERA, ICON_CANCEL, TILE_MINUS, CHEVRON_RIGHT, ICON_CARD, ICON_ADD_CIRCLE } from './icons.js';
import { GARMENT_ICONS } from './data.js';

/** CTA — variant: 'default' | 'secondary'. */
export function cta(label, { variant = 'default', disabled = false, attrs = '' } = {}) {
  const cls = ['cta', variant === 'secondary' ? 'cta--secondary' : '', disabled ? 'cta--disabled' : ''].filter(Boolean).join(' ');
  return `<button type="button" class="${cls}" ${attrs}>${label}</button>`;
}

/**
 * Status Pill — all 9 Figma variants. `status` is the state-machine id
 * or the Figma variant name; label defaults to the Figma variant label.
 */
const PILL_VARIANTS = {
  'requested':             { cls: 'pill--requested',         icon: 'requested',   label: 'Requested' },
  'confirmed':             { cls: 'pill--confirmed',         icon: 'confirmed',   label: 'Confirmed' },
  'ready':                 { cls: 'pill--ready',             icon: 'ready',       label: 'Ready' },
  'completed':             { cls: 'pill--completed',         icon: 'completed',   label: 'Completed' },
  'declined':              { cls: 'pill--declined',          icon: 'declined',    label: 'Declined' },
  'cancelled':             { cls: 'pill--cancelled',         icon: 'declined',    label: 'Cancelled' },
  'new-request':           { cls: 'pill--new-request',       icon: 'new_request', label: 'New Request' },
  'awaiting-customer':     { cls: 'pill--awaiting-customer', icon: 'awaiting',    label: 'Awaiting Customer' },
  'tailoring':             { cls: 'pill--tailoring',         icon: 'tailoring',   label: 'Tailoring' },
  // v4 chain names (state.js) map onto the same Figma variants
  'searching':             { cls: 'pill--requested',         icon: 'requested',   label: 'Requested' },
  'awaiting-approval':     { cls: 'pill--awaiting-customer', icon: 'awaiting',    label: 'Awaiting Approval' },
  'ready-for-pickup':      { cls: 'pill--ready',             icon: 'ready',       label: 'Ready' },
  'delivered':             { cls: 'pill--completed',         icon: 'completed',   label: 'Completed' },
};

export function statusPill(status, label) {
  const key = String(status).toLowerCase().replace(/\s+/g, '-').replace('tailoring-in-progress', 'tailoring');
  const v = PILL_VARIANTS[key];
  if (!v) throw new Error(`statusPill: unknown status "${status}"`);
  return `<span class="pill ${v.cls}">${PILL_ICONS[v.icon]}<span>${label ?? v.label}</span></span>`;
}

/** Time Chip — Figma State=Default | Selected. */
export function timeChip(label, { selected = false, attrs = '' } = {}) {
  return `<button type="button" class="chip${selected ? ' chip--selected' : ''}" ${attrs}>${label}</button>`;
}

/** Select Time trigger — label + chevron. */
export function selectTime(label = 'Select Time', { attrs = '' } = {}) {
  return `<button type="button" class="select-time" ${attrs}>${label}${CHEVRON_DOWN}</button>`;
}

/** Filter Pill — Figma Shape=Default | Open. */
export function filterPill(caption, value, { open = false, options = [], attrs = '' } = {}) {
  const dropdown = open
    ? `<div class="filter-pill__dropdown">${options.map((o, i) =>
        `<button type="button" class="filter-pill__option${i === 0 ? ' is-selected' : ''}">${o}</button>`).join('')}</div>`
    : '';
  return `<div class="filter-pill${open ? ' filter-pill--open' : ''}">
  <span class="filter-pill__label">${caption}</span>
  <button type="button" class="filter-pill__box" ${attrs}>${value}${CHEVRON_DOWN}</button>
  ${dropdown}
</div>`;
}

/**
 * Garment Tile — Figma State=Default | Selected (qty badge + minus).
 * Tile art uses the Figma-rendered rasters (assets/garments/tile-*.png,
 * exported @2x from the 01 Home instances): the Figma image fills carry
 * a ~1.43 crop transform over a low-res source, so no CSS fit of the v3
 * WebP reproduces their rendering. GARMENT_ICONS stays in use elsewhere.
 */
const TILE_ART = {
  'Suit Jacket': 'suit-jacket', 'Suit Pant': 'suit-pant', 'Formal Dress': 'formal-dress',
  'Jacket': 'jacket', 'Shirt / Blouse': 'shirt-blouse', 'Dress / Jumpsuit': 'dress-jumpsuit',
  'Pants / Jeans': 'pants-jeans', 'Skirt': 'skirt', 'Accessories': 'accessories',
};

export function garmentTile(type, { qty = 0, attrs = '' } = {}) {
  const selected = qty > 0;
  const art = TILE_ART[type]
    ? `<img class="garment-tile__art" src="assets/garments/tile-${TILE_ART[type]}.png" alt="">`
    : GARMENT_ICONS[type]
      ? `<img class="garment-tile__art" src="${GARMENT_ICONS[type]}" alt="">`
      : `<span class="garment-tile__art"></span>`;
  const badge = selected
    ? `<span class="garment-tile__qty"><span class="garment-tile__badge">${qty}</span><span class="garment-tile__minus-hit" data-minus role="button" aria-label="Remove one ${type}">${TILE_MINUS}</span></span>`
    : '';
  return `<button type="button" class="garment-tile${selected ? ' garment-tile--selected' : ''}" ${attrs}>
  ${art}
  <span class="garment-tile__label">${type}</span>
  ${badge}
</button>`;
}

/* ============================================================
   Cards — Figma masters: Appointment Card 67:293, Status Hero
   207:2087, Tailor Summary Card 67:196, User - Garment Card 57:197,
   CTA_Small 302:1656, Progress Bar 473:7627.
   ============================================================ */

/** CTA_Small — outline action inside cards. */
export function ctaSmall(label, { attrs = '' } = {}) {
  return `<button type="button" class="cta-small" ${attrs}>${label}</button>`;
}

/** Progress Bar — stage: 'confirmed' | 'tailoring' | 'ready' | 'complete'. */
export function progressBar(stage = 'confirmed') {
  return `<div class="progress progress--${stage}" role="img" aria-label="Order progress: ${stage}">
  <span class="progress__seg"></span><span class="progress__seg"></span><span class="progress__seg"></span><span class="progress__seg"></span>
</div>`;
}

/** Bold title + bulleted 12px list (order summary / please prepare). */
export function cardList(title, items) {
  return `<div class="card-list">
  <span class="card-list__title">${title}</span>
  <div class="card-list__items">${items.map((i) => `<span>•&nbsp;&nbsp;${i}</span>`).join('')}</div>
</div>`;
}

/**
 * Appointment Card — Figma Status=Confirmed|Tailoring|Ready|Completed.
 * `a` mirrors a state.js appointment entry; extras fill the gaps.
 */
export function apptCard(a) {
  const {
    status = 'confirmed', month = 'AUG', day = '29', name = 'Marco Tailor',
    meta = 'Appt Date: Aug 29, 7PM', items = [], prepare = [], actions = [],
    itemsTitle = null,
  } = a;
  const stage = status === 'completed' ? 'complete' : status;
  const lists = [];
  if (items.length) lists.push(cardList(itemsTitle ?? `${items.length} Items Total:`, items));
  if (prepare.length && (status === 'confirmed' || status === 'tailoring')) lists.push(cardList('Please Prepare:', prepare));
  const actionRow = actions.length
    ? `<div class="appt-card__actions">${actions.map((l) => ctaSmall(l)).join('')}</div>`
    : '';
  return `<article class="appt-card${status === 'completed' ? ' appt-card--completed' : ''}">
  <div class="appt-card__top">
    <div class="appt-card__date"><span class="appt-card__month">${month}</span><span class="appt-card__day">${day}</span></div>
    <div class="appt-card__info">
      <div class="appt-card__meta-row"><span class="appt-card__name">${name}</span></div>
      <div class="appt-card__meta-row">
        <span class="appt-card__meta">${meta}</span>
        ${statusPill(status)}
      </div>
    </div>
  </div>
  ${progressBar(stage)}
  ${lists.join('\n  ')}
  ${actionRow}
</article>`;
}

/**
 * Status Hero — Figma Property 1 variants. `variant` is the kebab name:
 * requested | new-times | declined | confirmed | tailoring | ready.
 */
export function statusHero({ variant = 'requested', pill, title, titleLine2, body, rowLabel, rowValue, titleWeight } = {}) {
  const PILL_FOR = {
    'requested': 'requested', 'new-times': 'requested', 'declined': 'declined',
    'confirmed': 'confirmed', 'tailoring': 'confirmed', 'ready': 'ready',
  };
  const parts = [];
  if (pill !== false) parts.push(statusPill(pill ?? PILL_FOR[variant]));
  if (title) parts.push(`<h2 class="status-hero__title${titleWeight === 600 ? ' w-600' : ''}">${title}${titleLine2 ? `<br>${titleLine2}` : ''}</h2>`);
  if (body) parts.push(`<p class="status-hero__body${variant === 'confirmed' ? ' status-hero__body--dark' : ''}">${body}</p>`);
  if (rowLabel) parts.push(`<div class="status-hero__row"><span>${rowLabel}</span><span>${rowValue ?? ''}</span></div>`);
  return `<div class="status-hero">${parts.join('\n  ')}</div>`;
}

/** Tailor Summary Card — avatar + info rows (glyph-prefixed). */
export function summaryCard({ initials = 'MT', name = 'Marco Tailor', rows = [], fixed = false } = {}) {
  return `<article class="summary-card${fixed ? ' summary-card--fixed' : ''}">
  <div class="summary-card__who">
    <span class="avatar">${initials}</span>
    <div class="summary-card__info">
      <span class="summary-card__name">${name}</span>
      ${rows.map((r) => `<span class="summary-card__row">${r}</span>`).join('\n      ')}
    </div>
  </div>
</article>`;
}

/** 44px photo tile — kind: 'add' | 'photo' (photo gets a cancel badge when removable). */
export function photoTile(kind = 'add', { removable = false } = {}) {
  if (kind === 'add') return `<span class="photo-tile photo-tile--add">${ICON_CAMERA}</span>`;
  const cancel = removable ? `<span class="photo-tile__cancel">${ICON_CANCEL}</span>` : '';
  return `<span class="photo-tile photo-tile--photo">${cancel}</span>`;
}

/**
 * User - Garment Card — Figma Property 1 = Default | WithPhoto |
 * ViewOnly | PostAppt. Editable variants get chevrons, the add-service
 * button, editable photo tiles and the ✕ remove control.
 */
export function garmentCard({
  variant = 'Default', type = 'Suit Jacket', qty = 1, price = null,
  services = ['Hem / Adjust Length'], photos = 0, beforePhotos = 0, pinnedPhotos = 0,
} = {}) {
  const editable = variant === 'Default' || variant === 'WithPhoto';
  // Card art: ref-rendered raster when we have one (matches Figma's
  // 127% zoomed fills pixel-for-pixel); else the v3 WebP zoomed 127.27%
  // per the master's transform.
  const CARD_ART = { 'Suit Jacket': 'assets/garments/card-suit-jacket.png' };
  const art = CARD_ART[type]
    ? `<span class="garment-card__artbox"><img class="garment-card__art garment-card__art--exact" src="${CARD_ART[type]}" alt="${type}"></span>`
    : GARMENT_ICONS[type]
      ? `<span class="garment-card__artbox"><img class="garment-card__art" src="${GARMENT_ICONS[type]}" alt="${type}"></span>`
      : '';
  const chip = `<div class="garment-card__chip">${art}${price != null ? `<span class="garment-card__price">${price}</span>` : ''}</div>`;

  let rows;
  if (editable) {
    rows = `<div class="garment-card__row">
      <span>${qty}</span>${CHEVRON_10}
      <span>${type}</span>${CHEVRON_10}
    </div>
    ${services.map((s) => `<div class="garment-card__service">${s}<span class="icon-10--accent" style="display:inline-flex">${CHEVRON_10}</span></div>`).join('')}
    <button type="button" class="garment-card__add">${ICON_ADD_CIRCLE}<span>Additional Service</span></button>`;
  } else {
    rows = `<div class="garment-card__row garment-card__row--tight">
      <span>${qty}</span><span>${type}</span>
    </div>
    ${services.map((s) => `<div class="garment-card__service">${s}</div>`).join('')}`;
  }

  let tiles = '';
  if (editable) {
    const shot = Array.from({ length: photos }, () => photoTile('photo', { removable: true })).join('');
    tiles = `<div class="photo-tiles">${shot}${photoTile('add')}</div>`;
  } else if (variant === 'ViewOnly' && photos > 0) {
    tiles = `<div class="photo-tiles">${Array.from({ length: photos }, () => photoTile('photo')).join('')}</div>`;
  } else if (variant === 'PostAppt') {
    const group = (label, n) => `<div class="photo-group">
      <span class="photo-tiles__label">${label}</span>
      <div class="photo-tiles">${Array.from({ length: n }, () => photoTile('photo')).join('')}</div>
    </div>`;
    tiles = `<div class="photo-row">${group('Before:', beforePhotos)}${group('Pinned:', pinnedPhotos)}</div>`;
  }

  const close = editable ? `<button type="button" class="garment-card__close" aria-label="Remove garment">✕</button>` : '';

  return `<article class="garment-card${editable ? '' : ' garment-card--view'}">
  ${chip}
  <div class="garment-card__content">
    ${rows}
    ${tiles}
  </div>
  ${close}
</article>`;
}

/* ============================================================
   Local structures — sheet chassis, wheel picker, payment rows,
   chat bubbles (T2 / Chat Bubble 457:831), timeline steps,
   delivery windows, info/receipt cards, meta rows, fee rows.
   ============================================================ */

/** Sheet chassis. `open` = null renders static (gallery/diff). */
export function sheet(contentHtml, { open = null, header = null, grabber = true, variant = '' } = {}) {
  const hostAttr = open === null ? '' : ` data-open="${open}"`;
  const head = header
    ? `<div class="sheet__header"><button type="button" class="sheet__cancel" data-act="sheet-cancel">✕</button><span class="sheet__title">${header}</span><button type="button" class="sheet__confirm" data-act="sheet-confirm">✓</button></div>`
    : '';
  return `<div class="sheet-host"${hostAttr}>
  <div class="sheet-scrim" data-act="sheet-cancel"></div>
  <div class="sheet${variant ? ' sheet--' + variant : ''}" role="dialog" aria-modal="true">
    ${grabber ? '<div class="sheet__grabber-row"><span class="sheet__grabber"></span></div>' : ''}
    ${head}
    ${contentHtml}
  </div>
</div>`;
}

/**
 * Sheet a11y (v3 parity: sheetShow trapped focus, Escape closed).
 * Call from a sheet screen's wire() with the dismiss handler.
 */
export function wireSheetA11y(root, dismiss) {
  const panel = root.querySelector('.sheet');
  if (!panel) return;
  const FOCUSABLE = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';
  const items = () => [...panel.querySelectorAll(FOCUSABLE)].filter((e) => !e.disabled && e.offsetParent !== null);
  // preventScroll: focusing the ✕ must not scroll the sheet into view —
  // on windows shorter than the screen that pans the whole page.
  items()[0]?.focus({ preventScroll: true });
  root.ownerDocument.addEventListener('keydown', function onKey(e) {
    if (!root.isConnected) { root.ownerDocument.removeEventListener('keydown', onKey); return; }
    if (e.key === 'Escape') { e.preventDefault(); dismiss(); }
    if (e.key === 'Tab') {
      const f = items();
      if (!f.length) return;
      const i = f.indexOf(root.ownerDocument.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { e.preventDefault(); f[0].focus(); }
    }
  });
}

/**
 * Mount a sheet as an in-place overlay over the CURRENT screen — v3
 * sheetShow parity: the screen beneath keeps its DOM (nothing re-renders
 * or moves), the scrim fades in and the sheet slides up from the bottom.
 * ✕ / scrim clicks, Escape and focus trapping are handled here;
 * `wireFn(root, close)` binds the sheet's own actions. Returns close().
 */
export function sheetOverlay(contentHtml, { header = null, variant = '', dataS = '' } = {}, wireFn) {
  const screenEl = document.getElementById('screen');
  // one overlay at a time (a closing one, mid slide-out, doesn't count)
  if (screenEl.querySelector('.screen-sheet--overlay:not(.is-closing)')) return () => {};
  const opener = document.activeElement;
  const holder = document.createElement('div');
  holder.className = 'screen-sheet screen-sheet--overlay';
  if (dataS) holder.dataset.s = dataS;
  holder.innerHTML = sheet(contentHtml, { header, variant, open: false });

  /* Pin the overlay to the VISIBLE part of the screen column
     (viewport ∩ screen). Absolute inset-0 would anchor the sheet to the
     bottom of a tall screen — below the fold on short windows — and any
     scroll-into-view then pans the whole page: the exact motion this
     overlay exists to avoid. Measured once; scroll is frozen below. */
  const r = screenEl.getBoundingClientRect();
  const top = Math.max(r.top, 0);
  holder.style.position = 'fixed';
  holder.style.left = `${r.left}px`;
  holder.style.width = `${r.width}px`;
  holder.style.top = `${top}px`;
  holder.style.height = `${Math.min(r.bottom, window.innerHeight) - top}px`;
  screenEl.appendChild(holder);

  /* Freeze the page while the sheet is open; pad for the vanishing
     scrollbar so the centred stage doesn't shift. */
  const doc = document.documentElement;
  const sbw = window.innerWidth - doc.clientWidth;
  const prev = { overflow: doc.style.overflow, paddingRight: doc.style.paddingRight };
  doc.style.overflow = 'hidden';
  if (sbw > 0) doc.style.paddingRight = `${sbw}px`;

  const host = holder.querySelector('.sheet-host');
  requestAnimationFrame(() => requestAnimationFrame(() => { host.dataset.open = 'true'; }));
  let closing = false;
  const close = () => {
    if (closing) return;
    closing = true;
    holder.classList.add('is-closing');
    host.dataset.open = 'false';
    setTimeout(() => {
      holder.remove();
      doc.style.overflow = prev.overflow;
      doc.style.paddingRight = prev.paddingRight;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    }, 300);
  };
  holder.querySelectorAll('[data-act="sheet-cancel"]').forEach((el) => el.addEventListener('click', close));
  wireSheetA11y(holder, close);
  wireFn?.(holder, close);
  return close;
}

/** Wheel picker — columns: [{ width, rows: [5 strings] }], middle row selected. */
export function wheel(columns) {
  const cols = columns.map(({ width, rows }) => `<div class="wheel__col" style="width:${width}px">${
    rows.map((r, i) => {
      const cls = i === 2 ? 'wheel__row wheel__row--selected' : (i === 0 || i === 4) ? 'wheel__row wheel__row--edge' : 'wheel__row';
      return `<span class="${cls}" style="width:100%">${r}</span>`;
    }).join('')
  }</div>`).join('');
  return `<div class="wheel"><div class="wheel__band"></div>${cols}</div>`;
}

/** Payment method row — icon: 'apple' | 'google' | 'card'. */
export function methodRow(label, icon) {
  const lead = icon === 'apple' ? `<span class="pay-badge">Pay</span>`
    : icon === 'google' ? `<span class="pay-badge pay-badge--google">G Pay</span>`
    : ICON_CARD;
  return `<button type="button" class="method-row">${lead}<span class="method-row__label">${label}</span>${CHEVRON_RIGHT}</button>`;
}

/** Chat bubble — side: 'them' | 'me'. */
export function bubble(text, side = 'them') {
  return `<div class="bubble-row${side === 'me' ? ' bubble-row--me' : ''}">
  <div class="bubble${side === 'me' ? ' bubble--me' : ''}">${text}</div>
</div>`;
}

/** Timeline of steps — steps: [{ state:'done'|'current'|'todo', title, sub }]. */
export function timeline(steps) {
  const rows = steps.map(({ state, title, sub }) => {
    const glyph = state === 'done' ? '✓' : state === 'current' ? '●' : '';
    return `<div class="step step--${state}">
    <span class="step__dot">${glyph}</span>
    <span class="step__labels"><span class="step__title">${title}</span>${sub ? `<span class="step__sub">${sub}</span>` : ''}</span>
  </div>`;
  }).join('');
  return `<div class="timeline">${rows}</div>`;
}

/** Delivery window — day label + time chips. */
export function deliveryWindow(day, chips) {
  return `<div class="delivery-window">
  <span class="delivery-window__day">${day}</span>
  <div class="delivery-window__chips">${chips.map((c) => timeChip(c.label, { selected: !!c.selected })).join('')}</div>
</div>`;
}

/** White r16 p16 card of rows (07b summary, 08 receipt, 03 request). */
export function infoCard(rowsHtml, { heading = '' } = {}) {
  return `<div class="info-card">${heading ? `<span class="info-card__heading">${heading}</span>` : ''}${rowsHtml}</div>`;
}

/** Money row — size: '16' | '12'; total rows go ink/semibold. */
export function infoRow(label, value, { small = false, total = false } = {}) {
  const cls = ['info-row', small ? 'info-row--small' : '', total ? 'info-row--total' : ''].filter(Boolean).join(' ');
  return `<div class="${cls}"><span>${label}</span><span>${value}</span></div>`;
}

/** Glyph-prefixed meta row (◉ ▤ ✂). */
export function metaRow(glyph, text) {
  return `<div class="meta-row"><span class="meta-row__glyph">${glyph}</span><span>${text}</span></div>`;
}

/** Fee/deposit row (04c/04d/05/06a). Long descriptions wrap. */
export function feeRow(price, desc) {
  return `<div class="fee-row"><span class="fee-row__price">${price}</span><span class="fee-row__desc">${desc}</span></div>`;
}
