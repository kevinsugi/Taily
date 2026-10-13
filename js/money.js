/* ============================================================
   Taily v5 — money functions (D-03, D-16). DOM-free.
   Integer cents in, integer cents out; only fmt* return strings.
   Rates come from money-config.js — never a literal here. Rounding
   is half-up to the cent once per order, never per line.
   ============================================================ */
import { MONEY, POLICY } from './money-config.js';
import { dayDiff, toDate } from './dates.js';
import { SERVICES } from './data.js';

/* half-up with a guard against float dust (e.g. 224.99999999999997) */
const round = (x) => Math.round(x + 1e-9);

export const cents = (dollars) => Math.round(dollars * 100);

/** Price snapshot of a job's garments from the tailor's own price list.
    A service the tailor doesn't price is skipped and listed in `.missing`. */
export function linesFor(tailor, garments) {
  const lines = [];
  const missing = [];
  for (const g of garments ?? []) {
    for (const serviceId of g.services ?? []) {
      const price = tailor?.prices?.[serviceId];
      if (typeof price !== 'number') { missing.push({ garmentId: g.id, serviceId }); continue; }
      lines.push({ garmentId: g.id, garmentType: g.type, serviceId, label: SERVICES[serviceId]?.label ?? serviceId, cents: cents(price) });
    }
  }
  lines.missing = missing;
  return lines;
}

export const servicesTotal = (lines) => (lines ?? []).reduce((sum, l) => sum + l.cents, 0);

/** Rush fee from the TAILOR's own ladder: the first tier whose `days` covers the
    gap between the visit and the need-by date. 4+ days or an empty ladder → 0. */
export function rushFor(tailor, visitIso, needByIso) {
  if (!visitIso || !needByIso) return { days: null, cents: 0 };
  const days = dayDiff(visitIso, needByIso);
  const ladder = [...(tailor?.rush ?? [])].sort((a, b) => a.days - b.days);
  const tier = ladder.find((entry) => days <= entry.days);
  return { days, cents: tier ? cents(tier.fee) : 0 };
}

export const depositFor = (services, homeFee) => round(MONEY.DEPOSIT_RATE * (services + homeFee));
export const tailyFeeFor = (services) => round(MONEY.TAILY_FEE_RATE * services);
/** What the tailor takes home. The courier never reaches the tailor (D-04). */
export const payoutFor = ({ services, homeFee = 0, rush = 0 }) => services - tailyFeeFor(services) + homeFee + rush;

export function courierQuote(miles) {
  return { miles, cents: round(cents(MONEY.COURIER_BASE + MONEY.COURIER_PER_MILE * miles) * (1 + MONEY.COURIER_MARKUP)) };
}

/** The one price object every surface prints. `deposit` is passed by a booked
    appointment (its captured deposit never changes with a price change). */
export function quote({ lines = [], homeFee = 0, rush = 0, courier = 0, deposit = null } = {}) {
  const services = servicesTotal(lines);
  const total = services + homeFee + rush + courier;
  const dep = deposit ?? depositFor(services, homeFee);
  return {
    services, homeFee, rush, courier, total,
    deposit: dep,
    balance: Math.max(0, total - dep),
    refund: Math.max(0, dep - total),
    tailyFee: tailyFeeFor(services),
    payout: payoutFor({ services, homeFee, rush }),
  };
}

/** Quote for a draft job against one tailor. `slotIso` is the visit the rush tier
    is read from — callers pass the tailor's `nextOpening` (state.js has `estimateNext`). */
export function estimate(tailor, job, slotIso = null) {
  const lines = linesFor(tailor, job.garments);
  const homeFee = job.visitType === 'home' ? cents(tailor.home?.fee ?? 0) : 0;
  const rush = slotIso ? rushFor(tailor, slotIso, job.needBy) : { days: null, cents: 0 };
  const q = quote({ lines, homeFee, rush: rush.cents });
  q.rushDays = rush.days;
  q.lines = lines;
  q.missing = lines.missing;
  return q;
}

/** Cancel terms at `nowMs`: more than the window ahead → full refund; inside → the
    deposit is kept and paid to the tailor in full, no Taily fee (D-05). */
export function cancelTerms(appt, nowMs) {
  const deposit = appt.payments?.deposit?.cents ?? appt.money?.deposit ?? 0;
  const hoursAhead = (toDate(appt.slot.start).getTime() - nowMs) / 3600000;
  return hoursAhead > POLICY.CANCEL_WINDOW_H
    ? { window: 'early', refund: deposit, kept: 0 }
    : { window: 'late', refund: 0, kept: deposit };
}

export const noShowPayout = (deposit) => Math.max(deposit, cents(MONEY.NO_SHOW_COMP));

/* ---------- formatting ---------- */
const MINUS = '−';
const group = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const abs = (c) => Math.abs(c);
/** "$25" when whole dollars, else "$4.50" — price lists, list-row estimates, rush ladder, chips. */
export function fmt(c) {
  const sign = c < 0 ? MINUS : '';
  const a = abs(c);
  return a % 100 === 0 ? `${sign}$${group(a / 100)}` : `${sign}$${group(Math.floor(a / 100))}.${String(a % 100).padStart(2, '0')}`;
}
/** "$16.00" — every breakdown / receipt / payout row. */
export const fmtExact = (c) => `${c < 0 ? MINUS : ''}$${group(Math.floor(abs(c) / 100))}.${String(abs(c) % 100).padStart(2, '0')}`;
/** "−$12.50" (U+2212) — the Taily fee row and refunds-out. */
export const fmtNeg = (c) => `${MINUS}${fmtExact(abs(c))}`;
