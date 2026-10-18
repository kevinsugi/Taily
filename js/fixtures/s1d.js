/* ============================================================
   Study-1 K-40 (T1) + K-37 Test-flows entries — the handoff time picker (the When row + the Scheduler sheet on c-ready, Change time on
   c-booking, the time on t-job / t-home) and the ways back without Home drop-off. Same shape as js/fixtures/m#.js; flows.js concatenates
   every FLOWS_* export. Setups compose driveTo + the real setHandoffSlot (pickHandoff) + setClock; money strings come from SCENARIOS.
   Re-pointed K-40 / K-37 keys live where they were (m2 to-returns, m3 c-booking--handoff-*, m4 c-ready* / t-job--handoff-*, s1a).
   ============================================================ */
import { SCENARIOS as D1_SC } from './money-scenarios.js';
import { fmtExact as D1_exact } from '../money.js';
import { pickHandoff as D1_pick, HANDOFF_MOVE as D1_MOVE } from './common.js';

const BAL = D1_exact(D1_SC.seed.balance);
const COURIER = D1_exact(D1_SC.courierQuote.cents);         // K-43 (D-299): the picked window's quote (Fri 5:00 PM, the evening peak)
const COURIER_OFF = D1_exact(D1_SC.courierOffPeak.cents);   // … and the first window's (10:30 AM, off-peak)
const LOBBY = 'If you’re not home, the courier leaves it in your building’s lobby.';
const CR = { screen: 'c-ready', group: 'M4 · Ready' };
const CB = { screen: 'c-booking', group: 'M4 · Bookings' };
const TJ = { screen: 't-job', group: 'M4 · Job' };

/* ---------- customer: c-ready — pick the time before the hold ---------- */
export const FLOWS_c_ready = [
  { ...CR, key: 'c-ready--pick-time', title: 'Pick a pickup time', note: 'K-40 T1: In-store pickup chosen, the When row opens the Scheduler in a sheet — only Amara’s open shop times, the next 7 days',
    setup: (S) => { const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'pickup'); },
    click: ['[data-act="pick-time"]'],
    expect: { has: ['Pick a pickup time', 'Reyes Tailoring · 312 Metropolitan Ave', 'PICKUP', 'Fri, Oct 16 · 10:00 AM', 'Only times Amara’s shop is open, in the next 7 days. You can change it later from your booking.', 'Use this time', 'Cancel'], sel: '[data-s="c-ready--pick-time"] [data-scheduler]', also: '[data-s="c-ready--pick-time"] [data-act="ht-ok"]' } },
  { ...CR, key: 'c-ready--time-picked', title: 'Pickup time picked', note: 'K-40 T1: the When row reads the time in ink with an ink ring; the bar says when; Hold is on',
    setup: (S) => { const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'pickup'); D1_pick(a.id); },
    expect: { has: ['Fri, Oct 16 · 5:30 PM', 'Pickup time · Amara has it ready then', 'Pickup Fri, Oct 16 · 5:30 PM · Free', `Hold ${BAL}`, `We’ll hold ${BAL} now`], not: ['Pick a pickup time first.', 'Pick a time'], sel: '.when-row.is-set', also: '[data-act="pay"]:not([disabled])' } },
  { ...CR, key: 'c-ready--courier-window', title: 'Pick a delivery window', note: 'K-40 T1 + K-43: Taily courier chosen — Day · Arrives wheel of 30-minute windows; that window’s own Uber price (it changes as she scrolls) and the collection time under it; a missed delivery is left in the lobby',
    setup: (S) => { const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'courier'); },
    click: ['[data-act="pick-time"]'],
    expect: { has: ['Pick a delivery window', 'Reyes Tailoring → 145 N 7th St, 2R · 0.6 mi', 'ARRIVES', 'Fri, Oct 16 · 10:30–11:00 AM', `Courier ${COURIER_OFF} · collects from Amara at 10:15 AM`, 'Each window has its own Uber price.', 'Taily books the courier to collect from Amara before your window.', LOBBY, 'Use this window'], not: COURIER, sel: '[data-s="c-ready--courier-window"] [data-scheduler]' } },
  { ...CR, key: 'c-ready--courier-picked', title: 'Delivery window picked', note: 'K-40 T1 + K-43: the window in the When row, the courier card (that window’s Uber quote + Taily fee, the lobby line) and the hold with the courier; Hold is on',
    setup: (S) => { const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'courier'); D1_pick(a.id); },
    expect: { has: ['Fri, Oct 16 · 5:00–5:30 PM', 'Delivery window · courier collects 4:45 PM', `${COURIER} · Uber to your door`, 'Uber quote', 'Taily courier fee', 'Courier · arrives Fri 5:00–5:30 PM', `Hold ${D1_exact(D1_SC.courier.balance)}`, `We’ll hold ${D1_exact(D1_SC.courier.balance)} now`, LOBBY], not: ['plus the courier fee', 'Uber, today', COURIER_OFF], sel: '.when-row.is-set', also: '[data-act="pay"]:not([disabled])' } },
];

/* ---------- customer: c-booking — the picked time, Change time, a missed pickup ---------- */
export const FLOWS_c_booking = [
  { ...CB, key: 'c-booking--change-time', title: 'Change pickup time', note: 'K-40 T1: Change time opens the same Scheduler sheet; Amara is told, the code stays',
    setup: (S) => { S.driveTo('awaiting-handoff'); },
    click: ['[data-act="change-time"]'],
    expect: { has: ['Change pickup time', 'Booked for Fri, Oct 16 · 5:30 PM', 'NEW TIME', 'Amara is told right away. Your pickup code stays the same.', 'Move my pickup', 'Keep current time'], sel: '[data-s="c-booking--change-time"] [data-scheduler]' } },
  { ...CB, key: 'c-booking--change-window', title: 'Change delivery window', note: 'K-40 T1 + K-43: the courier window moves with the same sheet, until an hour before the courier collects; the note prints the new window’s own quote (4:30 PM, off-peak)',
    setup: (S) => { S.driveTo('awaiting-handoff', { returnOption: 'courier' }); },
    click: ['[data-act="change-time"]'],
    expect: { has: ['Change delivery window', 'Arrives Fri, Oct 16 · 5:00–5:30 PM', 'NEW WINDOW', `Courier ${COURIER_OFF} · collects from Amara at`, 'The price is the new window’s quote', LOBBY, 'Move my delivery', 'Keep current window'], sel: '[data-s="c-booking--change-window"] [data-scheduler]' } },
  { ...CB, key: 'c-booking--time-moved', title: 'Pickup moved', note: 'K-40: after Sarah moved it — the new time leads, the old one under it',
    setup: (S) => { const a = S.driveTo('awaiting-handoff'); D1_pick(a.id, D1_MOVE.pickup); },
    expect: { has: ['Pickup Sat, Oct 17 · 2:00 PM · show your code at the shop', 'You moved it from Fri, Oct 16 · 5:30 PM', 'Open Sat 1:00 PM – 5:00 PM', 'Change time', 'YOUR PICKUP CODE'] } },
  { ...CB, key: 'c-booking--pickup-missed', title: 'Missed pickup', note: 'K-40 (D-295): the pickup time passed — no fee, she picks a new time; the 7-day clock keeps running from the hold',
    setup: (S) => { S.driveTo('awaiting-handoff'); S.setClock('2026-10-16T18:00'); },
    expect: { has: ['You missed your pickup at 5:30 PM · pick a new time', 'You missed this time. Pick a new one, no fee.', 'Pick a new time', 'On hold'], not: 'Change time', sel: '[data-strip="warn"]', also: '[data-act="change-time"]' } },
];

/* ---------- tailor: t-job — Sarah's time, only she can move it ---------- */
export const FLOWS_t_job = [
  { ...TJ, key: 't-job--pickup-moved', title: 'Job — Sarah moved her pickup', note: 'K-40 T1: the accent strip says the new time; the old one is on the row; Amara can only Message',
    setup: (S) => { const a = S.driveTo('awaiting-handoff'); D1_pick(a.id, D1_MOVE.pickup); },
    expect: { has: ['Sarah moved her pickup to Sat, Oct 17 · 2:00 PM', 'Sat, Oct 17 · 2:00 PM', 'Sarah moved it from Fri, Oct 16 · 5:30 PM', 'Only Sarah can change the time.', 'Message Sarah', 'Picked up'], not: 'Change time', sel: '[data-strip="action"]' } },
  { ...TJ, key: 't-job--pickup-missed', title: 'Job — Sarah missed her pickup', note: 'K-40 (D-295): no fee; she picks a new time; the 7-day clock keeps running',
    setup: (S) => { S.driveTo('awaiting-handoff'); S.setClock('2026-10-16T18:00'); },
    expect: { has: ['Sarah missed her 5:30 PM pickup · she picks a new time', 'Sarah missed this time. She picks a new one.', 'Picked up'], sel: '[data-strip="warn"]' } },
];
