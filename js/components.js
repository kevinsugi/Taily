/* ============================================================
   Taily v5 — components
   Pure render functions: plain data in, an HTML string out. Nothing in
   this file imports state (screens pass plain params); behaviour lives
   in the wire* helpers. Styles: css/components.css (v4 pieces that v5
   keeps) + css/components-v5.css (everything new).

   Every value comes from the css files — never inline styles, never
   literal colours here. Money prints through fmt* only and the element
   carries data-money.
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

/** Top Nav — 390x56, absolute at 0,44. `active` is home | bookings | profile.
    The tailor flow passes its own items (Home / Calendar / Shop). */
export const NAV = {
  customer: [['home', 'Home'], ['bookings', 'Bookings'], ['messages', 'Messages'], ['account', 'Account']],
  tailor: [['home', 'Home'], ['shop', 'Shop'], ['earnings', 'Earnings'], ['messages', 'Messages']],
};
export function topNav(active = 'home', items = NAV.customer) {

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
export function chrome(active = 'home', { persona = 'customer', time = '9:41' } = {}) {
  return statusBar(time) + '\n' + topNav(active, NAV[persona] ?? NAV.customer);
}

/* ============================================================
   Atoms — Figma masters: CTA 229:5030, Status Pill 312:826,
   Time Chip 501:1039, Select Time 502:1035, Filter Pill 91:399,
   Garment Tile 252:1235.
   ============================================================ */

import { PILL_ICONS, CHEVRON_DOWN, ICON_EDIT, ICON_CAMERA, ICON_CANCEL, CHEVRON_RIGHT, ICON_CARD, META_ICONS } from './icons.js';
import { GARMENT_ICONS, GARMENT_TYPES, TRUST_BADGES, PRIVACY_NOTE } from './data.js';
import { fmt, fmtExact, fmtNeg } from './money.js';
import { fmtShort, fmtWhen, fmtCountdown } from './dates.js';
import { POLICY } from './money-config.js';

/**
 * CTA — variant: 'default' | 'secondary'.
 * `disabled` emits `disabled aria-disabled="true"`. `busy` = a spinner + `busyLabel` (else the label),
 * `aria-busy="true"` and disabled; the spinner does not rotate under reduced motion / html.is-test.
 */
export function cta(label, { variant = 'default', disabled = false, busy = false, busyLabel = '', attrs = '' } = {}) {
  const cls = ['cta', variant === 'secondary' ? 'cta--secondary' : '', disabled ? 'cta--disabled' : '', busy ? 'cta--busy' : ''].filter(Boolean).join(' ');
  const off = disabled || busy ? ` disabled aria-disabled="true"${busy ? ' aria-busy="true"' : ''}` : '';
  const inner = busy ? `<span class="cta__spinner" aria-hidden="true"></span><span>${busyLabel || label}</span>` : label;
  return `<button type="button" class="${cls}"${off} ${attrs}>${inner}</button>`;
}

/**
 * Status Pill — the 9 Figma variants plus the v5 keys. `status` is the
 * state-machine id or the Figma variant name; label defaults to the Figma variant label.
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
  /* v5 statuses (state machine ids) map onto the same Figma variants */
  'suggested':             { cls: 'pill--awaiting-customer', icon: 'awaiting',    label: 'New time' },
  'fitting':               { cls: 'pill--tailoring',         icon: 'tailoring',   label: 'Fitting' },
  'price-change':          { cls: 'pill--awaiting-customer', icon: 'awaiting',    label: 'Price change' },
  'in-progress':           { cls: 'pill--tailoring',         icon: 'tailoring',   label: 'In progress' },
  'returning':             { cls: 'pill--ready',             icon: 'ready',       label: 'On its way' },
  'withdrawn':             { cls: 'pill--cancelled',         icon: 'declined',    label: 'Withdrawn' },
  /* UX-LOOP R2-U-04: a request nobody accepted in time — declined
     styling, its own label */
  'expired':               { cls: 'pill--declined',          icon: 'declined',    label: 'Expired' },
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

/** Filter Pill — Figma Shape=Default | Open. `error` (UX-LOOP R1-U-11,
    live-only): paints the value semantic/error and adds a helper line. */
export function filterPill(caption, value, { open = false, options = [], attrs = '', error = '', edit = false } = {}) {
  const dropdown = open
    ? `<div class="filter-pill__dropdown">${options.map((o, i) =>
        `<button type="button" class="filter-pill__option${i === 0 ? ' is-selected' : ''}">${o}</button>`).join('')}</div>`
    : '';
  return `<div class="filter-pill${open ? ' filter-pill--open' : ''}${edit ? ' filter-pill--edit' : ''}${error ? ' filter-pill--error' : ''}">
  <span class="filter-pill__label">${caption}</span>
  <button type="button" class="filter-pill__box" ${attrs}><span class="filter-pill__value">${value}</span>${edit ? ICON_EDIT : CHEVRON_DOWN}</button>
  <span class="filter-pill__help" data-pill-help>${error}</span>
  ${dropdown}
</div>`;
}

/** Accent link row with a trailing chevron (03/Tailoring's
    "View final order ›", UX-LOOP R1-U-04). */
export function linkRow(label, { attrs = '' } = {}) {
  return `<button type="button" class="link-row" ${attrs}>${label}${CHEVRON_RIGHT.replace('method-row__chevron', 'link-row__chevron')}</button>`;
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

/* Round 15 (Kevin, Garment Tile 252:1235): a selected tile is the
   Selected_One / Selected_Multi / Selected_MultiRow state — a big chevron
   tap zone at the top (adds one) and the bottom (removes one; unselects
   at 0), one small icon PER item between them (one large icon for a
   single item, a row of three up to 3, two rows of three up to 6 — capped
   at six, the label keeps counting), and the label "3 Suit Jackets".
   The tile keeps the grid's width (the master draws 110). */
export const TILE_MAX_ICONS = 6;
const TILE_PLUS = '<svg class="garment-tile__glyph" aria-hidden="true" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>';
const TILE_MINUS = '<svg class="garment-tile__glyph" aria-hidden="true" viewBox="0 0 14 14" fill="none"><path d="M2 7h10" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>';
export function garmentTile(type, { qty = 0, attrs = '', addDisabled = false } = {}) {
  if (!(qty > 0)) {
    const art = TILE_ART[type]
      ? `<img class="garment-tile__art" src="assets/garments/tile-${TILE_ART[type]}.png" alt="">`
      : GARMENT_ICONS[type]
        ? `<img class="garment-tile__art" src="${GARMENT_ICONS[type]}" alt="">`
        : `<span class="garment-tile__art"></span>`;
    return `<button type="button" class="garment-tile" ${attrs}>
  ${art}
  <span class="garment-tile__label">${type}</span>
</button>`;
  }
  const size = qty === 1 ? 'one' : qty <= 3 ? 'row' : 'grid';
  const src = GARMENT_ICONS[type];
  const icon = src ? `<span class="garment-tile__icon"><img src="${src}" alt=""></span>` : '<span class="garment-tile__icon"></span>';
  const icons = Array.from({ length: Math.min(qty, TILE_MAX_ICONS) }, () => icon).join('');
  const label = qty === 1 ? `1 ${type}` : `${qty} ${GARMENT_TYPES[type]?.plural ?? type}`;
  /* R1-1-C-05: a container with two SIBLING buttons (− and +, 44 px tall), never a button inside a button;
     `attrs` rides on both so the screen's delegate reads data-act / data-type, the − one adds data-minus */
  return `<div class="garment-tile garment-tile--selected garment-tile--${size}" role="group" aria-label="${label}">
  <span class="garment-tile__icons">${icons}</span>
  <span class="garment-tile__label">${label}</span>
  <span class="garment-tile__ctl">
    <button type="button" class="garment-tile__step" ${attrs} data-minus aria-label="Remove one ${type}">${TILE_MINUS}</button>
    <button type="button" class="garment-tile__step" ${attrs} data-plus${addDisabled ? ' disabled aria-disabled="true"' : ''} aria-label="Add another ${type}">${TILE_PLUS}</button>
  </span>
</div>`;
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

/**
 * Status Hero — Figma Property 1 variants. `variant` is the kebab name:
 * requested | new-times | declined | confirmed | tailoring | ready.
 */
export function statusHero({ variant = 'requested', pill, pillLabel, title, titleLine2, body, rowLabel, rowValue, titleWeight, titleColor, extra = '' } = {}) {
  const PILL_FOR = {
    'requested': 'requested', 'new-times': 'requested', 'declined': 'declined',
    'confirmed': 'confirmed', 'tailoring': 'confirmed', 'ready': 'ready',
  };
  const parts = [];
  /* `pillLabel` (R7): a custom pill caption on the same variant —
     03/Reminder's "Confirmed · fee non-refundable" once the visit is confirmed */
  if (pill !== false) parts.push(statusPill(pill ?? PILL_FOR[variant], pillLabel));
  if (title) parts.push(`<h2 class="status-hero__title${titleWeight === 600 ? ' w-600' : ''}${titleColor ? ` c-${titleColor}` : ''}">${title}${titleLine2 ? `<br>${titleLine2}` : ''}</h2>`);
  /* round 16 (Kevin): the explanation (body + extra) is its own block —
     headingRow() lifts it out of the Back row so it sits at the screen
     padding, not under the title (the markers are its handle) */
  const notes = [];
  if (body) notes.push(`<p class="status-hero__body${variant === 'confirmed' ? ' status-hero__body--dark' : ''}">${body}</p>`);
  if (rowLabel) parts.push(`<div class="status-hero__row"><span>${rowLabel}</span><span>${rowValue ?? ''}</span></div>`);
  if (extra) notes.push(extra);   // round 14: 03/Requested's "All Taily-verified tailors are:" + badges
  if (notes.length) parts.push(`<!--notes--><div class="status-hero__notes">${notes.join('\n  ')}</div><!--/notes-->`);
  /* `new-times` (R2-U-03): pill Requested + a custom title/body — the
     modifier class is a hook, it changes nothing the frames draw */
  return `<div class="status-hero status-hero--${variant}">${parts.join('\n  ')}</div>`;
}

/** Tailor Summary Card, Default (720:4896) — avatar + name (+ ✓) with
    the verification badges wrapping under the name, inside the info
    column. Round 15 (Kevin): the visit details left the card for the
    garments card's Visit Details block (`visitBlock`); `rows` stays
    only for the tailor side's Sarah card, which draws none. Tapping the
    Default card opens the Expanded one as the 03.4 popup. */
/* Round 15 (Kevin): the tailor side's Sarah card is the "User Summary"
   master (207:3847 NewCustomer) — 20 padded, "✓ New Customer" in accent
   after the name, neutral-100 / accent-ink badges (`user: true`, `tag`). */
export function summaryCard({ initials = 'MT', name = 'Marco Tailor', rows = [], verified = false, badges = [], tag = '', user = false, attrs = '' } = {}) {
  return `<article class="summary-card${user ? ' summary-card--user' : ''}"${badges.length && !user ? ' role="button" tabindex="0"' : ''} ${attrs}>
  <div class="summary-card__who">
    <span class="avatar">${initials}</span>
    <div class="summary-card__info">
      <span class="summary-card__name-row"><span class="summary-card__name">${name}</span>${verified ? '<span class="summary-card__check">✓</span>' : ''}${tag ? `<span class="summary-card__tag">✓ ${tag}</span>` : ''}</span>
      ${badges.length ? trustBadges(badges, { user }) : ''}
      ${rows.map((r) => `<span class="summary-card__row">${r}</span>`).join('\n      ')}
    </div>
  </div>
</article>`;
}

/** Visit Details (round 15, Kevin — 03/Confirmed 694:3423): the block
    that opens every garments card — serif 24 title over the address /
    time / need-by rows. `rows` come from apptRows(a) (customer) or the
    tailor's jobView rows. */
/* round 16: `title` — 03 / Delivery Scheduled's "Delivery Details" */
/* R1-1-C-08: `flush` sits the block at the screen's 20 px gutter (no side padding, rows wrap at full width);
   `action` = HTML for a 44 px text button in the title row (c-pay's "Change time"). */
export function visitBlock(rows = [], { title = 'Visit Details', flush = false, action = '' } = {}) {
  const head = action
    ? `<div class="visit-block__head"><span class="visit-block__title">${title}</span>${action}</div>`
    : `<span class="visit-block__title">${title}</span>`;
  return `<div class="visit-block${flush ? ' visit-block--flush' : ''}">${head}${rows.map((r) => `<span class="visit-block__row">${r}</span>`).join('')}</div>`;
}

/** The Back control (308:3820) — "‹" 28 Regular ink in a 36-tall, 8-padded
    box. `headingRow` seats it left of a screen's heading block (gap 4,
    centred), round 15: every heading but Home's. The router wires every
    `.back` to step the prototype's history (app.js wireBackButtons). */
export const backButton = () => '<button type="button" class="back" data-act="back" data-hit="inline" aria-label="Back">‹</button>';
/* round 16 (Kevin): the Back sits beside the pill + title only; the
   explanation block (statusHero's notes, or a screen's own
   `<!--notes-->…<!--/notes-->` block) follows the row at the padding. */
export function headingRow(inner) {
  const m = /<!--notes-->([\s\S]*?)<!--\/notes-->/.exec(inner);
  const notes = m ? m[1] : '';
  const head = m ? inner.replace(m[0], '') : inner;
  return `<div class="heading-row">${backButton()}<div class="heading-row__body">${head}</div></div>${notes}`;
}

/** ✓ badges (round 14): success-bg pills, 12/16 SemiBold success. */
export function trustBadges(list = [], { wide = false, user = false } = {}) {
  /* `wide`: 03/Requested's chips pad 4/12 where the summary card's pad 4/8;
     `user` (round 15): the User Summary's neutral-100 / accent-ink chips, no ✓ */
  return `<span class="trust-badges${wide ? ' trust-badges--wide' : ''}${user ? ' trust-badges--user' : ''}">${list.map((b) => `<span class="trust-badge">${user ? '' : '✓ '}${b}</span>`).join('')}</span>`;
}

/**
 * Trust Card — "Meet Marco" (round 14, Kevin): the 03/Confirmed profile
 * card and the 03.4 popup. Photo slot (media/placeholder), Cormorant 24
 * name + "✓ Taily-verified", the badges, "Tailor for 15 years · Tribeca,
 * 1.2 mi away", the bio. `popup` positions it as 03.4 draws it (y 194.5).
 */
/* Round 15: the in-page Expanded card is inert — only the Default card
   opens the popup. */
export function trustCard(p, { popup = false } = {}) {
  return `<article class="trust-card${popup ? ' trust-card--popup' : ''}"${popup ? ` role="dialog" aria-label="${p.name}" tabindex="0"` : ''}>
  <div class="trust-card__photo" aria-hidden="true"></div>
  <div class="trust-card__head">
    <div class="trust-card__name-row"><span class="trust-card__name">${p.name}</span>${p.verified ? '<span class="trust-card__verified">✓ Taily-verified</span>' : ''}</div>
    ${trustBadges(p.badges ?? [])}
  </div>
  <p class="trust-card__sub">Tailor for ${p.years} years · ${p.area}, ${p.distance} away</p>
  <p class="trust-card__bio">${p.bio}</p>
</article>`;
}

/** 44px photo tile — kind: 'add' | 'photo' (photo gets a cancel badge when removable). */
export function photoTile(kind = 'add', { removable = false } = {}) {
  if (kind === 'add') return `<span class="photo-tile photo-tile--add">${ICON_CAMERA}</span>`;
  const cancel = removable ? `<span class="photo-tile__cancel">${ICON_CANCEL}</span>` : '';
  return `<span class="photo-tile photo-tile--photo">${cancel}</span>`;
}

/* ============================================================
   Selector — Figma 535:1582. Inline dropdown selector used in garment
   cards. Type = Quantity / Item / Job (Job renders accent Medium; the
   others SemiBold ink). The menu is absolutely positioned so the
   trigger footprint is unchanged; open/close toggled by wiring via
   .selector--open.
   ============================================================ */
const SELECTOR_CHEVRON = CHEVRON_DOWN.replace('select-time__chevron', 'selector__chevron');

export function selector(type, value, options = [], { attrs = '', chevron = true } = {}) {
  const menu = `<div class="selector__menu">${options.map((o) =>
    `<button type="button" class="selector__option${o === value ? ' is-selected' : ''}" data-option="${o}">${o}${o === value ? '<span>✓</span>' : ''}</button>`).join('')}</div>`;
  return `<span class="selector selector--${type}"><button type="button" class="selector__trigger" ${attrs}>${value}${chevron ? SELECTOR_CHEVRON : ''}</button>${menu}</span>`;
}

/* ============================================================
   Local structures — sheet chassis, wheel picker, payment rows,
   chat bubbles (T2 / Chat Bubble 457:831), timeline steps,
   delivery windows, info/receipt cards, meta rows, fee rows.
   ============================================================ */

/** Sheet chassis. `open` = null renders static (gallery/diff). `confirm: false` drops the header ✓ (R1-1-C-02):
    keep the ✓ only where it is the sole commit; a sheet with its own CTAs gets one dismiss (✕) and its own buttons. */
export function sheet(contentHtml, { open = null, header = null, grabber = true, variant = '', confirm = true } = {}) {
  const hostAttr = open === null ? '' : ` data-open="${open}"`;
  const head = header
    ? `<div class="sheet__header"><button type="button" class="sheet__cancel" data-act="sheet-cancel" aria-label="Close">✕</button><span class="sheet__title">${header}</span>${confirm
      ? '<button type="button" class="sheet__confirm" data-act="sheet-confirm" aria-label="Done">✓</button>'
      : '<span class="sheet__spacer" aria-hidden="true"></span>'}</div>`
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
  /* UX-006: modals, the photo viewer and the review sheet share the
     sheet's a11y — Escape closes, Tab stays inside the panel */
  const panel = root.querySelector('.sheet, .modal, .photo-viewer, .review-sheet');
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
/* UX-LOOP R1-U-16: the router's popstate closes whichever overlay is
   open before stepping back a screen. Overlays register their close()
   here while mounted. */
let activeOverlay = null;
/** Close the open overlay, if any. Returns true when one was closed.
    UX-LOOP R2-U-01: the router calls this synchronously before it
    replaces #screen — `instant` skips the exit animation and restores
    the page scroll at once (the holder is about to be wiped anyway). */
export function closeOverlay({ instant = false } = {}) {
  /* an overlay whose close() is already animating out (a handler
     closed it, then navigated) has nothing left to animate once the
     router wipes #screen — finish it now so the page unfreezes */
  if (instant) for (const fin of [...pendingFinish]) fin();
  if (!activeOverlay) return false;
  const c = activeOverlay;
  activeOverlay = null;
  c({ instant });
  return true;
}
/* finish() callbacks of overlays mid slide-out (see closeOverlay) */
const pendingFinish = new Set();

/* Freeze the page behind an overlay and remember what to restore.
   R2-U-01: a previous `hidden` is a stale lock from an overlay that was
   wiped mid-life — never re-apply it; treat it as ''. */
function freezePage(doc) {
  const stale = doc.style.overflow === 'hidden';
  const prev = { overflow: stale ? '' : doc.style.overflow, paddingRight: stale ? '' : doc.style.paddingRight };
  const sbw = window.innerWidth - doc.clientWidth;
  doc.style.overflow = 'hidden';
  if (sbw > 0) doc.style.paddingRight = `${sbw}px`;
  return prev;
}
/** Is an overlay (sheet / modal / viewer) currently mounted? */
export const overlayOpen = () => activeOverlay !== null;

export function sheetOverlay(contentHtml, { header = null, variant = '', dataS = '', confirm = true } = {}, wireFn) {
  const screenEl = document.getElementById('screen');
  // one overlay at a time (a closing one, mid slide-out, doesn't count)
  if (screenEl.querySelector('.screen-sheet--overlay:not(.is-closing)')) return () => {};
  const opener = document.activeElement;
  const holder = document.createElement('div');
  holder.className = 'screen-sheet screen-sheet--overlay';
  if (dataS) holder.dataset.s = dataS;
  holder.innerHTML = sheet(contentHtml, { header, variant, open: false, confirm });

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
  const prev = freezePage(doc);

  const host = holder.querySelector('.sheet-host');
  requestAnimationFrame(() => requestAnimationFrame(() => { host.dataset.open = 'true'; }));
  let closing = false;
  const close = (opts = {}) => {
    if (closing) return;
    closing = true;
    if (activeOverlay === close) activeOverlay = null;
    holder.classList.add('is-closing');
    host.dataset.open = 'false';
    const finish = () => {
      pendingFinish.delete(finish);
      holder.remove();
      doc.style.overflow = prev.overflow;
      doc.style.paddingRight = prev.paddingRight;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
    /* R2-U-01: a holder the router already wiped has nothing to
       animate — unfreeze the page now, not 300 ms later */
    if (opts.instant || !holder.isConnected) finish();
    else { pendingFinish.add(finish); setTimeout(finish, 300); }
  };
  activeOverlay = close;
  holder.querySelectorAll('[data-act="sheet-cancel"]').forEach((el) => el.addEventListener('click', close));
  wireSheetA11y(holder, close);
  wireFn?.(holder, close);
  return close;
}

/**
 * Centred modal over the live screen (R1 / RC1, Phase R2) — scrim at
 * ink 45% + a floating card. Same fixed-position / scroll-freeze
 * chassis as sheetOverlay. Returns close().
 */
export function modalOverlay(modalHtml, { dataS = '', instant = false } = {}, wireFn) {
  const screenEl = document.getElementById('screen');
  if (screenEl.querySelector('.screen-sheet--overlay:not(.is-closing)')) return () => {};
  const opener = document.activeElement;
  const holder = document.createElement('div');
  holder.className = 'screen-sheet screen-sheet--overlay modal-host';
  if (dataS) holder.dataset.s = dataS;
  holder.innerHTML = `<div class="modal-scrim" data-act="modal-dismiss"></div>${modalHtml}`;

  const r = screenEl.getBoundingClientRect();
  const top = Math.max(r.top, 0);
  holder.style.position = 'fixed';
  holder.style.left = `${r.left}px`;
  holder.style.width = `${r.width}px`;
  holder.style.top = `${top}px`;
  holder.style.height = `${Math.min(r.bottom, window.innerHeight) - top}px`;
  screenEl.appendChild(holder);

  const doc = document.documentElement;
  const prev = freezePage(doc);

  requestAnimationFrame(() => requestAnimationFrame(() => { holder.dataset.open = 'true'; }));
  let closing = false;
  const close = (opts = {}) => {
    if (closing) return;
    closing = true;
    if (activeOverlay === close) activeOverlay = null;
    holder.classList.add('is-closing');
    holder.dataset.open = 'false';
    const finish = () => {
      pendingFinish.delete(finish);
      holder.remove();
      doc.style.overflow = prev.overflow;
      doc.style.paddingRight = prev.paddingRight;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
    /* instant (PV3, Kevin): the panel has no exit animation, so waiting
       the fade-out window just reads as lag. R2-U-01: same when the
       router asks, or the holder is already off the DOM. */
    if (instant || opts.instant || !holder.isConnected) finish();
    else { pendingFinish.add(finish); setTimeout(finish, 300); }
  };
  activeOverlay = close;
  holder.querySelector('[data-act="modal-dismiss"]')?.addEventListener('click', close);
  wireSheetA11y(holder, close);   // UX-006: Escape closes, focus stays inside
  wireFn?.(holder, close);
  return close;
}

/**
 * Toast (UX-004) — lightweight acknowledgment for actions outside the
 * prototype's scope (calendar, profile, reviews). Ink pill, bottom of
 * the viewport, auto-dismisses.
 */
export function toast(msg, { tone = 'neutral' } = {}) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = tone === 'neutral' ? 'toast' : `toast toast--${tone}`;   // v5: neutral | success | warning | error | info
  el.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  el.textContent = msg;
  document.body.appendChild(el);
  document.documentElement.classList.add('has-toast');   // the persona toggle steps aside
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('toast--in')));
  setTimeout(() => {
    el.classList.remove('toast--in');
    setTimeout(() => { el.remove(); if (!document.querySelector('.toast')) document.documentElement.classList.remove('has-toast'); }, 300);
  }, 2200);
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

/**
 * Scrollable wheel (v3 wheelScrolled parity) — used by the live overlay;
 * the static wheel() above stays frame-exact for the diff harness.
 * columns: [{ width, rows: [strings], sel, label }] — 40px rows, 80px pads so
 * every row can reach the selection band. Call wireWheel() after mount.
 *
 * R1-2-C-01: each column is a keyboard-operable listbox — `role="listbox"`,
 * `tabindex="0"`, `aria-label` (the column's `label`: Day / Hour / Minute /
 * AM/PM), rows are `role="option"` with an id and `aria-selected`, and the
 * column points `aria-activedescendant` at the settled row. wireWheel() moves
 * the selection with ArrowUp / ArrowDown / PageUp / PageDown / Home / End.
 */
let wheelSeq = 0;
/** The rows of one scroll column (pads + options) — also used to re-row a live column. */
export function wheelRows({ rows, sel }, base = `wheel-${++wheelSeq}`) {
  return `<span class="wheel__pad" aria-hidden="true"></span>
    ${rows.map((r, i) => {
      const d = Math.abs(i - sel);
      const cls = d === 0 ? 'wheel__row wheel__row--selected' : d >= 2 ? 'wheel__row wheel__row--edge' : 'wheel__row';
      return `<span class="${cls}" style="width:100%" role="option" id="${base}-${i}" aria-selected="${d === 0}">${r}</span>`;
    }).join('')}
    <span class="wheel__pad" aria-hidden="true"></span>`;
}
/** One scroll column (a listbox). */
export function wheelCol({ width, rows, sel, label = 'Options' }) {
  const base = `wheel-${++wheelSeq}`;
  return `<div class="wheel__col wheel__col--scroll" style="width:${width}px" data-sel="${sel}" role="listbox" tabindex="0" aria-label="${esc(label)}" aria-activedescendant="${base}-${sel}">
    ${wheelRows({ rows, sel }, base)}
  </div>`;
}
export function wheelScroll(columns) {
  return `<div class="wheel"><div class="wheel__band"></div>${columns.map(wheelCol).join('')}</div>`;
}

/** Mark row `idx` of a scroll column as settled: classes, aria-selected, aria-activedescendant, data-sel. */
export function markWheelRow(col, idx) {
  const rows = [...col.querySelectorAll('.wheel__row')];
  col.dataset.sel = idx;
  rows.forEach((r, i) => {
    r.classList.toggle('wheel__row--selected', i === idx);
    r.classList.toggle('wheel__row--edge', Math.abs(i - idx) >= 2);
    r.setAttribute('aria-selected', String(i === idx));
  });
  if (rows[idx]?.id) col.setAttribute('aria-activedescendant', rows[idx].id);
}

const WHEEL_KEYS = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 };

/**
 * Wire a wheelScroll(): set initial positions, restyle rows as they
 * settle (v3's 80ms debounce), report changes. Selection is read back
 * from each column's data-sel. Keys move the selection one row (PageUp /
 * PageDown five, Home / End to the ends) and report it at once.
 */
/* round 17: `rowH` — the Scheduler's wheel runs a 36px pitch */
export function wireWheel(root, onChange, rowH = 40) {
  root.querySelectorAll('.wheel__col--scroll').forEach((col) => {
    col.scrollTop = Number(col.dataset.sel) * rowH;
    let timer;
    let keyed = -1;   // the row a key just settled — its own scroll event must not report it twice
    col.addEventListener('scroll', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        /* rows are read per settle — a column may be re-rowed while
           open (setWheelRows: the proposal wheel's need-by hour cap) */
        const rows = [...col.querySelectorAll('.wheel__row')];
        const idx = Math.max(0, Math.min(rows.length - 1, Math.round(col.scrollTop / rowH)));
        const wasKeyed = keyed === idx;
        keyed = -1;
        if (wasKeyed && Number(col.dataset.sel) === idx) return;
        markWheelRow(col, idx);
        onChange?.();
      }, 80);
    });
    col.addEventListener('keydown', (e) => {
      const rows = col.querySelectorAll('.wheel__row');
      const last = rows.length - 1;
      const cur = Number(col.dataset.sel) || 0;
      let idx;
      if (e.key in WHEEL_KEYS) idx = cur + WHEEL_KEYS[e.key];
      else if (e.key === 'Home') idx = 0;
      else if (e.key === 'End') idx = last;
      else return;
      e.preventDefault();
      idx = Math.max(0, Math.min(last, idx));
      if (idx === cur) return;
      markWheelRow(col, idx);
      keyed = idx;
      col.scrollTo({ top: idx * rowH, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      onChange?.();
      /* onChange may snap / re-row the column (readSlot) — keep aria-activedescendant on what it settled */
      markWheelRow(col, Number(col.dataset.sel));
    });
  });
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
/* R1-2-C-04: `{ icon }` — a line icon from META_ICONS (shop · home · bag · truck) in place of the text glyph */
export function metaRow(glyph, text, { icon = '' } = {}) {
  const lead = icon && META_ICONS[icon] ? META_ICONS[icon] : glyph;
  return `<div class="meta-row${icon ? ' meta-row--icon' : ''}"><span class="meta-row__glyph">${lead}</span><span>${text}</span></div>`;
}

/** Fee row — price + caption (03/Confirmed · Tailoring, 04, 06). Long descriptions wrap.
    line: bottom hairline (Phase R0 — every row but the last).
    info: semantic/info price (06B — totals touched by the modified order).
    muted: neutral-500 price + caption (R7-T-02 — money that is no
    longer on offer, e.g. an expired request's "Payout offered"). */
/* Round 15 (Kevin, 02 720:4178): `caption` — a 12/16 Medium neutral-500
   line under the label, 2 below it, inside the same row. */
export function feeRow(price, desc, { line = false, info = false, muted = false, caption = '' } = {}) {
  const text = caption
    ? `<span class="fee-row__text"><span class="fee-row__desc">${desc}</span><span class="fee-row__caption">${caption}</span></span>`
    : `<span class="fee-row__desc">${desc}</span>`;
  return `<div class="fee-row${line ? ' fee-row--line' : ''}${info ? ' fee-row--changed' : ''}${muted ? ' fee-row--muted' : ''}"><span class="fee-row__price">${price}</span>${text}</div>`;
}

/* ============================================================
   v5 — new components (css/components-v5.css)
   Every function returns an HTML string from plain params. Behaviour
   lives in the wire* helpers at the end. Money elements carry
   data-money and print through fmt / fmtExact / fmtNeg only.
   ============================================================ */

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escape user-typed text (messages, review text, field values). */
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const toMs = (v) => (typeof v === 'number' ? v : Date.parse(v));
const noPercent = (label, where) => {
  if (String(label ?? '').includes('%')) throw new Error(`${where}: money copy is dollar amounts, never percentages ("${label}")`);
};

/* ---------- avatar ---------- */
/** Avatar — size 'sm' 40 | 'md' 56 | 'lg' 80. Photo wins over initials. Decorative (the name sits beside it). */
export function avatar({ initials = '', photo = null, size = 'sm' } = {}) {
  const inner = photo ? `<img class="avatar__img" src="${esc(photo)}" alt="">` : esc(initials);
  return `<span class="avatar avatar--${size}${photo ? ' avatar--photo' : ''}" aria-hidden="true">${inner}</span>`;
}

/* ---------- tailor row ---------- */
/**
 * Tailor Row — one card per tailor in "Tailors near you".
 * `quote` is the quote() object in cents ({ total, homeFee, rush }) or a bare total.
 * States: default · rush (adds the "+ $40 rush fee" caption) · declined (dimmed,
 * "Declined this job", aria-disabled, no action). Skeleton: skeleton({ kind: 'tailor-row' }).
 */
export function tailorRow({ id, name, initials, photo = null, verified = false, rating = null, distanceMi = null, quote = 0, nextOpening = null, visitType = 'home', declined = false } = {}) {
  const q = typeof quote === 'number' ? { total: quote } : (quote ?? {});
  const captions = [];
  if (visitType === 'home' && q.homeFee > 0) captions.push(`Includes ${fmt(q.homeFee)} home-visit fee`);
  if (q.rush > 0) captions.push(`+ ${fmt(q.rush)} rush fee`);
  const meta = [
    rating ? `★ ${rating.avg} (${rating.count})` : '',
    distanceMi != null ? `${Number(distanceMi).toFixed(1)} mi` : '',
  ].filter(Boolean).join(' · ');
  const attrs = declined ? ' aria-disabled="true"' : ` data-act="open-tailor" data-id="${esc(id)}"`;
  /* the estimate is the focal element (R1-1-C-17): right-aligned on the name row at 24 / 600 tabular; the full badge list lives on the profile */
  const est = declined ? '' : `<span class="tailor-row__quote" data-money><span class="tailor-row__est">Est. ${fmt(q.total ?? 0)}</span></span>`;
  return `<button type="button" class="tailor-row info-card${declined ? ' tailor-row--declined' : ''}${q.rush > 0 ? ' tailor-row--rush' : ''}"${attrs}>
  <span class="tailor-row__who">
    ${avatar({ initials, photo, size: 'md' })}
    <span class="tailor-row__info">
      <span class="tailor-row__name-row"><span class="tailor-row__name">${esc(name)}</span>${est}</span>
      ${verified ? '<span class="tailor-row__chip"><span aria-hidden="true">✓</span> Verified</span>' : ''}
      ${meta ? `<span class="tailor-row__meta">${meta}</span>` : ''}
    </span>
  </span>
  ${!declined && (captions.length || nextOpening) ? `<span class="tailor-row__lower">${captions.length ? `<span class="tailor-row__captions" data-money>${captions.map((c) => `<span class="tailor-row__caption">${c}</span>`).join('')}</span>` : ''}${nextOpening ? `<span class="tailor-row__next">Next opening ${fmtWhen(nextOpening)}</span>` : ''}</span>` : ''}
  ${declined ? '<span class="tailor-row__note">Declined this job</span>' : ''}
</button>`;
}

/* ---------- price row ---------- */
/** Price Row — label left, price right, hairline between rows. `muted`: "Not offered". */
export function priceRow({ label, cents = 0, note = '', muted = false } = {}) {
  noPercent(label, 'priceRow');
  return `<div class="price-row${muted ? ' price-row--muted' : ''}" data-money>
  <span class="price-row__text"><span class="price-row__label">${esc(label)}</span>${note ? `<span class="price-row__note">${esc(note)}</span>` : ''}</span>
  <span class="price-row__value">${muted ? 'Not offered' : fmt(cents)}</span>
</div>`;
}

/* ---------- ratings ---------- */
const STAR_PATH = '★';
/**
 * Stars — display (5 glyphs, `value` filled) or input (5 radio buttons, 44 px each).
 * Input: `<input type="radio" name aria-label="4 stars">`; wireStars() paints the fill.
 */
export function stars({ value = 0, input = false, name = 'stars' } = {}) {
  const v = Math.round(Number(value) || 0);
  if (!input) {
    return `<span class="stars" role="img" aria-label="${v} out of 5 stars">${[1, 2, 3, 4, 5].map((n) => `<span class="stars__star${n <= v ? ' is-filled' : ''}" aria-hidden="true">${STAR_PATH}</span>`).join('')}</span>`;
  }
  return `<span class="stars stars--input" role="radiogroup" aria-label="Your rating" data-stars>${[1, 2, 3, 4, 5].map((n) => `<label class="stars__opt${n <= v ? ' is-filled' : ''}"><input class="stars__input" type="radio" name="${esc(name)}" value="${n}" aria-label="${n} star${n === 1 ? '' : 's'}"${n === v ? ' checked' : ''}><span class="stars__star" aria-hidden="true">${STAR_PATH}</span></label>`).join('')}</span>`;
}
/** Rating summary — "4.9 ★★★★★ 37 reviews". */
export function ratingSummary({ avg = 0, count = 0 } = {}) {
  return `<div class="rating-summary"><span class="rating-summary__avg">${Number(avg).toFixed(1)}</span>${stars({ value: avg })}<span class="rating-summary__count">${count} review${count === 1 ? '' : 's'}</span></div>`;
}
/** Review row — avatar, name, date, stars, text, up to 3 photo thumbs. */
export function reviewRow({ name, initials, stars: rating = 0, date, text = '', photos = 0 } = {}) {
  return `<article class="review-row">
  <div class="review-row__head">
    ${avatar({ initials, size: 'sm' })}
    <div class="review-row__who"><span class="review-row__name">${esc(name)}</span><span class="review-row__date">${date ? fmtShort(date) : ''}</span></div>
    ${stars({ value: rating })}
  </div>
  ${text ? `<p class="review-row__text">${esc(text)}</p>` : ''}
  ${photos > 0 ? `<div class="review-row__photos">${Array.from({ length: Math.min(photos, 3) }, () => photoTile('photo')).join('')}</div>` : ''}
</article>`;
}

/* ---------- countdown ---------- */
/**
 * Countdown — time left on a request. No interval (D-09): the text is drawn from
 * the demo clock the screen passes in. normal · soon (<= EXPIRING_SOON_MIN, warning) · expired (error).
 */
export function countdown({ expiresAt, now, suffix = 'left' } = {}) {
  const ms = toMs(expiresAt) - toMs(now);
  const state = ms <= 0 ? 'expired' : ms <= POLICY.EXPIRING_SOON_MIN * 60000 ? 'soon' : 'normal';
  const text = state === 'expired' ? 'Expired' : `${fmtCountdown(ms)}${suffix ? ` ${suffix}` : ''}`;
  return `<span class="countdown countdown--${state}" role="timer" data-countdown data-state="${state}">${text}</span>`;
}

/* ---------- chat ---------- */
/**
 * Chat Bubble — sent · sending · failed ("Not sent · Retry") · masked (privacy note under a
 * `me` bubble) · photo. Text is escaped here; `time` is the caption ("10:02 AM").
 */
export function chatBubble({ text = '', side = 'them', time = '', photos = 0, status = 'sent', masked = false } = {}) {
  const me = side === 'me';
  const body = `${text ? `<span class="chat-bubble__text">${esc(text)}</span>` : ''}${photos > 0 ? `<span class="chat-bubble__photos">${Array.from({ length: Math.min(photos, 3) }, () => photoTile('photo')).join('')}</span>` : ''}`;
  const meta = [];
  if (status === 'sending') meta.push('<span class="chat-msg__status">Sending…</span>');
  else if (status === 'failed') meta.push('<button type="button" class="chat-msg__retry" data-act="retry">Not sent · Retry</button>');
  else if (time) meta.push(`<span class="chat-msg__time">${esc(time)}</span>`);
  if (masked && me) meta.push(`<span class="chat-msg__note">${PRIVACY_NOTE}</span>`);
  return `<div class="chat-msg chat-msg--${me ? 'me' : 'them'} chat-msg--${status}">
  <div class="bubble-row${me ? ' bubble-row--me' : ''}"><div class="bubble chat-bubble${me ? ' bubble--me' : ''}">${body}</div></div>
  ${meta.length ? `<div class="chat-msg__meta">${meta.join('')}</div>` : ''}
</div>`;
}
/** The standing privacy note above a thread. */
export function privacyNote() {
  return `<p class="privacy-note"><span class="privacy-note__glyph" aria-hidden="true">i</span>${PRIVACY_NOTE}</p>`;
}
/** Read-only thread footer (a declined request): banner + one CTA. */
export function readOnlyBanner({ text = '', ctaLabel = 'Find another tailor', ctaAct = 'find-another' } = {}) {
  return `<div class="read-only">${banner({ tone: 'info', text })}${cta(ctaLabel, { attrs: `data-act="${ctaAct}"` })}</div>`;
}
/** Message composer — empty (send disabled) · typing · disabled (read-only). */
export function composer({ value = '', disabled = false, placeholder = 'Message' } = {}) {
  const empty = !String(value).trim();
  return `<form class="composer${disabled ? ' composer--disabled' : ''}" data-composer novalidate>
  <button type="button" class="composer__attach" data-act="attach-photo" aria-label="Add photo"${disabled ? ' disabled' : ''}>${ICON_CAMERA}</button>
  <label class="sr-only" for="composer-input">Message</label>
  <input class="composer__input" id="composer-input" type="text" autocomplete="off" placeholder="${esc(placeholder)}" value="${esc(value)}"${disabled ? ' disabled' : ''}>
  <button type="submit" class="composer__send" data-act="send" aria-label="Send"${disabled || empty ? ' disabled' : ''}>Send</button>
</form>`;
}

/* ---------- forms ---------- */
/**
 * Field — label above, input, then helper OR error (the error replaces the helper,
 * sits next to the field and wires aria-invalid / aria-describedby).
 * `prefix` / `suffix` render inside the box ("$", "mi").
 */
export function field({ id, label, value = '', type = 'text', inputmode, autocomplete, placeholder = '', helper = '', error = '', prefix = '', suffix = '', maxlength, disabled = false, attrs = '' } = {}) {
  const msg = error || helper;
  const msgId = `${id}-msg`;
  return `<div class="field${error ? ' field--error' : ''}${disabled ? ' field--disabled' : ''}">
  <label class="field__label" for="${id}">${esc(label)}</label>
  <div class="field__box">
    ${prefix ? `<span class="field__affix" aria-hidden="true">${esc(prefix)}</span>` : ''}
    <input class="field__input" id="${id}" name="${id}" type="${type}" value="${esc(value)}"${inputmode ? ` inputmode="${inputmode}"` : ''}${autocomplete ? ` autocomplete="${autocomplete}"` : ''}${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}${maxlength ? ` maxlength="${maxlength}"` : ''}${disabled ? ' disabled' : ''}${error ? ' aria-invalid="true"' : ''}${msg ? ` aria-describedby="${msgId}"` : ''} ${attrs}>
    ${suffix ? `<span class="field__affix" aria-hidden="true">${esc(suffix)}</span>` : ''}
  </div>
  ${msg ? `<p class="field__msg${error ? ' field__msg--error' : ''}" id="${msgId}"${error ? ' role="alert"' : ''}>${esc(msg)}</p>` : ''}
</div>`;
}
/** Code input — one numeric one-time-code field, `length` digits, spaced for reading. */
export function codeInput({ id, length = 6, value = '', error = '', label = 'Verification code' } = {}) {
  const msgId = `${id}-msg`;
  return `<div class="field field--code${error ? ' field--error' : ''}">
  <label class="field__label" for="${id}">${esc(label)}</label>
  <div class="field__box"><input class="field__input" id="${id}" name="${id}" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="${length}" pattern="[0-9]*" value="${esc(value)}" placeholder="${'•'.repeat(length)}"${error ? ' aria-invalid="true"' : ''} aria-describedby="${msgId}"></div>
  <p class="field__msg${error ? ' field__msg--error' : ''}" id="${msgId}"${error ? ' role="alert"' : ''}>${esc(error || `Enter the ${length}-digit code we sent you.`)}</p>
</div>`;
}
/** Toggle — a switch row (>= 44 px). */
export function toggle({ id, label, checked = false, disabled = false, helper = '' } = {}) {
  return `<div class="toggle-row${disabled ? ' toggle-row--disabled' : ''}">
  <span class="toggle-row__text"><span class="toggle-row__label" id="${id}-label">${esc(label)}</span>${helper ? `<span class="toggle-row__helper" id="${id}-help">${esc(helper)}</span>` : ''}</span>
  <button type="button" class="toggle" id="${id}" role="switch" aria-checked="${checked}" aria-labelledby="${id}-label"${helper ? ` aria-describedby="${id}-help"` : ''} data-toggle="${id}"${disabled ? ' disabled' : ''}><span class="toggle__knob"></span></button>
</div>`;
}
/** Check row — a 44 px row with an inset-stroke box. checked · unchecked · error. */
export function checkRow({ id, label, checked = false, caption = '', error = '', attrs = '' } = {}) {
  return `<div class="check-row-wrap${error ? ' check-row-wrap--error' : ''}">
  <label class="check-row" for="${id}">
    <input class="check-row__input" type="checkbox" id="${id}" name="${id}"${checked ? ' checked' : ''}${error ? ` aria-invalid="true" aria-describedby="${id}-msg"` : ''} ${attrs}>
    <span class="check-row__box" aria-hidden="true">✓</span>
    <span class="check-row__text"><span class="check-row__label">${esc(label)}</span>${caption ? `<span class="check-row__caption">${esc(caption)}</span>` : ''}</span>
  </label>
  ${error ? `<p class="field__msg field__msg--error" id="${id}-msg" role="alert">${esc(error)}</p>` : ''}
</div>`;
}
/**
 * Chip group — selectable chips (single = radiogroup, multi = aria-pressed) or a
 * segmented control (visit type: "At my place" / "At the shop").
 * options: [{ value, label, disabled, caption }]; `value` is a string (or an array when multi).
 */
export function chipGroup({ name, label = '', options = [], value = null, multi = false, variant = 'chips', error = '' } = {}) {
  const picked = (v) => (multi ? (value ?? []).includes(v) : value === v);
  const labelId = `${name}-label`;
  const items = options.map((o) => {
    const on = picked(o.value);
    const a11y = multi ? `aria-pressed="${on}"` : `role="radio" aria-checked="${on}"`;
    return `<button type="button" class="${variant === 'segmented' ? 'segmented__opt' : 'chip chip-group__chip'}${on ? (variant === 'segmented' ? ' is-selected' : ' chip--selected') : ''}" ${a11y} data-act="chip" data-name="${esc(name)}" data-value="${esc(o.value)}"${o.disabled ? ' disabled' : ''}><span class="chip-group__text">${esc(o.label)}</span>${o.caption ? `<span class="chip-group__caption">${esc(o.caption)}</span>` : ''}</button>`;
  }).join('');
  return `<div class="chip-group chip-group--${variant}${error ? ' chip-group--error' : ''}" data-chip-group="${esc(name)}" data-multi="${multi}">
  ${label ? `<span class="chip-group__label" id="${labelId}">${esc(label)}</span>` : ''}
  <div class="${variant === 'segmented' ? 'segmented' : 'chip-group__options'}"${multi ? ` role="group"` : ' role="radiogroup"'}${label ? ` aria-labelledby="${labelId}"` : ` aria-label="${esc(name)}"`}>${items}</div>
  ${error ? `<p class="field__msg field__msg--error" role="alert">${esc(error)}</p>` : ''}
</div>`;
}
/**
 * Stepper — `variant: 'default'` is "Step 2 of 6 · Services prices" over progress segments (tailor onboarding);
 * `'compact'` is the booking progress: one non-interactive row of segments (done ink / current accent-ink /
 * todo neutral-200) with sr-only labels, `aria-current="step"` on the current one and a right-aligned "2 of 5".
 * `steps`: labels or { id, label }; `current` an index or id; `done` indices or ids.
 */
export function stepper({ steps = [], current = 0, done = [], variant = 'default' } = {}) {
  const ids = steps.map((s, i) => s?.id ?? i);
  const labels = steps.map((s) => s?.label ?? s);
  const ci = typeof current === 'number' ? current : Math.max(0, ids.indexOf(current));
  const state = (i) => (i === ci ? 'current' : (done.includes(i) || done.includes(ids[i])) ? 'done' : 'todo');
  if (variant === 'compact') {
    return `<nav class="stepper stepper--compact" aria-label="Booking progress">
  <ol class="stepper__bar">${steps.map((_, i) => `<li class="stepper__seg stepper__seg--${state(i)}"${i === ci ? ' aria-current="step"' : ''}><span class="sr-only">${esc(labels[i])}</span></li>`).join('')}</ol>
  <span class="stepper__count t-small c-600 w-600">${ci + 1} of ${steps.length}</span>
</nav>`;
  }
  return `<div class="stepper">
  <p class="stepper__text">Step ${ci + 1} of ${steps.length} · ${esc(labels[ci] ?? '')}</p>
  <div class="stepper__bar" role="img" aria-label="Step ${ci + 1} of ${steps.length}">${steps.map((_, i) => `<span class="stepper__seg stepper__seg--${state(i)}"></span>`).join('')}</div>
</div>`;
}

/** The five booking steps, shown as the first thing in .body on c-job → c-where → c-tailors → c-tailor → c-book / c-pay. */
export const BOOKING_STEPS = ['What needs work', 'Where and when', 'Tailors near you', 'Tailor', 'Book'];
/** bookingSteps(current) — `current` is 0-based; every earlier step reads as done. */
export function bookingSteps(current = 0) {
  return stepper({ steps: BOOKING_STEPS, current, done: BOOKING_STEPS.slice(0, current).map((_, i) => i), variant: 'compact' });
}

/**
 * Action bar — the sticky white bottom bar of every booking step and sign-in form. Render it as a SIBLING of
 * main.body inside #screen (never inside .body) and give the body `.body--with-bar`.
 * `lead` is an HTML line above the button (text + a data-money amount); `note` sits under the buttons and, when
 * `disabled`, is linked to the CTA with aria-describedby (the reason it is off). `busy` locks both buttons.
 */
export function actionBar({ ctaLabel = '', ctaAct = '', disabled = false, busy = false, busyLabel = '', lead = '', note = '', secondaryLabel = '', secondaryAct = '' } = {}) {
  const noteId = `action-bar-note-${ctaAct || 'cta'}`;
  const describe = disabled && note ? ` aria-describedby="${noteId}"` : '';
  return `<div class="action-bar${busy ? ' action-bar--busy' : ''}">
  ${lead ? `<p class="action-bar__lead t-small c-600">${lead}</p>` : ''}
  ${cta(ctaLabel, { disabled, busy, busyLabel, attrs: `data-act="${ctaAct}"${describe}` })}
  ${secondaryLabel ? cta(secondaryLabel, { variant: 'secondary', disabled: busy, attrs: `data-act="${secondaryAct}"` }) : ''}
  ${note ? `<p class="action-bar__note t-small c-600" id="${noteId}">${note}</p>` : ''}
</div>`;
}

/**
 * Option row — one row of a single-select sheet (sort, payment method). Wrap a group in role="radiogroup".
 * `lead` is an icon / card badge (HTML); the check ring on the right fills ink with a ✓ when checked.
 */
export function optionRow({ name = '', value = '', title = '', sub = '', checked = false, lead = '', act = 'option' } = {}) {
  return `<button type="button" class="option-row${checked ? ' is-checked' : ''}" role="radio" aria-checked="${checked}" data-act="${esc(act)}" data-name="${esc(name)}" data-value="${esc(value)}">
  ${lead ? `<span class="option-row__lead" aria-hidden="true">${lead}</span>` : ''}
  <span class="option-row__text"><span class="option-row__title t-body w-600">${title}</span>${sub ? `<span class="option-row__sub t-small c-600">${sub}</span>` : ''}</span>
  <span class="option-row__check" aria-hidden="true">${checked ? '✓' : ''}</span>
</button>`;
}

/* ---------- lists, loading, empty ---------- */
/** List row — [lead] title (+ sub) left, value (+ chevron) right. A button when `act` is set. `lead` (HTML) takes the same 32 px column as optionRow's, so titles line up. */
export function listRow({ title, sub = '', right = '', act = '', chevron = true, lead = '' } = {}) {
  const inner = `${lead ? `<span class="list-row__lead" aria-hidden="true">${lead}</span>` : ''}<span class="list-row__text"><span class="list-row__title">${title}</span>${sub ? `<span class="list-row__sub">${sub}</span>` : ''}</span>${right ? `<span class="list-row__right">${right}</span>` : ''}${act && chevron ? CHEVRON_RIGHT.replace('method-row__chevron', 'list-row__chevron') : ''}`;
  return act
    ? `<button type="button" class="list-row" data-act="${act}">${inner}</button>`
    : `<div class="list-row list-row--static">${inner}</div>`;
}
/** Skeleton — loading placeholders (static under reduced motion). kind: line | tailor-row | card | thread. */
export function skeleton({ kind = 'line', count = 1 } = {}) {
  const one = {
    line: '<span class="skeleton__line"></span>',
    'tailor-row': '<div class="skeleton__card skeleton__card--row"><span class="skeleton__who"><span class="skeleton__dot"></span><span class="skeleton__lines"><span class="skeleton__line skeleton__line--w60"></span><span class="skeleton__line skeleton__line--w40"></span><span class="skeleton__line skeleton__line--w80"></span></span></span><span class="skeleton__lower"><span class="skeleton__line skeleton__line--w60"></span><span class="skeleton__line skeleton__line--w80"></span></span></div>',
    card: '<div class="skeleton__card"><span class="skeleton__line skeleton__line--w60"></span><span class="skeleton__line"></span><span class="skeleton__line skeleton__line--w80"></span></div>',
    thread: '<div class="skeleton__thread"><span class="skeleton__bubble skeleton__bubble--them"></span><span class="skeleton__bubble skeleton__bubble--me"></span><span class="skeleton__bubble skeleton__bubble--them skeleton__bubble--short"></span></div>',
  }[kind] ?? '';
  return `<div class="skeleton skeleton--${kind}" aria-busy="true"><span class="sr-only">Loading</span>${one.repeat(Math.max(1, count))}</div>`;
}
/** Empty state — serif title, body, optional primary + secondary CTA. */
export function emptyState({ title, body = '', ctaLabel = '', ctaAct = '', secondaryLabel = '', secondaryAct = '' } = {}) {
  return `<div class="empty-state">
  <h2 class="t-h2 empty-state__title">${title}</h2>
  ${body ? `<p class="t-body c-600 empty-state__body">${body}</p>` : ''}
  ${ctaLabel || secondaryLabel ? `<div class="empty-state__actions">${ctaLabel ? cta(ctaLabel, { attrs: `data-act="${ctaAct}"` }) : ''}${secondaryLabel ? cta(secondaryLabel, { variant: 'secondary', attrs: `data-act="${secondaryAct}"` }) : ''}</div>` : ''}
</div>`;
}
/** Banner — info | success | warning | error. Error uses role="alert". */
export function banner({ tone = 'info', title = '', text = '', actionLabel = '', actionAct = '', dismissible = false } = {}) {
  return `<div class="banner banner--${tone}" role="${tone === 'error' ? 'alert' : 'status'}">
  <div class="banner__body">${title ? `<span class="banner__title">${title}</span>` : ''}<span class="banner__text">${text}</span>${actionLabel ? `<button type="button" class="banner__action" data-act="${actionAct}">${actionLabel}</button>` : ''}</div>
  ${dismissible ? '<button type="button" class="banner__close" data-act="dismiss" aria-label="Dismiss">✕</button>' : ''}
</div>`;
}

/* ---------- money ---------- */
/**
 * Money Rows — { label, cents, caption, status, kind }. kind: default | negative | subtotal
 * | total | muted | changed. Breakdown rows print exact cents; `negative` prints "−$12.50".
 * Throws when copy contains "%" (dollar amounts only).
 */
export function moneyRows(rows = []) {
  const html = rows.map(({ label, cents = null, caption = '', status = '', kind = 'default' }) => {
    noPercent(label, 'moneyRows'); noPercent(caption, 'moneyRows');
    const amt = cents == null ? '' : kind === 'negative' ? fmtNeg(cents) : fmtExact(cents);
    return `<div class="money-row money-row--${kind}">
    <span class="money-row__text"><span class="money-row__label">${esc(label)}</span>${caption ? `<span class="money-row__caption">${esc(caption)}</span>` : ''}</span>
    <span class="money-row__right">${amt ? `<span class="money-row__amt">${amt}</span>` : ''}${status ? `<span class="money-row__status">${esc(status)}</span>` : ''}</span>
  </div>`;
  }).join('');
  return `<div class="money-rows" data-money>${html}</div>`;
}
/** Deposit status words by the appointment's deposit state (payments.deposit.state). */
const DEPOSIT_STATUS = { 'to-hold': 'Held today', authorized: 'On hold', captured: 'Paid', released: 'Released', refunded: 'Refunded', kept: 'Kept' };
/**
 * The customer's breakdown by stage — estimate | booked | ready | paid. Zero rows are omitted.
 * `q` is the quote() object in cents. `tailorFirst` names whose prices the services are.
 * `depositState` (to-hold | authorized | captured | released | refunded | kept) takes the deposit status from the
 * appointment instead of the stage: a pending request is only a hold ("On hold"), accepted money is "Paid".
 * Without it, estimate reads "Due today" and every later stage reads "Paid".
 * The total reads "Estimated total" for `estimate` AND `booked` (D-49) until `confirmed` (the fitting or an approved price change).
 */
export function customerBreakdown(q, { stage = 'estimate', tailorFirst = '', depositState = '', confirmed = false } = {}) {
  const est = (stage === 'estimate' || stage === 'booked') && !confirmed;   // D-49: still an estimate until the fitting (or a price change) confirms it
  const deposit = depositState ? (DEPOSIT_STATUS[depositState] ?? 'Paid') : stage === 'estimate' ? 'Due today' : 'Paid';
  const balance = stage === 'paid' ? 'Paid' : stage === 'ready' ? 'Due now' : 'Due when ready';
  const rows = [
    { label: 'Services', cents: q.services, caption: tailorFirst ? `${tailorFirst}’s prices` : '' },
    q.homeFee > 0 && { label: 'Home-visit fee', cents: q.homeFee },
    q.rush > 0 && { label: 'Rush fee', cents: q.rush, caption: `Need-by ${q.rushDays ?? 1} day${(q.rushDays ?? 1) === 1 ? '' : 's'} after the visit` },
    q.courier > 0 && { label: 'Taily courier', cents: q.courier },
    { label: est ? 'Estimated total' : 'Total', cents: q.total, kind: 'total' },
    { label: 'Deposit', cents: q.deposit, status: deposit },
    { label: 'Balance', cents: q.balance, status: balance },
    (stage === 'ready' || stage === 'paid') && q.refund > 0 && { label: 'Refund to your card', cents: q.refund },
  ].filter(Boolean);
  return moneyRows(rows);
}
/** The tailor's breakdown — no courier row (D-04); the Taily fee is a negative row. */
export function tailorBreakdown(q) {
  return moneyRows([
    { label: 'Services', cents: q.services },
    q.homeFee > 0 && { label: 'Home-visit fee', cents: q.homeFee },
    q.rush > 0 && { label: 'Rush fee', cents: q.rush },
    { label: 'Taily fee', cents: q.tailyFee, kind: 'negative' },
    { label: 'Your payout', cents: q.payout, kind: 'total' },
  ].filter(Boolean));
}

/* ---------- wiring ---------- */
/** Star input: paint the fill up to the checked star (click delegation). */
export function wireStars(root) {
  root.querySelectorAll('[data-stars]').forEach((group) => {
    group.addEventListener('change', () => {
      const v = Number(group.querySelector('input:checked')?.value ?? 0);
      group.querySelectorAll('.stars__opt').forEach((o, i) => o.classList.toggle('is-filled', i < v));
    });
  });
}
/** Toggle switches: flip aria-checked and announce a `toggle` CustomEvent { id, checked }. */
export function wireToggles(root) {
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[role="switch"]');
    if (!t || t.disabled) return;
    const on = t.getAttribute('aria-checked') !== 'true';
    t.setAttribute('aria-checked', String(on));
    t.dispatchEvent(new CustomEvent('toggle', { bubbles: true, detail: { id: t.id, checked: on } }));
  });
}
/** Chip groups: single = radio behaviour, multi = toggle. Announces `chip` { name, value, values }. */
export function wireChipGroups(root) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act="chip"]');
    if (!b || b.disabled) return;
    const group = b.closest('[data-chip-group]');
    const multi = group.dataset.multi === 'true';
    const on = (el, v) => { el.classList.toggle(el.classList.contains('segmented__opt') ? 'is-selected' : 'chip--selected', v); el.setAttribute(multi ? 'aria-pressed' : 'aria-checked', String(v)); };
    const all = [...group.querySelectorAll('[data-act="chip"]')];
    if (multi) on(b, b.getAttribute('aria-pressed') !== 'true'); else all.forEach((el) => on(el, el === b));
    const values = all.filter((el) => (multi ? el.getAttribute('aria-pressed') : el.getAttribute('aria-checked')) === 'true').map((el) => el.dataset.value);
    group.dispatchEvent(new CustomEvent('chip', { bubbles: true, detail: { name: group.dataset.chipGroup, value: b.dataset.value, values } }));
  });
}
/** Composer: enable Send only while there is text; Enter submits via the form. */
export function wireComposer(root, onSend) {
  root.querySelectorAll('[data-composer]').forEach((form) => {
    const input = form.querySelector('.composer__input'); const send = form.querySelector('.composer__send');
    input.addEventListener('input', () => { send.disabled = !input.value.trim(); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text || input.disabled) return;
      onSend?.(text);
      input.value = ''; send.disabled = true;
    });
  });
}
