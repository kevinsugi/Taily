/* ============================================================
   T06 - Appointment Status — Figma 473:6324 (Marco's 03/Tailoring).
   Job card (need-by badge, payout, status pill, items), Appt_View
   cards, fee rows, primary CTA / Back to Appointments. Active=T-Calendar.

   UX-LOOP R1-T-06/07: live states carry a status line under the
   header and a per-status primary CTA (awaiting/tailoring → Mark
   Ready, ready → View Handoff Details, delivered → View Payout); the
   chevron goes Home. The harness deep link (seed still 'confirmed')
   renders the frame's Tailoring fixture: $324, three cards itemised
   $120/$80/$80, Mark Ready, no status line.
   ============================================================ */

import { register, render as go } from '../app.js';
import { cta, toast } from '../components.js';
import { state, approveOrder, markReady } from '../state.js';
import { tailorChrome, wireTailorNav, backHeader, jobCard, orderCards, payoutRows } from '../tailor-components.js';
import { job, jobView, isFixture, FIXTURE_T06, CUSTOMER } from '../tailor-data.js';

const LINE = {
  'awaiting-approval': 'Waiting for Sarah to approve the final order. You’ll be notified — tailoring starts after approval.',
  tailoring: 'Sarah approved the final order. Mark the job ready when the garments are done.',
};

function renderScreen(s) {
  const a = job(s);
  const v = jobView(a);
  const fixture = isFixture() || !v.post;
  const shown = fixture ? jobView({ ...a, status: 'tailoring', garments: FIXTURE_T06, totals: { subtotal: 360 } }) : v;
  const line = fixture ? '' : {
    ...LINE,
    'ready-for-pickup': `Ready — handoff ${a.fulfilment?.window ?? 'Fri, Jul 17 · 3:00 PM'}.`,
    delivered: `Completed · payout ${v.money.payout} on Mon, Jul 20.`,
  }[v.canon] ?? '';
  const primary = fixture || v.canon === 'awaiting-approval' || v.canon === 'tailoring'
    ? cta('Mark Ready', { attrs: 'data-act="ready"' })
    : v.canon === 'ready-for-pickup'
      ? cta('View Handoff Details', { attrs: 'data-act="handoff"' })
      : cta('View Payout', { attrs: 'data-act="payout"' });
  return `${tailorChrome('calendar')}
<div class="body" data-s="t06-appointment-status">
  ${backHeader('Appointment Status', line)}
  <div class="summary">
    ${jobCard({ month: shown.month, day: shown.day, name: CUSTOMER.name, meta: shown.meta, payout: shown.money.payout, status: shown.pill, pillLabel: shown.pillLabel, stage: shown.stage, right: shown.itemsLabel })}
    <div class="garments-card">
      ${orderCards(shown.garments, { variant: 'Appt_View', plain: true })}
      ${payoutRows(shown)}
    </div>
  </div>
  <div class="t-actions">
    ${primary}
    ${cta('Back to Appointments', { variant: 'secondary', attrs: 'data-act="home"' })}
  </div>
</div>`;
}

function wire(root) {
  wireTailorNav(root);
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => go('t01-home'));
  root.querySelector('[data-act="home"]')?.addEventListener('click', () => go('t01-home'));
  root.querySelector('[data-act="handoff"]')?.addEventListener('click', () => go('t07-job-ready'));
  root.querySelector('[data-act="payout"]')?.addEventListener('click', () => go('t08-job-complete'));
  root.querySelector('[data-act="ready"]')?.addEventListener('click', () => {
    const v = jobView(job(state));
    /* demo shortcut (recorded): Sarah approves on the spot if she hasn't yet */
    if (v.canon === 'awaiting-approval') { approveOrder(); toast('Demo: Sarah approved the final order'); }
    if (v.canon === 'confirmed') { toast('Nothing to mark ready yet — send the final order first'); return; }
    markReady();
    go('t07-job-ready');
  });
}

register('t06-appointment-status', renderScreen, wire);
