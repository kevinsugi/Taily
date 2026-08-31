/* ============================================================
   01 - Home — Figma 277:2653.
   Heading + 3x3 garment tile grid + Start Booking CTA + upcoming
   appointment card. Sections stack at gap 16 (measured).
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, garmentTile, cta, apptCard } from '../components.js';
import { GARMENT_TYPES } from '../data.js';
import { state, addGarment } from '../state.js';
import { openAddressOverlay } from './02b-address-sheet.js';

const TILE_ORDER = Object.keys(GARMENT_TYPES); // 9 types, Figma order

/* v3: home tile taps build a type -> qty selection before booking. */
function selection() {
  state.ui ??= {};
  state.ui.homeSelection ??= {};
  return state.ui.homeSelection;
}

/** Meta line per status, as the v4 frames word it. */
export function apptMeta(a) {
  const map = {
    confirmed: `Appt Date: ${a.when}`,
    tailoring: `Est. Ready Date: ${a.when}`,
    ready: `Completed: ${a.when}`,
    completed: `Picked up: ${a.when}`,
  };
  return map[a.status] ?? a.when;
}

/** Card actions per status (Figma variants). */
export function apptActions(a) {
  const map = {
    confirmed: ['Message', 'Reschedule'],
    tailoring: ['Message'],
    ready: ['Schedule Pickup / Delivery'],
    completed: ['Leave Review'],
  };
  return map[a.status] ?? [];
}

export function view01(s) {
  const sel = s.ui?.homeSelection ?? {};
  const a = s.upcoming[0];
  const anySelected = Object.values(sel).some((q) => q > 0);

  const tiles = TILE_ORDER.map((t) =>
    garmentTile(t, { qty: sel[t] ?? 0, attrs: `data-tile="${t}"` })).join('');

  const card = a ? apptCard({
    status: a.status,
    month: a.month, day: a.day,
    name: a.name,
    meta: apptMeta(a),
    itemsTitle: `${a.count} Items Total - ${a.visit}:`,
    items: a.itemLines ?? [],
    prepare: a.bring ?? [],
    actions: apptActions(a),
  }) : '';

  return `${chrome('home')}
<div class="body" data-s="01-home">
  <div class="home-heading">
    <h1 class="t-title t-title--tight c-ink">${anySelected ? 'Tap to Add More Items' : 'What Are We Tailoring?'}</h1>
    <p class="t-body c-ink home-address" data-act="address" role="button" tabindex="0"><span class="emoji">📍</span> <span data-addr-text>${s.contact.street}, ${s.userLoc}</span></p>
  </div>
  <div class="tile-grid">${tiles}</div>
  ${cta('Start Booking', { attrs: 'data-act="start-booking"' })}
  <div class="upcoming-header">
    <span class="t-section c-500">Upcoming Appointments</span>
    <button type="button" class="t-section c-accent-ink" data-act="view-all">View All</button>
  </div>
  ${card}
</div>`;
}

export function wire01(root) {
  root.querySelectorAll('[data-tile]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const t = el.dataset.tile;
      const sel = selection();
      // v3: the tile adds one; its "−" removes one (unselects at 0).
      if (e.target.closest('[data-minus]')) {
        sel[t] = Math.max(0, (sel[t] ?? 0) - 1);
        if (sel[t] === 0) delete sel[t];
      } else {
        sel[t] = (sel[t] ?? 0) + 1;
      }
      go('01-home', { replace: true });
    });
  });
  root.querySelector('[data-act="start-booking"]')?.addEventListener('click', () => {
    /* v3 startBooking, but reconciling instead of rebuilding: garments
       customised on 02 (services, qty, photos) survive the
       "+ Additional Garment" round-trip. Tile counts are the truth —
       top up with default-job cards, trim from the last card of a
       type, drop deselected types. */
    const sel = selection();
    for (const [type, want] of Object.entries(sel)) {
      if (want <= 0) continue;
      let have = state.garments.filter((g) => g.type === type).reduce((s, g) => s + g.qty, 0);
      if (want > have) addGarment({ type, jobs: ['Hem / Adjust Length'], qty: want - have, photos: 0 });
      for (let i = state.garments.length - 1; i >= 0 && have > want; i--) {
        const g = state.garments[i];
        if (g.type !== type) continue;
        const cut = Math.min(g.qty, have - want);
        g.qty -= cut;
        have -= cut;
        if (!g.qty) state.garments.splice(i, 1);
      }
    }
    state.garments = state.garments.filter((g) => (sel[g.type] ?? 0) > 0);
    go('02-appointment-details');
  });
  root.querySelector('[data-act="view-all"]')?.addEventListener('click', () => go('09-bookings'));
  root.querySelector('[data-act="address"]')?.addEventListener('click', () => openAddressOverlay());
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (el.dataset.nav === 'bookings') go('09-bookings');
      if (el.dataset.nav === 'home') go('01-home');
    });
  });
}

register('01-home', view01, wire01);
