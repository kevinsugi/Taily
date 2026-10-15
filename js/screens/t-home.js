/* ============================================================
   t-home — T1 Inbox (M3-spec §C1). What needs an answer now, then
   what is coming up. Focal: the first request card's take-home
   figure (the only .t-money money on the page). A card has no Accept
   of its own (D-75): the decision is one tap on t-request.
   Push denied (D-85): a warning banner; "Open Settings" turns
   notifications on in the prototype.
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, T, now, apptsFor, priceChangeView, suggestLapseAt } from '../state.js';
import { myTailor, inbox, requestView, customerName, customerInitials, payoutOf, payoutLine, suggestPrice } from '../tailor-data.js';
import { setFocus, statusWord, returnStep } from '../focus.js';
import { fmtColumn } from '../money.js';
import { fmtWhen, fmtTime, fmtDay, toDate } from '../dates.js';
import { POLICY } from '../money-config.js';
import {
  chrome, headingRow, banner, emptyState, requestCard, apptRow, toast, esc, sectionHead, textLink,
  heroGarment,
} from '../components.js';
import { openPushPrompt } from '../system.js';

const ID = 't-home';
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const firstOf = (t) => (t?.name || 'there').split(' ')[0];
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const dateLine = () => { const d = toDate(now()); return `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`; };   // CR-m3: folded into the summary line, no kicker

/** The row's pill: the §B2 word for every status (M4, D-108) — always "Confirmed" (K-04 CR-6d; D-73 is only about the just-booked banner). */
function pillOf(a) {
  const w = statusWord(a, 'tailor', { short: true });
  return { status: w.pill, label: w.label };
}

/** "145 N 7th St, 2R, Brooklyn, NY 11211" → "145 N 7th St, 2R" (the list row is one line, R3-1-T-08); neighborhood forms pass through. */
const shortPlace = (p) => { const parts = p.split(', '); return parts.length > 2 ? parts.slice(0, -2).join(', ') : p; };

/** Where a job past its visit stands, as the row's time line (R4-1-T-06, D-113, D-169): the step, and when it is due. The visit
    itself is behind her, so the line leads with the need-by date. A returning order names how it goes back (D-106). */
const STEP = { fitting: 'Started', 'price-change': 'Order sent', 'in-progress': 'Tailoring', ready: 'Ready' };
const stepOf = (a) => (a.status === 'returning' ? returnStep(a, 'tailor') : STEP[a.status]);
/* K-17 (D-243, #9): an "In progress" row's pill already says it (and so does its section), so its line is only the due date — one line, no "Tailoring ·" */
const sinceLine = (a) => (a.status === 'in-progress' ? `Needed by ${fmtDay(a.job.needBy)}` : `${stepOf(a)} · needed by ${fmtDay(a.job.needBy)}`);
/** Confirmed and not started = Upcoming; the visit itself and everything after = In progress. */
const started = (a) => a.status !== 'confirmed' || now() >= toDate(a.slot.start).getTime();

function view(s) {
  const t = myTailor();
  const { requests, upcoming: booked } = inbox();
  const upcoming = booked.filter((a) => !started(a));
  const progress = booked.filter(started).sort((a, b) => toDate(a.job.needBy) - toDate(b.job.needBy) || toDate(a.slot.start) - toDate(b.slot.start));   // D-169: soonest due first
  const recent = apptsFor('tailor').filter((a) => a.status === 'completed')
    .sort((a, b) => toDate(b.history[b.history.length - 1].at) - toDate(a.history[a.history.length - 1].at)).slice(0, 1);
  const first = firstOf(t);
  const head = `${chrome('home', { persona: 'tailor' })}`;
  const hello = headingRow(`<h1 class="t-title">Hi, ${esc(first)}</h1>`, { back: false });
  /* D-161: the shop is paused — one line with the way back on */
  const paused = t.takingRequests === false
    ? `<p class="t-small c-600 hero ${ID}__sum ${ID}__paused">You’re paused, so customers can’t send new requests. ${textLink('Take requests again', { act: 'resume' })}</p>` : '';

  if (!apptsFor('tailor').length) {
    return `${head}<main class="body ${ID}">
  ${hello}
  ${paused}
  ${s.sim.push === 'denied' ? `<div class="hero ${ID}__push">${pushBanner()}</div>` : ''}
  <div class="${ID}__empty" data-empty="home">${emptyState({
    title: 'No requests yet',
    body: `When a customer books you, the request shows up here. You’ll have ${POLICY.REQUEST_EXPIRY_H} hours to answer each one.`,
    art: 'Suit Jacket',
    ctaLabel: 'Check your hours', ctaAct: 'hours',
  })}</div>
</main>`;
  }

  /* a request waiting on Sarah needs no answer: counted and listed apart from the new ones (R3-1-T-03) */
  const fresh = requests.filter((a) => a.status !== 'suggested');
  const waiting = requests.filter((a) => a.status === 'suggested');
  const summary = [fresh.length ? plural(fresh.length, 'new request', 'new requests') : 'No new requests'];
  if (waiting.length) summary.push(`${waiting.length} waiting on ${s.customer.first}`);
  if (upcoming.length) summary.push(plural(upcoming.length, 'upcoming visit', 'upcoming visits'));
  if (progress.length) summary.push(plural(progress.length, 'job in progress', 'jobs in progress'));

  const sameDay = (x, y) => x.slice(0, 10) === y.slice(0, 10);
  const card = (a) => {
    const v = requestView(a);
    const sug = a.status === 'suggested' && a.suggested;
    return requestCard({
      id: a.id, name: v.customer.name, initials: v.customer.initials, visitLabel: v.visitLabel, place: v.place,
      when: sug ? v.suggested : v.when,
      asked: sug ? `${s.customer.first} asked for ${sameDay(a.slot.start, a.suggested.start) ? fmtTime(a.slot.start) : v.when}` : '',
      items: v.items, services: v.serviceCount, payoutCents: sug ? suggestPrice(a, a.suggested.start).payout : v.payout, feeCents: v.tailyFee,   // D-155: a suggested time never raises the rush
      expiresAt: a.expiresAt, now: now(), status: a.status, waitingOn: s.customer.first, retries: a.retries,
      garment: heroGarment(v),   // M7-2-C-05: a broad silhouette reads at 32 px (the suggested card)
      garments: v.garments.map((g) => g.type),   // K-12: the requested card draws every garment
      lapseAt: sug ? suggestLapseAt(a) : null,   // D-154: her suggested time stays open until then
    });
  };
  const cards = fresh.map(card).join('');
  const waitCards = waiting.map(card).join('');

  /* D-117: a price change waiting on Sarah shows the take-home t-job leads with, captioned as conditional */
  const pending = (a) => a.status === 'price-change' && a.priceChange && a.priceChange.state !== 'approved';
  const takeHome = (a) => (pending(a) ? priceChangeView(a).after.payout : a.money.payout);
  const money = fmtColumn(booked.map(takeHome));
  const rowsOf = (list) => list.map((a) => {
    const p = pillOf(a);
    const post = a.status !== 'confirmed';
    return apptRow({
      id: a.id, name: customerName(a), initials: customerInitials(), when: post ? sinceLine(a) : fmtWhen(a.slot.start), place: shortPlace(requestView(a).place),
      status: p.status, pillLabel: p.label, amountText: money(takeHome(a)), amountCaption: pending(a) ? `If ${s.customer.first} approves` : 'Your payout',
    });
  }).join('');
  const rows = rowsOf(upcoming);
  const progressRows = rowsOf(progress);
  const recentRows = recent.map((a) => {
    const po = payoutOf(a);
    const w = statusWord(a, 'tailor', { short: true });
    return apptRow({
      id: a.id, name: customerName(a), initials: customerInitials(), when: `Completed ${fmtDay(a.history[a.history.length - 1].at)}`, place: shortPlace(requestView(a).place),
      status: w.pill, pillLabel: w.label, amountText: fmtColumn([a.money.payout])(a.money.payout),
      amountCaption: po ? payoutLine(po).short : 'Payout pending', captionTone: po?.state === 'failed' ? 'error' : 'default', muted: true,
    });
  }).join('');

  const group = (title, id, count, inner) => `<section class="sec" aria-labelledby="${ID}-${id}">
    ${sectionHead(title, { id: `${ID}-${id}`, count })}
    ${inner}
  </section>`;
  return `${head}<main class="body ${ID}">
  ${hello}
  ${paused}
  <p class="t-small c-600 hero ${ID}__sum">${dateLine()} · ${summary.join(', ')}</p>
  ${s.sim.push === 'denied' ? `<div class="hero ${ID}__push">${pushBanner()}</div>` : ''}
  ${group('New requests', 'new', fresh.length || null, fresh.length
    ? `<div class="${ID}__list">${cards}</div>`
    : `<p class="t-body c-600 ${ID}__none">No new requests right now.</p>`)}
  ${waiting.length ? group(`Waiting on ${esc(s.customer.first)}`, 'waiting', waiting.length, `<div class="${ID}__list">${waitCards}</div>`) : ''}
  ${upcoming.length || !progress.length ? group('Upcoming', 'upcoming', upcoming.length || null,
    upcoming.length ? `<div class="${ID}__list">${rows}</div>` : `<p class="t-body c-600 ${ID}__none">${apptsFor('tailor').length ? 'Nothing upcoming.' : 'Nothing booked yet.'}</p>`) : ''}
  ${progress.length ? group('In progress', 'progress', progress.length, `<div class="${ID}__list">${progressRows}</div>`) : ''}
  ${recent.length ? group('Recent', 'recent', null, `<div class="${ID}__list">${recentRows}</div>`) : ''}
</main>`;
}

function pushBanner() {
  return banner({
    tone: 'warning', title: 'Notifications are off',
    text: `Requests expire after ${POLICY.REQUEST_EXPIRY_H} hours. Turn on notifications so you don’t miss one.`,
    actionLabel: 'Open Settings', actionAct: 'push-settings',
  });
}

function wire(root) {
  /* a request whose reply window passed while she was away is expired now (the card would say so) */
  if (T.tick().length) { go(ID); return; }
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (act === 'open-request') { setFocus(el.dataset.id); go('t-request'); }
    else if (act === 'open-appt') { setFocus(el.dataset.id); go('t-job'); }
    else if (act === 'resume') {
      T.setTakingRequests(true);
      go(ID);
      toast('You’re taking requests again', { tone: 'success' });
    } else if (act === 'hours') { delete state.ui['to-availability']; go('to-availability'); }   // edit mode: a fresh draft from the saved week
    else if (act === 'push-settings') {
      state.sim.push = 'granted';                 // prototype stand-in for the OS toggle (D-85)
      go(ID);
      toast('Notifications are on');
    }
  });
  /* D-139: the soft ask, at the moment of value. "Not now" leaves the denied banner above (D-85). */
  if (state.sim.push === 'prompt') {
    openPushPrompt({
      title: 'Don’t miss a request',
      body: `Requests expire after ${POLICY.REQUEST_EXPIRY_H} hours. Turn on notifications and we’ll tell you the moment one comes in.`,
    }, { onDone: () => go(ID, { replace: true }) });
  }
}

register(ID, view, wire);
