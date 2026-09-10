/* ============================================================
   05X - Appointment Cancelled V1 (Summary kept) — Figma 558:3817.
   05's chassis with a one-line error-red heading, the cancelled
   order's summary, a refund card in place of the prepare card, and
   a single Back to Home CTA. Reached from R1's confirm, or from a
   cancelled / declined / expired appointment card (R1-U-20, R2-U-07).
   UX-003 / UX-LOOP R1-U-03: renders state.lastCancelled (or the
   terminal appointment the card opened). A request cancelled (or
   declined) before a tailor accepted shows the Cancelled pill, no fee
   rows and "Nothing was charged"; a confirmed cancellation keeps the
   summary and names the real pay method in the refund line. A direct
   load (diff harness) renders the frame's $200 / Visa fixture.
   UX-LOOP R2-U-04/05/07 (round 3: each has a sibling frame + route —
   03-status-expired / -declined / -tailor-cancelled / -no-show): the title,
   body and primary CTA follow WHY it ended —
     expired            "Request expired"              Send Request Again
     declined           "Marco couldn’t take this…"    Send to Another Tailor
     tailor cancelled   "Marco had to cancel"          Find Another Tailor
     no-show            "We missed you"                Find Another Tailor
     unconfirmed (R7)   "Appointment Cancelled"        Send Request Again
     customer cancel    "Appointment Cancelled"        (Back to Home)
   R3-U-08: the no-show timestamp lives in the body, not the title. The
   re-request CTAs reuse 03.1's copy-over: the garments become the next
   booking and 02 opens with them seeded.
   UX-LOOP round 7 (Kevin's money model v2): the visitation fee is the
   deposit. Refunded in full when the tailor cancels, the request
   expires / is declined / withdrawn, Taily auto-cancels an unconfirmed
   visit, or the customer cancels BEFORE confirming the visit on the
   24-hour prompt; kept (`a.feeKept`) once she confirmed and then
   cancelled or no-showed. The body says which; live entries relabel
   the fee row "Visitation fee — Refunded <date>" / "— Kept" (the
   frames still draw the deposit rows — Figma sync pending). No tailor
   name before one accepts: a request that ended unmatched says "A
   tailor", and its card reads "No tailor matched" under the ✂ avatar.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, summaryCard, cta, orderCards, apptRows, receiptDates, orderRows } from '../components.js';
import { money, mdy, PAY_LABELS, SEED_UPCOMING, fmtWhen, tailorName, tailorInitials, tailorFirst } from '../data.js';
import { state, isTerminal, canonicalStatus, copyItemsOver } from '../state.js';

const NO_TAILOR = 'No tailor matched';
const HOLD_RELEASED = 'Nothing was charged — the hold on your card is released.';

/** Title / body / CTA per terminal reason. `null` body = the frame's
    layout (refund card + Back to Home). */
function variantFor(live, a, { fee = 25, payLabel = PAY_LABELS.card } = {}) {
  if (!live) return { pill: 'declined', title: 'Appointment Cancelled', body: null, cta: null };
  const status = canonicalStatus(a.status);
  const first = tailorFirst(a);
  const when = fmtWhen(a.when, 'Sun, Jul 12 · 7:00 PM');
  const refunded = `Your ${money(fee)} visitation fee is refunded to ${payLabel}.`;
  if (status === 'expired') {
    /* R3-T-02c: a proposal that lapsed unanswered is named */
    const lead = a.lapsedProposal?.when
      ? `${first} proposed ${fmtWhen(a.lapsedProposal.when)} but the request lapsed before you answered.`
      : 'No tailor accepted in time.';
    return { pill: 'expired', title: 'Request expired', body: `${lead} ${HOLD_RELEASED}`, cta: 'Send Request Again' };
  }
  if (status === 'declined') {
    return { pill: 'declined', title: `${first} couldn’t take this request`, body: `${HOLD_RELEASED} We can send it to another tailor.`, cta: 'Send to Another Tailor' };
  }
  if (a.cancelledBy === 'tailor' && a.reason === 'no-show') {
    /* R7: kept only once the visit was confirmed (feeLocked) */
    const tail = a.wasRequested ? '. Nothing was charged.' : (a.feeKept ? `, so your ${money(fee)} visitation fee was kept.` : `. ${refunded}`);
    return { pill: 'cancelled', title: 'We missed you', body: `${first} marked the ${when} visit as a no-show${tail}`, cta: 'Find Another Tailor' };
  }
  if (a.cancelledBy === 'tailor') {
    const lead = a.wasRequested ? HOLD_RELEASED : refunded;
    return { pill: 'cancelled', title: `${first} had to cancel`, body: `${lead} We can find you another tailor.`, cta: 'Find Another Tailor' };
  }
  if (a.reason === 'unconfirmed') {
    /* R7: 12 hours before the visit with no confirmation — Taily cancelled it */
    return { pill: 'cancelled', title: 'Appointment Cancelled', body: `We didn’t hear back before the visit, so it was cancelled. ${refunded}`, cta: 'Send Request Again' };
  }
  /* the customer's own cancel of a CONFIRMED visit: refunded until she
     confirmed the visit, kept after (R7); a withdrawn request keeps the
     frame's "Nothing was charged" card */
  if (!a.wasRequested) {
    const body = a.feeKept
      ? `Your ${money(fee)} visitation fee was kept — you had confirmed the visit.`
      : refunded;
    return { pill: 'cancelled', title: 'Appointment Cancelled', body, cta: null };
  }
  return { pill: 'cancelled', title: 'Appointment Cancelled', body: null, cta: null };
}

/** The fee row's caption: the frames' "charged 7/7/26", or the live
    outcome — "Kept" / "Refunded 9/10/26" (R7). */
function feeDesc(a, live) {
  if (live && a.feeKept) return 'Visitation fee — Kept';
  if (live && a.refund > 0) return `Visitation fee — Refunded ${mdy(a.cancelledAt, receiptDates(a).fee)}`;
  return `Visitation fee — charged ${receiptDates(a).fee}`;
}

/** Exported: the round-3 variant routes (03/Expired · Declined · Tailor
    Cancelled · No-Show) render this screen with a `forced` terminal
    appointment instead of state's. */
export function viewCancelled(s, forced = null) {
  const cur = s[s.currentAppt?.list ?? 'upcoming']?.[s.currentAppt?.index ?? 0];
  const live = forced ?? (isTerminal(cur) ? cur : s.lastCancelled);
  const a = live ?? SEED_UPCOMING[0];
  const status = canonicalStatus(live?.status);
  const t = a.totals ?? { alterations: 200, visitFee: 25, visitFeeCharged: 25, total: 225 };
  const fee = t.visitFeeCharged ?? t.visitFee ?? 25;
  /* R4-U-02: the method THIS booking paid with (a later booking may
     have chosen another); older entries fall back to the current one */
  const payLabel = live ? (PAY_LABELS[live.payMethod ?? s.payMethod] ?? PAY_LABELS.card) : PAY_LABELS.card;
  const v = variantFor(!!live, a, { fee, payLabel });
  const neverConfirmed = !!live && (live.wasRequested || status === 'declined' || status === 'expired');
  /* fee rows wherever the fee was actually charged: the frame's
     fixture and any CONFIRMED visit that ended — the customer's own
     cancel, the tailor's cancel, a no-show, the unconfirmed auto-cancel.
     R7-U-04: no Total row on a visit that ended — only the fee was ever
     charged, so Alterations (est.) + the fee row with its outcome. */
  const charged = !live || !neverConfirmed;
  const rows = charged ? `
      ${orderRows(t, { est: true, feeDesc: feeDesc(a, !!live), total: false })}` : '';
  const refund = v.body ? '' : `
    <div class="prepare-card">
      ${neverConfirmed
    ? `<p class="t-body w-500 c-500">Nothing was charged</p>
      <p class="t-body c-700">The hold on your card is released. Please rebook whenever you’re ready.</p>`
    : `<p class="t-body w-500 c-500">Refund on the way</p>
      <p class="t-body c-700">Your ${money(fee)} visitation fee will be returned to ${payLabel}. Please rebook whenever you’re ready.</p>`}
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
