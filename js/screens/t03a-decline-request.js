/* ============================================================
   T03A - Decline Request — Figma 449:733.
   Heading + 14px sub, five T2 / Radio Rows with hairlines,
   Decline Request / Back to details. Body gap 8. Active=T-Home.
   UX-LOOP R1-T-08: no reason is pre-selected on live loads (the
   harness deep link keeps the frame's selected first row); declining
   without a reason toasts; the secondary CTA goes back.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { cta, toast } from '../components.js';
import { state, declineAppointment } from '../state.js';
import { tailorChrome, wireTailorNav, radioRow, hairline } from '../tailor-components.js';
import { tailorUi, isFixture } from '../tailor-data.js';

const REASONS = ['Schedule conflict', 'Outside my service area', 'Can’t take this job type', 'Timeline too tight', 'Other'];

function renderScreen(s) {
  const ui = tailorUi(s);
  const sel = isFixture() ? (ui.declineReason ?? 0) : ui.declineReason;
  const rows = REASONS.map((r, i) => radioRow(r, { selected: i === sel, attrs: `data-reason="${i}"` })).join(hairline());
  return `${tailorChrome('home')}
<div class="body" data-s="t03a-decline-request">
  <div class="t-heading">
    <h1 class="t-title c-ink">Decline Request</h1>
    <p class="t-small w-400 c-500">Let us know why, Sarah won’t see this.</p>
  </div>
  <div class="reasons" role="radiogroup" aria-label="Reason">${rows}</div>
  <div class="t-actions t-actions--pad">
    ${cta('Decline Request', { attrs: 'data-act="decline"' })}
    ${cta('Back to details', { variant: 'secondary', attrs: 'data-act="back"' })}
  </div>
</div>`;
}

function wire(root) {
  wireTailorNav(root);
  const ui = tailorUi(state);
  if (isFixture()) ui.declineReason ??= 0;   // the frame draws the first row selected
  root.querySelectorAll('[data-reason]').forEach((el) => el.addEventListener('click', () => {
    ui.declineReason = Number(el.dataset.reason);
    root.querySelectorAll('.radio-row').forEach((r) => { r.classList.toggle('radio-row--selected', r === el); r.setAttribute('aria-checked', r === el); });
  }));
  root.querySelector('[data-act="decline"]')?.addEventListener('click', () => {
    if (ui.declineReason == null) { toast('Choose a reason first'); return; }
    declineAppointment();
    ui.requestHandled = true;
    ui.declineReason = null;
    toast('Request declined');
    go('t01-home');
  });
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('t01-home'));
}

register('t03a-decline-request', renderScreen, wire);
