/* ============================================================
   M3 Test-flows entries — one array per screen (pre-scaffolded in M0).
   Each screen builder edits only its own FLOWS_<screen_id> array.
   Entry shape: see docs/v5/CONTEXT.md (FLOWS / EXPECT contract).
   ============================================================ */

import { SCENARIOS as CB_SC, SEED_SLOT as CB_SEED, SECOND_SLOT_AFTER as CB_AFTER } from './money-scenarios.js';
import { addRequest as cbAddRequest, FITTING_COMMENTS as cbFC, MANY_ITEMS as cbMany } from './common.js';
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
  { key: 'c-bookings--empty', screen: 'c-bookings', group: 'M3 · Bookings', title: 'Bookings — empty', note: 'No bookings yet: a way to start one',
    expect: { has: ['No bookings yet', 'Start a booking'], not: 'UPCOMING', sel: '[data-empty="bookings"]' } },
  { key: 'c-bookings--ready', screen: 'c-bookings', group: 'M4 · Bookings', title: 'Bookings — ready, one completed', note: 'A ready order sits under In progress (since when, C-19) and says Choose a way back (K-27: the balance is held then); the completed one asks for a review',
    setup: (S) => {
      S.driveTo('completed');
      const b = cbAddRequest({ accept: true, after: CB_AFTER });
      S.setClock(b.slot.start);
      S.T.startFitting(b.id); S.documentFitting(b.id); S.T.sendPriceChange(b.id, b.lines); S.T.approvePriceChange(b.id); S.T.markReady(b.id);
    },
    expect: { has: ['IN PROGRESS', 'PAST', 'Since ', 'Choose a way back', 'Completed', 'Leave a review'], not: 'UPCOMING', sel: '[data-section="progress"] .appt-row' } },
];
export const FLOWS_c_booking = [
  { key: 'c-booking--confirmed', screen: 'c-booking', group: 'M3 · Bookings', title: 'Booked with Amara', note: 'Just accepted: Amara leads the Visit block (check after the name, rows under it, Message + Add to calendar), deposit Paid, same time and prices as her ticket',
    setup: (S) => { S.driveTo('confirmed'); },
    expect: { has: ['Confirmed', 'booked with Amara', 'deposit is paid', cbWhen(CB_SEED), 'Paid', cbExact(CB_SC.seed.deposit), cbExact(CB_SC.seed.services), cbExact(CB_SC.seed.homeFee), 'Estimated total', 'Message', 'Add to calendar'], not: ['On hold', 'Directions', 'Message Amara'], sel: '.person-block [data-verified]' } },
  { key: 'c-booking', screen: 'c-booking', group: 'M3 · Bookings', title: 'Your visit with Amara', note: 'An hour after the accept: free cancellation until the cutoff, Reschedule, Cancel',
    setup: (S) => { S.driveTo('confirmed'); S.advanceClock(CB_POLICY.JUST_BOOKED_MIN); },
    expect: { has: ['Your visit with Amara', 'Free cancellation until Wed, Oct 14', 'Reschedule', 'Cancel booking'], not: 'booked with' } },
  { key: 'c-booking--verified-open', screen: 'c-booking', group: 'M3 · Bookings', title: 'Your visit with Amara — Verified popover', note: 'K-15: tap the check after Amara’s name — a tooltip popover with the four checks, each with a tick (12 years from her data)',
    setup: (S) => { S.driveTo('confirmed'); S.advanceClock(CB_POLICY.JUST_BOOKED_MIN); },
    click: ['.person-block [data-verified]'],
    expect: { has: ['ID verified', 'Background check', '12 years of experience', 'Insured'], sel: '#verified-pop[role="dialog"] .verified-pop__item:nth-child(4)' } },
  { key: 'c-booking--item-peek', screen: 'c-booking', group: 'M7 · Polish', title: 'Booked with Amara — what the Suit Jacket is in for', note: 'K-25 (P2): tap a garment thumb in the Visit block — the white card in the Verified shell: the thumb, “Suit Jacket”, “2 services”, then each service on a cognac stitch dash; no prices',
    setup: (S) => { S.driveTo('confirmed'); },
    click: ['.person-block .garment-strip__btn[data-peek-label="Suit Jacket"]'],
    expect: { has: ['Suit Jacket', '2 services', 'Shorten sleeves', 'Take in jacket sides'], sel: '.garment-strip__btn[data-peek-label="Suit Jacket"][aria-expanded="true"]', also: '#garment-pop[role="dialog"] .garment-pop__svcs li:nth-child(2)' } },
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
    expect: { has: ['Amara can’t make it', 'Family emergency', 'Amara’s note', 'Refunded', 'items and services are saved', 'Find another tailor'], not: 'Cancelled by Amara' } },
  { key: 'c-booking--no-show', screen: 'c-booking', group: 'M3 · Bookings', title: 'Marked as a no-show', note: 'Amara waited and marked it missed: Amara keeps the deposit',
    setup: (S) => { S.driveTo('no-show'); },
    expect: { has: ['Marked as a no-show', 'Kept', 'keeps your deposit', cbExact(CB_SC.seed.deposit)] } },
  { key: 'c-booking--fitting', screen: 'c-booking', group: 'M4 · Bookings', title: 'Fitting with Amara', note: 'Amara is going through the order with her; still an estimate, no cancel or reschedule',
    setup: (S) => { S.driveTo('fitting'); },
    expect: { has: ['Fitting', 'going through the order', 'Estimated total', cbExact(CB_SC.seed.total)], not: ['Cancel booking', 'Reschedule'] } },
  { key: 'c-booking--in-progress', screen: 'c-booking', group: 'M4 · Bookings', title: 'Amara is working on it', note: 'Order approved: Total, not Estimated; the balance is due when it is ready',
    setup: (S) => { S.driveTo('in-progress'); },
    expect: { has: ['working on it', 'approved the order', 'Fitted Thu, Oct 15 · at my place', cbExact(CB_SC.seed.balance), 'YOUR ORDER', 'Suit Jacket', 'Take in jacket sides'], not: ['Estimated total', 'New item'] } },
  { key: 'c-booking--docs', screen: 'c-booking', group: 'M4 · Bookings', title: 'Your order — with the fitting photos', note: 'K-04: Your order keeps each garment’s icon and Amara’s comment; the item row shows her fitting photos (Before + Pinned) in place of yours, opened in the viewer',
    setup: (S) => { S.driveTo('in-progress', { docs: 'full' }); },
    expect: { has: ['YOUR ORDER', 'photos', 'Amara’s comment', cbFC.g2], sel: '[data-garment="g1"] [data-act="view-photos"][data-source="fitting"]' } },
  { key: 'c-booking--handoff-pickup', screen: 'c-booking', group: 'M4 · Bookings', title: 'Ready for pickup', note: 'The balance on hold (K-27); the pickup code to show at the shop (Study-1 A3); K-40: the time she picked leads the place block, Change time beside Directions',
    setup: (S) => { S.driveTo('awaiting-handoff'); },
    expect: { has: ['Pickup Fri, Oct 16 · 5:30 PM · show your code at the shop', 'Your pickup time · Amara has it ready then', 'Open Fri 10:00 AM', 'Amara Reyes', 'Charged at pickup', 'Visa •••• 4242', 'Sarah C.', '2 items · 3 services', 'YOUR PICKUP CODE', '8153', 'Show this code when you pick up.', 'IN-STORE PICKUP', 'Reyes Tailoring', 'Directions', 'Change time', 'Message', 'WHAT HAPPENS NEXT', 'Pick it up at the shop', 'Show Amara your code', 'Leave a review', `Payment ${cbExact(CB_SC.seed.balance)} · Charged at pickup`, 'I got it'], not: ['Charged at handoff', 'On hold', 'Message Amara', 'Paid in full', 'Rate the fit', 'marks it completed', 'I didn’t get it', 'agree on a time'], sel: '[data-hang] .hang__item', also: '[data-act="change-time"]' } },   // K-18 (3-J)
  { key: 'c-booking--handoff-pickup-many', screen: 'c-booking', group: 'M4 · Bookings', title: 'Ready for pickup — five items', note: 'K-21 sliding rail: every garment hangs on its thread (K-22), three show and the fourth peeks, Sarah’s tag pinned at the right end',
    setup: (S) => { S.driveTo('awaiting-handoff', { items: cbMany }); },
    expect: { has: ['Pickup Fri, Oct 16 · 5:30 PM', 'Charged at pickup', 'Sarah C.', '5 items · 6 services', 'IN-STORE PICKUP'], sel: '[data-hang] .hang__scroll[role="region"][tabindex="0"]', also: '[data-hang] .hang__slot--tag' } },   // K-21
  { key: 'c-booking--handoff-courier', screen: 'c-booking', group: 'M4 · Bookings', title: 'Courier booked', note: 'Taily courier: quote + fee = total, held with the balance; completes on delivery (Study-1 A3); K-40: the window she picked + when the courier collects, Change window',
    setup: (S) => { S.driveTo('awaiting-handoff', { returnOption: 'courier' }); },
    expect: { has: ['If you’re not home, the courier leaves it in your building’s lobby.', 'Courier booked · arrives Fri, Oct 16 · 5:00–5:30 PM', 'Arrives Fri, Oct 16 · 5:00–5:30 PM', 'The courier collects from Amara at 4:45 PM', 'Change window', 'Charged on delivery', 'I got it', 'at Reyes Tailoring', 'TAILY COURIER', 'Paid by you', cbExact(CB_SC.courierQuote.quote), cbExact(CB_SC.courierQuote.markup), cbExact(CB_SC.courier.courier)], sel: '.visit-row--courier' } },   // K16-2-02: the same window as t-job--handoff-courier's strip; K-18 (3-J)
  { key: 'c-booking--completed', screen: 'c-booking', group: 'M4 · Bookings', title: 'Completed and reviewed', note: 'Her own review, the receipt, and Book Amara again',
    setup: (S) => { S.driveTo('reviewed'); },
    expect: { has: ['All done with Amara', 'Completed Thu, Oct 15. Fitted Thu, Oct 15 · at my place', 'YOUR REVIEW', 'Perfect fit', 'Book Amara again'] } },
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
  { key: 't-home', screen: 't-home', group: 'M3 · Tailor', title: 'Home — a request and an upcoming visit', note: 'New request with the payout, 2h left, a visit booked below (Sarah Chen on both once she is accepted, D-159)',
    setup: c1Both,
    expect: { has: ['Hi, Amara', 'Tuesday, Oct 13 · 1 new request, 1 upcoming visit', 'NEW REQUESTS', 'Sarah Chen', 'Your payout', c1Exact(C1_SC.seed.payout), '2h left', 'UPCOMING', 'Sarah Chen', c1When(C1_SLOT)], not: c1Fee, sel: '.request-card' } },
  { key: 't-home--item-peek', screen: 't-home', group: 'M7 · Polish', title: 'Home — what the request is for', note: 'K-25 (P2): the request card’s “2 items · 3 services” is one trigger; the card lists both items with their services (stretched-link card: the rest of the card still opens the request)',
    setup: c1Both,
    click: ['.request-card .peek-cluster'],
    expect: { has: ['Suit Pant', '1 service', 'Hem pants', 'Suit Jacket', '2 services', 'Shorten sleeves', 'Take in jacket sides'], sel: '.request-card .peek-cluster[aria-expanded="true"]', also: '#garment-pop[role="dialog"] .garment-pop__item:nth-child(2)' } },
  { key: 't-home--empty', screen: 't-home', group: 'M3 · Tailor', title: 'Home — nothing yet', note: 'No requests, nothing booked: Check your hours',
    expect: { has: ['No requests yet', 'Check your hours'], not: 'Your payout', sel: '[data-empty="home"]' } },
  { key: 't-home--text', screen: 't-home', group: 'M3 · Tailor', title: 'Home — a text for a new request', note: 'K-43 (D-301, was the push card D-167): Taily texts her the request with its unique link; tapping it opens the request',
    setup: (S) => { S.driveTo('requested'); S.sim.texts = 'on'; },
    expect: { has: ['TEXT MESSAGE', 'Taily', 'New request from Sarah C.', 'Home visit', 'Your payout', c1Exact(C1_SC.seed.payout), '2h to reply', 'taily.app/r/'], sel: '.text-banner[data-act="text-open"]' } },
  /* extras beyond the spec table: states the screen draws that the table did not key */
  { key: 't-home--no-requests', screen: 't-home', group: 'M3 · Tailor', title: 'Home — only an upcoming visit', note: 'No new requests right now, the booked visit below',
    setup: (S) => { S.driveTo('confirmed'); },
    expect: { has: ['No new requests right now', 'UPCOMING', 'Sarah Chen', c1Exact(C1_SC.seed.payout)], not: ['Nothing booked yet', 'NEW REQUESTS 1'] } },
  { key: 't-home--no-upcoming', screen: 't-home', group: 'M3 · Tailor', title: 'Home — only a request', note: 'Nothing booked yet under Upcoming',
    setup: (S) => { S.driveTo('requested'); },
    expect: { has: ['NEW REQUESTS', 'Sarah C.', 'Nothing upcoming.'], not: 'Nothing booked yet', sel: '.request-card' } },
  { key: 't-home--soon', screen: 't-home', group: 'M3 · Tailor', title: 'Home — reply window closing', note: '10 minutes left: the card’s strip turns urgent (error tint)',
    setup: (S) => { S.driveTo('requested'); S.advanceClock(110); },
    expect: { has: ['10m left to answer · by 12:00 PM'], sel: '.request-card__strip--urgent' } },
  { key: 't-home--suggested', screen: 't-home', group: 'M3 · Tailor', title: 'Home — waiting on Sarah', note: 'K-13 option F: the strip leads with “You suggested …” and the 24h clock; the line is Sarah’s ask; payout greyed; no status word in the card',
    setup: (S) => { S.driveTo('suggested'); },
    expect: { has: ['WAITING ON SARAH', `You suggested ${c1When(C1_SUGGESTED)}`, '24h', `Sarah asked for ${c1Time(C1_SLOT)}`, '1 waiting on Sarah', c1Exact(C1_SC.seed.payout), 'Your payout'], not: ['1 new request', 'New time', 'for Sarah to answer', 'left to answer'], sel: '.request-card--suggested .request-card__strip--normal', noClip: ['.request-card__name', '.request-card__visit', '.request-card__strip-lead'] } },
  { key: 't-home--suggested-soon', screen: 't-home', group: 'M3 · Tailor', title: 'Home — waiting on Sarah, last minutes', note: '10 minutes before the suggested time lapses (D-154): the strip turns urgent (error tint)',
    setup: (S) => { S.driveTo('suggested'); S.advanceClock(24 * 60 - 10); },
    expect: { has: [`You suggested ${c1When(C1_SUGGESTED)}`, '10m', `Sarah asked for ${c1Time(C1_SLOT)}`], not: ['24h', 'left to answer'], sel: '.request-card--suggested .request-card__strip--urgent' } },
  { key: 't-home--in-progress', screen: 't-home', group: 'M3 · Tailor', title: 'Home — a job in progress', note: 'The visit is behind her: the row leads with the step and the due date (D-169)',
    setup: (S) => { S.driveTo('in-progress'); },
    expect: { has: ['IN PROGRESS', 'Needed by Fri, Oct 23', 'Sarah Chen', c1Exact(C1_SC.seed.payout)], not: ['since ', 'UPCOMING'] } },
  { key: 't-home--paused', screen: 't-home', group: 'M3 · Tailor', title: 'Home — paused', note: 'Taking requests is off: the summary says so and turns it back on (D-161)',
    setup: (S) => { c1Both(S); S.T.setTakingRequests(false); },
    expect: { has: ['You’re paused, so customers can’t send new requests.', 'Take requests again', 'NEW REQUESTS'], sel: '[data-act="resume"]' } },
  { key: 't-home--retried', screen: 't-home', group: 'M3 · Tailor', title: 'Home — sent again', note: 'Sarah tried again after an expiry: "Sent again" on the card',
    setup: (S) => { const a = S.driveTo('expired'); S.T.tryAgain(a.id); },
    expect: { has: ['Sent again', 'Sarah C.'], sel: '.request-card' } },
];

export const FLOWS_t_request = [
  { key: 't-request', screen: 't-request', group: 'M3 · Tailor', title: 'Request — decide in one tap', note: 'K-15: the flush strip, Sarah C. with her payout (no Verified check), the tile rows, the work, Accept · Suggest time · Decline',
    setup: (S) => { S.driveTo('requested'); },
    expect: { has: ['New request · 2h left to answer · by 12:00 PM', 'Sarah C.', 'Your payout', c1Exact(C1_SC.seed.payout), c1Neg(C1_SC.seed.tailyFee), c1When(C1_SLOT), 'Williamsburg · 11211', 'Full address after you accept', 'Needed by Fri, Oct 23', c1Exact(C1_SC.seed.services), 'Accept', 'Suggest time', 'Decline'], not: ['145 N 7th St', 'Chen', 'Verified'], sel: '.request-card__strip--page.request-card__strip--normal' } },
  { key: 't-request--rush', screen: 't-request', group: 'M3 · Tailor', title: 'Request — a rush job', note: 'Need-by one day after the visit: the rush fee is in her payout and shown on its own line',
    setup: (S) => { S.driveTo('requested', { rush: true }); },
    get expect() { return { has: ['Rush fee', c1Exact(C1_SC.rush.rush), c1Exact(C1_SC.rush.payout), c1Neg(C1_SC.rush.tailyFee)], sel: '.money-rows' }; } },
  { key: 't-request--soon', screen: 't-request', group: 'M3 · Tailor', title: 'Request — expires soon', note: '10 minutes left: the strip turns error (K-15)',
    setup: (S) => { S.driveTo('requested'); S.advanceClock(110); },
    expect: { has: ['New request · 10m left to answer · by'], sel: '.request-card__strip--page.request-card__strip--urgent[data-state="soon"]' } },
  { key: 't-request--urgent', screen: 't-request', group: 'M3 · Tailor', title: 'Request — last minutes', note: 'K-15: five minutes left, the strip is error-toned and the buttons are unchanged',
    setup: (S) => { S.driveTo('requested'); S.advanceClock(115); },
    expect: { has: ['New request · 5m left to answer · by', 'Accept', 'Suggest time', 'Decline'], sel: '.request-card__strip--urgent' } },
  { key: 't-request--expired', screen: 't-request', group: 'M3 · Tailor', title: 'Request — expired', note: 'Hold released, Sarah can send it again; no decision buttons',
    setup: (S) => { S.driveTo('expired'); },
    expect: { has: ['This request expired', 'Sarah can send it again', 'Back to Home', 'Would have paid'], not: ['Suggest time', 'Decline', 'Back to requests'], sel: '.request-card__strip--page.request-card__strip--expired' } },
  { key: 't-request--decline', screen: 't-request', group: 'M3 · Tailor', title: 'Decline this request? — sheet', note: 'Optional reason chips, red Decline request, Keep request',
    setup: (S) => { S.driveTo('requested'); },
    click: ['[data-act="decline"]'],
    expect: { has: ['Decline this request?', 'Reason (optional)', 'Fully booked that week', 'Decline request', 'Keep request'], sel: '[data-act="decline-ok"]' } },
  { key: 't-request--declined', screen: 't-request', group: 'M3 · Tailor', title: 'Request — you declined', note: 'Sarah told, hold released, your reason shown',
    setup: (S) => { S.driveTo('declined'); },
    expect: { has: ['You declined this request', 'Sarah has been told, and her', 'hold is released', 'Fully booked that week', 'Your reason', 'Back to Home'], not: ['Suggest time', 'Accept', 'Your reason: '] } },
  { key: 't-request--suggested', screen: 't-request', group: 'M3 · Tailor', title: 'Request — waiting on Sarah', note: 'Your suggested time, same price, how long Sarah has, Withdraw suggestion (D-154)',
    setup: (S) => { S.driveTo('suggested'); },
    expect: { has: ['You suggested a new time', c1When(C1_SUGGESTED), `Sarah asked for ${c1When(C1_SLOT)}`, `until ${c1Time(c1Iso(c1Add(C1_SUGGESTED, C1_MIN.home)))}`, 'Same price', 'can accept or choose another tailor', 'left · by ', 'Message Sarah', 'Back to Home', 'Withdraw suggestion'], not: ['Suggest time', 'Decline', 'Waiting on Sarah', 'can accept your time until'] } },
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
  { key: 't-request--shop', screen: 't-request', group: 'M3 · Tailor', title: 'Request — a shop visit', note: 'Her own shop address, no "after you accept" caption, no home visit fee',
    setup: (S) => { S.driveTo('requested', { visitType: 'shop' }); },
    expect: { has: ['Shop visit', 'Metropolitan Ave', 'Accept'], not: ['Full address after you accept', 'Home visit fee'] } },
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
  { key: 't-suggest', screen: 't-suggest', group: 'M3 · Tailor', title: 'Suggest another time', note: 'Her open times only; "Sarah sees" follows the wheel; same payout',
    setup: (S) => { S.driveTo('requested'); },
    expect: { has: ['Suggest another time', c1When(C1_SLOT), 'SARAH SEES', c1When(C1_SUGGESTED), 'Send suggestion', `Your payout ${c1Exact(C1_SC.seed.payout)}`], sel: '[data-scheduler]' } },
  { key: 't-suggest--rush-window', screen: 't-suggest', group: 'M3 · Tailor', title: 'Suggest another time — inside her rush window', note: 'The settled time is 1 day before the need-by date, but this request was not a rush: no rush fee, her payout unchanged (D-155)',
    setup: (S) => { S.driveTo('requested'); S.state.ui['t-suggest'] = { slot: '2026-10-22T17:00' }; },
    expect: { has: ['1 day before Sarah’s need-by date. No rush fee is added to this request.', `Your payout ${c1Exact(C1_SC.seed.payout)}`], not: 'pays' } },
  { key: 't-suggest--sending', screen: 't-suggest', group: 'M3 · Tailor', title: 'Suggest another time — sending', note: 'Latency held: Send suggestion busy, wheel locked',
    setup: (S) => { S.driveTo('requested'); S.sim.latency = 'hold'; },
    click: ['[data-act="send-suggestion"]'],
    expect: { has: 'Sending…', sel: '[data-act="send-suggestion"][aria-busy="true"]' } },
];

/* ---------- C3 · Customer request outcomes (c-request M3 states, c-tailors none-left) ---------- */
export const FLOWS_c_request = [
  { key: 'c-request--soon', screen: 'c-request', group: 'M3 · Request outcomes', title: 'Request sent — reply is close', note: '10 minutes left: the band gets the ochre ring and the clock says so',
    setup: (S) => { S.driveTo('requested'); S.advanceClock(110); },
    expect: { has: ['10m left · until 12:00 PM'], not: 'has 2 hours', sel: '.wait-band--soon [data-countdown][data-state="soon"]' } },
  { key: 'c-request--suggested', screen: 'c-request', group: 'M3 · Request outcomes', title: 'Amara suggested a new time', note: 'Same price; accepting charges the deposit and books it',
    setup: (S) => { S.driveTo('suggested'); },
    expect: { has: ['suggested a new time', c3When(C3_SUGGESTED_SLOT), `You asked for ${c3When(C3_SEED_SLOT)}`, 'Same price', 'On hold', 'Accept new time', 'Find another tailor', 'left · by '], not: ['New time suggested', 'NEW TIME', 'is holding this time until'], sel: '[data-strip="action"]' } },
  { key: 'c-request--declined', screen: 'c-request', group: 'M3 · Request outcomes', title: 'Amara declined', note: 'Hold released, her note, find another tailor',
    setup: (S) => { S.driveTo('declined'); },
    expect: { has: ['Amara declined your request', 'You weren’t charged', 'items and services are saved', 'Fully booked that week', 'Released', c3Exact(C3_SCENARIOS.seed.deposit), 'Find another tailor'], not: ['Try again', 'take this job', 'hold is released'] } },
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
  { key: 't-job--accepted', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — you just accepted', note: 'Title: You accepted (K-17 R1: no Confirmed pill), Sarah Chen (check after the name) leading the Visit block, the full address, Message / Directions / Add to calendar, payout',
    setup: (S) => { S.driveTo('confirmed'); },
    expect: { has: ['You accepted', 'Sarah Chen', '145 N 7th St, 2R', tjWhen(TJ_SLOT), 'Message', 'Directions', 'Add to calendar', tjExact(TJ_SC.seed.payout), tjNeg(TJ_SC.seed.tailyFee)], not: ['New customer', 'Message Sarah'], sel: '.person-block' } },
  { key: 't-job', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — upcoming', note: 'An hour after the accept: Visit confirmed (no status pill, K-17 R1), the person block, I can’t make it',
    setup: (S) => { S.driveTo('confirmed'); S.advanceClock(TJ_POLICY.JUST_BOOKED_MIN); },
    expect: { has: ['Visit confirmed', '145 N 7th St'], not: ['You accepted', 'Visit with Sarah Chen'], sel: '[data-act="more"]' } },
  { key: 't-job--more', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — the ••• menu', note: 'M7 (D-195): Cancel appointment (K-29, was I can’t make it) and Mark as no-show live behind the ••• at the top right',
    setup: (S) => { S.driveTo('confirmed'); S.advanceClock(TJ_POLICY.JUST_BOOKED_MIN); },
    click: ['[data-act="more"]'],
    expect: { has: ['Cancel appointment', `Sarah gets her ${tjExact(TJ_SC.seed.deposit)} deposit back`, 'Mark as no-show'], not: 'I can’t make it', sel: '[data-s="more"]' } },
  { key: 't-job--cancel', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — cancel appointment sheet', note: 'K-29 (was “can’t make it”): deposit refunded in full, optional reason chips, Keep the visit; 24 h or more ahead, no warning',
    setup: (S) => { S.driveTo('confirmed'); S.advanceClock(TJ_POLICY.JUST_BOOKED_MIN); },
    click: ['[data-act="more"]', '[data-act="cant-make-it"]'],
    expect: { has: ['Cancel this appointment?', tjExact(TJ_SC.seed.deposit), 'Her order stays saved', 'Family emergency', 'Keep the visit', 'Cancel appointment'], not: 'less than 24 hours away', sel: '[data-act="cant-ok"]' } },
  { key: 't-job--no-show', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — no-show sheet', note: '20 minutes past the start: you keep her deposit and are paid',
    setup: (S) => { S.driveTo('confirmed'); S.setClock(tjIso(tjAdd(TJ_SLOT, TJ_POLICY.NO_SHOW_WAIT_MIN + 5))); },
    click: ['[data-act="more"]', '[data-act="no-show"]'],
    expect: { has: ['Mark Sarah as a no-show?', `You’re paid ${tjExact(TJ_SC.noShow.paid)} in total`, `${tjExact(TJ_SC.seed.deposit)} deposit isn’t refunded`, 'Keep waiting'], sel: '[data-act="no-show-ok"]' } },
  { key: 't-job--cant-make-it-done', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — you cancelled', note: 'Visit cancelled, Sarah refunded, reason shown, street hidden',
    setup: (S) => { S.driveTo('cant-make-it'); },
    expect: { has: ['Visit cancelled', `We told Sarah and refunded her ${tjExact(TJ_SC.earlyCancel.refund)} deposit`, 'Family emergency', 'Your reason'], not: ['145 N 7th St', 'Your reason: '] } },
  { key: 't-job--no-show-done', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — marked a no-show', note: 'No-show pay with its payout date',
    setup: (S) => { S.driveTo('no-show'); },
    expect: { has: ['Marked as a no-show', 'No-show pay', tjExact(TJ_SC.noShow.paid), `${tjExact(TJ_SC.seed.deposit)} deposit isn’t refunded.`, 'Arrives'], not: 'in total' } },
  { key: 't-job--cancelled', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — Sarah cancelled early', note: 'Nothing is owed; the time is open again',
    setup: (S) => { S.driveTo('cancelled-early'); },
    expect: { has: ['Sarah cancelled', 'nothing is owed'], not: ['145 N 7th St', 'Cancelled by Sarah'] } },
  { key: 't-job--cancelled-late', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — Sarah cancelled late', note: 'You keep her deposit, with its payout date',
    setup: (S) => { S.driveTo('cancelled-late'); },
    expect: { has: ['Sarah cancelled', 'so you keep her deposit.', 'Kept deposit', tjExact(TJ_SC.lateCancel.tailorPaid), 'Arrives'], not: 'Cancelled by Sarah' } },
  /* extras beyond the spec table: states the screen draws that the table did not key */
  { key: 't-job--rescheduled', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — Sarah moved the visit', note: 'K-17 R3: no banner — the visit row says Moved from the old time',
    setup: (S) => {
      const a = S.driveTo('confirmed'); S.advanceClock(TJ_POLICY.JUST_BOOKED_MIN);
      const next = tjOpenSlots(a.tailorId, a.job.visitType, { until: a.job.needBy, exclude: a.id }).find((x) => x !== a.slot.start && x > a.slot.start);
      S.T.rescheduleBooking(a.id, next);
    },
    expect: { has: ['Visit rescheduled', 'Moved from 5:00 PM'], not: ['moved this visit to', 'Visit with Sarah Chen'], sel: '.visit-row' } },
  { key: 't-job--empty', screen: 't-job', group: 'M3 · Tailor job', title: 'Job — nothing booked', note: 'Only an open request: no job to show, way back to Home',
    setup: (S) => { S.driveTo('requested'); },
    expect: { has: ['No upcoming jobs', 'You have 1 request to answer on Home.', 'Go to Home'], not: 'Message Sarah', sel: '[data-empty="no-job"]' } },
];

export const FLOWS_t_thread = [
  { key: 't-thread', screen: 't-thread', group: 'M5 · Tailor messages', title: 'Thread — the booked conversation', note: 'Accept line, closing message, composer',
    setup: (S) => { S.driveTo('confirmed'); },
    expect: { has: ['Sarah Chen', 'Phone numbers and emails stay private on Taily.', 'Sarah sent a request', 'You accepted'], not: ['Amara accepted', 'Request sent'], sel: '.thread-context' } },
];
