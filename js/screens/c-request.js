/* ============================================================
   c-request — C6/C7 every outcome of a request (M1 requested; M3 soon,
   suggested, declined, expired, expired-2, expired-final).
   Focal: the countdown while waiting; afterwards the one thing that
   changed (the new time, or the released hold). Money is told first:
   what happened to the hold, then the way forward.
   Screen-local flags: state.ui['c-request'] { busy, error }.
   ============================================================ */
import { register, render as go, currentScreen, previousScreen } from '../app.js';
import { state, T, tailorById, now, msLeft } from '../state.js';
import {
  chrome, headingRow, statusHero, countdown, visitBlock, timeline, customerBreakdown, moneyRows, banner, cta,
  emptyState, sheetOverlay, toast, esc, noteQuote,
} from '../components.js';
import { focusAppt, setFocus, redirectIfMoved } from '../focus.js';
import { withLatency } from '../sim.js';
import { fmtExact, cancelTerms } from '../money.js';
import { fmtWhen, fmtTime, fmtCountdown, addMinutes, isoMinute, toDate } from '../dates.js';
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
const heroRow = (html) => headingRow(html, { backRow: true, back: backTarget() === 'c-bookings' });

function visitRows(a, t) {
  const home = a.job.visitType === 'home';
  const ad = a.job.address ?? state.customer.address;
  const where = home
    ? [ad.street, ad.unit, ad.city].filter(Boolean).join(', ')
    : [t.shopName, t.shop?.street].filter(Boolean).join(', ');
  const items = a.job.garments.length;
  const services = a.job.garments.reduce((n, g) => n + g.services.length, 0);
  return [
    `${fmtWhen(a.slot.start)} · ${VISIT_LABEL.customer[a.job.visitType]}`,
    esc(where),
    `${items} ${items === 1 ? 'item' : 'items'} · ${services} ${services === 1 ? 'service' : 'services'}`,
  ];
}

/** Try again lands here when the model refuses (D-85): the message and where to go. */
const RETRY_ERRORS = {
  'slot-passed': { text: 'That time has passed. Pick a new time.', actionLabel: 'Pick a time', actionAct: 'pick-time' },
  'slot-unavailable': { text: 'That time was just taken. Pick a new time.', actionLabel: 'Pick a time', actionAct: 'pick-time' },
  'card-declined': { text: 'Your card was declined. Choose another way to pay.', actionLabel: 'Pay another way', actionAct: 'pay-another' },
};

const link = (label, act, busy) => `<button type="button" class="c-request__link" data-act="${act}"${busy ? ' disabled aria-disabled="true"' : ''}>${label}</button>`;

/** One released-hold line (declined / expired): nothing is owed any more. */
const releasedRow = (a) => `<h2 class="t-h2 c-request__h2">Price</h2>
  ${moneyRows([{ label: 'Deposit hold', cents: a.payments.deposit.cents, status: 'Released' }])}`;

/* ---------- the states ---------- */

function requestedBody(a, t, first) {
  const soon = msLeft(a) <= POLICY.EXPIRING_SOON_MIN * 60000;
  const late = cancelTerms(a, now()).window === 'late';
  const hero = statusHero({
    variant: 'requested', pill: 'requested', pillLabel: 'Request sent', title: `Waiting for ${esc(first)}`,
    body: `${esc(first)} has until ${fmtTime(a.expiresAt)} to reply. We’ll text you the moment there’s a reply.`,
  });
  const caption = soon
    ? `<span class="t-small c-request__soon">${esc(first)} has ${fmtCountdown(msLeft(a))} left to reply. If there’s no reply, your hold is released.</span>`
    : `<span class="t-small c-600">Reply by ${fmtTime(a.expiresAt)}</span>`;
  return `${heroRow(hero)}
  <div class="c-request__clock">
    ${countdown({ expiresAt: a.expiresAt, now: now() })}
    ${caption}
    ${state.sim.push === 'denied' ? `<span class="t-small c-600" data-push-off>Notifications are off, so we’ll text you when ${esc(first)} replies.</span>` : ''}
  </div>
  <div class="c-request__block">${visitBlock(visitRows(a, t), { title: 'Your visit', flush: true })}</div>
  <h2 class="t-h2 c-request__h2">What happens next</h2>
  ${timeline([
    { state: 'done', title: a.retries > 0 ? 'Request sent again' : 'Request sent', sub: fmtWhen(a.sentAt ?? a.requestedAt) },
    { state: 'current', title: `${esc(first)} replies`, sub: `By ${fmtTime(a.expiresAt)}` },
    { state: 'todo', title: 'You’re booked', sub: `The ${money(a.payments.deposit.cents)} deposit is charged when ${esc(first)} accepts` },
  ])}
  <p class="t-small c-600 c-request__note">If ${esc(first)} declines or doesn’t reply, the hold is released and your job stays saved.${late ? ` This visit is less than ${POLICY.CANCEL_WINDOW_H} hours away. If you cancel after ${esc(first)} accepts, the ${money(a.payments.deposit.cents)} deposit is kept.` : ''}</p>
  <h2 class="t-h2 c-request__h2">Price</h2>
  ${customerBreakdown(a.money, { stage: 'booked', tailorFirst: first, depositState: a.payments.deposit.state })}
  <div class="c-request__actions">
    ${cta(`Message ${esc(first)}`, { attrs: 'data-act="message"' })}
    ${cta('Withdraw request', { variant: 'secondary', attrs: 'data-act="withdraw"' })}
  </div>`;
}

function suggestedBody(a, t, first, busy) {
  const deposit = a.payments.deposit.cents;
  const hero = statusHero({ variant: 'new-times', pill: 'suggested', pillLabel: 'New time suggested', title: `${esc(first)} suggested a new time` });
  return `${heroRow(hero)}
  <section class="c-request__time" data-new-time aria-label="Suggested time">
    <span class="t-caps c-600">NEW TIME</span>
    <span class="t-h2 c-request__when">${fmtWhen(a.suggested.start)}</span>
    <span class="t-small c-600">You asked for ${fmtWhen(a.slot.start)}</span>
    <p class="t-body c-700 c-request__same">Same price. If you accept, your ${money(deposit)} deposit is charged and you’re booked.</p>
  </section>
  <div class="c-request__block">${visitBlock([esc(`${VISIT_LABEL.customer[a.job.visitType]} · ${VISIT_MINUTES[a.job.visitType]} min`), ...visitRows(a, t).slice(1)], { title: 'Your visit', flush: true })}</div>
  <h2 class="t-h2 c-request__h2">Price</h2>
  ${customerBreakdown(a.money, { stage: 'booked', tailorFirst: first, depositState: a.payments.deposit.state })}
  <div class="c-request__actions">
    ${cta('Accept new time', { busy: busy === 'accept-time', busyLabel: 'Booking…', disabled: !!busy && busy !== 'accept-time', attrs: 'data-act="accept-time"' })}
    ${cta('Find another tailor', { variant: 'secondary', disabled: !!busy, attrs: 'data-act="find-another"' })}
    ${link(`Message ${esc(first)}`, 'message', busy)}
  </div>`;
}

function declinedBody(a, t, first, busy) {
  const deposit = a.payments.deposit.cents;
  const hero = statusHero({
    variant: 'declined', pill: 'declined', title: `${esc(first)} can’t take this job`,
    body: `Your ${money(deposit)} hold has been released — you weren’t charged. Your job details are saved.`,
  });
  return `${heroRow(hero)}
  ${a.declineReason ? noteQuote({ label: `${first}’s note`, text: a.declineReason }) : ''}
  <div class="c-request__block">${visitBlock(visitRows(a, t), { title: 'Your request', flush: true })}</div>
  ${releasedRow(a)}
  <div class="c-request__actions">
    ${cta('Find another tailor', { busy: busy === 'find-another', busyLabel: 'One moment…', disabled: !!busy && busy !== 'find-another', attrs: 'data-act="find-another"' })}
    ${link('View messages', 'message', busy)}
  </div>`;
}

function expiredBody(a, t, first, busy, u) {
  const deposit = a.payments.deposit.cents;
  const max = POLICY.MAX_RETRIES;
  const final = a.retries >= max;
  const hours = POLICY.REQUEST_EXPIRY_H;
  /* D-94 (R3-2-C-04): a resend waits up to another `hours` for a reply. When the visit starts before that wait could
     end (or has already started), Try again would hold money for a time that can't happen: offer a new time instead. */
  const startMs = toDate(a.slot.start).getTime();
  const lapsed = !final && startMs <= now() + hours * 3600000;
  const passed = startMs <= now();
  let title; let body;
  if (final) {
    title = `${esc(first)} didn’t reply again`;
    body = `Your ${money(deposit)} hold was released. ${esc(first)} is hidden for this job, so you can choose someone else.`;
  } else if (lapsed) {
    title = `${esc(first)} didn’t reply in time`;
    body = `Your ${money(deposit)} hold was released. Pick a new time with ${esc(first)}, or message ${esc(first)} first.`;
  } else {
    title = `${esc(first)} didn’t reply in time`;
    body = `Your ${money(deposit)} hold was released. Send the same request again for another ${hours} hours, or message ${esc(first)} first.${a.retries + 1 >= max ? ` Last try: if ${esc(first)} doesn’t reply this time, we’ll show you other tailors.` : ''}`;
  }
  const hero = statusHero({ variant: 'requested', pill: 'calm', pillLabel: 'No reply', title, body });
  const err = !final && u.error ? RETRY_ERRORS[u.error] : null;
  const newBy = fmtTime(isoMinute(addMinutes(now(), hours * 60)));
  let actions;
  if (lapsed) {
    actions = `<p class="t-small c-600 c-request__passed" data-lapsed="${passed ? 'passed' : 'too-soon'}">Your ${fmtWhen(a.slot.start)} time ${passed ? 'has passed' : `is too soon for another ${hours}-hour wait`}.</p>
    ${cta('Pick a new time', { disabled: !!busy, attrs: 'data-act="pick-time"' })}
    ${cta(`Message ${esc(first)}`, { variant: 'secondary', disabled: !!busy, attrs: 'data-act="message"' })}
    ${link('See other tailors', 'see-others', busy)}`;
  } else if (final) {
    actions = `${cta('See other tailors', { busy: busy === 'find-another', busyLabel: 'One moment…', disabled: !!busy && busy !== 'find-another', attrs: 'data-act="find-another"' })}
    ${cta(`Message ${esc(first)}`, { variant: 'secondary', disabled: !!busy, attrs: 'data-act="message"' })}`;
  } else {
    actions = `${err ? `<div class="c-request__alert">${banner({ tone: 'error', text: err.text, actionLabel: err.actionLabel, actionAct: err.actionAct })}</div>` : ''}
    <div class="c-request__try">
      ${cta(`Try again (${a.retries + 1} of ${max})`, { busy: busy === 'try-again', busyLabel: 'Sending…', disabled: !!busy && busy !== 'try-again', attrs: 'data-act="try-again"' })}
      <span class="t-small c-600">Holds ${money(deposit)} again until ${newBy}</span>
    </div>
    ${cta(`Message ${esc(first)}`, { variant: 'secondary', disabled: !!busy, attrs: 'data-act="message"' })}
    ${link('See other tailors', 'see-others', busy)}`;
  }
  return `${heroRow(hero)}
  <div class="c-request__block">${visitBlock(visitRows(a, t), { title: final ? 'Your request' : 'Your visit', flush: true })}</div>
  ${releasedRow(a)}
  <div class="c-request__actions">
    ${actions}
  </div>`;
}

function view() {
  const a = focusAppt(ID);
  const head = chrome('bookings');
  if (!a) {
    return `${head}<main class="body ${ID}" data-s="${ID}">
  <div class="c-request__empty" data-empty="no-request">${emptyState({
    title: 'No open requests', body: 'When you send a request, you can follow it here.', ctaLabel: 'Start a booking', ctaAct: 'home',
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
  <p class="t-body">The ${money(deposit)} hold is released right away. Your job stays saved so you can pick another time or tailor.</p>
  ${cta('Withdraw request', { variant: 'danger', attrs: 'data-act="withdraw-ok"' })}
  ${cta('Keep request', { variant: 'secondary', attrs: 'data-act="withdraw-keep"' })}
</div>`, { header: 'Withdraw this request?', dataS: 'c-request--withdraw', confirm: false }, (holder, close) => {
    holder.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'withdraw-keep') close();
      else if (act === 'withdraw-ok') {
        const res = T.withdrawRequest(a.id);
        close();
        if (!res.ok) { toast('Something went wrong. Your request is still open.', { tone: 'error' }); return; }
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
    if (!res.ok) { toast('Something went wrong. Try again.', { tone: 'error' }); go(ID); return; }
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
    if (!res.ok) { toast('Something went wrong. Try again.', { tone: 'error' }); go(ID); return; }
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
      body: `${first} has ${POLICY.REQUEST_EXPIRY_H} hours to answer. Turn on notifications to see the reply the moment it lands, even before our text.`,
    }, { onDone: () => go(ID, { replace: true }) });
  }
}

register(ID, view, wire);
