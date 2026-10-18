/* ============================================================
   Study-1 K-41 (R3) Test-flows entries — the 24-hour reminder. The prompt leads Home as a card on the booking row (Confirm inline),
   c-booking says the same thing with Confirm in the bar; after confirming the free window is closed (a cancel keeps the deposit);
   unanswered, the visit stays booked. The tailor only sees the state (t-job strip + rule line, t-home Upcoming status).
   Same shape as js/fixtures/m#.js; flows.js concatenates every FLOWS_* export. Setups compose driveTo + the real clock (advanceClock, so
   tick() sends the reminder and its nudge) + T.confirmVisit; money strings come from SCENARIOS.
   ============================================================ */
import { SCENARIOS as E1_SC } from './money-scenarios.js';
import { fmtExact as E1_exact } from '../money.js';
import { reminderAt as E1_reminderAt } from '../state.js';

const DEP = E1_exact(E1_SC.seed.deposit);
const NO_SHOW = E1_exact(E1_SC.noShow.paid);
const G = 'S1 · 24-hour reminder';
const CJ = { screen: 'c-job', group: G };
const CB = { screen: 'c-booking', group: G };
const TJ = { screen: 't-job', group: G };
const TH = { screen: 't-home', group: G };

/** The seed visit (Thu, Oct 15 · 5:00 PM), booked Tue 10:00 AM; the real clock moves to the reminder (Wed 3:00 PM, 26 h before) + `plus` min. */
export function toReminder(S, plus = 0) {
  const a = S.driveTo('confirmed');
  S.advanceClock(Math.round((E1_reminderAt(a) - S.state.clock.now) / 60000) + plus);
  return a;
}
/** Sarah confirms 12 minutes after the reminder (Wed 3:12 PM). */
export function confirmedAtReminder(S) {
  const a = toReminder(S, 12);
  S.T.confirmVisit(a.id);
  return a;
}
/** She never answered: the clock runs on to the nudge, 6 hours before the visit (Thu 11:00 AM; K-43 moved it from 3 h). */
export function missedReminder(S) {
  const a = toReminder(S);
  S.advanceClock(20 * 60);
  return a;
}
/** K-43 (D-300): still no answer 3 hours before the visit (Thu 2:00 PM) — tick() cancels it; Amara keeps the deposit. */
export function autoCancelled(S) {
  const a = missedReminder(S);
  S.advanceClock(3 * 60);
  return a;
}

/* ---------- customer: Home (c-job) — the booking row becomes the prompt card ---------- */
export const FLOWS_c_job = [
  { ...CJ, key: 'c-job--reminder', title: 'Home — still on for tomorrow?', note: 'K-41 (R3): 26 hours before the visit the booking row becomes the prompt card — strip, the row (Your move), one dollar rule, Confirm and Change or cancel inline',
    setup: (S) => { toReminder(S); },
    expect: { has: ['Still on for tomorrow?', 'Free until 5:00 PM', 'Your move', `Once you confirm, Amara keeps your ${DEP} deposit if you cancel or aren’t home.`, 'Confirm', 'Change or cancel', 'BOOK SOMETHING ELSE'], not: ['All set', 'Confirmed'], sel: '[data-visit-prompt] [data-act="confirm-visit"]', also: '[data-visit-prompt] [data-strip="action"]' } },
];

/* ---------- customer: c-booking — the same moment, then confirmed / missed / a cancel after confirming ---------- */
export const FLOWS_c_booking = [
  { ...CB, key: 'c-booking--reminder', title: 'Booking — confirm by 5:00 PM', note: 'K-41 (R3): the prompt on the booking — strip with the time left, the rule under the title, Confirm in the bar, Reschedule and Cancel still free',
    setup: (S) => { toReminder(S); },
    expect: { has: ['Confirm by 5:00 PM today', '2h left', 'Your visit with Amara', `Free to reschedule or cancel until then. Once you confirm, Amara keeps your ${DEP} deposit if you cancel or aren’t home.`, 'Confirm for tomorrow', 'Reschedule', 'Cancel booking', 'Free cancellation until Wed, Oct 14 · 5:00 PM'], sel: '[data-strip="action"]', also: '.action-bar [data-act="confirm-visit"]' } },
  { ...CB, key: 'c-booking--reminder-confirmed', title: 'Booking — confirmed for tomorrow', note: 'K-41 (R3): after Confirm (3:12 PM) the free window is closed — the rule under the title and under Price; Reschedule is gone',
    setup: (S) => { confirmedAtReminder(S); },
    expect: { has: ['Confirmed for tomorrow · 5:00 PM', `If you cancel now or aren’t home, Amara keeps your ${DEP} deposit.`, `You confirmed on Wed, Oct 14 at 3:12 PM. If you cancel now or aren’t home, Amara keeps your ${DEP} deposit.`, 'To change the time now, message Amara.', 'Cancel booking'], not: ['Reschedule', 'Confirm for tomorrow', 'Free cancellation until'], sel: '[data-strip="done"]' } },
  { ...CB, key: 'c-booking--reminder-missed', title: 'Booking — not confirmed', note: 'K-41 (D-296) + K-43 (D-300): no answer by the 24-hour mark — still booked, one nudge 6 hours before (11:00 AM); confirm by 2:00 PM or the visit is cancelled',
    setup: (S) => { missedReminder(S); },
    expect: { has: ['Confirm by 2:00 PM or we’ll cancel the visit', 'Visit 5:00 PM', `If you don’t confirm by 2:00 PM, we cancel it and Amara keeps your ${DEP} deposit. She keeps it too if you cancel now or aren’t home.`, 'Confirm, I’ll be home', 'Cancel booking', 'The visit is less than 24 hours away.'], not: ['Reschedule', 'Confirm for'], sel: '[data-strip="warn"]', also: '.action-bar [data-act="confirm-visit"]' } },
  { ...CB, key: 'c-booking--auto-cancelled', title: 'Booking — cancelled, not confirmed', note: 'K-43 (D-300): still no answer at 2:00 PM (3 hours before) — Taily cancels the visit; inside 24 h, so Amara keeps the deposit; the order is back to rebook',
    setup: (S) => { autoCancelled(S); },
    expect: { has: ['Visit cancelled', `We cancelled your visit because you didn’t confirm by 2:00 PM. Amara keeps your ${DEP} deposit for the time set aside.`, 'Kept', 'Book Amara again', 'Find another tailor'], not: ['Confirm, I’ll be home', 'Refunded'], sel: '.page-actions [data-act="book-again"]' } },
  { ...CB, key: 'c-booking--cancel-confirmed', title: 'Cancel after confirming', note: 'K-41 (R3): confirming closed the free window early — cancelling now, even 25 hours ahead, keeps the deposit',
    setup: (S) => { confirmedAtReminder(S); },
    click: ['[data-act="cancel"]'],
    expect: { has: ['Cancel this booking?', `You confirmed this visit, so Amara keeps your ${DEP} deposit for the time set aside. Nothing else is charged.`, 'Kept by Amara', `Cancel and lose the ${DEP} deposit`, 'Keep booking'], not: 'comes back in full', sel: '[data-s="c-booking--cancel-late"]' } },
];

/* ---------- tailor: t-job — the state, never a prompt of her own ---------- */
export const FLOWS_t_job = [
  { ...TJ, key: 't-job--reminder-pending', title: 'Job — waiting on Sarah to confirm', note: 'K-41 (R3): we asked Sarah at 3:00 PM; the title says when the visit is, the strip the state',
    setup: (S) => { toReminder(S); },
    expect: { has: ['Waiting on Sarah to confirm', 'Asked 3:00 PM', 'Visit tomorrow', 'We asked Sarah if she’s still on. She can change for free until 5:00 PM today.'], not: 'Visit confirmed', sel: '[data-strip="warn"]' } },
  { ...TJ, key: 't-job--reminder-confirmed', title: 'Job — Sarah confirmed', note: 'K-41 (R3): her side of the money in one line, in dollars',
    setup: (S) => { confirmedAtReminder(S); },
    expect: { has: ['Sarah confirmed for tomorrow', '3:12 PM', 'Visit tomorrow', `If she cancels now, you keep her ${DEP} deposit. If she isn’t home, you’re paid ${NO_SHOW}.`], not: 'Visit confirmed', sel: '[data-strip="done"]' } },
  { ...TJ, key: 't-job--reminder-missed', title: 'Job — Sarah hasn’t confirmed', note: 'K-41 (D-296) + K-43 (D-300): the visit is still on; the nudge went out at 11:00 AM; no answer by 2:00 PM cancels it and Amara keeps the deposit',
    setup: (S) => { missedReminder(S); },
    expect: { has: ['Sarah hasn’t confirmed', 'Visit 5:00 PM', 'Visit today', `We reminded her at 11:00 AM. If she doesn’t confirm by 2:00 PM, we cancel the visit and you keep her ${DEP} deposit.`], sel: '[data-strip="warn"]' } },
  { ...TJ, key: 't-job--auto-cancelled', title: 'Job — Sarah didn’t confirm, visit cancelled', note: 'K-43 (D-300): Taily cancelled it at 2:00 PM; the kept deposit is Amara’s payout (late-cancel rule, no Taily fee)',
    setup: (S) => { autoCancelled(S); },
    expect: { has: ['Sarah didn’t confirm · visit cancelled', '2:00 PM', 'Visit cancelled', `We cancelled it 3 hours before the visit because she didn’t confirm, so you keep her ${DEP} deposit.`, 'Kept deposit', DEP, 'Back to Home'], not: ['Mark as no-show', 'Waiting on Sarah'], sel: '[data-strip="warn"]' } },
];

/* ---------- tailor: t-home — Upcoming says it ---------- */
export const FLOWS_t_home = [
  { ...TH, key: 't-home--reminder-confirmed', title: 'Home — Sarah confirmed', note: 'K-41 (R3): the Upcoming row’s status reads “Sarah confirmed” (it read “Not confirmed yet” from 3:00 PM)',
    setup: (S) => { confirmedAtReminder(S); },
    expect: { has: ['UPCOMING', 'Sarah confirmed', 'Thu, Oct 15 · 5:00 PM'], not: 'Not confirmed' } },
];
