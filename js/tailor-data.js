/* ============================================================
   Tailor flow — data helpers (Phase T, refined in UX-LOOP rounds 1–2).
   The tailor sees the SAME appointments the user books — Sarah's jobs
   are resolved by identity (`a.mine`, set on the seed and by
   requestTailor), never by index.

   Round 2 (R2-T-01 / R2-U-06 / R2-S-03): the tailor side is a LIST.
   `jobs(s)` = every `mine` appointment in state.upcoming plus the
   terminal `mine` entries the substrate moved to state.past. Per-
   appointment tailor state lives on `a.tailor` ({ requestHandled,
   expiresAt, draft, declineReason, justAccepted }); `state.tailorUi.current`
   is the appointment the tailor tapped, which T02…T08 and the chat
   render (falling back to the soonest non-terminal job).

   Money (round 7, Kevin's money model v2): the tailor accepts a job
   from Taily for a defined payout = 100% of the alteration prices —
   booked $200 → payout $200; final $360 → payout $360. There is no
   commission, and NOTHING on the tailor side reads the customer's
   total, what she paid Taily, or delivery (`a.totals` is never printed
   here). Pre-visit screens read the BOOKED order (`a.garments`, or
   `a.booked` once T05 Send has written the final order back);
   post-visit screens read the final `a.garments` the user side shares
   (R1-T-02/03). The payout Marco accepted is stamped on
   `a.tailor.acceptedPayout` at Accept and only moves when the scope
   changes at the visit (T05 shows "Payout $200 → $360" before Send).

   Harness deep links (`?screen=<id>` before any navigation) keep the
   frames' fixtures — `isFixture()` — so the diffs never see live state.
   ============================================================ */

import * as S from './state.js';
import * as D from './data.js';
import { state, canonicalStatus } from './state.js';
import { GARMENT_TYPES, SEED_UPCOMING, SEED_FINAL_ORDER, money, garmentAmount, fmtWhen, fmtDay, parseWhen } from './data.js';

export const CUSTOMER = {
  name: 'Sarah Chen', first: 'Sarah', initials: 'SC',
  street: '88 Leonard Street', short: '88 Leonard St, 4B', dist: '1.2 mi',
};

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

/** The seeded Jul 12 appointment — a few live strings keep its
    "tonight" fiction. Keyed on its fixed `when` (refreshItemSummary
    stamps `items` on every job once the final order is written). */
export const isSeed = (a) => !!(a?.mine && a?.when === SEED_UPCOMING[0].when);

const TERMINAL = ['declined', 'cancelled', 'expired'];
export const canon = (a) => canonicalStatus(String(a?.status ?? 'confirmed').toLowerCase());
export const isTerminalJob = (a) => TERMINAL.includes(canon(a));
/** How a terminal job ended, from the substrate's stamps (R2-T-05/06):
    'withdrawn' (Sarah pulled a request Marco never accepted), 'no-show',
    'tailor' (Marco couldn't make it), 'customer', 'expired', 'declined'. */
export function endedBy(a) {
  const c = canon(a);
  if (c === 'expired') return 'expired';
  if (c === 'declined') return 'declined';
  if (c !== 'cancelled') return null;
  if (a?.reason === 'no-show') return 'no-show';
  if (a?.cancelledBy === 'tailor' || a?.reason === 'cant-make-it') return 'tailor';
  if (a?.wasRequested) return 'withdrawn';
  return 'customer';
}
export const isWithdrawn = (a) => endedBy(a) === 'withdrawn';

/* ---------- substrate transitions (round 2 contract) ----------
   Looked up at call time so this module keeps loading while state.js
   is being extended; each returns true on success. Every call names
   its appointment explicitly (R2-T-02). */
const call = (name, ...args) => {
  const fn = S[name];
  if (typeof fn !== 'function') { console.warn(`state.${name}() is not available yet (substrate pending)`); return false; }
  return !!fn(...args);
};
export const T = {
  accept: (a) => call('tailorAccepts', a),
  complete: (a) => call('completeAppointment', a),
  approve: (a) => call('approveOrder', a),
  ready: (a) => call('markReady', a),
  deliver: (a) => call('deliver', a),
  chooseFulfilment: (method, window, date, a) => call('chooseFulfilment', method, window, date, a),
  decline: (a) => call('declineAppointment', a),
  expire: (a) => call('expireAppointment', a),
  cancel: (a, reason) => call('tailorCancels', a, reason),
  propose: (a, when) => call('proposeTime', a, when),
  /* R3-T-02: Marco withdrawing his own proposal is attributed to him */
  withdrawProposal: (a) => call('declineProposedTime', a, 'tailor'),
  refreshItems: (a) => call('refreshItemSummary', a),
};

/* ---------- round-3 substrate reads (call-time lookups) ----------
   data.js gains proposalDays / payoutDate this round; each is looked up
   when called so this module loads while data.js is being extended. */

/** Wheel rows Marco may propose (R3-T-01): the substrate bounds them by
    Sarah's need-by day; until it lands, the round-2 seven days from the
    requested visit. `[]` = no later slot to offer. */
export function proposalDays(a) {
  if (typeof D.proposalDays === 'function') return D.proposalDays(a) ?? [];
  const from = a?.when;
  const to = D.shiftDay(from, 6);
  return from && to ? D.dayRows(from, to, 7) : [];
}
/** Who declined the pending proposal — 'tailor' (Marco withdrew it) or
    'customer' (Sarah kept looking); null when none was declined. Reads
    the round-3 `{ when, by }` shape and the round-2 string. */
export function proposalDeclinedBy(a) {
  const d = a?.proposalDeclined;
  if (!d) return null;
  return typeof d === 'object' ? (d.by ?? 'customer') : 'customer';
}
/** "Mon, Jul 20" — the day the payout lands (R3-T-04: handoff day + 4,
    rounded to a weekday, in the substrate). The frames' literal stands
    until data.js provides it. */
export function payoutDate(a) {
  const d = typeof D.payoutDate === 'function' ? D.payoutDate(a) : null;
  return d || 'Mon, Jul 20';
}
/** The order number both personas share (R3-T-04): stamped by
    requestTailor; the seed keeps the frames' TLY-2026-4417. */
export const orderId = (a) => a?.orderId ?? 'TLY-2026-4417';

/* ---------- round-7 money reads (call-time lookups) ----------
   What Sarah paid Taily is between her and Taily — nothing on the tailor
   side names it (rule-literal after the director verification). The one
   fact kept readable is whether Sarah CONFIRMED the visit on her 24-hour
   prompt (`a.feeLocked`, stamped by the substrate's confirmAppointment);
   no tailor copy reads it any more. */
export const feeLocked = (a) => a?.feeLocked === true;
/** The tailor's payout for a garment list = 100% of the alteration
    prices (data.js `payout()` once it lands; the same sum until then). */
export function payoutOf(garments = []) {
  if (typeof D.payout === 'function') return D.payout(garments);
  return garments.reduce((s, g) => s + garmentAmount(g), 0);
}
/** The payout Marco accepted the job for: stamped on `a.tailor` by T02's
    Accept; a job confirmed another way (Sarah accepting a proposed
    time) is worth what she booked. */
export const acceptedPayoutOf = (a) => a?.tailor?.acceptedPayout ?? payoutOf(bookedGarments(a));
/** Stamp the accepted payout once (T02 Accept, the seed's fiction). */
export function stampAcceptedPayout(a) {
  const t = tailorOf(a);
  t.acceptedPayout ??= payoutOf(bookedGarments(a));
  return t.acceptedPayout;
}
/** "Payout $200 → $360 (+$160)" — the scope change T05 shows before
    Send; null when the draft is worth what Marco accepted. */
export function payoutChange(a, draft, from = acceptedPayoutOf(a)) {
  const to = payoutOf(draft);
  if (from === to) return null;
  const d = to - from;
  return { from, to, delta: d, text: `Payout ${money(from)} → ${money(to)} (${d > 0 ? '+' : '−'}${money(Math.abs(d))})` };
}
/** The tailor's name / initials as the CUSTOMER side prints them
    (round 6: unassigned until a tailor accepts — data.js owns the
    neutral copy; until it lands, the appointment's own fields). */
export const tailorName = (a) => (typeof D.tailorName === 'function' ? D.tailorName(a) : (a?.displayName ?? a?.name ?? 'Marco Tailor'));
export const tailorInitials = (a) => (typeof D.tailorInitials === 'function' ? D.tailorInitials(a) : (a?.initials ?? 'MT'));
/** The first pickup window data.js offers for this job (R2-U-02's
    handoffWindows), in the dated label 05A stores ("Thu, Jul 16 · 9–11 AM")
    — the T07 demo "Sarah chose pickup now" (R2-T-07). */
export function firstPickupWindow(a) {
  const w = typeof D.handoffWindows === 'function' ? D.handoffWindows(a)?.[0] : null;
  if (w) return { window: `${fmtDay(w.date, w.abbr)} · ${w.chips[0]}`, date: w.date };
  const day = a?.readyAt ?? a?.needBy;
  return { window: `${fmtDay(day, 'Fri, Jul 17')} · 3:00 PM`, date: fmtDay(day, 'Jul 17') };
}

/* ---------- the tailor's job list (R2-T-01) ---------- */

/** Every appointment Marco can see: live `mine` entries plus the
    terminal ones the substrate moved to state.past (this session).
    `state.lastCancelled` covers a terminal entry not in either list. */
export function jobs(s = state) {
  const live = (s.upcoming ?? []).filter((a) => a?.mine);
  const done = (s.past ?? []).filter((a) => a?.mine && isTerminalJob(a));
  const out = [...live, ...done];
  const lc = s.lastCancelled;
  if (lc?.mine && !out.includes(lc)) out.push(lc);
  return out;
}

const whenMs = (a) => parseWhen(a?.when)?.date.getTime() ?? Number.MAX_SAFE_INTEGER;
/** A job Marco still has something to do on: confirmed → ready (not
    delivered, not closed). */
export const isOpenJob = (a) => !isTerminalJob(a) && canon(a) !== 'delivered' && canon(a) !== 'searching';
/** The soonest job still on the calendar (Calendar tab, T03B's View
    Calendar, fallbacks): open jobs first, then requests, then — only
    when nothing else is live — the latest delivered one (R3-T-06). Never
    a closed job. */
export function primaryJob(s = state) {
  const all = jobs(s);
  const live = all.filter((a) => !isTerminalJob(a) && canon(a) !== 'delivered').sort((x, y) => whenMs(x) - whenMs(y));
  const open = live.filter(isOpenJob);
  return open[0] ?? live[0] ?? all.find((a) => canon(a) === 'delivered') ?? null;
}

/** Tailor-side UI flags kept on state (throwaway, like state.ui):
    `current` = the appointment the tailor tapped; `chat` = which
    thread the shared messages screen opens for Marco ('support' from
    T04's Contact Taily Support, else Sarah's — round 6); `clearedClosed`
    + `cleared` = T01's "Done today" Clear (round 6: the closed rows
    dismissed this session, re-shown when a job closes after the tap). */
export function tailorUi(s = state) {
  s.tailorUi ??= { current: null };
  return s.tailorUi;
}
/** Round 6: hide T01's closed "Done today" rows for the session. */
export function clearClosed(closedJobs, s = state) {
  const ui = tailorUi(s);
  ui.clearedClosed = true;
  ui.cleared = [...closedJobs];
}
/** Are the closed rows hidden? A job that closed AFTER the Clear tap
    (not in the snapshot) re-shows the section and drops the flag. */
export function closedCleared(closedJobs, s = state) {
  const ui = tailorUi(s);
  if (!ui.clearedClosed) return false;
  const snap = ui.cleared ?? [];
  if (closedJobs.some((a) => !snap.includes(a))) { ui.clearedClosed = false; ui.cleared = null; return false; }
  return true;
}
export function setCurrent(a, s = state) { tailorUi(s).current = a ?? null; return a; }

/** The appointment T02…T08 and the chat render: the tapped one while it
    is still Marco's, else the soonest open job (a harness deep link
    lands on the seed either way). */
export function current(s = state) {
  const ui = tailorUi(s);
  if (ui.current && jobs(s).includes(ui.current)) return ui.current;
  ui.current = primaryJob(s) ?? jobs(s)[0] ?? null;
  return ui.current;
}
/** Round-1 name, kept for callers that only need "a job". */
export const job = (s = state) => current(s);

/** Per-appointment tailor state (R2-T-01). */
export function tailorOf(a) {
  if (!a) return { requestHandled: false, expiresAt: null, draft: null, declineReason: null, justAccepted: false, acceptedPayout: null };
  a.tailor ??= { requestHandled: false, expiresAt: null, draft: null, declineReason: null, justAccepted: false, acceptedPayout: null };
  return a.tailor;
}

const POST_STATUSES = ['awaiting-approval', 'tailoring', 'ready-for-pickup', 'delivered'];
export const isPost = (c) => POST_STATUSES.includes(c);

/** The money a tailor screen prints for a garment list: the payout
    (100% of the alteration prices) — nothing else. */
export const orderMoney = (garments = []) => ({ payout: payoutOf(garments) });

/** The order as the customer booked it — `a.booked` once T05 Send has
    stashed it, else the live `a.garments` (pre-visit they are the same). */
export const bookedGarments = (a) => a?.booked ?? a?.garments ?? [];

/* The frames' post-visit fiction (shared with the user side): the added
   Sleeve on garment 1 + a third Suit Jacket = $360. T04/T05 deep links
   start from it. Round 7: the garment cards ARE the earnings breakdown,
   so T06's fixture itemises the same $200 / $80 / $80 = $360 (the frame
   still draws its "$120 / $80 / $80" quirk — Figma money sync pending). */
export const FIXTURE_FINAL = SEED_FINAL_ORDER.garments;
export const FIXTURE_T06 = FIXTURE_FINAL.map((g) => ({ ...g, addedJobs: [], added: false }));

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
  const c = canon(a);
  const post = isPost(c);
  const garments = post ? (a?.garments ?? []) : bookedGarments(a);
  /* the payout is the sum of the alteration prices on the cards — the
     final order post-visit, the booking before it. `a.totals` (the
     customer's alterations / Taily's fee / delivery / total) is never
     read on the tailor side. */
  const payout = payoutOf(garments);
  const delivery = a?.fulfilment?.method === 'delivery';
  const PILL = {
    searching: ['new-request', 'New Request'],
    confirmed: ['confirmed', 'Confirmed'],
    'awaiting-approval': ['awaiting-customer', 'Awaiting Customer'],
    tailoring: ['tailoring', 'Tailoring'],
    /* R2-T-10: the ready label follows the handoff the customer chose */
    'ready-for-pickup': ['ready', delivery ? 'Ready for Delivery' : 'Ready for Pickup'],
    delivered: ['completed', 'Completed'],
    declined: ['declined', 'Declined'],
    cancelled: ['cancelled', isWithdrawn(a) ? 'Withdrawn' : 'Cancelled'],
    expired: ['expired', 'Expired'],
  };
  const STAGE = { confirmed: 'confirmed', 'awaiting-approval': 'tailoring', tailoring: 'tailoring', 'ready-for-pickup': 'ready', delivered: 'complete' };
  const [pill, pillLabel] = PILL[c] ?? ['confirmed', 'Confirmed'];
  const when = fmtWhen(a?.when, 'Sun, Jul 12 · 7:00 PM');
  const needBy = fmtDay(a?.needBy, 'Fri, Jul 17');
  const address = visitAddress(a);
  const nb = parseWhen(a?.needBy);
  const time = when.split(' · ')[1] ?? when;
  const visitLabel = a?.visit === 'Store Visit' || a?.where === 'shop' ? 'Store visit' : 'Home visit';
  return {
    canon: c, post, garments, payout, visitLabel,
    money: { payout: money(payout) },
    items: garments.reduce((s, g) => s + (g.qty ?? 1), 0),
    itemsLabel: garmentsLabel(garments),
    pill, pillLabel, stage: STAGE[c] ?? 'confirmed',
    when, needBy, address,
    /* pre-visit cards carry the appointment date; post cards the need-by */
    month: post && nb ? nb.mon.slice(0, 3).toUpperCase() : (a?.month ?? 'JUL'),
    day: post && nb ? String(nb.day) : (a?.day ?? '12'),
    meta: post ? `Need by: ${needBy}` : `${time} - ${address}`,
    /* Tailor Summary Card rows (T03/T04) from the live appointment */
    rows: [`◉&nbsp;&nbsp;${address}`, `▤&nbsp;&nbsp;${when}`, `▤&nbsp;&nbsp;Need By: ${needBy}`],
    /* T02's rows (round 6): the first row adds the visit type and the
       travel distance (fixed 1.2 mi — the fiction) */
    requestRows: [`◉&nbsp;&nbsp;${address} · ${visitLabel} · ${CUSTOMER.dist}`, `▤&nbsp;&nbsp;${when}`, `▤&nbsp;&nbsp;Need By: ${needBy}`],
    /* T01 request card item lines */
    lines: garments.map((g) => `${g.type} - ${g.jobs.join(', ')} - ${money(garmentAmount(g))}`),
  };
}

/** Which tailor screen a job opens, by status (R1-T-01/05, R2-T-01). */
export function jobTarget(a) {
  const c = canon(a);
  if (c === 'searching' || c === 'expired') return 't02-appointment-request';
  if (c === 'confirmed') return 't03-request-accepted';        // pre-visit view
  if (c === 'awaiting-approval' || c === 'tailoring') return 't06-appointment-status';
  if (c === 'ready-for-pickup') return 't07-job-ready';
  if (c === 'delivered') return 't08-job-complete';
  if (c === 'cancelled') return 't03b-job-cancelled';
  return 't01-home';
}

/** Summary-card rows shared by the T03/T04 FRAMES (copy verbatim). */
export const CUSTOMER_ROWS = ['◉&nbsp;&nbsp;88 Leonard Street', '▤&nbsp;&nbsp;Sun, Jul 12 · 7:00 PM', '▤&nbsp;&nbsp;Need By: Fri, Jul 17'];
/** T02's rows on the FRAME (round 6: 455:2170 + Accepted / Expired) —
    unit, visit type and distance on the first row. */
export const REQUEST_ROWS = ['◉&nbsp;&nbsp;88 Leonard Street, 4B · Home visit · 1.2 mi', '▤&nbsp;&nbsp;Sun, Jul 12 · 7:00 PM', '▤&nbsp;&nbsp;Need By: Fri, Jul 17'];

/* ---------- the at-visit draft (R1-T-03, R2-T-08) ---------- */

let gid = 0;
/** Stable garment identity — the substrate stamps `id`s on seeds and
    addGarment (ensureGarmentIds); anything that still lacks one gets
    one here so the visit's marks and removals never slip by index. */
export function ensureIds(garments = []) {
  if (typeof S.ensureGarmentIds === 'function') return S.ensureGarmentIds(garments);
  garments.forEach((g) => { if (g && !g.id) g.id = `tg${++gid}`; });
  return garments;
}

/** The editable draft T04/T05 work on: starts from the booked order (or
    the frames' final-order fixture on a harness deep link) and lives on
    `a.tailor.draft` until Send writes it back. Garment ids are cloned
    so `orderMarks` can match by identity. */
export function draftFor(s, a, { fixture = false } = {}) {
  const t = tailorOf(a);
  if (!t.draft) {
    const src = fixture ? FIXTURE_FINAL : ensureIds(bookedGarments(a));
    t.draft = clone(src).map(({ addedJobs, added, ...g }) => g);
    if (fixture) t.draft.forEach((g, i) => { if (FIXTURE_FINAL[i]?.added) delete g.id; });
  }
  return t.draft;
}

/**
 * What changed against the booking (matched by garment id): per draft
 * card — a whole added garment (no booked match), the services not on
 * the booked garment, a price that moved — plus the booked garments the
 * tailor removed at the visit (R2-T-08).
 */
export function orderMarks(draft, booked) {
  const byId = new Map(booked.filter((b) => b?.id).map((b) => [b.id, b]));
  const marks = draft.map((g, i) => {
    /* fixture drafts (no ids) fall back to the frame's own markers */
    const b = g.id ? byId.get(g.id) : (byId.size ? null : booked[i]);
    if (!b) return { added: true, addedJobs: [...g.jobs], priceInfo: true };
    const addedJobs = g.jobs.filter((j) => !b.jobs.includes(j));
    return { added: false, addedJobs, priceInfo: garmentAmount(g) !== garmentAmount(b) };
  });
  const removed = byId.size
    ? booked.filter((b) => b?.id && !draft.some((g) => g.id === b.id))
    : booked.slice(draft.length);
  return { marks, removed: removed.map((b) => ({ id: b.id, type: b.type, jobs: [...b.jobs], qty: b.qty ?? 1, amount: garmentAmount(b) })) };
}

/** T05 Send: the reviewed draft becomes the appointment's final order —
    the shared truth the user's 03/Tailoring, 04 and 06 render from. */
export function writeFinalOrder(a, draft) {
  const booked = ensureIds(bookedGarments(a));
  a.booked ??= clone(booked);
  const { marks, removed } = orderMarks(draft, booked);
  a.garments = draft.map((g, i) => {
    const { commentOpen, ...rest } = g;
    const out = { ...rest, photos: rest.photos ?? 2, addedJobs: marks[i].addedJobs };
    if (marks[i].added) out.added = true;
    return out;
  });
  a.removed = removed;
  /* the customer's totals are the substrate's to write (round 7:
     `apptTotals(garments, base)` in data.js — alterations / visitFee
     re-tiered from the charged fee / delivery / total; nothing here
     reads them back) plus the revisedAt stamp the 03.2 demo checks so
     it never overwrites this order */
  const totals = typeof D.apptTotals === 'function' ? D.apptTotals : S.apptTotals;
  if (typeof totals === 'function') a.totals = totals(a.garments, a.totals ?? {});
  else console.warn('apptTotals() is not available yet (substrate pending)');
  /* the scope changed → the payout Marco accepted moves with it */
  tailorOf(a).acceptedPayout = payoutOf(a.garments);
  a.revisedAt = fmtDay(a.when, 'Sun, Jul 12');
  T.refreshItems(a);                      // R2-S-01/02: card item counts follow the final order
  return a;
}

/** Request expiry timer from a deadline (R1-T-14, per job since R2-T-01).
    First render reads "EXPIRES IN 1H 24M" and it ticks down from there. */
export function requestTimer(t, now = Date.now()) {
  t.expiresAt ??= now + EXPIRY_MINUTES * 60000;
  const mins = Math.max(0, Math.ceil((t.expiresAt - now) / 60000));
  return `EXPIRES IN ${Math.floor(mins / 60)}H ${mins % 60}M`;
}
/** Restart a job's request timer (a proposed time gives Sarah a fresh window). */
export function restartTimer(a, now = Date.now()) {
  tailorOf(a).expiresAt = now + EXPIRY_MINUTES * 60000;
}
/** A searching job whose window has closed. */
export const isLapsed = (a, now = Date.now()) => canon(a) === 'searching' && tailorOf(a).expiresAt != null && tailorOf(a).expiresAt <= now;
