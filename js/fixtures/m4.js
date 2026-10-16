/* ============================================================
   M4 Test-flows entries — one array per screen (pre-scaffolded in M0).
   Each screen builder edits only its own FLOWS_<screen_id> array.
   Entry shape: see docs/v5/CONTEXT.md (FLOWS / EXPECT contract).
   ============================================================ */

import { SCENARIOS as TJ4_SC, SEED_SLOT as TJ4_SLOT } from './money-scenarios.js';
import { fmtExact as TJ4_exact, fmtNeg as TJ4_neg } from '../money.js';
import * as TJ4_C from './common.js';
import { setFocus as TJ4_setFocus } from '../focus.js';
import { FITTING_COMMENTS as TJ4_FC } from './common.js';

import { SCENARIOS as CC_SC, AMARA as CC_AMARA } from './money-scenarios.js';
import { fmtExact as ccExact } from '../money.js';
import { REVIEW_LIMITS as CV_LIMITS } from '../data.js';

/* ---------- C1 · Price change (t-adjust, c-price-change) ---------- */
import { SCENARIOS as PC_SCENARIOS, AMARA as PC_AMARA } from './money-scenarios.js';
import { PRICE_NOTES as PC_PRICE_NOTES, FITTING_COMMENTS as PC_FC } from './common.js';
import { TAILOR_LIMITS as PC_LIMITS, FITTING_LIMITS as PC_FL } from '../data.js';
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
const PC_itemAdded = (S, docs = 'none') => {
  const a = S.driveTo('fitting', { docs });
  S.state.ui['t-adjust'] = {
    apptId: a.id, mode: 'new', prices: {}, removed: ['g2:jacket-sides'], added: [{ garmentId: 'n1', serviceId: 'hem-pants' }],
    items: [{ id: 'n1', type: 'Pants / Jeans' }], removedItems: [], note: '', seq: 2,
  };
  return a;
};
const PC_MAX = 10;

export const FLOWS_t_adjust = [
  { key: 't-adjust', screen: 't-adjust', group: PC_GROUP, title: 'Edit the job', note: 'At the fitting: every item and service as booked, no photos yet, so Send is off and says why (K-02: Before and Pinned photos are required)',
    setup: (S) => { S.driveTo('fitting'); },
    expect: { has: ['Edit the job', 'Hem pants', 'Shorten sleeves', 'Take in jacket sides', 'Add a service', 'Add an item', 'No changes', 'Send to Sarah for approval', PC_fmtExact(PC_sc.seed.payout), 'Before photos', 'Pinned photos', 'Required', 'Add before and pinned photos for 2 items'], not: 'Add at least one', sel: '[data-act="send"][aria-disabled="true"]:not([disabled])' } },
  { key: 't-adjust--photos-required', screen: 't-adjust', group: PC_GROUP, title: 'Edit the job — photos still required', note: 'D-196: nothing tried yet, so a quiet Required where the count goes and a soft-disabled Send; no red',
    setup: (S) => { S.driveTo('fitting'); },
    expect: { has: ['Required', 'Add before and pinned photos for 2 items'], not: 'Add at least one', sel: '[data-act="send"][aria-disabled="true"]:not([disabled])' } },
  { key: 't-adjust--edited', screen: 't-adjust', group: PC_GROUP, title: 'Edit the job — edited', note: 'Sleeves repriced, Taper legs added: the marks, the new total and what Amara is paid',
    setup: (S) => { PC_edited(S); },
    expect: { has: ['New', 'New price', 'Taper legs', PC_fmtExact(PC_sc.priceAdded.total), PC_fmtExact(PC_sc.priceAdded.payout), PC_fmtNeg(PC_sc.priceAdded.tailyFee), 'up', '1 service added'], not: 'Added' } },
  { key: 't-adjust--item-added', screen: 't-adjust', group: PC_GROUP, title: 'Edit the job — item added', note: 'A Pants / Jeans item with Hem pants (green New item card), Take in jacket sides struck: total and payout move down',
    setup: (S) => { PC_itemAdded(S); },
    expect: { has: ['New item', 'Pants / Jeans', 'Removed', '1 item added', PC_fmtExact(PC_sc.priceItem.total), PC_fmtExact(PC_sc.priceItem.payout), 'down'] } },
  { key: 't-adjust--remove-item', screen: 't-adjust', group: PC_GROUP, title: 'Edit the job — item removed', note: 'The Suit Pant card collapsed and struck, its service listed struck, Undo',
    setup: (S) => {
      const a = S.driveTo('fitting');
      S.state.ui['t-adjust'] = { apptId: a.id, mode: 'new', prices: {}, removed: [], added: [], items: [], removedItems: ['g1'], note: '' };
    },
    expect: { has: ['Removed', 'Undo', '1 item removed', PC_fmtExact(PC_sc.priceItemRemoved.total), PC_fmtExact(PC_sc.priceItemRemoved.payout)], sel: '[data-act="undo-item"][data-garment="g1"]' } },
  { key: 't-adjust--add-item', screen: 't-adjust', group: PC_GROUP, title: 'Add an item', note: 'Step 1: the types Amara prices at least one service for, with the number of services and their prices',
    setup: (S) => { S.driveTo('fitting'); },
    click: ['[data-act="add-item"]'],
    expect: { has: ['Add an item', 'Pants / Jeans', 'Shirt / Blouse', 'Skirt', 'services · $', 'Repair only'], sel: '[data-s="t-adjust-add-item"] [data-act="pick-type"]' } },
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
      S.documentFitting(a.id);                                  // K-02: undocumented, the disabled Send would swallow the click
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
    expect: { has: ['Leave without sending?', 'Keep editing', 'Your photos and comments are saved'] } },
  /* ---- K-02 · fitting documentation ---- */
  { key: 't-adjust--docs', screen: 't-adjust', group: PC_GROUP, title: 'Edit the job — photographed', note: 'K-02: two Before and two Pinned photos per item and a comment on the Suit Jacket: nothing missing, Send is on',
    setup: (S) => { S.driveTo('fitting', { docs: 'full' }); },
    expect: { has: ['2 of 4', 'Your comment', PC_FC.g2, 'No changes'], not: ['Add at least one', 'Add before and pinned photos'], sel: '[data-act="send"]:not([disabled])' } },
  { key: 't-adjust--photos-missing', screen: 't-adjust', group: PC_GROUP, title: 'Edit the job — one item still needs a photo', note: 'K-02: the Suit Pant is done, the Suit Jacket has a Pinned photo but no Before: its card and the bar say so',
    setup: (S) => {
      const a = S.driveTo('fitting');
      S.T.addFittingPhoto(a.id, 'g1', 'before'); S.T.addFittingPhoto(a.id, 'g1', 'pinned'); S.T.addFittingPhoto(a.id, 'g2', 'pinned');
    },
    click: ['[data-act="send"]'],
    expect: { has: ['Add at least one before photo', 'Add before and pinned photos for 1 item'], not: 'Add at least one pinned photo', sel: '[data-garment="g2"] [data-missing-msg="before"]' } },
  { key: 't-adjust--item-docs', screen: 't-adjust', group: PC_GROUP, title: 'Edit the job — a new item needs photos too', note: 'K-02: the Suit Jacket and Suit Pant are photographed, the added Pants / Jeans is not: its card is flagged and Send stays off',
    setup: (S) => { PC_itemAdded(S, 'min'); },
    expect: { has: ['New item', 'Pants / Jeans', 'Add before and pinned photos for 1 item'], sel: '[data-garment="n1"] [data-missing-msg="pinned"]' } },
  { key: 't-adjust--docs-max', screen: 't-adjust', group: PC_GROUP, title: 'Edit the job — four Before photos', note: 'K-02: at the limit the Before add tile is gone and a line says why',
    setup: (S) => {
      const a = S.driveTo('fitting', { docs: 'min' });
      for (let i = 0; i < PC_FL.PHOTOS_MAX - 1; i += 1) S.T.addFittingPhoto(a.id, 'g2', 'before');
    },
    expect: { has: [`${PC_FL.PHOTOS_MAX} of ${PC_FL.PHOTOS_MAX}`, `Up to ${PC_FL.PHOTOS_MAX} before photos`], sel: `[data-garment="g2"] [data-kind="before"] [data-act="view-doc"][data-index="${PC_FL.PHOTOS_MAX - 1}"]` } },
  { key: 't-adjust--comment', screen: 't-adjust', group: PC_GROUP, title: 'Edit the job — writing a comment', note: 'K-02: the comment editor on the Suit Jacket, unsaved, with Save and Cancel',
    setup: (S) => {
      const a = S.driveTo('fitting', { docs: 'min' });
      S.state.ui['t-adjust'] = { apptId: a.id, mode: 'new', comments: { g2: PC_FC.g2 } };
    },
    expect: { has: ['Comment for Sarah', `${[...PC_FC.g2].length} / ${PC_FL.COMMENT_MAX}`, 'Save', 'Cancel'], sel: '#comment-g2' } },
  { key: 't-adjust--comment-masked', screen: 't-adjust', group: PC_GROUP, title: 'Edit the job — a phone number in a comment', note: 'K-02: the saved comment shows [phone hidden] and the card says it is hidden from Sarah',
    setup: (S) => { const a = S.driveTo('fitting', { docs: 'min' }); S.T.setFittingComment(a.id, 'g1', PC_FC.masked); },
    expect: { has: ['phone hidden', 'hidden from Sarah'], not: '555-0118' } },
  { key: 't-adjust--photo-viewer', screen: 't-adjust', group: PC_GROUP, title: 'A before photo', note: 'K-02: the viewer sheet: who took it and when, the Before | Pinned tabs, 1 of 2, Remove photo',
    setup: (S) => { S.driveTo('fitting', { docs: 'full' }); },
    click: ['[data-garment="g2"] [data-act="view-doc"][data-kind="before"][data-index="0"]'],
    expect: { has: ['Suit Jacket · Before', 'Taken by you', '1 of 2', 'Remove photo', 'Pinned'], sel: '[data-s="docs-viewer"]' } },
  { key: 't-adjust--revise-docs', screen: 't-adjust', group: PC_GROUP, title: 'Edit the order you sent — a new photo', note: 'K-02: a photo added after sending is a change on its own: "Send the updated order" turns on',
    setup: (S) => {
      const a = S.driveTo('price-change', { priceChange: 'item' });
      S.T.addFittingPhoto(a.id, 'g2', 'pinned');
      S.state.ui['t-adjust'] = { apptId: a.id, mode: 'revise' };
    },
    expect: { has: ['Edit the order you sent', '2 of 4'], sel: '[data-act="send"]:not([disabled])' } },
];

export const FLOWS_c_price_change = [
  { key: 'c-price-change', screen: 'c-price-change', group: PC_GROUP_C, title: 'Review your final order', note: 'Taper added, Sleeves repriced: the marks, the new total, the unchanged deposit, two choices',
    setup: (S) => { S.driveTo('price-change'); },
    expect: { has: ['Approve your final order · Amara changed it at the fitting', 'New total', 'Was ', 'WHAT CHANGED', '1 service added', 'Taper legs', 'New', 'New price', PC_fmtExact(PC_sc.priceAdded.total), PC_fmtExact(PC_sc.priceAdded.balance), PC_fmtExact(PC_sc.seed.total), PC_fmtExact(PC_sc.seed.deposit), 'Stays the same', 'due when it’s ready', 'Approve and start', 'Message Amara', 'note'], not: ['Reject', 'Decline', 'Added', 'Review your final order', 'Once you approve'], sel: '[data-strip="action"] + .page-head h1' } },
  { key: 'c-price-change--item-added', screen: 'c-price-change', group: PC_GROUP_C, title: 'Final order — item added', note: 'Pants / Jeans as a green New item, Take in jacket sides struck: lower total and balance, deposit unchanged',
    setup: (S) => { S.driveTo('price-change', { priceChange: 'item' }); },
    expect: { has: ['New item', 'Pants / Jeans', 'Hem pants', 'Removed', 'Take in jacket sides', '1 item added', '1 service removed', 'down', PC_fmtExact(PC_sc.priceItem.total), PC_fmtExact(PC_sc.priceItem.balance), PC_fmtExact(PC_sc.seed.deposit)], sel: '[data-garment="n1"] [data-act="view-photos"]', rowFit: true } },
  { key: 'c-price-change--item-removed', screen: 'c-price-change', group: PC_GROUP_C, title: 'Final order — item removed', note: 'The Suit Pant struck with one Removed tag: lower total and balance',
    setup: (S) => { S.driveTo('price-change', { priceChange: 'item-removed' }); },
    expect: { has: ['Removed', 'Suit Pant', '1 item removed', PC_fmtExact(PC_sc.priceItemRemoved.total), PC_fmtExact(PC_sc.priceItemRemoved.balance)], not: 'New item' } },
  { key: 'c-price-change--removed', screen: 'c-price-change', group: PC_GROUP_C, title: 'Final order — service removed', note: 'Take in jacket sides removed: struck row, lower total and balance',
    setup: (S) => { S.driveTo('price-change', { priceChange: 'removed' }); },
    expect: { has: ['Removed', 'Take in jacket sides', '1 service removed', 'down', PC_fmtExact(PC_sc.priceRemoved.total), PC_fmtExact(PC_sc.priceRemoved.balance)] } },
  { key: 'c-price-change--repriced', screen: 'c-price-change', group: PC_GROUP_C, title: 'Final order — one price changed', note: 'Sleeves $5 more, nothing added',
    setup: (S) => { S.driveTo('price-change', { priceChange: 'repriced' }); },
    expect: { has: ['New price', '1 new price', PC_fmtExact(PC_sc.priceRepriced.total), PC_fmtExact(PC_sc.priceRepriced.balance)], not: ['New item', 'Removed'] } },
  { key: 'c-price-change--messaged', screen: 'c-price-change', group: PC_GROUP_C, title: 'You messaged Amara', note: 'After Message: the strip says so (no banner), Open chat in place of Message, Approve still available',
    setup: (S) => { const a = S.driveTo('price-change'); S.T.sendMessage(a.tailorId, 'customer', { text: 'Could we keep the sleeves at the old price?' }); },
    expect: { has: ['You messaged Amara · approve when you’re ready', 'Open chat', 'Approve and start'], not: ['Approve your final order', 'Review your final order'], sel: '[data-strip="warn"]' } },
  { key: 'c-price-change--unchanged', screen: 'c-price-change', group: PC_GROUP_C, title: 'Final order — no changes', note: 'Amara sent the order as booked: "No changes", the booked total, still one tap to approve',
    setup: (S) => { S.driveTo('price-change', { priceChange: 'unchanged' }); },
    expect: { has: ['Approve your final order · Amara checked everything, nothing changed', 'YOUR ORDER', 'Same as booked', 'final prices', 'Hem pants', 'Shorten sleeves', 'Take in jacket sides', PC_fmtExact(PC_sc.seed.total), PC_fmtExact(PC_sc.seed.balance), 'Approve and start'], not: ['New total', 'New balance', 'Removed', 'New price', 'Same items, same price'] } },
  /* ---- K-02 · the tailor's photos on the order ---- */
  { key: 'c-price-change--docs', screen: 'c-price-change', group: PC_GROUP_C, title: 'Final order — with the fitting photos', note: 'K-04: each garment’s name, icon and photo stack (Amara’s fitting photos replace Sarah’s) and Amara’s comment',
    setup: (S) => { S.driveTo('price-change', { docs: 'full' }); },
    expect: { has: ['photos', 'Amara’s comment', PC_FC.g2], sel: '[data-garment="g2"] [data-act="view-photos"][data-source="fitting"]' } },
  { key: 'c-price-change--docs-pinned', screen: 'c-price-change', group: PC_GROUP_C, title: 'Final order — the Pinned photos', note: 'K-04: the photo stack opened, the Pinned tab selected in the viewer',
    setup: (S) => { S.driveTo('price-change', { docs: 'full' }); },
    click: ['[data-garment="g2"] [data-act="view-photos"]', '[data-s="docs-viewer"] [data-act="docs-tab"][data-kind="pinned"]'],
    expect: { has: 'Suit Jacket · Pinned', sel: '[data-s="docs-viewer"] [role="tab"][aria-selected="true"][data-kind="pinned"]' } },
  { key: 'c-price-change--photo-viewer', screen: 'c-price-change', group: PC_GROUP_C, title: 'A before photo', note: 'K-02: Amara’s photo opened full size: who took it, 2 of 2, no way to remove it',
    setup: (S) => { S.driveTo('price-change', { docs: 'full' }); },
    click: ['[data-garment="g2"] [data-act="view-photos"]', '[data-s="docs-viewer"] [data-act="doc-thumb"][data-index="1"]'],
    expect: { has: ['Suit Jacket · Before', 'Taken by Amara', '2 of 2'], not: 'Remove photo', sel: '[data-s="docs-viewer"]' } },
  { key: 'c-price-change--comment-masked', screen: 'c-price-change', group: PC_GROUP_C, title: 'Final order — a hidden phone number', note: 'K-02: Amara’s comment had a phone number: Sarah sees [phone hidden] and why',
    setup: (S) => {
      const a = S.driveTo('fitting', { docs: 'min' });
      S.T.setFittingComment(a.id, 'g2', PC_FC.masked);
      S.T.sendPriceChange(a.id, a.lines);
    },
    expect: { has: ['phone hidden', 'Phone numbers and emails in this comment are hidden'], not: '555-0118' } },
];
/* ---------- C3 · Customer return + pay (c-ready) · prefix CR_ ---------- */
import { SCENARIOS as CR_SC } from './money-scenarios.js';
import { fmtExact as CR_fmtExact } from '../money.js';

const CR_GROUP = 'M4 · Ready';
export const FLOWS_c_ready = [
  { key: 'c-ready', screen: 'c-ready', group: CR_GROUP, title: 'Your order is ready', note: 'Three ways back, nothing chosen: Pay waits for a choice',
    setup: (S) => { S.driveTo('ready'); },
    expect: { has: ['Your order is ready', 'HOW DO YOU WANT IT BACK?', 'In-store pickup', 'Home drop-off', 'Taily courier', 'Free', 'Due now', CR_fmtExact(CR_SC.seed.balance), 'Choose how to get it back first', 'YOUR ORDER', 'Suit Pant', 'Message Amara'], sel: '[data-act="pay"][disabled]' } },
  { key: 'c-ready--pickup-only', screen: 'c-ready', group: CR_GROUP, title: 'Ready — pickup is the only way back', note: 'One offer: pre-chosen, named in a line, Pay is on',
    setup: (S) => { const a = S.driveTo('in-progress'); S.T.markReady(a.id, { returns: ['pickup'] }); },
    expect: { has: ['In-store pickup', 'In-store pickup · Free', 'for this order', `Pay ${CR_fmtExact(CR_SC.seed.balance)}`], not: ['Home drop-off', 'Taily courier'] } },
  { key: 'c-ready--courier-loading', screen: 'c-ready', group: CR_GROUP, title: 'Courier — getting a price', note: 'Pickup chosen, then Taily courier tapped with the wait held: courier checked, skeleton, Pay waits (R4-2-C-01)',
    setup: (S) => { const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'pickup'); S.state.sim.latency = 'hold'; },
    click: ['[data-act="return"][data-value="courier"]'],
    expect: { has: ['Getting a price from Uber', 'Getting a price…', 'Waiting for the courier price'], sel: '[data-act="return"][data-value="courier"][aria-checked="true"]' } },
  { key: 'c-ready--courier-loading-model', screen: 'c-ready', group: CR_GROUP, title: 'Courier — quote still loading (model)', note: 'appt.courier.state is loading (sim.courier): the same skeleton and the same Pay wait',
    setup: (S) => { const a = S.driveTo('ready'); S.state.sim.courier = 'loading'; S.T.chooseReturn(a.id, 'courier'); },
    expect: { has: ['Getting a price from Uber', 'Waiting for the courier price'], sel: '.skeleton' }, visual: false },
  { key: 'c-ready--courier', screen: 'c-ready', group: CR_GROUP, title: 'Courier — quote + fee = total', note: 'Uber quote, Taily courier fee, Courier total; balance and Pay include it',
    setup: (S) => { const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'courier'); },
    expect: { has: ['Uber quote', 'Taily courier fee', CR_fmtExact(CR_SC.courierQuote.quote), CR_fmtExact(CR_SC.courierQuote.markup), CR_fmtExact(CR_SC.courier.courier), `Courier · ${CR_fmtExact(CR_SC.courier.courier)}`, `Pay ${CR_fmtExact(CR_SC.courier.balance)}`] } },
  { key: 'c-ready--courier-failed', screen: 'c-ready', group: CR_GROUP, title: 'Courier — no price', note: 'Uber did not answer: Try again, or pick another way back',
    setup: (S) => { const a = S.driveTo('ready'); S.state.sim.courier = 'fail'; S.T.chooseReturn(a.id, 'courier'); },
    expect: { has: ['Get a courier price', 'Try again', 'pick another way back'], not: 'Uber quote' } },
  { key: 'c-ready--refund', screen: 'c-ready', group: CR_GROUP, title: 'Ready — total below the deposit', note: 'Nothing to pay: the difference comes back to the card; the bar says Confirm and get $X back (D-156)',
    setup: (S) => {
      const a = S.driveTo('fitting', { visitType: 'shop' });
      S.documentFitting(a.id, { lines: CR_SC.priceBelowDeposit.lines });
      S.T.sendPriceChange(a.id, CR_SC.priceBelowDeposit.lines);
      S.T.approvePriceChange(a.id);
      S.T.markReady(a.id);
    },
    expect: { has: ['Your final total is less than your deposit', 'the difference comes back to your card', CR_fmtExact(CR_SC.priceBelowDeposit.refund), 'Nothing to pay', 'Refund to your card', 'After you choose', 'Choose how to get it back first', 'Message Amara'], not: ['Due now', `Pay ${CR_fmtExact(CR_SC.priceBelowDeposit.balance)}`] } },
  { key: 'c-ready--pay', screen: 'c-ready', group: CR_GROUP, title: 'Pay the balance', note: 'Sheet: balance, deposit already off, saved card + Apple Pay',
    setup: (S) => { const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'pickup'); },
    click: ['[data-act="pay"]'],
    expect: { has: ['Pay the balance', 'Visa •••• 4242', 'Apple Pay', 'deposit is already taken off', CR_fmtExact(CR_SC.seed.balance)] } },
  { key: 'c-ready--pay-failed', screen: 'c-ready', group: CR_GROUP, title: 'Payment declined', note: 'Banner stays after the sheet closes: nothing charged, Pay another way',
    setup: (S) => { const a = S.driveTo('ready'); S.T.chooseReturn(a.id, 'pickup'); S.state.sim.card = 'declined'; S.T.payBalance(a.id, S.state.customer.cards[0].id); },
    expect: { has: ['Your card was declined', 'nothing was charged', 'Use another card'], sel: '.banner--error' } },
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
  { key: 'c-complete', screen: 'c-complete', group: 'M4 · Completed', title: 'Order complete — review prompt and receipt row', note: 'K-17 "Linen and cognac": the stitch stage with the garments on tags, Amara’s label with five stars, the receipt as one row',
    setup: (S) => { S.driveTo('completed'); },
    expect: { has: ['ORDER COMPLETE', 'Back with you, tailored to fit.', 'TAILORED BY', 'Amara Reyes', 'How did Amara do?', 'Tap a star to rate', 'profile as Sarah C.', 'Receipt', 'Paid', ccExact(CC_SC.seed.total), 'in full', 'Visa', 'Message Amara'], not: 'Leave a review', sel: '[data-stars]' } },
  { key: 'c-complete--many', screen: 'c-complete', group: 'M4 · Completed', title: 'Order complete — five items', note: 'K-21 sliding rail: the stitch stays, full-size tags slide along it (three + a peek), the count under it; no “+N more”',
    setup: (S) => { S.driveTo('completed', { items: TJ4_C.MANY_ITEMS }); },
    expect: { has: ['ORDER COMPLETE', 'Back with you, tailored to fit.', 'Suit Jacket', 'Skirt', '5 items · 6 services', 'TAILORED BY'], not: ['more item'], sel: '.tag-rail__scroll[role="region"][tabindex="0"][aria-label="5 items, scroll for more"]' } },
  { key: 'c-complete--receipt', screen: 'c-complete', group: 'M4 · Completed', title: 'Order complete — receipt open', note: 'The receipt row opens in place: how it came back, what was paid, what paid the balance (K-17)',
    setup: (S) => { S.driveTo('completed'); },
    click: ['[data-act="receipt"]'],
    expect: { has: ['Receipt', ccExact(CC_SC.seed.total), ccExact(CC_SC.seed.balance), 'Balance paid with'], sel: '[data-act="receipt"][aria-expanded="true"]' } },
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
    expect: { has: ['Thanks, Sarah', 'Sarah C.', 'Perfect fit', `(${CC_AMARA.rating.count + 1})`, 'See Amara'] } },
];

/* ---------- C2 · Tailor job loop (t-job M4 states) ---------- */
const TJ4 = { group: 'M4 · Job', screen: 't-job' };
export const FLOWS_t_job = [
  { ...TJ4, key: 't-job--visit', title: 'Job — visit time, start the fitting', note: 'Clock at the visit start: Start fitting (the bar’s one action), Sarah’s block with Message / Directions / Add to calendar, no-show wait note',
    setup: (S) => { S.driveTo('confirmed'); S.setClock(TJ4_SLOT); },
    expect: { has: ['Time for the fitting', 'Start fitting', 'Message', 'Directions'], not: ['You accepted', 'Message Sarah'], sel: '[data-act="more"]' } },
  { ...TJ4, key: 't-job--fitting', title: 'Job — fitting', note: 'Reached by Back from the editor: Fitting pill, payout in the bar, Edit the job (no shortcut past Sarah)',
    setup: (S) => { S.driveTo('fitting'); },
    expect: { has: ['Fitting', 'Edit the job', 'Message', TJ4_exact(TJ4_SC.seed.payout), 'Fitting now', 'Needed by Fri, Oct 23', '8 days after the fitting', 'Take a before and a pinned photo of each item'], not: ['No changes, start the work', 'Adjust price', 'make it', 'Message Sarah', 'Fitting with', 'Fitting was'], sel: '[data-strip="action"]' } },
  { ...TJ4, key: 't-job--fitting-docs', title: 'Job — fitting, photographed', note: 'K-04: Back from the editor after photographing: each item row shows its fitting photos (Before + Pinned) as one stack',
    setup: (S) => { S.driveTo('fitting', { docs: 'min' }); },
    expect: { has: ['Fitting', 'photos', 'Edit the job'], sel: '[data-act="view-photos"][data-source="fitting"]' } },
  { ...TJ4, key: 't-job--waiting', title: 'Job — waiting for Sarah to approve', note: 'Payout with the old figure, "The order you sent" with the same marks Sarah sees, Edit the order',
    setup: (S) => { S.driveTo('price-change'); },
    expect: { has: ['Waiting on Sarah to approve', 'Sent ', 'THE ORDER YOU SENT', 'Taper legs', 'New', TJ4_exact(TJ4_SC.priceAdded.payout), `Was ${TJ4_exact(TJ4_SC.seed.payout)}`, `Sarah sees a new total of ${TJ4_exact(TJ4_SC.priceAdded.total)}`, 'Edit the order'], not: ['Waiting for Sarah to approve', 'You sent the final order'], sel: '.change-list' } },
  { ...TJ4, key: 't-job--waiting-unchanged', title: 'Job — waiting, order sent as booked', note: 'Nothing changed: "No changes", Same as booked, every booked row plain, still waiting for Sarah',
    setup: (S) => { S.driveTo('price-change', { priceChange: 'unchanged' }); },
    expect: { has: ['Waiting on Sarah to approve', 'No changes', 'Same as booked', TJ4_exact(TJ4_SC.seed.total), 'Edit the order'], not: ['Removed', 'New price'] } },
  { ...TJ4, key: 't-job--messaged', title: 'Job — Sarah messaged instead', note: 'Reply to Sarah, her latest message quoted, same price blocks',
    setup: (S) => {
      const a = S.driveTo('price-change');
      S.T.messageAboutPriceChange(a.id);
      S.T.sendMessage(a.tailorId, 'customer', { text: 'Could we keep the sleeves at the old price?' });
    },
    expect: { has: ['Sarah wants to talk about the order', 'Reply to Sarah', 'keep the sleeves', 'Edit the order'], not: ['Your note', 'Your reply'], sel: '.note-quote' } },
  { ...TJ4, key: 't-job--replied', title: 'Job — Amara replied, waiting on Sarah', note: 'After Sarah messaged and Amara answered: the move is Sarah’s again (D-112)',
    setup: (S) => {
      const a = S.driveTo('price-change');
      S.T.messageAboutPriceChange(a.id);
      S.T.sendMessage(a.tailorId, 'customer', { text: 'Could we keep the sleeves at the old price?' });
      S.T.sendMessage(a.tailorId, 'tailor', { text: 'The sleeves took longer than I thought. Happy to talk it through.' });
    },
    expect: { has: ['Waiting on Sarah to approve', 'You replied ', 'Your reply', 'Edit the order'], not: ['Reply to Sarah', 'wants to talk', 'Your note', 'latest message'], sel: '.note-quote' } },
  { ...TJ4, key: 't-job--docs-unsent', title: 'Job — photos changed since sending', note: 'K-02: a photo added after the order went out: a line says Sarah does not see it until the updated order is sent (D-183)',
    setup: (S) => { const a = S.driveTo('price-change'); S.T.addFittingPhoto(a.id, 'g1', 'before'); },
    expect: { has: ['Waiting on Sarah', 'You changed photos or comments since you sent the order'] } },
  { ...TJ4, key: 't-job--approved', title: 'Job — Sarah approved your changes', note: 'K-17: the green strip says Sarah approved (no banner); the new payout is the header amount; due date is one tile row; Mark ready',
    setup: (S) => { S.driveTo('in-progress', { priceChange: 'added' }); },
    expect: { has: ['Sarah approved · work in progress', '8 days left', TJ4_exact(TJ4_SC.priceAdded.payout), 'Mark ready', 'Price updated after the fitting', 'Needed by Fri, Oct 23', 'Fitted Thu, Oct 15'], not: ['Timing', 'TIMING', 'approved your changes'], sel: '[data-strip="done"]' } },
  { ...TJ4, key: 't-job--in-progress', title: 'Job — work in progress', note: 'Order approved as booked: Mark ready is the one next step, no "changes" claim',
    setup: (S) => { S.driveTo('in-progress'); },
    expect: { has: ['In progress', '8 days left', 'Needed by Fri, Oct 23', 'Mark ready'], not: ['Sarah approved', 'Work in progress', 'TIMING'], sel: '[data-strip="calm"]' } },
  { ...TJ4, key: 't-job--docs', title: 'Job — the work, documented', note: 'K-04: The work with each item’s name, icon and fitting-photo stack, and Your comment (the approved record)',
    setup: (S) => { S.driveTo('in-progress', { docs: 'full' }); },
    expect: { has: ['THE WORK', 'photos', 'Your comment', TJ4_FC.g2, TJ4_FC.g1], sel: '[data-garment="g2"] [data-act="view-photos"][data-source="fitting"]' } },
  { ...TJ4, key: 't-job--docs-pinned', title: 'Job — the Pinned photos', note: 'K-04: the photo stack opened, the Pinned tab selected in the viewer',
    setup: (S) => { S.driveTo('in-progress', { docs: 'full' }); },
    click: ['[data-garment="g2"] [data-act="view-photos"]', '[data-s="docs-viewer"] [data-act="docs-tab"][data-kind="pinned"]'],
    expect: { has: 'Suit Jacket · Pinned', sel: '[data-s="docs-viewer"] [role="tab"][aria-selected="true"][data-kind="pinned"]' } },
  { ...TJ4, key: 't-job--mark-ready', title: 'Job — mark ready sheet', note: 'All three ways back ticked; the courier is never her money',
    setup: (S) => { S.driveTo('in-progress'); },
    click: ['[data-act="mark-ready"]'],
    expect: { has: ['Mark the order ready?', 'In-store pickup', 'Home drop-off', 'Taily courier', 'not taken from your payout', TJ4_exact(TJ4_SC.seed.balance)], not: 'Not yet', sel: '[data-act="ready-ok"]' } },
  { ...TJ4, key: 't-job--ready', title: 'Job — ready, waiting for Sarah', note: 'Ways back you offered, balance due, Message only',
    setup: (S) => { S.driveTo('ready'); },
    expect: { has: ['Ready · Sarah is choosing how to get it back', 'RETURN OPTIONS YOU OFFERED', TJ4_exact(TJ4_SC.seed.balance), 'plus the courier if she picks it'] } },
  { ...TJ4, key: 't-job--returning-pickup', title: 'Job — Sarah picks it up', note: 'In-store pickup at the shop, Mark completed',
    setup: (S) => { S.driveTo('returning'); },
    expect: { has: ['In-store pickup · Sarah paid the balance', 'IN-STORE PICKUP', 'Reyes Tailoring', 'Mark completed'], not: ['will pick it up'] } },
  { ...TJ4, key: 't-job--returning-dropoff', title: 'Job — drop it off at Sarah’s', note: 'Home drop-off with her full address, To drop off pill',
    setup: (S) => { S.driveTo('returning', { returnOption: 'dropoff' }); },
    expect: { has: ['Home drop-off · agree on a time in chat', 'HOME DROP-OFF', '145 N 7th St', 'Mark completed'] } },
  { ...TJ4, key: 't-job--courier', title: 'Job — courier booked', note: 'Uber quote + Taily courier fee = total, paid by Sarah, payout unchanged',
    setup: (S) => { S.driveTo('returning', { returnOption: 'courier' }); },
    expect: { has: ['Courier booked · arrives 6:00–6:30 PM', 'TAILY COURIER', '145 N 7th St', 'Paid by Sarah · nothing comes out of your payout', 'Handed to courier', TJ4_exact(TJ4_SC.seed.payout)], not: [TJ4_exact(TJ4_SC.courierQuote.quote), TJ4_exact(TJ4_SC.courierQuote.markup), TJ4_exact(TJ4_SC.courierQuote.cents), 'Mark completed', 'HAND-OFF'], sel: '[data-strip="done"]' } },
  { ...TJ4, key: 't-job--completed', title: 'Job — completed, payout', note: 'K-20 A2b: the linen stage with the garment tags, Your payout Pending with the Friday it arrives and the bank; nothing about a review until Sarah rates',
    setup: (S) => { S.driveTo('completed'); },
    expect: { has: ['JOB COMPLETED · SARAH’S ORDER', 'Nice work, Amara.', 'Picked up at your shop · ', 'YOUR PAYOUT', 'THE WORK', TJ4_exact(TJ4_SC.seed.payout), TJ4_neg(TJ4_SC.seed.tailyFee), 'Pending', 'Arrives Fri, Oct 16 · to Chase •••• 6789', 'Suit Jacket'], not: ['Mark completed', 'Scheduled', 'can leave a review', 'TAILORED BY', 'Update bank details'], sel: '.linen-stage .tag-rail__tag' } },
  { ...TJ4, key: 't-job--completed-rated', title: 'Job — completed, Sarah rated it', note: 'K-20 A2b: once Sarah rates, one flat row under the payout state: her stars, “Sarah C. · date”, her line in quotes',
    setup: (S) => { S.driveTo('reviewed'); },
    expect: { has: ['Nice work, Amara.', 'YOUR PAYOUT', 'Pending', 'Sarah C. · ', '“Perfect fit, and she was on time.”', 'THE WORK'], sel: '.t-job__rev .stars[aria-label="5 out of 5 stars"]' } },
  { ...TJ4, key: 't-job--completed-paid', title: 'Job — completed, paid', note: 'The Friday run paid it: Paid with the date and the bank (D-172)',
    setup: (S) => { TJ4_C.earningsTo('paid'); TJ4_setFocus(S.state.appts[0].id); },
    expect: { has: ['JOB COMPLETED · SARAH’S ORDER', 'Nice work, Amara.', 'YOUR PAYOUT', 'Paid', 'Fri, Oct 16 · to Chase •••• 6789'], not: ['Pending', 'Arrives', 'Completed Thu'] } },
  { ...TJ4, key: 't-job--completed-failed', title: 'Job — completed, payout didn’t go through', note: 'K-20: calm (no motion), title “Job completed”, the bank sent it back, black “Update bank details” directly under the error, no review row',
    setup: (S) => { TJ4_C.earningsTo('failed'); TJ4_setFocus(S.state.appts[0].id); },
    expect: { has: ['SARAH’S ORDER', 'Job completed', 'YOUR PAYOUT', 'Didn’t go through', 'Chase •••• 6789 sent it back. It sends again once you update your bank details.', 'Update bank details'], not: ['Pending', 'Arrives', 'Nice work', 'See the payout'], sel: '.linen-stage--calm + .t-job__payout [data-act="fix-bank"]' } },
  { ...TJ4, key: 't-job--completed-many', title: 'Job — completed, five items', note: 'K-21 sliding rail on the tailor’s stage: three tags + a peek, the count under the stitch',
    setup: (S) => { S.driveTo('completed', { items: TJ4_C.MANY_ITEMS }); },
    expect: { has: ['Nice work, Amara.', 'Formal Dress', 'Skirt', '5 items · 6 services', 'YOUR PAYOUT'], sel: '.tag-rail__scroll[role="region"][tabindex="0"]' } },
];
