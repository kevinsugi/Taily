/* ============================================================
   Taily v5 — pre-MVP A2: the Help policies (DG-1's Help page, D-21 garment protection). DOM-free; c-policy / t-policy and
   c-help / t-help render it. Every rule reads POLICY / MONEY (js/money-config.js) and prints dollars through money.js — never a
   percentage. Copy marked `counsel` is a placeholder Kevin's counsel reviews (docs/v5/COUNSEL.md); the page says so.
   Track B2 (Account, legal) adds Terms / Privacy rows here: a `{ key, title, sub, counsel, sections }` entry + its key in POLICY_ORDER.
   ============================================================ */
import { POLICY, MONEY } from './money-config.js';
import { fmt, cents } from './money.js';

/** Taily's contact details on the Help page (PROTOTYPE placeholders: the real number and address come with the support tooling). */
export const HELP_CONTACT = Object.freeze({ text: '(718) 555-0100', email: 'help@taily.app', hours: 'Every day, 8:00 AM to 9:00 PM' });

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
  cancellation: {
    title: 'Cancellation and refunds',
    sub: () => `Free until ${POLICY.CANCEL_WINDOW_H} hours before a visit`,
    sections: (who) => [
      { title: 'Cancelling a visit', lines: who === 'tailor' ? [
        `If the customer cancels ${POLICY.CANCEL_WINDOW_H} hours or more before the visit, nothing is owed. Inside ${POLICY.CANCEL_WINDOW_H} hours, you keep her deposit.`,
        'If you cancel, she gets her deposit back in full. Please cancel only when you have to.',
      ] : [
        `Cancel for free until ${POLICY.CANCEL_WINDOW_H} hours before your visit. After that, your tailor keeps the deposit for the time set aside.`,
        `The day before, we ask you to confirm. If you don’t confirm by ${POLICY.REMINDER_AUTOCANCEL_H} hours before the visit, we cancel it and the deposit is kept.`,
        'If your tailor cancels, your deposit is refunded in full.',
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
        `If nothing is recorded, we ask you both “Did the visit happen?” ${POLICY.VISIT_CHECK_H} hours after the start. With no answer after ${POLICY.VISIT_CHECK_CANCEL_H} more hours, we cancel the visit and refund the deposit.`,
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
};
const POLICY_ORDER = { customer: ['garment', 'cancellation', 'payments', 'disputes', 'safety'], tailor: ['payments', 'garment', 'disputes', 'safety', 'cancellation'] };
/** The Help page's policy rows for a person: [{ key, title, sub }]. */
export const policyList = (who = 'customer') => POLICY_ORDER[who].map((key) => ({ key, title: POLICIES[key].title, sub: POLICIES[key].sub(who) }));
/** One policy page: { title, sections, counsel, counselLine }. Unknown keys fall back to garment protection. */
export function policyPage(key, who = 'customer') {
  const p = POLICIES[key] ?? POLICIES.garment;
  return { key: POLICIES[key] ? key : 'garment', title: p.title, sections: p.sections(who), counsel: !!p.counsel, counselLine: p.counsel ? COUNSEL_LINE : '' };
}
