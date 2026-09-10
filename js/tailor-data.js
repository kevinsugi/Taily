/* ============================================================
   Tailor flow — data helpers (Phase T, fast build).
   The tailor sees the SAME appointment the user books: state.upcoming[0]
   (the Marco seed, or a fresh request from 02). Marco's numbers mirror
   CLAUDE.md "Tailor flow": pre-appointment $200 → fee $20 → payout $180;
   post-appointment $360 → fee $36 → payout $324. Sarah Chen is the
   customer fiction on the tailor frames; Leo Von is filler.
   ============================================================ */

import { canonicalStatus } from './state.js';
import { JOB_TYPES } from './data.js';

export const CUSTOMER = {
  name: 'Sarah Chen', first: 'Sarah', initials: 'SC',
  street: '88 Leonard Street', short: '88 Leonard St, 4B', dist: '1.2 mi',
};

export const FEE_RATE = 0.10;
const PRE = { subtotal: 200, items: 2 };
const POST = { subtotal: 360, items: 3 };

export const FILLER_JOB = {
  month: 'SEP', day: '2', name: 'Leo Von', meta: 'Pickup: Sept 1, 2PM',
  payout: '$102', status: 'ready', pillLabel: 'Ready for Pickup', right: '60%', rightInk: true,
};

/** Sarah's job — the first upcoming appointment. */
export const job = (s) => s.upcoming?.[0] ?? null;

/** Tailor-side UI flags kept on state (throwaway, like state.ui). */
export function tailorUi(s) {
  s.tailorUi ??= { requestHandled: false, declineReason: 0 };
  return s.tailorUi;
}

const POST_STATUSES = ['awaiting-approval', 'tailoring', 'ready-for-pickup', 'delivered'];

/** Everything a tailor screen needs to render one job. */
export function jobView(a) {
  const canon = canonicalStatus(String(a?.status ?? 'confirmed').toLowerCase());
  const post = POST_STATUSES.includes(canon);
  const { subtotal, items } = post ? POST : PRE;
  const fee = Math.round(subtotal * FEE_RATE);
  const PILL = {
    searching: ['new-request', 'New Request'],
    confirmed: ['confirmed', 'Confirmed'],
    'awaiting-approval': ['awaiting-customer', 'Awaiting Customer'],
    tailoring: ['tailoring', 'Tailoring'],
    'ready-for-pickup': ['ready', 'Ready for Pickup'],
    delivered: ['completed', 'Completed'],
    declined: ['declined', 'Declined'],
    cancelled: ['cancelled', 'Cancelled'],
  };
  const STAGE = { confirmed: 'confirmed', 'awaiting-approval': 'tailoring', tailoring: 'tailoring', 'ready-for-pickup': 'ready', delivered: 'complete' };
  const [pill, pillLabel] = PILL[canon] ?? ['confirmed', 'Confirmed'];
  return {
    canon, post, subtotal, fee, payout: subtotal - fee, items,
    money: { subtotal: `$${subtotal}`, fee: `$${fee}`, payout: `$${subtotal - fee}`, feeNeg: `−$${fee}` },
    itemsLabel: `${items} Suit Jackets`,
    pill, pillLabel, stage: STAGE[canon] ?? 'confirmed',
    /* pre-appointment cards carry the appointment date; post cards the need-by */
    month: post ? 'JUL' : (a?.month ?? 'JUL'), day: post ? '17' : (a?.day ?? '12'),
    meta: post ? 'Need by: Fri, Jul 17' : `7:00PM - ${CUSTOMER.short}`,
    /* T01 request card item lines: first job of the first two garments */
    lines: (a?.garments ?? []).slice(0, 2).map((g) => `${g.type} - ${g.jobs[0]} - $${JOB_TYPES[g.jobs[0]]?.price ?? 0}`),
  };
}

/** Which tailor screen a job opens, by status. */
export function jobTarget(a) {
  const canon = canonicalStatus(String(a?.status ?? '').toLowerCase());
  if (canon === 'searching') return 't02-appointment-request';
  if (canon === 'confirmed') return 't04-appointment-details';
  if (canon === 'awaiting-approval' || canon === 'tailoring') return 't06-appointment-status';
  if (canon === 'ready-for-pickup') return 't07-job-ready';
  if (canon === 'delivered') return 't08-job-complete';
  return 't01-home';
}

/** Summary-card rows shared by T02/T03/T04 (frame copy, verbatim). */
export const CUSTOMER_ROWS = ['◉&nbsp;&nbsp;88 Leonard Street', '▤&nbsp;&nbsp;Sun, Jul 12 · 7:00 PM', '▤&nbsp;&nbsp;Need By: Fri, Jul 17'];
