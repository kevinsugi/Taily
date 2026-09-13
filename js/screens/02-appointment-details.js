/* ============================================================
   02 - Appointment Details — Figma 277:2676.
   Heading+address group (mirrors 01, opens the 02b sheet) + two
   full-width filter pills + garments group (label 8 over the cards) +
   CTA bar (top hairline, CTA with the live visitation fee, disclaimer).
   Sections stack at gap 16.
   UX-LOOP round 7 (Kevin's money model v2): the deposit is gone. A fee
   card above the CTA bar reads "Visitation fee $25 · 2 items" — the
   tier for the LIVE item count on the form (1–4 → $25, 5–10 → $50,
   11+ → $100; the $50 / $100 tiers add data.js VISIT_FEE_NOTE) — and
   the CTA reads "Reserve Appt · $25" (round 9, Kevin — was "Hold $25
   Visitation Fee"): held now, charged when a tailor accepts,
   alterations paid at handoff.
   Round 9 (Kevin): both pills open as "Select Time" (state.appt.when /
   needBy start null) and the request is inert until both are picked;
   Round 10 (Kevin, new frame 657:4875 — the old 277:2676 was deleted):
   the editable garment cards sit as flat rows INSIDE one white garments
   card like every other page (`flat`), followed by the money rows —
   Alterations (est.) / Visitation fee - Due Today / Total — and the
   paid-at-handoff note; "+ Additional Garment" stands below the card;
   the fee card is gone. The four sheet backdrops were re-synced to it.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, filterPill, garmentCard, cta, toast, orderRows } from '../components.js';
import { money, garmentAmount, isAfter } from '../data.js';
import { state, addGarment, removeGarment, bookingLines, addressLine, hasAddress } from '../state.js';
/* Sheets open as in-place overlays (v3 sheetShow parity) — navigating to
   the 02a/04a routes would rebuild this screen and flash. The routes
   remain registered for the diff harness. */
import { openDateTimeOverlay } from './02.1-date-time-sheet.js';
import { openAddressOverlay } from './02.2-address-sheet.js';
import { openPaymentOverlay } from './02.3-payment-sheet.js';

/* The frame's seeded garments (UX-LOOP R1-U-02, Figma updated to
   match): a $120 Hem jacket and an $80 Sleeve jacket, two photos each —
   the $200 / $20 booking the whole fiction is built on. Seeded ONLY for
   the harness's direct loads (02, its sheets, 03/Requested); a live
   visit always arrives with the garments Start Booking built
   (R1-U-12). */
export function ensureGarments() {
  if (state.garments.length || window.__tailyNavigated) return;
  addGarment({ type: 'Suit Jacket', jobs: ['Hem / Adjust Length'], photos: 2 });
  addGarment({ type: 'Suit Jacket', jobs: ['Sleeve / Adjust Length'], photos: 2 });
}

const NEEDBY_MSG = 'Need-by must be after your appointment';
const PICK_TIME_MSG = 'Select a requested time';
const PICK_NEEDBY_MSG = 'Select a need-by time';
const PICK_ADDRESS_MSG = 'Enter your address';
export const PILL_EMPTY = 'Select Time';
export const needByOk = (s = state) => isAfter(s.appt.needBy, s.appt.when);

/* Exported: 02a/04a/04b draw this screen dimmed behind their scrim
   (the updated frames show it in place of the old flat backdrop). */
export function view02(s) {
  ensureGarments();
  const { appt, contact } = s;
  const totals = bookingLines(null);

  const cards = s.garments.map((g, i) => garmentCard({
    variant: 'WithPhoto',
    flat: true,
    type: g.type,
    price: money(garmentAmount(g)),
    services: g.jobs,
    photos: g.photos ?? 0,
    index: i,
  })).join('\n  ');

  return `${chrome('home')}
<div class="body" data-s="02-appointment-details">
  <div class="home-heading">
    <h1 class="t-title t-title--tight c-ink">Appointment Details</h1>
    <p class="t-body c-ink home-address" data-act="address" role="button" tabindex="0"><span class="emoji">📍</span> <span data-addr-text>${addressLine(contact)}</span></p>
  </div>
  <div class="filters">
    ${filterPill('Requested time:', appt.when ?? PILL_EMPTY, { attrs: 'data-act="time"' })}
    ${filterPill('Need by:', appt.needBy ?? PILL_EMPTY, { attrs: 'data-act="needby"', error: needByOk(s) ? '' : NEEDBY_MSG })}
  </div>
  <div class="garments-card" data-garments>
    ${cards}
    ${orderRows(totals, { est: true, feeDesc: 'Visitation fee - Due Today' })}
    <p class="t-small c-500 fee-note">${ALTERATIONS_NOTE}</p>
    ${totals.note ? `<p class="t-small c-500 fee-note" data-fee-tier-note>${totals.note}</p>` : ''}
  </div>
  <button type="button" class="add-garment" data-act="add-garment">+ Additional Garment</button>
  <div class="cta-bar">
    ${cta(`Reserve Appt · ${money(totals.visitFee)}`, { attrs: 'data-act="request"' })}
    <p class="t-small c-500 cta-bar__note">A Taily-certified tailor near you will accept your request — final pricing is confirmed at your appointment.</p>
  </div>
</div>`;
}

/* The note under the money rows — the same sentence 03/Confirmed and
   03/Reminder print (kept local: importing it from 03/Confirmed would
   pull the status family into the booking form's module graph). */
const ALTERATIONS_NOTE = 'Alterations are paid at pickup or delivery.';

/* UX-LOOP R1-U-11: repaint the need-by pill's validity in place after
   the picker closes (the picker updates the pill text without
   re-rendering — see 02.1's setPillValue). */
function syncNeedBy(root) {
  const pill = root.querySelector('[data-act="needby"]')?.closest('.filter-pill');
  if (!pill) return;
  const ok = needByOk();
  pill.classList.toggle('filter-pill--error', !ok);
  const help = pill.querySelector('[data-pill-help]');
  if (help) help.textContent = ok ? '' : NEEDBY_MSG;
  /* round 9: a pill the wheel just filled drops its "Select …" error */
  if (state.appt.when) markPill(root, 'time', '');
}

/* Round 9: paint / clear a pill's error line in place (same chassis as
   the need-by validation — no disabled CTA variant exists). */
function markPill(root, act, msg) {
  const pill = root.querySelector(`[data-act="${act}"]`)?.closest('.filter-pill');
  if (!pill) return;
  pill.classList.toggle('filter-pill--error', !!msg);
  const help = pill.querySelector('[data-pill-help]');
  if (help) help.textContent = msg;
}

/** Round 9: the first thing still missing before a request can go out —
    the address (round 12, Kevin: "Please Enter Address" until one is
    entered), the requested time, then the need-by, then the need-by order. */
export function requestBlocker(s = state) {
  if (!hasAddress(s.contact)) return { act: 'address', msg: PICK_ADDRESS_MSG };
  if (!s.appt.when) return { act: 'time', msg: PICK_TIME_MSG };
  if (!s.appt.needBy) return { act: 'needby', msg: PICK_NEEDBY_MSG };
  if (!needByOk(s)) return { act: 'needby', msg: NEEDBY_MSG };
  return null;
}

function wire(root) {
  /* Selector dropdowns (535:1582) — one open at a time; clicking an
     option writes the garment and re-renders; click-away closes. */
  const closeMenus = () => root.querySelectorAll('.selector--open').forEach((el) => el.classList.remove('selector--open'));
  root.querySelectorAll('.selector__trigger').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sel = btn.closest('.selector');
      const wasOpen = sel.classList.contains('selector--open');
      closeMenus();
      if (!wasOpen) sel.classList.add('selector--open');
    });
  });
  root.querySelectorAll('.selector__option').forEach((opt) => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const trigger = opt.closest('.selector').querySelector('.selector__trigger');
      const g = state.garments[Number(trigger.dataset.gi)];
      const v = opt.dataset.option;
      if (!g) return;
      if (trigger.dataset.sel === 'item') g.type = v;
      if (trigger.dataset.sel === 'job') g.jobs[Number(trigger.dataset.ji)] = v;
      if (trigger.dataset.sel === 'add') g.jobs.push(v);
      if (trigger.dataset.sel === 'added') g.jobs[Number(trigger.dataset.ji)] = v;
      go('02-appointment-details', { replace: true });
    });
  });
  /* ✕ on an added-service row drops that service */
  root.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const g = state.garments[Number(btn.dataset.gi)];
      if (!g) return;
      g.jobs.splice(Number(btn.dataset.ji), 1);
      go('02-appointment-details', { replace: true });
    });
  });
  /* ✕ on the card removes the garment; removing the LAST one returns
     to Home with nothing selected */
  root.querySelectorAll('[data-act="remove-garment"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeGarment(Number(btn.dataset.gi));
      if (!state.garments.length) {
        state.ui ??= {};
        state.ui.homeSelection = {};
        go('01-home');
      } else {
        go('02-appointment-details', { replace: true });
      }
    });
  });
  /* UX-LOOP R2-U-09: the camera "+" tile captures a placeholder photo
     (the card takes the WithPhoto look); a photo's ✕ drops it again —
     mirrors the tailor editor's add-photo. Cards render in
     state.garments order; the ✕ control carries the index. */
  root.querySelectorAll('.garment-card').forEach((card) => {
    const g = state.garments[Number(card.querySelector('[data-act="remove-garment"]')?.dataset.gi)];
    if (!g) return;
    card.querySelector('.photo-tile--add')?.addEventListener('click', () => {
      g.photos = (g.photos ?? 0) + 1;
      go('02-appointment-details', { replace: true });
    });
    card.querySelectorAll('.photo-tile__cancel').forEach((x) => x.addEventListener('click', (e) => {
      e.stopPropagation();
      g.photos = Math.max(0, (g.photos ?? 0) - 1);
      go('02-appointment-details', { replace: true });
    }));
  });
  root.addEventListener('click', closeMenus);

  root.querySelector('[data-act="time"]')?.addEventListener('click', () => openDateTimeOverlay('appt'));
  root.querySelector('[data-act="needby"]')?.addEventListener('click', () => openDateTimeOverlay('needby'));
  /* the picker announces a pill change on .filters (dies with the render) */
  root.querySelector('.filters')?.addEventListener('taily:appt-changed', () => syncNeedBy(root));
  root.querySelector('[data-act="address"]')?.addEventListener('click', () => openAddressOverlay());
  root.querySelector('[data-act="request"]')?.addEventListener('click', () => {
    /* R1-U-11 / round 9: a missing time, a missing need-by or an
       impossible need-by keeps the request inert (no disabled CTA
       variant exists — the pill + toast explain) */
    const blocker = requestBlocker();
    /* round 12: no address yet → the address sheet opens with the toast */
    if (blocker?.act === 'address') { toast(blocker.msg); openAddressOverlay(); return; }
    if (blocker) { markPill(root, blocker.act, blocker.msg); toast(blocker.msg); return; }
    openPaymentOverlay();
  });
  root.querySelector('[data-act="add-garment"]')?.addEventListener('click', () => {
    /* back to Home to pick more tiles — the tile badges mirror the
       current garments, and Start Booking reconciles (01-home.js) so
       card customisations survive the round-trip */
    state.ui ??= {};
    state.ui.homeSelection = state.garments.reduce((m, g) => {
      m[g.type] = (m[g.type] ?? 0) + 1;   // round 12: one card = one item
      return m;
    }, {});
    go('01-home');
  });
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (el.dataset.nav === 'bookings') go('09-bookings');
      if (el.dataset.nav === 'home') go('01-home');
    });
  });
}

register('02-appointment-details', view02, wire);
