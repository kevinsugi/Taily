/* ============================================================
   t-payout — T8 one job's payout (M5-spec §C4, D-136/D-137). How one
   job became one payout, in dollars. Focal: the payout figure. The
   Taily fee sits under Services with what it was taken from; the
   courier is never Amara's money (D-04). Failed → the same banner as
   Earnings and a sticky "Fix bank details".
   ============================================================ */
import { register, render as go, back, personaHome } from '../app.js';
import { state } from '../state.js';
import { myTailor, payoutDetail, payoutsView, customerName } from '../tailor-data.js';
import { setFocus } from '../focus.js';
import { fmtExact } from '../money.js';
import { fmtDay, fmtWhen } from '../dates.js';
import {
  chrome, headingRow, banner, emptyState, statusPill, deltaFigure, moneyRows, tailorBreakdown, linkRow, actionBar, cta, esc,
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

/** B4 payout words: the pill and the one line under the figure. Paid / failed use the bank snapshotted on the payout. */
function words(p) {
  const bank = bankOf(p.state === 'pending' ? myTailor().payouts : { bank: p.bank ?? myTailor().payouts?.bank, last4: p.last4 ?? myTailor().payouts?.last4 });
  if (p.state === 'paid') return { pill: ['completed', 'Paid'], line: `Paid ${fmtDay(p.date)} · to ${bank}` };
  if (p.state === 'failed') return { pill: ['declined', 'Didn’t go through'], line: `${bank} sent it back` };
  /* R5-2-T-02: while a payout sits sent back, the same account can't be promised the next one */
  if (payoutsView().failed) return { pill: ['waiting', 'Scheduled'], line: `Sends ${fmtDay(p.date)} once your bank details are updated` };
  return { pill: ['waiting', 'Scheduled'], line: `${p.retried ? 'Sending again' : 'Arrives'} ${fmtDay(p.date)} · to ${bank}` };
}

function view() {
  const head = chrome('earnings', { persona: 'tailor' });
  const d = detail();
  if (!d) {
    return `${head}<main class="body ${ID}">
  ${headingRow('<h1 class="t-title">Payout</h1>', { backRow: true })}
  <div class="${ID}__empty" data-empty="payout">${emptyState({ title: 'No payout to show', body: 'Payouts show up here once you complete a job.', ctaLabel: 'Go to Earnings', ctaAct: 'earnings' })}</div>
</main>`;
  }
  const { payout: p, appt: a, view: v } = d;
  const w = words(p);
  const failed = p.state === 'failed';
  const hero = `<div class="${ID}__pill">${statusPill(...w.pill)}</div><h1 class="sr-only">Payout</h1>
  ${deltaFigure({ label: 'Your payout', cents: p.cents, caption: w.line })}`;

  /* R5-1-T-04: the pill and the caption already say "didn't go through"; the banner looks forward: what to do and when it sends */
  const alert = failed ? `<div class="${ID}__alert">${banner({
    tone: 'error', title: 'Update your bank details to get paid',
    text: `We’ll send <span data-money>${fmtExact(p.cents)}</span> again on ${fmtDay(payoutsView().failed?.retryDate ?? p.date)} after you save them.`,
  })}</div>` : '';   // the one "Fix bank details" is the sticky bar's

  const job = `<section class="${ID}__job" aria-label="The job">
    <p class="t-body w-600">${esc(customerName(a))}</p>
    <p class="t-small c-600">${esc(fmtWhen(a.slot.start))} · ${esc(v.visitLabel)}</p>
    <p class="t-small c-600">${plural(v.items, 'item', 'items')} · ${plural(v.serviceCount, 'service', 'services')}</p>
    ${linkRow('Open the job', { attrs: 'data-act="open-job"' })}
  </section>`;

  let sum;
  if (p.kind === 'kept-deposit' || p.kind === 'no-show') {
    const noShow = p.kind === 'no-show';
    sum = `${moneyRows([
      { label: noShow ? 'No-show pay' : 'Deposit kept', cents: p.cents, caption: noShow ? `${esc(state.customer.first)} didn’t show up` : `${esc(state.customer.first)} cancelled within 24 hours of the visit` },
      { label: 'Your payout', cents: p.cents, kind: 'total' },
    ])}
    <p class="t-small c-600 ${ID}__fine">${noShow ? 'No Taily fee on no-show pay.' : 'No Taily fee on a kept deposit.'}</p>`;
  } else {
    sum = `${tailorBreakdown(a.money, { feeAfterServices: true, feeCaption: `On the ${fmtExact(a.money.services)} of services only` })}
    ${a.courier?.cents > 0 ? `<p class="t-small c-600 ${ID}__fine">The courier was paid by ${esc(state.customer.first)}. It isn’t part of your payout.</p>` : ''}`;
  }

  return `${head}<main class="body ${failed ? 'body--with-bar ' : ''}${ID}" data-appt="${esc(a.id)}">
  ${headingRow(hero, { backRow: true })}
  ${alert}
  ${job}
  <h2 class="t-h2 ${ID}__h2">How it adds up</h2>
  <div class="${ID}__sum">${sum}</div>
</main>${failed ? actionBar({ ctaLabel: 'Fix bank details', ctaAct: 'fix-bank' }) : ''}`;
}

function wire(root) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    switch (el.dataset.act) {
      case 'open-job': { const d = detail(); if (d) { setFocus(d.appt.id); go('t-job'); } break; }
      case 'fix-bank': go('to-payouts'); break;
      case 'earnings': go('t-earnings'); break;
      default: break;
    }
  });
}

register(ID, view, wire);
