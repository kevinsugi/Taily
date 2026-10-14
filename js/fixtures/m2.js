/* ============================================================
   M2 Test-flows entries — one array per screen (pre-scaffolded in M0).
   Each screen builder edits only its own FLOWS_<screen_id> array.
   Entry shape: see docs/v5/CONTEXT.md (FLOWS / EXPECT contract).
   ============================================================ */

import { SCENARIOS, AMARA, PAYOUT_DAYS } from './money-scenarios.js';
import { fmtDay } from '../dates.js';
import { fmt, fmtExact, cents, tailyFeeFor, payoutFor } from '../money.js';
import { MONEY } from '../money-config.js';
import { onboardTo, NEW_TAILOR_PHONE, earningsTo } from './common.js';
import * as A from '../account.js';

export const FLOWS_t_phone = [
  { key: 't-phone', screen: 't-phone', group: 'M2 · Tailor sign-up', title: 'Tailor sign-up — phone', note: 'Signed out: empty field, the six-step promise, Book one link',
    setup: () => { A.signOut('tailor'); },
    expect: { has: ['FOR TAILORS', 'Mobile number', 'Send code', 'six short steps'], sel: '#phone' } },
  { key: 't-phone--invalid', screen: 't-phone', group: 'M2 · Tailor sign-up', title: 'Tailor sign-up — invalid', note: '347555 then Send code',
    setup: (S) => { A.signOut('tailor'); S.state.ui['t-phone'] = { phone: '347555' }; },
    click: ['[data-act="send-code"]'],
    expect: { has: 'Enter a 10-digit US number', sel: '#phone[aria-invalid="true"]' } },
  { key: 't-phone--saved', screen: 't-phone', group: 'M2 · Tailor sign-up', title: 'Tailor sign-up — progress saved', note: 'After Finish later: success banner, number pre-filled',
    setup: (S) => { onboardTo('services'); A.signOut('tailor'); S.state.ui['t-phone'] = { saved: true, phone: NEW_TAILOR_PHONE }; },
    expect: { has: ['Your progress is saved', NEW_TAILOR_PHONE], sel: '.banner--success' } },
];
export const FLOWS_t_code = [
  { key: 't-code', screen: 't-code', group: 'M2 · Tailor sign-up', title: 'Tailor sign-up — enter the code', note: 'Resend countdown frozen at 0:30',
    setup: () => { A.signOut('tailor'); A.sendCode(NEW_TAILOR_PHONE, 'tailor'); },
    expect: { has: ['Enter the code', NEW_TAILOR_PHONE, 'Resend code in 0:30'], sel: '#code' } },
  { key: 't-code--wrong', screen: 't-code', group: 'M2 · Tailor sign-up', title: 'Tailor sign-up — wrong code', note: '000000 then Verify',
    setup: (S) => { A.signOut('tailor'); A.sendCode(NEW_TAILOR_PHONE, 'tailor'); S.state.ui['t-code'] = { code: '000000' }; },
    click: ['[data-act="verify"]'],
    expect: { has: 'Check your texts', sel: '#code[aria-invalid="true"]' } },
  { key: 't-code--expired', screen: 't-code', group: 'M2 · Tailor sign-up', title: 'Tailor sign-up — code expired', note: '11 minutes later: Resend on, Verify off',
    setup: (S) => { A.signOut('tailor'); A.sendCode(NEW_TAILOR_PHONE, 'tailor'); S.advanceClock(11); },
    expect: { has: 'This code expired', sel: '[data-act="resend"]:not([disabled])' } },
  { key: 't-code--resend', screen: 't-code', group: 'M2 · Tailor sign-up', title: 'Tailor sign-up — resend ready', note: 'A minute later: Resend code is a button',
    setup: (S) => { A.signOut('tailor'); A.sendCode(NEW_TAILOR_PHONE, 'tailor'); S.advanceClock(1); },
    expect: { has: 'Resend code', not: 'Resend code in', sel: '[data-act="resend"]:not([disabled])' } },
];
export const FLOWS_to_profile = [
  { key: 'to-profile', screen: 'to-profile', group: 'M2 · Onboarding', title: 'Profile', note: 'Step 1 of 6: blank tailor, name focal, live preview, Finish later',
    setup: () => { onboardTo('profile'); },
    expect: { has: ['Step 1 of 6', 'Your profile', 'Your name', 'About your work', 'WHAT CUSTOMERS SEE', 'Finish later'], not: 'Save changes', sel: '#name' } },
  { key: 'to-profile--errors', screen: 'to-profile', group: 'M2 · Onboarding', title: 'Profile — errors', note: 'No name, a bio three times too long, then Next',
    setup: (S) => { onboardTo('profile'); S.state.ui['to-profile'] = { draft: { name: '', shopName: '', bio: AMARA.bio.repeat(3), photo: false, workPhotos: 0 } }; },
    click: ['[data-act="next"]'],
    expect: { has: ['Enter your name', 'Keep it to 300 characters'], sel: '#name[aria-invalid="true"]' } },
  { key: 'to-profile--edit', screen: 'to-profile', group: 'M2 · Shop', title: 'Profile — edit', note: 'Live tailor: Save changes waits for a change',
    expect: { has: ['Your profile', 'Save changes', 'No changes yet', AMARA.name], not: 'Step 1 of 6', sel: '[data-act="save"][disabled]' } },
];
export const FLOWS_to_services = [
  { key: 'to-services', screen: 'to-services', group: 'M2 · Onboarding', title: 'Services and prices', note: 'Step 2 of 6: three ticked, a live "You get" under each price',
    setup: (S) => { onboardTo('services'); S.state.ui['to-services'] = { draft: { prices: { 'hem-pants': AMARA.prices['hem-pants'], sleeves: AMARA.prices.sleeves, repair: AMARA.prices.repair } } }; },
    expect: { has: ['Step 2 of 6', 'Services and prices', '3 selected', `You get ${fmt(payoutFor({ services: cents(AMARA.prices['hem-pants']) }))}`, 'Bridal gown alterations'], sel: '#price-hem-pants' } },
  { key: 'to-services--missing-price', screen: 'to-services', group: 'M2 · Onboarding', title: 'Services and prices — missing price', note: 'Hem pants ticked with no price, then Next',
    setup: (S) => { onboardTo('services'); S.state.ui['to-services'] = { draft: { prices: { 'hem-pants': null, sleeves: AMARA.prices.sleeves } } }; },
    click: ['[data-act="next"]'],
    expect: { has: 'Enter a price', sel: '#price-hem-pants[aria-invalid="true"]' } },
  { key: 'to-services--none', screen: 'to-services', group: 'M2 · Onboarding', title: 'Services and prices — none ticked', note: 'Nothing ticked: Next is disabled and says why',
    setup: () => { onboardTo('services'); },
    expect: { has: 'Pick at least one service to continue', not: ['You get', 'services on your profile'], sel: '[data-act="next"][disabled]' } },
  { key: 'to-services--resume', screen: 'to-services', group: 'M2 · Onboarding', title: 'Services and prices — resumed', note: 'Signed back in: the pick-up-where-you-left-off banner',
    setup: (S) => { onboardTo('services'); S.state.ui.onboarding = { resumed: true }; },
    expect: { has: ['Pick up where you left off', 'Profile is done', '5 steps to go'] } },
  { key: 'to-services--edit', screen: 'to-services', group: 'M2 · Shop', title: 'Services and prices — edit', note: 'Live tailor: ten ticked, Save changes waits for a change',
    expect: { has: ['Services and prices', 'Save changes', '10 selected', `You get ${fmt(payoutFor({ services: cents(AMARA.prices['hem-pants']) }))}`] } },
];
/* C2 · to-where — the seed's own shop + home settings as a typed draft (stands in for typing) */
const WHERE_DRAFT = () => ({ shop: { enabled: true, street: AMARA.shop.street, zip: AMARA.shop.zip }, home: { enabled: true, zips: [...AMARA.home.zips], fee: AMARA.home.fee } });
export const FLOWS_to_where = [
  { key: 'to-where', screen: 'to-where', group: 'M2 · Onboarding', title: 'Where you work', note: 'Step 3 of 6: shop and home visits on, ZIPs and home-visit fee',
    setup: (S) => { onboardTo('where'); S.state.ui['to-where'] = { draft: WHERE_DRAFT() }; },
    expect: { has: ['Step 3 of 6', 'Where do you work', 'Customers come to my shop', 'I visit customers at home', 'Williamsburg', `Includes ${fmt(cents(AMARA.home.fee))} home-visit fee`], sel: '#home-on[aria-checked="true"]' } },
  { key: 'to-where--home-only', screen: 'to-where', group: 'M2 · Onboarding', title: 'Where you work — home visits only', note: 'Shop switched off: its fields disappear, ZIPs and fee stay',
    setup: (S) => { onboardTo('where'); const W = WHERE_DRAFT(); S.state.ui['to-where'] = { draft: { ...W, shop: { enabled: false, street: '', zip: '' } } }; },
    expect: { has: 'ZIP codes you cover', not: 'Shop street address', sel: '#shop-on[aria-checked="false"]' } },
  { key: 'to-where--none', screen: 'to-where', group: 'M2 · Onboarding', title: 'Where you work — nothing on', note: 'Both switches off, then Next',
    setup: (S) => { onboardTo('where'); S.state.ui['to-where'] = { draft: { shop: { enabled: false, street: '', zip: '' }, home: { enabled: false, zips: [], fee: null } } }; },
    click: ['[data-act="next"]'],
    expect: { has: 'Turn on your shop, home visits, or both' } },
  { key: 'to-where--zip-invalid', screen: 'to-where', group: 'M2 · Onboarding', title: 'Where you work — bad ZIP', note: '1121 typed in Add a ZIP code, then Add',
    setup: (S) => { onboardTo('where'); S.state.ui['to-where'] = { draft: WHERE_DRAFT(), zipInput: '1121' }; },
    click: ['[data-act="zip-add"]'],
    expect: { has: 'Enter a 5-digit ZIP code', sel: '#zip-add[aria-invalid="true"]' } },
  { key: 'to-where--fee-missing', screen: 'to-where', group: 'M2 · Onboarding', title: 'Where you work — fee missing', note: 'Home visits on, fee blank, then Next',
    setup: (S) => { onboardTo('where'); const W = WHERE_DRAFT(); S.state.ui['to-where'] = { draft: { ...W, home: { ...W.home, fee: null } } }; },
    click: ['[data-act="next"]'],
    expect: { has: 'Enter your home-visit fee, or 0 for none', sel: '#fee[aria-invalid="true"]' } },
  { key: 'to-where--edit', screen: 'to-where', group: 'M2 · Shop', title: 'Where you work — edit', note: 'Live tailor: current shop and ZIPs, Save changes waits for a change',
    expect: { has: ['Save changes', 'No changes yet', '11237'], not: 'Step 3 of 6', sel: `#street[value="${AMARA.shop.street}"]` } },
];
export const FLOWS_to_returns = [
  { key: 'to-returns', screen: 'to-returns', group: 'M2 · Onboarding', title: 'Return options', note: 'Step 4 of 6: pickup and drop-off pre-ticked from what she offers, courier off',
    setup: () => { onboardTo('returns'); },
    expect: { has: ['Step 4 of 6', 'How do orders get back', 'In-store pickup', 'Home drop-off', 'Taily courier', 'nothing comes out of your payout'], sel: '#ret-pickup:checked' } },
  { key: 'to-returns--none', screen: 'to-returns', group: 'M2 · Onboarding', title: 'Return options — none picked', note: 'All three off, then Next',
    setup: (S) => { onboardTo('returns'); S.state.ui['to-returns'] = { draft: { pickup: false, dropoff: false, courier: false } }; },
    click: ['[data-act="next"]'],
    expect: { has: 'Pick at least one way to get orders back' } },
  { key: 'to-returns--edit', screen: 'to-returns', group: 'M2 · Shop', title: 'Return options — edit', note: 'Live tailor: all three offered, Save changes waits for a change',
    expect: { has: ['Save changes', 'Taily courier'], not: 'Step 4 of 6', sel: '#ret-courier:checked' } },
];
export const FLOWS_to_availability = [
  { key: 'to-availability', screen: 'to-availability', group: 'M2 · Onboarding', title: 'Availability', note: 'Step 5 of 6: shop and home hours, default week, Shop schedule showing',
    setup: () => { onboardTo('availability'); },
    expect: { has: ['Step 5 of 6', 'When can customers book you', 'Shop', 'Home visits', 'Tuesday', '10:00 AM', '6:00 PM'], sel: '.segmented' } },
  { key: 'to-availability--single', screen: 'to-availability', group: 'M2 · Onboarding', title: 'Availability — one schedule', note: 'Shop only: no segmented control, a Shop hours heading',
    setup: (S) => { onboardTo('availability'); S.T.setTailorSection('where', { home: { enabled: false } }); },
    expect: { has: 'Shop hours', not: 'Home visits', sel: '[data-act="time"]' } },
  { key: 'to-availability--empty', screen: 'to-availability', group: 'M2 · Onboarding', title: 'Availability — no days', note: 'Shop only with every day closed, then Next',
    setup: (S) => { onboardTo('availability'); S.T.setTailorSection('where', { home: { enabled: false } }); S.state.ui['to-availability'] = { draft: { shop: {}, home: {} }, seg: 'shop' }; },
    click: ['[data-act="next"]'],
    expect: { has: ['Add at least one day of shop hours', 'Closed'] } },
  { key: 'to-availability--overlap', screen: 'to-availability', group: 'M2 · Onboarding', title: 'Availability — overlap', note: 'Thursday shop 10 AM-4 PM and home 3-8 PM overlap, then Next',
    setup: (S) => { onboardTo('availability'); S.state.ui['to-availability'] = { draft: { shop: { thu: ['10:00', '16:00'] }, home: { thu: ['15:00', '20:00'] } }, seg: 'shop' }; },
    click: ['[data-act="next"]'],
    expect: { has: ['Overlaps your home-visit hours', '3:00 PM'] } },
  { key: 'to-availability--edit', screen: 'to-availability', group: 'M2 · Shop', title: 'Availability — edit', note: 'Live tailor: current week, Save changes waits for a change',
    expect: { has: ['Save changes', 'Saturday', '1:00 PM'], not: 'Step 5 of 6', sel: '[data-act="save"][disabled]' } },
];
export const FLOWS_to_payouts = [
  { key: 'to-payouts', screen: 'to-payouts', group: 'M2 · Onboarding', title: 'Payouts', note: 'Step 6 of 6: the fee sentence in dollars, then the bank fields',
    setup: () => { onboardTo('payouts'); },
    expect: { has: ['Step 6 of 6', 'How you get paid', `On a ${fmtExact(cents(MONEY.FEE_EXAMPLE_SERVICES))} order, Taily keeps ${fmtExact(tailyFeeFor(cents(MONEY.FEE_EXAMPLE_SERVICES)))} and you get ${fmtExact(payoutFor({ services: cents(MONEY.FEE_EXAMPLE_SERVICES) }))}`, `Your ${fmt(cents(AMARA.home.fee))} home-visit fee is yours in full`, 'Finish and go live'] } },
  { key: 'to-payouts--invalid', screen: 'to-payouts', group: 'M2 · Onboarding', title: 'Payouts — invalid', note: 'Empty name, 5-digit routing, 2-digit account, then Finish',
    setup: (S) => { onboardTo('payouts'); S.state.ui['to-payouts'] = { draft: { holder: '', routing: '02100', account: '12' } }; },
    click: ['[data-act="next"]'],
    expect: { has: ['Enter the name on the account', 'Enter the 9-digit routing number', 'Account numbers are 4 to 17 digits'], sel: '#holder[aria-invalid="true"]' } },
  { key: 'to-payouts--edit', screen: 'to-payouts', group: 'M2 · Shop', title: 'Payouts — edit', note: 'Live tailor: current bank, account blank keeps it, Save changes waits for a change',
    expect: { has: ['Save changes', `${AMARA.payouts.bank} ••${AMARA.payouts.last4}`, 'Leave blank to keep'], not: 'Step 6 of 6' } },
  { key: 'to-payouts--returned', screen: 'to-payouts', group: 'M5 · Earnings', title: 'Payouts — a payout came back', note: 'Fix bank details from Earnings: the returned amount, the bank, and the Friday it sends again after a save',
    setup: () => { earningsTo('failed'); },
    get expect() {
      return { has: [`Your ${fmtExact(SCENARIOS.seed.payout)} payout came back`, `${AMARA.payouts.bank} ••${AMARA.payouts.last4} sent it back`, `we’ll send it again on ${fmtDay(PAYOUT_DAYS.second)}`, 'Save changes'], sel: '.banner--error' };
    } },
];
export const FLOWS_to_done = [
  { key: 'to-done', screen: 'to-done', group: 'M2 · Onboarding', title: 'You’re bookable', note: 'Live: her row as a customer sees it, what happens next',
    setup: () => { onboardTo('done'); },
    expect: { has: ['bookable', 'HOW A CUSTOMER IN WILLIAMSBURG SEES YOU', `Est. ${fmt(SCENARIOS.seed.total)}`, 'What happens next', 'Go to my shop'], sel: '.customer-preview .tailor-row' } },
];
export const FLOWS_t_shop = [
  { key: 't-shop', screen: 't-shop', group: 'M2 · Shop', title: 'Your shop', note: 'Bookable: preview of her row, seven setup rows with summaries',
    expect: { has: ['Your shop', 'Bookable', 'WHAT CUSTOMERS SEE', `Est. ${fmt(SCENARIOS.seed.total)}`, 'Reyes Tailoring', `1 day +${fmt(cents(AMARA.rush[0].fee))}`, `${AMARA.payouts.bank} ••${AMARA.payouts.last4}`] } },
  { key: 't-shop--incomplete', screen: 't-shop', group: 'M2 · Shop', title: 'Your shop — needs attention', note: 'Home visits on with no home hours: warning banner, row flagged, no estimate',
    setup: (S) => { S.T.setTailorSection('availability', { availability: { shop: AMARA.availability.shop, home: {} } }); },
    expect: { has: ['Customers can', 'Finish Availability', 'Needs attention'], not: 'Est.', sel: '.banner--warning' } },
];
export const FLOWS_t_rush = [
  { key: 't-rush', screen: 't-rush', group: 'M2 · Shop', title: 'Rush fees', note: 'Three tiers filled, preview reads like the customer ladder',
    expect: { has: ['Rush fees', 'Ready within 1 day of the visit', '4 days or more', 'yours in full', `+${fmt(cents(AMARA.rush[0].fee))}`], sel: '#rush-1' } },
  { key: 't-rush--invalid', screen: 't-rush', group: 'M2 · Shop', title: 'Rush fees — invalid', note: '1 day cheaper than 2 days, 3 days blank, then Save',
    setup: (S) => { S.state.ui['t-rush'] = { draft: { on: true, fees: { 1: String(AMARA.rush[2].fee), 2: String(AMARA.rush[0].fee), 3: '' } } }; },
    click: ['[data-act="save"]'],
    expect: { has: [`more than your 1-day fee (${fmt(cents(AMARA.rush[2].fee))})`, 'Enter an amount, or 0 for no fee'], sel: '#rush-2[aria-invalid="true"]' } },
  { key: 't-rush--unsaved', screen: 't-rush', group: 'M2 · Shop', title: 'Rush fees — leave without saving', note: 'Edited the 1-day fee, then Back',
    setup: (S) => { S.state.ui['t-rush'] = { draft: { on: true, fees: { 1: String(AMARA.rush[0].fee + 10), 2: String(AMARA.rush[1].fee), 3: String(AMARA.rush[2].fee) } } }; },
    click: ['.back'],
    expect: { has: ['Leave without saving', 'Keep editing', 'Discard changes'], sel: '[role="alertdialog"]' } },
];
