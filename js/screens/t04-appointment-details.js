/* ============================================================
   T04 - Appointment Details — Figma 455:2587.
   At the visit: customer card + editable (Appt) garment cards with
   upload rows, fee rows, Continue + Contact Taily Support.
   Active=T-Calendar.

   UX-LOOP R1-T-03: a real editor. The cards render a DRAFT that starts
   from the booked order (a.tailor.draft, see draftFor); the
   selectors / ⊕ Additional Service / ✕ / photo tiles / Add Comment /
   + Additional Garment mutate it exactly as 02 mutates state.garments,
   and the "Your payout" row (round 7: 100% of the alteration prices,
   no fee row) recomputes on every change. T05 Send writes the
   draft back to the appointment. The harness deep link starts from
   the frame's final-order fixture instead. Round 2: the draft is keyed
   to the tapped job and its garments keep their booked ids (R2-T-08).
   Round 6: Contact Taily Support opens 10-messages on the canned
   support thread (openChat('support')); its back chevron returns here.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { summaryCard, cta, toast } from '../components.js';
import { state } from '../state.js';
import { tailorChrome, wireTailorNav, backHeader, orderCards, payoutRows, wireOrderEditor, openChat } from '../tailor-components.js';
import { current, jobView, draftFor, orderMoney, isFixture, CUSTOMER, CUSTOMER_ROWS, isTerminalJob } from '../tailor-data.js';

function renderScreen(s) {
  const a = current(s);
  const v = jobView(a);
  const fixture = isFixture();
  const draft = draftFor(s, a, { fixture });
  return `${tailorChrome('calendar')}
<div class="body" data-s="t04-appointment-details">
  ${backHeader('Appointment Details', 'Upload all notes and photos below.')}
  <div class="summary">
    ${summaryCard({ initials: CUSTOMER.initials, name: CUSTOMER.name, rows: fixture ? CUSTOMER_ROWS : v.rows })}
    <div class="garments-card">
      ${orderCards(draft, { variant: 'Appt' })}
      ${fixture ? '' : '<button type="button" class="add-garment" data-act="add-garment">+ Additional Garment</button>'}
      ${payoutRows(orderMoney(draft))}
    </div>
  </div>
  <div class="t-actions">
    ${cta('Continue', { attrs: 'data-act="continue"' })}
    ${cta('Contact Taily Support', { variant: 'secondary', attrs: 'data-act="support"' })}
  </div>
</div>`;
}

function wire(root) {
  /* R5-T-01/02: a closed job reached through history or a deep link is off
     the calendar — leave the editor instead of drawing it. */
  { const a0 = current(state); if (window.__tailyNavigated && a0 && isTerminalJob(a0)) { toast('This job is no longer on your calendar'); setTimeout(() => go('t01-home', { replace: true }), 0); return; } }
  wireTailorNav(root);
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('t03-request-accepted'));
  root.querySelector('[data-act="continue"]')?.addEventListener('click', () => go('t05-confirm-final-pricing'));
  /* round 6: the canned Taily Support thread on the shared messages screen; back returns here */
  root.querySelector('[data-act="support"]')?.addEventListener('click', () => openChat('support'));
  const draft = draftFor(state, current(state), { fixture: isFixture() });
  wireOrderEditor(root, draft, () => go('t04-appointment-details', { replace: true }));
}

register('t04-appointment-details', renderScreen, wire);
