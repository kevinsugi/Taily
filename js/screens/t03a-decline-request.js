/* ============================================================
   T03A - Decline Request — Figma 449:733.
   Heading + 14px sub, five T2 / Radio Rows with hairlines,
   Decline Request / Back to details. Body gap 8. Active=T-Home.
   UX-LOOP R1-T-08: no reason is pre-selected on live loads (the
   harness deep link keeps the frame's selected first row); declining
   without a reason toasts; the secondary CTA goes back.
   Round 2: acts on the tapped job (R2-T-01/02). R2-T-04: with
   "Schedule conflict" chosen the primary CTA becomes `Suggest Another
   Time`, which opens the 02.1 wheel; confirming runs proposeTime(a,
   when), restarts the request timer and lands on T01's "Time proposed"
   card. The deep link keeps the frame's `Decline Request`.
   Round 3 (R3-T-01): the wheel's days come from the substrate's
   `proposalDays(a)` — bounded by Sarah's need-by. When there is no
   later slot to offer the Schedule-conflict row keeps `Decline Request`
   with a one-line reason; a proposal the substrate refuses (after the
   need-by day) toasts "That's after Sarah's need-by (…)".
   Round 4 (R4-T-01/04): on the need-by day the wheel's hours stop
   before the need-by time (`proposalHours` / `proposalMins`); when no
   slot fits, `proposalDays` drops the day — and returns `[]` when the
   need-by is on the visit day at or before 9 AM, which is when the
   no-slot line shows and `Decline Request` stays the primary.
   Round 6: selecting "Other" reveals a textarea ("Tell us more
   (optional)") under the rows; Decline stores it as `a.declineNote`.
   The sibling frame "T03A - Decline Request / Other" (t03a-other)
   draws that state.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { cta, toast } from '../components.js';
import { fmtWhen, fmtDay, proposalHours, proposalMins } from '../data.js';
import { state } from '../state.js';
import { tailorChrome, wireTailorNav, radioRow, hairline } from '../tailor-components.js';
import { current, jobView, tailorOf, isFixture, restartTimer, proposalDays, T } from '../tailor-data.js';
import { openDateTimeOverlay } from './02.1-date-time-sheet.js';

const REASONS = ['Schedule conflict', 'Outside my service area', 'Can’t take this job type', 'Timeline too tight', 'Other'];
const CONFLICT = 0;
export const OTHER = REASONS.length - 1;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/* only a request Sarah is still waiting on can be given a new time —
   and only when a slot before her need-by is left to offer (R3-T-01) */
const canPropose = (a) => jobView(a).canon === 'searching' && proposalDays(a).length > 0;
const noSlot = (a) => jobView(a).canon === 'searching' && proposalDays(a).length === 0;
const primaryLabel = (reason, a, fixture) => (!fixture && reason === CONFLICT && canPropose(a) ? 'Suggest Another Time' : 'Decline Request');
const reasonLine = (a) => `Sarah needs these by ${fmtDay(a?.needBy, 'her need-by date')} — no later slot to offer`;

/** Exported: `mode` 'suggest' forces the Schedule-conflict primary (round-3
    frame "T03A - Decline Request / Suggest Time"); 'other' the Other row
    with its textarea (round-6 frame "T03A - Decline Request / Other"). */
export function viewDecline(s, mode = null) {
  const a = current(s);
  const t = tailorOf(a);
  const fixture = isFixture();
  const sel = mode === 'other' ? OTHER : fixture ? (t.declineReason ?? 0) : t.declineReason;
  const label = mode === 'suggest' ? 'Suggest Another Time' : primaryLabel(sel, a, fixture);
  const rows = REASONS.map((r, i) => radioRow(r, { selected: i === sel, attrs: `data-reason="${i}"` })).join(hairline());
  const showReason = !fixture && sel === CONFLICT && noSlot(a);
  /* round 6: "Other" opens a free-text note (kept on the job as declineNote) */
  const note = `<textarea class="t03a__note" data-act="decline-note" rows="3" placeholder="Tell us more (optional)" aria-label="Tell us more"${sel === OTHER ? '' : ' hidden'}>${esc(a?.declineNote)}</textarea>`;
  return `${tailorChrome('home')}
<div class="body" data-s="t03a-decline-request">
  <div class="t-heading">
    <h1 class="t-title c-ink">Decline Request</h1>
    <p class="t-small w-400 c-500">Let us know why, Sarah won’t see this.</p>
  </div>
  <div class="reasons" role="radiogroup" aria-label="Reason">${rows}</div>
  ${note}
  <p class="t-small w-400 c-500 t03a__reason" data-no-slot${showReason ? '' : ' hidden'}>${reasonLine(a)}</p>
  <div class="t-actions t-actions--pad">
    ${cta(label, { attrs: 'data-act="decline"' })}
    ${cta('Back to details', { variant: 'secondary', attrs: 'data-act="back"' })}
  </div>
</div>`;
}

function suggestTime(a) {
  openDateTimeOverlay('custom', (p) => {
    const when = `${p.md}, ${p.time}`;
    if (!T.propose(a, when)) {
      /* the substrate refuses a slot after Sarah's need-by (R3-T-01 day,
         R4-T-01 time on that day) — or the request is no longer open */
      toast(jobView(a).canon === 'searching' ? `That’s after Sarah’s need-by (${fmtWhen(a.needBy)})` : 'This request can no longer be rescheduled');
      return;
    }
    restartTimer(a);
    tailorOf(a).declineReason = null;
    toast(`Proposed ${fmtWhen(when)} — waiting for Sarah`);
    go('t01-home');
  }, {
    days: proposalDays(a),
    /* R4-U-03 / R4-T-01: on the need-by day only the slots before the
       need-by time */
    hoursFor: (day) => proposalHours(a, day),
    minsFor: (day, hour) => proposalMins(a, day, hour),
  });
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
  const line = root.querySelector('[data-no-slot]');
  const note = root.querySelector('[data-act="decline-note"]');
  root.querySelectorAll('[data-reason]').forEach((el) => el.addEventListener('click', () => {
    t.declineReason = Number(el.dataset.reason);
    root.querySelectorAll('.radio-row').forEach((r) => { r.classList.toggle('radio-row--selected', r === el); r.setAttribute('aria-checked', r === el); });
    if (primary) primary.textContent = primaryLabel(t.declineReason, a, false);
    if (line) line.hidden = !(t.declineReason === CONFLICT && noSlot(a));
    /* round 6: the Other row reveals the note field */
    if (note) { note.hidden = t.declineReason !== OTHER; if (!note.hidden) note.focus(); }
  }));
  primary?.addEventListener('click', () => {
    if (t.declineReason == null) { toast('Choose a reason first'); return; }
    const v = jobView(a);
    if (t.declineReason === CONFLICT && canPropose(a)) { suggestTime(a); return; }
    if (!['searching', 'confirmed'].includes(v.canon) || !T.decline(a)) { toast('This request is no longer open'); return; }
    /* round 6: the Other note travels with the job (Sarah never sees it) */
    if (a) a.declineNote = t.declineReason === OTHER ? (note?.value.trim() ?? '') : '';
    t.requestHandled = true;
    t.declineReason = null;
    toast('Request declined');
    go('t01-home');
  });
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('t01-home'));
}

register('t03a-decline-request', viewDecline, wire);
