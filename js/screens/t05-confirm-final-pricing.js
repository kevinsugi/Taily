/* ============================================================
   T05 - Confirm Final Pricing — Figma 449:809.
   "Confirm Details" + "Reviewed with Sarah at the visit"; the draft
   order with what changed at the visit in semantic/info (card 1's
   added Sleeve + $200, the added third jacket), fee rows,
   Send to Sarah for Approval / Edit Details (round 11, was Review Details). Active=T-Calendar.

   UX-LOOP R1-T-03/06/07: Send writes the draft into a.garments /
   a.totals (the shared final order), runs completeAppointment(),
   toasts, and lands on T06 with T01 beneath it so back never returns
   to the editor; a second Send only toasts.
   Round 2: marks match garments by id and booked garments dropped at
   the visit render as "Removed at the visit — …" lines (R2-T-08);
   Send passes the tapped job and checks the transition before
   toasting (R2-T-02).
   Round 7 (Kevin's money model v2): the one money row is "Your payout
   $360" (100% of the cards' prices, no fee row), and when the draft is
   worth something other than what Marco accepted the job for
   (`a.tailor.acceptedPayout`) the scope change is stated BEFORE Send:
   "Payout $200 → $360 (+$160)". Send moves the accepted payout with
   the final order (writeFinalOrder).
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { cta, toast } from '../components.js';
import { money } from '../data.js';
import { state } from '../state.js';
import { tailorChrome, wireTailorNav, backHeader, orderCards, payoutRows, payoutChangeRow, removedRows } from '../tailor-components.js';
import { current, jobView, draftFor, orderMarks, orderMoney, payoutChange, bookedGarments, writeFinalOrder, resendFinalOrder, tailorOf, isFixture, isTerminalJob, T } from '../tailor-data.js';

/** Exported: `forced` = { draft, booked } renders a given at-visit draft
    against its booking (round-3 frame "T05 - Confirm Final Pricing / Removed"). */
export function viewPricing(s, forced = null) {
  const a = current(s);
  const fixture = isFixture() && !forced;
  const draft = forced?.draft ?? draftFor(s, a, { fixture });
  const { marks, removed } = orderMarks(draft, forced?.booked ?? bookedGarments(a));
  /* R7-T-03: on a long draft the payout row sits below the fold — the
     live header sub carries the draft's payout too ("… · Payout $360");
     the fixture routes keep the frame's sub. */
  /* round 10 (Kevin): a job already awaiting approval is being RESENT
     after Edit Details — the copy says so (frame "T05 - Confirm Final
     Pricing / Resend", forced.resend) */
  const resend = forced ? !!forced.resend : (!fixture && jobView(a).canon === 'awaiting-approval');
  const sub = resend ? `Updated after sending · Payout ${money(orderMoney(draft).payout)}`
    : isFixture() ? 'Reviewed with Sarah at the visit' : `Reviewed with Sarah at the visit · Payout ${money(orderMoney(draft).payout)}`;
  return `${tailorChrome('calendar')}
<div class="body" data-s="t05-confirm-final-pricing">
  ${backHeader('Confirm Details', sub)}
  <div class="garments-card">
    ${orderCards(draft, { variant: 'Appt_View', marks })}
    ${fixture ? '' : removedRows(removed)}
    ${payoutRows(orderMoney(draft))}
  </div>
  <div class="t-actions">
    ${payoutChangeRow(payoutChange(a, draft, forced ? orderMoney(forced.booked).payout : undefined))}
    ${cta(resend ? 'Resend to Sarah for Approval' : 'Send to Sarah for Approval', { attrs: 'data-act="send"' })}
    ${cta('Edit Details', { variant: 'secondary', attrs: 'data-act="review"' })}   <!-- round 11: Kevin renamed Review Details -->
  </div>
</div>`;
}

export function wire(root) {
  /* R5-T-01/02: a closed job reached through history or a deep link is off
     the calendar — leave the editor instead of drawing it. */
  { const a0 = current(state); if (window.__tailyNavigated && a0 && isTerminalJob(a0)) { toast('This job is no longer on your calendar'); setTimeout(() => go('t01-home', { replace: true }), 0); return; } }
  wireTailorNav(root);
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('t04-appointment-details'));
  root.querySelector('[data-act="review"]')?.addEventListener('click', () => back() || go('t04-appointment-details'));
  root.querySelector('[data-act="send"]')?.addEventListener('click', () => {
    const a = current(state);
    /* R4-T-03: a stale T05 reached through history for a job that has
       since closed (Sarah cancelled) — say so, and leave the editor */
    if (a && isTerminalJob(a)) { toast('This job is no longer on your calendar'); go('t01-home', { replace: true }); return; }
    /* round 10 (Kevin): Edit Details → the edited order goes out again */
    if (a && jobView(a).canon === 'awaiting-approval') {
      if (!resendFinalOrder(a, draftFor(state, a, { fixture: isFixture() }))) { toast('Already sent to Sarah'); return; }
      toast('Updated order sent to Sarah');
      go('t01-home');
      go('t06-appointment-status');
      return;
    }
    /* R2-T-02: the transition names its job and must succeed before
       anything is written or announced */
    if (!a || jobView(a).canon !== 'confirmed' || !T.complete(a)) { toast('Already sent to Sarah'); return; }
    writeFinalOrder(a, draftFor(state, a, { fixture: isFixture() }));
    tailorOf(a).draft = null;
    toast('Sent to Sarah for approval');
    go('t01-home');                        // T06 sits on Home, not on the editor (R1-T-07)
    go('t06-appointment-status');
  });
}

register('t05-confirm-final-pricing', viewPricing, wire);
