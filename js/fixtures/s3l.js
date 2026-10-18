/* ============================================================
   MVP readiness, track L (K-52 / K-53; D-420…D-431) — Log in for a returning customer / tailor (no silent sign-up), the admin's own
   sign-in (email + code + a second factor, `?admin`), phone-only sign-in for the pilot (Apple / Google behind POLICY.SOCIAL_SIGN_IN),
   availability (two windows a day, time off, minimum notice), the background check last ("You're approved, pending your background
   check"), the full legal drafts (Taily Group LLC, "Draft — counsel review required"), Help hours + the backup admin, and the t-shop
   preview after a request (the sample job).
   Same shape as js/fixtures/m#.js; flows.js concatenates every FLOWS_* export. Setups compose driveTo / onboardTo / the real
   transitions (T.*, account.js) + sim knobs + screen-local UI (state.ui); money strings come from money.js / SCENARIOS, never typed.
   ============================================================ */
import { SCENARIOS as L_SC, AMARA as L_AMARA } from './money-scenarios.js';
import { fmt as L_fmt, fmtExact as L_exact, cents as L_cents, tailyFeeFor as L_fee } from '../money.js';
import { MONEY as L_MONEY, POLICY as L_POLICY } from '../money-config.js';
import { CUSTOMER as L_CUSTOMER, ADMIN_ACCOUNT as L_ADMIN } from '../data.js';
import { HELP_CONTACT as L_HELP, DRAFT_LINE as L_DRAFT, COMPANY as L_COMPANY } from '../policies.js';
import { onboardTo as L_onboardTo } from './common.js';
import * as L_A from '../account.js';

const G = 'Readiness · log in, admin, availability, legal';
const UNKNOWN = '(917) 555-0186';
const OFF = { id: 't1', from: '2026-10-19', to: '2026-10-23' };   // Mon to Fri, the week after the seed visit
const FEE_WORDS = `${L_exact(L_fee(L_cents(L_MONEY.FEE_EXAMPLE_SERVICES)))} of every ${L_exact(L_cents(L_MONEY.FEE_EXAMPLE_SERVICES))}`;
/** Amara's saved availability plus `patch` (time off, notice) through the real section setter. */
const availWith = (S, patch) => S.T.setTailorSection('availability', { availability: structuredClone(S.tailor.availability), ...patch });

/* ---------- c-welcome: phone only for the pilot (K-53 Q9), Log in (K-52) ---------- */
export const FLOWS_c_welcome = [
  { screen: 'c-welcome', group: G, key: 'c-welcome--social', title: 'Welcome — Apple / Google switched on', note: 'K-53 Q9 (D-423): POLICY.SOCIAL_SIGN_IN is off for the pilot; sim.social shows the kept buttons',
    setup: (S) => { L_A.signOut(); S.state.sim.social = 'on'; },
    expect: { has: ['Continue with phone', 'Continue with Apple', 'Continue with Google', 'Already have an account? Log in'], sel: '[data-act="apple"]' } },
];

/* ---------- c-login: Welcome back (K-52, D-420) ---------- */
export const FLOWS_c_login = [
  { screen: 'c-login', group: G, key: 'c-login', title: 'Log in — Welcome back', note: 'K-52: c-welcome → Already have an account? Log in. The same code step; never a silent sign-up',
    setup: () => { L_A.signOut(); },
    expect: { has: ['Welcome back', 'Log in with your mobile number. We’ll text you a code. No passwords.', 'Mobile number', 'Send code', 'New to Taily? Create an account'], not: 'No account with this number', sel: '#phone' } },
  { screen: 'c-login', group: G, key: 'c-login--unknown', title: 'Log in — no account with this number', note: `K-52: ${UNKNOWN} has no account — said next to the field, one way on: Create one (c-phone, the number carried over)`,
    setup: (S) => { L_A.signOut(); S.state.ui['c-login'] = { phone: UNKNOWN }; },
    click: ['.action-bar [data-act="send-code"]'],
    expect: { has: ['No account with this number.', 'Want to join with it? Create one'], sel: '#phone[aria-invalid="true"]', also: '[data-unknown] [data-act="create"]' } },
  { screen: 'c-login', group: G, key: 'c-login--invalid', title: 'Log in — not a number', note: '718555 then Send code: the field says what it needs',
    setup: (S) => { L_A.signOut(); S.state.ui['c-login'] = { phone: '718555' }; },
    click: ['.action-bar [data-act="send-code"]'],
    expect: { has: 'Enter a 10-digit US number', not: 'Create one', sel: '#phone[aria-invalid="true"]' } },
];
export const FLOWS_c_code = [
  { screen: 'c-code', group: G, key: 'c-code--login', title: 'Enter the code — after Log in', note: 'K-52: Log in sends the code to her known number; the same code step signs her in',
    setup: () => { L_A.signOut(); L_A.sendLoginCode(L_CUSTOMER.phone); },
    expect: { has: ['Enter the code', `We texted a 6-digit code to ${L_CUSTOMER.phone}.`, 'Verify'], sel: '#code' } },
];

/* ---------- t-phone: Log in / Join (K-52) ---------- */
export const FLOWS_t_phone = [
  { screen: 't-phone', group: G, key: 't-phone--login', title: 'Tailor — Log in', note: 'K-52: c-welcome → Are you a tailor? Log in. Welcome back; New to Taily? Join',
    setup: (S) => { L_A.signOut('tailor'); S.state.ui['t-phone'] = { mode: 'login' }; },
    expect: { has: ['FOR TAILORS', 'Welcome back', 'Log in to your shop with your mobile number.', 'Send code', 'New to Taily? Join in six short steps.'], not: 'Already on Taily', sel: '[data-mode="login"] #phone' } },
  { screen: 't-phone', group: G, key: 't-phone--login-unknown', title: 'Tailor — Log in, no account', note: 'K-52: a number with no shop — never a silent sign-up; Join Taily is the one way on',
    setup: (S) => { L_A.signOut('tailor'); S.state.ui['t-phone'] = { mode: 'login', phone: '(646) 555-0101' }; },
    click: ['.action-bar [data-act="send-code"]'],
    expect: { has: ['No account with this number.', 'New here? Join Taily with this number.'], sel: '#phone[aria-invalid="true"]', also: '[data-unknown] [data-act="mode-join"]' } },
];

/* ---------- a-login: the admin's own sign-in (K-52, D-421) ---------- */
export const FLOWS_a_login = [
  { screen: 'a-login', group: G, key: 'a-login', title: 'Admin sign-in — email', note: 'K-52: its own entry (?admin), linked from nowhere in the app; every a-* screen sends a signed-out visit here',
    setup: () => { L_A.adminSignOut(); },
    expect: { has: ['TAILY ADMIN', 'Sign in', 'For the Taily team only. We email you a code, then ask for the code from your authenticator app.', 'Email', 'Email me a code'], not: 'Inbox', sel: '#admin-email' } },
  { screen: 'a-login', group: G, key: 'a-login--not-admin', title: 'Admin sign-in — not an admin email', note: 'Only the Taily admin account signs in here',
    setup: (S) => { L_A.adminSignOut(); S.state.ui['a-login'] = { email: 'sarah.chen@example.com' }; },
    click: ['.action-bar [data-act="send"]'],
    expect: { has: 'This email isn’t a Taily admin account.', sel: '#admin-email[aria-invalid="true"]' } },
  { screen: 'a-login', group: G, key: 'a-login--code', title: 'Admin sign-in — the emailed code', note: 'Step 1 of 2: a 6-digit code by email; Resend in 0:30 (frozen clock)',
    setup: () => { L_A.adminSignOut(); L_A.adminSendCode(L_ADMIN.email); },
    expect: { has: ['TAILY ADMIN · STEP 1 OF 2', 'Check your email', `We emailed a 6-digit code to ${L_ADMIN.email}.`, 'Use another email', 'Code from your email', 'Resend code in 0:30', 'Verify'], sel: '#admin-code' } },
  { screen: 'a-login', group: G, key: 'a-login--code-wrong', title: 'Admin sign-in — wrong code', note: '000000, then Verify: said under the field',
    setup: (S) => { L_A.adminSignOut(); L_A.adminSendCode(L_ADMIN.email); S.state.ui['a-login'] = { code: '000000' }; },
    click: ['.action-bar [data-act="verify"]'],
    expect: { has: 'That code doesn’t match. Try again.', sel: '#admin-code[aria-invalid="true"]' } },
  { screen: 'a-login', group: G, key: 'a-login--second', title: 'Admin sign-in — the second factor', note: 'Step 2 of 2: the code from his authenticator app (simulated), then the inbox and the Test-flows tools',
    setup: () => { L_A.adminSignOut(); L_A.adminSendCode(L_ADMIN.email); L_A.adminVerifyCode('123456'); },
    expect: { has: ['TAILY ADMIN · STEP 2 OF 2', 'Two-step check', 'Open your authenticator app and enter the 6-digit code for Taily.', 'Code from your authenticator app', 'Sign in', 'Start over'], sel: '#admin-second' } },
];
/* ---------- a-inbox: his session's row — Test flows + Sign out (K-53 a8, D-422) ---------- */
export const FLOWS_a_inbox = [
  { screen: 'a-inbox', group: G, key: 'a-inbox--tools', title: 'Admin inbox — Test flows and Sign out', note: 'K-53 a8: the Test-flows panel is his (and only his); Sign out goes back to a-login and hides it',
    expect: { has: ['Inbox', 'Test flows', 'Sign out'], sel: '[data-admin-tools] [data-act="test-flows"]', also: '[data-admin-tools] [data-act="admin-sign-out"]' } },
];

/* ---------- to-availability: two windows, time off, minimum notice (K-53 a4 / S-34) ---------- */
export const FLOWS_to_availability = [
  { screen: 'to-availability', group: G, key: 'to-availability--two-windows', title: 'Availability — a split day', note: 'D-424: Tuesday 10 AM–2 PM, then 5–8 PM; the second hours carry a ✕, the other days "+ Add more hours"',
    setup: (S) => { L_onboardTo('availability'); S.state.ui['to-availability'] = { draft: { shop: { tue: [['10:00', '14:00'], ['17:00', '20:00']], wed: [['10:00', '18:00']] }, home: { mon: [['18:00', '20:00']] } }, seg: 'shop' }; },
    expect: { has: ['Tuesday', '10:00 AM', '2:00 PM', '5:00 PM', '8:00 PM', '+ Add more hours', 'Need a break in the day? Add more hours.'], sel: '[data-act="remove-window"][data-day="tue"]' } },
  { screen: 'to-availability', group: G, key: 'to-availability--windows-overlap', title: 'Availability — two times that overlap', note: 'Tuesday 10 AM–2 PM and 1–4 PM, then Next: said on the day',
    setup: (S) => { L_onboardTo('availability'); S.state.ui['to-availability'] = { draft: { shop: { tue: [['10:00', '14:00'], ['13:00', '16:00']] }, home: { mon: [['18:00', '20:00']] } }, seg: 'shop' }; },
    click: ['[data-act="next"]'],
    expect: { has: 'Your two times on this day overlap. Move one of them.', sel: '.day-hours--error[data-day-row="tue"]' } },
  { screen: 'to-availability', group: G, key: 'to-availability--time-off', title: 'Availability — time off and notice', note: 'D-425 / D-426: live Amara, a week off (Mon, Oct 19 to Fri, Oct 23) and 24 hours notice, saved; Save waits for a change',
    setup: (S) => { availWith(S, { timeOff: [OFF], notice: 24 }); },
    expect: { has: ['TIME OFF', 'Customers can’t book these days. Visits you already booked stay booked.', 'Mon, Oct 19 to Fri, Oct 23', '5 days', 'Remove', '+ Add time off', 'MINIMUM NOTICE', `${L_POLICY.MIN_LEAD_H} hours is the shortest Taily allows.`, '24 hours', '48 hours'], sel: '[data-chip-group="notice"] [data-value="24"][aria-checked="true"]', also: '[data-act="save"][disabled]' } },
  { screen: 'to-availability', group: G, key: 'to-availability--time-off-booked', title: 'Availability — time off over a booked visit', note: 'D-426: a day off on Thu, Oct 15, where Sarah’s visit is booked — it stays booked, and the row says so',
    setup: (S) => { S.driveTo('confirmed'); availWith(S, { timeOff: [{ id: 't1', from: '2026-10-15', to: '2026-10-15' }] }); },
    expect: { has: ['Thu, Oct 15', '1 day', 'You have a visit booked then (Sarah, Thu, Oct 15). It stays booked.'] } },
  { screen: 'to-availability', group: G, key: 'to-availability--time-off-sheet', title: 'Availability — add time off', note: 'D-426: two day wheels, first and last day off (both included), then Add time off',
    click: ['[data-act="add-off"]'],
    expect: { has: ['Time off', 'Pick your first and last day off. Both days are included.', 'FIRST DAY OFF', 'LAST DAY OFF', 'Add time off'], sel: '[data-act="off-done"]' } },
];

/* ---------- t-shop: the preview after a request (D-431), the availability summary, approved pending the background check (D-427) ---------- */
export const FLOWS_t_shop = [
  { screen: 't-shop', group: G, key: 't-shop--after-request', title: 'Your shop — after a request was sent', note: 'D-431 (the bug): the draft is empty after a request, so the preview prices the sample items — not "Example: , home visit"',
    setup: (S) => { S.driveTo('requested'); },
    get expect() { return { has: ['WHAT CUSTOMERS SEE', 'Example: suit pant and suit jacket, home visit', L_fmt(L_SC.seed.total)], not: 'Example: ,' }; } },
  { screen: 't-shop', group: G, key: 't-shop--availability', title: 'Your shop — notice and time off in the summary', note: 'K-53 a4: Availability reads the notice (longer than Taily’s) and the next time off',
    setup: (S) => { availWith(S, { timeOff: [OFF], notice: 24 }); },
    expect: { has: ['Availability', '24 hours notice', 'Off Oct 19 to Oct 23'] } },
  { screen: 't-shop', group: G, key: 't-shop--approved', title: 'Your shop — approved, background check pending', note: 'K-53 Q8 (D-427): ID, years and payout passed; the background check runs last — still not listed',
    setup: (S) => { L_onboardTo('submitted'); S.T.reviewChecks({ background: 'pending' }); },
    expect: { has: ['Approved · background check pending', 'You’re approved, pending your background check. Customers can book you once it clears.', 'Background check', '3 of 4 checks passed'], not: 'Bookable', sel: '[data-approved]' } },
];
export const FLOWS_to_done = [
  { screen: 'to-done', group: G, key: 'to-done--approved', title: 'You’re approved', note: 'K-53 Q8 (D-427): the first three checks passed — approved, pending the background check (run last)',
    setup: (S) => { L_onboardTo('submitted'); S.T.reviewChecks({ background: 'pending' }); },
    expect: { has: ['You’re approved', 'You’re approved, pending your background check.', 'Background check', 'Pending'], not: 'You’re bookable', sel: '[data-approved]' } },
];

/* ---------- the legal drafts (K-53 b, D-429) ---------- */
export const FLOWS_c_policy = [
  { screen: 'c-policy', group: G, key: 'c-policy--sms', title: 'Legal — Text message terms', note: 'K-53 b: a new legal draft (COUNSEL #3): what we text, how often, STOP / HELP, slow reminders only 8 AM–9 PM',
    setup: (S) => { S.state.ui.policy = 'sms'; },
    expect: { has: ['Text message terms', L_DRAFT, 'IN SHORT', 'Message frequency varies. Msg & data rates may apply.', 'Reply STOP to stop, START to start again, HELP for help.', 'Reminders that can wait go out only from 8:00 AM to 9:00 PM.', L_COMPANY.name], sel: '[data-doc="sms"] [data-draft]' } },
];
export const FLOWS_t_policy = [
  { screen: 't-policy', group: G, key: 't-policy--sms', title: 'Legal (tailor) — Text message terms', note: 'K-53 b: the tailor’s wording (new requests, reminders, jobs and payouts)',
    setup: (S) => { S.state.ui.policy = 'sms'; },
    expect: { has: ['Text message terms', L_DRAFT, 'If you agree when you sign up: new requests, reminders, and updates about your jobs and payouts.'], sel: '[data-doc="sms"] [data-draft]' } },
  { screen: 't-policy', group: G, key: 't-policy--fee', title: 'Legal (tailor) — the Taily fee in the agreement', note: 'K-53 b: the fee in dollars (money.js), what it covers, the background check last, Freelance Isn’t Free',
    setup: (S) => { S.state.ui.policy = 'tailor-agreement'; },
    expect: { has: [`Taily keeps a fee of ${FEE_WORDS} of your services.`, 'The fee covers insurance, operations, scheduling, clientele and hosting, and more.', 'Once those pass, you’re approved, pending your background check, which runs last.', 'Freelance Isn’t Free Act'], not: '%' } },
];

/* ---------- Help: hours + the backup admin (K-53 Q10, D-430) ---------- */
export const FLOWS_c_help = [
  { screen: 'c-help', group: G, key: 'c-help--contact', title: 'Help — hours and the backup', note: 'K-53 Q10: published Help hours; a second team member covers (placeholder); safety reports read after hours',
    expect: { has: ['CONTACT TAILY', 'Help hours', L_HELP.hours, L_HELP.backup, L_HELP.after], sel: '[data-help-backup]' } },
];
