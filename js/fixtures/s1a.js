/* ============================================================
   Study-1 WS-A Test-flows entries — handoff, hold, Job Done, no-show / cancel (A1–A5, K-27…K-29).
   One `FLOWS_<screen_id>` array per screen, same shape as js/fixtures/m#.js; flows.js concatenates every FLOWS_* export.
   Entry shape: see docs/v5/CONTEXT.md (FLOWS / EXPECT contract). Setups compose driveTo (real transitions) + advanceClock;
   money strings come from SCENARIOS through fmt*(). Existing keys re-pointed for WS-A live in m3.js / m4.js
   (c-ready, c-ready--pay, c-booking--handoff-*, c-complete, t-job--handoff-*, t-job--cancel).
   ============================================================ */
import { SCENARIOS as A1_SC } from './money-scenarios.js';
import { fmtExact as A1_exact, fmt as A1_fmt, HOLD_DAYS as A1_HOLD_DAYS } from '../money.js';
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
  { ...CB, key: 'c-booking--handoff-problem', title: 'You reported a problem', note: 'Study-1 A3 (default 5): picked up without the code, then reported — the countdown stopped, Amara told; Confirm received (K-48.3) still closes it',
    setup: (S) => { S.driveTo('problem'); },
    expect: { has: ['Problem reported · sort it out in chat', 'You reported a problem. We’ve stopped the automatic completion and told Amara.', 'Confirm received', 'Charged at pickup'], not: ['Charged at handoff', 'Completes automatically', 'I didn’t get it', 'On hold'], sel: '.banner--warning' } },
  { ...CB, key: 'c-booking--handoff-unclaimed', title: `Charged on the hold’s last day`, note: `Study-1 A2 + D-04 → K-53: still not picked up ${A1_HOLD_DAYS} days after it was ready — the hold is charged, the order stays open with its code; the pickup time passed, so Confirm received shows (D-09)`,
    setup: (S) => { S.driveTo('unclaimed'); },
    expect: { has: [`We charged your ${BAL} balance ${A1_HOLD_DAYS} days after your order was ready. Amara still keeps it for you until you pick it up.`, 'Charged', 'YOUR PICKUP CODE', `Ready · ${BAL} charged`, 'Confirm received'], not: ['On hold', 'I got it'], sel: '[data-pickup-code]' } },
  { ...CB, key: 'c-booking--got-it', title: 'Confirm you received it?', note: 'Study-1 A3 + K-48.3: Confirm received (was “I got it”) asks once, then charges the hold and closes the order (Amara marked it picked up without the code)',
    setup: (S) => { S.driveTo('handed-over'); },
    click: ['[data-act="got-it"]'],
    expect: { has: ['Confirm you received it?', `We’ll charge your ${BAL} balance and close the order.`, 'Yes, I have it', 'Not yet'], not: 'I got it', sel: '[data-s="c-booking--got-it"] [data-act="got-ok"]' } },
  { ...CB, key: 'c-booking--not-received', title: 'Didn’t get it?', note: 'Study-1 A3: reporting it stops the automatic completion; nothing is charged meanwhile (kept for a pickup marked without the code, K-37)',
    setup: (S) => { S.driveTo('handed-over'); },
    click: ['[data-act="not-got-it"]'],
    expect: { has: ['Didn’t get it?', 'We’ll stop the automatic completion and tell Amara. Nothing is charged while you sort it out in chat.', 'Report a problem', 'Keep waiting'], sel: '[data-s="c-booking--not-received"] [data-act="nr-ok"]' } },
  { ...CB, key: 'c-booking--no-show-link', title: 'Visit time passed — Tailor didn’t show up?', note: `Study-1 A5 (default 8): ${A1_POLICY.NO_SHOW_WAIT_MIN} min after the start of a still-confirmed visit, the report link is the one action (SF-11: no Cancel, Reschedule, late line or Add to calendar once the visit has started)`,
    setup: (S) => { const a = S.driveTo('confirmed'); S.setClock(A1_iso(A1_add(a.slot.start, A1_POLICY.NO_SHOW_WAIT_MIN))); },
    expect: { has: ['Your visit with Amara', 'Tailor didn’t show up?', `Your visit was at 5:00 PM. If Amara didn’t come, tap Tailor didn’t show up? to get your ${A1_exact(A1_SC.seed.deposit)} back.`], not: ['Reschedule', 'Cancel booking', 'To change the time now', 'Add to calendar'], sel: '[data-act="tailor-no-show"]' } },
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
  { ...CC, key: 'c-complete--auto', title: 'Order complete — completed automatically', note: 'Study-1 A3: 48h after Amara marked it picked up without the code, no problem reported',
    setup: (S) => { S.driveTo('auto-completed'); },
    expect: { has: ['COMPLETED AUTOMATICALLY · SAT, OCT 17', `Paid ${A1_exact(A1_SC.seed.total)}`, 'Leave a review', 'Book Amara again'], not: 'ORDER COMPLETE' } },
  { ...CC, key: 'c-complete--courier', title: 'Order complete — the courier delivered it', note: 'Study-1 A3 (default 6): the courier’s delivery completes it; the receipt names the courier',
    setup: (S) => { S.driveTo('completed', { returnOption: 'courier' }); },
    click: ['[data-act="receipt"]'],
    expect: { has: ['ORDER COMPLETE', `Paid ${A1_exact(A1_SC.courier.total)}`, 'Taily courier · Thu, Oct 15', 'Leave a review'], sel: '[data-act="receipt"][aria-expanded="true"]' } },
  { ...CC, key: 'c-complete--review-reminder', title: 'Order complete — a week later, no review', note: 'Study-1 A4 (K-28): the reminder card 7 days after completion',
    setup: (S) => { S.driveTo('review-reminder'); },
    expect: { has: ['How did Amara do?', 'Tap a star to rate.', 'Leave a review', 'ORDER COMPLETE'], not: ['Your order came back on', 'It’s been a week'], sel: '#rate-label' } },   // SF-39: the stars ask; no second card
];

/* ---------- customer: Home, Bookings, Book again (A4) ---------- */
export const FLOWS_c_job = [
  { key: 'c-job--review-reminder', screen: 'c-job', group: 'M1 · Booking', title: 'Home — review reminder', note: 'Study-1 A4 (K-28): a week after the order came back with no review, the card leads Home',
    setup: (S) => { S.driveTo('review-reminder'); },
    expect: { has: ['How did Amara do?', 'Your order came back on Thu, Oct 15. Your review helps other customers.', 'Leave a review', 'What needs work?'], sel: '[data-reminder] [data-act="review-reminder"]' } },
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
    expect: { has: ['Enter Sarah’s pickup code', '4-digit code', 'Confirm pickup', 'Sarah doesn’t have the code?'], sel: '[data-s="t-job--picked-up"] #handoff-code' } },
  { ...TJ, key: 't-job--picked-up-wrong', title: 'Job — the code doesn’t match', note: 'Study-1 A3: a wrong code, the error next to the field',
    setup: (S) => { S.driveTo('awaiting-handoff'); S.state.ui['t-job'] = { code: '1234' }; },
    click: ['[data-act="picked-up"]', '[data-act="pickup-ok"]'],
    expect: { has: ['Enter Sarah’s pickup code', 'That code doesn’t match. Ask Sarah to check her booking.'], sel: '#handoff-code[aria-invalid="true"]' } },
  { ...TJ, key: 't-job--handoff-pickup-marked', title: 'Job — marked picked up without the code', note: 'Study-1 A3 (default 4): Sarah can confirm; else it completes after 48h',
    setup: (S) => { S.driveTo('handed-over'); },
    expect: { has: ['Marked as picked up', 'Completes automatically in 47h unless Sarah reports a problem'], not: ['Confirm pickup', 'Mark completed'], sel: '[data-auto-complete]' } },
  { ...TJ, key: 't-job--handoff-problem', title: 'Job — Sarah didn’t get it', note: 'Study-1 A3 (default 5): marked picked up without the code, Sarah says she didn’t get it — countdown stopped; Message Sarah',
    setup: (S) => { S.driveTo('problem'); },
    expect: { has: ['Sarah says she didn’t get it. Sort it out in chat.', 'Message Sarah'], not: ['Completes automatically', 'Mark delivered again', 'Only Sarah can change the time'], sel: '[data-strip="action"]' } },
  { ...TJ, key: 't-job--handoff-unclaimed', title: `Job — charged on the hold’s last day`, note: 'Study-1 A2 + D-03 → K-53: Sarah’s hold was charged 4 days after ready — the payout goes out now (D-03); keep the order 30 days',
    setup: (S) => { S.driveTo('unclaimed'); },
    expect: { has: [`Sarah’s ${BAL} was charged ${A1_HOLD_DAYS} days after it was ready, so your payout is on its way`, 'Keep her order until', 'Picked up', 'Sarah missed her Fri, Oct 16 · 5:30 PM pickup · she picks a new time', 'Sarah missed this time. She picks a new one.'], sel: '[data-unclaimed]' } },
  { ...TJ, key: 't-job--completed-auto', title: 'Job — completed automatically', note: 'Study-1 A3: 48h after she marked it picked up without the code, no problem; the payout the Friday after',
    setup: (S) => { S.driveTo('auto-completed'); },
    expect: { has: ['COMPLETED AUTOMATICALLY · SARAH’S ORDER', 'Nice work, Amara.', 'Picked up at your shop · Thu, Oct 15', PAYOUT, 'Pending', 'Arrives Fri, Oct 23'], sel: '.linen-stage .tag-rail__tag' } },
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
  { key: 't-home--handoff', screen: 't-home', group: 'M3 · Tailor', title: 'Home — a pickup coming up', note: 'K-40: the pickup Sarah booked is an appointment again — under Upcoming with her time, at your shop (not her address)',
    setup: (S) => { S.driveTo('awaiting-handoff'); },
    expect: { has: ['UPCOMING', 'Picks up Fri, Oct 16 · 5:30 PM', 'At your shop', 'Pickup', '1 pickup tomorrow'], not: ['IN PROGRESS', '145 N 7th St', '8153'], sel: '[aria-labelledby="t-home-upcoming"] .appt-row' } },
  { key: 't-home--handoff-marked', screen: 't-home', group: 'M3 · Tailor', title: 'Home — picked up, counting down', note: 'Study-1 A3: marked picked up without the code — the In progress row counts down; the place is the shop',
    setup: (S) => { S.driveTo('handed-over'); },
    expect: { has: ['IN PROGRESS', 'Picked up · completes in 47h', 'At your shop'], not: '145 N 7th St', sel: '[aria-labelledby="t-home-progress"] .appt-row' } },
];
