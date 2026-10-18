/* ============================================================
   Taily v5 — the text catalogue (pre-MVP A1: D-02 / DG-2 option A, K-43 D-301, K-48.4).
   Taily is a web app first: EVERY notification is a text message (SMS) with a unique link into the app, for both personas.
   One row per event: who gets it (`to`: 'customer' | 'tailor' | 'admin' — pre-MVP A2, K-48.1), what fires it (`trigger`, the timing in words — POLICY holds the numbers), where its link
   lands (`land`: a screen id, or null = the recipient's statusScreen for the appointment) and the exact words (`body`, WITHOUT the
   "Taily: " prefix, which system.js textBannerHtml adds). `owner` names the track that fires it ('A1' = state.js here; 'A2' support,
   'B1' verification fire theirs through the same state.js notify()).
   K-48.4: no quiet hours — every text goes out immediately.
   DOM-free and state-free (state.js imports it): bodies read only the context textCtx() builds.
   docs/v5/TEXTS.md is generated from this file: `node scripts/v5/texts-doc.mjs`. K-51: texts are numbered by recipient in catalogue order —
   C1… to the customer, T1… to the tailor, A1… to the admin (`textNo(id)`; TEXTS.md and the sys-texts board print it). Add a row at the END
   of its recipient's block so the numbers Kevin reviews don't move.
   ============================================================ */
import { POLICY } from './money-config.js';
import { fmtExact, noShowPayout, HOLD_DAYS } from './money.js';
import { fmtWhen, fmtDay, fmtTime, fmtTimeRange, dayWord, toDate, payoutDay } from './dates.js';

const H = 3600000;
const firstOf = (name, fallback) => (name || fallback).split(' ')[0];
/** K-51 (T1): a reply window in words — "2 hours", "1 hour 45 minutes", "40 minutes". */
const durationWords = (ms) => {
  const min = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(min / 60); const m = min % 60;
  const part = (n, one) => `${n} ${one}${n === 1 ? '' : 's'}`;
  return [h ? part(h, 'hour') : '', m || !h ? part(m, 'minute') : ''].filter(Boolean).join(' ');
};

/** Everything a body may print, from one appointment (or none) + the extra values its caller passes (`x`). Pure. */
export function textCtx({ a = null, t = null, cust = null, now = 0, x = {} } = {}) {
  const tf = firstOf(t?.name, 'Your tailor');
  const cf = cust?.first ?? 'Your customer';
  const cn = cust ? `${cust.first} ${(cust.last ?? '').charAt(0)}.`.replace(/ \.$/, '') : cf;
  const start = a?.slot?.start ?? null;
  const home = a?.job?.visitType !== 'shop';
  const time = start ? fmtTime(start) : '';
  const when = start ? fmtWhen(start) : '';
  const dw = start ? dayWord(start, now) : '';
  const visitRef = !start ? 'your visit' : dw === 'today' ? `today’s ${time} visit` : dw === 'tomorrow' ? `tomorrow’s ${time} visit` : `the ${when} visit`;
  const card = cust?.cards?.find((k) => k.id === a?.cardId)?.brand ?? 'card';
  const dep = fmtExact(a?.payments?.deposit?.cents ?? 0);
  const bal = fmtExact(x.balance ?? a?.payments?.balance?.cents ?? a?.money?.balance ?? 0);
  const payout = fmtExact(x.payout ?? a?.money?.payout ?? 0);
  const total = fmtExact(x.total ?? a?.money?.total ?? 0);
  const slot = x.slot ?? a?.handoff?.slot ?? null;
  const slotLine = !slot?.start ? '' : slot.end ? `${fmtDay(slot.start)} · ${fmtTimeRange(slot.start, slot.end)}` : fmtWhen(slot.start);
  /* K-53: the hold's last day — by when she chooses a way back (ready + HOLD_DAYS); the caller passes it, else it is read from the history */
  const readyAt = [...(a?.history ?? [])].reverse().find((h) => h.status === 'ready')?.at ?? null;
  const until = x.until ? fmtWhen(x.until) : readyAt ? fmtWhen(toDate(readyAt).getTime() + HOLD_DAYS * 24 * H) : '';
  return {
    a, t, cust, now, x, tf, cf, cn, home, time, when, dw, visitRef, card, dep, bal, payout, total, slot, slotLine, until,
    place: home ? 'at your place' : `at ${t?.shopName || 'the shop'}`,
    shop: t?.shopName || 'the shop',
    custStreet: [a?.job?.address?.street, a?.job?.address?.unit].filter(Boolean).join(', '),
    street: t?.shop?.street ?? '',
    visitLabel: home ? 'Home visit' : 'Shop visit',
    payday: fmtDay(x.payday ?? payoutDay(x.at ?? (now ? new Date(now).toISOString() : start ?? '2026-10-13'))),   // K-51: the payout's own date when the caller has it
  };
}

/** The catalogue. Event ids are unique; the same moment told to both people is two rows (one per recipient). */
export const TEXTS = {
  /* ---------------- to the customer ---------------- */
  'request-sent': { to: 'customer', land: 'c-request', trigger: 'She sends a request (or sends it again)',
    body: (c) => `Your request is with ${c.tf} for ${c.when}. She has ${POLICY.REQUEST_EXPIRY_H} hours to answer. We’re holding ${c.dep} on your ${c.card} until then.` },
  accepted: { to: 'customer', land: 'c-booking', trigger: 'The tailor accepts',
    body: (c) => `${c.tf} accepted. You’re booked ${c.when} ${c.place}. Free to cancel until ${fmtWhen(toDate(c.a.slot.start).getTime() - POLICY.CANCEL_WINDOW_H * H)}.` },
  suggested: { to: 'customer', land: 'c-request', trigger: 'The tailor suggests another time',
    body: (c) => `${c.tf} can’t do ${c.time} and suggested ${fmtWhen(c.x.start ?? c.a.suggested?.start ?? c.a.slot.start)}. Accept it or pick another tailor:` },
  declined: { to: 'customer', land: 'c-request', trigger: 'The tailor declines',
    body: (c) => `${c.tf} can’t take this one, so we released the ${c.dep} hold. See tailors who can:` },
  expired: { to: 'customer', land: 'c-request', trigger: `No answer within ${POLICY.REQUEST_EXPIRY_H} hours`,
    body: (c) => `${c.tf} didn’t answer in time, so nothing was charged. Send your request again or to another tailor:` },
  'suggestion-ended': { to: 'customer', land: 'c-request', trigger: 'The suggested time passed, or the tailor withdrew it',
    body: (c) => (c.x.withdrawn ? `${c.tf} withdrew the time she suggested, so we released the ${c.dep} hold. Send ${c.tf} a new request or find another tailor:` : `The time ${c.tf} suggested has passed, so we released the ${c.dep} hold. Send ${c.tf} a new request or find another tailor:`) },   // K-51 (like C5)
  reminder: { to: 'customer', land: 'c-job', trigger: `${POLICY.REMINDER_H} hours before the visit, booked at least that far ahead (K-41 → K-51)`,
    body: (c) => `Please confirm your appointment: ${c.tf} · ${c.when} ${c.place}. Free to change until ${fmtWhen(toDate(c.a.slot.start).getTime() - POLICY.CANCEL_WINDOW_H * H)}. Confirm or change:` },
  nudge: { to: 'customer', land: 'c-booking', trigger: `${POLICY.REMINDER_NUDGE_H} hours before the visit, not confirmed yet; the first ask when booked less than ${POLICY.REMINDER_H} hours ahead (K-43 → K-51)`,
    body: (c) => { const free = toDate(c.a.slot.start).getTime() - POLICY.CANCEL_WINDOW_H * H; return `You haven’t confirmed your ${c.time} visit with ${c.tf} ${c.dw}. Confirm by ${fmtTime(free)} ${dayWord(free, c.now)} or cancel it without penalty:`; } },
  'auto-cancel': { to: 'customer', land: 'c-booking', trigger: `${POLICY.REMINDER_AUTOCANCEL_H} hours before the visit, still not confirmed after a delivered reminder (K-43, D-02)`,
    body: (c) => `We cancelled your ${c.time} visit with ${c.tf} because you didn’t confirm by ${fmtTime(c.a.cancel?.at ?? c.now)}. ${c.tf} keeps your ${c.dep} deposit.` },
  'cant-make-it': { to: 'customer', land: 'c-booking', trigger: 'The tailor cancels the visit',
    body: (c) => `${c.tf} can’t make it ${c.when}. Your ${c.dep} deposit is refunded and your order is saved. Find another tailor:` },
  'no-show-marked': { to: 'customer', land: 'c-booking', trigger: 'The tailor marks a no-show',
    body: (c) => `${c.tf} marked you as not there for your ${c.time} visit, so she keeps your ${c.dep} deposit. Were you there? Tell us:` },
  'no-show-disputed-c': { to: 'customer', land: 'c-booking', trigger: 'The tailor says your no-show report isn’t right',
    body: (c) => `${c.tf} says she came to your ${c.time} visit. Taily is looking into it and will message you:` },
  'tailor-move': { to: 'customer', land: 'c-booking', trigger: 'The tailor asks to move a confirmed visit (D-12)',
    body: (c) => `${c.tf} asked to move your visit to ${fmtWhen(c.x.start ?? c.a.proposal?.start ?? c.a.slot.start)}. Accept the new time or keep ${c.when}:` },
  'tailor-on-way': { to: 'customer', land: 'c-booking', trigger: 'The tailor taps On my way (S-32)',
    body: (c) => `${c.tf} is on her way to your ${c.time} visit.` },
  'tailor-here': { to: 'customer', land: 'c-booking', trigger: 'The tailor taps I’m here (S-32)',
    body: (c) => (c.home ? `${c.tf} is at your door for your ${c.time} visit.` : `${c.tf} is at the shop for your ${c.time} visit.`) },
  'visit-check': { to: 'customer', land: 'c-booking', trigger: `${POLICY.VISIT_CHECK_H} hours after the start with nothing recorded (D-11)`,
    body: (c) => `Did your ${c.time} visit with ${c.tf} happen? Tell us:` },
  /* K-51 (replaces D-11's cancel with a refund): decided by evidence — the tailor's "I'm here" → the customer's no-show; nothing recorded →
     "Not confirmed", the deposit on hold, the tailor keeps it if neither side disputes within VISIT_HOLD_DISPUTE_H. `alt` = the other outcome. */
  'visit-closed': { to: 'customer', land: 'c-booking', trigger: `“Did the visit happen?” unanswered for ${POLICY.VISIT_CHECK_CANCEL_H} hours: decided by the evidence (K-51)`,
    body: (c) => (c.x.outcome === 'no-show'
      ? `You didn’t tell us if your ${c.when} visit with ${c.tf} happened, and ${c.tf} tapped I’m here at ${fmtTime(c.a?.visitDay?.tailor?.hereAt ?? c.a?.slot?.start ?? c.now)}, so it counts as a no-show. ${c.tf} keeps your ${c.dep} deposit. Were you there? Tell us:`
      : `Nobody confirmed your ${c.when} visit with ${c.tf}, so we closed it as not confirmed. Your ${c.dep} deposit is on hold. If neither of you disputes it by ${fmtWhen(c.x.until ?? c.a?.cancel?.holdUntil ?? c.now)}, ${c.tf} keeps it. Didn’t happen? Tell us:`),
    alt: { label: 'If the tailor tapped I’m here', x: { outcome: 'no-show' } } },
  'final-order': { to: 'customer', land: 'c-price-change', trigger: 'The tailor sends the final order',
    body: (c) => `${c.tf} sent your final order: ${c.total}${c.x.was && c.x.was !== c.x.total ? ` (was ${fmtExact(c.x.was)})` : ''}. Approve it so she can start:` },
  'final-order-updated': { to: 'customer', land: 'c-price-change', trigger: 'The tailor sends the final order again',
    body: (c) => `${c.tf} updated your final order: ${c.total}. Check it and approve it:` },
  'final-order-24h': { to: 'customer', land: 'c-price-change', trigger: `${POLICY.WAIT_REMIND_1_H} hours after the final order, not approved (D-03)`,
    body: (c) => `${c.tf} is waiting for you to approve your final order (${c.total}). Approve it so she can start:` },
  'final-order-72h': { to: 'customer', land: 'c-price-change', trigger: `${POLICY.WAIT_REMIND_2_H} hours after the final order, not approved (D-03)`,
    body: (c) => `Your final order from ${c.tf} still needs your approval. Until you approve it, she can’t start, and your order will be ready later. Approve it here:` },   // K-51
  'final-order-review': { to: 'customer', land: 'c-price-change', trigger: `${POLICY.FINAL_ORDER_REVIEW_D} days after the final order, not approved → Taily review (D-03)`,
    body: (c) => `Your final order from ${c.tf} has waited ${POLICY.FINAL_ORDER_REVIEW_D} days, so Taily is stepping in to help you both. We’ll message you:` },
  'edit-sent': { to: 'customer', land: 'c-price-change', trigger: 'The tailor edits the order after the fitting',
    body: (c) => `${c.tf} edited your order. Review the change and approve it:` },
  'edit-24h': { to: 'customer', land: 'c-price-change', trigger: `${POLICY.WAIT_REMIND_1_H} hours after an edit, not approved (D-03)`,
    body: (c) => `${c.tf} is waiting for you to approve the changes to your order:` },
  'edit-72h': { to: 'customer', land: 'c-price-change', trigger: `${POLICY.WAIT_REMIND_2_H} hours after an edit, not approved (D-03)`,
    body: (c) => `${c.tf} can’t finish your order until you answer her changes. The longer it waits, the later it’s ready. Review them:` },   // K-51
  'edit-withdrawn': { to: 'customer', land: 'c-booking', trigger: 'The tailor withdraws a pending edit (D-03)',
    body: (c) => `${c.tf} withdrew her changes. Your order stays as you approved it.` },
  /* K-53 (d2): the balance is held on her saved card when the order is ready; she chooses within HOLD_DAYS, else it is charged and set to pickup */
  ready: { to: 'customer', land: 'c-ready', trigger: 'The tailor marks the order ready (K-53: the balance is held on the saved card at once)',
    body: (c) => (c.x.holdFailed
      ? `Your order from ${c.tf} is ready, but your ${c.card} didn’t go through for the ${c.bal} balance. Update your card:`
      : `Your order from ${c.tf} is ready. We’re holding ${c.bal} on your ${c.card}. Choose pickup or delivery by ${c.until}, then pay:`),
    alt: { label: 'If the card declines the hold', x: { holdFailed: true } } },
  'ready-24h': { to: 'customer', land: 'c-ready', trigger: `${POLICY.WAIT_REMIND_1_H} hours after ready, no way back chosen (D-03)`,
    body: (c) => `Your order from ${c.tf} is ready and waiting. Choose how to get it back:` },
  'ready-72h': { to: 'customer', land: 'c-ready', trigger: `${POLICY.WAIT_REMIND_2_H} hours after ready, no way back chosen (D-03)`,
    body: (c) => `Your order is still waiting at ${c.shop}. Choose pickup or delivery by ${c.until}, or we’ll charge the ${c.bal} and set it to in-store pickup:` },   // K-53
  'ready-default': { to: 'customer', land: 'c-booking', trigger: `${HOLD_DAYS} days after ready (the hold’s last day), no way back chosen → charged, in-store pickup (K-53, was D-03’s 14 days)`,
    body: (c) => `Your order has been ready for ${HOLD_DAYS} days, so we charged your ${c.bal} balance and set it to in-store pickup. Pick a time to collect it:` },
  'pickup-today': { to: 'customer', land: 'c-booking', trigger: `${POLICY.PICKUP_REMIND_H} hours before the pickup time`,
    body: (c) => `Pickup today at ${c.slot?.start ? fmtTime(c.slot.start) : ''} at ${c.shop}, ${c.street}. Have your pickup code ready:` },
  'missed-pickup': { to: 'customer', land: 'c-booking', trigger: `${POLICY.HANDOFF_SLOT_MIN} minutes after the pickup time, not picked up`,
    body: (c) => `You missed your ${c.slot?.start ? fmtTime(c.slot.start) : ''} pickup at ${c.shop}. Pick a new time:` },
  'courier-on-way': { to: 'customer', land: 'c-booking', trigger: 'The tailor hands the order to the courier (S-35)',
    body: (c) => `Your courier has your order. It arrives ${c.slot?.end ? fmtTimeRange(c.slot.start, c.slot.end) : 'soon'}. If you’re not home, it’s left in your lobby.` },
  delivered: { to: 'customer', land: 'c-complete', trigger: 'The courier delivers (S-35)',
    body: (c) => `Delivered at ${fmtTime(c.x.at ?? c.now)}${c.x.to === 'lobby' ? ' to your building’s lobby' : ''}. You were charged ${fmtExact(c.x.charged ?? 0)}. Didn’t get it? Tell us within ${POLICY.COURIER_REPORT_H} hours:` },
  'delivery-failed': { to: 'customer', land: 'c-booking', trigger: 'The courier can’t deliver (S-35)',
    body: (c) => (c.x.reason === 'no-courier'
      ? `The courier didn’t come for your order, so it’s still with ${c.tf}. Pick a new delivery window, no extra charge:`
      : `The courier couldn’t deliver your order, so it’s going back to ${c.tf}. Pick a new delivery window, no extra charge:`) },
  'picked-up-marked': { to: 'customer', land: 'c-booking', trigger: 'The tailor marks it picked up without the code',
    body: (c) => `${c.tf} marked your order as picked up. Confirm you got it, or tell us if you didn’t:` },
  completed: { to: 'customer', land: 'c-complete', trigger: `The order is handed over (pickup code, Confirm received, or ${POLICY.HANDOFF_AUTO_H} hours after the tailor marked it)`,
    body: (c) => (c.x.charged ? `You were charged ${fmtExact(c.x.charged)} for your order with ${c.tf}. Your receipt:` : `Your order with ${c.tf} is complete. Your receipt:`) },
  'unclaimed-charged': { to: 'customer', land: 'c-booking', trigger: `${HOLD_DAYS} days after ready (the hold’s last day), paid but not collected (K-53, was D-04’s 6 days after paying)`,
    body: (c) => `We charged your ${c.bal} balance because your order has been ready for ${HOLD_DAYS} days. ${c.tf} keeps your order for ${POLICY.ABANDONED_CLOSE_D} days. Pick a time:` },
  abandoned: { to: 'customer', land: 'c-booking', trigger: `${POLICY.ABANDONED_CLOSE_D} days after the charge, still not collected (D-03)`,
    body: (c) => `Your order with ${c.tf} wasn’t collected within ${POLICY.ABANDONED_CLOSE_D} days of the charge, so we closed it.` },
  'card-failed': { to: 'customer', land: 'c-booking', trigger: 'Charging the balance fails (D-04)',
    body: (c) => `We couldn’t charge your card for ${c.bal}. Update your card to finish your order with ${c.tf}:` },
  message: { to: 'customer', land: 'c-thread', trigger: `A new chat message: the first unread one, then at most one per ${POLICY.CHAT_TEXT_GAP_MIN} minutes per conversation`,
    body: (c) => `${c.tf} sent you a message. Reply here:` },
  'review-reminder': { to: 'customer', land: 'c-review', trigger: `${POLICY.REVIEW_REMINDER_D} days after completion, no review (K-28)`,
    body: (c) => `How did ${c.tf} do? Leave a review:` },
  'texts-on': { to: 'customer', land: 'c-texts', trigger: 'She turns booking texts on (or replies START)',
    body: () => 'Texts are on. We’ll text you about your bookings. Msg & data rates may apply. Reply STOP to opt out, HELP for help.' },
  'taily-replied': { to: 'customer', land: 'c-case', owner: 'A2', trigger: 'Taily support replies (DG-1)',
    body: (c) => `We replied about your order with ${c.tf}. Read it:` },
  'case-decided': { to: 'customer', land: 'c-case', owner: 'A2', trigger: 'Taily support decides a case (DG-1)',
    body: (c) => `We looked into your order with ${c.tf} and made a decision. Details:` },
  'help-replied': { to: 'customer', land: 'c-case', owner: 'A2', trigger: 'Taily support replies to (or closes) a Help message with no order attached (DG-1)',
    body: () => 'We replied to your message. Read it:' },
  'help-reply': { to: 'customer', land: 'c-help', owner: 'A2', trigger: 'She replies HELP to any Taily text (B-05: carriers require an answer)',
    body: () => 'Need help? Message Taily here, or open a booking and tap Get help. Reply STOP to opt out:' },
  /* K-53 (D-383 follow-up): confirming no longer closes the free window, so it always ends CANCEL_WINDOW_H before the visit — still unconfirmed
     then (after a delivered reminder, so the auto-cancel is armed): one text, no silent gap before it */
  'free-window-closed': { to: 'customer', land: 'c-booking', trigger: `${POLICY.CANCEL_WINDOW_H} hours before the visit (the free window’s end), still not confirmed after a delivered reminder (K-53)`,
    body: (c) => `Your free change window for your ${c.time} visit with ${c.tf} has closed. Confirm now so it isn’t cancelled:` },

  /* ---------------- to the tailor ---------------- */
  request: { to: 'tailor', land: 't-request', trigger: 'A new request (or the same request sent again)',
    body: (c) => `New request from ${c.cn}: a ${c.home ? 'home' : 'shop'} visit on ${c.a?.slot ? `${fmtDay(c.a.slot.start)} at ${fmtTime(c.a.slot.start)}` : 'a day to be set'}. Your payout: ${c.payout}. Reply within ${durationWords(toDate(c.a?.expiresAt ?? c.now).getTime() - c.now)}:` },   // K-51
  'request-soon': { to: 'tailor', land: 't-request', trigger: `${POLICY.EXPIRING_SOON_MIN} minutes before a request expires`,
    body: (c) => `${POLICY.EXPIRING_SOON_MIN} minutes left to answer ${c.cn} for ${c.when} (payout ${c.payout}):` },
  'suggestion-accepted': { to: 'tailor', land: 't-job', trigger: 'The customer accepts the time you suggested',
    body: (c) => `${c.cf} accepted ${c.when}. You’re booked.` },
  withdrawn: { to: 'tailor', land: 't-home', trigger: 'The customer withdraws her request',
    body: (c) => `${c.cf} withdrew her request for ${c.when}. Nothing to do.` },
  switched: { to: 'tailor', land: 't-home', trigger: 'The customer picks another tailor instead of your suggested time',
    body: (c) => `${c.cf} chose another tailor, so her request for ${c.when} is closed.` },
  'cancelled-early': { to: 'tailor', land: 't-job', trigger: `The customer cancels ${POLICY.CANCEL_WINDOW_H} hours or more ahead`,
    body: (c) => `${c.cf} cancelled ${c.when}, more than ${POLICY.CANCEL_WINDOW_H} hours ahead. Nothing is owed. The time is open again.` },
  'cancelled-late': { to: 'tailor', land: 't-job', trigger: `The customer cancels inside ${POLICY.CANCEL_WINDOW_H} hours`,
    body: (c) => `${c.cf} cancelled ${c.visitRef}. You keep her ${c.dep} deposit, paid ${c.payday}.` },
  rescheduled: { to: 'tailor', land: 't-job', trigger: 'The customer moves the visit',
    body: (c) => `${c.cf} moved her visit to ${c.when}.` },
  'auto-cancel-t': { to: 'tailor', land: 't-job', trigger: `${POLICY.REMINDER_AUTOCANCEL_H} hours before the visit, the customer never confirmed (K-43)`,
    body: (c) => `${c.cf} didn’t confirm, so we cancelled ${c.visitRef}. You keep her ${c.dep} deposit.` },
  'tailor-no-show': { to: 'tailor', land: 't-job', trigger: 'The customer reports that you didn’t come',
    body: (c) => `${c.cf} says you didn’t come to the ${c.time} visit, so her ${c.dep} deposit was refunded. Not right? Tell us:` },
  'no-show-disputed': { to: 'tailor', land: 't-job', trigger: 'The customer says your no-show mark isn’t right (D-14)',
    body: (c) => `${c.cf} says she was there at ${c.time}. Your ${fmtExact(noShowPayout(c.a?.payments?.deposit?.cents ?? 0))} no-show pay is on hold while Taily looks into it:` },
  'move-accepted': { to: 'tailor', land: 't-job', trigger: 'The customer accepts the new time you asked for (D-12)',
    body: (c) => `${c.cf} accepted the new time. Your visit is now ${c.when}.` },
  'move-kept': { to: 'tailor', land: 't-job', trigger: 'The customer keeps the current time (D-12)',
    body: (c) => `${c.cf} is keeping ${c.when}.` },
  'start-soon': { to: 'tailor', land: 't-job', trigger: `${POLICY.START_REMIND_MIN} minutes before the visit`,
    body: (c) => `Your visit with ${c.cf} starts at ${c.time}${c.home ? (c.custStreet ? ` at ${c.custStreet}` : '') : ' at your shop'}. Tap I’m here when you arrive:` },
  'fitting-started': { to: 'tailor', land: 't-job', trigger: 'At the visit’s start time (one text then: it replaces a second start reminder)',
    body: () => 'Your fitting has started. Please take all notes here:' },
  'customer-on-way': { to: 'tailor', land: 't-job', trigger: 'The customer taps On my way (shop visits, S-32)',
    body: (c) => `${c.cf} is on her way to your shop for the ${c.time} visit.` },
  'customer-here': { to: 'tailor', land: 't-job', trigger: 'The customer taps I’m here (shop visits, S-32)',
    body: (c) => `${c.cf} is at your shop for the ${c.time} visit.` },
  'visit-check-t': { to: 'tailor', land: 't-job', trigger: `${POLICY.VISIT_CHECK_H} hours after the start with nothing recorded (D-11)`,
    body: (c) => `Did your ${c.time} visit with ${c.cf} happen? Tell us:` },
  'visit-closed-t': { to: 'tailor', land: 't-job', trigger: `“Did the visit happen?” unanswered for ${POLICY.VISIT_CHECK_CANCEL_H} hours: decided by the evidence (K-51)`,
    body: (c) => (c.x.outcome === 'no-show'
      ? `${c.cf} didn’t tell us if the ${c.when} visit happened, and you tapped I’m here at ${fmtTime(c.a?.visitDay?.tailor?.hereAt ?? c.a?.slot?.start ?? c.now)}, so it counts as her no-show. Your ${fmtExact(noShowPayout(c.a?.payments?.deposit?.cents ?? 0))} no-show pay comes ${c.payday}.`
      : `Nobody confirmed your ${c.when} visit with ${c.cf}, so we closed it as not confirmed. Her ${c.dep} deposit is on hold. If neither of you disputes it by ${fmtWhen(c.x.until ?? c.a?.cancel?.holdUntil ?? c.now)}, you keep it:`),
    alt: { label: 'If you tapped I’m here', x: { outcome: 'no-show' } } },
  'final-approved': { to: 'tailor', land: 't-job', trigger: 'The customer approves the final order',
    body: (c) => `${c.cf} approved the final order. Your payout: ${c.payout}. You can start.` },
  'final-order-review-t': { to: 'tailor', land: 't-job', trigger: `${POLICY.FINAL_ORDER_REVIEW_D} days after the final order, not approved → Taily review (D-03)`,
    body: (c) => `${c.cf} hasn’t approved your final order in ${POLICY.FINAL_ORDER_REVIEW_D} days, so Taily is stepping in to help you both. We’ll message you:` },
  'edit-approved': { to: 'tailor', land: 't-job', trigger: 'The customer approves your changes',
    body: (c) => `${c.cf} approved your changes. Your payout: ${c.payout}.` },
  'pickup-set': { to: 'tailor', land: 't-job', trigger: 'The customer pays and picks a pickup time',
    body: (c) => `${c.cf} picks up ${c.slotLine} at your shop. Ask for her pickup code.` },
  'courier-booked': { to: 'tailor', land: 't-job', trigger: 'The customer pays and picks a courier window',
    body: (c) => `A courier collects ${c.cf}’s order ${c.slot?.collectAt ? `${fmtDay(c.slot.collectAt)} at ${fmtTime(c.slot.collectAt)}` : 'soon'}. Have it packaged by then.` },   // K-51 (Kevin, final)
  'handoff-moved': { to: 'tailor', land: 't-job', trigger: 'The customer moves her pickup time or delivery window',
    body: (c) => `${c.cf} moved her ${c.a?.returnOption === 'courier' ? 'delivery' : 'pickup'} to ${c.slotLine}.` },
  'not-received': { to: 'tailor', land: 't-job', trigger: 'The customer says she didn’t get her order',
    body: (c) => `${c.cf} says she didn’t get her order. Your ${c.payout} payout waits until it’s sorted. Answer here:` },
  'delivery-missing-t': { to: 'tailor', land: 't-job', trigger: `The customer says a courier delivery never reached her (within ${POLICY.COURIER_REPORT_H} hours, S-35)`,
    body: (c) => `${c.cf} says the courier’s delivery didn’t reach her. Taily is looking into it and will message you.` },
  'delivery-failed-t': { to: 'tailor', land: 't-job', trigger: 'The courier can’t deliver (S-35)',
    body: (c) => (c.x.reason === 'no-courier'
      ? `The courier didn’t come for ${c.cf}’s order. Keep it ready: ${c.cf} picks a new window.`
      : `The courier couldn’t deliver ${c.cf}’s order and is bringing it back to you. ${c.cf} picks a new window.`) },
  'ready-default-t': { to: 'tailor', land: 't-job', trigger: `${HOLD_DAYS} days after ready (the hold’s last day), no way back chosen → charged, in-store pickup (K-53)`,
    body: (c) => `${c.cf} didn’t choose a delivery method in ${HOLD_DAYS} days, so we set her order to in-store pickup and charged her card. Your ${c.payout} payout comes ${c.payday}.` },   // K-51 → K-53: she is paid at the charge
  'unclaimed-t': { to: 'tailor', land: 't-job', trigger: `${HOLD_DAYS} days after ready (the hold’s last day), paid but not collected (K-53, D-03)`,
    body: (c) => `${c.cf} hasn’t collected her order, so we charged her card for the balance. Your ${c.payout} payout comes ${c.payday}. Please keep her order for ${POLICY.ABANDONED_CLOSE_D} days.` },   // K-51: no balance next to the payout (they differ by design)
  'abandoned-t': { to: 'tailor', land: 't-job', trigger: `${POLICY.ABANDONED_CLOSE_D} days after the charge, still not collected (D-03)`,
    body: (c) => `${c.cf}’s order wasn’t collected within ${POLICY.ABANDONED_CLOSE_D} days of the charge, so we closed it.` },
  'card-failed-t': { to: 'tailor', land: 't-job', trigger: 'Charging the customer’s balance fails (D-04)',
    body: (c) => `We couldn’t charge ${c.cf}’s card. Your ${c.payout} payout is waiting until she updates it.` },
  'job-done-t': { to: 'tailor', land: 't-job', trigger: 'The order is handed over (not by your own code entry)',
    body: (c) => `${c.cf} has her order. Job done. Your ${c.payout} payout comes ${c.payday}.` },
  'card-fixed-t': { to: 'tailor', land: 't-job', trigger: 'The customer’s new card goes through (D-04)',
    body: (c) => `${c.cf} updated her card and paid. Your ${c.payout} payout comes ${c.payday}.` },
  'payout-sent': { to: 'tailor', land: 't-earnings', trigger: 'The Friday payout run pays it',
    body: (c) => `Your ${fmtExact(c.x.cents ?? 0)} payout is on its way to ${c.x.bank || 'your bank'} •••• ${c.x.last4 ?? ''}.` },
  'payout-failed': { to: 'tailor', land: 'to-payouts', trigger: 'The bank sends a payout back',
    body: (c) => `Your ${fmtExact(c.x.cents ?? 0)} payout didn’t go through. ${c.x.bank || 'Your bank'} •••• ${c.x.last4 ?? ''} sent it back. Update your bank details:` },
  'message-t': { to: 'tailor', land: 't-thread', trigger: `A new chat message: the first unread one, then at most one per ${POLICY.CHAT_TEXT_GAP_MIN} minutes per conversation`,
    body: (c) => `${c.cf} sent you a message. Reply here:` },
  'new-review': { to: 'tailor', land: 't-job', trigger: 'The customer leaves a review',
    body: (c) => `${c.cf} left you ${c.x.stars ?? 5} stars. Read her review:` },
  'texts-on-t': { to: 'tailor', land: 't-texts', trigger: 'She turns texts back on (or replies START)',
    body: () => 'Texts are on. We’ll text you new requests and job updates. Msg & data rates may apply. Reply STOP to opt out, HELP for help.' },
  verified: { to: 'tailor', land: 't-shop', owner: 'B1', trigger: 'Verification passes (DG-4)',
    body: () => 'You’re verified. Customers near you can book you now.' },
  'check-action-needed': { to: 'tailor', land: 't-shop', owner: 'B1', trigger: 'A verification check needs something from her (DG-4 B: ID & Profile Photo, Background Check, Years Tailoring, Payout & Tax Info; no insurance — Taily provides it)',
    body: (c) => `We need one more thing to verify you: ${c.x.check ?? 'your ID'}. Finish it here:` },
  'taily-replied-t': { to: 'tailor', land: 't-case', owner: 'A2', trigger: 'Taily support replies (DG-1)',
    body: (c) => `We replied about your job with ${c.cf}. Read it:` },
  'help-replied-t': { to: 'tailor', land: 't-case', owner: 'A2', trigger: 'Taily support replies to (or closes) a Help message with no job attached (DG-1)',
    body: () => 'We replied to your message. Read it:' },
  'help-reply-t': { to: 'tailor', land: 't-help', owner: 'A2', trigger: 'She replies HELP to any Taily text (B-05: carriers require an answer)',
    body: () => 'Need help? Message Taily here, or open a job and tap More, then Get help. Reply STOP to opt out:' },

  /* ---------------- to the admin (K-48.1: support = the CEO, Kevin; "Taily admin: " prefix) ---------------- */
  'admin-case': { to: 'admin', land: 'a-case', owner: 'A2', trigger: `A new Help case, a safety report or block, or any Taily review opens (A1’s reviews included; K-48.5: a visit nobody answered ${POLICY.VISIT_CHECK_ADMIN_H} hours after its start)`,
    body: (c) => `New case${c.x.ref ? ` ${c.x.ref}` : ''}: ${c.x.why ?? 'a customer needs help'}. Open it:` },
  'admin-message': { to: 'admin', land: 'a-case', owner: 'A2', trigger: `Someone writes on an open case (at most one text per case every ${POLICY.CHAT_TEXT_GAP_MIN} minutes while unread)`,
    body: (c) => `${c.x.who ?? 'Someone'} wrote on case${c.x.ref ? ` ${c.x.ref}` : ''}. Reply:` },
};

/** The text events, in catalogue order: [id, row]. */
export const TEXT_EVENTS = Object.entries(TEXTS);
/** K-51: the review numbers — C1… (customer), T1… (tailor), A1… (admin), by catalogue order within each recipient. */
const TEXT_LETTER = { customer: 'C', tailor: 'T', admin: 'A' };
const TEXT_NO = (() => { const n = {}; const out = {}; for (const [id, r] of TEXT_EVENTS) { n[r.to] = (n[r.to] ?? 0) + 1; out[id] = `${TEXT_LETTER[r.to]}${n[r.to]}`; } return out; })();
export const textNo = (id) => TEXT_NO[id] ?? '';
