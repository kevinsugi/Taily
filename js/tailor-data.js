/* ============================================================
   Tailor flow — data helpers (Phase T, refined in UX-LOOP round 1).
   The tailor sees the SAME appointment the user books — Sarah's job is
   resolved by identity (`a.mine`, set on the seed and by requestTailor),
   never by index, and falls back to `state.lastCancelled` so a customer
   cancellation still has a job to show (R1-T-01).

   Money mirrors CLAUDE.md "Tailor flow": booked $200 → fee $20 →
   payout $180; final $360 → fee $36 → payout $324. Pre-visit screens
   read the BOOKED order (`a.garments`, or `a.booked` once T05 Send has
   written the final order back); post-visit screens read the final
   `a.garments` / `a.totals` the user side shares (R1-T-02/03).

   Harness deep links (`?screen=<id>` before any navigation) keep the
   frames' fixtures — `isFixture()` — so the diffs never see live state.
   ============================================================ */

import { state, canonicalStatus, apptTotals } from './state.js';
import { GARMENT_TYPES, SEED_FINAL_ORDER, money, garmentAmount, fmtWhen, fmtDay, parseWhen } from './data.js';

export const CUSTOMER = {
  name: 'Sarah Chen', first: 'Sarah', initials: 'SC',
  street: '88 Leonard Street', short: '88 Leonard St, 4B', dist: '1.2 mi',
};

export const FEE_RATE = 0.10;
/** Request expiry window (T01 timer): 1H 24M on first render (R1-T-14). */
export const EXPIRY_MINUTES = 84;

export const FILLER_JOB = {
  month: 'SEP', day: '2', name: 'Leo Von', meta: 'Pickup: Sept 1, 2PM',
  payout: '$102', status: 'ready', pillLabel: 'Ready for Pickup', right: '60%', rightInk: true,
};

const clone = (v) => JSON.parse(JSON.stringify(v));

/** Harness deep link: the first render of a `?screen=` load renders the
    frame's fixture; anything reached by navigation renders live state. */
export const isFixture = () => !window.__tailyNavigated;

/** Sarah's job — by identity, then the cancelled stash (R1-T-01). */
export const job = (s) => s.upcoming?.find((a) => a.mine) ?? (s.lastCancelled?.mine ? s.lastCancelled : null);

/** Tailor-side UI flags kept on state (throwaway, like state.ui). */
export function tailorUi(s) {
  s.tailorUi ??= { requestHandled: false, declineReason: null, justAccepted: false, draft: null, expiresAt: null };
  return s.tailorUi;
}

const POST_STATUSES = ['awaiting-approval', 'tailoring', 'ready-for-pickup', 'delivered'];
export const isPost = (canon) => POST_STATUSES.includes(canon);

/** Subtotal / Taily fee (10%, whole dollars) / payout for a garment list. */
export function orderTotals(garments = []) {
  const subtotal = garments.reduce((s, g) => s + garmentAmount(g), 0);
  const fee = Math.round(subtotal * FEE_RATE);
  return { subtotal, fee, payout: subtotal - fee };
}
export const feeOf = (subtotal) => Math.round(subtotal * FEE_RATE);

/** The order as the customer booked it — `a.booked` once T05 Send has
    stashed it, else the live `a.garments` (pre-visit they are the same). */
export const bookedGarments = (a) => a?.booked ?? a?.garments ?? [];

/* The frames' post-visit fiction (shared with the user side): the added
   Sleeve on garment 1 + a third Suit Jacket = $360. T04/T05 deep links
   start from it; T06's frame itemizes card 1 at its booked $120 (the
   CLAUDE.md "cards itemize $120/$80/$80" quirk). */
export const FIXTURE_FINAL = SEED_FINAL_ORDER.garments;
export const FIXTURE_T06 = FIXTURE_FINAL.map((g, i) => (i === 0 ? { ...g, jobs: [g.jobs[0]], addedJobs: [] } : { ...g, added: false }));

/** Where the visit happens — the customer's address for a home visit,
    the tailor's place otherwise. */
export function visitAddress(a, s = state) {
  if (a?.visit === 'Home Visit' || a?.where === 'home') {
    const c = s.contact ?? {};
    return `${c.street ?? CUSTOMER.short}${c.unit ? `, ${c.unit}` : ''}`;
  }
  return a?.place ?? CUSTOMER.short;
}

/** "3 Suit Jackets" / "1 Pants / Jeans" / "4 items" (mixed types). */
export function garmentsLabel(garments = []) {
  const n = garments.reduce((s, g) => s + (g.qty ?? 1), 0);
  const types = [...new Set(garments.map((g) => g.type))];
  if (types.length === 1) return `${n} ${n === 1 ? types[0] : (GARMENT_TYPES[types[0]]?.plural ?? types[0])}`;
  return `${n} item${n === 1 ? '' : 's'}`;
}

/** Everything a tailor screen needs to render one job. */
export function jobView(a) {
  const canon = canonicalStatus(String(a?.status ?? 'confirmed').toLowerCase());
  const post = isPost(canon);
  const garments = post ? (a?.garments ?? []) : bookedGarments(a);
  const computed = orderTotals(garments);
  /* post-visit the appointment's totals are the shared truth (the user
     side renders the same number); pre-visit they follow the booking */
  const subtotal = post && a?.totals?.subtotal != null ? a.totals.subtotal : computed.subtotal;
  const fee = feeOf(subtotal);
  const payout = subtotal - fee;
  const PILL = {
    searching: ['new-request', 'New Request'],
    confirmed: ['confirmed', 'Confirmed'],
    'awaiting-approval': ['awaiting-customer', 'Awaiting Customer'],
    tailoring: ['tailoring', 'Tailoring'],
    'ready-for-pickup': ['ready', 'Ready for Pickup'],
    delivered: ['completed', 'Completed'],
    declined: ['declined', 'Declined'],
    cancelled: ['cancelled', 'Cancelled'],
    expired: ['declined', 'Expired'],
  };
  const STAGE = { confirmed: 'confirmed', 'awaiting-approval': 'tailoring', tailoring: 'tailoring', 'ready-for-pickup': 'ready', delivered: 'complete' };
  const [pill, pillLabel] = PILL[canon] ?? ['confirmed', 'Confirmed'];
  const when = fmtWhen(a?.when, 'Sun, Jul 12 · 7:00 PM');
  const needBy = fmtDay(a?.needBy, 'Fri, Jul 17');
  const address = visitAddress(a);
  const nb = parseWhen(a?.needBy);
  const time = when.split(' · ')[1] ?? when;
  return {
    canon, post, garments, subtotal, fee, payout,
    money: { subtotal: money(subtotal), fee: money(fee), payout: money(payout), feeNeg: `−${money(fee)}` },
    items: garments.reduce((s, g) => s + (g.qty ?? 1), 0),
    itemsLabel: garmentsLabel(garments),
    pill, pillLabel, stage: STAGE[canon] ?? 'confirmed',
    when, needBy, address,
    /* pre-visit cards carry the appointment date; post cards the need-by */
    month: post && nb ? nb.mon.slice(0, 3).toUpperCase() : (a?.month ?? 'JUL'),
    day: post && nb ? String(nb.day) : (a?.day ?? '12'),
    meta: post ? `Need by: ${needBy}` : `${time} - ${address}`,
    /* Tailor Summary Card rows (T02/T03/T04) from the live appointment */
    rows: [`◉&nbsp;&nbsp;${address}`, `▤&nbsp;&nbsp;${when}`, `▤&nbsp;&nbsp;Need By: ${needBy}`],
    /* T01 request card item lines */
    lines: garments.map((g) => `${g.type} - ${g.jobs.join(', ')} - ${money(garmentAmount(g))}`),
  };
}

/** Which tailor screen a job opens, by status (R1-T-01/05). */
export function jobTarget(a) {
  const canon = canonicalStatus(String(a?.status ?? '').toLowerCase());
  if (canon === 'searching') return 't02-appointment-request';
  if (canon === 'confirmed') return 't03-request-accepted';        // pre-visit view
  if (canon === 'awaiting-approval' || canon === 'tailoring') return 't06-appointment-status';
  if (canon === 'ready-for-pickup') return 't07-job-ready';
  if (canon === 'delivered') return 't08-job-complete';
  if (canon === 'cancelled') return 't03b-job-cancelled';
  return 't01-home';
}

/** Summary-card rows shared by the T02/T03/T04 FRAMES (copy verbatim). */
export const CUSTOMER_ROWS = ['◉&nbsp;&nbsp;88 Leonard Street', '▤&nbsp;&nbsp;Sun, Jul 12 · 7:00 PM', '▤&nbsp;&nbsp;Need By: Fri, Jul 17'];

/* ---------- the at-visit draft (R1-T-03) ---------- */

/** The editable draft T04/T05 work on: starts from the booked order (or
    the frames' final-order fixture on a harness deep link) and lives on
    state.tailorUi until Send writes it back. Keyed by appointment identity. */
export function draftFor(s, a, { fixture = false } = {}) {
  const ui = tailorUi(s);
  if (!ui.draft || ui.draft.of !== a) {
    const src = fixture ? FIXTURE_FINAL : bookedGarments(a);
    ui.draft = { of: a, garments: clone(src).map(({ addedJobs, added, ...g }) => g) };
  }
  return ui.draft.garments;
}

/** What changed against the booking, per card: a whole added garment,
    the services added (or changed) at the visit, a price that moved. */
export function orderMarks(draft, booked) {
  return draft.map((g, i) => {
    const b = booked[i];
    if (!b) return { added: true, addedJobs: [...g.jobs], priceInfo: true };
    const addedJobs = g.jobs.filter((j, k) => k >= b.jobs.length || j !== b.jobs[k]);
    return { added: false, addedJobs, priceInfo: garmentAmount(g) !== garmentAmount(b) };
  });
}

/** T05 Send: the reviewed draft becomes the appointment's final order —
    the shared truth the user's 03/Tailoring, 04 and 06 render from. */
export function writeFinalOrder(a, draft) {
  const booked = bookedGarments(a);
  a.booked ??= clone(booked);
  const marks = orderMarks(draft, booked);
  a.garments = draft.map((g, i) => {
    const { commentOpen, ...rest } = g;
    const out = { ...rest, photos: rest.photos ?? 2, addedJobs: marks[i].addedJobs };
    if (marks[i].added) out.added = true;
    return out;
  });
  /* same totals shape the user side writes (rows/subtotal/visitFee/
     total/deposit — the deposit stays the booking's) and the revisedAt
     stamp its 03.2 demo checks so it never overwrites this order */
  a.totals = apptTotals(a.garments, a.totals ?? {});
  a.revisedAt = fmtDay(a.when, 'Sun, Jul 12');
  return a;
}

/** Request expiry timer from a deadline (R1-T-14). First render reads
    "EXPIRES IN 1H 24M" and it ticks down from there. */
export function requestTimer(ui, now = Date.now()) {
  ui.expiresAt ??= now + EXPIRY_MINUTES * 60000;
  const mins = Math.max(0, Math.ceil((ui.expiresAt - now) / 60000));
  return `EXPIRES IN ${Math.floor(mins / 60)}H ${mins % 60}M`;
}
