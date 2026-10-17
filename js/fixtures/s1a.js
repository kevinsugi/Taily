/* ============================================================
   Study-1 WS-A Test-flows entries — handoff, hold, Job Done, no-show / cancel (A1–A5, K-27…K-29).
   One `FLOWS_<screen_id>` array per screen, same shape as js/fixtures/m#.js; flows.js concatenates every FLOWS_* export.
   Entry shape: see docs/v5/CONTEXT.md (FLOWS / EXPECT contract). Setups compose driveTo (real transitions) + advanceClock;
   money strings come from SCENARIOS through fmt*(). Existing keys re-pointed for WS-A live in m3.js / m4.js
   (c-ready, c-ready--pay, c-booking--handoff-*, c-complete, t-job--handoff-*, t-job--cancel).
   ============================================================ */
import { SCENARIOS as A1_SC } from './money-scenarios.js';
import { fmtExact as A1_exact, fmt as A1_fmt } from '../money.js';
import { POLICY as A1_POLICY } from '../money-config.js';
import { isoMinute as A1_iso, addMinutes as A1_add } from '../dates.js';
import { earningsTo as A1_earningsTo } from './common.js';
import { setFocus as A1_setFocus } from '../focus.js';

const BAL = A1_exact(A1_SC.seed.balance);
const DEP = A1_exact(A1_SC.seed.deposit);
const PAYOUT = A1_exact(A1_SC.seed.payout);
const CB = { screen: 'c-booking', group: 'M4 · Bookings' };
const CC = { screen: 'c-complete', group: 'M4 · Completed' };
const TJ = { screen: 't-job', group: 'M4 · Job' };
/** "Book Amara again" from a completed order, the way c-complete's button does it (Study-1 A4, default 9). */
const bookAgain = (S, a) => { S.T.bookAgain(a.id); S.state.ui.booking = { tailorId: a.tailorId, again: true }; };

/* ---------- customer: the handoff on c-booking (A2–A3) and the tailor no-show (A5) ---------- */
export const FLOWS_c_booking = [
  { ...CB, key: 'c-booking--handoff-delivered', title: 'Amara delivered it', note: 'Study-1 A3: her drop-off photo, the 47h countdown, I got it / I didn’t get it',
    setup: (S) => { S.driveTo('handed-over', { returnOption: 'dropoff' }); },
    expect: { has: ['Amara delivered it · photo below', 'Taken by Amara', 'Completes automatically in 47h unless you report a problem', 'Delivered', 'On hold', BAL, 'Confirm you got it', 'I got it', 'I didn’t get it'], not: ['Time to agree', 'Paid in full'], sel: '[data-delivery-photo]', also: '[data-act="not-got-it"]' } },
  { ...CB, key: 'c-booking--handoff-problem', title: 'You reported a problem', note: 'Study-1 A3 (default 5): the countdown stopped, Amara told; I got it still closes it',
    setup: (S) => { S.driveTo('problem', { returnOption: 'dropoff' }); },
    expect: { has: ['Problem reported · sort it out in chat', 'You reported a problem. We’ve stopped the automatic completion and told Amara.', 'I got it', 'On hold'], not: ['Completes automatically', 'I didn’t get it'], sel: '.banner--warning' } },
  { ...CB, key: 'c-booking--handoff-unclaimed', title: 'Charged after 7 days', note: 'Study-1 A2: still not picked up 7 days after the hold — the hold is charged, the order stays open with its code',
    setup: (S) => { S.driveTo('unclaimed'); },
    expect: { has: [`We charged the ${BAL} on hold after 7 days. Amara still keeps it for you until you pick it up.`, 'Charged', 'YOUR PICKUP CODE', `Ready · ${BAL} charged`, 'I got it'], not: 'On hold', sel: '[data-pickup-code]' } },
  { ...CB, key: 'c-booking--got-it', title: 'Got everything?', note: 'Study-1 A3: I got it asks once, then charges the hold and closes the order',
    setup: (S) => { S.driveTo('handed-over', { returnOption: 'dropoff' }); },
    click: ['[data-act="got-it"]'],
    expect: { has: ['Got everything?', `We’ll charge the ${BAL} on hold and close the order.`, 'Yes, I got it', 'Not yet'], sel: '[data-s="c-booking--got-it"] [data-act="got-ok"]' } },
  { ...CB, key: 'c-booking--not-received', title: 'Didn’t get it?', note: 'Study-1 A3: reporting it stops the automatic completion; nothing is charged meanwhile',
    setup: (S) => { S.driveTo('handed-over', { returnOption: 'dropoff' }); },
    click: ['[data-act="not-got-it"]'],
    expect: { has: ['Didn’t get it?', 'We’ll stop the automatic completion and tell Amara. Nothing is charged while you sort it out in chat.', 'Report a problem', 'Keep waiting'], sel: '[data-s="c-booking--not-received"] [data-act="nr-ok"]' } },
  { ...CB, key: 'c-booking--no-show-link', title: 'Visit time passed — Tailor didn’t show up?', note: `Study-1 A5 (default 8): ${A1_POLICY.NO_SHOW_WAIT_MIN} min after the start of a still-confirmed visit, the report link joins Cancel booking`,
    setup: (S) => { const a = S.driveTo('confirmed'); S.setClock(A1_iso(A1_add(a.slot.start, A1_POLICY.NO_SHOW_WAIT_MIN))); },
    expect: { has: ['Your visit with Amara', 'Tailor didn’t show up?', 'Cancel booking'], not: 'Reschedule', sel: '[data-act="tailor-no-show"]' } },
  { ...CB, key: 'c-booking--no-show-report', title: 'Amara didn’t show up?', note: 'Study-1 A5: cancel the visit and refund the deposit in full; the order stays saved',
    setup: (S) => { const a = S.driveTo('confirmed'); S.setClock(A1_iso(A1_add(a.slot.start, A1_POLICY.NO_SHOW_WAIT_MIN + 5))); },
    click: ['[data-act="tailor-no-show"]'],
    expect: { has: ['Amara didn’t show up?', `We’ll cancel the visit and refund your ${DEP} deposit in full. Your order stays saved so you can rebook.`, 'Report a no-show', 'Keep waiting'], sel: '[data-s="c-booking--no-show-report"] [data-act="tns-ok"]' } },
  { ...CB, key: 'c-booking--tailor-no-show', title: 'Amara didn’t show up', note: 'Study-1 A5 (K-29): reported, the deposit refunded in full, Find another tailor',
    setup: (S) => { S.driveTo('tailor-no-show'); },
    expect: { has: ['Amara didn’t show up', `Your ${DEP} deposit is refunded in full.`, 'Refunded', 'Find another tailor'], not: ['Kept', 'Tailor didn’t show up?'] } },
  { ...CB, key: 'c-booking--cant-make-it-late', title: 'Amara cancelled less than 24 hours before', note: 'Study-1 A5 (K-29): a late tailor cancel says so; the deposit is still refunded in full',
    setup: (S) => { S.driveTo('cant-make-it-late'); },
    expect: { has: ['Amara can’t make it', `Amara cancelled less than 24 hours before your visit. Your ${DEP} deposit is refunded in full.`, 'Refunded', 'Find another tailor'] } },
];

/* ---------- customer: Job Done (A4) ---------- */
export const FLOWS_c_complete = [
  { ...CC, key: 'c-complete--auto', title: 'Order complete — completed automatically', note: 'Study-1 A3: 48h after Amara marked it delivered with no problem reported',
    setup: (S) => { S.driveTo('auto-completed', { returnOption: 'dropoff' }); },
    expect: { has: ['COMPLETED AUTOMATICALLY · SAT, OCT 17', `Charged ${BAL}`, 'Leave a review', 'Book Amara again'], not: 'ORDER COMPLETE' } },
  { ...CC, key: 'c-complete--courier', title: 'Order complete — the courier delivered it', note: 'Study-1 A3 (default 6): the courier’s delivery completes it; the receipt names the courier',
    setup: (S) => { S.driveTo('completed', { returnOption: 'courier' }); },
    click: ['[data-act="receipt"]'],
    expect: { has: ['ORDER COMPLETE', `Charged ${A1_exact(A1_SC.courier.balance)}`, 'Taily courier · Thu, Oct 15', 'Leave a review'], sel: '[data-act="receipt"][aria-expanded="true"]' } },
  { ...CC, key: 'c-complete--review-reminder', title: 'Order complete — a week later, no review', note: 'Study-1 A4 (K-28): the reminder card 7 days after completion',
    setup: (S) => { S.driveTo('review-reminder'); },
    expect: { has: ['How did Amara do?', 'It’s been a week since your order came back. Your review helps other customers.', 'Leave a review', 'ORDER COMPLETE'], sel: '[data-reminder] [data-act="leave-review"]' } },
];

/* ---------- customer: Home, Bookings, Book again (A4) ---------- */
export const FLOWS_c_job = [
  { key: 'c-job--review-reminder', screen: 'c-job', group: 'M1 · Booking', title: 'Home — review reminder', note: 'Study-1 A4 (K-28): a week after the order came back with no review, the card leads Home',
    setup: (S) => { S.driveTo('review-reminder'); },
    expect: { has: ['How did Amara do?', 'It’s been a week since your order came back. Your review helps other customers.', 'Leave a review', 'What needs work?'], sel: '[data-reminder] [data-act="review-reminder"]' } },
  { key: 'c-job--book-again', screen: 'c-job', group: 'M1 · Booking', title: 'Home — booking Amara again', note: 'Study-1 A4 (default 9): Book Amara again — same visit type, ZIP and address, no garments; Amara named',
    setup: (S) => { bookAgain(S, S.driveTo('completed')); },
    expect: { has: ['Booking again with Amara', 'What needs work?', 'Add at least one garment'], not: 'Your items', sel: '[data-again]' } },
];
export const FLOWS_c_bookings = [
  { key: 'c-bookings--review-reminder', screen: 'c-bookings', group: 'M4 · Bookings', title: 'Bookings — a week later, no review', note: 'Study-1 A4: the completed row links to Leave a review',
    setup: (S) => { S.driveTo('review-reminder'); },
    expect: { has: ['PAST', 'Completed', 'Leave a review', A1_fmt(A1_SC.seed.total)], sel: '[data-section="past"] .appt-row' } },
];
export const FLOWS_c_tailor = [
  { key: 'c-tailor--book-again', screen: 'c-tailor', group: 'M1 · Booking', title: 'Amara’s profile — booking again', note: 'Study-1 A4 (default 9): Next on the place step goes straight to her profile, named as a rebooking',
    setup: (S) => {
      bookAgain(S, S.driveTo('completed'));
      const g = S.T.addGarment('Suit Pant');
      S.T.setServices(g.garment.id, ['hem-pants']);
    },
    expect: { has: ['Booking again with Amara', 'Amara Reyes', 'Pick a time'], sel: '[data-again]' } },
];

/* ---------- tailor: the handoff on t-job (A3), the cancel and the no-show (A5) ---------- */
export const FLOWS_t_job = [
  { ...TJ, key: 't-job--picked-up', title: 'Job — enter Sarah’s pickup code', note: 'Study-1 A3: Picked up opens the 4-digit code; no code → mark it picked up (48h)',
    setup: (S) => { S.driveTo('awaiting-handoff'); },
    click: ['[data-act="picked-up"]'],
    expect: { has: ['Enter Sarah’s pickup code', '4-digit code', 'Confirm pickup', 'Customer doesn’t have the code?'], sel: '[data-s="t-job--picked-up"] #handoff-code' } },
  { ...TJ, key: 't-job--picked-up-wrong', title: 'Job — the code doesn’t match', note: 'Study-1 A3: a wrong code, the error next to the field',
    setup: (S) => { S.driveTo('awaiting-handoff'); S.state.ui['t-job'] = { code: '1234' }; },
    click: ['[data-act="picked-up"]', '[data-act="pickup-ok"]'],
    expect: { has: ['Enter Sarah’s pickup code', 'That code doesn’t match. Ask Sarah to check her booking.'], sel: '#handoff-code[aria-invalid="true"]' } },
  { ...TJ, key: 't-job--handoff-pickup-marked', title: 'Job — marked picked up without the code', note: 'Study-1 A3 (default 4): Sarah can confirm; else it completes after 48h',
    setup: (S) => { S.driveTo('handed-over'); },
    expect: { has: ['Marked as picked up', 'Completes automatically in 47h unless Sarah reports a problem'], not: ['Confirm pickup', 'Mark completed'], sel: '[data-auto-complete]' } },
  { ...TJ, key: 't-job--delivered', title: 'Job — mark as delivered', note: 'Study-1 A3: Delivered needs a photo of the drop-off; Sarah sees it',
    setup: (S) => { S.driveTo('awaiting-handoff', { returnOption: 'dropoff' }); },
    click: ['[data-act="delivered"]'],
    expect: { has: ['Mark as delivered', 'Add a photo of the drop-off. Sarah sees it.', 'Take a photo', 'Choose from library', 'Mark delivered'], not: 'Add a photo to mark it delivered.', sel: '[data-s="t-job--delivered"] [data-act="delivered-ok"]' } },
  { ...TJ, key: 't-job--delivered-photo-missing', title: 'Job — delivered without a photo', note: 'Study-1 A3: Mark delivered with no photo, the error next to the photo choice',
    setup: (S) => { S.driveTo('awaiting-handoff', { returnOption: 'dropoff' }); },
    click: ['[data-act="delivered"]', '[data-act="delivered-ok"]'],
    expect: { has: ['Mark as delivered', 'Add a photo to mark it delivered.'], sel: '[data-s="t-job--delivered"] [data-err]' } },
  { ...TJ, key: 't-job--handoff-delivered', title: 'Job — delivered, waiting on Sarah', note: 'Study-1 A3: the photo she sent and the 47h countdown; nothing to tap',
    setup: (S) => { S.driveTo('handed-over', { returnOption: 'dropoff' }); },
    expect: { has: ['Delivered · photo sent to Sarah', 'Taken by you', 'Completes automatically in 47h unless Sarah reports a problem', 'HOME DROP-OFF'], not: ['Mark delivered', 'Mark completed'], sel: '[data-delivery-photo]' } },
  { ...TJ, key: 't-job--handoff-problem', title: 'Job — Sarah didn’t get it', note: 'Study-1 A3 (default 5): countdown stopped; Message Sarah, or mark it delivered again with a new photo',
    setup: (S) => { S.driveTo('problem', { returnOption: 'dropoff' }); },
    expect: { has: ['Sarah says she didn’t get it. Sort it out in chat.', 'Message Sarah', 'Mark delivered again'], not: 'Completes automatically', sel: '[data-strip="action"]' } },
  { ...TJ, key: 't-job--handoff-unclaimed', title: 'Job — charged after 7 days', note: 'Study-1 A2: Sarah’s hold was charged; you are paid when she picks it up',
    setup: (S) => { S.driveTo('unclaimed'); },
    expect: { has: [`Sarah’s ${BAL} was charged after 7 days. You’re paid when she picks it up.`, 'Picked up', 'In-store pickup · waiting for Sarah'], sel: '[data-unclaimed]' } },
  { ...TJ, key: 't-job--completed-auto', title: 'Job — completed automatically', note: 'Study-1 A3: 48h after Delivered with no problem; the payout the Friday after',
    setup: (S) => { S.driveTo('auto-completed', { returnOption: 'dropoff' }); },
    expect: { has: ['COMPLETED AUTOMATICALLY · SARAH’S ORDER', 'Nice work, Amara.', 'Dropped off at Sarah’s · Sat, Oct 17', PAYOUT, 'Pending', 'Arrives Fri, Oct 23'], sel: '.linen-stage .tag-rail__tag' } },
  { ...TJ, key: 't-job--cancel-late', title: 'Job — cancel inside 24 hours', note: 'Study-1 A5 (K-29): the warning — Sarah is refunded in full and may not find another tailor',
    setup: (S) => { const a = S.driveTo('confirmed'); S.setClock(A1_iso(A1_add(a.slot.start, -8 * 60))); },
    click: ['[data-act="more"]', '[data-act="cant-make-it"]'],
    expect: { has: ['Cancel this appointment?', `The visit is less than 24 hours away. Sarah will be refunded her ${DEP} deposit in full, and she may not find another tailor in time.`, 'Cancel appointment', 'Keep the visit'], sel: '[data-s="t-job--cancel-late"] .banner--warning' } },
  { ...TJ, key: 't-job--tailor-no-show', title: 'Job — Sarah reported you didn’t show up', note: 'Study-1 A5 (K-29): her deposit refunded, nothing paid out',
    setup: (S) => { S.driveTo('tailor-no-show'); },
    expect: { has: ['Sarah reported you didn’t show up', `Her ${DEP} deposit was refunded. Nothing is paid out for this job.`], not: ['145 N 7th St', 'No-show pay'] } },
];

/* ---------- tailor: Home (A3 handoff row, A4 Completed list) ---------- */
export const FLOWS_t_home = [
  { key: 't-home--completed', screen: 't-home', group: 'M3 · Tailor', title: 'Home — the Completed list', note: 'Study-1 A4 (default 10): every completed job, newest first, with its payout — Paid Fri, Oct 16 / Payout pending',
    setup: (S) => { A1_earningsTo('paid'); A1_setFocus(null); },
    expect: { has: ['COMPLETED', 'Payout pending', 'Paid Fri, Oct 16', PAYOUT], not: 'RECENT', sel: '[aria-labelledby="t-home-completed"] .appt-row' } },
  { key: 't-home--handoff', screen: 't-home', group: 'M3 · Tailor', title: 'Home — delivered, counting down', note: 'Study-1 A3: the In progress row says Delivered and when it completes',
    setup: (S) => { S.driveTo('handed-over', { returnOption: 'dropoff' }); },
    expect: { has: ['IN PROGRESS', 'Delivered · completes in 47h', 'Delivered'], sel: '[aria-labelledby="t-home-progress"] .appt-row' } },
];
