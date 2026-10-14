/* ============================================================
   t-home — T1 Inbox (M3-spec §C1). What needs an answer now, then
   what is coming up. Focal: the first request card's take-home
   figure (the only .t-h2 money on the page). A card has no Accept
   of its own (D-75): the decision is one tap on t-request.
   Push denied (D-85): a warning banner; "Open Settings" turns
   notifications on in the prototype.
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, T, now, justConfirmed } from '../state.js';
import { myTailor, inbox, requestView, customerName, customerInitials } from '../tailor-data.js';
import { setFocus } from '../focus.js';
import { fmtColumn } from '../money.js';
import { fmtWhen, fmtTime, toDate } from '../dates.js';
import { POLICY } from '../money-config.js';
import {
  chrome, headingRow, banner, emptyState, requestCard, apptRow, toast, esc,
} from '../components.js';

const ID = 't-home';
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const firstOf = (t) => (t?.name || 'there').split(' ')[0];
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const dateLine = () => { const d = toDate(now()); return `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`.toUpperCase(); };

/** The row's pill: "Accepted" for the first hour (D-73, B2), then "Confirmed"; later statuses keep their own pill. */
function pillOf(a) {
  if (a.status === 'confirmed') return { status: 'confirmed', label: justConfirmed(a) ? 'Accepted' : 'Confirmed' };
  return { status: a.status, label: undefined };
}

/** "145 N 7th St, 2R, Brooklyn, NY 11211" → "145 N 7th St, 2R" (the list row is one line, R3-1-T-08); neighborhood forms pass through. */
const shortPlace = (p) => { const parts = p.split(', '); return parts.length > 2 ? parts.slice(0, -2).join(', ') : p; };

function view(s) {
  const t = myTailor();
  const { requests, upcoming } = inbox();
  const first = firstOf(t);
  const head = `${chrome('home', { persona: 'tailor' })}`;
  const hello = headingRow(`<p class="t-caps c-600 ${ID}__date">${dateLine()}</p><h1 class="t-title">Hi, ${esc(first)}</h1>`, { back: false });

  if (!requests.length && !upcoming.length) {
    return `${head}<main class="body ${ID}">
  ${hello}
  <p class="t-small c-600 ${ID}__sum">No new requests</p>
  ${s.sim.push === 'denied' ? `<div class="${ID}__push">${pushBanner()}</div>` : ''}
  <div class="${ID}__empty" data-empty="home">${emptyState({
    title: 'No requests yet',
    body: `When a customer books you, the request shows up here. You’ll have ${POLICY.REQUEST_EXPIRY_H} hours to answer each one.`,
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

  const sameDay = (x, y) => x.slice(0, 10) === y.slice(0, 10);
  const card = (a) => {
    const v = requestView(a);
    const sug = a.status === 'suggested' && a.suggested;
    return requestCard({
      id: a.id, name: v.customer.name, initials: v.customer.initials, visitLabel: v.visitLabel, place: v.place,
      when: sug ? v.suggested : v.when,
      asked: sug ? `${s.customer.first} asked for ${sameDay(a.slot.start, a.suggested.start) ? fmtTime(a.slot.start) : v.when}` : '',
      items: v.items, services: v.serviceCount, payoutCents: v.payout, feeCents: v.tailyFee,
      expiresAt: a.expiresAt, now: now(), status: a.status, waitingOn: s.customer.first, retries: a.retries,
    });
  };
  const cards = fresh.map(card).join('');
  const waitCards = waiting.map(card).join('');

  const money = fmtColumn(upcoming.map((a) => a.money.payout));
  const rows = upcoming.map((a) => {
    const p = pillOf(a);
    return apptRow({
      id: a.id, name: customerName(a), initials: customerInitials(), when: fmtWhen(a.slot.start), place: shortPlace(requestView(a).place),
      status: p.status, pillLabel: p.label, amountText: money(a.money.payout), amountCaption: 'You take home',
    });
  }).join('');

  return `${head}<main class="body ${ID}">
  ${hello}
  <p class="t-small c-600 ${ID}__sum">${summary.join(' · ')}</p>
  ${s.sim.push === 'denied' ? `<div class="${ID}__push">${pushBanner()}</div>` : ''}
  <div class="${ID}__head"><h2 class="t-h2">New requests</h2>${fresh.length ? `<span class="t-small c-600">${fresh.length}</span>` : ''}</div>
  ${fresh.length
    ? `<div class="${ID}__list">${cards}</div>`
    : `<p class="t-body c-600 ${ID}__none">No new requests right now. You’ll get a notification when one comes in.</p>`}
  ${waiting.length ? `<div class="${ID}__head ${ID}__head--up"><h2 class="t-h2">Waiting on ${esc(s.customer.first)}</h2><span class="t-small c-600">${waiting.length}</span></div>
  <div class="${ID}__list">${waitCards}</div>` : ''}
  <div class="${ID}__head ${ID}__head--up"><h2 class="t-h2">Upcoming</h2>${upcoming.length ? `<span class="t-small c-600">${upcoming.length}</span>` : ''}</div>
  ${upcoming.length ? `<div class="${ID}__list">${rows}</div>` : `<p class="t-body c-600 ${ID}__none">Nothing booked yet.</p>`}
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
    else if (act === 'hours') { delete state.ui['to-availability']; go('to-availability'); }   // edit mode: a fresh draft from the saved week
    else if (act === 'push-settings') {
      state.sim.push = 'granted';                 // prototype stand-in for the OS toggle (D-85)
      go(ID);
      toast('Notifications are on');
    }
  });
}

register(ID, view, wire);
