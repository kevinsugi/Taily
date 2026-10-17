/* ============================================================
   Taily v5 — tailor-side selectors. DOM-free.
   The tailor sees the SAME appointment objects the customer books
   (state.appts), through these adapters. v4's tailor-data.js is
   archived in js/v4/tailor-data.js.
   ============================================================ */
import { state, apptsFor, tailorById, openSlots, getAppt, docsFor } from './state.js';
import { SERVICES, VISIT_LABEL, VISIT_MINUTES, ZIP_INFO, hoodNames } from './data.js';
import { rushFor, payoutFor } from './money.js';
import { toDate, fmtWhen, fmtDay, fmtTime, dayDiff, payoutDay, isoDay, addMinutes, isoMinute } from './dates.js';

export const MY_TAILOR_ID = 'amara';
export const myTailor = () => tailorById(MY_TAILOR_ID);

const PENDING = ['requested', 'suggested'];
const ACTIVE = ['confirmed', 'fitting', 'price-change', 'in-progress', 'ready', 'awaiting-handoff'];

/** Tailor's Home: `requests` = waiting on a reply (soonest expiry first), `upcoming` = booked work (soonest visit first). */
export function inbox() {
  const mine = apptsFor('tailor');
  const requests = mine.filter((a) => PENDING.includes(a.status))
    .sort((a, b) => toDate(a.expiresAt) - toDate(b.expiresAt));
  const upcoming = mine.filter((a) => ACTIVE.includes(a.status))
    .sort((a, b) => toDate(a.slot.start) - toDate(b.slot.start));
  return { requests, upcoming };
}

const wasAccepted = (appt) => appt.history.some((h) => h.status === 'confirmed');

/** "Sarah C." until ANY appointment of the pair was accepted, then "Sarah Chen" (D-74, amended by D-159: the same rule the thread uses,
    so a second request from a customer she has already served shows the full name). The address stays per appointment (D-88). */
export function customerName(_appt) {   // `_appt` kept for callers: the name no longer depends on which appointment
  return threadCustomerName();
}
export const customerInitials = () => state.customer.initials;

/** Neighborhood + zip until the tailor accepts; full address after (shop visits: the shop). A cancelled home visit hides the street again (D-88). */
export function jobAddress(appt) {
  const { visitType, zip, address } = appt.job;
  if (visitType === 'shop') {
    const s = tailorById(appt.tailorId).shop;
    return `${s.street}, ${s.city}, ${s.state} ${s.zip}`;
  }
  if (!wasAccepted(appt) || appt.status === 'cancelled') return `${ZIP_INFO[zip]?.hood ?? 'Brooklyn'} · ${zip}`;
  const unit = address?.unit ? `, ${address.unit}` : '';
  return `${address.street}${unit}, ${address.city}, ${address.state} ${address.zip}`;
}

/** Everything the request card shows. Amounts are cents (print with fmt* from money.js). */
export function requestView(appt) {
  const m = appt.money;
  return {
    garments: appt.job.garments.map((g) => ({
      id: g.id, type: g.type, photos: g.photos, docs: docsFor(appt, 'tailor')[g.id] ?? null,
      services: appt.lines.filter((l) => l.garmentId === g.id).map((l) => ({ id: l.serviceId, label: SERVICES[l.serviceId]?.label ?? l.label, cents: l.cents })),
    })),
    lines: appt.lines,
    visitLabel: VISIT_LABEL.tailor[appt.job.visitType],
    place: jobAddress(appt),
    when: fmtWhen(appt.slot.start),
    needBy: fmtDay(appt.job.needBy),
    estimate: m.services,
    tailyFee: m.tailyFee,
    payout: m.payout,
    expiresAt: appt.expiresAt,
    money: m,
    customer: { name: customerName(appt), initials: customerInitials() },
    whenEnd: fmtTime(appt.slot.end),
    minutes: VISIT_MINUTES[appt.job.visitType],
    needByDays: dayDiff(appt.slot.start, appt.job.needBy),
    retries: appt.retries,
    suggested: appt.suggested ? fmtWhen(appt.suggested.start) : null,
    items: new Set(appt.lines.map((l) => l.garmentId)).size || appt.job.garments.length,
    serviceCount: appt.lines.length,
  };
}

/** Times Amara can offer instead (D-77): her open slots before the need-by date, minus any that overlap the requested visit. */
export function suggestSlots(appt, { limit = null } = {}) {
  const { start, end } = appt.slot;
  const free = openSlots(appt.tailorId, appt.job.visitType, { until: appt.job.needBy, exclude: appt.id })
    .filter((s) => {
      const a = toDate(s).getTime();
      const b = a + VISIT_MINUTES[appt.job.visitType] * 60000;
      return b <= toDate(start).getTime() || a >= toDate(end).getTime();
    });
  return limit ? free.slice(0, limit) : free;
}

/** The payout entry for this appointment ({ cents, state, date, kind }) or null. */
export const payoutOf = (appt) => state.payouts.find((p) => p.apptId === appt.id) ?? null;

export const currentCustomer = () => state.customer;

/** "Sarah C." until ANY appointment of the pair was accepted, then "Sarah Chen" (D-74, D-129). */
export function threadCustomerName() {
  const { first, last } = state.customer;
  const accepted = state.appts.some((a) => a.customerId === state.customer.id && wasAccepted(a));
  return accepted ? `${first} ${last}` : `${first} ${last.charAt(0)}.`;
}

/* ---------- payouts (M5, D-136) ---------- */
/** One payout as a job row: who, what it was, what she takes home. */
function payoutItem(p) {
  const appt = getAppt(p.apptId);
  const day = appt ? fmtDay(appt.slot.start) : '';
  const types = appt ? [...new Set(appt.job.garments.map((g) => g.type))].join(', ') : '';
  const sub = p.kind === 'kept-deposit' ? 'Late cancellation · deposit kept'
    : p.kind === 'no-show' ? `No-show · ${day}`
      : `${types} · ${day}`;
  return { apptId: p.apptId, cents: p.cents, kind: p.kind, title: appt ? customerName(appt) : '', sub, retried: !!p.retried };
}
const sumOf = (list) => list.reduce((n, p) => n + p.cents, 0);

/** `{ next, failed, history, paidTotal }` — state.payouts grouped by date + state. `next` = the earliest pending date (re-queued payouts
    included); `failed` = every payout the bank sent back, with the Friday it will be sent again; `history` = paid Fridays, newest first. */
export function payoutsView() {
  const pending = state.payouts.filter((p) => p.state === 'pending');
  const nextDate = pending.map((p) => p.date).sort()[0] ?? null;
  const nextList = pending.filter((p) => p.date === nextDate);
  const failedList = state.payouts.filter((p) => p.state === 'failed');
  const paid = state.payouts.filter((p) => p.state === 'paid');
  const dates = [...new Set(paid.map((p) => p.date))].sort().reverse();
  return {
    next: nextDate ? { date: nextDate, cents: sumOf(nextList), items: nextList.map(payoutItem) } : null,
    failed: failedList.length ? { cents: sumOf(failedList), items: failedList.map(payoutItem), retryDate: payoutDay(isoDay(state.clock.now)) } : null,
    history: dates.map((date) => {
      const list = paid.filter((p) => p.date === date);
      return { date, state: 'paid', cents: sumOf(list), bank: list[0].bank ?? '', last4: list[0].last4 ?? '', items: list.map(payoutItem) };
    }),
    paidTotal: sumOf(paid),
  };
}

/** One job's payout: `{ payout, appt, view: requestView(appt) }` or null. */
export function payoutDetail(apptId) {
  const payout = state.payouts.find((p) => p.apptId === apptId);
  const appt = getAppt(apptId);
  return payout && appt ? { payout, appt, view: requestView(appt) } : null;
}

/** D-172: one payout's words, the same on t-job, t-home, t-payout and cancelled rows. `bank` = the tailor's `payouts` ({ bank, last4 });
    a paid or failed payout reads the bank snapshotted on it. `{ text, short, tone, label }`: `short` drops the bank (a list row's caption),
    `tone` 'error' for a payout the bank returned, `label` the Pending / Paid / Didn’t go through word of the pill. */
export function payoutLine(p, bank = myTailor()?.payouts) {
  const b = p.state === 'pending' ? bank : { bank: p.bank ?? bank?.bank, last4: p.last4 ?? bank?.last4 };
  const to = `${b?.bank ?? 'Your bank'} •••• ${b?.last4 ?? ''}`;
  const day = fmtDay(p.date);
  if (p.state === 'paid') return { text: `Paid ${day} · to ${to}`, short: `Paid ${day}`, tone: '', label: 'Paid' };
  if (p.state === 'failed') {
    const text = 'Sends again once you update your bank details.';
    return { text, short: 'Didn’t go through', tone: 'error', label: 'Didn’t go through' };
  }
  if (state.payouts.some((x) => x.state === 'failed')) {   // R5-2-T-02: the same account can't be promised the next one
    return { text: `Sends ${day} once you update your bank details`, short: `Sends ${day}`, tone: '', label: 'Pending' };
  }
  const verb = p.retried ? 'Sending again' : 'Arrives';
  return { text: `${verb} ${day} · to ${to}`, short: `${verb} ${day}`, tone: '', label: 'Pending' };
}

/** D-155: what a suggested time does to the price. Rush = min(as booked, the rush for the new slot): it never goes up. Returns
    `{ days, tier, rush, payout, less }` in cents — `tier` the rush the slot would normally carry, `rush` what is charged on this request,
    `payout` what she takes home at that slot, `less` what Sarah pays less than she booked (0 when the price is the same). */
export function suggestPrice(appt, slotIso) {
  const m = appt.money;
  const r = rushFor(tailorById(appt.tailorId), slotIso, appt.job.needBy);
  const rush = Math.min(m.rush, r.cents);
  return { days: r.days, tier: r.cents, rush, payout: payoutFor({ services: m.services, homeFee: m.homeFee, rush }), less: m.rush - rush };
}

/** K-19: the props `tailorRow` takes for one `tailorsFor(...).rows` entry (rating only when there are reviews; the card line; street + area for the place line). */
export function tailorRowProps(r, job = state.job, extra = {}) {
  const t = r.tailor;
  const hood = t.shop?.hood || ZIP_INFO[t.shop?.zip]?.hood || hoodNames(t.home?.hoods)[0] || ZIP_INFO[(t.home?.zips ?? [])[0]]?.hood || '';
  return {
    id: t.id, name: t.name, initials: t.initials, photo: t.photo, verified: t.verified, years: t.years,
    rating: t.rating?.count > 0 ? t.rating : null, distanceMi: r.distanceMi, quote: r.quote, nextOpening: r.nextOpening,
    visitType: job.visitType, declined: r.declined, cardLine: t.cardLine ?? '', street: t.shop?.street ?? '', hood, ...extra,
  };
}
