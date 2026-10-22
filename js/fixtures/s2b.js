/* ============================================================
   Pre-MVP fix pass, track B1 (K-48; D-350…D-361) — the supply side: get verified + the hosted payout step (DG-4 option B,
   D-05 / D-06), years tailoring + the waitlist (D-18), listing only tailors who can do every item (D-08 / K-48.2, B-13), the
   courier pickup address for a tailor with no shop (B-15), addresses + distances from her own address (S-42), the area
   waitlist (P-34), the not-live landing (S-21), the nav guard on unsaved Shop edits (S-22), previews that show only what
   customers see (S-39), notes from the accept (D-19), the item names that open their services (D-24).
   Same shape as js/fixtures/m#.js; flows.js concatenates every FLOWS_* export. Setups compose onboardTo / driveTo /
   earningsTo and the real transitions (T.*) + sim knobs; money strings come from SCENARIOS through fmt*(), never typed.
   ============================================================ */
import { SCENARIOS as B_SC, AMARA as B_AMARA } from './money-scenarios.js';
import { fmt as B_fmt, fmtExact as B_exact } from '../money.js';
import { onboardTo as B_onboardTo, NEW_TAILOR_PHONE as B_PHONE, earningsTo as B_earningsTo } from './common.js';

const G = 'Pre-MVP · supply side';
/* B-15 / S-42: a tailor who works from home in SoHo — no shop, the courier collects from her studio */
const STUDIO = { street: '40 Mercer St', unit: '2F', zip: '10013', notes: 'Buzzer 2F' };
const SAMPLE_PRICES = () => { const p = { ...B_AMARA.prices }; delete p['jacket-sides']; return p; };   // every service but "Take in jacket sides"
const noShop = (S) => {
  S.T.setTailorSection('where', { shop: { enabled: false }, home: { enabled: true }, collect: { ...STUDIO } });
  S.T.setTailorSection('returns', { returns: { pickup: false, courier: true } });
};

/* ---------- to-profile: the photo ID (DG-4) and years tailoring (D-18) ---------- */
export const FLOWS_to_profile = [
  { screen: 'to-profile', group: G, key: 'to-profile--id-sheet', title: 'Profile — add your photo ID', note: 'DG-4 (D-350): the first check is the ID matched to the profile photo — take or choose a photo of it; only Taily sees it',
    setup: () => { B_onboardTo('profile'); },
    click: ['[data-act="id"]'],
    expect: { has: ['Your photo ID', 'We match your ID to your profile photo. Only Taily sees it, never customers.', 'Take a photo of your ID', 'Choose from library'] } },
  { screen: 'to-profile', group: G, key: 'to-profile--id-added', title: 'Profile — ID added, years filled', note: 'DG-4 + D-18: the ID is in the draft ("We check it once you finish") and 12 years typed; the list card shows "12 years tailoring"',
    setup: (S) => { B_onboardTo('profile'); S.state.ui['to-profile'] = { draft: { name: B_AMARA.name, shopName: B_AMARA.shopName, years: String(B_AMARA.years), cardLine: B_AMARA.cardLine, bio: B_AMARA.bio, photo: true, idDoc: true, workPhotos: 0 } }; },
    expect: { has: ['Photo ID', 'Added. We check it once you finish.', 'Years tailoring', 'Taily tailors have at least 5 years of experience.', '12 years tailoring', 'Change ID photo'], sel: '#years[value="12"]' } },
];

/* ---------- to-where: the courier's pickup address without a shop (B-15), the ZIP's own place (S-42) ---------- */
export const FLOWS_to_where = [
  { screen: 'to-where', group: G, key: 'to-where--courier-address', title: 'Where you work — no shop: where the courier collects', note: 'B-15 (D-356): home visits only, so the courier is her only way back — street, floor, ZIP and a note, private',
    setup: (S) => { B_onboardTo('where'); S.state.ui['to-where'] = { draft: { shop: { enabled: false, street: '', unit: '', zip: '' }, home: { enabled: true, hoods: ['soho', 'tribeca'], fee: 35 }, collect: { ...STUDIO } } }; },
    expect: { has: ['Where should the courier collect finished orders?', 'Private. Customers never see it.', 'Street address', 'Apartment or floor (optional)', 'Notes for the courier (optional)', 'SoHo, New York, NY', 'Comes to you in SoHo and TriBeCa'], not: 'Shop street address', sel: '#collectStreet[value="40 Mercer St"]' } },
  { screen: 'to-where', group: G, key: 'to-where--courier-address-missing', title: 'Where you work — no courier address', note: 'B-15: Next with the pickup address blank — the errors sit under each field',
    setup: (S) => { B_onboardTo('where'); S.state.ui['to-where'] = { draft: { shop: { enabled: false, street: '', unit: '', zip: '' }, home: { enabled: true, hoods: ['williamsburg'], fee: 35 }, collect: { street: '', unit: '', zip: '', notes: '' } } }; },
    click: ['[data-act="next"]'],
    expect: { has: ['Enter your shop’s street address.', 'Enter a 5-digit ZIP code.'], sel: '#collectStreet[aria-invalid="true"]', also: '#collectZip[aria-invalid="true"]' } },
  { screen: 'to-where', group: G, key: 'to-where--zip-unserved', title: 'Where you work — a ZIP outside Taily', note: 'S-42 (D-357): a shop ZIP Taily doesn’t serve yet says so (it was saved as Brooklyn before)',
    setup: (S) => { B_onboardTo('where'); S.state.ui['to-where'] = { draft: { shop: { enabled: true, street: '1 Main St', unit: '', zip: '07302' }, home: { enabled: false, hoods: [], fee: null } } }; },
    click: ['[data-act="next"]'],
    expect: { has: 'Taily isn’t in that area yet.', sel: '#shopZip[aria-invalid="true"]' } },
  { screen: 'to-where', group: G, key: 'to-where--manhattan', title: 'Where you work — a shop in SoHo', note: 'S-42: the ZIP names its own place (SoHo, New York, NY), a suite / floor field, and the preview is c-tailor’s Where block',
    setup: (S) => { B_onboardTo('where'); S.state.ui['to-where'] = { draft: { shop: { enabled: true, street: '40 Mercer St', unit: 'Suite 3', zip: '10013' }, home: { enabled: false, hoods: [], fee: null } } }; },
    expect: { has: ['SoHo, New York, NY', 'Suite or floor (optional)', `${B_AMARA.shopName}, 40 Mercer St, Suite 3, New York, NY 10013`], not: 'Brooklyn, NY' } },
];

/* ---------- to-returns: the courier names where it collects (B-15) ---------- */
export const FLOWS_to_returns = [
  { screen: 'to-returns', group: G, key: 'to-returns--no-shop', title: 'Return options — no shop', note: 'B-15: pickup needs a shop; the courier caption says it collects from her studio address',
    setup: (S) => { B_onboardTo('returns'); S.T.setTailorSection('where', { shop: { enabled: false }, home: { enabled: true }, collect: { ...STUDIO } }); },
    expect: { has: ['Needs a shop. Turn it on in Where you work.', 'We send a courier to collect it from 40 Mercer St, 2F.'], sel: '#ret-courier:checked' } },
];

/* ---------- to-payouts: the disclosure, the partner's states (DG-4 / D-06) ---------- */
const submitted = (S, payoutSetup = 'verifying') => {
  B_onboardTo('payouts');
  S.state.sim.payoutSetup = payoutSetup;
  S.T.consentBackground(true);
  S.T.setupPayouts();
  S.T.submitOnboarding();
};
export const FLOWS_to_payouts = [
  { screen: 'to-payouts', group: G, key: 'to-payouts--disclosure', title: 'Background check — the disclosure', note: 'DG-4 (D-354): the disclosure is its own sheet; the copy is a placeholder marked for counsel (FCRA + NYC Fair Chance)',
    setup: () => { B_onboardTo('payouts'); },
    click: ['[data-act="disclosure"]'],
    expect: { has: ['Background check', 'consumer report', 'Fair Chance Act', 'Draft for counsel'] } },
  { screen: 'to-payouts', group: G, key: 'to-payouts--verifying', title: 'Payouts — verifying your details', note: 'D-06 (D-351): back from the partner — identity verifying, the W-9 received, the bank done; nothing to do',
    setup: (S) => { submitted(S); },
    expect: { has: ['Verifying your details', 'Usually a few minutes, sometimes 1 to 2 days.', 'Identity', 'Verifying', 'Tax info (W-9)', 'Received', 'Bank account', `${B_AMARA.payouts.bank} •••• ${B_AMARA.payouts.last4} · paid Fridays`], not: ['Update bank details', 'Routing number'] } },
  { screen: 'to-payouts', group: G, key: 'to-payouts--action-needed', title: 'Payouts — action needed', note: 'D-06: the partner couldn’t match her date of birth to her SSN — say so, and one way to fix it (back to the partner)',
    setup: (S) => { submitted(S, 'action-needed'); },
    expect: { has: ['Action needed', 'couldn’t match your date of birth to your SSN', 'Date of birth doesn’t match', 'Needs info', 'Fix it with our payments partner'], sel: '.banner--error' } },
  { screen: 'to-payouts', group: G, key: 'to-payouts--paused', title: 'Payouts — paused for the W-9', note: 'DG-4 B: months later the partner needs her to confirm her tax info; the amount waiting, the date, Confirm tax info',
    setup: (S) => { B_earningsTo('pending'); S.T.pausePayouts(); },
    get expect() { return { has: ['Payouts are paused', 'confirm your tax info (W-9)', B_exact(B_SC.seed.payout), 'Confirm tax info'], sel: '.banner--warning' }; } },
];

/* ---------- to-done: bookable at once, a check that needs her, the waitlist ---------- */
export const FLOWS_to_done = [
  { screen: 'to-done', group: G, key: 'to-done--bookable', title: 'You’re bookable', note: 'Every check already passed when she finished: live, her row as a customer sees it (with the Verified check)',
    setup: () => { B_onboardTo('done'); },
    expect: { has: ['You’re bookable', 'PREVIEW', 'How a customer in Williamsburg sees you', B_fmt(B_SC.seed.total), 'Est.', 'WHAT HAPPENS NEXT', `We’ll text each new request to ${B_PHONE}.`, 'You’re paid the Friday after the customer has her order.'], not: ['YOUR CHECKS', 'Submitted'], sel: '.customer-preview .tailor-row [data-verified]', also: '[data-outcome="live"]' } },
  { screen: 'to-done', group: G, key: 'to-done--needs-you', title: 'Submitted — a check needs you', note: 'The partner couldn’t verify her identity: the lead says one check needs her, in her shop',
    setup: (S) => { submitted(S, 'action-needed'); },
    expect: { has: ['Submitted', 'One check needs you before we can finish the review.', 'Needs info', 'Your date of birth doesn’t match your SSN. Fix it'], not: 'Most reviews take' } },
  { screen: 'to-done', group: G, key: 'to-done--waitlist', title: 'On the waitlist', note: 'D-18 (D-353): 3 years tailoring — under the 5-year minimum, the profile is kept and she is never listed',
    setup: (S) => { B_onboardTo('profile'); S.T.setTailorSection('profile', { name: B_AMARA.name, initials: B_AMARA.initials, cardLine: B_AMARA.cardLine, bio: B_AMARA.bio, photo: true, idDoc: true, years: 3 }); },
    expect: { has: ['You’re on the waitlist', 'Taily tailors have at least 5 years of experience, and you told us 3 years.', `we’ll text ${B_PHONE}`, 'Done', 'Change years tailoring'], sel: '[data-outcome="waitlist"]' } },
];

/* ---------- t-shop: the checklist lives here (DG-4 option B) ---------- */
export const FLOWS_t_shop = [
  { screen: 't-shop', group: G, key: 't-shop--review', title: 'Your shop — under review', note: 'DG-4 B (Kevin): after onboarding — "Under review · 1 of 4 checks", Taking requests off until the checks clear, the four checks, her row as customers will see it',
    setup: (S) => { submitted(S); },
    expect: { has: ['Under review · 1 of 4 checks', 'Taking requests', 'Turns on when your checks clear.', 'YOUR CHECKS', 'Customers can book you once all 4 pass.', 'ID and profile photo', 'We’re matching your ID to your profile photo', 'Background check', 'Years tailoring', '12 years', 'Payout and tax info', 'WHAT CUSTOMERS WILL SEE', 'Verification', '1 of 4 checks passed', 'verifying your details'], not: 'Bookable', sel: '#taking-requests[disabled]', also: '[data-review]' } },
  { screen: 't-shop', group: G, key: 't-shop--review-needs', title: 'Your shop — checks that need her', note: 'The review came back: the ID didn’t match her photo and the partner needs her identity fixed — each row is its one action (K-53 Q8: the background check waits for them)',
    setup: (S) => { submitted(S); S.T.reviewChecks({ id: 'needs-info', payout: 'needs-info' }); },
    expect: { has: ['Needs you · 1 of 4 checks', 'Your ID didn’t match your photo. Add it again', 'Your date of birth doesn’t match your SSN. Fix it', 'Needs info', 'Needs attention'], sel: '.verify-list [data-act="check-id"]', also: '.verify-list [data-act="check-payout"]' } },
  { screen: 't-shop', group: G, key: 't-shop--id-sheet', title: 'Your shop — add the ID again', note: 'DG-4: the ID check needs a new photo — the same sheet as onboarding, from the checklist row',
    setup: (S) => { submitted(S); S.T.reviewChecks({ id: 'needs-info' }); },
    click: ['.verify-list [data-act="check-id"]'],
    expect: { has: ['Your photo ID', 'Take a photo of your ID'] } },
  { screen: 't-shop', group: G, key: 't-shop--payouts-paused', title: 'Your shop — payouts paused', note: 'DG-4 B mirror: live, but the partner paused payouts for the W-9 — the Payouts row says it and is flagged',
    setup: (S) => { S.T.pausePayouts(); },
    expect: { has: ['Bookable', `${B_AMARA.payouts.bank} •••• ${B_AMARA.payouts.last4} · payouts paused`, 'Needs attention', 'All 4 checks passed'] } },
  { screen: 't-shop', group: G, key: 't-shop--no-shop', title: 'Your shop — no shop, courier only', note: 'B-15 (D-356): home visits only — Return options says where the courier collects',
    setup: (S) => { noShop(S); },
    expect: { has: ['Bookable', 'Taily courier · courier collects from 40 Mercer St, 2F'], not: 'Shop at' } },
];

/* ---------- t-home: not listed yet (S-21) ---------- */
export const FLOWS_t_home = [
  { screen: 't-home', group: G, key: 't-home--under-review', title: 'Home — under review', note: 'S-21 (D-361): a tailor customers can’t book yet is told why first — her checks — with a way to them',
    setup: (S) => { submitted(S); },
    expect: { has: ['Under review · 1 of 4 checks', 'Customers can book you once all 4 pass.', 'See your checks'], sel: '[data-act="see-checks"]' } },
  { screen: 't-home', group: G, key: 't-home--finish-setup', title: 'Home — finish setting up', note: 'S-21: steps still open — "Finish setting up · 4 steps left" with Continue (never an empty Home with no prompt)',
    setup: () => { B_onboardTo('where'); },
    expect: { has: ['Finish setting up · 4 steps left', 'Customers can’t book you until your shop is set up.', 'Continue'], sel: '[data-act="continue-setup"]' } },
];

/* ---------- t-earnings: payouts paused + Tax documents (DG-4 B) ---------- */
export const FLOWS_t_earnings = [
  { screen: 't-earnings', group: G, key: 't-earnings--paused', title: 'Earnings — payouts paused', note: 'DG-4 B (D-355): the partner needs the W-9 confirmed — the banner, the payout waits ("Paused until your tax info is in"), Tax documents',
    setup: (S) => { B_earningsTo('pending'); S.T.pausePayouts(); },
    get expect() { return { has: ['Payouts are paused', 'confirm your tax info (W-9)', 'Confirm tax info', B_exact(B_SC.seed.payout), 'Paused until your tax info is in', 'TAX DOCUMENTS', 'Tax info (W-9)', 'Needs info', '2026 tax form (1099-K)', 'Ready by Jan 31, 2027'], sel: '.banner--warning' }; } },
];

/* ---------- listing: only tailors who can do every item (K-48.2 / D-08, B-13) ---------- */
export const FLOWS_c_tailors = [
  { screen: 'c-tailors', group: G, key: 'c-tailors--services', title: 'Tailors near you — nobody does every item', note: 'K-48.2 (D-354): Amara doesn’t price "Take in jacket sides" any more, so she isn’t listed (was: a lower estimate, then a failed booking)',
    setup: (S) => { S.T.setTailorSection('services', { prices: SAMPLE_PRICES() }); },
    expect: { has: ['No tailor near you does all of this yet', 'don’t price every service you picked', 'Change your items', 'Text me when a tailor covers 11211'], not: 'Est.', sel: '[data-empty="services"]' } },
  { screen: 'c-tailors', group: G, key: 'c-tailors--waitlist', title: 'Tailors near you — on the area waitlist', note: 'P-34 (D-358): outside coverage she asked for one text when a tailor covers 11201',
    setup: (S) => { S.T.setJob({ zip: '11201', address: null }); S.T.joinAreaWaitlist('11201'); },
    expect: { has: ['No tailors visit 11201 yet', `We’ll text ${'(718) 555-0142'} when a tailor covers 11201.`], not: 'Text me when', sel: '[data-waitlist="joined"]' } },
  { screen: 'c-tailors', group: G, key: 'c-tailors--shop-moved', title: 'Tailors near you — distance from her own shop', note: 'S-42 (D-357): Amara’s shop moved to SoHo — the row and the 5-mile shop radius read from HER address, not the seed’s',
    setup: (S) => { S.T.setTailorSection('where', { shop: { enabled: true, street: '40 Mercer St', unit: '', zip: '10013' } }); S.T.setJob({ visitType: 'shop' }); },
    expect: { has: ['40 Mercer St · SoHo · 4.1 mi'], not: '0.6 mi', sel: '.tailor-row__line' } },
];
export const FLOWS_c_tailor = [
  { screen: 'c-tailor', group: G, key: 'c-tailor--services', title: 'Tailor profile — doesn’t do every item', note: 'K-48.2: opened from a link — Pick a time is off with the reason (never a booking that fails at the end)',
    setup: (S) => { S.T.setTailorSection('services', { prices: SAMPLE_PRICES() }); },
    expect: { has: 'Doesn’t offer every service you picked', sel: '[data-act="pick-time"][disabled]' } },
];
export const FLOWS_c_pay = [
  { screen: 'c-pay', group: G, key: 'c-pay--services', title: 'Review and send — the tailor dropped a service', note: 'B-13 (D-354): she stopped pricing a service while Sarah was paying — said before Send (Send off), its own message and a way on, never "something went wrong"',
    setup: (S) => { S.T.setTailorSection('services', { prices: SAMPLE_PRICES() }); },
    expect: { has: ['Amara doesn’t offer every service you picked', 'Nothing was held.', 'See other tailors'], not: 'Something went wrong', sel: '.banner--error', also: '[data-act="pay"][disabled]' } },
];

/* ---------- t-job: notes from the accept (D-19), the item name opens its services (D-24), the courier's pickup address (B-15) ---------- */
export const FLOWS_t_job = [
  { screen: 't-job', group: G, key: 't-job--notes-before-visit', title: 'Job — a note before the visit', note: 'D-19 (K-48): private notes open from the accept (Study-1 default 14 said from the fitting)',
    setup: (S) => { const a = S.driveTo('confirmed'); S.T.addNote(a.id, { text: 'Bring the grey thread for the suit pant.', photos: [] }); },
    expect: { has: ['GENERAL NOTES', 'Only you can see these notes.', 'Bring the grey thread for the suit pant.', 'Add a note'], sel: '[data-notes]' } },
  { screen: 't-job', group: G, key: 't-job--name-peek', title: 'Job — an item name opens its services', note: 'D-24 (K-48): the underlined item name (K-05) opens that item’s services popover (K-25)',
    setup: (S) => { S.driveTo('in-progress'); },
    click: ['.work-list .garment-head__peek'],
    expect: { has: ['Suit Pant', '1 service', 'Hem pants'], sel: '#garment-pop' } },
  { screen: 't-job', group: G, key: 't-job--handoff-courier-studio', title: 'Job — the courier collects from her studio', note: 'B-15: no shop — the courier row says where it collects',
    setup: (S) => { S.driveTo('awaiting-handoff', { returnOption: 'courier' }); noShop(S); },
    expect: { has: ['From 40 Mercer St, 2F'] } },
];

/* ---------- S-22: the top nav asks before dropping unsaved Shop edits ---------- */
export const FLOWS_to_services = [
  { screen: 'to-services', group: G, key: 'to-services--leave-nav', title: 'Services and prices — the top nav with unsaved edits', note: 'S-22 (D-360): a price changed, then Home in the top nav — Leave without saving? (was: lost without a word)',
    setup: (S) => { S.state.ui['to-services'] = { draft: { prices: { ...B_AMARA.prices, 'hem-pants': B_AMARA.prices['hem-pants'] + 5 } } }; },
    click: ['[data-nav="home"]'],
    expect: { has: ['Leave without saving', 'Keep editing', 'Discard changes'], sel: '[data-act="keep-editing"]' } },
];

