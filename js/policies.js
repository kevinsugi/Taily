/* ============================================================
   Taily v5 — THE policy and legal pages (pre-MVP A2 + B2, unified at the merge, D-380). DOM-free; c-policy / t-policy render
   one page, c-help / t-help list them, Account (c-account, t-shop) lists the legal ones. Every rule reads POLICY / MONEY
   (js/money-config.js) and prints dollars through money.js — never a percentage.
   COUNSEL (docs/v5/COUNSEL.md): copy marked `counsel` (a "Draft for counsel" line) or `legal` (a COUNSEL row: the version line,
   IN SHORT and "Full text coming soon (counsel review)") is a PLACEHOLDER Kevin's counsel reviews; the page says so. The
   lawyer-approved text drops in here without a design change; nothing in this file is legal advice.
   Was two systems: A2's js/policies.js + c-policy / t-policy (garment protection, cancellation, payments, disputes, safety) and
   B2's js/legal.js + c-legal / t-legal (terms, privacy, refunds, accessibility, tailor terms, tailor agreement).
   ============================================================ */
import { POLICY, MONEY } from './money-config.js';
import { fmt, cents } from './money.js';

/** Taily's contact details on the Help page (PROTOTYPE placeholders: the real number and address come with the support tooling). */
export const HELP_CONTACT = Object.freeze({ text: '(718) 555-0100', email: 'help@taily.app', hours: 'Every day, 8:00 AM to 9:00 PM' });
/** COUNSEL #1 / #2: what sign-up records next to the time she agreed (S-24: "log agreement version and time at sign-up"); the legal
    pages print it under their title. */
export const LEGAL_VERSION = 'Draft of Oct 18, 2026';
/** COUNSEL / PROTOTYPE: the legal entity printed on receipts (S-25) — a placeholder until the company details are final. */
export const COMPANY = { name: 'Taily, Inc.', city: 'New York, NY' };

/** D-21: the per-order cap, in dollars as people read it ("$500"). */
export const protectionCap = () => fmt(cents(MONEY.GARMENT_PROTECTION_CAP));
/** The one-line promise (c-pay, the courier card, Help). */
export const protectionLine = () => `Garment protection: Taily covers loss or damage up to ${protectionCap()} per order.`;

const COUNSEL_LINE = 'Draft for counsel: the cap, what’s covered and how claims work are placeholders until counsel and our insurer sign off.';

/** `sections` = [{ title, lines: [string] }] per person ('customer' | 'tailor'). */
export const POLICIES = {
  garment: {
    title: 'Garment protection',
    sub: () => `Loss or damage, up to ${protectionCap()} per order`,
    counsel: true,
    sections: (who) => [
      { title: 'What’s covered', lines: who === 'tailor' ? [
        `Taily insures the garments you work on through Taily, up to ${protectionCap()} per order. That covers loss or damage while a garment is in your care and while the Taily courier has it.`,
        'You don’t pay the customer yourself. Taily handles the claim with you both.',
      ] : [
        `If a garment is lost or damaged while it’s with your tailor or the Taily courier, Taily pays to repair or replace it, up to ${protectionCap()} per order.`,
        'That covers the fitting, the tailoring and the trip back to you.',
      ] },
      { title: 'How to claim', lines: [
        `Tell us within ${POLICY.GARMENT_REPORT_H} hours of ${who === 'tailor' ? 'finding the problem' : 'getting your order back'}. Open the ${who === 'tailor' ? 'job, tap More, then Get help' : 'order and tap Get help'}, choose “A garment was damaged or lost”, and add photos.`,
        'We compare the before and pinned photos from the fitting and the courier’s drop-off photo, then reply in the Help thread.',
        `A courier drop-off in your building’s lobby counts as delivered. If it isn’t there, tell us within ${POLICY.COURIER_REPORT_H} hours.`,
      ] },
      { title: 'Not covered', lines: ['Normal wear, a fabric failing with age, and changes you approved in the final order.'] },
    ],
  },
  /* COUNSEL #4, #5, #6 — A2's Help policy and B2's "Cancellation and refunds" legal page are this one page (D-380) */
  cancellation: {
    title: 'Cancellation and refunds',
    sub: () => `Free until ${POLICY.CANCEL_WINDOW_H} hours before a visit`,
    legal: 6,
    sections: (who) => [
      ...(who === 'tailor' ? [] : [{ title: 'Before your tailor accepts', lines: [
        `If your tailor doesn’t accept within ${POLICY.REQUEST_EXPIRY_H} hours, or declines, your deposit is released in full.`,
      ] }]),
      { title: 'Cancelling a visit', lines: who === 'tailor' ? [
        `If the customer cancels ${POLICY.CANCEL_WINDOW_H} hours or more before the visit, nothing is owed. Inside ${POLICY.CANCEL_WINDOW_H} hours, you keep her deposit.`,
        'If you cancel, she gets her deposit back in full. Please cancel only when you have to.',
      ] : [
        `Cancel for free until ${POLICY.CANCEL_WINDOW_H} hours before your visit. After that, your tailor keeps the deposit for the time set aside.`,
        `${POLICY.REMINDER_H} hours before your visit, we text you to confirm. If you don’t confirm by ${POLICY.REMINDER_AUTOCANCEL_H} hours before the visit, we cancel it and the deposit is kept.`,   // K-51
        'If your tailor cancels or doesn’t show up, your deposit is refunded in full.',
      ] },
      { title: 'Refunds', lines: ['A refund goes back to the card you paid with. It can take 5 to 10 business days to show.'] },
    ],
  },
  payments: {
    title: 'Payments and holds',
    sub: (who) => (who === 'tailor' ? 'When you’re paid, and the Taily fee' : 'When you’re charged, and for what'),
    sections: (who) => (who === 'tailor' ? [
      { title: 'Your payout', lines: [
        'Your payout is your prices plus the home visit fee and any rush fee, minus the Taily fee, which is taken from your services only. Every screen shows it in dollars.',
        'It goes to your bank the Friday after the customer gets her order.',
      ] },
      { title: 'If something is wrong', lines: ['Open the job, tap More, then Get help. Taily can hold, release or change a payout while it looks into a problem.'] },
    ] : [
      { title: 'The deposit', lines: ['We hold the deposit when you send a request and charge it only if your tailor accepts. If she declines or doesn’t reply, it’s released.'] },
      { title: 'The balance', lines: [
        'You approve the final order at the fitting before any work starts.',
        `When it’s ready, we hold the balance when you choose how to get it back and charge it at the handoff. If you haven’t collected it ${POLICY.UNCLAIMED_CAPTURE_D} days later, we charge it then.`,
      ] },
      { title: 'A charge you don’t recognize', lines: [`Open the order and tap Get help, then “A charge or refund”. We reply within ${POLICY.HELP_REPLY_H} hours.`] },
    ]),
  },
  disputes: {
    title: 'No-shows and disputes',
    sub: () => 'When something didn’t happen the way it should',
    sections: (who) => [
      { title: 'No-shows', lines: [
        `A tailor can mark a no-show ${POLICY.NO_SHOW_WAIT_MIN} minutes after the start, and only after tapping I’m here when she arrived.`,
        `A customer can report that the tailor didn’t come ${POLICY.NO_SHOW_WAIT_MIN} minutes after the start. The deposit is refunded.`,
        `If nothing is recorded, we ask you both “Did the visit happen?” ${POLICY.VISIT_CHECK_H} hours after the start. With no answer after ${POLICY.VISIT_CHECK_CANCEL_H} more hours, we decide by what was recorded: if the tailor tapped I’m here, it counts as the customer’s no-show.`,
        `If nothing was recorded at all, we close the visit as not confirmed and hold the deposit. If neither of you disputes it within ${POLICY.VISIT_HOLD_DISPUTE_H} hours, the tailor keeps it.`,   // K-51 (replaces the refund)
      ] },
      { title: 'That’s not right', lines: [
        `If you disagree with the other person’s report, tap That’s not right. Taily looks at what you both say, keeps the money on hold, and decides within ${POLICY.HELP_REPLY_H} hours.`,
        who === 'tailor' ? 'Your evidence helps: the time you tapped I’m here, a photo of the door, your messages.' : 'Your evidence helps: a photo, the time, your messages.',
      ] },
    ],
  },
  safety: {
    title: 'Safety',
    sub: () => 'Report or block someone',
    sections: (who) => [
      { title: 'In an emergency', lines: ['Call 911 first. Then tell us what happened.'] },
      { title: 'Report or block', lines: [
        `From a chat, tap More, then Report or Block. Or open Help and choose Safety. We read every report and reply within ${POLICY.HELP_REPLY_H} hours.`,
        `When you block someone, you can’t book each other and your chat closes. ${who === 'tailor' ? 'A job already booked stays until Taily contacts you both.' : 'A booking you already have stays until Taily contacts you both.'}`,
      ] },
      { title: 'Your privacy', lines: ['Phone numbers and emails are hidden in every chat, and calls will go through a Taily number.'] },
    ],
  },
  /* ---------- the legal pages (pre-MVP B2, S-23 / S-24, D-373): `legal` = the COUNSEL.md row; one IN SHORT list each ---------- */
  /* COUNSEL #1 */
  terms: {
    title: 'Terms of service', sub: () => 'How booking through Taily works', legal: 1,
    sections: () => [{ title: 'In short', list: true, lines: [
      'Taily is a marketplace. You book independent tailors through it, and each tailor does the work.',
      'Prices are set by each tailor. The estimate you see includes the home visit fee and any rush fee.',
      'We hold a deposit when you send a request and charge it only if the tailor accepts.',
      'You approve the final order at the fitting before any work starts.',
      'Be kind and keep contact details in the app. Phone numbers and emails in messages stay hidden.',
    ] }],
  },
  /* COUNSEL #1, #9, #10 */
  privacy: {
    title: 'Privacy policy', sub: () => 'What we keep and who sees it', legal: 1,
    sections: () => [{ title: 'In short', list: true, lines: [
      'We collect your name, mobile number, addresses and the email you add for receipts.',
      'Your card is stored by our payment provider, not by Taily.',
      'A tailor sees your neighborhood until they accept your request, then your full name and address.',
      'Fitting photos are seen only by you, your tailor and Taily.',
      'You can delete your account in Account. We keep receipts and payment records as the law requires.',
    ] }],
  },
  /* COUNSEL #13 */
  accessibility: {
    title: 'Accessibility', sub: () => 'Screen readers, larger text, reduced motion', legal: 13,
    sections: () => [{ title: 'In short', list: true, lines: [
      'We design Taily to work with screen readers, larger text, keyboard use and reduced motion.',
      'Every button is at least 44 points tall, and every error sits next to the field it is about.',
      'If something gets in your way, tell us through Help and we’ll fix it.',
    ] }],
  },
  /* COUNSEL #2 */
  'tailor-terms': {
    title: 'Tailor terms of service', sub: () => 'Your shop, your prices, answering requests', legal: 2,
    sections: () => [{ title: 'In short', list: true, lines: [
      'You run your own business. You set your prices, hours and the areas you visit.',
      'Customers see you only when your checks have passed and you price every service their order needs.',
      `Answer each request within ${POLICY.REQUEST_EXPIRY_H} hours, or it expires and the customer’s deposit is released.`,
      'The Taily fee comes out of your services only, never your home visit or rush fees.',
    ] }],
  },
  /* COUNSEL #2, #7, #8 */
  'tailor-agreement': {
    title: 'Tailor agreement', sub: () => 'Contractor, checks and payouts', legal: 2,
    sections: () => [{ title: 'In short', list: true, lines: [
      'You work with Taily as an independent contractor, not an employee.',
      'You agree to an ID check and a background check before customers can book you.',
      'Payouts go to your bank the Friday after the customer has her order. Our payments partner keeps your tax details.',
      `If a customer cancels less than ${POLICY.CANCEL_WINDOW_H} hours before the visit, you keep the deposit.`,
    ] }],
  },
};
/** Help's policy rows, per person: the Help policies first, then the legal pages (D-337 → D-380). */
const POLICY_ORDER = {
  customer: ['garment', 'cancellation', 'payments', 'disputes', 'safety', 'terms', 'privacy', 'accessibility'],
  tailor: ['payments', 'garment', 'disputes', 'safety', 'cancellation', 'tailor-terms', 'tailor-agreement', 'privacy'],
};
/** The legal pages each persona's Account lists, in order (DG-3 A: Account → Help and policies; B2's LEGAL_FOR). */
export const LEGAL_FOR = {
  customer: ['terms', 'privacy', 'cancellation', 'accessibility'],
  tailor: ['tailor-terms', 'tailor-agreement', 'privacy'],
};
/** The Help page's policy rows for a person: [{ key, title, sub }]. */
export const policyList = (who = 'customer') => POLICY_ORDER[who].map((key) => ({ key, title: POLICIES[key].title, sub: POLICIES[key].sub(who) }));
/** A page's title (Account rows). */
export const policyTitle = (key) => POLICIES[key]?.title ?? '';
/** One page: { key, title, version, sections, counsel, counselLine, legal }. A legal page (a COUNSEL row) carries the version line
    and the "Full text coming soon" block; a counsel draft carries its "Draft for counsel" line. Unknown keys fall back to garment
    protection. */
export function policyPage(key, who = 'customer') {
  const p = POLICIES[key] ?? POLICIES.garment;
  return {
    key: POLICIES[key] ? key : 'garment', title: p.title, sections: p.sections(who),
    counsel: !!p.counsel, counselLine: p.counsel ? COUNSEL_LINE : '',
    legal: p.legal ?? 0, version: p.legal ? LEGAL_VERSION : '',
  };
}
