/* ============================================================
   05X - Appointment Cancelled V1 (Summary kept) — Figma 558:3817.
   05's chassis with a one-line error-red heading, the cancelled
   order's summary, a refund card in place of the prepare card, and
   a single Back to Home CTA. Reached from R1's confirm, or from a
   cancelled / declined / expired appointment card (R1-U-20, R2-U-07).
   UX-003 / UX-LOOP R1-U-03: renders state.lastCancelled (or the
   terminal appointment the card opened). The deposit is a HOLD until
   the tailor confirms, so a request cancelled (or declined) before
   confirmation shows the Cancelled pill, no Paid / Balance rows and
   "Nothing was charged"; a confirmed cancellation keeps the frame's
   summary and names the real pay method in the refund line. A direct
   load (diff harness) renders the frame's $200 / Visa fixture.
   UX-LOOP R2-U-04/05/07 (live only; Figma sync pending): the title,
   body and primary CTA follow WHY it ended —
     expired            "Request expired"              Send Request Again
     declined           "Marco couldn’t take this…"    Send to Another Tailor
     tailor cancelled   "Marco had to cancel"          Find Another Tailor
     no-show            "We missed you at …"           Find Another Tailor
     customer cancel    "Appointment Cancelled"        (Back to Home)
   Nothing is charged on any of them (hold released — the fee policy
   is Kevin's call). The re-request CTAs reuse 03.1's copy-over: the
   garments become the next booking and 02 opens with them seeded.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, summaryCard, feeRow, cta, orderCards, apptRows, receiptDates } from '../components.js';
import { money, PAY_LABELS, SEED_UPCOMING, fmtWhen } from '../data.js';
import { state, isTerminal, canonicalStatus } from '../state.js';
import { copyItemsOver } from './03.1-reschedule-popup.js';

/** Title / body / CTA per terminal reason. `null` body = the frame's
    layout (refund card + Back to Home). */
function variantFor(live, a) {
  if (!live) return { pill: 'declined', title: 'Appointment Cancelled', body: null, cta: null };
  const status = canonicalStatus(a.status);
  const first = (a.name ?? 'Marco Tailor').split(' ')[0];
  if (status === 'expired') {
    return { pill: 'expired', title: 'Request expired', body: 'No tailor accepted in time. Nothing was charged — the hold on your card is released.', cta: 'Send Request Again' };
  }
  if (status === 'declined') {
    return { pill: 'declined', title: `${first} couldn’t take this request`, body: 'Nothing was charged — the hold on your card is released. We can send it to another tailor.', cta: 'Send to Another Tailor' };
  }
  if (a.cancelledBy === 'tailor' && a.reason === 'no-show') {
    return { pill: 'cancelled', title: `We missed you at ${fmtWhen(a.when, 'Sun, Jul 12 · 7:00 PM')}`, body: `${first} marked this visit as a no-show. Nothing was charged.`, cta: 'Find Another Tailor' };
  }
  if (a.cancelledBy === 'tailor') {
    return { pill: 'cancelled', title: `${first} had to cancel`, body: 'Nothing was charged — the hold on your card is released. We can find you another tailor.', cta: 'Find Another Tailor' };
  }
  return { pill: 'cancelled', title: 'Appointment Cancelled', body: null, cta: null };
}

function renderScreen(s) {
  const cur = s[s.currentAppt?.list ?? 'upcoming']?.[s.currentAppt?.index ?? 0];
  const live = isTerminal(cur) ? cur : s.lastCancelled;
  const a = live ?? SEED_UPCOMING[0];
  const status = canonicalStatus(live?.status);
  const v = variantFor(!!live, a);
  const neverConfirmed = !!live && (live.wasRequested || status === 'declined' || status === 'expired');
  /* fee rows only where the deposit was actually taken: the frame's
     fixture and a customer cancelling a confirmed appointment */
  const charged = !live || (!neverConfirmed && a.cancelledBy !== 'tailor');
  const t = a.totals ?? { subtotal: 200, deposit: 20 };
  const subtotal = t.subtotal ?? t.total ?? 200;
  const deposit = t.deposit ?? 20;
  const rows = charged ? `
      ${feeRow(money(subtotal), 'Subtotal - Confirmed at Appointment', { line: true })}
      ${feeRow(money(-deposit), `10% Deposit - Paid ${receiptDates(a).deposit}`, { line: true })}
      ${feeRow(money(subtotal - deposit), 'Balance')}` : '';
  const refund = v.body ? '' : `
    <div class="prepare-card">
      ${neverConfirmed
    ? `<p class="t-body w-500 c-500">Nothing was charged</p>
      <p class="t-body c-700">The hold on your card is released. Please rebook whenever you’re ready.</p>`
    : `<p class="t-body w-500 c-500">Refund on the way</p>
      <p class="t-body c-700">Your ${money(deposit)} deposit will be returned to ${live ? (PAY_LABELS[s.payMethod] ?? PAY_LABELS.card) : PAY_LABELS.card}. Please rebook whenever you’re ready.</p>`}
    </div>`;
  const actions = v.cta
    ? `${cta(v.cta, { attrs: 'data-act="rerequest"' })}
    ${cta('Back to Home', { variant: 'secondary', attrs: 'data-act="home"' })}`
    : cta('Back to Home', { attrs: 'data-act="home"' });
  return `${chrome('home')}
<div class="body" data-s="03-status-cancelled">
  ${statusHero({ pill: v.pill, title: v.title, body: v.body ?? undefined, titleWeight: 600, titleColor: 'error' })}
  <div class="summary">
    ${summaryCard({ fixed: true, initials: a.initials ?? 'MT', name: a.name ?? 'Marco Tailor', rows: apptRows(a) })}
    <div class="garments-card">
      ${orderCards({ garments: a.garments, totals: t }, { variant: 'ViewOnly' })}${rows}
    </div>${refund}
  </div>
  <div class="actions">
    ${actions}
  </div>
</div>`;
}

function wire(root) {
  root.querySelector('[data-act="home"]')?.addEventListener('click', () => go('01-home'));
  /* R2-U-04/05/07: send the same garments out again — 02 opens with
     the cards seeded (03.1's copy-over) and Request Tailor books anew */
  root.querySelector('[data-act="rerequest"]')?.addEventListener('click', () => {
    const cur = state[state.currentAppt?.list ?? 'upcoming']?.[state.currentAppt?.index ?? 0];
    copyItemsOver(isTerminal(cur) ? cur : state.lastCancelled);
    go('02-appointment-details');
  });
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('03-status-cancelled', renderScreen, wire);
