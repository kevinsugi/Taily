/* ============================================================
   t-home — T1 Inbox (M3-spec §C1). What needs an answer now, then
   what is coming up. Focal: the first request card's take-home
   figure (the only .t-money money on the page). A card has no Accept
   of its own (D-75): the decision is one tap on t-request.
   K-43 (D-301): notifications are text messages to her verified
   phone — no push, so no "notifications off" banner and no ask.
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, T, now, apptsFor, priceChangeView, suggestLapseAt, autoCompleteLeft, jobEditView, slotText, handoffMissed, courierWindow, noticesFor, textsOn, overdue, listed, onboarded, verifyView, nextSection } from '../state.js';
import { myTailor, inbox, requestView, customerName, customerInitials, payoutOf, payoutLine, suggestPrice } from '../tailor-data.js';
import { setFocus, statusWord, returnStep } from '../focus.js';
import { fmtColumn, fmtExact } from '../money.js';
import { fmtWhen, fmtTime, fmtDay, fmtTimeRange, toDate, dayDiff, dayWord } from '../dates.js';
import { POLICY } from '../money-config.js';
import {
  chrome, headingRow, emptyState, requestCard, apptRow, toast, esc, sectionHead, textLink,
  heroGarment, reminderCard, banner, ONBOARDING_STEPS, REVIEW_TIME,
} from '../components.js';

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
    itself is behind her, so the line leads with the need-by date. An awaiting-handoff order names how it goes back (D-106). */
const STEP = { fitting: 'Started', 'price-change': 'Order sent', 'in-progress': 'Tailoring', ready: 'Ready' };
const stepOf = (a) => (a.status === 'awaiting-handoff' ? returnStep(a, 'tailor') : STEP[a.status]);
/** Study-1 A3: a handoff she marked counts down; a reported problem says so (the need-by date no longer matters once it is handed over). */
function handoffLine(a) {
  const h = a.handoff ?? {};
  if (a.payments?.balance?.state === 'capture-failed') return `Payment issue on ${state.customer.first}’s side · your payout is waiting`;   // D-04
  if (h.trip?.state === 'returned') return `The courier is bringing it back · ${state.customer.first} picks a new window`;              // S-35
  if (h.trip?.state === 'out') return 'With the courier · out for delivery';
  if (h.problemAt) return `${state.customer.first} didn’t get it · sort it out in chat`;
  if (handoffMissed(a)) return `${state.customer.first} missed her ${fmtTime(h.slot.start)} pickup`;   // SF-12
  const left = autoCompleteLeft(a);
  if (left != null) return `Picked up · completes in ${left <= 3600000 ? 'less than 1h' : `${Math.floor((left - 1) / 3600000)}h`}`;   // the same count as autoCompleteLine
  return null;
}
/* K-17 (D-243, #9): an "In progress" row's pill already says it (and so does its section), so its line is only the due date — one line, no "Tailoring ·" */
const sinceLine = (a) => (a.status === 'in-progress' ? (a.edit?.state === 'pending' ? `Changes sent · needed by ${fmtDay(a.job.needBy)}` : overdue(a) ? `Overdue · due ${fmtDay(a.job.needBy)}` : `Needed by ${fmtDay(a.job.needBy)}`) : handoffLine(a) ?? `${stepOf(a)} · needed by ${fmtDay(a.job.needBy)}`);   // B-07: overdue
/* ---------- DG-2 A (pre-MVP A1): a visit Sarah (or Taily) cancelled close to the time never just vanishes — a one-time notice ---------- */
function noticeCard(a) {
  const sarah = state.customer.first;
  const dep = fmtExact(a.payments.deposit.cents);
  const day = dayWord(a.slot.start, now());
  const ref = day === 'today' || day === 'tomorrow' ? `${day}’s ${fmtTime(a.slot.start)} visit` : `the ${fmtWhen(a.slot.start)} visit`;
  const p = payoutOf(a);
  const paid = p ? ` It comes with your payout on ${fmtDay(p.date)}.` : '';
  const cfg = {
    'customer-late': { title: `${sarah} cancelled ${ref}`, text: `She cancelled less than ${POLICY.CANCEL_WINDOW_H} hours before, so you keep her ${dep} deposit.${paid}` },   // K-53: confirming no longer makes a cancel late
    'customer-early': { title: `${sarah} cancelled ${ref}`, text: `She cancelled more than ${POLICY.CANCEL_WINDOW_H} hours ahead, so nothing is owed. The time is open again.` },
    unconfirmed: { title: `We cancelled ${ref}`, text: `${sarah} didn’t confirm by ${fmtTime(a.cancel.at)}, so you keep her ${dep} deposit.${paid}` },
    'tailor-no-show': { title: `${sarah} says you didn’t come`, text: `Her ${dep} deposit was refunded. If you were there, tell us on the visit.` },
    'no-record': { title: `${ref.charAt(0).toUpperCase()}${ref.slice(1)} wasn’t confirmed`, text: `Nobody confirmed it, so ${sarah}’s ${dep} deposit is on hold. If neither of you disputes it by ${fmtWhen(a.cancel.holdUntil ?? a.cancel.at)}, you keep it.` },   // K-51
  }[a.cancel?.reason];
  return cfg ? reminderCard({ ...cfg, actionLabel: 'See the visit', act: 'notice-open', id: a.id, dismissAct: 'dismiss-notice', notice: true }) : '';
}
/** D-02 (pre-MVP A1): her texts are off (a STOP reply) — requests still expire, so Home says so with the way back on. */
function textsOff() {
  if (textsOn('tailor')) return '';
  const stopped = state.texts.tailor.stoppedAt;
  return `<div class="${ID}__texts-off">${banner({ tone: 'warning', title: 'Texts are off', text: `${stopped ? 'You replied STOP, so we' : 'We'} can’t text you new requests. You still have ${POLICY.REQUEST_EXPIRY_H} hours to answer each one.`, actionLabel: 'Turn texts back on', actionAct: 'texts-on' })}</div>`;
}

/** Confirmed and not started = Upcoming; the visit itself and everything after = In progress. */
const started = (a) => a.status !== 'confirmed' || now() >= toDate(a.slot.start).getTime();
/** K-40: a held handoff with the time Sarah picked (not marked, no problem, not missed) is an appointment again → Upcoming, at that time. */
const handoffSlot = (a) => (a.status === 'awaiting-handoff' && a.handoff?.slot && !a.handoff.markedAt && !a.handoff.problemAt && !handoffMissed(a) ? a.handoff.slot : null);
const upcomingAt = (a) => { const h = handoffSlot(a); return h ? (h.collectAt ?? h.start) : a.slot.start; };
/** The row's when line for a handoff: "Picks up Fri, Oct 16 · 5:30 PM" · "Courier collects Fri 4:45 PM". */
const handoffWhen = (a) => { const h = handoffSlot(a); return a.returnOption === 'courier' ? `Courier collects ${fmtDay(h.collectAt).slice(0, 3)} ${fmtTime(h.collectAt)}` : `Picks up ${slotText(h)}`; };
/** Where the order is handed over (fixes a pickup row that showed Sarah's address): the shop, or her door for the courier. */
function handoffPlace(a) {
  if (a.returnOption !== 'courier') return 'At your shop';
  const w = courierWindow(a);
  return w ? `Arrives at ${state.customer.first}’s ${fmtTimeRange(w.from, w.to)}` : `Courier to ${state.customer.first}’s`;
}

/** S-21 (D-361): a tailor customers can't book yet is told why first — steps still to set up, or the checks under review (DG-4). */
function setupPrompt(t) {
  if (listed(t)) return '';
  if (!onboarded(t)) {
    const left = ONBOARDING_STEPS.filter((st) => !t.onboarding?.[st.id]).length;
    return `<div class="hero ${ID}__setup">${reminderCard({ title: `Finish setting up · ${left} ${left === 1 ? 'step' : 'steps'} left`, text: 'Customers can’t book you until your shop is set up.', actionLabel: 'Continue', act: 'continue-setup' })}</div>`;
  }
  const v = verifyView(t);
  if (v.allPassed) return '';
  const needs = v.needsYou.length;
  return `<div class="hero ${ID}__setup">${reminderCard({
    title: needs ? `${needs === 1 ? 'A check needs' : `${needs} checks need`} you` : `Under review · ${v.passed} of ${v.total} checks`,
    text: needs ? `Customers can book you once all ${v.total} checks pass.` : `Customers can book you once all ${v.total} pass. Most reviews take ${REVIEW_TIME}.`,
    actionLabel: 'See your checks', act: 'see-checks',
  })}</div>`;
}

function view(s) {
  const t = myTailor();
  const { requests, upcoming: booked } = inbox();
  const upcoming = booked.filter((a) => !started(a) || handoffSlot(a)).sort((a, b) => toDate(upcomingAt(a)) - toDate(upcomingAt(b)));
  const progress = booked.filter((a) => started(a) && !handoffSlot(a)).sort((a, b) => toDate(a.job.needBy) - toDate(b.job.needBy) || toDate(a.slot.start) - toDate(b.slot.start));   // D-169: soonest due first
  /* Study-1 A4 (default 10): every completed job, newest first, with what it paid out */
  const recent = apptsFor('tailor').filter((a) => a.status === 'completed')
    .sort((a, b) => toDate(b.history[b.history.length - 1].at) - toDate(a.history[a.history.length - 1].at));
  const first = firstOf(t);
  const head = `${chrome('home', { persona: 'tailor' })}`;
  const hello = headingRow(`<h1 class="t-title">Hi, ${esc(first)}</h1>`, { back: false });
  /* D-161: the shop is paused — one line with the way back on */
  const paused = t.takingRequests === false
    ? `<p class="t-small c-600 hero ${ID}__sum ${ID}__paused">You’re paused, so customers can’t send new requests. ${textLink('Take requests again', { act: 'resume' })}</p>` : '';

  /* Merge A1 + B1: why customers can't book her yet leads (S-21, under Hi); then the paused line + the summary; then the texts-off banner and the
     one-time cancellation notices (D-02, DG-2 A) */
  const setup = setupPrompt(t);
  const notices = noticesFor('tailor').map(noticeCard).join('');
  const lead = `${textsOff()}${notices ? `<div class="${ID}__notices">${notices}</div>` : ''}`;
  if (!apptsFor('tailor').length) {
    return `${head}<main class="body ${ID}">
  ${hello}
  ${setup}
  ${paused}
  ${lead}
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
  const visits = upcoming.filter((a) => !handoffSlot(a));
  const handoffs = upcoming.filter(handoffSlot);
  if (visits.length) summary.push(plural(visits.length, 'upcoming visit', 'upcoming visits'));
  if (handoffs.length) {
    /* K-40: "1 pickup tomorrow" / "1 courier pickup tomorrow" / "2 pickups this week" */
    const word = handoffs.every((a) => a.returnOption === 'courier') ? ['courier pickup', 'courier pickups'] : handoffs.every((a) => a.returnOption !== 'courier') ? ['pickup', 'pickups'] : ['handoff', 'handoffs'];
    const days = [...new Set(handoffs.map((a) => dayDiff(now(), upcomingAt(a))))];
    const when = days.length === 1 && days[0] === 0 ? ' today' : days.length === 1 && days[0] === 1 ? ' tomorrow' : ' coming up';
    summary.push(`${plural(handoffs.length, word[0], word[1])}${when}`);
  }
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
      garments: v.garments.map((g) => ({ type: g.type, services: g.services.map((sv) => sv.label) })),   // K-12: every garment drawn; K-25: the cluster lists each with its services
      lapseAt: sug ? suggestLapseAt(a) : null,   // D-154: her suggested time stays open until then
    });
  };
  const cards = fresh.map(card).join('');
  const waitCards = waiting.map(card).join('');

  /* D-117: a price change waiting on Sarah shows the take-home t-job leads with, captioned as conditional */
  const editing = (a) => a.status === 'in-progress' && a.edit?.state === 'pending';   // Study-1 B1: changes waiting on Sarah
  const pending = (a) => editing(a) || (a.status === 'price-change' && a.priceChange && a.priceChange.state !== 'approved');
  const takeHome = (a) => (editing(a) ? jobEditView(a).after.payout : pending(a) ? priceChangeView(a).after.payout : a.money.payout);
  const money = fmtColumn(booked.map(takeHome));
  const rowsOf = (list) => list.map((a) => {
    const p = pillOf(a);
    const post = a.status !== 'confirmed';
    const handing = a.status === 'awaiting-handoff';
    return apptRow({
      id: a.id, name: customerName(a), initials: customerInitials(), when: handoffSlot(a) ? handoffWhen(a) : post ? sinceLine(a) : fmtWhen(a.slot.start),
      place: handing ? handoffPlace(a) : shortPlace(requestView(a).place),
      status: p.status, pillLabel: p.label, amountText: money(takeHome(a)), amountCaption: pending(a) ? `If ${s.customer.first} approves` : 'Your payout',
    });
  }).join('');
  const rows = rowsOf(upcoming);
  const progressRows = rowsOf(progress);
  const doneMoney = fmtColumn(recent.map((a) => a.money.payout));
  const recentRows = recent.map((a) => {
    const po = payoutOf(a);
    const w = statusWord(a, 'tailor', { short: true });
    /* "Paid Fri, Oct 16" once the Friday run paid it; "Payout pending" until then; the bank's return in the error tone */
    const caption = po?.state === 'paid' ? payoutLine(po).short : po?.state === 'failed' ? payoutLine(po).short : 'Payout pending';
    return apptRow({
      id: a.id, name: customerName(a), initials: customerInitials(), when: `Completed ${fmtDay(a.history[a.history.length - 1].at)}`, place: shortPlace(requestView(a).place),
      status: w.pill, pillLabel: w.label, amountText: doneMoney(a.money.payout),
      amountCaption: caption, captionTone: po?.state === 'failed' ? 'error' : 'default', muted: true,
    });
  }).join('');

  const group = (title, id, count, inner) => `<section class="sec" aria-labelledby="${ID}-${id}">
    ${sectionHead(title, { id: `${ID}-${id}`, count })}
    ${inner}
  </section>`;
  return `${head}<main class="body ${ID}">
  ${hello}
  ${setup}
  ${paused}
  <p class="t-small c-600 hero ${ID}__sum">${dateLine()} · ${summary.join(', ')}</p>
  ${lead}
  ${group('New requests', 'new', fresh.length || null, fresh.length
    ? `<div class="${ID}__list">${cards}</div>`
    : `<p class="t-body c-600 ${ID}__none">No new requests right now.</p>`)}
  ${waiting.length ? group(`Waiting on ${esc(s.customer.first)}`, 'waiting', waiting.length, `<div class="${ID}__list">${waitCards}</div>`) : ''}
  ${upcoming.length || !progress.length ? group('Upcoming', 'upcoming', upcoming.length || null,
    upcoming.length ? `<div class="${ID}__list">${rows}</div>` : `<p class="t-body c-600 ${ID}__none">${apptsFor('tailor').length ? 'Nothing upcoming.' : 'Nothing booked yet.'}</p>`) : ''}
  ${progress.length ? group('In progress', 'progress', progress.length, `<div class="${ID}__list">${progressRows}</div>`) : ''}
  ${recent.length ? group('Completed', 'completed', recent.length, `<div class="${ID}__list">${recentRows}</div>`) : ''}
</main>`;
}

function wire(root) {
  /* a request whose reply window passed while she was away is expired now (the card would say so) */
  if (T.tick().length) { go(ID); return; }
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (act === 'open-request') { setFocus(el.dataset.id); go('t-request'); }
    else if (act === 'dismiss-notice') { T.dismissNotice(el.dataset.id, 'tailor'); go(ID); }
    else if (act === 'notice-open') { T.dismissNotice(el.dataset.id, 'tailor'); setFocus(el.dataset.id); go('t-job'); }
    else if (act === 'texts-on') go('t-texts');
    else if (act === 'open-appt') { setFocus(el.dataset.id); go('t-job'); }
    else if (act === 'resume') {
      T.setTakingRequests(true);
      go(ID);
      toast('You’re taking requests again', { tone: 'success' });
    } else if (act === 'hours') { delete state.ui['to-availability']; go('to-availability'); }   // edit mode: a fresh draft from the saved week
    else if (act === 'see-checks') go('t-shop');
    else if (act === 'continue-setup') { const next = ONBOARDING_STEPS.find((st) => st.id === nextSection()); state.ui.onboarding = { resumed: true }; go(next ? next.screen : 'to-payouts'); }
  });
}

register(ID, view, wire);
