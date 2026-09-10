/* ============================================================
   Tailor flow — components (Phase T, refined in UX-LOOP round 1).
   Tailor-only render functions; user-flow components are reused
   from components.js wherever a frame instances the same master.
   Styles live in css/tailor.css. Figma: "TAILOR — T/ COMPONENTS"
   section 210:647 (Active Job Card 470:3993, T2 rows 457:*,
   Tailor - Garment Card 238:5113).
   ============================================================ */

import { statusBar, topNav, statusPill, progressBar, ctaSmall, cta, photoTile, selector, additionalSelector, feeRow, toast, modalOverlay } from './components.js';
import { GARMENT_TYPES, JOB_TYPES, GARMENT_ICONS, money, garmentAmount, fmtWhen, parseWhen } from './data.js';
import { ICON_ADD_CIRCLE } from './icons.js';
import { render as go } from './app.js';
import { state } from './state.js';
import { primaryJob, setCurrent, jobTarget, isSeed, depositOf } from './tailor-data.js';

/** statusPill with the round-2 `expired` variant (declined styling,
    "Expired") — falls back to the declined variant until the substrate
    registers it in PILL_VARIANTS. */
export function pill(status, label) {
  try { return statusPill(status, label); } catch { return statusPill('declined', label); }
}

const T_NAV = [['t-home', 'Home'], ['t-calendar', 'Calendar'], ['t-shop', 'Shop']];

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* R1-T-17: the persona toggle is pinned to the viewport (outside .screen)
   and revealed on the first input — the diff harness's viewport equals
   the frame, so a pinned control would otherwise land inside every
   element screenshot. Any pointer/key/wheel/touch event reveals it. */
const reveal = () => document.documentElement.classList.add('has-input');
['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) =>
  document.addEventListener(ev, reveal, { once: true, passive: true }));

/** Top Nav Active=T-Home | T-Calendar | T-Shop + status bar. */
export function tailorChrome(active = 'home', time = '9:41') {
  return statusBar(time) + '\n' + topNav(`t-${active}`, T_NAV);
}

/** The Calendar tab (R2-T-01, R3-T-06): the soonest job still on the
    calendar opens its status screen; nothing live → T01. T03B's
    `View Calendar` does the same. */
export function openCalendar() {
  const a = primaryJob(state);
  if (a) setCurrent(a);
  go(a ? jobTarget(a) : 't01-home');
}
/** Tailor nav routing: Home → T01, Calendar → openCalendar(). */
export function wireTailorNav(root) {
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    const k = el.dataset.nav;
    if (k === 't-home') go('t01-home');
    else if (k === 't-calendar') openCalendar();
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

/**
 * T01 New Request card (455:3661) — timer strip + details + two small
 * CTAs. `idx` keys the card to its job (R2-T-01: one card per searching
 * job, each with its own timer); the timer strip is the recorded demo
 * "time passes" tap (R2-T-03). `proposed` (R2-T-04) swaps the actions
 * for the waiting line + Withdraw; `note` is a one-line status under
 * the meta ("Sarah kept her original time").
 */
export function requestCard({
  payout, name, meta, address, lines = [], expires = 'EXPIRES IN 1H 24M', where = '88 Leonard St, 4B · 1.2 mi',
  idx = 0, proposed = '', note = '', count = '',
}) {
  const key = ` data-req="${idx}"`;
  /* R3-T-03: "$108 · 1 item" — two same-day requests differ by more than the payout */
  const head = `<b>${payout}</b>${count ? `<span class="req-card__count">· ${count}</span>` : ''}`;
  const actions = proposed
    ? `<p class="req-card__proposed">Time proposed · ${proposed} — waiting for Sarah</p>
    <div class="req-card__actions">
      ${ctaSmall('View Details', { attrs: `data-act="view-details"${key}` }).replace('class="cta-small"', 'class="cta-small cta-small--dark"')}
      <button type="button" class="t-link req-card__withdraw" data-act="withdraw"${key}>Withdraw</button>
    </div>`
    : `<div class="req-card__actions">
      ${ctaSmall('View Details', { attrs: `data-act="view-details"${key}` }).replace('class="cta-small"', 'class="cta-small cta-small--dark"')}
      ${ctaSmall('Decline', { attrs: `data-act="decline"${key}` })}
    </div>`;
  return `<article class="req-card"${key}>
  <div class="req-card__timer" data-act="time-passes"${key} title="Demo: time passes"><span data-timer${key}>${expires}</span><span>${where}</span></div>
  <div class="req-card__details">
    <div class="req-card__who">
      <div class="req-card__name">${head}<span>|</span><span>${name}</span></div>
      <div class="req-card__meta"><span>${meta}</span><span>◉ <b>${address}</b></span>${note ? `<span class="req-card__note">${note}</span>` : ''}</div>
    </div>
    <ul class="req-card__items">${lines.map((l) => `<li>${l}</li>`).join('')}</ul>
    ${actions}
  </div>
</article>`;
}

/** Active Job Card (470:3993) — date badge, name/meta, payout, progress,
    pill + right text. `payout: null` suppresses the payout column
    (R2-T-06: a withdrawn / expired request never was a job). `closed`
    (R3-T-03) is the muted "Done today" variant for cancelled / withdrawn
    / expired rows — nothing left to do, no payout column. */
export function jobCard({ month, day, name, meta, payout, status = 'confirmed', pillLabel, stage = 'confirmed', right = '', rightInk = false, attrs = '', closed = false }) {
  const pay = payout == null || closed ? '' : `<div class="job-card__pay"><span class="job-card__payout">${payout}</span><span class="job-card__paylabel">Payout</span></div>`;
  return `<article class="job-card${closed ? ' job-card--closed' : ''}" ${attrs}>
  <div class="job-card__top">
    <div class="appt-card__date"><span class="appt-card__month">${month}</span><span class="appt-card__day">${day}</span></div>
    <div class="job-card__info"><span class="job-card__name">${name}</span><span class="job-card__meta">${meta}</span></div>
    ${pay}
  </div>
  ${progressBar(stage)}
  <div class="job-card__bottom${rightInk ? ' job-card__bottom--ink' : ''}">${pill(status, pillLabel)}<span>${right}</span></div>
</article>`;
}

/** "Removed at the visit — Suit Jacket · Hem / Adjust Length  $120"
    lines under the T05 cards (R2-T-08). */
export function removedRows(removed = []) {
  if (!removed.length) return '';
  return `<div class="t-removed">${removed.map((r) => `<div class="t-removed__row"><span>Removed at the visit — ${r.type} · ${r.jobs.join(', ')}</span><s>${money(r.amount)}</s></div>`).join('')}</div>`;
}

/**
 * T03 pre-visit "Can't make it" modal (R2-T-05, R3-T-05): two T2 radio
 * rows, a consequence line that follows the selected row, and a confirm
 * that names the action once a reason is chosen (`Cancel Job` / `Mark
 * No-show`). The no-show row is disabled while the visit is still ahead
 * — the seed's Jul 12 fiction counts as today. `onConfirm(reason)` gets
 * 'cant-make-it' or 'no-show'. The frame (612:4397) draws "I need to
 * cancel" selected.
 */
const CONSEQUENCE = {
  'cant-make-it': (a) => `The job closes, Sarah is notified and her ${money(depositOf(a))} deposit is refunded.`,
  'no-show': () => 'The job closes and Sarah is notified. No fee is charged this time.',
};
const CONFIRM_LABEL = { 'cant-make-it': 'Cancel Job', 'no-show': 'Mark No-show' };
/** Is the visit still ahead of us? The seed's Jul 12 is "today". */
export const visitAhead = (a, now = Date.now()) => !isSeed(a) && (parseWhen(a?.when)?.date.getTime() ?? 0) > now;

export function cantMakeItHtml(a = null, { selected = null } = {}) {
  const ahead = !!a && visitAhead(a);
  const noShowNote = ahead ? `<span class="radio-row__note">Available after ${fmtWhen(a.when)}</span>` : '';
  const consequence = selected ? CONSEQUENCE[selected]?.(a) ?? '' : '';
  return `<div class="modal modal--reasons">
  <h2 class="modal__title">Can’t make this visit?</h2>
  <div class="reasons reasons--modal" role="radiogroup" aria-label="Reason">
    ${radioRow('I need to cancel', { selected: selected === 'cant-make-it', attrs: 'data-reason="cant-make-it"' })}
    ${hairline()}
    ${radioRow(`Sarah didn’t show${noShowNote}`, { selected: selected === 'no-show', attrs: `data-reason="no-show"${ahead ? ' disabled aria-disabled="true"' : ''}` })}
  </div>
  <p class="modal__consequence" data-consequence${consequence ? '' : ' hidden'}>${consequence}</p>
  <div class="modal__actions">
    ${cta(selected ? CONFIRM_LABEL[selected] : 'Confirm', { attrs: 'data-act="confirm-cancel"' })}
    ${cta('Go Back', { variant: 'secondary', attrs: 'data-act="go-back"' })}
  </div>
</div>`;
}
export function openCantMakeIt(a, onConfirm) {
  if (typeof a === 'function') { onConfirm = a; a = null; }   // round-2 call shape
  return modalOverlay(cantMakeItHtml(a), { dataS: 't03.1-cant-make-it' }, (root, close) => {
    let reason = null;
    const line = root.querySelector('[data-consequence]');
    const confirm = root.querySelector('[data-act="confirm-cancel"]');
    root.querySelectorAll('[data-reason]').forEach((el) => el.addEventListener('click', () => {
      if (el.disabled) return;
      reason = el.dataset.reason;
      root.querySelectorAll('.radio-row').forEach((r) => { r.classList.toggle('radio-row--selected', r === el); r.setAttribute('aria-checked', r === el); });
      if (line) { line.textContent = CONSEQUENCE[reason]?.(a) ?? ''; line.hidden = !line.textContent; }
      if (confirm) confirm.textContent = CONFIRM_LABEL[reason] ?? 'Confirm';
    }));
    confirm?.addEventListener('click', () => {
      if (!reason) { toast('Choose a reason first'); return; }
      close();
      onConfirm(reason);
    });
    root.querySelector('[data-act="go-back"]')?.addEventListener('click', () => close());
  });
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

/** "View Order Summary ⌄" serif disclosure (T07/T08) — chevron points
    down when closed, up when open (R1-T-13). */
export function orderDropdown(open = false) {
  return `<button type="button" class="order-dropdown${open ? ' is-open' : ''}" data-act="order-summary" aria-expanded="${open}">
  <span>View Order Summary</span>
  <svg class="order-dropdown__chevron" width="16" height="8" viewBox="0 0 16 8" fill="none" aria-hidden="true"><path d="M1 1L8 7L15 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
</button>`;
}

/** Taily Fee (10%) / Your Payout rows under an order. */
export function payoutRows({ fee, payout }) {
  return `${feeRow(money(fee), 'Taily Fee (10%)', { line: true })}
      ${feeRow(money(payout), 'Your Payout')}`;
}

/**
 * Tailor - Garment Card (238:5113) — Appt (editable at the visit) and
 * Appt_View (T05–T08 summaries). Chip + rows reuse the user garment-card
 * classes; the upload/comment rows are tailor-only. Appt mirrors 02's
 * editor: quantity/item/job selectors, added services as Additional
 * rows with ✕, the ⊕ Additional Service trigger. Appt_View carries no
 * ✕ (R1-T-09) and shows captured photos / the tailor's note when there
 * are any, else the frame's add-tile and “Comment” placeholder.
 */
export function tailorGarmentCard({
  variant = 'Appt_View', type = 'Suit Jacket', qty = 1, price = '$120', priceInfo = false, added = false,
  services = ['Hem / Adjust Length'], addedJobs = [], before = 0, pinned = 0, comment = '', commentOpen = false, index = 0,
}) {
  const art = GARMENT_ICONS[type] ? `<span class="garment-card__artbox"><img class="garment-card__art" src="${GARMENT_ICONS[type]}" alt="${type}"></span>` : '';
  const chip = `<div class="garment-card__chip">${art}<span class="garment-card__price${(priceInfo || added) ? ' garment-card__price--info' : ''}">${price}</span></div>`;
  const gi = ` data-gi="${index}"`;
  const shots = (n) => Array.from({ length: n }, () => photoTile('photo')).join('');
  let rows;
  if (variant === 'Appt') {
    const [primary, ...extra] = services;
    const addTile = (kind) => `<button type="button" class="tgc__tile-btn" data-act="add-photo" data-kind="${kind}"${gi} aria-label="Add ${kind} photo">${photoTile('add')}</button>`;
    const note = (commentOpen || comment)
      ? `<textarea class="tgc__note" data-act="note"${gi} rows="1" placeholder="Note for Sarah…" aria-label="Comment">${esc(comment)}</textarea>`
      : `<button type="button" class="tgc__comment" data-act="comment"${gi}>${ICON_ADD_CIRCLE}<span>Add Comment</span></button>`;
    rows = `<div class="garment-card__row">
      ${selector('quantity', String(qty), ['1', '2', '3', '4', '5'], { attrs: `data-sel="qty"${gi}` })}
      ${selector('item', type, Object.keys(GARMENT_TYPES), { attrs: `data-sel="item"${gi}` })}
    </div>
    <div class="garment-card__service">${selector('job', primary, Object.keys(JOB_TYPES), { attrs: `data-sel="job" data-ji="0"${gi}` })}</div>
    ${extra.map((s, j) => `<div class="garment-card__service">${additionalSelector({ value: s, attrs: `data-sel="added" data-ji="${j + 1}"${gi}` })}</div>`).join('')}
    ${additionalSelector({ attrs: `data-sel="add"${gi}` })}
    <div class="tgc__group"><span class="tgc__label">Upload Before Photos</span><div class="photo-tiles">${shots(before)}${addTile('before')}</div></div>
    <div class="tgc__group"><span class="tgc__label">Upload Pinned Photos</span><div class="photo-tiles">${shots(pinned)}${addTile('pinned')}</div></div>
    ${note}`;
  } else {
    rows = `<div class="garment-card__row garment-card__row--tight"><span>${qty}</span><span>${type}</span></div>
    ${services.map((s) => `<div class="garment-card__service${(added || addedJobs.includes(s)) ? ' garment-card__service--info' : ''}">${s}</div>`).join('')}
    <div class="tgc__group"><span class="tgc__label">Before Photos</span><div class="photo-tiles">${before ? shots(before) : photoTile('add')}</div></div>
    <div class="tgc__group"><span class="tgc__label">Pinned Photos</span><div class="photo-tiles">${pinned ? shots(pinned) : photoTile('add')}</div></div>
    <span class="tgc__comment-view">“${comment ? esc(comment) : 'Comment'}”</span>`;
  }
  const close = variant === 'Appt' ? `<button type="button" class="garment-card__close" data-act="remove-garment"${gi} aria-label="Remove garment">✕</button>` : '';
  return `<article class="garment-card tgc${variant === 'Appt' ? '' : ' garment-card--view'}${added ? ' garment-card--info' : ''}">
  ${chip}
  <div class="garment-card__content tgc__content">${rows}</div>
  ${close}
</article>`;
}

/**
 * A garment list as tailor cards. `marks` (from orderMarks) paints what
 * changed at the visit in semantic/info; `plain` ignores the markers the
 * final order carries (T06/T07/T08 mirror 04D, which paints nothing).
 */
export function orderCards(garments, { variant = 'Appt_View', marks = null, plain = false } = {}) {
  return garments.map((g, i) => {
    const m = marks?.[i] ?? (plain ? {} : { added: !!g.added, addedJobs: g.addedJobs ?? [] });
    return tailorGarmentCard({
      variant, type: g.type, qty: g.qty ?? 1, price: money(garmentAmount(g)), services: g.jobs,
      before: g.before ?? 0, pinned: g.pinned ?? 0, comment: g.comment ?? '', commentOpen: !!g.commentOpen, index: i,
      added: !!m.added, addedJobs: m.addedJobs ?? [], priceInfo: !!m.priceInfo,
    });
  }).join('\n      ');
}

/**
 * The at-visit editor's wiring (R1-T-03) — 02's selector wiring on a
 * draft garment list: one menu open at a time, options mutate the draft
 * and `rerender()`, ✕ drops an added service or a whole garment, add
 * tiles capture a placeholder photo, Add Comment opens a note.
 */
export function wireOrderEditor(root, garments, rerender) {
  const closeMenus = () => root.querySelectorAll('.selector--open').forEach((el) => el.classList.remove('selector--open'));
  root.querySelectorAll('.selector__trigger').forEach((btn) => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const sel = btn.closest('.selector');
    const wasOpen = sel.classList.contains('selector--open');
    closeMenus();
    if (!wasOpen) sel.classList.add('selector--open');
  }));
  root.querySelectorAll('.selector__option').forEach((opt) => opt.addEventListener('click', (e) => {
    e.stopPropagation();
    const trigger = opt.closest('.selector').querySelector('.selector__trigger');
    const g = garments[Number(trigger.dataset.gi)];
    const v = opt.dataset.option;
    if (!g) return;
    if (trigger.dataset.sel === 'qty') g.qty = Number(v);
    if (trigger.dataset.sel === 'item') g.type = v;
    if (trigger.dataset.sel === 'job') g.jobs[Number(trigger.dataset.ji)] = v;
    if (trigger.dataset.sel === 'add') g.jobs.push(v);
    if (trigger.dataset.sel === 'added') g.jobs[Number(trigger.dataset.ji)] = v;
    rerender();
  }));
  root.querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const g = garments[Number(btn.dataset.gi)];
    if (!g) return;
    g.jobs.splice(Number(btn.dataset.ji), 1);
    rerender();
  }));
  root.querySelectorAll('[data-act="remove-garment"]').forEach((btn) => btn.addEventListener('click', () => {
    if (garments.length <= 1) { toast('Keep at least one garment'); return; }
    garments.splice(Number(btn.dataset.gi), 1);
    rerender();
  }));
  root.querySelectorAll('[data-act="add-photo"]').forEach((btn) => btn.addEventListener('click', () => {
    const g = garments[Number(btn.dataset.gi)];
    if (!g) return;
    const key = btn.dataset.kind === 'pinned' ? 'pinned' : 'before';
    g[key] = (g[key] ?? 0) + 1;
    rerender();
  }));
  root.querySelectorAll('[data-act="comment"]').forEach((btn) => btn.addEventListener('click', () => {
    const gi = Number(btn.dataset.gi);
    const g = garments[gi];
    if (!g) return;
    g.commentOpen = true;
    rerender();
    root.querySelector(`[data-act="note"][data-gi="${gi}"]`)?.focus();
  }));
  root.querySelectorAll('[data-act="note"]').forEach((ta) => ta.addEventListener('input', () => {
    const g = garments[Number(ta.dataset.gi)];
    if (g) g.comment = ta.value;
  }));
  root.querySelectorAll('[data-act="add-garment"]').forEach((btn) => btn.addEventListener('click', () => {
    garments.push({ type: 'Suit Jacket', jobs: ['Sleeve / Adjust Length'], qty: 1, photos: 0 });
    rerender();
  }));
  root.addEventListener('click', closeMenus);
}
