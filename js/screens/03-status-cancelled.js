/* ============================================================
   05X - Appointment Cancelled V1 (Summary kept) — Figma 558:3817.
   05's chassis with a one-line error-red heading, the cancelled
   order's summary, a refund card in place of the prepare card, and
   a single Back to Home CTA. Reached from R1's confirm, or from a
   cancelled / declined appointment card (R1-U-20).
   UX-003 / UX-LOOP R1-U-03: renders state.lastCancelled (or the
   terminal appointment the card opened). The deposit is a HOLD until
   the tailor confirms, so a request cancelled (or declined) before
   confirmation shows the Cancelled pill, no Paid / Balance rows and
   "Nothing was charged"; a confirmed cancellation keeps the frame's
   summary and names the real pay method in the refund line. A direct
   load (diff harness) renders the frame's $200 / Visa fixture.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, summaryCard, feeRow, cta, orderCards, apptRows, receiptDates } from '../components.js';
import { money, PAY_LABELS, SEED_UPCOMING } from '../data.js';
import { isTerminal, canonicalStatus } from '../state.js';

function renderScreen(s) {
  const cur = s[s.currentAppt?.list ?? 'upcoming']?.[s.currentAppt?.index ?? 0];
  const live = isTerminal(cur) ? cur : s.lastCancelled;
  const a = live ?? SEED_UPCOMING[0];
  const status = canonicalStatus(live?.status);
  const neverConfirmed = !!live && (live.wasRequested || status === 'declined' || status === 'expired');
  const pill = !live || status === 'declined' ? 'declined' : 'cancelled';
  const t = a.totals ?? { subtotal: 200, deposit: 20 };
  const subtotal = t.subtotal ?? t.total ?? 200;
  const deposit = t.deposit ?? 20;
  const rows = neverConfirmed ? '' : `
      ${feeRow(money(subtotal), 'Subtotal - Confirmed at Appointment', { line: true })}
      ${feeRow(money(-deposit), `10% Deposit - Paid ${receiptDates(a).deposit}`, { line: true })}
      ${feeRow(money(subtotal - deposit), 'Balance')}`;
  const refund = neverConfirmed
    ? `<p class="t-body w-500 c-500">Nothing was charged</p>
      <p class="t-body c-700">The hold on your card is released. Please rebook whenever you’re ready.</p>`
    : `<p class="t-body w-500 c-500">Refund on the way</p>
      <p class="t-body c-700">Your ${money(deposit)} deposit will be returned to ${live ? (PAY_LABELS[s.payMethod] ?? PAY_LABELS.card) : PAY_LABELS.card}. Please rebook whenever you’re ready.</p>`;
  return `${chrome('home')}
<div class="body" data-s="03-status-cancelled">
  ${statusHero({ pill, title: 'Appointment Cancelled', titleWeight: 600, titleColor: 'error' })}
  <div class="summary">
    ${summaryCard({ fixed: true, initials: a.initials ?? 'MT', name: a.name ?? 'Marco Tailor', rows: apptRows(a) })}
    <div class="garments-card">
      ${orderCards({ garments: a.garments, totals: t }, { variant: 'ViewOnly' })}${rows}
    </div>
    <div class="prepare-card">
      ${refund}
    </div>
  </div>
  <div class="actions">
    ${cta('Back to Home', { attrs: 'data-act="home"' })}
  </div>
</div>`;
}

function wire(root) {
  root.querySelector('[data-act="home"]')?.addEventListener('click', () => go('01-home'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('03-status-cancelled', renderScreen, wire);
