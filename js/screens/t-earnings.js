/* ============================================================
   t-earnings — T8 Earnings (M5-spec §C4, D-136). What lands in the
   bank on Friday and why. Focal: the next-payout figure (.t-display).
   Every amount is after the Taily fee and says so; dollars only, one
   precision on the whole screen (fmtExact — the figure is exact, so
   the rows are too). A failed payout is an error banner with the
   amount, the bank, the retry date and the fix. First load shows a
   skeleton (D-141).
   ============================================================ */
import { register, render as go, currentScreen, personaHome } from '../app.js';
import { state } from '../state.js';
import { myTailor, payoutsView } from '../tailor-data.js';
import { setFocus } from '../focus.js';
import { fmtExact } from '../money.js';
import { fmtDay } from '../dates.js';
import { withLatency } from '../sim.js';
import { chrome, headingRow, banner, emptyState, listRow, statusPill, skeleton, deltaFigure, esc } from '../components.js';

const ID = 't-earnings';
const ui = () => (state.ui[ID] ??= {});
let cancelLoad = null;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const bankOf = (b) => `${b?.bank ?? 'Your bank'} ••${b?.last4 ?? ''}`;
const money = (c) => `<span data-money>${fmtExact(c)}</span>`;

/** One job under a payout: customer, what it was, what she takes home. A button into t-payout. */
function jobRow(i) {
  return listRow({
    title: esc(i.title), sub: esc(i.sub), right: `<span class="${ID}__amt t-body w-600" data-money>${fmtExact(i.cents)}</span>`,
    act: 'open-payout', attrs: `data-id="${esc(i.apptId)}"`,
  });
}
const rowsOf = (items) => `<div class="${ID}__rows">${items.map(jobRow).join('')}</div>`;

function view() {
  const head = `${chrome('earnings', { persona: 'tailor' })}`;
  const title = headingRow('<h1 class="t-title">Earnings</h1>', { back: false });
  if (!ui().loaded) {
    return `${head}<main class="body ${ID}" aria-busy="true" data-s="${ID}--loading">
  ${title}
  <div class="${ID}__loading">${skeleton({ kind: 'payout', count: 2 })}</div>
</main>`;
  }

  const { next, failed, history } = payoutsView();
  const bank = bankOf(myTailor().payouts);

  if (!next && !failed && !history.length) {
    return `${head}<main class="body ${ID}">
  ${title}
  <div class="${ID}__empty" data-empty="earnings">${emptyState({
    title: 'No earnings yet',
    body: 'When you complete a job, its payout shows up here. Taily pays out every Friday.',
    ctaLabel: 'Go to Home', ctaAct: 'home',
  })}</div>
</main>`;
  }

  const failBanner = failed
    ? `<div class="${ID}__alert">${banner({
      tone: 'error', title: 'Your Friday payout didn’t go through',
      text: `${esc(bank)} sent back ${money(failed.cents)}. Update your bank details and we’ll send it again on ${fmtDay(failed.retryDate)}.`,
      actionLabel: 'Fix bank details', actionAct: 'fix-bank',
    })}</div>` : '';

  /* the next Friday: one figure, the jobs that add up to it */
  let nextCard = '';
  if (next) {
    const again = next.items.some((i) => i.retried);
    nextCard = `<section class="${ID}__next" aria-label="Next payout">
    ${deltaFigure({ label: 'Next payout', cents: next.cents, caption: failed ? `Sends ${fmtDay(next.date)} once your bank details are updated` : `${again ? 'Sending again' : 'Arrives'} ${fmtDay(next.date)} · to ${bank}` })}
    <p class="t-small c-600 ${ID}__after">${plural(next.items.length, 'job', 'jobs')} · after the Taily fee</p>
    ${rowsOf(next.items)}
  </section>`;
  } else if (!failed) {
    /* "Nothing scheduled" only when nothing is owed: a failed payout is the focal card instead (R5-1-T-03) */
    nextCard = `<section class="${ID}__next ${ID}__next--none" aria-label="Next payout">
    <p class="t-caps c-600">Next payout</p>
    <h2 class="t-h2">Nothing scheduled</h2>
    <p class="t-body c-600">Every Friday, Taily pays you for the jobs you completed before that day.</p>
  </section>`;
  }

  /* the money the bank sent back: with nothing else scheduled it is the focal card, directly under the banner */
  let sent = '';
  if (failed && !next) {
    sent = `<section class="${ID}__next ${ID}__next--failed" aria-label="Didn’t go through">
    ${deltaFigure({ label: 'Didn’t go through', cents: failed.cents, caption: `Sends ${fmtDay(failed.retryDate)} once your bank details are updated` })}
    <p class="t-small c-600 ${ID}__after">${plural(failed.items.length, 'job', 'jobs')} · after the Taily fee</p>
    ${rowsOf(failed.items)}
  </section>`;
  } else if (failed) {
    sent = `<h2 class="t-h2 ${ID}__h2">Didn’t go through</h2>
  <p class="t-small c-600 ${ID}__after">${plural(failed.items.length, 'job', 'jobs')} · ${money(failed.cents)} · after the Taily fee</p>
  ${rowsOf(failed.items)}`;
  }

  const paid = history.length ? `<h2 class="t-h2 ${ID}__h2">Paid</h2>
  ${history.map((g) => `<section class="${ID}__group" aria-label="Paid ${esc(fmtDay(g.date))}">
    <div class="${ID}__ghead">
      <div class="${ID}__gtext"><p class="t-body w-600">${esc(fmtDay(g.date))}</p><p class="t-small c-600">Paid to ${esc(bankOf(g))}</p></div>
      <div class="${ID}__gright"><span class="t-body w-600" data-money>${fmtExact(g.cents)}</span>${statusPill('completed', 'Paid')}</div>
    </div>
    ${rowsOf(g.items)}
  </section>`).join('')}` : '';

  return `${head}<main class="body ${ID}">
  ${title}
  ${failBanner}
  ${nextCard}
  ${sent}
  ${paid}
  <p class="t-small c-600 ${ID}__foot">Every amount is after the Taily fee. Taily pays out every Friday.</p>
</main>`;
}

function wire(root) {
  cancelLoad?.(); cancelLoad = null;
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    switch (el.dataset.act) {
      case 'open-payout': setFocus(el.dataset.id); go('t-payout'); break;
      case 'fix-bank': go('to-payouts'); break;
      case 'home': go(personaHome('tailor')); break;
      default: break;
    }
  });
  /* first load: ask the "server", then paint (instant under test, 'hold' never ends). Listeners go on first —
     an instant load re-renders this screen from inside this call. */
  if (!ui().loaded) {
    let sync = true;
    cancelLoad = withLatency(() => {
      if (!sync && currentScreen() !== ID) return;
      ui().loaded = true;
      go(ID, { replace: true });
    });
    sync = false;
  }
}

register(ID, view, wire);
