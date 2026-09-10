/* ============================================================
   T01 - Home / View Requests — Figma 455:3560.
   Serif greeting, New Requests (request card while Sarah's job is
   unhandled), Active Jobs (Sarah's job card by status + Leo Von
   filler). Gap 16. Active=T-Home.

   UX-LOOP round 1: the request card's payout / lines / meta and the
   job card read the live appointment (R1-T-02); a customer
   cancellation renders a Cancelled card that opens T03B (R1-T-01);
   the expiry timer ticks from a deadline (R1-T-14). The harness deep
   link keeps the frame's fixture.
   ============================================================ */

import { register, render as go } from '../app.js';
import { toast } from '../components.js';
import { state } from '../state.js';
import { tailorChrome, wireTailorNav, sectionRow, requestCard, jobCard } from '../tailor-components.js';
import { job, jobView, jobTarget, tailorUi, isFixture, requestTimer, CUSTOMER, FILLER_JOB } from '../tailor-data.js';

function renderScreen(s) {
  const a = job(s);
  const ui = tailorUi(s);
  const v = a ? jobView(a) : null;
  const fixture = isFixture();
  /* the frame shows the request AND the confirmed job — the request
     stays until the tailor acts on it (accept / decline) */
  const showRequest = v && (v.canon === 'searching' || (v.canon === 'confirmed' && !ui.requestHandled));
  const showJob = v && !['searching', 'declined', 'expired'].includes(v.canon);

  const request = showRequest ? requestCard({
    payout: fixture ? '$180' : v.money.payout,
    name: CUSTOMER.name,
    address: `${fixture ? CUSTOMER.short : v.address} · ${CUSTOMER.dist}`,
    meta: fixture ? '▤ Tonight 7:00 PM · Need by Fri, Jul 17 (5 Days)' : `▤ ${v.when} · Need by ${v.needBy}`,
    lines: v.lines.length ? v.lines : ['Suit Jacket - Hem / Adjust Length - $120', 'Suit Jacket - Sleeve / Adjust Length - $80'],
    expires: requestTimer(ui),
  }) : '<p class="t-body c-500">No new requests.</p>';

  const sarah = !showJob ? '' : v.canon === 'cancelled'
    ? jobCard({
      month: v.month, day: v.day, name: CUSTOMER.name, meta: fixture ? '7:00PM - 88 Leonard St, 4B' : v.meta, payout: v.money.payout,
      status: 'cancelled', pillLabel: 'Cancelled', stage: 'confirmed', right: 'Slot reopened', attrs: 'data-act="open-job"',
    })
    : jobCard({
      month: v.month, day: v.day, name: CUSTOMER.name, meta: fixture ? '7:00PM - 88 Leonard St, 4B' : v.meta, payout: v.money.payout,
      status: v.pill, pillLabel: v.pillLabel, stage: v.stage, right: v.itemsLabel, attrs: 'data-act="open-job"',
    });

  return `${tailorChrome('home')}
<div class="body" data-s="t01-home">
  <div class="home-heading"><h1 class="t-title w-600 c-ink">Good Morning, Marco</h1></div>
  ${sectionRow('New Requests')}
  ${request}
  ${sectionRow('Active Jobs', 'View All')}
  <div class="t-actions t-actions--16">
    ${sarah}
    ${jobCard({ ...FILLER_JOB, attrs: 'data-act="filler"' })}
  </div>
</div>`;
}

function wire(root) {
  wireTailorNav(root);
  root.querySelector('[data-act="view-details"]')?.addEventListener('click', () => go('t02-appointment-request'));
  root.querySelector('[data-act="decline"]')?.addEventListener('click', () => go('t03a-decline-request'));
  root.querySelector('[data-act="open-job"]')?.addEventListener('click', () => go(jobTarget(job(state))));
  root.querySelector('[data-act="filler"]')?.addEventListener('click', () => toast('Leo Von’s job is outside this prototype'));
  root.querySelector('[data-act="view-all"]')?.addEventListener('click', () => toast('All jobs are outside this prototype'));
  /* R1-T-14: the timer ticks while this render is on screen */
  const timer = root.querySelector('[data-timer]');
  if (timer) {
    const tick = setInterval(() => {
      if (!root.isConnected || !timer.isConnected) { clearInterval(tick); return; }
      timer.textContent = requestTimer(tailorUi(state));
    }, 15000);
  }
}

register('t01-home', renderScreen, wire);
