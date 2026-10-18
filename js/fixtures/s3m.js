/* ============================================================
   Pre-MVP K-53, track M — Test-flows entries: the balance held at Ready (d2, Q5: a hold that fails → Update card; the ready text),
   the courier re-quoted at Pay (Q6: above what Taily absorbs → the new price first) and a pricier window after Pay charged on its own,
   the Taily fee page (to-fee — the ONLY screen with a percent), no-show = the deposit only (Q7), the admin Ledger (c7) and the free
   window's end text (D-383 follow-up).
   Same shape as js/fixtures/m#.js; flows.js concatenates every FLOWS_* export. Setups compose driveTo / onboardTo + the real
   transitions (T.*) + the real clock + sim knobs; money strings come from SCENARIOS / money.js through fmt*(), never typed.
   ============================================================ */
import { SCENARIOS as M3_SC, COURIER_WINDOW as M3_PEAK } from './money-scenarios.js';
import { fmtExact as M3_exact, courierQuote as M3_quote, cents as M3_cents, payoutFor as M3_payoutFor, feePercent as M3_pct, HOLD_DAYS as M3_HOLD_DAYS } from '../money.js';
import { MONEY as M3_MONEY } from '../money-config.js';
import { pickHandoff as M3_pick, toHoldEnd as M3_toHoldEnd, onboardTo as M3_onboardTo, handOver as M3_handOver, addRequest as M3_addRequest } from './common.js';
import { freeUntil as M3_freeUntil } from '../state.js';
import { DECLINE_REASONS as M3_DECLINE } from '../data.js';

const G = 'K-53 · Money: hold at Ready, fee, ledger';
const at = (screen) => ({ screen, group: G });
const BAL = M3_exact(M3_SC.seed.balance);
const DEP = M3_exact(M3_SC.seed.deposit);
/** An off-peak courier window (Fri, Oct 16 · 4:30–5:00 PM, $10.45 on the seed) and the peak one the fixtures move to (5:00 PM, $14.30). */
const OFFPEAK = '2026-10-16T16:30';
const OFF = M3_quote(0.6, OFFPEAK).cents;
const PEAK = M3_SC.courierQuote.cents;
/** Q6: how far Uber's live price moved at Pay in the two courier states — inside what Taily absorbs, and above it (cents). */
const ABSORBED_DRIFT = 200;
const REPRICED_DRIFT = 500;
const repriced = M3_quote(0.6, M3_PEAK, { drift: REPRICED_DRIFT }).cents;
const absorbed = M3_quote(0.6, OFFPEAK, { drift: ABSORBED_DRIFT }).cents - OFF;

/** The seed job marked ready while her card declines: the hold placed at ready fails (K-53). */
function holdFailed(S) {
  const a = S.driveTo('in-progress');
  S.state.sim.card = 'declined';
  S.T.markReady(a.id);
  return a;
}
/** Courier chosen at an off-peak window and paid (`drift` = Uber's live price at Pay, Q6). */
function courierPaid(S, { at: when = OFFPEAK, drift = 0 } = {}) {
  const a = S.driveTo('ready');
  S.T.chooseReturn(a.id, 'courier');
  M3_pick(a.id, when);
  S.state.sim.courierDrift = drift;
  S.T.holdBalance(a.id, 'visa-4242');
  S.state.sim.courierDrift = 0;
  return a;
}
/** …then moved to the peak window after Pay: the difference is its own courier charge (the hold can't be raised). */
function courierPricier(S) {
  const a = courierPaid(S);
  S.T.setHandoffSlot(a.id, M3_PEAK);
  return a;
}
/** The Ledger demo: a completed pickup job (deposit, the balance held at ready, captured at pickup, the Taily fee, the payout — paid on
    Friday) and a second request Amara declined (a deposit hold, released). */
function ledgerDemo(S) {
  S.driveTo('completed');
  const b = M3_addRequest();
  S.T.tailorDecline(b.id, M3_DECLINE[0]);
  S.setClock('2026-10-16T18:00');
  S.T.settlePayouts();
  return b;
}

/* ---------- c-ready: the hold placed at Ready ---------- */
export const FLOWS_c_ready = [
  { ...at('c-ready'), key: 'c-ready--hold-failed', title: 'Ready — the card declined the hold', note: 'K-53 (d2): the balance hold Taily places at Ready didn’t go through — Update card (Pay with another card places the hold); nothing was charged',
    setup: (S) => { holdFailed(S); },
    expect: { has: ['Update your card', `We couldn’t hold the ${BAL} balance on your Visa •••• 4242. Nothing was charged. Pay with another card to get your order.`, 'Update card', `You’ll be charged ${BAL} when you get your garments.`], not: ['We’re holding'], sel: '[data-hold-failed] [data-act="pay"]' } },
  { ...at('c-ready'), key: 'c-ready--courier-repriced', title: 'Courier — the price changed at Pay', note: 'K-53 (Q6): re-quoted when she tapped Pay; Uber’s price rose more than the $3.00 Taily absorbs, so she sees the new price before anything is booked',
    setup: (S) => { const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'courier'); M3_pick(a.id); S.state.sim.courierDrift = REPRICED_DRIFT; S.T.holdBalance(a.id, 'visa-4242'); },
    expect: { has: ['The courier price changed', `Uber’s price for your window is now ${M3_exact(repriced)}, up from ${M3_exact(PEAK)}. Pay again to confirm, or pick another window.`, `Pay ${M3_exact(M3_SC.seed.balance + repriced)}`], sel: '[data-repriced]' } },
  { ...at('c-ready'), key: 'c-ready--text', title: 'Ready — the text', note: 'K-53: C27 says the balance is on hold on her card and the day to choose by (the hold’s last day)',
    setup: (S) => { S.driveTo('ready'); S.sim.texts = 'on'; },
    expect: { has: [`Your order from Amara is ready. We’re holding ${BAL} on your Visa. Choose pickup or delivery by Mon, Oct 19 · 5:00 PM, then pay:`], sel: '.text-banner' } },
];

/* ---------- c-booking: a pricier window after Pay, the default to pickup, the free window's end ---------- */
export const FLOWS_c_booking = [
  { ...at('c-booking'), key: 'c-booking--courier-pricier', title: 'Courier moved to a pricier window', note: 'K-53 (Q6): after Pay the hold can’t be raised — the window change is charged now, on its own; the payment line is what is still to capture',
    setup: (S) => { courierPricier(S); },
    expect: { has: [`Window change ${M3_exact(PEAK - OFF)} · charged Thu, Oct 15`, 'Courier booked · arrives Fri, Oct 16 · 5:00–5:30 PM', M3_exact(M3_SC.seed.balance + OFF)], sel: '.visit-row--courier' } },
  { ...at('c-booking'), key: 'c-booking--free-window-closed', title: 'Free window closed — the text', note: 'K-53 (D-383 follow-up): confirming no longer ends the free window; at its end (24 h before) she hasn’t confirmed, so one text says so before the 3 h auto-cancel',
    setup: (S) => { const a = S.driveTo('confirmed'); S.advanceClock(Math.round((M3_freeUntil(a) - S.state.clock.now) / 60000) + 1); S.sim.texts = 'on'; },
    expect: { has: ['Your free change window for your 5:00 PM visit with Amara has closed. Confirm now so it isn’t cancelled:', 'Confirm by 2:00 PM or we’ll cancel the visit'], sel: '.text-banner' } },
];

/* ---------- t-job: the hold at Ready from Amara's side, the default to pickup ---------- */
export const FLOWS_t_job = [
  { ...at('t-job'), key: 't-job--ready-hold-failed', title: 'Job — ready, Sarah’s card declined the hold', note: 'K-53 (d2): we asked her to update her card; the hold’s last day still applies',
    setup: (S) => { holdFailed(S); },
    expect: { has: [`Sarah’s card didn’t go through for her ${BAL} balance. We asked her to update it.`, 'She chooses by Mon, Oct 19 · 5:00 PM.'], sel: '[data-ready-hold]' } },
  { ...at('t-job'), key: 't-job--defaulted', title: 'Job — not chosen in 4 days: charged, in-store pickup', note: 'K-53 (was D-03’s 14 days): the hold’s last day — her balance was charged anyway, it was set to in-store pickup, and the payout goes out now',
    setup: (S) => { const a = S.driveTo('ready'); M3_toHoldEnd(a.id); },
    expect: { has: [`Sarah didn’t choose in ${M3_HOLD_DAYS} days, so we charged her ${BAL} and set it to in-store pickup. Your payout is on its way (Fri, Oct 23).`, 'Keep her order until'], sel: '[data-unclaimed]' } },
];

/* ---------- c-receipt: the window change on the receipt ---------- */
export const FLOWS_c_receipt = [
  { ...at('c-receipt'), key: 'c-receipt--courier-change', title: 'Receipt — a courier window change', note: 'K-53 (Q6): the pricier window after Pay is its own charge on the receipt',
    setup: (S) => { const a = courierPricier(S); S.setClock('2026-10-16T17:12'); M3_handOver(a.id, 'courier'); S.state.ui.apptId = a.id; },
    expect: { has: ['Courier window change', M3_exact(PEAK - OFF), 'Balance', M3_exact(M3_SC.seed.balance + OFF)], sel: '[data-money]' } },
];

/* ---------- to-fee: the Taily fee explained (the only percent) ---------- */
export const FLOWS_to_fee = [
  { screen: 'to-fee', group: G, key: 'to-fee', title: 'The Taily fee', note: 'K-53: step 2 opens on the fee — what Taily’s share covers (Insurance · Operations · Scheduling · Clientele · Hosting, and more) with a worked dollar example; the ONLY screen that shows the rate as a percent',
    setup: () => { M3_onboardTo('services'); },
    expect: { has: ['Step 2 of 6', 'The Taily fee', `Taily’s ${M3_pct()}% covers:`, 'Insurance', 'Operations', 'Scheduling', 'Clientele', 'Hosting', 'And more', `On a ${M3_exact(M3_cents(M3_MONEY.FEE_EXAMPLE_SERVICES))} job you keep ${M3_exact(M3_payoutFor({ services: M3_cents(M3_MONEY.FEE_EXAMPLE_SERVICES) }))}.`, 'Next'], sel: '[data-fee-rate]' } },
  { screen: 'to-fee', group: G, key: 'to-fee--shop', title: 'The Taily fee — from Services and prices', note: 'K-53: a live tailor opens it from Services and prices (What the fee covers): Shop chrome and Back, no stepper',
    expect: { has: ['The Taily fee', `Taily’s ${M3_pct()}% covers:`, 'Hosting'], not: ['Step 2 of 6', 'Finish later'], sel: '[data-fee-rate]' } },
];

/* ---------- a-ledger: the admin Ledger (c7) ---------- */
export const FLOWS_a_ledger = [
  { screen: 'a-ledger', group: G, key: 'a-ledger', title: 'Ledger', note: 'K-53 (c7): every money event, newest first, grouped by day, with totals — a completed pickup job (deposit, the balance held at ready, captured at pickup, the Taily fee, the payout paid on Friday) and a declined request (its deposit hold released)',
    setup: (S) => { ledgerDemo(S); },
    expect: { has: ['Ledger', 'TOTALS', 'Taily revenue', 'Deposit hold', 'Deposit hold released', 'Balance hold', 'placed at ready', 'Balance captured', 'Taily fee', M3_exact(M3_SC.seed.tailyFee), 'Payout sent', 'QuickBooks Online or Xero', 'Test flows', 'Sign out'], sel: '[data-totals]', also: '[data-admin-tools] [data-act="admin-sign-out"]' } },   // the L + M merge: his tools row on both admin tabs
  { screen: 'a-ledger', group: G, key: 'a-ledger--empty', title: 'Ledger — nothing yet', note: 'K-53 (c7): no request sent, no money moved',
    expect: { has: ['No money yet', 'QuickBooks Online or Xero'], sel: '[data-empty="ledger"]' } },
  { screen: 'a-ledger', group: G, key: 'a-ledger--order', title: 'Ledger — one order', note: 'K-53 (c7): filtered to the declined request — its hold and the release; the totals follow',
    setup: (S) => { const b = ledgerDemo(S); S.state.ui['a-ledger'] = { day: '', apptId: b.id, person: '' }; },
    expect: { has: ['Deposit hold', 'Deposit hold released', DEP], not: ['Balance captured', 'Payout sent'], sel: '[data-chip-group="order"] [aria-checked="true"]:not([data-value=""])' } },
  { screen: 'a-ledger', group: G, key: 'a-ledger--day', title: 'Ledger — one day', note: 'K-53 (c7): filtered to Friday — the payout run',
    setup: (S) => { ledgerDemo(S); S.state.ui['a-ledger'] = { day: '2026-10-16', apptId: '', person: '' }; },
    expect: { has: ['Payout sent', M3_exact(M3_SC.seed.payout)], not: ['Balance captured', 'Deposit hold released'], sel: '[data-chip-group="day"] [data-value="2026-10-16"][aria-checked="true"]' } },
  { screen: 'a-ledger', group: G, key: 'a-ledger--person', title: 'Ledger — one person', note: 'K-53 (c7): filtered to Amara — everything that touched her jobs',
    setup: (S) => { ledgerDemo(S); S.state.ui['a-ledger'] = { day: '', apptId: '', person: 'tailor:amara' }; },
    expect: { has: ['Balance captured', 'Payout sent'], sel: '[data-chip-group="person"] [data-value="tailor:amara"][aria-checked="true"]' } },
  { screen: 'a-ledger', group: G, key: 'a-ledger--courier', title: 'Ledger — a courier job', note: 'K-53 (Q6): Uber’s price at Pay rose a little; Taily absorbed it — the Uber pass-through, Taily’s courier fee and the absorbed difference each get a line',
    setup: (S) => { const a = courierPaid(S, { drift: ABSORBED_DRIFT }); S.setClock('2026-10-16T16:45'); M3_handOver(a.id, 'courier'); },
    expect: { has: ['Courier hold', 'Courier, paid to Uber', 'Taily courier fee', 'Courier difference absorbed by Taily', `−${M3_exact(absorbed)}`], sel: '[data-totals]' } },
  { screen: 'a-ledger', group: G, key: 'a-ledger--no-show', title: 'Ledger — a no-show', note: 'K-53 (Q7): the tailor keeps the deposit only — no floor, Taily never tops up',
    setup: (S) => { S.driveTo('no-show'); },
    expect: { has: ['Deposit kept by the tailor', 'no-show pay', DEP], sel: '[data-totals]' } },
];

