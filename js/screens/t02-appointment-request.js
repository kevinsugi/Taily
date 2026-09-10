/* ============================================================
   T02 - Appointment Request — Figma 455:2170.
   "$180 | New Request" header, Order Summary (customer card +
   ViewOnly garment cards + fee rows), Accept / Decline. Active=T-Home.
   UX-LOOP R1-T-02: cards, fee, payout, CTA and customer rows come from
   the live booking; the harness deep link keeps the frame's rows.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { summaryCard, garmentCard, cta } from '../components.js';
import { money, garmentAmount } from '../data.js';
import { state, tailorAccepts } from '../state.js';
import { tailorChrome, wireTailorNav, payoutRows } from '../tailor-components.js';
import { job, jobView, tailorUi, isFixture, CUSTOMER, CUSTOMER_ROWS } from '../tailor-data.js';

/** The booked order as ViewOnly cards (shared with T03). */
export function bookedCards(v) {
  return v.garments.map((g) => garmentCard({
    variant: 'ViewOnly', type: g.type, qty: g.qty ?? 1, price: money(garmentAmount(g)), services: g.jobs, photos: g.photos ?? 2,
  })).join('\n      ');
}

function renderScreen(s) {
  const v = jobView(job(s));
  const rows = isFixture() ? CUSTOMER_ROWS : v.rows;
  return `${tailorChrome('home')}
<div class="body" data-s="t02-appointment-request">
  <div class="t-header">
    <button type="button" class="t-back" data-act="back" aria-label="Back">‹</button>
    <h1 class="t-title w-600 c-ink">${v.money.payout} | New Request</h1>
  </div>
  <div class="summary">
    <h2 class="t-title w-600 c-ink summary__title">Order Summary</h2>
    ${summaryCard({ initials: CUSTOMER.initials, name: CUSTOMER.name, rows })}
    <div class="garments-card">
      ${bookedCards(v)}
      ${payoutRows(v)}
    </div>
  </div>
  <div class="t-actions">
    ${cta(`Accept Request · ${v.money.payout}`, { attrs: 'data-act="accept"' })}
    ${cta('Decline', { variant: 'secondary', attrs: 'data-act="decline"' })}
  </div>
</div>`;
}

function wire(root) {
  wireTailorNav(root);
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('t01-home'));
  root.querySelector('[data-act="accept"]')?.addEventListener('click', () => {
    tailorAccepts();                       // searching → confirmed (no-op if already confirmed)
    const ui = tailorUi(state);
    ui.requestHandled = true;
    ui.justAccepted = true;                // T03 renders "Booking Confirmed!" once
    go('t03-request-accepted');
  });
  root.querySelector('[data-act="decline"]')?.addEventListener('click', () => go('t03a-decline-request'));
}

register('t02-appointment-request', renderScreen, wire);
