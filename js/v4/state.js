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
                      refund       the Concierge fee going back (0 kept)
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
  visitFee,
  visitFeeNote,
  rushFee,
  apptTotals,
  payout,
  noShowComp,
  itemCount,
  fmtDay,
  shiftDay,
  parseWhen,
  mdy,
  isAfterDay,
  nextOrderId,
  fmtPill,
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
/* round 16 (Kevin): a tailor who declined is skipped — the next one in
   TAILORS takes the request */
function assignTailor(a) {
  if (!a) return;
  const declined = a.declinedBy ?? [];
  const next = declined.includes(MATCHED_TAILOR.tailorId) ? TAILORS.find((t) => !declined.includes(t.id)) : null;
  const pick = next ? { name: next.name, initials: next.initials, tailorId: next.id } : MATCHED_TAILOR;
  a.name ??= pick.name;
  a.initials ??= pick.initials;
  a.tailorId ??= pick.tailorId;
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
/* Round 16 (Kevin): a decline is no longer terminal — the request goes
   back to matching (declineAppointment). */
export const TERMINAL_STATUSES = ['cancelled', 'expired'];
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
  garments: [],            // { id, type, jobs, photos } — one garment = one item (round 12)
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
    /* Round 12 (Kevin): no address until the customer enters one —
       01 / 02 read "Please Enter Address" (addressLine) and 02's
       Reserve stays inert (requestBlocker) until it is saved. The
       02.2 frame's filled form is FIXTURE_CONTACT below. */
    street: '',
    unit: '',
    zip: '',
    notes: '',
    saveHome: true,
  },
  payMethod: 'card',
  upcoming: clone(SEED_UPCOMING),
  past: clone(SEED_PAST),
  currentAppt: { list: 'upcoming', index: 0 },
};

/** The 02.2 frame's filled form (538:1382) and the seed booking's
    home address — the harness deep link and the Test flows menu use it. */
export const FIXTURE_CONTACT = { street: '88 Leonard St', unit: '4B', zip: '10013', notes: 'Buzz 4B — entrance is on Leonard St', saveHome: true };
/* ---------- Address (round 12, Kevin) ---------- */
export const ADDRESS_PLACEHOLDER = 'Please Enter Address';
/** Has the customer entered a street address yet? */
export const hasAddress = (c = state.contact) => !!(c?.street && String(c.street).trim());
/** The 01 / 02 heading line: "88 Leonard St, New York, NY" or the placeholder. */
export const addressLine = (c = state.contact) => (hasAddress(c) ? `${c.street}, ${state.userLoc}` : ADDRESS_PLACEHOLDER);
/** "88 Leonard St, 4B" — the home address an appointment reads; the
    appointment's own `place` (the seed's) when nothing was entered. */
export const homeAddress = (a = null, c = state.contact) => (hasAddress(c) ? `${c.street}${c.unit ? `, ${c.unit}` : ''}` : (a?.place ?? `${FIXTURE_CONTACT.street}, ${FIXTURE_CONTACT.unit}`));

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
    // (round 7: the hold is the Concierge fee)
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
  const n = a.garments.length;   // round 12: one garment = one item
  a.count = n;
  a.items = `${n} item${n === 1 ? '' : 's'} · Alterations`;
  a.itemLines = a.garments.map((g) => `1 ${g.type} - ${(g.jobs ?? []).join(', ')}`);
  return a;
}

/** Send the built request to a tailor: creates the searching appointment. */
export function requestTailor() {
  const totals = bookingLines(null);
  /* badge from the requested time ("Jul 12, 7:00 PM" → JUL / 12) */
  const m = String(state.appt.when ?? '').match(/^([A-Za-z]+)\s+(\d+)/);
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
    visit: state.appt.where, count: state.garments.length,
    month: (m?.[1] ?? 'JUL').slice(0, 3).toUpperCase(), day: m?.[2] ?? '12',
    itemLines: state.garments.map((g) => `1 ${g.type} - ${g.jobs.join(', ')}`),
    garments: JSON.parse(JSON.stringify(state.garments)),
    bring: ['Your garments', 'The shoes you plan to wear with them.'],
    totals,
    /* R7: the Concierge fee is HELD at booking (its tier from the
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
/** Charge the held Concierge fee (R7): stamps `feeChargedOn`, clears
    the hold. Idempotent — a fee already charged keeps its date. */
function chargeFee(a) {
  if (!a) return;
  a.feeChargedOn ??= chargeDate();
  a.feeHeld = false;
}

/** Tailor accepts the request — the held Concierge fee is charged now
    (Kevin, R7): `feeChargedOn` dates the receipt rows. A pending time
    proposal is moot once the request is accepted as booked. */
export function tailorAccepts(a = apptEntry()) {
  const ok = step('searching', 'confirmed', {}, a);
  if (ok) { chargeFee(a); a.proposed = null; assignTailor(a); }   // R6: the tailor is named on acceptance (round 16: never one who declined)
  return ok;
}
/**
 * The 24-hour prompt's Confirm (R7): the customer confirms the visit —
 * `confirmedAt` + `feeLocked = true`: from here the Concierge fee is
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
    file is already the reviewed one, nothing is copied). */
export const approveOrder = (a = apptEntry()) => step('awaiting-approval', 'tailoring', { approvedAt: fmtDay(a?.when, 'Sun, Jul 12') }, a);
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
/** 05: the delivery the customer scheduled (round 16, Kevin: delivery
    is the only handoff and the concierge fee covers it — nothing is
    added to the totals). `window` is the label the screens print
    ("Thu, Jul 23 · 5:00 PM"), `date` its calendar day ("Jul 23") so
    receipts and the delivered stamp can name it; `address` the delivery
    address line. The `method` argument is kept for the round-3..15
    callers and is always 'delivery'. */
export function chooseFulfilment(method, window, date = null, a = apptEntry(), address = null) {
  if (!a) return false;
  a.fulfilment = { method: 'delivery', window, date, address: address ?? a.fulfilment?.address ?? null };
  if (a.totals) a.totals = { ...a.totals, delivery: 0 };
  return true;
}
/** Garments back with the customer — stamps deliveredAt from the
    chosen window's day. */
export function deliver(a = apptEntry()) {
  if (!a) return false;
  /* round 16: the delivered stamp is the scheduled window itself ("Thu,
     Jul 23 · 5:00 PM" — 06 prints "Delivered: …"), else the day */
  const day = a.fulfilment?.window ?? a.fulfilment?.date ?? a.readyAt ?? a.needBy;
  return step('ready-for-pickup', 'delivered', { deliveredAt: a.fulfilment?.window ?? fmtDay(day, a.readyAt ?? 'Fri, Jul 17') }, a);
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
    Concierge fee charged (feeChargedOn, R7). `when` first keeps the v3
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

/* Round 12 (Kevin): 04.1's Sounds Good only closes the popup — the
   round-2 requestChanges() trace ("Sarah has questions") is gone. */

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

/** The Concierge fee on file for an appointment (charged or held). */
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

/** The tailor declines the request (round 16, Kevin): the request is
    NOT closed — it goes back to matching with the next tailor, the hold
    intact, and the customer sees nothing. The declining tailor is
    remembered on `a.declinedBy` so the tailor side can close its copy
    (T03A) and the next match skips them. Returns the appointment. */
export function declineAppointment(a = apptEntry()) {
  if (!a) return null;
  a.declinedBy = [...(a.declinedBy ?? []), a.tailorId ?? 'marco'];
  a.declinedAt = fmtDay(new Date().toDateString(), 'Sun, Jul 12');
  Object.assign(a, { status: 'searching', name: null, initials: null, tailorId: null, matching: true, feeHeld: true });
  a.proposed = null;
  delete a.tailor;
  return { appointment: a, visitFee: feeOf(a) };
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
  /* round 12: the compensation is the tailor's cut of the fee for the booked count */
  if (reason === 'no-show') a.noShowComp = noShowComp(itemCount(a));
  return { appointment: a, wasRequested, reason, refund, kept, noShowComp: a.noShowComp };
}

/**
 * The customer cancels (a request withdrawn, or a confirmed visit).
 * v3: a request that was never confirmed charges nothing. R7: a
 * confirmed appointment refunds the Concierge fee in full until the
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
  state.ui.homeSelection = garments.reduce((m, g) => { m[g.type] = (m[g.type] ?? 0) + 1; return m; }, {});
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
  if (a.when) state.appt.when = fmtPill(a.when);
  if (a.needBy) state.appt.needBy = fmtPill(a.needBy);
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
 * the Concierge fee tier for the item count (R7) — the same shape
 * apptTotals() returns, plus `note` (the tier's supporting line, ''
 * on the $25 tier). Ported from v3 bookingLines(), reading `state`.
 */
export function bookingLines(tailor) {
  const mult = tailor ? tailor.mult : 1;
  const rows = state.garments.map((g) => ({
    label: `${g.type} — ${g.jobs.join(', ')}`,
    amount: Math.round(g.jobs.reduce((s, j) => s + JOB_TYPES[j].price * mult, 0)),
  }));
  const alterations = rows.reduce((s, r) => s + r.amount, 0);
  const items = state.garments.length;   // round 12: one garment = one item
  const fee = visitFee(items);
  const rush = rushFee(state.appt?.when, state.appt?.needBy);   // round 15 (Kevin): $150 when need-by is within 24h of the visit
  return {
    rows, alterations, items,
    visitFee: fee, visitFeeCharged: fee, visitFeeAdded: 0,
    delivery: 0, rush, total: alterations + fee + rush,
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
 * Which screen an appointment opens from its card, and where the 03
 * family's guards hand over to (round 10, Kevin): the 03 variant for
 * its status — and, while the final order awaits approval, 04 Review &
 * Approve ITSELF (one approve screen; the Modified route when the visit
 * changed the booking). Terminal entries → 03/Cancelled.
 */
export function statusScreen(a) {
  const s = canonicalStatus(a?.status);
  if (isTerminal(a)) return '03-status-cancelled';
  if (s === 'searching') return '03-status-requested';
  if (s === 'confirmed') return '03-status-confirmed';
  if (s === 'awaiting-approval') return orderModified(finalOrder(a)) ? '04-review-approve-modified' : '04-review-approve';
  if (s === 'delivered') return '03-status-summary';
  /* round 16 (Kevin): a scheduled delivery has its own status screen */
  if (s === 'ready-for-pickup' && a?.fulfilment?.window) return '03-status-delivery-scheduled';
  return '03-status-tailoring';   // tailoring / ready (delivery not scheduled yet)
}

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
  garments.push({ id: nextGarmentId(), type: first.type, jobs: ['Sleeve / Adjust Length'], photos: 2, added: true });
  a.garments = garments;
  a.totals = apptTotals(garments, a.totals ?? {});   // R7: re-tiers the fee, never below the charged one
  a.revisedAt = fmtDay(a.when, 'Sun, Jul 12');
  refreshItemSummary(a);   // R2-U-08: cards follow the final order
  return a;
}

export { TAILORS, JOB_TYPES };
