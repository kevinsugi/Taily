/* ============================================================
   01 - Home — Figma 277:2653.
   Heading + 3x3 garment tile grid + Start Booking CTA + upcoming
   appointment card. Sections stack at gap 16 (measured).
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, garmentTile, cta, apptCard } from '../components.js';
import { GARMENT_TYPES } from '../data.js';
import { state, addGarment, clearGarments } from '../state.js';

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

function renderScreen(s) {
  const sel = s.ui?.homeSelection ?? {};
  const a = s.upcoming[0];

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
    <h1 class="t-title t-title--tight c-ink">What Are We Tailoring?</h1>
    <p class="t-body c-ink"><span class="emoji">📍</span> 88 Leonard St, New York, NY</p>
  </div>
  <div class="tile-grid">${tiles}</div>
  ${cta('Start Booking', { attrs: 'data-act="start-booking"' })}
  <div class="upcoming-header">
    <span class="t-body w-600 c-500">Upcoming Appointments</span>
    <button type="button" class="t-body w-600 c-accent-ink" data-act="view-all">View All</button>
  </div>
  ${card}
</div>`;
}

function wire(root) {
  root.querySelectorAll('[data-tile]').forEach((el) => {
    el.addEventListener('click', () => {
      const t = el.dataset.tile;
      const sel = selection();
      sel[t] = (sel[t] ?? 0) + 1;
      go('01-home', { replace: true });
    });
  });
  root.querySelector('[data-act="start-booking"]')?.addEventListener('click', () => {
    // v3 startBooking: selection -> garments with the default job
    const sel = selection();
    clearGarments();
    for (const [type, qty] of Object.entries(sel)) {
      if (qty > 0) addGarment({ type, jobs: ['Hem / Adjust Length'], qty, photos: 0 });
    }
    go('02-appointment-details');
  });
  root.querySelector('[data-act="view-all"]')?.addEventListener('click', () => go('09-bookings'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (el.dataset.nav === 'bookings') go('09-bookings');
      if (el.dataset.nav === 'home') go('01-home');
    });
  });
}

register('01-home', renderScreen, wire);
