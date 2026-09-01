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

/** Normalise a v3 alias onto the v4 chain. */
export const canonicalStatus = (s) => STATUS_ALIASES[s] ?? s;

const clone = (v) => JSON.parse(JSON.stringify(v));

/* ---------- App state (v3 module-level `let`s, gathered) ---------- */
export const state = {
  garments: [],            // { type, jobs, qty, photos }
  selection: null,         // { tailor, time, origin }
  lastBooking: null,       // rendered on the success screen
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
  const a = {
    name: 'Marco Tailor', initials: 'MT', tailorId: 'marco', where: 'shop',
    place: '1025 Broadway, Midtown West',
    when: state.appt.when, status: 'searching',
    visit: state.appt.where, count: state.garments.reduce((s, g) => s + g.qty, 0),
    month: 'AUG', day: '29',
    itemLines: state.garments.map((g) => `${g.qty} ${g.type} - ${g.jobs.join(', ')}`),
    garments: JSON.parse(JSON.stringify(state.garments)),
    bring: ['Your garments', 'The shoes you plan to wear with them.'],
    totals,
  };
  state.upcoming.unshift(a);
  state.currentAppt = { list: 'upcoming', index: 0 };
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

/** Tailor accepts the request — deposit charged (v3 semantic). */
export const tailorAccepts = () => step('searching', 'confirmed');
/** The appointment happened; tailor drafts the final order. */
export const completeAppointment = () => step('confirmed', 'awaiting-approval');
/** User approves the final order. */
export const approveOrder = () => step('awaiting-approval', 'tailoring');
/** Garments finished. */
export const markReady = () => step('tailoring', 'ready-for-pickup');
/** 07a/07b: how the garments come back. */
export function chooseFulfilment(method, window) {
  const a = apptEntry();
  if (!a) return null;
  a.fulfilment = { method, window };
  return a;
}
/** Garments back with the customer. */
export const deliver = () => step('ready-for-pickup', 'delivered');

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
 * appointment refunds the deposit.
 */
export function cancelAppointment(index) {
  const i = index == null ? state.currentAppt.index : index;
  const a = state.upcoming[i];
  if (!a) return null;
  const wasRequested = (a.status || 'confirmed') === 'requested';
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

export { TAILORS, JOB_TYPES, DEPOSIT_RATE };
