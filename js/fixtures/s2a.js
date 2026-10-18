/* ============================================================
   Pre-MVP A1 (K-48) Test-flows entries — texts + the notification matrix (D-02, DG-2 A), the waiting states' ends (D-03), the card window
   (D-04), Confirm received (D-09 / K-48.3), "Did the visit happen?" (D-11 / K-48.5), a tailor's move (D-12), the visit day (S-32, D-14),
   the courier's trip (S-35) and offline money (S-12).
   Same shape as js/fixtures/m#.js; flows.js concatenates every FLOWS_* export. Setups compose driveTo + the real clock (advanceClock /
   setClock + tick) + real transitions (T.*) and sim knobs; money strings come from SCENARIOS.
   ============================================================ */
import { SCENARIOS as A2_SC } from './money-scenarios.js';
import { fmtExact as A2_exact } from '../money.js';
import { POLICY as A2_POLICY } from '../money-config.js';
import { nudgeAt as A2_nudgeAt, moveSlots as A2_moveSlots } from '../state.js';
import { pickHandoff as A2_pick, handoffPick as A2_handoffPick } from './common.js';
import { autoCancelled as A2_autoCancelled } from './s1e.js';

const DEP = A2_exact(A2_SC.seed.deposit);
const BAL = A2_exact(A2_SC.seed.balance);
const NO_SHOW = A2_exact(A2_SC.noShow.paid);
const G = 'A1 · Texts, timers, visit day';
const at = (screen) => ({ screen, group: G });

/** The seed visit (Thu, Oct 15 · 5:00 PM), confirmed by Sarah at its nudge (K-51: Wed 3:00 PM) — so the K-43 auto-cancel stays out of it. */
function sure(S) {
  const a = S.driveTo('confirmed');
  S.advanceClock(Math.round((A2_nudgeAt(a) - S.state.clock.now) / 60000));
  S.T.confirmVisit(a.id);
  return a;
}
/** D-11: nothing recorded 2 hours after the start (Thu 7:00 PM) — both are asked. */
function visitCheck(S) {
  const a = sure(S);
  S.setClock('2026-10-15T19:00');
  S.T.tick();
  return a;
}
/** The reminder went out while her texts were off (D-02) — the 24-hour mark passed with no answer (Thu 11:00 AM). */
function missedUnarmed(S) {
  const a = S.driveTo('confirmed');
  S.T.textReply('customer', 'STOP');
  S.advanceClock(Math.round((A2_nudgeAt(a) - S.state.clock.now) / 60000) + 20 * 60);
  return a;
}
/** D-12: Amara asks to move the visit to Sat, Oct 17 · 9:00 AM. */
function moveAsked(S) {
  const a = S.driveTo('confirmed');
  S.T.proposeNewTime(a.id, A2_moveSlots(a).find((x) => x.startsWith('2026-10-17')));
  return a;
}
/** S-35: a courier order Amara handed to the courier at 4:45 PM on Friday. */
function courierOut(S) {
  const a = S.driveTo('awaiting-handoff', { returnOption: 'courier' });
  S.setClock('2026-10-16T16:45');
  S.T.courierCollected(a.id);
  return a;
}
/** D-04: the charge at the pickup-code handoff fails. */
function cardFailed(S) {
  const a = S.driveTo('awaiting-handoff');
  S.setClock(a.handoff.slot.start);
  S.sim.capture = 'declined';
  S.T.confirmPickup(a.id, a.handoff.code);
  return a;
}

/* ---------- Account → Texts (D-02) ---------- */
export const FLOWS_c_texts = [
  { ...at('c-texts'), key: 'c-texts', title: 'Texts — booking updates on', note: 'D-02 (pre-MVP A1): booking texts are their own opt-in — one switch; sign-in codes always go; the carrier lines',
    expect: { has: ['Texts', 'We text (718) 555-0142. Each text links straight to your booking.', 'Booking updates', 'Replies to your request, reminders, ready to pick up, receipts', 'Sign-in codes are always sent, because you ask for them.', 'Reply STOP to opt out, HELP for help.'], not: 'You replied STOP', sel: '#texts-booking[aria-checked="true"]' } },
  { ...at('c-texts'), key: 'c-texts--stopped', title: 'Texts — after a STOP reply', note: 'D-02: a STOP reply turned them off; what it means and how to undo it (here, or START)',
    setup: (S) => { S.T.textReply('customer', 'STOP'); },
    expect: { has: ['You replied STOP on Tue, Oct 13', 'So texts to this number are off, and reminders won’t reach you. Turn them on here, or reply START to any Taily text.', 'Updates still show here in the app.'], sel: '#texts-booking[aria-checked="false"]' } },
  { ...at('c-texts'), key: 'c-texts--off', title: 'Texts — off, never opted in', note: 'D-02: off without a STOP (a new account that didn’t tick the box) — the in-app fallback, no banner',
    setup: (S) => { S.T.setTexts('customer', false); },
    expect: { has: ['Booking updates', 'Updates still show here in the app. Without texts, the day-before reminder shows only in the app, so we never cancel a visit because you missed it.'], not: 'You replied STOP', sel: '[data-texts-off]' } },
];
export const FLOWS_t_texts = [
  { ...at('t-texts'), key: 't-texts', title: 'Texts — requests and job updates on', note: 'D-02: the tailor’s texts — one switch, the carrier lines',
    expect: { has: ['Texts', 'We text (347) 555-0118. Each text links straight to the request or job.', 'Requests and job updates', 'New requests, visit reminders, changes, payouts'], sel: '#texts-jobs[aria-checked="true"]' } },
  { ...at('t-texts'), key: 't-texts--stopped', title: 'Texts — after a STOP reply', note: 'D-02: requests still expire in 2 hours',
    setup: (S) => { S.T.textReply('tailor', 'STOP'); },
    expect: { has: ['You replied STOP on Tue, Oct 13', 'new requests won’t reach you', `Requests still expire ${A2_POLICY.REQUEST_EXPIRY_H} hours after they arrive, so check Home often.`], sel: '#texts-jobs[aria-checked="false"]' } },
];

/* ---------- the text catalogue board (DG-2 A) ---------- */
export const FLOWS_sys_texts = [
  { ...at('sys-texts'), key: 'sys-texts', title: 'Text catalogue — to the customer', note: 'DG-2 A + D-02: every text, as she gets it, with its trigger and landing screen (js/texts.js; docs/v5/TEXTS.md)',
    setup: (S) => { S.driveTo('awaiting-handoff'); },
    expect: { has: ['Text catalogue', 'TEXTS TO SARAH, THE CUSTOMER', 'TEXT MESSAGE', 'Taily: Amara accepted. You’re booked', 'Taily: Your order from Amara is ready.', 'Lands on: c-booking', 'taily.app/r/'], not: ['undefined', 'NaN', 'quiet'], sel: '[data-text-event="reminder"] .text-banner' } },
  { ...at('sys-texts'), key: 'sys-texts--tailor', title: 'Text catalogue — to the tailor', note: 'Kevin: the start reminder 1 hour before, then at the start “Your fitting has started. Please take all notes here:”',
    setup: (S) => { S.driveTo('awaiting-handoff'); },
    click: ['[data-act="chip"][data-value="tailor"]'],
    expect: { has: ['TEXTS TO AMARA, THE TAILOR', 'Taily: New request from Sarah C.', 'Taily: Your fitting has started. Please take all notes here:', 'Taily: Sarah sent you a message. Reply here:', 'Taily: Your visit with Sarah starts at'], not: ['undefined', 'NaN'], sel: '[data-text-event="fitting-started"]' } },
];

/* ---------- Home: one-time notices (DG-2 A), texts off, the unarmed reminder ---------- */
export const FLOWS_c_job = [
  { ...at('c-job'), key: 'c-job--notice-cant-make-it', title: 'Home — Amara can’t make it (notice)', note: 'DG-2 A (B-06): a cancel within 48 hours of the visit is a one-time card on Home — ✕ or its button clears it',
    setup: (S) => { S.driveTo('cant-make-it-late'); },
    expect: { has: ['Amara can’t make it today', `Your ${DEP} deposit is refunded. Your 2 items and 3 services are saved, so you can book someone else.`, 'Find another tailor', 'What needs work?'], sel: '[data-notice] [data-act="notice-find"]', also: '.notice-card__close[aria-label="Dismiss: Amara can’t make it today"]' } },
  { ...at('c-job'), key: 'c-job--notice-auto-cancel', title: 'Home — we cancelled your visit (notice)', note: 'DG-2 A: K-43’s auto-cancel in her words, on Home',
    setup: (S) => { A2_autoCancelled(S); },
    expect: { has: ['We cancelled your 5:00 PM visit', `You didn’t confirm by 2:00 PM, so Amara keeps your ${DEP} deposit. Your order is saved.`, 'Book Amara again'], sel: '[data-notice] [data-act="notice-book"]' } },
  { ...at('c-job'), key: 'c-job--reminder-unarmed', title: 'Home — not confirmed, texts off', note: 'D-02: the reminder never reached her by text, so nothing will cancel the visit — the plain 24 h rule',
    setup: (S) => { missedUnarmed(S); },
    expect: { has: ['You haven’t confirmed', 'Visit 5:00 PM', 'The visit is still on.', 'Confirm'], not: ['or we’ll cancel', 'we cancel it'], sel: '[data-visit-prompt]' } },
];
export const FLOWS_t_home = [
  { ...at('t-home'), key: 't-home--notice-late-cancel', title: 'Home — Sarah cancelled late (notice)', note: 'DG-2 A (B-06): the visit no longer just vanishes — the card says the money, ✕ clears it',
    setup: (S) => { S.driveTo('cancelled-late'); },
    expect: { has: ['Sarah cancelled today’s 5:00 PM visit', `She cancelled less than ${A2_POLICY.CANCEL_WINDOW_H} hours before, so you keep her ${DEP} deposit. It comes with your payout on Fri, Oct 16.`, 'See the visit', 'Nothing upcoming.'], sel: '[data-notice] [data-act="notice-open"]', also: '.notice-card__close' } },
  { ...at('t-home'), key: 't-home--notice-auto-cancel', title: 'Home — we cancelled, Sarah didn’t confirm (notice)', note: 'DG-2 A: B-06’s case — after the 2:00 PM auto-cancel she can’t travel to the 5:00 PM visit',
    setup: (S) => { A2_autoCancelled(S); },
    expect: { has: ['We cancelled today’s 5:00 PM visit', `Sarah didn’t confirm by 2:00 PM, so you keep her ${DEP} deposit.`], sel: '[data-notice]' } },
  { ...at('t-home'), key: 't-home--texts-off', title: 'Home — texts are off', note: 'D-02: she replied STOP; requests still expire in 2 hours',
    setup: (S) => { S.driveTo('requested'); S.T.textReply('tailor', 'STOP'); },
    expect: { has: ['Texts are off', `You replied STOP, so we can’t text you new requests. You still have ${A2_POLICY.REQUEST_EXPIRY_H} hours to answer each one.`, 'Turn texts back on', 'NEW REQUESTS'], sel: '.t-home__texts-off [data-act="texts-on"]' } },
  { ...at('t-home'), key: 't-home--overdue', title: 'Home — an overdue job', note: 'B-07: past its due date the row says so',
    setup: (S) => { S.driveTo('in-progress'); S.setClock('2026-10-24T10:00'); },
    expect: { has: ['Overdue · due Fri, Oct 23'] } },
];
export const FLOWS_c_bookings = [
  { ...at('c-bookings'), key: 'c-bookings--texts-off', title: 'Bookings — texts are off', note: 'D-02: a STOP reply — reminders and ready texts won’t reach her; the app is the fallback',
    setup: (S) => { S.driveTo('confirmed'); S.T.textReply('customer', 'STOP'); },
    expect: { has: ['Texts are off', 'You replied STOP, so reminders and “ready” texts won’t reach you. Updates still show here.', 'Turn texts back on', 'UPCOMING'], sel: '.c-bookings__texts-off [data-act="texts-on"]' } },
];

/* ---------- c-booking ---------- */
export const FLOWS_c_booking = [
  { ...at('c-booking'), key: 'c-booking--visit-check', title: 'Booking — did your visit happen?', note: 'D-11 (K-48.5): 2 hours after the start with nothing recorded, both are asked (and texted); 4 h unanswered tells the admin; K-51: 24 h closes it by the evidence',
    setup: (S) => { visitCheck(S); },
    expect: { has: ['Did your visit happen?', 'Visit 5:00 PM', `Nothing was recorded for this visit. If nobody answers by 7:00 PM tomorrow, we close it as not confirmed and hold your ${DEP} deposit. Amara keeps it unless one of you disputes it within 72 hours.`, 'Yes, it happened', 'No, Amara didn’t come'], not: 'refund', sel: '.action-bar [data-act="visit-yes"]' } },
  { ...at('c-booking'), key: 'c-booking--visit-check-answered', title: 'Booking — you told us it happened', note: 'D-11: her answer stops the admin note and the cancel',
    setup: (S) => { const a = visitCheck(S); S.T.answerVisitCheck(a.id, 'happened'); },
    expect: { has: ['You told us the visit happened', 'Amara sends you the final order next.'], not: 'Yes, it happened', sel: '[data-strip="done"]' } },
  { ...at('c-booking'), key: 'c-booking--visit-closed', title: 'Booking — not confirmed, deposit on hold', note: 'K-51 (replaces D-11’s refund): nothing recorded, “Did the visit happen?” unanswered 24 hours — closed “Not confirmed”, the deposit on hold; Amara keeps it unless one of them disputes within 72 h',
    setup: (S) => { sure(S); S.setClock('2026-10-16T19:00'); S.T.tick(); },
    expect: { has: ['Not confirmed', `Nobody confirmed the visit, so we closed it as not confirmed. Your ${DEP} deposit is on hold. If neither of you disputes it by Mon, Oct 19 · 7:00 PM, Amara keeps it.`, 'On hold', 'That’s not right', 'Book Amara again'], not: ['Refunded', 'refunded'], sel: '.page-actions [data-act="dispute-hold"]' } },
  { ...at('c-booking'), key: 'c-booking--visit-closed-dispute', title: 'Booking — not confirmed: the visit didn’t happen?', note: 'K-51: “That’s not right” — the deposit stays on hold until Taily decides',
    setup: (S) => { sure(S); S.setClock('2026-10-16T19:00'); S.T.tick(); },
    click: ['.page-actions [data-act="dispute-hold"]'],
    expect: { has: ['The visit didn’t happen?', `Tell Taily, and your ${DEP} deposit stays on hold until we decide. We look into it with Amara and message you both.`, 'Tell Taily', 'Cancel'], sel: '[data-s="c-booking--dispute-hold"] [data-act="cs-ok"]' } },
  { ...at('c-booking'), key: 'c-booking--visit-closed-kept', title: 'Booking — not confirmed, nobody disputed', note: 'K-51: 72 hours after the close with no dispute — Amara keeps the deposit',
    setup: (S) => { sure(S); S.setClock('2026-10-16T19:00'); S.T.tick(); S.advanceClock(72 * 60); },
    expect: { has: ['Not confirmed', `Nobody confirmed the visit, and nobody disputed it by Mon, Oct 19 · 7:00 PM, so Amara kept your ${DEP} deposit.`, 'Kept', 'Book Amara again'], not: ['That’s not right', 'On hold'] } },
  { ...at('c-booking'), key: 'c-booking--visit-closed-no-show', title: 'Booking — counts as a no-show (Amara tapped I’m here)', note: 'K-51: nobody answered, but Amara tapped I’m here at 4:55 PM — the customer’s no-show by the evidence; she can still say That’s not right',
    setup: (S) => { const a = sure(S); S.setClock('2026-10-15T16:55'); S.T.visitPing(a.id, 'tailor', 'here'); S.setClock('2026-10-16T19:00'); S.T.tick(); },
    expect: { has: ['Marked as a no-show', 'You didn’t tell us if the visit happened, and Amara tapped I’m here at 4:55 PM, so it counts as a no-show. Amara keeps your deposit. If you were there, tell us.', 'Kept', 'That’s not right'], not: 'On hold', sel: '.page-actions [data-act="dispute"]' } },
  { ...at('c-booking'), key: 'c-booking--move-asked', title: 'Booking — Amara asked to move it', note: 'D-12: Accept the new time or keep yours; the deposit and the free-cancel window move with the visit',
    setup: (S) => { moveAsked(S); },
    expect: { has: ['Amara asked to move your visit', 'to Sat, Oct 17 · 9:00 AM', 'Accept Sat, Oct 17 · 9:00 AM, or keep Thu, Oct 15 · 5:00 PM.', 'Accept new time', 'Keep current time'], sel: '.action-bar [data-act="proposal-accept"]' } },
  { ...at('c-booking'), key: 'c-booking--visit-day', title: 'Booking — the visit day', note: 'S-32: from 3 hours before, Call (through Taily, after the MVP) and Amara’s “On my way”',
    setup: (S) => { const a = sure(S); S.setClock('2026-10-15T16:20'); S.T.visitPing(a.id, 'tailor', 'on-my-way'); },
    expect: { has: ['Call', 'Amara is on her way', '4:20 PM', 'Message'], not: 'Add to calendar', sel: '[data-act="call"]' } },
  { ...at('c-booking'), key: 'c-booking--call', title: 'Call through Taily', note: 'S-32 / D-14: masked calling comes after the MVP — the sheet says so and offers the chat',
    setup: (S) => { const a = sure(S); S.setClock('2026-10-15T16:20'); },
    click: ['[data-act="call"]'],
    expect: { has: ['Call through Taily', 'Calls will go through a Taily number, so neither of you sees the other’s phone number.', 'Message Amara'], sel: '[data-s="call-sheet"] [data-act="call-message"]' } },
  { ...at('c-booking'), key: 'c-booking--no-show-disputed', title: 'Booking — you told Taily you were there', note: 'D-14: “That’s not right” on Amara’s no-show — both go to Taily review; A2 (D-333): the case strip “Taily is reviewing · Reply by …” opens the Help thread',
    setup: (S) => { const a = S.driveTo('no-show'); S.T.disputeNoShow(a.id, 'customer'); },
    expect: { has: ['Marked as a no-show', 'Taily is reviewing', 'Reply by Fri 5:20 PM', 'Open Taily Help', 'Amara tapped I’m here'], not: 'That’s not right', sel: '[data-case-strip="reviewing"] [data-act="open-case"]' } },
  { ...at('c-booking'), key: 'c-booking--no-show-dispute', title: 'Were you there?', note: 'D-14: the no-show Amara marked (after her I’m here, shown as evidence) can be disputed',
    setup: (S) => { S.driveTo('no-show'); },
    click: ['[data-act="dispute"]'],
    expect: { has: ['Were you there?', 'Tell Taily you were there.', 'Tell Taily'], sel: '[data-s="c-booking--dispute"] [data-act="dp-ok"]' } },
  { ...at('c-booking'), key: 'c-booking--reminder-unarmed', title: 'Booking — not confirmed, texts off', note: 'D-02: no delivered reminder, no auto-cancel — the plain 24 h rule',
    setup: (S) => { missedUnarmed(S); },
    expect: { has: ['You haven’t confirmed', `The visit is still on. If you cancel now or aren’t home, Amara keeps your ${DEP} deposit.`, 'Confirm, I’ll be home'], not: ['or we’ll cancel the visit'], sel: '[data-strip="warn"]' } },
  { ...at('c-booking'), key: 'c-booking--pickup-open', title: 'Pickup time started — Confirm received', note: 'D-09 / K-48.3: “Confirm received” (was “I got it”) shows once the pickup time has started (or Amara marked it)',
    setup: (S) => { const a = S.driveTo('awaiting-handoff'); S.setClock(a.handoff.slot.start); },
    expect: { has: ['Confirm received', 'YOUR PICKUP CODE'], not: ['I got it', 'I didn’t get it'], sel: '.action-bar [data-act="got-it"]' } },
  { ...at('c-booking'), key: 'c-booking--defaulted-pickup', title: 'Ready 14 days — set to in-store pickup', note: 'D-03: no way back chosen in 14 days — in-store pickup, the balance held, the capture clock started; she picks a time',
    setup: (S) => { S.driveTo('ready'); S.advanceClock(A2_POLICY.READY_DEFAULT_D * 24 * 60); },
    expect: { has: ['We set it to in-store pickup · pick a time', 'Pick a time', 'YOUR PICKUP CODE', 'Charged at pickup'], not: 'Confirm received', sel: '[data-act="change-time"]' } },
  { ...at('c-booking'), key: 'c-booking--courier-out', title: 'Out for delivery', note: 'S-35: Amara handed it to the courier',
    setup: (S) => { courierOut(S); },
    expect: { has: ['Out for delivery · arrives 5:00–5:30 PM', 'The courier has it · collected from Amara at 4:45 PM', 'Out for delivery'], not: ['Change window', 'Confirm received'] } },
  { ...at('c-booking'), key: 'c-booking--courier-returned', title: 'The courier couldn’t deliver it', note: 'S-35: back to Amara — she picks a new window, no extra charge (the Demo action “Courier can’t deliver”)',
    setup: (S) => { const a = courierOut(S); S.setClock('2026-10-16T17:20'); S.T.courierFailed(a.id); },
    expect: { has: ['The courier couldn’t deliver it · pick a new window', 'Pick a new window', 'Pick a new delivery window', 'No extra charge.'], sel: '[data-act="change-time"]' } },
  { ...at('c-booking'), key: 'c-booking--card-failed', title: 'Your card needs attention', note: 'D-04: the charge at the handoff failed — completed, Update card; Amara’s payout waits',
    setup: (S) => { cardFailed(S); },
    expect: { has: ['Your card needs attention', `You have your order, but we couldn’t charge ${BAL}. Update your card to finish.`, 'Update card'], sel: '[data-act="update-card"]' } },
  { ...at('c-booking'), key: 'c-booking--update-card', title: 'Update your card', note: 'D-04: pay with another card (or add one)',
    setup: (S) => { cardFailed(S); },
    click: ['[data-act="update-card"]'],
    expect: { has: ['Update your card', `We couldn’t charge your card for ${BAL}. Pick a card to pay with.`, `Pay ${BAL}`, 'Add a card'], sel: '[data-s="c-booking--update-card"] [data-act="uc-ok"]' } },
  { ...at('c-booking'), key: 'c-booking--closed', title: 'Order closed — not collected', note: 'D-03: 30 days after the unclaimed charge the order closes; Amara was paid at the charge',
    setup: (S) => { S.driveTo('unclaimed'); S.advanceClock(A2_POLICY.ABANDONED_CLOSE_D * 24 * 60); },
    expect: { has: ['Order closed', `We closed it ${A2_POLICY.ABANDONED_CLOSE_D} days after the charge because it wasn’t collected.`] } },
];
export const FLOWS_c_complete = [
  { ...at('c-complete'), key: 'c-complete--courier-lobby', title: 'Delivered to the lobby', note: 'S-35 + K-43: a lobby drop completes it, with the courier’s photo; “Didn’t get it?” for 24 hours',
    setup: (S) => { const a = courierOut(S); S.setClock('2026-10-16T17:10'); S.T.courierDelivered(a.id, { to: 'lobby' }); },
    expect: { has: ['Left in your building’s lobby · 5:10 PM', 'The courier took a photo when it was dropped off', 'Didn’t get it? Tell us'], sel: '[data-act="missing-delivery"]' } },
  { ...at('c-complete'), key: 'c-complete--courier-reported', title: 'Delivery reported missing', note: 'S-35: Taily review (track A2 resolves it)',
    setup: (S) => { const a = courierOut(S); S.setClock('2026-10-16T17:10'); S.T.courierDelivered(a.id, { to: 'lobby' }); S.T.reportMissingDelivery(a.id); },
    expect: { has: ['You told us it didn’t reach you. Taily is looking into it and will message you.'], not: 'Didn’t get it? Tell us', sel: '[data-missing]' } },
];

/* ---------- offline money (S-12) ---------- */
export const FLOWS_c_ready = [
  { ...at('c-ready'), key: 'c-ready--offline', title: 'Pay while offline', note: 'S-12: nothing is held; the error sits above the bar',
    setup: (S) => { const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'pickup'); A2_pick(a.id); S.sim.network = 'offline'; },
    click: ['[data-act="pay"]', '[data-act="pay-ok"]'],
    expect: { has: ['You’re offline', 'Nothing was charged. Pay again when you’re back.'], sel: '.c-ready__alert .banner--error' } },
];
export const FLOWS_c_pay = [
  { screen: 'c-pay', group: G, key: 'c-pay--offline', title: 'Send request while offline', note: 'S-12: nothing is sent or held',
    setup: (S) => { S.sim.network = 'offline'; },
    click: ['[data-act="pay"]'],
    expect: { has: ['You’re offline', 'Nothing was sent and nothing was held.'], sel: '.banner--error' } },
];
export const FLOWS_t_request = [
  { ...at('t-request'), key: 't-request--offline', title: 'Accept while offline', note: 'S-12: nothing is sent or captured; the error sits above the bar',
    setup: (S) => { S.driveTo('requested'); S.sim.network = 'offline'; },
    click: ['[data-act="accept"]'],
    expect: { has: ['You’re offline', 'Nothing was sent and nothing was charged.', 'Accept'], sel: '.t-request__error .banner--error' } },
];

/* ---------- t-job ---------- */
export const FLOWS_t_job = [
  { ...at('t-job'), key: 't-job--visit-day', title: 'Job — the visit day', note: 'S-32: from 3 hours before — Call (through Taily, after the MVP), Directions, On my way; D-14: I’m here comes next',
    setup: (S) => { sure(S); S.setClock('2026-10-15T15:00'); },
    expect: { has: ['Message', 'Call', 'Directions', 'On my way'], not: 'Add to calendar', sel: '[data-act="on-my-way"]' } },
  { ...at('t-job'), key: 't-job--here', title: 'Job — you’re here', note: 'D-14 (K-48): I’m here at the visit — the evidence a no-show needs; Sarah is texted',
    setup: (S) => { const a = sure(S); S.setClock('2026-10-15T16:55'); S.T.visitPing(a.id, 'tailor', 'here'); },
    expect: { has: ['You told her you’re here', '4:55 PM'], not: 'I’m here' } },
  { ...at('t-job'), key: 't-job--no-show-needs-here', title: 'Job — ••• before I’m here', note: 'D-14: Mark as no-show asks for I’m here first',
    setup: (S) => { sure(S); S.setClock('2026-10-15T17:20'); },
    click: ['[data-act="more"]'],
    expect: { has: ['Mark as no-show', 'Tap I’m here when you arrive first'] } },
  { ...at('t-job'), key: 't-job--visit-check', title: 'Job — did the visit happen?', note: 'D-11 (K-48.5): 2 hours after the start with nothing recorded — start the fitting, or mark a no-show (after I’m here); K-51: 24 h unanswered closes it by the evidence',
    setup: (S) => { visitCheck(S); },
    expect: { has: ['Did the visit happen?', 'Nothing was recorded. If it happened, start the fitting.', `If nobody answers by 7:00 PM tomorrow, we close it as not confirmed and hold Sarah’s ${DEP} deposit. You keep it unless one of you disputes it within 72 hours.`, 'Start fitting'], not: 'refund', sel: '.action-bar [data-act="start-fitting"]' } },
  { ...at('t-job'), key: 't-job--visit-closed', title: 'Job — not confirmed, deposit on hold', note: 'K-51 (replaces D-11’s refund): unanswered 24 hours, nothing recorded — closed “Not confirmed”; Sarah’s deposit on hold, hers unless someone disputes within 72 h',
    setup: (S) => { sure(S); S.setClock('2026-10-16T19:00'); S.T.tick(); },
    expect: { has: ['Not confirmed', `Nobody confirmed the visit, so we closed it as not confirmed. Sarah’s ${DEP} deposit is on hold. If neither of you disputes it by Mon, Oct 19 · 7:00 PM, you keep it.`], not: ['refunded', 'Kept deposit'] } },
  { ...at('t-job'), key: 't-job--visit-closed-kept', title: 'Job — not confirmed, you keep the deposit', note: 'K-51: nobody disputed it in 72 hours — the kept deposit is her payout (Fri, Oct 23)',
    setup: (S) => { sure(S); S.setClock('2026-10-16T19:00'); S.T.tick(); S.advanceClock(72 * 60); },
    expect: { has: ['Not confirmed', `Nobody confirmed the visit, and nobody disputed it by Mon, Oct 19 · 7:00 PM, so you keep Sarah’s ${DEP} deposit.`, 'Kept deposit', DEP] } },
  { ...at('t-job'), key: 't-job--visit-closed-no-show', title: 'Job — counts as her no-show (you tapped I’m here)', note: 'K-51: nobody answered and she had tapped I’m here — the no-show rule pays her the no-show pay',
    setup: (S) => { const a = sure(S); S.setClock('2026-10-15T16:55'); S.T.visitPing(a.id, 'tailor', 'here'); S.setClock('2026-10-16T19:00'); S.T.tick(); },
    expect: { has: ['Marked as a no-show', 'Sarah didn’t tell us if the visit happened, and you tapped I’m here at 4:55 PM, so it counts as her no-show.', 'No-show pay'] } },
  { ...at('t-job'), key: 't-job--move-asked', title: 'Job — you asked to move it', note: 'D-12: waiting on Sarah to accept or keep her time; the visit stays as booked until then',
    setup: (S) => { moveAsked(S); },
    expect: { has: ['Waiting on Sarah · new time', 'You asked to move it to Sat, Oct 17 · 9:00 AM. Sarah accepts it or keeps Thu, Oct 15 · 5:00 PM.'], sel: '[data-strip="warn"]' } },
  { ...at('t-job'), key: 't-job--move-kept', title: 'Job — Sarah kept her time', note: 'D-12: she keeps the current time',
    setup: (S) => { const a = moveAsked(S); S.T.answerProposal(a.id, false); },
    expect: { has: ['Sarah is keeping Thu, Oct 15 · 5:00 PM', 'She didn’t take Sat, Oct 17 · 9:00 AM. The visit stays as booked.'] } },
  { ...at('t-job'), key: 't-job--more-move', title: 'Job — ••• Suggest a new time', note: 'D-12: the confirmed visit’s menu',
    setup: (S) => { S.driveTo('confirmed'); },
    click: ['[data-act="more"]'],
    expect: { has: ['Suggest a new time', 'Sarah accepts it or keeps 5:00 PM', 'Cancel appointment', 'Mark as no-show'] } },
  { ...at('t-job'), key: 't-job--withdraw-edit', title: 'Withdraw your changes?', note: 'D-03 (K-30 unchanged): she can withdraw a pending edit; Sarah’s approved order stands',
    setup: (S) => { S.driveTo('edit-pending'); },
    click: ['[data-act="withdraw-edit"]'],
    expect: { has: ['Withdraw your changes?', 'Sarah’s order stays as she approved it, and you can mark it ready.', 'Withdraw changes', 'Keep them'], sel: '[data-s="t-job--withdraw-edit"] [data-act="wd-ok"]' } },
  { ...at('t-job'), key: 't-job--courier-out', title: 'Job — with the courier', note: 'S-35: after Handed to courier',
    setup: (S) => { courierOut(S); },
    expect: { has: ['With the courier · arrives 5:00–5:30 PM'], not: 'Handed to courier', sel: '[data-strip="done"]' } },
  { ...at('t-job'), key: 't-job--courier-returned', title: 'Job — the courier is bringing it back', note: 'S-35: a failed delivery; Sarah picks a new window',
    setup: (S) => { const a = courierOut(S); S.setClock('2026-10-16T17:20'); S.T.courierFailed(a.id); },
    expect: { has: ['The courier is bringing it back · Sarah picks a new window'], sel: '[data-strip="warn"]' } },
  { ...at('t-job'), key: 't-job--card-failed', title: 'Job — payment issue on Sarah’s side', note: 'D-04: the charge failed at the handoff — the payout waits until she updates her card',
    setup: (S) => { cardFailed(S); },
    expect: { has: ['Payment issue on Sarah’s side · your payout is waiting until she updates her card'] } },
  { ...at('t-job'), key: 't-job--closed', title: 'Job — order closed, not collected', note: 'D-03: 30 days after the charge (she was paid at the charge)',
    setup: (S) => { S.driveTo('unclaimed'); S.advanceClock(A2_POLICY.ABANDONED_CLOSE_D * 24 * 60); },
    expect: { has: ['Order closed', `Not collected within ${A2_POLICY.ABANDONED_CLOSE_D} days of the charge`] } },
  { ...at('t-job'), key: 't-job--tailor-no-show-dispute', title: 'Were you there? (tailor)', note: 'D-14: “That’s not right” on Sarah’s no-show report',
    setup: (S) => { S.driveTo('tailor-no-show'); },
    click: ['[data-act="dispute"]'],
    expect: { has: ['Were you there?', 'Tell Taily you came.', 'Tell Taily'], sel: '[data-s="t-job--dispute"] [data-act="dp-ok"]' } },
  { ...at('t-job'), key: 't-job--no-show-disputed', title: 'Job — Sarah says she was there', note: 'D-14: your no-show pay is on hold while Taily looks into it',
    setup: (S) => { const a = S.driveTo('no-show'); S.T.disputeNoShow(a.id, 'customer'); },
    expect: { has: ['Marked as a no-show', 'Sarah says she was there. Your no-show pay is on hold while Taily looks into it.', NO_SHOW] } },
  { ...at('t-job'), key: 't-job--reminder-unarmed', title: 'Job — Sarah hasn’t confirmed, texts off', note: 'D-02: no delivered reminder, no auto-cancel',
    setup: (S) => { missedUnarmed(S); },
    expect: { has: ['Sarah hasn’t confirmed', `The visit is still on. If she cancels now, you keep her ${DEP} deposit. If she isn’t home, you’re paid ${NO_SHOW}.`], not: 'we cancel the visit' } },
];
export const FLOWS_t_suggest = [
  { ...at('t-suggest'), key: 't-suggest--move', title: 'Suggest a new time (confirmed visit)', note: 'D-12: the same wheel for a confirmed visit; Sarah accepts or keeps her time',
    setup: (S) => { const a = S.driveTo('confirmed'); S.state.ui['t-suggest'] = { mode: 'move', apptId: a.id }; S.state.ui.apptId = a.id; },
    expect: { has: ['Suggest a new time', 'Your visit with Sarah is Thu, Oct 15 · 5:00 PM.', 'She accepts it or keeps her time.', 'Ask Sarah'], sel: '[data-scheduler]' } },
];
