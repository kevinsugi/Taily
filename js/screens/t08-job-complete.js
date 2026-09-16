/* ============================================================
   T08 - Job Complete — Figma 449:866.
   "Job complete." hero, PAYOUT SUMMARY card (the alterations itemised
   → payout, arriving Mon, Jul 20), Back to Home, "View Order Summary".
   Active=T-Calendar. UX-LOOP R1-T-02/13: the money is the live final
   order's; the harness deep link keeps the frame's $360 final order.
   Round 3 (R3-T-04): the order number and the payout date are the
   job's own — `a.orderId` (shared with the customer's 06; the seed
   keeps TLY-2026-4417) and `payoutDate(a)` (handoff day + 4, weekday;
   the seed's Thu Jul 16 pickup → Mon, Jul 20, so the frame is unchanged).
   Round 7 (Kevin's money model v2): no commission — the summary lists
   each alteration at its price and ends in "Your payout $360" (100%
   of them). The frame's "Order total / Taily fee −$36 / $324" rows are
   gone (Figma money sync pending).
   ============================================================ */

import { register, render as go } from '../app.js';
import { statusHero, cta, visitBlock, headingRow } from '../components.js';
import { garmentAmount, money } from '../data.js';
import { tailorChrome, wireTailorNav, priceRow, hairline, orderDropdown, orderCards, payoutRows } from '../tailor-components.js';
import { current, jobView, isFixture, payoutDate, orderId, FIXTURE_FINAL, orderMoney, CUSTOMER_ROWS } from '../tailor-data.js';
import { wireOrderDropdown } from './t07-job-ready.js';

/** "Suit Jacket · Hem / Adjust Length, Sleeve / Adjust Length" — one
    line per garment card (×qty when more than one). */
const itemLabel = (g) => `${g.type} · ${g.jobs.join(', ')}`;   // round 12: one garment = one item

function renderScreen(s) {
  const a = current(s);                     // the tapped job (R2-T-01)
  const v = jobView(a);
  const fixture = isFixture() || !v.post;
  const garments = fixture ? FIXTURE_FINAL : v.garments;
  const m = orderMoney(garments, a);
  const arrives = fixture ? 'Mon, Jul 20' : payoutDate(a);
  const id = fixture ? 'TLY-2026-4417' : orderId(a);
  return `${tailorChrome('calendar')}
<div class="body" data-s="t08-job-complete">
  ${headingRow(statusHero({ pill: false, title: 'Job complete.', body: 'Nice work, Marco. Your payout is on the way.' }))}
  <div class="t-detail-card">
    <span class="payout-summary__title">PAYOUT SUMMARY  ·  ${id}</span>
    <div class="price-group">
      ${garments.map((g) => priceRow(itemLabel(g), money(garmentAmount(g)))).join('\n      ')}
      ${priceRow('Visitation fee', money(m.visitCut))}
    </div>
    ${hairline()}
    <div class="price-group">
      ${priceRow('Your payout', money(m.payout), { total: true })}
      <span class="payout-summary__note">Arrives in your account · ${arrives}</span>
    </div>
  </div>
  ${cta('Back to Home', { attrs: 'data-act="home"' })}
  ${orderDropdown()}
  <div class="garments-card order-summary" hidden>
    ${visitBlock(fixture ? CUSTOMER_ROWS : v.rows)}
    ${orderCards(garments, { variant: 'Appt_View', plain: true })}
    ${payoutRows(m)}
  </div>
</div>`;
}

function wire(root) {
  wireTailorNav(root);
  wireOrderDropdown(root);
  root.querySelector('[data-act="home"]')?.addEventListener('click', () => go('t01-home'));
}

register('t08-job-complete', renderScreen, wire);
