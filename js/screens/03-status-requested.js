/* ============================================================
   03 - Finding Your Tailor — Figma 281:1237.
   Map (ref raster) + Requested hero + request meta card +
   View All Appointments CTA + accent cancel line. Gap 8.
   State: the searching appointment (post-request).
   Phase R3 (Kevin): the request card reads the ACTUAL order — address/
   visit, requested time and items/estimate/deposit come from state, so
   it matches whatever was booked. The frame's requested-time fixture
   ('Thu, Jul 9 · 9:30 AM') is stale — text-parity ALLOWs it; the
   address and estimate lines match the frame since UX-LOOP R1
   (Home Visit fiction, $200 / $20 seeded order). Cancel request opens
   the R1 popup. The deposit is a HOLD until the tailor confirms
   (02.3's copy) — "held" here, released on cancel (R1-U-03).
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, infoCard, metaRow, cta } from '../components.js';
import { money, itemsLabel } from '../data.js';
import { state, tailorAccepts, bookingLines } from '../state.js';
import { ensureGarments } from './02-appointment-details.js';
import { openReschedulePopup } from './03.1-reschedule-popup.js';

function renderScreen(s) {
  /* direct load (diff harness): seed 02's garments so the estimate has
     something to price */
  ensureGarments();
  const t = bookingLines(null);
  const n = s.garments.reduce((sum, g) => sum + g.qty, 0);
  return `${chrome('home')}
<div class="body" data-s="03-status-requested">
  ${statusHero({ variant: 'requested', title: 'Finding your tailor…', body: 'We’re matching your job with a Taily-certified tailor near you. We’ll notify you the moment one accepts.' })}
  <!-- Placeholder per Kevin: this becomes a live Google Map centred on
       the user's location. The frame's raster is deliberately not used.
       Phase R8: the frame now leads with the Status Hero, map second. -->
  <div class="map-card map-card--placeholder" data-act="map">
    <span class="map-card__pin">◉</span>
    <span class="t-small c-500">Map preview — connects to Google Maps</span>
  </div>
  ${infoCard([
    metaRow('◉', `${s.contact.street}, ${s.contact.unit} — ${s.appt.where}`),
    metaRow('▤', s.appt.when),
    metaRow('✂', `${itemsLabel(n, 'item')} · ${money(t.subtotal)}.00+ est. · ${money(t.deposit)} deposit held`),
  ].join(''))}
  ${cta('View All Appointments', { attrs: 'data-act="bookings"' })}
  <button type="button" class="cancel-line" data-act="cancel">Cancel request — deposit refunded</button>
</div>`;
}

function wire(root) {
  root.querySelector('[data-act="bookings"]')?.addEventListener('click', () => go('09-bookings'));
  /* Phase R3 (Kevin): cancel request runs through the R1 popup —
     cancel-worded (UX-003) */
  root.querySelector('[data-act="cancel"]')?.addEventListener('click', () => openReschedulePopup('cancel'));
  // demo affordance: tapping the map simulates the tailor accepting
  root.querySelector('[data-act="map"]')?.addEventListener('click', () => { tailorAccepts(); go('03-status-confirmed'); });
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('03-status-requested', renderScreen, wire);
