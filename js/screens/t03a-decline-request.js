/* ============================================================
   T03A - Decline Request — Figma 449:733.
   Heading + 14px sub, five T2 / Radio Rows with hairlines,
   Decline Request / Back to details. Body gap 8. Active=T-Home.
   UX-LOOP R1-T-08: no reason is pre-selected on live loads (the
   harness deep link keeps the frame's selected first row); declining
   without a reason toasts; the secondary CTA goes back.
   Round 2: acts on the tapped job (R2-T-01/02). R2-T-04: with
   "Schedule conflict" chosen the primary CTA becomes `Suggest Another
   Time`, which opens the 02.1 wheel bounded to the seven days from
   the requested visit; confirming runs proposeTime(a, when), restarts
   the request timer and lands on T01's "Time proposed" card. The
   deep link keeps the frame's `Decline Request`.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { cta, toast } from '../components.js';
import { dayRows, shiftDay, fmtWhen } from '../data.js';
import { state } from '../state.js';
import { tailorChrome, wireTailorNav, radioRow, hairline } from '../tailor-components.js';
import { current, jobView, tailorOf, isFixture, restartTimer, T } from '../tailor-data.js';
import { openDateTimeOverlay } from './02.1-date-time-sheet.js';

const REASONS = ['Schedule conflict', 'Outside my service area', 'Can’t take this job type', 'Timeline too tight', 'Other'];
const CONFLICT = 0;
/* only a request Sarah is still waiting on can be given a new time */
const canPropose = (a) => jobView(a).canon === 'searching';
const primaryLabel = (reason, a, fixture) => (!fixture && reason === CONFLICT && canPropose(a) ? 'Suggest Another Time' : 'Decline Request');

/** Exported: `mode` 'suggest' forces the Schedule-conflict primary (round-3
    frame "T03A - Decline Request / Suggest Time"). */
export function viewDecline(s, mode = null) {
  const a = current(s);
  const t = tailorOf(a);
  const fixture = isFixture();
  const sel = fixture ? (t.declineReason ?? 0) : t.declineReason;
  const label = mode === 'suggest' ? 'Suggest Another Time' : primaryLabel(sel, a, fixture);
  const rows = REASONS.map((r, i) => radioRow(r, { selected: i === sel, attrs: `data-reason="${i}"` })).join(hairline());
  return `${tailorChrome('home')}
<div class="body" data-s="t03a-decline-request">
  <div class="t-heading">
    <h1 class="t-title c-ink">Decline Request</h1>
    <p class="t-small w-400 c-500">Let us know why, Sarah won’t see this.</p>
  </div>
  <div class="reasons" role="radiogroup" aria-label="Reason">${rows}</div>
  <div class="t-actions t-actions--pad">
    ${cta(label, { attrs: 'data-act="decline"' })}
    ${cta('Back to details', { variant: 'secondary', attrs: 'data-act="back"' })}
  </div>
</div>`;
}

/** Seven days from the requested visit, as wheel rows ("Wed 9 Sept"). */
function proposalDays(a) {
  const from = a?.when;
  const to = shiftDay(from, 6);
  return from && to ? dayRows(from, to, 7) : [];
}

function suggestTime(a) {
  openDateTimeOverlay('custom', (p) => {
    const when = `${p.md}, ${p.time}`;
    if (!T.propose(a, when)) { toast('This request can no longer be rescheduled'); return; }
    restartTimer(a);
    tailorOf(a).declineReason = null;
    toast(`Proposed ${fmtWhen(when)} — waiting for Sarah`);
    go('t01-home');
  }, { days: proposalDays(a) });
  /* the shared picker is titled for its 05A/05B use; this is a proposal */
  const title = document.querySelector('#screen .screen-sheet--overlay .sheet__title');
  if (title) title.textContent = 'Suggest another time';
}

export function wire(root) {
  wireTailorNav(root);
  const a = current(state);
  const t = tailorOf(a);
  if (isFixture()) t.declineReason ??= 0;   // the frame draws the first row selected
  const primary = root.querySelector('[data-act="decline"]');
  root.querySelectorAll('[data-reason]').forEach((el) => el.addEventListener('click', () => {
    t.declineReason = Number(el.dataset.reason);
    root.querySelectorAll('.radio-row').forEach((r) => { r.classList.toggle('radio-row--selected', r === el); r.setAttribute('aria-checked', r === el); });
    if (primary) primary.textContent = primaryLabel(t.declineReason, a, false);
  }));
  primary?.addEventListener('click', () => {
    if (t.declineReason == null) { toast('Choose a reason first'); return; }
    const v = jobView(a);
    if (t.declineReason === CONFLICT && canPropose(a)) { suggestTime(a); return; }
    if (!['searching', 'confirmed'].includes(v.canon) || !T.decline(a)) { toast('This request is no longer open'); return; }
    t.requestHandled = true;
    t.declineReason = null;
    toast('Request declined');
    go('t01-home');
  });
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('t01-home'));
}

register('t03a-decline-request', viewDecline, wire);
