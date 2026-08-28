/* ============================================================
   03 - Finding Your Tailor — Figma 281:1237.
   Map (ref raster) + Requested hero + request meta card +
   View All Appointments CTA + accent cancel line. Gap 8.
   State: the searching appointment (post-request).
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, infoCard, metaRow, cta } from '../components.js';
import { state, tailorAccepts } from '../state.js';

function renderScreen() {
  return `${chrome('home')}
<div class="body" data-s="03-finding-tailor">
  <!-- Placeholder per Kevin: this becomes a live Google Map centred on
       the user's location. The frame's raster is deliberately not used. -->
  <div class="map-card map-card--placeholder" data-act="map">
    <span class="map-card__pin">◉</span>
    <span class="t-small c-500">Map preview — connects to Google Maps</span>
  </div>
  ${statusHero({ variant: 'requested', title: 'Finding your tailor…', body: 'We’re matching your job with a Taily-certified tailor near you. We’ll notify you the moment one accepts.' })}
  ${infoCard([
    metaRow('◉', '88 Leonard St, 4B — Home Visit'),
    metaRow('▤', 'Thu, Jul 9 · 9:30 AM'),
    metaRow('✂', '2 items · $200.00+ est. · $20 deposit held'),
  ].join(''))}
  ${cta('View All Appointments', { attrs: 'data-act="bookings"' })}
  <button type="button" class="cancel-line" data-act="cancel">Cancel request — deposit refunded</button>
</div>`;
}

function wire(root) {
  root.querySelector('[data-act="bookings"]')?.addEventListener('click', () => go('09-bookings'));
  root.querySelector('[data-act="cancel"]')?.addEventListener('click', () => go('01-home'));
  // demo affordance: tapping the map simulates the tailor accepting
  root.querySelector('[data-act="map"]')?.addEventListener('click', () => { tailorAccepts(); go('04c-appointment-confirmed'); });
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('03-finding-tailor', renderScreen, wire);
