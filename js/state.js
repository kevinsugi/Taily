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
                                   'cant-make-it' | 'no-show' | 'unconfirmed'
                      cancelledAt  "Wed, Sept 9" (fmtDay of today)
                      wasRequested true when it was still searching
                                   (nothing was ever charged — the fee
                                   hold is released)
                      refund       the visitation fee going back (0 kept)
                      feeKept      true only when a CHARGED fee is kept
                                   (round 7: the customer confirmed the
                                   visit, then cancelled / no-showed)
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
  APPT_DEFAULT,
  SEED_UPCOMING,
  SEED_PAST,
  SEED_FINAL_ORDER,
  DELIVERY_FEE,
  visitFee,
  visitFeeNote,
  apptTotals,
  payout,
  noShowComp,
  fmtDay,
  shiftDay,
  parseWhen,
  mdy,
  isAfterDay,
  nextOrderId,
} from './data.js';

/* ---------- UX-LOOP round 7 substrate: money model v2 (Kevin) ----------
   THE VISITATION FEE IS THE DEPOSIT. No 10% anything, on either side.
     a.totals = { alterations, items, visitFee, visitFeeCharged,
                  visitFeeAdded, delivery, total } (data.js apptTotals;
                  `subtotal` = alterations, deprecated alias)
     requestTailor()        visitFee from the booked item count (tiers in
                            data.js), `feeHeld: true` — held, not charged
     tailorAccepts(a)       charges it: `feeChargedOn` (receipt date),
                            feeHeld false. acceptProposedTime() likewise.
     confirmAppointment(a)  the 24-hour prompt's Confirm: `confirmedAt`,
                            `feeLocked = true` → the fee is non-refundable
                            from here (no-show included)
     cancelAppointment(a)   refund = feeLocked ? 0 : visitFee; a request
                            never accepted charged nothing (hold released)
     tailorCancels(a, r)    'cant-make-it' → full refund always;
                            'no-show' → kept only if feeLocked; stamps
                            `a.noShowComp` (round 8: the tailor's trip
                            compensation, data.js noShowComp) either way
     declineAppointment / expireAppointment → full refund (never charged)
     autoCancelUnconfirmed(a)  12 hours before the visit with no
                            confirmation: terminal `cancelled`,
                            cancelledBy 'none', reason 'unconfirmed',
                            full refund, moved to past like the others
     writeFinalOrder / draftFinalOrder re-tier the fee from the final
                            item count (apptTotals): `visitFeeAdded` is
                            owed at handoff with the alterations; the
                            charged fee never shrinks.
   Every terminal entry stamps `refund` + `feeKept`. The old deposit /
   depositOn / depositKept fields are gone. The tailor side reads
   payout(garments) = 100% of the alteration prices and never the
   customer's fee / delivery / total.
   ---------- round 6 (kept) ----------
   NO TAILOR NAME BEFORE MATCHING: requestTailor() leaves name /
   initials / tailorId null and sets `matching: true`; tailorAccepts()
   (and acceptProposedTime()) assign Marco and clear it. Screens read
   data.js tailorName() / tailorInitials() / tailorFirst().
   RESCHEDULE = cancel + resubmit the same job for a new tailor:
   rescheduleAppointment(a) cancels (round 7: the feeLocked rule),
   copies the items into the booking form + Home selection
   (copyItemsOver) and restores the requested time / need-by / visit
   type; 03.1 then lands on 02, whose Request Tailor creates a new
   matching request.
   ---------------------------------------------------------------- */

/** Marco — the one tailor the prototype matches with. */
const MATCHED_TAILOR = { name: 'Marco Tailor', initials: 'MT', tailorId: 'marco' };
function assignTailor(a) {
  if (!a) return;
  a.name ??= MATCHED_TAILOR.name;
  a.initials ??= MATCHED_TAILOR.initials;
  a.tailorId ??= MATCHED_TAILOR.tailorId;
  a.matching = false;
}

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
    // v3 charged the hold exactly on requested/searching -> confirmed
    // (round 7: the hold is the visitation fee)
    feeCharged: canon === 'searching' && next === 'confirmed',
    visitFee: a.totals ? a.totals.visitFee : null,
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
    /* R6: no tailor until one accepts — tailorAccepts() assigns Marco */
    name: null, initials: null, tailorId: null, matching: true,
    where: home ? 'home' : 'shop',
    place: home ? `${contact.street}${contact.unit ? ', ' + contact.unit : ''}` : '1025 Broadway, Midtown West',
    when: state.appt.when, needBy: state.appt.needBy, status: 'searching',
    visit: state.appt.where, count: state.garments.reduce((s, g) => s + g.qty, 0),
    month: (m?.[1] ?? 'JUL').slice(0, 3).toUpperCase(), day: m?.[2] ?? '12',
    itemLines: state.garments.map((g) => `${g.qty} ${g.type} - ${g.jobs.join(', ')}`),
    garments: JSON.parse(JSON.stringify(state.garments)),
    bring: ['Your garments', 'The shoes you plan to wear with them.'],
    totals,
    /* R7: the visitation fee is HELD at booking (its tier from the
       booked count is already in `totals`), charged on acceptance */
    feeHeld: true,
    /* R3-T-04: one order number per booking (the seed keeps 4417) */
    orderId: nextOrderId(),
    /* R4-U-02: the method this booking paid with — 03/Cancelled's refund
       line reads it, not whatever a later booking chose */
    payMethod: state.payMethod,
  };
  state.upcoming.unshift(a);
  state.currentAppt = { list: 'upcoming', index: 0 };
  state.lastCancelled = null;
  /* R3-U-01: the appointment owns the garments now — the booking form
     and the Home tile selection start empty (a duplicate request is no
     longer one tap away; copyItemsOver / + Additional Garment rebuild
     the selection from garments when they need it). */
  state.garments = [];
  state.ui ??= {};
  state.ui.homeSelection = {};
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

/** The receipt date of the fee charge ("9/10/26"; the seed's fiction
    says 7/7/26). */
const chargeDate = () => mdy(new Date().toDateString(), '7/7/26');
/** Charge the held visitation fee (R7): stamps `feeChargedOn`, clears
    the hold. Idempotent — a fee already charged keeps its date. */
function chargeFee(a) {
  if (!a) return;
  a.feeChargedOn ??= chargeDate();
  a.feeHeld = false;
}

/** Tailor accepts the request — the held visitation fee is charged now
    (Kevin, R7): `feeChargedOn` dates the receipt rows. A pending time
    proposal is moot once the request is accepted as booked. */
export function tailorAccepts(a = apptEntry()) {
  const ok = step('searching', 'confirmed', {}, a);
  if (ok) { chargeFee(a); a.proposed = null; assignTailor(a); }   // R6: the tailor is named on acceptance
  return ok;
}
/**
 * The 24-hour prompt's Confirm (R7): the customer confirms the visit —
 * `confirmedAt` + `feeLocked = true`: from here the visitation fee is
 * non-refundable (a no-show keeps it too). Only a confirmed, not yet
 * happened appointment can be confirmed; returns true when it was.
 * 03.2's Confirm calls this before completeAppointment().
 */
export function confirmAppointment(a = apptEntry()) {
  if (!a || canonicalStatus(a.status) !== 'confirmed') return false;
  a.confirmedAt = today();
  a.feeLocked = true;
  return true;
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
    day ("Jul 17") so receipts and the delivered stamp can name it.
    R7: home delivery adds DELIVERY_FEE to the totals (`delivery`,
    `total`); pickup takes it back out. */
export function chooseFulfilment(method, window, date = null, a = apptEntry()) {
  if (!a) return false;
  a.fulfilment = { method, window, date };
  if (a.totals) {
    const delivery = method === 'delivery' ? DELIVERY_FEE : 0;
    a.totals = { ...a.totals, delivery, total: (a.totals.alterations ?? 0) + (a.totals.visitFee ?? 0) + delivery };
  }
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
    searching appointment can receive a proposal, and only for a day
    no later than the need-by day (R3-U-02 / R3-T-01 — day-level, the
    rule markReady uses; `proposalDays(a)` in data.js is the wheel's
    matching bound). R4-U-03 / R4-T-01: ON the need-by day the slot
    must also be strictly before the need-by time (when it has one) —
    `proposalHours` caps the wheel the same way. Returns false otherwise. */
export function proposeTime(a, when) {
  if (!a || !when || canonicalStatus(a.status) !== 'searching') return false;
  if (isAfterDay(when, a.needBy)) return false;
  const w = parseWhen(when); const nb = parseWhen(a.needBy);
  if (w && nb && nb.hour != null && w.date.toDateString() === nb.date.toDateString() && w.date >= nb.date) return false;
  a.proposed = { when, by: 'tailor', at: today() };
  a.proposalDeclined = null;
  return true;
}

/** The customer accepts a proposed time (or the tailor confirms a
    time): `a.when = when`, proposal cleared, status confirmed, the held
    visitation fee charged (feeChargedOn, R7). `when` first keeps the v3
    signature; omitted, it falls back to the pending proposal. */
export function acceptProposedTime(when, a = apptEntry()) {
  if (!a) return null;
  const at = when ?? a.proposed?.when;
  if (at) a.when = at;
  a.proposed = null;
  a.status = 'confirmed';
  chargeFee(a);
  assignTailor(a);   // R6: accepting the proposal books the proposing tailor
  return { appointment: a, when: a.when, visitFee: a.totals ? a.totals.visitFee : null };
}

/** The proposal is dropped: by the customer (Keep Looking, the
    default) or by the tailor withdrawing it (`by = 'tailor'`, R3-T-02).
    Cleared and remembered as `a.proposalDeclined = { when, by }`;
    status stays searching. */
export function declineProposedTime(a = apptEntry(), by = 'customer') {
  if (!a) return false;
  const when = a.proposed?.when ?? a.proposalDeclined?.when ?? null;
  a.proposalDeclined = when ? { when, by } : null;
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

/** The visitation fee on file for an appointment (charged or held). */
const feeOf = (a) => a?.totals?.visitFeeCharged ?? a?.totals?.visitFee ?? 0;
/** Stamp the fee outcome on a terminal entry (R7): `refund` (the fee
    going back — the hold released when it was never charged) and
    `feeKept` (a charged fee stays with Taily). */
function settleFee(a, { kept = false } = {}) {
  const fee = feeOf(a);
  a.refund = kept ? 0 : fee;
  a.feeKept = kept && fee > 0;
  return { refund: a.refund, kept: a.feeKept };
}

/** The tailor declines the request (cancelledBy 'tailor', reason
    'declined'). Nothing was charged — the fee hold is released. */
export function declineAppointment(a = apptEntry()) {
  if (!a) return null;
  terminate(a, 'declined', 'tailor', 'declined');
  const { refund } = settleFee(a);
  return { appointment: a, refund, visitFee: feeOf(a) };
}

/** No tailor accepted in time (cancelledBy 'none', reason 'expired').
    A proposal still pending is kept on `a.lapsedProposal` (R3-T-02:
    "Marco proposed … but the request lapsed before you answered").
    The fee hold is released. */
export function expireAppointment(a = apptEntry()) {
  if (!a) return null;
  if (a.proposed) { a.lapsedProposal = a.proposed; a.proposed = null; }
  terminate(a, 'expired', 'none', 'expired');
  const { refund } = settleFee(a);
  return { appointment: a, refund };
}

/** The tailor cancels a confirmed visit (R2-U-05 / R2-T-05):
    reason 'cant-make-it' | 'no-show'. Status 'cancelled', cancelledBy
    'tailor'. R7 fee policy: the tailor cancelling refunds the fee,
    always (`feeLocked` ignored); a no-show keeps it ONLY once the
    customer had confirmed the visit (`feeLocked`) — before that it
    is refunded too. Round 8 (Kevin): a no-show pays the tailor
    `noShowComp(a.totals.visitFee)` for the trip — stamped on
    `a.noShowComp` whenever the tailor marks a no-show (Taily pays it
    from the kept fee, and absorbs it if the visit was unlocked);
    nothing changes on the customer's record. */
export function tailorCancels(a = apptEntry(), reason = 'cant-make-it') {
  if (!a) return null;
  const wasRequested = terminate(a, 'cancelled', 'tailor', reason);
  const { refund, kept } = settleFee(a, { kept: reason === 'no-show' && !wasRequested && a.feeLocked === true });
  if (reason === 'no-show') a.noShowComp = noShowComp(a.totals?.visitFee ?? feeOf(a));
  return { appointment: a, wasRequested, reason, refund, kept, noShowComp: a.noShowComp };
}

/**
 * The customer cancels (a request withdrawn, or a confirmed visit).
 * v3: a request that was never confirmed charges nothing. R7: a
 * confirmed appointment refunds the visitation fee in full until the
 * customer confirmed the visit on the 24-hour prompt (`feeLocked`,
 * confirmAppointment) — after that the fee is kept. `aOrIndex` may be
 * the appointment, its index in state.upcoming, or nothing (the one
 * being viewed — v3 read state.upcoming[currentAppt.index]). The entry
 * moves to state.past[0] with status 'cancelled', cancelledBy
 * 'customer', reason 'customer', and state.lastCancelled points at it.
 * R4-U-01: once the appointment has happened (awaiting-approval →
 * delivered) the order is the tailor's measured work — it cannot be
 * cancelled from here; returns null and leaves the entry untouched
 * (03.1 toasts "message Marco").
 */
export function cancelAppointment(aOrIndex) {
  let a;
  if (aOrIndex && typeof aOrIndex === 'object') a = aOrIndex;
  else a = state.upcoming[aOrIndex == null ? state.currentAppt.index : aOrIndex];
  if (!a) return null;
  if (isPostAppointment(a)) return null;
  const wasRequested = terminate(a, 'cancelled', 'customer', 'customer');
  const { refund, kept } = settleFee(a, { kept: !wasRequested && a.feeLocked === true });
  return { appointment: a, wasRequested, refund, kept };
}

/**
 * R7: 12 hours before the visit with no confirmation on the 24-hour
 * prompt — Taily cancels the appointment for the customer: terminal
 * `cancelled`, cancelledBy 'none', reason 'unconfirmed', the fee
 * refunded in full (it was never locked), the tailor's slot reopened
 * (T01 renders the closed row). Only a confirmed, unconfirmed
 * (`!feeLocked`), not yet happened appointment qualifies; returns null
 * otherwise. The customer-side demo is 03/Reminder's title tap.
 */
export function autoCancelUnconfirmed(a = apptEntry()) {
  if (!a || canonicalStatus(a.status) !== 'confirmed' || a.feeLocked) return null;
  terminate(a, 'cancelled', 'none', 'unconfirmed');
  const { refund } = settleFee(a);
  return { appointment: a, refund };
}

/**
 * The cancelled order's garments become the next booking's starting
 * point — 02's cards and 01's tile badges (R1-U-09). Moved here from
 * 03.1 in round 6 so rescheduleAppointment() can call it; the screen
 * re-exports it for 03/Cancelled's re-request CTAs.
 */
export function copyItemsOver(a) {
  const garments = clone(a?.garments ?? []);
  garments.forEach((g) => { delete g.added; delete g.addedJobs; delete g.displayPrice; delete g.id; });
  state.garments = garments;
  state.ui ??= {};
  state.ui.homeSelection = garments.reduce((m, g) => { m[g.type] = (m[g.type] ?? 0) + g.qty; return m; }, {});
  return garments;
}

/**
 * R6 "reschedule" = cancel + resubmit the same job for a new tailor at
 * the same time (Kevin): runs cancelAppointment(a) (R7: the feeLocked
 * rule, same terminal placement — null when the visit already happened),
 * copies the items into the booking form + Home selection and restores
 * the requested time / need-by / visit type on state.appt, so 02 opens
 * pre-filled and its Request Tailor creates a fresh matching request.
 * Returns the cancel result ({ appointment, wasRequested, refund, kept }).
 */
export function rescheduleAppointment(a = apptEntry()) {
  const res = cancelAppointment(a);
  if (!res) return null;
  copyItemsOver(a);
  if (a.when) state.appt.when = a.when;
  if (a.needBy) state.appt.needBy = a.needBy;
  if (a.visit) state.appt.where = a.visit;
  return res;
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
 * The booking form's pricing (02's fee card + CTA, 03/Requested's
 * estimate row): per-tailor minimums ("$N+") for the alterations and
 * the visitation fee tier for the item count (R7) — the same shape
 * apptTotals() returns, plus `note` (the tier's supporting line, ''
 * on the $25 tier). Ported from v3 bookingLines(), reading `state`.
 */
export function bookingLines(tailor) {
  const mult = tailor ? tailor.mult : 1;
  const rows = state.garments.map((g) => ({
    label: `${g.type} — ${g.jobs.join(', ')}`,
    qty: g.qty,
    amount: Math.round(g.jobs.reduce((s, j) => s + JOB_TYPES[j].price * mult, 0)) * g.qty,
  }));
  const alterations = rows.reduce((s, r) => s + r.amount, 0);
  const items = state.garments.reduce((s, g) => s + (g.qty ?? 1), 0);
  const fee = visitFee(items);
  return {
    rows, alterations, items,
    visitFee: fee, visitFeeCharged: fee, visitFeeAdded: 0,
    delivery: 0, total: alterations + fee,
    note: visitFeeNote(items),
    subtotal: alterations,   // deprecated alias
  };
}

/* ---------- The final order (UX-LOOP round 1) ---------- */

/* apptTotals() / payout() live in data.js since round 7 (the tailor
   side imports them from either module); re-exported here for the
   round 1–6 import paths. */
export { apptTotals, payout };

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
  a.totals = apptTotals(garments, a.totals ?? {});   // R7: re-tiers the fee, never below the charged one
  a.revisedAt = fmtDay(a.when, 'Sun, Jul 12');
  refreshItemSummary(a);   // R2-U-08: cards follow the final order
  return a;
}

export { TAILORS, JOB_TYPES };
