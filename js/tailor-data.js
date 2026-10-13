/* ============================================================
   Taily v5 — tailor-side selectors. DOM-free.
   The tailor sees the SAME appointment objects the customer books
   (state.appts), through these adapters. v4's tailor-data.js is
   archived in js/v4/tailor-data.js.
   ============================================================ */
import { state, apptsFor, tailorById } from './state.js';
import { SERVICES, VISIT_LABEL, ZIP_INFO } from './data.js';
import { toDate, fmtWhen, fmtDay } from './dates.js';

export const MY_TAILOR_ID = 'amara';
export const myTailor = () => tailorById(MY_TAILOR_ID);

const PENDING = ['requested', 'suggested'];
const ACTIVE = ['confirmed', 'fitting', 'price-change', 'in-progress', 'ready', 'returning'];

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

/** Neighborhood + zip until the tailor accepts; full address after (shop visits: the shop). */
export function jobAddress(appt) {
  const { visitType, zip, address } = appt.job;
  if (visitType === 'shop') {
    const s = tailorById(appt.tailorId).shop;
    return `${s.street}, ${s.city}, ${s.state} ${s.zip}`;
  }
  if (!wasAccepted(appt)) return `${ZIP_INFO[zip]?.hood ?? 'Brooklyn'} · ${zip}`;
  const unit = address?.unit ? `, ${address.unit}` : '';
  return `${address.street}${unit}, ${address.city}, ${address.state} ${address.zip}`;
}

/** Everything the request card shows. Amounts are cents (print with fmt* from money.js). */
export function requestView(appt) {
  const m = appt.money;
  return {
    garments: appt.job.garments.map((g) => ({
      id: g.id, type: g.type, photos: g.photos,
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
  };
}

export const currentCustomer = () => state.customer;
