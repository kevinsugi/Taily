/* ============================================================
   Pre-MVP fix pass, track B2 (K-48 / K-49; D-370…D-379) — the customer and account side: Account v2 for both personas
   (DG-3 option A: Personal info, change phone by code, the legal pages, Help, delete account blocked while open), the deposit
   button V3 (K-49), Apple / Google then a required phone + code (D-07 / B-09), a receipt she can keep (S-25), all reviews
   (S-26), notes for the tailor + access notes + saved addresses in booking (S-27).
   Same shape as js/fixtures/m#.js; flows.js concatenates every FLOWS_* export. Setups compose driveTo / the real transitions
   (T.*, account.js) + sim knobs + screen-local UI (state.ui); money strings come from SCENARIOS through fmt*(), never typed.
   ============================================================ */
import { SCENARIOS as D_SC, AMARA as D_AMARA, SEED_SLOT as D_SLOT } from './money-scenarios.js';
import { fmtExact as D_exact } from '../money.js';
import { fmtWhen as D_when } from '../dates.js';
import { CUSTOMER as D_CUSTOMER } from '../data.js';
import * as D_A from '../account.js';

const G = 'Pre-MVP · account and customer';
const NEW_PHONE = '(917) 555-0186';
const EMAIL = 'sarah.chen@example.com';
const NOTE = 'Hem for 2-inch heels, please. Text me at 718 555 0142 if you’re early.';
const ACCESS = 'Buzz 2R. The door sticks, push hard.';
const focus = (S, a) => { S.state.ui.apptId = a.id; };

/* ---------- c-account: Account v2 (DG-3 A) — delete blocked / allowed ---------- */
export const FLOWS_c_account = [
  { screen: 'c-account', group: G, key: 'c-account--delete-blocked', title: 'Account — delete blocked', note: 'DG-3 A: a visit is still open — the reason and the one way on (See the booking); nothing is deleted',
    setup: (S) => { S.driveTo('confirmed'); },
    click: ['[data-act="delete"]'],
    expect: { has: ['Delete account', `Your visit with Amara on ${D_when(D_SLOT)} is still open.`, 'Cancel it, or wait until it’s done. Then you can delete your account here.', 'See the booking'], not: 'This can’t be undone', sel: '[data-s="delete-blocked"] [data-delete-blocked="order"]' } },
  { screen: 'c-account', group: G, key: 'c-account--delete', title: 'Account — delete account confirm', note: 'DG-3 A: nothing open — what goes, what stays (receipts, COUNSEL #9), no undo; focus on Keep my account',
    click: ['[data-act="delete"]'],
    expect: { has: ['Delete your account?', 'We delete your name, phone number, email, addresses and saved cards, and sign you out.', 'We keep receipts and messages for past orders, as the law requires.', 'This can’t be undone.', 'Delete account', 'Keep my account'], sel: '[data-s="delete-account"] [data-act="delete-ok"]' } },
];

/* ---------- c-profile: Personal info (DG-3 A) ---------- */
export const FLOWS_c_profile = [
  { screen: 'c-profile', group: G, key: 'c-profile', title: 'Personal info', note: 'DG-3 A: names, an optional email for receipts (none yet), the phone every text goes to with Change; Save waits for a change',
    expect: { has: ['Personal info', 'First name', 'Last name', 'Tailors see Sarah C. until they accept your request.', 'Email for receipts (optional)', 'Without one, receipts stay in Past orders.', 'PHONE', D_CUSTOMER.phone, 'Texts and sign-in codes go here', 'Change', 'To change it, we text a code to the new number. Your bookings move with you.', 'No changes yet.'], sel: '.action-bar [data-act="save"][disabled]', also: '#first[value="Sarah"]' } },
  { screen: 'c-profile', group: G, key: 'c-profile--errors', title: 'Personal info — errors', note: 'First name cleared and a half email, then Save: each error under its field',
    setup: (S) => { S.state.ui['c-profile'] = { first: '', email: 'sarah@' }; },
    click: ['.action-bar [data-act="save"]'],
    expect: { has: ['Enter your first name.', 'Enter an email like name@example.com.'], sel: '#first[aria-invalid="true"]', also: '#email[aria-invalid="true"]' } },
];

/* ---------- c-change-phone: a code to the new number (DG-3 A) ---------- */
export const FLOWS_c_change_phone = [
  { screen: 'c-change-phone', group: G, key: 'c-change-phone', title: 'Change phone number', note: 'DG-3 A: every text and sign-in code goes to this number — the new one is checked by a code first',
    expect: { has: ['Change phone number', `Texts and sign-in codes go to ${D_CUSTOMER.phone} now. Your bookings move with you.`, 'New mobile number', 'Msg & data rates may apply.', 'Send code'], sel: '#new-phone' } },
  { screen: 'c-change-phone', group: G, key: 'c-change-phone--same', title: 'Change phone number — the same number', note: 'Her own number, then Send code: said under the field',
    setup: (S) => { S.state.ui['c-change-phone'] = { phone: D_CUSTOMER.phone }; },
    click: ['.action-bar [data-act="send-code"]'],
    expect: { has: 'That’s the number you have now. Enter a new one.', sel: '#new-phone[aria-invalid="true"]' } },
  { screen: 'c-change-phone', group: G, key: 'c-change-phone--code', title: 'Change phone number — the code', note: `A code went to ${NEW_PHONE}; the resend countdown is frozen at 0:30`,
    setup: (S) => { D_A.startPhoneChange(NEW_PHONE); S.state.ui['c-change-phone'] = { step: 'code' }; },
    expect: { has: ['Enter the code', `We texted a 6-digit code to ${NEW_PHONE}.`, 'Change number', 'Resend code in 0:30', 'Verify'], sel: '#change-code' } },
  { screen: 'c-change-phone', group: G, key: 'c-change-phone--wrong', title: 'Change phone number — wrong code', note: '000000, then Verify: the number stays the old one',
    setup: (S) => { D_A.startPhoneChange(NEW_PHONE); S.state.ui['c-change-phone'] = { step: 'code', code: '000000' }; },
    click: ['.action-bar [data-act="verify"]'],
    expect: { has: 'That code doesn’t match. Check your texts and try again.', sel: '#change-code[aria-invalid="true"]' } },
];

/* ---------- the legal pages (S-23 / S-24, COUNSEL placeholders) — on c-policy since the A2 + B2 merge (D-380) ---------- */
const legal = (doc, key, title, line, { signedOut = false } = {}) => ({
  screen: 'c-policy', group: G, key, title: `Legal — ${title}${signedOut ? ' (signed out)' : ''}`,
  note: `S-23 / S-24: IN SHORT + the full draft under "Draft — counsel review required" (K-53 b, COUNSEL, docs/v5/COUNSEL.md)${signedOut ? '; from c-welcome’s Terms link before sign-up: no tabs, no Get help' : ''}`,
  setup: (S) => { if (signedOut) D_A.signOut('customer'); S.state.ui.policy = doc; },
  expect: { has: [title, 'IN SHORT', line, 'Draft of Oct 18, 2026', 'Draft — counsel review required'], ...(signedOut ? { not: ['Get help'] } : {}), sel: `[data-doc="${doc}"] [data-counsel]` },
});
export const FLOWS_c_policy = [
  legal('terms', 'c-policy--terms', 'Terms of service', 'Taily is a marketplace. You book independent tailors through it, and each tailor does the work.', { signedOut: true }),
  legal('privacy', 'c-policy--privacy', 'Privacy policy', 'Your card is stored by our payment provider, not by Taily.'),
  legal('accessibility', 'c-policy--accessibility', 'Accessibility', 'If something gets in your way, tell us through Help and we’ll fix it.'),
];

/* ---------- c-receipt: a receipt she can keep (S-25) ---------- */
const doneOrder = (S) => { const a = S.driveTo('completed'); focus(S, a); return a; };
export const FLOWS_c_receipt = [
  { screen: 'c-receipt', group: G, key: 'c-receipt', title: 'Receipt', note: 'S-25: number and date, from (Taily Group LLC, K-53 c1) and billed to, what she paid for, each charge with its date and card; no email on file yet',
    setup: (S) => { doneOrder(S); },
    get expect() { return { has: ['Receipt', 'TLY-261013-', 'FROM', 'Taily Group LLC', 'an independent tailor booked through Taily.', 'BILLED TO', 'Sarah Chen', 'WHAT YOU PAID FOR', 'PAYMENTS', 'Deposit', 'Balance', 'Paid in all', D_exact(D_SC.seed.deposit), D_exact(D_SC.seed.balance), D_exact(D_SC.seed.total), 'Visa •••• 4242', 'Add an email in Personal info to get receipts by email.', 'Add an email'], not: 'Email receipt', sel: '[data-no-email]' }; } },
  { screen: 'c-receipt', group: G, key: 'c-receipt--email', title: 'Receipt — email on file', note: 'S-25: with an email (Personal info) the bar offers Email receipt (PROTOTYPE: no mail service)',
    setup: (S) => { doneOrder(S); D_A.saveProfile({ email: EMAIL }); },
    expect: { has: ['Email receipt', `To ${EMAIL}`, EMAIL], not: 'Add an email', sel: '.action-bar [data-act="email"]' } },
  { screen: 'c-receipt', group: G, key: 'c-receipt--sent', title: 'Receipt — emailed', note: 'S-25: sent (recorded on the order) — the bar says where and when, then offers Email it again',
    setup: (S) => { const a = doneOrder(S); D_A.saveProfile({ email: EMAIL }); S.T.emailReceipt(a.id); },
    expect: { has: ['Email it again', `Sent to ${EMAIL}`] } },
];

/* ---------- c-reviews: all reviews (S-26) ---------- */
export const FLOWS_c_reviews = [
  { screen: 'c-reviews', group: G, key: 'c-reviews', title: 'All reviews', note: 'S-26: was "Not built yet" — the average and count, whose reviews (booked through Taily), every written review newest first, the star-only count',
    expect: { has: ['Amara’s reviews', '4.9', `${D_AMARA.rating.count} ratings · ${D_AMARA.reviews.length} written reviews`, 'From customers who booked through Taily. Newest first.', D_AMARA.reviews[0].name, D_AMARA.reviews.at(-1).name, `${D_AMARA.rating.count - D_AMARA.reviews.length} more customers left a star rating without a written review.`] } },
];

/* ---------- sign-in: Apple / Google, then the phone (D-07 / B-09); the legal links (S-24); after delete (DG-3 A) ---------- */
export const FLOWS_c_welcome = [
  { screen: 'c-welcome', group: G, key: 'c-welcome--deleted', title: 'Welcome — after Delete account', note: 'DG-3 A: signed out, a calm line says it is done and what is kept',
    setup: () => { D_A.deleteAccount('customer'); },
    expect: { has: ['Your account is deleted', 'We keep receipts for past orders, as the law requires.', 'Continue with phone'], sel: '[data-deleted]' } },
];
export const FLOWS_c_phone = [
  { screen: 'c-phone', group: G, key: 'c-phone--social', title: 'Add your mobile number (after Apple)', note: 'D-07 / B-09: Continue with Apple no longer skips the phone — the number and a code come before anything else',
    setup: () => { D_A.signOut(); D_A.signInWith('apple'); },
    expect: { has: ['Add your mobile number', 'Almost done with Apple.', 'we text your sign-in codes there', 'Mobile number', 'Send code', 'By tapping Send code, you agree to Taily’s'], sel: '[data-social="apple"]' } },
];
export const FLOWS_c_name = [
  { screen: 'c-name', group: G, key: 'c-name--social', title: 'What should we call you? (after Apple + the code)', note: 'D-07: a new number after Apple — the names come from the provider, editable; the texts opt-in is asked as for every new account',
    setup: () => { D_A.signOut(); D_A.signInWith('apple'); D_A.sendCode(NEW_PHONE); D_A.verifyCode('123456'); },
    expect: { has: ['What should we call you?', 'From your Apple account. Change it if you like.', 'Text me booking updates'], sel: '#first[value="Sarah"]', also: '#last[value="Chen"]' } },
];

/* ---------- c-pay: her note for the tailor (S-27) ---------- */
export const FLOWS_c_pay = [
  { screen: 'c-pay', group: G, key: 'c-pay--note', title: 'Review and send — a note for Amara', note: 'S-27: optional, 200 characters, sent with the request; phone numbers and emails are hidden (masked at send)',
    setup: (S) => { S.T.setJob({ note: NOTE }); },
    expect: { has: ['Note for Amara (optional)', 'Amara sees it with your request. Phone numbers and emails are hidden.', 'Cancellation and refunds', `Reserve · ${D_exact(D_SC.seed.deposit)} deposit`, 'Charged only if Amara accepts'], sel: '#job-note' } },
];

/* ---------- c-addresses: edit + access notes (S-27) ---------- */
export const FLOWS_c_addresses = [
  { screen: 'c-addresses', group: G, key: 'c-addresses--edit', title: 'Saved addresses — edit', note: 'S-27: a saved address can be edited — the same four fields as the booking sheet, access notes included',
    setup: () => { D_A.updateAddress('home', { notes: ACCESS }); },
    click: ['[data-act="address"][data-id="home"]', '[data-act="edit"]'],
    expect: { has: ['Edit address', 'Street address', 'Access notes (optional)', 'Your tailor sees these once she accepts.', 'Save address'], sel: '[data-s="edit-address"] #notes' } },
];

/* ---------- the tailor sees the note and the access notes (S-27) ---------- */
export const FLOWS_t_request = [
  { screen: 't-request', group: G, key: 't-request--note', title: 'Request — a note from Sarah', note: 'S-27: her note rides with the request, the phone number hidden (masked like chat); the street and access notes wait for the accept',
    setup: (S) => { S.driveTo('requested', { note: NOTE, accessNotes: ACCESS }); },
    expect: { has: ['Note from Sarah', 'Hem for 2-inch heels, please. Text me at [phone hidden] if you’re early.'], not: ['718 555 0142', 'Buzz 2R'] } },
];
export const FLOWS_t_job = [
  { screen: 't-job', group: G, key: 't-job--access-notes', title: 'Job — access notes and her note', note: 'S-27: accepted home visit — the street with her access notes, and her note for Amara',
    setup: (S) => { S.driveTo('confirmed', { note: NOTE, accessNotes: ACCESS }); },
    expect: { has: [`Access: ${ACCESS}`, 'Note from Sarah', 'Hem for 2-inch heels, please.'] } },
];
export const FLOWS_c_booking = [
  { screen: 'c-booking', group: G, key: 'c-booking--note', title: 'Booking — her note and access notes', note: 'S-27: what she sent, as Amara reads it',
    setup: (S) => { const a = S.driveTo('confirmed', { note: NOTE, accessNotes: ACCESS }); focus(S, a); },
    expect: { has: [`Access: ${ACCESS}`, 'Your note for Amara', 'Text me at [phone hidden]'] } },
];

/* ---------- tailor: Shop → Account (DG-3 A) ---------- */
export const FLOWS_t_shop = [
  { screen: 't-shop', group: G, key: 't-shop--delete-blocked', title: 'Your shop — delete blocked', note: 'DG-3 A: a visit is booked — finish it first (See the job)',
    setup: (S) => { S.driveTo('confirmed'); },
    click: ['[data-act="delete"]'],
    expect: { has: ['Delete account', 'You have a visit with Sarah on Thu, Oct 15.', 'Once the job is done, you can delete your account here.', 'See the job'], sel: '[data-delete-blocked="job"]' } },
  { screen: 't-shop', group: G, key: 't-shop--delete-payout', title: 'Your shop — delete waits for a payout', note: 'DG-3 A: the job is done but its payout hasn’t reached her bank',
    setup: (S) => { S.driveTo('completed'); },
    click: ['[data-act="delete"]'],
    get expect() { return { has: [`You have a ${D_exact(D_SC.seed.payout)} payout on its way.`, 'Once the payout has reached your bank, you can delete your account here.', 'See your earnings'], sel: '[data-delete-blocked="payout"]' }; } },
  { screen: 't-shop', group: G, key: 't-shop--delete', title: 'Your shop — delete account confirm', note: 'DG-3 A: nothing open — the profile and bank details go, the payout and tax records stay',
    click: ['[data-act="delete"]'],
    expect: { has: ['Delete your account?', 'We delete your profile, prices, hours and bank details, and take your shop off Taily.', 'We keep your payout and tax records, as the law requires.', 'Keep my account'], sel: '[data-s="delete-account"]' } },
];
export const FLOWS_t_change_phone = [
  { screen: 't-change-phone', group: G, key: 't-change-phone', title: 'Change phone number (tailor)', note: 'DG-3 A: new requests and sign-in codes go here — a code to the new number first',
    expect: { has: ['Change phone number', `Texts and sign-in codes go to ${D_AMARA.phone} now. Your shop, jobs and payouts move with you.`, 'Send code'] } },
  { screen: 't-change-phone', group: G, key: 't-change-phone--code', title: 'Change phone number (tailor) — the code', note: 'The code went to the new number',
    setup: (S) => { D_A.startPhoneChange('(646) 555-0101', 'tailor'); S.state.ui['t-change-phone'] = { step: 'code' }; },
    expect: { has: ['Enter the code', 'We texted a 6-digit code to (646) 555-0101.'] } },
];
const tLegal = (doc, key, title, line, { signedOut = false } = {}) => ({
  screen: 't-policy', group: G, key, title: `Legal (tailor) — ${title}${signedOut ? ' (signed out)' : ''}`,
  note: `S-23 → K-53 b: the full draft under its summary (docs/v5/COUNSEL.md #2), on t-policy since the merge (D-380)${signedOut ? '; from t-phone’s Tailor Terms link: no tabs' : ''}`,
  setup: (S) => { if (signedOut) D_A.signOut('tailor'); S.state.ui.policy = doc; },
  expect: { has: [title, line, 'Draft — counsel review required'], ...(signedOut ? { not: ['Get help'] } : {}), sel: `[data-doc="${doc}"]` },
});
export const FLOWS_t_policy = [
  tLegal('tailor-terms', 't-policy--terms', 'Tailor terms of service', 'You run your own business. You set your prices, hours and the areas you visit.', { signedOut: true }),
  tLegal('tailor-agreement', 't-policy--agreement', 'Tailor agreement', 'You work with Taily as an independent contractor, not an employee.'),
  tLegal('privacy', 't-policy--privacy', 'Privacy policy', 'Fitting photos are seen only by you, your tailor and Taily.'),
];
export const FLOWS_t_phone = [
  { screen: 't-phone', group: G, key: 't-phone--deleted', title: 'Tailor sign-in — after Delete account', note: 'DG-3 A: signed out, her shop is off Taily, the records kept',
    setup: () => { D_A.deleteAccount('tailor'); },
    expect: { has: ['Your account is deleted', 'Your shop is off Taily.'], sel: '[data-deleted]' } },
];
