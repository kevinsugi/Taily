/* ============================================================
   Taily v5 — state, appointment machine, selectors. DOM-free.
   (v4's state.js is archived in js/v4/state.js.)

   One `state` object, mutated in place. Transitions are pure with
   respect to the DOM: they take an appointment id, mutate `state`
   and return `{ ok: true, appt }` or `{ ok: false, error }` — a
   guard failure never throws; an unknown id throws. Every success
   pushes `history` and, where it matters, a system message into
   the customer–tailor thread. Nothing here reads the real clock:
   `state.clock.now` is frozen (D-09) and moves only through
   setClock / advanceClock.

   Money is integer cents (money.js); rates and timers come from
   money-config.js. Decisions: D-03 … D-27 in docs/v5/DECISIONS.md.

   Status machine:
     requested → confirmed → fitting → price-change → in-progress → ready → awaiting-handoff → completed
       (awaiting-handoff, Study-1 A1–A3: the balance is HELD when Sarah picks a way back and captured at the handoff — pickup code,
        "I got it", courier delivery, or HANDOFF_AUTO_H after Amara marks it; still open after UNCLAIMED_CAPTURE_D → captured, job stays open)
     requested → suggested → confirmed | cancelled(switched | withdrawn)
     requested → declined (terminal) · expired → requested (Try again) · confirmed → cancelled(...)
   ============================================================ */
import { POLICY } from './money-config.js';
import {
  cents, linesFor, quote, estimate, rushFor, depositFor, courierQuote, cancelTerms, noShowPayout, fmtExact,
} from './money.js';
import {
  toDate, isoMinute, isoDay, addDays, addMinutes, strip, dayDiff, weekdayKey, minutesOf, fmtWhen, fmtDay, fmtTime, fmtTimeRange, payoutDay,
} from './dates.js';
import {
  CUSTOMER, TAILORS, SEED_JOB, BLANK_TAILOR, DEMO_NOW, MAX_ITEMS, VISIT_MINUTES, DAY_START_MIN, DAY_END_MIN,
  SLOT_STEP_MIN, SLOT_HORIZON_DAYS, ZIP_INFO, SHOP_RADIUS_MI, SERVICES, GARMENT_TYPES, RETURN_LABEL,
  TAILOR_LIMITS, CHARGE_WHEN, RUSH_TIERS, ROUTING_BANKS, REVIEW_LIMITS, CHAT_LIMITS, FITTING_LIMITS, DOC_KINDS, servicesForType, HANDOFF_CODE_LEN,
  HOOD_BY_ID, zipsForHoods, NOTES_LIMITS, VERIFY_ITEMS, placeForZip, geocode, milesBetween, ZIP_XY,
} from './data.js';
import { TEXTS, textCtx } from './texts.js';

export const STATUSES = ['requested', 'suggested', 'declined', 'expired', 'confirmed', 'fitting', 'price-change', 'in-progress', 'ready', 'awaiting-handoff', 'completed', 'cancelled'];
export const TERMINAL = ['declined', 'cancelled', 'completed'];
export const SECTIONS = ['profile', 'services', 'where', 'returns', 'availability', 'payouts'];

const clone = (x) => structuredClone(x);
const MIN_MS = 60000;
const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;

function freshSim() {
  /* network 'online'|'offline' · send 'ok'|'fail' (one-shot, D-130) · session 'valid'|'expired' · texts 'off'|'on' (K-43, D-301: the
     tailor's new-request text shows on screen — on after onboarding; off by default so a flow's baseline stays still) · payout 'ok'|'failed' · server 'ok'|'error' (one-shot, D-140) */
  /* pre-MVP A1: sms 'ok'|'undelivered' (a text to an opted-in number never arrives, D-02) · capture 'ok'|'declined' (one-shot: the next charge of a
     held balance fails, D-04) · DG-4 (D-351): payoutSetup = what the payments partner's hosted onboarding returns ('verifying' | 'verified' | 'action-needed') */
  return { latency: 'normal', card: 'ok', courier: 'ok', network: 'online', texts: 'off', send: 'ok', session: 'valid', payout: 'ok', server: 'ok', sms: 'ok', capture: 'ok', payoutSetup: 'verifying' };
}
function fresh() {
  return {
    persona: 'customer',                       // 'customer' | 'tailor' (D-21)
    clock: { now: toDate(DEMO_NOW).getTime() }, // frozen demo clock (D-09)
    session: { customer: { signedIn: true }, tailor: { signedIn: true } },
    customer: clone(CUSTOMER),
    tailors: clone(TAILORS),
    job: clone(SEED_JOB),
    appts: [],                                 // every appointment; both personas read the same objects
    threads: {},                               // { [tailorId]: { tailorId, customerId, messages: [], read: { customer, tailor } } }
    payouts: [],                               // { apptId, cents, state: 'pending'|'paid'|'failed', date, kind }
    /* pre-MVP A1 (D-02): each person's texting choice — the customer's booking texts are their own opt-in (sign-in codes always go); the
       tailor's requests + job texts. A STOP reply turns them off (stoppedAt). The seed people opted in. */
    texts: { customer: { on: true, stoppedAt: null, changedAt: null }, tailor: { on: true, stoppedAt: null, changedAt: null }, admin: { on: true, stoppedAt: null, changedAt: null } },   // A2: the admin (Kevin) gets every case by text (K-48.1)
    outbox: [],                                // every text Taily sent (or held back): { id, event, to, apptId, key, body, link, at, land, status: 'delivered'|'undelivered'|'off' }
    admin: { notifications: [] },              // K-48.1 / K-48.5: what the admin (Kevin) is told — { id, kind, apptId, caseId, text, at, read } (a-inbox, A2)
    cases: [],                                 // pre-MVP A2 (DG-1 B): Taily Help threads — see caseById / casesFor / adminInbox
    blocks: [],                                // pre-MVP A2 (S-32): { by: 'customer'|'tailor', customerId, tailorId, at } — neither can book the other
    sim: freshSim(),
    ui: {},                                    // screen-local transient UI only; the model never reads it
  };
}

export const state = fresh();

let apptSeq = 1000;
let msgSeq = 0;
let garmentSeq = 0;
let textSeq = 0;
let caseSeq = 0;
let caseMsgSeq = 0;

/** Restore every field to the seed. Keeps `sim.latency`. */
export function reset() {
  const latency = state.sim.latency;
  const f = fresh();
  for (const k of Object.keys(f)) state[k] = f[k];
  state.sim.latency = latency;
  apptSeq = 1000; msgSeq = 0; garmentSeq = 0; textSeq = 0; caseSeq = 0; caseMsgSeq = 0;
  return state;
}

const fail = (error, extra = {}) => ({ ok: false, error, ...extra });
const succeed = (appt, extra = {}) => ({ ok: true, appt, ...extra });

/* ---------- clock ---------- */
export const now = () => state.clock.now;
export const nowIso = () => isoMinute(new Date(state.clock.now));
export function setClock(iso) { state.clock.now = toDate(iso).getTime(); return state.clock.now; }
/** Run every timer that is due, each stamped at its own due time (also when the clock jumped past it). Returns the ids whose STATE moved
    (a text alone does not count): expire `requested` appointments whose reply window passed, lapse suggested times (D-154); on `confirmed`
    the 24-hour reminder, its nudge and the auto-cancel (K-41, K-43 — only after a delivered reminder, D-02), a tailor's move proposal that
    ran out (D-12) and "Did the visit happen?" (D-11 / K-48.5: ask at start + VISIT_CHECK_H, the admin at + VISIT_CHECK_ADMIN_H, cancel with a
    refund at + VISIT_CHECK_CANCEL_H); the waiting states' reminder texts and ends (D-03: a final order → Taily review, a ready order →
    in-store pickup); on `awaiting-handoff` the day-6 capture (D-04, which pays the tailor), the auto-completion of a marked pickup, a problem
    open too long → review, an abandoned order closed. Texts (start reminders, pickup today, missed pickup, review reminder) ride along. */
export function tick() {
  const moved = [];
  for (const a of state.appts) if (timersFor(a)) moved.push(a.id);
  return moved;
}
const msOf = (iso) => toDate(iso).getTime();
const stampAt = (ms) => isoMinute(new Date(ms));
function timersFor(a) {
  const t = state.clock.now;
  switch (a.status) {
    case 'requested': {
      const exp = msOf(a.expiresAt);
      if (exp <= t) return expireRequest(a.id).ok;
      const soon = exp - POLICY.EXPIRING_SOON_MIN * MIN_MS;
      if (t >= soon && a.soonTextFor !== a.expiresAt) { a.soonTextFor = a.expiresAt; notify(a, 'request-soon', { at: stampAt(Math.max(soon, msOf(a.sentAt ?? a.requestedAt))) }); }
      return false;
    }
    case 'suggested':
      if (t < suggestLapseAt(a)) return false;
      endSuggestion(a, `${firstName(tailorById(a.tailorId))}’s suggested time passed`, 'Your suggested time passed', 'lapsed');   // D-154
      return true;
    case 'confirmed': return confirmedTimers(a);
    case 'fitting': visitTexts(a); return false;
    case 'price-change': return orderTimers(a);
    case 'in-progress': editTimers(a); return false;
    case 'ready': return readyTimers(a);
    case 'awaiting-handoff': return handoffTimers(a);
    case 'completed': completedTimers(a); return false;
    default: return false;
  }
}
/** The reminder texts of a waiting state (D-03): WAIT_REMIND_1_H and WAIT_REMIND_2_H after `fromIso`, stamped into `marks`; when the clock
    jumped past both, only the latest is sent. `stopAt` (ms) = the state's own end, which supersedes a reminder due at the same time. */
function waitTexts(a, fromIso, marks, events, { stopAt = Infinity, x = {} } = {}) {
  const t = state.clock.now;
  const due = [['h24', POLICY.WAIT_REMIND_1_H], ['h72', POLICY.WAIT_REMIND_2_H]]
    .map(([k, h], i) => ({ k, at: msOf(fromIso) + h * HOUR_MS, ev: events[i] }))
    .filter((d) => t >= d.at && !marks[d.k]);
  due.forEach((d) => { marks[d.k] = stampAt(d.at); });
  const last = due[due.length - 1];
  if (last && t < stopAt) notify(a, last.ev, { at: marks[last.k], x });
}
function confirmedTimers(a) {
  const t = state.clock.now;
  let moved = remindTick(a);
  if (a.status !== 'confirmed') return true;                                     // K-43: cancelled, unconfirmed
  const start = msOf(a.slot.start);
  const p = a.proposal;
  if (p?.state === 'pending' && t >= Math.min(msOf(p.start), start) - POLICY.MIN_LEAD_H * HOUR_MS) {   // D-12: too close to either time
    Object.assign(p, { state: 'lapsed', endedAt: stampAt(Math.min(msOf(p.start), start) - POLICY.MIN_LEAD_H * HOUR_MS) });
    moved = true;
  }
  visitTexts(a);
  /* D-11 / K-48.5: nothing recorded VISIT_CHECK_H after the start → ask both; still unanswered VISIT_CHECK_ADMIN_H after the START (Kevin,
     K-50) → the admin; VISIT_CHECK_CANCEL_H after asking → a cancel with a refund */
  const askAt = start + POLICY.VISIT_CHECK_H * HOUR_MS;
  if (t >= askAt && !a.visitCheck) {
    a.visitCheck = { askedAt: stampAt(askAt), answer: null, answeredAt: null, adminAt: null };
    notify(a, 'visit-check', { at: a.visitCheck.askedAt });
    notify(a, 'visit-check-t', { at: a.visitCheck.askedAt });
    moved = true;
  }
  const vc = a.visitCheck;
  if (vc && !vc.answer) {
    const asked = msOf(vc.askedAt);
    const adminAt = start + POLICY.VISIT_CHECK_ADMIN_H * HOUR_MS;
    if (t >= adminAt && !vc.adminAt) {
      vc.adminAt = stampAt(adminAt);
      openTailyReview(a, 'visit-unanswered', { at: vc.adminAt });
      moved = true;
    }
    const closeAt = asked + POLICY.VISIT_CHECK_CANCEL_H * HOUR_MS;
    if (t >= closeAt) { closeUnrecorded(a, stampAt(closeAt)); return true; }
  }
  return moved;
}
/** Kevin (K-48 follow-up): the tailor's start texts — START_REMIND_MIN before the visit "Your visit with Sarah starts at …", and at the start
    time ONE text, "Your fitting has started. Please take all notes here:" (it stands in for a second start reminder). A clock that jumped past
    the start skips the first; one that jumped past the visit check skips both. */
function visitTexts(a) {
  const t = state.clock.now;
  const start = msOf(a.slot.start);
  const v = (a.visitDay ??= freshVisitDay());
  const soonAt = start - POLICY.START_REMIND_MIN * MIN_MS;
  if (!v.startTextAt && a.status === 'confirmed' && t >= soonAt && t < start && slotSetAt(a) <= soonAt) {
    v.startTextAt = stampAt(soonAt);
    notify(a, 'start-soon', { at: v.startTextAt });
  }
  if (!v.fittingTextAt && t >= start && t < start + POLICY.VISIT_CHECK_H * HOUR_MS) {
    v.fittingTextAt = stampAt(start);
    notify(a, 'fitting-started', { at: v.fittingTextAt });
  }
}
function freshVisitDay() { return { tailor: { onWayAt: null, hereAt: null }, customer: { onWayAt: null, hereAt: null }, startTextAt: null, fittingTextAt: null }; }
/** D-11: "Did the visit happen?" went unanswered VISIT_CHECK_CANCEL_H — the visit is cancelled and the deposit refunded; nothing is paid out. */
function closeUnrecorded(a, at) {
  setStatus(a, 'cancelled');
  a.history[a.history.length - 1].at = at;
  a.payments.deposit.state = 'refunded';
  a.cancel = { by: 'system', reason: 'no-record', at, refund: a.payments.deposit.cents, kept: 0, tailorPaid: 0 };
  closeReview(a, 'cancelled-refunded', at);
  restoreDraftIfEmpty(a);
  post(a.tailorId, 'system', 'Nobody told us the visit happened, so we cancelled it. Your deposit is refunded.', { at, tailorText: 'Nobody told us the visit happened, so we cancelled it and refunded the deposit' });
  notify(a, 'visit-closed', { at });
  notify(a, 'visit-closed-t', { at });
}
/** D-03: an unanswered final order — reminders at 24 h and 72 h, Taily review after FINAL_ORDER_REVIEW_D (counted from the latest send). */
function orderTimers(a) {
  const pc = a.priceChange;
  if (!pc || pc.state === 'approved') return false;
  const t = state.clock.now;
  const total = priceChangeView(a).after.total;
  const rev = msOf(pc.sentAt) + POLICY.FINAL_ORDER_REVIEW_D * DAY_MS;
  waitTexts(a, pc.sentAt, (pc.nudges ??= {}), ['final-order-24h', 'final-order-72h'], { stopAt: rev, x: { total } });
  if (t >= rev && !pc.reviewAt) {
    pc.reviewAt = stampAt(rev);
    openTailyReview(a, 'final-order-unanswered', { at: pc.reviewAt });
    notify(a, 'final-order-review', { at: pc.reviewAt });
    notify(a, 'final-order-review-t', { at: pc.reviewAt });
    return true;
  }
  return false;
}
/** D-03: a pending edit after the fitting — reminder texts at 24 h and 72 h (the tailor can withdraw it; K-30: Sarah can't decline). */
function editTimers(a) {
  const e = a.edit;
  if (e?.state !== 'pending') return;
  waitTexts(a, e.sentAt, (e.nudges ??= {}), ['edit-24h', 'edit-72h']);
}
/** D-03: a ready order with no way back — reminder texts at 24 h and 72 h; after READY_DEFAULT_D it defaults to in-store pickup. */
function readyTimers(a) {
  const readyAt = [...a.history].reverse().find((h) => h.status === 'ready')?.at;
  if (!readyAt) return false;
  const end = msOf(readyAt) + POLICY.READY_DEFAULT_D * DAY_MS;
  waitTexts(a, readyAt, (a.readyNudges ??= {}), ['ready-24h', 'ready-72h'], { stopAt: end });
  if (state.clock.now >= end && !a.readyDefaultAt) { defaultReturn(a, stampAt(end)); return true; }
  return false;
}
/** D-03: READY_DEFAULT_D after ready with no way back chosen — in-store pickup (when she has a shop), the balance held on the booking card,
    which starts the capture clock (D-04). No shop to pick up from → a Taily review instead. A card that declines leaves it ready, payment failed. */
function defaultReturn(a, at) {
  a.readyDefaultAt = at;
  const t = tailorById(a.tailorId);
  if (!returnOffer(a).includes('pickup') || !t?.shop?.enabled) { openTailyReview(a, 'ready-no-way-back', { at }); return; }
  a.returnOption = 'pickup';
  a.courier = null;
  repriceReturn(a);
  const charge = a.money.balance > 0;
  if (charge && state.sim.card === 'declined') {
    a.payments.balance.state = 'failed'; a.payments.balance.failedCardId = a.cardId;
    notify(a, 'card-failed', { at }); notify(a, 'card-failed-t', { at });
    return;
  }
  a.payments.balance = { cents: a.money.balance, state: charge ? 'held' : 'none', heldAt: at };
  if (a.payments.refund?.cents > 0) a.payments.refund.state = 'refunded';
  a.balanceCardId = a.cardId;
  a.handoff = freshHandoff(a, at, null);
  a.handoff.defaultedAt = at;
  setStatus(a, 'awaiting-handoff');
  a.history[a.history.length - 1].at = at;
  post(a.tailorId, 'system', `Ready for ${POLICY.READY_DEFAULT_D} days, so we set it to in-store pickup`, { at, tailorText: `${state.customer.first} didn’t choose in ${POLICY.READY_DEFAULT_D} days, so we set it to in-store pickup` });
  notify(a, 'ready-default', { at });
  notify(a, 'ready-default-t', { at });
}
/** awaiting-handoff (Study-1 A2–A3, D-03, D-04): pickup-today / missed-pickup texts, the day-6 capture (pays the tailor; a reported problem no
    longer pushes it past the card hold — it captures and goes to review), the HANDOFF_AUTO_H auto-completion (paused by a problem), a problem
    open PROBLEM_REVIEW_H → review, and ABANDONED_CLOSE_D after the charge → closed. */
function handoffTimers(a) {
  const h = a.handoff;
  if (!h) return false;
  const t = state.clock.now;
  const b = a.payments.balance;
  let moved = false;
  if (a.returnOption === 'pickup' && h.slot?.start && !h.markedAt) {
    const s0 = msOf(h.slot.start);
    const setAt = msOf(h.moved?.at ?? h.heldAt);
    const remind = s0 - POLICY.PICKUP_REMIND_H * HOUR_MS;
    if (t >= remind && t < s0 && h.todayTextFor !== h.slot.start) { h.todayTextFor = h.slot.start; notify(a, 'pickup-today', { at: stampAt(Math.max(remind, setAt)) }); }
    const missAt = s0 + POLICY.HANDOFF_SLOT_MIN * MIN_MS;
    if (t >= missAt && h.missedTextFor !== h.slot.start) { h.missedTextFor = h.slot.start; notify(a, 'missed-pickup', { at: stampAt(missAt) }); moved = true; }
  }
  const auto = h.autoAt && !h.problemAt ? msOf(h.autoAt) : Infinity;
  const cap = b.state === 'held' ? unclaimedAt(a) : Infinity;
  if (cap <= t && cap < auto) {
    const at = stampAt(cap);
    const amt = fmtExact(b.cents);
    if (captureHold(a, h.problemAt ? 'before-expiry' : 'unclaimed', at)) {
      post(a.tailorId, 'system', `We charged your ${amt} balance after ${POLICY.UNCLAIMED_CAPTURE_D} days`, { at, tailorText: `${state.customer.first}’s ${amt} was charged after ${POLICY.UNCLAIMED_CAPTURE_D} days` });
      if (h.problemAt) openTailyReview(a, 'problem-open', { at });   // D-04: the hold can't outlive the card; the payout waits for the review
      else {
        addPayout(a, a.money.payout, 'job', at);                       // D-03: the tailor is paid at the unclaimed charge
        notify(a, 'unclaimed-charged', { at });
        notify(a, 'unclaimed-t', { at });
      }
    } else {
      notify(a, 'card-failed', { at });
      notify(a, 'card-failed-t', { at });
    }
    moved = true;
  }
  if (auto <= t) { completeHandoff(a, 'auto', h.autoAt); return true; }
  if (h.problemAt && !h.problemReviewAt) {
    const r = msOf(h.problemAt) + POLICY.PROBLEM_REVIEW_H * HOUR_MS;
    if (t >= r) { h.problemReviewAt = stampAt(r); openTailyReview(a, 'problem-open', { at: h.problemReviewAt }); moved = true; }
  }
  if (b.state === 'captured' && b.capturedAt && !h.problemAt) {
    const end = msOf(b.capturedAt) + POLICY.ABANDONED_CLOSE_D * DAY_MS;
    if (t >= end) { completeHandoff(a, 'abandoned', stampAt(end)); return true; }
  }
  return moved;
}
/** K-28: the review reminder's text, once, REVIEW_REMINDER_D after completion (the Home card is computed from reviewReminderDue). */
function completedTimers(a) {
  if (a.review || a.reviewTextAt || a.handoff?.completedBy === 'abandoned') return;
  const at = a.handoff?.completedAt ?? [...a.history].reverse().find((h) => h.status === 'completed')?.at;
  if (!at) return;
  const due = msOf(at) + POLICY.REVIEW_REMINDER_D * DAY_MS;
  if (state.clock.now >= due) { a.reviewTextAt = stampAt(due); notify(a, 'review-reminder', { at: a.reviewTextAt }); }
}
/** When a suggested time stops being open (D-154): `MIN_LEAD_H` before it starts, or `SUGGEST_EXPIRY_H` after it was suggested,
    whichever comes first. Epoch ms. */
export function suggestLapseAt(a) {
  const byStart = toDate(a.suggested.start).getTime() - POLICY.MIN_LEAD_H * HOUR_MS;
  const bySent = toDate(a.suggested.at ?? a.requestedAt).getTime() + POLICY.SUGGEST_EXPIRY_H * HOUR_MS;
  return Math.min(byStart, bySent);
}
export function advanceClock(minutes) {
  state.clock.now += minutes * MIN_MS;
  return { now: state.clock.now, expired: tick() };
}
/** ms left of the reply window (0 when passed). */
export const msLeft = (appt) => Math.max(0, toDate(appt.expiresAt).getTime() - state.clock.now);

/* ---------- lookups ---------- */
export const getAppt = (id) => state.appts.find((a) => a.id === id);
function must(id) {
  const a = getAppt(id);
  if (!a) throw new Error(`Unknown appointment id "${id}"`);
  return a;
}
export const tailorById = (id) => state.tailors.find((t) => t.id === id);
const firstName = (t) => (t?.name || 'The tailor').split(' ')[0];

/** Newest first. */
export function apptsFor(persona = state.persona) {
  const mine = persona === 'tailor'
    ? state.appts.filter((a) => a.tailorId === state.tailors[0].id)
    : state.appts.filter((a) => a.customerId === state.customer.id);
  return mine.slice().reverse();
}
const isFinalExpiry = (a) => a.status === 'expired' && a.retries >= POLICY.MAX_RETRIES;
/** Newest non-terminal appointment of the customer's (an expired-for-good request is not active). */
export function activeAppt() {
  return apptsFor('customer').find((a) => !TERMINAL.includes(a.status) && !isFinalExpiry(a)) ?? null;
}

export function threadFor(tailorId) {
  return state.threads[tailorId] ?? { tailorId, customerId: state.customer.id, messages: [], read: { customer: 0, tailor: 0 } };
}
function ensureThread(tailorId) {
  if (!state.threads[tailorId]) state.threads[tailorId] = { tailorId, customerId: state.customer.id, messages: [], read: { customer: 0, tailor: 0 } };
  return state.threads[tailorId];
}
/** A message's sequence number: `m12` → 12 (the unit of `thread.read`). */
const msgNum = (m) => Number(String(m?.id ?? '').slice(1)) || 0;
/** The thread's appointment (D-129): the pair's newest one that is not terminal and not finally expired; else the newest that was not
    withdrawn / switched; else null (a question asked before any booking). */
export function threadAppt(tailorId) {
  const mine = state.appts.filter((a) => a.tailorId === tailorId).reverse();
  return mine.find((a) => !TERMINAL.includes(a.status) && !isFinalExpiry(a))
    ?? mine.find((a) => !(a.status === 'cancelled' && ['withdrawn', 'switched'].includes(a.cancel?.reason)))
    ?? null;
}
/** Messages after `read[reader]` written by the other person; system lines never count (D-128). */
export function unreadCount(tailorId, reader) {
  const th = state.threads[tailorId];
  if (!th) return 0;
  const other = reader === 'tailor' ? 'customer' : 'tailor';
  const seen = th.read?.[reader] ?? 0;
  return th.messages.filter((m) => m.from === other && msgNum(m) > seen).length;
}
/** One line for a Messages row, from the reader's point of view. */
export function threadPreview(msg, reader = 'customer') {
  if (!msg) return '';
  if (msg.from === 'system') return reader === 'tailor' ? (msg.tailorText ?? msg.text) : msg.text;
  const text = String(msg.text ?? '').replace(/\[(phone|email) hidden\]/g, '($1 hidden)').trim();
  const n = msg.photos || 0;
  const photo = n > 1 ? `${n} photos` : n === 1 ? 'Photo' : '';
  const body = photo && text ? `${photo} · ${text}` : photo || text;
  return msg.from === reader ? `You: ${body}` : body;
}
/** Threads with at least one message for that reader, newest activity first (ties by sequence). */
export function threadsFor(reader = 'customer') {
  const mineId = state.tailors[0].id;
  return Object.values(state.threads)
    .filter((th) => th.messages.length && (reader === 'customer' || th.tailorId === mineId))
    .map((thread) => ({
      tailorId: thread.tailorId, thread, last: thread.messages[thread.messages.length - 1],
      unread: unreadCount(thread.tailorId, reader), appt: threadAppt(thread.tailorId), readOnly: threadReadOnly(thread.tailorId),
    }))
    .sort((a, b) => (a.last.at < b.last.at ? 1 : a.last.at > b.last.at ? -1 : msgNum(b.last) - msgNum(a.last)));
}
/** Read-only after a decline, until the customer books this tailor again — and never while another job with her is still live (SF-01). */
export function threadReadOnly(tailorId) {
  if (isBlocked(tailorId)) return true;                                               // S-32 (A2): a block closes the chat both ways
  const mine = state.appts.filter((a) => a.tailorId === tailorId);
  const latest = mine[mine.length - 1];
  return !!latest && latest.status === 'declined' && !mine.some((a) => !TERMINAL.includes(a.status) && a.status !== 'expired');
}
function post(tailorId, from, text, extra = {}) {
  const msg = { id: `m${++msgSeq}`, from, text, photos: 0, at: nowIso(), masked: false, ...extra };
  ensureThread(tailorId).messages.push(msg);
  return msg;
}
/** A system line is written from the READER's point of view (R3-2-T-05): `text` is what Sarah reads, `tailorText` what Amara reads
    (same string when the line is neutral). Thread screens print `m.tailorText ?? m.text` on the tailor side (D-98). */
const say = (appt, text, tailorText = text) => post(appt.tailorId, 'system', text, { tailorText });
function setStatus(appt, status) {
  appt.status = status;
  appt.history.push({ status, at: nowIso() });
}

/* ---------- contact masking ---------- */
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_RE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
export function maskContact(text) {
  const src = String(text ?? '');
  const out = src.replace(EMAIL_RE, '[email hidden]').replace(PHONE_RE, '[phone hidden]');
  return { text: out, masked: out !== src };
}

/* ---------- the job draft ---------- */
export function setJob(patch) { Object.assign(state.job, patch); return { ok: true, job: state.job }; }
/** P-34 (D-358): "Text me when a tailor covers 11201" — the customer's area waitlist (one text when a tailor starts covering the ZIP). */
export function joinAreaWaitlist(zip = state.job.zip) {
  const z = String(zip ?? '').trim();
  if (!/^\d{5}$/.test(z)) return fail('zip-invalid');
  const list = (state.customer.areaWaitlist ??= []);
  if (list.includes(z)) return { ok: true, already: true, zip: z };
  list.push(z);
  return { ok: true, zip: z };
}
/** On the customer's area waitlist for this ZIP. */
export const onAreaWaitlist = (zip = state.job.zip) => (state.customer.areaWaitlist ?? []).includes(String(zip ?? ''));
/** A fresh draft for a different job: no garments yet, same place, empty declined / hidden lists. */
export function newJob() {
  const home = state.customer.address;                          // null when Sarah removed every saved address (D-133)
  state.job = { garments: [], visitType: 'home', zip: home?.zip ?? state.job.zip, address: home ? { ...home } : null, needBy: state.job.needBy, declinedBy: [], hiddenTailors: [] };
  return { ok: true, job: state.job };
}
export function addGarment(type) {
  if (state.job.garments.length >= MAX_ITEMS) return fail('max-items');
  if (!GARMENT_TYPES[type]) return fail('unknown-type');
  garmentSeq = Math.max(garmentSeq, ...state.job.garments.map((g) => Number(String(g.id).slice(1)) || 0)) + 1;
  const garment = { id: `g${garmentSeq}`, type, services: [], photos: 0 };
  state.job.garments.push(garment);
  return { ok: true, garment, job: state.job };
}
export function removeGarment(id) {
  const i = state.job.garments.findIndex((g) => g.id === id);
  if (i < 0) return fail('unknown-garment');
  state.job.garments.splice(i, 1);
  return { ok: true, job: state.job };
}
export function setServices(garmentId, ids) {
  const g = state.job.garments.find((x) => x.id === garmentId);
  if (!g) return fail('unknown-garment');
  if (ids.some((id) => !SERVICES[id]?.garments.includes(g.type))) return fail('service-not-for-type');
  g.services = [...ids];
  return { ok: true, garment: g, job: state.job };
}
/** step: 'what' | 'where' | omitted (both). → { ok, errors: { field: code } } */
export function validateJob(job = state.job, step = null) {
  const errors = {};
  if (step !== 'where') {
    if (!job.garments?.length) errors.garments = 'no-garments';
    for (const g of job.garments ?? []) if (!g.services?.length) errors[`service:${g.id}`] = `no-service:${g.id}`;
  }
  if (step !== 'what') {
    if (!/^\d{5}$/.test(String(job.zip ?? ''))) errors.zip = 'zip-invalid';
    if (job.visitType === 'home' && !String(job.address?.street ?? '').trim()) errors.address = 'address-required';
    const tomorrow = isoDay(addDays(strip(new Date(state.clock.now)), 1));
    if (!job.needBy) errors.needBy = 'needby-required';
    else if (job.needBy < tomorrow) errors.needBy = 'needby-past';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

/* ---------- tailor sections (M2 fills in the screens) ---------- */
/** Every onboarding section valid (what she set up). */
export const sectionsDone = (tailor) => !!tailor && SECTIONS.every((s) => tailor.onboarding?.[s]);
/** D-18 (D-353): under YEARS_MIN years tailoring she is on the waitlist — never listed, whatever else passed. */
export const waitlisted = (tailor) => tailor?.years != null && tailor.years !== '' && Number(tailor.years) < TAILOR_LIMITS.YEARS_MIN;

/* ---------- DG-4 (option B, D-350…D-352): the four checks ---------- */
/** One check's state: 'not-started' | 'pending' | 'needs-info' | 'verified' (+ 'waitlist' for years under the minimum).
    payout maps the partner's status: verifying → pending, action-needed → needs-info, verified / paused → verified (a pause is about
    paying her, not about who she is: she stays listed and Earnings says it). */
export function checkState(tailor, id) {
  const t = tailor ?? {};
  if (id === 'id') return t.verify?.id?.state ?? 'not-started';
  if (id === 'background') return t.verify?.background?.state ?? 'not-started';
  if (id === 'years') return t.years == null || t.years === '' ? 'not-started' : waitlisted(t) ? 'waitlist' : 'verified';
  if (id === 'payout') {
    const st = t.payouts?.status ?? 'not-started';
    return { verifying: 'pending', 'action-needed': 'needs-info', verified: 'verified', paused: 'verified' }[st] ?? 'not-started';
  }
  return 'not-started';
}
/** The checklist: `{ items: [{ id, label, state }], passed, total, allPassed, needsYou: [ids], pending: [ids] }` (VERIFY_ITEMS order). */
export function verifyView(tailor = state.tailors[0]) {
  const items = VERIFY_ITEMS.map((v) => ({ ...v, state: checkState(tailor, v.id) }));
  const passed = items.filter((i) => i.state === 'verified').length;
  return {
    items, passed, total: items.length, allPassed: passed === items.length,
    needsYou: items.filter((i) => ['not-started', 'needs-info'].includes(i.state)).map((i) => i.id),
    pending: items.filter((i) => i.state === 'pending').map((i) => i.id),
  };
}
/** Every check passed. */
export const checksPassed = (tailor) => !!tailor && verifyView(tailor).allPassed;
/** K-15 (D-350): the Verified check customers see — only when every check passed. Derived, never stored (no hard-coded `verified`). */
export const isVerified = (tailor) => checksPassed(tailor);
/** Set up, not waitlisted, and — while POLICY.LIVE_REQUIRES_VERIFIED (Kevin: gated) — every check passed. */
export const bookable = (tailor) => sectionsDone(tailor) && !waitlisted(tailor) && (!POLICY.LIVE_REQUIRES_VERIFIED || checksPassed(tailor));
/** Customers see her: she went live (submitted + bookable, sticky D-56) and is still bookable. */
export const listed = (tailor) => !!tailor?.live && bookable(tailor);
/** Onboarding is behind her (she submitted, or went live): the to-* screens are her Shop editors (D-56 editing mode). */
export const onboarded = (tailor) => !!(tailor?.submitted || tailor?.live);
/** `live` turns true the first time a SUBMITTED tailor is bookable, and never back (D-56; Finish later never takes her live, SF-02). */
function syncLive(t) {
  if (t.submitted && bookable(t) && !t.live) { t.live = true; t.liveAt = nowIso(); return true; }
  return false;
}
/* Merge A1 + B1 (js/texts.js rows owned by B1): the verification texts go through A1's notify() — 'check-action-needed' when a check turns
   "needs info", 'verified' the moment the last of the four checks passes. Every transition that can move a check calls this with the view
   it read before. */
const CHECK_WORDS = { id: 'your ID and profile photo', background: 'your background check', years: 'your years tailoring', payout: 'your payout and tax info' };
function verifyTexts(t, before) {
  const after = verifyView(t);
  const was = Object.fromEntries(before.items.map((i) => [i.id, i.state]));
  for (const i of after.items) if (i.state === 'needs-info' && was[i.id] !== 'needs-info') notify(null, 'check-action-needed', { x: { check: CHECK_WORDS[i.id] ?? i.label } });
  if (after.allPassed && !before.allPassed) notify(null, 'verified');
  return after;
}

/* ---------- S-42 (D-357): distances from HER address, not the seed's ---------- */
/** Where customers come to (her shop), as a grid point; null without a shop. */
export const shopPoint = (tailor) => (tailor?.shop?.enabled ? geocode(tailor.shop) : null);
/** Where the courier collects finished orders: the shop, else her private courier address (B-15). */
export const collectPoint = (tailor) => (tailor?.shop?.enabled ? geocode(tailor.shop) : geocode(tailor?.collect ?? {}));
/** Miles from her shop to a customer ZIP (null without a shop or outside Taily). */
export const milesToShop = (tailor, zip) => milesBetween(shopPoint(tailor), geocode({ zip }));
/** Courier miles for an appointment: where the courier collects → the customer's ZIP (0 when unknown). */
export const courierMiles = (appt) => milesBetween(collectPoint(tailorById(appt?.tailorId)), geocode({ zip: appt?.job?.zip })) ?? 0;
/** The one line of the courier's pickup address (B-15): "40 Mercer St, 2F" (shop street without a unit when she has a shop). */
export function collectAddress(tailor) {
  const src = tailor?.shop?.enabled ? tailor.shop : tailor?.collect;
  if (!src?.street) return '';
  return [src.street, src.unit].filter(Boolean).join(', ');
}
const hasWindow = (avail) => Object.values(avail ?? {}).some((w) => (w ?? []).length > 0);
const blank = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
const isWhole = (n) => Number.isInteger(n);
const zip5 = (z) => /^\d{5}$/.test(String(z ?? ''));
const overlaps = (a, b) => (a ?? []).some(([o1, c1]) => (b ?? []).some(([o2, c2]) => o1 < c2 && o2 < c1));   // touching is fine
const SECTION_RULES = {
  profile: (d) => {
    const e = {};
    if (!String(d.name ?? '').trim()) e.name = 'name-required';
    const bio = String(d.bio ?? '').trim();
    if (!bio) e.bio = 'bio-required';
    else if (bio.length > TAILOR_LIMITS.BIO_MAX) e.bio = 'bio-long';
    /* K-19: the list-card line is required and short; the profile photo is required (no going live without either) */
    const line = String(d.cardLine ?? '').trim();
    if (!line) e.cardLine = 'cardline-required';
    else if ([...line].length > TAILOR_LIMITS.CARD_LINE_MAX) e.cardLine = 'cardline-long';
    if (!d.photo) e.photo = 'photo-required';
    /* DG-4 (D-350): the first check, "ID and profile photo" — a photo ID we match to the profile photo; D-18: years tailoring, a whole number */
    if (!d.idDoc) e.idDoc = 'id-required';
    const y = d.years;
    if (y == null || String(y).trim() === '') e.years = 'years-required';
    else if (!isWhole(Number(y)) || Number(y) < 0 || Number(y) > TAILOR_LIMITS.YEARS_MAX) e.years = 'years-invalid';
    return e;
  },
  services: (d) => {
    const e = {};
    const entries = Object.entries(d.prices ?? {});
    if (!entries.length) { e.prices = 'no-services'; return e; }
    for (const [id, raw] of entries) {
      const n = blank(raw) ? NaN : Number(raw);
      if (!(n > 0)) e[`price-${id}`] = 'price-missing';
      else if (!isWhole(n) || n > TAILOR_LIMITS.PRICE_MAX) e[`price-${id}`] = 'price-invalid';
    }
    return e;
  },
  where: (d) => {
    const e = {};
    if (!d.shop?.enabled && !d.home?.enabled) e.where = 'where-required';
    if (d.shop?.enabled) {
      if (!String(d.shop.street ?? '').trim()) e.street = 'street-required';
      if (!zip5(d.shop.zip)) e.shopZip = 'zip-invalid';
      else if (!placeForZip(d.shop.zip)) e.shopZip = 'zip-unserved';   // S-42: "Taily isn't in that area yet."
    }
    /* B-15 (D-356): no shop → the courier is her only way back, so it needs somewhere to collect from (private: customers never see it) */
    if (!d.shop?.enabled && d.home?.enabled) {
      const c = d.collect ?? {};
      if (!String(c.street ?? '').trim()) e.collectStreet = 'street-required';
      if (!zip5(c.zip)) e.collectZip = 'zip-invalid';
      else if (!placeForZip(c.zip)) e.collectZip = 'zip-unserved';
      if ([...String(c.notes ?? '')].length > TAILOR_LIMITS.COURIER_NOTE_MAX) e.collectNotes = 'note-long';
    }
    if (d.home?.enabled) {
      /* Study-1 C5: the neighborhoods are the source of truth; `home.zips` is derived from them (setTailorSection) */
      const hoods = d.home.hoods ?? [];
      if (!hoods.length) e.hoods = 'hoods-required';
      else if (!hoods.every((id) => HOOD_BY_ID[id])) e.hoods = 'hood-unknown';
      const fee = d.home.fee;
      if (blank(fee) || Number.isNaN(Number(fee))) e.fee = 'fee-missing';
      else if (!isWhole(Number(fee)) || Number(fee) < 0 || Number(fee) > TAILOR_LIMITS.FEE_MAX) e.fee = 'fee-invalid';
    }
    return e;
  },
  returns: (d) => {
    const e = {};
    const r = d.returns ?? {};
    if (!Object.values(r).some(Boolean)) e.returns = 'return-required';
    if (r.pickup && d.shop && !d.shop.enabled) e.pickup = 'pickup-needs-shop';
    return e;
  },
  availability: (d) => {
    const e = {};
    const av = d.availability ?? {};
    for (const type of ['shop', 'home']) {
      if (!d[type]?.enabled) continue;
      if (!hasWindow(av[type])) e[type] = 'hours-required';
      for (const [day, wins] of Object.entries(av[type] ?? {})) {
        if ((wins ?? []).some(([o, c]) => minutesOf(o) >= minutesOf(c))) e[`${type}-${day}`] = 'hours-range';
      }
    }
    if (d.shop?.enabled && d.home?.enabled) {
      for (const day of Object.keys(av.shop ?? {})) if (overlaps(av.shop[day], av.home?.[day])) e[`overlap-${day}`] = 'hours-overlap';
    }
    return e;
  },
  payouts: (d) => {
    const e = {};
    const p = d.payouts ?? {};
    /* D-06 (D-351): the payments partner's hosted onboarding is the step; its return carries the bank (name + last 4) */
    if ((p.status ?? 'not-started') === 'not-started') e.setup = 'setup-required';
    if (!String(p.holder ?? '').trim()) e.holder = 'holder-required';
    if (!/^\d{9}$/.test(String(p.routing ?? ''))) e.routing = 'routing-invalid';
    if (!/^\d{4}$/.test(String(p.last4 ?? ''))) e.last4 = 'account-invalid';
    if (!String(p.bank ?? '').trim()) e.bank = 'bank-required';
    return e;
  },
};
/** `data` is tailor-shaped (the fields of that section; the whole tailor works too). */
export function validateSection(section, data = state.tailors[0]) {
  const rule = SECTION_RULES[section];
  if (!rule) return { ok: false, errors: { section: 'unknown-section' } };
  const errors = rule(data ?? {});
  return { ok: Object.keys(errors).length === 0, errors, soft: SECTION_SOFT[section]?.(data ?? {}) ?? {} };
}
/** Soft notes (D-162): never block a save. The profile's bio, card line and shop name hide a phone number or email (`maskContact`) when saved. */
const SECTION_SOFT = {
  profile: (d) => {
    const soft = {};
    if (maskContact(d.bio).masked) soft.bio = 'contact-hidden';
    if (maskContact(d.cardLine).masked) soft.cardLine = 'contact-hidden';
    if (maskContact(d.shopName).masked) soft.shopName = 'contact-hidden';
    return soft;
  },
};
const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v);
function deepMerge(target, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete target[k];
    else if (isPlain(v) && isPlain(target[k])) deepMerge(target[k], v);
    else target[k] = clone(v);
  }
  return target;
}
const REPLACED = ['prices', 'availability'];   // a patch replaces these (so an unticked service / closed day disappears)
/** Merge `patch` into the (only) tailor and re-derive that section's onboarding flag; `live` turns true the first time
    the tailor is bookable and never back (D-56). */
export function setTailorSection(section, patch) {
  if (!SECTIONS.includes(section)) return fail('unknown-section');
  const t = state.tailors[0];
  const checksBefore = verifyView(t);
  const rest = { ...patch };
  for (const k of REPLACED) {
    if (!(k in rest)) continue;
    t[k] = Object.fromEntries(Object.entries(rest[k] ?? {}).filter(([, v]) => v !== undefined).map(([id, v]) => [id, clone(v)]));
    delete rest[k];
  }
  const idBefore = t.idDoc;
  deepMerge(t, rest);
  if (section === 'where' && t.home) t.home.zips = zipsForHoods(t.home.hoods);   // Study-1 C5: zips follow the neighborhoods, so eligible() keeps matching on zips
  /* S-42 (D-357): the shop's neighborhood, city and state come from its ZIP (10013 → SoHo, New York, NY), never a fixed "Brooklyn" */
  if (section === 'where' && t.shop) { const pl = placeForZip(t.shop.zip); if (pl) Object.assign(t.shop, { hood: pl.hood, city: pl.city, state: pl.state }); }
  /* DG-4: a photo ID handed in (first time, or again after "needs info") starts the ID and profile photo check */
  if (section === 'profile' && t.idDoc && (!idBefore || t.verify?.id?.state === 'needs-info') && ['not-started', 'needs-info'].includes(t.verify?.id?.state ?? 'not-started')) {
    t.verify = { ...(t.verify ?? {}), id: { state: 'pending', at: nowIso() } };
  }
  let soft = {};
  if (section === 'profile') {
    soft = validateSection(section, t).soft;                    // D-162: what she typed, before the mask
    if ('bio' in soft) t.bio = maskContact(t.bio).text;
    if ('cardLine' in soft) t.cardLine = maskContact(t.cardLine).text;
    if ('shopName' in soft) t.shopName = maskContact(t.shopName).text;
  }
  const v = validateSection(section, t);
  t.onboarding[section] = v.ok;
  /* SF-22: where she works decides what Returns (pickup needs a shop) and Availability (hours per way she works) need — recheck both */
  if (section === 'where') for (const dep of ['returns', 'availability']) t.onboarding[dep] = validateSection(dep, t).ok;
  syncLive(t);
  verifyTexts(t, checksBefore);
  return { ok: true, tailor: t, valid: v.ok, errors: v.errors, soft, bookable: bookable(t), live: !!t.live };
}
/** D-161: the shop's "Taking requests" switch. Off, eligible() answers nothing-open for new requests; booked jobs are untouched. */
export function setTakingRequests(on) {
  const t = state.tailors[0];
  t.takingRequests = !!on;
  return { ok: true, tailor: t, takingRequests: t.takingRequests };
}
/** Payouts: the full account number is validated here and never stored — only its last 4 (D-63). Blank account keeps
    the stored last4 (edit mode) only while the routing number is unchanged — a new bank needs its account number. */
export function setPayouts({ holder = '', routing = '', account = '' } = {}) {
  const t = state.tailors[0];
  const h = String(holder).trim();
  const r = String(routing).trim();
  const a = String(account).replace(/\s/g, '');
  const errors = {};
  if (!h) errors.holder = 'holder-required';
  if (!/^\d{9}$/.test(r)) errors.routing = 'routing-invalid';
  const keep = !!t.payouts?.last4 && r === String(t.payouts?.routing ?? '');
  if (a ? !/^\d{4,17}$/.test(a) : !keep) errors.account = 'account-invalid';
  if (Object.keys(errors).length) return { ok: false, errors };
  const status = (t.payouts?.status ?? 'not-started') === 'not-started' ? 'verifying' : t.payouts.status;   // D-351: the partner returned bank details
  const res = setTailorSection('payouts', { payouts: { holder: h, routing: r, bank: ROUTING_BANKS[r] ?? 'Your bank', last4: a ? a.slice(-4) : t.payouts.last4, status } });
  /* D-136: new bank details re-queue every payout the bank sent back, for the next Friday */
  let requeued = 0;
  let requeuedCents = 0;
  for (const p of state.payouts) {
    if (p.state !== 'failed') continue;
    p.state = 'pending'; p.date = payoutDay(nowIso()); p.retried = true;
    delete p.failedAt; delete p.bank; delete p.last4;
    requeued += 1; requeuedCents += p.cents;
  }
  return { ok: true, tailor: res.tailor, bookable: res.bookable, live: res.live, requeued, requeuedCents };
}
/** Rush editor draft `{ on, fees: { 1, 2, 3 } }` → `{ ok } | { ok: false, errors: { d1: code, … } }` (D-64). */
export function validateRush({ on = false, fees = {} } = {}) {
  if (!on) return { ok: true, errors: {} };
  const errors = {};
  for (const d of RUSH_TIERS) {
    const raw = fees[d];
    const n = blank(raw) ? NaN : Number(raw);
    if (Number.isNaN(n)) errors[`d${d}`] = 'fee-missing';
    else if (!isWhole(n) || n < 0 || n > TAILOR_LIMITS.RUSH_MAX) errors[`d${d}`] = 'fee-invalid';
    else if (d > 1 && !errors[`d${d - 1}`] && !blank(fees[d - 1]) && n > Number(fees[d - 1])) errors[`d${d}`] = 'fee-order';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
export function setRush(draft = {}) {
  const v = validateRush(draft);
  if (!v.ok) return { ok: false, errors: v.errors };
  const t = state.tailors[0];
  t.rush = draft.on ? RUSH_TIERS.map((days) => ({ days, fee: Number(draft.fees[days]) })).filter((r) => r.fee > 0) : [];
  return { ok: true, tailor: t };
}
/* ---------- DG-4 (option B): verification + the hosted payout step (D-350…D-355) ---------- */
/** The tailor's own photo ID, handed in again (Shop, after "needs info"): the ID and profile photo check runs again. */
export function uploadId() {
  const t = state.tailors[0];
  if (!t.photo) return fail('photo-required');
  if (checkState(t, 'id') === 'verified') return fail('already-verified');
  t.idDoc = true;
  t.verify = { ...(t.verify ?? {}), id: { state: 'pending', at: nowIso() } };
  t.onboarding.profile = validateSection('profile', t).ok;
  return { ok: true, tailor: t };
}
/** Background check consent (FCRA disclosure + NYC Fair Chance notice; the copy is a placeholder for counsel). Starts the check. */
export function consentBackground(agree) {
  const t = state.tailors[0];
  if (!agree) return fail('consent-required');
  const bg = t.verify?.background ?? { state: 'not-started' };
  if (bg.consentAt && bg.state !== 'not-started') return { ok: true, tailor: t, already: true };
  t.verify = { ...(t.verify ?? {}), background: { state: 'pending', consentAt: nowIso(), at: null } };
  return { ok: true, tailor: t };
}
/** PROTOTYPE of the payments partner's hosted onboarding (production: Stripe Connect Express — legal name, date of birth, SSN or EIN,
    the W-9 and the bank all live with the partner). Returning from it: the bank (name + last 4) and the partner's statuses, from
    `sim.payoutSetup` — 'verifying' (default), 'verified' or 'action-needed' (date of birth doesn't match the SSN). `newBank` = she
    changed accounts there (Update bank details): a payout the bank sent back is queued again (D-136). */
export function setupPayouts({ newBank = false } = {}) {
  const t = state.tailors[0];
  const outcome = state.sim.payoutSetup ?? 'verifying';
  const first = (t.payouts?.status ?? 'not-started') === 'not-started';
  const checksBefore = verifyView(t);
  const bank = newBank ? { routing: '026009593', account: '000987654321' } : first || !t.payouts?.last4 ? { routing: '021000021', account: '000123456789' } : { routing: t.payouts.routing, account: '' };
  const r = setPayouts({ holder: t.payouts?.holder || t.name || 'Your name', ...bank });
  if (!r.ok) return r;
  const at = nowIso();
  const p = t.payouts;
  if (outcome === 'verified') Object.assign(p, { status: 'verified', identity: 'verified', tax: 'verified', taxAt: p.taxAt ?? at, issue: null, issueDue: null });
  else if (outcome === 'action-needed') Object.assign(p, { status: 'action-needed', identity: 'needs-info', tax: p.tax === 'verified' ? 'verified' : 'received', taxAt: p.taxAt ?? at, issue: 'dob-mismatch', issueDue: null });
  else Object.assign(p, { status: p.status === 'verified' && !first ? 'verified' : 'verifying', identity: p.identity === 'verified' ? 'verified' : 'verifying', tax: p.tax === 'verified' ? 'verified' : 'received', taxAt: p.taxAt ?? at, issue: null, issueDue: null });
  t.onboarding.payouts = validateSection('payouts', t).ok;
  syncLive(t);
  verifyTexts(t, checksBefore);
  return { ok: true, tailor: t, status: p.status, requeued: r.requeued, requeuedCents: r.requeuedCents, live: !!t.live };
}
/** The partner pauses payouts (months later: it needs her to confirm her tax info, the W-9). She stays listed; Fridays wait (settlePayouts). */
export function pausePayouts() {
  const t = state.tailors[0];
  if (t.payouts?.status !== 'verified') return fail('not-verified');
  Object.assign(t.payouts, { status: 'paused', tax: 'needs-info', issue: 'tax', issueDue: isoDay(addDays(new Date(state.clock.now), POLICY.PAYOUT_FIX_D)) });
  return { ok: true, tailor: t };
}
/** Confirming the tax info in the partner's screens lifts the pause; the waiting payouts go out on the next Friday run. */
export function confirmTaxInfo() {
  const t = state.tailors[0];
  if (t.payouts?.status !== 'paused') return fail('not-paused');
  Object.assign(t.payouts, { status: 'verified', tax: 'verified', taxAt: nowIso(), issue: null, issueDue: null });
  return { ok: true, tailor: t };
}
/** Onboarding done: every section set up → submitted ("We review in 1 to 2 days"); live at once only if every check already passed.
    Errors: sections-incomplete (+ missing) · waitlist (years under the minimum). */
export function submitOnboarding() {
  const t = state.tailors[0];
  const missing = SECTIONS.filter((x) => !t.onboarding?.[x]);
  if (missing.length) return fail('sections-incomplete', { missing });
  if (waitlisted(t)) return fail('waitlist');
  if (!t.submitted) { t.submitted = true; t.submittedAt = nowIso(); }
  const wentLive = syncLive(t);
  return { ok: true, tailor: t, live: !!t.live, wentLive, view: verifyView(t) };
}
/** Taily's review (and the partner's webhook) comes back. `outcome` = { id, background, payout } each 'verified' | 'needs-info';
    a check not named that is pending passes. A submitted tailor whose four checks all passed goes live (D-352). */
export function reviewChecks(outcome = {}) {
  const t = state.tailors[0];
  const at = nowIso();
  const checksBefore = verifyView(t);
  const res = (id) => outcome[id] ?? (checkState(t, id) === 'pending' ? 'verified' : null);
  const idR = res('id');
  if (idR && checkState(t, 'id') !== 'not-started') t.verify.id = { state: idR, at };
  const bgR = res('background');
  if (bgR && checkState(t, 'background') !== 'not-started') t.verify.background = { ...t.verify.background, state: bgR, at };
  const pR = res('payout');
  if (pR && (t.payouts?.status ?? 'not-started') !== 'not-started') {
    if (pR === 'verified') Object.assign(t.payouts, { status: t.payouts.status === 'paused' ? 'paused' : 'verified', identity: 'verified', tax: t.payouts.tax === 'needs-info' ? 'needs-info' : 'verified', issue: t.payouts.status === 'paused' ? t.payouts.issue : null });
    else Object.assign(t.payouts, { status: 'action-needed', identity: 'needs-info', issue: 'dob-mismatch' });
  }
  t.onboarding.profile = validateSection('profile', t).ok;
  const wentLive = syncLive(t);
  return { ok: true, tailor: t, live: !!t.live, wentLive, view: verifyTexts(t, checksBefore) };
}

/** The first onboarding section not yet valid, or null. */
export const nextSection = (tailor = state.tailors[0]) => SECTIONS.find((s) => !tailor?.onboarding?.[s]) ?? null;
/** Onboarding flows start from a blank profile with the same id (D-20). */
export function blankTailor() { state.tailors[0] = clone(BLANK_TAILOR); return state.tailors[0]; }

/* ---------- slots ---------- */
function busyIntervals(tailorId, exclude) {
  const out = [];
  for (const a of state.appts) {
    if (a.tailorId !== tailorId || a.id === exclude) continue;
    const starts = [];
    if (a.status === 'requested' || a.status === 'confirmed') starts.push(a.slot.start);
    else if (a.status === 'suggested') starts.push(a.suggested.start);
    if (a.status === 'confirmed' && a.proposal?.state === 'pending') starts.push(a.proposal.start);   // D-12: the asked-for time is held too
    for (const start of starts) {
      const from = toDate(start).getTime();
      out.push([from, from + VISIT_MINUTES[a.job.visitType] * MIN_MS, a.job.visitType]);
    }
  }
  return out;
}
/** Open visit starts (ISO strings) for one tailor: the tailor's own weekly hours, 9 AM–9 PM, on :00 / :30,
    at least MIN_LEAD_H ahead, on a day before `until` (the need-by, D-18), clear of that tailor's other bookings. */
export function openSlots(tailorId, visitType, { until = null, exclude = null } = {}) {
  const t = tailorById(tailorId);
  if (!t || !t[visitType]?.enabled) return [];
  const windows = t.availability?.[visitType] ?? {};
  const dur = VISIT_MINUTES[visitType];
  const earliest = state.clock.now + POLICY.MIN_LEAD_H * HOUR_MS;
  const today = strip(new Date(state.clock.now));
  const horizon = addDays(today, SLOT_HORIZON_DAYS);
  const busy = busyIntervals(tailorId, exclude);
  const slots = [];
  for (let d = today; d < horizon; d = addDays(d, 1)) {
    if (until && dayDiff(d, until) < 1) break;
    for (const [open, close] of windows[weekdayKey(d)] ?? []) {
      const from = Math.max(minutesOf(open), DAY_START_MIN);
      const to = Math.min(minutesOf(close), DAY_END_MIN);
      for (let m = Math.ceil(from / SLOT_STEP_MIN) * SLOT_STEP_MIN; m + dur <= to; m += SLOT_STEP_MIN) {
        const start = new Date(d); start.setHours(Math.floor(m / 60), m % 60, 0, 0);   // wall-clock, so a DST changeover day keeps its hours
        const s = start.getTime();
        if (s < earliest) continue;
        /* D-13: TRAVEL_BUFFER_MIN of free time on each side of a home visit (hers or the new one) */
        if (busy.some(([a, b, type]) => { const g = (type === 'home' || visitType === 'home') ? POLICY.TRAVEL_BUFFER_MIN * MIN_MS : 0; return s < b + g && a - g < s + dur * MIN_MS; })) continue;
        slots.push(isoMinute(start));
      }
    }
  }
  return slots;
}
export const nextOpening = (tailorId, visitType, opts) => openSlots(tailorId, visitType, opts)[0] ?? null;
const slotEnd = (startIso, visitType) => isoMinute(addMinutes(startIso, VISIT_MINUTES[visitType]));

/* ---------- eligibility + the list ---------- */
const areaReason = (tailor, job) => {
  if (!listed(tailor)) return job.visitType === 'shop' ? 'shop-off' : 'zip';   // D-27; DG-4: only a live tailor whose checks passed (D-352)
  if (job.visitType === 'home') return tailor.home?.enabled && tailor.home.zips.includes(job.zip) ? null : 'zip';
  if (!tailor.shop?.enabled) return 'shop-off';
  return (milesToShop(tailor, job.zip) ?? Infinity) <= SHOP_RADIUS_MI ? null : 'zip';   // D-19; S-42: from HER shop
};
/** K-48.2 / D-08 (D-354): she prices every service the job needs — else she is never listed or recommended for it. */
export const coversJob = (tailor, job = state.job) => !linesFor(tailor, job.garments).missing.length;
/** → { ok, reason: 'zip' | 'shop-off' | 'services' | 'hidden' | 'declined' | 'nothing-open' } */
export function eligible(tailor, job = state.job) {
  const area = areaReason(tailor, job);
  if (area) return { ok: false, reason: area };
  if (isBlocked(tailor.id)) return { ok: false, reason: 'blocked' };                  // S-32 (A2): either of them blocked the other
  if (!coversJob(tailor, job)) return { ok: false, reason: 'services' };
  if ((job.hiddenTailors ?? []).includes(tailor.id)) return { ok: false, reason: 'hidden' };
  if ((job.declinedBy ?? []).includes(tailor.id)) return { ok: false, reason: 'declined' };
  if (tailor.takingRequests === false) return { ok: false, reason: 'nothing-open' };   // D-161: paused from her shop; jobs already booked are untouched
  if (!nextOpening(tailor.id, job.visitType, { until: job.needBy })) return { ok: false, reason: 'nothing-open' };
  return { ok: true, reason: null };
}
/** Quote for a draft job with the tailor's next opening deciding the rush tier. */
export function estimateNext(tailor, job = state.job) {
  return estimate(tailor, job, nextOpening(tailor.id, job.visitType, { until: job.needBy }));
}
/** → { rows: [{ tailor, quote, distanceMi, nextOpening, declined }], empty: null | 'zip' | 'shop' | 'services' | 'nothing-open' | 'none-left' }
    precedence: area filter → every item covered (K-48.2) → hidden → open slots. A declined tailor stays as a row (D-08). */
export function tailorsFor(job = state.job) {
  const inArea = [];
  let area = null;
  for (const t of state.tailors) {
    const r = areaReason(t, job);
    if (r) area = area ?? r; else inArea.push(t);
  }
  if (!inArea.length) return { rows: [], empty: area === 'shop-off' ? 'shop' : 'zip' };
  const capable = inArea.filter((t) => coversJob(t, job));      // K-48.2 (D-354): never a tailor who can't do every item
  if (!capable.length) return { rows: [], empty: 'services' };
  const shown = capable.filter((t) => !(job.hiddenTailors ?? []).includes(t.id) && !isBlocked(t.id));   // S-32 (A2): a block hides her
  if (!shown.length) return { rows: [], empty: 'none-left' };
  const rows = [];
  for (const t of shown) {
    if (t.takingRequests === false) continue;                    // D-161
    const next = nextOpening(t.id, job.visitType, { until: job.needBy });
    if (!next) continue;
    rows.push({
      tailor: t, quote: estimate(t, job, next), distanceMi: milesToShop(t, job.zip),
      nextOpening: next, declined: (job.declinedBy ?? []).includes(t.id),
    });
  }
  return { rows, empty: rows.length ? null : 'nothing-open' };
}

/* ---------- the booking machine ---------- */
const jobCopy = (job) => ({ garments: clone(job.garments), visitType: job.visitType, zip: job.zip, address: job.address ? clone(job.address) : null, needBy: job.needBy });
/** Put an appointment's job back as the draft, keeping the declined / hidden lists. */
function restoreDraft(appt) {
  state.job = { ...clone(appt.job), declinedBy: state.job.declinedBy ?? [], hiddenTailors: state.job.hiddenTailors ?? [] };
}
/** Passive endings (expiry, a lapsed or withdrawn suggestion, a customer cancel) bring the job back only when the draft is still the
    empty one left by sending the request, so they never overwrite a new job she has started since (D-158). */
function restoreDraftIfEmpty(appt) {
  if (!(state.job.garments ?? []).length) restoreDraft(appt);
}
function addPayout(appt, centsAmount, kind, at = nowIso()) {
  state.payouts.push({ apptId: appt.id, cents: centsAmount, state: 'pending', date: payoutDay(at), kind, createdAt: at });   // the following Friday (D-24)
}
/** The weekly Friday run (D-136): every pending payout due by today is paid — or, with `sim.payout = 'failed'`, sent back — with the bank
    snapshotted. Never called by tick() / advanceClock(); fixtures call it. */
export function settlePayouts() {
  const today = isoDay(nowIso());
  const bank = state.tailors[0].payouts ?? {};
  const paid = [];
  const failed = [];
  /* DG-4 (D-355): while the payments partner hasn't verified her (verifying, action needed, or paused for the W-9) the Friday run waits */
  if (bank.status && bank.status !== 'verified') return { ok: true, paid, failed, paused: true };
  for (const p of state.payouts) {
    if (p.state !== 'pending' || p.date > today || p.held) continue;   // D-14: a disputed no-show pay waits for Taily
    p.bank = bank.bank ?? '';
    p.last4 = bank.last4 ?? '';
    if (state.sim.payout === 'failed') { p.state = 'failed'; p.failedAt = nowIso(); failed.push(p); }
    else { p.state = 'paid'; p.paidAt = nowIso(); paid.push(p); }
    notify(getAppt(p.apptId) ?? null, p.state === 'paid' ? 'payout-sent' : 'payout-failed', { x: { cents: p.cents, bank: p.bank, last4: p.last4 } });
  }
  return { ok: true, paid, failed };
}
const expiryIso = () => isoMinute(new Date(state.clock.now + POLICY.REQUEST_EXPIRY_H * HOUR_MS));

export function requestBooking({ tailorId, slotStart, cardId = null, threeDS = false } = {}) {
  const job = state.job;
  const v = validateJob(job);
  if (!v.ok) return fail('job-invalid', { errors: v.errors });
  if (state.sim.network === 'offline') return fail('offline');                              // S-12: nothing is sent or held while offline
  if (state.sim.server === 'error') { state.sim.server = 'ok'; return fail('server-error'); }   // one-shot (D-140): nothing authorized
  const tailor = tailorById(tailorId);
  if (!tailor) return fail('unknown-tailor');
  const el = eligible(tailor, job);
  if (!el.ok) return fail(el.reason);
  if (!openSlots(tailorId, job.visitType, { until: job.needBy }).includes(slotStart)) return fail('slot-unavailable');
  const lines = linesFor(tailor, job.garments);
  if (lines.missing.length) return fail('service-not-offered', { missing: lines.missing });
  if (state.sim.card === 'declined') return fail('card-declined');
  if (state.sim.card === '3ds' && !threeDS) return fail('needs-3ds');

  const homeFee = job.visitType === 'home' ? cents(tailor.home.fee) : 0;
  const rush = rushFor(tailor, slotStart, job.needBy);
  const money = quote({ lines, homeFee, rush: rush.cents });
  money.rushDays = rush.days;
  const appt = {
    id: `A-${++apptSeq}`, customerId: state.customer.id, tailorId,
    job: jobCopy(job), lines,
    slot: { start: slotStart, end: slotEnd(slotStart, job.visitType) },
    status: 'requested', requestedAt: nowIso(), expiresAt: expiryIso(), retries: 0,
    suggested: null, declineReason: '', cardId,
    money,
    payments: { deposit: { cents: money.deposit, state: 'authorized' }, balance: { cents: money.balance, state: 'pending' } },
    priceChange: null, returnOption: null, courier: null, cancel: null, review: null,
    docs: {}, docSeq: 0,                                        // K-02 (D-175): the tailor's working fitting documentation
    edit: null,                                                 // Study-1 B1: the post-fitting edit (K-30: approve only, never declined)
    notes: [], noteSeq: 0,                                      // Study-1 B2: the tailor's private General notes
    reminder: freshReminder(),                                  // K-41 (D-296): the 24-hour reminder — sent, confirmed, nudged (no new status)
    history: [{ status: 'requested', at: nowIso() }],
  };
  state.appts.push(appt);
  const { zip, address, visitType, declinedBy, hiddenTailors } = job;
  newJob();                                                   // D-158: the draft is spent; a decline, expiry or cancel brings it back (restoreDraft)
  Object.assign(state.job, { zip, address, visitType, declinedBy, hiddenTailors });   // the job's own who-said-no lists travel with it
  say(appt, 'You sent a request', `${state.customer.first} sent a request`);
  notify(appt, 'request-sent');
  notify(appt, 'request');
  return succeed(appt);
}

export function withdrawRequest(id) {
  const a = must(id);
  if (a.status !== 'requested' && a.status !== 'suggested') return fail('not-pending');
  setStatus(a, 'cancelled');
  a.cancel = { by: 'customer', reason: 'withdrawn', at: nowIso(), refund: 0, kept: 0, tailorPaid: 0 };
  a.payments.deposit.state = 'released';
  restoreDraft(a);
  say(a, 'You withdrew the request', `${state.customer.first} withdrew the request`);
  notify(a, 'withdrawn');
  return succeed(a);
}

export function tailorAccept(id) {
  const a = must(id);
  if (a.status === 'expired' || (a.status === 'requested' && toDate(a.expiresAt).getTime() <= state.clock.now)) return fail('expired');
  if (a.status !== 'requested') return fail('not-requested');
  if (state.sim.network === 'offline') return fail('offline');                              // S-12: the deposit is captured on accept
  setStatus(a, 'confirmed');
  a.payments.deposit.state = 'captured';
  say(a, `${firstName(tailorById(a.tailorId))} accepted`, 'You accepted');
  notify(a, 'accepted');
  return succeed(a);
}

export function tailorSuggest(id, slotStart) {
  const a = must(id);
  if (a.status !== 'requested') return fail('not-requested');
  if (toDate(a.expiresAt).getTime() <= state.clock.now) return fail('expired');
  if (!openSlots(a.tailorId, a.job.visitType, { until: a.job.needBy, exclude: a.id }).includes(slotStart)) return fail('slot-unavailable');
  const rushNew = rushFor(tailorById(a.tailorId), slotStart, a.job.needBy).cents;
  a.suggested = { start: slotStart, at: nowIso(), rush: Math.min(a.money.rush, rushNew) };   // D-155: the price never goes up
  setStatus(a, 'suggested');
  say(a, `${firstName(tailorById(a.tailorId))} suggested ${fmtWhen(slotStart)}`, `You suggested ${fmtWhen(slotStart)}`);
  notify(a, 'suggested', { x: { start: slotStart } });
  return succeed(a);
}

export function acceptSuggestion(id) {
  const a = must(id);
  if (a.status !== 'suggested') return fail('not-suggested');
  if (isBlocked(a.tailorId)) return fail('blocked');                                 // S-32 (A2)
  if (state.clock.now >= suggestLapseAt(a)) return fail('slot-passed');   // D-154
  if (state.sim.network === 'offline') return fail('offline');                // S-12: the deposit is captured here
  a.slot = { start: a.suggested.start, end: slotEnd(a.suggested.start, a.job.visitType) };
  repriceForSlot(a, a.slot.start);                            // D-155
  setStatus(a, 'confirmed');
  a.confirmedVia = 'suggestion';                              // R3-1-C-08: the customer accepted the tailor's new time
  a.payments.deposit.state = 'captured';
  say(a, `Booked ${fmtWhen(a.slot.start)}`);
  notify(a, 'suggestion-accepted');
  return succeed(a);
}

/** A suggested time that lapsed or that Amara withdrew (D-154): the request ends as a final expiry, the deposit hold is released and the
    time is open again (a non-`suggested` status holds no slot). */
function endSuggestion(a, text, tailorText, ended = 'lapsed') {
  setStatus(a, 'expired');
  a.suggested = { ...a.suggested, ended };                    // 'lapsed' | 'withdrawn' — c-request words the two differently
  a.retries = POLICY.MAX_RETRIES;
  a.payments.deposit.state = 'released';
  if (!state.job.hiddenTailors.includes(a.tailorId)) state.job.hiddenTailors.push(a.tailorId);   // D-07
  restoreDraftIfEmpty(a);
  say(a, text, tailorText);
  notify(a, 'suggestion-ended', { x: { withdrawn: ended === 'withdrawn' } });
}
export function withdrawSuggestion(id) {
  const a = must(id);
  if (a.status !== 'suggested') return fail('not-suggested');
  endSuggestion(a, `${firstName(tailorById(a.tailorId))} withdrew the suggested time`, 'You withdrew your suggested time', 'withdrawn');
  return succeed(a);
}

export function findAnotherTailor(id) {
  const a = must(id);
  if (!(a.status === 'declined' || a.status === 'suggested' || isFinalExpiry(a))) return fail('not-allowed');
  if (a.status === 'suggested') {
    setStatus(a, 'cancelled');
    a.cancel = { by: 'customer', reason: 'switched', at: nowIso(), refund: 0, kept: 0, tailorPaid: 0 };
    a.payments.deposit.state = 'released';
    say(a, 'You’re looking for another tailor', `${state.customer.first} is looking for another tailor`);
    notify(a, 'switched');
  }
  restoreDraft(a);
  return succeed(a);
}

export function tailorDecline(id, reason = '') {
  const a = must(id);
  if (a.status !== 'requested') return fail('not-requested');
  setStatus(a, 'declined');
  a.declineReason = reason;
  a.payments.deposit.state = 'released';
  if (!state.job.declinedBy.includes(a.tailorId)) state.job.declinedBy.push(a.tailorId);
  restoreDraft(a);
  say(a, `${firstName(tailorById(a.tailorId))} declined`, 'You declined');
  notify(a, 'declined');
  return succeed(a);
}

export function expireRequest(id) {
  const a = must(id);
  if (a.status !== 'requested') return fail('not-requested');
  setStatus(a, 'expired');
  a.payments.deposit.state = 'released';
  restoreDraftIfEmpty(a);
  if (a.retries >= POLICY.MAX_RETRIES && !state.job.hiddenTailors.includes(a.tailorId)) state.job.hiddenTailors.push(a.tailorId);   // D-07
  say(a, 'Request expired. Your hold was released.', 'Request expired');
  notify(a, 'expired');
  return succeed(a);
}

export function tryAgain(id) {
  const a = must(id);
  if (a.status !== 'expired') return fail('not-expired');
  if (isBlocked(a.tailorId)) return fail('blocked');                                 // S-32 (A2)
  if (a.retries >= POLICY.MAX_RETRIES) return fail('no-retries');
  if (toDate(a.slot.start).getTime() <= state.clock.now) return fail('slot-passed');
  if (!openSlots(a.tailorId, a.job.visitType, { until: a.job.needBy, exclude: a.id }).includes(a.slot.start)) return fail('slot-unavailable');   // someone else may have taken it since
  if (state.sim.network === 'offline') return fail('offline');   // S-12
  if (state.sim.card === 'declined') return fail('card-declined');
  a.retries += 1;
  a.sentAt = nowIso();                                        // R3-1-C-02: the resend time; requestedAt stays the first send
  a.expiresAt = expiryIso();
  a.payments.deposit.state = 'authorized';                    // D-15
  setStatus(a, 'requested');
  say(a, 'You sent the request again', `${state.customer.first} sent the request again`);
  notify(a, 'request-sent');
  notify(a, 'request');
  return succeed(a);
}

export function cancelBooking(id) {
  const a = must(id);
  if (a.status !== 'confirmed') return fail('not-confirmed');
  const terms = cancelTerms(a, state.clock.now);
  setStatus(a, 'cancelled');
  if (terms.window === 'early') {
    a.payments.deposit.state = 'refunded';
    a.cancel = { by: 'customer', reason: 'customer-early', at: nowIso(), refund: terms.refund, kept: 0, tailorPaid: 0 };
  } else {
    a.payments.deposit.state = 'kept';
    a.cancel = { by: 'customer', reason: 'customer-late', at: nowIso(), refund: 0, kept: terms.kept, tailorPaid: terms.kept, ...(terms.confirmed ? { afterConfirm: true } : {}) };   // D-05; K-41: late because she had confirmed
    addPayout(a, terms.kept, 'kept-deposit');
  }
  restoreDraftIfEmpty(a);
  say(a, 'You cancelled the booking', `${state.customer.first} cancelled the booking`);
  notify(a, terms.window === 'early' ? 'cancelled-early' : 'cancelled-late');
  return succeed(a, { terms });
}

export function rescheduleBooking(id, slotStart) {
  const a = must(id);
  if (a.status !== 'confirmed') return fail('not-confirmed');
  if (cancelTerms(a, state.clock.now).window !== 'early') return fail('too-late');   // D-12
  if (!openSlots(a.tailorId, a.job.visitType, { until: a.job.needBy, exclude: a.id }).includes(slotStart)) return fail('slot-unavailable');
  const from = a.slot.start;
  a.slot = { start: slotStart, end: slotEnd(slotStart, a.job.visitType) };
  a.reminder = freshReminder();                                                      // K-41 (D-296): the new time gets its own reminder (none when < 26 h out)
  repriceForSlot(a, slotStart);                                                      // D-155: rush = min(booked, new slot); the deposit stays
  a.history.push({ status: 'rescheduled', at: nowIso(), from });                     // R3-1-T-10: t-job says what it moved from
  say(a, `You moved the visit to ${fmtWhen(slotStart)}`, `${state.customer.first} moved the visit to ${fmtWhen(slotStart)}`);
  if (a.proposal?.state === 'pending') Object.assign(a.proposal, { state: 'replaced', endedAt: nowIso() });   // D-12: her own move answers it
  notify(a, 'rescheduled');
  return succeed(a);
}

export function tailorCantMakeIt(id, reason = '') {
  const a = must(id);
  if (a.status !== 'confirmed') return fail('not-confirmed');
  setStatus(a, 'cancelled');
  a.payments.deposit.state = 'refunded';
  /* K-29 (Study-1 A5): inside CANCEL_WINDOW_H the tailor was warned; the refund is the same (in full), the cancel is marked late */
  const late = cancelTerms(a, state.clock.now).window === 'late' && !cancelTerms(a, state.clock.now).confirmed;   // K-41: Sarah's confirm is not the 24 h
  a.cancel = { by: 'tailor', reason: 'tailor-cant-make-it', note: reason, at: nowIso(), refund: a.payments.deposit.cents, kept: 0, tailorPaid: 0, late };
  restoreDraft(a);
  say(a, `${firstName(tailorById(a.tailorId))} can’t make it`, 'You can’t make it');
  notify(a, 'cant-make-it');
  return succeed(a);
}

/** K-29 (Study-1 A5): Sarah reports that the tailor didn't show up — from NO_SHOW_WAIT_MIN after the start, while still confirmed (first report
    wins: a visit Amara started, or a no-show she marked, has moved on). Cancelled, deposit refunded in full, the order back as the draft, no payout. */
export function reportTailorNoShow(id) {
  const a = must(id);
  if (a.status !== 'confirmed') return fail('not-confirmed');
  if (state.clock.now < toDate(a.slot.start).getTime() + POLICY.NO_SHOW_WAIT_MIN * MIN_MS) return fail('too-early');
  setStatus(a, 'cancelled');
  a.payments.deposit.state = 'refunded';
  a.cancel = { by: 'customer', reason: 'tailor-no-show', at: nowIso(), refund: a.payments.deposit.cents, kept: 0, tailorPaid: 0 };
  restoreDraft(a);
  say(a, `You reported that ${firstName(tailorById(a.tailorId))} didn’t show up`, `${state.customer.first} reported you didn’t show up`);
  notify(a, 'tailor-no-show');
  return succeed(a);
}

export function markNoShow(id) {
  const a = must(id);
  if (a.status !== 'confirmed') return fail('not-confirmed');
  if (state.clock.now < toDate(a.slot.start).getTime() + POLICY.NO_SHOW_WAIT_MIN * MIN_MS) return fail('too-early');
  if (!a.visitDay?.tailor?.hereAt) return fail('not-here');                          // D-14 (K-48): "I'm here" first — it is the evidence
  const pay = noShowPayout(a.payments.deposit.cents);                                // D-06
  setStatus(a, 'cancelled');
  a.payments.deposit.state = 'kept';
  a.cancel = { by: 'tailor', reason: 'no-show', at: nowIso(), refund: 0, kept: a.payments.deposit.cents, tailorPaid: pay };
  addPayout(a, pay, 'no-show');
  say(a, `${firstName(tailorById(a.tailorId))} marked the visit as a no-show`, `You marked ${state.customer.first} as a no-show`);
  notify(a, 'no-show-marked');
  return succeed(a);
}

export function startFitting(id) {
  const a = must(id);
  if (a.status !== 'confirmed') return fail('not-confirmed');
  if (state.clock.now < toDate(a.slot.start).getTime()) return fail('too-early');
  setStatus(a, 'fitting');
  if (a.tailyReview && !a.tailyReview.closedAt && a.tailyReview.reason === 'visit-unanswered') closeReview(a, 'fitting-started');
  return succeed(a);
}

/* ---------- S-32 + D-14 (K-48): the visit day — On my way / I'm here ---------- */
/** On my way / I'm here show from VISIT_TOOLS_H before the visit while it is still confirmed. */
export const visitToolsOpen = (a) => a?.status === 'confirmed' && state.clock.now >= toDate(a.slot.start).getTime() - POLICY.VISIT_TOOLS_H * HOUR_MS;
/** `who` ('tailor' | 'customer') says `what` ('on-my-way' | 'here'); the other person gets a text. The tailor's "I'm here" is the evidence a
    no-show needs (D-14); the customer's are optional (shop visits). Errors: not-confirmed · too-early · already. */
export function visitPing(id, who, what) {
  const a = must(id);
  if (a.status !== 'confirmed') return fail('not-confirmed');
  if (!visitToolsOpen(a)) return fail('too-early');
  const v = (a.visitDay ??= freshVisitDay());
  const me = v[who];
  if (!me) return fail('unknown-person');
  if (what === 'here' ? me.hereAt : (me.onWayAt || me.hereAt)) return fail('already');
  if (what === 'here') me.hereAt = nowIso(); else me.onWayAt = nowIso();
  const t = firstName(tailorById(a.tailorId));
  const c = state.customer.first;
  if (who === 'tailor') say(a, what === 'here' ? `${t} is here` : `${t} is on her way`, what === 'here' ? 'You’re here' : 'You’re on your way');
  else say(a, what === 'here' ? 'You’re here' : 'You’re on your way', what === 'here' ? `${c} is here` : `${c} is on her way`);
  notify(a, `${who === 'tailor' ? 'tailor' : 'customer'}-${what === 'here' ? 'here' : 'on-way'}`);
  return succeed(a);
}

/* ---------- D-11 (K-48.5): "Did the visit happen?" — the customer's answer (the tailor answers by starting the fitting, marking a
   no-show after "I'm here", or cancelling) ---------- */
/** The question is up for `who`: asked, the visit still confirmed, and (customer) not answered yet. */
export const visitCheckOpen = (a, who = 'customer') => a?.status === 'confirmed' && !!a.visitCheck && (who === 'tailor' || !a.visitCheck.answer);
/** Customer: 'happened' (recorded; the tailor is asked to start the fitting) or 'not-happened' (the tailor didn't come → refunded, as
    reportTailorNoShow — unless the tailor said "I'm here", then both go to Taily review). Errors: not-asked · already-answered · answer. */
export function answerVisitCheck(id, answer) {
  const a = must(id);
  if (!visitCheckOpen(a, 'customer')) return fail(a.visitCheck?.answer ? 'already-answered' : 'not-asked');
  if (!['happened', 'not-happened'].includes(answer)) return fail('answer');
  Object.assign(a.visitCheck, { answer, answeredAt: nowIso() });
  if (answer === 'happened') {
    say(a, 'You told us the visit happened', `${state.customer.first} says the visit happened. Start the fitting to send her the final order.`);
    return succeed(a);
  }
  if (a.visitDay?.tailor?.hereAt) {
    openTailyReview(a, 'visit-disputed', { by: 'customer' });
    say(a, 'You told us the visit didn’t happen. Taily is looking into it.', `${state.customer.first} says the visit didn’t happen. Taily is looking into it.`);
    return succeed(a);
  }
  const r = reportTailorNoShow(id);
  return r;
}

/* ---------- D-14: "That's not right" on a no-show report — both sides go to Taily review (the review UI is track A2's) ---------- */
/** Customer on a no-show Amara marked, or the tailor on a no-show Sarah reported. Errors: not-a-no-show · already-disputed. */
export function disputeNoShow(id, who) {
  const a = must(id);
  const reason = a.status === 'cancelled' ? a.cancel?.reason : null;
  if (!((reason === 'no-show' && who === 'customer') || (reason === 'tailor-no-show' && who === 'tailor'))) return fail('not-a-no-show');
  if (a.cancel.disputedAt) return fail('already-disputed');
  a.cancel.disputedAt = nowIso();
  a.cancel.disputedBy = who;
  openTailyReview(a, who === 'customer' ? 'no-show-disputed' : 'tailor-no-show-disputed', { by: who });
  if (who === 'customer') {
    for (const p of state.payouts) if (p.apptId === a.id && p.kind === 'no-show' && p.state === 'pending') p.held = true;   // on hold while Taily looks
    say(a, 'You told us you were there. Taily is looking into it.', `${state.customer.first} says she was there. Taily is looking into it.`);
    notify(a, 'no-show-disputed');
  } else {
    say(a, `${firstName(tailorById(a.tailorId))} says she came. Taily is looking into it.`, 'You told us you came. Taily is looking into it.');
    notify(a, 'no-show-disputed-c');
  }
  return succeed(a);
}

/* ---------- D-12 (K-48): the tailor asks to move a confirmed visit; Sarah accepts or keeps the current time ---------- */
/** The times the tailor can ask for: her open times before the need-by (this visit excluded), not the current one. */
export function moveSlots(appt) {
  if (!appt) return [];
  return openSlots(appt.tailorId, appt.job.visitType, { until: appt.job.needBy, exclude: appt.id }).filter((x) => x !== appt.slot.start);
}
/** Tailor: ask to move a confirmed visit (before it starts) to one of her open times. One proposal at a time; asking again replaces it.
    Errors: not-confirmed · too-late · slot-unavailable. */
export function proposeNewTime(id, slotStart) {
  const a = must(id);
  if (a.status !== 'confirmed') return fail('not-confirmed');
  if (state.clock.now >= toDate(a.slot.start).getTime() - POLICY.MIN_LEAD_H * HOUR_MS) return fail('too-late');
  if (!moveSlots(a).includes(slotStart)) return fail('slot-unavailable');
  a.proposal = { start: slotStart, at: nowIso(), state: 'pending', from: a.slot.start };
  say(a, `${firstName(tailorById(a.tailorId))} asked to move the visit to ${fmtWhen(slotStart)}`, `You asked to move the visit to ${fmtWhen(slotStart)}`);
  notify(a, 'tailor-move', { x: { start: slotStart } });
  return succeed(a);
}
/** The tailor's pending move, or null. */
export const proposalOf = (a) => (a?.status === 'confirmed' && a.proposal?.state === 'pending' ? a.proposal : null);
/** Customer: accept the new time (the visit moves; the deposit and the free-cancel window move with it — D-12) or keep the current one.
    Errors: no-proposal · slot-unavailable. */
export function answerProposal(id, accept) {
  const a = must(id);
  const p = proposalOf(a);
  if (!p) return fail('no-proposal');
  if (!accept) {
    Object.assign(p, { state: 'kept', endedAt: nowIso() });
    say(a, `You kept ${fmtWhen(a.slot.start)}`, `${state.customer.first} is keeping ${fmtWhen(a.slot.start)}`);
    notify(a, 'move-kept');
    return succeed(a);
  }
  if (!moveSlots(a).includes(p.start)) { Object.assign(p, { state: 'lapsed', endedAt: nowIso() }); return fail('slot-unavailable'); }
  const from = a.slot.start;
  a.slot = { start: p.start, end: slotEnd(p.start, a.job.visitType) };
  a.reminder = freshReminder();
  a.visitDay = freshVisitDay();
  repriceForSlot(a, p.start);
  a.history.push({ status: 'rescheduled', at: nowIso(), from, by: 'tailor' });
  Object.assign(p, { state: 'accepted', endedAt: nowIso() });
  say(a, `You accepted the new time, ${fmtWhen(p.start)}`, `${state.customer.first} accepted the new time, ${fmtWhen(p.start)}`);
  notify(a, 'move-accepted');
  return succeed(a);
}

/** B-07: an in-progress order past its due date ("Overdue · due Fri, Oct 23" on both lists). */
export const overdue = (a) => !!a && a.status === 'in-progress' && dayDiff(new Date(state.clock.now), a.job.needBy) < 0;

/* ---------- fitting documentation (K-02, D-175…D-183) ---------- */
const emptyDoc = () => ({ before: [], pinned: [], comment: '', commentMasked: false });
/** The revise window: at the fitting, or while the sent order is pending / messaged. After approval the record is locked (D-175). */
export const docsEditable = (a) => a.status === 'fitting' || (a.status === 'price-change' && ['pending', 'messaged'].includes(a.priceChange?.state));
/** A booked garment (job or lines) or a draft new item `n<k>` (K-01, D-121). */
export function docGarment(a, garmentId) {
  if (a.job?.garments?.some((g) => g.id === garmentId) || a.lines?.some((l) => l.garmentId === garmentId)) return true;
  return /^n[1-9]\d*$/.test(String(garmentId));
}
const docEntry = (a, garmentId) => (a.docs[garmentId] ??= emptyDoc());
/** The working entry (or the sent snapshot entry with `sent: true`), or an empty one. Never undefined. */
export function docsOf(appt, garmentId, { sent = false } = {}) {
  const src = sent ? appt.priceChange?.docs : appt.docs;
  return src?.[garmentId] ?? emptyDoc();
}
/** What a reader sees: the customer only ever sees the sent snapshot; the tailor sees the working docs at the fitting. */
export function docsFor(appt, reader) {
  if (reader === 'tailor' && appt.status === 'fitting') return appt.docs ?? {};
  return appt.priceChange?.docs ?? {};
}
/** The garments in `garmentIds` (in that order) that lack a Before or a Pinned photo, from the working docs. */
export function docsMissing(appt, garmentIds) {
  const out = [];
  for (const garmentId of garmentIds) {
    const d = docsOf(appt, garmentId);
    const before = d.before.length < 1;
    const pinned = d.pinned.length < 1;
    if (before || pinned) out.push({ garmentId, before, pinned });
  }
  return out;
}
/** Working vs sent, for these ids: photo ids per kind and the comment text. */
export function docsDiffer(appt, garmentIds) {
  const ids = (list) => list.map((p) => p.id).join(',');
  return garmentIds.some((gid) => {
    const w = docsOf(appt, gid);
    const s = docsOf(appt, gid, { sent: true });
    return ids(w.before) !== ids(s.before) || ids(w.pinned) !== ids(s.pinned) || w.comment !== s.comment;
  });
}
/** One more than the highest `n<k>` anywhere, so a new item never inherits a discarded item's photos (D-182). */
export function nextItemId(appt) {
  const found = [
    ...Object.keys(appt.docs ?? {}), ...(appt.lines ?? []).map((l) => l.garmentId),
    ...(appt.priceChange?.lines ?? []).map((l) => l.garmentId), ...(appt.job?.garments ?? []).map((g) => g.id),
    ...Object.keys(appt.priceChange?.docs ?? {}),
  ];
  const top = found.reduce((n, id) => { const m = /^n([1-9]\d*)$/.exec(String(id)); return m ? Math.max(n, Number(m[1])) : n; }, 0);
  return `n${top + 1}`;
}
export function addFittingPhoto(id, garmentId, kind) {
  const a = must(id);
  if (!docsEditable(a)) return fail('not-editable');
  if (!docGarment(a, garmentId)) return fail('unknown-garment');
  if (!DOC_KINDS.includes(kind)) return fail('photo-kind');
  if (docsOf(a, garmentId)[kind].length >= FITTING_LIMITS.PHOTOS_MAX) return fail('too-many-photos');
  a.docSeq += 1;
  const photo = { id: `p${a.docSeq}`, kind, at: nowIso(), tone: (a.docSeq - 1) % 4 };
  docEntry(a, garmentId)[kind].push(photo);
  return succeed(a, { photo });
}
export function removeFittingPhoto(id, garmentId, photoId) {
  const a = must(id);
  if (!docsEditable(a)) return fail('not-editable');
  const d = a.docs[garmentId];
  const kind = d && DOC_KINDS.find((k) => d[k].some((p) => p.id === photoId));
  if (!kind) return fail('not-found');
  const index = d[kind].findIndex((p) => p.id === photoId);
  const [photo] = d[kind].splice(index, 1);
  return succeed(a, { photo, index });
}
export function restoreFittingPhoto(id, garmentId, photo, index) {
  const a = must(id);
  if (!docsEditable(a)) return fail('not-editable');
  if (!docGarment(a, garmentId)) return fail('unknown-garment');
  const d = docEntry(a, garmentId);
  if (DOC_KINDS.some((k) => d[k].some((p) => p.id === photo?.id))) return fail('duplicate');
  if (!DOC_KINDS.includes(photo?.kind)) return fail('photo-kind');
  if (d[photo.kind].length >= FITTING_LIMITS.PHOTOS_MAX) return fail('too-many-photos');
  const at = Math.max(0, Math.min(Number.isInteger(index) ? index : d[photo.kind].length, d[photo.kind].length));
  d[photo.kind].splice(at, 0, clone(photo));
  return succeed(a);
}
export function setFittingComment(id, garmentId, text) {
  const a = must(id);
  if (!docsEditable(a)) return fail('not-editable');
  if (!docGarment(a, garmentId)) return fail('unknown-garment');
  const t = String(text ?? '').trim();
  if ([...t].length > FITTING_LIMITS.COMMENT_MAX) return fail('comment-long');
  const m = maskContact(t);
  const d = docEntry(a, garmentId);
  d.comment = m.text;
  d.commentMasked = m.masked;
  return succeed(a, { masked: m.masked });
}

const lineKey = (l) => `${l.garmentId}:${l.serviceId}`;
function priceMarks(oldLines, newLines) {
  const before = new Map(oldLines.map((l) => [lineKey(l), l]));
  const after = new Map(newLines.map((l) => [lineKey(l), l]));
  const marks = [];
  for (const [k, l] of after) {
    const old = before.get(k);
    if (!old) marks.push({ garmentId: l.garmentId, serviceId: l.serviceId, kind: 'added', from: null, to: l.cents });
    else if (old.cents !== l.cents) marks.push({ garmentId: l.garmentId, serviceId: l.serviceId, kind: 'repriced', from: old.cents, to: l.cents });
  }
  for (const [k, l] of before) if (!after.has(k)) marks.push({ garmentId: l.garmentId, serviceId: l.serviceId, kind: 'removed', from: l.cents, to: null });
  return marks;
}
/** The order checks a final order (K-01) and a post-fitting edit (Study-1 B1) share, against `a.lines` (booked, or approved once the
    work started): price-invalid · garment-type · service-type · service-not-offered · duplicate-line · max-items. Null when fine. */
function lineErrors(a, lines) {
  const lo = cents(1);
  const hi = cents(TAILOR_LIMITS.PRICE_MAX);
  if (lines.some((l) => !Number.isInteger(l.cents) || l.cents % 100 !== 0 || l.cents < lo || l.cents > hi)) return 'price-invalid';
  const bookedType = new Map(a.lines.map((l) => [l.garmentId, l.garmentType]));
  for (const l of lines) {
    if (!GARMENT_TYPES[l.garmentType] || (bookedType.has(l.garmentId) && bookedType.get(l.garmentId) !== l.garmentType)) return 'garment-type';
    if (!servicesForType(l.garmentType).includes(l.serviceId)) return 'service-type';
  }
  const tailor = tailorById(a.tailorId);
  const booked = new Set(a.lines.map(lineKey));
  if (lines.some((l) => !booked.has(lineKey(l)) && typeof tailor?.prices?.[l.serviceId] !== 'number')) return 'service-not-offered';
  if (new Set(lines.map(lineKey)).size !== lines.length) return 'duplicate-line';
  if (new Set(lines.map((l) => l.garmentId)).size > MAX_ITEMS) return 'max-items';
  return null;
}
/** "Send the final order" (K-01, D-120/D-121). First send: `fitting` → `price-change`. Revise (D-101): while the order is still `pending`
    or `messaged`, sending again replaces it (status unchanged, `state` back to `pending`, `revisions` + 1). `lines` is the whole final
    order; a new item is lines on a `garmentId` that is not booked, removing an item = sending none of its lines. An unchanged order is
    allowed (`changed: false`). Marks are always vs the BOOKED lines. Study-1 B2 (K-31): no note travels with the order any more — the
    tailor's whole-order note is a private General note (`addNote`). */
export function sendPriceChange(id, lines) {
  const a = must(id);
  const revising = a.status === 'price-change' && ['pending', 'messaged'].includes(a.priceChange?.state);
  if (a.status !== 'fitting' && !revising) return fail('not-fitting');
  if (!Array.isArray(lines) || !lines.length) return fail('no-items');
  const bad = lineErrors(a, lines);
  if (bad) return fail(bad);
  const tailor = tailorById(a.tailorId);
  const sentIds = [...new Set(lines.map((l) => l.garmentId))];
  const gaps = docsMissing(a, sentIds);
  if (gaps.length) return fail('photos-missing', { missing: gaps });                    // K-02 (D-178)
  const revisions = revising ? (a.priceChange.revisions ?? 0) + 1 : 0;
  const marks = priceMarks(a.lines, lines);
  a.priceChange = {
    lines: clone(lines), marks, changed: marks.length > 0, sentAt: nowIso(), state: 'pending', revisions,
    docs: Object.fromEntries(sentIds.map((gid) => [gid, clone(docsOf(a, gid))])),          // K-02 (D-175): the snapshot Sarah sees
  };
  const first = firstName(tailor);
  const after = priceChangeView(a).after.total;
  if (revising) {
    say(a, `${first} updated your final order`, 'You updated the final order');
    notify(a, 'final-order-updated', { x: { total: after } });
  } else {
    setStatus(a, 'price-change');
    say(a, `${first} sent your final order`, 'You sent the final order');
    notify(a, 'final-order', { x: { total: after, was: a.money.total } });
  }
  return succeed(a);
}
/** Allowed while pending, and after the customer messaged (disputes settle in chat, then she approves) — D-26. Rebuilds `job.garments`
    from the approved lines (D-121). */
export function approvePriceChange(id) {
  const a = must(id);
  if (a.status !== 'price-change' || a.priceChange?.state === 'approved') return fail('not-pending');
  a.lines = clone(a.priceChange.lines);
  a.money = repriceMoney(a);
  a.payments.balance.cents = a.money.balance;
  a.priceChange.state = 'approved';
  a.job.garments = garmentsFromLines(a);
  setStatus(a, 'in-progress');
  say(a, 'You approved the order', `${state.customer.first} approved the order`);
  if (a.tailyReview && !a.tailyReview.closedAt && a.tailyReview.reason === 'final-order-unanswered') closeReview(a, 'approved');
  notify(a, 'final-approved');
  return succeed(a);
}
/** `job.garments` rebuilt from `a.lines` (D-121): the kept garments in their order with their services, then new items (`added: true`). */
function garmentsFromLines(a) {
  const byGarment = new Map();
  for (const l of a.lines) {
    if (!byGarment.has(l.garmentId)) byGarment.set(l.garmentId, { type: l.garmentType, services: [] });
    byGarment.get(l.garmentId).services.push(l.serviceId);
  }
  const garments = [];
  for (const g of a.job.garments) {
    const hit = byGarment.get(g.id);
    if (hit) { garments.push({ ...g, services: hit.services }); byGarment.delete(g.id); }
  }
  for (const [gid, hit] of byGarment) garments.push({ id: gid, type: hit.type, services: hit.services, photos: 0, added: true });
  return garments;
}
export function messageAboutPriceChange(id) {
  const a = must(id);
  if (a.status !== 'price-change' || a.priceChange?.state !== 'pending') return fail('not-pending');
  a.priceChange.state = 'messaged';
  return succeed(a);
}
/** Quote from the booked appointment's own lines; the captured deposit never changes (D-23). */
function repriceMoney(a, rush = a.money.rush) {
  const courier = a.courier?.state === 'ready' ? a.courier.cents : 0;
  const q = quote({
    lines: a.lines, homeFee: a.money.homeFee, rush, courier, deposit: a.payments.deposit.cents,
  });
  q.rushDays = a.money.rushDays;
  return q;
}

/** A visit moved to `slotStart` (accepted suggestion, reschedule): rush = min(what was booked, the rush for the new slot), so the price never
    goes up and never charges rush for non-rush work (D-155). The captured deposit excludes rush, so it does not move. */
function repriceForSlot(a, slotStart) {
  const r = rushFor(tailorById(a.tailorId), slotStart, a.job.needBy);
  const q = repriceMoney(a, Math.min(a.money.rush, r.cents));
  q.rushDays = r.days;
  a.money = q;
  a.payments.balance.cents = q.balance;
}

/** What the tailor offers for getting the order back: `returns` (a subset of her Shop returns), default every one that is on (D-99). */
export function markReady(id, { returns } = {}) {
  const a = must(id);
  if (a.status !== 'in-progress') return fail('not-in-progress');
  if (a.edit?.state === 'pending') return fail('edit-pending');                                // Study-1 B1 (default 13)
  const tailor = tailorById(a.tailorId);
  const on = Object.keys(RETURN_LABEL).filter((k) => tailor.returns?.[k] === true);
  const offer = returns === undefined ? on : Object.keys(RETURN_LABEL).filter((k) => Array.isArray(returns) && returns.includes(k));
  if (!offer.length) return fail('return-required');
  if (offer.some((k) => !on.includes(k)) || (Array.isArray(returns) && returns.some((k) => !RETURN_LABEL[k]))) return fail('not-offered');
  a.returnOffer = offer;
  setStatus(a, 'ready');
  a.payments.balance = { cents: a.money.balance, state: 'due' };
  if (a.money.refund > 0) a.payments.refund = { cents: a.money.refund, state: 'pending' };   // D-23, D-156: settled by holdBalance
  say(a, 'Ready. Choose how to get it back.', `You marked it ready. Waiting for ${state.customer.first} to choose how to get it back.`);
  notify(a, 'ready');
  return succeed(a);
}

/** Where the courier delivers (D-106: Sarah's saved address, also for shop visits), as ONE line on both sides:
    street + unit ("145 N 7th St, 2R"). The visit block alone adds the city (R4-2-C-06). */
export function returnAddress() {
  const ad = state.customer.address ?? {};
  return [ad.street, ad.unit].filter(Boolean).join(', ');
}

/** K-40 (D-295, replaces D-160's "an hour after she paid"): the courier window Sarah picked — `{ from, to, collectAt }` as ISO minutes
    (the courier collects from the tailor COURIER_COLLECT_LEAD_MIN before `from`); null when no courier window is picked. */
export function courierWindow(appt) {
  const s = appt?.returnOption === 'courier' ? appt.handoff?.slot : null;
  return s?.end ? { from: s.start, to: s.end, collectAt: s.collectAt } : null;
}

/* ---------- K-40 (T1): the handoff time ---------- */
/** The times Sarah can pick for getting her order back (D-295), from the tailor's open hours — her shop hours; a tailor with no shop: her
    home-visit hours, and the courier collects from her home address — from now until HANDOFF_PICK_DAYS ahead (so a pick never outlasts the
    UNCLAIMED_CAPTURE_D clock that starts at the hold). Pickup (needs a shop): a start every HANDOFF_SLOT_MIN that the hours still cover,
    `[{ start }]`. Courier: HANDOFF_SLOT_MIN delivery windows starting by closing time whose collection (COURIER_COLLECT_LEAD_MIN before)
    is inside the hours and more than COURIER_CHANGE_CUTOFF_MIN away, `[{ start, end, collectAt }]`. A pickup never blocks her calendar. */
export function handoffSlots(appt, method = appt?.returnOption) {
  const t = appt ? tailorById(appt.tailorId) : null;
  if (!t || !RETURN_LABEL[method]) return [];
  const shop = !!t.shop?.enabled;
  if (method === 'pickup' && !shop) return [];
  const hours = (shop ? t.availability?.shop : t.availability?.home) ?? {};
  const step = POLICY.HANDOFF_SLOT_MIN;
  const lead = POLICY.COURIER_COLLECT_LEAD_MIN;
  const from = state.clock.now;
  /* SF-13 (D-295(1)'s intent): once the balance is held, no time past the 7-day charge (after a capture the job stays open, so no cap) */
  const capAt = appt?.status === 'awaiting-handoff' && appt.payments?.balance?.state === 'held' ? (unclaimedAt(appt) ?? Infinity) : Infinity;
  const until = Math.min(from + POLICY.HANDOFF_PICK_DAYS * DAY_MS, capAt);
  const at = (d, m) => { const x = new Date(d); x.setHours(Math.floor(m / 60), m % 60, 0, 0); return x; };   // wall-clock (DST-safe)
  const out = [];
  for (let d = strip(new Date(from)); d.getTime() < until; d = addDays(d, 1)) {
    for (const [open, close] of hours[weekdayKey(d)] ?? []) {
      const o = minutesOf(open);
      const c = minutesOf(close);
      if (method === 'pickup') {
        for (let m = Math.ceil(o / step) * step; m + step <= c; m += step) {
          const x = at(d, m).getTime();
          if (x > from && x <= until) out.push({ start: isoMinute(new Date(x)) });
        }
        continue;
      }
      for (let m = Math.ceil((o + lead) / step) * step; m <= c; m += step) {
        const x = at(d, m).getTime();
        const collect = x - lead * MIN_MS;
        if (collect - POLICY.COURIER_CHANGE_CUTOFF_MIN * MIN_MS <= from || x > until) continue;
        out.push({ start: isoMinute(new Date(x)), end: isoMinute(new Date(x + step * MIN_MS)), collectAt: isoMinute(new Date(collect)) });
      }
    }
  }
  return out;
}
/** A picked handoff time as one line: "Fri, Oct 16 · 5:30 PM" (pickup) · "Fri, Oct 16 · 5:00–5:30 PM" (a courier window). */
export const slotText = (slot) => (!slot?.start ? '' : slot.end ? `${fmtDay(slot.start)} · ${fmtTimeRange(slot.start, slot.end)}` : fmtWhen(slot.start));
/** A pickup time that passed (HANDOFF_SLOT_MIN after its start) with nothing marked: no fee, she picks a new one (D-295). */
export function handoffMissed(appt) {
  const s = appt?.handoff?.slot;
  return appt?.status === 'awaiting-handoff' && appt.returnOption === 'pickup' && !!s && !appt.handoff.markedAt
    && state.clock.now >= toDate(s.start).getTime() + POLICY.HANDOFF_SLOT_MIN * MIN_MS;
}
/** Can Sarah move the time now (D-295)? Pickup: before the slot starts, or once it was missed, or while none is picked (D-03: an order
    defaulted to pickup); courier: until COURIER_CHANGE_CUTOFF_MIN before the collection, or after a failed delivery (S-35) — never while the
    courier has it. Never once Amara marked it picked up, or after it is completed. */
export function handoffChangeable(appt) {
  const h = appt?.handoff;
  if (appt?.status !== 'awaiting-handoff' || !h || h.markedAt) return false;
  if (appt.returnOption === 'courier') {
    if (h.trip?.state === 'returned') return true;
    if (h.trip?.state === 'out' || !h.slot) return false;
    return state.clock.now < toDate(h.slot.collectAt).getTime() - POLICY.COURIER_CHANGE_CUTOFF_MIN * MIN_MS;
  }
  if (!h.slot) return true;
  return state.clock.now < toDate(h.slot.start).getTime() || handoffMissed(appt);
}
/** Customer only (the tailor never sets it): pick the handoff time from `handoffSlots` (a slot object or its start ISO). On a ready order
    it is part of the choice (Pay needs it); once held she can move it (`handoffChangeable`) — confirmed at once, no tailor approval,
    the tailor is told (thread + text). A courier move re-quotes (D-299) and a higher price is a new card authorization (B-14: a decline keeps
    the old window, `card-declined`); after a failed delivery the new window costs nothing more (S-35). Errors: not-ready · return-required ·
    already-marked · too-late · slot-invalid · no-change · card-declined · offline. */
export function setHandoffSlot(id, slot) {
  const a = must(id);
  if (a.status !== 'ready' && a.status !== 'awaiting-handoff') return fail('not-ready');
  if (!a.returnOption) return fail('return-required');
  const prev = a.handoff?.slot ?? null;
  const returned = a.handoff?.trip?.state === 'returned';
  if (a.status === 'awaiting-handoff') {
    if (a.handoff.markedAt) return fail('already-marked');
    if (!handoffChangeable(a)) return fail('too-late');
    if (state.sim.network === 'offline') return fail('offline');
  }
  const start = typeof slot === 'string' ? slot : slot?.start;
  const match = handoffSlots(a).find((x) => x.start === start);
  if (!match) return fail('slot-invalid');
  if (a.status === 'awaiting-handoff' && prev?.start === match.start && !returned) return fail('no-change');
  const before = { handoff: clone(a.handoff ?? null), courier: clone(a.courier ?? null), money: clone(a.money), balance: clone(a.payments.balance), refund: clone(a.payments.refund ?? null) };
  a.handoff = { ...(a.handoff ?? {}), slot: { ...match } };
  if (a.returnOption === 'courier' && !returned) { quoteCourier(a); repriceReturn(a); }   // K-43 (D-299): the Uber quote is per window
  if (a.status === 'awaiting-handoff' && before.balance.state === 'held' && a.payments.balance.cents > before.balance.cents && state.sim.card === 'declined') {
    /* B-14 / D-04: a higher courier price needs a new authorization — declined, so nothing moves */
    Object.assign(a, { handoff: before.handoff, courier: before.courier, money: before.money });
    a.payments.balance = before.balance;
    if (before.refund) a.payments.refund = before.refund; else delete a.payments.refund;
    return fail('card-declined');
  }
  if (a.status === 'awaiting-handoff') {
    a.handoff.moved = prev ? { from: prev, at: nowIso() } : null;
    if (!prev) a.handoff.slotSetAt = nowIso();
    if (returned) a.handoff.trip = { ...a.handoff.trip, state: 'booked' };
    const what = a.returnOption === 'courier' ? 'delivery' : 'pickup';
    const when = slotText(match);
    if (prev && !returned) say(a, `You moved your ${what} to ${when}`, `${state.customer.first} moved her ${what} to ${when}`);
    else say(a, `You picked your ${what} time: ${when}`, `${state.customer.first} picked her ${what} time: ${when}`);
    notify(a, prev && !returned ? 'handoff-moved' : a.returnOption === 'courier' ? 'courier-booked' : 'pickup-set');
  }
  return succeed(a);
}

/** The ways back on a ready order, RETURN_LABEL order. */
export function returnOffer(appt) {
  if (!appt) return [];
  if (appt.returnOffer) return appt.returnOffer.slice();
  const tailor = tailorById(appt.tailorId);
  return Object.keys(RETURN_LABEL).filter((k) => tailor?.returns?.[k] === true);
}

export function chooseReturn(id, option) {
  const a = must(id);
  if (a.status !== 'ready') return fail('not-ready');
  if (!RETURN_LABEL[option] || !returnOffer(a).includes(option) || !tailorById(a.tailorId).returns?.[option]) return fail('not-offered');
  if (a.returnOption !== option && a.handoff?.slot) a.handoff = null;   // K-40: a pickup time is not a courier window
  a.returnOption = option;
  if (option === 'courier') {
    const s = state.sim.courier;
    a.courier = { miles: courierMiles(a), quote: 0, markup: 0, cents: 0, state: s === 'fail' ? 'failed' : s === 'loading' ? 'loading' : 'ready' };
    quoteCourier(a);   // K-43: priced per window — nothing until she picks one
  } else {
    a.courier = null;
  }
  repriceReturn(a);
  return succeed(a);
}
/** The return's money after the way back or the courier window changed: re-priced (the deposit stays), the balance (held or not) follows. */
function repriceReturn(a) {
  a.money = repriceMoney(a);
  a.payments.balance.cents = a.money.balance;
  if (a.money.refund > 0) a.payments.refund = { cents: a.money.refund, state: a.payments.refund?.state === 'refunded' ? 'refunded' : 'pending' };   // D-156: re-priced with the courier
  else delete a.payments.refund;
}
/** K-43 (D-299): the simulated Uber quote for one courier window of this appointment (the distance to Sarah's ZIP + the window's start). */
export const courierQuoteFor = (appt, slot) => courierQuote(courierMiles(appt), typeof slot === 'string' ? slot : slot?.start ?? null);   // S-42: from where the courier collects
/** K-43 (D-299): put the picked window's quote on `a.courier` (0 until a window is picked, or while the price is loading / failed). */
function quoteCourier(a) {
  const c = a.courier;
  if (!c) return;
  const q = c.state === 'ready' && a.handoff?.slot?.end ? courierQuoteFor(a, a.handoff.slot) : null;
  Object.assign(c, { quote: q?.quote ?? 0, markup: q?.markup ?? 0, cents: q?.cents ?? 0 });
}

/** K-27 (Study-1 A2): picking a way back HOLDS the balance (services + rush + courier − deposit) on the card; nothing is charged until the
    handoff (or UNCLAIMED_CAPTURE_D later). A $0 balance holds nothing and settles a D-156 refund as before. Moves to awaiting-handoff. */
export function holdBalance(id, cardId = null, { threeDS = false } = {}) {
  const a = must(id);
  if (a.status !== 'ready') return fail('not-ready');
  if (state.sim.network === 'offline') return fail('offline');                                // S-12: nothing is held while offline
  if (!a.returnOption) return fail('return-required');
  if (a.returnOption === 'courier' && a.courier?.state !== 'ready') return fail('courier-unavailable');
  const slot = a.handoff?.slot ?? null;                                                       // K-40: the time comes first
  if (!slot) return fail('slot-required');
  if (!handoffSlots(a).some((x) => x.start === slot.start)) return fail('slot-gone');
  const charge = a.money.balance > 0;                                                         // M6-M-03: a $0 balance only settles the refund, nothing to decline
  if (charge && state.sim.card === 'declined') { a.payments.balance.state = 'failed'; a.payments.balance.failedCardId = cardId; return fail('card-declined'); }
  if (charge && state.sim.card === '3ds' && !threeDS) return fail('needs-3ds');
  a.payments.balance = { cents: a.money.balance, state: charge ? 'held' : 'none', heldAt: nowIso() };
  if (a.payments.refund?.cents > 0) a.payments.refund.state = 'refunded';                   // D-156
  a.balanceCardId = cardId;
  a.handoff = freshHandoff(a, nowIso(), slot);
  setStatus(a, 'awaiting-handoff');
  const how = a.returnOption === 'courier' ? RETURN_LABEL.courier : RETURN_LABEL.pickup.toLowerCase();   // SF-36: "Taily courier" keeps its capital
  const amt = fmtExact(a.money.balance);
  say(a, charge ? `You chose ${how}. You’ll be charged ${amt} ${CHARGE_WHEN[a.returnOption] ?? 'at handoff'}.` : `You chose ${how}.`, charge ? `${state.customer.first} chose ${how}. She’s charged ${amt} ${CHARGE_WHEN[a.returnOption] ?? 'at handoff'}.` : `${state.customer.first} chose ${how}.`);   // D-17 / K-48.7: Sarah's words on the tailor side
  notify(a, a.returnOption === 'courier' ? 'courier-booked' : 'pickup-set');
  return succeed(a);
}
/** A new handoff record at the hold (`at`), with the picked slot (null: none yet, D-03's default pickup). The courier gets its trip (S-35). */
function freshHandoff(a, at, slot) {
  return {
    code: handoffCode(a), heldAt: at, pausedMs: 0, slot, moved: null, slotSetAt: slot ? at : null,
    markedBy: null, markedAt: null, marks: 0, autoAt: null, problemAt: null, completedBy: null, completedAt: null,
    ...(a.returnOption === 'courier' ? { trip: { state: 'booked', outAt: null, failedAt: null, reason: null } } : {}),
  };
}

/* ---------- Study-1 A2–A3: the handoff ---------- */
/** The customer's pickup code: HANDOFF_CODE_LEN digits derived from the appointment id, so it is the same on every reload (A-1001 → 8153). */
export function handoffCode(appt) {
  const n = Number(String(appt?.id ?? '').replace(/\D/g, '')) || 0;
  return String((n * 7919 + 1234) % (10 ** HANDOFF_CODE_LEN)).padStart(HANDOFF_CODE_LEN, '0');
}
/** When an unclaimed hold is captured: the hold + UNCLAIMED_CAPTURE_D (D-04: day 6, inside the card hold's life — a reported problem no
    longer pushes it later). Epoch ms; null without a hold. */
export function unclaimedAt(appt) {
  const h = appt?.handoff;
  if (!h?.heldAt) return null;
  return toDate(h.heldAt).getTime() + POLICY.UNCLAIMED_CAPTURE_D * DAY_MS;
}
/** ms until the automatic completion; null while nothing counts down (not marked yet, a problem is open, or it is no longer awaiting the handoff). */
export function autoCompleteLeft(appt) {
  const h = appt?.handoff;
  if (appt?.status !== 'awaiting-handoff' || !h?.autoAt || h.problemAt) return null;
  return Math.max(0, toDate(h.autoAt).getTime() - state.clock.now);
}
/** Charge what is held. D-04: the charge can fail (`sim.capture` 'declined', one-shot) → `capture-failed` (+ failedAt, failReason), the
    customer updates her card (retryCapture). Returns true when charged. */
function captureHold(a, reason, at = nowIso()) {
  const b = a.payments.balance;
  if (b.state !== 'held') return false;
  if (state.sim.capture === 'declined') {
    state.sim.capture = 'ok';
    Object.assign(b, { state: 'capture-failed', failedAt: at, failReason: reason });
    return false;
  }
  Object.assign(b, { state: 'captured', captureReason: reason, capturedAt: at });
  return true;
}
const hasJobPayout = (a) => state.payouts.some((p) => p.apptId === a.id && p.kind === 'job');
/** The one way into `completed` (A3): capture what is still held, stamp the completion (at `at` — an auto-completion is stamped at its
    `autoAt`), queue the payout for the Friday after. `by`: 'code' | 'customer' | 'courier' | 'auto'. */
function completeHandoff(a, by, at = nowIso(), extra = {}) {
  const b = a.payments.balance;
  const failed = b.state === 'held' && !captureHold(a, 'handoff', at);
  a.status = 'completed';
  a.history.push({ status: 'completed', at });
  Object.assign(a.handoff, { completedBy: by, completedAt: at, ...extra });
  if (!hasJobPayout(a) && b.state !== 'capture-failed') addPayout(a, a.money.payout, 'job', at);   // pending until the weekly run (D-24); D-03: once
  const line = by === 'auto' ? 'Completed automatically' : by === 'abandoned' ? `Closed: not collected within ${POLICY.ABANDONED_CLOSE_D} days of the charge` : 'Completed';
  post(a.tailorId, 'system', line, { at, tailorText: line });
  const charged = b.state === 'captured' ? b.cents : 0;
  if (by === 'abandoned') { notify(a, 'abandoned', { at }); notify(a, 'abandoned-t', { at }); return; }
  if (failed) { notify(a, 'card-failed', { at }); notify(a, 'card-failed-t', { at }); return; }
  notify(a, by === 'courier' ? 'delivered' : 'completed', { at, x: { at, charged, to: extra.delivery?.to } });
  if (by !== 'code') notify(a, 'job-done-t', { at });
}
/** D-09 (K-48.3): "Confirm received" shows only once Amara marked it handed over, or the pickup time has started (a courier delivery
    completes the order itself). */
export function confirmReceivedOpen(appt) {
  const h = appt?.handoff;
  if (appt?.status !== 'awaiting-handoff' || !h) return false;
  if (h.markedAt) return true;
  return appt.returnOption === 'pickup' && !!h.slot?.start && state.clock.now >= toDate(h.slot.start).getTime();
}
const guardHandoff = (a) => (a.status !== 'awaiting-handoff' ? fail('not-awaiting-handoff') : null);

/** Tailor, in-store pickup: Sarah's code completes it right away. Errors: code-format (not HANDOFF_CODE_LEN digits) · code-wrong. */
export function confirmPickup(id, code) {
  const a = must(id);
  const g = guardHandoff(a); if (g) return g;
  if (a.returnOption !== 'pickup') return fail('not-pickup');
  if (state.sim.network === 'offline') return fail('offline');                                 // S-12: the code charges the hold
  const c = String(code ?? '').trim();
  if (!new RegExp(`^\\d{${HANDOFF_CODE_LEN}}$`).test(c)) return fail('code-format');
  if (c !== a.handoff.code) return fail('code-wrong');
  completeHandoff(a, 'code');
  return succeed(a);
}
/** Tailor, in-store pickup: Sarah picked it up without her code — marked picked up (K-37: no drop-off any more). Starts the HANDOFF_AUTO_H
    countdown. After Sarah reported a problem she can mark it again, which clears the problem and restarts it. Errors: courier · already-marked. */
export function markHandedOver(id) {
  const a = must(id);
  const g = guardHandoff(a); if (g) return g;
  if (a.returnOption !== 'pickup') return fail('courier');
  const h = a.handoff;
  if (h.markedAt && !h.problemAt) return fail('already-marked');
  if (h.problemAt) { h.pausedMs += state.clock.now - toDate(h.problemAt).getTime(); h.problemAt = null; }
  h.marks += 1;
  Object.assign(h, { markedBy: 'tailor', markedAt: nowIso(), autoAt: isoMinute(new Date(state.clock.now + POLICY.HANDOFF_AUTO_H * HOUR_MS)) });
  say(a, `${firstName(tailorById(a.tailorId))} marked it picked up`, 'You marked it picked up');
  notify(a, 'picked-up-marked');
  return succeed(a);
}
/** Customer: "Confirm received" (K-48.3, was "I got it") completes it right away (also after she reported a problem) — only once
    confirmReceivedOpen (D-09). Errors: not-awaiting-handoff · too-early · offline. */
export function confirmReceived(id) {
  const a = must(id);
  const g = guardHandoff(a); if (g) return g;
  if (!confirmReceivedOpen(a)) return fail('too-early');
  if (state.sim.network === 'offline') return fail('offline');                                 // S-12: it charges the hold
  completeHandoff(a, 'customer');
  return succeed(a);
}
/** Customer: "I didn't get it" once the tailor marked it — stops the automatic completion and the unclaimed capture until it is sorted out. */
export function reportNotReceived(id) {
  const a = must(id);
  const g = guardHandoff(a); if (g) return g;
  if (!a.handoff.markedAt) return fail('not-marked');
  if (a.handoff.problemAt) return fail('already-reported');
  a.handoff.problemAt = nowIso();
  say(a, 'You said you didn’t get it', `${state.customer.first} says she didn’t get it`);
  notify(a, 'not-received');
  return succeed(a);
}
/* ---------- S-35: the courier's trip — booked → out (the tailor handed it over) → delivered (door / lobby, a photo) | returned ---------- */
/** Tailor: "Handed to courier" — the courier has it; Sarah is told it is on its way. Errors: not-courier · no-window · already-out · offline. */
export function courierCollected(id) {
  const a = must(id);
  const g = guardHandoff(a); if (g) return g;
  if (a.returnOption !== 'courier') return fail('not-courier');
  const trip = (a.handoff.trip ??= { state: 'booked' });
  if (!a.handoff.slot || trip.state === 'returned') return fail('no-window');
  if (trip.state === 'out') return fail('already-out');
  if (state.sim.network === 'offline') return fail('offline');
  Object.assign(trip, { state: 'out', outAt: nowIso() });
  say(a, 'The courier has your order', `You handed ${state.customer.first}’s order to the courier`);
  notify(a, 'courier-on-way');
  return succeed(a);
}
/** The Taily courier delivered it (the Test-flows Demo action stands in for the delivery partner): at her door, or K-43's lobby drop — it
    completes the order and charges (K-43), with the courier's photo as proof. Errors: not-courier · courier-returned. */
export function courierDelivered(id, { to = 'door' } = {}) {
  const a = must(id);
  const g = guardHandoff(a); if (g) return g;
  if (a.returnOption !== 'courier') return fail('not-courier');
  if (a.handoff.trip?.state === 'returned') return fail('courier-returned');
  const at = nowIso();
  if (a.handoff.trip) Object.assign(a.handoff.trip, { state: 'delivered', outAt: a.handoff.trip.outAt ?? at });
  completeHandoff(a, 'courier', at, { delivery: { at, to: to === 'lobby' ? 'lobby' : 'door', proof: 'photo' } });
  return succeed(a);
}
/** The courier couldn't deliver (`no-access`) or never came (`no-courier`): the order is back with the tailor and Sarah picks a new window
    (no extra charge). The hold stays. Errors: not-courier · courier-returned. */
export function courierFailed(id, reason = 'no-access') {
  const a = must(id);
  const g = guardHandoff(a); if (g) return g;
  if (a.returnOption !== 'courier') return fail('not-courier');
  const trip = (a.handoff.trip ??= { state: 'booked' });
  if (trip.state === 'returned') return fail('courier-returned');
  Object.assign(trip, { state: 'returned', failedAt: nowIso(), reason: reason === 'no-courier' ? 'no-courier' : 'no-access', fails: (trip.fails ?? 0) + 1 });
  say(a, reason === 'no-courier' ? 'The courier didn’t come. Pick a new delivery window.' : 'The courier couldn’t deliver it. Pick a new delivery window.',
    reason === 'no-courier' ? 'The courier didn’t come for the order' : 'The courier couldn’t deliver it and is bringing it back to you');
  notify(a, 'delivery-failed', { x: { reason: trip.reason } });
  notify(a, 'delivery-failed-t', { x: { reason: trip.reason } });
  return succeed(a);
}
/** S-35: within COURIER_REPORT_H of a courier delivery Sarah can say it never reached her — a Taily review (track A2 resolves it). */
export const deliveryReportOpen = (a) => a?.status === 'completed' && a.handoff?.completedBy === 'courier' && !a.handoff.missingAt
  && state.clock.now < toDate(a.handoff.completedAt).getTime() + POLICY.COURIER_REPORT_H * HOUR_MS;
export function reportMissingDelivery(id) {
  const a = must(id);
  if (!deliveryReportOpen(a)) return fail('not-open');
  a.handoff.missingAt = nowIso();
  openTailyReview(a, 'delivery-missing', { by: 'customer' });
  say(a, 'You told us the delivery didn’t reach you. Taily is looking into it.', `${state.customer.first} says the delivery didn’t reach her. Taily is looking into it.`);
  notify(a, 'delivery-missing-t');
  return succeed(a);
}
/** D-04: the charge failed — Sarah pays with a card (her updated one). Completed orders then queue the payout; an unclaimed charge pays the
    tailor as D-03 says. Errors: not-failed · offline · card-declined. */
export function retryCapture(id, cardId = null) {
  const a = must(id);
  const b = a.payments.balance;
  if (b.state !== 'capture-failed') return fail('not-failed');
  if (state.sim.network === 'offline') return fail('offline');
  if (state.sim.card === 'declined') return fail('card-declined');
  Object.assign(b, { state: 'captured', captureReason: b.failReason ?? 'handoff', capturedAt: nowIso(), retriedCardId: cardId });
  if (cardId) a.balanceCardId = cardId;
  if (!hasJobPayout(a) && (a.status === 'completed' || b.captureReason === 'unclaimed')) addPayout(a, a.money.payout, 'job');
  say(a, `You paid ${fmtExact(b.cents)}`, `${state.customer.first} updated her card and paid`);
  notify(a, 'card-fixed-t');
  return succeed(a);
}

/* ---------- Study-1 B1: edit the job after the fitting (K-30 overruled: approve only; defaults 11, 13) ---------- */
const lineSig = (l) => `${lineKey(l)}:${l.cents}`;
const sameLines = (x, y) => x.map(lineSig).sort().join('|') === y.map(lineSig).sort().join('|');
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
/** The price of an edit: the edited lines, the rush for the (new) need-by date — never above what was approved, so a later date can only
    lower it — and the captured deposit. Cents, `quote()` shape. */
export function editQuote(a, lines, needBy = a.job.needBy) {
  const r = rushFor(tailorById(a.tailorId), a.slot.start, needBy);
  const rush = Math.min(a.money.rush, r.cents);
  const q = quote({ lines, homeFee: a.money.homeFee, rush, deposit: a.payments.deposit.cents });
  q.rushDays = rush === a.money.rush ? a.money.rushDays : r.days;
  return q;
}
/** An edit (sent, or a draft `{ lines, needBy }`) against the approved order: the change rows (`priceChangeView` vs `a.lines`), both
    quotes and the due dates. Null without an edit. */
export function jobEditView(appt, e = appt?.edit) {
  if (!appt || !e) return null;
  const lines = e.lines ?? appt.lines;
  const pv = priceChangeView(appt, lines);
  const needBy = e.needBy ?? appt.job.needBy;
  const needByWas = e.state === 'pending' || !e.state ? appt.job.needBy : (e.needByWas ?? appt.job.needBy);
  const after = editQuote(appt, lines, needBy);
  return {
    garments: pv.garments, counts: pv.counts, changed: pv.changed, before: appt.money, after, delta: after.total - appt.money.total,
    needBy, needByWas, dueChanged: needBy !== needByWas, reason: e.reason ?? '', reasonMasked: !!e.reasonMasked, photo: e.photo ?? null,
    sentAt: e.sentAt ?? null, state: e.state ?? null, revisions: e.revisions ?? 0,
  };
}
/** The tailor edits the job between the fitting and Mark ready (status `in-progress`). Price, due date or the work need Sarah's approval:
    `lines` = the whole order against the APPROVED one (same rules as the final order), `needBy` an ISO day from today on, `reason` required
    (masked, ≤ NOTE_MAX), `photo` optional. It can't be declined (K-30): if Sarah disagrees she messages the tailor, who revises it — one
    pending edit at a time, sending again replaces it (default 13). Errors: not-in-progress · no-items · <line errors> · due-invalid ·
    no-change · reason-required · reason-long. */
export function sendJobEdit(id, { lines, needBy = null, reason = '', photo = false } = {}) {
  const a = must(id);
  if (a.status !== 'in-progress') return fail('not-in-progress');
  if (!Array.isArray(lines) || !lines.length) return fail('no-items');
  const bad = lineErrors(a, lines);
  if (bad) return fail(bad);
  const due = needBy ?? a.job.needBy;
  if (!ISO_DAY.test(String(due)) || due < isoDay(nowIso())) return fail('due-invalid');
  const changed = !sameLines(a.lines, lines);
  if (!changed && due === a.job.needBy) return fail('no-change');
  const why = String(reason ?? '').trim();
  if (!why) return fail('reason-required');
  if ([...why].length > TAILOR_LIMITS.NOTE_MAX) return fail('reason-long');
  const masked = maskContact(why);
  const revising = a.edit?.state === 'pending';
  a.editSeq = (a.editSeq ?? 0) + 1;
  a.edit = {
    lines: clone(lines), marks: priceMarks(a.lines, lines), changed, needBy: due, needByWas: a.job.needBy,
    reason: masked.text, reasonMasked: masked.masked,
    photo: photo ? { id: `e${a.editSeq}`, at: nowIso(), tone: (a.editSeq - 1) % 4 } : null,
    sentAt: nowIso(), state: 'pending', revisions: revising ? (a.edit.revisions ?? 0) + 1 : 0, decidedAt: null,
  };
  const first = firstName(tailorById(a.tailorId));
  if (revising) say(a, `${first} updated the changes to your order`, 'You updated your changes');
  else say(a, `${first} edited your order`, `You sent your changes to ${state.customer.first}`);
  notify(a, 'edit-sent');
  return succeed(a);
}
/** Sarah approves: the edited lines and due date replace the approved ones (money re-quoted, deposit unchanged) and the work continues. */
export function approveJobEdit(id) {
  const a = must(id);
  if (a.status !== 'in-progress' || a.edit?.state !== 'pending') return fail('not-pending');
  const e = a.edit;
  const q = editQuote(a, e.lines, e.needBy);
  e.needByWas = a.job.needBy;
  a.lines = clone(e.lines);
  a.job.needBy = e.needBy;
  a.job.garments = garmentsFromLines(a);
  a.money = q;
  a.payments.balance.cents = q.balance;
  Object.assign(e, { state: 'approved', decidedAt: nowIso() });
  say(a, 'You approved the changes', `${state.customer.first} approved your changes`);
  notify(a, 'edit-approved');
  return succeed(a);
}
/** D-03 (K-30 unchanged): the tailor withdraws her pending edit — the approved order stands, Mark ready is open again. Errors: not-pending. */
export function withdrawJobEdit(id) {
  const a = must(id);
  if (a.status !== 'in-progress' || a.edit?.state !== 'pending') return fail('not-pending');
  Object.assign(a.edit, { state: 'withdrawn', decidedAt: nowIso() });
  say(a, `${firstName(tailorById(a.tailorId))} withdrew her changes. Your order stays as you approved it.`, 'You withdrew your changes');
  notify(a, 'edit-withdrawn');
  return succeed(a);
}

/* ---------- Study-1 B2: private General notes (K-31, default 14) ---------- */
const NOTE_OPEN = ['confirmed', 'fitting', 'price-change', 'in-progress', 'ready', 'awaiting-handoff'];   // D-19 (K-48): notes open from the accept (was the fitting, Study-1 default 14)
/** The tailor's private notes are hers from the fitting until the job is completed (then read-only). Nobody else ever reads them. */
export const notesEditable = (a) => !!a && NOTE_OPEN.includes(a.status);
const photoCount = (photos) => (typeof photos === 'number' ? photos : Array.isArray(photos) ? photos.length : 0);
/** A note's photos: `photos` = a count of new photos, or an array whose entries with an `id` are kept and the rest are new. */
function notePhotos(a, photos) {
  const list = typeof photos === 'number' ? Array.from({ length: photos }, () => ({})) : Array.isArray(photos) ? photos : [];
  return list.map((p) => {
    if (p?.id) return clone(p);
    a.notePhotoSeq = (a.notePhotoSeq ?? 0) + 1;
    return { id: `np${a.notePhotoSeq}`, at: nowIso(), tone: (a.notePhotoSeq - 1) % 4 };
  });
}
function noteError(a, text, photos) {
  if (!notesEditable(a)) return 'notes-closed';
  const t = String(text ?? '').trim();
  if (!t && !photoCount(photos)) return 'note-empty';
  if ([...t].length > NOTES_LIMITS.TEXT_MAX) return 'note-long';
  if (photoCount(photos) > NOTES_LIMITS.PHOTOS_MAX) return 'too-many-photos';
  return null;
}
/** Errors: notes-closed · note-empty (no text and no photo) · note-long · too-many-photos. */
export function addNote(id, { text = '', photos = [] } = {}) {
  const a = must(id);
  const err = noteError(a, text, photos);
  if (err) return fail(err);
  a.noteSeq = (a.noteSeq ?? 0) + 1;
  const note = { id: `note${a.noteSeq}`, text: String(text ?? '').trim(), photos: notePhotos(a, photos), at: nowIso(), updatedAt: null };
  (a.notes ??= []).push(note);
  return succeed(a, { note });
}
/** Replace a note's text and / or photos (omitted = unchanged). Errors as addNote + not-found. */
export function updateNote(id, noteId, { text, photos } = {}) {
  const a = must(id);
  if (!notesEditable(a)) return fail('notes-closed');
  const note = (a.notes ?? []).find((n) => n.id === noteId);
  if (!note) return fail('not-found');
  const nextText = text === undefined ? note.text : text;
  const nextPhotos = photos === undefined ? note.photos : photos;
  const err = noteError(a, nextText, nextPhotos);
  if (err) return fail(err);
  Object.assign(note, { text: String(nextText ?? '').trim(), photos: notePhotos(a, nextPhotos), updatedAt: nowIso() });
  return succeed(a, { note });
}
export function removeNote(id, noteId) {
  const a = must(id);
  if (!notesEditable(a)) return fail('notes-closed');
  const index = (a.notes ?? []).findIndex((n) => n.id === noteId);
  if (index < 0) return fail('not-found');
  const [note] = a.notes.splice(index, 1);
  return succeed(a, { note, index });
}
/** Undo a removeNote: the same note back at `index`. */
export function restoreNote(id, note, index) {
  const a = must(id);
  if (!notesEditable(a)) return fail('notes-closed');
  if (!note?.id || (a.notes ?? []).some((n) => n.id === note.id)) return fail('duplicate');
  const at = Math.max(0, Math.min(Number.isInteger(index) ? index : a.notes.length, a.notes.length));
  a.notes.splice(at, 0, clone(note));
  return succeed(a);
}
export function addNotePhoto(id, noteId) {
  const a = must(id);
  const note = (a.notes ?? []).find((n) => n.id === noteId);
  if (!notesEditable(a)) return fail('notes-closed');
  if (!note) return fail('not-found');
  if (note.photos.length >= NOTES_LIMITS.PHOTOS_MAX) return fail('too-many-photos');
  const [photo] = notePhotos(a, 1);
  note.photos.push(photo);
  note.updatedAt = nowIso();
  return succeed(a, { photo });
}
/** Errors: notes-closed · not-found · note-empty (it was the note's only content). */
export function removeNotePhoto(id, noteId, photoId) {
  const a = must(id);
  const note = (a.notes ?? []).find((n) => n.id === noteId);
  if (!notesEditable(a)) return fail('notes-closed');
  if (!note || !note.photos.some((p) => p.id === photoId)) return fail('not-found');
  if (!note.text && note.photos.length === 1) return fail('note-empty');
  note.photos = note.photos.filter((p) => p.id !== photoId);
  note.updatedAt = nowIso();
  return succeed(a);
}

/* ---------- K-41 (R3, D-296): the 24-hour reminder ----------
   No new status: `a.reminder = { sentAt, confirmedAt, nudgedAt }`. tick() sends it CANCEL_WINDOW_H + REMINDER_LEAD_H before the visit
   (26 h: Reschedule and Cancel on it are still free for 2 h) to a visit whose time was set before then (booked or moved < 26 h ahead: no
   prompt, the plain 24 h rule), and one nudge REMINDER_NUDGE_H before the visit if she never confirmed. confirmVisit closes the free window
   early (money.js cancelTerms). K-43 (D-300): a visit she was asked about and still hasn't confirmed REMINDER_AUTOCANCEL_H before it starts
   is cancelled by tick() at that time (reason 'unconfirmed', the customer late-cancel money: the tailor keeps the deposit). */
function freshReminder() { return { sentAt: null, confirmedAt: null, nudgedAt: null }; }
/** When the current visit time was set: the last accept (or accepted suggestion) or reschedule. Epoch ms. */
function slotSetAt(a) {
  const h = [...a.history].reverse().find((x) => x.status === 'confirmed' || x.status === 'rescheduled');
  return toDate(h?.at ?? a.requestedAt).getTime();
}
/** When the reminder goes out (epoch ms): CANCEL_WINDOW_H + REMINDER_LEAD_H before the visit. */
export const reminderAt = (a) => toDate(a.slot.start).getTime() - (POLICY.CANCEL_WINDOW_H + POLICY.REMINDER_LEAD_H) * HOUR_MS;
/** When the free window closes by the clock (epoch ms): CANCEL_WINDOW_H before the visit (Confirm can close it earlier). */
export const freeUntil = (a) => toDate(a.slot.start).getTime() - POLICY.CANCEL_WINDOW_H * HOUR_MS;
/** The one nudge's time (epoch ms): REMINDER_NUDGE_H before the visit. */
export const nudgeAt = (a) => toDate(a.slot.start).getTime() - POLICY.REMINDER_NUDGE_H * HOUR_MS;
/** K-43 (D-300): when an unconfirmed visit is cancelled (epoch ms): REMINDER_AUTOCANCEL_H before the visit. */
export const autoCancelAt = (a) => toDate(a.slot.start).getTime() - POLICY.REMINDER_AUTOCANCEL_H * HOUR_MS;
/** A confirmed visit whose time was set at or before its reminder time gets the reminder. */
export const reminderEligible = (a) => !!a && a.status === 'confirmed' && slotSetAt(a) <= reminderAt(a);
function remindTick(a) {
  const r = (a.reminder ??= freshReminder());
  const t = state.clock.now;
  const start = toDate(a.slot.start).getTime();
  let moved = false;
  if (t < start) {   // a clock jump past the start sends nothing
    if (!r.sentAt && reminderEligible(a) && t >= reminderAt(a)) {
      r.sentAt = isoMinute(new Date(reminderAt(a)));
      r.texted = notify(a, 'reminder', { at: r.sentAt }).status === 'delivered';   // D-02: only a delivered text can lead to the auto-cancel
      moved = true;
    }
    if (r.sentAt && !r.confirmedAt && !r.nudgedAt && t >= nudgeAt(a)) {
      r.nudgedAt = isoMinute(new Date(Math.max(nudgeAt(a), toDate(r.sentAt).getTime())));
      if (t < autoCancelAt(a)) notify(a, 'nudge', { at: r.nudgedAt, x: { autoCancel: !!r.texted } });
      moved = true;
    }
  }
  /* K-43: asked, never confirmed, REMINDER_AUTOCANCEL_H before → cancelled, stamped at that time (also when the clock jumped past it).
     D-02 (K-48): only after a DELIVERED reminder to an opted-in number — otherwise the plain 24 h rule (the visit stays booked). */
  if (r.sentAt && r.texted && !r.confirmedAt && t >= autoCancelAt(a)) {
    if (!r.nudgedAt) r.nudgedAt = isoMinute(new Date(Math.max(nudgeAt(a), toDate(r.sentAt).getTime())));
    autoCancel(a);
    return true;
  }
  return moved;
}
/** K-43 (D-300): the visit she never confirmed is cancelled at `autoCancelAt` (stamped then). Inside the 24 h window, so it follows the
    customer late-cancel rule: the deposit is kept and paid to the tailor (D-05); the order comes back as the draft so she can rebook. */
function autoCancel(a) {
  const at = isoMinute(new Date(autoCancelAt(a)));
  const kept = a.payments.deposit.cents;
  setStatus(a, 'cancelled');
  a.history[a.history.length - 1].at = at;
  a.payments.deposit.state = 'kept';
  a.cancel = { by: 'system', reason: 'unconfirmed', at, refund: 0, kept, tailorPaid: kept };
  addPayout(a, kept, 'kept-deposit', at);
  restoreDraftIfEmpty(a);
  post(a.tailorId, 'system', `We cancelled the visit because you didn’t confirm by ${fmtTime(at)}`, { at, tailorText: `We cancelled the visit because ${state.customer.first} didn’t confirm by ${fmtTime(at)}` });
  notify(a, 'auto-cancel', { at });
  notify(a, 'auto-cancel-t', { at });
}
/** D-02: will an unconfirmed visit be cancelled REMINDER_AUTOCANCEL_H before? Only when the 24-hour reminder text was delivered. */
export const autoCancelArmed = (a) => !!a?.reminder?.texted;
/** Where the reminder stands, before the visit starts: null (none sent) · 'asked' (sent, free window open, her move) · 'confirmed' ·
    'missed' (sent, never confirmed, the free window closed — the visit stays booked). */
export function reminderState(a) {
  if (!a || a.status !== 'confirmed' || !a.reminder?.sentAt) return null;
  if (state.clock.now >= toDate(a.slot.start).getTime()) return null;
  if (a.reminder.confirmedAt) return 'confirmed';
  return state.clock.now <= freeUntil(a) ? 'asked' : 'missed';   // the 'until' is inclusive, like cancelTerms (M6-M-11)
}
/** The prompt is up (Home card, c-booking strip + Confirm): the reminder went out and the free window is still open. */
export const reminderDue = (a) => reminderState(a) === 'asked';
/** The customer's visit whose reminder is waiting on her, or null. */
export const visitReminder = () => apptsFor('customer').find(reminderDue) ?? null;
/** Sarah answers the reminder: still on. Customer side; a confirmed visit, the reminder sent, before the visit starts. Closes the free
    window (cancelTerms → late); after the 24 h mark it only tells the tailor. No thread line, no push to the tailor (she sees the state). */
export function confirmVisit(id) {
  const a = must(id);
  if (a.status !== 'confirmed') return fail('not-confirmed');
  if (!a.reminder?.sentAt) return fail('not-asked');
  if (a.reminder.confirmedAt) return fail('already-confirmed');
  if (state.clock.now >= toDate(a.slot.start).getTime()) return fail('visit-started');
  a.reminder.confirmedAt = nowIso();
  return succeed(a);
}

/* ---------- K-43 (D-301): notifications are text messages ----------
   Taily is a web app first: every notification is an SMS to the verified phone with a short unique link back into the app. */
const LINK_ABC = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
/** The text's unique link, deterministic per appointment + event ("taily.app/r/8F3K2Q"): FNV-1a of `${apptId}:${event}`, 6 characters. */
export function textLink(apptId, event) {
  let h = 0x811c9dc5;
  for (const ch of `${apptId}:${event}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  let out = '';
  for (let i = 0; i < 6; i += 1) { h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0; out += LINK_ABC[h & 31]; }
  return `taily.app/r/${out}`;
}

/* ---------- pre-MVP A1: the notification matrix (D-02, DG-2 A; js/texts.js is the catalogue, docs/v5/TEXTS.md its table) ----------
   EVERY event that would be a notification fires ONE function, notify(appt, event), which writes the text into `state.outbox` — sent when the
   recipient's texts are on (`state.texts[who].on`), else kept as 'off' (the app shows the same state: the in-app fallback). K-48.4: no quiet
   hours, every text goes out immediately. The prototype draws a new text over the screen (system.js) when the Demo actions move the clock,
   or live while `sim.texts` is 'on'. */
/** Send (or hold back) one text. `at` back-stamps a timer's text at its due time; `x` = values the body needs that the appointment lacks. */
export function notify(a, event, { at = nowIso(), x = {} } = {}) {
  const def = TEXTS[event];
  if (!def) throw new Error(`notify: unknown text "${event}"`);
  const to = def.to;
  const pref = state.texts[to] ?? { on: false };
  const status = !pref.on ? 'off' : state.sim.sms === 'undelivered' ? 'undelivered' : 'delivered';
  const t = a ? tailorById(a.tailorId) : state.tailors[0];
  const body = def.body(textCtx({ a, t, cust: state.customer, now: toDate(at).getTime(), x }));
  const key = a?.id ?? to;
  const n = state.outbox.filter((m) => m.key === key && m.event === event).length;
  const entry = { id: `x${++textSeq}`, seq: textSeq, event, to, apptId: a?.id ?? null, caseId: x.caseId ?? null, key, body, link: textLink(key, n ? `${event}:${n}` : event), at, land: def.land ?? null, status };
  state.outbox.push(entry);
  return entry;
}
/** The texts one person was sent (or would have been), newest last. */
export const textsFor = (who) => state.outbox.filter((m) => m.to === who);
/** Are this person's texts on? (customer: booking texts; tailor: requests and job texts) */
export const textsOn = (who) => !!state.texts[who]?.on;
/** Turn texts on or off from Account → Texts (c-texts / t-texts). On sends the confirmation text. Errors: no-change. */
export function setTexts(who, on) {
  const p = state.texts[who];
  if (!p) return fail('unknown-person');
  if (p.on === !!on) return fail('no-change');
  Object.assign(p, { on: !!on, changedAt: nowIso(), ...(on ? { stoppedAt: null } : {}) });
  if (on) notify(null, who === 'tailor' ? 'texts-on-t' : 'texts-on');
  return { ok: true, prefs: p };
}
/** A reply to one of Taily's texts (simulated): STOP turns texts off (carriers require it), START back on, HELP answers. */
export function textReply(who, word) {
  const w = String(word ?? '').trim().toUpperCase();
  const p = state.texts[who];
  if (!p) return fail('unknown-person');
  if (w === 'STOP') { Object.assign(p, { on: false, stoppedAt: nowIso(), changedAt: nowIso() }); return { ok: true, prefs: p }; }
  if (w === 'START') return p.on ? { ok: true, prefs: p } : setTexts(who, true);
  if (w === 'HELP') return { ok: true, prefs: p, help: true, text: notify(null, who === 'tailor' ? 'help-reply-t' : 'help-reply') };   // B-05 (A2): HELP points at Taily Help
  return fail('unknown-reply');
}

/* ---------- K-48.1 / K-48.5: what the admin is told, and the cases Taily reviews (the admin + Help UI is track A2's) ---------- */
const REVIEW_WHY = {
  'final-order-unanswered': (a) => `Final order unanswered ${POLICY.FINAL_ORDER_REVIEW_D} days`,
  'problem-open': (a) => `Handoff problem open ${POLICY.PROBLEM_REVIEW_H} hours`,
  'visit-unanswered': (a) => `Nobody answered “Did the visit happen?” in ${POLICY.VISIT_CHECK_ADMIN_H} hours`,
  'visit-disputed': (a) => 'The two sides disagree about the visit',
  'no-show-disputed': (a) => `${state.customer.first} says she was there (no-show)`,
  'tailor-no-show-disputed': (a) => `${firstName(tailorById(a.tailorId))} says she came (tailor no-show)`,
  'delivery-missing': (a) => 'A courier delivery didn’t reach the customer',
  'ready-no-way-back': (a) => `Ready ${POLICY.READY_DEFAULT_D} days, no in-store pickup to default to`,
};
/** Tell the admin (K-48.1: support = the CEO). Kinds: 'review' (an A1 review opened) · 'case' (a Help case) · 'safety' (a report or a block) ·
    'message' (someone wrote on an open case). Every one is also a text to the admin ('admin-case' / 'admin-message', js/texts.js). */
function adminNotify(kind, a, text, at = nowIso(), { caseId = null } = {}) {
  const n = { id: `n${state.admin.notifications.length + 1}`, kind, apptId: a?.id ?? null, caseId, text, at, read: false };
  state.admin.notifications.push(n);
  return n;
}
/** Open a Taily review on an appointment (one open case at a time) and notify the admin. Stored on `a.tailyReview` — `a.review` is the
    customer's star review. `{ reason, openedAt, by, note, closedAt }`. A2: the review runs as a Help case (reviewCase) both people see. */
function openTailyReview(a, reason, { by = 'system', at = nowIso(), note = '' } = {}) {
  if (a.tailyReview && !a.tailyReview.closedAt) return a.tailyReview;
  a.tailyReview = { reason, openedAt: at, by, note, closedAt: null };
  const c = reviewCase(a, reason, { by, at });
  const why = `${REVIEW_WHY[reason]?.(a) ?? reason} · ${customerFull()} with ${tailorById(a.tailorId)?.name ?? 'the tailor'}`;
  adminNotify('review', a, why, at, { caseId: c.id });
  notify(a, 'admin-case', { at, x: { why, ref: c.ref, caseId: c.id } });
  return a.tailyReview;
}
/** Close the appointment's Taily review (A1's own ends — approved, fitting started, the 24 h cancel — and A2's decisions); its open Help case
    closes with it (a system line says why). */
function closeReview(a, outcome, at = nowIso()) {
  const r = a.tailyReview;
  if (!r || r.closedAt) return;
  Object.assign(r, { closedAt: at, outcome });
  const c = openCaseOfAppt(a.id);
  if (c && c.kind === 'review') {
    const line = REVIEW_ENDED[outcome];
    if (line) for (const side of c.sides) caseLine(c, side, line(a, side), { at });
    Object.assign(c, { state: 'closed', closedAt: at, outcome: { key: outcome, at, lines: {} } });
  }
}
const customerFull = () => `${state.customer.first} ${state.customer.last ?? ''}`.trim();
/** Every case waiting on Taily, oldest first: `[{ apptId, appt, reason, openedAt, by, note }]` (track A2 surfaces these). */
export function openReviews() {
  return state.appts.filter((a) => a.tailyReview && !a.tailyReview.closedAt)
    .map((a) => ({ apptId: a.id, appt: a, ...a.tailyReview }))
    .sort((x, y) => (x.openedAt < y.openedAt ? -1 : x.openedAt > y.openedAt ? 1 : 0));
}
/** The open Taily review on this appointment, or null. */
export const tailyReviewOf = (a) => (a?.tailyReview && !a.tailyReview.closedAt ? a.tailyReview : null);

/* ============================================================
   pre-MVP A2 (K-48.1, K-49 DG-1 option B, D-14, S-32, D-21): Taily Help.
   A case is a thread with Taily ("Taily Help"), attached to an order (or to nothing: a general question). Each person has their own
   side of it (`side`: what Sarah reads / what Amara reads — never the other's words); the admin (Kevin, K-48.1: support = the CEO) reads
   both and answers either. Every new case and every A1 review (openTailyReview) notifies the admin and texts him. The admin's money
   actions are pure transitions on the case's order; closing a case posts the decision, in dollars, to each side and texts them
   (`case-decided` / `taily-replied-t`, or `help-replied(-t)` for a case with no order) and closes the order's `tailyReview`.
   Shape: `{ id, ref, apptId, kind: 'help'|'review'|'safety', opener, topic, reason, sides, openedAt, state: 'open'|'closed', closedAt,
   outcome: { key, at, lines }, messages: [{ id, side, from: 'customer'|'tailor'|'taily'|'system', text, photos, masked, at, kind? }],
   read: { customer, tailor, admin }, actions: [{ kind, cents, at }], safety }`.
   ============================================================ */
export const HELP_TOPICS = ['no-show', 'not-received', 'final-order', 'after-completion', 'charge', 'damage', 'safety', 'other'];
const caseNum = (m) => Number(String(m?.id ?? '').slice(1)) || 0;
const lastNum = (c) => caseNum(c.messages[c.messages.length - 1]);
const isoPlusH = (iso, h) => isoMinute(new Date(toDate(iso).getTime() + h * HOUR_MS));

/** The words a topic chip says, for this person on this order. */
export function topicLabel(topic, who = 'customer', a = null) {
  const tf = firstName(tailorById(a?.tailorId) ?? state.tailors[0]);
  const cf = state.customer.first;
  const home = a?.job?.visitType !== 'shop';
  const mine = who === 'tailor';
  switch (topic) {
    case 'no-show':
      if (mine) return a?.cancel?.reason === 'tailor-no-show' ? `I was there, ${cf} wasn’t` : `${cf} wasn’t ${home ? 'home' : 'there'}`;
      return a?.cancel?.reason === 'no-show' ? 'I was there' : `${tf} didn’t come`;
    case 'not-received': return mine ? `${cf} says she didn’t get it` : 'I didn’t get my order';
    case 'final-order': return 'My final order is stuck';
    case 'after-completion': return mine ? 'A problem after the job' : 'Something isn’t right';
    case 'charge': return mine ? 'My payout' : 'A charge or refund';
    case 'damage': return 'A garment was damaged or lost';
    case 'safety': return 'I don’t feel safe';
    default: return 'Something else';
  }
}
/** The topics that fit this order's state for `who` (DG-1: the topic chips) — state-specific ones first. No order: the general ones. */
export function helpTopics(a, who = 'customer') {
  if (!a) return who === 'tailor' ? ['charge', 'safety', 'other'] : ['charge', 'damage', 'safety', 'other'];
  const list = [];
  const started = state.clock.now >= toDate(a.slot.start).getTime();
  if ((a.status === 'confirmed' && started) || (a.status === 'cancelled' && ['no-show', 'tailor-no-show', 'no-record'].includes(a.cancel?.reason))) list.push('no-show');
  if (a.status === 'awaiting-handoff' && (a.handoff?.markedAt || a.handoff?.problemAt || confirmReceivedOpen(a))) list.push('not-received');
  else if (deliveryReportOpen(a) || a.handoff?.missingAt) list.push('not-received');
  if (a.status === 'price-change' || (a.status === 'in-progress' && a.edit?.state === 'pending')) list.push('final-order');
  if (a.status === 'completed') list.push('after-completion');
  list.push('charge');
  if (['fitting', 'price-change', 'in-progress', 'ready', 'awaiting-handoff', 'completed'].includes(a.status)) list.push('damage');
  list.push('safety', 'other');
  return list;
}
/** What the admin calls a case (a-inbox / a-case). */
const ADMIN_TOPIC = {
  'no-show': 'No-show', 'not-received': 'Didn’t get the order', 'final-order': 'Final order stuck', 'after-completion': 'Problem after completion',
  charge: 'Charge or payout question', damage: 'Garment damaged or lost', safety: 'Safety', other: 'Something else',
};
const REVIEW_TITLE = {
  'final-order-unanswered': 'Final order unanswered', 'problem-open': 'Handoff problem open', 'visit-unanswered': 'Visit not recorded',
  'visit-disputed': 'Visit disputed', 'no-show-disputed': 'No-show disputed', 'tailor-no-show-disputed': 'Tailor no-show disputed',
  'delivery-missing': 'Delivery missing', 'ready-no-way-back': 'Ready, no way back',
};
/** The case's title for the admin: the review, the safety report, or the Help topic. */
export function caseTitle(c) {
  if (!c) return '';
  if (c.kind === 'safety') return c.safety?.block ? 'Safety · blocked' : 'Safety report';
  if (c.kind === 'review') return REVIEW_TITLE[c.reason] ?? 'Taily review';
  return c.topic ? ADMIN_TOPIC[c.topic] : 'Message to Taily';
}

export const caseById = (id) => state.cases.find((c) => c.id === id) ?? null;
/** The order's one open case (a report / block is its own safety case and never counts). */
export const openCaseOfAppt = (apptId) => state.cases.find((c) => c.apptId === apptId && c.state === 'open' && c.kind !== 'safety') ?? null;
/** The case a person sees on this order: the open one they are part of, else their latest closed one, else null. */
export function caseOfAppt(apptId, who) {
  const mine = state.cases.filter((c) => c.apptId === apptId && c.kind !== 'safety' && c.sides.includes(who));
  return mine.find((c) => c.state === 'open') ?? mine[mine.length - 1] ?? null;
}
/** A person's cases (Help home): open first, then the newest activity first. */
export function casesFor(who) {
  const at = (c) => c.messages[c.messages.length - 1]?.at ?? c.openedAt;
  return state.cases.filter((c) => c.sides.includes(who))
    .sort((x, y) => (x.state === y.state ? (at(x) < at(y) ? 1 : at(x) > at(y) ? -1 : caseNum(y) - caseNum(x)) : x.state === 'open' ? -1 : 1));
}
/** Messages of one side (a person reads only theirs; the admin passes the side it is looking at). */
export const caseMessages = (c, side) => (c?.messages ?? []).filter((m) => m.side === side);
/** Unread for `reader`: a person's side, Taily's words; the admin: anything a person wrote. */
export function caseUnread(c, reader) {
  if (!c) return 0;
  const seen = c.read?.[reader] ?? 0;
  if (reader === 'admin') return c.messages.filter((m) => (m.from === 'customer' || m.from === 'tailor') && caseNum(m) > seen).length;
  return c.messages.filter((m) => m.side === reader && m.from === 'taily' && caseNum(m) > seen).length;
}
/** When Taily owes a reply on this side (or any side, `side` null) — HELP_REPLY_H after the first message nobody from Taily answered yet (or
    after the case opened, before anyone wrote). null when Taily spoke last there, or the case is closed. */
export function caseReplyBy(c, side = null) {
  if (!c || c.state !== 'open') return null;
  const sides = side ? [side] : c.sides;
  let first = null;
  for (const s of sides) {
    const real = c.messages.filter((m) => m.side === s && m.from !== 'system' && m.kind !== 'ack');
    const lastTaily = real.map((m) => m.from).lastIndexOf('taily');
    const owed = real.slice(lastTaily + 1).find((m) => m.from === 'customer' || m.from === 'tailor')?.at ?? (lastTaily < 0 && !real.length ? c.openedAt : null);
    if (owed && (!first || owed < first)) first = owed;
  }
  if (!first && c.kind === 'review' && !c.messages.some((m) => m.from === 'taily' && m.kind !== 'ack' && m.kind !== 'opening')) first = c.openedAt;
  return first ? isoPlusH(first, POLICY.HELP_REPLY_H) : null;
}
/** One screen-ready read of a case for a person or the admin. */
export function caseView(c, reader) {
  if (!c) return null;
  const replyBy = caseReplyBy(c, reader === 'admin' ? null : reader);
  const open = c.state === 'open';
  return {
    c, ref: c.ref, open, title: caseTitle(c), replyBy, overdue: !!replyBy && toDate(replyBy).getTime() < state.clock.now,
    waiting: !open ? null : replyBy ? 'taily' : 'you',
    decision: c.outcome?.lines?.[reader] ?? null, closedAt: c.closedAt, unread: caseUnread(c, reader),
    appt: c.apptId ? getAppt(c.apptId) : null,
  };
}

function newCase({ apptId = null, kind = 'help', opener, topic = null, reason = null, sides = [], at = nowIso() }) {
  const n = ++caseSeq;
  const c = {
    id: `case${n}`, ref: `TY-${4820 + n}`, apptId, kind, opener, topic, reason, sides: [...sides], openedAt: at, state: 'open', closedAt: null, outcome: null,
    messages: [], read: { customer: 0, tailor: 0, admin: 0 }, actions: [], safety: null, adminTextAt: null,
  };
  state.cases.push(c);
  return c;
}
/** A line on one side of a case. `from` 'taily' (default) | 'customer' | 'tailor' | 'system'; `kind` 'ack' (the automatic answer) | 'opening'
    (Taily's first words on a review) | 'decision'. */
function caseLine(c, side, text, { from = 'taily', at = nowIso(), photos = 0, masked = false, kind = '' } = {}) {
  if (!c.sides.includes(side)) c.sides.push(side);
  const m = { id: `k${++caseMsgSeq}`, side, from, text, photos, masked, at, ...(kind ? { kind } : {}) };
  c.messages.push(m);
  return m;
}
const whoName = (who) => (who === 'tailor' ? firstName(state.tailors[0]) : state.customer.first);
/** The automatic answer to a new message (the CEO answers himself; this only says when). */
function ackText(c, who) {
  const by = fmtWhen(caseReplyBy(c, who) ?? isoPlusH(nowIso(), POLICY.HELP_REPLY_H));
  if (c.topic === 'safety' || c.kind === 'safety') return `If you’re in danger, call 911 first. Thanks for telling us, ${whoName(who)}. We read every safety report and reply by ${by}.`;
  return `Thanks, ${whoName(who)}. Taily has your message and replies by ${by}. Add details or photos here.`;
}
/** Tell the admin about a new case (a notification + a text, K-48.1). */
function caseToAdmin(c, a, kind, at = nowIso()) {
  const who = c.opener === 'tailor' ? state.tailors[0].name : customerFull();
  const why = `${caseTitle(c)} · from ${who}${a ? ` · order ${a.id}` : ''}`;
  adminNotify(kind, a, why, at, { caseId: c.id });
  notify(a, 'admin-case', { at, x: { why, ref: c.ref, caseId: c.id } });
  c.adminTextAt = at;
}
/** Someone wrote on an open case: the admin is told — at most once per case every CHAT_TEXT_GAP_MIN while he hasn't read it. */
function caseMessageToAdmin(c, who) {
  const unreadBefore = caseUnread(c, 'admin') > 1;
  const gapOk = !c.adminTextAt || state.clock.now - toDate(c.adminTextAt).getTime() >= POLICY.CHAT_TEXT_GAP_MIN * MIN_MS;
  if (unreadBefore && !gapOk) return;
  const a = c.apptId ? getAppt(c.apptId) : null;
  adminNotify('message', a, `${who === 'tailor' ? state.tailors[0].name : customerFull()} wrote on ${c.ref} · ${caseTitle(c)}`, nowIso(), { caseId: c.id });
  notify(a, 'admin-message', { x: { who: whoName(who), ref: c.ref, caseId: c.id } });
  c.adminTextAt = nowIso();
}

/** A person opens Help (DG-1 B: the Get help person button, the tailor's ⋯ menu, Help home): a topic chip (sent as their first words) and / or
    a message. Reuses the order's open case (one per order; the other person joins it on their own side) or their open general case.
    Errors: unknown-person · topic · empty · too-many-photos · offline. */
export function openCase({ who, apptId = null, topic = null, text = '', photos = 0 } = {}) {
  if (!['customer', 'tailor'].includes(who)) return fail('unknown-person');
  const a = apptId ? must(apptId) : null;
  if (topic && !HELP_TOPICS.includes(topic)) return fail('topic');
  const raw = String(text ?? '').trim();
  const count = Array.isArray(photos) ? photos.length : photos;
  if (!topic && !raw && !count) return fail('empty');
  if (count > CHAT_LIMITS.PHOTOS_MAX) return fail('too-many-photos');
  if (state.sim.network === 'offline') return fail('offline');
  let c = a ? openCaseOfAppt(a.id) : state.cases.find((x) => !x.apptId && x.state === 'open' && x.opener === who && x.kind === 'help');
  const fresh = !c;
  if (!c) c = newCase({ apptId: a?.id ?? null, kind: 'help', opener: who, topic, sides: [who] });
  else if (!c.sides.includes(who)) c.sides.push(who);
  if (topic && !c.topic) c.topic = topic;
  const joined = !fresh && !c.messages.some((m) => m.side === who && (m.from === who));
  if (topic) caseLine(c, who, topicLabel(topic, who, a), { from: who });
  const m = maskContact(raw);
  if (m.text || count) caseLine(c, who, m.text, { from: who, photos: count, masked: m.masked });
  if (fresh || joined) caseLine(c, who, ackText(c, who), { kind: 'ack' });
  c.read[who] = lastNum(c);
  if (fresh) caseToAdmin(c, a, 'case'); else caseMessageToAdmin(c, who);
  return { ok: true, case: c, fresh, masked: m.masked };
}
/** A person writes on their side of a case (masked like every thread). Errors: unknown-case · closed · not-a-party · empty · too-many-photos ·
    offline · send-failed (sim.send, one-shot). */
export function sendCaseMessage(caseId, who, { text = '', photos = 0 } = {}) {
  const c = caseById(caseId);
  if (!c) return fail('unknown-case');
  if (c.state !== 'open') return fail('closed');
  if (!c.sides.includes(who)) return fail('not-a-party');
  const count = Array.isArray(photos) ? photos.length : photos;
  if (!String(text).trim() && !count) return fail('empty');
  if (count > CHAT_LIMITS.PHOTOS_MAX) return fail('too-many-photos');
  if (state.sim.network === 'offline') return fail('offline');
  if (state.sim.send === 'fail') { state.sim.send = 'ok'; return fail('send-failed'); }
  const m = maskContact(text);
  const message = caseLine(c, who, m.text, { from: who, photos: count, masked: m.masked });
  c.read[who] = caseNum(message);
  caseMessageToAdmin(c, who);
  return { ok: true, case: c, message, masked: m.masked };
}
/** Everything on the reader's side is read ('customer' | 'tailor' | 'admin' — the admin also clears the case's notifications). */
export function markCaseRead(caseId, reader) {
  const c = caseById(caseId);
  if (!c) return fail('unknown-case');
  c.read[reader] = lastNum(c);
  if (reader === 'admin') for (const n of state.admin.notifications) if (n.caseId === c.id) n.read = true;
  return { ok: true, case: c };
}

/* ---- A1 reviews run as cases: Taily's first words to each side (the dollar amounts from the order) ---- */
const REVIEW_SAY = {
  'final-order-unanswered': (a, side, by) => (side === 'customer'
    ? `Your final order from ${firstName(tailorById(a.tailorId))} has waited ${POLICY.FINAL_ORDER_REVIEW_D} days. Approve it on your booking, or tell us here what’s holding it up. We’ll help you both by ${by}.`
    : `${state.customer.first} hasn’t approved your final order in ${POLICY.FINAL_ORDER_REVIEW_D} days, so we’re helping you both. Tell us anything we should know. We reply by ${by}.`),
  'problem-open': (a, side, by) => (side === 'customer'
    ? `You told us you didn’t get your order, and it’s still open. We’re looking into it with ${firstName(tailorById(a.tailorId))}. Tell us what happened by ${by}; photos help.`
    : `${state.customer.first} says she didn’t get her order, and it’s still open. Tell us when you handed it over by ${by}; a photo helps. Your payout waits until it’s sorted.`),
  'visit-unanswered': (a, side, by) => (side === 'customer'
    ? `Did your ${fmtWhen(a.slot.start)} visit with ${firstName(tailorById(a.tailorId))} happen? Answer on your booking, or tell us here by ${by}.`
    : `Did your ${fmtWhen(a.slot.start)} visit with ${state.customer.first} happen? Start the fitting if it did, or tell us here by ${by}.`),
  'visit-disputed': (a, side, by) => (side === 'customer'
    ? `You told us the visit didn’t happen, and ${firstName(tailorById(a.tailorId))} tapped I’m here at ${fmtTime(a.visitDay?.tailor?.hereAt ?? a.slot.start)}. We’re asking you both and decide by ${by}.`
    : `${state.customer.first} says the visit didn’t happen. You tapped I’m here at ${fmtTime(a.visitDay?.tailor?.hereAt ?? a.slot.start)}. Tell us what happened by ${by}.`),
  'no-show-disputed': (a, side, by) => (side === 'customer'
    ? `You told us you were there. ${firstName(tailorById(a.tailorId))} marked a no-show at ${fmtTime(a.cancel?.at ?? a.slot.start)}. Your ${fmtExact(a.payments.deposit.cents)} deposit stays on hold until we decide, by ${by}.`
    : `${state.customer.first} says she was there at ${fmtTime(a.slot.start)}. Your ${fmtExact(state.payouts.find((p) => p.apptId === a.id && p.kind === 'no-show')?.cents ?? noShowPayout(a.payments.deposit.cents))} no-show pay is on hold while we look. Tell us what happened by ${by}; the time you arrived or a photo of the door helps.`),
  'tailor-no-show-disputed': (a, side, by) => (side === 'customer'
    ? `${firstName(tailorById(a.tailorId))} says she came to your ${fmtTime(a.slot.start)} visit. Your ${fmtExact(a.payments.deposit.cents)} refund stands while we look. Tell us what happened by ${by}.`
    : `You told us you came. ${state.customer.first} reported you didn’t show up. Tell us what happened by ${by}; the time you arrived or a photo helps.`),
  'delivery-missing': (a, side, by) => (side === 'customer'
    ? `You told us the courier delivery didn’t reach you. We’re checking the courier’s photo and reply by ${by}.`
    : `${state.customer.first} says the courier delivery didn’t reach her. We’re checking with the courier and reply by ${by}. Nothing for you to do yet.`),
  'ready-no-way-back': (a, side, by) => (side === 'customer'
    ? `Your order has been ready for ${POLICY.READY_DEFAULT_D} days. Pick how to get it back on your booking, or tell us here what’s going on.`
    : `${state.customer.first} hasn’t picked a way back in ${POLICY.READY_DEFAULT_D} days, and you don’t offer in-store pickup. We’re contacting her and reply by ${by}.`),
};
/** How a review that ended on its own reads in the case (A1's ends). */
const REVIEW_ENDED = {
  approved: (a, side) => (side === 'customer' ? 'You approved the final order, so we closed this.' : `${state.customer.first} approved the final order, so we closed this.`),
  'fitting-started': () => 'The fitting started, so we closed this.',
  'cancelled-refunded': (a, side) => (side === 'customer' ? `Nobody told us the visit happened, so we cancelled it and refunded your ${fmtExact(a.payments.deposit.cents)} deposit.` : 'Nobody told us the visit happened, so we cancelled it. Nothing is paid out.'),
};
/** An A1 review opens (or joins) the order's case: both sides, Taily's first words to each. */
function reviewCase(a, reason, { by = 'system', at = nowIso() } = {}) {
  let c = openCaseOfAppt(a.id);
  if (!c) c = newCase({ apptId: a.id, kind: 'review', opener: by, reason, sides: ['customer', 'tailor'], at });
  else Object.assign(c, { kind: 'review', reason });
  const due = fmtWhen(isoPlusH(at, POLICY.HELP_REPLY_H));
  for (const side of ['customer', 'tailor']) caseLine(c, side, REVIEW_SAY[reason]?.(a, side, due) ?? 'Taily is looking into this order.', { at, kind: 'opening' });
  return c;
}

/* ---- the admin's actions (K-48.1 / D-01): each one a pure transition on the case's order ---- */
function adminCase(caseId, { order = true } = {}) {
  const c = caseById(caseId);
  if (!c) return fail('unknown-case');
  if (c.state !== 'open') return fail('closed');
  const a = c.apptId ? getAppt(c.apptId) : null;
  if (order && !a) return fail('no-order');
  return { ok: true, c, a };
}
const record = (c, kind, cents = 0, extra = {}) => { c.actions.push({ kind, cents, at: nowIso(), ...extra }); };
/** Unpaid payouts of these kinds for the order are dropped (nothing goes out); returns their total. */
function dropPayouts(a, kinds) {
  let total = 0;
  state.payouts = state.payouts.filter((p) => {
    const drop = p.apptId === a.id && p.state === 'pending' && kinds.includes(p.kind);
    if (drop) total += p.cents;
    return !drop;
  });
  return total;
}
/** Admin: reply to one person on the case (Taily's words are not masked). Texts them (`taily-replied` / `taily-replied-t`, or `help-replied(-t)`
    with no order). Errors: unknown-case · closed · side · not-a-party · empty. */
export function adminReply(caseId, side, { text = '', photos = 0 } = {}) {
  const g = adminCase(caseId, { order: false });
  if (!g.ok) return g;
  const { c, a } = g;
  if (!['customer', 'tailor'].includes(side)) return fail('side');
  if (!c.sides.includes(side) && !a) return fail('not-a-party');
  const count = Array.isArray(photos) ? photos.length : photos;
  if (!String(text).trim() && !count) return fail('empty');
  const message = caseLine(c, side, String(text).trim(), { photos: count });
  c.read.admin = lastNum(c);
  notify(a, side === 'tailor' ? (a ? 'taily-replied-t' : 'help-replied-t') : (a ? 'taily-replied' : 'help-replied'), { x: { caseId: c.id } });
  return { ok: true, case: c, message };
}
/** Admin: refund the deposit (a no-show Taily decides for the customer, a late cancel forgiven, a goodwill refund after completion). Unpaid
    no-show / kept-deposit payouts for it are dropped. Errors: deposit-<state> (not captured or kept) · order-open (cancel the order instead). */
export function adminRefundDeposit(caseId) {
  const g = adminCase(caseId); if (!g.ok) return g;
  const { c, a } = g;
  const d = a.payments.deposit;
  if (!['captured', 'kept'].includes(d.state)) return fail(`deposit-${d.state}`);
  if (!['cancelled', 'completed'].includes(a.status)) return fail('order-open');
  Object.assign(d, { state: 'refunded', refundedAt: nowIso(), refundedBy: 'taily' });
  const dropped = dropPayouts(a, ['no-show', 'kept-deposit']);
  if (a.cancel) Object.assign(a.cancel, { refund: d.cents, kept: 0, tailorPaid: 0, decided: 'refunded', decidedAt: nowIso() });
  record(c, 'refund-deposit', d.cents, { dropped });
  say(a, `Taily refunded your ${fmtExact(d.cents)} deposit`, `Taily refunded ${state.customer.first}’s ${fmtExact(d.cents)} deposit`);
  return { ok: true, case: c, appt: a };
}
/** Admin: the tailor keeps the deposit — a disputed no-show decided for her: her held no-show pay goes out on its Friday. Errors: deposit-refunded ·
    not-kept. */
export function adminKeepDeposit(caseId) {
  const g = adminCase(caseId); if (!g.ok) return g;
  const { c, a } = g;
  const d = a.payments.deposit;
  if (d.state !== 'kept') return fail(d.state === 'refunded' ? 'deposit-refunded' : 'not-kept');
  let released = 0;
  for (const p of state.payouts) if (p.apptId === a.id && p.state === 'pending' && p.held) { p.held = false; p.pausedBy = null; released += p.cents; }
  if (a.cancel) Object.assign(a.cancel, { decided: 'kept', decidedAt: nowIso() });
  record(c, 'keep-deposit', d.cents, { released });
  say(a, `Taily decided ${firstName(tailorById(a.tailorId))} keeps your ${fmtExact(d.cents)} deposit`, `Taily decided you keep ${state.customer.first}’s ${fmtExact(d.cents)} deposit`);
  return { ok: true, case: c, appt: a };
}
/** Admin: release the held balance — the customer isn't charged (she never got it, it was lost); the order closes, cancelled by Taily, with
    no job payout. The deposit is untouched (refund it as its own decision). Errors: no-hold. */
export function adminReleaseHold(caseId) {
  const g = adminCase(caseId); if (!g.ok) return g;
  const { c, a } = g;
  const b = a.payments.balance;
  if (a.status !== 'awaiting-handoff' || b?.state !== 'held') return fail('no-hold');
  Object.assign(b, { state: 'released', releasedAt: nowIso(), releasedBy: 'taily' });
  setStatus(a, 'cancelled');
  a.cancel = { by: 'taily', reason: 'taily', at: nowIso(), refund: 0, kept: 0, tailorPaid: 0, released: b.cents };
  record(c, 'release-hold', b.cents);
  say(a, `Taily released the ${fmtExact(b.cents)} hold. You weren’t charged.`, `Taily released ${state.customer.first}’s ${fmtExact(b.cents)} hold and closed the order`);
  return { ok: true, case: c, appt: a };
}
/** Admin: capture the held balance — Taily decides she got it: the order completes (its payout queues). A balance already captured at day 6
    (D-04) just completes. Errors: no-hold. */
export function adminCaptureHold(caseId) {
  const g = adminCase(caseId); if (!g.ok) return g;
  const { c, a } = g;
  const b = a.payments.balance;
  if (a.status !== 'awaiting-handoff' || !['held', 'captured'].includes(b?.state)) return fail('no-hold');
  completeHandoff(a, 'taily');
  record(c, 'capture-hold', b.cents, { failed: b.state === 'capture-failed' });
  return { ok: true, case: c, appt: a, failed: b.state === 'capture-failed' };
}
/** Admin: cancel the order (any live order, confirmed to awaiting-handoff): the deposit refunded, a held balance released, a captured one
    refunded, unpaid payouts dropped, the items back as her draft. Errors: not-cancellable. */
export function adminCancelOrder(caseId) {
  const g = adminCase(caseId); if (!g.ok) return g;
  const { c, a } = g;
  if (!['confirmed', 'fitting', 'price-change', 'in-progress', 'ready', 'awaiting-handoff'].includes(a.status)) return fail('not-cancellable');
  const d = a.payments.deposit;
  const b = a.payments.balance;
  let refund = 0; let released = 0;
  if (['captured', 'kept'].includes(d.state)) { Object.assign(d, { state: 'refunded', refundedAt: nowIso(), refundedBy: 'taily' }); refund += d.cents; }
  if (b?.state === 'held') { Object.assign(b, { state: 'released', releasedAt: nowIso(), releasedBy: 'taily' }); released = b.cents; }
  else if (b?.state === 'captured') { Object.assign(b, { state: 'refunded', refundedAt: nowIso() }); refund += b.cents; }
  dropPayouts(a, ['job', 'no-show', 'kept-deposit']);
  if (a.proposal?.state === 'pending') Object.assign(a.proposal, { state: 'replaced', endedAt: nowIso() });
  setStatus(a, 'cancelled');
  a.cancel = { by: 'taily', reason: 'taily', at: nowIso(), refund, kept: 0, tailorPaid: 0, released };
  restoreDraftIfEmpty(a);
  record(c, 'cancel', refund, { released });
  say(a, `Taily cancelled this order${refund ? ` and refunded ${fmtExact(refund)}` : ''}`, 'Taily cancelled this order. Nothing is paid out.');
  return { ok: true, case: c, appt: a };
}
/** Admin: hold the order's unpaid payouts while Taily looks (the Friday run skips them). Errors: no-payout. */
export function adminPausePayout(caseId) {
  const g = adminCase(caseId); if (!g.ok) return g;
  const { c, a } = g;
  const ps = state.payouts.filter((p) => p.apptId === a.id && p.state === 'pending' && !p.held);
  if (!ps.length) return fail('no-payout');
  for (const p of ps) Object.assign(p, { held: true, pausedBy: 'taily' });
  record(c, 'pause-payout', ps.reduce((n, p) => n + p.cents, 0));
  return { ok: true, case: c, appt: a };
}
/** Admin: let the order's held payouts go out on their Friday (an admin pause, or a disputed no-show pay). Errors: nothing-held. */
export function adminReleasePayout(caseId) {
  const g = adminCase(caseId); if (!g.ok) return g;
  const { c, a } = g;
  const ps = state.payouts.filter((p) => p.apptId === a.id && p.state === 'pending' && p.held);
  if (!ps.length) return fail('nothing-held');
  for (const p of ps) Object.assign(p, { held: false, pausedBy: null });
  record(c, 'release-payout', ps.reduce((n, p) => n + p.cents, 0));
  return { ok: true, case: c, appt: a };
}
/** The outcome of a case for one person, in dollars, from what the admin did (in order). */
function decisionLine(c, a, side) {
  const tf = a ? firstName(tailorById(a.tailorId)) : '';
  const cf = state.customer.first;
  const pay = a ? state.payouts.find((p) => p.apptId === a.id && p.state === 'pending') : null;
  const out = [];
  for (const x of c.actions) {
    const amt = fmtExact(x.cents);
    if (x.kind === 'refund-deposit') out.push(side === 'customer' ? `We refunded your ${amt} deposit. It shows on your card in 5 to 10 business days.` : `We refunded ${cf}’s ${amt} deposit${x.dropped ? `, so you aren’t paid the ${fmtExact(x.dropped)}` : ''}.`);
    else if (x.kind === 'keep-deposit') out.push(side === 'customer' ? `${tf} keeps your ${amt} deposit.` : `You keep ${cf}’s ${amt} deposit.${x.released ? ` Your ${fmtExact(x.released)} goes out ${fmtDay(pay?.date ?? payoutDay(nowIso()))}.` : ''}`);
    else if (x.kind === 'release-hold') out.push(side === 'customer' ? `You won’t be charged the ${amt} balance.` : `${cf} isn’t charged the ${amt} balance, and this job is closed.`);
    else if (x.kind === 'capture-hold') out.push(side === 'customer' ? `We charged your ${amt} balance and closed the order.` : `${cf}’s ${amt} was charged.${pay ? ` Your ${fmtExact(pay.cents)} payout goes out ${fmtDay(pay.date)}.` : ''}`);
    else if (x.kind === 'cancel') out.push(side === 'customer' ? `We cancelled the order${x.cents ? ` and refunded ${amt}` : ''}${x.released ? `. You won’t be charged the ${fmtExact(x.released)} balance` : ''}.` : 'We cancelled this job. Nothing is paid out.');
    else if (x.kind === 'pause-payout' && side === 'tailor') out.push(`Your ${amt} payout is on hold.`);
    else if (x.kind === 'release-payout' && side === 'tailor') out.push(`Your ${amt} payout goes out ${fmtDay(pay?.date ?? payoutDay(nowIso()))}.`);
  }
  if (!out.length) return a ? 'We looked into it. Nothing changes on your order.' : 'We’re closing this conversation. Message us anytime from Help.';
  return out.join(' ');
}
/** Admin: close the case with its outcome — the decision (in dollars) goes to each side as a message and a text, the order's review closes.
    `outcome` names a case closed with no money moved ('resolved' default, 'no-change'). Errors: unknown-case · closed · decide-first (a payout
    is still on hold: release it or refund first). */
export function adminCloseCase(caseId, { outcome = null } = {}) {
  const g = adminCase(caseId, { order: false }); if (!g.ok) return g;
  const { c, a } = g;
  if (a && state.payouts.some((p) => p.apptId === a.id && p.state === 'pending' && p.held)) return fail('decide-first');
  const money = [...c.actions].reverse().find((x) => x.kind !== 'pause-payout' && x.kind !== 'release-payout');
  const key = money?.kind ?? outcome ?? 'resolved';
  const lines = {};
  /* money moved on an order: both people hear the outcome, whoever opened the case */
  const sides = a && c.actions.length ? ['customer', 'tailor'] : [...c.sides];
  for (const side of sides) { lines[side] = decisionLine(c, a, side); caseLine(c, side, lines[side], { kind: 'decision' }); }
  Object.assign(c, { state: 'closed', closedAt: nowIso(), outcome: { key, at: nowIso(), lines } });
  c.read.admin = lastNum(c);
  for (const n of state.admin.notifications) if (n.caseId === c.id) n.read = true;
  if (a) closeReview(a, key);
  for (const side of sides) {
    if (side === 'customer') notify(a, a ? 'case-decided' : 'help-replied', { x: { caseId: c.id } });
    else notify(a, a ? 'taily-replied-t' : 'help-replied-t', { x: { caseId: c.id } });
  }
  return { ok: true, case: c, appt: a };
}
/** What each side would read if the case closed now (a-case's "Close with outcome" sheet). */
export function decisionPreview(caseId) {
  const c = caseById(caseId);
  if (!c) return {};
  const a = c.apptId ? getAppt(c.apptId) : null;
  return Object.fromEntries((a && c.actions.length ? ['customer', 'tailor'] : c.sides).map((side) => [side, decisionLine(c, a, side)]));
}
const ADMIN_ACTS = {
  'refund-deposit': adminRefundDeposit, 'keep-deposit': adminKeepDeposit, 'release-hold': adminReleaseHold, 'capture-hold': adminCaptureHold,
  cancel: adminCancelOrder, 'pause-payout': adminPausePayout, 'release-payout': adminReleasePayout,
};
/** Run one admin money action by its kind (a-case's rows). Errors: unknown-action + the action's own. */
export function adminAct(caseId, kind) {
  const f = ADMIN_ACTS[kind];
  return f ? f(caseId) : fail('unknown-action');
}
/** The money actions open to the admin on this case right now, in the order a-case lists them:
    [{ kind, label, sub, cents, tone: 'default' | 'danger', confirm }] — `confirm` is the sheet's sentence, in dollars. */
export function adminActions(c) {
  if (!c || c.state !== 'open' || !c.apptId) return [];
  const a = getAppt(c.apptId);
  if (!a) return [];
  const tf = firstName(tailorById(a.tailorId));
  const cf = state.customer.first;
  const d = a.payments.deposit;
  const b = a.payments.balance ?? {};
  const pending = state.payouts.filter((p) => p.apptId === a.id && p.state === 'pending');
  const held = pending.filter((p) => p.held);
  const free = pending.filter((p) => !p.held);
  const sum = (ps) => ps.reduce((n, p) => n + p.cents, 0);
  const $ = fmtExact;
  const out = [];
  if (['captured', 'kept'].includes(d.state) && ['cancelled', 'completed'].includes(a.status)) {
    const lost = pending.filter((p) => ['no-show', 'kept-deposit'].includes(p.kind));
    out.push({ kind: 'refund-deposit', label: `Refund ${cf}’s deposit`, sub: lost.length ? `${tf} isn’t paid the ${$(sum(lost))}` : `Back to her card`, cents: d.cents, tone: 'default',
      confirm: `Refund ${cf}’s ${$(d.cents)} deposit to her card.${lost.length ? ` ${tf}’s ${$(sum(lost))} isn’t paid out.` : ''}` });
  }
  if (d.state === 'kept') {
    out.push({ kind: 'keep-deposit', label: `${tf} keeps the deposit`, sub: held.length ? `Releases her ${$(sum(held))} on hold` : 'The deposit stays with her', cents: d.cents, tone: 'default',
      confirm: `${tf} keeps ${cf}’s ${$(d.cents)} deposit.${held.length ? ` Her ${$(sum(held))} goes out on its Friday.` : ''}` });
  }
  if (a.status === 'awaiting-handoff' && b.state === 'held') {
    out.push({ kind: 'capture-hold', label: `Capture the ${$(b.cents)} hold`, sub: `${cf} got it: the order completes`, cents: b.cents, tone: 'default', confirm: `Charge ${cf}’s ${$(b.cents)} balance and complete the order. ${tf}’s payout queues for its Friday.` });
    out.push({ kind: 'release-hold', label: `Release the ${$(b.cents)} hold`, sub: `${cf} isn’t charged: the order closes`, cents: b.cents, tone: 'danger', confirm: `Release ${cf}’s ${$(b.cents)} hold. She isn’t charged, the order closes, and nothing is paid out for it.` });
  } else if (a.status === 'awaiting-handoff' && b.state === 'captured') {
    out.push({ kind: 'capture-hold', label: 'Complete the order', sub: `The ${$(b.cents)} was already charged`, cents: b.cents, tone: 'default', confirm: `Complete the order. ${cf}’s ${$(b.cents)} was already charged; ${tf}’s payout queues for its Friday.` });
  }
  if (['confirmed', 'fitting', 'price-change', 'in-progress', 'ready', 'awaiting-handoff'].includes(a.status)) {
    const back = (['captured', 'kept'].includes(d.state) ? d.cents : 0) + (b.state === 'captured' ? b.cents : 0);
    out.push({ kind: 'cancel', label: 'Cancel the order', sub: back ? `Refunds ${$(back)}${b.state === 'held' ? `, releases the ${$(b.cents)} hold` : ''}` : 'Nothing was charged', cents: back, tone: 'danger',
      confirm: `Cancel this order.${back ? ` ${cf} gets ${$(back)} back.` : ''}${b.state === 'held' ? ` Her ${$(b.cents)} hold is released.` : ''} Nothing is paid out to ${tf}.` });
  }
  if (free.length) out.push({ kind: 'pause-payout', label: `Pause ${tf}’s payout`, sub: 'The Friday run skips it', cents: sum(free), tone: 'default', confirm: `Hold ${tf}’s ${$(sum(free))} payout until you release it.` });
  if (held.length) out.push({ kind: 'release-payout', label: `Release ${tf}’s payout`, sub: 'It goes out on its Friday', cents: sum(held), tone: 'default', confirm: `Let ${tf}’s ${$(sum(held))} go out on its Friday.` });
  return out;
}
/** Admin: a notification is read. */
export function adminMarkRead(id) {
  const n = state.admin.notifications.find((x) => x.id === id);
  if (!n) return fail('unknown-notification');
  n.read = true;
  return { ok: true, notification: n };
}
/** The admin's inbox (a-inbox): open cases (Taily owes a reply first, then the newest activity), closed cases, notifications newest first, the
    unread count. */
export function adminInbox() {
  const at = (c) => c.messages[c.messages.length - 1]?.at ?? c.openedAt;
  const rows = state.cases.map((c) => ({ c, view: caseView(c, 'admin'), at: at(c) }));
  const open = rows.filter((r) => r.c.state === 'open')
    .sort((x, y) => (!!y.view.replyBy - !!x.view.replyBy) || (x.at < y.at ? 1 : x.at > y.at ? -1 : caseNum(y.c.messages.at(-1)) - caseNum(x.c.messages.at(-1))));
  const closed = rows.filter((r) => r.c.state === 'closed').sort((x, y) => (x.c.closedAt < y.c.closedAt ? 1 : -1));
  const notifications = [...state.admin.notifications].reverse();
  return { open, closed, notifications, unread: notifications.filter((n) => !n.read).length };
}

/* ---- S-32: report or block (from the thread ⋯ and Help → Safety) ---- */
export const REPORT_REASONS = [
  ['unsafe', 'They made me feel unsafe'], ['messages', 'Rude or inappropriate messages'], ['off-app', 'Asked to pay or talk outside Taily'], ['other', 'Something else'],
];
/** Is the pair blocked (either of them blocked the other)? */
export const isBlocked = (tailorId, customerId = state.customer.id) => state.blocks.some((b) => b.tailorId === tailorId && b.customerId === customerId);
/** Who blocked: 'customer' | 'tailor' | null. */
export const blockedBy = (tailorId, customerId = state.customer.id) => state.blocks.find((b) => b.tailorId === tailorId && b.customerId === customerId)?.by ?? null;
function safetyCase(who, a, tailorId, { reason = null, block = false } = {}) {
  let c = state.cases.find((x) => x.kind === 'safety' && x.state === 'open' && x.opener === who && x.safety?.tailorId === tailorId);
  const fresh = !c;
  if (!c) {
    c = newCase({ apptId: a?.id ?? null, kind: 'safety', opener: who, topic: 'safety', sides: [who] });
    c.safety = { tailorId, about: who === 'customer' ? 'tailor' : 'customer', reason, block };
  } else Object.assign(c.safety, { reason: reason ?? c.safety.reason, block: block || c.safety.block });
  return { c, fresh };
}
/** Report the other person: opens (or adds to) a safety case the admin is told about at once. Errors: reason · offline. */
export function reportPerson(who, { apptId = null, tailorId = null, reason = 'other', text = '' } = {}) {
  if (!['customer', 'tailor'].includes(who)) return fail('unknown-person');
  if (!REPORT_REASONS.some(([k]) => k === reason)) return fail('reason');
  if (state.sim.network === 'offline') return fail('offline');
  const a = apptId ? must(apptId) : null;
  const tid = a?.tailorId ?? tailorId ?? state.tailors[0].id;
  const other = who === 'customer' ? tailorById(tid)?.name ?? 'the tailor' : customerFull();
  const { c, fresh } = safetyCase(who, a, tid, { reason });
  caseLine(c, who, `I’m reporting ${other}: ${REPORT_REASONS.find(([k]) => k === reason)[1].toLowerCase()}.`, { from: who });
  const m = maskContact(String(text ?? '').trim());
  if (m.text) caseLine(c, who, m.text, { from: who, masked: m.masked });
  if (fresh) caseLine(c, who, ackText(c, who), { kind: 'ack' });
  c.read[who] = lastNum(c);
  if (fresh) caseToAdmin(c, a, 'safety'); else caseMessageToAdmin(c, who);
  return { ok: true, case: c };
}
/** Block the other person: neither can book the other again (eligible / tailorsFor / requestBooking / tryAgain / acceptSuggestion) and their
    chat closes; a booking already made stays until Taily sorts it out (the safety case tells the admin). Errors: already · offline. */
export function blockPerson(who, { apptId = null, tailorId = null } = {}) {
  if (!['customer', 'tailor'].includes(who)) return fail('unknown-person');
  if (state.sim.network === 'offline') return fail('offline');
  const a = apptId ? must(apptId) : null;
  const tid = a?.tailorId ?? tailorId ?? state.tailors[0].id;
  if (state.blocks.some((b) => b.by === who && b.tailorId === tid && b.customerId === state.customer.id)) return fail('already');
  state.blocks.push({ by: who, tailorId: tid, customerId: state.customer.id, at: nowIso() });
  const other = who === 'customer' ? tailorById(tid)?.name ?? 'the tailor' : customerFull();
  const { c, fresh } = safetyCase(who, a, tid, { block: true });
  caseLine(c, who, `I blocked ${other}.`, { from: who });
  if (fresh) caseLine(c, who, ackText(c, who), { kind: 'ack' });
  c.read[who] = lastNum(c);
  if (fresh) caseToAdmin(c, a, 'safety'); else caseMessageToAdmin(c, who);
  return { ok: true, case: c };
}
/** Undo your own block. Errors: not-blocked. */
export function unblockPerson(who, { tailorId = null } = {}) {
  const tid = tailorId ?? state.tailors[0].id;
  const i = state.blocks.findIndex((b) => b.by === who && b.tailorId === tid && b.customerId === state.customer.id);
  if (i < 0) return fail('not-blocked');
  state.blocks.splice(i, 1);
  return { ok: true };
}

/* ---------- DG-2 A: one-time notices on Home for a cancelled visit (a cancelled visit never just vanishes) ---------- */
const NOTICE_REASONS = {
  customer: ['tailor-cant-make-it', 'unconfirmed', 'no-record', 'no-show'],
  tailor: ['customer-late', 'customer-early', 'unconfirmed', 'tailor-no-show', 'no-record'],
};
/** The cancellations this person should hear about on Home: someone else (or Taily) cancelled it within NOTICE_WINDOW_H of the visit, not
    yet seen (tapped or ✕), and the visit time has not passed (a cancel after the start: for 24 hours). Newest first. */
export function noticesFor(persona) {
  const t = state.clock.now;
  return apptsFor(persona).filter((a) => {
    if (a.status !== 'cancelled' || !NOTICE_REASONS[persona].includes(a.cancel?.reason) || a.noticeSeen?.[persona]) return false;
    const start = toDate(a.slot.start).getTime();
    const at = toDate(a.cancel.at).getTime();
    if (start - at > POLICY.NOTICE_WINDOW_H * HOUR_MS) return false;
    return t < (at >= start ? at + DAY_MS : start);
  });
}
/** ✕ or the card's own button: the notice is seen (per person, per appointment — model state, not the screen's). */
export function dismissNotice(id, persona) {
  const a = must(id);
  a.noticeSeen = { ...(a.noticeSeen ?? {}), [persona]: nowIso() };
  return succeed(a);
}

/** K-28 (Study-1 A4): a completed order with no review, REVIEW_REMINDER_D or more after it completed → the reminder card + Leave a review. */
export function reviewReminderDue(appt) {
  if (!appt || appt.status !== 'completed' || appt.review || appt.reviewReminderDismissedAt || appt.handoff?.completedBy === 'abandoned') return false;   // P-04: ✕ dismisses it
  const at = appt.handoff?.completedAt ?? [...appt.history].reverse().find((h) => h.status === 'completed')?.at;
  return !!at && state.clock.now >= toDate(at).getTime() + POLICY.REVIEW_REMINDER_D * DAY_MS;
}
/** The customer's newest order whose review reminder is due, or null. */
export const reviewReminder = () => apptsFor('customer').find(reviewReminderDue) ?? null;
/** P-04: "Not now" (the card's ✕) — the review reminder stops showing on Home (the order still asks on c-complete). */
export function dismissReviewReminder(id) {
  const a = must(id);
  if (!reviewReminderDue(a)) return fail('not-due');
  a.reviewReminderDismissedAt = nowIso();
  return succeed(a);
}

/** Study-1 A4 "Book [tailor] again": a fresh draft for the same place — visit type, ZIP and address — with no garments. */
export function bookAgain(id) {
  const a = must(id);
  const { visitType, zip, address } = a.job;
  newJob();
  Object.assign(state.job, { visitType, zip, address: address ? clone(address) : state.job.address });
  return { ok: true, appt: a, job: state.job };
}

export function leaveReview(id, { stars, text = '', photos = 0 } = {}) {
  const a = must(id);
  if (a.status !== 'completed') return fail('not-completed');
  if (a.review) return fail('already-reviewed');
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return fail('stars-required');
  const count = Array.isArray(photos) ? photos.length : photos;
  if (count > REVIEW_LIMITS.PHOTOS_MAX) return fail('too-many-photos');
  const raw = String(text ?? '').trim();
  if (raw.length > REVIEW_LIMITS.TEXT_MAX) return fail('text-long');
  text = maskContact(raw).text;                                      // D-107: contact details never reach a public review
  const tailor = tailorById(a.tailorId);
  a.review = { stars, text, photos: count, date: isoDay(new Date(state.clock.now)) };
  const total = tailor.rating.avg * tailor.rating.count + stars;
  tailor.rating = { avg: Math.round((total / (tailor.rating.count + 1)) * 10) / 10, count: tailor.rating.count + 1 };
  tailor.reviews.unshift({
    id: `r-${a.id}`, name: `${state.customer.first} ${state.customer.last[0]}.`, initials: state.customer.initials,
    stars, date: a.review.date, photos: count, text,
  });
  notify(a, 'new-review', { x: { stars } });
  return succeed(a);
}

export function sendMessage(tailorId, from, { text = '', photos = 0 } = {}) {
  if (!tailorById(tailorId)) return fail('unknown-tailor');
  if (threadReadOnly(tailorId)) return fail('read-only');
  const count = Array.isArray(photos) ? photos.length : photos;
  if (!String(text).trim() && !count) return fail('empty');
  if (count > CHAT_LIMITS.PHOTOS_MAX) return fail('too-many-photos');
  if (state.sim.network === 'offline') return fail('offline');
  if (state.sim.send === 'fail') { state.sim.send = 'ok'; return fail('send-failed'); }   // one-shot: a dropped connection (D-130)
  const m = maskContact(text);
  const to = from === 'customer' ? 'tailor' : 'customer';
  const unreadBefore = unreadCount(tailorId, to);
  const message = post(tailorId, from, m.text, { photos: count, masked: m.masked });
  chatText(tailorId, to, unreadBefore);
  ensureThread(tailorId).read[from] = msgNum(message);          // your own message is never unread (D-128)
  /* R4-2-C-02: a pending price change becomes "messaged" only when Sarah actually writes, never on opening the chat */
  if (from === 'customer') {
    for (const a of state.appts) {
      if (a.tailorId === tailorId && a.status === 'price-change' && a.priceChange?.state === 'pending') messageAboutPriceChange(a.id);
    }
  }
  return { ok: true, masked: m.masked, message };
}

/** Kevin (K-48 follow-up): a chat message texts the reader for the FIRST unread message, then at most one text per conversation per
    CHAT_TEXT_GAP_MIN while messages stay unread. */
function chatText(tailorId, to, unreadBefore) {
  const th = ensureThread(tailorId);
  const last = th.lastText?.[to] ?? null;
  const gapOk = !last || state.clock.now - toDate(last).getTime() >= POLICY.CHAT_TEXT_GAP_MIN * MIN_MS;
  if (unreadBefore > 0 && !gapOk) return null;
  th.lastText = { ...(th.lastText ?? {}), [to]: nowIso() };
  return notify(threadAppt(tailorId), to === 'tailor' ? 'message-t' : 'message');
}
/** Mark everything in the thread as seen by `reader` ('customer' | 'tailor'). No-op without a thread. */
export function markThreadRead(tailorId, reader) {
  const th = state.threads[tailorId];
  if (!th || !th.messages.length) return { ok: true };
  th.read[reader] = msgNum(th.messages[th.messages.length - 1]);
  return { ok: true };
}

/** The latest chat message (customer or tailor, never a system line) from `sentAt` on, in thread order, or null (D-112).
    Whose move a messaged price change is follows this: Sarah spoke last → Amara replies; Amara spoke last → Sarah approves. */
export function lastSpeakerSince(appt, sentAt = appt?.priceChange?.sentAt ?? null) {
  if (!appt) return null;
  const msgs = threadFor(appt.tailorId).messages.filter((m) => (m.from === 'customer' || m.from === 'tailor') && (!sentAt || m.at >= sentAt));
  return msgs[msgs.length - 1] ?? null;
}

/** D-73: a confirmed booking is "just confirmed" for POLICY.JUST_BOOKED_MIN minutes after the LAST accept
    (tailorAccept and acceptSuggestion both write `confirmed`). */
export function justConfirmed(appt) {
  if (!appt || appt.status !== 'confirmed') return false;
  const last = appt.history.filter((h) => h.status === 'confirmed').pop();
  if (!last) return false;
  return state.clock.now - toDate(last.at).getTime() < POLICY.JUST_BOOKED_MIN * 60000;
}

/* ---------- status → screen (table in SCREENS.md) ---------- */
export function statusScreen(appt, persona = state.persona) {
  if (!appt) return null;
  const s = appt.status;
  if (persona === 'tailor') return ['requested', 'suggested', 'declined', 'expired'].includes(s) ? 't-request' : 't-job';
  if (['requested', 'suggested', 'declined', 'expired'].includes(s)) return 'c-request';
  if (s === 'price-change') return 'c-price-change';
  if (s === 'in-progress' && appt.edit?.state === 'pending') return 'c-price-change';   // Study-1 B1: the edit Sarah has to answer
  if (s === 'ready') return 'c-ready';                              // holding the balance moves it on to awaiting-handoff (K-27)
  if (s === 'completed' && (appt.handoff?.completedBy === 'abandoned' || appt.payments?.balance?.state === 'capture-failed')) return 'c-booking';   // D-03 closed · D-04 card needs attention
  if (s === 'completed' && !appt.review) return 'c-complete';
  return 'c-booking';
}

/* ---------- the price change, as rows (A4) ---------- */
/** `priceChangeView(appt, lines = appt.priceChange?.lines ?? appt.lines)` — the booked lines vs `lines`, per garment, in booked order
    (added rows last in their garment), plus both quotes. `before` is the booked money; `after` keeps the captured deposit (D-23). */
export function priceChangeView(appt, lines = appt?.priceChange?.lines ?? appt?.lines ?? []) {
  const booked = appt.lines ?? [];
  const m = appt.money;
  const after = quote({ lines, homeFee: m.homeFee, rush: m.rush, deposit: appt.payments.deposit.cents });
  after.rushDays = m.rushDays;
  const next = new Map(lines.map((l) => [lineKey(l), l]));
  const prev = new Map(booked.map((l) => [lineKey(l), l]));
  const garments = [];
  const bucket = (garmentId, type) => {
    let g = garments.find((x) => x.id === garmentId);
    if (!g) { g = { id: garmentId, type: type ?? appt.job?.garments?.find((x) => x.id === garmentId)?.type ?? '', rows: [] }; garments.push(g); }
    return g;
  };
  const labelOf = (l) => SERVICES[l.serviceId]?.label ?? l.label;
  for (const l of booked) {
    const n = next.get(lineKey(l));
    const kind = !n ? 'removed' : n.cents !== l.cents ? 'repriced' : 'same';
    bucket(l.garmentId, l.garmentType).rows.push({ key: lineKey(l), label: labelOf(l), kind, from: l.cents, to: n ? n.cents : null });
  }
  for (const l of lines) {
    if (prev.has(lineKey(l))) continue;
    bucket(l.garmentId, l.garmentType).rows.push({ key: lineKey(l), label: labelOf(l), kind: 'added', from: null, to: l.cents });
  }
  const bookedIds = new Set(booked.map((l) => l.garmentId));
  const present = new Set(lines.map((l) => l.garmentId));
  for (const g of garments) {
    g.kind = !bookedIds.has(g.id) ? 'added' : !present.has(g.id) ? 'removed' : g.rows.some((r) => r.kind !== 'same') ? 'changed' : 'same';
  }
  const counts = { itemsAdded: 0, itemsRemoved: 0, servicesAdded: 0, servicesRemoved: 0, repriced: 0 };
  for (const g of garments) {
    if (g.kind === 'added') counts.itemsAdded += 1;
    else if (g.kind === 'removed') counts.itemsRemoved += 1;
    for (const r of g.rows) {
      if (r.kind === 'repriced') counts.repriced += 1;
      if (g.kind === 'added' || g.kind === 'removed') continue;
      if (r.kind === 'added') counts.servicesAdded += 1;
      else if (r.kind === 'removed') counts.servicesRemoved += 1;
    }
  }
  const pc = appt.priceChange;
  return {
    garments, before: m, after, delta: after.total - m.total,
    changed: garments.some((g) => g.rows.some((r) => r.kind !== 'same')), counts,
    sentAt: pc?.sentAt ?? null, state: pc?.state ?? null, revisions: pc?.revisions ?? 0,
  };
}

/** Every transition and clock move, in one object, so screens and flow setups call `T.tailorAccept(id)`. */
export const T = {
  setJob, newJob, addGarment, removeGarment, setServices, validateJob,
  requestBooking, withdrawRequest, tailorAccept, tailorSuggest, acceptSuggestion, withdrawSuggestion, findAnotherTailor,
  tailorDecline, expireRequest, tryAgain, cancelBooking, rescheduleBooking, confirmVisit, tailorCantMakeIt, markNoShow, reportTailorNoShow,
  startFitting, addFittingPhoto, removeFittingPhoto, restoreFittingPhoto, setFittingComment, sendPriceChange, approvePriceChange, messageAboutPriceChange, markReady,
  sendJobEdit, approveJobEdit, addNote, updateNote, removeNote, restoreNote, addNotePhoto, removeNotePhoto,
  chooseReturn, setHandoffSlot, holdBalance, confirmPickup, markHandedOver, confirmReceived, reportNotReceived, courierDelivered, bookAgain, leaveReview, sendMessage, markThreadRead, settlePayouts, maskContact,
  /* pre-MVP A1 */
  notify, setTexts, textReply, dismissNotice, dismissReviewReminder, withdrawJobEdit, courierCollected, courierFailed, reportMissingDelivery, retryCapture,
  visitPing, answerVisitCheck, disputeNoShow, proposeNewTime, answerProposal,
  /* pre-MVP A2: Taily Help, the admin, report / block */
  openCase, sendCaseMessage, markCaseRead, adminReply, adminRefundDeposit, adminKeepDeposit, adminReleaseHold, adminCaptureHold, adminCancelOrder,
  adminPausePayout, adminReleasePayout, adminCloseCase, adminMarkRead, adminAct, reportPerson, blockPerson, unblockPerson,
  setTailorSection, setTakingRequests, validateSection, blankTailor, setPayouts, setRush, validateRush, nextSection,
  uploadId, consentBackground, setupPayouts, pausePayouts, confirmTaxInfo, submitOnboarding, reviewChecks, joinAreaWaitlist,
  now, setClock, advanceClock, tick, suggestLapseAt,
};
