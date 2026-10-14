/* ============================================================
   M4 Test-flows entries — one array per screen (pre-scaffolded in M0).
   Each screen builder edits only its own FLOWS_<screen_id> array.
   Entry shape: see docs/v5/CONTEXT.md (FLOWS / EXPECT contract).
   ============================================================ */

import { SCENARIOS as TJ4_SC, SEED_SLOT as TJ4_SLOT } from './money-scenarios.js';
import { fmtExact as TJ4_exact, fmtNeg as TJ4_neg } from '../money.js';

import { SCENARIOS as CC_SC, AMARA as CC_AMARA } from './money-scenarios.js';
import { fmtExact as ccExact } from '../money.js';
import { REVIEW_LIMITS as CV_LIMITS } from '../data.js';

/* ---------- C1 · Price change (t-adjust, c-price-change) ---------- */
import { SCENARIOS as PC_SCENARIOS, AMARA as PC_AMARA } from './money-scenarios.js';
import { PRICE_NOTES as PC_PRICE_NOTES } from './common.js';
import { TAILOR_LIMITS as PC_LIMITS } from '../data.js';
import { fmtExact as PC_fmtExact, fmtNeg as PC_fmtNeg, cents as PC_cents } from '../money.js';

const PC_GROUP = 'M4 · Edit job';
const PC_GROUP_C = 'M4 · Final order';
const PC_sc = PC_SCENARIOS;
/** A t-adjust draft for the fitting: Sleeves +$5 and Taper legs added to the suit pant (the "added" recipe). */
const PC_edited = (S) => {
  const a = S.driveTo('fitting');
  S.state.ui['t-adjust'] = {
    apptId: a.id, mode: 'new', prices: { 'g2:sleeves': String(PC_AMARA.prices.sleeves + 5) }, removed: [],
    added: [{ garmentId: 'g1', serviceId: 'taper' }], items: [], removedItems: [], note: '',
  };
  return a;
};
/** The J6 draft: a new Pants / Jeans item with Hem pants, Take in jacket sides taken off. */
const PC_itemAdded = (S) => {
  const a = S.driveTo('fitting');
  S.state.ui['t-adjust'] = {
    apptId: a.id, mode: 'new', prices: {}, removed: ['g2:jacket-sides'], added: [{ garmentId: 'n1', serviceId: 'hem-pants' }],
    items: [{ id: 'n1', type: 'Pants / Jeans' }], removedItems: [], note: '', seq: 2,
  };
  return a;
};
const PC_MAX = 10;

export const FLOWS_t_adjust = [
  { key: 't-adjust', screen: 't-adjust', group: PC_GROUP, title: 'Edit the job', note: 'At the fitting: every item and service as booked, "No changes", Send already on (an untouched order is sent for approval)',
    setup: (S) => { S.driveTo('fitting'); },
    expect: { has: ['Edit the job', 'Hem pants', 'Shorten sleeves', 'Take in jacket sides', 'Add a service', 'Add an item', 'No changes', 'Send to Sarah for approval', PC_fmtExact(PC_sc.seed.payout)], sel: '[data-act="send"]:not([disabled])' } },
  { key: 't-adjust--edited', screen: 't-adjust', group: PC_GROUP, title: 'Edit the job — edited', note: 'Sleeves repriced, Taper legs added: the marks, the new total and what Amara takes home',
    setup: (S) => { PC_edited(S); },
    expect: { has: ['New', 'New price', 'Taper legs', PC_fmtExact(PC_sc.priceAdded.total), PC_fmtExact(PC_sc.priceAdded.payout), PC_fmtNeg(PC_sc.priceAdded.tailyFee), 'up', '1 service added'], not: 'Added' } },
  { key: 't-adjust--item-added', screen: 't-adjust', group: PC_GROUP, title: 'Edit the job — item added', note: 'A Pants / Jeans item with Hem pants (green New item card), Take in jacket sides struck: total and take-home move down',
    setup: (S) => { PC_itemAdded(S); },
    expect: { has: ['New item', 'Pants / Jeans', 'Removed', '1 item added', PC_fmtExact(PC_sc.priceItem.total), PC_fmtExact(PC_sc.priceItem.payout), 'down'] } },
  { key: 't-adjust--remove-item', screen: 't-adjust', group: PC_GROUP, title: 'Edit the job — item removed', note: 'The Suit Pant card collapsed and struck, its service listed struck, Undo',
    setup: (S) => {
      const a = S.driveTo('fitting');
      S.state.ui['t-adjust'] = { apptId: a.id, mode: 'new', prices: {}, removed: [], added: [], items: [], removedItems: ['g1'], note: '' };
    },
    expect: { has: ['Removed', 'Undo', '1 item removed', PC_fmtExact(PC_sc.priceItemRemoved.total), PC_fmtExact(PC_sc.priceItemRemoved.payout)], sel: '[data-act="undo-item"][data-garment="g1"]' } },
  { key: 't-adjust--add-item', screen: 't-adjust', group: PC_GROUP, title: 'Add an item', note: 'Step 1: the types Amara prices at least one service for, with From $X',
    setup: (S) => { S.driveTo('fitting'); },
    click: ['[data-act="add-item"]'],
    expect: { has: ['Add an item', 'Pants / Jeans', 'Shirt / Blouse', 'Skirt', 'From'], sel: '[data-s="t-adjust-add-item"] [data-act="pick-type"]' } },
  { key: 't-adjust--add-item-service', screen: 't-adjust', group: PC_GROUP, title: 'Add an item — what does it need', note: 'Step 2: her priced services for Pants / Jeans; an item is never created empty',
    setup: (S) => { S.driveTo('fitting'); },
    click: ['[data-act="add-item"]', '[data-act="pick-type"][data-value="Pants / Jeans"]'],
    expect: { has: ['What does the Pants / Jeans need', 'Hem pants', 'Taper legs', PC_fmtExact(PC_cents(PC_AMARA.prices['hem-pants'])), 'Choose another item'] } },
  { key: 't-adjust--max-items', screen: 't-adjust', group: PC_GROUP, title: 'Edit the job — ten items', note: 'At the item limit Add an item is off and says why',
    setup: (S) => {
      const a = S.driveTo('fitting');
      const items = Array.from({ length: PC_MAX - 2 }, (_, i) => ({ id: `n${i + 1}`, type: 'Shirt / Blouse' }));
      S.state.ui['t-adjust'] = {
        apptId: a.id, mode: 'new', prices: {}, removed: [], added: items.map((i) => ({ garmentId: i.id, serviceId: 'repair' })),
        items, removedItems: [], note: '', seq: PC_MAX - 1,
      };
    },
    expect: { has: [`Up to ${PC_MAX} items`], sel: '[data-act="add-item"][disabled]' } },
  { key: 't-adjust--error', screen: 't-adjust', group: PC_GROUP, title: 'Edit the job — price missing', note: 'Hem pants price cleared, Send pressed: the error sits under the field',
    setup: (S) => {
      const a = S.driveTo('fitting');
      S.state.ui['t-adjust'] = { apptId: a.id, mode: 'new', prices: { 'g1:hem-pants': '' }, removed: [], added: [], items: [], removedItems: [] };
    },
    click: ['[data-act="send"]'],
    expect: { has: 'Enter a price', sel: '[aria-invalid="true"]' } },
  { key: 't-adjust--add', screen: 't-adjust', group: PC_GROUP, title: 'Add a service', note: 'The sheet lists only services Amara prices for a suit pant that are not on it yet',
    setup: (S) => { S.driveTo('fitting'); },
    click: ['[data-act="add-service"][data-garment="g1"]'],
    expect: { has: ['Add to Suit Pant', 'Taper legs', PC_fmtExact(PC_cents(PC_AMARA.prices.taper))], sel: '[data-s="t-adjust-add"] [data-value="taper"]' } },
  { key: 't-adjust--revise', screen: 't-adjust', group: PC_GROUP, title: 'Edit the order you sent', note: 'Sarah has not approved yet: the sent order is the starting point (marks still vs booked), sending again replaces it',
    setup: (S) => {
      const a = S.driveTo('price-change', { priceChange: 'item' });
      S.state.ui['t-adjust'] = { apptId: a.id, mode: 'revise' };
    },
    /* the note sits in a textarea (not visible text): its live counter proves it was prefilled */
    expect: { has: ['Edit the order you sent', 'Sending again replaces', 'New item', 'Pants / Jeans', 'Removed', `${[...PC_PRICE_NOTES.item].length} / ${PC_LIMITS.NOTE_MAX}`], sel: '[data-act="send"][disabled]' } },
  { key: 't-adjust--leave', screen: 't-adjust', group: PC_GROUP, title: 'Leave without sending?', note: 'Back with unsent edits asks first: Sarah cannot approve until you send',
    setup: (S) => { PC_edited(S); },
    click: ['[data-act="back"]'],
    expect: { has: ['Leave without sending?', 'Keep editing'] } },
];

export const FLOWS_c_price_change = [
  { key: 'c-price-change', screen: 'c-price-change', group: PC_GROUP_C, title: 'Review your final order', note: 'Taper added, Sleeves repriced: the marks, the new total, the unchanged deposit, two choices',
    setup: (S) => { S.driveTo('price-change'); },
    expect: { has: ['Review your final order', 'Approve order', 'What changed', '1 service added', 'Taper legs', 'New', 'New price', PC_fmtExact(PC_sc.priceAdded.total), PC_fmtExact(PC_sc.priceAdded.balance), PC_fmtExact(PC_sc.seed.total), PC_fmtExact(PC_sc.seed.deposit), 'Stays the same', 'Approve and start', 'Message Amara', 'note'], not: ['Reject', 'Decline', 'Added'] } },
  { key: 'c-price-change--item-added', screen: 'c-price-change', group: PC_GROUP_C, title: 'Final order — item added', note: 'Pants / Jeans as a green New item, Take in jacket sides struck: lower total and balance, deposit unchanged',
    setup: (S) => { S.driveTo('price-change', { priceChange: 'item' }); },
    expect: { has: ['New item', 'Pants / Jeans', 'Hem pants', 'Removed', 'Take in jacket sides', '1 item added', '1 service removed', 'down', PC_fmtExact(PC_sc.priceItem.total), PC_fmtExact(PC_sc.priceItem.balance), PC_fmtExact(PC_sc.seed.deposit)] } },
  { key: 'c-price-change--item-removed', screen: 'c-price-change', group: PC_GROUP_C, title: 'Final order — item removed', note: 'The Suit Pant struck with one Removed tag: lower total and balance',
    setup: (S) => { S.driveTo('price-change', { priceChange: 'item-removed' }); },
    expect: { has: ['Removed', 'Suit Pant', '1 item removed', PC_fmtExact(PC_sc.priceItemRemoved.total), PC_fmtExact(PC_sc.priceItemRemoved.balance)], not: 'New item' } },
  { key: 'c-price-change--removed', screen: 'c-price-change', group: PC_GROUP_C, title: 'Final order — service removed', note: 'Take in jacket sides removed: struck row, lower total and balance',
    setup: (S) => { S.driveTo('price-change', { priceChange: 'removed' }); },
    expect: { has: ['Removed', 'Take in jacket sides', '1 service removed', 'down', PC_fmtExact(PC_sc.priceRemoved.total), PC_fmtExact(PC_sc.priceRemoved.balance)] } },
  { key: 'c-price-change--repriced', screen: 'c-price-change', group: PC_GROUP_C, title: 'Final order — one price changed', note: 'Sleeves $5 more, nothing added',
    setup: (S) => { S.driveTo('price-change', { priceChange: 'repriced' }); },
    expect: { has: ['New price', '1 new price', PC_fmtExact(PC_sc.priceRepriced.total), PC_fmtExact(PC_sc.priceRepriced.balance)], not: ['New item', 'Removed'] } },
  { key: 'c-price-change--messaged', screen: 'c-price-change', group: PC_GROUP_C, title: 'You messaged Amara', note: 'After Message: a banner, Open chat in place of Message, Approve still available',
    setup: (S) => { const a = S.driveTo('price-change'); S.T.sendMessage(a.tailorId, 'customer', { text: 'Could we keep the sleeves at the old price?' }); },
    expect: { has: ['You messaged Amara', 'Open chat', 'Approve and start'] } },
  { key: 'c-price-change--unchanged', screen: 'c-price-change', group: PC_GROUP_C, title: 'Final order — no changes', note: 'Amara sent the order as booked: "No changes", the booked total, still one tap to approve',
    setup: (S) => { S.driveTo('price-change', { priceChange: 'unchanged' }); },
    expect: { has: ['Review your final order', 'Your order', 'No changes', 'Same as booked', 'Hem pants', 'Shorten sleeves', 'Take in jacket sides', PC_fmtExact(PC_sc.seed.total), PC_fmtExact(PC_sc.seed.balance), 'Approve and start'], not: ['New total', 'New balance', 'Removed', 'New price'] } },
];
/* ---------- C3 · Customer return + pay (c-ready) · prefix CR_ ---------- */
import { SCENARIOS as CR_SC } from './money-scenarios.js';
import { fmtExact as CR_fmtExact } from '../money.js';

const CR_GROUP = 'M4 · Ready';
export const FLOWS_c_ready = [
  { key: 'c-ready', screen: 'c-ready', group: CR_GROUP, title: 'Your order is ready', note: 'Three ways back, nothing chosen: Pay waits for a choice',
    setup: (S) => { S.driveTo('ready'); },
    expect: { has: ['Your order is ready', 'How do you want it back?', 'In-store pickup', 'Home drop-off', 'Taily courier', 'Free', 'Due now', CR_fmtExact(CR_SC.seed.balance), 'Choose how to get it back first', 'Your order', 'Suit Pant'], sel: '[data-act="pay"][disabled]' } },
  { key: 'c-ready--pickup-only', screen: 'c-ready', group: CR_GROUP, title: 'Ready — pickup is the only way back', note: 'One offer: pre-chosen, named in a line, Pay is on',
    setup: (S) => { const a = S.driveTo('in-progress'); S.T.markReady(a.id, { returns: ['pickup'] }); },
    expect: { has: ['In-store pickup', 'for this order', `Pay ${CR_fmtExact(CR_SC.seed.balance)}`], not: ['Home drop-off', 'Taily courier'] } },
  { key: 'c-ready--courier-loading', screen: 'c-ready', group: CR_GROUP, title: 'Courier — getting a price', note: 'Pickup chosen, then Taily courier tapped with the wait held: courier checked, skeleton, Pay waits (R4-2-C-01)',
    setup: (S) => { const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'pickup'); S.state.sim.latency = 'hold'; },
    click: ['[data-act="return"][data-value="courier"]'],
    expect: { has: ['Getting a price from Uber', 'Getting a price…', 'Waiting for the courier price'], sel: '[data-act="return"][data-value="courier"][aria-checked="true"]' } },
  { key: 'c-ready--courier-loading-model', screen: 'c-ready', group: CR_GROUP, title: 'Courier — quote still loading (model)', note: 'appt.courier.state is loading (sim.courier): the same skeleton and the same Pay wait',
    setup: (S) => { const a = S.driveTo('ready'); S.state.sim.courier = 'loading'; S.T.chooseReturn(a.id, 'courier'); },
    expect: { has: ['Getting a price from Uber', 'Waiting for the courier price'], sel: '.skeleton' }, visual: false },
  { key: 'c-ready--courier', screen: 'c-ready', group: CR_GROUP, title: 'Courier — quote + fee = total', note: 'Uber quote, Taily courier fee, Courier total; balance and Pay include it',
    setup: (S) => { const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'courier'); },
    expect: { has: ['Uber quote', 'Taily courier fee', CR_fmtExact(CR_SC.courierQuote.quote), CR_fmtExact(CR_SC.courierQuote.markup), CR_fmtExact(CR_SC.courier.courier), `Pay ${CR_fmtExact(CR_SC.courier.balance)}`] } },
  { key: 'c-ready--courier-failed', screen: 'c-ready', group: CR_GROUP, title: 'Courier — no price', note: 'Uber did not answer: Try again, or pick another way back',
    setup: (S) => { const a = S.driveTo('ready'); S.state.sim.courier = 'fail'; S.T.chooseReturn(a.id, 'courier'); },
    expect: { has: ['get a courier price', 'Try again', 'pick another way back'], not: 'Uber quote' } },
  { key: 'c-ready--pay', screen: 'c-ready', group: CR_GROUP, title: 'Pay the balance', note: 'Sheet: balance, deposit already off, saved card + Apple Pay',
    setup: (S) => { const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'pickup'); },
    click: ['[data-act="pay"]'],
    expect: { has: ['Pay the balance', 'Visa •••• 4242', 'Apple Pay', 'deposit is already taken off', CR_fmtExact(CR_SC.seed.balance)] } },
  { key: 'c-ready--pay-failed', screen: 'c-ready', group: CR_GROUP, title: 'Payment declined', note: 'Banner stays after the sheet closes: nothing charged, Pay another way',
    setup: (S) => { const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'pickup'); S.state.sim.card = 'declined'; S.T.payBalance(a.id, S.state.customer.cards[0].id); },
    expect: { has: ['Payment didn', 'Nothing was charged', 'Pay another way'], sel: '.banner--error' } },
  { key: 'c-ready--pay-another-way', screen: 'c-ready', group: CR_GROUP, title: 'Pay another way', note: 'After a decline: the sheet starts on Apple Pay and the declined card says so (R4-2-C-04)',
    setup: (S) => { const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'pickup'); S.state.sim.card = 'declined'; S.T.payBalance(a.id, S.state.customer.cards[0].id); },
    click: ['.banner [data-act="pay"]'],
    expect: { has: ['Pay the balance', 'Declined just now', 'Apple Pay'], sel: '[data-act="card"][data-value="apple-pay"][aria-checked="true"]' }, visual: false },
  { key: 'c-ready--processing', screen: 'c-ready', group: CR_GROUP, title: 'Paying…', note: 'Pay tapped, the wait held: busy button, method rows locked, the sheet cannot be closed',
    setup: (S) => { const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'pickup'); S.state.sim.latency = 'hold'; },
    click: ['[data-act="pay"]', '[data-act="pay-ok"]'],
    expect: { has: 'Paying', sel: '[aria-busy="true"]' } },
  { key: 'c-ready--processing-locked', screen: 'c-ready', group: CR_GROUP, title: 'Paying… — scrim tapped', note: 'Tapping the scrim mid-payment does not drop the payment (R4-2-C-03)',
    setup: (S) => { const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'pickup'); S.state.sim.latency = 'hold'; },
    click: ['[data-act="pay"]', '[data-act="pay-ok"]', '.sheet-scrim'],
    expect: { has: 'Paying', sel: '.sheet__cancel[disabled]' }, visual: false },
];
export const FLOWS_c_complete = [
  { key: 'c-complete', screen: 'c-complete', group: 'M4 · Completed', title: 'All done — receipt and review prompt', note: 'Amara completed it: the receipt matches what Sarah paid, five stars to start a review',
    setup: (S) => { S.driveTo('completed'); },
    expect: { has: ['All done', 'How did Amara do?', 'Receipt', 'Paid', ccExact(CC_SC.seed.total), ccExact(CC_SC.seed.balance), 'Leave a review'], sel: '[data-stars]' } },
];
export const FLOWS_c_review = [
  { key: 'c-review', screen: 'c-review', group: 'M4 · Completed', title: 'Review Amara', note: 'Stars first, then optional words and photos',
    setup: (S) => { S.driveTo('completed'); },
    expect: { has: ['Review Amara', 'Your rating', 'Tell others about it', 'Photos', 'Post review'], not: 'Choose a star rating', sel: '[data-stars]' } },
  { key: 'c-review--error', screen: 'c-review', group: 'M4 · Completed', title: 'Review Amara — no stars chosen', note: 'Post with no rating: the error sits right under the stars',
    setup: (S) => { S.driveTo('completed'); },
    click: ['[data-act="post"]'],
    expect: { has: 'Choose a star rating', sel: '[role="alert"]' } },
  { key: 'c-review--photos', screen: 'c-review', group: 'M4 · Completed', title: 'Review Amara — three photos', note: 'The photo limit is reached: the add tile is gone and says why',
    setup: (S) => {
      const a = S.driveTo('completed');
      S.state.ui['c-review'] = { apptId: a.id, stars: 4, text: 'Sleeves are perfect.', photos: CV_LIMITS.PHOTOS_MAX };
    },
    expect: { has: ['Great', 'the most a review can have'], not: 'Add a photo' } },
  { key: 'c-review--submitted', screen: 'c-review', group: 'M4 · Completed', title: 'Thanks, Sarah — review posted', note: 'Her review on Amara’s profile, the count one higher',
    setup: (S) => { S.driveTo('reviewed'); },
    expect: { has: ['Thanks, Sarah', 'Sarah C.', 'Perfect fit', `${CC_AMARA.rating.count + 1} reviews`, 'See Amara'] } },
];

/* ---------- C2 · Tailor job loop (t-job M4 states) ---------- */
const TJ4 = { group: 'M4 · Job', screen: 't-job' };
export const FLOWS_t_job = [
  { ...TJ4, key: 't-job--visit', title: 'Job — visit time, start the fitting', note: 'Clock at the visit start: Start fitting, Message Sarah, no-show wait note',
    setup: (S) => { S.driveTo('confirmed'); S.setClock(TJ4_SLOT); },
    expect: { has: ['time for the fitting', 'Start fitting', 'Message Sarah', 'Something wrong?'], not: 'You accepted', sel: '.action-bar' } },
  { ...TJ4, key: 't-job--fitting', title: 'Job — fitting', note: 'Reached by Back from the editor: Fitting pill, take-home in the bar, Review the order (no shortcut past Sarah)',
    setup: (S) => { S.driveTo('fitting'); },
    expect: { has: ['Fitting', 'Review the order', 'Message Sarah', TJ4_exact(TJ4_SC.seed.payout)], not: ['No changes, start the work', 'Adjust price', 'make it'] } },
  { ...TJ4, key: 't-job--waiting', title: 'Job — waiting for Sarah to approve', note: 'Take-home with the old figure, "The order you sent" with the same marks Sarah sees, Edit the order',
    setup: (S) => { S.driveTo('price-change'); },
    expect: { has: ['Waiting on Sarah', 'The order you sent', 'Taper legs', 'New', TJ4_exact(TJ4_SC.priceAdded.payout), TJ4_exact(TJ4_SC.priceAdded.total), 'Edit the order'], sel: '.change-list' } },
  { ...TJ4, key: 't-job--waiting-unchanged', title: 'Job — waiting, order sent as booked', note: 'Nothing changed: "No changes", Same as booked, every booked row plain, still waiting for Sarah',
    setup: (S) => { S.driveTo('price-change', { priceChange: 'unchanged' }); },
    expect: { has: ['Waiting on Sarah', 'No changes', 'Same as booked', TJ4_exact(TJ4_SC.seed.total), 'Edit the order'], not: ['Removed', 'New price'] } },
  { ...TJ4, key: 't-job--messaged', title: 'Job — Sarah messaged instead', note: 'Reply to Sarah, her latest message quoted, same price blocks',
    setup: (S) => {
      const a = S.driveTo('price-change');
      S.T.messageAboutPriceChange(a.id);
      S.T.sendMessage(a.tailorId, 'customer', { text: 'Could we keep the sleeves at the old price?' });
    },
    expect: { has: ['Reply to Sarah', 'keep the sleeves', 'Edit the order'], sel: '.note-quote' } },
  { ...TJ4, key: 't-job--replied', title: 'Job — Amara replied, waiting on Sarah', note: 'After Sarah messaged and Amara answered: the move is Sarah’s again (D-112)',
    setup: (S) => {
      const a = S.driveTo('price-change');
      S.T.messageAboutPriceChange(a.id);
      S.T.sendMessage(a.tailorId, 'customer', { text: 'Could we keep the sleeves at the old price?' });
      S.T.sendMessage(a.tailorId, 'tailor', { text: 'The sleeves took longer than I thought. Happy to talk it through.' });
    },
    expect: { has: ['Waiting on Sarah', 'Waiting for Sarah to approve', 'You replied at', 'Edit the order'], not: ['Reply to Sarah', 'wants to talk'], sel: '.note-quote' } },
  { ...TJ4, key: 't-job--approved', title: 'Job — Sarah approved your changes', note: 'Success banner with the new take-home, Mark ready',
    setup: (S) => { S.driveTo('in-progress', { priceChange: 'added' }); },
    expect: { has: ['approved your changes', TJ4_exact(TJ4_SC.priceAdded.payout), 'Mark ready', 'Price updated after the fitting'], sel: '.banner--success' } },
  { ...TJ4, key: 't-job--in-progress', title: 'Job — work in progress', note: 'Order approved as booked: Mark ready is the one next step, no "changes" claim',
    setup: (S) => { S.driveTo('in-progress'); },
    expect: { has: ['In progress', 'Work in progress', 'approved the order', 'Mark ready'], not: 'approved your changes' } },
  { ...TJ4, key: 't-job--mark-ready', title: 'Job — mark ready sheet', note: 'All three ways back ticked; the courier is never her money',
    setup: (S) => { S.driveTo('in-progress'); },
    click: ['[data-act="mark-ready"]'],
    expect: { has: ['Mark the order ready?', 'In-store pickup', 'Home drop-off', 'Taily courier', 'not taken from your payout', TJ4_exact(TJ4_SC.seed.balance)], sel: '[data-act="ready-ok"]' } },
  { ...TJ4, key: 't-job--ready', title: 'Job — ready, waiting for Sarah', note: 'Ways back you offered, balance due, Message only',
    setup: (S) => { S.driveTo('ready'); },
    expect: { has: ['Waiting on Sarah', 'Ways back you offered', TJ4_exact(TJ4_SC.seed.balance)] } },
  { ...TJ4, key: 't-job--returning-pickup', title: 'Job — Sarah picks it up', note: 'In-store pickup at the shop, Mark completed',
    setup: (S) => { S.driveTo('returning'); },
    expect: { has: ['Ready for pickup', 'pick it up', 'Reyes Tailoring', 'Mark completed'] } },
  { ...TJ4, key: 't-job--returning-dropoff', title: 'Job — drop it off at Sarah’s', note: 'Home drop-off with her full address, To drop off pill',
    setup: (S) => { S.driveTo('returning', { returnOption: 'dropoff' }); },
    expect: { has: ['To drop off', '145 N 7th St', 'Mark completed'] } },
  { ...TJ4, key: 't-job--courier', title: 'Job — courier booked', note: 'Uber quote + Taily courier fee = total, paid by Sarah, payout unchanged',
    setup: (S) => { S.driveTo('returning', { returnOption: 'courier' }); },
    expect: { has: ['Courier booked', TJ4_exact(TJ4_SC.courierQuote.quote), TJ4_exact(TJ4_SC.courierQuote.markup), TJ4_exact(TJ4_SC.courierQuote.cents), 'Not taken from your payout', TJ4_exact(TJ4_SC.seed.payout)], sel: '.courier-card' } },
  { ...TJ4, key: 't-job--completed', title: 'Job — completed, payout', note: 'The payout figure, Pending with its payout date and bank, review prompt',
    setup: (S) => { S.driveTo('completed'); },
    expect: { has: ['Job completed', TJ4_exact(TJ4_SC.seed.payout), TJ4_neg(TJ4_SC.seed.tailyFee), 'Pending', 'paid out', 'Chase', 'can leave a review'], not: 'Mark completed' } },
];
