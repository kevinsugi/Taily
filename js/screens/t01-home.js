/* ============================================================
   T01 - Home / View Requests — Figma 455:3560.
   Serif greeting, New Requests (request card while Sarah's job is
   unhandled), Active Jobs (Sarah's job card by status + Leo Von
   filler). Gap 16. Active=T-Home.
   ============================================================ */

import { register, render as go } from '../app.js';
import { toast } from '../components.js';
import { state } from '../state.js';
import { tailorChrome, wireTailorNav, sectionRow, requestCard, jobCard } from '../tailor-components.js';
import { job, jobView, jobTarget, tailorUi, CUSTOMER, FILLER_JOB } from '../tailor-data.js';

function renderScreen(s) {
  const a = job(s);
  const ui = tailorUi(s);
  const v = a ? jobView(a) : null;
  /* the frame shows the request AND the confirmed job — the request
     stays until the tailor acts on it (accept / decline) */
  const showRequest = v && !['declined', 'cancelled', 'expired'].includes(v.canon) && (v.canon === 'searching' || !ui.requestHandled);
  const showJob = v && !['searching', 'declined', 'cancelled', 'expired'].includes(v.canon);

  const request = showRequest ? requestCard({
    payout: '$180', name: CUSTOMER.name, address: `${CUSTOMER.short} · ${CUSTOMER.dist}`,
    meta: '▤ Tonight 7:00 PM · Need by Fri, Jul 17 (5 Days)',
    lines: v.lines.length ? v.lines : ['Suit Jacket - Hem / Adjust Length - $120', 'Suit Jacket - Sleeve / Adjust Length - $80'],
  }) : '<p class="t-body c-500">No new requests.</p>';

  const sarah = showJob ? jobCard({
    month: v.month, day: v.day, name: CUSTOMER.name, meta: v.meta, payout: v.money.payout,
    status: v.pill, pillLabel: v.pillLabel, stage: v.stage, right: v.itemsLabel, attrs: 'data-act="open-job"',
  }) : '';

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
}

register('t01-home', renderScreen, wire);
