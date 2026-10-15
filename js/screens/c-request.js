/* ============================================================
   c-request — C6/C7 every outcome of a request (M1 requested; M3 soon,
   suggested, declined, expired, expired-2, expired-final).
   Focal: the countdown while waiting; afterwards the one thing that
   changed (the new time, or the released hold). Money is told first:
   what happened to the hold, then the way forward.
   Screen-local flags: state.ui['c-request'] { busy, error }.
   ============================================================ */
import { register, render as go, currentScreen, previousScreen } from '../app.js';
import { state, T, tailorById, now, msLeft, suggestLapseAt } from '../state.js';
import {
  chrome, headingRow, statusHero, statusPill, waitBand, countdown, visitBlock, timeline, customerBreakdown, moneyRows, banner, cta,
  emptyState, sheetOverlay, toast, esc, noteQuote, sectionHead, infoButton, textLink, garmentStrip, requestStrip, navBackMark,
} from '../components.js';
import { focusAppt, setFocus, redirectIfMoved } from '../focus.js';
import { withLatency } from '../sim.js';
import { fmtExact, cancelTerms } from '../money.js';
import { fmtWhen, fmtTime, addMinutes, isoMinute, toDate } from '../dates.js';
import { VISIT_LABEL, VISIT_MINUTES } from '../data.js';
import { POLICY } from '../money-config.js';
import { openPushPrompt } from '../system.js';

const ID = 'c-request';

const firstOf = (t) => (t?.name || 'The tailor').split(' ')[0];
const money = (cents) => `<span data-money>${fmtExact(cents)}</span>`;
const ui = () => (state.ui[ID] ??= {});

/** The screen Back returns to: the one under c-request in the history (while this view is first built, the top
    of the history is still the screen that navigated here). */
const backTarget = () => (currentScreen() === ID ? previousScreen() : currentScreen());
/** The shared detail header (D-93): pill, title and notes flush at the padding. A Back row only when Sarah opened
    the request from Bookings (R3-2-C-02); right after sending it the booking flow is finished, so no Back. */
const heroRow = (html) => headingRow(html, { back: backTarget() === 'c-bookings' });

function visitRows(a, t) {
  const home = a.job.visitType === 'home';
  const ad = a.job.address ?? state.customer.address;
  const where = home
    ? [ad.street, ad.unit, ad.city].filter(Boolean).join(', ')
    : [t.shopName, t.shop?.street].filter(Boolean).join(', ');
  const items = a.job.garments.length;
  const services = a.job.garments.reduce((n, g) => n + g.services.length, 0);
  const label = VISIT_LABEL.customer[a.job.visitType];
  return [
    { icon: 'calendar', value: fmtWhen(a.slot.start), strong: true, detail: `${label} · ${VISIT_MINUTES[a.job.visitType]} min` },
    { icon: home ? 'home' : 'shop', value: esc(where) },
    /* M7-2-C-04 (D-202): the booked garments as illustrations, then the count (K-10: the count is the value, the tiles sit under it) */
    { icon: 'hanger', value: `${items} ${items === 1 ? 'item' : 'items'} · ${services} ${services === 1 ? 'service' : 'services'}`, extra: garmentStrip(a.job.garments.map((g) => g.type)) },
  ];
}

/** Try again lands here when the model refuses (D-85): the message and where to go. */
const RETRY_ERRORS = {
  'slot-passed': { text: 'That time has passed. Pick a new time.', actionLabel: 'Pick a time', actionAct: 'pick-time' },
  'slot-unavailable': { text: 'That time was just taken. Pick a new time.', actionLabel: 'Pick a time', actionAct: 'pick-time' },
  'card-declined': { text: 'Your card was declined. Choose another way to pay.', actionLabel: 'Pay another way', actionAct: 'pay-another' },
};

const link = (label, act, busy, tone) => textLink(label, { act, tone, disabled: !!busy });
/** A group on the page: <section class="sec"> with a visit block / timeline / price inside. */
const yourRequest = (rows) => `<section class="sec">${visitBlock(rows, { title: 'Your request', flush: true })}</section>`;
const priceSection = (a, first, { info = true } = {}) => `<section class="sec">${sectionHead('Price', { aside: info ? infoButton('deposit') : '' })}
  ${customerBreakdown(a.money, { stage: 'booked', tailorFirst: first, depositState: a.payments.deposit.state })}</section>`;

/** One released-hold line (declined / expired): nothing is owed any more. */
const releasedRow = (a) => `<section class="sec">${sectionHead('Price')}
  ${moneyRows([{ label: 'Deposit hold', cents: a.payments.deposit.cents, status: 'Released' }])}</section>`;

/* ---------- the states ---------- */

function requestedBody(a, t, first) {
  const soon = msLeft(a) <= POLICY.EXPIRING_SOON_MIN * 60000;
  const late = cancelTerms(a, now()).window === 'late';
  /* K-11 (D-236), Option 3 "Ochre band": status + clock + deadline in one band, then the title and the text promise (the band rides in
     the heading's lead line; the countdown keeps role="timer"). */
  const band = waitBand({
    status: statusPill('requested', 'Request sent'),
    clock: countdown({ expiresAt: a.expiresAt, now: now(), tail: `until ${fmtTime(a.expiresAt)}` }),
    soon,
  });
  const hero = statusHero({
    variant: 'requested', pill: false, title: `Waiting for ${esc(first)}`,
    body: `We’ll text you the moment ${esc(first)} replies.`,
  });
  return `${headingRow(hero, { back: backTarget() === 'c-bookings', status: band })}
  ${yourRequest(visitRows(a, t))}
  <section class="sec">${sectionHead('What happens next')}
  ${timeline([
    { state: 'done', title: a.retries > 0 ? 'Request sent again' : 'Request sent', sub: fmtWhen(a.sentAt ?? a.requestedAt) },
    { state: 'current', title: `${esc(first)} replies`, sub: `Within ${POLICY.REQUEST_EXPIRY_H} hours` },
    { state: 'todo', title: 'You’re booked', sub: `The ${money(a.payments.deposit.cents)} deposit is charged when ${esc(first)} accepts` },
  ])}
  <p class="t-small c-600 c-request__note">If ${esc(first)} declines or doesn’t reply, your hold is released.${late ? ` This visit is less than ${POLICY.CANCEL_WINDOW_H} hours away. If you cancel after ${esc(first)} accepts, ${esc(first)} keeps the ${money(a.payments.deposit.cents)} deposit.` : ''}</p></section>
  ${priceSection(a, first)}
  <div class="page-actions">
    ${cta(`Message ${esc(first)}`, { attrs: 'data-act="message"' })}
    <div class="page-actions__links">${textLink('Withdraw request', { act: 'withdraw', tone: 'danger' })}</div>
  </div>`;
}

function suggestedBody(a, t, first, busy) {
  const deposit = a.payments.deposit.cents;
  /* K-17 (D-243, #6 / R1): the strip says the state and carries the hold deadline as its countdown; the new time is the one figure (the h1) with
     the old time as its one "was" line, then one sentence on what accepting does. No pill, no caps label, no "holding until" sentence. */
  const strip = requestStrip({ tone: 'action', icon: 'clock', text: `${esc(first)} suggested a new time`, lapseAt: suggestLapseAt(a), now: now(), page: true });
  return `${backTarget() === 'c-bookings' ? navBackMark() : ''}${strip}
  <section class="sec sec--first c-request__time" data-new-time aria-label="Suggested time">
    <h1 class="t-title c-request__when">${fmtWhen(a.suggested.start)}</h1>
    <span class="t-small c-600">You asked for ${fmtWhen(a.slot.start)}</span>
    <p class="t-body c-700 c-request__same">Same price. If you accept, your ${money(deposit)} deposit is charged and you’re booked.</p>
  </section>
  ${ui().error === 'slot-passed' ? `<div class="c-request__alert c-request__alert--top">${banner({ tone: 'error', text: RETRY_ERRORS['slot-passed'].text })}</div>` : ''}
  ${yourRequest([{ icon: 'calendar', value: esc(VISIT_LABEL.customer[a.job.visitType]), detail: `${VISIT_MINUTES[a.job.visitType]} min` }, ...visitRows(a, t).slice(1)])}
  ${priceSection(a, first)}
  <div class="page-actions">
    ${cta('Accept new time', { busy: busy === 'accept-time', busyLabel: 'Booking…', disabled: !!busy && busy !== 'accept-time', attrs: 'data-act="accept-time"' })}
    <div class="page-actions__links">${link('Find another tailor', 'find-another', busy)}${link(`Message ${esc(first)}`, 'message', busy)}</div>
  </div>`;
}

function declinedBody(a, t, first, busy) {
  const hero = statusHero({
    variant: 'declined', pill: false, title: `${esc(first)} declined your request`,
    body: 'You weren’t charged, and your items and services are saved for the next tailor.',   // K-17 R1 / R3: the title states it; the hold amount is the Price row
  });
  return `${heroRow(hero)}
  ${a.declineReason ? noteQuote({ label: `${first}’s note`, text: a.declineReason }) : ''}
  ${yourRequest(visitRows(a, t))}
  ${releasedRow(a)}
  <div class="page-actions">
    ${cta('Find another tailor', { busy: busy === 'find-another', busyLabel: 'One moment…', disabled: !!busy && busy !== 'find-another', attrs: 'data-act="find-another"' })}
    <div class="page-actions__links">${link('View messages', 'message', busy)}</div>
  </div>`;
}

/** D-154: a suggested time that lapsed or that she withdrew — the D-94 lapsed pattern: hold released, find someone else. */
function suggestionEndedBody(a, t, first, busy) {
  const withdrawn = a.suggested.ended === 'withdrawn';
  const hero = statusHero({
    variant: 'requested', pill: false,
    title: withdrawn ? `${esc(first)} withdrew her suggested time` : `${esc(first)}’s suggested time has passed`,
    body: `Your hold is released. We won’t show ${esc(first)} for this request again, so you can choose another tailor.`,
  });
  return `${heroRow(hero)}
  ${yourRequest(visitRows(a, t))}
  ${releasedRow(a)}
  <div class="page-actions" data-suggestion-ended="${withdrawn ? 'withdrawn' : 'lapsed'}">
    ${cta('Find another tailor', { busy: busy === 'find-another', busyLabel: 'One moment…', disabled: !!busy && busy !== 'find-another', attrs: 'data-act="find-another"' })}
    <div class="page-actions__links">${link(`Message ${esc(first)}`, 'message', busy)}</div>
  </div>`;
}

function expiredBody(a, t, first, busy, u) {
  if (a.suggested?.ended) return suggestionEndedBody(a, t, first, busy);
  const deposit = a.payments.deposit.cents;
  const max = POLICY.MAX_RETRIES;
  const final = a.retries >= max;
  const hours = POLICY.REQUEST_EXPIRY_H;
  /* D-94 (R3-2-C-04): a resend waits up to another `hours` for a reply. When the visit starts before that wait could
     end (or has already started), Try again would hold money for a time that can't happen: offer a new time instead. */
  const startMs = toDate(a.slot.start).getTime();
  const lapsed = !final && startMs <= now() + hours * 3600000;
  const passed = startMs <= now();
  const newBy = fmtTime(isoMinute(addMinutes(now(), hours * 60)));
  let title; let body;
  if (final) {
    title = `${esc(first)} didn’t reply again`;
    body = `Your hold was released. We won’t show ${esc(first)} for this request again, so you can choose another tailor.`;
  } else if (lapsed) {
    title = `${esc(first)} didn’t reply in time`;
    body = `Your hold was released. Pick a new time with ${esc(first)}, or message ${esc(first)} first.`;
  } else {
    title = `${esc(first)} didn’t reply in time`;
    body = a.retries + 1 >= max
      ? `Your hold was released. You can send it once more. If ${esc(first)} doesn’t reply by ${newBy}, we’ll show you other tailors.`
      : `Your hold was released. You can send the same request again, and ${esc(first)} gets another ${hours} hours.`;
  }
  const hero = statusHero({ variant: 'requested', pill: false, title, body });   // K-17 R1: the title says it, no "No reply" pill
  const err = !final && u.error ? RETRY_ERRORS[u.error] : null;
  let actions;
  if (lapsed) {
    actions = `<p class="t-small c-600 c-request__passed" data-lapsed="${passed ? 'passed' : 'too-soon'}">Your ${fmtWhen(a.slot.start)} time ${passed ? 'has passed' : `is too soon for another ${hours}-hour wait`}.</p>
    ${cta('Pick a new time', { disabled: !!busy, attrs: 'data-act="pick-time"' })}
    <div class="page-actions__links">${link(`Message ${esc(first)}`, 'message', busy)}${link('Find another tailor', 'see-others', busy)}</div>`;
  } else if (final) {
    actions = `${cta('Find another tailor', { busy: busy === 'find-another', busyLabel: 'One moment…', disabled: !!busy && busy !== 'find-another', attrs: 'data-act="find-another"' })}
    <div class="page-actions__links">${link(`Message ${esc(first)}`, 'message', busy)}</div>`;   // M7-1-A-04: one filled button; the second path is a text link (D-195)
  } else {
    actions = `${err ? `<div class="c-request__alert">${banner({ tone: 'error', text: err.text, actionLabel: err.actionLabel, actionAct: err.actionAct })}</div>` : ''}
    <div class="c-request__try">
      ${cta(a.retries + 1 >= max ? 'Send again (last try)' : 'Send request again', { busy: busy === 'try-again', busyLabel: 'Sending…', disabled: !!busy && busy !== 'try-again', attrs: 'data-act="try-again"' })}
      <span class="t-small c-600">Holds ${money(deposit)} again · ${esc(first)} has until ${newBy} to reply</span>
    </div>
    <div class="page-actions__links">${link(`Message ${esc(first)}`, 'message', busy)}${link('Find another tailor', 'see-others', busy)}</div>`;
  }
  return `${heroRow(hero)}
  ${yourRequest(visitRows(a, t))}
  ${releasedRow(a)}
  <div class="page-actions">
    ${actions}
  </div>`;
}

function view() {
  const a = focusAppt(ID);
  const head = chrome('bookings');
  if (!a) {
    return `${head}<main class="body ${ID}" data-s="${ID}">
  <div class="c-request__empty" data-empty="no-request">${emptyState({
    title: 'No open requests', body: 'When you send a request, you can follow it here.', ctaLabel: 'Start a booking', ctaAct: 'home', art: 'Suit Jacket',
  })}</div>
</main>`;
  }
  const t = tailorById(a.tailorId) ?? state.tailors[0];
  const first = firstOf(t);
  const u = ui();
  const busy = u.busy || null;
  const inner = a.status === 'requested' ? requestedBody(a, t, first)
    : a.status === 'suggested' ? suggestedBody(a, t, first, busy)
      : a.status === 'declined' ? declinedBody(a, t, first, busy)
        : expiredBody(a, t, first, busy, u);
  return `${head}<main class="body ${ID}" data-s="${ID}" data-status="${a.status}"${busy ? ' aria-busy="true"' : ''}>
  ${inner}
</main>`;
}

/* ---------- withdraw sheet (D-79: the one filled button is the danger one) ---------- */

function openWithdraw(a) {
  const deposit = a.payments.deposit.cents;
  sheetOverlay(`<div class="c-request-sheet">
  <p class="t-body">The ${money(deposit)} hold is released right away. Your items and services stay saved, so you can pick another time or tailor.</p>
  ${cta('Withdraw request', { variant: 'danger', attrs: 'data-act="withdraw-ok"' })}
  ${cta('Keep request', { variant: 'secondary', attrs: 'data-act="withdraw-keep"' })}
</div>`, { header: 'Withdraw this request?', dataS: 'c-request--withdraw', confirm: false }, (holder, close) => {
    holder.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'withdraw-keep') close();
      else if (act === 'withdraw-ok') {
        const res = T.withdrawRequest(a.id);
        close();
        if (!res.ok) { toast('Couldn’t withdraw the request. It’s still open.', { tone: 'error' }); return; }
        go('c-tailors', { fresh: true });
        toast(`Request withdrawn. ${fmtExact(deposit)} hold released.`);
      }
    });
  });
}

/* ---------- actions that talk to the server ---------- */

let cancelWait = () => {};
const onScreen = () => currentScreen() === ID;

/** Set the busy flag, repaint, wait (withLatency), then run the transition. */
function run(kind, work) {
  const u = ui();
  if (u.busy) return;
  u.busy = kind; u.error = null;
  go(ID);
  cancelWait();
  cancelWait = withLatency(() => {
    if (!onScreen()) { u.busy = null; return; }
    u.busy = null;
    work();
  });
}

function acceptTime(a) {
  run('accept-time', () => {
    const res = T.acceptSuggestion(a.id);
    if (res.error === 'slot-passed') { T.tick(); ui().error = 'slot-passed'; go(ID); return; }   // D-154: the tap raced the lapse; the screen now shows the ended state
    if (!res.ok) { toast('Couldn’t accept the new time. Your hold is unchanged.', { tone: 'error' }); go(ID); return; }
    setFocus(a.id);
    go('c-booking', { fresh: true });
    toast(`Booked for ${fmtWhen(res.appt.slot.start)}`);
  });
}

function findAnother(a) {
  const deposit = a.payments.deposit.cents;
  const released = a.status === 'suggested';
  run('find-another', () => {
    const res = T.findAnotherTailor(a.id);
    if (!res.ok) { toast('Couldn’t find another tailor. Try again.', { tone: 'error' }); go(ID); return; }
    go('c-tailors', { fresh: true });
    if (released) toast(`${fmtExact(deposit)} hold released.`);
  });
}

function tryAgain(a) {
  const deposit = a.payments.deposit.cents;
  run('try-again', () => {
    const res = T.tryAgain(a.id);
    if (!res.ok) { ui().error = RETRY_ERRORS[res.error] ? res.error : 'card-declined'; go(ID); return; }
    setFocus(a.id);
    go(ID);
    toast(`Request sent again. ${fmtExact(deposit)} on hold.`);
  });
}

function message(a) {
  state.ui.booking = { ...state.ui.booking, from: undefined, tailorId: a.tailorId };
  go('c-thread');
}

/* #screen is re-rendered often — a fresh controller per wire keeps one delegate */
let ac = null;

function wire(root) {
  ac?.abort(); ac = new AbortController();
  const a0 = focusAppt(ID);
  if (a0 && !state.ui.apptId) setFocus(a0.id);
  if (redirectIfMoved(ID, go)) return;
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled || e.target.closest('.screen-sheet--overlay')) return;
    const a = focusAppt(ID);
    switch (el.dataset.act) {
      case 'home': go('c-job', { fresh: true }); break;
      case 'message': if (a) message(a); else go('c-thread'); break;
      case 'withdraw': if (a) openWithdraw(a); break;
      case 'accept-time': if (a) acceptTime(a); break;
      case 'find-another': if (a) findAnother(a); break;
      case 'try-again': if (a) tryAgain(a); break;
      case 'see-others': go('c-tailors'); break;
      case 'pick-time':   // a new time with the same tailor (D-85 / D-94)
        if (a) state.ui.booking = { ...state.ui.booking, from: undefined, tailorId: a.tailorId, slot: null };
        go('c-book'); break;
      case 'pay-another': go('c-pay'); break;
      default: break;
    }
  }, { signal: ac.signal });
  /* D-139: the soft notification ask while a request waits. Only the Test flows set 'prompt' on this side. */
  const wait = focusAppt(ID);
  if (state.sim.push === 'prompt' && wait?.status === 'requested') {
    const first = firstOf(tailorById(wait.tailorId));
    openPushPrompt({
      title: `Know when ${first} replies`,
      body: `${first} has ${POLICY.REQUEST_EXPIRY_H} hours to reply. Turn on notifications to hear back the moment ${first} replies.`,
    }, { onDone: () => go(ID, { replace: true }) });
  }
}

register(ID, view, wire);
