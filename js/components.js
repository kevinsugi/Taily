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
  tailor: [['home', 'Home'], ['shop', 'Shop'], ['messages', 'Messages'], ['earnings', 'Earnings']],   // K-04 / CR-6b: Messages before Earnings
};
/**
 * Top nav (M7 A5.2, D-187): the logo and four 44 x 44 ICON links. The label is the link's aria-label + title. `badges` (D-164):
 * `{ home: 2, messages: 1 }` — a count above 0 draws an 8 px accent dot on the icon and a spoken ", n unread" (messages) /
 * ", n new" (anything else). The active link is ink at 1.75 stroke with an accent stitch under it.
 * K-06 (D-221): `back` seats the 44 x 44 Back chevron at the left IN PLACE OF the logo (a screen whose heading has a Back);
 * the icon links stay at the right. `withNavBack(html)` (app.js) turns on `back` for any screen that holds the headingRow marker.
 */
export function topNav(active = 'home', items = NAV.customer, { badges = {}, back = false } = {}) {
  const links = items.map(([key, label]) => {
    const isActive = key === active;
    const n = Number(badges[key]) || 0;
    const dot = n > 0 ? '<span class="top-nav__dot" aria-hidden="true"></span>' : '';
    const name = `${label}${n > 0 ? `, ${n} ${key === 'messages' ? 'unread' : 'new'}` : ''}`;
    return `<a class="top-nav__link${isActive ? ' is-active' : ''}" href="#" data-nav="${key}" aria-label="${name}" title="${label}"${isActive ? ' aria-current="page"' : ''}>
      <span class="top-nav__icon">${NAV_ICONS[key] ?? NAV_ICONS.home}${dot}</span>
    </a>`;
  }).join('\n    ');

  return `<nav class="top-nav${back ? ' top-nav--back' : ''}" aria-label="Primary">
  ${back ? navBackButton() : LOGO}
  <div class="top-nav__links">
    ${links}
  </div>
</nav>`;
}

/** The nav's Back (K-06): a 44 x 44 chevron button where the logo would be. `.back[data-act="back"]` is what app.js wireBackButtons steps. */
export const navBackButton = () => `<button type="button" class="back top-nav__back" data-act="back" aria-label="Back" title="Back">${NAV_BACK}</button>`;
const NAV_BACK_MARK = '<!--nav-back-->';
/** For a screen with no heading row (t-request, K-15): the marker that turns the nav logo into the Back chevron. */
export const navBackMark = () => NAV_BACK_MARK;
/**
 * K-06 (D-221): a screen's heading says it has a Back by calling headingRow({ back }) (the default), which leaves a NAV_BACK_MARK
 * in the markup. The router runs every built screen through this: the marker goes, and the nav's logo becomes the Back chevron.
 * A screen with a status bar but no nav (the sign-in screens) gets a Back-only bar; a flow bar / onboarding bar already holds its own Back.
 */
export function withNavBack(html) {
  if (!html.includes(NAV_BACK_MARK)) return html;
  const out = html.split(NAV_BACK_MARK).join('');
  if (/class="top-nav__logo"/.test(out)) return out.replace(/<svg class="top-nav__logo"[\s\S]*?<\/svg>/, navBackButton()).replace('<nav class="top-nav"', '<nav class="top-nav top-nav--back"');
  if (/class="(flow-bar|ob-bar)\b/.test(out)) return out;
  const bar = topNav(null, [], { back: true });
  return /<div class="status-bar"[\s\S]*?<\/div>/.test(out) ? out.replace(/(<div class="status-bar"[\s\S]*?<\/div>)/, `$1\n${bar}`) : `${bar}\n${out}`;
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

import { PILL_ICONS, CHEVRON_DOWN, ICON_EDIT, ICON_CAMERA, ICON_CANCEL, CHEVRON_RIGHT, ICON_CARD, META_ICONS, STRIP_ICONS, VISIT_ICONS, ICON_HANGER, ICON_PIN, NAV_ICONS, NAV_BACK, ICON_INFO, ICON_VERIFIED, ICON_MORE, ICON_CHAT, ICON_DIRECTIONS, ICON_CALENDAR } from './icons.js';
export { NAV_ICONS, ICON_INFO, ICON_VERIFIED, ICON_MORE, ICON_CHAT, ICON_DIRECTIONS, ICON_CALENDAR };
import { GARMENT_ICONS, GARMENT_TYPES, TRUST_BADGES, PRIVACY_NOTE, ZIP_INFO } from './data.js';
import * as DATA from './data.js';
import { fmt, fmtExact, fmtNeg, cents } from './money.js';
import { fmtShort, fmtWhen, fmtCountdown, fmtDay, fmtTime, isoDay, nb, dayWord } from './dates.js';
import { POLICY } from './money-config.js';
import { state, T, apptsFor, threadsFor, priceChangeView, handoffSlots, slotText, courierQuoteFor, verifyView, checkState } from './state.js';
import { scheduler, slotColumns, readSlot, windowColumns, readWindow, whenNote, SCHED_ROW } from './scheduler.js';   // K-40: the handoff time sheet (scheduler.js imports this file back; both only call across at run time)
import { withLatency } from './sim.js';
import { inbox } from './tailor-data.js';
import { statusWord } from './focus.js';

/**
 * CTA — variant: 'default' | 'secondary' | 'danger' (error fill + white text: the ONE filled button of a destructive confirm sheet, D-79).
 * `disabled` emits `disabled aria-disabled="true"`. `busy` = a spinner + `busyLabel` (else the label),
 * `aria-busy="true"` and `aria-disabled` (not `disabled`, AU-P1-2c: handlers guard on [aria-busy]); the spinner does not rotate under reduced motion / html.is-test.
 */
/* K-46 (D-303) · two-line variant: `sub` = a smaller second line inside the button ("Pay $144.00" over "Charged at pickup"; while it is
   disabled, the reason it waits). With `subId` the button is named by its first line and DESCRIBED by the second (aria-describedby),
   so a screen reader reads the reason on the disabled button too; the second line stays through busy, so the button keeps its height. */
export function cta(label, { variant = 'default', disabled = false, busy = false, busyLabel = '', attrs = '', softDisabled = false, sub = '', subId = '' } = {}) {
  const cls = ['cta', variant === 'secondary' ? 'cta--secondary' : '', variant === 'danger' ? 'cta--danger' : '', disabled || softDisabled ? 'cta--disabled' : '', busy ? 'cta--busy' : '', sub ? 'cta--two' : ''].filter(Boolean).join(' ');
  /* M7 (D-196): `softDisabled` looks disabled and says so (aria-disabled) but has no `disabled` attribute, so a tap reaches the screen */
  /* AU-P1-2c: a busy button stays focusable (aria-disabled + aria-busy, NOT `disabled`) so keyboard focus survives the repaint; every handler guards on [aria-busy] */
  const off = busy ? ' aria-disabled="true" aria-busy="true"' : disabled ? ' disabled aria-disabled="true"' : softDisabled ? ' aria-disabled="true"' : '';
  const one = busy ? `<span class="cta__spinner" aria-hidden="true"></span><span>${busyLabel || label}</span>` : label;
  if (!sub) return `<button type="button" class="${cls}"${off} ${attrs}>${one}</button>`;
  const aria = subId ? ` aria-labelledby="${subId}-main" aria-describedby="${subId}"` : '';
  return `<button type="button" class="${cls}"${off}${aria} ${attrs}><span class="cta__main"${subId ? ` id="${subId}-main"` : ''}>${one}</span><span class="cta__sub"${subId ? ` id="${subId}"` : ''}>${sub}</span></button>`;
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
  /* K-04 / CR-4a (D-211): a request waiting on the tailor is her move, so it takes the action tone */
  'new-request':           { tone: 'action',   label: 'New request' },
  'awaiting-customer':     { tone: 'pending',  label: 'Awaiting customer' },
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
  'awaiting-handoff':      { tone: 'done',     label: 'On its way' },
  /* R3-1-C-12: a no-fault outcome (Sarah cancelled early, a plain no reply) — the neutral tone */
  'calm':                  { tone: 'calm',     label: 'Cancelled' },
  'withdrawn':             { tone: 'stop',     label: 'Withdrawn' },
  /* UX-LOOP R2-U-04: a request nobody accepted in time */
  'expired':               { tone: 'stop',     label: 'Expired' },
  /* M7: t-shop's "Bookable" / "Paused" */
  'bookable':              { tone: 'done',     label: 'Bookable' },
  'paused':                { tone: 'pending',  label: 'Paused' },
  /* DG-4 (option B, D-350): one dot + word per verification check, and the Shop's review state */
  'check-verified':        { tone: 'done',     label: 'Verified' },
  'check-pending':         { tone: 'pending',  label: 'Pending' },
  'check-needs':           { tone: 'action',   label: 'Needs info' },
  'check-todo':            { tone: 'calm',     label: 'Not started' },
  'check-waitlist':        { tone: 'stop',     label: 'Waitlist' },
  'under-review':          { tone: 'pending',  label: 'Under review' },
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

/** Select time trigger — label + chevron. */
export function selectTime(label = 'Select time', { attrs = '' } = {}) {
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
  /* K-04 / D-203: the pill is wrapped in a <!--status--> marker so headingRow() can lift it onto its own line ABOVE the Back + title row */
  if (pill !== false) parts.push(`<!--status-->${statusPill(pill ?? PILL_FOR[variant], pillLabel)}<!--/status-->`);
  if (title) parts.push(`<h1 class="status-hero__title${titleWeight === 600 ? ' w-600' : ''}${titleColor ? ` c-${titleColor}` : ''}">${title}${titleLine2 ? `<br>${titleLine2}` : ''}</h1>`);
  /* round 16 (Kevin): the explanation (body + extra) is its own block —
     headingRow() lifts it out of the Back + title row so it sits at the screen
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
export function summaryCard({ initials = 'MT', name = 'Marco Tailor', rows = [], verified = false, years = 0, badges = [], tag = '', user = false, attrs = '' } = {}) {
  return `<article class="summary-card${user ? ' summary-card--user' : ''}"${badges.length && !user ? ' role="button" tabindex="0"' : ''} ${attrs}>
  <div class="summary-card__who">
    <span class="avatar avatar--md">${initials}</span>
    <div class="summary-card__info">
      <span class="summary-card__name-row"><span class="summary-card__name">${name}</span>${verified ? verifiedCheck({ years }) : ''}${tag ? `<span class="summary-card__tag">${tag}</span>` : ''}</span>
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
export function visitBlock(rows = [], { title = 'Visit details', flush = false, action = '' } = {}) {
  /* M7 (A5.5): the title is a small caps section head (`action` = HTML aside, e.g. a "Change time" text link); rows sit flat under it.
     K-10 (D-235): a row is a plain HTML string (legacy) or a fact object for an "Icon rows" row — see `visitRow`. */
  return `<div class="visit-block${flush ? ' visit-block--flush' : ''}">${title || action ? sectionHead(title, { aside: action }) : ''}${visitRows(rows)}</div>`;
}

/** K-14 (D-240): the rows of a visit / person block share ONE column (`.visit-rows`): every icon in a 40 px round tile, every text on one edge. */
function visitRows(rows = [], lead = '') {
  const inner = lead + rows.map((r) => (typeof r === 'string' ? `<span class="visit-block__row">${r}</span>` : visitRow(r))).join('');
  return inner ? `<div class="visit-rows">${inner}</div>` : '';
}

/** K-10 (D-235) + K-14 (D-240), "Icon tiles match the avatar": one fact = a 20 px line icon (neutral-600, aria-hidden) in a 40 px round
    neutral tile (the avatar's diameter, so tiles and avatar share one column) beside the value (16 / 500 ink, 16 / 600 when `strong`, the
    date row) with `detail` under it (12 / 400 neutral-600; a string or an array, one line each). The text column is at least one tile tall and
    centres on it; a row with `extra` (the garment tiles) top-aligns instead (`--tall`). `value` / `detail` are HTML the caller has escaped. */
export function visitRow({ icon = 'calendar', value = '', detail = '', strong = false, extra = '', cls = '' } = {}) {
  const lines = (Array.isArray(detail) ? detail : [detail]).filter(Boolean);
  return `<div class="visit-row${extra ? ' visit-row--tall' : ''}${cls ? ` ${cls}` : ''}"><span class="visit-row__icon">${VISIT_ICONS[icon] ?? ''}</span><div class="visit-row__text"><span class="visit-row__value t-body ${strong ? 'w-600' : 'w-500'}">${value}</span>${lines.map((l) => `<span class="visit-row__detail t-small w-400 c-600">${l}</span>`).join('')}${extra}</div></div>`;
}

/** K-12 Option C "Person-led block": the avatar anchors the block and the visit icon rows hang under the name, then equal action buttons.
    `person` = { initials, name, verified, years } — `verified` (a TAILOR only, K-15) adds the tappable Verified check (`verifiedCheck`, `years` for its popover) right after the name, no facts line under it.
    `rows` = the same fact objects / strings `visitBlock` takes. `actions` = [{ label, icon (HTML), act, href, attrs }] rendered as equal
    columns of small outline buttons (a `href` makes it a link: Directions, Add to calendar). One block for both personas. */
/** The equal small outline buttons of a person block / status screen: [{ label, icon (HTML), act, href, attrs }] → one `.cta-small` each (a `href` makes a link). */
export function personButtons(actions = []) {
  return actions.map((x) => {
    const inner = `${x.icon ?? ''}<span>${esc(x.label)}</span>`;
    const attrs = `${x.act ? `data-act="${esc(x.act)}"` : ''}${x.attrs ? ` ${x.attrs}` : ''}`;
    return ctaSmall(inner, { attrs, href: x.href ?? '' });
  }).join('');
}
/** K-17 (D-242): the buttons on their own, under a status screen's tile rows (the person is in the header, so no block around them). */
export const personActions = (actions = []) => { const b = personButtons(actions); return b ? `<div class="person-block__actions person-actions">${b}</div>` : ''; };
/** K-17 (D-242): a status screen's header — the K-15 `requestHead` row, then optional full-width `foot` lines, over one hairline. */
export const pageHead = (head, { foot = [] } = {}) => `<div class="page-head">${head}${foot.length ? `<div class="page-head__foot">${foot.map((l) => `<p class="t-small c-600">${esc(l)}</p>`).join('')}</div>` : ''}</div>`;

export function personBlock({ title = 'Visit', person = {}, rows = [], actions = [], action = '' } = {}) {
  const btns = personButtons(actions);
  /* K-14: the person is the first row of the one column — the avatar sits in the icon slot (no tile fill), the name on the common text edge */
  const lead = `<div class="visit-row visit-row--person"><span class="visit-row__icon visit-row__icon--avatar">${avatar({ initials: person.initials ?? '', size: 'sm' })}</span><div class="visit-row__text person-block__who"><span class="person-block__name t-body w-600">${esc(person.name ?? '')}</span>${person.verified ? verifiedCheck({ years: person.years }) : ''}</div></div>`;
  return `<div class="visit-block visit-block--flush person-block">${sectionHead(title, { aside: action })}${visitRows(rows, lead)}${btns ? `<div class="person-block__actions">${btns}</div>` : ''}</div>`;
}

/** An .ics data link for "Add to calendar" (both personas). `start` / `end` / `stamp` are ISO minutes ("2026-10-15T17:00"). */
export function calendarHref({ uid = '', start = '', end = '', stamp = '', summary = '', location = '' } = {}) {
  const f = (iso) => `${iso.replace(/[-:]/g, '').slice(0, 15)}00`;
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Taily//Prototype//EN', 'BEGIN:VEVENT', `UID:${uid}@taily.example`,
    `DTSTAMP:${f(stamp)}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`, `SUMMARY:${summary}`, `LOCATION:${location.replace(/,/g, '\\,')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

/** The Back control (308:3820) — K-06 (D-221): it now lives in the TOP NAV (`navBackButton`), where it replaces the logo; `backButton()`
    is the plain "‹" 28 chevron the booking flow bar and the onboarding bar keep. The router wires every `.back[data-act="back"]`
    to step the prototype's history (app.js wireBackButtons). */
export const backButton = () => '<button type="button" class="back" data-act="back" data-hit="inline" aria-label="Back">‹</button>';
/* K-06 (Kevin, D-221): the heading anatomy on every screen that has one, flush on the 20 px gutter edge:
     1. the status line (the 8 px dot + word) on its own line, when the screen has one — `statusHero` hands its pill up through
        a <!--status--> marker, any other screen passes `status`;
     2. ONE row = the `h1` (and `trailing`);
     3. the notes (statusHero's body + extra, or a screen's own <!--notes-->…<!--/notes--> block) at the screen padding, full width.
   The Back is NOT in the heading any more: `back` (default true) only leaves a marker so `withNavBack` puts the Back chevron in the
   top nav in place of the logo; `back: false` = a tab root (logo stays) or a path whose Back is in the flow / onboarding bar.
   `trailing` = HTML at the row's right end (t-job's •••). `sticky` pins the row to the top while the page scrolls (the thread screens,
   AU-P2-4). Anything between the status and the `h1` (an eyebrow) rides with the status line; anything after the `h1` (statusHero's
   figure row) follows the row at the padding. A head whose `h1` is nested in a larger block (`threadHead`, c-tailor's avatar + name)
   takes `whole: true` (the thread head is detected). */
export function headingRow(inner, { back = true, status = '', trailing = '', sticky = false, whole = false } = {}) {
  const n = /<!--notes-->([\s\S]*?)<!--\/notes-->/.exec(inner);
  const notes = n ? n[1] : '';
  let head = n ? inner.replace(n[0], '') : inner;
  const st = /<!--status-->([\s\S]*?)<!--\/status-->/.exec(head);
  const statusHtml = `${status}${st ? st[1] : ''}`;
  if (st) head = head.replace(st[0], '');
  const wrap = /^\s*<div class="status-hero[^"]*">([\s\S]*)<\/div>\s*$/.exec(head);   // statusHero's own column: its parts become the row's parts
  if (wrap) head = wrap[1];
  let lead = ''; let body = head; let after = '';
  const h1 = /<h1\b[\s\S]*?<\/h1>/.exec(head);
  const wholeHead = whole || /class="thread-head"/.test(head);
  if (h1 && !wholeHead) { lead = head.slice(0, h1.index); body = h1[0]; after = head.slice(h1.index + h1[0].length); }
  const top = `${statusHtml}${lead}`.trim();
  const cls = `heading-row${wholeHead ? ' heading-row--head' : ''}${sticky ? ' heading-row--sticky' : ''}`;
  return `${back ? NAV_BACK_MARK : ''}${top ? `<div class="heading-lead">${top}</div>` : ''}<div class="${cls}"><div class="heading-row__body">${body}</div>${trailing ? `<div class="heading-row__trail">${trailing}</div>` : ''}</div>${after.trim() ? `<div class="heading-after">${after}</div>` : ''}${notes}`;
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
    <div class="trust-card__name-row"><span class="trust-card__name">${p.name}</span>${p.verified ? verifiedCheck({ years: p.years }) : ''}</div>
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
  const hadPopover = closeAnchorPopover({ instant: true });   // K-15 / K-25: the anchored popover is not a sheet, but leaves with one
  /* an overlay whose close() is already animating out (a handler
     closed it, then navigated) has nothing left to animate once the
     router wipes #screen — finish it now so the page unfreezes */
  if (instant) for (const fin of [...pendingFinish]) fin();
  if (!activeOverlay) return hadPopover;
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

/* Pin an overlay holder to the VISIBLE part of the screen column (viewport ∩ screen) and keep it there: it re-measures on
   window and visualViewport resize (rotation, on-screen keyboard, browser chrome). Returns the function that removes the
   listeners; every close path calls it (LAYOUT-PLAN P1-1). */
function fitOverlay(holder, screenEl) {
  const vv = window.visualViewport;
  const fit = () => {
    const r = screenEl.getBoundingClientRect();
    const bottomEdge = vv ? vv.offsetTop + vv.height : window.innerHeight;
    const top = Math.max(r.top, 0);
    holder.style.position = 'fixed';
    holder.style.left = `${r.left}px`;
    holder.style.width = `${r.width}px`;
    holder.style.top = `${top}px`;
    holder.style.height = `${Math.max(Math.min(r.bottom, bottomEdge) - top, 0)}px`;
    /* K-09 P2 (WCAG 2.4.11): the stuck grabber row + header cover the top of a scrolling .sheet, so a focused or scrolled-to
       control must stop below them. Measured, because a long title wraps the header to two lines. */
    padTop();
  };
  const padTop = () => {
    const panel = holder.querySelector('.sheet');
    if (!panel) return;
    const stuck = (panel.querySelector('.sheet__grabber-row')?.offsetHeight || 0) + (panel.querySelector('.sheet__header')?.offsetHeight || 0);
    panel.style.scrollPaddingTop = `${stuck + 8}px`;
  };
  /* the title can wrap late (web font load, a sheet that re-renders its header) */
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(padTop) : null;
  holder.querySelectorAll('.sheet__header, .sheet__grabber-row').forEach((el) => ro?.observe(el));
  fit();
  window.addEventListener('resize', fit);
  vv?.addEventListener('resize', fit);
  return () => { ro?.disconnect(); window.removeEventListener('resize', fit); vv?.removeEventListener('resize', fit); };
}

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
     overlay exists to avoid. Scroll is frozen below; fitOverlay re-measures
     when the visible viewport changes (rotation, keyboard, zoom). */
  screenEl.appendChild(holder);
  const unfit = fitOverlay(holder, screenEl);

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
      unfit();
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

  screenEl.appendChild(holder);
  const unfit = fitOverlay(holder, screenEl);

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
      unfit();
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
export function toast(msg, { tone = 'neutral', action = '', onAction = null, ms = action ? 10000 : tone === 'error' ? 6000 : 4000 } = {}) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = tone === 'neutral' ? 'toast' : `toast toast--${tone}`;   // v5: neutral | success | warning | error | info
  el.textContent = msg;
  /* SF-20: screen readers hear the toast through a live region that is always in the page (a region added with its text is often missed);
     the visible toast carries no role of its own */
  const live = document.getElementById(tone === 'error' ? 'toast-alert' : 'toast-live');
  if (live) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = msg; }); }
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
  const hide = () => {
    el.classList.remove('toast--in');
    setTimeout(() => { el.remove(); if (!document.querySelector('.toast')) document.documentElement.classList.remove('has-toast'); }, 300);
  };
  let timer = setTimeout(hide, ms);
  if (action) {
    /* SF-20: an action toast (10 s) waits while the pointer or focus is on it, then gets its full time again */
    const pause = () => clearTimeout(timer);
    const resume = () => { clearTimeout(timer); timer = setTimeout(hide, ms); };
    el.addEventListener('pointerenter', pause);
    el.addEventListener('focusin', pause);
    el.addEventListener('pointerleave', resume);
    el.addEventListener('focusout', (e) => { if (!el.contains(e.relatedTarget)) resume(); });
  }
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

/* ---------- the tailor's Verified check + its tooltip popover (K-15) ---------- */
/**
 * The tailor's Verified check — the ONLY verified mark in the app (customers carry none, K-15). A 16 px seal icon (`word: true` adds the word
 * "Verified", the profile and list rows) that is a <button> with a 44 px hit area; tapping it opens ONE non-modal tooltip popover
 * (`openVerifiedPopover`) listing the four checks. `years` = the tailor's years of experience (data-years). `inline` renders a
 * role="button" span for a host that is itself a <button> (tailorRow) — the tap is intercepted before the row's own action.
 */
export function verifiedCheck({ years = 0, word = false, inline = false } = {}) {
  const attrs = `class="verified verified--check${word ? '' : ' verified--icon'}" data-verified data-years="${Number(years) || 0}" data-hit="inline" aria-label="Verified tailor — show checks" aria-haspopup="dialog" aria-expanded="false" aria-controls="verified-pop"`;
  const inner = `${ICON_VERIFIED}${word ? '<span>Verified</span>' : ''}`;
  return inline ? `<span role="button" tabindex="0" ${attrs}>${inner}</span>` : `<button type="button" ${attrs}>${inner}</button>`;
}
const ICON_TICK = GLYPH('<path d="m3.5 8.4 3 3 6-6.8"/>');
/** The checks, one tick each: ID verified · Background check · "<N> years of experience" · Insured through Taily. DG-4 (D-350, Kevin):
    insurance is Taily's, not something a tailor hands in — the line says whose it is. The mark itself shows only when every check passed. */
export function verifiedChecks(years = 0) {
  const n = Number(years) || 0;
  return ['ID verified', 'Background check', ...(n > 0 ? [`${n} ${n === 1 ? 'year' : 'years'} of experience`] : []), 'Insured through Taily'];
}
/** The popover's own markup (also the gallery's static specimen, inside `.anchor-pop.verified-pop` with an `anchorArrow`). */
export function verifiedPopoverHtml(years = 0) {
  return `<ul class="verified-pop__list">${verifiedChecks(years).map((t) => `<li class="verified-pop__item"><span class="verified-pop__tick">${ICON_TICK}</span><span class="t-small w-500">${esc(t)}</span></li>`).join('')}</ul>`;
}

/* ---------- K-25: ONE anchored popover — the Verified check (K-15) and the garment peek share its shell, slot and contract ---------- */
/** The arrow every anchored popover carries (aimed at its trigger through `--pop-arrow-x`). */
export const anchorArrow = '<span class="anchor-pop__arrow" aria-hidden="true"></span>';
let activePop = null;
/** Close the open anchored popover (Verified or garment). `instant` skips returning focus (the screen is being replaced, or the tap went
    elsewhere). Returns true when one was open. */
export function closeAnchorPopover({ instant = false } = {}) {
  if (!activePop) return false;
  const { pop, btn, off } = activePop;
  activePop = null;
  off();
  pop.remove();
  if (btn.isConnected) {
    btn.setAttribute('aria-expanded', 'false');
    if (!instant) btn.focus({ preventScroll: true });
  }
  return true;
}
/** K-15 name, kept for callers: the Verified popover is the anchored popover. */
export const closeVerifiedPopover = closeAnchorPopover;
/**
 * Open a non-modal popover (`role="dialog"`, labelled `label`) anchored to `btn`: appended to #screen (it scrolls with the page), 10 px below
 * `aim` (the part of the trigger the arrow points at; default the trigger), flipped above when it would cross the window bottom minus 12,
 * clamped 12 px inside the screen column, the arrow on the aim's centre (>= 16 px from the corners). One open at a time (one slot): opening
 * closes the other; a second tap on the same trigger closes it. Closes on an outside tap or focus leaving (focus stays where it went), on
 * Escape (focus back on the trigger), and with `closeOverlay()` (Back, route change). Focus moves into it (tabindex -1). `cls` = the skin
 * (`verified-pop` · `garment-pop`), `id` = the trigger's aria-controls.
 */
export function anchorPopover(btn, html, { id = 'anchor-pop', cls = '', label = '', aim = null } = {}) {
  const screenEl = document.getElementById('screen');
  if (!screenEl || !btn) return null;
  const was = activePop?.btn === btn;
  closeAnchorPopover({ instant: true });
  if (was) { btn.focus({ preventScroll: true }); return null; }   // second tap = close, focus stays on the trigger
  const pop = document.createElement('div');
  pop.className = `anchor-pop${cls ? ` ${cls}` : ''}`;
  pop.id = id;
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', label);
  pop.tabIndex = -1;
  pop.innerHTML = `${anchorArrow}${html}`;
  screenEl.appendChild(pop);
  btn.setAttribute('aria-expanded', 'true');
  const target = aim ?? btn;
  const place = () => {
    const sr = screenEl.getBoundingClientRect();
    const br = target.getBoundingClientRect();
    const gap = 10;
    const margin = 12;
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const cx = br.left + br.width / 2 - sr.left;
    const left = Math.max(margin, Math.min(sr.width - margin - w, cx - w / 2));
    const below = br.bottom + gap + h <= window.innerHeight - margin || br.top - gap - h < 0;
    pop.dataset.side = below ? 'below' : 'above';
    pop.style.left = `${Math.round(left)}px`;
    pop.style.top = `${Math.round(below ? br.bottom - sr.top + gap : br.top - sr.top - gap - h)}px`;
    pop.style.setProperty('--pop-arrow-x', `${Math.round(Math.max(16, Math.min(w - 16, cx - left)))}px`);
  };
  place();
  const onDown = (e) => { if (!pop.contains(e.target) && !btn.contains(e.target)) closeAnchorPopover({ instant: true }); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeAnchorPopover(); } };
  const onOut = (e) => { if (e.relatedTarget && !pop.contains(e.relatedTarget) && !btn.contains(e.relatedTarget)) closeAnchorPopover({ instant: true }); };
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('keydown', onKey, true);
  pop.addEventListener('focusout', onOut);
  window.addEventListener('resize', place);
  const off = () => {
    document.removeEventListener('pointerdown', onDown, true);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', place);
  };
  activePop = { pop, btn, off };
  pop.focus({ preventScroll: true });
  return pop;
}
/** Open the Verified popover for a `verifiedCheck` (the arrow aims at the 16 px seal, not the 44 px pad). */
export function openVerifiedPopover(btn) {
  return anchorPopover(btn, verifiedPopoverHtml(btn.dataset.years), { id: 'verified-pop', cls: 'verified-pop', label: 'Verification', aim: btn.querySelector('svg') });
}

/** K-25 (P2): the garment popover's content — per item a head (32 px thumb, name 16 / 600, "N services" 12 neutral-600), a hairline, then
    each service (16 / 400 neutral-700) on a 12 px cognac stitch dash. No prices. Several items stack in one card that scrolls past a max height. */
export function garmentPopoverHtml(items = []) {
  const one = (g) => `<div class="garment-pop__item">
    <div class="garment-pop__head">${garmentIcon(g.type, { size: 'row' })}<span class="garment-pop__who"><span class="garment-pop__name t-body w-600">${esc(g.type)}</span><span class="garment-pop__count t-small c-600">${plural((g.services ?? []).length, 'service')}</span></span></div>
    <ul class="garment-pop__svcs">${(g.services ?? []).map((sv) => `<li class="t-body c-700">${esc(sv)}</li>`).join('')}</ul>
  </div>`;
  return `<div class="garment-pop__list">${items.map(one).join('')}</div>`;
}
/** The data a peek trigger carries: `data-peek` (the items as JSON) + `data-peek-label` (the dialog's name). */
export function peekAttrs(items = [], label = '') {
  const data = items.map((g) => ({ type: g.type, services: g.services ?? [] }));
  return `data-peek="${esc(JSON.stringify(data))}" data-peek-label="${esc(label)}" data-hit="inline" aria-haspopup="dialog" aria-expanded="false" aria-controls="garment-pop"`;
}
/** Open the garment popover for a `[data-peek]` trigger (a strip thumb, "+N", or a request card's count cluster). */
export function openGarmentPopover(btn) {
  let items = [];
  try { items = JSON.parse(btn.dataset.peek || '[]'); } catch { items = []; }
  const aim = btn.querySelector('.garment-icon, .garment-strip__more, .request-card__icons') ?? btn;
  const pop = anchorPopover(btn, garmentPopoverHtml(items), { id: 'garment-pop', cls: 'garment-pop', label: btn.dataset.peekLabel || 'Items', aim });
  const list = pop?.querySelector('.garment-pop__list');
  if (list && list.scrollHeight > list.clientHeight + 1) {        // a long order scrolls: let the keyboard reach it
    list.tabIndex = 0;
    list.setAttribute('role', 'region');
    list.setAttribute('aria-label', `${btn.dataset.peekLabel || 'Items'}, scroll for more`);
  }
  return pop;
}
/** Delegated on every screen by app.js (screens never wire it): a tap / Enter / Space on `[data-verified]` or `[data-peek]` toggles its
    popover, and is kept from reaching the host (a tailor row's "open tailor", a screen's own click handler). */
export function wirePopovers(root) {
  const hit = (e) => e.target.closest?.('[data-verified], [data-peek]');
  const openFor = (b) => (b.hasAttribute('data-peek') ? openGarmentPopover(b) : openVerifiedPopover(b));
  root.addEventListener('click', (e) => {
    const b = hit(e);
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    openFor(b);
  }, true);
  root.addEventListener('keydown', (e) => {
    const b = hit(e);
    if (!b || b.tagName === 'BUTTON' || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    e.stopPropagation();
    openFor(b);
  }, true);
}
/** K-15 name, kept for callers. */
export const wireVerified = wirePopovers;

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
    'When your order is ready, you pay the balance in the app. You’re charged when you get your items.'] }),   // K-27 (Study-1 A2); K-44 wording
  deposit: () => ({ title: 'About the deposit', lines: [
    'The deposit is held on your card, and charged only when the tailor accepts.',
    'It comes off your final total.',
    `Free cancellation until ${POLICY.CANCEL_WINDOW_H} hours before the visit. After that, the tailor keeps the deposit.`,
    'The day before, we text you to confirm. Once you confirm, the tailor keeps the deposit if you cancel or aren’t there.',   // SF-04 (K-41 / K-43)
    `If you don’t confirm ${POLICY.REMINDER_AUTOCANCEL_H} hours before the visit, we cancel it and the tailor keeps the deposit.`,
    'If the tailor cancels or doesn’t show up, you get it back in full.'] }),   // K-29 (Study-1 A5)
  fitting: (c) => ({ title: 'At the fitting', lines: [
    'You can add or remove items and services, and change prices.',
    `${c.first || 'The customer'} approves the final order before you start.`] }),
  fee: () => ({ title: 'The Taily fee', lines: [
    'Taily’s fee comes only from your service prices.',
    'Home visit and rush fees are yours in full.',
    'Customers pay for the courier. It never comes out of your payout.',
    `If a customer cancels within ${POLICY.CANCEL_WINDOW_H} hours, you keep their deposit, with no fee.`] }),
  payouts: () => ({ title: 'When you get paid', lines: [
    'Taily pays out every Friday for jobs completed before that day.',   // SF-31: complete = the customer has her order
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
export function avatar({ initials = '', photo = null, size = 'sm', glyph = false } = {}) {
  /* `glyph` (CR-m4): an empty well shows the hanger until initials exist (the customer preview of a profile being written) */
  if (glyph && !photo) return `<span class="avatar avatar--${size} avatar--glyph" aria-hidden="true">${initials ? esc(initials) : ICON_HANGER}</span>`;
  if (photo === true) {
    const inner = initials ? esc(initials) : ICON_CAMERA;
    return `<span class="avatar avatar--${size} avatar--photo avatar--placeholder" aria-hidden="true">${inner}</span>`;
  }
  const inner = photo ? `<img class="avatar__img" src="${esc(photo)}" alt="">` : esc(initials);
  return `<span class="avatar avatar--${size}${photo ? ' avatar--photo' : ''}" aria-hidden="true">${inner}</span>`;
}

/* ---------- tailor row ---------- */
/* K-19 glyphs: the mock's 20-grid line icons drawn at 16 */
const ROW_GLYPH = (paths) => `<svg class="icon-16" width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const ROW_ICONS = {
  home: ROW_GLYPH('<path d="M3 9 10 3.5 17 9"/><path d="M4.75 8v8.5h10.5V8"/><path d="M8.5 16.5v-4h3v4"/>'),
  shop: ROW_GLYPH('<path d="M10 17.5s5.5-4.6 5.5-9a5.5 5.5 0 0 0-11 0c0 4.4 5.5 9 5.5 9z"/><circle cx="10" cy="8.5" r="2"/>'),
  next: ROW_GLYPH('<rect x="3" y="4.5" width="14" height="12.5" rx="2.5"/><path d="M3 8.5h14"/><path d="M7 3v3M13 3v3"/>'),
};
/**
 * Tailor Row — one card per tailor in "Tailors near you" (K-19, option Q "Cognac rule").
 * Head: avatar · name + Verified check (icon only, K-15 popover) · "★ 4.9 (37)", or "N years tailoring" when there are no reviews · the
 * estimate ("$160" over "Est."; no fee lines). Then the tailor's `cardLine` as a margin note on a 2 px cognac rule (wraps, never truncated,
 * the card grows), then the facts: the place by visit type (shop: street · area · distance; home: "Comes to you · from <area>") and the
 * next opening. `quote` is the quote() object in cents ({ total, … }) or a bare total. Declined: dimmed, head + "Declined this request",
 * aria-disabled. Skeleton: skeleton({ kind: 'tailor-row' }).
 */
export function tailorRow({ id, name, initials, photo = null, verified = false, years = 0, rating = null, distanceMi = null, quote = 0, nextOpening = null, visitType = 'home', declined = false, format = fmt, booked = '', cardLine = '', street = '', hood = '' } = {}) {
  const q = typeof quote === 'number' ? { total: quote } : (quote ?? {});
  const yrs = Number(years) || 0;
  const slot = rating
    ? `<span class="tailor-row__rating"><span class="tailor-row__star" aria-hidden="true">★</span> ${esc(rating.avg)} <span class="tailor-row__rating-n">(${esc(rating.count)})</span></span>`
    : (yrs > 0 ? `<span class="tailor-row__rating tailor-row__rating--years">${yrs} ${yrs === 1 ? 'year' : 'years'} tailoring</span>` : '');
  const place = visitType === 'shop'
    ? [street, hood, distanceMi != null ? `${Number(distanceMi).toFixed(1)} mi` : ''].filter(Boolean).map((x) => esc(x)).join(' · ')
    : `Comes to you${hood ? ` · from ${esc(hood)}` : ''}`;
  const attrs = declined ? ' aria-disabled="true"' : ` data-act="open-tailor" data-id="${esc(id)}"`;
  /* the estimate is the focal element (R1-1-C-17): 24 / 600 tabular, "Est." under it */
  const est = declined ? '' : `<span class="tailor-row__quote" data-money><span class="tailor-row__amt">${format(q.total ?? 0)}</span><span class="tailor-row__est">Est.</span></span>`;
  const line = String(cardLine ?? '').trim();
  const next = nextOpening ? `<span class="tailor-row__fact tailor-row__fact--next"><span class="tailor-row__glyph">${ROW_ICONS.next}</span><span class="tailor-row__fact-t">Next opening ${nb(fmtWhen(nextOpening))}</span></span>` : '';
  const facts = declined ? '' : `<span class="tailor-row__facts"><span class="tailor-row__fact"><span class="tailor-row__glyph">${visitType === 'shop' ? ROW_ICONS.shop : ROW_ICONS.home}</span><span class="tailor-row__fact-t">${place}</span></span>${next}</span>`;
  return `<button type="button" class="tailor-row card${declined ? ' tailor-row--declined' : ''}${q.rush > 0 ? ' tailor-row--rush' : ''}"${attrs}>
  <span class="tailor-row__head">
    ${avatar({ initials, photo, size: 'sm' })}
    <span class="tailor-row__who">
      <span class="tailor-row__name-row"><span class="tailor-row__name">${esc(name)}</span>${verified ? verifiedCheck({ years, inline: true }) : ''}</span>
      ${slot}
    </span>
    ${est}
  </span>
  ${!declined && line ? `<span class="tailor-row__line" data-cardline>${esc(line)}</span>` : ''}
  ${facts}
  ${declined ? '<span class="tailor-row__note">Declined this request</span>' : ''}
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
export function countdown({ expiresAt, now, suffix = 'left', tail = '', line = false } = {}) {
  const ms = toMs(expiresAt) - toMs(now);
  const state = ms <= 0 ? 'expired' : ms <= POLICY.EXPIRING_SOON_MIN * 60000 ? 'soon' : 'normal';
  const text = state === 'expired' ? 'Expired' : `${fmtCountdown(ms)}${suffix ? ` ${suffix}` : ''}${tail ? ` · ${esc(tail)}` : ''}`;
  /* `line` (CR-4b): the countdown as the screen's one deadline line, "2h left · answer by 12:00 PM" (t-body 600, accent ink) */
  return `<span class="countdown countdown--${state}${line ? ' countdown--line' : ''}" role="timer" data-countdown data-state="${state}">${text}</span>`;
}

/**
 * Wait band — K-11 (D-236), Figma option 3 "Ochre band": the c-request header's one soft warning-bg band, status on the left
 * and the clock on the right ("2h left · until 12:00 PM"), above the title. `soon` (<= EXPIRING_SOON_MIN) adds a 2 px warning ring.
 * `status` = a statusPill; `clock` = a `countdown()` (role="timer").
 */
export function waitBand({ status = '', clock = '', soon = false } = {}) {
  return `<div class="wait-band${soon ? ' wait-band--soon' : ''}">${status}<span class="wait-band__clock">${META_ICONS.clock}${clock}</span></div>`;
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
 * `prefix` / `suffix` render inside the box ("$", "mi"). `labelEnd` (html) sits at the end of the label row, before the input
 * in DOM order (B5 P3-11: an ⓘ for the label, e.g. to-where's fee).
 */
export function field({ id, label, value = '', type = 'text', inputmode, autocomplete, placeholder = '', helper = '', error = '', prefix = '', suffix = '', maxlength, disabled = false, attrs = '', labelEnd = '' } = {}) {
  const msg = error || helper;
  const msgId = `${id}-msg`;
  return `<div class="field${error ? ' field--error' : ''}${disabled ? ' field--disabled' : ''}">
  ${labelEnd ? `<div class="field__label-row"><label class="field__label" for="${id}">${esc(label)}</label>${labelEnd}</div>` : `<label class="field__label" for="${id}">${esc(label)}</label>`}
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
 * todo neutral-200) with sr-only labels, `aria-current="step"` on the current one, under a "Step 2 of 5 · Where and when" label (K-04 / CR-6a, D-211).
 * `steps`: labels or { id, label }; `current` an index or id; `done` indices or ids.
 */
export function stepper({ steps = [], current = 0, done = [], variant = 'default' } = {}) {
  const ids = steps.map((s, i) => s?.id ?? i);
  const labels = steps.map((s) => s?.label ?? s);
  const ci = typeof current === 'number' ? current : Math.max(0, ids.indexOf(current));
  const state = (i) => (i === ci ? 'current' : (done.includes(i) || done.includes(ids[i])) ? 'done' : 'todo');
  if (variant === 'compact') {
    return `<nav class="stepper stepper--compact" aria-label="Booking progress">
  <p class="stepper__count t-small c-700 w-600">Step ${ci + 1} of ${steps.length} · ${esc(labels[ci] ?? '')}</p>
  <ol class="stepper__bar">${steps.map((_, i) => `<li class="stepper__seg stepper__seg--${state(i)}"${i === ci ? ' aria-current="step"' : ''}><span class="sr-only">${esc(labels[i])}</span></li>`).join('')}</ol>
</nav>`;
  }
  /* SF-42: a list a screen reader can walk — each step says its name and whether it is done; the current one is aria-current (same visuals) */
  return `<nav class="stepper" aria-label="Setup progress">
  <p class="stepper__text">Step ${ci + 1} of ${steps.length} · ${esc(labels[ci] ?? '')}</p>
  <ol class="stepper__bar">${steps.map((_, i) => `<li class="stepper__seg stepper__seg--${state(i)}"${i === ci ? ' aria-current="step"' : ''}><span class="sr-only">${esc(labels[i])}${state(i) === 'done' ? ', done' : ''}</span></li>`).join('')}</ol>
</nav>`;
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
export function actionBar({ ctaLabel = '', ctaAct = '', ctaSub = '', disabled = false, softDisabled = false, busy = false, busyLabel = '', lead = '', note = '', secondaryLabel = '', secondaryAct = '', secondaryIcon = '', tertiaryLabel = '', tertiaryAct = '', tertiaryTone = 'default' } = {}) {
  const noteId = `action-bar-note-${ctaAct || 'cta'}`;
  const leadId = `action-bar-lead-${ctaAct || 'cta'}`;
  const describe = !ctaSub && (disabled || softDisabled) && (note || lead) ? ` aria-describedby="${note ? noteId : leadId}"` : '';   // a two-line cta (K-46) is described by its own second line
  /* M7 (A5.9, D-195): the secondary and tertiary are text links under the one filled primary, in one centred row */
  const second = secondaryLabel ? textLink(secondaryLabel, { act: secondaryAct, disabled: busy, icon: secondaryIcon }) : '';
  const third = tertiaryLabel ? textLink(tertiaryLabel, { act: tertiaryAct, tone: tertiaryTone === 'danger' ? 'danger' : 'default', disabled: busy }) : '';
  return `<div class="action-bar${busy ? ' action-bar--busy' : ''}">
  ${lead ? `<p class="action-bar__lead t-small c-600" id="${leadId}">${lead}</p>` : ''}
  ${ctaLabel ? cta(ctaLabel, { disabled, softDisabled, busy, busyLabel, sub: ctaSub, subId: ctaSub ? `action-bar-sub-${ctaAct || 'cta'}` : '', attrs: `data-act="${ctaAct}"${describe}` }) : ''}
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
    'tailor-row': '<div class="skeleton__card skeleton__card--row"><span class="skeleton__who"><span class="skeleton__dot"></span><span class="skeleton__lines"><span class="skeleton__line skeleton__line--w60"></span><span class="skeleton__line skeleton__line--w40"></span></span><span class="skeleton__price"><span class="skeleton__line skeleton__line--w80"></span><span class="skeleton__line skeleton__line--w40"></span></span></span><span class="skeleton__note"><span class="skeleton__line skeleton__line--w80"></span><span class="skeleton__line skeleton__line--w60"></span></span><span class="skeleton__lower"><span class="skeleton__line skeleton__line--w60"></span><span class="skeleton__line skeleton__line--w80"></span></span></div>',
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
/** Study-1 C4: the home visit fee is flat — the customer rows' caption and the profile's helper sentence (one wording everywhere). */
export const HOME_FEE_CAPTION = 'Flat, per visit';
export const HOME_FEE_HELP = 'Charged once per home visit, no matter how long it takes.';
/** Deposit status words by the appointment's deposit state (payments.deposit.state). */
const DEPOSIT_STATUS = { 'to-hold': 'Held today', authorized: 'On hold', captured: 'Paid', released: 'Released', refunded: 'Refunded', kept: 'Kept' };
/** K-44 (D-302) · D-303: "when is the balance charged", by the way back — ONE map for every customer surface: the c-ready Pay caption
 * and pay sheet, the Balance row (ready + held stages), and after paying the c-booking head label + timeline line and the c-bookings
 * row caption, so none can drift. `chargedWhen` falls back to "Charged at handoff" while no way back is chosen. */
/** SF-33: the shop as one place line, skipping an empty business name — "Reyes Tailoring, 145 Bedford Ave" (+ city, state ZIP when `full`). */
export const shopPlace = (t, { full = false } = {}) => [t?.shopName, t?.shop?.street, full ? t?.shop?.unit : '', full && t?.shop ? `${t.shop.city}, ${t.shop.state} ${t.shop.zip}` : ''].filter(Boolean).join(', ');   // S-42: + suite / floor
export const CHARGE_CAPTION = { pickup: `Charged ${DATA.CHARGE_WHEN.pickup}`, courier: `Charged ${DATA.CHARGE_WHEN.courier}` };
export const chargedWhen = (wayBack) => CHARGE_CAPTION[wayBack] ?? 'Charged when you get it';   // SF-39: no way back chosen yet
/** The same timing inside a sentence: "You’ll be charged $144.00 at pickup." */
export const chargedPhrase = (wayBack) => DATA.CHARGE_WHEN[wayBack] ?? 'when you get it';
/**
 * The customer's breakdown by stage — estimate | booked | ready | paid. Zero rows are omitted.
 * `q` is the quote() object in cents. `tailorFirst` names whose prices the services are.
 * `depositState` (to-hold | authorized | captured | released | refunded | kept) takes the deposit status from the
 * appointment instead of the stage: a pending request is only a hold ("On hold"), accepted money is "Paid".
 * Without it, estimate reads "Due today" and every later stage reads "Paid".
 * The total reads "Estimated total" for `estimate` AND `booked` (D-49) until `confirmed` (the fitting or an approved price change).
 * `wayBack` (ready + held stages, D-303): pickup | courier once chosen — the Balance row then says when, in the Pay caption's words.
 */
export function customerBreakdown(q, { stage = 'estimate', tailorFirst = '', depositState = '', confirmed = false, refundState = '', servicesCaption = '', courierCaption = '', wayBack = '' } = {}) {
  const est = (stage === 'estimate' || stage === 'booked') && !confirmed;   // D-49: still an estimate until the fitting (or a price change) confirms it
  const deposit = depositState ? (DEPOSIT_STATUS[depositState] ?? 'Paid') : stage === 'estimate' ? 'Due today' : 'Paid';
  /* K-27 (Study-1 A2): `held` = picked a way back, the balance is on hold; `charged` = captured before the handoff (unclaimed after 7 days) */
  const settled = stage === 'paid' || stage === 'held' || stage === 'charged';
  const balance = (stage === 'ready' || stage === 'held') && q.balance === 0 ? 'Nothing to pay'
    : { paid: 'Paid', held: chargedWhen(wayBack), charged: 'Charged', ready: chargedWhen(wayBack) }[stage] ?? 'Due when ready';   // D-156; K-44 (D-302): the balance is never "On hold" / "Hold now" to her
  const rows = [
    { label: 'Services', cents: q.services, caption: servicesCaption || (tailorFirst ? `${tailorFirst}’s prices` : '') },
    q.homeFee > 0 && { label: 'Home visit fee', cents: q.homeFee, caption: HOME_FEE_CAPTION },
    q.rush > 0 && { label: 'Rush fee', cents: q.rush, caption: `Need-by ${q.rushDays ?? 1} day${(q.rushDays ?? 1) === 1 ? '' : 's'} after the visit` },
    q.courier > 0 && { label: 'Taily courier', cents: q.courier, ...(courierCaption ? { caption: courierCaption } : {}) },
    { label: est ? 'Estimated total' : 'Total', cents: q.total, kind: 'total' },
    { label: 'Deposit', cents: q.deposit, status: deposit },
    { label: 'Balance', cents: q.balance, status: balance },
    (stage === 'ready' || settled) && q.refund > 0 && { label: 'Refund to your card', cents: q.refund, status: refundState === 'refunded' || (!refundState && settled) ? 'Refunded' : 'After you choose' },   // D-156
  ].filter(Boolean);
  return moneyRows(rows);
}
/** The balance card's label for a receipt ("Visa •••• 4242", "Apple Pay"). */
export function balanceCardLabel(a, id = a.balanceCardId) {
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
  const order = a.lines?.length ? `<div class="receipt__order">${changeList({ garments: withPhotos(priceChangeView(a, a.lines).garments, a.job), docs: a.priceChange?.docs ?? null, commentLabel: `${tailorFirst || 'Tailor'}’s comment` })}</div>` : '';
  return `<div class="receipt__how">${metaRow('', esc(`${DATA.RETURN_LABEL[how]} · ${fmtDay(done)}`), { icon: { pickup: 'bag', courier: 'truck' }[how] })}</div>
  ${stitchDivider()}
  ${order}
  ${customerBreakdown(a.money, { stage: 'paid', tailorFirst, depositState: a.payments.deposit.state, confirmed: true, refundState: a.payments.refund?.state ?? '' })}
  ${cardLine ? `<p class="t-small c-600 receipt__card"${paid > 0 ? '' : ' data-money'}>${esc(cardLine)}</p>` : ''}`;
}
/** The tailor's breakdown — no courier row (D-04). One order everywhere (D-165, amends D-137): Services, the Taily fee (a negative
    row, "On the $125.00 of services only" — its base), Home visit fee, Rush fee, then the total. */
export function tailorBreakdown(q, { total = true } = {}) {
  /* D-172: the per-job figure is "Your payout"; "payout" is the bank transfer. `total: false` = the figure is already the card's hero (M6-P-33). */
  return moneyRows([
    { label: 'Services', cents: q.services },
    { label: 'Taily fee', cents: q.tailyFee, kind: 'negative', caption: `On the ${fmtExact(q.services)} of services only` },
    q.homeFee > 0 && { label: 'Home visit fee', cents: q.homeFee },
    q.rush > 0 && { label: 'Rush fee', cents: q.rush },
    total && { label: 'Your payout', cents: q.payout, kind: 'total' },
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
  { id: 'payouts', label: 'Background check and payouts', screen: 'to-payouts' },   // DG-4 (D-350): consent + the hosted payout step
];

/** SF-43: the line under the intro of every live-shop editor (services, where, returns, availability, rush): what a save changes. */
export const editScopeNote = () => '<p class="t-small c-600 edit-scope" data-edit-scope>Changes apply to new requests. Jobs you’ve already booked keep their price, place and times.</p>';

/** SF-43: the resume banner's one sentence on every onboarding step — "3 of 6 steps done. 3 to go before customers can book you." */
export function resumeText(tailor) {
  const done = ONBOARDING_STEPS.filter((s) => tailor?.onboarding?.[s.id]).length;
  return `${done} of ${ONBOARDING_STEPS.length} steps done. ${ONBOARDING_STEPS.length - done} to go before customers can book you.`;
}

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

/* ============================================================
   DG-4, option B (K-48: D-05 / D-06, Kevin Oct 18; D-350…D-355) — the four checks behind the Verified check.
   Onboarding collects them (ID with the profile photo and years on Profile; background consent + the payments partner's hosted
   payout step on step 6); the checklist lives on Shop (and to-done) with one status dot per check and the one action she can take.
   ============================================================ */
/** How long we say the review takes (copy, not a timer). */
export const REVIEW_TIME = '1 to 2 days';
const CHECK_PILL = { verified: 'check-verified', pending: 'check-pending', 'needs-info': 'check-needs', 'not-started': 'check-todo', waitlist: 'check-waitlist' };
const yearsWord = (n) => `${n} ${Number(n) === 1 ? 'year' : 'years'}`;
/** One check in the tailor's words: `{ sub, pill, pillLabel, act }` — `act` = the one thing she can do about it ('' when nothing). */
export function checkWords(t, id) {
  const st = checkState(t, id);
  const p = t?.payouts ?? {};
  const out = { sub: '', pill: CHECK_PILL[st] ?? 'check-todo', pillLabel: undefined, act: '' };
  if (id === 'id') {
    out.sub = st === 'verified' ? `Matched ${fmtDay(t.verify.id.at)}` : { pending: 'We’re matching your ID to your profile photo', 'needs-info': 'Your ID didn’t match your photo. Add it again', 'not-started': 'Add a photo ID to your profile' }[st];
    if (st === 'needs-info' || st === 'not-started') out.act = 'check-id';
  } else if (id === 'background') {
    out.sub = st === 'verified' ? `Cleared ${fmtDay(t.verify.background.at)}` : { pending: `Usually ${REVIEW_TIME}. We’ll text you`, 'needs-info': 'We need a few more details. Check your texts', 'not-started': 'Agree to start it' }[st];
    if (st === 'not-started') out.act = 'check-background';
  } else if (id === 'years') {
    out.sub = st === 'not-started' ? 'Add it to your profile' : st === 'waitlist' ? `${yearsWord(t.years)} · Taily tailors have at least ${DATA.TAILOR_LIMITS.YEARS_MIN}` : yearsWord(t.years);
    if (st !== 'verified') out.act = 'check-years';
  } else if (id === 'payout') {
    if (p.status === 'paused') { out.pill = 'paused'; out.pillLabel = 'Paused'; out.sub = 'Confirm your tax info to get paid'; out.act = 'check-payout'; return out; }
    out.sub = { verified: `${p.bank} •••• ${p.last4} · paid Fridays`, pending: 'Our payments partner is checking your details', 'needs-info': 'Your date of birth doesn’t match your SSN. Fix it', 'not-started': 'Set it up with our payments partner' }[st];
    if (st === 'needs-info' || st === 'not-started') out.act = 'check-payout';
  }
  return out;
}
/** "2 of 4 checks passed" / "All 4 checks passed". */
export function checksLine(t) {
  const v = verifyView(t);
  return v.allPassed ? `All ${v.total} checks passed` : `${v.passed} of ${v.total} checks passed`;
}
/** The checklist (one .card--list): each check's label, what it waits on, its status dot. A check she can act on is a button
    (`data-act` = check-id | check-background | check-years | check-payout); `interactive: false` = read-only rows. */
export function verifyChecklist(t, { interactive = true } = {}) {
  const v = verifyView(t);
  return `<div class="card card--list verify-list" data-checks="${v.passed}">${v.items.map((it) => {
    const w = checkWords(t, it.id);
    return listRow({ title: esc(it.label), sub: esc(w.sub), right: statusPill(w.pill, w.pillLabel), act: interactive ? w.act : '' });
  }).join('')}</div>`;
}
/** The Shop's / Home's one-line state while she isn't listed yet: a pill word over the checks count. */
export function reviewPill(t) {
  const v = verifyView(t);
  if (v.items.some((i) => i.state === 'waitlist')) return statusPill('check-waitlist', 'On the waitlist');
  if (v.needsYou.length) return statusPill('check-needs', `Needs you · ${v.passed} of ${v.total} checks`);
  return statusPill('under-review', `Under review · ${v.passed} of ${v.total} checks`);
}

/** DG-4 (D-354 counsel): the background-check disclosure — PLACEHOLDER copy, final FCRA disclosure + authorization, summary of rights and
    the NYC Fair Chance Act notice come from counsel (docs/v5/COUNSEL.md). Shown as its own sheet (a stand-alone disclosure). */
export const BACKGROUND_DISCLOSURE = [
  'Before customers can book you, Taily orders a background check (a consumer report) from a background check company. It confirms who you are and looks at criminal records.',
  'You can ask for a copy of the report and dispute anything in it that’s wrong. In New York City, Taily follows the Fair Chance Act: if something in the report might matter, we tell you and give you time to respond before we decide.',
];
export const COUNSEL_DRAFT = 'Draft for counsel: the final disclosure, authorization and summary of your rights go here.';
export function disclosureHtml() {
  return `<div class="disclosure">${BACKGROUND_DISCLOSURE.map((p) => `<p class="t-body c-700">${esc(p)}</p>`).join('')}<p class="t-small c-600 disclosure__draft" data-counsel>${esc(COUNSEL_DRAFT)}</p></div>`;
}
/** The disclosure sheet (dataS `background-disclosure`). `agree` (Shop: the check isn't started) adds the consent box + "Agree and start the
    check"; without it the sheet only reads (to-payouts keeps its own box on the page). `onDone(result)` after a consent. */
export function openBackgroundSheet({ agree = false, onDone } = {}) {
  const body = (err = '') => `${disclosureHtml()}${agree ? `<div class="disclosure__agree">${checkRow({ id: 'bg-sheet-consent', label: 'I agree to a background check', caption: 'I’ve read the disclosure above.', error: err })}</div>
    <div class="disclosure__go">${cta('Agree and start the check', { attrs: 'data-act="bg-agree"' })}</div>` : ''}`;
  sheetOverlay(`<div class="disclosure-sheet" data-disclosure>${body()}</div>`, { header: 'Background check', dataS: 'background-disclosure', confirm: false }, (holder, close) => {
    holder.addEventListener('click', (e) => {
      if (!e.target.closest('[data-act="bg-agree"]')) return;
      const box = holder.querySelector('#bg-sheet-consent');
      if (!box?.checked) {
        holder.querySelector('[data-disclosure]').innerHTML = body('Tick the box to agree.');
        holder.querySelector('#bg-sheet-consent')?.focus();
        return;
      }
      const r = T.consentBackground(true);
      close({ instant: true });
      onDone?.(r);
    });
  });
}
/** "Add your photo ID" (dataS `id-upload`): take or choose a photo of the ID; `onPick()` stores it (the profile draft, or T.uploadId on Shop). */
export function openIdSheet(onPick) {
  const html = `<p class="t-body c-700 id-sheet__lead">We match your ID to your profile photo. Only Taily sees it, never customers.</p>
<div class="card card--list">${listRow({ title: 'Take a photo of your ID', act: 'id-take' })}${listRow({ title: 'Choose from library', act: 'id-library' })}</div>`;
  sheetOverlay(html, { header: 'Your photo ID', dataS: 'id-upload', confirm: false }, (holder, close) => {
    const pick = () => { close({ instant: true }); onPick?.(); };
    holder.querySelector('[data-act="id-take"]').addEventListener('click', pick);
    holder.querySelector('[data-act="id-library"]').addEventListener('click', pick);
  });
}
/** What the payments partner asks for (to-payouts before the hand-off). */
export function secureSetupCard() {
  return `<div class="card secure-setup">
  <p class="t-body w-600 secure-setup__title">Our payments partner sets up your payouts</p>
  <p class="t-small c-600">It takes about 5 minutes. You’ll need:</p>
  <ul class="secure-setup__list">
    <li class="t-body c-700">Your legal name and date of birth</li>
    <li class="t-body c-700">Your SSN or EIN, for your W-9 and 1099-K</li>
    <li class="t-body c-700">The bank account for Friday payouts</li>
  </ul>
  <p class="t-small c-600">Taily never sees your full SSN or account number.</p>
</div>`;
}
/** The partner's three rows after the hand-off: Identity · Tax info (W-9) · Bank account, each with its status dot. */
export function payoutRows(t, { interactive = false } = {}) {
  const p = t?.payouts ?? {};
  const IDW = { verified: ['check-verified', 'Done'], verifying: ['check-pending', 'Verifying'], 'needs-info': ['check-needs', 'Needs info'], 'not-started': ['check-todo', 'Not started'] };
  const TAXW = { verified: ['check-verified', 'Done'], received: ['check-verified', 'Done'], 'needs-info': ['check-needs', 'Needs info'], 'not-started': ['check-todo', 'Not started'] };
  const idw = IDW[p.identity] ?? IDW['not-started'];
  const taxw = TAXW[p.tax] ?? TAXW['not-started'];
  const fix = interactive && (p.identity === 'needs-info' || p.tax === 'needs-info') ? 'fix-payout' : '';
  return `<div class="card card--list payout-rows">
  ${listRow({ title: 'Identity', sub: p.identity === 'needs-info' ? 'Date of birth doesn’t match' : 'Name, date of birth, SSN', right: statusPill(idw[0], idw[1]), act: p.identity === 'needs-info' ? fix : '' })}
  ${listRow({ title: 'Tax info (W-9)', sub: p.tax === 'needs-info' ? `Confirm by ${fmtDay(p.issueDue ?? '')}` : p.taxAt ? `Received ${fmtDay(p.taxAt)}` : 'Your W-9', right: statusPill(taxw[0], taxw[1]), act: p.tax === 'needs-info' ? fix : '' })}
  ${listRow({ title: 'Bank account', sub: p.last4 ? `${esc(p.bank)} •••• ${esc(p.last4)} · paid Fridays` : 'For Friday payouts', right: statusPill(p.last4 ? 'check-verified' : 'check-todo', p.last4 ? 'Done' : 'Not started') })}
</div>`;
}

/**
 * Text area — the field chassis (label, inset box, helper / error) plus a live "n / max" counter. No `maxlength` by default
 * (a paste must be able to show the over-max error). The counter is `data-count` (screens update it in place on
 * `input`); over max it turns --error. states: empty · typing · over max · error.
 * Study-1 C1–C2: `placeholder` = grey example text (native, never a value). `maxlength` = a hard stop (wire it with
 * `wireTextLimit`): typing stops at it, a paste is cut to fit with `notice` ("Trimmed to 110 characters.", live) under the box,
 * and AT the limit the counter and the box ring take the error tone while the field stays valid (`.text-area--full`).
 */
/* P-27 (D-362): `section: true` = the label reads as a section title (16 / 600 ink), a variant instead of a screen override (c-review). */
export function textArea({ id, label, value = '', rows = 4, max, maxlength = null, placeholder = '', notice = '', helper = '', error = '', section = false } = {}) {
  const msg = error || helper;
  const msgId = `${id}-msg`;
  const countId = `${id}-count`;
  const n = [...String(value ?? '')].length;
  const cap = maxlength ?? max;
  const over = cap != null && n > cap;
  const full = maxlength != null && n >= maxlength;
  const describedBy = [msg ? msgId : '', cap != null ? countId : '', maxlength != null ? `${id}-notice` : ''].filter(Boolean).join(' ');
  return `<div class="field text-area${error ? ' field--error' : ''}${full ? ' text-area--full' : ''}">
  <label class="field__label${section ? ' field__label--section' : ''}" for="${id}">${esc(label)}</label>
  <div class="field__box text-area__box">
    <textarea class="text-area__input" id="${id}" name="${id}" rows="${rows}"${maxlength != null ? ` maxlength="${maxlength}" data-maxlength="${maxlength}"` : ''}${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}${error ? ' aria-invalid="true"' : ''}${describedBy ? ` aria-describedby="${describedBy}"` : ''}>${esc(value)}</textarea>
  </div>
  <div class="text-area__foot">
    ${maxlength != null ? `<div class="text-area__foot-text">${msg ? `<p class="field__msg${error ? ' field__msg--error' : ''}" id="${msgId}"${error ? ' role="alert"' : ''}>${esc(msg)}</p>` : ''}<p class="text-area__notice t-small w-600 c-700" id="${id}-notice" aria-live="polite" data-notice>${esc(notice)}</p></div>`
    : msg ? `<p class="field__msg${error ? ' field__msg--error' : ''}" id="${msgId}"${error ? ' role="alert"' : ''}>${esc(msg)}</p>` : '<span></span>'}
    ${cap != null ? `<span class="text-area__count t-small c-600${over || full ? ' text-area__count--over' : ''}" id="${countId}" data-count data-max="${cap}" aria-live="off">${n} / ${cap}</span>` : ''}
  </div>
</div>`;
}

/**
 * Service row — a checkbox row; when checked, a whole-dollar `$` price input (`#price-<id>`) with the payout slot directly under it,
 * right-aligned (K-45, D-303): "Your payout: $22.50" (`data-take`, live as she types), "Your payout: —" while there is no usable price
 * (sr-only "not set yet"), and the error ("Enter a price.") in the same slot. No Taily fee on the row — the screen states it once above
 * the list. `payoutText` = the amount already formatted for its column (money.js `fmtColumn`, D-70); default `fmt(payoutCents)`.
 * `range` (Study-1 C3): the "Most NYC tailors charge $20–$30." line under the garments caption, ticked or not (`data-range`); the
 * amount range is one unbreakable run, so a narrow column breaks only before it.
 * states: unchecked · checked, empty · checked with price + payout · error.
 */
/** The payout slot's words: "Your payout: $22.50", or "Your payout: —" + sr-only "not set yet" before a price (K-45). */
export const takeHtml = (take) => `Your payout: ${take ? take : '<span aria-hidden="true">—</span><span class="sr-only">not set yet</span>'}`;
/** The payout slot under a service row's price box (`data-take`); the screen repaints its innerHTML with `takeHtml` as she types. */
export const servicePay = (id, take = '') => `<p class="service-row__pay t-small c-600 tabular" id="price-${esc(id)}-pay" data-money data-take>${takeHtml(take)}</p>`;
/** "Most NYC tailors charge $20–$30." with the amount range (and its full stop) kept on one line. */
const rangeHtml = (range) => esc(range).replace(/(\S*\$\S*)$/, '<span class="nb">$1</span>');
export function serviceRow({ id, label, caption = '', checked = false, price = '', payoutCents = null, payoutText = '', error = '', range = '' } = {}) {
  const take = payoutCents == null ? '' : (payoutText || fmt(payoutCents));
  /* caption as a list (garment types) → one nowrap span per item with its " ·" kept inside (no-break space), and a plain
     space between spans: a line only breaks between whole names and never starts with a "·" */
  const captionHtml = Array.isArray(caption)
    ? caption.map((c, i) => `<span class="service-row__part">${esc(c)}${i < caption.length - 1 ? '\u00a0·' : ''}</span>`).join(' ') : '';
  const pid = `price-${esc(id)}`;
  return `<div class="service-row-wrap${error ? ' service-row-wrap--error' : ''}" data-service="${esc(id)}">
  <div class="service-row${checked ? ' service-row--on' : ''}">
    <div class="service-row__check">${checkRow({ id: `svc-${id}`, label, caption: Array.isArray(caption) ? '' : caption, captionHtml, checked, attrs: `data-act="svc" data-id="${esc(id)}"` })}
    ${range ? `<p class="service-row__range t-small c-600 tabular" data-money data-range>${rangeHtml(range)}</p>` : ''}</div>
    ${checked ? `<div class="service-row__price">
      <div class="field__box service-row__box${error ? ' service-row__box--error' : ''}">
        <span class="field__affix" aria-hidden="true">$</span>
        <input class="field__input" id="${pid}" name="${pid}" type="text" inputmode="numeric" autocomplete="off" value="${esc(price)}" aria-label="Price for ${esc(label)}"${error ? ` aria-invalid="true" aria-describedby="${pid}-msg"` : ` aria-describedby="${pid}-pay"`}>
      </div>
      ${error ? `<p class="field__msg field__msg--error service-row__pay" id="${pid}-msg" role="alert">${esc(error)}</p>` : servicePay(id, take)}
    </div>` : ''}
  </div>
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
export function customerPreview({ title = 'What customers see', head = '', html = '', caption = '', sticky = false } = {}) {
  /* `head` (B5 P3-9): a short caps word shown instead of the sentence title, which stays the section's accessible name.
     `sticky` (Study-1 C1): pinned to the top of the viewport on the page ground while the fields under it scroll. */
  return `<section class="customer-preview${sticky ? ' customer-preview--sticky' : ''}" aria-label="${esc(title)}">
  <p class="customer-preview__title t-caps c-600">${esc(head || title)}</p>
  <div class="customer-preview__body" role="group" aria-disabled="true" inert>${html}</div>
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
  ${avatar({ initials, photo, size: 'md', glyph: true })}
  <div class="mini-profile__text">
    <p class="t-body w-600${n ? '' : ' c-500'}" data-pv="name">${esc(n || 'Your name')}</p>
    <p class="t-small c-600" data-pv="shop"${sh ? '' : ' hidden'}>${esc(sh)}</p>
    ${bio == null ? '' : `<p class="t-small c-700 mini-profile__bio" data-pv="bio"${String(bio).trim() ? '' : ' hidden'}>${esc(String(bio).trim())}</p>`}
  </div>
</div>`;
}

/** The customer's "Getting it back" rows (c-tailor), one metaRow per return option she offers. `returns` = { pickup,
    courier } (K-37: no drop-off). `empty` (string) renders when nothing is ticked; '' renders nothing. */
export function returnsRows(returns = {}, { empty = '' } = {}) {
  const rows = [];
  if (returns?.pickup) rows.push(metaRow('', 'In-store pickup · Free', { icon: 'bag' }));
  if (returns?.courier) rows.push(metaRow('', 'Taily courier — priced when your order is ready, before you pay', { icon: 'truck' }));
  if (!rows.length) return empty ? `<p class="returns-rows returns-rows--empty t-body c-600">${esc(empty)}</p>` : '';
  return `<div class="returns-rows">${rows.join('')}</div>`;
}

/**
 * Rush ladder — the one-line rush-fee ladder ("need-by 1 day after the visit +$40 · 2 days after +$25 · … · 4+ days after no
 * rush fee", CP-S02). One nowrap span per tier, so the line breaks between tiers, never inside one. `rush` = [{ days, fee }]
 * (fee in whole dollars). Empty → "No rush fees."
 */
export function rushLadder(rush = []) {
  const ladder = [...(rush ?? [])].sort((a, b) => a.days - b.days);
  if (!ladder.length) return '<span class="rush-ladder" data-money>No rush fees.</span>';
  /* M7 (A5.15): a flat two-column list — the window left, the fee right — never a "·" chain */
  const tier = (left, right) => `<span class="rush-tier"><span class="rush-tier__when">${left}</span><span class="rush-tier__fee">${right}</span></span>`;
  const rows = ladder.map((r, i) => tier(i === 0 ? `Need-by ${r.days} day${r.days === 1 ? '' : 's'} after the visit` : `${r.days} day${r.days === 1 ? '' : 's'} after`, `+${fmt(cents(r.fee))}`));
  rows.push(tier(`${ladder[ladder.length - 1].days + 1}+ days after`, 'No rush fee'));
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

const STRIP_TONES = ['warn', 'action', 'done', 'calm'];
/**
 * The K-11 request strip (D-236), shared by the t-home request card and the t-request screen (K-15): a full-width band with a clock —
 * warning by default, error at <= EXPIRING_SOON_MIN, neutral once expired (K-13: a suggested strip leads with the proposal and ends with the
 * clock). `lead` prefixes the requested text ("New request · "); `text` + `tone` force a fixed line for an ended request (declined, expired);
 * `page` bleeds it across the screen under the nav (K-15) instead of across a card. Empty string when there is nothing to show.
 */
export function requestStrip(opts = {}) {
  const html = stripHtml(opts);
  /* SF-19: the page's one state strip is named for the router (announce + the h1's description) */
  return opts.page && html ? html.replace(/^<(div|span) /, '<$1 id="page-strip" ') : html;
}
function stripHtml({ status = 'requested', expiresAt = null, now = null, lapseAt = null, when = '', lead = '', text = '', tone: forced = '', page = false, icon = 'clock', right = '' } = {}) {
  const suggested = status === 'suggested';
  const ms = suggested || expiresAt == null ? null : toMs(expiresAt) - toMs(now);
  const lapseMs = suggested && lapseAt ? toMs(lapseAt) - toMs(now) : null;
  const sugClock = lapseMs == null ? '' : lapseMs <= 0 ? 'Expired' : fmtCountdown(lapseMs);
  const stripMs = suggested ? lapseMs : ms;
  const tone = forced || (stripMs == null ? (suggested ? 'normal' : '') : stripMs <= 0 ? 'expired' : stripMs <= POLICY.EXPIRING_SOON_MIN * 60000 ? 'urgent' : 'normal');
  if (!tone) return '';
  const attrs = `data-countdown data-state="${tone === 'urgent' ? 'soon' : tone}"`;
  const pageCls = page ? ' request-card__strip--page' : '';
  /* K-17 (D-242): a STATE strip on a status screen (t-job, c-price-change): `tone` warn (waiting on the other side) | action (your move) | done | calm,
     `icon` a STRIP_ICONS key, `text` the one line that states the state, `right` an optional fact at the far end (when it was sent, days left). */
  if (STRIP_TONES.includes(forced)) {
    /* K-17 (D-243, #6): a state strip with `lapseAt` carries the hold deadline as its countdown ("23h left · by 10:00 AM"), so no sentence repeats it;
       a waiting (warn) strip turns error-toned inside EXPIRING_SOON_MIN, like the request strip. */
    let shown = forced; let end = right;
    if (lapseAt != null && !right) {
      const left = toMs(lapseAt) - toMs(now);
      end = left <= 0 ? 'Expired' : `${fmtCountdown(left)} left · by ${isoDay(lapseAt) === isoDay(toMs(now)) ? fmtTime(lapseAt) : `${dayWord(lapseAt, toMs(now))} ${fmtTime(lapseAt)}`}`;   // SF-35: a deadline on another day names it
      if (forced === 'warn' && left > 0 && left <= POLICY.EXPIRING_SOON_MIN * 60000) shown = 'urgent';
    }
    return `<div class="request-card__strip request-card__strip--${shown}${pageCls}${end ? ' request-card__strip--split' : ''}" data-strip="${forced}">${STRIP_ICONS[icon] ?? ''}<span class="request-card__strip-lead">${esc(text)}</span>${end ? `<span class="request-card__strip-clock">${esc(end)}</span>` : ''}</div>`;
  }
  if (text) return `<span class="request-card__strip request-card__strip--${tone}${pageCls}" ${attrs}>${META_ICONS.clock}<span>${esc(text)}</span></span>`;
  if (suggested) return `<span class="request-card__strip request-card__strip--suggest request-card__strip--${tone}${pageCls}" ${attrs}><span class="request-card__strip-lead">You suggested ${esc(when)}</span>${sugClock ? `<span class="request-card__strip-clock">${META_ICONS.clock}<span>${sugClock}</span></span>` : ''}</span>`;
  return `<span class="request-card__strip request-card__strip--${tone}${pageCls}" ${attrs}>${META_ICONS.clock}<span>${tone === 'expired' ? 'Expired' : `${lead}${fmtCountdown(ms)} left to answer · by ${fmtTime(expiresAt)}`}</span></span>`;
}

/**
 * The request header row (K-12 Option A, K-15): avatar | name (+ the visit line on the card) | payout amount over "Your payout". One markup for the
 * t-home card (inside its <button>, spans) and the t-request screen (`page`: the name is the h1, a 28 serif title; `info` makes the payout column
 * a button that opens the Taily-fee sheet, label + ⓘ). The customer carries no Verified check (K-15) — only tailors do.
 */
export function requestHead({ name = '', initials = '', where = '', again = false, payoutCents = 0, label = 'Your payout', page = false, info = false, infoLabel = 'The Taily fee', check = '', lines = [], trail = '' } = {}) {
  const nameHtml = `${esc(name)}${again ? '<span class="request-card__again t-small c-600">Sent again</span>' : ''}`;
  const h1 = `<h1 class="request-card__name t-title">${nameHtml}</h1>`;
  const who = page
    ? `<div class="request-card__who">${check ? `<span class="request-head__name">${h1}${check}</span>` : h1}${where}</div>`
    : `<span class="request-card__who"><span class="request-card__name t-body w-600">${nameHtml}</span>${where}</span>`;
  const cap = `${esc(label)}${info ? ICON_INFO : ''}`;
  /* K-17 (D-242): `lines` = supporting facts under the amount, one per line ("Was $147.50 · up $40.50"); `trail` = HTML in place of the amount (a Message button) */
  const sub = lines.map((l) => `<span class="request-head__sub t-small c-600">${esc(l)}</span>`).join('');
  const pay = trail ? `<span class="page-head__trail">${trail}</span>` : info
    ? `<button type="button" class="request-card__payside request-head__pay" data-info="fee" aria-haspopup="dialog" aria-label="${esc(`${label} ${fmtExact(payoutCents)}. ${infoLabel}`)}" data-money><span class="request-card__amount t-money t-money--md">${fmtExact(payoutCents)}</span><span class="request-head__label t-small c-600">${cap}</span></button>`
    : `<span class="request-card__payside" data-money><span class="request-card__amount t-money t-money--md">${fmtExact(payoutCents)}</span><span class="t-small c-600">${cap}</span>${sub}</span>`;
  return `<span class="request-card__top">${avatar({ initials, size: 'sm' })}${who}${pay}</span>`;
}

/**
 * Request Card — the tailor's inbox ticket (t-home "New requests"). One <button>: avatar + name + "<visit> · <place>" with
 * a "Waiting on <name>" pill (suggested), then the visit time + "n items · n services", then
 * the focal payout: YOUR PAYOUT / `fmtExact(payoutCents)`. A requested card opens with the K-11 flush timer strip. Amounts are cents.
 * States: requested · soon (countdown <= EXPIRING_SOON_MIN → error strip) · expired (neutral strip) · suggested (muted money) · retried ("Sent again").
 */
export function requestCard({ id = '', act = 'open-request', name = '', initials = '', visitLabel = '', place = '', when = '', items = 0, services = 0, payoutCents = 0, feeCents = 0, expiresAt = null, now = null, status = 'requested', waitingOn = '', retries = 0, asked = '', lapseAt = null, garment = '', garments = [] } = {}) {
  const suggested = status === 'suggested';
  /* D-154: a suggested time lapses (`lapseAt`) — the same clock a request has, so she sees how long Sarah has. */
  const right = suggested ? (lapseAt ? countdown({ expiresAt: lapseAt, now, suffix: `for ${esc(waitingOn || 'the customer')} to answer` }) : '') : countdown({ expiresAt, now });
  /* K-11 (D-236), Option 1 "Flush band": a requested card opens with a full-width strip — clock + "2h left to answer · by 12:00 PM"
     (warning; error at <= EXPIRING_SOON_MIN; neutral once expired). K-13: a suggested card's strip leads with the proposal and ends with the clock. */
  const strip = requestStrip({ status, expiresAt, now, lapseAt, when });
  const label = suggested
    ? `${name}, you suggested ${when}${asked ? `, ${asked}` : ''}, your payout ${fmtExact(payoutCents)}${right ? `, ${right.replace(/<[^>]+>/g, '')}` : ''}`
    : `${name}, ${when}, your payout ${fmtExact(payoutCents)}, ${right.replace(/<[^>]+>/g, '')}`;
  const cls = `request-card card${suggested ? ' request-card--suggested' : ''}${strip ? ' request-card--strip' : ''}`;
  /* K-25: a stretched-link card — the card's one action is `.request-card__link` (a button laid over the whole card), so the count cluster can be
     a real button of its own above it (no nested controls). The face is aria-hidden: the link's label says it all, as the old card button did. */
  const link = `<button type="button" class="request-card__link" data-act="${esc(act)}" data-id="${esc(id)}" aria-label="${esc(label)}"></button>`;
  const hide = (html) => html.replace(/^(\s*<\w+)/, '$1 aria-hidden="true"');
  const where = `<span class="request-card__where t-small c-600"><span class="request-card__visit">${esc(visitLabel)}</span><span class="request-card__place">${esc(String(place).replace(/\s·\s/g, '\u2009'))}</span></span>`;
  /* K-12 (D-237), Option A "Payout beside the name": header = avatar | who | payout + "Your payout"; a hairline; ONE line; no footer.
     K-13 (D-238), option F "The proposal leads the bar": a suggested card shares that structure — its flush strip reads "You suggested <when>" with a clock +
     the countdown for the customer to answer at its right end; the line reads "<Sarah asked for 5:00 PM>" beside the garments; the payout is greyed (pending);
     no status word (the t-home section header says "Waiting on Sarah").
     K-25: `garments` = `{ type, services }` items (every item, in order) make the count cluster ONE trigger for the garment popover listing them all;
     bare type strings (the gallery) keep a plain cluster. */
  const peekItems = garments.filter((g) => g && typeof g === 'object');
  const typeList = garments.length ? garments.map((g) => (typeof g === 'string' ? g : g.type)) : garment ? [garment] : [];
  const types = [...new Set(typeList)];
  const icons = types.map((t) => garmentIcon(t, { size: 'inline' })).join('');
  const left = suggested ? (asked ? `<span class="request-card__asked" aria-hidden="true">${esc(asked)}</span>` : '<span></span>') : `<span class="request-card__when w-600" aria-hidden="true">${esc(when)}</span>`;
  const countText = `${plural(items, 'item')} · ${plural(services, 'service')}`;
  const iconsHtml = icons ? `<span class="request-card__icons">${icons}</span>` : '';
  const owner = `${String(name).split(' ')[0] || 'The customer'}’s order`;
  const count = peekItems.length
    ? `<button type="button" class="request-card__count peek-cluster" ${peekAttrs(peekItems, owner)} aria-label="${esc(`${plural(items, 'item')}, ${plural(services, 'service')}: show what’s in the order`)}">${iconsHtml}<span class="peek-cluster__count">${countText}</span></button>`
    : `<span class="request-card__count" aria-hidden="true">${iconsHtml}<span>${countText}</span></span>`;
  return `<div class="${cls}" data-id="${esc(id)}">${link}
  ${strip ? hide(strip) : ''}${hide(requestHead({ name, initials, where, again: retries > 0, payoutCents }))}
  <span class="request-card__line t-small c-700">
    ${left}
    ${count}
  </span>
</div>`;
}

/** "The work" list (R3-1-T-05): garments with their services and the estimate. One render for t-request and t-job.
    `v` = requestView(appt). Every amount prints with cents (D-98): the screen's payout breakdown below is exact, and one figure
    keeps one precision per screen. K-04 (D-206 / D-207): each garment head is `garmentHead` (name, underlined, then the icon) with the
    photo stack at its right end: the fitting photos once the garment has them (`docs: true`, `g.docs`), else the customer's own
    (`g.photos`), tapped through `wirePhotoViewer` / `wireGarmentDocs`. */
export function workList(v, { final = false, estimateLabel = 'Estimate from your prices', docs = false, commentLabel = 'Your comment', photoOwner = '' } = {}) {
  /* M6-P-07: a `final` list (the work is over: declined, cancelled, completed, expired) has no estimate row; `estimateLabel: null`
     drops it too, for a screen whose payout breakdown follows (Services and the total are printed there).
     K-02: `docs: true` adds the tailor's comment from `g.docs` after the garment's service rows. */
  const showEstimate = !final && estimateLabel !== null;
  const owner = photoOwner || `${String(v.customer?.name || 'The customer').split(' ')[0]}’s`;
  const groups = v.garments.map((g) => `<div class="work-list__garment" data-garment="${esc(g.id)}">
    ${garmentHead({ type: g.type, photos: stackFor(g, { docs: docs ? g.docs : null, owner }), services: g.services.map((sv) => sv.label) })}
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
/** Wire the placeholder photo viewer. Call from a screen's `wire`. Routes `[data-act="view-photo"]` (a chat photo, a "more work" tile) and the
    customer-photos `photoStack` (`[data-act="view-photos"][data-source="customer"]`, K-04 / D-207); the fitting stack goes to `wireGarmentDocs`. */
export function wirePhotoViewer(root) {
  root.addEventListener('click', (e) => {
    const stack = e.target.closest('[data-act="view-photos"][data-source="customer"]');
    const el = stack ?? e.target.closest('[data-act="view-photo"]');
    if (!el || e.target.closest('.screen-sheet--overlay')) return;
    /* chat bubbles and the stack carry a ready-made data-title; a garment thumbnail builds "<type> · photos" */
    openPhotoViewer({ title: el.dataset.title || `${el.dataset.type} · ${el.dataset.count === '1' ? 'photo' : 'photos'}`, count: Number(el.dataset.count), type: stack ? el.dataset.type : el.dataset.garment || el.dataset.type });
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
 * K-04 (D-206 / D-207): every garment head is `garmentHead` (icon, then the name underlined, then the tag) with the photo stack at its right
 * end: `docs` = { [garmentId]: entry } (the sent snapshot) puts the fitting photos there, else the garment's own `photos` (the customer's, a
 * count the caller maps from `a.job.garments`; `photoOwner` 'Your' | 'Sarah’s' names them in the viewer). A kept entry's comment follows the rows.
 */
export function changeList({ garments = [], format = fmtExact, docs = null, commentLabel = 'Comment', photoOwner = 'Your' } = {}) {
  const tag = (text, tone) => `<span class="change-list__tag change-list__tag--${tone} t-small w-600">${text}</span>`;
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
      amt = `<s class="change-list__amt change-list__amt--struck t-body"><span class="sr-only">was </span>${format(r.from)}</s>`;   // SF-42: the visible Removed tag already says it
    }
    return `<div class="change-list__row change-list__row--${kind}" role="listitem" data-kind="${wholeNew ? 'added' : kind}"><span class="change-list__text">${text}</span>${amt}</div>`;
  };
  const groups = garments.map((g) => {
    /* K-04 (D-206 / D-207): name (underlined) → icon → tag, the photo stack at the right end. A removed item is struck, not underlined, and shows no photos. */
    const newItem = g.kind === 'added' || (g.newItem && g.kind !== 'removed');
    const headTag = g.kind === 'removed' ? tag('Removed', 'removed') : newItem ? tag('New item', 'new-item') : '';
    const photos = g.kind === 'removed' ? '' : stackFor(g, { docs: docs?.[g.id] ?? null, owner: photoOwner });
    const head = garmentHead({ type: g.type, kind: g.kind === 'removed' ? 'removed' : '', tag: headTag, photos, services: g.kind === 'removed' ? null : g.rows.filter((r) => r.kind !== 'removed').map((r) => r.label) });
    const docsHtml = docs && g.kind !== 'removed' && docs[g.id]
      ? garmentDocs({ garmentId: g.id, type: g.type, docs: docs[g.id], commentLabel }) : '';
    return `<div class="change-list__garment${g.kind === 'added' ? ' change-list__garment--new' : ''}${g.kind === 'removed' ? ' change-list__garment--gone' : ''}" data-garment="${esc(g.id)}"${g.kind ? ` data-garment-kind="${g.kind}"` : ''}>
    ${head}
    <div class="change-list__rows" role="list" aria-label="${esc(g.type)}" data-money>${g.rows.map((r) => rowHtml(r, g)).join('')}</div>
    ${docsHtml}
  </div>`;
  }).join('');
  return `<div class="change-list">${groups}</div>`;
}

/** changeList takes the customer's photo counts through each garment's `photos` (D-207): map them from the booking's `job.garments` (new items have none). */
export function withPhotos(garments = [], job = null) {
  const own = new Map((job?.garments ?? []).map((g) => [g.id, g.photos ?? 0]));
  return garments.map((g) => ({ ...g, photos: own.get(g.id) ?? g.photos ?? 0 }));
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

/** R4-2-T-08: "Was $205.00 · up $45.00" / "· down $55.00" in words; "Same as booked" when the figure did not move (no amount repeated). K-17: also the line under a status head's amount. */
export function deltaText(amount, was) {
  const d = amount - was;
  return d === 0 ? 'Same as booked' : `Was ${fmtExact(was)} · ${d > 0 ? `up ${fmtExact(d)}` : `down ${fmtExact(-d)}`}`;
}

/** K-17 (K16-1-01): the same words as `deltaText`, split in two lines for the narrow amount column beside a long name ("Was $160.00" / "up $45.00"). */
export const deltaLines = (amount, was) => (amount === was ? ['Same as booked'] : deltaText(amount, was).split(' · '));

/**
 * Delta Figure — one money figure with what it was: caps label, `.t-money` amount, then "Was $205.00 · up $45.00" /
 * "· down $55.00" / "· no change" in words. `was` null → no comparison line. `caption` is an optional t-small line.
 */
export function deltaFigure({ label = '', cents: amount = 0, was = null, caption = '' } = {}) {
  noPercent(label, 'deltaFigure'); noPercent(caption, 'deltaFigure');
  const delta = was != null ? `<p class="t-small c-700 delta-figure__was">${deltaText(amount, was)}</p>` : '';
  return `<div class="delta-figure" data-money>
  ${label ? `<p class="t-caps c-600 delta-figure__label">${esc(label)}</p>` : ''}
  <p class="t-money delta-figure__amt">${fmtExact(amount)}</p>
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
  /* K-17 (K16-1-04): `variant: 'route'` is the courier block once the balance is paid — only the route (+ the arrival when known); the quote and fee ride as the caption of Price's "Taily courier" row */
  if (variant === 'route') {
    return `<div class="courier-card courier-card--route" data-state="ready">${head}${pickup ? `<p class="t-small c-600 courier-card__route">Arrives ${esc(pickup)}</p>` : ''}</div>`;
  }
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
export function openAttachSheet({ count = 0, max = CHAT_PHOTO_CAP(), peer = '', note = '' } = {}, onAdd) {
  /* Study-1 B2: `note` replaces the chat line (a private note / an edit photo says who sees it) */
  const line = note ? `${esc(note)}${count > 0 ? ` ${count} added.` : ''}` : `Show ${esc(peer || 'them')} the garment. Up to ${max}&nbsp;per&nbsp;message.${count > 0 ? ` ${count} added.` : ''}`;
  const body = `<div class="attach-sheet">
  <p class="t-small c-600 attach-sheet__note">${line}</p>
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

/** M7-2-C-04 (D-202): the booked order as a strip — each garment's illustration in a 32 px well, then "2 items · 3 services".
    K-25: `items` = `{ type, services }` (`returnedItems(a)`); every thumb is a 44 px button (the 32 px well + a ::before pad, 12 apart) that opens
    the garment popover for that item, and "+N" is one too, listing the items it hides. */
export function garmentStrip(items = [], label = '') {
  const list = items.map((g) => (typeof g === 'string' ? { type: g, services: [] } : g));
  const shown = list.slice(0, 5);
  const rest = list.slice(shown.length);
  const thumb = (g) => `<button type="button" class="garment-strip__btn" ${peekAttrs([g], g.type)} aria-label="${esc(`${g.type}: show services`)}">${garmentIcon(g.type, { size: 'row' })}</button>`;
  const more = rest.length
    ? `<button type="button" class="garment-strip__btn" ${peekAttrs(rest, plural(rest.length, 'more item'))} aria-label="${esc(`${plural(rest.length, 'more item')}: show services`)}"><span class="garment-strip__more t-small w-600 c-700">+${rest.length}</span></button>`
    : '';
  return `<span class="garment-strip"><span class="garment-strip__icons">${shown.map(thumb).join('')}${more}</span>${label ? `<span class="garment-strip__label t-small c-600">${label}</span>` : ''}</span>`;
}

/** K-18 (D-249): what came back, one entry per garment — its type and the services done (the approved lines once they exist, else the job's garments).
    Shared by c-complete's tags and c-booking's hanging stage. */
export function returnedItems(a) {
  if (a.lines?.length) {
    return priceChangeView(a, a.lines).garments.filter((g) => g.kind !== 'removed')
      .map((g) => ({ type: g.type, services: g.rows.filter((r) => r.kind !== 'removed').map((r) => r.label) }));
  }
  return a.job.garments.map((g) => ({ type: g.type, services: (g.services ?? []).map((id) => DATA.SERVICES[id]?.label).filter(Boolean) }));
}

/* ---------- K-17 / K-20 / K-21 the linen stage and its tag rail ----------
   A linen (neutral-100) band: eyebrow, serif title, an optional line, then the cognac stitch with the garments hanging from it on white tags
   (c-complete, t-job completed). Up to RAIL_FIT tags share the row as K-17 drew it; four or more slide along the stitch (K-21 option Z,
   CSS scroll-snap, no script): the stitch stays put, full-size tags scroll under it, three show and the fourth peeks. */
const RAIL_FIT = 3;
const stagger = (i) => 450 + i * 130;   // the swing-in / drop-in delay of the i-th tag or hanger (motion-safe only)
/** "Suit Jacket, Suit Pant and Skirt" */
export function andList(xs = []) {
  return xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}
/** "5 items · 6 services" for `returnedItems()` entries. */
export function itemsLine(items = []) {
  return `${plural(items.length, 'item')} · ${plural(items.reduce((n, g) => n + (g.services?.length ?? 0), 0), 'service')}`;
}
/** The garments on white tags hanging from the stitch. `items` = `returnedItems(a)` (type + services). */
export function tagRail(items = []) {
  const n = items.length;
  const tag = (g, i) => `<div class="tag-rail__tag" style="--d:${stagger(i)}ms">
      <span class="tag-rail__string" aria-hidden="true"></span>
      <div class="tag-rail__card"><span class="tag-rail__hole" aria-hidden="true"></span>${garmentIcon(g.type, { size: 'tag' })}<span class="tag-rail__name">${esc(g.type)}</span>${g.services?.length ? `<span class="tag-rail__svc">${esc(g.services.join(' · '))}</span>` : ''}</div>
    </div>`;
  const tags = `<div class="tag-rail__tags" data-n="${n}">${items.map(tag).join('')}</div>`;
  if (n <= RAIL_FIT) return `<div class="tag-rail"><span class="tag-rail__stitch" aria-hidden="true"></span>${tags}</div>`;
  return `<div class="tag-rail tag-rail--slide"><span class="tag-rail__stitch" aria-hidden="true"></span><div class="tag-rail__scroll" role="region" tabindex="0" aria-label="${n} items, scroll for more">${tags}</div><p class="t-small w-600 c-700 tag-rail__more">${esc(itemsLine(items))}</p></div>`;
}
/** The linen stage: `eyebrow` (caps), `title` (serif h1), optional `line`, then `rail` (HTML, a `tagRail`). `calm` = a stage that must not move
    (a payout that didn't go through): neutral eyebrow, no sewing or swinging. `label` names the section. */
export function linenStage({ eyebrow = '', title = '', line = '', rail = '', label = '', calm = false } = {}) {
  return `<section class="linen-stage${calm ? ' linen-stage--calm' : ''}"${label ? ` aria-label="${esc(label)}"` : ''}>
    <p class="t-caps linen-stage__eyebrow">${esc(eyebrow)}</p>
    <h1 class="linen-stage__title">${esc(title)}</h1>
    ${line ? `<p class="t-body linen-stage__line">${esc(line)}</p>` : ''}
    ${rail}
  </section>`;
}

/* ---------- the hanging stage (K-18 3-J "Edge-to-edge linen stage", K-21 sliding rail, K-22 H1 "just a line") ----------
   A full-bleed linen band: the 1-E cognac stitch runs edge to edge and each garment drops from it on ONE 1.4 px cognac thread — a small loop knotted
   on the stitch (drawn over it) and a small eyelet at the garment's top centre drawn BEHIND the art, so the garment is the top layer and the thread
   disappears into the bodice / waistband. No hanger frame: nothing to size. Garment tops share one line under the stitch. The customer's tag is a white
   card with a cognac eyelet. Up to RAIL_FIT garments + the tag are centred; four or more slide (scroll-snap) and the tag stays pinned at the right end.
   Geometry is measured from the art (256 box, alpha > 60): box = [x0, y0, x1, y1]; mid = the centre of the top edge; eye = the eyelet's depth
   below the top, in art px (the dress needs a little more to sit inside its bodice). */
const HANG_ART = {
  'Suit Jacket': { box: [65, 38, 193, 208], mid: 127.5, eye: 3 }, 'Suit Pant': { box: [99, 29, 156, 218], mid: 127.5, eye: 4 },
  'Formal Dress': { box: [93, 27, 166, 237], mid: 128, eye: 6 }, 'Jacket': { box: [48, 54, 207, 203], mid: 128.5, eye: 3 },
  'Shirt / Blouse': { box: [64, 47, 192, 200], mid: 127.5, eye: 3 }, 'Dress / Jumpsuit': { box: [75, 25, 182, 222], mid: 127.5, eye: 4 },
  'Pants / Jeans': { box: [95, 36, 160, 211], mid: 127.5, eye: 4 }, 'Skirt': { box: [69, 56, 188, 195], mid: 127.5, eye: 3 },
  'Accessories': { box: [67, 60, 189, 181], mid: 127.5, eye: 3 },
};
const HANG_S = 0.64, HANG_Y = 18, HANG_TOP = HANG_Y + 26, HANG_GAP = 20, HANG_TAG_SLOT = 88, HANG_FIT_W = 366;   // FIT_W: the 390 phone less 12 a side
const r1 = (n) => Math.round(n * 100) / 100;

/** One garment in its own slot svg: thread + eyelet (under), the art, the loop on the stitch (over). */
function hangItem(type, i) {
  const a = HANG_ART[type] ?? { box: [64, 40, 192, 208], mid: 128, eye: 3 };
  const [x0, y0, x1, y1] = a.box;
  const w = Math.ceil((x1 - x0) * HANG_S + HANG_GAP);
  const tx = w / 2 - (HANG_S * (x0 + x1)) / 2, ty = HANG_TOP - HANG_S * y0;
  const x = r1(tx + HANG_S * a.mid), ey = r1(ty + HANG_S * (y0 + a.eye));
  const src = GARMENT_ICONS[type];
  const art = src ? `<image href="${src}" width="256" height="256" transform="translate(${r1(tx)} ${r1(ty)}) scale(${HANG_S})"/>` : '';
  const g = `<g class="hang__item" style="transform-origin:${x}px ${HANG_Y}px;--d:${stagger(i)}ms"><line class="hang__thread" x1="${x}" y1="${HANG_Y + 3.6}" x2="${x}" y2="${r1(ey - 2.4)}"/><circle class="hang__eyelet" cx="${x}" cy="${ey}" r="2.4"/>${art}<ellipse class="hang__loop" cx="${x}" cy="${HANG_Y}" rx="3.2" ry="3.6"/></g>`;
  return { w, g, bottom: HANG_TOP + HANG_S * (y1 - y0) };
}

/** `types` = every garment type hung; `tag` = [name line, note line] on the customer's tag; `left` / `right` = the caption on the linen;
    `label` = the accessible name of the drawing (it names every garment drawn and the tag). */
export function hangStage({ types = [], tag = ['', ''], left = '', right = '', label = '' } = {}) {
  const items = types.map((t, i) => hangItem(t, i));
  const H = Math.max(178, Math.ceil(Math.max(0, ...items.map((it) => it.bottom)) + 10));
  const slot = (it) => `<svg class="hang__slot" width="${it.w}" height="${H}" viewBox="0 0 ${it.w} ${H}" aria-hidden="true">${it.g}</svg>`;
  const tx = HANG_TAG_SLOT / 2;
  const tagSvg = `<svg class="hang__slot hang__slot--tag" width="${HANG_TAG_SLOT}" height="${H}" viewBox="0 0 ${HANG_TAG_SLOT} ${H}" aria-hidden="true"><g class="hang__tag" style="transform-origin:${tx}px ${HANG_Y}px;--d:${stagger(items.length)}ms"><ellipse class="hang__loop" cx="${tx}" cy="${HANG_Y}" rx="3.2" ry="3.6"/><line class="hang__string" x1="${tx}" y1="21.6" x2="${tx}" y2="43"/><path class="hang__tagcard" d="M${tx - 28} 36H${tx + 28}L${tx + 36} 44V78Q${tx + 36} 82 ${tx + 32} 82H${tx - 32}Q${tx - 36} 82 ${tx - 36} 78V44Z"/><circle class="hang__hole" cx="${tx}" cy="43" r="2.6"/><text class="hang__t1" x="${tx}" y="62" text-anchor="middle">${esc(tag[0])}</text><text class="hang__t2" x="${tx}" y="75" text-anchor="middle">${esc(tag[1])}</text></g></svg>`;
  /* fit = up to RAIL_FIT garments that fit beside the tag: the group (garments + tag) is centred; otherwise the garments slide and the tag is pinned.
     Both scroll (never clipped) — a fit group only overflows at zoomed widths. */
  const total = items.reduce((n, it) => n + it.w, 0) + HANG_TAG_SLOT;
  const slide = items.length > RAIL_FIT || total > HANG_FIT_W;
  const track = slide
    ? `<div class="hang__scroll" role="region" tabindex="0" aria-label="${esc(`${label}. ${items.length} items, scroll for more`)}"><div class="hang__track">${items.map(slot).join('')}</div></div>${tagSvg}`
    : `<div class="hang__scroll hang__scroll--fit" role="img" aria-label="${esc(label)}"><div class="hang__track">${items.map(slot).join('')}${tagSvg}</div></div>`;
  return `<div class="hang${slide ? ' hang--slide' : ''}" data-hang><div class="hang__band"><span class="hang__rail" aria-hidden="true"></span>${track}</div>
  <div class="hang__cap"><span class="t-small w-600">${esc(left)}</span><span class="t-small">${esc(right)}</span></div></div>`;
}

export function garmentIcon(type, { size = 'card', alt = '' } = {}) {
  const src = GARMENT_ICONS[type];
  const hidden = alt ? '' : ' aria-hidden="true"';
  if (src) return `<span class="garment-icon garment-icon--${size}"${hidden}><img src="${src}" alt="${esc(alt)}"></span>`;
  return `<span class="garment-icon garment-icon--${size} garment-icon--fallback"${alt ? ` role="img" aria-label="${esc(alt)}"` : hidden}>${ICON_HANGER}</span>`;
}

/**
 * Garment head (K-04 D-206, reversed by K-05 D-220) — the one item row of every garment card, both personas (changeList, workList, the t-adjust card, c-job's card):
 * the bare 40 px garment illustration FIRST (no well, ring or radius; aria-hidden), then the item NAME (t-body 600, underlined so it reads apart from the service rows under it),
 * then any `tag` (HTML), then, pushed right, `photos` (a `photoStack`) and / or `trailing` (the card's own control, e.g. c-job's ✕).
 * `kind: 'removed'` strikes the name (no underline) and dims the icon. `as` = the name's element ('p', or 'h2' where the card is a heading).
 */
export function garmentHead({ type = '', kind = '', tag = '', photos = '', trailing = '', as = 'p', services = null } = {}) {
  const gone = kind === 'removed';
  /* D-24 (K-48): the underlined name (K-05) does what it promises — it opens that item's services popover (K-25). `services` = its labels. */
  const name = gone ? `<s>${esc(type)}</s>` : services
    ? `<button type="button" class="garment-head__peek" ${peekAttrs([{ type, services }], `${type} services`)}>${esc(type)}</button>`
    : esc(type);
  const end = photos || trailing ? `<span class="garment-head__end">${photos}${trailing}</span>` : '';
  /* K-05 (D-220): the bare 40 px icon comes FIRST (aria-hidden, the visible name beside it names the item), then name + tag in one group that wraps inside itself; the end group (photo stack / ✕) never leaves the first line */
  return `<div class="garment-head${gone ? ' garment-head--gone' : ''}${end ? ' garment-head--end' : ''}">${garmentIcon(type)}<span class="garment-head__who"><${as} class="garment-head__name t-body w-600">${name}</${as}>${tag}</span>${end}</div>`;
}

/**
 * Photo stack (K-04, D-207) — up to 3 overlapping 32 px photo stubs and "n photos" as ONE button (≥ 44 px) at the end of the item row.
 * `source: 'fitting'` = the tailor's Before + Pinned photos (`photos` = that list, Before first; opens the docs viewer with its tabs, on Pinned
 * when there is no Before); `source: 'customer'` = the customer's own (`count`; opens the photo viewer titled "<type> · <owner> photos").
 * Wired by `wireGarmentDocs` (fitting) and `wirePhotoViewer` (customer). No photos → ''.
 */
export function photoStack({ garmentId = '', type = '', source = 'customer', count = 0, photos = [], owner = 'Your' } = {}) {
  const n = source === 'fitting' ? photos.length : Number(count) || 0;
  if (!n) return '';
  const shown = Array.from({ length: Math.min(3, n) }, (_, i) => {
    const ph = source === 'fitting' ? photos[i] : null;
    return `<span class="photo-stack__thumb">${photoStub({ type, tone: ph?.tone ?? i, size: 'mini', seed: ph?.id ?? i })}</span>`;
  }).join('');
  const label = `${n} ${n === 1 ? 'photo' : 'photos'}`;
  const title = source === 'fitting' ? `${type} · photos` : `${type} · ${owner} photos`;
  return `<button type="button" class="photo-stack" data-act="view-photos" data-garment="${esc(garmentId)}" data-source="${source}" data-type="${esc(type)}" data-count="${n}" data-title="${esc(title)}" aria-label="View ${label} of the ${esc(type)}"><span class="photo-stack__thumbs" aria-hidden="true">${shown}</span><span class="photo-stack__count t-small w-600">${label}</span></button>`;
}

/** The photos an item row shows (D-207): the fitting photos (Before, then Pinned) when the snapshot has any for the garment, else the customer's own `g.photos`. */
function stackFor(g, { docs = null, owner = 'Your' } = {}) {
  const fit = docs ? DOC_KIND_LIST().flatMap((k) => docs[k] ?? []) : [];
  return fit.length
    ? photoStack({ garmentId: g.id, type: g.type, source: 'fitting', photos: fit })
    : photoStack({ garmentId: g.id, type: g.type, source: 'customer', count: g.photos ?? 0, owner });
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
 * Garment docs — the read-only comment under a garment's rows (K-04 / D-207: the Before | Pinned tab strip and thumbnails are gone;
 * the photos live in the item row's `photoStack` and the viewer's tabs). Renders nothing when there is no comment. `tab` / `idPrefix` are
 * accepted and ignored (older call sites).
 */
export function garmentDocs({ garmentId, type, docs, commentLabel = 'Comment' } = {}) {
  const d = docs ?? {};
  if (!d.comment) return '';
  const g = esc(garmentId);
  const comment = `<figure class="garment-docs__comment"><figcaption class="t-small c-600">${esc(commentLabel)}</figcaption><blockquote class="t-body">“${esc(d.comment)}”</blockquote></figure>
       ${d.commentMasked ? '<p class="t-small c-600 garment-docs__masked">Phone numbers and emails in this comment are hidden.</p>' : ''}`;
  return `<div class="garment-docs" data-docs="${g}">${comment}</div>`;
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
    const sub = photo ? `<p class="t-small c-600 docs-viewer__sub">${esc(by ? `${by} on ` : '')}${fmtDay(photo.at)} · ${fmtTime(photo.at)}</p>` : '';
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
 * Wire the fitting photos: the item row's `photoStack` (`[data-act="view-photos"][data-source="fitting"]`) opens the viewer on Before (Pinned when
 * there is no Before), and the editor's thumbnails (`view-doc`) open it at that kind and index. `lookup(garmentId) → { type, docs }`.
 */
export function wireGarmentDocs(root, { lookup, by = '', editable = false, onRemove = null } = {}) {
  root.addEventListener('click', (e) => {
    if (e.target.closest('.screen-sheet--overlay')) return;
    const stack = e.target.closest('[data-act="view-photos"][data-source="fitting"]');
    if (stack) {
      const info = lookup?.(stack.dataset.garment);
      if (!info) return;
      const kind = (info.docs?.before?.length ?? 0) > 0 ? 'before' : 'pinned';
      openDocsViewer({ garmentId: stack.dataset.garment, type: info.type, docs: info.docs, kind, index: 0, by, editable, onRemove });
      return;
    }
    const photo = e.target.closest('[data-act="view-doc"]');
    if (!photo || photo.disabled) return;
    const info = lookup?.(photo.dataset.garment);
    if (!info) return;
    openDocsViewer({
      garmentId: photo.dataset.garment, type: info.type, docs: info.docs, kind: photo.dataset.kind, index: Number(photo.dataset.index) || 0, by, editable, onRemove,
    });
  });
}

/* ===== S1-A ===== */
/* Study-1 WS-A (K-27…K-29): the handoff — pickup code, the auto-complete countdown, the delivery photo, the review reminder. */

/** The customer's pickup code card: caps label, the digits as the one sans figure (K-12 money style, tabular), the line under it.
    The digits are spelled out for screen readers ("8 1 5 3"). */
export function pickupCode({ code = '', label = 'Your pickup code', helper = 'Show this code when you pick up.' } = {}) {
  return `<section class="pickup-code" aria-label="${esc(label)}" data-pickup-code>
  <p class="t-caps c-600">${esc(label)}</p>
  <p class="t-money pickup-code__digits"><span aria-hidden="true">${esc(code)}</span><span class="sr-only">${esc(String(code).split('').join(' '))}</span></p>
  <p class="t-small c-600">${esc(helper)}</p>
</section>`;
}

/** "Completes automatically in 47h unless you report a problem" (Study-1 A3, default 3): `msLeft` from `autoCompleteLeft(appt)`; the
    whole hours still ahead ("47h" right after the mark), in the last hour "less than 1h". `who` = 'you' (Sarah) or the customer's first name. */
export function autoCompleteLine(msLeft, { who = 'you' } = {}) {
  if (msLeft == null) return '';
  const h = Math.floor(Math.max(0, msLeft - 1) / 3600000);   // whole hours still ahead: "47h" right after the mark, "less than 1h" in the last hour
  const when = h < 1 ? 'less than 1h' : `${h}h`;
  const unless = who === 'you' ? 'unless you report a problem' : `unless ${who} reports a problem`;
  return `<p class="t-small c-700 auto-line" data-auto-complete>${META_ICONS.clock}<span>Completes automatically in ${esc(when)} ${esc(unless)}</span></p>`;
}

/** A photo the tailor sent with a post-fitting edit (Study-1 B1; a photo stub of the garment) with who took it and when. K-37: the
    drop-off photo it was first built for is gone with Home drop-off. */
export function photoFigure({ photo, type = '', by = '', label = 'Photo' } = {}) {
  if (!photo) return '';
  return `<figure class="photo-figure" data-photo-figure>
  <span class="photo-figure__frame">${photoStub({ type, tone: photo.tone ?? 0, size: 'stage', alt: label, seed: photo.id })}</span>
  <figcaption class="t-small c-600">${esc([by ? `Taken by ${by}` : '', photo.at ? fmtWhen(photo.at) : ''].filter(Boolean).join(' · '))}</figcaption>
</figure>`;
}

/** The review reminder (Study-1 A4, K-28): a notification card — bell, title, one line, the "Leave a review" button (`act`, `data-id`). */
export function reminderCard({ title = '', text = '', actionLabel = 'Leave a review', act = 'review-reminder', id = '' } = {}) {
  return `<section class="card reminder-card" role="status" aria-label="${esc(title)}" data-reminder>
  <span class="reminder-card__icon" aria-hidden="true">${ICON_BELL}</span>
  <div class="reminder-card__body">
    <p class="t-body w-600">${esc(title)}</p>
    <p class="t-small c-600">${esc(text)}</p>
    ${ctaSmall(actionLabel, { attrs: `data-act="${esc(act)}"${id ? ` data-id="${esc(id)}"` : ''}` })}
  </div>
</section>`;
}

/** K-41 (R3, D-296): the 24-hour reminder on Home — the booking row turns into a card: the accent state strip across its top (`text` ·
    `right`, e.g. "Still on for tomorrow?" · "Free until 5:00 PM"), the appt row (`row` = apptRow's options), ONE rule line in dollars
    (`rule`, HTML: money in <span data-money>), then Confirm (filled) and "Change or cancel" (opens the booking) inline. */
export function visitPrompt({ text = '', right = '', row = {}, rule = '', id = '', confirmAct = 'confirm-visit', changeAct = 'open-appt', tone = 'action' } = {}) {
  noPercent(rule, 'visitPrompt');
  const idAttr = id ? ` data-id="${esc(id)}"` : '';
  return `<section class="visit-prompt" aria-label="${esc(text)}" data-visit-prompt>
  ${requestStrip({ tone, icon: 'clock', text, right })}
  ${apptRow(row)}
  <p class="t-small c-600 visit-prompt__rule">${rule}</p>
  <div class="visit-prompt__actions">${ctaSmall('Confirm', { filled: true, attrs: `data-act="${esc(confirmAct)}"${idAttr}` })}${ctaSmall('Change or cancel', { attrs: `data-act="${esc(changeAct)}"${idAttr}` })}</div>
</section>`;
}

/* ===== S1-B ===== */
/* Study-1 WS-B (K-30, K-31): the tailor's private General notes (B2) and the edit's due-date line (B1). */

/** B2 copy: the empty line and the field errors of the note editor. */
export const NOTE_EMPTY = 'Measurements, fabric notes, reminders.';   // SF-40: the lock line above already says only she sees them
const NOTE_ERRORS = {
  'note-empty': 'Write something or add a photo.',
  'note-long': `Keep the note under ${DATA.NOTES_LIMITS.TEXT_MAX} characters.`,
  'too-many-photos': `Up to ${DATA.NOTES_LIMITS.PHOTOS_MAX} photos per note.`,
};
/** "Fri, Oct 16 · 10:00 AM" (+ " · Edited"). */
const noteStamp = (n) => `${fmtWhen(n.updatedAt ?? n.at)}${n.updatedAt ? ' · Edited' : ''}`;   // SF-40: one date format ("Fri, Oct 16 · 10:00 AM")

/**
 * Private notes (Study-1 B2, K-31) — "General notes": the lock line "Only you can see these notes.", every note (text, its photos as one
 * thumbnail row that opens the viewer, when, Edit), then "Add a note"; no sharing anywhere. `draft` = the open editor
 * `{ id: noteId | null, text, photos: [{ tone }], error }` (in place of that note, or last for a new one): a textArea `#note-text`,
 * the photo tray (`[data-act="note-remove-photo"][data-index]`), "Add photo" (`note-add-photo`), Save note / Cancel / Delete note.
 * `readOnly` (a completed job) drops every control. `type` = the garment the photo stubs draw.
 */
export function privateNotes({ notes = [], draft = null, readOnly = false, type = '', id = 'notes', busy = false } = {}) {
  const max = DATA.NOTES_LIMITS;
  const dis = busy || !!draft;
  const thumbs = (n) => (n.photos.length ? `<button type="button" class="private-note__photos" data-act="view-photo" data-count="${n.photos.length}" data-type="${esc(type)}" data-title="${n.photos.length === 1 ? 'Note photo' : 'Note photos'}" aria-label="Open ${n.photos.length === 1 ? 'the photo' : `${n.photos.length} photos`} in this note">${n.photos.map((p) => `<span class="private-note__thumb">${photoStub({ type, tone: p.tone ?? 0, size: 'thumb', seed: p.id })}</span>`).join('')}</button>` : '');
  const editor = () => {
    const tray = draft.photos.length ? `<div class="composer__tray private-notes__tray" role="list" aria-label="Photos in this note">${draft.photos.map((p, i) => `<span class="composer__thumb" role="listitem"><span class="composer__thumb-tile" aria-hidden="true">${photoStub({ type, tone: p.tone ?? i, size: 'fill' })}</span><button type="button" class="composer__remove" data-act="note-remove-photo" data-index="${i}" aria-label="Remove photo ${i + 1}"${busy ? ' disabled' : ''}>${ICON_CLOSE}</button></span>`).join('')}</div>` : '';
    const full = draft.photos.length >= max.PHOTOS_MAX;
    return `<li class="private-note private-note--editing" data-note-editor${draft.id ? ` data-note="${esc(draft.id)}"` : ''}>
    ${textArea({ id: 'note-text', label: draft.id ? 'Edit note' : 'New note', value: draft.text ?? '', rows: 4, max: max.TEXT_MAX, error: draft.error ? NOTE_ERRORS[draft.error] ?? '' : '' })}
    ${tray}
    ${full ? `<p class="t-small c-600 private-notes__max">Up to ${max.PHOTOS_MAX} photos per note.</p>` : `<div class="private-notes__add-photo">${textLink('Add photo', { act: 'note-add-photo', icon: ICON_CAMERA, disabled: busy })}</div>`}
    <div class="private-notes__actions">
      ${ctaSmall(busy ? 'Saving…' : 'Save note', { filled: true, attrs: `data-act="note-save"${busy ? ' disabled aria-busy="true"' : ''}` })}
      ${textLink('Cancel', { act: 'note-cancel', tone: 'muted', disabled: busy })}
      ${draft.id ? textLink('Delete note', { act: 'note-delete', tone: 'danger', disabled: busy }): ''}
    </div>
  </li>`;
  };
  const item = (n) => (draft && draft.id === n.id ? editor() : `<li class="private-note" data-note="${esc(n.id)}">
    ${n.text ? `<p class="t-body private-note__text">${esc(n.text)}</p>` : ''}
    ${thumbs(n)}
    <div class="private-note__foot"><p class="t-small c-600">${esc(noteStamp(n))}</p>${readOnly ? '' : textLink('Edit', { act: 'note-edit', disabled: dis, attrs: `data-note="${esc(n.id)}" aria-label="Edit this note"` })}</div>
  </li>`);
  const rows = [...notes.map(item), draft && !draft.id ? editor() : ''].join('');
  return `<section class="sec private-notes" aria-labelledby="${esc(id)}-head" data-notes>
  ${sectionHead('General notes', { id: `${id}-head`, count: notes.length || null })}
  <p class="t-small c-700 private-notes__lock" data-private>${ICON_LOCK}<span>Only you can see these notes.</span></p>
  ${rows ? `<ul class="private-notes__list" role="list">${rows}</ul>` : `<p class="t-body c-600 private-notes__empty">${esc(NOTE_EMPTY)}</p>`}
  ${readOnly || draft ? '' : `<div class="private-notes__add">${textLink('Add a note', { act: 'note-add', icon: ICON_EDIT, disabled: busy })}</div>`}
</section>`;
}

/**
 * Wire `privateNotes` on a screen (t-job, t-adjust). The host keeps the editor draft and the model calls:
 * `{ draft() → d | null, setDraft(d | null), notes() → [], save(d) → { ok, error }, remove(noteId) → { ok, note, index },
 *    restore(note, index), rerender(focusSel), type }`. Add photo opens the attach sheet (camera or library); Delete note offers Undo.
 */
export function wirePrivateNotes(root, { draft, setDraft, notes, save, remove, restore, rerender, type = '' }) {
  const max = DATA.NOTES_LIMITS.PHOTOS_MAX;
  root.addEventListener('input', (e) => {
    if (e.target.id !== 'note-text' || !draft()) return;
    draft().text = e.target.value;
    const n = [...e.target.value].length;
    const count = root.querySelector('#note-text-count');
    if (count) { count.textContent = `${n} / ${DATA.NOTES_LIMITS.TEXT_MAX}`; count.classList.toggle('text-area__count--over', n > DATA.NOTES_LIMITS.TEXT_MAX); }
  });
  root.addEventListener('click', (e) => {
    if (e.target.closest('.screen-sheet--overlay')) return;
    const el = e.target.closest('[data-act^="note-"]');
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    const act = el.dataset.act;
    const d = draft();
    if (act === 'note-add') { setDraft({ id: null, text: '', photos: [], error: '' }); rerender('#note-text'); }
    else if (act === 'note-edit') {
      const n = notes().find((x) => x.id === el.dataset.note);
      if (!n) return;
      setDraft({ id: n.id, text: n.text, photos: n.photos.map((p) => ({ ...p })), error: '' });
      rerender('#note-text');
    } else if (!d) return;
    else if (act === 'note-cancel') { setDraft(null); rerender('[data-act="note-add"]'); }
    else if (act === 'note-add-photo') {
      openAttachSheet({ count: d.photos.length, max, note: `Up to ${max} photos per note. Only you see them.` }, () => {
        d.photos.push({ tone: d.photos.length % 4 });
        if (d.error === 'note-empty') d.error = '';
        rerender(d.photos.length >= max ? '#note-text' : '[data-act="note-add-photo"]');
      });
    } else if (act === 'note-remove-photo') {
      d.photos.splice(Number(el.dataset.index), 1);
      rerender('[data-act="note-add-photo"]');
    } else if (act === 'note-save') {
      const r = save(d);
      if (r?.ok) { setDraft(null); rerender('[data-act="note-add"]'); toast('Note saved. Only you can see it.', { tone: 'success' }); }
      else { d.error = r?.error ?? 'note-empty'; rerender('#note-text'); }
    } else if (act === 'note-delete') {
      const r = remove(d.id);
      if (!r?.ok) { toast('Couldn’t delete the note. Try again.', { tone: 'error' }); return; }
      setDraft(null);
      rerender('[data-act="note-add"]');
      toast('Note deleted.', { action: 'Undo', onAction: () => { if (restore(r.note, r.index)?.ok) rerender(`[data-act="note-edit"][data-note="${r.note.id}"]`); } });
    }
  });
}

/** B1: "New due date Fri, Oct 26 · was Fri, Oct 23" — one line, the old date muted. */
export function dueChange({ needBy, was } = {}) {
  return `<span class="due-change">New due date <span class="due-change__part">${esc(fmtDay(needBy))}</span> <span class="c-600">· was <span class="due-change__part">${esc(fmtDay(was))}</span></span></span>`;
}

/* ===== S1-C ===== */
/* Study-1 C2: the hard stop for a `textArea({ maxlength })`. Typing stops at the limit (native maxlength); a paste that would
   overflow is cut to fit (never refused) and the field says "Trimmed to N characters." until the next keystroke. The counter
   and the box ring take the error tone AT the limit (`.text-area--full`) — the field stays valid. Returns `paste(text)`, the
   same path a real paste takes (a Test-flows entry replays a paste through it). */
export function wireTextLimit(root, id) {
  const el = root.querySelector(`#${id}`);
  if (!el?.dataset.maxlength) return () => false;
  const max = Number(el.dataset.maxlength);
  const wrap = el.closest('.text-area');
  const count = root.querySelector(`#${id}-count`);
  const notice = root.querySelector(`#${id}-notice`);
  let trimmed = false;
  const paint = () => {
    const n = [...el.value].length;
    if (count) { count.textContent = `${n} / ${max}`; count.classList.toggle('text-area__count--over', n >= max); }
    wrap?.classList.toggle('text-area--full', n >= max);
    if (notice) notice.textContent = trimmed ? `Trimmed to ${max} characters.` : '';
  };
  const paste = (text) => {
    const v = el.value;
    const a = el.selectionStart ?? v.length;
    const b = el.selectionEnd ?? v.length;
    const room = Math.max(0, max - (v.length - (b - a)));
    let ins = String(text ?? '').replace(/\r\n?/g, '\n');
    const cut = ins.length > room;
    if (cut) { ins = ins.slice(0, room); if (/[\uD800-\uDBFF]$/.test(ins)) ins = ins.slice(0, -1); }
    el.setRangeText(ins, a, b, 'end');
    trimmed = cut;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return cut;
  };
  el.addEventListener('paste', (e) => { e.preventDefault(); paste(e.clipboardData?.getData('text/plain') ?? ''); });
  el.addEventListener('input', (e) => { if (e.isTrusted) trimmed = false; paint(); });
  return paste;
}

/* Study-1 C5 — neighborhoods instead of ZIP codes (to-where). */
const hoodsIn = (borough) => DATA.NEIGHBORHOODS.filter((n) => n.borough === borough);
/** "Williamsburg, Greenpoint and Bushwick" — names in the order given. */
export function hoodSentence(ids = []) {
  const names = DATA.hoodNames(ids);
  return names.length < 2 ? names[0] ?? '' : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
/**
 * Neighborhood picker (D-254): one collapsible group per borough — a 48 px head button (borough · "n selected" · chevron,
 * `data-act="borough" data-id`, aria-expanded) over a wrap of 44 px toggle chips (`data-act="hood" data-id`, aria-pressed).
 * `open` = the borough ids shown expanded. `map` = trusted markup (hoodMap) between the helper and the groups. `error` rings
 * the groups and prints under them. states: none · some · error.
 */
export function hoodPicker({ selected = [], open = [], error = '', map = '', label = 'Neighborhoods you visit', helper = 'Where customers can book a home visit' } = {}) {
  const groups = DATA.BOROUGHS.map((b) => {
    const hoods = hoodsIn(b.id);
    const n = hoods.filter((h) => selected.includes(h.id)).length;
    const on = open.includes(b.id);
    const chips = hoods.map((h) => {
      const picked = selected.includes(h.id);
      return `<button type="button" class="chip hood-chip${picked ? ' chip--selected' : ''}" data-act="hood" data-id="${esc(h.id)}" aria-pressed="${picked}">${esc(h.name)}</button>`;
    }).join('');
    return `<div class="hood-group${on ? ' is-open' : ''}" data-borough="${esc(b.id)}">
    <button type="button" class="hood-group__head" data-act="borough" data-id="${esc(b.id)}" aria-expanded="${on}" aria-controls="hoods-${esc(b.id)}">
      <span class="hood-group__name t-body w-600">${esc(b.name)}</span>
      <span class="hood-group__count t-small ${n ? 'w-600 c-ink' : 'c-600'}">${n ? `${n} selected` : 'None'}</span>
      <span class="hood-group__chev" aria-hidden="true">${CHEVRON_DOWN}</span>
    </button>
    <div class="hood-group__chips" id="hoods-${esc(b.id)}" role="group" aria-label="${esc(`${b.name} neighborhoods`)}"${on ? '' : ' hidden'}>${chips}</div>
  </div>`;
  }).join('');
  return `<div class="hood-picker${error ? ' hood-picker--error' : ''}" data-hood-picker>
  <p class="hood-picker__label t-small w-600 c-700" id="hood-picker-label">${esc(label)}</p>
  ${helper ? `<p class="hood-picker__help t-small c-600" id="hood-picker-help">${esc(helper)}</p>` : ''}
  ${map}
  <div class="hood-picker__groups" role="group" aria-labelledby="hood-picker-label"${helper ? ' aria-describedby="hood-picker-help"' : ''}>${groups}</div>
  ${error ? `<p class="field__msg field__msg--error" id="hoods-msg" role="alert">${esc(error)}</p>` : ''}
</div>`;
}
/* the tile map's layout (tile units): where each borough's own tile grid sits, and where its caps label goes — mock geography */
const HOOD_MAP = {
  bronx: { at: [4, 0], label: [5, 0] },
  manhattan: { at: [3, 3], label: [3, 3], end: true },
  queens: { at: [6, 3], label: [7, 3] },
  brooklyn: { at: [5, 6], label: [7, 6] },
  'staten-island': { at: [1, 6], label: [2, 9] },
};
const HOOD_TILE = 20;
const HOOD_STEP = 24;
/**
 * Neighborhood map (C5): an inline SVG tile map, one rounded tile per neighborhood grouped by borough, selected = accent.
 * No external map. `role="img"` with the selection as its name; a caption counts the picks.
 */
export function hoodMap({ selected = [] } = {}) {
  const cols = 10; const rows = 10;
  const w = cols * HOOD_STEP - (HOOD_STEP - HOOD_TILE);
  const h = rows * HOOD_STEP - (HOOD_STEP - HOOD_TILE);
  const tiles = DATA.NEIGHBORHOODS.map((n) => {
    const [ox, oy] = HOOD_MAP[n.borough]?.at ?? [0, 0];
    const on = selected.includes(n.id);
    return `<rect class="hood-map__tile${on ? ' is-on' : ''}" data-hood="${esc(n.id)}" x="${(ox + n.tile.x) * HOOD_STEP}" y="${(oy + n.tile.y) * HOOD_STEP}" width="${HOOD_TILE}" height="${HOOD_TILE}" rx="4"><title>${esc(n.name)}</title></rect>`;
  }).join('');
  const labels = DATA.BOROUGHS.map((b) => {
    const m = HOOD_MAP[b.id];
    if (!m) return '';
    const x = m.end ? m.label[0] * HOOD_STEP - 6 : m.label[0] * HOOD_STEP + 2;
    const y = m.label[1] * HOOD_STEP + HOOD_TILE / 2;
    return `<text class="hood-map__label" x="${x}" y="${y}" dominant-baseline="middle"${m.end ? ' text-anchor="end"' : ''}>${esc(b.name.toUpperCase())}</text>`;
  }).join('');
  const names = hoodSentence(selected);
  const n = DATA.hoodNames(selected).length;
  return `<figure class="hood-map" data-hood-map>
  <svg class="hood-map__svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(n ? `Map: home visits in ${names}` : 'Map: no neighborhoods picked yet')}">${tiles}${labels}</svg>
  <figcaption class="hood-map__caption t-small c-600">${n ? `${n} ${n === 1 ? 'neighborhood' : 'neighborhoods'} highlighted` : 'Pick neighborhoods below to see them here.'}</figcaption>
</figure>`;
}

/* ===== K-40 (T1) ===== */
/* The handoff time: the When row under the chosen way back (c-ready) and the Scheduler sheet that picks or moves it (c-ready, c-booking). */

/** The When row (K-40 T1): a card--list row under the chosen way back — "Pick a time ›" / "Pick a delivery window ›" in accent ink until
    she picks, then the time itself in ink with an ink ring ("Fri, Oct 16 · 5:30 PM ›"). `text` = the picked time ('' = not picked). */
export function handoffWhenRow({ method = 'pickup', text = '', sub = '', act = 'pick-time' } = {}) {
  const ask = method === 'courier' ? 'Pick a delivery window' : 'Pick a time';
  const what = method === 'courier' ? 'Delivery window' : 'Pickup time';
  const title = text ? `<span class="when-row__val">${esc(text)}</span>` : `<span class="when-row__ask">${ask}</span>`;
  return `<div class="card card--list when-row${text ? ' is-set' : ''}" data-when>${listRow({
    lead: META_ICONS.clock, title, sub, act, attrs: `aria-label="${esc(`${what}: ${text || 'not picked'}`)}"`,
  })}</div>`;
}

/** The courier line under a window: "Courier $13.75 · collects from Amara at 4:45 PM" — K-43 (D-299): that window's own Uber quote + the
    Taily fee, so it changes as she scrolls the wheel. */
const courierNote = (cents, first, w) => `<span class="t-small c-600">Courier <span data-money>${fmtExact(cents)}</span> · collects from ${esc(first)} at ${esc(fmtTime(w.collectAt))}</span>`;
/** K-43 (D-298): a courier delivery never comes back — the line wherever the courier is chosen or booked. */
export const COURIER_LOBBY = 'If you’re not home, the courier leaves it in your building’s lobby.';

/**
 * The handoff time sheet (K-40 T1): the existing Scheduler in a sheet, fed by `handoffSlots(appt)` — pickup = Day · Hour · Minute · AM/PM
 * (readSlot snaps to an open start), courier = Day · Arrives (30-minute delivery windows; the note under the wheel prints the window's own
 * courier price — K-43 (D-299): a simulated Uber quote per window — and the collection time, updating as she scrolls). `mode` 'pick' (c-ready: Use this time / Cancel; instant) | 'change' (c-booking: Move my pickup / Keep current time; the
 * simulated wait, the current slot left out). Calls `T.setHandoffSlot` (customer only); `onDone(appt)` after it succeeds.
 *   first  the tailor's first name · place  the line under the header
 *   dataS  the overlay's data-s · onMessage  the "no open times" Message button
 */
export function openHandoffTime(appt, { mode = 'pick', first = 'The tailor', place = '', dataS = '', onDone, onMessage } = {}) {
  const courier = appt.returnOption === 'courier';
  const change = mode === 'change';
  const cur = appt.handoff?.slot ?? null;
  const all = handoffSlots(appt);
  const slots = change ? all.filter((x) => x.start !== cur?.start) : all;
  const header = change ? (courier ? 'Change delivery window' : 'Change pickup time') : (courier ? 'Pick a delivery window' : 'Pick a pickup time');
  const keepLabel = change ? (courier ? 'Keep current window' : 'Keep current time') : 'Cancel';
  if (!slots.length) {
    sheetOverlay(`<div class="handoff-sheet">
  <p class="t-body c-700">${esc(first)} has no ${change ? 'other ' : ''}open ${courier ? 'delivery windows' : 'pickup times'} in the next ${POLICY.HANDOFF_PICK_DAYS} days. Message ${esc(first)} to find a time that works.</p>
  ${cta(`Message ${esc(first)}`, { attrs: 'data-act="ht-message"' })}
  ${cta(keepLabel, { variant: 'secondary', attrs: 'data-act="ht-keep"' })}
</div>`, { header, dataS: `${dataS}-none`, confirm: false }, (holder, close) => {
      holder.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'ht-keep') close();
        else if (act === 'ht-message') { close({ instant: true }); onMessage?.(); }
      });
    });
    return;
  }
  /* settle on the current pick (c-ready: what she picked before; c-booking: the nearest other time), else the first */
  const near = cur ? slots.reduce((b, x) => (Math.abs(new Date(x.start) - new Date(cur.start)) < Math.abs(new Date(b.start) - new Date(cur.start)) ? x : b), slots[0]) : slots[0];
  let picked = (!change && cur && slots.find((x) => x.start === cur.start)) || near;
  const label = change ? (courier ? 'New window' : 'New time') : (courier ? 'Arrives' : 'Pickup');
  const note = (x) => (courier
    ? `<span class="t-caps">${esc(label)}</span> <span class="t-small w-600">${esc(slotText(x))}</span><br>${courierNote(courierQuoteFor(appt, x).cents, first, x)}`
    : whenNote(label, x.start));
  const columns = () => (courier ? windowColumns(slots, picked.start) : slotColumns(slots.map((x) => x.start), picked.start));
  const now = change && cur ? `<p class="t-small c-600 handoff-sheet__now" data-now>${courier ? 'Arrives' : 'Booked for'} <span class="nb">${esc(slotText(cur))}</span></p>`
    : place ? `<p class="t-small c-600 handoff-sheet__now">${esc(place)}</p>` : '';
  const fine = change
    ? (courier ? `You can change the window until ${POLICY.COURIER_CHANGE_CUTOFF_MIN} minutes before the courier collects. The price is the new window’s quote, and ${esc(first)} is told right away. ${COURIER_LOBBY}` : `${esc(first)} is told right away. Your pickup code stays the same.`)
    : (courier ? `Each window has its own Uber price. Taily books the courier to collect from ${esc(first)} before your window. You can change it until ${POLICY.COURIER_CHANGE_CUTOFF_MIN} minutes before the courier collects. ${COURIER_LOBBY}`
      : `Only times ${esc(first)}’s shop is open, in the next ${POLICY.HANDOFF_PICK_DAYS} days. You can change it later from your booking.`);
  const okLabel = change ? (courier ? 'Move my delivery' : 'Move my pickup') : (courier ? 'Use this window' : 'Use this time');
  const html = (busy = false, error = '') => `<div class="handoff-sheet"${busy ? ' aria-busy="true"' : ''}>
  ${error ? banner({ tone: 'error', text: error }) : ''}
  ${now}
  <div class="handoff-sheet__wheel">${scheduler({ columns: columns(), compact: true, cta: '', inline: true, note: note(picked) })}</div>
  <p class="t-small c-600">${fine}</p>
  ${cta(okLabel, { busy, busyLabel: change ? 'Moving…' : 'Saving…', attrs: 'data-act="ht-ok"' })}
  ${cta(keepLabel, { variant: 'secondary', disabled: busy, attrs: 'data-act="ht-keep"' })}
</div>`;
  sheetOverlay(html(), { header, dataS, confirm: false }, (holder, close) => {
    let busy = false;
    const onWheel = () => {
      const x = courier ? readWindow(holder, slots) : slots.find((s) => s.start === readSlot(holder, slots.map((y) => y.start)));
      if (!x) return;
      picked = x;
      const n = holder.querySelector('[data-sched-note]');
      if (n) { n.innerHTML = note(x); n.hidden = false; }
    };
    const paint = (error = '') => {
      holder.querySelector('.handoff-sheet').outerHTML = html(busy, error);
      holder.dataset.locked = String(busy);
      wireWheel(holder, onWheel, SCHED_ROW);
    };
    wireWheel(holder, onWheel, SCHED_ROW);
    const commit = () => {
      const res = T.setHandoffSlot(appt.id, picked);
      busy = false;
      if (!res.ok) {
        paint(res.error === 'too-late' ? `It’s too late to move it now. Message ${first} to change it.` : 'That time isn’t open any more. Pick another one.');
        return;
      }
      holder.dataset.locked = 'false';
      close({ instant: true });
      onDone?.(res.appt, picked);
    };
    holder.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (busy || !act) return;
      if (act === 'ht-keep') close();
      else if (act === 'ht-ok') {
        onWheel();
        if (!change) { commit(); return; }
        busy = true; paint();
        withLatency(() => { if (holder.isConnected) commit(); });
      }
    });
  });
}
