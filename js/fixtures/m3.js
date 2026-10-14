/* ============================================================
   M3 Test-flows entries — one array per screen (pre-scaffolded in M0).
   Each screen builder edits only its own FLOWS_<screen_id> array.
   Entry shape: see docs/v5/CONTEXT.md (FLOWS / EXPECT contract).
   ============================================================ */

import { SCENARIOS as CB_SC, SEED_SLOT as CB_SEED, SECOND_SLOT_AFTER as CB_AFTER } from './money-scenarios.js';
import { addRequest as cbAddRequest, FITTING_COMMENTS as cbFC } from './common.js';
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
    expect: { has: ['Bookings', 'UPCOMING', 'PAST', 'Amara Reyes', 'Confirmed', 'Cancelled', cbWhen(CB_SEED)], sel: '.appt-row' } },
  { key: 'c-bookings--push-denied', screen: 'c-bookings', group: 'M3 · Bookings', title: 'Bookings — notifications off', note: 'A request is waiting and notifications are off: the warning banner with Open Settings',
    setup: (S) => { S.driveTo('requested'); S.sim.push = 'denied'; },
    expect: { has: ['Notifications are off', 'Turn on notifications to hear the moment Amara replies', 'Open Settings', 'REQUESTS'], sel: '[data-act="push-settings"]' } },
  { key: 'c-bookings--empty', screen: 'c-bookings', group: 'M3 · Bookings', title: 'Bookings — empty', note: 'No bookings yet: a way to start one',
    expect: { has: ['No bookings yet', 'Start a booking'], not: 'UPCOMING', sel: '[data-empty="bookings"]' } },
  { key: 'c-bookings--ready', screen: 'c-bookings', group: 'M4 · Bookings', title: 'Bookings — ready to pay, one completed', note: 'A ready order sits under In progress (since when, C-19) and says Pay now; the completed one asks for a review',
    setup: (S) => {
      S.driveTo('completed');
      const b = cbAddRequest({ accept: true, after: CB_AFTER });
      S.setClock(b.slot.start);
      S.T.startFitting(b.id); S.documentFitting(b.id); S.T.sendPriceChange(b.id, b.lines); S.T.approvePriceChange(b.id); S.T.markReady(b.id);
    },
    expect: { has: ['IN PROGRESS', 'PAST', 'Since ', 'Pay now', 'Completed', 'Leave a review'], not: 'UPCOMING', sel: '[data-section="progress"] .appt-row' } },
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
  { key: 'c-booking--cancel-late', screen: 'c-booking', group: 'M3 · Bookings', title: 'Cancel this booking? — inside 24 hours', note: 'Two hours before the visit: Amara keeps the deposit, said before the tap',
    setup: (S) => { S.driveTo('confirmed'); S.setClock(cbIsoMinute(cbAddMinutes(CB_SEED, -120))); },
    click: ['[data-act="cancel"]'],
    expect: { has: ['less than 24 hours away', 'Amara keeps your', `Cancel and lose the ${cbExact(CB_SC.lateCancel.kept)} deposit`, 'Kept by Amara'] } },
  { key: 'c-booking--cancelled', screen: 'c-booking', group: 'M3 · Bookings', title: 'Booking cancelled — refunded', note: 'Cancelled early: the deposit is on its way back',
    setup: (S) => { S.driveTo('cancelled-early'); },
    expect: { has: ['Booking cancelled', 'Refunded', cbExact(CB_SC.earlyCancel.refund), 'Find another tailor'], not: 'Reschedule' } },
  { key: 'c-booking--cancelled-late', screen: 'c-booking', group: 'M3 · Bookings', title: 'Booking cancelled — deposit kept', note: 'Cancelled inside 24 hours: the deposit paid Amara for the time set aside',
    setup: (S) => { S.driveTo('cancelled-late'); },
    expect: { has: ['Booking cancelled', 'Kept', cbExact(CB_SC.lateCancel.kept)], not: 'Reschedule' } },
  { key: 'c-booking--reschedule', screen: 'c-booking', group: 'M3 · Bookings', title: 'Pick a new time — sheet', note: 'Early only: Amara open times before the need-by, same price',
    setup: (S) => { S.driveTo('confirmed'); S.advanceClock(CB_POLICY.JUST_BOOKED_MIN); },
    click: ['[data-act="reschedule"]'],
    expect: { has: ['Pick a new time', 'Booked for ', 'Same price', 'Move my visit'], sel: '[data-scheduler]' } },
  { key: 'c-booking--cant-make-it', screen: 'c-booking', group: 'M3 · Bookings', title: 'Amara cannot make it', note: 'Her note, deposit refunded in full, job saved: Find another tailor',
    setup: (S) => { S.driveTo('cant-make-it'); },
    expect: { has: ['Cancelled by Amara', 'make it', 'Family emergency', 'Refunded', 'items and services are saved', 'Find another tailor'] } },
  { key: 'c-booking--no-show', screen: 'c-booking', group: 'M3 · Bookings', title: 'Marked as a no-show', note: 'Amara waited and marked it missed: Amara keeps the deposit',
    setup: (S) => { S.driveTo('no-show'); },
    expect: { has: ['Marked as a no-show', 'Kept', 'Amara keeps your', cbExact(CB_SC.seed.deposit)] } },
  { key: 'c-booking--fitting', screen: 'c-booking', group: 'M4 · Bookings', title: 'Fitting with Amara', note: 'Amara is going through the order with her; still an estimate, no cancel or reschedule',
    setup: (S) => { S.driveTo('fitting'); },
    expect: { has: ['Fitting', 'going through the order', 'Estimated total', cbExact(CB_SC.seed.total)], not: ['Cancel booking', 'Reschedule'] } },
  { key: 'c-booking--in-progress', screen: 'c-booking', group: 'M4 · Bookings', title: 'Amara is working on it', note: 'Order approved: Total, not Estimated; the balance is due when it is ready',
    setup: (S) => { S.driveTo('in-progress'); },
    expect: { has: ['In progress', 'working on it', 'approved the order', cbExact(CB_SC.seed.balance), 'YOUR ORDER', 'Suit Jacket', 'Take in jacket sides'], not: ['Estimated total', 'New item'] } },
  { key: 'c-booking--docs', screen: 'c-booking', group: 'M4 · Bookings', title: 'Your order — with the fitting photos', note: 'K-04: Your order keeps each garment’s icon and Amara’s comment; the item row shows her fitting photos (Before + Pinned) in place of yours, opened in the viewer',
    setup: (S) => { S.driveTo('in-progress', { docs: 'full' }); },
    expect: { has: ['YOUR ORDER', 'photos', 'Amara’s comment', cbFC.g2], sel: '[data-garment="g1"] [data-act="view-photos"][data-source="fitting"]' } },
  { key: 'c-booking--returning-pickup', screen: 'c-booking', group: 'M4 · Bookings', title: 'Ready for pickup', note: 'Paid in full; pick it up at the shop',
    setup: (S) => { S.driveTo('returning'); },
    expect: { has: ['Ready for pickup', 'Pick it up at Reyes Tailoring', 'paid in full', 'Paid', 'IN-STORE PICKUP'] } },
  { key: 'c-booking--returning-dropoff', screen: 'c-booking', group: 'M4 · Bookings', title: 'Amara will drop it off', note: 'Home drop-off: she messages to agree a time',
    setup: (S) => { S.driveTo('returning', { returnOption: 'dropoff' }); },
    expect: { has: ['Coming to you', 'drop it off', '145 N 7th St', 'HOME DROP-OFF'] } },
  { key: 'c-booking--returning-courier', screen: 'c-booking', group: 'M4 · Bookings', title: 'On its way to you', note: 'Taily courier: quote + fee = total, paid with the balance',
    setup: (S) => { S.driveTo('returning', { returnOption: 'courier' }); },
    expect: { has: ['Out for delivery', cbExact(CB_SC.courierQuote.quote), cbExact(CB_SC.courierQuote.markup), cbExact(CB_SC.courier.courier)] } },
  { key: 'c-booking--completed', screen: 'c-booking', group: 'M4 · Bookings', title: 'Completed and reviewed', note: 'Her own review, the receipt, and Book Amara again',
    setup: (S) => { S.driveTo('reviewed'); },
    expect: { has: ['Completed', 'YOUR REVIEW', 'Perfect fit', 'Book Amara again'] } },
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
  { key: 't-home', screen: 't-home', group: 'M3 · Tailor', title: 'Home — a request and an upcoming visit', note: 'New request with the take-home, 2h left, a visit booked below (Sarah Chen on both once she is accepted, D-159)',
    setup: c1Both,
    expect: { has: ['Hi, Amara', 'Tuesday, Oct 13 · 1 new request, 1 upcoming visit', 'NEW REQUESTS', 'Sarah Chen', 'You take home', c1Exact(C1_SC.seed.payout), c1Fee, '2h left', 'UPCOMING', 'Sarah Chen', c1When(C1_SLOT)], sel: '.request-card' } },
  { key: 't-home--empty', screen: 't-home', group: 'M3 · Tailor', title: 'Home — nothing yet', note: 'No requests, nothing booked: Check your hours',
    expect: { has: ['No requests yet', 'Check your hours'], not: 'You take home', sel: '[data-empty="home"]' } },
  { key: 't-home--push-denied', screen: 't-home', group: 'M3 · Tailor', title: 'Home — notifications off', note: 'Warning banner with Open Settings, requests still listed',
    setup: (S) => { c1Both(S); S.sim.push = 'denied'; },
    expect: { has: ['Notifications are off', 'Open Settings', 'NEW REQUESTS'], sel: '[data-act="push-settings"]' } },
  { key: 't-home--push', screen: 't-home', group: 'M3 · Tailor', title: 'Home — a push card for a new request', note: 'Notifications on: the card over the status bar, copy from the request (D-167)',
    setup: (S) => { S.driveTo('requested'); S.sim.push = 'granted'; },
    expect: { has: ['New request · Sarah C.', 'Home visit', 'You take home', c1Exact(C1_SC.seed.payout), '2h to reply'], sel: '[data-act="push-open"]' } },
  /* extras beyond the spec table: states the screen draws that the table did not key */
  { key: 't-home--no-requests', screen: 't-home', group: 'M3 · Tailor', title: 'Home — only an upcoming visit', note: 'No new requests right now, the booked visit below',
    setup: (S) => { S.driveTo('confirmed'); },
    expect: { has: ['No new requests right now', 'UPCOMING', 'Sarah Chen', c1Exact(C1_SC.seed.payout)], not: ['Nothing booked yet', 'NEW REQUESTS 1'] } },
  { key: 't-home--no-upcoming', screen: 't-home', group: 'M3 · Tailor', title: 'Home — only a request', note: 'Nothing booked yet under Upcoming',
    setup: (S) => { S.driveTo('requested'); },
    expect: { has: ['NEW REQUESTS', 'Sarah C.', 'Nothing upcoming.'], not: 'Nothing booked yet', sel: '.request-card' } },
  { key: 't-home--soon', screen: 't-home', group: 'M3 · Tailor', title: 'Home — reply window closing', note: '10 minutes left: the card gets the warning ring',
    setup: (S) => { S.driveTo('requested'); S.advanceClock(110); },
    expect: { has: ['10m left'], sel: '.request-card--soon' } },
  { key: 't-home--suggested', screen: 't-home', group: 'M3 · Tailor', title: 'Home — waiting on Sarah', note: 'A suggested time: muted money, a countdown to when it lapses (D-154)',
    setup: (S) => { S.driveTo('suggested'); },
    expect: { has: ['Waiting on Sarah', 'You suggested', c1When(C1_SUGGESTED), 'Sarah asked for', '1 waiting on Sarah', c1Exact(C1_SC.seed.payout), 'for Sarah to answer'], not: ['1 new request'], sel: '.request-card--suggested', noClip: ['.request-card__name', '.request-card__visit', '.request-card__place', '.request-card__lapse'] } },
  { key: 't-home--in-progress', screen: 't-home', group: 'M3 · Tailor', title: 'Home — a job in progress', note: 'The visit is behind her: the row leads with the step and the due date (D-169)',
    setup: (S) => { S.driveTo('in-progress'); },
    expect: { has: ['IN PROGRESS', 'Tailoring · needed by Fri, Oct 23', 'Sarah Chen', c1Exact(C1_SC.seed.payout)], not: ['since ', 'UPCOMING'] } },
  { key: 't-home--paused', screen: 't-home', group: 'M3 · Tailor', title: 'Home — paused', note: 'Taking requests is off: the summary says so and turns it back on (D-161)',
    setup: (S) => { c1Both(S); S.T.setTakingRequests(false); },
    expect: { has: ['You’re paused, so customers can’t send new requests.', 'Take requests again', 'NEW REQUESTS'], sel: '[data-act="resume"]' } },
  { key: 't-home--retried', screen: 't-home', group: 'M3 · Tailor', title: 'Home — sent again', note: 'Sarah tried again after an expiry: "Sent again" on the card',
    setup: (S) => { const a = S.driveTo('expired'); S.T.tryAgain(a.id); },
    expect: { has: ['Sent again', 'Sarah C.'], sel: '.request-card' } },
];

export const FLOWS_t_request = [
  { key: 't-request', screen: 't-request', group: 'M3 · Tailor', title: 'Request — decide in one tap', note: 'Sarah C., Williamsburg only, take-home, the work, Accept · Suggest time · Decline',
    setup: (S) => { S.driveTo('requested'); },
    expect: { has: ['New request', 'Sarah C.', '2h left', 'answer by 12:00 PM', 'YOU TAKE HOME', c1Exact(C1_SC.seed.payout), c1Fee, c1Neg(C1_SC.seed.tailyFee), c1When(C1_SLOT), 'Williamsburg · 11211', 'Full address after you accept', 'Needed by Fri, Oct 23', c1Exact(C1_SC.seed.services), 'Accept', 'Suggest time', 'Decline'], not: ['145 N 7th St', 'Chen'] } },
  { key: 't-request--rush', screen: 't-request', group: 'M3 · Tailor', title: 'Request — a rush job', note: 'Need-by one day after the visit: the rush fee is in her take-home and shown on its own line',
    setup: (S) => { S.driveTo('requested', { rush: true }); },
    get expect() { return { has: ['Rush fee', c1Exact(C1_SC.rush.rush), c1Exact(C1_SC.rush.payout), c1Neg(C1_SC.rush.tailyFee)], sel: '.money-rows' }; } },
  { key: 't-request--soon', screen: 't-request', group: 'M3 · Tailor', title: 'Request — expires soon', note: '10 minutes left: the strip turns warning',
    setup: (S) => { S.driveTo('requested'); S.advanceClock(110); },
    expect: { has: ['10m left', 'answer by'], sel: '[data-countdown][data-state="soon"]' } },
  { key: 't-request--expired', screen: 't-request', group: 'M3 · Tailor', title: 'Request — expired', note: 'Hold released, Sarah can send it again; no decision buttons',
    setup: (S) => { S.driveTo('expired'); },
    expect: { has: ['This request expired', 'Sarah can send it again', 'Back to Home', 'YOU WOULD HAVE TAKEN HOME'], not: ['Suggest time', 'Decline', 'Back to requests'] } },
  { key: 't-request--decline', screen: 't-request', group: 'M3 · Tailor', title: 'Decline this request? — sheet', note: 'Optional reason chips, red Decline request, Keep request',
    setup: (S) => { S.driveTo('requested'); },
    click: ['[data-act="decline"]'],
    expect: { has: ['Decline this request?', 'Reason (optional)', 'Fully booked that week', 'Decline request', 'Keep request'], sel: '[data-act="decline-ok"]' } },
  { key: 't-request--declined', screen: 't-request', group: 'M3 · Tailor', title: 'Request — you declined', note: 'Sarah told, hold released, your reason shown',
    setup: (S) => { S.driveTo('declined'); },
    expect: { has: ['You declined this request', 'Sarah has been told, and her', 'hold is released', 'Your reason: Fully booked that week', 'Back to Home'], not: ['Suggest time', 'Accept'] } },
  { key: 't-request--suggested', screen: 't-request', group: 'M3 · Tailor', title: 'Request — waiting on Sarah', note: 'Your suggested time, same price, how long Sarah has, Withdraw suggestion (D-154)',
    setup: (S) => { S.driveTo('suggested'); },
    expect: { has: ['Waiting on Sarah', c1When(C1_SUGGESTED), `Sarah asked for ${c1When(C1_SLOT)}`, `until ${c1Time(c1Iso(c1Add(C1_SUGGESTED, C1_MIN.home)))}`, 'Same price', 'for Sarah to answer', 'Open until', 'Message Sarah', 'Back to Home', 'Withdraw suggestion'], not: ['Suggest time', 'Decline'] } },
  { key: 't-request--withdraw', screen: 't-request', group: 'M3 · Tailor', title: 'Withdraw your suggestion? — sheet', note: 'Destructive confirm (D-79): Sarah is told, the hold is released; red Withdraw suggestion, Keep suggestion',
    setup: (S) => { S.driveTo('suggested'); },
    click: ['[data-act="withdraw"]'],
    expect: { has: ['Withdraw your suggestion?', 'hold is released', 'can book another tailor', 'Withdraw suggestion', 'Keep suggestion'], sel: '[data-act="withdraw-ok"]' } },
  { key: 't-request--suggested-passed', screen: 't-request', group: 'M3 · Tailor', title: 'Request — your suggested time passed', note: 'A day later Sarah never accepted: hold released, the job went to other tailors (D-154)',
    setup: (S) => { S.driveTo('suggested'); S.advanceClock(24 * 60); },
    expect: { has: ['Your suggested time passed', 'didn’t accept in time', 'hold is released', 'Back to Home'], not: ['Withdraw suggestion', 'Suggest time'], sel: '[data-suggestion-ended="lapsed"]' } },
  /* extras beyond the spec table: states the screen draws that the table did not key */
  { key: 't-request--retried', screen: 't-request', group: 'M3 · Tailor', title: 'Request — sent again', note: 'Sarah retried after an expiry: the note under the name',
    setup: (S) => { const a = S.driveTo('expired'); S.T.tryAgain(a.id); },
    expect: { has: ['Sarah sent this again after it expired.', 'Accept'] } },
  { key: 't-request--expired-final', screen: 't-request', group: 'M3 · Tailor', title: 'Request — expired for good', note: 'No retries left: the job has gone to other tailors',
    setup: (S) => { S.driveTo('expired-final'); },
    expect: { has: ['This request expired', 'Sarah can now book another tailor.', 'Back to Home'], not: 'send it again' } },
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
    expect: { has: ['Suggest another time', c1When(C1_SLOT), 'SARAH SEES', c1When(C1_SUGGESTED), 'Send suggestion', `You take home ${c1Exact(C1_SC.seed.payout)}`], sel: '[data-scheduler]' } },
  { key: 't-suggest--rush-window', screen: 't-suggest', group: 'M3 · Tailor', title: 'Suggest another time — inside her rush window', note: 'The settled time is 1 day before the need-by date, but this request was not a rush: no rush fee, her take-home unchanged (D-155)',
    setup: (S) => { S.driveTo('requested'); S.state.ui['t-suggest'] = { slot: '2026-10-22T17:00' }; },
    expect: { has: ['1 day before Sarah’s need-by date. No rush fee is added to this request.', `You take home ${c1Exact(C1_SC.seed.payout)}`], not: 'pays' } },
  { key: 't-suggest--sending', screen: 't-suggest', group: 'M3 · Tailor', title: 'Suggest another time — sending', note: 'Latency held: Send suggestion busy, wheel locked',
    setup: (S) => { S.driveTo('requested'); S.sim.latency = 'hold'; },
    click: ['[data-act="send-suggestion"]'],
    expect: { has: 'Sending…', sel: '[data-act="send-suggestion"][aria-busy="true"]' } },
];

/* ---------- C3 · Customer request outcomes (c-request M3 states, c-tailors none-left) ---------- */
export const FLOWS_c_request = [
  { key: 'c-request--soon', screen: 'c-request', group: 'M3 · Request outcomes', title: 'Request sent — reply is close', note: '10 minutes left: the clock turns warning and says so',
    setup: (S) => { S.driveTo('requested'); S.advanceClock(110); },
    expect: { has: ['10m left', 'has until', 'to reply'], not: 'has 2 hours', sel: '[data-countdown][data-state="soon"]' } },
  { key: 'c-request--suggested', screen: 'c-request', group: 'M3 · Request outcomes', title: 'Amara suggested a new time', note: 'Same price; accepting charges the deposit and books it',
    setup: (S) => { S.driveTo('suggested'); },
    expect: { has: ['New time suggested', 'suggested a new time', c3When(C3_SUGGESTED_SLOT), `You asked for ${c3When(C3_SEED_SLOT)}`, 'Same price', 'On hold', 'Accept new time', 'Find another tailor', 'is holding this time until'] } },
  { key: 'c-request--declined', screen: 'c-request', group: 'M3 · Request outcomes', title: 'Amara declined', note: 'Hold released, her note, find another tailor',
    setup: (S) => { S.driveTo('declined'); },
    expect: { has: ['Amara declined your request', 'hold is released', 'items and services are saved', 'Fully booked that week', 'Released', c3Exact(C3_SCENARIOS.seed.deposit), 'Find another tailor'], not: ['Try again', 'take this job'] } },
  { key: 'c-request--expired', screen: 'c-request', group: 'M3 · Request outcomes', title: 'No reply — first time', note: 'Hold released; Send request again',
    setup: (S) => { S.driveTo('expired'); },
    expect: { has: ['reply in time', 'Send request again', 'gets another 2 hours', 'Released', 'Message Amara', 'Find another tailor', 'has until', 'to reply'] } },
  { key: 'c-request--expired-2', screen: 'c-request', group: 'M3 · Request outcomes', title: 'No reply — last try', note: 'Send again (last try) with the last-try warning',
    setup: (S) => { S.driveTo('expired-2'); },
    expect: { has: ['Send again (last try)', 'send it once more', 'we’ll show you other tailors'], not: 'Try again' } },
  { key: 'c-request--expired-final', screen: 'c-request', group: 'M3 · Request outcomes', title: 'No reply — again', note: 'Amara hidden for this request; Find another tailor, no retry',
    setup: (S) => { S.driveTo('expired-final'); },
    expect: { has: ['reply again', 'We won’t show Amara for this request again', 'Find another tailor'], not: ['Try again', 'is hidden'] } },
  { key: 'c-request--expired-passed', screen: 'c-request', group: 'M3 · Request outcomes', title: 'No reply — the time has passed', note: 'Clock past the visit: Pick a new time replaces Try again (D-94)',
    setup: (S) => { S.driveTo('expired'); S.setClock('2026-10-15T17:30'); },
    expect: { has: ['reply in time', `Your ${c3When(C3_SEED_SLOT)} time has passed`, 'Pick a new time', 'Message Amara', 'Find another tailor'], not: ['Try again', 'Holds'], sel: '[data-lapsed="passed"] ~ [data-act="pick-time"]' } },
  { key: 'c-request--suggested-passed', screen: 'c-request', group: 'M3 · Request outcomes', title: 'Suggested time passed', note: 'A day later the time is no longer held (D-154): hold released, Amara hidden, find another tailor',
    setup: (S) => { S.driveTo('suggested'); S.advanceClock(24 * 60); },
    expect: { has: ['suggested time has passed', 'hold is released', 'We won’t show Amara for this request again', 'Released', 'Find another tailor', 'Message Amara'], not: ['Accept new time', 'Try again'], sel: '[data-suggestion-ended="lapsed"]' } },
];

export const FLOWS_c_tailors = [
  { key: 'c-tailors--none-left', screen: 'c-tailors', group: 'M3 · Request outcomes', title: 'Tailors near you — none left', note: 'Every tailor hidden after the last no-reply (D-83)',
    setup: (S) => { S.driveTo('expired-final'); S.T.findAnotherTailor(S.appt.id); },
    expect: { has: ['No other tailors for this request yet', 'didn’t reply in time, and no other tailors cover', 'A later need-by date or another ZIP may open more.', 'Change need-by date', 'Change ZIP'], not: ['is hidden', 'We’ll let you know'], sel: '[data-empty="none-left"]' } },
];

/* ---------- C2 · Tailor job (t-job, t-thread stub) — own helpers, prefixed tj ---------- */
import { SCENARIOS as TJ_SC, SEED_SLOT as TJ_SLOT } from './money-scenarios.js';
import { fmtExact as tjExact, fmtNeg as tjNeg } from '../money.js';
import { fmtWhen as tjWhen, addMinutes as tjAdd, isoMinute as tjIso } from '../dates.js';
import { POLICY as TJ_POLICY } from '../money-config.js';
import { openSlots as tjOpenSlots } from '../state.js';

export const FLOWS_t_job = [
  { key: 't-job--accepted', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — you just accepted', note: 'Confirmed pill (title: You accepted), Sarah Chen, the full address, Message Sarah, payout',
    setup: (S) => { S.driveTo('confirmed'); },
    expect: { has: ['Confirmed', 'You accepted', 'Sarah Chen', '145 N 7th St, 2R', tjWhen(TJ_SLOT), 'Message Sarah', tjExact(TJ_SC.seed.payout), tjNeg(TJ_SC.seed.tailyFee)] } },
  { key: 't-job', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — upcoming', note: 'An hour after the accept: Confirmed, Visit with Sarah Chen, I can’t make it',
    setup: (S) => { S.driveTo('confirmed'); S.advanceClock(TJ_POLICY.JUST_BOOKED_MIN); },
    expect: { has: ['Confirmed', 'Visit with Sarah Chen', '145 N 7th St'], not: 'You accepted', sel: '[data-act="more"]' } },
  { key: 't-job--more', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — the ••• menu', note: 'M7 (D-195): I can’t make it and Mark as no-show live behind the ••• at the top right',
    setup: (S) => { S.driveTo('confirmed'); S.advanceClock(TJ_POLICY.JUST_BOOKED_MIN); },
    click: ['[data-act="more"]'],
    expect: { has: ['I can’t make it', 'Mark as no-show'], sel: '[data-s="more"]' } },
  { key: 't-job--cant-make-it', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — can’t make it sheet', note: 'Deposit refunded in full, optional reason chips, Keep the visit',
    setup: (S) => { S.driveTo('confirmed'); S.advanceClock(TJ_POLICY.JUST_BOOKED_MIN); },
    click: ['[data-act="more"]', '[data-act="cant-make-it"]'],
    expect: { has: ['make it?', tjExact(TJ_SC.seed.deposit), 'Her order stays saved', 'Family emergency', 'Keep the visit'], sel: '[data-act="cant-ok"]' } },
  { key: 't-job--no-show', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — no-show sheet', note: '20 minutes past the start: you keep her deposit and are paid',
    setup: (S) => { S.driveTo('confirmed'); S.setClock(tjIso(tjAdd(TJ_SLOT, TJ_POLICY.NO_SHOW_WAIT_MIN + 5))); },
    click: ['[data-act="more"]', '[data-act="no-show"]'],
    expect: { has: ['Mark Sarah as a no-show?', `You’re paid ${tjExact(TJ_SC.noShow.paid)} in total`, `${tjExact(TJ_SC.seed.deposit)} deposit isn’t refunded`, 'Keep waiting'], sel: '[data-act="no-show-ok"]' } },
  { key: 't-job--cant-make-it-done', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — you cancelled', note: 'Visit cancelled, Sarah refunded, reason shown, street hidden',
    setup: (S) => { S.driveTo('cant-make-it'); },
    expect: { has: ['Visit cancelled', `We told Sarah and refunded her ${tjExact(TJ_SC.earlyCancel.refund)} deposit`, 'Your reason: Family emergency'], not: '145 N 7th St' } },
  { key: 't-job--no-show-done', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — marked a no-show', note: 'No-show pay with its payout date',
    setup: (S) => { S.driveTo('no-show'); },
    expect: { has: ['Marked as a no-show', 'No-show pay', `deposit isn’t refunded. You’re paid ${tjExact(TJ_SC.noShow.paid)} in total`, 'Arrives'] } },
  { key: 't-job--cancelled', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — Sarah cancelled early', note: 'Nothing is owed; the time is open again',
    setup: (S) => { S.driveTo('cancelled-early'); },
    expect: { has: ['Cancelled by Sarah', 'nothing is owed'], not: '145 N 7th St' } },
  { key: 't-job--cancelled-late', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — Sarah cancelled late', note: 'You keep her deposit, with its payout date',
    setup: (S) => { S.driveTo('cancelled-late'); },
    expect: { has: ['Cancelled by Sarah', 'Kept deposit', tjExact(TJ_SC.lateCancel.tailorPaid), 'Arrives'] } },
  /* extras beyond the spec table: states the screen draws that the table did not key */
  { key: 't-job--rescheduled', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — Sarah moved the visit', note: 'Info banner with the new time',
    setup: (S) => {
      const a = S.driveTo('confirmed'); S.advanceClock(TJ_POLICY.JUST_BOOKED_MIN);
      const next = tjOpenSlots(a.tailorId, a.job.visitType, { until: a.job.needBy, exclude: a.id }).find((x) => x !== a.slot.start && x > a.slot.start);
      S.T.rescheduleBooking(a.id, next);
    },
    expect: { has: ['moved this visit to', '(was 5:00 PM)', 'Visit with Sarah Chen'], sel: '.banner--info' } },
  { key: 't-job--empty', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — nothing booked', note: 'Only an open request: no job to show, way back to Home',
    setup: (S) => { S.driveTo('requested'); },
    expect: { has: ['No upcoming jobs', 'You have 1 request to answer on Home.', 'Go to Home'], not: 'Message Sarah', sel: '[data-empty="no-job"]' } },
];

export const FLOWS_t_thread = [
  { key: 't-thread', screen: 't-thread', group: 'M5 · Tailor messages', title: 'Thread — the booked conversation', note: 'Accept line, closing message, composer',
    setup: (S) => { S.driveTo('confirmed'); },
    expect: { has: ['Sarah Chen', 'Phone numbers and emails stay private on Taily.', 'Sarah sent a request', 'You accepted'], not: ['Amara accepted', 'Request sent'], sel: '.thread-context' } },
];
