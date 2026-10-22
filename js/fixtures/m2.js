/* ============================================================
   M2 Test-flows entries — one array per screen (pre-scaffolded in M0).
   Each screen builder edits only its own FLOWS_<screen_id> array.
   Entry shape: see docs/v5/CONTEXT.md (FLOWS / EXPECT contract).
   ============================================================ */

import { SCENARIOS, AMARA, PAYOUT_DAYS } from './money-scenarios.js';
import { fmtDay } from '../dates.js';
import { fmt, fmtExact, cents, tailyFeeFor, payoutFor, priceRange } from '../money.js';
import { MONEY } from '../money-config.js';
import { onboardTo, NEW_TAILOR_PHONE, earningsTo } from './common.js';
import * as A from '../account.js';

export const FLOWS_t_phone = [
  { key: 't-phone', screen: 't-phone', group: 'M2 · Tailor sign-up', title: 'Tailor sign-up — phone', note: 'Signed out: Join (K-52: Log in is its own mode), the six-step promise, Book one link',
    setup: () => { A.signOut('tailor'); },
    expect: { has: ['FOR TAILORS', 'Join Taily with your mobile number.', 'Mobile number', 'Send code', 'Six short steps, about 10 minutes', 'Already on Taily? Log in', 'Reply STOP to opt out', 'By continuing you agree to Taily’s Tailor Terms and Privacy Policy.'], sel: '[data-mode="join"] #phone' } },
  { key: 't-phone--invalid', screen: 't-phone', group: 'M2 · Tailor sign-up', title: 'Tailor sign-up — invalid', note: '347555 then Send code',
    setup: (S) => { A.signOut('tailor'); S.state.ui['t-phone'] = { phone: '347555' }; },
    click: ['[data-act="send-code"]'],
    expect: { has: 'Enter a 10-digit US number', sel: '#phone[aria-invalid="true"]' } },
  { key: 't-phone--saved', screen: 't-phone', group: 'M2 · Tailor sign-up', title: 'Tailor sign-up — progress saved', note: 'After Finish later: success banner, number pre-filled',
    setup: (S) => { onboardTo('services'); A.signOut('tailor'); S.state.ui['t-phone'] = { saved: true, phone: NEW_TAILOR_PHONE }; },
    expect: { has: ['Your progress is saved', NEW_TAILOR_PHONE], not: 'Six short steps', sel: '.banner--success' } },
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
  { key: 'to-profile', screen: 'to-profile', group: 'M2 · Onboarding', title: 'Profile', note: 'Step 1 of 6: blank tailor, name focal, card line + live list-card preview, Finish later',
    setup: () => { onboardTo('profile'); },
    expect: { has: ['Step 1 of 6', 'Your profile', 'Your name', 'Card line — the one sentence customers see in search results', '0 / 110', 'About — the full bio on your profile', 'WHAT CUSTOMERS SEE', 'Shown for a sample job', 'Finish later'], not: ['Save changes', 'Optional.'], sel: '#name', also: ['.customer-preview--sticky', '#cardLine[maxlength="110"][placeholder^="Example: I’ve been tailoring"]', '#bio[placeholder^="Example: I’ve tailored luxury"]'] } },
  { key: 'to-profile--card-line', screen: 'to-profile', group: 'M2 · Onboarding', title: 'Profile — card line', note: 'Amara’s card line typed in: 106 / 110, and the list card shows it in the margin note (K-19)',
    setup: (S) => { onboardTo('profile'); S.state.ui['to-profile'] = { draft: { name: AMARA.name, shopName: AMARA.shopName, cardLine: AMARA.cardLine, bio: AMARA.bio, photo: true, workPhotos: 0 } }; },
    expect: { has: ['Card line — the one sentence customers see in search results', AMARA.cardLine, '106 / 110', 'WHAT CUSTOMERS SEE', AMARA.name, 'Comes to you · from Williamsburg', fmt(SCENARIOS.seed.total), 'Est.'], sel: '.customer-preview .tailor-row__line' } },
  { key: 'to-profile--photo-missing', screen: 'to-profile', group: 'M2 · Onboarding', title: 'Profile — photo missing', note: 'Everything filled in but the profile photo: Next says "Add a profile photo" (K-19)',
    setup: (S) => { onboardTo('profile'); S.state.ui['to-profile'] = { draft: { name: AMARA.name, shopName: '', years: String(AMARA.years), cardLine: AMARA.cardLine, bio: AMARA.bio, photo: false, idDoc: true, workPhotos: 0 } }; },
    click: ['[data-act="next"]'],
    expect: { has: ['Add a profile photo.', 'Add a photo'], not: ['Step 2 of 6', 'Add a photo of your ID.'], sel: '.to-profile__photo--error' } },
  { key: 'to-profile--errors', screen: 'to-profile', group: 'M2 · Onboarding', title: 'Profile — errors', note: 'Nothing filled in, then Next: name, photo ID (DG-4), years (D-18), card line, About (P-30: About stops at 300 like the card line, so "too long" can’t be typed)',
    setup: (S) => { onboardTo('profile'); S.state.ui['to-profile'] = { draft: { name: '', shopName: '', years: '', cardLine: '', bio: '', photo: false, idDoc: false, workPhotos: 0 } }; },
    click: ['[data-act="next"]'],
    expect: { has: ['Enter your name', 'Write the line customers see on the list.', 'Add a profile photo.', 'Add a photo of your ID.', 'Enter how many years you’ve been tailoring.', 'Write a line or two about your work.'], sel: '#name[aria-invalid="true"]', also: ['#cardLine[aria-invalid="true"]', '#years[aria-invalid="true"]', '.to-profile__photo--error', '.to-profile__id--error', '#bio[maxlength="300"]'] } },
  { key: 'to-profile--edit', screen: 'to-profile', group: 'M2 · Shop', title: 'Profile — edit', note: 'Live tailor: Save changes waits for a change; the card line sits before About',
    expect: { has: ['Your profile', 'Save changes', 'No changes yet', AMARA.name, 'Card line — the one sentence customers see in search results', AMARA.cardLine, '106 / 110', 'WHAT CUSTOMERS SEE'], not: 'Step 1 of 6', sel: '[data-act="save"][disabled]' } },
];
export const FLOWS_to_services = [
  { key: 'to-services', screen: 'to-services', group: 'M2 · Onboarding', title: 'Services and prices', note: 'Step 2 of 6: three ticked, a live "Your payout: $X" right under each price (K-45); the fee is said once above the list',
    setup: (S) => { onboardTo('services'); S.state.ui['to-services'] = { draft: { prices: { 'hem-pants': AMARA.prices['hem-pants'], sleeves: AMARA.prices.sleeves, repair: AMARA.prices.repair } } }; },
    expect: { has: ['Step 2 of 6', 'Services and prices', 'This is what customers see when they book. Set what you’d charge for a typical job. You can change it at the fitting, and the customer approves the final order before you start.', 'Customers only see you when you price every service their order needs.', 'WHAT CUSTOMERS SEE', 'Use recommended prices', `Most NYC tailors charge ${fmt(priceRange('hem-pants').low)}–${fmt(priceRange('hem-pants').high)}.`, '3 selected', `Your payout: ${fmtExact(payoutFor({ services: cents(AMARA.prices['hem-pants']) }))}`, `Taily keeps ${fmtExact(tailyFeeFor(cents(MONEY.FEE_EXAMPLE_SERVICES)))} of every ${fmtExact(cents(MONEY.FEE_EXAMPLE_SERVICES))} of services. Home visit and rush fees are yours in full.`, 'Take in dress', 'Repair or patch'], not: ['Bridal', 'Taily fee −'], sel: '#price-hem-pants[aria-describedby="price-hem-pants-pay"]', also: '#price-hem-pants-pay.service-row__pay[data-take]' } },
  { key: 'to-services--missing-price', screen: 'to-services', group: 'M2 · Onboarding', title: 'Services and prices — missing price', note: 'Hem pants ticked with no price, then Next',
    setup: (S) => { onboardTo('services'); S.state.ui['to-services'] = { draft: { prices: { 'hem-pants': null, sleeves: AMARA.prices.sleeves } } }; },
    click: ['[data-act="next"]'],
    expect: { has: ['Enter a price.', `Your payout: ${fmtExact(payoutFor({ services: cents(AMARA.prices.sleeves) }))}`], sel: '#price-hem-pants[aria-invalid="true"][aria-describedby="price-hem-pants-msg"]', also: ['#price-hem-pants-msg.service-row__pay', '.service-row__box--error #price-hem-pants'], not: 'Taily fee −' } },
  { key: 'to-services--none', screen: 'to-services', group: 'M2 · Onboarding', title: 'Services and prices — none ticked', note: 'Nothing ticked: Next is disabled and says why',
    setup: () => { onboardTo('services'); },
    expect: { has: 'Pick at least one service to continue.', not: ['Your payout', 'services on your profile'], sel: '[data-act="next"][disabled]' } },
  { key: 'to-services--resume', screen: 'to-services', group: 'M2 · Onboarding', title: 'Services and prices — resumed', note: 'Signed back in: the pick-up-where-you-left-off banner',
    setup: (S) => { onboardTo('services'); S.state.ui.onboarding = { resumed: true }; },
    expect: { has: ['Pick up where you left off', '1 of 6 steps done. 5 to go before customers can book you.'] } },
  { key: 'to-services--edit', screen: 'to-services', group: 'M2 · Shop', title: 'Services and prices — edit', note: 'Live tailor: ten ticked, Save changes waits for a change',
    expect: { has: ['Services and prices', 'Save changes', '10 selected', `Your payout: ${fmtExact(payoutFor({ services: cents(AMARA.prices['hem-pants']) }))}`], not: 'Taily fee −' } },
  { key: 'to-services--unsaved', screen: 'to-services', group: 'M2 · Shop', title: 'Services and prices — leave without saving', note: 'Changed one price, then Back',
    setup: (S) => { onboardTo('done'); S.state.ui['to-services'] = { draft: { prices: { ...AMARA.prices, 'hem-pants': AMARA.prices['hem-pants'] + 5 } } }; },
    click: ['.back'],
    expect: { has: ['Leave without saving', 'Keep editing', 'Discard changes'], sel: '[data-act="keep-editing"]' } },
];
/* C2 · to-where — the seed's own shop + home settings as a typed draft (stands in for typing) */
const WHERE_DRAFT = () => ({ shop: { enabled: true, street: AMARA.shop.street, zip: AMARA.shop.zip }, home: { enabled: true, hoods: [...AMARA.home.hoods], fee: AMARA.home.fee } });
export const FLOWS_to_where = [
  { key: 'to-where', screen: 'to-where', group: 'M2 · Onboarding', title: 'Where you work', note: 'Step 3 of 6: shop and home visits on, neighborhoods (Brooklyn open, tile map) and the flat home visit fee',
    setup: (S) => { onboardTo('where'); S.state.ui['to-where'] = { draft: WHERE_DRAFT() }; },
    expect: { has: ['Step 3 of 6', 'Where do you work', 'Customers come to your shop', 'You visit customers at home', 'Neighborhoods you visit', 'Where customers can book a home visit', 'Brooklyn', '3 selected', 'Williamsburg', 'Home visit fee (flat, per visit)', 'Charged once per home visit, no matter how long it takes.', `${fmt(cents(AMARA.home.fee))} home visit fee · Charged once per home visit`, 'Comes to you in Williamsburg, Greenpoint and Bushwick', 'Williamsburg, Brooklyn, NY', 'Suite or floor (optional)'], not: ['ZIP codes you cover', 'Paid to you in full', 'Includes ', 'neighborhoods highlighted'], sel: '#home-on[aria-checked="true"]', also: ['[data-act="hood"][data-id="williamsburg"][aria-pressed="true"]'] } },
  { key: 'to-where--home-only', screen: 'to-where', group: 'M2 · Onboarding', title: 'Where you work — home visits only', note: 'Shop switched off: its fields disappear, neighborhoods and fee stay',
    setup: (S) => { onboardTo('where'); const W = WHERE_DRAFT(); S.state.ui['to-where'] = { draft: { ...W, shop: { enabled: false, street: '', zip: '' } } }; },
    expect: { has: 'Neighborhoods you visit', not: 'Shop street address', sel: '#shop-on[aria-checked="false"]' } },
  { key: 'to-where--none', screen: 'to-where', group: 'M2 · Onboarding', title: 'Where you work — nothing on', note: 'Both switches off, then Next',
    setup: (S) => { onboardTo('where'); S.state.ui['to-where'] = { draft: { shop: { enabled: false, street: '', zip: '' }, home: { enabled: false, hoods: [], fee: null } } }; },
    click: ['[data-act="next"]'],
    expect: { has: 'Turn on your shop, home visits, or both' } },
  { key: 'to-where--zip-invalid', screen: 'to-where', group: 'M2 · Onboarding', title: 'Where you work — bad shop ZIP', note: 'Shop ZIP 1121, then Next (home visits pick neighborhoods, Study-1 C5)',
    setup: (S) => { onboardTo('where'); const W = WHERE_DRAFT(); S.state.ui['to-where'] = { draft: { ...W, shop: { ...W.shop, zip: '1121' } } }; },
    click: ['[data-act="next"]'],
    expect: { has: 'Enter a 5-digit ZIP code', sel: '#shopZip[aria-invalid="true"]' } },
  { key: 'to-where--fee-missing', screen: 'to-where', group: 'M2 · Onboarding', title: 'Where you work — fee missing', note: 'Home visits on, fee blank, then Next',
    setup: (S) => { onboardTo('where'); const W = WHERE_DRAFT(); S.state.ui['to-where'] = { draft: { ...W, home: { ...W.home, fee: null } } }; },
    click: ['[data-act="next"]'],
    expect: { has: 'Enter your home visit fee, or 0 for none', sel: '#fee[aria-invalid="true"]' } },
  { key: 'to-where--edit', screen: 'to-where', group: 'M2 · Shop', title: 'Where you work — edit', note: 'Live tailor: current shop and neighborhoods, Save changes waits for a change',
    expect: { has: ['Save changes', 'No changes yet', 'Bushwick', '3 selected'], not: 'Step 3 of 6', sel: `#street[value="${AMARA.shop.street}"]` } },
];
export const FLOWS_to_returns = [
  { key: 'to-returns', screen: 'to-returns', group: 'M2 · Onboarding', title: 'Return options', note: 'Step 4 of 6: pickup pre-ticked (she has a shop), courier off; K-37: no Home drop-off',
    setup: () => { onboardTo('returns'); },
    expect: { has: ['Step 4 of 6', 'How do customers get their orders back', 'In-store pickup', 'Taily courier', 'nothing comes out of your payout'], not: 'Home drop-off', sel: '#ret-pickup:checked' } },
  { key: 'to-returns--none', screen: 'to-returns', group: 'M2 · Onboarding', title: 'Return options — none picked', note: 'Both off, then Next',
    setup: (S) => { onboardTo('returns'); S.state.ui['to-returns'] = { draft: { pickup: false, courier: false } }; },
    click: ['[data-act="next"]'],
    expect: { has: 'Pick at least one return option.' } },
  { key: 'to-returns--edit', screen: 'to-returns', group: 'M2 · Shop', title: 'Return options — edit', note: 'Live tailor: both offered, Save changes waits for a change',
    expect: { has: ['Save changes', 'Taily courier'], not: 'Step 4 of 6', sel: '#ret-courier:checked' } },
];
export const FLOWS_to_availability = [
  { key: 'to-availability', screen: 'to-availability', group: 'M2 · Onboarding', title: 'Availability', note: 'Step 5 of 6: shop and home hours, default week, Shop schedule showing',
    setup: () => { onboardTo('availability'); },
    expect: { has: ['Step 5 of 6', 'When can customers book you', 'Shop', 'Home visits', 'Tuesday', '10:00 AM', '6:00 PM'], sel: '.segmented' } },
  { key: 'to-availability--single', screen: 'to-availability', group: 'M2 · Onboarding', title: 'Availability — one schedule', note: 'Shop only: no segmented control, a Shop hours heading',
    setup: (S) => { onboardTo('availability'); S.T.setTailorSection('where', { home: { enabled: false } }); },
    expect: { has: ['SHOP HOURS', 'Shop visits are'], not: 'Home visits', sel: '[data-act="time"]' } },
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
/* DG-4 option B (K-48, D-350…D-355): step 6 = the background-check consent + the payments partner's hosted payout step; to-done ends on
   Submitted while the four checks run. Taily's own bank form is retired (to-payouts--invalid → to-payouts--consent-missing). */
export const FLOWS_to_payouts = [
  { key: 'to-payouts', screen: 'to-payouts', group: 'M2 · Onboarding', title: 'Background check and payouts', note: 'Step 6 of 6: the background-check consent, the fee in dollars, then the hand-off to our payments partner',
    setup: () => { onboardTo('payouts'); },
    expect: { has: ['Step 6 of 6', 'Background check and payouts', 'BACKGROUND CHECK', 'Read the disclosure', 'I agree to a background check', `On ${fmtExact(cents(MONEY.FEE_EXAMPLE_SERVICES))} of services, Taily keeps ${fmtExact(tailyFeeFor(cents(MONEY.FEE_EXAMPLE_SERVICES)))} and your payout is ${fmtExact(payoutFor({ services: cents(MONEY.FEE_EXAMPLE_SERVICES) }))}`, 'Home visit and rush fees are yours in full', 'Our payments partner sets up your payouts', 'Your SSN or EIN, for your W-9 and 1099-K', 'Taily never sees your full SSN or account number.', 'Continue to secure setup', 'By continuing you agree to the Taily Tailor Agreement.', 'You’ll come back here when you’re done.'], not: ['Routing number', 'Account number'], sel: '#bg-consent', also: '[data-act="setup"]' } },
  { key: 'to-payouts--consent-missing', screen: 'to-payouts', group: 'M2 · Onboarding', title: 'Background check and payouts — no consent', note: 'Continue to secure setup without ticking the consent: the error sits under the box',
    setup: () => { onboardTo('payouts'); },
    click: ['[data-act="setup"]'],
    expect: { has: 'Agree to the background check to continue.', sel: '#bg-consent[aria-invalid="true"]' } },
  { key: 'to-payouts--edit', screen: 'to-payouts', group: 'M2 · Shop', title: 'Payouts — edit', note: 'Live tailor: the partner’s three rows all done; Update bank details goes back to the partner',
    expect: { has: ['Payouts', 'WITH OUR PAYMENTS PARTNER', 'Identity', 'Tax info (W-9)', 'Bank account', `${AMARA.payouts.bank} •••• ${AMARA.payouts.last4} · paid Fridays`, 'Update bank details', 'Our payments partner keeps your bank details.'], not: ['Step 6 of 6', 'Routing number', 'BACKGROUND CHECK'] } },
  { key: 'to-payouts--returned', screen: 'to-payouts', group: 'M5 · Earnings', title: 'Payouts — a payout didn’t go through', note: 'Update bank details from Earnings: the returned amount, the bank, and the Friday it sends again once she updates it with the partner',
    setup: () => { earningsTo('failed'); },
    get expect() {
      return { has: [`Your ${fmtExact(SCENARIOS.seed.payout)} payout didn’t go through`, `${AMARA.payouts.bank} •••• ${AMARA.payouts.last4} returned it`, `we’ll send it again on ${fmtDay(PAYOUT_DAYS.second)}`, 'Update bank details'], sel: '.banner--error' };
    } },
];
export const FLOWS_to_done = [
  { key: 'to-done', screen: 'to-done', group: 'M2 · Onboarding', title: 'Submitted', note: 'DG-4: onboarding finished, the four checks under review — her row as customers will see it once verified (no Verified check yet), the checks, what happens next',
    setup: () => { onboardTo('submitted'); },
    expect: { has: ['Submitted', 'Most reviews take 1 to 2 days', `We’ll text ${NEW_TAILOR_PHONE} when customers can book you.`, 'YOUR CHECKS', '1 of 4 checks passed', 'ID and profile photo', 'Background check', 'Years tailoring', 'Payout and tax info', 'Pending', 'ONCE YOU’RE VERIFIED', 'How a customer in Williamsburg will see you', fmt(SCENARIOS.seed.total), 'WHAT HAPPENS NEXT', 'We check your details. You can still edit your shop.', 'Go to my shop'], not: ['You’re bookable', 'Insured'], sel: '.customer-preview .tailor-row', also: '[data-outcome="submitted"]' } },
];
export const FLOWS_t_shop = [
  { key: 't-shop', screen: 't-shop', group: 'M2 · Shop', title: 'Your shop', note: 'Bookable: preview of her row, seven setup rows with summaries',
    expect: { has: ['Your shop', 'Bookable', 'Taking requests', 'WHAT CUSTOMERS SEE', fmt(SCENARIOS.seed.total), 'Est.', AMARA.cardLine, 'Reyes Tailoring', `1 day +${fmt(cents(AMARA.rush[0].fee))}`, `${AMARA.payouts.bank} •••• ${AMARA.payouts.last4}`] } },
  { key: 't-shop--paused', screen: 't-shop', group: 'M2 · Shop', title: 'Your shop — paused', note: 'Taking requests is off: the chip says customers can’t send requests; booked jobs are untouched (D-161)',
    setup: (S) => { S.T.setTakingRequests(false); },
    expect: { has: ['Paused · customers can’t send requests', 'Taking requests', 'already booked'], not: 'Bookable', sel: '#taking-requests[aria-checked="false"]' } },
  { key: 't-shop--incomplete', screen: 't-shop', group: 'M2 · Shop', title: 'Your shop — needs attention', note: 'Home visits on with no home hours: warning banner, row flagged, no estimate',
    setup: (S) => { S.T.setTailorSection('availability', { availability: { shop: AMARA.availability.shop, home: {} } }); },
    expect: { has: ['Customers can', 'Finish your availability so customers can book you again.', 'Finish availability', 'Needs attention'], not: 'Est.', sel: '.banner--warning' } },
];
export const FLOWS_t_rush = [
  { key: 't-rush', screen: 't-rush', group: 'M2 · Shop', title: 'Rush fees', note: 'Three tiers filled; S-39: the preview is the one Rush fee line a rushed customer sees on her estimate',
    expect: { has: ['Rush fees', 'Ready within 1 day of the visit', '4 days or more', 'yours in full', 'YOUR ESTIMATE', 'Rush fee', 'Need-by 1 day after the visit', fmt(cents(AMARA.rush[0].fee)), `2 days: ${fmt(cents(AMARA.rush[1].fee))}`], not: '+$', sel: '#rush-1' } },   // S-39: the one estimate line a rushed customer sees
  { key: 't-rush--invalid', screen: 't-rush', group: 'M2 · Shop', title: 'Rush fees — invalid', note: '1 day cheaper than 2 days, 3 days blank, then Save',
    setup: (S) => { S.state.ui['t-rush'] = { draft: { on: true, fees: { 1: String(AMARA.rush[2].fee), 2: String(AMARA.rush[0].fee), 3: '' } } }; },
    click: ['[data-act="save"]'],
    expect: { has: [`more than your 1-day fee (${fmt(cents(AMARA.rush[2].fee))})`, 'Enter an amount, or 0 for no fee'], sel: '#rush-2[aria-invalid="true"]' } },
  { key: 't-rush--unsaved', screen: 't-rush', group: 'M2 · Shop', title: 'Rush fees — leave without saving', note: 'Edited the 1-day fee, then Back',
    setup: (S) => { S.state.ui['t-rush'] = { draft: { on: true, fees: { 1: String(AMARA.rush[0].fee + 10), 2: String(AMARA.rush[1].fee), 3: String(AMARA.rush[2].fee) } } }; },
    click: ['.back'],
    expect: { has: ['Leave without saving', 'Keep editing', 'Discard changes'], sel: '[role="alertdialog"]' } },
];
