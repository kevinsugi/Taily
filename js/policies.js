/* ============================================================
   Taily v5 — THE policy and legal pages (pre-MVP A2 + B2, unified at the merge, D-380). DOM-free; c-policy / t-policy render
   one page, c-help / t-help list them, Account (c-account, t-shop) lists the legal ones. Every rule reads POLICY / MONEY
   (js/money-config.js) and prints dollars through money.js — never a percentage.
   K-53 b (track L, D-429): every legal page now carries a full DRAFT (plain language, a US / New York marketplace, the entity
   Taily Group LLC, Brooklyn, NY) under its IN SHORT summary, and opens with "Draft — counsel review required". Nothing here is
   legal advice; counsel reviews each page before launch (docs/v5/COUNSEL.md — each row names its page). COUNSEL comments mark the
   clauses counsel must confirm; the lawyer-approved text drops in here without a design change.
   Was two systems: A2's js/policies.js + c-policy / t-policy (garment protection, cancellation, payments, disputes, safety) and
   B2's js/legal.js + c-legal / t-legal (terms, privacy, refunds, accessibility, tailor terms, tailor agreement).
   ============================================================ */
import { POLICY, MONEY } from './money-config.js';
import { fmt, fmtExact, cents, tailyFeeFor, depositFor, HOLD_DAYS } from './money.js';
import { TAILOR_LIMITS } from './data.js';

/** Taily's contact details on the Help page (PROTOTYPE placeholders: the real number and address come with the support tooling).
    K-53 Q10 (D-430): published Help hours and a backup admin who covers when Kevin is away (placeholder wording). */
export const HELP_CONTACT = Object.freeze({
  text: '(718) 555-0100', email: 'help@taily.app', hours: 'Every day, 8:00 AM to 9:00 PM',
  backup: 'A second Taily team member answers when we’re away, so a reply never waits on one person.',
  after: 'Outside these hours we still read safety reports. In an emergency, call 911 first.',
});
/** COUNSEL #1 / #2: what sign-up records next to the time she agreed (S-24: "log agreement version and time at sign-up"); the legal
    pages print it under their title. */
export const LEGAL_VERSION = 'Draft of Oct 18, 2026';
/** K-53 c1 (D-429): the legal entity — printed on receipts (S-25) and named in every legal page. COUNSEL: the registered address. */
export const COMPANY = { name: 'Taily Group LLC', city: 'Brooklyn, NY' };
/** The line at the top of every legal draft (K-53 b). */
export const DRAFT_LINE = 'Draft — counsel review required';

/** D-21: the per-order cap, in dollars as people read it ("$500"). */
export const protectionCap = () => fmt(cents(MONEY.GARMENT_PROTECTION_CAP));
/** The one-line promise (c-pay, the courier card, Help). */
export const protectionLine = () => `Garment protection: Taily covers loss or damage up to ${protectionCap()} per order.`;

/* ---------- money in words, always dollars (never a rate, K-53) ---------- */
const HUNDRED = cents(MONEY.FEE_EXAMPLE_SERVICES);
/** "$10.00 of every $100.00" (reads MONEY.TAILY_FEE_RATE through money.js). */
const feeWords = () => `${fmtExact(tailyFeeFor(HUNDRED))} of every ${fmtExact(HUNDRED)}`;
/** The deposit in the same dollars-per-$100.00 form (on the services plus the home visit fee). */
const depositWords = () => `${fmtExact(depositFor(HUNDRED, 0))} of every ${fmtExact(HUNDRED)}`;
const H = (n) => `${n} ${n === 1 ? 'hour' : 'hours'}`;
const clock = (h) => `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
const slowHours = () => `${clock(POLICY.SLOW_TEXT_FROM_H)} to ${clock(POLICY.SLOW_TEXT_TO_H)}`;
const contactLine = () => `Write to us through Help in the app, email ${HELP_CONTACT.email}, or text ${HELP_CONTACT.text}.`;
const both = (who) => (who === 'tailor' ? 'you and your customer' : 'you and your tailor');

/** `sections` = [{ title, lines: [string], list? }] per person ('customer' | 'tailor'). A legal page (`legal` = its COUNSEL.md row) opens with
    IN SHORT (the B2 summary) and continues with the full draft; `draft: true` prints DRAFT_LINE at the top (K-53 b). */
export const POLICIES = {
  /* COUNSEL #12 */
  garment: {
    title: 'Garment protection',
    sub: () => `Loss or damage, up to ${protectionCap()} per order`,
    legal: 12, draft: true,
    sections: (who) => [
      { title: 'What’s covered', lines: who === 'tailor' ? [
        `Taily insures the garments you work on through Taily, up to ${protectionCap()} per order. That covers loss or damage while a garment is in your care and while the Taily courier has it.`,
        'You don’t pay the customer yourself. Taily handles the claim with you both.',
      ] : [
        `If a garment is lost or damaged while it’s with your tailor or the Taily courier, Taily pays to repair or replace it, up to ${protectionCap()} per order.`,
        'That covers the fitting, the tailoring and the trip back to you.',
      ] },
      { title: 'How to claim', lines: [
        `Tell us within ${H(POLICY.GARMENT_REPORT_H)} of ${who === 'tailor' ? 'finding the problem' : 'getting your order back'}. Open the ${who === 'tailor' ? 'job, tap More, then Get help' : 'order and tap Get help'}, choose “A garment was damaged or lost”, and add photos.`,
        'We compare the before and pinned photos from the fitting and the courier’s drop-off photo, then reply in the Help thread.',
        `A courier drop-off in your building’s lobby counts as delivered. If it isn’t there, tell us within ${H(POLICY.COURIER_REPORT_H)}.`,
      ] },
      { title: 'Not covered', lines: ['Normal wear, a fabric failing with age, and changes you approved in the final order.'] },
      /* COUNSEL #12: the valuation rule, the insurer and the claim limits */
      { title: 'What we pay', lines: [
        'We pay what it costs to repair the garment. If it can’t be repaired, we pay what it was reasonably worth when it was handed over. We may ask for a receipt or a photo of a similar item.',
        `The cap is ${protectionCap()} for all the garments in one order together. We pay back to the card used for the order, or by bank transfer.`,
        'If the work itself isn’t what was agreed, that isn’t loss or damage. Tell us through Help and we work it out with you both.',
      ] },
      { title: 'Who decides', lines: [`Taily decides each claim within ${H(POLICY.HELP_REPLY_H)} of having what we need, and tells ${both(who)} in the Help thread. ${COMPANY.name} provides this protection through its insurer.`] },
    ],
  },
  /* COUNSEL #4, #5, #6 — A2's Help policy and B2's "Cancellation and refunds" legal page are this one page (D-380) */
  cancellation: {
    title: 'Cancellation and refunds',
    sub: () => `Free until ${POLICY.CANCEL_WINDOW_H} hours before a visit`,
    legal: 6, draft: true,
    sections: (who) => [
      ...(who === 'tailor' ? [] : [{ title: 'Before your tailor accepts', lines: [
        `If your tailor doesn’t accept within ${POLICY.REQUEST_EXPIRY_H} hours, or declines, your deposit is released in full.`,
      ] }]),
      { title: 'Cancelling a visit', lines: who === 'tailor' ? [
        `If the customer cancels ${POLICY.CANCEL_WINDOW_H} hours or more before the visit, nothing is owed. Inside ${POLICY.CANCEL_WINDOW_H} hours, you keep her deposit.`,
        'If you cancel, she gets her deposit back in full. Please cancel only when you have to.',
      ] : [
        `Cancel for free until ${POLICY.CANCEL_WINDOW_H} hours before your visit. After that, your tailor keeps the deposit for the time set aside.`,
        `${POLICY.REMINDER_H} hours before your visit, we text you to confirm. Confirming doesn’t end your free window. If you don’t confirm by ${POLICY.REMINDER_AUTOCANCEL_H} hours before the visit, we cancel it and the deposit is kept.`,   // K-51; K-53: the free window always ends 24 h before
        'If your tailor cancels or doesn’t show up, your deposit is refunded in full.',
      ] },
      { title: 'Refunds', lines: ['A refund goes back to the card you paid with. It can take 5 to 10 business days to show.'] },
      /* ---- the full draft (K-53 b) ---- */
      { title: 'The deposit', lines: [
        `When you send a request, we hold a deposit on the card: ${depositWords()} of the services and the home visit fee, shown in dollars before you send it. A hold is not a charge.`,
        `We charge the deposit only when the tailor accepts. If the tailor declines, doesn’t answer within ${H(POLICY.REQUEST_EXPIRY_H)}, or the request is withdrawn first, the hold is released.`,
        'The deposit counts toward the order. It is not an extra fee.',
      ] },
      { title: 'The free change window', lines: [
        `A booked visit can be changed or cancelled for free until ${POLICY.CANCEL_WINDOW_H} hours before it starts. Confirming the visit doesn’t shorten that window.`,   // K-53 (D-383 follow-up)
        `${POLICY.REMINDER_H} hours before the visit we text the customer to confirm, and ${POLICY.REMINDER_NUDGE_H} hours before we remind her once more. If the visit is still not confirmed ${POLICY.REMINDER_AUTOCANCEL_H} hours before it starts, we cancel it and the tailor keeps the deposit. We only do this after a reminder reached her phone.`,
      ] },
      { title: 'Late cancellations and no-shows', lines: [
        `Inside the last ${POLICY.CANCEL_WINDOW_H} hours, a cancellation by the customer keeps the deposit for the tailor. If the customer isn’t there when the tailor arrives, that is a no-show and the tailor keeps the deposit. Nothing more is charged.`,   // K-53 C5: the deposit only
        `If neither side records what happened, we ask you both. If nothing is recorded at all, we hold the deposit for ${H(POLICY.VISIT_HOLD_DISPUTE_H)} so either of you can tell us. With no answer, it goes to the tailor.`,   // K-51
      ] },
      { title: 'When the tailor cancels', lines: ['If the tailor cancels, can’t make it, or doesn’t come, we refund the deposit in full, and the customer can book another tailor right away.'] },
      { title: 'The balance', lines: [
        'The final order is approved in the app at the fitting before any work starts. The balance is what is left after the deposit.',
        'When the tailor marks the order ready, we place a hold for the balance on the saved card. A hold is not a charge.',   // K-53 d2 (D-400): the hold at Ready
        `The customer chooses pickup or delivery within ${HOLD_DAYS} days. Every pickup time and delivery window we offer ends by the hold’s last day, ${HOLD_DAYS} days after the order was ready. We charge the balance at the handoff: at pickup with the code, or when the courier delivers it.`,
        `If the order isn’t handed over by the hold’s last day, we charge the balance then. If no way back was chosen by then, we also set it to in-store pickup and the tailor keeps the order until it’s collected; if the tailor has no shop, Taily contacts the customer to arrange the return.`,   // K-53 Q5 (D-402)
        'If the hold doesn’t go through, we ask the customer to update her card before the hold’s last day.',   // D-401
        'A courier is priced again when the customer pays. If she later moves to a window that costs more, the difference is charged on its own.',   // K-53 Q6 (D-403, D-404)
      ] },
      { title: 'Questions about a charge', lines: [`Open the order and tap Get help. We reply within ${H(POLICY.HELP_REPLY_H)}. ${COMPANY.name} decides refund questions by what both sides recorded.`] },
    ],
  },
  payments: {
    title: 'Payments and holds',
    sub: (who) => (who === 'tailor' ? 'When you’re paid, and the Taily fee' : 'When you’re charged, and for what'),
    sections: (who) => (who === 'tailor' ? [
      { title: 'Your payout', lines: [
        'Your payout is your prices plus the home visit fee and any rush fee, minus the Taily fee, which is taken from your services only. Every screen shows it in dollars.',
        'It goes to your bank the Friday after the customer gets her order.',
        `When you mark an order ready, we hold her balance on her card. If she doesn’t have the order ${HOLD_DAYS} days later, we charge her then, and your payout goes the Friday after that charge.`,   // K-53 (D-400, D-402)
      ] },
      { title: 'If something is wrong', lines: ['Open the job, tap More, then Get help. Taily can hold, release or change a payout while it looks into a problem.'] },
    ] : [
      { title: 'The deposit', lines: ['We hold the deposit when you send a request and charge it only if your tailor accepts. If she declines or doesn’t reply, it’s released.'] },
      { title: 'The balance', lines: [
        'You approve the final order at the fitting before any work starts.',
        'When your order is ready, we place a hold for the balance on your saved card. A hold is not a charge.',   // K-53 (d2, D-400)
        `Choose pickup or delivery within ${HOLD_DAYS} days. We charge the balance at pickup or on delivery, or on the hold’s last day, ${HOLD_DAYS} days after your order was ready, if you don’t have it by then. If you haven’t chosen by then, we also set it to in-store pickup at your tailor’s shop, or contact you if she has no shop.`,   // D-402
        'A courier is priced again when you pay. If you then move to a window that costs more, the difference is charged on its own.',   // K-53 (Q6)
      ] },
      { title: 'A charge you don’t recognize', lines: [`Open the order and tap Get help, then “A charge or refund”. We reply within ${POLICY.HELP_REPLY_H} hours.`] },
    ]),
  },
  disputes: {
    title: 'No-shows and disputes',
    sub: () => 'When something didn’t happen the way it should',
    sections: (who) => [
      { title: 'No-shows', lines: [
        `A tailor can mark a no-show ${POLICY.NO_SHOW_WAIT_MIN} minutes after the start, and only after tapping I’m here when she arrived. She keeps the deposit.`,   // K-53 (Q7): the deposit only
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
  /* COUNSEL #17 */
  safety: {
    title: 'Safety',
    sub: () => 'Report or block someone',
    legal: 17, draft: true,
    sections: (who) => [
      { title: 'In an emergency', lines: ['Call 911 first. Then tell us what happened.'] },
      { title: 'Report or block', lines: [
        `From a chat, tap More, then Report or Block. Or open Help and choose Safety. We read every report and reply within ${POLICY.HELP_REPLY_H} hours.`,
        `When you block someone, you can’t book each other and your chat closes. ${who === 'tailor' ? 'A job already booked stays until Taily contacts you both.' : 'A booking you already have stays until Taily contacts you both.'}`,
      ] },
      { title: 'Your privacy', lines: ['Phone numbers and emails are hidden in every chat, and calls will go through a Taily number.'] },
      /* ---- the full draft (K-53 b) ---- */
      { title: 'Who you meet', lines: [
        'Every tailor on Taily has passed an ID and profile photo check, has the years of experience we ask for, has set up payouts with our payments partner, and has passed a background check before customers can book them.',
        who === 'tailor' ? 'Customers sign in with a mobile number checked by a code. You see a customer’s neighborhood before you accept, and the full address only after.' : 'Customers sign in with a mobile number checked by a code. A tailor sees your neighborhood before accepting, and your full address only after.',
      ] },
      { title: 'Home visits', lines: [
        who === 'tailor' ? 'Tap On my way and I’m here so the customer knows when you arrive. If you ever feel unsafe, leave and tell us.' : 'You can ask someone to be home during a fitting, or choose a shop visit instead. Your tailor taps On my way and I’m here so you know when they arrive.',
        'Keep payments and messages in Taily. Paying outside the app removes garment protection and our help with disputes.',
      ] },
      { title: 'What we don’t allow', lines: ['Harassment, threats, discrimination, unwanted contact after a booking, and asking for contact details to move a booking off Taily. We may pause an account while we look into a report, and close it when it breaks these rules.'] },
      { title: 'After a report', lines: [`We reply within ${H(POLICY.HELP_REPLY_H)}, ask each side what happened, and keep a record. We may hold money on an order while we look into it. If a report involves a crime, we work with the police when the law requires it.`] },
    ],
  },
  /* ---------- the legal pages (pre-MVP B2, S-23 / S-24, D-373; full drafts K-53 b, D-429): `legal` = the COUNSEL.md row ---------- */
  /* COUNSEL #1 (+ #11, #14, #15, #16 for the clauses they name) */
  terms: {
    title: 'Terms of service', sub: () => 'How booking through Taily works', legal: 1, draft: true,
    sections: () => [
      { title: 'In short', list: true, lines: [
        'Taily is a marketplace. You book independent tailors through it, and each tailor does the work.',
        'Prices are set by each tailor. The estimate you see includes the home visit fee and any rush fee.',
        'We hold a deposit when you send a request and charge it only if the tailor accepts.',
        'You approve the final order at the fitting before any work starts.',
        'Be kind and keep contact details in the app. Phone numbers and emails in messages stay hidden.',
      ] },
      { title: '1. Who we are', lines: [
        `Taily is run by ${COMPANY.name} (“Taily”, “we”) in ${COMPANY.city}. These terms are an agreement between you and Taily for using the Taily app and website.`,
        'Taily is a marketplace. The tailors are independent businesses, not Taily employees, and each tailor is responsible for their own work.',
      ] },
      { title: '2. Your account', lines: [
        'You must be at least 18 and have a US mobile number. You sign in with a code we text to that number, so keep it up to date and don’t share your codes.',
        'One account per person. You are responsible for what happens in your account.',
      ] },
      { title: '3. Booking and prices', lines: [
        'Each tailor sets their own prices. The estimate before you book shows the services, the home visit fee and any rush fee, in dollars.',
        'At the fitting your tailor may change the order. Nothing new is charged until you approve the final order in the app.',
      ] },
      { title: '4. Paying', lines: [
        'Payments go through our payments partner. Taily doesn’t keep your full card number.',
        `We hold a deposit when you send a request and charge it when the tailor accepts. When your order is ready we hold the balance on your card and charge it when you get your order back, or ${HOLD_DAYS} days after it was ready if you don’t have it by then. The Cancellation and refunds page has every rule and time.`,
        'New York doesn’t charge sales tax on alterations. If that changes, the tax shows before you pay.',   // COUNSEL #15
      ] },
      { title: '5. Cancelling', lines: [`You can cancel for free until ${POLICY.CANCEL_WINDOW_H} hours before your visit. After that, or if you miss the visit, the tailor keeps the deposit. If the tailor cancels, we refund your deposit in full.`] },
      { title: '6. Your garments', lines: [`Garment protection covers loss or damage while a garment is with your tailor or the Taily courier, up to ${protectionCap()} per order. Tell us within ${H(POLICY.GARMENT_REPORT_H)} of getting your order back.`] },
      { title: '7. How to behave', lines: [
        'Be respectful. Don’t harass anyone, don’t share someone else’s details, and keep messages, bookings and payments in Taily.',
        'Reviews must be honest and about a visit you booked through Taily. We don’t pay for reviews or remove fair negative ones.',   // COUNSEL #11
      ] },
      { title: '8. Texts', lines: ['We text sign-in codes and, if you agree, booking updates. The Text message terms explain how often, and how to stop.'] },
      /* COUNSEL #1: the liability cap and disclaimers — placeholder wording */
      { title: '9. Our responsibility', lines: [
        'We work to keep Taily running and safe, but the app is provided as it is. Apart from garment protection and the refunds in these terms, Taily is not responsible for a tailor’s work.',
        'As far as the law allows, Taily’s total responsibility to you for any claim is limited to what you paid through Taily for the order the claim is about.',
      ] },
      /* COUNSEL #1 / #16: dispute resolution and governing law — placeholder wording */
      { title: '10. Disagreements', lines: [
        'Most problems are solved through Help. If not, tell us in writing and we will try to settle it with you within 30 days.',
        'These terms are governed by the laws of the State of New York. A claim that isn’t settled goes to the courts in Kings County, New York, unless you can bring it in small claims court.',
      ] },
      { title: '11. Changes', lines: ['We may update these terms. We tell you in the app before a change takes effect. If you keep using Taily after that, the new terms apply.'] },
      { title: 'Contact', lines: [contactLine()] },
    ],
  },
  /* COUNSEL #1, #9, #10 */
  privacy: {
    title: 'Privacy policy', sub: () => 'What we keep and who sees it', legal: 1, draft: true,
    sections: () => [
      { title: 'In short', list: true, lines: [
        'We collect your name, mobile number, addresses and the email you add for receipts.',
        'Your card is stored by our payment provider, not by Taily.',
        'A tailor sees your neighborhood until they accept your request, then your full name and address.',
        'Fitting photos are seen only by you, your tailor and Taily.',
        'You can delete your account in Account. We keep receipts and payment records as the law requires.',
      ] },
      { title: 'Who we are', lines: [`${COMPANY.name}, ${COMPANY.city}, runs Taily and is responsible for your information.`] },
      { title: 'What we collect', lines: [
        'Your name, mobile number, the addresses you save, an email for receipts if you add one, and your messages and bookings.',
        'For tailors: your shop details, prices, hours, a photo ID and the results of your checks. Tax and bank details go to our payments partner, not to Taily.',
        'Photos you or your tailor add, like fitting photos and photos in a chat.',
        'Basic device and usage information so the app works and stays secure.',
      ] },
      { title: 'How we use it', lines: ['To run bookings, payments and texts, to keep people safe, to answer Help messages, to prevent fraud, and to improve Taily. We don’t sell your information and we don’t use it for outside advertising.'] },
      { title: 'Who sees what', lines: [
        'A tailor sees your first name and neighborhood before accepting, then your full name, address and access notes.',
        'Phone numbers and emails typed in chats are hidden from the other person.',
        'Companies that help us run Taily see only what they need: our payments partner, our texting provider, the courier for a delivery, and the background check company for tailors. They may use it only for that work.',
        'We share information when the law requires it, or to protect someone’s safety.',
      ] },
      { title: 'Photos', lines: ['Fitting photos can show you wearing a garment. Only you, your tailor and Taily can see them. They help with the work and with any claim.'] },   // COUNSEL #10
      { title: 'How long we keep it', lines: ['We keep your account while you use it. When you delete it, we remove your name, number, email, addresses and cards. We keep receipts, payment and tax records, and messages tied to past orders for as long as the law requires.'] },   // COUNSEL #9
      { title: 'Your choices', lines: [
        'You can change your details in Account, turn booking texts off, or reply STOP. You can ask for a copy of your information or delete your account at any time.',
        contactLine(),
      ] },
      { title: 'Security', lines: ['We protect your information with access controls and encryption, and we tell you if a breach affects you, as New York law requires.'] },
      { title: 'Children', lines: ['Taily is for people 18 and over. We don’t knowingly collect information from children.'] },
      { title: 'Changes', lines: ['If we change this policy, we tell you in the app first.'] },
    ],
  },
  /* COUNSEL #13 */
  accessibility: {
    title: 'Accessibility', sub: () => 'Screen readers, larger text, reduced motion', legal: 13, draft: true,
    sections: () => [
      { title: 'In short', list: true, lines: [
        'We design Taily to work with screen readers, larger text, keyboard use and reduced motion.',
        'Every button is at least 44 points tall, and every error sits next to the field it is about.',
        'If something gets in your way, tell us through Help and we’ll fix it.',
      ] },
      { title: 'Our goal', lines: [`${COMPANY.name} wants everyone to be able to book a tailor, or run a tailoring business, on Taily. We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 at level AA.`] },
      { title: 'What we do', lines: [
        'Every screen has a title that screen readers announce first, a visible label on every field, and errors written next to the field they are about.',
        'Text grows with your phone’s text size, colors meet contrast guidelines, and animations stop when your phone asks for reduced motion.',
        'Money is always written as a dollar amount, never shown only by a color or an icon.',
      ] },
      { title: 'What we’re still working on', lines: ['Photos of garments don’t always have a full description yet, and the time wheels can be slow with a screen reader. You can message your tailor or ask us through Help instead.'] },
      { title: 'Tell us', lines: [`If something gets in your way, tell us. ${contactLine()} We reply within ${H(POLICY.HELP_REPLY_H)} and can help you book in the meantime.`] },
    ],
  },
  /* COUNSEL #3 — K-53 b: the text message terms (CTIA Messaging Principles; TCPA consent; A2P 10DLC) */
  sms: {
    title: 'Text message terms', sub: () => 'What we text, how often, how to stop', legal: 3, draft: true,
    sections: (who) => [
      { title: 'In short', list: true, lines: [
        'Every Taily notice is a text: sign-in codes and, if you agree, updates about your bookings.',
        'Message frequency varies. Msg & data rates may apply.',
        'Reply STOP to stop, START to start again, HELP for help.',
      ] },
      { title: 'What we send', lines: [
        'Sign-in codes when you ask for one. These always go to your number, because they are how you sign in.',
        who === 'tailor' ? 'If you agree when you sign up: new requests, reminders, and updates about your jobs and payouts.' : 'If you agree: booking updates, like your tailor accepting, reminders to confirm a visit, your order being ready, and receipts.',
        'We never text you ads, and agreeing to texts is never a condition of booking.',
      ] },
      { title: 'How often', lines: [`It depends on your bookings: usually a few texts per booking. Reminders that can wait go out only from ${slowHours()}. Texts about something happening now, like a visit starting, can come at any time.`] },
      { title: 'Stopping and starting', lines: [
        'Reply STOP to any text to stop booking texts. We send one text to confirm. Reply START, or turn texts on in Account, to start again.',
        'Reply HELP for help, or write to us through Help in the app.',
      ] },
      { title: 'Costs and carriers', lines: ['Msg & data rates may apply. Carriers are not liable for delayed or undelivered messages.'] },
      { title: 'Your number', lines: [`We use your number only for Taily. We don’t sell it or share it for marketing. Texts come from ${COMPANY.name}, ${COMPANY.city}.`] },
    ],
  },
  /* COUNSEL #2 */
  'tailor-terms': {
    title: 'Tailor terms of service', sub: () => 'Your shop, your prices, answering requests', legal: 2, draft: true,
    sections: () => [
      { title: 'In short', list: true, lines: [
        'You run your own business. You set your prices, hours and the areas you visit.',
        'Customers see you only when your checks have passed and you price every service their order needs.',
        `Answer each request within ${POLICY.REQUEST_EXPIRY_H} hours, or it expires and the customer’s deposit is released.`,
        'The Taily fee comes out of your services only, never your home visit or rush fees.',
      ] },
      { title: '1. These terms', lines: [`These terms cover your use of Taily as a tailor. ${COMPANY.name}, ${COMPANY.city}, runs Taily. The Tailor agreement covers how we work together and how you are paid. You accept both when you join.`] },
      { title: '2. Your account', lines: [
        'You must be at least 18, able to work in the US, and sign in with your own mobile number. Keep your profile, prices, hours and areas accurate.',
        'Your photo must be you. Your shop name and bio can’t include a phone number, email or website.',
      ] },
      { title: '3. Getting listed', lines: [`Customers can book you once all four checks pass: your ID and profile photo, at least ${TAILOR_LIMITS.YEARS_MIN} years of tailoring, your payout and tax info, and your background check, which runs last.`] },
      { title: '4. Requests and visits', lines: [
        `Accept, suggest another time or decline each request within ${H(POLICY.REQUEST_EXPIRY_H)}. You can pause new requests at any time in your shop.`,
        `Set your minimum notice and your time off so customers only see times you can keep. Arrive on time, tap I’m here, and wait ${POLICY.NO_SHOW_WAIT_MIN} minutes before marking a no-show.`,
      ] },
      { title: '5. The order', lines: ['At the fitting, send the final order in the app before you start. Don’t start work the customer hasn’t approved, and don’t ask to be paid outside Taily.'] },
      { title: '6. How to behave', lines: ['Be respectful and safe. Keep customers’ details private and use them only for their order. Don’t contact a customer you met on Taily to book outside it.'] },
      { title: '7. Pausing an account', lines: ['We may pause your listing while we look into a report or a missed visit, and close an account that breaks these terms. We tell you why, and you can answer through Help.'] },
      { title: 'Contact', lines: [contactLine()] },
    ],
  },
  /* COUNSEL #2, #7, #8 — the independent-contractor agreement; NYC Freelance Isn't Free Act (counsel: is Taily the hiring party?) */
  'tailor-agreement': {
    title: 'Tailor agreement', sub: () => 'Contractor, checks and payouts', legal: 2, draft: true,
    sections: () => [
      { title: 'In short', list: true, lines: [
        'You work with Taily as an independent contractor, not an employee.',
        'You agree to an ID check and a background check before customers can book you.',
        'Payouts go to your bank the Friday after the customer has her order. Our payments partner keeps your tax details.',
        `If a customer cancels less than ${POLICY.CANCEL_WINDOW_H} hours before the visit, you keep the deposit.`,
      ] },
      { title: '1. The parties', lines: [`This agreement is between you and ${COMPANY.name}, ${COMPANY.city} (“Taily”). It starts when you finish signing up and continues until either of us ends it.`] },
      { title: '2. Independent contractor', lines: [
        'You are an independent business, not Taily’s employee, partner or agent. You decide whether to accept a request, your prices, your hours, the areas you visit and how you do the work.',
        'You provide your own tools and supplies, and you are responsible for your own taxes, licenses and permits.',
      ] },
      { title: '3. What Taily does', lines: [
        'Taily lists your shop, brings you customers, schedules visits, takes payments, sends texts, insures the garments in your care, and handles support and disputes.',
        `For this, Taily keeps a fee of ${feeWords()} of your services. The fee covers insurance, operations, scheduling, clientele and hosting, and more. It is never taken from your home visit fee or rush fees. Every request shows the fee and your payout in dollars before you accept.`,
      ] },
      { title: '4. Getting paid', lines: [
        `Your payout is your service prices plus the home visit fee and any rush fee, minus the Taily fee. It goes to your bank through our payments partner on the Friday after the customer gets the order. If she doesn’t have it ${HOLD_DAYS} days after you mark it ready, we charge her balance then and your payout goes the Friday after that charge.`,   // K-53 (D-402)
        `If a customer cancels within ${POLICY.CANCEL_WINDOW_H} hours or doesn’t show up, you keep the deposit, with no Taily fee taken from it.`,
        'Our payments partner collects your tax details and sends your 1099 tax form. Taily never sees your full SSN or account number.',
      ] },
      { title: '5. Checks', lines: [
        `Before customers can book you, we check your ID and profile photo, your years of tailoring (at least ${TAILOR_LIMITS.YEARS_MIN}), and your payout and tax info. Once those pass, you’re approved, pending your background check, which runs last.`,
        'The background check follows the Fair Credit Reporting Act and the New York City Fair Chance Act: you get the disclosure first, you can see the report, and if something in it might matter we tell you and give you time to respond before we decide.',   // COUNSEL #7
      ] },
      { title: '6. Cancellations', lines: [
        'Please cancel only when you have to. If you cancel or don’t come, the customer gets her deposit back in full and you aren’t paid for that visit.',
        'Repeated cancellations or missed visits may pause your listing.',
      ] },
      { title: '7. Garments', lines: [`Taily insures the garments you work on through Taily against loss or damage, up to ${protectionCap()} per order. Report a problem within ${H(POLICY.GARMENT_REPORT_H)}. You still take reasonable care of every garment.`] },
      { title: '8. Ending the agreement', lines: ['You can stop at any time by deleting your account once your open jobs and payouts are done. Taily can end it with notice, or right away for a serious safety or fraud problem. Payouts you earned are still paid.'] },
      /* COUNSEL #2: the NYC Freelance Isn't Free Act wording and the payment-timing promise */
      { title: '9. Your rights in New York City', lines: ['If New York City’s Freelance Isn’t Free Act applies to your work through Taily, this agreement is your written contract, and Taily pays what you earn within 30 days of the work being done.'] },
      { title: '10. Law and disagreements', lines: ['This agreement is governed by the laws of the State of New York. We try to settle any disagreement through Help first.'] },
    ],
  },
};
/** Help's policy rows, per person: the Help policies first, then the legal pages (D-337 → D-380; K-53 b adds the text message terms). */
const POLICY_ORDER = {
  customer: ['garment', 'cancellation', 'payments', 'disputes', 'safety', 'terms', 'privacy', 'sms', 'accessibility'],
  tailor: ['payments', 'garment', 'disputes', 'safety', 'cancellation', 'tailor-terms', 'tailor-agreement', 'privacy', 'sms'],
};
/** The legal pages each persona's Account lists, in order (DG-3 A: Account → Help and policies; B2's LEGAL_FOR; K-53 b: + text messages). */
export const LEGAL_FOR = {
  customer: ['terms', 'privacy', 'cancellation', 'sms', 'accessibility'],
  tailor: ['tailor-terms', 'tailor-agreement', 'privacy', 'sms'],
};
/** The Help page's policy rows for a person: [{ key, title, sub }]. */
export const policyList = (who = 'customer') => POLICY_ORDER[who].map((key) => ({ key, title: POLICIES[key].title, sub: POLICIES[key].sub(who) }));
/** A page's title (Account rows). */
export const policyTitle = (key) => POLICIES[key]?.title ?? '';
/** One page: { key, title, version, sections, draft, draftLine, legal }. A legal page (a COUNSEL row) carries the version line and, while
    it is a draft (K-53 b), DRAFT_LINE at the top. Unknown keys fall back to garment protection. */
export function policyPage(key, who = 'customer') {
  const p = POLICIES[key] ?? POLICIES.garment;
  return {
    key: POLICIES[key] ? key : 'garment', title: p.title, sections: p.sections(who),
    draft: !!p.draft, draftLine: p.draft ? DRAFT_LINE : '',
    legal: p.legal ?? 0, version: p.legal ? LEGAL_VERSION : '',
  };
}
