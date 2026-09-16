/* ============================================================
   T07 - Job Ready — Figma 449:847.
   "Ready for handoff." + two-line body, When/Where/Items detail
   card, Mark Picked Up / Message Sarah / View All Appointments,
   "View Order Summary" disclosure. Active=T-Calendar.
   UX-LOOP R1-T-11: when the customer has chosen a handoff
   (a.fulfilment) the body, When, Where and CTA follow it.
   Round 2 (R2-T-07): until she chooses, the live screen WAITS —
   "Ready. Sarah hasn't chosen pickup or delivery yet…", When "Not
   scheduled yet", Where "—", `Message Sarah` leads and `Mark Picked
   Up` is a recorded demo ("Demo: Sarah chose pickup now", then the
   handoff completes). The harness deep link keeps the frame's pickup
   fixture (Fri, Jul 17 · 3:00 PM at 1025 Broadway). Transitions take
   the tapped job (R2-T-01/02).
   Round 7 (Kevin's money model v2): the handoff copy speaks of Marco's
   PAYOUT, never of Sarah's payment — no delivery fee, no "payment
   processed"; the order summary ends in "Your payout $360".
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { cta, toast, visitBlock } from '../components.js';
import { state } from '../state.js';
import { tailorChrome, wireTailorNav, backHeader, detailRow, orderDropdown, orderCards, payoutRows, openChat } from '../tailor-components.js';
import { current, jobView, isFixture, firstPickupWindow, T, FIXTURE_FINAL, orderMoney, CUSTOMER_ROWS } from '../tailor-data.js';

const SHOP = '1025 Broadway';

/** Exported: a `forced` ready job renders live (round-3 frame
    "T07 - Job Ready / Waiting"). */
export function viewReady(s, forced = null) {
  const a = forced ?? current(s);
  const v = jobView(a);
  const fixture = !forced && (isFixture() || !v.post);
  const f = fixture ? null : a?.fulfilment;
  const waiting = !fixture && !f;
  const delivery = f?.method === 'delivery';
  const body = waiting
    ? 'Ready. Sarah hasn’t chosen pickup or delivery yet — you’ll see it here when she does.'
    : f
      ? `Sarah chose ${delivery ? `delivery to ${v.address}` : 'pickup at your shop'}.<br>Your payout is released on handoff.`
      : 'Sarah will pick up her items.<br>Your payout is released on handoff.';
  const garments = fixture ? FIXTURE_FINAL : v.garments;
  const actions = waiting
    ? `${cta('Message Sarah', { attrs: 'data-act="message"' })}
    ${cta('Mark Picked Up', { variant: 'secondary', attrs: 'data-act="picked-up" title="Demo: Sarah chooses pickup now"' })}`
    : `${cta(delivery ? 'Mark Delivered' : 'Mark Picked Up', { attrs: 'data-act="picked-up"' })}
    ${cta('Message Sarah', { variant: 'secondary', attrs: 'data-act="message"' })}`;
  return `${tailorChrome('calendar')}
<div class="body" data-s="t07-job-ready">
  <div class="t-status">
    ${backHeader('Ready for handoff.')}
    <p class="t-body c-500">${body}</p>
  </div>
  <div class="t-detail-card">
    ${detailRow('When', waiting ? 'Not scheduled yet' : (f?.window ?? 'Fri, Jul 17 · 3:00 PM'))}
    ${detailRow('Where', waiting ? '—' : delivery ? v.address : SHOP)}
    ${detailRow('Items', fixture ? '3 Suit Jackets' : v.itemsLabel)}
  </div>
  <div class="t-actions">
    ${actions}
    ${cta('View All Appointments', { variant: 'secondary', attrs: 'data-act="home"' })}
  </div>
  ${orderDropdown()}
  <div class="garments-card order-summary" hidden>
    ${visitBlock(fixture ? CUSTOMER_ROWS : v.rows)}
    ${orderCards(garments, { variant: 'Appt_View', plain: true })}
    ${payoutRows(orderMoney(garments, a))}
  </div>
</div>`;
}

export function wireOrderDropdown(root) {
  const btn = root.querySelector('[data-act="order-summary"]');
  const panel = root.querySelector('.order-summary');
  btn?.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    btn.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
  });
}

export function wire(root) {
  wireTailorNav(root);
  wireOrderDropdown(root);
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('t01-home'));
  root.querySelector('[data-act="picked-up"]')?.addEventListener('click', () => {
    const a = current(state);
    if (jobView(a).canon !== 'ready-for-pickup') { toast('Already handed off'); return; }
    /* R2-T-07 demo (recorded): Sarah hasn't scheduled — she chooses
       pickup on the spot so the handoff can complete */
    if (!a.fulfilment) {
      const w = firstPickupWindow(a);
      if (!T.chooseFulfilment('pickup', w.window, w.date, a)) a.fulfilment = { method: 'pickup', window: w.window, date: w.date };
      toast('Demo: Sarah chose pickup now');
    }
    if (!T.deliver(a)) { toast('Already handed off'); return; }
    go('t08-job-complete');
  });
  root.querySelector('[data-act="message"]')?.addEventListener('click', () => openChat());
  root.querySelector('[data-act="home"]')?.addEventListener('click', () => go('t01-home'));
}

register('t07-job-ready', viewReady, wire);
