/* ============================================================
   scripts/money.mjs — the ONE place the click-through harnesses get
   their dollar amounts from.

   Every number here is computed from js/data.js (tiers, seeds,
   DELIVERY_FEE, payout / apptTotals) or from the js/fixtures.js orders
   that are themselves built from the seeds — so a fee-tier change in
   data.js moves every assertion with it. The only literals allowed are
   ITEM COUNTS and the per-run ALTERATION SUMS that come from what each
   script actually books (see LIVE below); alteration prices are fixed
   fiction ($120 Hem, $80 Sleeve — JOB_TYPES).

   Browser-side callbacks (page.evaluate / assertTrue bodies) cannot see
   node variables: pass `M` (a plain JSON snapshot of everything below)
   or an individual string in as the evaluate argument.
   ============================================================ */

import {
  visitFee, noShowComp, payout, apptTotals, JOB_TYPES,
  SEED_UPCOMING, SEED_PAST, SEED_FINAL_ORDER,
  RUSH_LADDER, rushCaption, VISIT_FEE_CAPTION, ALTERATIONS_EST_CAPTION, ALTERATIONS_FINAL_CAPTION, HANDOFF_CAPTION,
  FEE_LABEL, feeTierLabel,
} from '../js/data.js';

/* round 16 (Kevin): the rush LADDER (+$150 / +$100 / +$50 by days after the
   visit — paid at handoff, the tailor's in full), the fee-row captions and
   the "Concierge fee" label (+ its tier suffix) */
export const RUSH = RUSH_LADDER[0];
export const RUSH_LADDER_STEPS = RUSH_LADDER;
export const rushCap = rushCaption;
export const CAPTION = { rush: rushCaption(1), visit: VISIT_FEE_CAPTION, alterations: ALTERATIONS_EST_CAPTION, final: ALTERATIONS_FINAL_CAPTION, handoff: HANDOFF_CAPTION };
export const FEE_NAME = FEE_LABEL;
export const feeLabel = feeTierLabel;
import { FINAL_ORDER_REMOVED, FINAL_ORDER_RETIERED } from '../js/fixtures.js';

/** '$' + n — the app's whole-dollar rendering (money() in data.js). */
export const $ = (n) => '$' + n;
/** "$a $b $c" — how the harnesses join a screen's .fee-row__price column. */
export const fees = (...ns) => ns.map($).join(' ');
/** The two alteration prices the runs add at the visit (fixed fiction, from JOB_TYPES). */
export const PRICE = { hem: JOB_TYPES['Hem / Adjust Length'].price, sleeve: JOB_TYPES['Sleeve / Adjust Length'].price };
/** "Payout $a → $b (+$d)" — T05's scope-change line. */
export const payoutChange = (from, to) => `Payout ${$(from.payout)} → ${$(to.payout)} (${to.payout >= from.payout ? '+' : '−'}$${Math.abs(to.payout - from.payout)})`;

/* ---------- the tiers, one representative count each ---------- */
export const FEE = { t1: visitFee(1), t2: visitFee(5), t3: visitFee(9) };     // the customer's concierge fee ($50 / $90 / $140)
export const COMP = { t1: noShowComp(), t2: noShowComp(), t3: noShowComp() }; // no-show trip compensation (flat $25, round 16)
export const DELIVERY = 0;   // round 16: delivery is inside the concierge fee

/**
 * The money model for an order of `alterations` dollars over `items`
 * items — the same arithmetic as data.js apptTotals() / payout(), for
 * the runs whose alteration sum is known but whose garment list is not
 * to hand. `charged` = the fee already charged at booking (a re-tiered
 * final order keeps it and owes the difference at handoff).
 *   fee      the Concierge fee row (never below `charged`)
 *   added    the extra owed when the final order re-tiered
 *   total    alterations + fee (+ delivery)
 *   due      what is paid at handoff: alterations + added (+ delivery)
 *   payout   the tailor's payout: the alterations (round 16: no cut of the fee)
 *   comp     the tailor's no-show compensation (flat)
 */
export function sum(alterations, items, { charged, delivery = 0 } = {}) {
  const tier = visitFee(items);
  const ch = charged ?? tier;
  const fee = Math.max(tier, ch);
  return {
    alt: alterations, items, fee, charged: ch, added: Math.max(0, tier - ch), delivery,
    total: alterations + fee + delivery, due: alterations + Math.max(0, tier - ch) + delivery,
    payout: alterations, cut: 0, comp: noShowComp(),
  };
}

/** An order's numbers from its garment list (data.js apptTotals + payout). */
export function ofGarments(garments, base) {
  const t = apptTotals(garments, base);
  return { ...sum(t.alterations, t.items, { charged: t.visitFeeCharged, delivery: t.delivery }), payout: payout(garments) };
}

/* ---------- the seeds (read from the seed objects, not re-derived) ---------- */
const seedOf = (a) => ({
  alt: a.totals.alterations, items: a.totals.items, fee: a.totals.visitFee, charged: a.totals.visitFeeCharged,
  added: a.totals.visitFeeAdded, total: a.totals.total, due: a.totals.total - a.totals.visitFeeCharged,
  payout: payout(a.garments), cut: 0, comp: noShowComp(),
});
/** seed[0] as BOOKED — $200 Hem + Sleeve, 2 items. */
export const SEED = seedOf(SEED_UPCOMING[0]);
/** The frames' post-visit final order (SEED_FINAL_ORDER) — 3 items. */
export const FINAL = { ...seedOf(SEED_FINAL_ORDER), delta: payout(SEED_FINAL_ORDER.garments) - payout(SEED_UPCOMING[0].garments) };
/** The past seed — 1 item. */
export const PAST = seedOf(SEED_PAST[0]);
/** FINAL_ORDER_REMOVED fixture — g2 dropped at the visit, 2 items. */
export const REMOVED = { ...seedOf(FINAL_ORDER_REMOVED()), delta: payout(FINAL_ORDER_REMOVED().garments) - SEED.payout };
/** FINAL_ORDER_RETIERED fixture — the final order + two pairs of pants, 5 items (fee re-tiered, booked fee kept). */
export const RETIERED = seedOf(FINAL_ORDER_RETIERED());

/* ---------- what each script books live ----------
   The alteration sums are the scripts' own bookings (JOB_TYPES prices ×
   the garments they add); the item counts are what the UI produces. */
export const LIVE = {
  /* clickthrough.mjs happy path: Home tile Suit Jacket → one $120 Hem;
     03.2 Confirm → draftFinalOrder adds a Sleeve + a jacket → $280 / 2 items */
  customer: { booked: sum(120, 1), final: sum(280, 2) },
  /* clickthrough.mjs re-tier probe: 4 × $80 Sleeve jackets booked ($320),
     the fitting adds a Hem + a jacket → $520 / 5 items, the booked fee kept */
  retier: { booked: sum(320, 4), final: sum(520, 5, { charged: visitFee(4) }) },
  /* clickthrough.mjs 02 tier probe: n × Shirt Hem ($120 each) */
  tiers: (n) => sum(120 * n, n),
  /* clickthrough-sync.mjs bookAsCustomer: Suit Jacket Hem + Pants Hem = $240 / 2;
     tailorVisitAndSend: + Sleeve on card 1 + a Sleeve jacket = $400 / 3;
     run J removes the pants → $120 / 1 */
  sync: { booked: sum(240, 2), final: sum(400, 3), removed: sum(120, 1) },
  /* clickthrough-tailor.mjs bookFresh(): one $120 Hem; T04 lowers it to one $80 Sleeve;
     bookFresh(5): five $120 Hems = $600 / 5 */
  tailor: { fresh: sum(120, 1), lowered: sum(80, 1), five: sum(600, 5) },
};

/** A JSON-safe snapshot to hand to browser-side callbacks. */
export const M = JSON.parse(JSON.stringify({ FEE, COMP, DELIVERY, SEED, FINAL, PAST, REMOVED, RETIERED, LIVE: { ...LIVE, tiers: undefined } }));
