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
/**
 * Top nav (M7 A5.2, D-187): the logo and four 44 x 44 ICON links. The label is the link's aria-label + title. `badges` (D-164):
 * `{ home: 2, messages: 1 }` — a count above 0 draws an 8 px accent dot on the icon and a spoken ", n unread" (messages) /
 * ", n new" (anything else). The active link is ink at 1.75 stroke with an accent stitch under it.
 */
export function topNav(active = 'home', items = NAV.customer, { badges = {} } = {}) {
  const links = items.map(([key, label]) => {
    const isActive = key === active;
    const n = Number(badges[key]) || 0;
    const dot = n > 0 ? '<span class="top-nav__dot" aria-hidden="true"></span>' : '';
    const name = `${label}${n > 0 ? `, ${n} ${key === 'messages' ? 'unread' : 'new'}` : ''}`;
    return `<a class="top-nav__link${isActive ? ' is-active' : ''}" href="#" data-nav="${key}" aria-label="${name}" title="${label}"${isActive ? ' aria-current="page"' : ''}>
      <span class="top-nav__icon">${NAV_ICONS[key] ?? NAV_ICONS.home}${dot}</span>
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
  return statusBar(time) + '\n' + topNav(active, NAV[persona] ?? NAV.customer, { badges: navBadges(persona) });
}

/**
 * The top-nav counts (D-164), computed from the live model. Tailor: Home = requests waiting on her reply + price-change
 * replies waiting on her; Messages = unread across her threads. Customer: Messages = unread; Bookings = bookings that
 * need her ("action" status word).
 */
export function navBadges(persona = 'customer') {
  if (persona === 'tailor') {
    const replies = apptsFor('tailor').filter((a) => a.status === 'price-change' && statusWord(a, 'tailor').pill === 'action').length;
    return {
      home: inbox().requests.length + replies,
      messages: threadsFor('tailor').reduce((n, t) => n + t.unread, 0),
    };
  }
  return {
    messages: threadsFor('customer').reduce((n, t) => n + t.unread, 0),
    bookings: apptsFor('customer').filter((a) => statusWord(a, 'customer').pill === 'action').length,
  };
}

/* ============================================================
   Atoms — Figma masters: CTA 229:5030, Status Pill 312:826,
   Time Chip 501:1039, Select Time 502:1035, Filter Pill 91:399,
   Garment Tile 252:1235.
   ============================================================ */

import { PILL_ICONS, CHEVRON_DOWN, ICON_EDIT, ICON_CAMERA, ICON_CANCEL, CHEVRON_RIGHT, ICON_CARD, META_ICONS, ICON_HANGER, ICON_PIN, NAV_ICONS, ICON_INFO, ICON_VERIFIED, ICON_MORE, ICON_CHAT, ICON_DIRECTIONS, ICON_CALENDAR } from './icons.js';
export { NAV_ICONS, ICON_INFO, ICON_VERIFIED, ICON_MORE, ICON_CHAT, ICON_DIRECTIONS, ICON_CALENDAR };
import { GARMENT_ICONS, GARMENT_TYPES, TRUST_BADGES, PRIVACY_NOTE, ZIP_INFO } from './data.js';
import * as DATA from './data.js';
import { fmt, fmtExact, fmtNeg, cents } from './money.js';
import { fmtShort, fmtWhen, fmtCountdown, fmtDay, fmtTime, isoDay } from './dates.js';
import { POLICY } from './money-config.js';
import { state, apptsFor, threadsFor, priceChangeView } from './state.js';
import { inbox } from './tailor-data.js';
import { statusWord } from './focus.js';

/**
 * CTA — variant: 'default' | 'secondary' | 'danger' (error fill + white text: the ONE filled button of a destructive confirm sheet, D-79).
 * `disabled` emits `disabled aria-disabled="true"`. `busy` = a spinner + `busyLabel` (else the label),
 * `aria-busy="true"` and disabled; the spinner does not rotate under reduced motion / html.is-test.
 */
export function cta(label, { variant = 'default', disabled = false, busy = false, busyLabel = '', attrs = '', softDisabled = false } = {}) {
  const cls = ['cta', variant === 'secondary' ? 'cta--secondary' : '', variant === 'danger' ? 'cta--danger' : '', disabled || softDisabled ? 'cta--disabled' : '', busy ? 'cta--busy' : ''].filter(Boolean).join(' ');
  /* M7 (D-196): `softDisabled` looks disabled and says so (aria-disabled) but has no `disabled` attribute, so a tap reaches the screen */
  const off = disabled || busy ? ` disabled aria-disabled="true"${busy ? ' aria-busy="true"' : ''}` : softDisabled ? ' aria-disabled="true"' : '';
  const inner = busy ? `<span class="cta__spinner" aria-hidden="true"></span><span>${busyLabel || label}</span>` : label;
  return `<button type="button" class="${cls}"${off} ${attrs}>${inner}</button>`;
}

/**
 * Status (M7 A5.6, D-188) — `statusPill` keeps its name, keys and labels but renders a dot + a word:
 * `<span class="status status--{tone}">`. Tones: action · pending · progress · done · stop · calm (no blue anywhere).
 * `status` is the state-machine id or the Figma variant name; label defaults to the variant label.
 */
const PILL_VARIANTS = {
  'requested':             { tone: 'pending',  label: 'Requested' },
  'confirmed':             { tone: 'progress', label: 'Confirmed' },
  'ready':                 { tone: 'done',     label: 'Ready' },
  'completed':             { tone: 'done',     label: 'Completed' },
  'declined':              { tone: 'stop',     label: 'Declined' },
  'cancelled':             { tone: 'stop',     label: 'Cancelled' },
  'new-request':           { tone: 'pending',  label: 'New Request' },
  'awaiting-customer':     { tone: 'pending',  label: 'Awaiting Customer' },
  'tailoring':             { tone: 'progress', label: 'Tailoring' },
  /* v5 statuses (state machine ids) map onto the same tones */
  /* R3-2-C-05 (D-95): the one state that waits on the CUSTOMER is the loudest — an accent dot with a halo and a bold word */
  'suggested':             { tone: 'action',   label: 'New time' },
  /* M4 (D-108): the generic "your move" status — the label says what the move is */
  'action':                { tone: 'action',   label: 'Your move' },
  'waiting':               { tone: 'pending',  label: 'Waiting on customer' },
  'fitting':               { tone: 'progress', label: 'Fitting' },
  'price-change':          { tone: 'pending',  label: 'Price change' },
  'in-progress':           { tone: 'progress', label: 'In progress' },
  'returning':             { tone: 'done',     label: 'On its way' },
  /* R3-1-C-12: a no-fault outcome (Sarah cancelled early, a plain no reply) — the neutral tone */
  'calm':                  { tone: 'calm',     label: 'Cancelled' },
  'withdrawn':             { tone: 'stop',     label: 'Withdrawn' },
  /* UX-LOOP R2-U-04: a request nobody accepted in time */
  'expired':               { tone: 'stop',     label: 'Expired' },
  /* M7: t-shop's "Bookable" / "Paused" */
  'bookable':              { tone: 'done',     label: 'Bookable' },
  'paused':                { tone: 'pending',  label: 'Paused' },
};

export function statusPill(status, label) {
  const key = String(status).toLowerCase().replace(/\s+/g, '-').replace('tailoring-in-progress', 'tailoring');
  const v = PILL_VARIANTS[key];
  if (!v) throw new Error(`statusPill: unknown status "${status}"`);
  return `<span class="status status--${v.tone}"><span class="status__dot" aria-hidden="true"></span><span class="status__word">${label ?? v.label}</span></span>`;
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
export function ctaSmall(label, { attrs = '', href = '', filled = false } = {}) {
  /* `href` = a link that looks the same (Directions, Add to calendar: D-173); extra `attrs` carry target / rel / download */
  const cls = filled ? 'cta-small cta-small--filled' : 'cta-small';   /* filled = the primary small action (K2-1-03) */
  if (href) return `<a class="${cls}" href="${esc(href)}" ${attrs}>${label}</a>`;
  return `<button type="button" class="${cls}" ${attrs}>${label}</button>`;
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
  if (title) parts.push(`<h1 class="status-hero__title${titleWeight === 600 ? ' w-600' : ''}${titleColor ? ` c-${titleColor}` : ''}">${title}${titleLine2 ? `<br>${titleLine2}` : ''}</h1>`);
  /* round 16 (Kevin): the explanation (body + extra) is its own block —
     headingRow() lifts it out of the Back row so it sits at the screen
     padding, not under the title (the markers are its handle) */
  const notes = [];
  if (body) notes.push(`<p class="status-hero__body${variant === 'confirmed' ? ' status-hero__body--dark' : ''}">${body}</p>`);
  if (rowLabel) parts.push(`<div class="status-hero__row"><span class="t-caps c-600">${rowLabel}</span><span class="t-figure">${rowValue ?? ''}</span></div>`);
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
    <span class="avatar avatar--md">${initials}</span>
    <div class="summary-card__info">
      <span class="summary-card__name-row"><span class="summary-card__name">${name}</span>${verified ? verifiedMark({ inert: true }) : ''}${tag ? `<span class="summary-card__tag">${tag}</span>` : ''}</span>
      ${badges.length && user ? trustBadges(badges, { user }) : ''}
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
  /* M7 (A5.5): the title is a small caps section head (`action` = HTML aside, e.g. a "Change time" text link); rows sit flat under it */
  return `<div class="visit-block${flush ? ' visit-block--flush' : ''}">${sectionHead(title, { aside: action })}${rows.map((r) => `<span class="visit-block__row">${r}</span>`).join('')}</div>`;
}

/** The Back control (308:3820) — "‹" 28 Regular ink in a 36-tall, 8-padded
    box. `headingRow` seats it left of a screen's heading block (gap 4,
    centred), round 15: every heading but Home's. The router wires every
    `.back` to step the prototype's history (app.js wireBackButtons). */
export const backButton = () => '<button type="button" class="back" data-act="back" data-hit="inline" aria-label="Back">‹</button>';
/* round 16 (Kevin): the Back sits beside the pill + title only; the
   explanation block (statusHero's notes, or a screen's own
   `<!--notes-->…<!--/notes-->` block) follows the row at the padding. */
/* `backRow` (R3-2-C-02, D-93): the detail-screen header — the Back on its own 44 px row (the M1 c-tailor
   pattern), then the pill, the title and the notes all flush at the screen padding. One anatomy for c-request,
   c-booking, t-request and t-job; `back: false` keeps the same stack with no Back row. */
export function headingRow(inner, { back = true, backRow = false } = {}) {
  const m = /<!--notes-->([\s\S]*?)<!--\/notes-->/.exec(inner);
  const notes = m ? m[1] : '';
  const head = m ? inner.replace(m[0], '') : inner;
  if (backRow) {
    return `${back ? `<div class="heading-row heading-row--back">${backButton()}</div>` : ''}<div class="heading-stack">${head}</div>${notes}`;
  }
  return `<div class="heading-row">${back ? backButton() : ''}<div class="heading-row__body">${head}</div></div>${notes}`;
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
  <div class="trust-card__photo" aria-hidden="true">${photoStub({ type: 'Suit Jacket', size: 'stage' })}</div>
  <div class="trust-card__head">
    <div class="trust-card__name-row"><span class="trust-card__name">${p.name}</span>${p.verified ? verifiedMark({ inert: true }) : ''}</div>
  </div>
  <p class="trust-card__sub">Tailor for ${p.years} years · ${p.area}, ${p.distance} away</p>
  <p class="trust-card__bio">${p.bio}</p>
</article>`;
}

/** Photo tile — kind: 'add' | 'photo'. M7 (A5.12, D-194): a photo is the garment drawn on a soft tint (photoStub), never a grey tile;
    `type` is the garment, `tone` the tint (0-3). The host sizes `.photo-tile` (default 44). `removable` adds the cancel badge. */
export function photoTile(kind = 'add', { removable = false, type = '', tone = 0 } = {}) {
  if (kind === 'add') return `<span class="photo-tile photo-tile--add">${ICON_CAMERA}</span>`;
  const cancel = removable ? `<span class="photo-tile__cancel">${ICON_CANCEL}</span>` : '';
  return `<span class="photo-tile photo-tile--photo">${photoStub({ type, tone, size: 'fill' })}${cancel}</span>`;
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
let sheetSeq = 0;
export function sheet(contentHtml, { open = null, header = null, grabber = true, variant = '', confirm = true, ariaLabel = '' } = {}) {
  const hostAttr = open === null ? '' : ` data-open="${open}"`;
  /* M6-A-09: the dialog is named by its title (aria-labelledby); a headerless sheet is named by `ariaLabel`, or sheetOverlay
     points it at the first h2 of its content */
  const titleId = `sheet-title-${++sheetSeq}`;
  const name = header ? ` aria-labelledby="${titleId}"` : ariaLabel ? ` aria-label="${esc(ariaLabel)}"` : '';
  const head = header
    ? `<div class="sheet__header"><button type="button" class="sheet__cancel" data-act="sheet-cancel" aria-label="Close">✕</button><span class="sheet__title" id="${titleId}">${header}</span>${confirm
      ? '<button type="button" class="sheet__confirm" data-act="sheet-confirm" aria-label="Done">✓</button>'
      : '<span class="sheet__spacer" aria-hidden="true"></span>'}</div>`
    : '';
  return `<div class="sheet-host"${hostAttr}>
  <div class="sheet-scrim" data-act="sheet-cancel"></div>
  <div class="sheet${variant ? ' sheet--' + variant : ''}" role="dialog" aria-modal="true"${name}>
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
  const first = items()[0];
  if (first) {
    /* M6-C-25: programmatic focus shows no ring (data-pfocus), the first key press hands the ring back */
    first.dataset.pfocus = '';
    first.focus({ preventScroll: true });
    const clear = () => { delete first.dataset.pfocus; root.ownerDocument.removeEventListener('keydown', clear, true); first.removeEventListener('blur', clear); };
    root.ownerDocument.addEventListener('keydown', clear, true);
    first.addEventListener('blur', clear);
  }
  wireRadioRows(root);
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

export function sheetOverlay(contentHtml, { header = null, variant = '', dataS = '', confirm = true, ariaLabel = '' } = {}, wireFn) {
  const screenEl = document.getElementById('screen');
  // one overlay at a time (a closing one, mid slide-out, doesn't count)
  if (screenEl.querySelector('.screen-sheet--overlay:not(.is-closing)')) return () => {};
  clearToasts();   // R5-1-C-04: a toast never covers a sheet control
  const opener = document.activeElement;
  const holder = document.createElement('div');
  holder.className = 'screen-sheet screen-sheet--overlay';
  if (dataS) holder.dataset.s = dataS;
  holder.innerHTML = sheet(contentHtml, { header, variant, open: false, confirm, ariaLabel });
  /* M6-A-09: a headerless sheet with no `ariaLabel` is named by its first h2 */
  const panelEl = holder.querySelector('.sheet');
  if (!header && !ariaLabel) {
    const h = panelEl.querySelector('h2');
    if (h) { h.id ||= `sheet-title-${++sheetSeq}`; panelEl.setAttribute('aria-labelledby', h.id); }
  }

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
  /* a sheet mid-commit sets holder.dataset.locked = 'true': ✕, scrim and Escape do nothing until it clears (R4-2-C-03) */
  const dismiss = () => { if (holder.dataset.locked !== 'true') close(); };
  holder.querySelectorAll('[data-act="sheet-cancel"]').forEach((el) => el.addEventListener('click', dismiss));
  wireSheetA11y(holder, dismiss);
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
  clearToasts();   // R5-1-C-04
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
export function toast(msg, { tone = 'neutral', action = '', onAction = null, ms = action ? 5000 : tone === 'error' ? 6000 : 4000 } = {}) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = tone === 'neutral' ? 'toast' : `toast toast--${tone}`;   // v5: neutral | success | warning | error | info
  el.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  el.textContent = msg;
  if (action) {   // an inline action (Undo): the toast takes pointer events for its button
    el.classList.add('toast--action');
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'toast__action'; btn.textContent = action;
    btn.addEventListener('click', () => { clearToasts(); onAction?.(); });
    el.appendChild(btn);
  }
  document.body.appendChild(el);
  const bar = document.querySelector('#screen .action-bar');   // never over a sticky CTA (D-71)
  if (bar) el.style.bottom = `${bar.offsetHeight + 12}px`;
  document.documentElement.classList.add('has-toast');   // the persona toggle steps aside
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('toast--in')));
  setTimeout(() => {
    el.classList.remove('toast--in');
    setTimeout(() => { el.remove(); if (!document.querySelector('.toast')) document.documentElement.classList.remove('has-toast'); }, 300);
  }, ms);
}

/** Remove every toast now (a screen change does this — D-71: a toast never outlives its screen). */
export function clearToasts() {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  document.documentElement.classList.remove('has-toast');
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
 * columns: [{ width, rows: [strings], sel, label }] — 44px rows, 88px pads so
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
/* `rowH` — every wheel runs a 44px pitch (rows are tap targets, M6-V-02); the Scheduler passes SCHED_ROW */
export function wireWheel(root, onChange, rowH = 44) {
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
    /* keys and clicks settle a row the same way: mark it, scroll to it, report it once (the keyed guard) */
    const settle = (idx) => {
      markWheelRow(col, idx);
      keyed = idx;
      col.scrollTo({ top: idx * rowH, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      onChange?.();
      /* onChange may snap / re-row the column (readSlot) — keep aria-activedescendant on what it settled */
      markWheelRow(col, Number(col.dataset.sel));
    };
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
      settle(idx);
    });
    /* M6-A-12: a tap on a row (pointer, or a screen reader's activate) moves the selection to it */
    col.addEventListener('click', (e) => {
      const row = e.target.closest('.wheel__row');
      if (!row || !col.contains(row)) return;
      const idx = [...col.querySelectorAll('.wheel__row')].indexOf(row);
      if (idx < 0 || idx === (Number(col.dataset.sel) || 0)) return;
      settle(idx);
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
  /* M6-A-15: an ordered list; the state is spoken ("Done: " / "Now: " / "Next: "), the dot glyph is decoration */
  const SAY = { done: 'Done: ', current: 'Now: ', todo: 'Next: ' };
  const rows = steps.map(({ state, title, sub }) => {
    const glyph = state === 'done' ? '✓' : state === 'current' ? '●' : '';
    return `<li class="step step--${state}"${state === 'current' ? ' aria-current="step"' : ''}>
    <span class="step__dot" aria-hidden="true">${glyph}</span>
    <span class="step__labels"><span class="step__title"><span class="sr-only">${SAY[state] ?? ''}</span>${title}</span>${sub ? `<span class="step__sub">${sub}</span>` : ''}</span>
  </li>`;
  }).join('');
  return `<ol class="timeline">${rows}</ol>`;
}

/** M7 (A4): a FLAT group of rows (no background, ring or padding) with an optional caps heading. The white card is `.card`. */
export function infoCard(rowsHtml, { heading = '' } = {}) {
  return `<div class="info-block">${heading ? sectionHead(heading) : ''}${rowsHtml}</div>`;
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

/* ---------- M5 glyphs + limits (messaging, accounts, system) ---------- */
/** Photos per chat message (CHAT_LIMITS.PHOTOS_MAX in data.js, D-131). */
const CHAT_PHOTO_CAP = () => DATA.CHAT_LIMITS?.PHOTOS_MAX ?? 3;
const GLYPH = (paths, size = 16) => `<svg class="icon-${size}" width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
/** A closed padlock: the masked-token pill's glyph. */
export const ICON_LOCK = GLYPH('<rect x="3.2" y="7" width="9.6" height="6.8" rx="1.6"/><path d="M5.4 7V5.2a2.6 2.6 0 0 1 5.2 0V7"/>');
/** A small ✕ (remove an attachment). */
export const ICON_CLOSE = GLYPH('<path d="M4 4l8 8M12 4l-8 8"/>');
/** Photo-library glyph (Choose from library). */
export const ICON_IMAGE = GLYPH('<rect x="2" y="3" width="12" height="10" rx="2"/><circle cx="6" cy="6.6" r="1.1"/><path d="M2.6 12l3.6-3.4 2.6 2.4 1.6-1.4 2.8 2.4"/>');
/** Bell (the push prompt). */
export const ICON_BELL = GLYPH('<path d="M3.6 11.2h8.8l-1.1-1.6V6.8a3.3 3.3 0 0 0-6.6 0v2.8z"/><path d="M6.6 13.4a1.5 1.5 0 0 0 2.8 0"/>');
/** Wi-Fi with a slash (the offline banner). */
export const ICON_WIFI_OFF = GLYPH('<path d="M1.6 6.2a9.6 9.6 0 0 1 3-1.9M14.4 6.2a9.6 9.6 0 0 0-4.4-2.4M4 8.8a5.6 5.6 0 0 1 2-1.2M12 8.8a5.6 5.6 0 0 0-1.4-1M8 12.2h.01"/><path d="M2 2l12 12"/>');
/** Alert triangle (a failed courier price, M6-P-09). */
export const ICON_ALERT = GLYPH('<path d="M8 2.4l6 10.4H2z"/><path d="M8 6.6v3M8 11.4h.01"/>');

/* ============================================================
   M7 (K-03) — polish components. Spec: docs/v5/M7-spec.md §A5.
   ============================================================ */

/** Section heading (A5.5): a small sans-caps label above a group. `aside` is HTML (an infoButton, a "See all" link); `count` a plain number/text. */
export function sectionHead(title, { id = '', count = null, aside = '' } = {}) {
  const right = [count != null && count !== '' ? `<span class="t-small c-600 tabular">${esc(count)}</span>` : '', aside].filter(Boolean).join('');
  return `<div class="sec-head"><h2 class="t-caps c-600 sec-head__title"${id ? ` id="${esc(id)}"` : ''}>${title}</h2>${right ? `<span class="sec-head__aside">${right}</span>` : ''}</div>`;
}

/**
 * Text link (A5.9, D-195) — the secondary action everywhere an outline button used to be. tone: default (accent) | danger | muted.
 * `icon` is HTML before the label. `disabled` greys it out and sets the attribute. `href` renders an anchor instead (a map / .ics download), same markup.
 */
export function textLink(label, { act = '', tone = 'default', icon = '', attrs = '', disabled = false, href = '' } = {}) {
  if (href) return `<a class="text-link text-link--${tone}" href="${esc(href)}"${act ? ` data-act="${esc(act)}"` : ''}${attrs ? ` ${attrs}` : ''}>${icon}<span>${label}</span></a>`;
  return `<button type="button" class="text-link text-link--${tone}"${act ? ` data-act="${esc(act)}"` : ''}${disabled ? ' disabled aria-disabled="true"' : ''}${attrs ? ` ${attrs}` : ''}>${icon}<span>${label}</span></button>`;
}

/** The stitched dash (A5.10, signature 2): a perforation above a total. Used by moneyRows and the receipt only. */
export function stitchDivider() {
  return '<hr class="stitch" aria-hidden="true">';
}

/**
 * Booking flow bar (A5.3, D-186) — replaces the top nav on booking steps 2-5: status bar + a 56 px bar with Back · the
 * compact "n of 5" stepper · ✕ Leave booking. `step` is 0-based like bookingSteps(). The ✕ is handled by app.js
 * (`[data-act="exit-booking"]` → c-job, the draft job is kept). Pass `busy: true` to disable both while a request is in flight.
 */
export function flowBar({ step = 1, total = BOOKING_STEPS.length, back = true, exitAct = 'exit-booking', exitLabel = 'Leave booking', busy = false, time = '9:41' } = {}) {
  const steps = Array.from({ length: total }, (_, i) => BOOKING_STEPS[i] ?? `Step ${i + 1}`);
  const stepsHtml = stepper({ steps, current: step, done: steps.slice(0, step).map((_, i) => i), variant: 'compact' });
  const dis = busy ? ' disabled aria-disabled="true"' : '';
  return `${statusBar(time)}
<div class="flow-bar" role="navigation" aria-label="Booking">
  ${back ? `<button type="button" class="back" data-act="back" aria-label="Back"${dis}>‹</button>` : '<span class="flow-bar__spacer"></span>'}
  <div class="flow-bar__steps">${stepsHtml}</div>
  <button type="button" class="flow-bar__exit" data-act="${esc(exitAct)}" aria-label="${esc(exitLabel)}" title="${esc(exitLabel)}"${dis}>${ICON_CLOSE}</button>
</div>`;
}

/** Verified mark (A5.7, D-189) — one seal + word. A button that opens the "Verified by Taily" sheet; `inert` inside a button host (tailorRow). */
export function verifiedMark({ act = 'verified', inert = false } = {}) {
  const inner = `${ICON_VERIFIED}<span>Verified</span>`;
  return inert
    ? `<span class="verified verified--inert">${inner}</span>`
    : `<button type="button" class="verified" data-act="${esc(act)}" data-hit="inline" aria-haspopup="dialog">${inner}</button>`;   /* M7-2-C-03: 20 px visible, a ::before carries the 44 px target */
}
/** "Verified by Taily" sheet: ID verified · Background check · Insured, one line each (labels = TRUST_BADGES). */
const VERIFIED_LINES = ['Taily checked a government ID.', 'Cleared before the first booking.', 'Covered while working on your garments.'];
/** The sheet's body (also the gallery's static specimen). */
export function verifiedSheetHtml() {
  const rows = TRUST_BADGES.map((label, i) => `<li class="verified-item"><span class="verified-item__icon">${ICON_VERIFIED}</span><span class="verified-item__text"><span class="t-body w-600">${esc(label)}</span><span class="t-small c-600">${VERIFIED_LINES[i] ?? ''}</span></span></li>`).join('');
  return `<ul class="verified-list">${rows}</ul>`;
}
export function openVerifiedSheet() {
  return sheetOverlay(verifiedSheetHtml(), { header: 'Verified by Taily', dataS: 'verified', confirm: false });
}
/** Delegated: `[data-act="verified"]` opens the sheet. app.js calls this on every screen; screens never need to. */
export function wireVerified(root) {
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="verified"]')) openVerifiedSheet();
  });
}

/** Rating (A5.8, D-190) — "★ 4.9 (37)" once. With `anchor` ('#reviews') it is a 44 px link that scrolls to that section. */
export function ratingLine({ avg = 0, count = 0, anchor = '' } = {}) {
  const label = `Rated ${Number(avg).toFixed(1)} out of 5 from ${count} review${count === 1 ? '' : 's'}`;
  const inner = `<span class="rating-line__star" aria-hidden="true">★</span> <span class="tabular w-600">${Number(avg).toFixed(1)}</span> <span class="c-600">(${count})</span>`;
  return anchor
    ? `<a class="rating-line rating-line--link t-small" data-hit="inline" href="${esc(anchor)}" data-anchor="${esc(anchor.replace(/^#/, ''))}" aria-label="${label}">${inner}</a>`
    : `<span class="rating-line t-small" aria-label="${label}">${inner}</span>`;
}

/* ---------- ⓘ info sheets (A5.11, D-191) ---------- */
const INFO = {
  pricing: () => ({ title: 'How pricing works', lines: [
    'Estimates use each tailor’s own price list.',
    'At the fitting, the tailor sends you the final order. Nothing changes until you approve it.',
    'You pay the balance when your order is ready.'] }),
  deposit: () => ({ title: 'About the deposit', lines: [
    'The deposit is held on your card, and charged only when the tailor accepts.',
    'It comes off your final total.',
    `Free cancellation until ${POLICY.CANCEL_WINDOW_H} hours before the visit. After that, the deposit is kept.`] }),
  fitting: (c) => ({ title: 'At the fitting', lines: [
    'You can add or remove items and services, and change prices.',
    `${c.first || 'The customer'} approves the final order before you start.`] }),
  fee: () => ({ title: 'The Taily fee', lines: [
    'Taily’s fee comes only from your service prices.',
    'Home-visit and rush fees are yours in full.',
    'Customers pay for the courier. It never comes out of your payout.',
    `If a customer cancels within ${POLICY.CANCEL_WINDOW_H} hours, you keep their deposit, with no fee.`] }),
  payouts: () => ({ title: 'When you get paid', lines: [
    'Taily pays out every Friday for jobs you completed before that day.',
    'Job payouts are after the Taily fee. Kept deposits and no-show pay have no fee.'] }),
  privacy: () => ({ title: 'Your privacy', lines: [
    'Phone numbers and emails stay private on Taily.',
    'Only your neighborhood is shared until a tailor accepts.'] }),
};
export const INFO_KEYS = Object.keys(INFO);
/** A 44 px ⓘ button; `first` (a tailor or customer first name) feeds the copy that names someone. */
export function infoButton(key, { label = '', first = '' } = {}) {
  const name = label || INFO[key]?.({ first: '' }).title || 'More info';
  return `<button type="button" class="info-btn" data-info="${esc(key)}"${first ? ` data-first="${esc(first)}"` : ''} aria-label="${esc(name)}" title="${esc(name)}" aria-haspopup="dialog">${ICON_INFO}</button>`;
}
/** Open one info sheet (dataS `info-<key>`); rows are metaRows with a 16 px info bullet. */
export function infoSheetHtml(key, ctx = {}) {
  const def = INFO[key]?.(ctx);
  return def ? { title: def.title, html: `<div class="info-sheet">${def.lines.map((l) => metaRow(ICON_INFO, esc(l))).join('')}</div>` } : null;
}
export function openInfoSheet(key, ctx = {}) {
  const sh = infoSheetHtml(key, ctx);
  if (!sh) return () => {};
  return sheetOverlay(sh.html, { header: sh.title, dataS: `info-${key}`, confirm: false });
}
/** Delegated: `[data-info]` opens its sheet. app.js calls this on every screen; screens never need to. */
export function wireInfo(root) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-info]');
    if (b) openInfoSheet(b.dataset.info, { first: b.dataset.first ?? '' });
  });
}

/* ---------- ••• more menu (A5.9, D-195) ---------- */
/** A 44 x 44 ••• button. The screen opens the menu with openMoreMenu() when `[data-act="more"]` is pressed. */
export function moreMenu({ label = 'More actions', act = 'more' } = {}) {
  return `<button type="button" class="more-btn" data-act="${esc(act)}" aria-label="${esc(label)}" title="${esc(label)}" aria-haspopup="dialog">${ICON_MORE}</button>`;
}
/**
 * The ••• menu sheet: one row per `{ label, act, sub, tone }`; `tone: 'danger'` = error-ink title, no chevron. Choosing a row closes the
 * menu and presses `[data-act=act]` on the screen — the screen's existing handler then opens its own sheet.
 */
export function openMoreMenu(items = [], { title = 'More' } = {}) {
  const rows = items.map((it) => listRow({
    title: it.tone === 'danger' ? `<span class="more-item--danger">${esc(it.label)}</span>` : esc(it.label),
    sub: it.sub ? esc(it.sub) : '', act: it.act, chevron: it.tone !== 'danger',
  })).join('');
  return sheetOverlay(`<div class="more-menu" role="group" aria-label="${esc(title)}">${rows}</div>`, { header: title, dataS: 'more', confirm: false }, (holder, close) => {
    holder.addEventListener('click', (e) => {
      const row = e.target.closest('.more-menu [data-act]');
      if (!row) return;
      const act = row.dataset.act;
      close({ instant: true });
      const screenEl = document.getElementById('screen');
      const press = document.createElement('button');
      press.hidden = true; press.dataset.act = act;
      screenEl.appendChild(press); press.click(); press.remove();
    });
  });
}

/* ---------- photo stub (A5.12, D-194): the garment drawn on a soft tint, tilted — every photo placeholder ---------- */
/** `size`: thumb 56 · tile 72 · stage (fills its box) · fill (fills a host tile). `seed` (id or number) picks the tilt, else the tone. */
export function photoStub({ type = '', tone = 0, size = 'thumb', kind = 'photo', alt = '', seed = null } = {}) {
  const src = GARMENT_ICONS[type];
  const n = Number(String(seed ?? tone).replace(/\D/g, '')) || 0;
  const tilt = n % 2 === 0 ? 'even' : 'odd';
  const a11y = alt ? ` role="img" aria-label="${esc(alt)}"` : ' aria-hidden="true"';
  return `<span class="doc-photo doc-photo--${size} doc-photo--t${(Number(tone) || 0) % 4} doc-photo--${kind} doc-photo--${tilt}"${a11y}>${src ? `<img src="${src}" alt="">` : ICON_HANGER}${kind === 'pinned' ? `<span class="doc-photo__pin">${ICON_PIN}</span>` : ''}</span>`;
}

/* ---------- avatar ---------- */
/** Avatar (M7 A5.4, D-199) — a circle: initials on the warm tint. size 'sm' 40 | 'md' 56 | 'lg' 80. A real photo wins over initials;
    `photo: true` = the prototype's "added photo": the same tinted circle with the initials (a camera glyph when there are none yet). Decorative. */
export function avatar({ initials = '', photo = null, size = 'sm' } = {}) {
  if (photo === true) {
    const inner = initials ? esc(initials) : ICON_CAMERA;
    return `<span class="avatar avatar--${size} avatar--photo avatar--placeholder" aria-hidden="true">${inner}</span>`;
  }
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
export function tailorRow({ id, name, initials, photo = null, verified = false, rating = null, distanceMi = null, quote = 0, nextOpening = null, visitType = 'home', declined = false, format = fmt, booked = '' } = {}) {
  const q = typeof quote === 'number' ? { total: quote } : (quote ?? {});
  /* M6-M-07: one caption, "Includes $35 home-visit fee and $40 rush fee" — no "+" */
  const incl = [];
  if (visitType === 'home' && q.homeFee > 0) incl.push(`${format(q.homeFee)} home-visit fee`);
  if (q.rush > 0) incl.push(`${format(q.rush)} rush fee`);
  const captions = incl.length ? [`Includes ${incl.join(' and ')}`] : [];
  const meta = [
    rating ? `★ ${rating.avg} (${rating.count})` : '',
    distanceMi != null ? `${Number(distanceMi).toFixed(1)} mi` : '',
  ].filter(Boolean).join(' · ');
  const attrs = declined ? ' aria-disabled="true"' : ` data-act="open-tailor" data-id="${esc(id)}"`;
  /* the estimate is the focal element (R1-1-C-17): right-aligned on the name row at 24 / 600 tabular; the full badge list lives on the profile */
  const est = declined ? '' : `<span class="tailor-row__quote" data-money><span class="tailor-row__est">Est. ${format(q.total ?? 0)}</span></span>`;
  return `<button type="button" class="tailor-row card${declined ? ' tailor-row--declined' : ''}${q.rush > 0 ? ' tailor-row--rush' : ''}"${attrs}>
  <span class="tailor-row__who">
    ${avatar({ initials, photo, size: 'md' })}
    <span class="tailor-row__info">
      <span class="tailor-row__name-row"><span class="tailor-row__name">${esc(name)}</span>${est}</span>
      ${meta || verified ? `<span class="tailor-row__meta">${meta}${verified ? `${meta ? ' ' : ''}${verifiedMark({ inert: true })}` : ''}</span>` : ''}
    </span>
  </span>
  ${!declined && (captions.length || nextOpening) ? `<span class="tailor-row__lower">${captions.length ? `<span class="tailor-row__captions" data-money>${captions.map((c) => `<span class="tailor-row__caption">${c}</span>`).join('')}</span>` : ''}${nextOpening ? `<span class="tailor-row__next">Next opening ${fmtWhen(nextOpening)}</span>` : ''}</span>` : ''}
  ${declined ? '<span class="tailor-row__note">Declined this job</span>' : ''}
  ${!declined && booked ? `<span class="tailor-row__booked">${booked}</span>` : ''}
</button>`;
}

/* ---------- price row ---------- */
/** Price Row — label left, price right, hairline between rows. `muted`: "Not offered". */
export function priceRow({ label, cents = 0, note = '', muted = false, format = fmt } = {}) {
  noPercent(label, 'priceRow');
  return `<div class="price-row${muted ? ' price-row--muted' : ''}" data-money>
  <span class="price-row__text"><span class="price-row__label">${esc(label)}</span>${note ? `<span class="price-row__note">${esc(note)}</span>` : ''}</span>
  <span class="price-row__value">${muted ? 'Not offered' : format(cents)}</span>
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
/** @deprecated M7 (D-190) — the rating prints once, as ratingLine(). Kept so unmigrated screens still render. */
export function ratingSummary({ avg = 0, count = 0 } = {}) {
  return ratingLine({ avg, count });
}
/** A review photo is always a garment (D-194): when the review names none, cycle the catalog so the hanger never shows. */
function reviewPhotoType(i) {
  const keys = Object.keys(GARMENT_TYPES);
  return keys[i % keys.length] ?? '';
}
/** Review row — avatar, name, date, stars, text, up to 3 photo thumbs. */
export function reviewRow({ name, initials, stars: rating = 0, date, text = '', photos = 0, photoType = '' } = {}) {
  return `<article class="review-row">
  <div class="review-row__head">
    ${avatar({ initials, size: 'sm' })}
    <div class="review-row__who"><span class="review-row__name">${esc(name)}</span><span class="review-row__date">${date ? fmtShort(date) : ''}</span></div>
    ${stars({ value: rating })}
  </div>
  ${text ? `<p class="review-row__text">${esc(text)}</p>` : ''}
  ${photos > 0 ? `<div class="review-row__photos">${Array.from({ length: Math.min(photos, 3) }, (_, i) => photoTile('photo', { type: photoType || reviewPhotoType(i), tone: i })).join('')}</div>` : ''}
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
export function chatBubble({ text = '', side = 'them', time = '', photos = 0, status = 'sent', masked = false, id = '', photoLabel = 'Photo', photoType = '', peer = '' } = {}) {
  const me = side === 'me';
  const n = Math.min(photos, CHAT_PHOTO_CAP());
  /* M5: [phone hidden] / [email hidden] print as a masked-token pill (the text is escaped first, then the tokens are swapped in) */
  const textHtml = esc(text).replace(/\[(phone|email) hidden\]/g, (_, kind) => `<span class="masked-token">${ICON_LOCK}${kind} hidden</span>`);
  /* M5: photos are one 64 px view-photo button (the placeholder viewer opens through wirePhotoViewer) */
  const photoTitle = n === 1 ? photoLabel : photoLabel.replace(/\bphoto\b/i, (m) => `${m}s`);   // R5-1-C-01: the viewer's ready-made title
  const photoBtn = n > 0 ? `<button type="button" class="chat-bubble__photo" data-act="view-photo" data-type="${esc(photoLabel)}" data-garment="${esc(photoType)}" data-title="${esc(photoTitle)}" data-count="${n}" aria-label="View ${n === 1 ? '1 photo' : `${n} photos`}">${Array.from({ length: n }, (_, i) => `<span class="chat-bubble__tile">${photoStub({ type: photoType, tone: i, size: 'fill' })}</span>`).join('')}</button>` : '';
  const body = `${text ? `<span class="chat-bubble__text">${textHtml}</span>` : ''}${photoBtn}`;
  const meta = [];
  if (status === 'sending') meta.push('<span class="chat-msg__status">Sending…</span>');
  else if (status === 'failed') meta.push(`<button type="button" class="chat-msg__retry" data-act="retry" data-id="${esc(id)}">Not sent · Retry</button>`);
  else if (time) meta.push(`<span class="chat-msg__time">${esc(time)}</span>`);
  /* R5-1-C-08 (D-147): the bubble note says what happened; the standing note at the top of the thread says the rule */
  if (masked && me) meta.push(`<span class="chat-msg__note">${peer ? `Hidden from ${esc(peer)}. Numbers and emails stay private on Taily.` : PRIVACY_NOTE}</span>`);
  return `<div class="chat-msg chat-msg--${me ? 'me' : 'them'} chat-msg--${status}">
  <div class="bubble-row${me ? ' bubble-row--me' : ''}"><div class="bubble chat-bubble${me ? ' bubble--me' : ''}">${body}</div></div>
  ${meta.length ? `<div class="chat-msg__meta">${meta.join('')}</div>` : ''}
</div>`;
}
/** The standing privacy note above a thread. */
export function privacyNote() {
  return `<p class="privacy-note t-small c-600">${ICON_INFO}<span>${PRIVACY_NOTE}</span></p>`;
}
/** Read-only thread footer (a declined request): banner + one CTA, optionally an outline secondary under it (M5). */
export function readOnlyBanner({ text = '', ctaLabel = 'Find another tailor', ctaAct = 'find-another', secondaryLabel = '', secondaryAct = '' } = {}) {
  return `<div class="read-only">${banner({ tone: 'info', text })}${cta(ctaLabel, { attrs: `data-act="${ctaAct}"` })}${secondaryLabel ? textLink(secondaryLabel, { act: secondaryAct }) : ''}</div>`;
}
/**
 * Message composer — empty (send disabled) · typing · disabled (read-only).
 * M5: `hint` (non-empty) = the live privacy line above the input (`#composer-hint`, aria-live); `photos` > 0 = a tray of
 * 64 px placeholder tiles with 44 px remove buttons, and Send is enabled by text OR a photo; at `max` the camera is disabled.
 * The form carries `data-photos` so wireComposer can submit a photo-only message.
 */
export function composer({ value = '', disabled = false, placeholder = 'Message', hint = '', photos = 0, max = CHAT_PHOTO_CAP(), photoType = '' } = {}) {
  const empty = !String(value).trim() && !(photos > 0);
  const full = photos >= max;
  const tray = photos > 0 ? `<div class="composer__tray" role="list" aria-label="Photos to send">${Array.from({ length: photos }, (_, i) => `<span class="composer__thumb" role="listitem"><span class="composer__thumb-tile" aria-hidden="true">${photoStub({ type: photoType, tone: i, size: 'fill' })}</span><button type="button" class="composer__remove" data-act="remove-attachment" data-index="${i}" aria-label="Remove photo ${i + 1}"${disabled ? ' disabled' : ''}>${ICON_CLOSE}</button></span>`).join('')}</div>` : '';
  return `<form class="composer${disabled ? ' composer--disabled' : ''}" data-composer data-photos="${photos}" novalidate>
  <p class="composer__hint t-small c-700" id="composer-hint" aria-live="polite">${hint ? `${ICON_INFO}<span>${esc(hint)}</span>` : ''}</p>
  ${tray}
  <button type="button" class="composer__attach" data-act="attach-photo" aria-label="${full ? `${max} photos added, the most per message` : 'Add photo'}"${disabled || full ? ' disabled' : ''}>${ICON_CAMERA}</button>
  <label class="sr-only" for="composer-input">Message</label>
  <input class="composer__input" id="composer-input" type="text" autocomplete="off" placeholder="${esc(placeholder)}" value="${esc(value)}"${hint ? ' aria-describedby="composer-hint"' : ''}${disabled ? ' disabled' : ''}>
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
/** Code input — one numeric one-time-code field, `length` digits, spaced for reading. `helper` replaces the default line under it (an error wins). */
export function codeInput({ id, length = 6, value = '', error = '', label = 'Verification code', helper = '' } = {}) {
  const msgId = `${id}-msg`;
  return `<div class="field field--code${error ? ' field--error' : ''}">
  <label class="field__label" for="${id}">${esc(label)}</label>
  <div class="field__box"><input class="field__input" id="${id}" name="${id}" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="${length}" pattern="[0-9]*" value="${esc(value)}" placeholder="${'•'.repeat(length)}"${error ? ' aria-invalid="true"' : ''} aria-describedby="${msgId}"></div>
  <p class="field__msg${error ? ' field__msg--error' : ''}" id="${msgId}"${error ? ' role="alert"' : ''}>${esc(error || helper || `Enter the ${length}-digit code we sent you.`)}</p>
</div>`;
}
/** Toggle — a switch row (>= 44 px). */
export function toggle({ id, label, checked = false, disabled = false, helper = '' } = {}) {
  return `<div class="toggle-row${disabled ? ' toggle-row--disabled' : ''}">
  <span class="toggle-row__text"><span class="toggle-row__label" id="${id}-label">${esc(label)}</span>${helper ? `<span class="toggle-row__helper" id="${id}-help">${esc(helper)}</span>` : ''}</span>
  <button type="button" class="toggle" id="${id}" role="switch" aria-checked="${checked}" aria-labelledby="${id}-label"${helper ? ` aria-describedby="${id}-help"` : ''} data-toggle="${id}"${disabled ? ' disabled' : ''}><span class="toggle__knob"></span></button>
</div>`;
}
/** Check row — a 44 px row with an inset-stroke box. checked · unchecked · error · disabled (greyed label, caption still readable). */
export function checkRow({ id, label, checked = false, caption = '', captionHtml = '', error = '', attrs = '', disabled = false } = {}) {
  const cap = captionHtml || (caption ? esc(caption) : '');
  return `<div class="check-row-wrap${error ? ' check-row-wrap--error' : ''}${disabled ? ' check-row-wrap--disabled' : ''}">
  <label class="check-row" for="${id}">
    <input class="check-row__input" type="checkbox" id="${id}" name="${id}"${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}${error ? ` aria-invalid="true" aria-describedby="${id}-msg"` : ''} ${attrs}>
    <span class="check-row__box" aria-hidden="true">✓</span>
    <span class="check-row__text"><span class="check-row__label">${esc(label)}</span>${cap ? `<span class="check-row__caption">${cap}</span>` : ''}</span>
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
  /* M6-A-11: a single-select group is one tab stop (roving tabindex): the checked chip, else the first enabled one */
  const stop = multi ? -1 : Math.max(0, options.findIndex((o) => !o.disabled && picked(o.value)) >= 0 ? options.findIndex((o) => !o.disabled && picked(o.value)) : options.findIndex((o) => !o.disabled));
  const items = options.map((o, i) => {
    const on = picked(o.value);
    const a11y = multi ? `aria-pressed="${on}"` : `role="radio" aria-checked="${on}" tabindex="${i === stop ? 0 : -1}"`;
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
export const BOOKING_STEPS = ['What needs work', 'Where and when', 'Choose a tailor', 'Pick a time', 'Review and send'];
/** bookingSteps(current) — `current` is 0-based; every earlier step reads as done. */
export function bookingSteps(current = 0) {
  return stepper({ steps: BOOKING_STEPS, current, done: BOOKING_STEPS.slice(0, current).map((_, i) => i), variant: 'compact' });
}

/**
 * Action bar — the sticky white bottom bar of every booking step and sign-in form. Render it as a SIBLING of
 * main.body inside #screen (never inside .body) and give the body `.body--with-bar`.
 * `secondaryLabel` + `tertiaryLabel` render as a two-column outline row under the primary (`tertiaryTone: 'danger'` = error text + stroke).
 * `lead` is an HTML line above the button: at most TWO top-level flex children — a label (text or <span>) on the
 * left and one <b data-money> amount on the right; never trailing text after the <b> (it becomes a third item). `note` sits under the buttons and, when
 * `disabled`, is linked to the CTA with aria-describedby (the reason it is off). `busy` locks both buttons.
 */
export function actionBar({ ctaLabel = '', ctaAct = '', disabled = false, softDisabled = false, busy = false, busyLabel = '', lead = '', note = '', secondaryLabel = '', secondaryAct = '', tertiaryLabel = '', tertiaryAct = '', tertiaryTone = 'default' } = {}) {
  const noteId = `action-bar-note-${ctaAct || 'cta'}`;
  const describe = (disabled || softDisabled) && note ? ` aria-describedby="${noteId}"` : '';
  /* M7 (A5.9, D-195): the secondary and tertiary are text links under the one filled primary, in one centred row */
  const second = secondaryLabel ? textLink(secondaryLabel, { act: secondaryAct, disabled: busy }) : '';
  const third = tertiaryLabel ? textLink(tertiaryLabel, { act: tertiaryAct, tone: tertiaryTone === 'danger' ? 'danger' : 'default', disabled: busy }) : '';
  return `<div class="action-bar${busy ? ' action-bar--busy' : ''}">
  ${lead ? `<p class="action-bar__lead t-small c-600">${lead}</p>` : ''}
  ${cta(ctaLabel, { disabled, softDisabled, busy, busyLabel, attrs: `data-act="${ctaAct}"${describe}` })}
  ${second || third ? `<div class="action-bar__links">${second}${third}</div>` : ''}
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
/** List row — [lead] title (+ sub) left, value (+ chevron) right. A button when `act` is set (`attrs` = extra attributes on it, e.g. `data-id`). `lead` (HTML) takes the same 32 px column as optionRow's, so titles line up. */
export function listRow({ title, sub = '', right = '', act = '', chevron = true, lead = '', attrs = '' } = {}) {
  const inner = `${lead ? `<span class="list-row__lead" aria-hidden="true">${lead}</span>` : ''}<span class="list-row__text"><span class="list-row__title">${title}</span>${sub ? `<span class="list-row__sub">${sub}</span>` : ''}</span>${right ? `<span class="list-row__right">${right}</span>` : ''}${act && chevron ? CHEVRON_RIGHT.replace('method-row__chevron', 'list-row__chevron') : ''}`;
  return act
    ? `<button type="button" class="list-row" data-act="${act}"${attrs ? ` ${attrs}` : ''}>${inner}</button>`
    : `<div class="list-row list-row--static">${inner}</div>`;
}
/** Skeleton — loading placeholders (static under reduced motion). kind: line | tailor-row | card | thread | thread-row | payout. */
export function skeleton({ kind = 'line', count = 1 } = {}) {
  const one = {
    line: '<span class="skeleton__line"></span>',
    'tailor-row': '<div class="skeleton__card skeleton__card--row"><span class="skeleton__who"><span class="skeleton__dot"></span><span class="skeleton__lines"><span class="skeleton__line skeleton__line--w60"></span><span class="skeleton__line skeleton__line--w40"></span><span class="skeleton__line skeleton__line--w80"></span></span></span><span class="skeleton__lower"><span class="skeleton__line skeleton__line--w60"></span><span class="skeleton__line skeleton__line--w80"></span></span></div>',
    card: '<div class="skeleton__card"><span class="skeleton__line skeleton__line--w60"></span><span class="skeleton__line"></span><span class="skeleton__line skeleton__line--w80"></span></div>',
    'thread-row': '<div class="skeleton__row"><span class="skeleton__dot skeleton__dot--sm"></span><span class="skeleton__lines"><span class="skeleton__line skeleton__line--w40"></span><span class="skeleton__line skeleton__line--w80"></span></span></div>',
    'appt-row': '<div class="skeleton__appt"><span class="skeleton__dot skeleton__dot--sm"></span><span class="skeleton__lines"><span class="skeleton__line skeleton__line--w60"></span><span class="skeleton__line skeleton__line--w80"></span><span class="skeleton__line skeleton__line--w40"></span></span><span class="skeleton__aside"><span class="skeleton__line skeleton__line--pill"></span><span class="skeleton__line skeleton__line--amt"></span></span></div>',
    payout: '<div class="skeleton__card"><span class="skeleton__line skeleton__line--figure skeleton__line--w60"></span><span class="skeleton__line skeleton__line--w80"></span><span class="skeleton__line skeleton__line--w40"></span></div>',
    thread: '<div class="skeleton__thread"><span class="skeleton__bubble skeleton__bubble--them"></span><span class="skeleton__bubble skeleton__bubble--me"></span><span class="skeleton__bubble skeleton__bubble--them skeleton__bubble--short"></span></div>',
  }[kind] ?? '';
  return `<div class="skeleton skeleton--${kind}" aria-busy="true"><span class="sr-only">Loading</span>${one.repeat(Math.max(1, count))}</div>`;
}
/**
 * Empty state — sans title (M7-2-A-04: the page title stays the only serif), body, optional primary + secondary. M7: the secondary is a text link (A5.9); `art` = a garment
 * type → its 96 px illustration in a 120 px accent-bg circle above the title (A5.12).
 */
export function emptyState({ title, body = '', ctaLabel = '', ctaAct = '', secondaryLabel = '', secondaryAct = '', art = '' } = {}) {
  return `<div class="empty-state">
  ${art ? `<span class="empty-state__art" aria-hidden="true">${garmentIcon(art, { size: 'hero' })}</span>` : ''}
  <h2 class="t-body w-600 empty-state__title">${title}</h2>
  ${body ? `<p class="t-body c-600 empty-state__body">${body}</p>` : ''}
  ${ctaLabel || secondaryLabel ? `<div class="empty-state__actions">${ctaLabel ? cta(ctaLabel, { attrs: `data-act="${ctaAct}"` }) : ''}${secondaryLabel ? textLink(secondaryLabel, { act: secondaryAct }) : ''}</div>` : ''}
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
  let stitched = false;
  const html = rows.map(({ label, cents = null, caption = '', status = '', kind = 'default' }, i) => {
    noPercent(label, 'moneyRows'); noPercent(caption, 'moneyRows');
    const amt = cents == null ? '' : kind === 'negative' ? fmtNeg(cents) : fmtExact(cents);
    /* M7 (A5.10, D-197): the stitched dash sits directly above the first total row — exactly one per breakdown, and only when a row precedes the total (M7-1-C-04) */
    const stitch = kind === 'total' && !stitched && i > 0 ? stitchDivider() : '';
    if (kind === 'total') stitched = true;
    return `${stitch}<div class="money-row money-row--${kind}">
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
export function customerBreakdown(q, { stage = 'estimate', tailorFirst = '', depositState = '', confirmed = false, refundState = '', servicesCaption = '' } = {}) {
  const est = (stage === 'estimate' || stage === 'booked') && !confirmed;   // D-49: still an estimate until the fitting (or a price change) confirms it
  const deposit = depositState ? (DEPOSIT_STATUS[depositState] ?? 'Paid') : stage === 'estimate' ? 'Due today' : 'Paid';
  const balance = stage === 'ready' && q.balance === 0 ? 'Nothing to pay' : stage === 'paid' ? 'Paid' : stage === 'ready' ? 'Due now' : 'Due when ready';   // D-156
  const rows = [
    { label: 'Services', cents: q.services, caption: servicesCaption || (tailorFirst ? `${tailorFirst}’s prices` : '') },
    q.homeFee > 0 && { label: 'Home-visit fee', cents: q.homeFee },
    q.rush > 0 && { label: 'Rush fee', cents: q.rush, caption: `Need-by ${q.rushDays ?? 1} day${(q.rushDays ?? 1) === 1 ? '' : 's'} after the visit` },
    q.courier > 0 && { label: 'Taily courier', cents: q.courier },
    { label: est ? 'Estimated total' : 'Total', cents: q.total, kind: 'total' },
    { label: 'Deposit', cents: q.deposit, status: deposit },
    { label: 'Balance', cents: q.balance, status: balance },
    (stage === 'ready' || stage === 'paid') && q.refund > 0 && { label: 'Refund to your card', cents: q.refund, status: refundState === 'refunded' || (!refundState && stage === 'paid') ? 'Refunded' : 'After you choose' },   // D-156
  ].filter(Boolean);
  return moneyRows(rows);
}
/** The balance card's label for a receipt ("Visa •••• 4242", "Apple Pay"). */
function balanceCardLabel(a, id = a.balanceCardId) {
  const c = state.customer.cards.find((x) => x.id === id);
  if (c) return `${c.brand} •••• ${c.last4}`;
  return id === 'apple-pay' ? 'Apple Pay' : 'your card';
}
/**
 * The completed order's receipt, ONE block for c-booking--completed and c-complete (M6-P-11): how it came back and when
 * (`RETURN_LABEL · Thu, Oct 15`), the paid breakdown, and what paid the balance (or where a refund went, D-156).
 */
export function receiptBlock(a, tailorFirst = '') {
  const how = a.returnOption ?? 'pickup';
  const done = [...a.history].reverse().find((h) => h.status === 'completed')?.at ?? a.requestedAt;
  const paid = a.payments.balance?.cents ?? 0;
  const refund = a.payments.refund?.cents ?? 0;
  const cardLine = paid > 0 ? `Balance paid with ${balanceCardLabel(a)}.`
    : refund > 0 ? `${fmtExact(refund)} refunded to ${balanceCardLabel(a, a.cardId)}.` : '';
  /* M7-1-C-05: what was paid for — the approved lines with their garments — between the return line and the totals */
  const order = a.lines?.length ? `<div class="receipt__order">${changeList({ garments: priceChangeView(a, a.lines).garments })}</div>` : '';
  return `<div class="receipt__how">${metaRow('', esc(`${DATA.RETURN_LABEL[how]} · ${fmtDay(done)}`), { icon: { pickup: 'bag', dropoff: 'home', courier: 'truck' }[how] })}</div>
  ${stitchDivider()}
  ${order}
  ${customerBreakdown(a.money, { stage: 'paid', tailorFirst, depositState: a.payments.deposit.state, confirmed: true, refundState: a.payments.refund?.state ?? '' })}
  ${cardLine ? `<p class="t-small c-600 receipt__card"${paid > 0 ? '' : ' data-money'}>${esc(cardLine)}</p>` : ''}`;
}
/** The tailor's breakdown — no courier row (D-04). One order everywhere (D-165, amends D-137): Services, the Taily fee (a negative
    row, "On the $125.00 of services only" — its base), Home-visit fee, Rush fee, then the total. */
export function tailorBreakdown(q, { total = true } = {}) {
  /* D-172: the per-job figure is "You take home"; "payout" is the bank transfer. `total: false` = the figure is already the card's hero (M6-P-33). */
  return moneyRows([
    { label: 'Services', cents: q.services },
    { label: 'Taily fee', cents: q.tailyFee, kind: 'negative', caption: `On the ${fmtExact(q.services)} of services only` },
    q.homeFee > 0 && { label: 'Home-visit fee', cents: q.homeFee },
    q.rush > 0 && { label: 'Rush fee', cents: q.rush },
    total && { label: 'You take home', cents: q.payout, kind: 'total' },
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
/* ---------- radio groups: roving tabindex + arrow keys (M6-A-11) ---------- */
const radiosOf = (group) => [...group.querySelectorAll('[role="radio"]')].filter((r) => r.closest('[role="radiogroup"]') === group);
/** One tab stop per group: the checked radio, else the first enabled one. */
function syncRoving(group) {
  const all = radiosOf(group);
  const live = all.filter((r) => !r.disabled);
  const stop = live.find((r) => r.getAttribute('aria-checked') === 'true') ?? live[0];
  all.forEach((r) => { r.tabIndex = r === stop ? 0 : -1; });
}
const ARROW = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
const rovingRoots = new WeakSet();
/**
 * Radio groups of buttons (chips, segmented options, `optionRow`s inside role="radiogroup"): one tab stop, and the arrow keys
 * move focus AND selection to the neighbour, firing the same click the pointer does (so `chip` / the sheet's own handler runs).
 * Idempotent per root; the router calls it for every screen and `wireSheetA11y` for every sheet.
 */
export function wireRadioRows(root) {
  root.querySelectorAll('[role="radiogroup"]').forEach(syncRoving);
  if (rovingRoots.has(root)) return;
  rovingRoots.add(root);
  root.addEventListener('keydown', (e) => {
    const step = ARROW[e.key];
    const cur = e.target.closest?.('[role="radio"]');
    if (!step || !cur || e.defaultPrevented) return;
    const group = cur.closest('[role="radiogroup"]');
    if (!group) return;
    const live = radiosOf(group).filter((r) => !r.disabled);
    const i = live.indexOf(cur);
    if (i < 0 || live.length < 2) return;
    e.preventDefault();
    const next = live[(i + step + live.length) % live.length];
    next.focus({ preventScroll: true });
    next.click();
    /* a handler may re-render the screen: put focus back on the same radio in the new DOM */
    if (!next.isConnected) {
      const { name, value } = next.dataset;
      const again = [...document.querySelectorAll('[role="radio"]')].find((r) => r.dataset.name === name && r.dataset.value === value);
      again?.focus({ preventScroll: true });
    }
    const g = next.isConnected ? group : document.activeElement?.closest?.('[role="radiogroup"]');
    if (g) syncRoving(g);
  });
}
/** Chip groups: single = radio behaviour, multi = toggle. Announces `chip` { name, value, values }. */
export function wireChipGroups(root) {
  wireRadioRows(root);
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act="chip"]');
    if (!b || b.disabled) return;
    const group = b.closest('[data-chip-group]');
    const multi = group.dataset.multi === 'true';
    const on = (el, v) => { el.classList.toggle(el.classList.contains('segmented__opt') ? 'is-selected' : 'chip--selected', v); el.setAttribute(multi ? 'aria-pressed' : 'aria-checked', String(v)); };
    const all = [...group.querySelectorAll('[data-act="chip"]')];
    if (multi) on(b, b.getAttribute('aria-pressed') !== 'true'); else { all.forEach((el) => on(el, el === b)); const g = b.closest('[role="radiogroup"]'); if (g) syncRoving(g); }
    const values = all.filter((el) => (multi ? el.getAttribute('aria-pressed') : el.getAttribute('aria-checked')) === 'true').map((el) => el.dataset.value);
    group.dispatchEvent(new CustomEvent('chip', { bubbles: true, detail: { name: group.dataset.chipGroup, value: b.dataset.value, values } }));
  });
}
/** Composer: Send is enabled while there is text OR an attached photo (`form.dataset.photos`, M5); Enter submits via the form.
    `onSend(text)` — `text` may be '' for a photo-only message. */
export function wireComposer(root, onSend) {
  root.querySelectorAll('[data-composer]').forEach((form) => {
    const input = form.querySelector('.composer__input'); const send = form.querySelector('.composer__send');
    const photos = () => Number(form.dataset.photos) || 0;
    const sendable = () => !!input.value.trim() || photos() > 0;
    input.addEventListener('input', () => { send.disabled = !sendable(); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (input.disabled || !sendable()) return;
      const text = input.value.trim();
      onSend?.(text);
      input.value = ''; send.disabled = !sendable();
    });
  });
}

/* ============================================================
   M2 — tailor onboarding + Shop (docs/v5/M2-spec.md §A6)
   ============================================================ */

/** The six onboarding steps, in order (step ↔ screen). After `payouts` → to-done. */
export const ONBOARDING_STEPS = [
  { id: 'profile', label: 'Profile', screen: 'to-profile' },
  { id: 'services', label: 'Services and prices', screen: 'to-services' },
  { id: 'where', label: 'Where you work', screen: 'to-where' },
  { id: 'returns', label: 'Return options', screen: 'to-returns' },
  { id: 'availability', label: 'Availability', screen: 'to-availability' },
  { id: 'payouts', label: 'Payouts', screen: 'to-payouts' },
];

/** "Step 2 of 6 · Services and prices" over six segments. `current` = id or index; `done` = ids (non-contiguous allowed). */
export function onboardingSteps(current = 'profile', done = []) {
  return stepper({ steps: ONBOARDING_STEPS, current, done, variant: 'default' });
}

/**
 * Onboarding header — onboarding: status bar + a 56 px bar (Back ‹ left when `back`, a 44 px "Finish later" right);
 * editing: the tailor chrome with Shop active. The bar is absolute under the status bar, like the top nav it replaces.
 */
export function onboardingHeader({ editing = false, back = true, active = 'shop' } = {}) {
  if (editing) return chrome(active, { persona: 'tailor' });
  return `${statusBar()}
<div class="ob-bar">
  ${back ? backButton() : '<span class="ob-bar__spacer" aria-hidden="true"></span>'}
  <button type="button" class="ob-bar__later t-body w-600" data-act="finish-later">Finish later</button>
</div>`;
}

/**
 * Text area — the field chassis (label, inset box, helper / error) plus a live "n / max" counter. No `maxlength`
 * (a paste must be able to show the over-max error). The counter is `data-count` (screens update it in place on
 * `input`); over max it turns --error. states: empty · typing · over max · error.
 */
export function textArea({ id, label, value = '', rows = 4, max, helper = '', error = '' } = {}) {
  const msg = error || helper;
  const msgId = `${id}-msg`;
  const countId = `${id}-count`;
  const n = [...String(value ?? '')].length;
  const over = max != null && n > max;
  const describedBy = [msg ? msgId : '', max != null ? countId : ''].filter(Boolean).join(' ');
  return `<div class="field text-area${error ? ' field--error' : ''}">
  <label class="field__label" for="${id}">${esc(label)}</label>
  <div class="field__box text-area__box">
    <textarea class="text-area__input" id="${id}" name="${id}" rows="${rows}"${error ? ' aria-invalid="true"' : ''}${describedBy ? ` aria-describedby="${describedBy}"` : ''}>${esc(value)}</textarea>
  </div>
  <div class="text-area__foot">
    ${msg ? `<p class="field__msg${error ? ' field__msg--error' : ''}" id="${msgId}"${error ? ' role="alert"' : ''}>${esc(msg)}</p>` : '<span></span>'}
    ${max != null ? `<span class="text-area__count t-small c-600${over ? ' text-area__count--over' : ''}" id="${countId}" data-count data-max="${max}" aria-live="off">${n} / ${max}</span>` : ''}
  </div>
</div>`;
}

/**
 * Service row — a checkbox row; when checked, a whole-dollar `$` price input (`#price-<id>`) and a live take-home
 * line on its own full-width line under the row, aligned with the service name (`data-take`; hidden while null; M6-V-01). `payoutText` = the amount already formatted for its column (money.js `fmtColumn`, D-70); default `fmt(payoutCents)`.
 * states: unchecked · checked, empty · checked with price + payout · error.
 */
/** "You take home $22.50 · Taily fee $2.50" — two nowrap halves, so a narrow column breaks at the dot, never inside an amount (D-172). */
export const takeHtml = (take, fee = '') => `<span class="service-row__part">You take home ${take}${fee ? '\u00a0·' : ''}</span>${fee ? ` <span class="service-row__part">Taily fee ${fee}</span>` : ''}`;
export function serviceRow({ id, label, caption = '', checked = false, price = '', payoutCents = null, payoutText = '', feeText = '', error = '' } = {}) {
  const takeHidden = payoutCents == null;
  /* caption as a list (garment types) → one nowrap span per item with its " ·" kept inside (no-break space), and a plain
     space between spans: a line only breaks between whole names and never starts with a "·" */
  const captionHtml = Array.isArray(caption)
    ? caption.map((c, i) => `<span class="service-row__part">${esc(c)}${i < caption.length - 1 ? '\u00a0·' : ''}</span>`).join(' ') : '';
  return `<div class="service-row-wrap${error ? ' service-row-wrap--error' : ''}" data-service="${esc(id)}">
  <div class="service-row${checked ? ' service-row--on' : ''}">
    <div class="service-row__check">${checkRow({ id: `svc-${id}`, label, caption: Array.isArray(caption) ? '' : caption, captionHtml, checked, attrs: `data-act="svc" data-id="${esc(id)}"` })}</div>
    ${checked ? `<div class="service-row__price">
      <div class="field__box service-row__box${error ? ' service-row__box--error' : ''}">
        <span class="field__affix" aria-hidden="true">$</span>
        <input class="field__input" id="price-${esc(id)}" name="price-${esc(id)}" type="text" inputmode="numeric" autocomplete="off" value="${esc(price)}" aria-label="Price for ${esc(label)}"${error ? ` aria-invalid="true" aria-describedby="price-${esc(id)}-msg"` : ''}>
      </div>
    </div>` : ''}
  </div>
  ${checked ? `<span class="service-row__take t-small w-600 c-700" data-money data-take${takeHidden ? ' hidden' : ''}>${takeHidden ? '' : `${takeHtml(payoutText || fmt(payoutCents), feeText)}`}</span>` : ''}
  ${error ? `<p class="field__msg field__msg--error" id="price-${esc(id)}-msg" role="alert">${esc(error)}</p>` : ''}
</div>`;
}

/**
 * ZIP list — removable 44 px chips (ZIP + neighborhood), an add field (`#zip-add`) with an Add button, "+ zip"
 * suggestion chips (only those not already listed) and a list-level error. states: empty · 4 zips · input error · list error.
 */
export function zipList({ zips = [], input = '', error = '', inputError = '', suggestions = [] } = {}) {
  const chips = zips.map((z) => {
    const hood = ZIP_INFO[z]?.hood ?? '';
    return `<button type="button" class="zip-chip" data-act="zip-remove" data-zip="${esc(z)}" aria-label="Remove ${esc(z)}${hood ? ` ${esc(hood)}` : ''}"><span class="zip-chip__zip">${esc(z)}</span>${hood ? `<span class="zip-chip__hood">${esc(hood)}</span>` : ''}<span class="zip-chip__x" aria-hidden="true">✕</span></button>`;
  }).join('');
  const sugg = suggestions.filter((z) => !zips.includes(z))
    .map((z) => `<button type="button" class="zip-chip zip-chip--suggest" data-act="zip-suggest" data-zip="${esc(z)}" aria-label="Add ${esc(z)}${ZIP_INFO[z] ? ` ${esc(ZIP_INFO[z].hood)}` : ''}">+ ${esc(z)}</button>`).join('');
  return `<div class="zip-list${error ? ' zip-list--error' : ''}" data-zip-list>
  <p class="zip-list__label t-small w-600 c-700" id="zip-list-label">ZIP codes you cover</p>
  <div class="zip-list__chips" role="group" aria-labelledby="zip-list-label">${chips || '<span class="zip-list__none t-small c-600">No ZIP codes yet.</span>'}</div>
  <div class="zip-list__add">
    ${field({ id: 'zip-add', label: 'Add a ZIP code', value: input, inputmode: 'numeric', maxlength: 5, autocomplete: 'off', error: inputError })}
    <div class="zip-list__add-btn">${ctaSmall('Add', { attrs: 'data-act="zip-add"' })}</div>
  </div>
  ${sugg ? `<div class="zip-list__suggest" role="group" aria-label="Suggested ZIP codes">${sugg}</div>` : ''}
  ${error ? `<p class="field__msg field__msg--error" role="alert">${esc(error)}</p>` : ''}
</div>`;
}

/**
 * Day hours — one weekday row: label + on/off switch (`#day-<sched>-<day>`); when open, two 44 px time buttons
 * (data-act="time", data-edge="open|close"), else "Closed". `open` / `close` are labels ("10:00 AM"). states: closed · open · error.
 */
export function dayHours({ sched, day, label, open = null, close = null, error = '' } = {}) {
  const on = open != null;
  const id = `day-${sched}-${day}`;
  const btn = (edge, text, what) => `<button type="button" class="day-hours__time t-body" data-act="time" data-sched="${esc(sched)}" data-day="${esc(day)}" data-edge="${edge}" aria-label="${esc(label)} ${what}: ${esc(text)}">${esc(text)}</button>`;
  return `<div class="day-hours${on ? ' day-hours--open' : ''}${error ? ' day-hours--error' : ''}" data-day-row="${esc(day)}">
  ${toggle({ id, label, checked: on, helper: on ? '' : 'Closed' })}
  ${on ? `<div class="day-hours__times">${btn('open', open, 'opens')}<span class="day-hours__dash c-500" aria-hidden="true">–</span>${btn('close', close ?? '', 'closes')}</div>` : ''}
  ${error ? `<p class="field__msg field__msg--error day-hours__error" role="alert">${esc(error)}</p>` : ''}
</div>`;
}

/**
 * Customer preview — "What customers see": a caps label over an INERT container (so a tailorRow button inside is
 * neither focusable nor clickable) on --neutral-100, then an optional caption. `html` is trusted markup built from customer components.
 */
export function customerPreview({ title = 'What customers see', html = '', caption = '' } = {}) {
  return `<section class="customer-preview" aria-label="${esc(title)}">
  <p class="customer-preview__title t-caps c-600">${esc(title)}</p>
  <div class="customer-preview__body" inert>${html}</div>
  ${caption ? `<p class="customer-preview__caption t-small c-600">${esc(caption)}</p>` : ''}
</section>`;
}

/**
 * Mini profile — the tailor's own card (avatar, name, shop, optional 2-line bio) as a left-aligned row on white.
 * Used inside `customerPreview` when there is no tailorRow to show (to-profile, t-shop, to-done). `data-pv` hooks let
 * a screen update the name / shop / bio in place while she types. `bio: null` omits the bio line.
 */
export function miniProfile({ name = '', initials = '', photo = null, shopName = '', bio = null } = {}) {
  const n = String(name ?? '').trim();
  const sh = String(shopName ?? '').trim();
  return `<div class="mini-profile${bio == null ? '' : ' mini-profile--bio'}">
  ${avatar({ initials, photo, size: 'md' })}
  <div class="mini-profile__text">
    <p class="t-body w-600${n ? '' : ' c-500'}" data-pv="name">${esc(n || 'Your name')}</p>
    <p class="t-small c-600" data-pv="shop"${sh ? '' : ' hidden'}>${esc(sh)}</p>
    ${bio == null ? '' : `<p class="t-small c-700 mini-profile__bio" data-pv="bio"${String(bio).trim() ? '' : ' hidden'}>${esc(String(bio).trim())}</p>`}
  </div>
</div>`;
}

/** The customer's "Getting it back" rows (c-tailor), one metaRow per return option she offers. `returns` = { pickup,
    dropoff, courier }. `empty` (string) renders when nothing is ticked; '' renders nothing. */
export function returnsRows(returns = {}, { empty = '' } = {}) {
  const rows = [];
  if (returns?.pickup) rows.push(metaRow('', 'In-store pickup — free', { icon: 'bag' }));
  if (returns?.dropoff) rows.push(metaRow('', 'Home drop-off — free', { icon: 'home' }));
  if (returns?.courier) rows.push(metaRow('', 'Taily courier — priced when your order is ready, before you pay', { icon: 'truck' }));
  if (!rows.length) return empty ? `<p class="returns-rows returns-rows--empty t-body c-600">${esc(empty)}</p>` : '';
  return `<div class="returns-rows">${rows.join('')}</div>`;
}

/**
 * Rush ladder — the one-line rush-fee ladder ("ready within 1 day of the visit +$40 · 2 days +$25 · … · 4+ days no
 * rush fee"). One nowrap span per tier, so the line breaks between tiers, never inside one. `rush` = [{ days, fee }]
 * (fee in whole dollars). Empty → "No rush fees."
 */
export function rushLadder(rush = []) {
  const ladder = [...(rush ?? [])].sort((a, b) => a.days - b.days);
  if (!ladder.length) return '<span class="rush-ladder" data-money>No rush fees.</span>';
  /* M7 (A5.15): a flat two-column list — the window left, the fee right — never a "·" chain */
  const tier = (left, right) => `<span class="rush-tier"><span class="rush-tier__when">${left}</span><span class="rush-tier__fee">${right}</span></span>`;
  const rows = ladder.map((r, i) => tier(i === 0 ? `Ready within ${r.days} day${r.days === 1 ? '' : 's'}` : `Within ${r.days} day${r.days === 1 ? '' : 's'}`, `+${fmt(cents(r.fee))}`));
  rows.push(tier(`${ladder[ladder.length - 1].days + 1}+ days`, 'No rush fee'));
  return `<span class="rush-ladder" data-money>${rows.join('')}</span>`;
}

/**
 * Leave modal — the "unsaved changes" alertdialog content for modalOverlay(leaveModal(…), { dataS }, wireFn).
 * Keep editing (primary) · Discard changes (secondary).
 */
export function leaveModal({ title = 'Leave without saving?', body = 'Your changes will be lost.' } = {}) {
  return `<div class="modal modal--leave" role="alertdialog" aria-modal="true" aria-labelledby="leave-title" aria-describedby="leave-body">
  <h2 class="modal__title t-h2" id="leave-title">${esc(title)}</h2>
  <p class="leave-modal__body" id="leave-body">${esc(body)}</p>
  <div class="modal__actions">
    ${cta('Keep editing', { attrs: 'data-act="keep-editing"' })}
    ${cta('Discard changes', { variant: 'secondary', attrs: 'data-act="discard"' })}
  </div>
</div>`;
}

/* ============================================================
   M3 — request loop components (D-75, D-80, D-87)
   ============================================================ */
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Request Card — the tailor's inbox ticket (t-home "New requests"). One <button>: avatar + name + "<visit> · <place>" with
 * a countdown (requested) or a "Waiting on <name>" pill (suggested), then the visit time + "n items · n services", then
 * the focal take-home: YOU TAKE HOME / `fmtExact(payoutCents)` / "after the $Y Taily fee". Amounts are cents.
 * States: requested · soon (countdown <= EXPIRING_SOON_MIN → warning ring) · suggested (muted money) · retried ("Sent again").
 */
export function requestCard({ id = '', act = 'open-request', name = '', initials = '', visitLabel = '', place = '', when = '', items = 0, services = 0, payoutCents = 0, feeCents = 0, expiresAt = null, now = null, status = 'requested', waitingOn = '', retries = 0, asked = '', lapseAt = null, garment = '' } = {}) {
  const suggested = status === 'suggested';
  const ms = suggested || expiresAt == null ? null : toMs(expiresAt) - toMs(now);
  const soon = ms != null && ms > 0 && ms <= POLICY.EXPIRING_SOON_MIN * 60000;
  const waiting = `Waiting on ${waitingOn || 'customer'}`;
  const pill = suggested ? statusPill('waiting', esc(waiting)) : '';
  /* D-154: a suggested time lapses (`lapseAt`) — the same clock a request has, so she sees how long Sarah has */
  const right = suggested ? (lapseAt ? countdown({ expiresAt: lapseAt, now }) : '') : countdown({ expiresAt, now });
  const label = `${name}, ${suggested ? `you suggested ${when}` : when}, you take home ${fmtExact(payoutCents)}, ${suggested ? `${waiting}${right ? `, ${right.replace(/<[^>]+>/g, '')}` : ''}` : right.replace(/<[^>]+>/g, '')}`;
  return `<button type="button" class="request-card card${soon ? ' request-card--soon' : ''}${suggested ? ' request-card--suggested' : ''}" data-act="${esc(act)}" data-id="${esc(id)}" aria-label="${esc(label)}">
  <span class="request-card__top">
    ${avatar({ initials, size: 'sm' })}
    <span class="request-card__who">
      <span class="request-card__name t-body w-600">${esc(name)}${retries > 0 ? '<span class="request-card__again t-small c-600">Sent again</span>' : ''}</span>
      <span class="request-card__where t-small c-600"><span class="request-card__visit">${esc(visitLabel)}</span><span class="request-card__place">${esc(String(place).replace(/\s·\s/g, '\u2009'))}</span></span>
    </span>
    ${right ? `<span class="request-card__status">${right}</span>` : ''}
  </span>
  <span class="request-card__work t-small c-700">${pill ? `<span class="request-card__pill">${pill}</span>` : ''}<span class="request-card__when w-600">${suggested ? 'You suggested ' : ''}${esc(when)}</span>${asked ? `<span class="c-600">${esc(asked)}</span>` : ''}<span class="request-card__count">${garment ? garmentIcon(garment, { size: 'row' }) : ''}<span>${plural(items, 'item')} · ${plural(services, 'service')}</span></span></span>
  <span class="request-card__pay" data-money>
    <span class="t-caps c-600">You take home</span>
    <span class="request-card__take"><span class="request-card__amount t-h2">${fmtExact(payoutCents)}</span><span class="request-card__fee t-small c-600">after the ${fmtExact(feeCents)} Taily fee</span></span>
  </span>
</button>`;
}

/** "The work" list (R3-1-T-05): garments with their services and the estimate. One render for t-request and t-job.
    `v` = requestView(appt). Every amount prints with cents (D-98): the screen's payout breakdown below is exact, and one figure
    keeps one precision per screen. A garment with photos shows a tappable 44 px thumbnail + count after its name
    (`data-act="view-photo"`, wired by `wirePhotoViewer`, R3-2-T-11). */
export function workList(v, { final = false, estimateLabel = 'Estimate from your prices', docs = false, commentLabel = 'Your comment' } = {}) {
  /* M6-P-07: a `final` list (the work is over: declined, cancelled, completed, expired) has no estimate row; `estimateLabel: null`
     drops it too, for a screen whose payout breakdown follows (Services and the total are printed there).
     K-02: every garment head carries its illustration (garmentIcon); `docs: true` adds the Before | Pinned photos and the comment
     from `g.docs` after the garment's service rows. */
  const showEstimate = !final && estimateLabel !== null;
  const groups = v.garments.map((g) => `<div class="work-list__garment">
    <div class="work-list__top"><span class="work-list__title">${garmentIcon(g.type)}<p class="t-body w-600 work-list__head">${esc(g.type)}</p></span>
    ${g.photos ? `<button type="button" class="work-list__photo" data-act="view-photo" data-type="${esc(g.type)}" data-count="${g.photos}" aria-label="View ${g.photos === 1 ? '1 photo' : `${g.photos} photos`} of the ${esc(g.type)}">${photoTile('photo', { type: g.type })}<span class="t-small c-700">${g.photos} ${g.photos === 1 ? 'photo' : 'photos'}</span></button>` : ''}</div>
    ${g.services.map((sv) => priceRow({ label: sv.label, cents: sv.cents, format: fmtExact })).join('')}
    ${docs && g.docs ? garmentDocs({ garmentId: g.id, type: g.type, docs: g.docs, commentLabel, idPrefix: 'work' }) : ''}
  </div>`).join('');
  return `<div class="work-list">${groups}${showEstimate ? `<div class="work-list__estimate">${priceRow({ label: estimateLabel, cents: v.estimate, format: fmtExact })}</div>` : ''}</div>`;
}

/** Photo viewer (R3-2-T-11): a sheet showing one prototype placeholder per photo — the prototype has no real image files. */
export function openPhotoViewer({ title = 'Photos', count = 1, type = '' } = {}) {
  const items = Array.from({ length: Math.max(1, count) }, (_, i) =>
    `<figure class="photo-viewer__item"><div class="photo-viewer__img" role="img" aria-label="Photo ${i + 1} of ${count}: ${esc(title)} (placeholder)">${photoStub({ type, tone: i, size: 'stage' })}</div><figcaption class="t-small c-600">${i + 1} of ${count}</figcaption></figure>`).join('');
  return sheetOverlay(`<div class="photo-viewer">${items}</div>`, { header: esc(title), dataS: 'photo-viewer', confirm: false });
}
/** Wire `[data-act="view-photo"]` buttons (workList) to the viewer. Call from a screen's `wire`. */
export function wirePhotoViewer(root) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act="view-photo"]');
    if (!el || e.target.closest('.screen-sheet--overlay')) return;
    /* chat bubbles carry a ready-made data-title; garment thumbnails build "<type> · photos" */
    openPhotoViewer({ title: el.dataset.title || `${el.dataset.type} · ${el.dataset.count === '1' ? 'photo' : 'photos'}`, count: Number(el.dataset.count), type: el.dataset.garment || el.dataset.type });
  });
}

/** A tailor's note (R3-1-C-09): the one quote card both c-request--declined and c-booking--cant-make-it use. */
export function noteQuote({ label, text }) {
  return `<figure class="note-quote">
    <figcaption class="t-small c-600">${esc(label)}</figcaption>
    <blockquote class="t-body">“${esc(text)}”</blockquote>
  </figure>`;
}

/**
 * Appt Row — one 72 px line of an appointment list (c-bookings, t-home "Upcoming"): avatar, name / when / place,
 * a status pill above an optional amount (+ caption), chevron. `muted` dims a past row.
 * States: default · with amount (`amountText` "$16.00", `amountCaption` "held") · muted.
 * `captionTone: 'action'` = the caption asks the viewer to act ("Reply needed"): accent ink, 600 (R3-2-C-05).
 * `garment` (M7-2-A-03, D-202) = heroGarment(job): a 24 px illustration before the time (customer lists).
 */
export function apptRow({ id = '', act = 'open-appt', name = '', initials = '', when = '', place = '', status = 'confirmed', pillLabel, amountText = '', amountCaption = '', captionTone = 'default', muted = false, kept = false, garment = '' } = {}) {
  noPercent(amountText, 'apptRow'); noPercent(amountCaption, 'apptRow');
  const chev = CHEVRON_RIGHT.replace('method-row__chevron', 'appt-row__chevron');
  return `<button type="button" class="appt-row${muted ? ' appt-row--muted' : ''}${kept ? ' appt-row--kept' : ''}${amountText || amountCaption ? '' : ' appt-row--bare'}" data-act="${esc(act)}" data-id="${esc(id)}">
  <span class="appt-row__avatar">${avatar({ initials, size: 'sm' })}</span>
  <span class="appt-row__name t-body w-600">${esc(name)}</span>
  <span class="appt-row__pill">${statusPill(status, pillLabel == null ? undefined : esc(pillLabel))}</span>
  <span class="appt-row__when t-small c-700">${garment ? `<span class="appt-row__garment">${garmentIcon(garment, { size: 'inline' })}</span>` : ''}<span class="appt-row__when-text">${esc(when)}</span></span>
  <span class="appt-row__amount t-body w-600"${amountText ? ' data-money' : ''}>${esc(amountText)}</span>
  <span class="appt-row__place t-small c-600">${esc(place)}</span>
  <span class="appt-row__caption t-small ${captionTone === 'action' ? 'appt-row__caption--action' : captionTone === 'error' ? 'appt-row__caption--error' : 'c-600'}">${esc(amountCaption)}</span>
  ${chev}
</button>`;
}

/* ============================================================
   M4 — the ticket after the fitting (D-99 … D-108)
   ============================================================ */

/**
 * Change List — "the correction mark" (M4 signature, K-01 / D-122). The booked rows with what moved: `garments` is
 * `priceChangeView(appt).garments` (`[{ id, type, kind?, rows: [{ key, label, kind, from, to }] }]`). Row kinds:
 *   same      → label · amount
 *   added     → "New" tag · amount (M7-2-C-06: one accent tag style for New / New price / New item, no green)
 *   repriced  → "New price" tag · the old amount struck in neutral-500 (sr-only "was") then the new amount
 *   removed   → label and amount struck + "Removed" tag
 * Garment `kind` (K-01): 'added' → one light accent panel, type + "New item" tag, plain rows (the item tag says it once);
 * 'removed' → type struck + "Removed" tag, rows struck with no per-row tag; anything else (or no kind) renders as before.
 * `newItem: true` on a plain garment (an approved order, D-127) = the "New item" tag on the type line only, no panel.
 * Every change carries a text tag, never colour alone. One precision per list: `format` defaults to fmtExact.
 * K-02: every garment head leads with its illustration (`garmentIcon`; a removed garment's is dimmed). `docs` = { [garmentId]: entry }
 * (the sent snapshot): a garment that is not removed and has an entry gets its Before | Pinned photos and comment after the rows.
 */
export function changeList({ garments = [], format = fmtExact, docs = null, commentLabel = 'Comment' } = {}) {
  const tag = (text, tone) => `<span class="change-list__tag change-list__tag--${tone} t-micro">${text}</span>`;
  const rowHtml = (r, g) => {
    noPercent(r.label, 'changeList');
    const label = esc(r.label);
    const wholeNew = g.kind === 'added';
    const wholeGone = g.kind === 'removed';
    let kind = r.kind;
    if (wholeNew) kind = 'same-new';
    let text = `<span class="change-list__label t-body">${label}</span>`;
    let amt = `<span class="change-list__amt t-body">${format(r.to ?? 0)}</span>`;
    if (wholeNew) {
      text = `<span class="change-list__label t-body w-600">${label}</span>`;
      amt = `<span class="change-list__amt t-body w-600">${format(r.to)}</span>`;
    } else if (wholeGone) {
      kind = 'removed';
      text = `<span class="change-list__label change-list__label--struck t-body"><s>${label}</s></span>`;
      amt = `<s class="change-list__amt change-list__amt--struck t-body"><span class="sr-only">removed, was </span>${format(r.from)}</s>`;
    } else if (r.kind === 'added') {
      text = `<span class="change-list__label t-body w-600">${label}</span>${tag('New', 'added')}`;
      amt = `<span class="change-list__amt t-body w-600">${format(r.to)}</span>`;
    } else if (r.kind === 'repriced') {
      text = `<span class="change-list__label t-body">${label}</span>${tag('New price', 'repriced')}`;
      amt = `<span class="change-list__amts"><s class="change-list__was t-small"><span class="sr-only">was </span>${format(r.from)}</s><span class="change-list__amt t-body w-600">${format(r.to)}</span></span>`;
    } else if (r.kind === 'removed') {
      text = `<span class="change-list__label change-list__label--struck t-body"><s>${label}</s></span>${tag('Removed', 'removed')}`;
      amt = `<s class="change-list__amt change-list__amt--struck t-body"><span class="sr-only">removed, was </span>${format(r.from)}</s>`;
    }
    return `<div class="change-list__row change-list__row--${kind}" role="listitem" data-kind="${wholeNew ? 'added' : kind}"><span class="change-list__text">${text}</span>${amt}</div>`;
  };
  const groups = garments.map((g) => {
    const title = g.kind === 'added'
      ? `<p class="t-body w-600 change-list__type change-list__type--new">${esc(g.type)}${tag('New item', 'new-item')}</p>`
      : g.kind === 'removed'
        ? `<p class="t-body w-600 change-list__type change-list__type--gone"><s>${esc(g.type)}</s>${tag('Removed', 'removed')}</p>`
        : g.newItem
          ? `<p class="t-body w-600 change-list__type change-list__type--new">${esc(g.type)}${tag('New item', 'new-item')}</p>`
          : `<p class="t-body w-600 change-list__type">${esc(g.type)}</p>`;
    const head = `<div class="change-list__head${g.kind === 'removed' ? ' change-list__head--gone' : ''}">${garmentIcon(g.type)}${title}</div>`;
    const docsHtml = docs && g.kind !== 'removed' && docs[g.id]
      ? garmentDocs({ garmentId: g.id, type: g.type, docs: docs[g.id], commentLabel }) : '';
    return `<div class="change-list__garment${g.kind === 'added' ? ' change-list__garment--new' : ''}${g.kind === 'removed' ? ' change-list__garment--gone' : ''}"${g.kind ? ` data-garment-kind="${g.kind}"` : ''}>
    ${head}
    <div class="change-list__rows" role="list" aria-label="${esc(g.type)}" data-money>${g.rows.map((r) => rowHtml(r, g)).join('')}</div>
    ${docsHtml}
  </div>`;
  }).join('');
  return `<div class="change-list">${groups}</div>`;
}

/**
 * Change Summary (K-01 / D-122) — one t-small line saying the scope of the final order before the rows: the non-zero parts of
 * `priceChangeView().counts` joined with " · ", or "No changes. Same items, same price as booked." Words only, no money.
 */
export function changeSummary(counts = {}) {
  const n = (k) => counts[k] ?? 0;
  const part = (count, one, many) => (count ? [`${count} ${count === 1 ? one : many}`] : []);
  const parts = [
    ...part(n('itemsAdded'), 'item added', 'items added'),
    ...part(n('itemsRemoved'), 'item removed', 'items removed'),
    ...part(n('servicesAdded'), 'service added', 'services added'),
    ...part(n('servicesRemoved'), 'service removed', 'services removed'),
    ...part(n('repriced'), 'new price', 'new prices'),
  ];
  /* M7 (A5.15): three or more parts print one per line, never a "·" chain */
  const body = !parts.length ? 'No changes. Same items, same price as booked.' : parts.length >= 3 ? parts.map((x) => `<span class="change-summary__part">${x}</span>`).join('') : parts.join(' · ');
  return `<p class="t-small c-700 change-summary${parts.length >= 3 ? ' change-summary--lines' : ''}" data-summary>${body}</p>`;
}

/**
 * Delta Figure — one money figure with what it was: caps label, `.t-display` amount, then "Was $205.00 · up $45.00" /
 * "· down $55.00" / "· no change" in words. `was` null → no comparison line. `caption` is an optional t-small line.
 */
export function deltaFigure({ label = '', cents: amount = 0, was = null, caption = '' } = {}) {
  noPercent(label, 'deltaFigure'); noPercent(caption, 'deltaFigure');
  let delta = '';
  if (was != null) {
    const d = amount - was;
    /* R4-2-T-08: "Was" only when the figure moved; unchanged reads "Same as booked", without repeating the amount */
    delta = d === 0
      ? '<p class="t-small c-700 delta-figure__was">Same as booked</p>'
      : `<p class="t-small c-700 delta-figure__was">Was ${fmtExact(was)} · ${d > 0 ? `up ${fmtExact(d)}` : `down ${fmtExact(-d)}`}</p>`;
  }
  return `<div class="delta-figure" data-money>
  <p class="t-caps c-600 delta-figure__label">${esc(label)}</p>
  <p class="t-display delta-figure__amt">${fmtExact(amount)}</p>
  ${delta}${caption ? `<p class="t-small c-600 delta-figure__caption">${esc(caption)}</p>` : ''}
</div>`;
}

/**
 * Courier Card — the Taily courier as three honest numbers (D-100). state: ready | loading | failed.
 * ready = Uber quote + Taily courier fee = Courier total + `note` ("Added to your balance." / "Paid by Sarah. Not taken from
 * your payout."); loading = skeleton + aria-live status; failed = role=alert + a secondary Try again (`retryAct`).
 */
export function courierCard({ state = 'ready', quote = 0, markup = 0, cents: total = 0, miles = 0, from = '', to = '', note = '', retryAct = 'courier-retry', variant = 'customer', window: pickup = '' } = {}) {
  noPercent(note, 'courierCard');
  /* D-160 (amends D-106): the tailor's variant is the pickup window, from → to and who pays. No quote, fee or total rows: none of it is her money. */
  if (variant === 'tailor') {
    return `<div class="courier-card courier-card--tailor" data-state="ready">${metaRow('', esc(pickup ? `Courier arrives ${pickup}` : 'A Taily courier is coming'), { icon: 'truck' })}<p class="t-small c-600 courier-card__route">${esc(from)} → ${esc(to)}</p>${note ? `<p class="t-small c-600 courier-card__note">${esc(note)}</p>` : ''}</div>`;
  }
  const head = `${metaRow('', 'Taily courier', { icon: 'truck' })}<p class="t-small c-600 courier-card__route">${esc(miles)} mi · ${esc(from)} → ${esc(to)}</p>`;
  let body;
  if (state === 'loading') {
    body = `${skeleton({ kind: 'line', count: 3 })}<p class="t-small c-600 courier-card__status" role="status" aria-live="polite">Getting a price from Uber…</p>`;
  } else if (state === 'failed') {
    body = `<div class="courier-card__error" role="alert"><p class="t-body w-600 courier-card__error-title"><span class="courier-card__error-glyph" aria-hidden="true">${ICON_ALERT}</span>Couldn’t get a courier price</p><p class="t-small c-600">Uber didn’t answer. Try again, or pick another way back.</p></div>${cta('Try again', { variant: 'secondary', attrs: `data-act="${esc(retryAct)}"` })}`;
  } else {
    body = `${moneyRows([{ label: 'Uber quote', cents: quote }, { label: 'Taily courier fee', cents: markup }, { label: 'Courier total', cents: total, kind: 'total' }])}${note ? `<p class="t-small c-600 courier-card__note">${esc(note)}</p>` : ''}`;
  }
  return `<div class="courier-card courier-card--${state}"${state === 'loading' ? ' aria-busy="true"' : ''} data-state="${state}">${head}${body}</div>`;
}

/* ============================================================
   M5 — messaging, accounts, earnings, system (docs/v5/M5-spec.md §A8)
   ============================================================ */

/**
 * Thread messages — the ONE renderer both thread screens use (D-128): day dividers ("Today" / `fmtDay`), system lines in the
 * reader's wording (`text` for the customer, `tailorText ?? text` for the tailor) with their time, chat bubbles by reader
 * (`me` = the reader's own), then the `sending` bubble and each `failed` bubble ("Not sent · Retry", `data-id`).
 * `peer` (optional) = the other person's first name, for the photo button's label ("Photo from Amara"; own photos read "Your photo").
 * `sending` / `failed[i]` = { text, photos = 0, masked = false, id }.
 */
export function threadMessages(messages = [], { reader = 'customer', now = null, failed = [], sending = null, peer = '', photoType = '' } = {}) {
  const today = now ? isoDay(now) : '';
  const them = reader === 'tailor' ? 'customer' : 'tailor';
  const parts = [];
  let lastDay = '';
  for (const m of messages) {
    const day = isoDay(m.at);
    if (day !== lastDay) {
      lastDay = day;
      parts.push(`<p class="thread__day t-caps c-600">${day === today ? 'Today' : fmtDay(m.at)}</p>`);
    }
    if (m.from === 'system') {
      const text = reader === 'tailor' ? (m.tailorText ?? m.text) : m.text;
      parts.push(`<p class="thread__system t-small c-600">${esc(text)} <span class="thread__system-time">· ${fmtTime(m.at)}</span></p>`);
      continue;
    }
    const mine = m.from === reader;
    parts.push(chatBubble({
      text: m.text, side: mine ? 'me' : 'them', time: fmtTime(m.at), photos: m.photos ?? 0, masked: !!m.masked,
      photoLabel: mine ? 'Your photo' : (peer && m.from === them ? `Photo from ${peer}` : 'Photo'), photoType, peer,
    }));
  }
  if (sending) parts.push(chatBubble({ text: sending.text ?? '', side: 'me', photos: sending.photos ?? 0, masked: !!sending.masked, status: 'sending', photoLabel: 'Your photo', photoType, peer }));
  for (const f of failed) parts.push(chatBubble({ text: f.text ?? '', side: 'me', photos: f.photos ?? 0, masked: !!f.masked, status: 'failed', id: f.id ?? '', photoLabel: 'Your photo', photoType, peer }));
  return `<div class="thread" aria-live="polite">${parts.join('')}</div>`;
}

/** Thread header — the inner HTML for `headingRow` (root `.thread-head`): a 40 px avatar, the name, one `sub` line (HTML; may hold a `countdown`). */
export function threadHead({ initials = '', photo = null, name = '', sub = '' } = {}) {
  return `<div class="thread-head">
  ${avatar({ initials, photo, size: 'sm' })}
  <div class="thread-head__text"><h1 class="thread-head__name t-body w-600">${esc(name)}</h1>${sub ? `<p class="thread-head__sub t-small c-600">${sub}</p>` : ''}</div>
</div>`;
}

/**
 * Thread context row (the signature, D-128) — the job a thread is pinned to: status pill + visit time on one line, a sub line, and a
 * chevron. A `<button data-act data-id>` when `act` is set, else a static `<div>`. At least 56 px tall.
 */
export function threadContext({ pill = '', pillLabel = '', title = '', sub = '', act = '', id = '', garment = '' } = {}) {
  /* D-201 (K-03): the booking's first garment leads the card, a 32 px well; no booking, no garment */
  const lead = garment ? `<span class="thread-context__garment">${garmentIcon(garment, { size: 'row' })}</span>` : '';
  const inner = `${lead}<span class="thread-context__text">
    <span class="thread-context__line">${pill ? `<span class="thread-context__pill">${statusPill(pill, pillLabel ? esc(pillLabel) : undefined)}</span>` : ''}<span class="thread-context__title t-body w-600">${esc(title)}</span></span>
    ${sub ? `<span class="thread-context__sub t-small c-600">${esc(sub)}</span>` : ''}
  </span>${act ? CHEVRON_RIGHT.replace('method-row__chevron', 'thread-context__chevron') : ''}`;
  return act
    ? `<button type="button" class="thread-context card" data-act="${esc(act)}" data-id="${esc(id)}">${inner}</button>`
    : `<div class="thread-context thread-context--static card">${inner}</div>`;
}

/**
 * Thread row — one 72 px line of the Messages list (both personas): avatar (the linked booking's hero garment, `garment` = heroGarment(job), leads the preview in a 32 px well, D-201 / M7-2-C-05), name (+ status pill) · time, one-line preview, and an unread
 * badge. Unread bolds the name and the preview and prints a count badge with an sr-only "n unread"; `closed` shows a calm "Closed" pill.
 */
export function threadRow({ id = '', act = 'open-thread', name = '', initials = '', photo = null, preview = '', time = '', unread = 0, pill = '', pillLabel = '', closed = false, garment = '' } = {}) {
  const pillHtml = closed ? statusPill('calm', 'Closed') : pill ? statusPill(pill, pillLabel ? esc(pillLabel) : undefined) : '';
  return `<button type="button" class="thread-row${unread > 0 ? ' thread-row--unread' : ''}${closed ? ' thread-row--closed' : ''}" data-act="${esc(act)}" data-id="${esc(id)}">
  <span class="thread-row__avatar">${avatar({ initials, photo, size: 'sm' })}</span>
  <span class="thread-row__head"><span class="thread-row__name t-body ${unread > 0 ? 'w-700' : 'w-600'}">${esc(name)}</span>${pillHtml ? `<span class="thread-row__pill">${pillHtml}</span>` : ''}<span class="thread-row__time t-small c-600">${esc(time)}</span></span>
  <span class="thread-row__foot">${garment ? `<span class="thread-row__garment">${garmentIcon(garment, { size: 'row' })}</span>` : ''}<span class="thread-row__preview t-small ${unread > 0 ? 'c-700 w-600' : 'c-600'}">${esc(preview)}</span>${unread > 0 ? `<span class="thread-row__badge t-micro w-700" aria-hidden="true">${unread}</span><span class="sr-only">${unread} unread</span>` : ''}</span>
</button>`;
}

/**
 * Attach sheet — "Add a photo" with Take a photo / Choose from library (`[data-act="photo-camera"]` / `photo-library`, 56 px rows).
 * Either calls `onAdd()` then closes. `count` = photos already on the message; `max` defaults to CHAT_LIMITS.PHOTOS_MAX. dataS `attach`.
 */
export function openAttachSheet({ count = 0, max = CHAT_PHOTO_CAP(), peer = '' } = {}, onAdd) {
  const body = `<div class="attach-sheet">
  <p class="t-small c-600 attach-sheet__note">Show ${esc(peer || 'them')} the garment. Up to ${max}&nbsp;per&nbsp;message.${count > 0 ? ` ${count} added.` : ''}</p>
  <div class="attach-sheet__rows">
    ${listRow({ title: 'Take a photo', act: 'photo-camera', lead: ICON_CAMERA, chevron: false })}
    ${listRow({ title: 'Choose from library', act: 'photo-library', lead: ICON_IMAGE, chevron: false })}
  </div>
</div>`;
  return sheetOverlay(body, { header: 'Add a photo', dataS: 'attach', confirm: false }, (holder, close) => {
    holder.addEventListener('click', (e) => {
      if (!e.target.closest('[data-act="photo-camera"], [data-act="photo-library"]')) return;
      onAdd?.();
      close();
    });
  });
}

/** Add-card error copy (lifted from c-pay; c-pay keeps its own copy until M6). Keys = the fields `addCard` reports. */
export const CARD_ERRORS = {
  number: 'Enter the full card number.',
  exp: 'Enter a valid expiry, like 08/28.',
  cvc: 'Enter the 3 or 4 digit code.',
  zip: 'Enter a 5-digit ZIP code.',
};
/**
 * Card fields — number, expiry + security code, ZIP (`#cc-number #cc-exp #cc-csc #cc-zip`), errors under the fields.
 * `values` = { number, exp, cvc, zip }; `errors` = { number, exp, cvc, zip } (any truthy value shows that field's CARD_ERRORS copy).
 * Markup only: the host sheet owns the form, the "stored by our payment provider" note and the Save button.
 */
export function cardFields({ values = {}, errors = {} } = {}) {
  const v = values ?? {}; const e = errors ?? {};
  return `<div class="card-fields">
  ${field({ id: 'cc-number', label: 'Card number', value: v.number ?? '', inputmode: 'numeric', autocomplete: 'cc-number', placeholder: '1234 1234 1234 1234', maxlength: 19, error: e.number ? CARD_ERRORS.number : '' })}
  <div class="card-fields__pair">
    ${field({ id: 'cc-exp', label: 'Expiry', value: v.exp ?? '', inputmode: 'numeric', autocomplete: 'cc-exp', placeholder: 'MM/YY', maxlength: 5, error: e.exp ? CARD_ERRORS.exp : '' })}
    ${field({ id: 'cc-csc', label: 'Security code', value: v.cvc ?? '', inputmode: 'numeric', autocomplete: 'cc-csc', maxlength: 4, helper: '3 or 4 digits on the back', error: e.cvc ? CARD_ERRORS.cvc : '' })}
  </div>
  ${field({ id: 'cc-zip', label: 'ZIP code', value: v.zip ?? '', inputmode: 'numeric', autocomplete: 'postal-code', maxlength: 5, error: e.zip ? CARD_ERRORS.zip : '' })}
</div>`;
}

/* ============================================================
   K-02 — fitting documentation (D-175…D-183): garment icons everywhere a garment has a title, Before | Pinned photos
   (required before the final order is sent) and a comment per garment. A photo is simulated (D-177): the garment's own
   illustration on a token tone, so the same sequence always renders the same pictures.
   ============================================================ */
const DOC_MAX = () => DATA.FITTING_LIMITS?.PHOTOS_MAX ?? 4;
const DOC_COMMENT_MAX = () => DATA.FITTING_LIMITS?.COMMENT_MAX ?? 200;
const DOC_KIND_LIST = () => DATA.DOC_KINDS ?? ['before', 'pinned'];
const kindLabel = (kind) => DATA.DOC_LABEL?.[kind] ?? kind;
const lowerKind = (kind) => kindLabel(kind).toLowerCase();

/**
 * Garment icon (D-181) — the ONE helper every garment title uses. size 'card' 40 (a well, identical to c-job's tile) · 'row' 32
 * (sheet rows) · 'inline' 24 (no well) · 'hero' 96 (no well: welcome, done, empty states). Decorative (`alt=""`, aria-hidden) wherever the name is printed next to it; pass `alt`
 * where it stands alone. A type with no illustration gets a hanger in the same well, never a broken image.
 */
/** M7-2-C-05: the garment that stands for a booking in small wells (inbox row, thread card, booking lists): a broad
    silhouette (jacket, dress, shirt) reads at 32 px where a pant or skirt is a sliver. '' when the job has no garments. */
const HERO_ORDER = ['Suit Jacket', 'Jacket', 'Formal Dress', 'Dress / Jumpsuit', 'Shirt / Blouse', 'Accessories', 'Skirt', 'Pants / Jeans', 'Suit Pant'];
export function heroGarment(job) {
  const types = (job?.garments ?? []).map((g) => g.type).filter(Boolean);
  if (!types.length) return '';
  const rank = (t) => { const i = HERO_ORDER.indexOf(t); return i < 0 ? HERO_ORDER.length : i; };
  return types.reduce((best, t) => (rank(t) < rank(best) ? t : best), types[0]);
}

/** M7-2-C-04 (D-202): the booked order as a strip — each garment's illustration in a 32 px well, then "2 items · 3 services". */
export function garmentStrip(types = [], label = '') {
  const shown = types.slice(0, 5);
  const more = types.length - shown.length;
  return `<span class="garment-strip"><span class="garment-strip__icons">${shown.map((t) => garmentIcon(t, { size: 'row' })).join('')}${more > 0 ? `<span class="garment-strip__more t-small w-600 c-700">+${more}</span>` : ''}</span>${label ? `<span class="garment-strip__label t-small c-600">${label}</span>` : ''}</span>`;
}

export function garmentIcon(type, { size = 'card', alt = '' } = {}) {
  const src = GARMENT_ICONS[type];
  const hidden = alt ? '' : ' aria-hidden="true"';
  if (src) return `<span class="garment-icon garment-icon--${size}"${hidden}><img src="${src}" alt="${esc(alt)}"></span>`;
  return `<span class="garment-icon garment-icon--${size} garment-icon--fallback"${alt ? ` role="img" aria-label="${esc(alt)}"` : hidden}>${ICON_HANGER}</span>`;
}

/** The simulated photo (D-177): a thin wrapper of photoStub (M7 A5.12) — Pinned adds a pin. */
export function docPhoto(photo, { type = '', size = 'thumb' } = {}) {
  return photoStub({ type, tone: photo.tone ?? 0, size, kind: photo.kind, seed: photo.id });
}

const photoLabel = (kind, i, n, type) => `${kindLabel(kind)} photo ${i + 1} of ${n}, ${type}. Open`;

/**
 * Docs editor — the documentation block inside a t-adjust garment card (v4 t04): Before photos, Pinned photos, a comment.
 * `missing` = { before, pinned } booleans (true = this kind still needs a photo); the line says so in error ink with a glyph.
 * `commentDraft` !== null = the comment is being edited. `busy` disables every button.
 */
export function docsEditor({ garmentId, type, docs, missing = { before: false, pinned: false }, commentDraft = null, commentError = '', busy = false, first = 'Sarah', tried = false } = {}) {
  const max = DOC_MAX();
  const dis = busy ? ' disabled' : '';
  const g = esc(garmentId);
  const row = (kind) => {
    const list = docs?.[kind] ?? [];
    const n = list.length;
    const label = `${kindLabel(kind)} photos`;
    const thumbs = list.map((p, i) => `<button type="button" class="docs-editor__thumb" data-act="view-doc" data-garment="${g}" data-kind="${kind}" data-index="${i}" aria-label="${esc(photoLabel(kind, i, n, type))}"${dis}>${docPhoto(p, { type })}</button>`).join('');
    const add = n < max
      ? `<button type="button" class="docs-editor__add" data-act="add-doc" data-garment="${g}" data-kind="${kind}" aria-label="Add a ${lowerKind(kind)} photo of the ${esc(type)}${n ? `, ${n} added` : ''}"${dis}>${ICON_CAMERA}</button>`
      : '';
    const miss = missing?.[kind] && n === 0;
    /* M7 (D-196): pristine = a quiet "Required" where "n of 4" shows; once she has tried to send or leave (`tried`) it becomes the error line + a red camera ring */
    const req = miss && !tried;
    return `<div class="docs-editor__row" data-kind="${kind}" data-missing="${miss ? 'true' : 'false'}"${miss && tried ? ' data-tried="true"' : ''}>
      <div class="docs-editor__head"><span class="t-small w-600 c-700">${label}</span>${n ? `<span class="t-small c-600">${n} of ${max}</span>` : req ? `<span class="t-small w-600 c-600 docs-editor__req" data-missing-msg="${kind}" tabindex="-1">Required</span>` : ''}</div>
      <div class="photo-tiles docs-editor__tiles">${thumbs}${add}</div>
      ${n >= max ? `<p class="t-small c-600 docs-editor__max">Up to ${max} ${lowerKind(kind)} photos.</p>` : ''}
      ${miss && tried ? `<p class="docs-editor__missing t-small" data-missing-msg="${kind}" role="alert" tabindex="-1">${ICON_ALERT} Add at least one ${lowerKind(kind)} photo.</p>` : ''}
    </div>`;
  };
  const d = docs ?? {};
  let comment;
  if (commentDraft !== null) {
    comment = `<div class="docs-editor__edit">${textArea({ id: `comment-${garmentId}`, label: `Comment for ${first}`, value: commentDraft, rows: 3, max: DOC_COMMENT_MAX(), helper: 'Phone numbers and emails are hidden.', error: commentError })}
      <div class="docs-editor__actions">${ctaSmall('Save', { filled: true, attrs: `data-act="save-comment" data-garment="${g}"${dis}` })}<button type="button" class="docs-editor__text t-small w-600" data-act="cancel-comment" data-garment="${g}"${dis}>Cancel</button></div></div>`;
  } else if (d.comment) {
    comment = `<figure class="docs-editor__comment"><figcaption class="t-small c-600">Your comment</figcaption><blockquote class="t-body">“${esc(d.comment)}”</blockquote></figure>
      <span class="docs-editor__edit-link">${textLink('Edit comment', { act: 'edit-comment', disabled: !!dis, attrs: `data-garment="${g}"` })}</span>
      ${d.commentMasked ? `<p class="t-small c-600 docs-editor__masked">Phone numbers and emails are hidden from ${esc(first)}.</p>` : ''}`;
  } else {
    comment = `<div class="docs-editor__optional"><button type="button" class="docs-editor__text docs-editor__text--add t-body w-600" data-act="add-comment" data-garment="${g}"${dis}>+ Add comment</button><span class="t-small c-600">Optional</span></div>`;
  }
  return `<div class="docs-editor" data-docs-editor="${g}">${row('before')}${row('pinned')}<div class="docs-editor__comment-block">${comment}</div></div>`;
}

const docTab = ({ kind, count, active, id, controls, attrs }) => `<button type="button" class="doc-tab${active ? ' is-active' : ''}" role="tab" id="${id}-tab" aria-controls="${controls}" aria-selected="${active}" tabindex="${active ? 0 : -1}" ${attrs}><span class="t-body w-600">${kindLabel(kind)}</span><span class="t-small c-600">${count}</span></button>`;

/**
 * Garment docs — the read-only block (v4 `Photo_Row`): a Before | Pinned tablist, a row of thumbnails per kind (the inactive
 * panel `hidden`) and the comment. Renders nothing when there are no photos and no comment. `tab` picks the selected one
 * (default Before). `idPrefix` keeps ids unique when two blocks of one garment share a page.
 */
export function garmentDocs({ garmentId, type, docs, commentLabel = 'Comment', idPrefix = 'docs', tab = 'before' } = {}) {
  const d = docs ?? {};
  const kinds = DOC_KIND_LIST();
  const total = kinds.reduce((n, k) => n + (d[k]?.length ?? 0), 0);
  if (!total && !d.comment) return '';
  const g = esc(garmentId);
  const pid = (kind) => `${idPrefix}-${garmentId}-${kind}`;
  const tabs = kinds.map((kind) => docTab({
    kind, count: d[kind]?.length ?? 0, active: kind === tab, id: pid(kind), controls: pid(kind), attrs: `data-act="docs-tab" data-garment="${g}" data-kind="${kind}"`,
  })).join('');
  const panels = kinds.map((kind) => {
    const list = d[kind] ?? [];
    const body = list.length
      ? `<div class="garment-docs__thumbs">${list.map((p, i) => `<button type="button" class="garment-docs__thumb" data-act="view-doc" data-garment="${g}" data-kind="${kind}" data-index="${i}" aria-label="${esc(photoLabel(kind, i, list.length, type))}">${docPhoto(p, { type })}</button>`).join('')}</div>`
      : `<p class="t-small c-600 garment-docs__none">No ${lowerKind(kind)} photos.</p>`;
    return `<div class="garment-docs__panel" role="tabpanel" id="${pid(kind)}" aria-labelledby="${pid(kind)}-tab"${kind === tab ? '' : ' hidden'}>${body}</div>`;
  }).join('');
  const comment = d.comment
    ? `<figure class="garment-docs__comment"><figcaption class="t-small c-600">${esc(commentLabel)}</figcaption><blockquote class="t-body">“${esc(d.comment)}”</blockquote></figure>
       ${d.commentMasked ? '<p class="t-small c-600 garment-docs__masked">Phone numbers and emails in this comment are hidden.</p>' : ''}`
    : '';
  return `<div class="garment-docs" data-docs="${g}"><div class="garment-docs__tabs" role="tablist" aria-label="${esc(type)} photos">${tabs}</div>${panels}${comment}</div>`;
}

/** ←/→/Home/End between the two tabs of a tablist; `pick(tabEl)` selects it. Returns true when handled. */
function tabKeys(e, pick) {
  const tab = e.target.closest?.('[role="tab"]');
  if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return false;
  const tabs = [...tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]')];
  const at = tabs.indexOf(tab);
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (at + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  e.preventDefault();
  pick(tabs[next]);
  tabs[next].focus({ preventScroll: true });
  return true;
}

/**
 * Photo viewer for fitting photos (D-180): a sheet with the Before | Pinned tabs, a 3:4 stage, ‹ n of N ›, a thumbnail strip
 * and, while `editable`, Remove photo (it calls `onRemove(photo, { garmentId, kind, index })` and closes the sheet).
 */
export function openDocsViewer({ garmentId, type, docs, kind = 'before', index = 0, by = '', editable = false, onRemove = null } = {}) {
  const kinds = DOC_KIND_LIST();
  const cur = { kind, index };
  const list = () => docs?.[cur.kind] ?? [];
  const clampIndex = () => { cur.index = Math.max(0, Math.min(cur.index, list().length - 1)); };
  const headerText = () => `${esc(type)} · ${kindLabel(cur.kind)}`;
  const body = () => {
    clampIndex();
    const photos = list();
    const n = photos.length;
    const photo = photos[cur.index];
    const tabs = kinds.map((k) => docTab({ kind: k, count: docs?.[k]?.length ?? 0, active: k === cur.kind, id: `viewer-${garmentId}-${k}`, controls: 'docs-viewer-stage', attrs: `data-act="docs-tab" data-kind="${k}"` })).join('');
    const sub = photo ? `<p class="t-small c-600 docs-viewer__sub">${esc(by ? `${by} · ` : '')}${fmtDay(photo.at)}, ${fmtTime(photo.at)}</p>` : '';
    const stage = photo
      ? `<div class="docs-viewer__stage" id="docs-viewer-stage" role="tabpanel" aria-labelledby="viewer-${garmentId}-${cur.kind}-tab" tabindex="0"><div class="docs-viewer__photo" role="img" aria-label="${kindLabel(cur.kind)} photo ${cur.index + 1} of ${n}, ${esc(type)} (placeholder)">${docPhoto(photo, { type, size: 'stage' })}</div></div>
        <div class="docs-viewer__controls"><button type="button" class="docs-viewer__nav" data-act="doc-prev" aria-label="Previous photo"${cur.index === 0 ? ' disabled' : ''}>‹</button><span class="t-body w-600" aria-live="polite">${cur.index + 1} of ${n}</span><button type="button" class="docs-viewer__nav" data-act="doc-next" aria-label="Next photo"${cur.index === n - 1 ? ' disabled' : ''}>›</button></div>
        <div class="docs-viewer__strip">${photos.map((p, i) => `<button type="button" class="docs-viewer__thumb" data-act="doc-thumb" data-index="${i}" aria-label="${esc(photoLabel(cur.kind, i, n, type)).replace(/\. Open$/, '')}"${i === cur.index ? ' aria-current="true"' : ''}>${docPhoto(p, { type })}</button>`).join('')}</div>
        ${editable ? cta('Remove photo', { variant: 'secondary', attrs: 'data-act="doc-remove"' }).replace('cta cta--secondary', 'cta cta--secondary cta--secondary-danger') : ''}`
      : `<div class="docs-viewer__stage" id="docs-viewer-stage" role="tabpanel" aria-labelledby="viewer-${garmentId}-${cur.kind}-tab"><p class="t-small c-600 garment-docs__none">No ${lowerKind(cur.kind)} photos.</p></div>`;
    return `${sub}<div class="garment-docs__tabs" role="tablist" aria-label="${esc(type)} photos">${tabs}</div>${stage}`;
  };
  return sheetOverlay(`<div class="docs-viewer" data-viewer>${body()}</div>`, { header: headerText(), dataS: 'docs-viewer', confirm: false }, (holder, close) => {
    const box = holder.querySelector('[data-viewer]');
    const title = holder.querySelector('.sheet__title');
    const draw = (focus) => {
      box.innerHTML = body();
      title.innerHTML = headerText();
      const el = focus && box.querySelector(focus);
      (el && !el.disabled ? el : box.querySelector('[role="tab"][aria-selected="true"]'))?.focus({ preventScroll: true });
    };
    const pickTab = (el) => { cur.kind = el.dataset.kind; cur.index = 0; draw('[role="tab"][aria-selected="true"]'); };
    holder.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled) return;
      const act = el.dataset.act;
      if (act === 'docs-tab') pickTab(el);
      else if (act === 'doc-prev') { cur.index -= 1; draw('[data-act="doc-prev"]'); }
      else if (act === 'doc-next') { cur.index += 1; draw('[data-act="doc-next"]'); }
      else if (act === 'doc-thumb') { cur.index = Number(el.dataset.index); draw('[aria-current="true"]'); }
      else if (act === 'doc-remove') {
        const photo = list()[cur.index];
        const ctx = { garmentId, kind: cur.kind, index: cur.index };
        close({ instant: true });
        if (photo) onRemove?.(photo, ctx);
      }
    });
    holder.addEventListener('keydown', (e) => {
      if (tabKeys(e, (t) => { cur.kind = t.dataset.kind; cur.index = 0; draw(`[role="tab"][data-kind="${t.dataset.kind}"]`); })) return;
      if (e.target.closest('#docs-viewer-stage') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const next = cur.index + (e.key === 'ArrowRight' ? 1 : -1);
        if (next < 0 || next >= list().length) return;
        e.preventDefault();
        cur.index = next;
        draw('#docs-viewer-stage');
      }
    });
    box.querySelector('[role="tab"][aria-selected="true"]')?.focus({ preventScroll: true });
  });
}

/**
 * Wire the read-only blocks (`garmentDocs`) and the editor's thumbnails: tab switches in place (no re-render, ←/→/Home/End),
 * and a photo tap opens the viewer at that kind and index. `lookup(garmentId) → { type, docs }`.
 */
export function wireGarmentDocs(root, { lookup, by = '', editable = false, onRemove = null } = {}) {
  const select = (tab) => {
    const block = tab.closest('.garment-docs');
    if (!block) return;
    block.querySelectorAll('[role="tab"]').forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      t.classList.toggle('is-active', on);
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
  };
  root.addEventListener('click', (e) => {
    if (e.target.closest('.screen-sheet--overlay')) return;
    const tab = e.target.closest('[data-act="docs-tab"]');
    if (tab) { select(tab); return; }
    const photo = e.target.closest('[data-act="view-doc"]');
    if (!photo || photo.disabled) return;
    const info = lookup?.(photo.dataset.garment);
    if (!info) return;
    openDocsViewer({
      garmentId: photo.dataset.garment, type: info.type, docs: info.docs, kind: photo.dataset.kind, index: Number(photo.dataset.index) || 0, by, editable, onRemove,
    });
  });
  root.addEventListener('keydown', (e) => { if (!e.target.closest('.screen-sheet--overlay')) tabKeys(e, select); });
}
