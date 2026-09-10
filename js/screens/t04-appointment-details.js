/* ============================================================
   T04 - Appointment Details — Figma 455:2587.
   At the visit: customer card + editable (Appt) garment cards with
   upload rows, fee rows, Continue + Contact Taily Support.
   Active=T-Calendar.

   UX-LOOP R1-T-03: a real editor. The cards render a DRAFT that starts
   from the booked order (a.tailor.draft, see draftFor); the
   selectors / ⊕ Additional Service / ✕ / photo tiles / Add Comment /
   + Additional Garment mutate it exactly as 02 mutates state.garments,
   and the fee rows recompute on every change. T05 Send writes the
   draft back to the appointment. The harness deep link starts from
   the frame's final-order fixture instead. Round 2: the draft is keyed
   to the tapped job and its garments keep their booked ids (R2-T-08).
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { summaryCard, cta, toast } from '../components.js';
import { state } from '../state.js';
import { tailorChrome, wireTailorNav, backHeader, orderCards, payoutRows, wireOrderEditor } from '../tailor-components.js';
import { current, jobView, draftFor, orderTotals, isFixture, CUSTOMER, CUSTOMER_ROWS } from '../tailor-data.js';

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
      ${payoutRows(orderTotals(draft))}
    </div>
  </div>
  <div class="t-actions">
    ${cta('Continue', { attrs: 'data-act="continue"' })}
    ${cta('Contact Taily Support', { variant: 'secondary', attrs: 'data-act="support"' })}
  </div>
</div>`;
}

function wire(root) {
  wireTailorNav(root);
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('t03-request-accepted'));
  root.querySelector('[data-act="continue"]')?.addEventListener('click', () => go('t05-confirm-final-pricing'));
  root.querySelector('[data-act="support"]')?.addEventListener('click', () => toast('Taily Support is outside this prototype'));
  const draft = draftFor(state, current(state), { fixture: isFixture() });
  wireOrderEditor(root, draft, () => go('t04-appointment-details', { replace: true }));
}

register('t04-appointment-details', renderScreen, wire);
