/* ============================================================
   Taily v4 — appointment state machine
   Ported from taily-prototype-v3.html. v3 is the source of truth
   for behaviour: transitions below preserve v3 semantics exactly,
   including its quirks (see advanceStatus).

   The one deliberate change from v3: v3 mutated state and painted
   the DOM in the same function (toast(...), renderTracking(), ...).
   Here the transitions are pure — they mutate state and RETURN what
   happened, so the caller decides what to render or announce.
   ============================================================ */

import {
  TAILORS,
  JOB_TYPES,
  DEPOSIT_RATE,
  APPT_DEFAULT,
  SEED_UPCOMING,
  SEED_PAST,
  SEED_FINAL_ORDER,
  garmentAmount,
  fmtDay,
  shiftDay,
  parseWhen,
  mdy,
} from './data.js';

/* The happy path — extended for the v4 flow (Kevin-approved):
     searching -> confirmed -> awaiting-approval -> tailoring
       -> ready-for-pickup -> delivered
   v3's names are aliases so seeds, pills and the 4A screens keep
   working: requested=searching, ready=ready-for-pickup,
   completed=delivered. declined / cancelled / expired sit outside. */
export const STATUS_ORDER = ['searching', 'confirmed', 'awaiting-approval', 'tailoring', 'ready-for-pickup', 'delivered'];
export const STATUS_ALIASES = { requested: 'searching', ready: 'ready-for-pickup', completed: 'delivered' };
export const TERMINAL_STATUSES = ['declined', 'cancelled', 'expired'];
/* Statuses after the appointment happened — the order on file is the
   tailor's reviewed final order, not the booking estimate. */
export const POST_STATUSES = ['awaiting-approval', 'tailoring', 'ready-for-pickup', 'delivered'];

/** Normalise a v3 alias onto the v4 chain. */
export const canonicalStatus = (s) => STATUS_ALIASES[String(s ?? '').toLowerCase()] ?? String(s ?? '').toLowerCase();
export const isPostAppointment = (a) => POST_STATUSES.includes(canonicalStatus(a?.status));
export const isTerminal = (a) => TERMINAL_STATUSES.includes(canonicalStatus(a?.status));

const clone = (v) => JSON.parse(JSON.stringify(v));

/* ---------- App state (v3 module-level `let`s, gathered) ---------- */
export const state = {
  garments: [],            // { type, jobs, qty, photos }
  selection: null,         // { tailor, time, origin }
  lastBooking: null,       // rendered on the success screen
  /* UX-LOOP R1: the appointment the user last cancelled (03/Cancelled
     renders it; the tailor's T01 shows it as a Cancelled job). */
  lastCancelled: null,
  userLoc: 'New York, NY',
  appt: { ...APPT_DEFAULT },
  contact: {
    phone: '(212) 555-0148',
    email: 'kevin@example.com',
    updates: true,
    street: '88 Leonard St',
    unit: '4B',
    zip: '10013',
    /* 02B address sheet (538:1382) */
    notes: 'Buzz 4B — entrance is on Leonard St',
    saveHome: true,
  },
  payMethod: 'card',
  upcoming: clone(SEED_UPCOMING),
  past: clone(SEED_PAST),
  currentAppt: { list: 'upcoming', index: 0 },
};

/** Restore the seeded starting state. */
export function reset() {
  state.garments = [];
  state.selection = null;
  state.lastBooking = null;
  state.lastCancelled = null;
  state.userLoc = 'New York, NY';
  state.appt = { ...APPT_DEFAULT };
  state.payMethod = 'card';
  state.upcoming = clone(SEED_UPCOMING);
  state.past = clone(SEED_PAST);
  state.currentAppt = { list: 'upcoming', index: 0 };
  return state;
}

/* ---------- Selection ---------- */

/** The appointment currently being viewed. */
export function apptEntry() {
  const list = state.currentAppt.list === 'past' ? state.past : state.upcoming;
  return list[state.currentAppt.index];
}

export function openAppt(list, index) {
  state.currentAppt = { list, index };
  return apptEntry();
}

/** Requested time / place the user is asking for. */
export function setAppt(key, val) {
  state.appt[key] = val;
  return state.appt;
}

/* ---------- Transitions ---------- */

/**
 * Step one place along STATUS_ORDER.
 *
 * Ported verbatim from v3, quirk included: a status outside STATUS_ORDER
 * (e.g. the seeded 'Delivered' on past appointments) gives indexOf === -1,
 * so the next status becomes the chain's start. v3 relied on this to restart a
 * past appointment, so it is preserved rather than "fixed".
 */
export function advanceStatus() {
  const a = apptEntry();
  if (!a) return null;
  const prev = a.status || 'delivered';
  const canon = canonicalStatus(prev);
  const next = STATUS_ORDER[Math.min(STATUS_ORDER.indexOf(canon) + 1, STATUS_ORDER.length - 1)];
  a.status = next;
  return {
    appointment: a,
    prev,
    next,
    // v3 charged the deposit exactly on requested/searching -> confirmed
    depositCharged: canon === 'searching' && next === 'confirmed',
    deposit: a.totals ? a.totals.deposit : null,
  };
}

/* ---------- v4 flow transitions (Kevin-approved diagram) ---------- */

/** Send the built request to a tailor: creates the searching appointment. */
export function requestTailor() {
  const totals = bookingLines(null);
  /* badge from the requested time ("Jul 12, 7:00 PM" → JUL / 12) */
  const m = state.appt.when.match(/^([A-Za-z]+)\s+(\d+)/);
  const { contact } = state;
  const home = state.appt.where === 'Home Visit';
  const a = {
    /* `mine`: the appointment both personas share (R1-T-01) */
    mine: true,
    name: 'Marco Tailor', initials: 'MT', tailorId: 'marco',
    where: home ? 'home' : 'shop',
    place: home ? `${contact.street}${contact.unit ? ', ' + contact.unit : ''}` : '1025 Broadway, Midtown West',
    when: state.appt.when, needBy: state.appt.needBy, status: 'searching',
    visit: state.appt.where, count: state.garments.reduce((s, g) => s + g.qty, 0),
    month: (m?.[1] ?? 'JUL').slice(0, 3).toUpperCase(), day: m?.[2] ?? '12',
    itemLines: state.garments.map((g) => `${g.qty} ${g.type} - ${g.jobs.join(', ')}`),
    garments: JSON.parse(JSON.stringify(state.garments)),
    bring: ['Your garments', 'The shoes you plan to wear with them.'],
    totals,
  };
  state.upcoming.unshift(a);
  state.currentAppt = { list: 'upcoming', index: 0 };
  state.lastCancelled = null;
  return a;
}

const step = (from, to, extra = {}) => {
  const a = apptEntry();
  if (!a) return null;
  if (from && canonicalStatus(a.status) !== from) return null;
  a.status = to;
  Object.assign(a, extra);
  return a;
};

/** Tailor accepts the request — the deposit hold is charged now (v3
    semantic); depositOn dates the receipt rows. */
export const tailorAccepts = () => step('searching', 'confirmed', { depositOn: mdy(new Date().toDateString(), '7/7/26') });
/** The appointment happened; tailor drafts the final order. */
export const completeAppointment = () => step('confirmed', 'awaiting-approval');
/** User approves the final order (stamps approvedAt — the order on
    file is already the reviewed one, nothing is copied). */
export function approveOrder() {
  const a = apptEntry();
  return step('awaiting-approval', 'tailoring', { approvedAt: fmtDay(a?.when, 'Sun, Jul 12') });
}
/** Garments finished — stamps readyAt (the fiction's Thu, Jul 16: the
    day before need-by, never before the appointment itself). */
export function markReady() {
  const a = apptEntry();
  if (!a) return null;
  const dayBefore = shiftDay(a.needBy, -1);
  const apptDay = parseWhen(a.when)?.date;
  const beforeDay = parseWhen(dayBefore)?.date;
  const readyAt = (dayBefore && (!apptDay || !beforeDay || beforeDay > apptDay)) ? dayBefore : fmtDay(a.needBy, 'Thu, Jul 16');
  return step('tailoring', 'ready-for-pickup', { readyAt });
}
/** 07a/07b: how the garments come back. `date` is the window's calendar
    day ("Jul 17") so receipts and the delivered stamp can name it. */
export function chooseFulfilment(method, window, date = null) {
  const a = apptEntry();
  if (!a) return null;
  a.fulfilment = { method, window, date };
  return a;
}
/** Garments back with the customer — stamps deliveredAt from the
    chosen window's day. */
export function deliver() {
  const a = apptEntry();
  if (!a) return null;
  const day = a.fulfilment?.date ?? a.fulfilment?.window ?? a.readyAt ?? a.needBy;
  return step('ready-for-pickup', 'delivered', { deliveredAt: fmtDay(day, a.readyAt ?? 'Fri, Jul 17') });
}

/** Tailor confirms, or the user accepts a proposed time. */
export function acceptProposedTime(when) {
  const a = apptEntry();
  if (!a) return null;
  if (when) a.when = when;
  a.status = 'confirmed';
  return { appointment: a, when: a.when, deposit: a.totals ? a.totals.deposit : null };
}

export function declineAppointment() {
  const a = apptEntry();
  if (!a) return null;
  a.status = 'declined';
  return { appointment: a, deposit: a.totals ? a.totals.deposit : 20 };
}

export function expireAppointment() {
  const a = apptEntry();
  if (!a) return null;
  a.status = 'expired';
  return { appointment: a };
}

/**
 * Cancel an upcoming appointment and drop it from the list.
 * v3: a request that was never confirmed charges nothing; a confirmed
 * appointment refunds the deposit. The removed appointment is stashed
 * on state.lastCancelled (status 'cancelled', `wasRequested` kept) for
 * 03/Cancelled and the tailor's T01/T03B.
 */
export function cancelAppointment(index) {
  const i = index == null ? state.currentAppt.index : index;
  const a = state.upcoming[i];
  if (!a) return null;
  const wasRequested = canonicalStatus(a.status || 'confirmed') === 'searching';
  state.lastCancelled = { ...a, status: 'cancelled', wasRequested };
  state.upcoming.splice(i, 1);
  return {
    appointment: a,
    wasRequested,
    refund: wasRequested ? 0 : (a.totals ? a.totals.deposit : 0),
  };
}

/** Re-send the same request to a different tailor. */
export function rebookWith(tailorId) {
  const a = apptEntry();
  const t = TAILORS.find((x) => x.id === tailorId);
  if (!a || !t) return null;
  const { contact } = state;
  a.name = t.name;
  a.initials = t.initials;
  a.tailorId = t.id;
  a.where = (a.where === 'home' && t.home) ? 'home' : 'shop';
  a.place = a.where === 'home'
    ? `Your address · ${contact.street}${contact.unit ? ' ' + contact.unit : ''}`
    : `${t.address.split(',')[0]}, ${t.hood}`;
  a.visit = a.where === 'home' ? 'Home Visit' : 'Store Visit';
  a.status = 'requested';
  return { appointment: a, tailor: t };
}

/* ---------- Garments ---------- */

export function addGarment(g) {
  state.garments.push(g);
  return state.garments;
}

export function removeGarment(i) {
  state.garments.splice(i, 1);
  return state.garments;
}

export function clearGarments() {
  state.garments = [];
  return state.garments;
}

/* ---------- Estimates ---------- */

/**
 * Per-tailor minimums ("$N+"); deposit = 10% of the total.
 * Ported verbatim from v3 bookingLines(), reading from `state`.
 */
export function bookingLines(tailor) {
  const mult = tailor ? tailor.mult : 1;
  const rows = state.garments.map((g) => ({
    label: `${g.type} — ${g.jobs.join(', ')}`,
    qty: g.qty,
    amount: Math.round(g.jobs.reduce((s, j) => s + JOB_TYPES[j].price * mult, 0)) * g.qty,
  }));
  const subtotal = rows.reduce((s, r) => s + r.amount, 0);
  const visitFee = (state.appt.where === 'Home Visit' && tailor && tailor.homeFee) ? tailor.homeFee : 0;
  const total = subtotal + visitFee;
  const deposit = Math.round(total * DEPOSIT_RATE * 100) / 100;
  return { rows, subtotal, visitFee, total, deposit };
}

/* ---------- The final order (UX-LOOP round 1) ---------- */

/**
 * Totals for a garment list at multiplier 1, keeping the appointment's
 * original deposit (10% of what was booked — it never re-prices).
 * Shared with the tailor's at-visit editor: call it after writing
 * `a.garments` to refresh `a.totals`.
 */
export function apptTotals(garments, base = {}) {
  const rows = (garments ?? []).map((g) => ({ label: `${g.type} — ${g.jobs.join(', ')}`, qty: g.qty, amount: garmentAmount(g) }));
  const subtotal = rows.reduce((s, r) => s + r.amount, 0);
  const visitFee = base.visitFee ?? 0;
  const total = subtotal + visitFee;
  const deposit = base.deposit ?? Math.round(total * DEPOSIT_RATE * 100) / 100;
  return { rows, subtotal, visitFee, total, deposit };
}

/**
 * The order to draw on post-appointment screens (03/Tailoring, 04, 05A/B,
 * 06, 03/Summary): the appointment's own garments/totals once the
 * appointment happened; before that (a harness deep link with the seed
 * still 'confirmed') the frames' SEED_FINAL_ORDER fixture.
 */
export function finalOrder(a) {
  if (a && isPostAppointment(a) && a.garments?.length) return { garments: a.garments, totals: a.totals ?? apptTotals(a.garments) };
  return SEED_FINAL_ORDER;
}

/** Has the order been changed at the appointment (04 Default vs Modified)? */
export const orderModified = (order) => (order?.garments ?? []).some((g) => g.added || g.addedJobs?.length);

/**
 * DEMO (user side, 03.2's Confirm): the tailor's at-visit review, as the
 * frames tell it — one extra service on the first garment and one more
 * of the same garment. Writes a.garments / a.totals (the shared final
 * order) and stamps revisedAt; a no-op once the tailor's own T05 Send
 * has written the order. From the $200 seed this yields the $360 06B
 * fiction exactly.
 */
export function draftFinalOrder() {
  const a = apptEntry();
  if (!a || a.revisedAt || !a.garments?.length) return null;
  const garments = clone(a.garments).map((g) => { delete g.displayPrice; return g; });
  const first = garments[0];
  const extra = ['Sleeve / Adjust Length', 'Hem / Adjust Length', 'Taper / Slim Fit'].find((j) => !first.jobs.includes(j));
  if (extra) { first.jobs.push(extra); first.addedJobs = [...(first.addedJobs ?? []), extra]; }
  garments.push({ type: first.type, jobs: ['Sleeve / Adjust Length'], qty: 1, photos: 2, added: true });
  a.garments = garments;
  a.totals = apptTotals(garments, a.totals ?? {});
  a.revisedAt = fmtDay(a.when, 'Sun, Jul 12');
  return a;
}

export { TAILORS, JOB_TYPES, DEPOSIT_RATE };
