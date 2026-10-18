/* ============================================================
   Design-director review (Oct 2026) — the small-fix Test-flows entries (SF-01 … SF-44, D-304).
   Same shape as js/fixtures/m#.js; flows.js concatenates every FLOWS_* export. Setups compose driveTo / addRequest / onboardTo
   (real transitions) + the real clock; money strings come from SCENARIOS through fmt*(), never typed.
   ============================================================ */
import { SCENARIOS as F1_SC } from './money-scenarios.js';
import { fmtExact as F1_exact, fmt as F1_fmt } from '../money.js';
import { addRequest as F1_addRequest, jobEdit as F1_jobEdit } from './common.js';
import { reminderAt as F1_reminderAt, openSlots as F1_openSlots } from '../state.js';
import { toDate as F1_toDate } from '../dates.js';

const G = 'Director review';

const FLOWS_c_job_list = [];
export { FLOWS_c_job_list as FLOWS_c_job };

/* ---------- SF-01: a decline on a second request never closes the thread while a job with her is live ---------- */
const declinedWhileActive = (S) => {
  S.driveTo('in-progress');
  const b = F1_addRequest();
  S.T.tailorDecline(b.id);
};

export const FLOWS_c_thread = [
  { screen: 'c-thread', group: G, key: 'c-thread--declined-active', title: 'Thread — a second request declined, the job still live', note: 'SF-01: Amara declined a second request while she is working on the first order — the chat stays open',
    setup: (S) => { declinedWhileActive(S); },
    expect: { not: ['this chat is closed', 'Start a new request'], sel: '.composer__input' } },
];

export const FLOWS_t_thread = [
  { screen: 't-thread', group: G, key: 't-thread--declined-active', title: 'Thread — declined a second request, the job still live', note: 'SF-01: the decline of a second request leaves the thread writable while the first job is in progress',
    setup: (S) => { declinedWhileActive(S); },
    expect: { not: 'You declined this request', sel: '.composer__input' } },
];

/* ---------- SF-03: a due-date-only edit that drops the rush fee is a new total on both sides ---------- */
const dueRushEdit = (S) => {
  const a = S.driveTo('in-progress', { rush: true });
  S.advanceClock(17 * 60);
  S.T.sendJobEdit(a.id, { ...F1_jobEdit(a, 'due'), lines: a.lines.map((l) => ({ ...l })), needBy: '2026-10-25' });
  return a;
};

export const FLOWS_c_price_change = [
  { screen: 'c-price-change', group: G, key: 'c-price-change--edit-due-rush', title: 'Amara edited your order — a later date drops the rush fee', note: 'SF-03: the same items, a later due date — the rush fee goes, so the total is new',
    setup: (S) => { dueRushEdit(S); },
    expect: { has: ['Amara edited your order', 'New total', `Was ${F1_exact(F1_SC.rush.total)}`, 'Rush fee', 'Removed · later due date', F1_exact(F1_SC.seed.total), 'New balance'], not: 'WHAT CHANGED' } },
];

export const FLOWS_t_job = [
  { screen: 't-job', group: G, key: 't-job--edit-pending-rush', title: 'Job — a later date drops the rush fee', note: 'SF-03: the foot line follows the total, not only the lines',
    setup: (S) => { dueRushEdit(S); },
    expect: { has: [`Sarah sees a new total of ${F1_exact(F1_SC.seed.total)} (was ${F1_exact(F1_SC.rush.total)}).`] } },
];

/* ---------- SF-44: the tailor's Sign out asks first, as the customer's does ---------- */
export const FLOWS_t_shop = [
  { screen: 't-shop', group: G, key: 't-shop--sign-out', title: 'Your shop — sign out confirm', note: 'SF-44: the c-account confirm — Sign out / Stay signed in, focus on the safe choice',
    click: ['[data-act="sign-out"]'],
    expect: { has: ['Sign out of Taily?', 'Your jobs and requests stay as they are.', 'Stay signed in'], sel: '[data-s="sign-out"]' } },
];

/* ---------- SF-08 / SF-09 / SF-10: the reminder leads Home, stays a card once missed, and a shop visit is not "home" ---------- */
const SHOP_DEP = F1_exact(F1_SC.shop.deposit);
const NO_SHOW = F1_exact(F1_SC.noShow.paid);
/** The seed visit's reminder (Wed 3:00 PM, 26 h before) + `plus` minutes, through the real clock (tick() sends it). */
const toReminder = (S, a, plus = 0) => { S.advanceClock(Math.round((F1_reminderAt(a) - S.state.clock.now) / 60000) + plus); return a; };
/** A shop visit two days out (Thu, Oct 15 · 10:00 AM), booked and accepted, so its reminder goes out (Wed 8:00 AM). */
function shopVisit(S) {
  S.T.setJob({ visitType: 'shop' });
  const slot = F1_openSlots(S.state.tailors[0].id, 'shop', { until: S.state.job.needBy }).find((x) => F1_toDate(x).getTime() - S.state.clock.now >= 48 * 3600000);
  const a = S.T.requestBooking({ tailorId: S.state.tailors[0].id, slotStart: slot, cardId: 'visa-4242' }).appt;
  S.T.tailorAccept(a.id);
  return a;
}

FLOWS_c_job_list.push(
  { screen: 'c-job', group: G, key: 'c-job--reminder-second-request', title: 'Home — the reminder leads, a second request waits', note: 'SF-08: a newer request is open, but the visit that needs her answer leads Home',
    setup: (S) => { const a = S.driveTo('confirmed'); F1_addRequest(); toReminder(S, a, 5); S.T.tick(); },
    expect: { has: ['Still on for tomorrow?', 'Free until 5:00 PM', 'Confirm', 'Change or cancel'], sel: '[data-visit-prompt] [data-act="confirm-visit"]' } },
  { screen: 'c-job', group: G, key: 'c-job--reminder-missed', title: 'Home — not confirmed, the card stays', note: 'SF-09 (D-304, overrides D-296(4)): after the free window closed unanswered, Home keeps Confirm one tap away until the auto-cancel',
    setup: (S) => { toReminder(S, S.driveTo('confirmed'), 20 * 60); },
    expect: { has: ['Confirm by 2:00 PM or we’ll cancel', 'Visit 5:00 PM', `If you don’t confirm by 2:00 PM, we cancel it and Amara keeps your ${F1_fmt(F1_SC.seed.deposit)} deposit. She keeps it too if you cancel now or aren’t home.`, 'Confirm', 'Change or cancel'], sel: '[data-visit-prompt] [data-strip="warn"]', also: '[data-visit-prompt] [data-act="confirm-visit"]' } },
);

export const FLOWS_c_booking = [
  { screen: 'c-booking', group: G, key: 'c-booking--reminder-shop', title: 'Booking — a shop visit not confirmed', note: 'SF-10: a shop visit says “don’t come to the shop” and “Confirm, I’ll be there”, never “home”',
    setup: (S) => { const a = shopVisit(S); toReminder(S, a, 20 * 60); },
    expect: { has: [`If you don’t confirm by 7:00 AM, we cancel it and Amara keeps your ${SHOP_DEP} deposit. She keeps it too if you cancel now or don’t come to the shop.`, 'Confirm, I’ll be there'], not: ['aren’t home', 'I’ll be home'], sel: '.action-bar [data-act="confirm-visit"]' } },
];

FLOWS_t_job.push(
  { screen: 't-job', group: G, key: 't-job--reminder-confirmed-shop', title: 'Job — Sarah confirmed a shop visit', note: 'SF-10: the no-show line says “doesn’t come”, not “isn’t home”',
    setup: (S) => { const a = shopVisit(S); toReminder(S, a, 12); S.T.confirmVisit(a.id); },
    expect: { has: [`If she cancels now, you keep her ${SHOP_DEP} deposit. If she doesn’t come, you’re paid ${NO_SHOW}.`], not: 'isn’t home', sel: '[data-strip="done"]' } },
);

/* ---------- SF-12: Home and Bookings rows say the handoff and a pending edit ---------- */
FLOWS_c_job_list.push(
  { screen: 'c-job', group: G, key: 'c-job--handoff', title: 'Home — paid, pickup booked', note: 'SF-12: the row shows the held balance and when it is charged, the pickup time and the shop',
    setup: (S) => { S.driveTo('awaiting-handoff'); },
    expect: { has: [F1_fmt(F1_SC.seed.balance), 'Charged at pickup', 'Fri, Oct 16 · 5:30 PM', 'At Reyes Tailoring'], sel: '[data-active-appt] .appt-row' } },
  { screen: 'c-job', group: G, key: 'c-job--edit-pending', title: 'Home — Amara edited the order', note: 'SF-12: the new total and “Approve changes” as her move',
    setup: (S) => { S.driveTo('edit-pending'); },
    expect: { has: [F1_fmt(F1_SC.edit.total), 'Approve changes'], sel: '[data-active-appt] .appt-row' } },
);
export const FLOWS_c_bookings = [
  { screen: 'c-bookings', group: G, key: 'c-bookings--edit-pending', title: 'Bookings — an edit waiting on her', note: 'SF-12: the in-progress row says Reply needed with the new total',
    setup: (S) => { S.driveTo('edit-pending'); },
    expect: { has: ['IN PROGRESS', F1_fmt(F1_SC.edit.total), 'Reply needed'], not: 'Total' } },
  { screen: 'c-bookings', group: G, key: 'c-bookings--handoff', title: 'Bookings — paid, pickup booked', note: 'SF-12: the pickup time and the shop, not the fitting’s place',
    setup: (S) => { S.driveTo('awaiting-handoff'); },
    expect: { has: ['Fri, Oct 16 · 5:30 PM', 'At Reyes Tailoring', 'Charged at pickup'], not: 'At my place' } },
];

/* ---------- SF-13 / SF-14 / SF-15: the 7-day charge on the customer's side ---------- */
FLOWS_c_booking.push(
  { screen: 'c-booking', group: G, key: 'c-booking--change-time-capped', title: 'Pick a new time — up to the 7-day charge', note: 'SF-13: five days after paying, the sheet offers no time after the charge (Thu, Oct 22 · 5:00 PM)',
    setup: (S) => { S.driveTo('awaiting-handoff'); S.advanceClock(5 * 24 * 60); },
    click: ['[data-act="change-time"]'],
    expect: { has: ['Thu, Oct 22'], not: ['Fri, Oct 23', 'Sat, Oct 24'], sel: '[data-s="c-booking--change-time"]' } },
  { screen: 'c-booking', group: G, key: 'c-booking--not-received-charged', title: 'Didn’t get it — after the 7-day charge', note: 'SF-15: the sheet says she was already charged; the unclaimed banner gives way to the picked-up countdown',
    setup: (S) => { const a = S.driveTo('unclaimed'); S.T.markHandedOver(a.id); },
    click: ['[data-act="not-got-it"]'],
    expect: { has: ['Didn’t get it?', `You’ve already been charged ${F1_exact(F1_SC.seed.balance)}. We’ll keep the order open while you sort it out in chat.`], not: ['Nothing is charged while', 'We charged your'], sel: '[data-s="c-booking--not-received"]' } },
);

/* ---------- SF-16 / SF-17: Picked up after a problem; a withdrawn request on the tailor's side ---------- */
FLOWS_t_job.push(
  { screen: 't-job', group: G, key: 't-job--handoff-problem-remark', title: 'Picked up after a reported problem', note: 'SF-16: once they sort it out in chat, Amara can still enter the code or mark it picked up',
    setup: (S) => { S.driveTo('problem'); },
    click: ['[data-act="picked-up"]'],
    expect: { has: ['Enter Sarah’s pickup code', 'Confirm pickup', 'Sarah doesn’t have the code?'], sel: '[data-s="t-job--picked-up"] #handoff-code' } },
  { screen: 't-job', group: G, key: 't-job--withdrawn', title: 'Job — Sarah withdrew her request', note: 'SF-17: a withdrawn request lands here (it was “Visit confirmed”); nothing is owed',
    setup: (S) => { const a = S.driveTo('requested'); S.T.withdrawRequest(a.id); S.state.ui.apptId = a.id; },
    expect: { has: ['Sarah withdrew her request', 'Nothing is owed. The time is open again.', 'Back to Home'], not: ['Visit confirmed', 'Your payout arrives'] } },
);

/* ---------- SF-23: turning the shop off when pickup is her only way back ---------- */
export const FLOWS_to_where = [
  { screen: 'to-where', group: G, key: 'to-where--shop-off-pickup-only', title: 'Where you work — shop off, pickup was the only way back', note: 'SF-23: the note says customers can’t book her until she turns on the courier (the save toast offers Return options)',
    setup: (S) => {
      S.T.setTailorSection('returns', { returns: { pickup: true, courier: false } });
      const t = S.state.tailors[0];
      S.state.ui['to-where'] = { draft: { shop: { enabled: false, street: t.shop.street, zip: t.shop.zip }, home: { enabled: true, hoods: [...t.home.hoods], fee: String(t.home.fee) } } };
    },
    expect: { has: 'In-store pickup will turn off too. It’s your only way to get orders back, so customers can’t book you until you turn on the Taily courier.', sel: '[data-pickup-note]' } },
];
