/* ============================================================
   T06 - Appointment Status — Figma 473:6324 (Marco's 03/Tailoring).
   Job card (need-by badge, payout, status pill, items), Appt_View
   cards, fee rows, primary CTA / Back to Appointments. Active=T-Calendar.

   UX-LOOP R1-T-06/07: live states carry a status line under the
   header and a per-status primary CTA (awaiting/tailoring → Mark
   Ready, ready → View Handoff Details, delivered → View Payout); the
   chevron goes Home. The harness deep link (seed still 'confirmed')
   renders the frame's Tailoring fixture: three cards, payout $360,
   Mark Ready, no status line.
   Round 2: renders the tapped job and passes it to every transition
   (R2-T-01/02); while Sarah talks the order over (a.changesRequestedAt)
   the line says so and `Message Sarah` leads (R2-T-09); the ready line
   waits for her handoff choice (R2-T-07).
   Round 7 (Kevin's money model v2): the job card and the one money row
   read "Your payout $360" — 100% of the cards' prices, no fee row; the
   fixture itemises $200 / $80 / $80 so the cards ARE the breakdown.
   The awaiting line names the payout Sarah is approving.
   ============================================================ */

import { register, render as go } from '../app.js';
import { cta, toast, visitBlock } from '../components.js';
import { state } from '../state.js';
import { tailorChrome, wireTailorNav, backHeader, jobCard, orderCards, payoutRows, openChat } from '../tailor-components.js';
import { current, jobView, isFixture, isTerminalJob, payoutDate, T, FIXTURE_T06, CUSTOMER, CUSTOMER_ROWS, reopenDraft } from '../tailor-data.js';
import { fmtDay } from '../data.js';

const LINE = {
  /* round 7: the payout Sarah is approving, spelled out */
  'awaiting-approval': (v) => `Sarah is reviewing the updated order — payout ${v.money.payout} once approved.`,
  tailoring: () => 'Sarah approved the final order. Mark the job ready when the garments are done.',
};

/** Exported: a `forced` post-visit job renders live (round-3 frame
    "T06 - Appointment Status / Sarah Has Questions"). */
export function viewStatus(s, forced = null) {
  const a = forced ?? current(s);
  const v = jobView(a);
  const fixture = !forced && (isFixture() || !v.post);
  const shown = fixture ? jobView({ ...a, status: 'tailoring', garments: FIXTURE_T06 }) : v;
  /* round 10 (Kevin): while Sarah is reviewing, Marco can reopen the
     order (Edit Details → T04 → T05 Resend) */
  const awaiting = !fixture && v.canon === 'awaiting-approval';
  const edit = awaiting ? cta('Edit Details', { variant: 'secondary', attrs: 'data-act="edit"' }) : '';
  const resent = awaiting && a.resentAt ? `Updated order sent again on ${fmtDay(a.resentAt)} — Sarah is reviewing it; payout ${v.money.payout} once approved.` : null;
  const line = fixture ? '' : resent ?? ({
    ...LINE,
    'ready-for-pickup': () => (a.fulfilment ? `Ready — handoff ${a.fulfilment.window}.` : 'Ready — waiting for Sarah to schedule the handoff.'),
    delivered: () => `Completed · payout ${v.money.payout} on ${payoutDate(a)}.`,   // R3-T-04
  }[v.canon]?.(v) ?? '');
  const primary = fixture || v.canon === 'awaiting-approval' || v.canon === 'tailoring'
    ? cta('Mark Ready', { attrs: 'data-act="ready"' })
    : v.canon === 'ready-for-pickup'
      ? cta('View Handoff Details', { attrs: 'data-act="handoff"' })
      : cta('View Payout', { attrs: 'data-act="payout"' });
  const right = shown.itemsLabel;   // round 12: the "Sarah has questions" state is gone (04.1 only closes)
  return `${tailorChrome('calendar')}
<div class="body" data-s="t06-appointment-status">
  ${backHeader('Appointment Status', line)}
  <div class="summary">
    ${jobCard({ month: shown.month, day: shown.day, name: CUSTOMER.name, meta: shown.meta, payout: shown.money.payout, status: shown.pill, pillLabel: shown.pillLabel, stage: shown.stage, right, pending: shown.canon === 'awaiting-approval' })}
    <div class="garments-card">
      ${visitBlock(fixture ? CUSTOMER_ROWS : shown.rows)}
      ${orderCards(shown.garments, { variant: 'Appt_View', plain: true })}
      ${payoutRows(shown)}
    </div>
  </div>
  <div class="t-actions">
    ${primary}
    ${edit}
    ${cta('Back to Appointments', { variant: 'secondary', attrs: 'data-act="home"' })}
  </div>
</div>`;
}

export function wire(root) {
  /* R5-T-01/02: a closed job reached through history or a deep link is off
     the calendar — leave the editor instead of drawing it. */
  { const a0 = current(state); if (window.__tailyNavigated && a0 && isTerminalJob(a0)) { toast('This job is no longer on your calendar'); setTimeout(() => go('t01-home', { replace: true }), 0); return; } }
  wireTailorNav(root);
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => go('t01-home'));
  root.querySelector('[data-act="home"]')?.addEventListener('click', () => go('t01-home'));
  root.querySelector('[data-act="handoff"]')?.addEventListener('click', () => go('t07-job-ready'));
  root.querySelector('[data-act="payout"]')?.addEventListener('click', () => go('t08-job-complete'));
  root.querySelector('[data-act="message"]')?.addEventListener('click', () => openChat());
  /* round 10 (Kevin): reopen the sent order for editing; T05's Send resends it */
  root.querySelector('[data-act="edit"]')?.addEventListener('click', () => {
    const a = current(state);
    if (!a || jobView(a).canon !== 'awaiting-approval') { toast('Nothing to edit — Sarah already approved the order'); return; }
    reopenDraft(a);
    go('t04-appointment-details');
  });
  root.querySelector('[data-act="ready"]')?.addEventListener('click', () => {
    const a = current(state);
    /* R4-T-03: a closed job (reached through history) is not "already
       marked ready" — it is off the calendar */
    if (a && isTerminalJob(a)) { toast('This job is no longer on your calendar'); go('t01-home', { replace: true }); return; }
    const v = jobView(a);
    if (v.canon === 'confirmed') { toast('Nothing to mark ready yet — send the final order first'); return; }
    /* demo shortcut (recorded): Sarah approves on the spot if she hasn't yet */
    if (v.canon === 'awaiting-approval') { if (T.approve(a)) toast('Demo: Sarah approved the final order'); }
    if (!T.ready(a)) { toast('Already marked ready'); return; }
    go('t07-job-ready');
  });
}

register('t06-appointment-status', viewStatus, wire);
