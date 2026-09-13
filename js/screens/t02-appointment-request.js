/* ============================================================
   T02 - Appointment Request — Figma 455:2170.
   "$200 | New Request" header, Order Summary (customer card +
   ViewOnly garment cards + the payout row), Accept / Decline. Active=T-Home.
   UX-LOOP R1-T-02: cards, fee, payout, CTA and customer rows come from
   the live booking; the harness deep link keeps the frame's rows.
   Round 2: renders the tapped job (R2-T-01) and passes it to
   tailorAccepts (R2-T-02); Accept lands on T03 with `replace` and an
   already-accepted job shows an inert `Accepted` with no Decline
   (R2-T-11); an expired request shows no Accept at all (R2-T-03).
   Round 3 (R3-T-02): while a proposal is pending the primary is
   `Withdraw Proposal` (same handler as T01's link) and there is no
   Accept — accepting would book the time Marco just said he can't do.
   Round 6: the customer card's first row adds the visit type and the
   travel distance ("… · Home visit · 1.2 mi") — base frame and its
   Accepted / Expired siblings alike.
   Round 7 (Kevin's money model v2): no commission. The header, the
   one money row and the CTA all read the PAYOUT — 100% of the
   alteration prices on the cards ("$200 | New Request" / "Your payout
   $200" / "Accept Request · $200"); the Subtotal and Taily Fee rows are
   gone. Accept stamps `a.tailor.acceptedPayout`, which only moves when
   the scope changes at the visit. R7-T-02: the expired view keeps the
   "$200 | Request Expired" header but its money row is the muted
   "Payout offered" — money that lapsed with the request.
   Round 8 (Kevin): a muted "No-show protection · paid if Sarah
   doesn’t show" row sits under "Your payout" on the base and Accepted
   views (not Expired) — the trip compensation Marco receives if Sarah
   no-shows ($20 on the seed; data.js noShowComp of the booked fee's
   tier). The fee itself is still never printed on this side.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { summaryCard, garmentCard, cta, toast } from '../components.js';
import { money, garmentAmount, fmtDay } from '../data.js';
import { proposeNewTime } from './t03a-decline-request.js';
import { state } from '../state.js';
import { tailorChrome, wireTailorNav, payoutRows } from '../tailor-components.js';
import { current, jobView, tailorOf, isFixture, isSeed, restartTimer, stampAcceptedPayout, proposalDays, T, CUSTOMER, REQUEST_ROWS } from '../tailor-data.js';

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
  /* round 6: the first row carries the visit type + distance (REQUEST_ROWS on the frame) */
  const rows = fixture ? REQUEST_ROWS : v.requestRows;
  const expired = mode === 'expired' || (!fixture && v.canon === 'expired');
  const accepted = mode === 'accepted' || (!fixture && !expired && !pending(a, v));
  const title = expired ? `${v.money.payout} | Request Expired` : accepted ? `${v.money.payout} | Accepted` : `${v.money.payout} | New Request`;
  const note = expired
    ? '<p class="t-body c-500">This request lapsed before you responded. Sarah has been told — nothing to do.</p>'
    : a?.proposed?.when && !fixture
      ? `<p class="t-body c-500">You proposed ${jobView({ ...a, when: a.proposed.when }).when} — waiting for Sarah.</p>`
      : '';
  /* R3-T-02: while Marco's proposal is out, the original time is not
     his to accept — Withdraw Proposal leads, Decline stays */
  const proposed = !fixture && !expired && !accepted && !!a?.proposed?.when;
  const actions = expired
    ? cta('Back to Home', { attrs: 'data-act="home"' })
    : accepted
      ? cta('Back to Home', { attrs: 'data-act="home"' })   /* round 11: the Accepted frame's single CTA */
      : proposed
        ? `${cta('Withdraw Proposal', { attrs: 'data-act="withdraw"' })}
    ${cta('Decline', { variant: 'secondary', attrs: 'data-act="decline"' })}`
        : `${cta(`Accept Request · ${v.money.payout}`, { attrs: 'data-act="accept"' })}
    ${cta('Decline', { variant: 'secondary', attrs: 'data-act="decline"' })}
    ${cta('Request New Time', { variant: 'secondary', attrs: 'data-act="new-time"' })}`;
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
      ${payoutRows(v, { offered: expired, protection: expired ? null : v.protection })}
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
    stampAcceptedPayout(a);                // round 7: the payout Marco accepted the job for
    go('t03-request-accepted', { replace: true });   // R2-T-11: back never re-offers Accept
  });
  root.querySelector('[data-act="decline"]')?.addEventListener('click', () => go('t03a-decline-request'));
  /* round 11 (Kevin): propose another time straight from the request —
     the 02.1 wheel ("Propose · …"); a proposal lands on T01 */
  root.querySelector('[data-act="new-time"]')?.addEventListener('click', () => {
    const a = current(state);
    if (!a || jobView(a).canon !== 'searching') { toast('This request is no longer open'); return; }
    if (!proposalDays(a).length) { toast(`Sarah needs these by ${fmtDay(a.needBy)} — no later slot to offer`); return; }
    proposeNewTime(a);
  });
  root.querySelector('[data-act="withdraw"]')?.addEventListener('click', () => {
    const a = current(state);
    if (!a?.proposed || !T.withdrawProposal(a)) { toast('No proposal to withdraw'); return; }
    restartTimer(a);
    toast('Proposal withdrawn');
    go('t01-home');
  });
}

register('t02-appointment-request', viewRequest, wire);
