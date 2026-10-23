/* ============================================================
   to-fee — K-53: the Taily fee, explained (tailor onboarding, before Services and prices). Part of step 2 ("Step 2 of 6 · Services
   and prices"): to-profile's Next lands here, Next goes on to to-services. Focal: "Taily’s 10% covers:" (PL-06) — the five things the fee
   pays for, each in one short line — then a worked example in dollars from money.js ("On a $100.00 job you keep $90.00").
   THE ONLY SCREEN THAT SHOWS A PERCENT (money.js feePercent; the flows lint and scripts/v5/lint.mjs scope the exception to this id);
   every amount here is still dollars. A live tailor opens it from Services and prices ("What the fee covers"): Shop chrome, Back.
   ============================================================ */
import { register, render as go, back } from '../app.js';
import { state, SECTIONS, onboarded } from '../state.js';
import { myTailor } from '../tailor-data.js';
import { cents, fmtExact, tailyFeeFor, payoutFor, feePercent } from '../money.js';
import { MONEY } from '../money-config.js';
import { onboardingHeader, onboardingSteps, headingRow, sectionHead, moneyRows, actionBar, esc } from '../components.js';
import * as A from '../account.js';

const ID = 'to-fee';
const STEP = 'services';   // the fee page opens step 2 (its prices come next)

/** What the fee pays for (K-53, Kevin: "Insurance · Operations · Scheduling · Clientele · Hosting, and more"), one short line each. */
const COVERS = () => [
  { title: 'Insurance', line: `Customers’ garments are covered up to ${fmtExact(cents(MONEY.GARMENT_PROTECTION_CAP))} an order while they’re with you or a courier.` },
  { title: 'Operations', line: 'Payments, deposits, refunds and support, handled for you.' },
  { title: 'Scheduling', line: 'Requests, reminders and texts, so customers show up on time.' },
  { title: 'Clientele', line: 'Customers near you find you, book you and come back.' },
  { title: 'Hosting', line: 'Your shop page, photos and reviews, online around the clock.' },
];

function view() {
  const t = myTailor();
  const editing = onboarded(t);
  const done = SECTIONS.filter((x) => t.onboarding?.[x]);
  const base = cents(MONEY.FEE_EXAMPLE_SERVICES);
  const fee = tailyFeeFor(base);
  const keep = payoutFor({ services: base });
  const title = '<h1 class="t-title">The Taily fee</h1>';
  const items = COVERS().map((c) => `<li class="${ID}__item">
      <span class="${ID}__dot" aria-hidden="true"></span>
      <span class="${ID}__text"><span class="t-body w-600 ${ID}__name">${esc(c.title)}</span><span class="t-small c-600 ${ID}__line">${esc(c.line)}</span></span>
    </li>`).join('');
  return `${onboardingHeader({ editing })}
<main class="body${editing ? '' : ' body--with-bar'} ${ID}">
  ${editing ? headingRow(title) : `${onboardingSteps(STEP, done)}<div class="heading-block ${ID}__title">${title}</div>`}
  <p class="t-body c-600 ${ID}__lead">Taily keeps a share of your service prices. Home visit and rush fees are yours in full, and customers pay for the courier.</p>
  <section class="sec ${ID}__covers" aria-labelledby="${ID}-covers">
    <h2 class="t-body w-700 ${ID}__head" id="${ID}-covers">Taily’s <span data-fee-rate>${feePercent()}%</span> covers:</h2>
    <ul class="${ID}__list" role="list">${items}</ul>
    <p class="t-small c-600 ${ID}__more">And more, like payouts every Friday and Taily Help when something goes wrong.</p>
  </section>
  <section class="sec ${ID}__example" aria-labelledby="${ID}-example">
    ${sectionHead('For example', { id: `${ID}-example` })}
    <p class="t-body w-600 ${ID}__sentence" data-money>On a ${fmtExact(base)} job you keep ${fmtExact(keep)}.</p>
    ${moneyRows([
    { label: 'Services', cents: base },
    { label: 'Taily fee', cents: fee, kind: 'negative' },
    { label: 'You keep', cents: keep, kind: 'total' },
  ])}
    <p class="t-small c-600 ${ID}__extra">Home visit and rush fees go on top, and they’re all yours. You see your payout in dollars on every request.</p>
  </section>
</main>
${editing ? '' : actionBar({ ctaLabel: 'Next', ctaAct: 'next', lead: '' })}`;
}

function wire(root) {
  const editing = onboarded(myTailor());
  root.querySelectorAll('.back[data-act="back"]').forEach((btn) => {
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => { back() || go(editing ? 'to-services' : 'to-profile'); });
  });
  root.querySelectorAll('.ob-bar [data-act="finish-later"]').forEach((b) => b.addEventListener('click', () => {
    state.ui['t-phone'] = { saved: true, phone: myTailor().phone };   // nothing to save on this page; the profile step is kept
    A.signOut('tailor');
    go('t-phone', { fresh: true });
  }));
  root.querySelectorAll('.action-bar [data-act="next"]').forEach((b) => b.addEventListener('click', () => go('to-services')));
}

register(ID, view, wire);
