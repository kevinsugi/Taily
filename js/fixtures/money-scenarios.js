/* ============================================================
   Taily v5 — the A3 golden money scenarios, COMPUTED from
   js/money.js on the seed in js/data.js (Sarah x Amara).
   Browser-safe and DOM-free: Test-flows fixtures import it
   here, Node scripts import it through scripts/v5/money.mjs.
   Nothing in this file is a typed dollar amount — change a rate
   in money-config.js or a price in data.js and these follow.
   ============================================================ */
import { TAILORS, SEED_JOB } from '../data.js';
import { estimate, quote, courierQuote, cancelTerms, noShowPayout, cents, partialQuote } from '../money.js';
import { toDate, addMinutes, payoutDay } from '../dates.js';

/** The seed visit: the first open Thursday home slot, Thu Oct 15 at 5 PM. */
export const SEED_SLOT = '2026-10-15T17:00';
/** The first open slot that doesn't overlap the seed visit: driveTo('suggested') and t-suggest's first row (D-77). */
export const SUGGESTED_SLOT = '2026-10-15T18:00';
/** The `after` the multi-row list flows pass to addRequest(): the second request lands Sat, Oct 17 · 9:00 AM (D-86). */
export const SECOND_SLOT_AFTER = '2026-10-17T00:00';
/** The Fridays payouts arrive on (D-24, D-136): the seed visit's, and the one after the second request's visit — computed, never typed. */
export const PAYOUT_DAYS = Object.freeze({ first: payoutDay(SEED_SLOT), second: payoutDay(SECOND_SLOT_AFTER) });
const AMARA = TAILORS[0];
const job = (patch = {}) => ({ ...structuredClone(SEED_JOB), ...patch });

const seed = estimate(AMARA, job(), SEED_SLOT);
const rush = estimate(AMARA, job({ needBy: '2026-10-16' }), SEED_SLOT);                 // visit Thu, need-by Fri: 1 day
const shop = estimate(AMARA, job({ visitType: 'shop' }), '2026-10-15T10:00');

/* seed + a 0.6 mi Taily courier (Williamsburg), on top of the booked lines */
const courierQuoted = courierQuote(0.6);
const courierCents = courierQuoted.cents;
const courier = quote({ lines: seed.lines, homeFee: seed.homeFee, rush: seed.rush, courier: courierCents });

/* price changes: the deposit stays as captured (D-23); the lines move */
const repriced = (fn) => quote({ lines: fn(seed.lines.map((l) => ({ ...l }))), homeFee: seed.homeFee, deposit: seed.deposit });
const priceAdded = repriced((lines) => {
  for (const l of lines) if (l.serviceId === 'sleeves') l.cents = (AMARA.prices.sleeves + 5) * 100;      // Sleeves up $5
  return [...lines, { ...lines[0], serviceId: 'taper', label: 'Taper legs', cents: AMARA.prices.taper * 100 }];
});
const priceRepriced = repriced((lines) => {
  for (const l of lines) if (l.serviceId === 'sleeves') l.cents = (AMARA.prices.sleeves + 5) * 100;      // Sleeves up $5, nothing else
  return lines;
});
const priceRemoved = repriced((lines) => lines.filter((l) => l.serviceId !== 'jacket-sides'));
/* K-01 (D-124): the J6 recipe — a new Pants / Jeans item with Hem pants, minus Take in jacket sides; and the Suit Pant taken off */
const priceItem = repriced((lines) => [
  ...lines.filter((l) => l.serviceId !== 'jacket-sides'),
  { garmentId: 'n1', garmentType: 'Pants / Jeans', serviceId: 'hem-pants', label: 'Hem pants', cents: cents(AMARA.prices['hem-pants']) },
]);
const priceItemRemoved = repriced((lines) => lines.filter((l) => l.garmentId !== 'g1'));
/* D-156: a shop visit whose order drops to ONE line worth about half the captured deposit (whole dollars, as a tailor prices), so the total is below the deposit and the
   difference comes back to the card (refund = deposit − total, no balance) */
const belowLines = [{ ...shop.lines[0], cents: Math.max(100, Math.floor(shop.deposit / 200) * 100) }];
const priceBelowDeposit = { ...quote({ lines: belowLines, homeFee: shop.homeFee, deposit: shop.deposit }), lines: belowLines };

/* Study-1 B1: the post-fitting edit the fixtures send (inputs, like the "+5" above, not amounts on a screen): Shorten sleeves up $15, the due
   date three days later, $40 of work done so far. `edit` = the approved order with the edit; `partial` = what Sarah pays if she declines
   (partialQuote: balance = work done − deposit; payout = the services part − Taily fee + the home visit fee). */
export const JOB_EDIT = Object.freeze({ sleevesUp: 15, dueDays: 3, workDone: 40 });
const edit = repriced((lines) => {
  for (const l of lines) if (l.serviceId === 'sleeves') l.cents = cents(AMARA.prices.sleeves + JOB_EDIT.sleevesUp);
  return lines;
});
const partial = partialQuote({ workDone: cents(JOB_EDIT.workDone), homeFee: seed.homeFee, deposit: seed.deposit });

/* a cancel / no-show on a booked seed appointment, two hours before the visit (inside the window) */
const booked = { slot: { start: SEED_SLOT }, payments: { deposit: { cents: seed.deposit } } };
const lateCancel = cancelTerms(booked, toDate(addMinutes(SEED_SLOT, -120)).getTime());
const earlyCancel = cancelTerms(booked, toDate(addMinutes(SEED_SLOT, -72 * 60)).getTime());

export const SCENARIOS = Object.freeze({
  seed, rush, shop, courier, courierQuote: courierQuoted, priceAdded, priceRemoved, priceRepriced, priceItem, priceItemRemoved, priceBelowDeposit,
  edit, partial,
  lateCancel: { ...lateCancel, tailorPaid: lateCancel.kept },
  earlyCancel,
  noShow: { paid: noShowPayout(seed.deposit) },
});
export { AMARA };
