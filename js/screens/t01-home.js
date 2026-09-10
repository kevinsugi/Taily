/* ============================================================
   T01 - Home / View Requests — Figma 455:3560.
   Serif greeting, New Requests (one request card per job Sarah is
   still asking for), Active Jobs (one job card per open job + Leo Von
   filler), and — once something ended today — a "Done today" section
   (delivered first, then Cancelled / Withdrawn / Expired rows).
   Gap 16. Active=T-Home.

   UX-LOOP round 1: the request card's payout / lines / meta and the
   job card read the live appointment (R1-T-02); a customer
   cancellation renders a Cancelled card that opens T03B (R1-T-01);
   the expiry timer ticks from a deadline (R1-T-14).
   Round 2 (R2-T-01): the tailor side is a LIST — `jobs(s)` — and the
   card the tailor taps becomes `tailorUi.current` for T02…T08.
   R2-T-03: the tick (and first render) expires a lapsed request; the
   timer strip is the recorded demo "time passes". R2-T-04: a proposed
   time shows "Time proposed · … — waiting for Sarah" + Withdraw, and
   "Sarah kept her original time" when she declined it. R2-T-05/06:
   terminal rows per reason (by you / No-show / Withdrawn / Expired).
   R2-T-09: "Sarah has questions" while she talks the order over.
   Round 3: R3-T-02 — Withdraw is Marco's own act ("You withdrew your
   proposed time"); an expired request whose proposal went unanswered
   says so. R3-T-03 — the three-way partition above; closed rows are
   the muted `closed` card variant with no payout column; live request
   cards carry "$108 · 1 item" so two same-day requests read apart.
   The harness deep link keeps the frame's fixture; the round-3 frame
   "T01 - Home / Closed Rows" (t01-home-closed) draws the "Done today"
   section.
   Round 6: "Done today" is dismissable — a `Clear` link on the section
   row (View All's style) hides the closed rows for the session
   (`state.tailorUi.clearedClosed`); a job that closes after the tap
   re-shows them. The completed row keeps its payout and stays.
   Round 7 (money model v2): the request card leads with the PAYOUT —
   100% of the alteration prices ("$200 · 2 items"); job cards read
   "Payout $200". No commission anywhere on the tailor side.
   ============================================================ */

import { register, render as go } from '../app.js';
import { toast } from '../components.js';
import { fmtWhen } from '../data.js';
import { state } from '../state.js';
import { tailorChrome, wireTailorNav, sectionRow, requestCard, jobCard } from '../tailor-components.js';
import {
  jobs, jobView, jobTarget, tailorOf, setCurrent, isFixture, isSeed, isLapsed, requestTimer, restartTimer, endedBy, canon, proposalDeclinedBy, T,
  clearClosed, closedCleared, CUSTOMER, FILLER_JOB,
} from '../tailor-data.js';

/* one request card per job Sarah is still asking for. The FRAME draws
   the seed as a request AND a confirmed job (a composite mock): that
   fiction renders on the harness deep link only — live, a confirmed
   job is a job (R2-T-01: no phantom "New Request" for an accepted visit) */
const isRequest = (a, fixture) => canon(a) === 'searching' || (fixture && isSeed(a) && canon(a) === 'confirmed' && !tailorOf(a).requestHandled);
/* R3-T-03: Active Jobs = confirmed → ready-for-pickup; delivered and
   closed jobs live under "Done today" */
const isActive = (a) => ['confirmed', 'awaiting-approval', 'tailoring', 'ready-for-pickup'].includes(canon(a));
const isDone = (a) => ['delivered', 'cancelled', 'expired', 'declined'].includes(canon(a));

function requestFor(a, idx, fixture) {
  const v = jobView(a);
  const t = tailorOf(a);
  const by = a.proposed ? null : proposalDeclinedBy(a);
  return requestCard({
    idx,
    payout: fixture ? '$200' : v.money.payout,
    count: fixture ? '' : `${v.items} item${v.items === 1 ? '' : 's'}`,
    name: CUSTOMER.name,
    address: `${fixture ? CUSTOMER.short : v.address} · ${CUSTOMER.dist}`,
    meta: fixture ? '▤ Tonight 7:00 PM · Need by Fri, Jul 17 (5 Days)' : `▤ ${v.when} · Need by ${v.needBy}`,
    lines: v.lines.length ? v.lines : ['Suit Jacket - Hem / Adjust Length - $120', 'Suit Jacket - Sleeve / Adjust Length - $80'],
    expires: requestTimer(t),
    proposed: a.proposed?.when ? fmtWhen(a.proposed.when) : '',
    note: by === 'tailor' ? 'You withdrew your proposed time' : by === 'customer' ? 'Sarah kept her original time' : '',
  });
}

function openJobFor(a, idx, fixture) {
  const v = jobView(a);
  const right = a.changesRequestedAt && v.canon === 'awaiting-approval' ? 'Sarah has questions' : v.itemsLabel;
  return jobCard({
    month: v.month, day: v.day, name: CUSTOMER.name, meta: fixture ? '7:00PM - 88 Leonard St, 4B' : v.meta, payout: v.money.payout,
    status: v.pill, pillLabel: v.pillLabel, stage: v.stage, right, attrs: `data-act="open-job" data-job="${idx}"`,
  });
}

/** "Done today": the completed job keeps its payout; Cancelled (by
    Sarah / by you / no-show), Withdrawn and Expired rows are the muted
    closed variant; declined ones simply leave. */
function doneRowFor(a, idx, fixture) {
  const v = jobView(a);
  if (v.canon === 'delivered') return openJobFor(a, idx, fixture);
  const how = endedBy(a);
  if (how === 'declined') return '';
  const meta = fixture ? '7:00PM - 88 Leonard St, 4B' : v.meta;
  const base = { month: v.month, day: v.day, name: CUSTOMER.name, stage: 'confirmed', closed: true, attrs: `data-act="open-job" data-job="${idx}"` };
  if (how === 'expired') {
    /* R3-T-02: the proposal Marco made lapsed with the request */
    const lapsed = a.lapsedProposal ? 'Request lapsed — your proposal went unanswered' : `Request lapsed · ${v.when}`;
    return jobCard({ ...base, meta: lapsed, status: 'expired', pillLabel: 'Expired', right: 'No action needed' });
  }
  if (how === 'withdrawn') return jobCard({ ...base, meta, status: 'cancelled', pillLabel: 'Withdrawn', right: 'No action needed' });
  const right = how === 'no-show' ? 'No-show' : how === 'tailor' ? 'Cancelled · by you' : 'Slot reopened';
  return jobCard({ ...base, meta, status: 'cancelled', pillLabel: 'Cancelled', right });
}

/** Exported: `t01-home-closed` (round-3 frame "T01 - Home / Closed Rows")
    renders a fixture state's proposed request + closed rows. */
export function viewTailorHome(s) {
  const fixture = isFixture();
  const list = jobs(s);
  const requests = list.map((a, i) => (isRequest(a, fixture) ? requestFor(a, i, fixture) : '')).filter(Boolean);
  const active = list.map((a, i) => (isActive(a) ? openJobFor(a, i, fixture) : '')).filter(Boolean);
  /* delivered first, then the closed rows, each group in list order.
     Round 6: the closed rows are hidden once Clear was tapped (until a
     job closes after it); the Clear link shows only while they are. */
  const closedJobs = list.filter((a) => isDone(a) && canon(a) !== 'delivered' && endedBy(a) !== 'declined');
  const cleared = closedCleared(closedJobs, s);
  const done = [
    ...list.map((a, i) => (canon(a) === 'delivered' ? doneRowFor(a, i, fixture) : '')),
    ...(cleared ? [] : list.map((a, i) => (isDone(a) && canon(a) !== 'delivered' ? doneRowFor(a, i, fixture) : ''))),
  ].filter(Boolean);
  const clearLink = !cleared && closedJobs.length ? 'Clear' : '';

  return `${tailorChrome('home')}
<div class="body" data-s="t01-home">
  <div class="home-heading"><h1 class="t-title w-600 c-ink">Good Morning, Marco</h1></div>
  ${sectionRow('New Requests')}
  ${requests.length ? `<div class="t-actions t-actions--16">${requests.join('\n    ')}</div>` : '<p class="t-body c-500">No new requests.</p>'}
  ${sectionRow('Active Jobs', 'View All')}
  <div class="t-actions t-actions--16">
    ${active.join('\n    ')}
    ${jobCard({ ...FILLER_JOB, attrs: 'data-act="filler"' })}
  </div>
  ${done.length ? `${sectionRow('Done today', clearLink, 'clear-done')}
  <div class="t-actions t-actions--16 t-done">
    ${done.join('\n    ')}
  </div>` : ''}
</div>`;
}

/** R2-T-03: a searching job whose window closed lapses — toast, the
    request card leaves, an Expired row appears. Returns true when
    something changed (the caller re-renders). */
function expireLapsed(now = Date.now()) {
  let changed = false;
  jobs(state).forEach((a) => {
    if (!isLapsed(a, now)) return;
    if (T.expire(a)) { changed = true; toast('Sarah’s request expired'); }
  });
  return changed;
}

export function wire(root) {
  wireTailorNav(root);
  const list = jobs(state);
  const at = (el) => list[Number(el.dataset.req ?? el.dataset.job)];
  const rerender = () => go('t01-home', { replace: true });

  root.querySelectorAll('[data-act="view-details"]').forEach((el) => el.addEventListener('click', () => { setCurrent(at(el)); go('t02-appointment-request'); }));
  root.querySelectorAll('[data-act="decline"]').forEach((el) => el.addEventListener('click', () => { setCurrent(at(el)); go('t03a-decline-request'); }));
  root.querySelectorAll('[data-act="withdraw"]').forEach((el) => el.addEventListener('click', () => {
    const a = at(el);
    /* R3-T-02: Marco's own act — Sarah did nothing */
    if (T.withdrawProposal(a)) { restartTimer(a); toast('Proposal withdrawn'); rerender(); }
  }));
  root.querySelectorAll('[data-act="open-job"]').forEach((el) => el.addEventListener('click', () => { const a = at(el); setCurrent(a); go(jobTarget(a)); }));
  root.querySelector('[data-act="filler"]')?.addEventListener('click', () => toast('Leo Von’s job is outside this prototype'));
  root.querySelector('[data-act="view-all"]')?.addEventListener('click', () => toast('All jobs are outside this prototype'));
  /* round 6: Clear hides the closed "Done today" rows for the session */
  root.querySelector('[data-act="clear-done"]')?.addEventListener('click', () => {
    clearClosed(list.filter((a) => isDone(a) && canon(a) !== 'delivered' && endedBy(a) !== 'declined'));
    rerender();
  });

  /* R2-T-03 demo affordance (recorded): tapping the timer strip = time
     passes → the request expires. The confirmed seed's fixture card
     (the frame's "request + job" fiction) has nothing to expire. */
  root.querySelectorAll('[data-act="time-passes"]').forEach((el) => el.addEventListener('click', () => {
    const a = at(el);
    if (canon(a) !== 'searching') { toast('Demo: this request is already on your calendar'); return; }
    tailorOf(a).expiresAt = Date.now();
    if (expireLapsed()) rerender();
  }));

  /* first render + R1-T-14 tick: timers count down per job; a lapsed
     request expires (R2-T-03). The harness deep link stays at 1H 24M. */
  if (!isFixture() && expireLapsed()) { rerender(); return; }
  const timers = [...root.querySelectorAll('[data-timer]')];
  if (timers.length) {
    const tick = setInterval(() => {
      if (!root.isConnected || !timers[0].isConnected) { clearInterval(tick); return; }
      if (expireLapsed()) { clearInterval(tick); rerender(); return; }
      timers.forEach((el) => { const a = at(el); if (a) el.textContent = requestTimer(tailorOf(a)); });
    }, 15000);
  }
}

register('t01-home', viewTailorHome, wire);
