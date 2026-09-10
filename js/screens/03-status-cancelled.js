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
   UX-LOOP R2-U-04/05/07 (round 3: each has a sibling frame + route —
   03-status-expired / -declined / -tailor-cancelled / -no-show): the title,
   body and primary CTA follow WHY it ended —
     expired            "Request expired"              Send Request Again
     declined           "Marco couldn’t take this…"    Send to Another Tailor
     tailor cancelled   "Marco had to cancel"          Find Another Tailor
     no-show            "We missed you"                Find Another Tailor
     customer cancel    "Appointment Cancelled"        (Back to Home)
   R3-U-06 / R3-T-05: the deposit is a HOLD only until the tailor
   confirms — a request never confirmed (withdrawn / declined /
   expired) says "Nothing was charged — the hold is released"; a
   CONFIRMED visit the tailor cancels or marks a no-show keeps the
   receipt's fee rows and says the paid deposit is refunded to the
   pay method (no fee — the fee policy is Kevin's call). R3-U-08: the
   no-show timestamp lives in the body, not the title. The re-request
   CTAs reuse 03.1's copy-over: the garments become the next booking
   and 02 opens with them seeded.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, summaryCard, feeRow, cta, orderCards, apptRows, receiptDates } from '../components.js';
import { money, mdy, PAY_LABELS, SEED_UPCOMING, fmtWhen, tailorName, tailorInitials, tailorFirst } from '../data.js';
import { state, isTerminal, canonicalStatus, copyItemsOver } from '../state.js';

/* UX-LOOP round 6 (Kevin's fee policy): the tailor cancelling refunds
   the paid deposit; the customer cancelling within 12 hours of the
   visit, or a no-show, keeps it (`a.depositKept`, stamped by the
   substrate); an earlier customer cancel refunds it. The body says
   which; live entries also relabel the deposit row "Kept" /
   "Refunded <date>" (the frames keep "Paid 7/7/26"). No tailor name
   before one accepts: a request that ended unmatched says "A tailor",
   and its card reads "No tailor matched" under the ✂ avatar. */
const NO_TAILOR = 'No tailor matched';

/** Title / body / CTA per terminal reason. `null` body = the frame's
    layout (refund card + Back to Home). */
function variantFor(live, a, { deposit = 20, payLabel = PAY_LABELS.card } = {}) {
  if (!live) return { pill: 'declined', title: 'Appointment Cancelled', body: null, cta: null };
  const status = canonicalStatus(a.status);
  const first = tailorFirst(a);
  const when = fmtWhen(a.when, 'Sun, Jul 12 · 7:00 PM');
  if (status === 'expired') {
    /* R3-T-02c: a proposal that lapsed unanswered is named */
    const lead = a.lapsedProposal?.when
      ? `${first} proposed ${fmtWhen(a.lapsedProposal.when)} but the request lapsed before you answered.`
      : 'No tailor accepted in time.';
    return { pill: 'expired', title: 'Request expired', body: `${lead} Nothing was charged — the hold on your card is released.`, cta: 'Send Request Again' };
  }
  if (status === 'declined') {
    return { pill: 'declined', title: `${first} couldn’t take this request`, body: 'Nothing was charged — the hold on your card is released. We can send it to another tailor.', cta: 'Send to Another Tailor' };
  }
  if (a.cancelledBy === 'tailor' && a.reason === 'no-show') {
    const money2 = a.wasRequested ? '. Nothing was charged.' : `, so your ${money(deposit)} deposit was kept.`;
    return { pill: 'cancelled', title: 'We missed you', body: `${first} marked the ${when} visit as a no-show${money2}`, cta: 'Find Another Tailor' };
  }
  if (a.cancelledBy === 'tailor') {
    const money2 = a.wasRequested ? 'Nothing was charged — the hold on your card is released.' : `Your ${money(deposit)} deposit is refunded to ${payLabel}.`;
    return { pill: 'cancelled', title: `${first} had to cancel`, body: `${money2} We can find you another tailor.`, cta: 'Find Another Tailor' };
  }
  /* the customer's own cancel of a CONFIRMED visit: refunded, or kept
     within 12 hours (R6); a withdrawn request keeps the frame's
     "Nothing was charged" card */
  if (!a.wasRequested) {
    const body = a.depositKept
      ? `Cancelled within 12 hours of the visit, so your ${money(deposit)} deposit was kept. Rebook whenever you’re ready.`
      : `Your ${money(deposit)} deposit is refunded to ${payLabel}.`;
    return { pill: 'cancelled', title: 'Appointment Cancelled', body, cta: null };
  }
  return { pill: 'cancelled', title: 'Appointment Cancelled', body: null, cta: null };
}

/** The deposit row's description: the frames' "Paid 7/7/26", or the
    live outcome — "Kept" / "Refunded 9/10/26" (R6). */
function depositDesc(a, live) {
  if (live && a.depositKept) return '10% Deposit - Kept';
  if (live && a.refund > 0) return `10% Deposit - Refunded ${mdy(a.cancelledAt, receiptDates(a).deposit)}`;
  return `10% Deposit - Paid ${receiptDates(a).deposit}`;
}

/** Exported: the round-3 variant routes (03/Expired · Declined · Tailor
    Cancelled · No-Show) render this screen with a `forced` terminal
    appointment instead of state's. */
export function viewCancelled(s, forced = null) {
  const cur = s[s.currentAppt?.list ?? 'upcoming']?.[s.currentAppt?.index ?? 0];
  const live = forced ?? (isTerminal(cur) ? cur : s.lastCancelled);
  const a = live ?? SEED_UPCOMING[0];
  const status = canonicalStatus(live?.status);
  const t = a.totals ?? { subtotal: 200, deposit: 20 };
  const subtotal = t.subtotal ?? t.total ?? 200;
  const deposit = t.deposit ?? 20;
  /* R4-U-02: the method THIS booking paid with (a later booking may
     have chosen another); older entries fall back to the current one */
  const payLabel = live ? (PAY_LABELS[live.payMethod ?? s.payMethod] ?? PAY_LABELS.card) : PAY_LABELS.card;
  const v = variantFor(!!live, a, { deposit, payLabel });
  const neverConfirmed = !!live && (live.wasRequested || status === 'declined' || status === 'expired');
  /* fee rows wherever the deposit was actually taken: the frame's
     fixture and any CONFIRMED visit that ended — the customer's own
     cancel, the tailor's cancel, a no-show (R3-U-06) */
  const charged = !live || !neverConfirmed;
  const rows = charged ? `
      ${feeRow(money(subtotal), 'Subtotal - Confirmed at Appointment', { line: true })}
      ${feeRow(money(-deposit), depositDesc(a, !!live), { line: true })}
      ${feeRow(money(subtotal - deposit), 'Balance')}` : '';
  const refund = v.body ? '' : `
    <div class="prepare-card">
      ${neverConfirmed
    ? `<p class="t-body w-500 c-500">Nothing was charged</p>
      <p class="t-body c-700">The hold on your card is released. Please rebook whenever you’re ready.</p>`
    : `<p class="t-body w-500 c-500">Refund on the way</p>
      <p class="t-body c-700">Your ${money(deposit)} deposit will be returned to ${payLabel}. Please rebook whenever you’re ready.</p>`}
    </div>`;
  const actions = v.cta
    ? `${cta(v.cta, { attrs: 'data-act="rerequest"' })}
    ${cta('Back to Home', { variant: 'secondary', attrs: 'data-act="home"' })}`
    : cta('Back to Home', { attrs: 'data-act="home"' });
  return `${chrome('home')}
<div class="body" data-s="03-status-cancelled">
  ${statusHero({ pill: v.pill, title: v.title, body: v.body ?? undefined, titleWeight: 600, titleColor: 'error' })}
  <div class="summary">
    ${summaryCard({ fixed: true, initials: tailorInitials(a), name: a.name ? tailorName(a) : NO_TAILOR, rows: apptRows(a) })}
    <div class="garments-card">
      ${orderCards({ garments: a.garments, totals: t }, { variant: 'ViewOnly' })}${rows}
    </div>${refund}
  </div>
  <div class="actions">
    ${actions}
  </div>
</div>`;
}

export function wire(root) {
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

register('03-status-cancelled', viewCancelled, wire);
