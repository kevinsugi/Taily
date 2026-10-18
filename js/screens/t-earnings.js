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
import { state, getAppt, now } from '../state.js';
import { myTailor, payoutsView, inFlightView } from '../tailor-data.js';
import { setFocus, statusWord } from '../focus.js';
import { fmtExact } from '../money.js';
import { fmtDay } from '../dates.js';
import { withLatency } from '../sim.js';
import { chrome, headingRow, banner, emptyState, listRow, skeleton, cta, esc, sectionHead, infoButton, garmentIcon, heroGarment, statusPill } from '../components.js';

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

/* ---------- DG-4, option B's Earnings mirror (D-355): payouts paused by the payments partner, and the Tax documents area ---------- */
const pausedNow = (t) => ['paused', 'action-needed'].includes(t.payouts?.status);
/** "Payouts are paused" — what the partner needs, the amount waiting, and the way to fix it. */
function pausedBanner(t, waiting) {
  const p = t.payouts ?? {};
  if (!pausedNow(t)) return '';
  const owed = waiting ? ` Your <span data-money>${fmtExact(waiting)}</span> goes out once it’s done.` : '';
  return `<div class="hero ${ID}__alert">${p.status === 'paused'
    ? banner({ tone: 'warning', title: 'Payouts are paused', text: `Our payments partner needs you to confirm your tax info (W-9).${owed}`, actionLabel: 'Confirm tax info', actionAct: 'fix-payouts' })
    : banner({ tone: 'error', title: 'Payouts are paused', text: `Our payments partner couldn’t verify your identity.${owed}`, actionLabel: 'Fix it', actionAct: 'fix-payouts' })}</div>`;
}
/** Tax documents: the W-9 the partner holds, and the year's 1099-K (PROTOTYPE placeholder: the partner files and delivers it). */
function taxDocs(t) {
  const p = t.payouts ?? {};
  const year = new Date(now()).getFullYear();
  const w9 = p.tax === 'needs-info'
    ? listRow({ title: 'Tax info (W-9)', sub: `Confirm by ${esc(fmtDay(p.issueDue))}`, right: statusPill('check-needs'), act: 'fix-payouts' })
    : listRow({ title: 'Tax info (W-9)', sub: p.taxAt ? `Received ${esc(fmtDay(p.taxAt))}` : 'You give it during payout setup', right: p.taxAt ? statusPill('check-verified', 'Done') : statusPill('check-todo') });
  const form = listRow({ title: `${year} tax form (1099-K)`, sub: `Ready by Jan 31, ${year + 1}` });
  return `<section class="sec ${ID}__tax" aria-labelledby="${ID}-tax">
  ${sectionHead('Tax documents', { id: `${ID}-tax` })}
  <div class="card card--list">${w9}${form}</div>
</section>`;
}

/** B-07 (pre-MVP sweep, D-441): the jobs she is working on — not paid yet, so they are not in a payout; each opens its job. */
function onTheWay() {
  const v = inFlightView();
  if (!v) return '';
  const rows = v.items.map((i) => {
    const a = getAppt(i.apptId);
    return listRow({
      lead: garmentIcon(heroGarment(a?.job), { size: 'row' }),
      title: esc(i.title), sub: subLines(`${statusWord(a, 'tailor').label}${i.types ? ` · ${i.types}` : ''}`),
      right: `<span class="${ID}__amt t-body w-600" data-money>${fmtExact(i.cents)}</span>`,
      act: 'open-job', attrs: `data-id="${esc(i.apptId)}"`,
    });
  }).join('');
  return `<section class="sec ${ID}__flight" aria-labelledby="${ID}-flight">
  ${sectionHead('On the way', { id: `${ID}-flight` })}
  <p class="t-small c-600 ${ID}__after">${plural(v.items.length, 'job', 'jobs')} · <span data-money>${fmtExact(v.cents)}</span> after the Taily fee, so far. Each is paid the Friday after it’s complete.</p>
  ${listOf(rows)}
</section>`;
}

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

  const t = myTailor();
  if (!next && !failed && !history.length) {
    return `${head}<main class="body ${ID}">
  ${title}
  <div class="${ID}__empty" data-empty="earnings">${emptyState({
    title: 'No earnings yet',
    body: 'When you complete a job, its payout shows up here. Taily pays out every Friday.',
    art: 'Accessories', ctaLabel: 'Back to Home', ctaAct: 'home',
  })}</div>
  ${onTheWay()}
  ${taxDocs(t)}
</main>`;
  }
  const paused = pausedNow(t);

  /* M6-T-18: sent back AND another job scheduled = one card below (it carries the Fix button), so the banner is only its title;
     sent back alone keeps the sentence and the button */
  const merged = !!(failed && next);
  const failBanner = failed
    ? `<div class="hero ${ID}__alert">${banner(merged
      ? { tone: 'error', title: 'Your Friday payout didn’t go through' }
      : {
        tone: 'error', title: 'Your Friday payout didn’t go through',
        text: `${esc(bank)} returned it. Update your bank details to get paid.`,   // K-17 #7: the amount is the figure below, once
        actionLabel: 'Update bank details', actionAct: 'fix-bank',
      })}</div>` : '';

  /* the next Friday: one figure, the jobs that add up to it */
  let nextCard = '';
  if (merged) {
    const all = [...failed.items, ...next.items];
    const day = next.date > failed.retryDate ? next.date : failed.retryDate;
    nextCard = `<section class="sec sec--first ${ID}__next ${ID}__next--merged" aria-label="Next payout">
    ${hero({ label: 'Next payout', cents: failed.cents + next.cents, caption: `Sends ${fmtDay(day)} once you update your bank details` })}
    <p class="t-small c-600 ${ID}__after">${plural(all.length, 'job', 'jobs')} · ${feeNote(all)}</p>
    ${listOf(`${failed.items.map((i) => jobRow(i, { tag: 'Returned' })).join('')}${next.items.map((i) => jobRow(i)).join('')}`)}
    <div class="${ID}__fix">${cta('Update bank details', { attrs: 'data-act="fix-bank"' })}</div>
  </section>`;
  } else if (next) {
    const again = next.items.some((i) => i.retried);
    nextCard = `<section class="sec sec--first ${ID}__next" aria-label="Next payout">
    ${hero({ label: 'Next payout', cents: next.cents, info: true, caption: paused ? (t.payouts.status === 'paused' ? 'Paused until your tax info is in' : 'Paused until your identity is verified') : failed ? `Sends ${fmtDay(next.date)} once you update your bank details` : `${again ? 'Sending again' : 'Arrives'} ${fmtDay(next.date)} · to ${bank}` })}
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
  if (failed && !next) {   // K-17 #7: the banner says it didn't go through; the figure is a plain payout figure with one meta line
    sent = `<section class="sec sec--first ${ID}__next ${ID}__next--failed" aria-label="Didn’t go through">
    ${hero({ label: 'Next payout', cents: failed.cents, caption: `Sends ${fmtDay(failed.retryDate)} once you update your bank details` })}
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
  ${pausedBanner(t, next?.cents ?? 0)}
  ${failBanner}
  ${nextCard}
  ${sent}
  ${onTheWay()}
  ${paid}
  ${taxDocs(t)}
</main>`;
}

function wire(root) {
  cancelLoad?.(); cancelLoad = null;
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    switch (el.dataset.act) {
      case 'open-payout': setFocus(el.dataset.id); go('t-payout'); break;
      case 'open-job': setFocus(el.dataset.id); go('t-job'); break;   // B-07: a job on the way
      case 'fix-bank': case 'fix-payouts': state.ui['to-payouts'] = { from: 'earnings' }; go('to-payouts'); break;
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
