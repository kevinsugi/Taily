/* ============================================================
   t-earnings — T8 Earnings (M5-spec §C4, D-136). What lands in the
   bank on Friday and why. Focal: the next-payout figure (.t-money).
   Every amount is after the Taily fee and says so; dollars only, one
   precision on the whole screen (fmtExact — the figure is exact, so
   the rows are too). A failed payout is an error banner with the
   amount, the bank, the retry date and the fix. First load shows a
   skeleton (D-141).
   ============================================================ */
import { register, render as go, currentScreen, personaHome } from '../app.js';
import { state, getAppt } from '../state.js';
import { myTailor, payoutsView } from '../tailor-data.js';
import { setFocus } from '../focus.js';
import { fmtExact } from '../money.js';
import { fmtDay } from '../dates.js';
import { withLatency } from '../sim.js';
import { chrome, headingRow, banner, emptyState, listRow, skeleton, cta, esc, sectionHead, infoButton, garmentIcon, heroGarment } from '../components.js';

const ID = 't-earnings';
const ui = () => (state.ui[ID] ??= {});
let cancelLoad = null;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const bankOf = (b) => `${b?.bank ?? 'Your bank'} •••• ${b?.last4 ?? ''}`;
const money = (c) => `<span data-money>${fmtExact(c)}</span>`;
/** D-172, M6-P-01: a kept deposit or no-show pay has no Taily fee, so a list of only those says so instead of "after the Taily fee". */
const feeNote = (items) => (items.length && items.every((i) => i.kind !== 'job') ? 'no Taily fee' : 'after the Taily fee');

/** "Suit Pant, Suit Jacket · Sat, Oct 17" → two lines (K-03 #5: line breaks, not dots), so a date never wraps mid-way. */
const subLines = (sub = '') => String(sub).split(' · ').map((x) => `<span class="${ID}__subline">${esc(x)}</span>`).join('');
/** One job under a payout: customer, what it was, what she takes home. A button into t-payout. */
function jobRow(i, { tag = '' } = {}) {
  const type = heroGarment(getAppt(i.apptId)?.job);
  return listRow({
    lead: garmentIcon(type, { size: 'row' }),   // the same 32 px well as t-payout's job card
    title: `${esc(i.title)}${tag ? ` <span class="${ID}__tag t-micro">${esc(tag)}</span>` : ''}`, sub: subLines(i.sub), right: `<span class="${ID}__amt t-body w-600" data-money>${fmtExact(i.cents)}</span>`,
    act: 'open-payout', attrs: `data-id="${esc(i.apptId)}"`,
  });
}
/** The tappable payout rows: one .card.card--list (the only white on the page). */
const listOf = (rows) => `<div class="card card--list ${ID}__rows">${rows}</div>`;
const rowsOf = (items, tag = '') => listOf(items.map((i) => jobRow(i, { tag })).join(''));
/** The flat hero: caps label (+ ⓘ), the display figure, a caption. */
const hero = ({ label, cents, caption = '', info = false }) => `<div class="${ID}__hero" data-money>
    <div class="${ID}__label"><p class="t-caps c-600">${esc(label)}</p>${info ? infoButton('payouts', { label: 'When you get paid' }) : ''}</div>
    <p class="t-money ${ID}__amt-hero">${fmtExact(cents)}</p>
    ${caption ? `<p class="t-small c-600">${esc(caption)}</p>` : ''}
  </div>`;

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
    art: 'Accessories', ctaLabel: 'Go to Home', ctaAct: 'home',
  })}</div>
</main>`;
  }

  /* M6-T-18: sent back AND another job scheduled = one card below (it carries the Fix button), so the banner is only its title;
     sent back alone keeps the sentence and the button */
  const merged = !!(failed && next);
  const failBanner = failed
    ? `<div class="hero ${ID}__alert">${banner(merged
      ? { tone: 'error', title: 'Your Friday payout didn’t go through' }
      : {
        tone: 'error', title: 'Your Friday payout didn’t go through',
        text: `${esc(bank)} returned ${money(failed.cents)}. Update your bank details to get paid.`,
        actionLabel: 'Fix bank details', actionAct: 'fix-bank',
      })}</div>` : '';

  /* the next Friday: one figure, the jobs that add up to it */
  let nextCard = '';
  if (merged) {
    const all = [...failed.items, ...next.items];
    const day = next.date > failed.retryDate ? next.date : failed.retryDate;
    nextCard = `<section class="sec sec--first ${ID}__next ${ID}__next--merged" aria-label="Next payout">
    <p class="t-caps c-600">Next payout</p>
    <p class="t-figure ${ID}__merged" data-money>${fmtDay(day)} · ${fmtExact(failed.cents + next.cents)} once you update your bank details</p>
    <p class="t-small c-600 ${ID}__after">${plural(all.length, 'job', 'jobs')} · ${feeNote(all)}</p>
    ${listOf(`${failed.items.map((i) => jobRow(i, { tag: 'Returned' })).join('')}${next.items.map((i) => jobRow(i)).join('')}`)}
    <div class="${ID}__fix">${cta('Fix bank details', { attrs: 'data-act="fix-bank"' })}</div>
  </section>`;
  } else if (next) {
    const again = next.items.some((i) => i.retried);
    nextCard = `<section class="sec sec--first ${ID}__next" aria-label="Next payout">
    ${hero({ label: 'Next payout', cents: next.cents, info: true, caption: failed ? `Sends ${fmtDay(next.date)} once you update your bank details` : `${again ? 'Sending again' : 'Arrives'} ${fmtDay(next.date)} · to ${bank}` })}
    <p class="t-small c-600 ${ID}__after">${plural(next.items.length, 'job', 'jobs')} · ${feeNote(next.items)}</p>
    ${rowsOf(next.items)}
  </section>`;
  } else if (!failed) {
    /* "Nothing scheduled" only when nothing is owed: a failed payout is the focal card instead (R5-1-T-03) */
    nextCard = `<section class="sec sec--first ${ID}__next ${ID}__next--none" aria-label="Next payout">
    <div class="${ID}__label"><p class="t-caps c-600">Next payout</p>${infoButton('payouts', { label: 'When you get paid' })}</div>
    <p class="t-figure">Nothing scheduled</p>
    <p class="t-body c-600">Every Friday, Taily pays you for the jobs you completed before that day.</p>
  </section>`;
  }

  /* the money the bank sent back: with nothing else scheduled it is the focal card, directly under the banner */
  let sent = '';
  if (failed && !next) {
    sent = `<section class="sec sec--first ${ID}__next ${ID}__next--failed" aria-label="Didn’t go through">
    ${hero({ label: 'Didn’t go through', cents: failed.cents, caption: `Sends ${fmtDay(failed.retryDate)} once you update your bank details` })}
    <p class="t-small c-600 ${ID}__after">${plural(failed.items.length, 'job', 'jobs')} · ${feeNote(failed.items)}</p>
    ${rowsOf(failed.items)}
  </section>`;
  }

  const paid = history.length ? `<section class="sec" aria-labelledby="${ID}-paid">
  ${sectionHead('Paid', { id: `${ID}-paid` })}
  ${history.map((g) => `<div class="${ID}__group" aria-label="Paid ${esc(fmtDay(g.date))}">
    <div class="${ID}__ghead">
      <div class="${ID}__gtext"><p class="t-body w-600">${esc(fmtDay(g.date))}</p><p class="t-small c-600">Paid to ${esc(bankOf(g))}</p></div>
      ${g.items.length >= 2 ? `<div class="${ID}__gright"><span class="t-body w-600" data-money>${fmtExact(g.cents)}</span></div>` : ''}
    </div>
    ${rowsOf(g.items)}
  </div>`).join('')}
</section>` : '';

  return `${head}<main class="body ${ID}">
  ${title}
  ${failBanner}
  ${nextCard}
  ${sent}
  ${paid}
</main>`;
}

function wire(root) {
  cancelLoad?.(); cancelLoad = null;
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    switch (el.dataset.act) {
      case 'open-payout': setFocus(el.dataset.id); go('t-payout'); break;
      case 'fix-bank': state.ui['to-payouts'] = { from: 'earnings' }; go('to-payouts'); break;
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
