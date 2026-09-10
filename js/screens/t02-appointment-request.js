/* ============================================================
   T02 - Appointment Request — Figma 455:2170.
   "$180 | New Request" header, Order Summary (customer card +
   ViewOnly garment cards + fee rows), Accept / Decline. Active=T-Home.
   UX-LOOP R1-T-02: cards, fee, payout, CTA and customer rows come from
   the live booking; the harness deep link keeps the frame's rows.
   Round 2: renders the tapped job (R2-T-01) and passes it to
   tailorAccepts (R2-T-02); Accept lands on T03 with `replace` and an
   already-accepted job shows an inert `Accepted` with no Decline
   (R2-T-11); an expired request shows no Accept at all (R2-T-03).
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { summaryCard, garmentCard, cta, toast } from '../components.js';
import { money, garmentAmount } from '../data.js';
import { state } from '../state.js';
import { tailorChrome, wireTailorNav, payoutRows } from '../tailor-components.js';
import { current, jobView, tailorOf, isFixture, isSeed, T, CUSTOMER, CUSTOMER_ROWS } from '../tailor-data.js';

/** The booked order as ViewOnly cards (shared with T03). */
export function bookedCards(v) {
  return v.garments.map((g) => garmentCard({
    variant: 'ViewOnly', type: g.type, qty: g.qty ?? 1, price: money(garmentAmount(g)), services: g.jobs, photos: g.photos ?? 2,
  })).join('\n      ');
}

/* the seed's request is "pending" for Marco until he acts on it, even
   though its status is already confirmed (the frame's fiction) */
const pending = (a, v) => v.canon === 'searching' || (isSeed(a) && v.canon === 'confirmed' && !tailorOf(a).requestHandled);

/** Exported: `mode` 'accepted' | 'expired' forces the round-3 frames
    "T02 - Appointment Request / Accepted · Expired" on their fixture routes. */
export function viewRequest(s, mode = null) {
  const a = current(s);
  const v = jobView(a);
  const fixture = isFixture();
  const rows = fixture ? CUSTOMER_ROWS : v.rows;
  const expired = mode === 'expired' || (!fixture && v.canon === 'expired');
  const accepted = mode === 'accepted' || (!fixture && !expired && !pending(a, v));
  const title = expired ? `${v.money.payout} | Request Expired` : accepted ? `${v.money.payout} | Accepted` : `${v.money.payout} | New Request`;
  const note = expired
    ? '<p class="t-body c-500">This request lapsed before you responded. Sarah has been told — nothing to do.</p>'
    : a?.proposed?.when && !fixture
      ? `<p class="t-body c-500">You proposed ${jobView({ ...a, when: a.proposed.when }).when} — waiting for Sarah.</p>`
      : '';
  const actions = expired
    ? cta('Back to Home', { attrs: 'data-act="home"' })
    : accepted
      ? cta('Accepted', { attrs: 'data-act="accept"' })
      : `${cta(`Accept Request · ${v.money.payout}`, { attrs: 'data-act="accept"' })}
    ${cta('Decline', { variant: 'secondary', attrs: 'data-act="decline"' })}`;
  return `${tailorChrome('home')}
<div class="body" data-s="t02-appointment-request">
  <div class="t-header">
    <button type="button" class="t-back" data-act="back" aria-label="Back">‹</button>
    <h1 class="t-title w-600 c-ink">${title}</h1>
  </div>
  ${note}
  <div class="summary">
    <h2 class="t-title w-600 c-ink summary__title">Order Summary</h2>
    ${summaryCard({ initials: CUSTOMER.initials, name: CUSTOMER.name, rows })}
    <div class="garments-card">
      ${bookedCards(v)}
      ${payoutRows(v)}
    </div>
  </div>
  <div class="t-actions">
    ${actions}
  </div>
</div>`;
}

export function wire(root) {
  wireTailorNav(root);
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('t01-home'));
  root.querySelector('[data-act="home"]')?.addEventListener('click', () => go('t01-home'));
  root.querySelector('[data-act="accept"]')?.addEventListener('click', () => {
    const a = current(state);
    const v = jobView(a);
    if (v.canon === 'expired') { toast('This request expired'); return; }
    if (!pending(a, v)) { toast('Already accepted'); return; }
    if (v.canon === 'searching' && !T.accept(a)) { toast('Already accepted'); return; }
    const t = tailorOf(a);
    t.requestHandled = true;
    t.justAccepted = true;                 // T03 renders "Booking Confirmed!" once
    go('t03-request-accepted', { replace: true });   // R2-T-11: back never re-offers Accept
  });
  root.querySelector('[data-act="decline"]')?.addEventListener('click', () => go('t03a-decline-request'));
}

register('t02-appointment-request', viewRequest, wire);
