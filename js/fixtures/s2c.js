/* ============================================================
   Pre-MVP A2 (K-48.1, K-49 DG-1 option B, D-14, S-32, D-21) Test-flows entries — Taily Help (c-help / t-help, the Help thread
   c-case / t-case), the admin persona (a-inbox / a-case and its money actions), disputes as cases, report / block, garment protection
   (c-policy / t-policy), and the status screens' Get help + case strips.
   Same shape as js/fixtures/m#.js; flows.js concatenates every FLOWS_* export. Setups compose driveTo + the real clock + real transitions
   (T.*) and screen-local ui (state.ui.help = which case / order the Help thread shows); money strings come from SCENARIOS.
   ============================================================ */
import { SCENARIOS as C2_SC } from './money-scenarios.js';
import { fmtExact as C2_exact, fmt as C2_fmt, cents as C2_cents } from '../money.js';
import { POLICY as C2_POLICY, MONEY as C2_MONEY } from '../money-config.js';
import { reminderAt as C2_reminderAt, openCaseOfAppt as C2_openCase } from '../state.js';

const DEP = C2_exact(C2_SC.seed.deposit);
const BAL = C2_exact(C2_SC.seed.balance);
const NO_SHOW = C2_exact(C2_SC.noShow.paid);
const CAP = C2_fmt(C2_cents(C2_MONEY.GARMENT_PROTECTION_CAP));
const G = 'A2 · Taily Help';
const GA = 'Admin inbox';
const GC = 'Admin case';
const at = (screen, group = G) => ({ screen, group });

/** The seed visit, confirmed at its 24-hour reminder (so the K-43 auto-cancel stays out of it). */
function sure(S) {
  const a = S.driveTo('confirmed');
  S.advanceClock(Math.round((C2_reminderAt(a) - S.state.clock.now) / 60000));
  S.T.confirmVisit(a.id);
  return a;
}
/** D-14: Amara marked a no-show at 5:20 PM (after I'm here); Sarah taps "That's not right" → a Taily review runs as a case on both sides. */
function disputed(S) {
  const a = S.driveTo('no-show');
  S.T.disputeNoShow(a.id, 'customer');
  return { a, c: C2_openCase(a.id) };
}
/** …and the admin decided it: Sarah's deposit refunded (Amara's no-show pay dropped), the case closed — both told in dollars. */
function refunded(S) {
  const { a, c } = disputed(S);
  S.advanceClock(40);
  S.T.adminReply(c.id, 'tailor', { text: 'Thanks, Amara. Did you text Sarah through Taily when you arrived?' });
  S.T.adminRefundDeposit(c.id);
  S.T.adminCloseCase(c.id);
  return { a, c };
}
/** …decided the other way: Amara keeps the deposit, her held no-show pay goes out. */
function kept(S) {
  const { a, c } = disputed(S);
  S.advanceClock(40);
  S.T.adminKeepDeposit(c.id);
  S.T.adminCloseCase(c.id);
  return { a, c };
}
/** Sarah opens Help on her awaiting-handoff order (a charge question) and writes with a phone number in it (masked). */
function chargeCase(S) {
  const a = S.driveTo('awaiting-handoff');
  const r = S.T.openCase({ who: 'customer', apptId: a.id, topic: 'charge', text: 'Why is $144.00 on hold? Call me at 718-555-0142.' });
  return { a, c: r.case };
}
/** Sarah says she didn't get her pickup (Amara marked it without the code) and asks Taily: the balance is still held. */
function holdCase(S) {
  const a = S.driveTo('problem');
  const r = S.T.openCase({ who: 'customer', apptId: a.id, topic: 'not-received', text: 'Amara marked it picked up but I never went to the shop.' });
  return { a, c: r.case };
}
/** A general question with no order (Help home → Message Taily). */
function generalCase(S, who = 'customer') {
  const r = S.T.openCase({ who, text: who === 'tailor' ? 'How do I change the bank my payouts go to?' : 'Can I book two tailors for one wedding?' });
  return r.case;
}
const helpFor = (S, a, caseId = null) => { S.state.ui.help = { apptId: a?.id ?? null, caseId }; S.state.ui.apptId = a?.id ?? null; };

/* ---------- Help home ---------- */
export const FLOWS_c_help = [
  { ...at('c-help'), key: 'c-help', title: 'Help — your conversations, topics, policies', note: 'DG-1 B’s shared Help page (B-05): Message Taily, her open no-show case, the topics with no order, contact and policies (garment protection, D-21)',
    setup: (S) => { disputed(S); },
    expect: { has: ['Help', 'About a booking? Open it and tap Get help, so we see it right away.', 'Message Taily', 'YOUR CONVERSATIONS', 'No-show', 'Taily replies by Fri 5:20 PM', 'A charge or refund', 'Garment protection', `Loss or damage, up to ${CAP} per order`, 'Cancellation and refunds', '(718) 555-0100'], sel: '[data-act="open-case"][data-case]' } },
  { ...at('c-help'), key: 'c-help--empty', title: 'Help — nothing open', note: 'No conversations yet: Message Taily, the topics and the policies',
    expect: { has: ['Message Taily', 'GET HELP WITH', 'I don’t feel safe', 'POLICIES'], not: 'YOUR CONVERSATIONS', sel: '[data-act="new-case"]' } },
  { ...at('c-help'), key: 'c-help--safety', title: 'Help → I don’t feel safe', note: 'S-32: Report or block her tailor (the latest booking), or Get help',
    setup: (S) => { S.driveTo('confirmed'); },
    click: ['[data-act="safety"]'],
    expect: { has: ['Report Amara', 'Tell Taily what happened. Only Taily sees it.', 'Block Amara', 'You can’t book each other, and this chat closes'], sel: '[data-s="safety-menu"] [data-act="sf-report"]' } },
];
export const FLOWS_t_help = [
  { ...at('t-help'), key: 't-help', title: 'Help (tailor) — the dispute, topics, policies', note: 'DG-1 B: Shop → Account → Help (B2 links it); her side of Sarah’s no-show dispute; Payments and holds first',
    setup: (S) => { disputed(S); },
    expect: { has: ['Help', 'About a job? Open it and tap More, then Get help, so we see it right away.', 'YOUR CONVERSATIONS', 'No-show', 'My payout', 'Payments and holds', 'Garment protection'], sel: '[data-act="open-case"][data-case]' } },
  { ...at('t-help'), key: 't-help--empty', title: 'Help (tailor) — nothing open', note: 'No conversations yet',
    expect: { has: ['Message Taily', 'My payout', 'I don’t feel safe', 'Safety'], not: 'YOUR CONVERSATIONS' } },
];

/* ---------- the Help thread ---------- */
export const FLOWS_c_case = [
  { ...at('c-case'), key: 'c-case', title: 'Taily Help — a new conversation on her visit', note: 'DG-1 B: Get help on the visit day (5:20 PM): Taily’s greeting, the order attached, the topics that fit (Amara didn’t come first)',
    setup: (S) => { const a = sure(S); S.setClock('2026-10-15T17:20'); helpFor(S, a); },
    expect: { has: ['Taily Help', `We reply within ${C2_POLICY.HELP_REPLY_H} hours`, 'Thu, Oct 15 · 5:00 PM', 'Order with Amara', 'Hi Sarah. This is about your visit with Amara on Thu, Oct 15 · 5:00 PM. What do you need help with?', 'Amara didn’t come', 'A charge or refund', 'I don’t feel safe', 'Something else'], not: 'Taily is reviewing', sel: '[data-act="topic"][data-topic="no-show"]' } },
  { ...at('c-case'), key: 'c-case--open', title: 'Taily Help — waiting on Taily', note: 'K-16: “Taily is reviewing · Reply by …” while Taily owes the answer; her number is masked like every chat; the admin was texted',
    setup: (S) => { const { a, c } = chargeCase(S); helpFor(S, a, c.id); },
    expect: { has: ['Taily is reviewing', 'Reply by Fri 5:00 PM', 'A charge or refund', 'phone hidden', 'Thanks, Sarah. Taily has your message and replies by Fri, Oct 16 · 5:00 PM.'], not: '718-555-0142', sel: '.help-thread__strip [data-strip="warn"]' } },
  { ...at('c-case'), key: 'c-case--replied', title: 'Taily Help — Taily replied', note: 'K-48.1: the admin’s answer, texted to her (taily-replied)',
    setup: (S) => { const { a, c } = chargeCase(S); S.advanceClock(12); S.T.adminReply(c.id, 'customer', { text: `It’s held, not charged. We charge the ${BAL} when you pick it up.` }); helpFor(S, a, c.id); },
    expect: { has: ['Taily replied', `It’s held, not charged. We charge the ${BAL} when you pick it up.`], not: 'Taily is reviewing', sel: '.help-thread__strip [data-strip="action"]' } },
  { ...at('c-case'), key: 'c-case--dispute', title: 'Taily Help — her no-show dispute', note: 'D-14: “That’s not right” runs as this thread: Taily’s first words, her deposit on hold until Taily decides',
    setup: (S) => { const { a, c } = disputed(S); helpFor(S, a, c.id); },
    expect: { has: ['Taily is reviewing', 'Reply by Fri 5:20 PM', `You told us you were there. Amara marked a no-show at 5:20 PM. Your ${DEP} deposit stays on hold until we decide, by Fri, Oct 16 · 5:20 PM.`, 'TY-4821'], sel: '.composer__input' } },
  { ...at('c-case'), key: 'c-case--decided', title: 'Taily Help — decided: refunded', note: 'K-48.1: the decision in dollars, in the thread and on a card; the conversation is closed; texted (case-decided)',
    setup: (S) => { const { a, c } = refunded(S); helpFor(S, a, c.id); },
    expect: { has: ['Taily decided', `We refunded your ${DEP} deposit. It shows on your card in 5 to 10 business days.`, 'This conversation is closed. Need more help? Start a new one.', 'Start a new conversation'], not: 'Taily is reviewing', sel: '[data-decision]' } },
  { ...at('c-case'), key: 'c-case--no-show-step', title: 'Taily Help — Amara didn’t come', note: 'The topic’s own step: cancel and get the deposit back (A5’s report), right in the thread',
    setup: (S) => { const a = sure(S); S.setClock('2026-10-15T17:20'); const r = S.T.openCase({ who: 'customer', apptId: a.id, topic: 'no-show' }); helpFor(S, a, r.case.id); },
    expect: { has: ['Amara didn’t come', `Cancel and get my ${DEP} back`, `Amara isn’t there ${C2_POLICY.NO_SHOW_WAIT_MIN} minutes after the start?`], sel: '[data-act="hs-no-show"]' } },
  { ...at('c-case'), key: 'c-case--damage', title: 'Taily Help — a garment was damaged', note: 'D-21: the topic points at garment protection (cap from MONEY, 48 h from POLICY)',
    setup: (S) => { const a = S.driveTo('completed'); const r = S.T.openCase({ who: 'customer', apptId: a.id, topic: 'damage', text: 'The jacket lining is torn.' }); helpFor(S, a, r.case.id); },
    expect: { has: ['A garment was damaged or lost', 'The jacket lining is torn.', `Garment protection: Taily covers loss or damage up to ${CAP} per order.`, 'How garment protection works'], sel: '[data-act="hs-policy"]' } },
  { ...at('c-case'), key: 'c-case--general', title: 'Taily Help — no order attached', note: 'From Help home: a general question; the general topics',
    setup: (S) => { helpFor(S, null); },
    expect: { has: ['No order attached', 'Hi Sarah. What can we help with?', 'A charge or refund', 'A garment was damaged or lost'], not: 'Amara didn’t come' } },
  { ...at('c-case'), key: 'c-case--safety', title: 'Taily Help — a safety report', note: 'S-32: Report Amara → a safety case (911 first), the admin texted at once',
    setup: (S) => { const a = S.driveTo('confirmed'); const r = S.T.reportPerson('customer', { apptId: a.id, reason: 'messages', text: 'She kept messaging me late at night.' }); helpFor(S, a, r.case.id); },
    expect: { has: ['I’m reporting Amara Reyes: rude or inappropriate messages.', 'She kept messaging me late at night.', 'If you’re in danger, call 911 first.', 'Report or block Amara'], sel: '[data-act="hs-safety"]' } },
];
export const FLOWS_t_case = [
  { ...at('t-case'), key: 't-case', title: 'Taily Help (tailor) — Sarah says she was there', note: 'DG-1 B / D-14: her side of the dispute: no-show pay on hold, add your side by …',
    setup: (S) => { const { a, c } = disputed(S); helpFor(S, a, c.id); },
    expect: { has: ['Taily Help', 'Taily is reviewing', `Sarah says she was there at 5:00 PM. Your ${NO_SHOW} no-show pay is on hold while we look.`, 'Job with Sarah'], sel: '.composer__input' } },
  { ...at('t-case'), key: 't-case--help', title: 'Taily Help (tailor) — from ⋯ Get help', note: 'DG-1 B: Get help with this job (in progress): her topics',
    setup: (S) => { const a = S.driveTo('in-progress'); helpFor(S, a); },
    expect: { has: ['Hi Amara. This is about your job with Sarah on Thu, Oct 15 · 5:00 PM.', 'My payout', 'A garment was damaged or lost', 'I don’t feel safe'], not: 'Amara didn’t come', sel: '[data-act="topic"][data-topic="charge"]' } },
  { ...at('t-case'), key: 't-case--replied', title: 'Taily Help (tailor) — her side, Taily replied', note: 'She adds her side (a photo of the door); the admin answers; texted (taily-replied-t)',
    setup: (S) => { const { a, c } = disputed(S); S.advanceClock(15); S.T.sendCaseMessage(c.id, 'tailor', { text: 'I rang at 5:02 and waited. Photo of the door attached.', photos: 1 }); S.advanceClock(5); S.T.adminReply(c.id, 'tailor', { text: 'Thanks, Amara. We decide by tomorrow 5:20 PM and text you.' }); helpFor(S, a, c.id); },
    expect: { has: ['Taily replied', 'I rang at 5:02 and waited. Photo of the door attached.', 'Thanks, Amara. We decide by tomorrow 5:20 PM and text you.'], sel: '.chat-bubble__photo' } },
  { ...at('t-case'), key: 't-case--decided', title: 'Taily Help (tailor) — decided: you keep it', note: 'K-48.1: the decision in dollars, the held no-show pay released for its Friday',
    setup: (S) => { const { a, c } = kept(S); helpFor(S, a, c.id); },
    expect: { has: ['Taily decided', `You keep Sarah’s ${DEP} deposit. Your ${NO_SHOW} goes out Fri, Oct 16.`, 'Start a new conversation'], sel: '[data-decision]' } },
];

/* ---------- policies (D-21) ---------- */
export const FLOWS_c_policy = [
  { ...at('c-policy'), key: 'c-policy', title: 'Garment protection', note: 'D-21: a dollar cap per order (MONEY) and a 48-hour report window (POLICY); COUNSEL placeholder copy, marked on the page',
    setup: (S) => { S.state.ui.policy = 'garment'; },
    expect: { has: ['Garment protection', `Taily pays to repair or replace it, up to ${CAP} per order.`, `Tell us within ${C2_POLICY.GARMENT_REPORT_H} hours of getting your order back.`, 'Draft for counsel', 'Get help'], not: '%', sel: '[data-counsel]' } },
  { ...at('c-policy'), key: 'c-policy--cancellation', title: 'Cancellation and refunds', note: 'Help → Policies: every number from POLICY',
    setup: (S) => { S.state.ui.policy = 'cancellation'; },
    expect: { has: ['Cancellation and refunds', `Cancel for free until ${C2_POLICY.CANCEL_WINDOW_H} hours before your visit.`, 'It can take 5 to 10 business days to show.'], not: 'Draft for counsel' } },
];
export const FLOWS_t_policy = [
  { ...at('t-policy'), key: 't-policy', title: 'Garment protection (tailor)', note: 'D-21: Taily insures what she works on, up to the cap; she never pays the customer herself',
    setup: (S) => { S.state.ui.policy = 'garment'; },
    expect: { has: ['Garment protection', `Taily insures the garments you work on through Taily, up to ${CAP} per order.`, 'You don’t pay the customer yourself.', 'Draft for counsel'] } },
  { ...at('t-policy'), key: 't-policy--safety', title: 'Safety (tailor)', note: 'S-32: 911 first, report or block, privacy',
    setup: (S) => { S.state.ui.policy = 'safety'; },
    expect: { has: ['Safety', 'Call 911 first. Then tell us what happened.', 'From a chat, tap More, then Report or Block.', 'A job already booked stays until Taily contacts you both.'] } },
];

/* ---------- the admin (K-48.1) ---------- */
export const FLOWS_a_inbox = [
  { ...at('a-inbox', GA), key: 'a-inbox', title: 'Admin inbox — open cases + notifications', note: 'K-48.1: a no-show dispute (A1 review), a Help case, a safety report; newest first, unread counted',
    setup: (S) => { const a = S.driveTo('no-show'); S.T.disputeNoShow(a.id, 'customer'); S.advanceClock(10); S.T.openCase({ who: 'tailor', text: 'How do I change the bank my payouts go to?' }); S.advanceClock(10); S.T.reportPerson('customer', { apptId: a.id, reason: 'unsafe' }); },
    expect: { has: ['Inbox', 'Taily admin · Kevin', '3 open · 3 waiting on you · 3 unread', 'OPEN CASES', 'No-show disputed', 'Safety report', 'Message to Taily', 'Sarah Chen · Amara Reyes', 'NOTIFICATIONS', 'Sarah says she was there (no-show) · Sarah Chen with Amara Reyes'], sel: '.admin-row[data-case]' } },
  { ...at('a-inbox', GA), key: 'a-inbox--empty', title: 'Admin inbox — nothing waiting', note: 'No cases, no notifications',
    expect: { has: ['Nothing waiting', 'New Help cases, safety reports and Taily reviews show up here, and you get a text for each one.'], sel: '[data-empty="inbox"]' } },
  { ...at('a-inbox', GA), key: 'a-inbox--closed', title: 'Admin inbox — a case closed', note: 'The decided no-show moves to Closed; its notifications are read',
    setup: (S) => { refunded(S); },
    expect: { has: ['0 open', 'CLOSED', 'No-show disputed', 'Closed'], not: 'OPEN CASES' } },
];
export const FLOWS_a_case = [
  { ...at('a-case', GC), key: 'a-case', title: 'Admin case — a disputed no-show', note: 'D-14 + K-48.1: the order’s money (deposit kept, the no-show pay on hold), the actions in dollars, Sarah’s side of the thread',
    setup: (S) => { const { c } = disputed(S); S.state.ui['a-case'] = { caseId: c.id }; },
    expect: { has: ['No-show disputed', 'TY-4821', 'Your reply', 'By Fri 5:20 PM', 'Kept by tailor', 'On hold', 'Refund Sarah’s deposit', `Amara isn’t paid the ${NO_SHOW}`, 'Amara keeps the deposit', `Releases her ${NO_SHOW} on hold`, 'Release Amara’s payout', 'Close with outcome'], sel: '[data-act="admin-act"][data-kind="refund-deposit"]', also: '.composer__input[placeholder="Reply to Sarah"]' } },
  { ...at('a-case', GC), key: 'a-case--tailor-side', title: 'Admin case — Amara’s side', note: 'The conversation switch: one side at a time, the reply goes to her (texted)',
    setup: (S) => { const { c } = disputed(S); S.state.ui['a-case'] = { caseId: c.id, side: 'tailor' }; },
    expect: { has: [`Sarah says she was there at 5:00 PM. Your ${NO_SHOW} no-show pay is on hold while we look.`], sel: '.segmented__opt.is-selected[data-value="tailor"]', also: '.composer__input[placeholder="Reply to Amara"]' } },
  { ...at('a-case', GC), key: 'a-case--refund', title: 'Admin case — refund the deposit?', note: 'Each action is a confirm sheet in dollars, then a pure transition',
    setup: (S) => { const { c } = disputed(S); S.state.ui['a-case'] = { caseId: c.id }; },
    click: ['[data-act="admin-act"][data-kind="refund-deposit"]'],
    expect: { has: [`Refund Sarah’s ${DEP} deposit to her card. Amara’s ${NO_SHOW} isn’t paid out.`], sel: '[data-s="a-case--act"] [data-act="cs-ok"]' } },
  { ...at('a-case', GC), key: 'a-case--close', title: 'Admin case — close with outcome', note: 'What each side will read (and be texted), after the refund',
    setup: (S) => { const { c } = disputed(S); S.T.adminRefundDeposit(c.id); S.state.ui['a-case'] = { caseId: c.id }; },
    click: ['[data-act="close-case"]'],
    expect: { has: ['Sarah reads:', `We refunded your ${DEP} deposit. It shows on your card in 5 to 10 business days.`, 'Amara reads:', `We refunded Sarah’s ${DEP} deposit, so you aren’t paid the ${NO_SHOW}.`, 'Close and tell them'], sel: '[data-s="a-case--close"] [data-act="cs-ok"]' } },
  { ...at('a-case', GC), key: 'a-case--decide-first', title: 'Admin case — decide the money first', note: 'A disputed no-show pay still on hold: the case can’t close until it is released or refunded (the error next to the button)',
    setup: (S) => { const { c } = disputed(S); S.state.ui['a-case'] = { caseId: c.id }; },
    click: ['[data-act="close-case"]', '[data-s="a-case--close"] [data-act="cs-ok"]'],
    expect: { has: ['A payout is still on hold. Release it, or refund the deposit, first.'], sel: '.confirm-sheet__err' } },
  { ...at('a-case', GC), key: 'a-case--decided', title: 'Admin case — closed', note: 'The outcome each side read, no actions left',
    setup: (S) => { const { c } = refunded(S); S.state.ui['a-case'] = { caseId: c.id }; },
    expect: { has: ['Closed', 'OUTCOME', `We refunded your ${DEP} deposit.`, 'Refunded', 'Both were told the outcome.'], not: ['Close with outcome', 'Refund Sarah’s deposit'] } },
  { ...at('a-case', GC), key: 'a-case--hold', title: 'Admin case — she didn’t get it (a held balance)', note: 'D-01: capture the hold (she got it) or release it (she isn’t charged), or cancel the order',
    setup: (S) => { const { c } = holdCase(S); S.state.ui['a-case'] = { caseId: c.id }; },
    expect: { has: ['Didn’t get the order', `Capture the ${BAL} hold`, `Release the ${BAL} hold`, 'Cancel the order', 'Amara marked it picked up but I never went to the shop.'], sel: '[data-act="admin-act"][data-kind="release-hold"]' } },
  { ...at('a-case', GC), key: 'a-case--general', title: 'Admin case — a question with no order', note: 'No money to move; reply and close',
    setup: (S) => { const c = generalCase(S, 'tailor'); S.state.ui['a-case'] = { caseId: c.id }; },
    expect: { has: ['Message to Taily', 'No order attached. A general question.', 'No order attached, so there’s no money to move.'], sel: '.composer__input[placeholder="Reply to Amara"]' } },
  { ...at('a-case', GC), key: 'a-case--safety', title: 'Admin case — Sarah blocked Amara', note: 'S-32: a block opens a safety case at once; the facts, the order',
    setup: (S) => { const a = S.driveTo('confirmed'); const r = S.T.blockPerson('customer', { apptId: a.id }); S.state.ui['a-case'] = { caseId: r.case.id }; },
    expect: { has: ['Safety · blocked', 'From', 'Sarah Chen', 'About', 'Amara Reyes', 'Blocked', 'I blocked Amara Reyes.'] } },
  { ...at('a-case', GC), key: 'a-case--visit-unanswered', title: 'Admin case — nobody answered (K-48.5)', note: 'K-48.5 (Kevin): 4 hours after the visit START with no answer, the admin is told — a case both sides see',
    setup: (S) => { const a = sure(S); S.setClock('2026-10-15T21:00'); S.T.tick(); S.state.ui['a-case'] = { caseId: C2_openCase(a.id).id }; },
    expect: { has: ['Visit not recorded', 'Did your Thu, Oct 15 · 5:00 PM visit with Amara happen?', 'Cancel the order'] } },
];

/* ---------- the status screens: Get help (DG-1 B) + the case strip ---------- */
export const FLOWS_c_booking = [
  { ...at('c-booking'), key: 'c-booking--case-decided', title: 'Booking — Taily refunded the deposit', note: 'K-48.1: the case strip carries the decision in dollars; the deposit row says Refunded',
    setup: (S) => { refunded(S); },
    expect: { has: ['Taily decided', `We refunded your ${DEP} deposit.`, 'Open Taily Help', 'Refunded'], sel: '[data-case-strip="decided"]' } },
  { ...at('c-booking'), key: 'c-booking--taily-cancelled', title: 'Booking — Taily cancelled the order', note: 'D-01: the admin cancelled it — the deposit refunded in dollars, the case strip',
    setup: (S) => { const a = S.driveTo('in-progress'); const r = S.T.openCase({ who: 'customer', apptId: a.id, topic: 'other', text: 'Amara stopped answering.' }); S.T.adminCancelOrder(r.case.id); S.T.adminCloseCase(r.case.id); },
    expect: { has: ['Taily cancelled this order', `We refunded ${DEP} to your card.`, 'Taily decided', 'Refunded'], sel: '[data-case-strip="decided"]' } },
  { ...at('c-booking'), key: 'c-booking--get-help', title: 'Booking — Get help (person button)', note: 'DG-1 option B (K-49): Get help joins Message and Add to calendar in the person block',
    setup: (S) => { S.driveTo('confirmed'); },
    expect: { has: ['Message', 'Add to calendar', 'Get help'], sel: '.person-block__actions [data-act="get-help"]' } },
];
export const FLOWS_c_complete = [
  { ...at('c-complete'), key: 'c-complete--help', title: 'Order complete — a problem after completion', note: 'B-05: after completion (auto too) “Something isn’t right” goes to Taily; the case strip shows it',
    setup: (S) => { const a = S.driveTo('completed'); S.T.openCase({ who: 'customer', apptId: a.id, topic: 'after-completion', text: 'The hem is uneven.' }); },
    expect: { has: ['Taily is reviewing', 'Open Taily Help', 'Get help'], sel: '[data-case-strip="reviewing"]' } },
];
export const FLOWS_t_job = [
  { ...at('t-job'), key: 't-job--more-help', title: 'Job ⋯ — Get help with this job', note: 'DG-1 option B (K-49): the tailor’s ⋯ menu in every state (here: in progress) — Get help, Report or block',
    setup: (S) => { S.driveTo('in-progress'); },
    click: ['[data-act="more"]'],
    expect: { has: ['Get help with this job', 'Message Taily. The job is attached', 'Report or block Sarah'], sel: '[data-s="more"] [data-act="get-help"]' } },
  { ...at('t-job'), key: 't-job--case-decided', title: 'Job — Taily decided: you keep it', note: 'D-14: the disputed no-show decided for her — the decision in dollars on the strip, the no-show pay released',
    setup: (S) => { kept(S); },
    expect: { has: ['Taily decided', `You keep Sarah’s ${DEP} deposit.`, `Taily decided you keep Sarah’s ${DEP} deposit.`], sel: '[data-case-strip="decided"]' } },
  { ...at('t-job'), key: 't-job--taily-cancelled', title: 'Job — Taily cancelled it', note: 'D-01: nothing is paid out; Taily’s message explains why',
    setup: (S) => { const a = S.driveTo('in-progress'); const r = S.T.openCase({ who: 'customer', apptId: a.id, topic: 'other', text: 'Amara stopped answering.' }); S.T.adminCancelOrder(r.case.id); S.T.adminCloseCase(r.case.id); },
    expect: { has: ['Taily cancelled this job', 'Nothing is paid out for this job.', 'We cancelled this job. Nothing is paid out.'] } },
];
export const FLOWS_c_thread = [
  { ...at('c-thread'), key: 'c-thread--more', title: 'Chat ⋯ — Report, Block, Get help', note: 'S-32: the thread menu',
    setup: (S) => { S.driveTo('confirmed'); },
    click: ['[data-act="more"]'],
    expect: { has: ['Report Amara', 'Block Amara', 'Get help'], sel: '[data-s="safety-menu"] [data-act="sf-block"]' } },
  { ...at('c-thread'), key: 'c-thread--report', title: 'Report Amara', note: 'S-32: what happened (required, the error next to it) + details; only Taily sees it',
    setup: (S) => { S.driveTo('confirmed'); },
    click: ['[data-act="more"]', '[data-s="safety-menu"] [data-act="sf-report"]'],
    expect: { has: ['Report Amara', 'If you’re in danger, call 911 first. Only Taily sees this report.', 'They made me feel unsafe', 'Asked to pay or talk outside Taily', 'Send report'], sel: '[data-s="safety-report"] [data-act="sr-send"]' } },
  { ...at('c-thread'), key: 'c-thread--blocked', title: 'Chat — you blocked Amara', note: 'S-32: the chat closes both ways; neither can book the other; Taily is told',
    setup: (S) => { const a = S.driveTo('confirmed'); S.T.blockPerson('customer', { apptId: a.id }); },
    expect: { has: ['You blocked Amara. You can’t message or book each other. Taily is looking into it.', 'Get help'], not: 'Message Amara', sel: '.read-only [data-act="get-help"]' } },
];
export const FLOWS_t_thread = [
  { ...at('t-thread'), key: 't-thread--more', title: 'Chat ⋯ (tailor) — Report, Block, Get help', note: 'S-32: a tailor going into a stranger’s home can report or block',
    setup: (S) => { S.driveTo('confirmed'); },
    click: ['[data-act="more"]'],
    expect: { has: ['Report Sarah', 'Block Sarah', 'Get help'], sel: '[data-s="safety-menu"] [data-act="sf-report"]' } },
  { ...at('t-thread'), key: 't-thread--blocked', title: 'Chat (tailor) — Sarah blocked you', note: 'S-32: the chat is closed; she can’t book you again',
    setup: (S) => { const a = S.driveTo('confirmed'); S.T.blockPerson('customer', { apptId: a.id }); },
    expect: { has: ['This conversation is closed. You can’t message Sarah here any more.'], not: 'You blocked' } },
];
export const FLOWS_c_tailor = [
  { ...at('c-tailor'), key: 'c-tailor--blocked', title: 'Profile — a tailor she blocked', note: 'S-32: blocked people can’t book or be booked (eligible: blocked)',
    setup: (S) => { S.T.blockPerson('customer', { tailorId: 'amara' }); },
    expect: { has: ['You blocked this tailor'] } },
];
export const FLOWS_sys_texts = [
  { ...at('sys-texts'), key: 'sys-texts--admin', title: 'Text catalogue — to the admin', note: 'K-48.1: every new case and every Taily review texts Kevin ("Taily admin: …")',
    setup: (S) => { S.driveTo('awaiting-handoff'); },
    click: ['[data-act="chip"][data-value="admin"]'],
    expect: { has: ['TEXTS TO KEVIN, THE ADMIN', 'Taily admin: New case', 'Taily admin: Someone wrote on case', 'Lands on: a-case'], not: ['undefined', 'NaN'], sel: '[data-text-event="admin-case"]' } },
];
