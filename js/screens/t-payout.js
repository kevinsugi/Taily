/* ============================================================
   t-payout — T8 one job's payout (M5-spec §C4, D-136/D-137). How one
   job became one payout, in dollars. Focal: the payout figure. The
   Taily fee sits under Services with what it was taken from; the
   courier is never Amara's money (D-04). Failed → the same banner as
   Earnings and a sticky "Fix bank details".
   ============================================================ */
import { register, render as go, back, personaHome } from '../app.js';
import { state } from '../state.js';
import { myTailor, payoutDetail, customerName, payoutLine } from '../tailor-data.js';
import { setFocus, statusWord } from '../focus.js';
import { fmtExact } from '../money.js';
import { POLICY } from '../money-config.js';
import { fmtDay, fmtWhen } from '../dates.js';
import { payoutsView } from '../tailor-data.js';
import {
  chrome, headingRow, banner, emptyState, statusPill, deltaFigure, moneyRows, tailorBreakdown, listRow, actionBar, cta, esc, sectionHead, garmentIcon,
  heroGarment,
} from '../components.js';

const ID = 't-payout';
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const bankOf = (b) => `${b?.bank ?? 'Your bank'} ••${b?.last4 ?? ''}`;

/** The detail to show: the focused appointment's payout, else the newest payout (fallback). */
function detail() {
  const id = state.ui.apptId;
  const d = id ? payoutDetail(id) : null;
  if (d) return d;
  const last = [...state.payouts].reverse()[0];
  return last ? payoutDetail(last.apptId) : null;
}

/** B4 payout words (D-172): the pill and the one line under the figure, from the same `payoutLine` the job and Home use. */
function words(p) {
  const w = payoutLine(p, myTailor().payouts);
  const pill = { paid: ['completed', 'Paid'], failed: ['declined', 'Didn’t go through'] }[p.state] ?? ['waiting', 'Pending'];
  return { pill, line: w.text, tone: w.tone };
}

/** M6-P-18: why this payout is a kept deposit / no-show pay, said once under the job, with the calm pill the job itself wears. */
function keptLine(a, p) {
  const w = statusWord(a, 'tailor');
  const why = p.kind === 'no-show' ? `${esc(state.customer.first)} didn’t show up` : `Cancelled by ${esc(state.customer.first)} within ${POLICY.CANCEL_WINDOW_H} hours`;
  return `<div class="${ID}__why">${statusPill(w.pill, w.label)}<p class="t-small c-600">${why}</p></div>`;
}

function view() {
  const head = chrome('earnings', { persona: 'tailor' });
  const d = detail();
  if (!d) {
    return `${head}<main class="body ${ID}">
  ${headingRow('<h1 class="t-title">Payout</h1>', { backRow: true })}
  <div class="${ID}__empty" data-empty="payout">${emptyState({ title: 'No payout to show', body: 'Payouts show up here once you complete a job.', art: 'Accessories', ctaLabel: 'Go to Earnings', ctaAct: 'earnings' })}</div>
</main>`;
  }
  const { payout: p, appt: a, view: v } = d;
  const w = words(p);
  const failed = p.state === 'failed';
  const hero = `<div class="${ID}__pill">${statusPill(...w.pill)}</div><h1 class="sr-only">Payout</h1>
  ${deltaFigure({ label: 'Your payout', cents: p.cents, caption: w.line })}`;
  const kept = p.kind === 'kept-deposit' || p.kind === 'no-show';

  /* R5-1-T-04: the pill and the caption already say "didn't go through"; the banner looks forward: what to do and when it sends */
  const alert = failed ? `<div class="${ID}__alert">${banner({
    tone: 'error', title: 'Update your bank details to get paid',
    text: `We’ll send <span data-money>${fmtExact(p.cents)}</span> again on ${fmtDay(payoutsView().failed?.retryDate ?? p.date)} after you save them.`,
  })}</div>` : '';   // the one "Fix bank details" is the sticky bar's

  /* the job: one tappable card — the row is the "Open the job" action */
  const lines = [
    esc(fmtWhen(a.slot.start)),
    esc(v.visitLabel),
    kept ? '' : `${plural(v.items, 'item', 'items')} · ${plural(v.serviceCount, 'service', 'services')}`,
  ].filter(Boolean).map((x) => `<span class="${ID}__jline">${x}</span>`).join('');
  const job = `<section class="sec sec--first" aria-label="The job">
    <div class="card card--list ${ID}__job">${listRow({
    lead: garmentIcon(heroGarment(a.job), { size: 'row' }),
    title: `${esc(customerName(a))}<span class="sr-only">. Open the job</span>`, sub: lines, act: 'open-job',
  })}</div>
    ${kept ? keptLine(a, p) : ''}
  </section>`;

  let sum;
  if (p.kind === 'kept-deposit' || p.kind === 'no-show') {
    const noShow = p.kind === 'no-show';
    sum = `${moneyRows([
      { label: noShow ? 'No-show pay' : 'Deposit kept', cents: p.cents },
      { label: 'You take home', cents: p.cents, kind: 'total' },
    ])}
    <p class="t-small c-600 ${ID}__fine">${noShow ? 'No Taily fee on no-show pay.' : 'No Taily fee on a kept deposit.'}</p>`;
  } else {
    sum = `${tailorBreakdown(a.money)}
    ${a.courier?.cents > 0 ? `<p class="t-small c-600 ${ID}__fine">${esc(state.customer.first)} paid the courier. It isn’t part of your payout.</p>` : ''}`;
  }

  return `${head}<main class="body ${failed ? 'body--with-bar ' : ''}${ID}" data-appt="${esc(a.id)}">
  ${headingRow(hero, { backRow: true })}
  ${alert}
  ${job}
  <section class="sec" aria-labelledby="${ID}-sum">
    ${sectionHead('How it adds up', { id: `${ID}-sum` })}
    <div class="${ID}__sum">${sum}</div>
  </section>
</main>${failed ? actionBar({ ctaLabel: 'Fix bank details', ctaAct: 'fix-bank' }) : ''}`;
}

function wire(root) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    switch (el.dataset.act) {
      case 'open-job': { const d = detail(); if (d) { setFocus(d.appt.id); go('t-job'); } break; }
      case 'fix-bank': state.ui['to-payouts'] = { from: 'earnings' }; go('to-payouts'); break;
      case 'earnings': go('t-earnings'); break;
      default: break;
    }
  });
}

register(ID, view, wire);
