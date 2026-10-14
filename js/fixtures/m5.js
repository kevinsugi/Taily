/* ============================================================
   M5 Test-flows entries — one array per screen (pre-scaffolded in M0).
   Each screen builder edits only its own FLOWS_<screen_id> array.
   Entry shape: see docs/v5/CONTEXT.md (FLOWS / EXPECT contract).
   ============================================================ */

/* ---------- C1 · Customer messaging (c-thread, c-messages) ---------- */
import { CHAT as CM_CHAT, askAmara as CM_askAmara } from './common.js';
import { SEED_SLOT as CM_SLOT } from './money-scenarios.js';
import { fmtWhen as CM_fmtWhen } from '../dates.js';
import { CUSTOMER as CM_CUSTOMER } from '../data.js';

const CM_GROUP = 'M5 · Messages';
/** Booked conversation: Sarah asked, Amara answered, Sarah booked, Amara accepted — and Sarah has read her reply (so exactly
    the closing line is unread). Real transitions only. */
const CM_booked = (S) => {
  S.driveTo('confirmed', { ask: true });
  S.T.markThreadRead('amara', 'customer');
};
/** The last eight characters of Sarah's phone ("555-0142"): must never show in the thread, only "phone hidden". */
const CM_PHONE_TAIL = CM_CUSTOMER.phone.slice(-8);
/* ---------- C2 · Tailor messaging (t-thread, t-messages) — own helpers, prefixed TM_ ---------- */
import { CHAT as TM_CHAT, askAmara as TM_askAmara } from './common.js';
import { AMARA as TM_AMARA } from './money-scenarios.js';


/* ---------- C4 · Earnings + system (t-earnings, t-payout, sys-*) — own helpers, prefixed TE_.
   Namespace imports: the earnings fixtures (earningsTo) and PAYOUT_DAYS come from the model builder's common.js /
   money-scenarios.js (M5-spec §A7). ---------- */
import * as TE_C from './common.js';
import * as TE_M from './money-scenarios.js';
import { setFocus as TE_setFocus } from '../focus.js';
import { fmtExact as TE_exact, fmtNeg as TE_neg } from '../money.js';
import { fmtDay as TE_day } from '../dates.js';
import { POLICY as TE_POLICY } from '../money-config.js';
import { CUSTOMER as TE_CUSTOMER } from '../data.js';

const TE_SC = () => TE_M.SCENARIOS;
const TE_DAYS = () => TE_M.PAYOUT_DAYS;
const TE_bank = () => `${TE_M.AMARA.payouts.bank} ••${TE_M.AMARA.payouts.last4}`;
const TE_first = (S) => { TE_setFocus(S.state.appts[0].id); };   // the payout of the first appointment

export const FLOWS_t_earnings = [
  { key: 't-earnings', screen: 't-earnings', group: 'M5 · Earnings', title: 'Earnings', note: 'Next payout on the second Friday, the first Friday paid; every amount after the Taily fee',
    setup: () => { TE_C.earningsTo('paid'); },
    get expect() {
      return { has: ['Earnings', TE_exact(TE_SC().shop.payout), TE_day(TE_DAYS().second), 'Paid', TE_exact(TE_SC().seed.payout), TE_day(TE_DAYS().first), TE_bank(), 'after the Taily fee'], sel: '.list-row' };
    } },
  { key: 't-earnings--empty', screen: 't-earnings', group: 'M5 · Earnings', title: 'Earnings — nothing yet', note: 'No completed job: when payouts arrive, and a way back Home',
    expect: { has: ['No earnings yet', 'every Friday', 'Go to Home'], not: 'Next payout', sel: '[data-empty="earnings"]' } },
  { key: 't-earnings--pending', screen: 't-earnings', group: 'M5 · Earnings', title: 'Earnings — one payout scheduled', note: 'A completed job: the Friday it arrives and where, no Paid group yet',
    setup: () => { TE_C.earningsTo('pending'); },
    get expect() {
      return { has: [TE_exact(TE_SC().seed.payout), `Arrives ${TE_day(TE_DAYS().first)}`, TE_bank(), '1 job', 'after the Taily fee'], not: 'Paid to' };
    } },
  { key: 't-earnings--failed', screen: 't-earnings', group: 'M5 · Earnings', title: 'Earnings — payout didn’t go through', note: 'The bank sent it back: amount, bank, the Friday it will be sent again, Fix bank details',
    setup: () => { TE_C.earningsTo('failed'); },
    get expect() {
      return { has: ['go through', 'Fix bank details', TE_exact(TE_SC().seed.payout), TE_day(TE_DAYS().second), TE_bank(), 'once your bank details are updated'], not: 'Nothing scheduled', sel: '.banner--error' };
    } },
  { key: 't-earnings--failed-and-next', screen: 't-earnings', group: 'M5 · Earnings', title: 'Earnings — sent back, another job scheduled', note: 'A payout came back and a second job is done: the next Friday is promised only once the bank details are fixed',
    setup: (S) => {
      TE_C.earningsTo('failed');
      TE_C.draftAgain();                                      // D-158: sending spent the draft
      S.T.setJob({ visitType: 'shop' });
      const second = TE_C.addRequest({ accept: true, after: TE_M.SECOND_SLOT_AFTER });
      TE_C.completeJob(second.id);
    },
    get expect() {
      return { has: ['go through', 'Fix bank details', TE_exact(TE_SC().shop.payout), TE_exact(TE_SC().seed.payout), TE_exact(TE_SC().shop.payout + TE_SC().seed.payout), `${TE_day(TE_DAYS().second)} · `, 'once your bank is fixed', 'Sent back'], not: ['Arrives', 'Sends '], sel: '.banner--error' };
    } },
  { key: 't-earnings--kept', screen: 't-earnings', group: 'M5 · Earnings', title: 'Earnings — a kept deposit', note: 'A late cancellation is the only payout: it says "no Taily fee", not "after the Taily fee" (D-172)',
    setup: () => { TE_C.earningsTo('kept'); },
    get expect() {
      return { has: [TE_exact(TE_SC().lateCancel.tailorPaid), '1 job · no Taily fee', 'Kept deposits and no-show pay have no fee'], not: '1 job · after the Taily fee' };
    } },
  { key: 't-earnings--loading', screen: 't-earnings', group: 'M5 · Earnings', title: 'Earnings — loading', note: 'Latency held: skeleton in place of the figure and rows',
    setup: (S) => { TE_C.earningsTo('pending'); S.sim.latency = 'hold'; },
    expect: { has: 'Earnings', not: 'after the Taily fee', sel: '.skeleton--payout' } },
];
export const FLOWS_t_payout = [
  { key: 't-payout', screen: 't-payout', group: 'M5 · Earnings', title: 'Payout — one job', note: 'Paid: the services, the Taily fee in dollars under them, the home-visit fee, then the payout',
    setup: (S) => { TE_C.earningsTo('paid'); TE_first(S); },
    get expect() {
      const sc = TE_SC().seed;
      return { has: ['YOUR PAYOUT', 'Paid', 'You take home', TE_exact(sc.payout), TE_exact(sc.services), TE_neg(sc.tailyFee), TE_exact(sc.homeFee), 'of services only', 'Open the job', TE_bank()], sel: '.money-rows' };
    } },
  { key: 't-payout--kept', screen: 't-payout', group: 'M5 · Earnings', title: 'Payout — deposit kept', note: 'A late cancellation: the kept deposit is the whole payout, no Taily fee',
    setup: (S) => { TE_C.earningsTo('kept'); TE_first(S); },
    get expect() {
      return { has: ['Deposit kept', TE_exact(TE_SC().lateCancel.tailorPaid), 'No Taily fee', 'Pending', 'Arrives', 'Cancelled by Sarah within 24 hours'], not: ['Services', 'Scheduled'] };
    } },
  { key: 't-payout--no-show', screen: 't-payout', group: 'M5 · Earnings', title: 'Payout — no-show pay', note: 'Sarah didn’t show up: no-show pay is the payout, no Taily fee',
    setup: (S) => { S.driveTo('no-show'); TE_first(S); },
    get expect() {
      return { has: ['No-show pay', TE_exact(TE_SC().noShow.paid), 'No Taily fee on no-show pay', 'Pending', 'Arrives', 'didn’t show up'], not: ['Services', 'kept deposit', 'Scheduled'] };
    } },
  { key: 't-payout--failed', screen: 't-payout', group: 'M5 · Earnings', title: 'Payout — didn’t go through', note: 'The bank sent it back: the banner and the sticky Fix bank details',
    setup: (S) => { TE_C.earningsTo('failed'); TE_first(S); },
    get expect() {
      return { has: ['go through', 'Update your bank details to get paid', 'Fix bank details', TE_exact(TE_SC().seed.payout), TE_day(TE_DAYS().second), 'Didn’t go through · sends again once your bank details are updated'], sel: '.banner--error' };
    } },
];
export const FLOWS_c_messages = [
  { key: 'c-messages', screen: 'c-messages', group: CM_GROUP, title: 'Messages — a booked conversation', note: 'Amara’s closing line is unread',
    setup: (S) => { CM_booked(S); S.T.sendMessage('amara', 'tailor', { text: CM_CHAT.after }); },
    expect: { has: ['Messages', 'Amara Reyes', 'See you on Thursday', 'Confirmed', '1 unread'], sel: '.thread-row' } },
  { key: 'c-messages--empty', screen: 'c-messages', group: CM_GROUP, title: 'Messages — none yet', note: 'Seed: no tailor has been messaged',
    expect: { has: ['No messages yet', 'Find a tailor'], not: ['Amara Reyes'], sel: '[data-empty="messages"]' } },
  { key: 'c-messages--loading', screen: 'c-messages', group: CM_GROUP, title: 'Messages — loading', note: 'Skeleton rows while the list loads (latency held)',
    setup: (S) => { CM_askAmara(); S.sim.latency = 'hold'; },
    expect: { sel: '.skeleton--thread-row' } },
];
export const FLOWS_c_thread = [
  { key: 'c-thread', screen: 'c-thread', group: CM_GROUP, title: 'Thread — the booked conversation', note: 'Question, request, accept and a closing line, pinned to the job',
    setup: (S) => { S.driveTo('confirmed', { ask: true }); S.T.sendMessage('amara', 'tailor', { text: CM_CHAT.after }); },
    expect: { has: [CM_CHAT.ask, 'You sent a request', 'Amara accepted', 'See you on Thursday', 'Confirmed', CM_fmtWhen(CM_SLOT)], sel: '.thread-context' } },
  { key: 'c-thread--question', screen: 'c-thread', group: CM_GROUP, title: 'Thread — asking before booking', note: 'No booking yet: the row opens Amara’s profile',
    setup: () => { CM_askAmara(); },
    expect: { has: ['No booking yet', 'book a visit', CM_CHAT.ask], not: ['You sent a request'], sel: '.thread-context' } },
  { key: 'c-thread--pending', screen: 'c-thread', group: CM_GROUP, title: 'Thread — request sent', note: 'The reply countdown rides in the header',
    setup: (S) => { S.driveTo('requested', { ask: true }); },
    expect: { has: ['Request sent', '2h left for Amara to reply', 'You sent a request'], not: 'Request sent ·', sel: '.thread-head [data-countdown]' } },
  { key: 'c-thread--masked', screen: 'c-thread', group: CM_GROUP, title: 'Thread — phone number hidden', note: 'Sarah sent her number: token on the bubble, the note only for her',
    setup: (S) => { S.driveTo('confirmed', { ask: true }); S.state.ui['c-thread'] = { draft: CM_CHAT.phoneCustomer }; },
    click: ['[data-act="send"]'],
    expect: { has: ['phone hidden', 'Hidden from Amara', 'stay private on Taily'], not: [CM_PHONE_TAIL], sel: '.chat-msg--me .chat-msg__note' } },
  { key: 'c-thread--failed', screen: 'c-thread', group: CM_GROUP, title: 'Thread — message not sent', note: 'One dropped connection: Not sent · Retry',
    setup: (S) => { S.driveTo('confirmed', { ask: true }); S.sim.send = 'fail'; S.state.ui['c-thread'] = { draft: CM_CHAT.late }; },
    click: ['[data-act="send"]'],
    expect: { has: [CM_CHAT.late, 'Not sent', 'Retry'], sel: '[data-act="retry"]' } },
  { key: 'c-thread--failed-offline', screen: 'c-thread', group: CM_GROUP, title: 'Thread — offline send', note: 'Offline: the failed bubble and its Retry are scrolled into view above the composer',
    setup: (S) => { S.driveTo('confirmed', { ask: true }); S.sim.network = 'offline'; S.state.ui['c-thread'] = { draft: CM_CHAT.late }; },
    click: ['[data-act="send"]'],
    expect: { has: [CM_CHAT.late, 'Not sent', 'Retry'], sel: '[data-act="retry"]', inView: true } },
  { key: 'c-thread--photo', screen: 'c-thread', group: CM_GROUP, title: 'Thread — a photo message', note: 'Two photos, one tile row that opens the viewer',
    setup: (S) => { S.driveTo('confirmed', { ask: true }); S.T.sendMessage('amara', 'customer', { text: CM_CHAT.photo, photos: 2 }); },
    click: ['.chat-bubble__photo'],
    expect: { has: ['Your photos', '1 of 2', 'The sleeves are the problem'], not: ['photos · photos', 'photo · photos'], sel: '.photo-viewer__item' } },
  { key: 'c-thread--attach', screen: 'c-thread', group: CM_GROUP, title: 'Add a photo — sheet', note: 'Camera or library, up to three per message',
    setup: (S) => { S.driveTo('confirmed'); },
    click: ['[data-act="attach-photo"]'],
    expect: { has: ['Add a photo', 'Take a photo', 'Choose from library', 'Up to 3 per message'] } },
  { key: 'c-thread--read-only', screen: 'c-thread', group: CM_GROUP, title: 'Thread — closed after a decline', note: 'No composer: find another tailor, or start a different job',
    setup: (S) => { S.driveTo('declined', { ask: true }); },
    expect: { has: ['Amara declined', 'this chat is closed', 'Find another tailor', 'Start a different job with Amara'], sel: '.read-only' } },
  { key: 'c-thread--expired', screen: 'c-thread', group: CM_GROUP, title: 'Thread — no reply to the request', note: 'The request expired: the pill says No reply, the row opens it, the composer stays open',
    setup: (S) => { S.driveTo('expired', { ask: true }); S.state.ui.thread = { tailorId: S.state.tailors[0].id }; },
    expect: { has: ['No reply', 'View request'], sel: '.composer__input' } },
];
/* ---------- C3 · Customer account (c-account, c-addresses, c-cards, c-orders) — own helpers, prefixed CA_ ---------- */
import * as CA_A from '../account.js';
import { addRequest as CA_addRequest } from './common.js';
import { SCENARIOS as CA_SC, SECOND_SLOT_AFTER as CA_AFTER } from './money-scenarios.js';
import { fmtExact as CA_exact, fmt as CA_fmt } from '../money.js';
import { CUSTOMER as CA_CUSTOMER } from '../data.js';

const CA_GROUP = 'M5 · Account';
const CA_visa = `${CA_CUSTOMER.cards[0].brand} •••• ${CA_CUSTOMER.cards[0].last4}`;
const CA_MASTERCARD = { number: '5555555555554444', exp: '11/29', cvc: '123', zip: '11211' };
const CA_mc = 'Mastercard •••• 4444';

export const FLOWS_c_account = [
  { key: 'c-account', screen: 'c-account', group: CA_GROUP, title: 'Account home', note: 'Sarah after a finished order: profile, addresses, card, past orders',
    setup: (S) => { S.driveTo('reviewed'); },
    expect: { has: ['Account', `${CA_CUSTOMER.first} ${CA_CUSTOMER.last}`, CA_CUSTOMER.phone, 'Saved addresses', CA_CUSTOMER.address.street, 'Payment methods', CA_visa, 'Past orders', 'Sign out'] } },
  { key: 'c-account--sign-out', screen: 'c-account', group: CA_GROUP, title: 'Account — sign out confirm', note: 'The confirm names what stays: your bookings',
    click: ['[data-act="sign-out"]'],
    expect: { has: ['Sign out of Taily?', 'Stay signed in'], sel: '[data-s="sign-out"]' } },
];

export const FLOWS_c_addresses = [
  { key: 'c-addresses', screen: 'c-addresses', group: CA_GROUP, title: 'Saved addresses', note: 'Home is the default; Work added',
    setup: () => { CA_A.addAddress({ label: 'Work', street: '200 Kent Ave', unit: '', zip: '11249' }); },
    expect: { has: ['Home', 'Default', CA_CUSTOMER.address.street, 'Work', '200 Kent Ave', 'Make default', 'Add an address'] } },
  { key: 'c-addresses--empty', screen: 'c-addresses', group: CA_GROUP, title: 'Saved addresses — none', note: 'Sarah removed every address',
    setup: () => { CA_A.removeAddress('home'); },
    expect: { has: ['No saved addresses', 'Add an address'], sel: '[data-empty="addresses"]' } },
  { key: 'c-addresses--add', screen: 'c-addresses', group: CA_GROUP, title: 'Saved addresses — add sheet', note: 'Label, street, unit, ZIP, default',
    click: ['[data-act="add"]'],
    expect: { has: ['Add an address', 'Street address', 'ZIP code', 'Save address'], sel: '[data-s="add-address"]' } },
  { key: 'c-addresses--error', screen: 'c-addresses', group: CA_GROUP, title: 'Saved addresses — add, field errors', note: 'Street empty, ZIP too short: both under their fields',
    setup: (S) => { S.state.ui['c-addresses'] = { add: { street: '', zip: '112' } }; },
    click: ['[data-act="add"]', '[data-act="save-address"]'],
    expect: { has: ['Enter your street address.', 'Enter a 5-digit ZIP code.'], sel: '[data-s="add-address"] [aria-invalid="true"]' } },
];

export const FLOWS_c_cards = [
  { key: 'c-cards', screen: 'c-cards', group: CA_GROUP, title: 'Payment methods', note: 'Visa (default) and a Mastercard, Apple Pay below',
    setup: () => { CA_A.addCard(CA_MASTERCARD); },
    expect: { has: [CA_visa, 'Default', CA_mc, 'Apple Pay', 'Add a card'] } },
  { key: 'c-cards--empty', screen: 'c-cards', group: CA_GROUP, title: 'Payment methods — no cards', note: 'Apple Pay is still listed',
    setup: () => { CA_A.removeCard('visa-4242'); },
    expect: { has: ['No cards saved', 'Apple Pay'], sel: '[data-empty="cards"]' } },
  { key: 'c-cards--remove', screen: 'c-cards', group: CA_GROUP, title: 'Payment methods — remove confirm', note: 'The Visa pays for an open booking: it moves to the Mastercard, which becomes the default',
    setup: (S) => { S.driveTo('confirmed'); CA_A.addCard(CA_MASTERCARD); },
    click: ['[data-act="card"][data-id="visa-4242"]', '[data-act="remove"]'],
    expect: { has: [`Remove ${CA_visa}?`, `balance for your booking with Amara`, `will be charged to ${CA_mc} instead`, CA_exact(CA_SC.seed.balance), 'becomes your default', 'Keep card'], sel: '[data-s="card"]' } },
  { key: 'c-cards--in-use', screen: 'c-cards', group: CA_GROUP, title: 'Payment methods — only card in use', note: 'No Remove: add another card first',
    setup: (S) => { S.driveTo('confirmed'); },
    click: ['[data-act="card"][data-id="visa-4242"]'],
    expect: { has: ['Paying for your booking with Amara', 'Add another card first'], not: 'Remove card', sel: '[data-s="card"] [data-act="add-from-sheet"]' } },
  { key: 'c-cards--add', screen: 'c-cards', group: CA_GROUP, title: 'Payment methods — add a card', note: 'Card number, expiry, security code, ZIP',
    click: ['[data-act="add"]'],
    expect: { has: ['Card number', 'Expiry', 'Security code', 'Save card'], sel: '[data-s="add-card"]' } },
];

export const FLOWS_c_orders = [
  { key: 'c-orders', screen: 'c-orders', group: CA_GROUP, title: 'Past orders', note: 'One finished order (paid) and one cancelled early (refunded)',
    setup: (S) => {
      S.driveTo('reviewed');
      const later = CA_addRequest({ accept: true, after: CA_AFTER });
      S.T.cancelBooking(later.id);
    },
    expect: { has: ['Past orders', 'Completed', CA_fmt(CA_SC.seed.total), 'Paid', 'Cancelled', CA_fmt(CA_SC.earlyCancel.refund), 'Refunded'], sel: '.appt-row' } },
  { key: 'c-orders--empty', screen: 'c-orders', group: CA_GROUP, title: 'Past orders — none yet', note: 'A fresh account',
    expect: { has: ['No past orders yet', 'Start a booking'], sel: '[data-empty="orders"]' } },
  { key: 'c-orders--loading', screen: 'c-orders', group: CA_GROUP, title: 'Past orders — loading', note: 'Order-shaped skeleton cards while the list loads (latency held)',
    setup: (S) => { S.driveTo('reviewed'); S.sim.latency = 'hold'; },
    expect: { has: ['Past orders'], not: ['Start a booking'], sel: '.skeleton--appt-row' } },
];

export const FLOWS_t_messages = [
  { key: 't-messages', screen: 't-messages', group: 'M5 · Tailor messages', title: 'Messages — one conversation', note: 'Sarah C. with an unread message and the New request pill',
    setup: (S) => { S.driveTo('requested', { ask: true }); S.T.sendMessage('amara', 'customer', { text: TM_CHAT.later }); },
    expect: { has: ['Messages', 'Sarah C.', 'Is Thursday still good', 'New request', '1 unread'], not: 'Sarah Chen', sel: '.thread-row' } },
  { key: 't-messages--empty', screen: 't-messages', group: 'M5 · Tailor messages', title: 'Messages — none yet', note: 'No customer has written',
    setup: () => {},
    expect: { has: ['No messages yet', 'Go to Home'] } },
  { key: 't-messages--loading', screen: 't-messages', group: 'M5 · Tailor messages', title: 'Messages — loading', note: 'Skeleton rows while the list loads (latency held)',
    setup: (S) => { S.driveTo('requested', { ask: true }); S.sim.latency = 'hold'; },
    expect: { sel: '.skeleton--thread-row' } },
];
export const FLOWS_t_thread = [
  { key: 't-thread--question', screen: 't-thread', group: 'M5 · Tailor messages', title: 'Thread — a question before booking', note: 'Sarah C. asks about a jacket; no request yet; the context row is static',
    setup: (S) => { TM_askAmara({ reply: false }); },
    expect: { has: ['Sarah C.', 'Asking before booking', 'No request yet', 'Her request will show here when she books.', 'Can you take in a jacket'], not: 'Sarah Chen', sel: '.thread-context' } },
  { key: 't-thread--pending', screen: 't-thread', group: 'M5 · Tailor messages', title: 'Thread — a request is waiting', note: 'Header shows the countdown only (D-171); the context row names New request and links to it',
    setup: (S) => { S.driveTo('requested', { ask: true }); },
    expect: { has: ['New request', '2h left to reply', 'Sarah sent a request', 'Sarah C.', 'View request'], not: ['Sarah Chen', 'New request ·'], sel: '.thread-head [data-countdown]' } },
  { key: 't-thread--masked', screen: 't-thread', group: 'M5 · Tailor messages', title: 'Thread — a phone number is hidden', note: 'Amara types her number and sends: the token and the privacy note show under her bubble',
    setup: (S) => { S.driveTo('confirmed', { ask: true }); S.state.ui['t-thread'] = { draft: TM_CHAT.phoneTailor }; },
    click: ['[data-act="send"]'],
    expect: { has: ['phone hidden', 'Hidden from Sarah', 'stay private on Taily'], not: TM_AMARA.phone, sel: '.chat-msg--me .chat-msg__note' } },
  { key: 't-thread--failed', screen: 't-thread', group: 'M5 · Tailor messages', title: 'Thread — message not sent', note: 'The next send drops: Not sent · Retry under her bubble',
    setup: (S) => { S.driveTo('confirmed'); S.sim.send = 'fail'; S.state.ui['t-thread'] = { draft: TM_CHAT.after }; },
    click: ['[data-act="send"]'],
    expect: { has: ['Not sent', 'Retry', TM_CHAT.after], sel: '[data-act="retry"]' } },
  { key: 't-thread--photo', screen: 't-thread', group: 'M5 · Tailor messages', title: 'Thread — Sarah’s photos open', note: 'Tapping the photo opens the viewer over the thread',
    setup: (S) => { S.driveTo('confirmed', { ask: true }); S.T.sendMessage('amara', 'customer', { text: TM_CHAT.photo, photos: 2 }); },
    click: ['.chat-bubble__photo'],
    expect: { has: ['Photos from Sarah', '1 of 2'], not: ['photos · photos'] } },
  { key: 't-thread--read-only', screen: 't-thread', group: 'M5 · Tailor messages', title: 'Thread — declined, closed', note: 'Read-only banner in place of the composer',
    setup: (S) => { S.driveTo('declined', { ask: true }); },
    expect: { has: ['You declined this request', 'Back to Home'], not: 'Send', sel: '.read-only' } },
];

/* ---------- C4 · System states (hosts) ---------- */
export const FLOWS_sys_offline = [
  { key: 'sys-offline', screen: 'c-job', group: 'M5 · System', title: 'Offline — customer', note: 'The banner under the top bar on any screen; Retry reconnects',
    setup: (S) => { S.sim.network = 'offline'; },
    expect: { has: ['offline', 'Retry'], sel: '[data-sys="offline"]' } },
];
export const FLOWS_sys_offline_tailor = [
  { key: 'sys-offline-tailor', screen: 't-home', group: 'M5 · System', title: 'Offline — tailor', note: 'Same banner on Amara’s Home; her requests are still listed',
    setup: (S) => { S.driveTo('requested'); S.sim.network = 'offline'; },
    expect: { has: ['offline', 'Retry', 'New requests'], sel: '[data-sys="offline"]' } },
];
export const FLOWS_sys_session_expired = [
  { key: 'sys-session-expired', screen: 'c-bookings', group: 'M5 · System', title: 'Session expired', note: 'A locked re-auth sheet: code to her own number, Verify, Sign out',
    setup: (S) => { S.driveTo('confirmed'); S.sim.session = 'expired'; },
    expect: { has: ['Sign in again', TE_CUSTOMER.phone, 'Verify', 'Sign out'], sel: '[data-s="sys-reauth"]' } },
];
export const FLOWS_sys_session_expired_tailor = [
  { key: 'sys-session-expired-tailor', screen: 't-home', group: 'M5 · System', title: 'Session expired — tailor', note: 'The same locked re-auth sheet on Amara’s Home: the code goes to her own number',
    setup: (S) => { S.driveTo('requested'); S.sim.session = 'expired'; },
    expect: { has: ['Sign in again', TM_AMARA.phone, 'Verify', 'Sign out'], sel: '[data-s="sys-reauth"]' } },
];
export const FLOWS_sys_push_prompt = [
  { key: 'sys-push-prompt', screen: 't-home', group: 'M5 · System', title: 'Notifications ask — tailor', note: 'The soft ask on Home: the benefit first, Not now equal weight',
    setup: (S) => { S.driveTo('requested'); S.sim.push = 'prompt'; },
    expect: { has: ['Turn on notifications', 'Not now', `expire after ${TE_POLICY.REQUEST_EXPIRY_H} hours`], sel: '[data-s="sys-push"]' } },
];
export const FLOWS_sys_push_prompt_customer = [
  { key: 'sys-push-prompt-customer', screen: 'c-request', group: 'M5 · System', title: 'Notifications ask — customer', note: 'Test flows only: while a request waits, “Know when Amara replies”',
    setup: (S) => { S.driveTo('requested'); S.sim.push = 'prompt'; },
    expect: { has: ['Know when Amara replies', 'Turn on notifications', 'Not now'], sel: '[data-s="sys-push"]' } },
];
export const FLOWS_sys_error_toast = [
  { key: 'sys-error-toast', screen: 'c-pay', group: 'M5 · System', title: 'Request failed — server error', note: 'The next send fails once: banner above the button says nothing was held, toast echoes it, Pay stays enabled',
    setup: (S) => { S.sim.server = 'error'; },
    click: ['[data-act="pay"]'],
    expect: { has: ['Something went wrong', 'Nothing was held'], sel: '.banner--error' } },
];
