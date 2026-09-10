/* ============================================================
   T01 - Home / View Requests — Figma 455:3560.
   Serif greeting, New Requests (one request card per job Sarah is
   still asking for), Active Jobs (one job card per open job + Leo Von
   filler, then this session's Cancelled / Withdrawn / Expired rows).
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
   The harness deep link keeps the frame's fixture.
   ============================================================ */

import { register, render as go } from '../app.js';
import { toast } from '../components.js';
import { fmtWhen } from '../data.js';
import { state } from '../state.js';
import { tailorChrome, wireTailorNav, sectionRow, requestCard, jobCard } from '../tailor-components.js';
import {
  jobs, jobView, jobTarget, tailorOf, setCurrent, isFixture, isSeed, isLapsed, requestTimer, restartTimer, endedBy, canon, T,
  CUSTOMER, FILLER_JOB,
} from '../tailor-data.js';

/* one request card per job Sarah is still asking for. The FRAME draws
   the seed as a request AND a confirmed job (a composite mock): that
   fiction renders on the harness deep link only — live, a confirmed
   job is a job (R2-T-01: no phantom "New Request" for an accepted visit) */
const isRequest = (a, fixture) => canon(a) === 'searching' || (fixture && isSeed(a) && canon(a) === 'confirmed' && !tailorOf(a).requestHandled);
const isOpenJob = (a) => !['searching', 'declined', 'expired', 'cancelled'].includes(canon(a));

function requestFor(a, idx, fixture) {
  const v = jobView(a);
  const t = tailorOf(a);
  const kept = !!a.proposalDeclined && !a.proposed;
  return requestCard({
    idx,
    payout: fixture ? '$180' : v.money.payout,
    name: CUSTOMER.name,
    address: `${fixture ? CUSTOMER.short : v.address} · ${CUSTOMER.dist}`,
    meta: fixture ? '▤ Tonight 7:00 PM · Need by Fri, Jul 17 (5 Days)' : `▤ ${v.when} · Need by ${v.needBy}`,
    lines: v.lines.length ? v.lines : ['Suit Jacket - Hem / Adjust Length - $120', 'Suit Jacket - Sleeve / Adjust Length - $80'],
    expires: requestTimer(t),
    proposed: a.proposed?.when ? fmtWhen(a.proposed.when) : '',
    note: kept ? 'Sarah kept her original time' : '',
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

/** This session's closed jobs — Cancelled (by Sarah / by you / no-show),
    Withdrawn and Expired rows; declined ones simply leave. */
function closedRowFor(a, idx, fixture) {
  const v = jobView(a);
  const how = endedBy(a);
  if (how === 'declined') return '';
  const meta = fixture ? '7:00PM - 88 Leonard St, 4B' : v.meta;
  const base = { month: v.month, day: v.day, name: CUSTOMER.name, stage: 'confirmed', attrs: `data-act="open-job" data-job="${idx}"` };
  if (how === 'expired') return jobCard({ ...base, meta: `Request lapsed · ${v.when}`, payout: null, status: 'expired', pillLabel: 'Expired', right: 'No action needed' });
  if (how === 'withdrawn') return jobCard({ ...base, meta, payout: null, status: 'cancelled', pillLabel: 'Withdrawn', right: 'No action needed' });
  const right = how === 'no-show' ? 'No-show' : how === 'tailor' ? 'Cancelled · by you' : 'Slot reopened';
  return jobCard({ ...base, meta, payout: v.money.payout, status: 'cancelled', pillLabel: 'Cancelled', right });
}

function renderScreen(s) {
  const fixture = isFixture();
  const list = jobs(s);
  const requests = list.map((a, i) => (isRequest(a, fixture) ? requestFor(a, i, fixture) : '')).filter(Boolean);
  const open = list.map((a, i) => (isOpenJob(a) ? openJobFor(a, i, fixture) : '')).filter(Boolean);
  const closed = list.map((a, i) => (['cancelled', 'expired', 'declined'].includes(canon(a)) ? closedRowFor(a, i, fixture) : '')).filter(Boolean);

  return `${tailorChrome('home')}
<div class="body" data-s="t01-home">
  <div class="home-heading"><h1 class="t-title w-600 c-ink">Good Morning, Marco</h1></div>
  ${sectionRow('New Requests')}
  ${requests.length ? `<div class="t-actions t-actions--16">${requests.join('\n    ')}</div>` : '<p class="t-body c-500">No new requests.</p>'}
  ${sectionRow('Active Jobs', 'View All')}
  <div class="t-actions t-actions--16">
    ${open.join('\n    ')}
    ${jobCard({ ...FILLER_JOB, attrs: 'data-act="filler"' })}
    ${closed.join('\n    ')}
  </div>
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

function wire(root) {
  wireTailorNav(root);
  const list = jobs(state);
  const at = (el) => list[Number(el.dataset.req ?? el.dataset.job)];
  const rerender = () => go('t01-home', { replace: true });

  root.querySelectorAll('[data-act="view-details"]').forEach((el) => el.addEventListener('click', () => { setCurrent(at(el)); go('t02-appointment-request'); }));
  root.querySelectorAll('[data-act="decline"]').forEach((el) => el.addEventListener('click', () => { setCurrent(at(el)); go('t03a-decline-request'); }));
  root.querySelectorAll('[data-act="withdraw"]').forEach((el) => el.addEventListener('click', () => {
    const a = at(el);
    if (T.withdrawProposal(a)) { restartTimer(a); toast('Proposal withdrawn — Sarah keeps her original time'); rerender(); }
  }));
  root.querySelectorAll('[data-act="open-job"]').forEach((el) => el.addEventListener('click', () => { const a = at(el); setCurrent(a); go(jobTarget(a)); }));
  root.querySelector('[data-act="filler"]')?.addEventListener('click', () => toast('Leo Von’s job is outside this prototype'));
  root.querySelector('[data-act="view-all"]')?.addEventListener('click', () => toast('All jobs are outside this prototype'));

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

register('t01-home', renderScreen, wire);
