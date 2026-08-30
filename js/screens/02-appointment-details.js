/* ============================================================
   02 - Appointment Details — Figma 277:2676.
   Title + three filter pills + garment cards + dashed add-garment +
   CTA bar (top hairline, CTA with live deposit, disclaimer).
   Sections stack at gap 16.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, filterPill, garmentCard, cta } from '../components.js';
import { JOB_TYPES } from '../data.js';
import { state, addGarment, bookingLines } from '../state.js';
/* Sheets open as in-place overlays (v3 sheetShow parity) — navigating to
   the 02a/04a routes would rebuild this screen and flash. The routes
   remain registered for the diff harness. */
import { openDateTimeOverlay } from './02a-date-time-sheet.js';
import { openPaymentOverlay } from './04a-payment-sheet.js';

/* The frame's placeholder garments (revised Aug 2026): two identical
   suit jackets, both "Hem / Adjust", two photos each, "$55" placeholder
   price. Seeded only when the user arrives without building a
   selection on Home. */
function ensureGarments() {
  if (state.garments.length) return;
  addGarment({ type: 'Suit Jacket', jobs: ['Hem / Adjust'], qty: 1, photos: 2, displayPrice: '$55' });
  addGarment({ type: 'Suit Jacket', jobs: ['Hem / Adjust'], qty: 1, photos: 2, displayPrice: '$55' });
}

function priceFor(g) {
  if (g.displayPrice) return g.displayPrice;
  const amount = Math.round(g.jobs.reduce((s, j) => s + (JOB_TYPES[j]?.price ?? 0), 0)) * g.qty;
  return `$${amount}`;
}

/* Exported: 02a/04a/04b draw this screen dimmed behind their scrim
   (the updated frames show it in place of the old flat backdrop). */
export function view02(s) {
  ensureGarments();
  const { appt, contact } = s;
  const totals = bookingLines(null);

  const cards = s.garments.map((g, i) => garmentCard({
    variant: 'WithPhoto',
    type: g.type,
    qty: g.qty,
    price: priceFor(g),
    services: g.jobs,
    photos: g.photos ?? 0,
    index: i,
  })).join('\n  ');

  return `${chrome('home')}
<div class="body" data-s="02-appointment-details">
  <h1 class="t-title c-ink">Appointment Details</h1>
  <div class="filters">
    ${filterPill('Requested time:', appt.when, { attrs: 'data-act="time"' })}
    ${filterPill('Need by:', appt.needBy, { attrs: 'data-act="needby"' })}
    ${filterPill('Address:', `${contact.street}, ${contact.unit}`, { attrs: 'data-act="address"' })}
  </div>
  <p class="t-body w-600 c-ink">Garments:</p>
  ${cards}
  <button type="button" class="add-garment" data-act="add-garment">+ Additional Garment</button>
  <div class="cta-bar">
    ${cta(`Request Tailor · $${totals.deposit} Deposit (10%)`, { attrs: 'data-act="request"' })}
    <p class="t-small c-500 cta-bar__note">A Taily-certified tailor near you will accept your request — final pricing is confirmed at your appointment.</p>
  </div>
</div>`;
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
      if (trigger.dataset.sel === 'qty') g.qty = Number(v);
      if (trigger.dataset.sel === 'item') g.type = v;
      if (trigger.dataset.sel === 'job') g.jobs[Number(trigger.dataset.ji)] = v;
      go('02-appointment-details', { replace: true });
    });
  });
  root.addEventListener('click', closeMenus);

  root.querySelector('[data-act="time"]')?.addEventListener('click', () => openDateTimeOverlay('appt'));
  root.querySelector('[data-act="needby"]')?.addEventListener('click', () => openDateTimeOverlay('needby'));
  root.querySelector('[data-act="request"]')?.addEventListener('click', () => openPaymentOverlay());
  root.querySelector('[data-act="add-garment"]')?.addEventListener('click', () => {
    addGarment({ type: 'Suit Jacket', jobs: ['Hem / Adjust Length'], qty: 1, photos: 0 });
    go('02-appointment-details', { replace: true });
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
