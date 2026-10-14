/* ============================================================
   M3 Test-flows entries — one array per screen (pre-scaffolded in M0).
   Each screen builder edits only its own FLOWS_<screen_id> array.
   Entry shape: see docs/v5/CONTEXT.md (FLOWS / EXPECT contract).
   ============================================================ */

import { SCENARIOS as CB_SC, SEED_SLOT as CB_SEED, SECOND_SLOT_AFTER as CB_AFTER } from './money-scenarios.js';
import { addRequest as cbAddRequest } from './common.js';
import { fmtExact as cbExact } from '../money.js';
import { fmtWhen as cbWhen, isoMinute as cbIsoMinute, addMinutes as cbAddMinutes } from '../dates.js';
import { POLICY as CB_POLICY } from '../money-config.js';

import { SCENARIOS as C3_SCENARIOS, SEED_SLOT as C3_SEED_SLOT, SUGGESTED_SLOT as C3_SUGGESTED_SLOT } from './money-scenarios.js';
import { fmtExact as c3Exact } from '../money.js';
import { fmtWhen as c3When } from '../dates.js';

/* ---------- C4 · Customer bookings (c-bookings, c-booking) ---------- */
export const FLOWS_c_bookings = [
  { key: 'c-bookings', screen: 'c-bookings', group: 'M3 · Bookings', title: 'Bookings', note: 'A cancelled visit under Past, a second confirmed one under Upcoming',
    setup: (S) => { S.driveTo('cancelled-early'); cbAddRequest({ accept: true, after: CB_AFTER }); },
    expect: { has: ['Bookings', 'Upcoming', 'Past', 'Amara Reyes', 'Confirmed', 'Cancelled', cbWhen(CB_SEED)], sel: '.appt-row' } },
  { key: 'c-bookings--empty', screen: 'c-bookings', group: 'M3 · Bookings', title: 'Bookings — empty', note: 'No bookings yet: a way to start one',
    expect: { has: ['No bookings yet', 'Start a booking'], not: 'Upcoming', sel: '[data-empty="bookings"]' } },
];
export const FLOWS_c_booking = [
  { key: 'c-booking--confirmed', screen: 'c-booking', group: 'M3 · Bookings', title: 'Booked with Amara', note: 'Just accepted: deposit Paid, same time and prices as her ticket',
    setup: (S) => { S.driveTo('confirmed'); },
    expect: { has: ['Confirmed', 'booked with Amara', 'deposit is paid', cbWhen(CB_SEED), 'Paid', cbExact(CB_SC.seed.deposit), cbExact(CB_SC.seed.services), cbExact(CB_SC.seed.homeFee), 'Estimated total', 'Message Amara'], not: 'On hold' } },
  { key: 'c-booking', screen: 'c-booking', group: 'M3 · Bookings', title: 'Your visit with Amara', note: 'An hour after the accept: free cancellation until the cutoff, Reschedule, Cancel',
    setup: (S) => { S.driveTo('confirmed'); S.advanceClock(CB_POLICY.JUST_BOOKED_MIN); },
    expect: { has: ['Your visit with Amara', 'Free cancellation until Wed, Oct 14', 'Reschedule', 'Cancel booking'], not: 'booked with' } },
  { key: 'c-booking--cancel', screen: 'c-booking', group: 'M3 · Bookings', title: 'Cancel this booking? — more than 24 hours out', note: 'The exact refund shows before the tap',
    setup: (S) => { S.driveTo('confirmed'); S.advanceClock(CB_POLICY.JUST_BOOKED_MIN); },
    click: ['[data-act="cancel"]'],
    expect: { has: ['Cancel this booking?', `Cancel and get ${cbExact(CB_SC.earlyCancel.refund)} back`, 'Keep booking'] } },
  { key: 'c-booking--cancel-late', screen: 'c-booking', group: 'M3 · Bookings', title: 'Cancel this booking? — inside 24 hours', note: 'Two hours before the visit: the deposit is kept, said before the tap',
    setup: (S) => { S.driveTo('confirmed'); S.setClock(cbIsoMinute(cbAddMinutes(CB_SEED, -120))); },
    click: ['[data-act="cancel"]'],
    expect: { has: ['less than 24 hours away', `${cbExact(CB_SC.lateCancel.kept)} not refunded`, 'Kept'] } },
  { key: 'c-booking--cancelled', screen: 'c-booking', group: 'M3 · Bookings', title: 'Booking cancelled — refunded', note: 'Cancelled early: the deposit is on its way back',
    setup: (S) => { S.driveTo('cancelled-early'); },
    expect: { has: ['Booking cancelled', 'Refunded', cbExact(CB_SC.earlyCancel.refund), 'See other tailors'], not: 'Reschedule' } },
  { key: 'c-booking--cancelled-late', screen: 'c-booking', group: 'M3 · Bookings', title: 'Booking cancelled — deposit kept', note: 'Cancelled inside 24 hours: the deposit paid Amara for the time set aside',
    setup: (S) => { S.driveTo('cancelled-late'); },
    expect: { has: ['Booking cancelled', 'Kept', cbExact(CB_SC.lateCancel.kept)], not: 'Reschedule' } },
  { key: 'c-booking--reschedule', screen: 'c-booking', group: 'M3 · Bookings', title: 'Pick a new time — sheet', note: 'Early only: Amara open times before the need-by, same price',
    setup: (S) => { S.driveTo('confirmed'); S.advanceClock(CB_POLICY.JUST_BOOKED_MIN); },
    click: ['[data-act="reschedule"]'],
    expect: { has: ['Pick a new time', 'Now: ', 'Same price', 'Move my visit'], sel: '[data-scheduler]' } },
  { key: 'c-booking--cant-make-it', screen: 'c-booking', group: 'M3 · Bookings', title: 'Amara cannot make it', note: 'Her note, deposit refunded in full, job saved: Find another tailor',
    setup: (S) => { S.driveTo('cant-make-it'); },
    expect: { has: ['Cancelled by Amara', 'make it', 'Family emergency', 'Refunded', 'Find another tailor'] } },
  { key: 'c-booking--no-show', screen: 'c-booking', group: 'M3 · Bookings', title: 'Marked as a no-show', note: 'Amara waited and marked it missed: the deposit is kept',
    setup: (S) => { S.driveTo('no-show'); },
    expect: { has: ['Marked as a no-show', 'Kept', cbExact(CB_SC.seed.deposit)] } },
];
/* ---------- C1 · Tailor inbox + decide (t-home, t-request, t-suggest) — own helpers, prefixed c1 ---------- */
import { SCENARIOS as C1_SC, SEED_SLOT as C1_SLOT, SUGGESTED_SLOT as C1_SUGGESTED, SECOND_SLOT_AFTER as C1_AFTER } from './money-scenarios.js';
import { addRequest as c1AddRequest } from './common.js';
import { fmtExact as c1Exact, fmtNeg as c1Neg } from '../money.js';
import { fmtWhen as c1When, fmtTime as c1Time, isoMinute as c1Iso, addMinutes as c1Add } from '../dates.js';
import { VISIT_MINUTES as C1_MIN } from '../data.js';

/* a booked visit plus a second, open request (D-86): both lists of Home have a row */
const c1Both = (S) => { S.driveTo('confirmed'); c1AddRequest({ after: C1_AFTER }); };
const c1Fee = `after the ${c1Exact(C1_SC.seed.tailyFee)} Taily fee`;

export const FLOWS_t_home = [
  { key: 't-home', screen: 't-home', group: 'M3 · Tailor', title: 'Home — a request and an upcoming visit', note: 'New request with the take-home, 2h left, Sarah Chen booked below',
    setup: c1Both,
    expect: { has: ['Hi, Amara', 'New requests', 'Sarah C.', 'You take home', c1Exact(C1_SC.seed.payout), c1Fee, '2h left', 'Upcoming', 'Sarah Chen', c1When(C1_SLOT)], sel: '.request-card' } },
  { key: 't-home--empty', screen: 't-home', group: 'M3 · Tailor', title: 'Home — nothing yet', note: 'No requests, nothing booked: Check your hours',
    expect: { has: ['No requests yet', 'Check your hours'], not: 'You take home', sel: '[data-empty="home"]' } },
  { key: 't-home--push-denied', screen: 't-home', group: 'M3 · Tailor', title: 'Home — notifications off', note: 'Warning banner with Open Settings, requests still listed',
    setup: (S) => { c1Both(S); S.sim.push = 'denied'; },
    expect: { has: ['Notifications are off', 'Open Settings', 'New requests'], sel: '[data-act="push-settings"]' } },
  /* extras beyond the spec table: states the screen draws that the table did not key */
  { key: 't-home--no-requests', screen: 't-home', group: 'M3 · Tailor', title: 'Home — only an upcoming visit', note: 'No new requests right now, the booked visit below',
    setup: (S) => { S.driveTo('confirmed'); },
    expect: { has: ['No new requests right now', 'Upcoming', 'Sarah Chen', c1Exact(C1_SC.seed.payout)], not: ['Nothing booked yet', 'NEW REQUESTS 1'] } },
  { key: 't-home--no-upcoming', screen: 't-home', group: 'M3 · Tailor', title: 'Home — only a request', note: 'Nothing booked yet under Upcoming',
    setup: (S) => { S.driveTo('requested'); },
    expect: { has: ['New requests', 'Sarah C.', 'Nothing booked yet'], sel: '.request-card' } },
  { key: 't-home--soon', screen: 't-home', group: 'M3 · Tailor', title: 'Home — reply window closing', note: '10 minutes left: the card gets the warning ring',
    setup: (S) => { S.driveTo('requested'); S.advanceClock(110); },
    expect: { has: ['10m left'], sel: '.request-card--soon' } },
  { key: 't-home--suggested', screen: 't-home', group: 'M3 · Tailor', title: 'Home — waiting on Sarah', note: 'A suggested time: muted money, no countdown',
    setup: (S) => { S.driveTo('suggested'); },
    expect: { has: ['Waiting on Sarah', 'You suggested', c1When(C1_SUGGESTED), 'Sarah asked for', '1 waiting on Sarah', c1Exact(C1_SC.seed.payout)], not: ['left', '1 new request'], sel: '.request-card--suggested' } },
  { key: 't-home--retried', screen: 't-home', group: 'M3 · Tailor', title: 'Home — sent again', note: 'Sarah tried again after an expiry: "Sent again" on the card',
    setup: (S) => { const a = S.driveTo('expired'); S.T.tryAgain(a.id); },
    expect: { has: ['Sent again', 'Sarah C.'], sel: '.request-card' } },
];

export const FLOWS_t_request = [
  { key: 't-request', screen: 't-request', group: 'M3 · Tailor', title: 'Request — decide in one tap', note: 'Sarah C., Williamsburg only, take-home, the work, Accept · Suggest time · Decline',
    setup: (S) => { S.driveTo('requested'); },
    expect: { has: ['New request', 'Sarah C.', '2h left', 'Answer by 12:00 PM', 'YOU TAKE HOME', c1Exact(C1_SC.seed.payout), c1Fee, c1Neg(C1_SC.seed.tailyFee), c1When(C1_SLOT), 'Williamsburg · 11211', 'Full address after you accept', 'Needed by Fri, Oct 23', c1Exact(C1_SC.seed.services), 'Accept', 'Suggest time', 'Decline'], not: ['145 N 7th St', 'Chen'] } },
  { key: 't-request--soon', screen: 't-request', group: 'M3 · Tailor', title: 'Request — expires soon', note: '10 minutes left: the strip turns warning',
    setup: (S) => { S.driveTo('requested'); S.advanceClock(110); },
    expect: { has: ['10m left', 'Expires soon'], sel: '[data-countdown][data-state="soon"]' } },
  { key: 't-request--expired', screen: 't-request', group: 'M3 · Tailor', title: 'Request — expired', note: 'Hold released, Sarah can send it again; no decision buttons',
    setup: (S) => { S.driveTo('expired'); },
    expect: { has: ['This request expired', 'Sarah can send it again', 'Back to requests', 'YOU WOULD HAVE TAKEN HOME'], not: ['Suggest time', 'Decline'] } },
  { key: 't-request--decline', screen: 't-request', group: 'M3 · Tailor', title: 'Decline this request? — sheet', note: 'Optional reason chips, red Decline request, Keep request',
    setup: (S) => { S.driveTo('requested'); },
    click: ['[data-act="decline"]'],
    expect: { has: ['Decline this request?', 'Reason (optional)', 'Fully booked that week', 'Decline request', 'Keep request'], sel: '[data-act="decline-ok"]' } },
  { key: 't-request--declined', screen: 't-request', group: 'M3 · Tailor', title: 'Request — you declined', note: 'Sarah told, hold released, your reason shown',
    setup: (S) => { S.driveTo('declined'); },
    expect: { has: ['You declined this request', 'Your reason: Fully booked that week', 'Back to requests'], not: ['Suggest time', 'Accept'] } },
  { key: 't-request--suggested', screen: 't-request', group: 'M3 · Tailor', title: 'Request — waiting on Sarah', note: 'Your suggested time, same price, no decision buttons',
    setup: (S) => { S.driveTo('suggested'); },
    expect: { has: ['Waiting on Sarah', c1When(C1_SUGGESTED), `Sarah asked for ${c1When(C1_SLOT)}`, `until ${c1Time(c1Iso(c1Add(C1_SUGGESTED, C1_MIN.home)))}`, 'Same price', 'Message Sarah'], not: ['Suggest time', 'Decline'] } },
  /* extras beyond the spec table: states the screen draws that the table did not key */
  { key: 't-request--retried', screen: 't-request', group: 'M3 · Tailor', title: 'Request — sent again', note: 'Sarah retried after an expiry: the note under the name',
    setup: (S) => { const a = S.driveTo('expired'); S.T.tryAgain(a.id); },
    expect: { has: ['Sarah sent this again after it expired.', 'Accept'] } },
  { key: 't-request--expired-final', screen: 't-request', group: 'M3 · Tailor', title: 'Request — expired for good', note: 'No retries left: the job has gone to other tailors',
    setup: (S) => { S.driveTo('expired-final'); },
    expect: { has: ['This request expired', 'This job has gone to other tailors', 'Back to requests'], not: 'send it again' } },
  { key: 't-request--shop', screen: 't-request', group: 'M3 · Tailor', title: 'Request — a shop visit', note: 'Her own shop address, no "after you accept" caption, no home-visit fee',
    setup: (S) => { S.driveTo('requested', { visitType: 'shop' }); },
    expect: { has: ['Shop visit', 'Metropolitan Ave', 'Accept'], not: ['Full address after you accept', 'Home-visit fee'] } },
  { key: 't-request--accepting', screen: 't-request', group: 'M3 · Tailor', title: 'Request — accepting', note: 'Latency held: Accept busy, the other buttons locked',
    setup: (S) => { S.driveTo('requested'); S.sim.latency = 'hold'; },
    click: ['[data-act="accept"]'],
    expect: { has: 'Accepting…', sel: '[data-act="accept"][aria-busy="true"]' } },
  { key: 't-request--declining', screen: 't-request', group: 'M3 · Tailor', title: 'Decline this request? — declining', note: 'Latency held: Decline request busy, chips locked',
    setup: (S) => { S.driveTo('requested'); S.sim.latency = 'hold'; },
    click: ['[data-act="decline"]', '[data-act="decline-ok"]'],
    expect: { has: 'Declining…', sel: '[data-act="decline-ok"][aria-busy="true"]' } },
  { key: 't-request--none', screen: 't-request', group: 'M3 · Tailor', title: 'Request — nothing open', note: 'No request to show: a way back to Home',
    expect: { has: ['No open requests', 'Go to Home'], not: 'Accept', sel: '[data-empty="no-request"]' } },
];

export const FLOWS_t_suggest = [
  { key: 't-suggest', screen: 't-suggest', group: 'M3 · Tailor', title: 'Suggest another time', note: 'Her open times only; "Sarah sees" follows the wheel; same take-home',
    setup: (S) => { S.driveTo('requested'); },
    expect: { has: ['Suggest another time', c1When(C1_SLOT), `SARAH SEES: ${c1When(C1_SUGGESTED).toUpperCase()}`, 'Send suggestion', c1Exact(C1_SC.seed.payout)], sel: '[data-scheduler]' } },
  { key: 't-suggest--sending', screen: 't-suggest', group: 'M3 · Tailor', title: 'Suggest another time — sending', note: 'Latency held: Send suggestion busy, wheel locked',
    setup: (S) => { S.driveTo('requested'); S.sim.latency = 'hold'; },
    click: ['[data-act="send-suggestion"]'],
    expect: { has: 'Sending…', sel: '[data-act="send-suggestion"][aria-busy="true"]' } },
];

/* ---------- C3 · Customer request outcomes (c-request M3 states, c-tailors none-left) ---------- */
export const FLOWS_c_request = [
  { key: 'c-request--soon', screen: 'c-request', group: 'M3 · Request outcomes', title: 'Request sent — reply is close', note: '10 minutes left: the clock turns warning and says so',
    setup: (S) => { S.driveTo('requested'); S.advanceClock(110); },
    expect: { has: ['10m left', 'left to reply', 'has until 12:00 PM to reply'], not: 'has 2 hours', sel: '[data-countdown][data-state="soon"]' } },
  { key: 'c-request--suggested', screen: 'c-request', group: 'M3 · Request outcomes', title: 'Amara suggested a new time', note: 'Same price; accepting charges the deposit and books it',
    setup: (S) => { S.driveTo('suggested'); },
    expect: { has: ['New time suggested', 'suggested a new time', c3When(C3_SUGGESTED_SLOT), `You asked for ${c3When(C3_SEED_SLOT)}`, 'Same price', 'On hold', 'Accept new time', 'Find another tailor'] } },
  { key: 'c-request--declined', screen: 'c-request', group: 'M3 · Request outcomes', title: 'Amara declined', note: 'Hold released, her note, find another tailor',
    setup: (S) => { S.driveTo('declined'); },
    expect: { has: ['take this job', 'Fully booked that week', 'Released', c3Exact(C3_SCENARIOS.seed.deposit), 'Find another tailor'], not: 'Try again' } },
  { key: 'c-request--expired', screen: 'c-request', group: 'M3 · Request outcomes', title: 'No reply — first time', note: 'Hold released; Try again (1 of 2)',
    setup: (S) => { S.driveTo('expired'); },
    expect: { has: ['reply in time', 'Try again (1 of 2)', 'Released', 'Message Amara', 'See other tailors'] } },
  { key: 'c-request--expired-2', screen: 'c-request', group: 'M3 · Request outcomes', title: 'No reply — last try', note: 'Try again (2 of 2) with the last-try warning',
    setup: (S) => { S.driveTo('expired-2'); },
    expect: { has: ['Try again (2 of 2)', 'Last try'] } },
  { key: 'c-request--expired-final', screen: 'c-request', group: 'M3 · Request outcomes', title: 'No reply — again', note: 'Amara hidden for this job; See other tailors, no retry',
    setup: (S) => { S.driveTo('expired-final'); },
    expect: { has: ['reply again', 'See other tailors'], not: 'Try again' } },
  { key: 'c-request--expired-passed', screen: 'c-request', group: 'M3 · Request outcomes', title: 'No reply — the time has passed', note: 'Clock past the visit: Pick a new time replaces Try again (D-94)',
    setup: (S) => { S.driveTo('expired'); S.setClock('2026-10-15T17:30'); },
    expect: { has: ['reply in time', `Your ${c3When(C3_SEED_SLOT)} time has passed`, 'Pick a new time', 'Message Amara', 'See other tailors'], not: ['Try again', 'Holds'], sel: '[data-lapsed="passed"] ~ [data-act="pick-time"]' } },
];

export const FLOWS_c_tailors = [
  { key: 'c-tailors--none-left', screen: 'c-tailors', group: 'M3 · Request outcomes', title: 'Tailors near you — none left', note: 'Every tailor hidden after the last no-reply (D-83)',
    setup: (S) => { S.driveTo('expired-final'); S.T.findAnotherTailor(S.appt.id); },
    expect: { has: ['No other tailors for this job yet', 'didn’t reply in time', 'We’ll let you know when more tailors join near', 'Change need-by date', 'Change ZIP'], not: 'is hidden', sel: '[data-empty="none-left"]' } },
];

/* ---------- C2 · Tailor job (t-job, t-thread stub) — own helpers, prefixed tj ---------- */
import { SCENARIOS as TJ_SC, SEED_SLOT as TJ_SLOT } from './money-scenarios.js';
import { fmtExact as tjExact, fmtNeg as tjNeg } from '../money.js';
import { fmtWhen as tjWhen, addMinutes as tjAdd, isoMinute as tjIso } from '../dates.js';
import { POLICY as TJ_POLICY } from '../money-config.js';
import { openSlots as tjOpenSlots } from '../state.js';

export const FLOWS_t_job = [
  { key: 't-job--accepted', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — you just accepted', note: 'Accepted pill, Sarah Chen, the full address, Message Sarah, payout',
    setup: (S) => { S.driveTo('confirmed'); },
    expect: { has: ['Accepted', 'You accepted', 'Sarah Chen', '145 N 7th St, 2R', tjWhen(TJ_SLOT), 'Message Sarah', tjExact(TJ_SC.seed.payout), tjNeg(TJ_SC.seed.tailyFee)] } },
  { key: 't-job', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — upcoming', note: 'An hour after the accept: Confirmed, Visit with Sarah Chen, I can’t make it',
    setup: (S) => { S.driveTo('confirmed'); S.advanceClock(TJ_POLICY.JUST_BOOKED_MIN); },
    expect: { has: ['Confirmed', 'Visit with Sarah Chen', '145 N 7th St', 'make it'], not: 'You accepted' } },
  { key: 't-job--cant-make-it', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — can’t make it sheet', note: 'Deposit refunded in full, optional reason chips, Keep the visit',
    setup: (S) => { S.driveTo('confirmed'); S.advanceClock(TJ_POLICY.JUST_BOOKED_MIN); },
    click: ['[data-act="cant-make-it"]'],
    expect: { has: ['make it?', tjExact(TJ_SC.seed.deposit), 'Family emergency', 'Keep the visit'], sel: '[data-act="cant-ok"]' } },
  { key: 't-job--no-show', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — no-show sheet', note: '20 minutes past the start: her deposit is kept, you are paid',
    setup: (S) => { S.driveTo('confirmed'); S.setClock(tjIso(tjAdd(TJ_SLOT, TJ_POLICY.NO_SHOW_WAIT_MIN + 5))); },
    click: ['[data-act="no-show"]'],
    expect: { has: ['Mark Sarah as a no-show?', tjExact(TJ_SC.noShow.paid), tjExact(TJ_SC.seed.deposit), 'Keep waiting'], sel: '[data-act="no-show-ok"]' } },
  { key: 't-job--cant-make-it-done', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — you cancelled', note: 'Visit cancelled, Sarah refunded, reason shown, street hidden',
    setup: (S) => { S.driveTo('cant-make-it'); },
    expect: { has: ['Visit cancelled', 'Your reason: Family emergency', tjExact(TJ_SC.earlyCancel.refund)], not: '145 N 7th St' } },
  { key: 't-job--no-show-done', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — marked a no-show', note: 'No-show pay with its payout date',
    setup: (S) => { S.driveTo('no-show'); },
    expect: { has: ['Marked as a no-show', 'No-show pay', tjExact(TJ_SC.noShow.paid), 'Paid out'] } },
  { key: 't-job--cancelled', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — Sarah cancelled early', note: 'Nothing is owed; the time is open again',
    setup: (S) => { S.driveTo('cancelled-early'); },
    expect: { has: ['Cancelled by Sarah', 'nothing is owed'], not: '145 N 7th St' } },
  { key: 't-job--cancelled-late', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — Sarah cancelled late', note: 'You keep her deposit, with its payout date',
    setup: (S) => { S.driveTo('cancelled-late'); },
    expect: { has: ['Cancelled by Sarah', 'Kept deposit', tjExact(TJ_SC.lateCancel.tailorPaid), 'Paid out'] } },
  /* extras beyond the spec table: states the screen draws that the table did not key */
  { key: 't-job--rescheduled', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — Sarah moved the visit', note: 'Info banner with the new time',
    setup: (S) => {
      const a = S.driveTo('confirmed'); S.advanceClock(TJ_POLICY.JUST_BOOKED_MIN);
      const next = tjOpenSlots(a.tailorId, a.job.visitType, { until: a.job.needBy, exclude: a.id }).find((x) => x !== a.slot.start && x > a.slot.start);
      S.T.rescheduleBooking(a.id, next);
    },
    expect: { has: ['moved this visit from 5:00 PM to', 'Visit with Sarah Chen'], sel: '.banner--info' } },
  { key: 't-job--empty', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — nothing booked', note: 'Only an open request: no job to show, way back to Home',
    setup: (S) => { S.driveTo('requested'); },
    expect: { has: ['No upcoming jobs', 'You have 1 request to answer on Home.', 'Go to Home'], not: 'Message Sarah', sel: '[data-empty="no-job"]' } },
];

export const FLOWS_t_thread = [
  { key: 't-thread', screen: 't-thread', group: 'M3 · Tailor job', title: 'Messages — Sarah (stub)', note: 'Privacy note, the accept line, composer pinned',
    setup: (S) => { S.driveTo('confirmed'); },
    expect: { has: ['Sarah Chen', 'Phone numbers and emails stay private on Taily.', 'Sarah sent a request', 'You accepted'], not: ['Amara accepted', 'Request sent'], sel: '.composer' } },
  /* extra: the closed conversation after a decline */
  { key: 't-thread--declined', screen: 't-thread', group: 'M3 · Tailor job', title: 'Messages — declined, closed', note: 'Read-only banner in place of the composer',
    setup: (S) => { S.driveTo('declined'); },
    expect: { has: ['You declined this request', 'Back to Home'], not: 'Send', sel: '.read-only' } },
];
