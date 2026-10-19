/* ============================================================
   K-54 happy-path review fixes (docs/v5/PRE-MVP-COVERAGE.md "Happy-path review"; D-450…D-464) — B1 a second booking lands on the NEW
   request, B2 the admin's Verifications (+ the Demo action "Checks come back"), F1 Home leads with the booking's next step, F2 the review
   prompt right after the handoff, F3 Book again starts a fresh need-by, F5 the Friday payout run + every later Friday on Earnings, F8 a
   tailor's sign-out lands on Log in, F9 Pay confirms on the held card, F10 the job after Handed to courier, P1 a new account starts empty,
   P4 / P8 the Home row's words, P7 the preview never prices a rush, P10 the reminder's real cut-off, P11 Taily's courier / partial refunds.
   Same shape as js/fixtures/m#.js; flows.js concatenates every FLOWS_* export. Setups compose driveTo / onboardTo / the real transitions
   (T.*, account.js, account-ui's signOutTo) + sim knobs + screen-local UI (state.ui); money strings come from money.js / SCENARIOS.
   ============================================================ */
import { SCENARIOS as R_SC, SECOND_SLOT_AFTER as R_SECOND, PAYOUT_DAYS as R_PAYDAYS } from './money-scenarios.js';
import { fmt as R_fmt, fmtExact as R_exact } from '../money.js';
import { onboardTo as R_onboardTo, completeJob as R_completeJob, addRequest as R_addRequest, draftAgain as R_draftAgain, pickHandoff as R_pickHandoff } from './common.js';
import { setFocus as R_setFocus } from '../focus.js';
import { nextOpening as R_nextOpening, reminderAt as R_reminderAt, payoutRunAt as R_runAt } from '../state.js';
import { signOutTo as R_signOutTo } from '../account-ui.js';
import * as R_A from '../account.js';

const G = 'K-54 · happy-path review fixes';
const at = (screen) => ({ screen, group: G });
const NEW_NUMBER = '(917) 555-0186';

/** P1: a brand-new customer — phone, code, names (the real sign-up path). */
function newCustomer(S) {
  R_A.signOut();
  R_A.sendCode(NEW_NUMBER);
  R_A.verifyCode('123456');
  R_A.saveName({ first: 'Maya', last: 'Lin' });
}
/** B1: a finished order with Amara, opened from Bookings, then Book Amara again → a one-item order → Reserve. c-pay names the new request
    (setFocus) the way its sent() does; the old order is the one she had open. */
function secondBooking(S) {
  const first = S.driveTo('completed');
  R_setFocus(first.id);
  S.setClock('2026-10-20T10:00');
  S.T.bookAgain(first.id);
  const g = S.T.addGarment('Suit Pant').garment;
  S.T.setServices(g.id, ['hem-pants']);
  const slot = R_nextOpening('amara', S.state.job.visitType, { until: S.state.job.needBy });
  const res = S.T.requestBooking({ tailorId: 'amara', slotStart: slot, cardId: 'visa-4242' });
  R_setFocus(res.appt.id);
  return { first, second: res.appt };
}
/** A completed courier order with a Help case on it (P11: the courier charge is what she asks about). */
function courierCase(S) {
  const a = S.driveTo('completed', { returnOption: 'courier' });
  const c = S.T.openCase({ who: 'customer', apptId: a.id, topic: null, text: 'Why was I charged for the courier? It came late.' }).case;
  S.state.ui['a-case'] = { caseId: c.id };
  return { a, c };
}

/* ---------- B1: Reserve on a second booking lands on the NEW request ---------- */
export const FLOWS_c_request = [
  { ...at('c-request'), key: 'c-request--second', title: 'Request sent — a second booking with Amara',
    note: 'K-54 B1 (D-450): Book Amara again → Reserve; the old order was the one open, but c-pay names the new request, so this is it (one item)',
    setup: (S) => { secondBooking(S); },
    expect: { has: ['Waiting for Amara', 'Thu, Oct 22 · 5:00 PM', '1 item · 1 service'], not: ['Thu, Oct 15', 'All done'] } },
];

/* ---------- F1 / P4 / F2 / P8 / P1: Home ---------- */
export const FLOWS_c_job = [
  { ...at('c-job'), key: 'c-job--next-ready', title: 'Home — the order is ready (its next step leads)',
    note: 'K-54 F1 (D-454): the booking’s own full-width primary (Choose a way back), no disabled “Next” bar while the draft is empty; P4: “Ready since …” at the shop, not the visit facts',
    setup: (S) => { S.driveTo('ready'); },
    expect: { has: ['Choose a way back', 'Ready since Thu, Oct 15', 'At Reyes Tailoring', 'BOOK SOMETHING ELSE', 'What needs work?'], not: ['Add at least one garment to continue.', 'At my place'], sel: '[data-appt-next] .cta[data-act="open-appt"]' } },
  { ...at('c-job'), key: 'c-job--next-approve', title: 'Home — approve the final order (its next step leads)',
    note: 'K-54 F1: Review and approve is the one primary; the empty draft’s bar comes back with the first garment',
    setup: (S) => { S.driveTo('price-change'); },
    expect: { has: ['Review and approve', 'Approve order'], not: 'Add at least one garment to continue.', sel: '[data-appt-next] .cta[data-act="open-appt"]' } },
  { ...at('c-job'), key: 'c-job--review-prompt', title: 'Home — right after the handoff: How did Amara do?',
    note: 'K-54 F2 (D-455): the review card asks at once (not only 7 days later); ✕ puts it away, the 7-day reminder still comes',
    setup: (S) => { S.driveTo('completed'); },
    expect: { has: ['How did Amara do?', 'Your order came back on Thu, Oct 15. Your review helps other customers.'], not: 'Add at least one garment to continue.', sel: '[data-act="review-reminder"]' } },
  { ...at('c-job'), key: 'c-job--visit-here', title: 'Home — Amara is at the door',
    note: 'K-54 P8 (D-461): the row says where she is (“Amara is here”), not “Confirmed”',
    setup: (S) => { const a = S.driveTo('confirmed'); S.setClock('2026-10-15T16:55'); S.T.visitPing(a.id, 'tailor', 'here'); },
    expect: { has: 'Amara is here', not: 'Confirmed' } },
  { ...at('c-job'), key: 'c-job--new-account', title: 'Home — a brand-new account',
    note: 'K-54 P1 (D-460): a new number starts empty — no sample order, address or card (Where and when asks for the address, Review and send for a card)',
    setup: (S) => { newCustomer(S); },
    expect: { has: ['What needs work?', 'Tap a garment to add it.', 'Add at least one garment to continue.'], not: ['Your items', 'YOUR ITEMS', '2 items'] } },
];

/* ---------- P1: the address, then the card, asked in the flow ---------- */
export const FLOWS_c_where = [
  { ...at('c-where'), key: 'c-where--new-account', title: 'Where and when — a new account adds her address',
    note: 'K-54 P1: no saved address yet — the card asks for it',
    setup: (S) => { newCustomer(S); const g = S.T.addGarment('Suit Pant').garment; S.T.setServices(g.id, ['hem-pants']); },
    expect: { has: ['Add your address'], not: '145 N 7th St', sel: '[data-act="edit-address"]' } },
  { ...at('c-where'), key: 'c-where--book-again', title: 'Where and when — Book again starts a fresh need-by',
    note: 'K-54 F3 (D-453): Book Amara again on Tue, Oct 20 — the need-by is ten days out (Fri, Oct 30), not the old order’s Fri, Oct 23 (no rush fee)',
    setup: (S) => { const a = S.driveTo('completed'); S.setClock('2026-10-20T10:00'); S.T.bookAgain(a.id); const g = S.T.addGarment('Suit Pant').garment; S.T.setServices(g.id, ['hem-pants']); },
    expect: { has: 'Fri, Oct 30', not: ['Fri, Oct 23', 'Rush'] } },
];
export const FLOWS_c_pay = [
  { ...at('c-pay'), key: 'c-pay--no-card', title: 'Review and send — a new account adds a card',
    note: 'K-54 P1 (D-460): no card yet — “Add a card” under Pay with; Reserve opens the card form, then reserves',
    setup: (S) => {
      newCustomer(S);
      const g = S.T.addGarment('Suit Pant').garment; S.T.setServices(g.id, ['hem-pants']);
      S.T.setJobAddress({ street: '88 Berry St', unit: '3A', zip: '11211', notes: '' });
      S.state.ui.booking = { tailorId: 'amara', slot: R_nextOpening('amara', 'home', { until: S.state.job.needBy }) };
    },
    expect: { has: ['Add a card', 'We hold the deposit on it when you reserve', 'Reserve ·'], not: 'Visa •••• 4242', sel: '[data-no-card] [data-act="add-card"]' } },
  { ...at('c-pay'), key: 'c-pay--no-card-sheet', title: 'Review and send — Reserve with no card opens the card form',
    note: 'K-54 P1: the same sheet as Pay with → Add a card; Save card goes on to reserve',
    setup: (S) => {
      newCustomer(S);
      const g = S.T.addGarment('Suit Pant').garment; S.T.setServices(g.id, ['hem-pants']);
      S.T.setJobAddress({ street: '88 Berry St', unit: '3A', zip: '11211', notes: '' });
      S.state.ui.booking = { tailorId: 'amara', slot: R_nextOpening('amara', 'home', { until: S.state.job.needBy }) };
    },
    click: ['.action-bar [data-act="pay"]'],
    expect: { has: ['Add a card', 'Card number', 'Save card'], sel: '[data-s="c-pay--add-card"] #cc-number' } },
];

/* ---------- F9: Pay confirms on the held card ---------- */
export const FLOWS_c_ready = [
  { ...at('c-ready'), key: 'c-ready--pay-direct', title: 'Ready — Pay confirms on the card holding it',
    note: 'K-54 F9 (D-456): “Pay with Visa •••• 4242 · Change” above the bar; Pay is one tap (no second Pay in a sheet); Change opens the sheet',
    setup: (S) => { const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'pickup'); R_pickHandoff(a.id); },
    get expect() { return { has: ['Pay with', 'Visa •••• 4242', 'Change', `Pay ${R_exact(R_SC.seed.balance)}`, 'Charged at pickup'], sel: '[data-pay-with] [data-act="pay-change"]', also: '.action-bar [data-act="pay"]' }; } },
  { ...at('c-ready'), key: 'c-ready--paying', title: 'Ready — paying (one tap)',
    note: 'K-54 F9: the bar is busy while it confirms; no sheet opens',
    setup: (S) => { const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'pickup'); R_pickHandoff(a.id); S.sim.latency = 'hold'; },
    click: ['.action-bar [data-act="pay"]'],
    expect: { has: 'Paying…', not: 'Pay the balance', sel: '.action-bar [data-act="pay"][aria-busy="true"]' } },
];

/* ---------- P8 / P10: the booking ---------- */
export const FLOWS_c_booking = [
  { ...at('c-booking'), key: 'c-booking--visit-here', title: 'Booking — Amara is here',
    note: 'K-54 P8 (D-461): once she tapped I’m here, no “Your visit is at 5:00 PM” footer under the price',
    setup: (S) => { const a = S.driveTo('confirmed'); S.setClock('2026-10-15T16:55'); S.T.visitPing(a.id, 'tailor', 'here'); },
    expect: { has: ['Amara is here', '4:55 PM'], not: ['Your visit is at', 'Free cancellation until'] } },
  { ...at('c-booking'), key: 'c-booking--reminder-cutoff', title: 'Booking — please confirm, and the real cut-off',
    note: 'K-54 P10 (D-462): at the 48 h reminder the strip leads with when an unconfirmed visit is cancelled (3 hours before), then the free window',
    setup: (S) => { const a = S.driveTo('confirmed'); S.advanceClock(Math.round((R_reminderAt(a) - S.state.clock.now) / 60000)); },
    expect: { has: ['Confirm by Thu 2:00 PM', 'Free until 5:00 PM tomorrow', 'If it isn’t confirmed by Thu, Oct 15 · 2:00 PM, we cancel it. Free to change or cancel until Wed, Oct 14 · 5:00 PM.'], sel: '.action-bar [data-act="confirm-visit"]' } },
];

/* ---------- F10: the job after Handed to courier ---------- */
export const FLOWS_t_job = [
  { ...at('t-job'), key: 't-job--handed-courier', title: 'Job — handed to the courier',
    note: 'K-54 F10 (D-458): the block says when it went and when it arrives — no “have it packaged”, no “only she can change it”, no last-day line',
    setup: (S) => { const a = S.driveTo('awaiting-handoff', { returnOption: 'courier' }); S.setClock('2026-10-16T16:45'); S.T.courierCollected(a.id); },
    expect: { has: ['Handed to the courier 4:45 PM', 'Arrives at Sarah’s 5:00–5:30 PM'], not: ['Have it packaged', 'Only she can change it', 'we charge her'] } },
];

/* ---------- F5: the Friday payout run, every later Friday ---------- */
export const FLOWS_t_earnings = [
  { ...at('t-earnings'), key: 't-earnings--friday-run', title: 'Earnings — the Friday run went out',
    note: 'K-54 F5 (D-452): the clock crossed Fri, Oct 16 · 9:00 AM — the payout is paid (T35 texted), no “Arrives” left',
    setup: (S) => { S.driveTo('completed'); S.advanceClock(Math.round((R_runAt(R_PAYDAYS.first) - S.state.clock.now) / 60000) + 60); },
    get expect() { return { has: ['PAID', 'Fri, Oct 16', 'Paid to Chase •••• 6789', R_exact(R_SC.seed.payout)], not: 'Arrives Fri, Oct 16' }; } },
  { ...at('t-earnings'), key: 't-earnings--later', title: 'Earnings — two Fridays waiting',
    note: 'K-54 F5: payouts paused by the partner, two jobs done — the next Friday AND the one after are listed (After that)',
    setup: (S) => {
      const a = S.driveTo('completed');
      S.T.pausePayouts();
      R_draftAgain(); S.T.setJob({ visitType: 'shop' });
      const b = R_addRequest({ accept: true, after: R_SECOND });
      R_completeJob(b.id);
      return a;
    },
    get expect() { return { has: ['NEXT PAYOUT', 'AFTER THAT', 'Fri, Oct 23', 'Waits until payouts are back on'], sel: '[data-later]' }; } },
];

/* ---------- F8: a tailor's sign-out lands on Log in ---------- */
export const FLOWS_t_phone = [
  { ...at('t-phone'), key: 't-phone--signed-out', title: 'Tailor — after Sign out',
    note: 'K-54 F8 (D-457): Shop → Sign out lands here in the Log in mode (Welcome back), not the Join pitch',
    setup: () => { R_signOutTo('tailor'); },
    expect: { has: ['Welcome back', 'Log in to your shop with your mobile number.'], not: 'Get booked by customers nearby', sel: '[data-mode="login"] #phone' } },
];

/* ---------- P7: the preview never prices a rush ---------- */
export const FLOWS_t_shop = [
  { ...at('t-shop'), key: 't-shop--preview-no-rush', title: 'Your shop — the preview a week later',
    note: 'K-54 P7 (D-464): on Tue, Oct 20 the old draft date (Fri, Oct 23) is close — the preview still prices no rush fee',
    setup: (S) => { S.driveTo('requested'); S.setClock('2026-10-20T10:00'); },
    get expect() { return { has: ['WHAT CUSTOMERS SEE', R_fmt(R_SC.seed.total)], not: R_fmt(R_SC.rush.total) }; } },
  { ...at('t-shop'), key: 't-shop--years-asked', title: 'Your shop — Taily asked about her years',
    note: 'K-54 B2 (D-451): the admin’s Needs info on Years tailoring — the row says so and opens her profile; the text went out',
    setup: (S) => { R_onboardTo('submitted'); S.T.reviewCheck('years', 'needs-info'); },
    expect: { has: ['Years tailoring', 'We need a few more details. Check your texts'], sel: '[data-act="check-years"]' } },
];

/* ---------- B2: the admin's Verifications ---------- */
export const FLOWS_a_verifications = [
  { ...at('a-verifications'), key: 'a-verifications', title: 'Verifications — a new tailor under review',
    note: 'K-54 B2 (D-451): the four checks in the order they run; ID and payout to review, years from her profile, the background check waits for the other three',
    setup: () => { R_onboardTo('submitted'); },
    expect: { has: ['Verifications', 'Amara Reyes', '1 of 4 passed', 'ID and profile photo', 'Photo ID and profile photo in. Match them.', 'Years tailoring', 'Payout and tax info', 'Payments partner: checking her details', 'Background check', 'Runs last, once the other three pass', 'Pass', 'Needs info'], sel: '[data-check-row="id"] [data-act="check-pass"]', also: '[data-admin-tools]' } },
  { ...at('a-verifications'), key: 'a-verifications--ask', title: 'Verifications — ask her for more',
    note: 'K-54 B2: Needs info quotes the text she gets (check-action-needed) before it goes',
    setup: () => { R_onboardTo('submitted'); },
    click: ['[data-check-row="id"] [data-act="check-ask"]'],
    expect: { has: ['Ask Amara for more?', 'We need one more thing to verify you: your ID and profile photo.', 'Ask for more'], sel: '[data-s="a-verifications--ask"] [data-act="cs-ok"]' } },
  { ...at('a-verifications'), key: 'a-verifications--asked', title: 'Verifications — waiting on her',
    note: 'K-54 B2: ID asked again (Needs info) — Pass stays open for when it comes back',
    setup: (S) => { R_onboardTo('submitted'); S.T.reviewCheck('id', 'needs-info'); },
    expect: { has: ['Asked her to add them again.', 'Needs info'], sel: '[data-check-row="id"][data-state="needs-info"]' } },
  { ...at('a-verifications'), key: 'a-verifications--background', title: 'Verifications — approved, background check next',
    note: 'K-54 B2: ID and payout passed — the background check is the one left (it runs last); its Pass takes her live',
    setup: (S) => { R_onboardTo('submitted'); S.T.reviewCheck('id', 'verified'); S.T.reviewCheck('payout', 'verified'); },
    expect: { has: ['3 of 4 passed', 'Report is in.'], not: 'Runs last', sel: '[data-check-row="background"] [data-act="check-pass"]' } },
  { ...at('a-verifications'), key: 'a-verifications--empty', title: 'Verifications — no one waiting',
    note: 'K-54 B2: the seed — Amara is verified and listed',
    expect: { has: ['No one waiting', 'VERIFIED', 'Amara Reyes', 'All 4 checks passed', 'Listed'] } },
];

/* ---------- P11: Taily's refunds on a-case ---------- */
export const FLOWS_a_case = [
  { ...at('a-case'), key: 'a-case--courier-refund', title: 'Case — refund the courier, or part of it',
    note: 'K-54 P11 (D-463): a completed courier order — “Refund the courier” and “Refund part of it” (an amount); Taily pays, the payout doesn’t change',
    setup: (S) => { courierCase(S); },
    get expect() { return { has: [`Refund the courier ${R_exact(R_SC.courier.courier)}`, 'Refund part of it', `Up to ${R_exact(R_SC.courier.total)} · Taily pays it`], sel: '[data-kind="refund-courier"]' }; } },
  { ...at('a-case'), key: 'a-case--partial', title: 'Case — refund part of it (the amount)',
    note: 'K-54 P11: the amount sheet — said next to the field when it is more than she paid',
    setup: (S) => { courierCase(S); },
    click: ['[data-kind="refund-partial"]'],
    get expect() { return { has: ['Refund part of it', 'Amount to refund', `Up to ${R_exact(R_SC.courier.total)}.`, 'Refund'], sel: '[data-s="a-case--partial"] #refund-amount' }; } },
  { ...at('a-case'), key: 'a-case--courier-refunded', title: 'Case — the courier refunded',
    note: 'K-54 P11: done; the partial refund now offers what is left',
    setup: (S) => { const { c } = courierCase(S); S.T.adminRefundCourier(c.id); },
    get expect() { return { has: ['Refund part of it', `Up to ${R_exact(R_SC.courier.total - R_SC.courier.courier)} · Taily pays it`], not: 'Refund the courier' }; } },
];

/* ---------- P11 on the receipt ---------- */
export const FLOWS_c_receipt = [
  { ...at('c-receipt'), key: 'c-receipt--taily-refund', title: 'Receipt — Taily refunded the courier',
    note: 'K-54 P11: the refund is on her receipt, and Paid drops by it',
    setup: (S) => { const { a, c } = courierCase(S); S.T.adminRefundCourier(c.id); R_setFocus(a.id); },
    get expect() { return { has: ['Courier refunded by Taily', `−${R_exact(R_SC.courier.courier)}`] }; } },
];
