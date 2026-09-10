/* ============================================================
   Taily v4 — appointment state machine
   Ported from taily-prototype-v3.html. v3 is the source of truth
   for behaviour: transitions below preserve v3 semantics exactly,
   including its quirks (see advanceStatus).

   The one deliberate change from v3: v3 mutated state and painted
   the DOM in the same function (toast(...), renderTracking(), ...).
   Here the transitions are pure — they mutate state and RETURN what
   happened, so the caller decides what to render or announce.

   ---------- UX-LOOP round 2 substrate: the two lists ----------
   state.upcoming   live appointments, newest first: searching →
                    confirmed → awaiting-approval → tailoring →
                    ready-for-pickup → delivered (09 partitions the
                    delivered ones under Past by status).
   state.past       SEED_PAST (two delivered store visits) + every
                    TERMINAL appointment, newest FIRST. cancelAppointment /
                    declineAppointment / expireAppointment / tailorCancels
                    MOVE the entry here (splice from upcoming, unshift
                    onto past). The moved entry is the same object — it
                    keeps every card field (mine, name, month/day, when,
                    needBy, visit, count, items, itemLines, garments,
                    totals, bring …) and gains:
                      status       'cancelled' | 'declined' | 'expired'
                      cancelledBy  'customer' | 'tailor' | 'none'
                                   (customer cancel = customer, decline /
                                   cant-make-it / no-show = tailor,
                                   expiry = none)
                      reason       'customer' | 'declined' | 'expired' |
                                   'cant-make-it' | 'no-show'
                      cancelledAt  "Wed, Sept 9" (fmtDay of today)
                      wasRequested true when it was still searching
                                   (nothing was ever charged)
   state.lastCancelled  the SAME object as the most recently moved
                    entry (=== state.past[0] right after the move); null
                    at boot, after reset() and after requestTailor().
   state.currentAppt {list, index} — repointed to {list:'past',
                    index:0} when it referenced the moved entry, so
                    apptEntry() / 03-status-cancelled keep resolving.
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

/* ---------- Garment identity (UX-LOOP R2-T-08) ----------
   Every garment carries a stable `id` so the tailor's at-visit editor
   can match its draft against the booking by identity (never by
   index). Seeds use g1…g7 (data.js); live garments count from g101. */
let garmentSeq = 100;
/** A fresh garment id ("g101", "g102", …). */
export const nextGarmentId = () => `g${++garmentSeq}`;
/** Stamp ids on any garments that lack one (in place). */
export function ensureGarmentIds(garments = []) {
  garments.forEach((g) => { if (g && !g.id) g.id = nextGarmentId(); });
  return garments;
}

/**
 * Recompute an appointment's card summary from its garments
 * (UX-LOOP R2-U-08): `count` (qty-aware), `items` ("3 items ·
 * Alterations" — the seed's grammar) and `itemLines` ("1 Suit Jacket -
 * Hem / Adjust Length, Sleeve / Adjust Length" — requestTailor's).
 * Called by whoever rewrites `a.garments` (draftFinalOrder here, the
 * tailor's writeFinalOrder). NOT run on the seed at boot — the 01/09
 * frames' card copy ("3 Items Total", two lines) stays until revised.
 */
export function refreshItemSummary(a) {
  if (!a || !Array.isArray(a.garments)) return a;
  const n = a.garments.reduce((s, g) => s + (g.qty ?? 1), 0);
  a.count = n;
  a.items = `${n} item${n === 1 ? '' : 's'} · Alterations`;
  a.itemLines = a.garments.map((g) => `${g.qty ?? 1} ${g.type} - ${(g.jobs ?? []).join(', ')}`);
  return a;
}

/** Send the built request to a tailor: creates the searching appointment. */
export function requestTailor() {
  const totals = bookingLines(null);
  /* badge from the requested time ("Jul 12, 7:00 PM" → JUL / 12) */
  const m = state.appt.when.match(/^([A-Za-z]+)\s+(\d+)/);
  const { contact } = state;
  const home = state.appt.where === 'Home Visit';
  ensureGarmentIds(state.garments);
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

/** Today, in the prototype's day grammar ("Wed, Sept 9"). */
const today = () => fmtDay(new Date().toDateString());

/**
 * Step `a` from one status to another (UX-LOOP R2-T-02: every
 * transition names its appointment; the default is still the one the
 * customer is viewing). Returns true when the step happened, false
 * when there is no appointment or it is not at `from`.
 */
export function step(from, to, extra = {}, a = apptEntry()) {
  if (!a) return false;
  if (from && canonicalStatus(a.status) !== from) return false;
  a.status = to;
  Object.assign(a, extra);
  return true;
}

/** Tailor accepts the request — the deposit hold is charged now (v3
    semantic); depositOn dates the receipt rows. A pending time
    proposal is moot once the request is accepted as booked. */
export function tailorAccepts(a = apptEntry()) {
  const ok = step('searching', 'confirmed', { depositOn: mdy(new Date().toDateString(), '7/7/26') }, a);
  if (ok) a.proposed = null;
  return ok;
}
/** The appointment happened; tailor drafts the final order. */
export const completeAppointment = (a = apptEntry()) => step('confirmed', 'awaiting-approval', {}, a);
/** User approves the final order (stamps approvedAt — the order on
    file is already the reviewed one, nothing is copied). Clears a
    pending Request Changes (R2-T-09). */
export function approveOrder(a = apptEntry()) {
  const ok = step('awaiting-approval', 'tailoring', { approvedAt: fmtDay(a?.when, 'Sun, Jul 12') }, a);
  if (ok) delete a.changesRequestedAt;
  return ok;
}
/** Garments finished — stamps readyAt (the fiction's Thu, Jul 16: the
    day before need-by, never before the appointment itself). */
export function markReady(a = apptEntry()) {
  if (!a) return false;
  const dayBefore = shiftDay(a.needBy, -1);
  const apptDay = parseWhen(a.when)?.date;
  const beforeDay = parseWhen(dayBefore)?.date;
  const readyAt = (dayBefore && (!apptDay || !beforeDay || beforeDay > apptDay)) ? dayBefore : fmtDay(a.needBy, 'Thu, Jul 16');
  return step('tailoring', 'ready-for-pickup', { readyAt }, a);
}
/** 07a/07b: how the garments come back. `date` is the window's calendar
    day ("Jul 17") so receipts and the delivered stamp can name it. */
export function chooseFulfilment(method, window, date = null, a = apptEntry()) {
  if (!a) return false;
  a.fulfilment = { method, window, date };
  return true;
}
/** Garments back with the customer — stamps deliveredAt from the
    chosen window's day. */
export function deliver(a = apptEntry()) {
  if (!a) return false;
  const day = a.fulfilment?.date ?? a.fulfilment?.window ?? a.readyAt ?? a.needBy;
  return step('ready-for-pickup', 'delivered', { deliveredAt: fmtDay(day, a.readyAt ?? 'Fri, Jul 17') }, a);
}

/* ---------- Proposed time (UX-LOOP R2-U-03 / R2-T-04) ---------- */

/** The tailor proposes another time for a request. Status stays
    searching; `a.proposed = { when, by: 'tailor', at }`. Only a
    searching appointment can receive a proposal. */
export function proposeTime(a, when) {
  if (!a || !when || canonicalStatus(a.status) !== 'searching') return false;
  a.proposed = { when, by: 'tailor', at: today() };
  a.proposalDeclined = null;
  return true;
}

/** The customer accepts a proposed time (or the tailor confirms a
    time): `a.when = when`, proposal cleared, status confirmed, deposit
    hold charged (depositOn). `when` first keeps the v3 signature;
    omitted, it falls back to the pending proposal. */
export function acceptProposedTime(when, a = apptEntry()) {
  if (!a) return null;
  const at = when ?? a.proposed?.when;
  if (at) a.when = at;
  a.proposed = null;
  a.status = 'confirmed';
  a.depositOn ??= mdy(new Date().toDateString(), '7/7/26');
  return { appointment: a, when: a.when, deposit: a.totals ? a.totals.deposit : null };
}

/** The customer keeps looking: proposal cleared, remembered on
    `a.proposalDeclined`; status stays searching. */
export function declineProposedTime(a = apptEntry()) {
  if (!a) return false;
  a.proposalDeclined = a.proposed?.when ?? a.proposalDeclined ?? null;
  a.proposed = null;
  return true;
}

/** 04.1 Sounds Good (R2-T-09): the customer wants to talk the final
    order over before approving. Status unchanged; approveOrder clears it. */
export function requestChanges(a = apptEntry()) {
  if (!a) return false;
  a.changesRequestedAt = fmtDay(a.when, 'Sun, Jul 12');
  return true;
}

/* ---------- Terminal transitions → state.past (R2-U-06/07, R2-T-01) ---------- */

/**
 * Close an appointment: stamp the terminal facts, move it from
 * state.upcoming to the FRONT of state.past, point state.lastCancelled
 * at it, and keep state.currentAppt resolving. Returns wasRequested.
 */
function terminate(a, status, cancelledBy, reason) {
  const wasRequested = canonicalStatus(a.status || 'confirmed') === 'searching';
  Object.assign(a, { status, cancelledBy, reason, cancelledAt: today(), wasRequested });
  const i = state.upcoming.indexOf(a);
  const c = state.currentAppt ?? { list: 'upcoming', index: 0 };
  if (i >= 0) {
    state.upcoming.splice(i, 1);
    state.past.unshift(a);
    if (c.list === 'upcoming' && c.index === i) state.currentAppt = { list: 'past', index: 0 };
    else if (c.list === 'upcoming' && c.index > i) c.index -= 1;
    else if (c.list === 'past') c.index += 1;
  } else if (!state.past.includes(a)) {
    state.past.unshift(a);
    if (c.list === 'past') c.index += 1;
  }
  state.lastCancelled = a;
  return wasRequested;
}

/** The tailor declines the request (cancelledBy 'tailor', reason
    'declined'). Nothing was charged. */
export function declineAppointment(a = apptEntry()) {
  if (!a) return null;
  terminate(a, 'declined', 'tailor', 'declined');
  return { appointment: a, deposit: a.totals ? a.totals.deposit : 20 };
}

/** No tailor accepted in time (cancelledBy 'none', reason 'expired'). */
export function expireAppointment(a = apptEntry()) {
  if (!a) return null;
  terminate(a, 'expired', 'none', 'expired');
  return { appointment: a };
}

/** The tailor cancels a confirmed visit (R2-U-05 / R2-T-05):
    reason 'cant-make-it' | 'no-show'. Status 'cancelled', cancelledBy
    'tailor'. No charge — the hold is released (fee policy: Kevin). */
export function tailorCancels(a = apptEntry(), reason = 'cant-make-it') {
  if (!a) return null;
  const wasRequested = terminate(a, 'cancelled', 'tailor', reason);
  return { appointment: a, wasRequested, reason, refund: wasRequested ? 0 : (a.totals ? a.totals.deposit : 0) };
}

/**
 * The customer cancels (a request withdrawn, or a confirmed visit).
 * v3: a request that was never confirmed charges nothing; a confirmed
 * appointment refunds the deposit. `aOrIndex` may be the appointment,
 * its index in state.upcoming, or nothing (the one being viewed — v3
 * read state.upcoming[currentAppt.index]). The entry moves to
 * state.past[0] with status 'cancelled', cancelledBy 'customer',
 * reason 'customer', and state.lastCancelled points at it.
 */
export function cancelAppointment(aOrIndex) {
  let a;
  if (aOrIndex && typeof aOrIndex === 'object') a = aOrIndex;
  else a = state.upcoming[aOrIndex == null ? state.currentAppt.index : aOrIndex];
  if (!a) return null;
  const wasRequested = terminate(a, 'cancelled', 'customer', 'customer');
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
  if (g && !g.id) g.id = nextGarmentId();   // R2-T-08: stable identity
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
  if (a && isPostAppointment(a) && a.garments?.length) {
    /* R2-T-08: booked garments the tailor dropped at the visit ride
       along so 04 can list them ("Removed at the visit — …") */
    return { garments: a.garments, totals: a.totals ?? apptTotals(a.garments), removed: a.removed ?? [] };
  }
  return SEED_FINAL_ORDER;
}

/** Has the order been changed at the appointment (04 Default vs
    Modified)? Added garments / services, or a booked garment removed
    at the visit (R2-T-08). */
export const orderModified = (order) => (order?.garments ?? []).some((g) => g.added || g.addedJobs?.length) || (order?.removed?.length ?? 0) > 0;

/**
 * DEMO (user side, 03.2's Confirm): the tailor's at-visit review, as the
 * frames tell it — one extra service on the first garment and one more
 * of the same garment. Writes a.garments / a.totals (the shared final
 * order) and stamps revisedAt; a no-op once the tailor's own T05 Send
 * has written the order. From the $200 seed this yields the $360 06B
 * fiction exactly.
 */
export function draftFinalOrder(a = apptEntry()) {
  if (!a || a.revisedAt || !a.garments?.length) return null;
  ensureGarmentIds(a.garments);
  a.booked ??= clone(a.garments);   // the order as booked (the tailor side reads it)
  const garments = clone(a.garments).map((g) => { delete g.displayPrice; return g; });
  const first = garments[0];
  const extra = ['Sleeve / Adjust Length', 'Hem / Adjust Length', 'Taper / Slim Fit'].find((j) => !first.jobs.includes(j));
  if (extra) { first.jobs.push(extra); first.addedJobs = [...(first.addedJobs ?? []), extra]; }
  garments.push({ id: nextGarmentId(), type: first.type, jobs: ['Sleeve / Adjust Length'], qty: 1, photos: 2, added: true });
  a.garments = garments;
  a.totals = apptTotals(garments, a.totals ?? {});
  a.revisedAt = fmtDay(a.when, 'Sun, Jul 12');
  refreshItemSummary(a);   // R2-U-08: cards follow the final order
  return a;
}

export { TAILORS, JOB_TYPES, DEPOSIT_RATE };
