/* ============================================================
   Taily v5 — the legal pages (pre-MVP B2: S-23 / S-24, DG-3 option A). DOM-free copy.
   COUNSEL (docs/v5/COUNSEL.md): every page below is a PLACEHOLDER — a plain summary of what the prototype
   already does, then "Full text coming soon (counsel review)". The lawyer-approved text drops in here without
   a design change; nothing in this file is legal advice. Timers come from POLICY, never typed; no money rates.
   ============================================================ */
import { POLICY } from './money-config.js';

/** COUNSEL #1 / #2: what sign-up records next to the time she agreed (S-24: "log agreement version and time at sign-up"). */
export const LEGAL_VERSION = 'Draft of Oct 18, 2026';
/** COUNSEL / PROTOTYPE: the legal entity printed on receipts (S-25) — a placeholder until the company details are final. */
export const COMPANY = { name: 'Taily, Inc.', city: 'New York, NY' };

const P = POLICY;
/** id → { title, who: 'customer' | 'tailor' | 'both', counsel: COUNSEL.md row, summary: [lines] } */
export const LEGAL_DOCS = {
  /* COUNSEL #1 */
  terms: {
    title: 'Terms of service', who: 'customer', counsel: 1,
    summary: [
      'Taily is a marketplace. You book independent tailors through it, and each tailor does the work.',
      'Prices are set by each tailor. The estimate you see includes the home visit fee and any rush fee.',
      'We hold a deposit when you send a request and charge it only if the tailor accepts.',
      'You approve the final order at the fitting before any work starts.',
      'Be kind and keep contact details in the app. Phone numbers and emails in messages stay hidden.',
    ],
  },
  /* COUNSEL #1, #9, #10 */
  privacy: {
    title: 'Privacy policy', who: 'both', counsel: 1,
    summary: [
      'We collect your name, mobile number, addresses and the email you add for receipts.',
      'Your card is stored by our payment provider, not by Taily.',
      'A tailor sees your neighborhood until they accept your request, then your full name and address.',
      'Fitting photos are seen only by you, your tailor and Taily.',
      'You can delete your account in Account. We keep receipts and payment records as the law requires.',
    ],
  },
  /* COUNSEL #4, #5, #6 */
  refunds: {
    title: 'Cancellation and refunds', who: 'customer', counsel: 6,
    summary: [
      `If the tailor doesn’t accept within ${P.REQUEST_EXPIRY_H} hours, or declines, your deposit is released in full.`,
      `Cancel ${P.CANCEL_WINDOW_H} hours or more before the visit and your deposit is refunded. After that, the tailor keeps the deposit.`,
      `We text you the day before to confirm. If you don’t confirm ${P.REMINDER_AUTOCANCEL_H} hours before the visit, we cancel it and the tailor keeps the deposit.`,
      'If the tailor can’t make it or doesn’t show up, your deposit is refunded in full.',
      `The balance is held when your order is ready and charged when you get it back, or ${P.UNCLAIMED_CAPTURE_D} days after the hold.`,
      'Refunds can take a few business days to show on your card.',
    ],
  },
  /* COUNSEL #13 */
  accessibility: {
    title: 'Accessibility', who: 'customer', counsel: 13,
    summary: [
      'We design Taily to work with screen readers, larger text, keyboard use and reduced motion.',
      'Every button is at least 44 points tall, and every error sits next to the field it is about.',
      'If something gets in your way, tell us through Help and we’ll fix it.',
    ],
  },
  /* COUNSEL #2 */
  'tailor-terms': {
    title: 'Tailor terms of service', who: 'tailor', counsel: 2,
    summary: [
      'You run your own business. You set your prices, hours and the areas you visit.',
      'Customers see you only when your checks have passed and you price every service their order needs.',
      `Answer each request within ${P.REQUEST_EXPIRY_H} hours, or it expires and the customer’s deposit is released.`,
      'The Taily fee comes out of your services only, never your home visit or rush fees.',
    ],
  },
  /* COUNSEL #2, #7, #8 */
  'tailor-agreement': {
    title: 'Tailor agreement', who: 'tailor', counsel: 2,
    summary: [
      'You work with Taily as an independent contractor, not an employee.',
      'You agree to an ID check and a background check before customers can book you.',
      'Payouts go to your bank the Friday after the customer has her order. Our payments partner keeps your tax details.',
      `If a customer cancels less than ${P.CANCEL_WINDOW_H} hours before the visit, you keep the deposit.`,
    ],
  },
};

/** The pages each persona's Account lists, in order. */
export const LEGAL_FOR = {
  customer: ['terms', 'privacy', 'refunds', 'accessibility'],
  tailor: ['tailor-terms', 'tailor-agreement', 'privacy'],
};
