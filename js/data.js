/* ============================================================
   Taily v4 — seed data
   Ported verbatim from taily-prototype-v3.html (the v3 prototype).
   Do not redesign: v3 is the source of truth for behaviour and data.
   ============================================================ */

/* Garment illustrations live in garment-icons.js (128px WebP data URLs, 120 KB) — re-exported so importers are unchanged. */
import { GARMENT_ICONS } from './garment-icons.js';
export { GARMENT_ICONS };

export const GARMENT_TYPES = {
  'Suit Jacket': { plural: 'Suit Jackets' },
  'Suit Pant': { plural: 'Suit Pants' },
  'Formal Dress': { plural: 'Formal Dresses' },
  'Jacket': { plural: 'Jackets' },
  'Shirt / Blouse': { plural: 'Shirts / Blouses' },
  'Dress / Jumpsuit': { plural: 'Dresses / Jumpsuits' },
  'Pants / Jeans': { plural: 'Pants / Jeans' },
  'Skirt': { plural: 'Skirts' },
  'Accessories': { plural: 'Accessories' },
};

/* Baseline service prices — each tailor applies their own multiplier; all shown as "$N+" minimums */
export const JOB_TYPES = {
  'Hem / Adjust Length': { price: 120 },
  'Sleeve / Adjust Length': { price: 80 },
  'Taper / Slim Fit': { price: 90 },
  'Resize': { price: 110 },
  'Repair': { price: 60 },
  'Alterations': { price: 100 },
  /* Added Aug 2026 for the Selector Type=Additional menu (541:1975) —
     short names + prices straight from the frame. NB "Taper +$24"
     disagrees with 'Taper / Slim Fit' $90; raised, kept per Figma. */
  'Taper': { price: 24 },
  'Sleeve': { price: 80 },
  'Lining': { price: 45 },
};

/* Selector Type=Additional menu rows (541:1975), in frame order. */
export const ADD_SERVICES = ['Taper', 'Sleeve', 'Resize', 'Repair', 'Lining'];

/* ============================================================
   UX-LOOP round 7 — money model v2 (Kevin). No deposit, no 10% of
   anything: Taily's only customer charge besides the alterations is a
   flat VISITATION FEE tiered by the booked item count (sum of
   quantities). It is HELD at booking, charged when a tailor accepts
   (state.js tailorAccepts stamps `feeChargedOn`), refunded in full
   until the customer confirms the visit on the 24-hour prompt
   (`feeLocked`), and non-refundable after. Alterations (+ $20
   delivery when chosen) are paid at handoff. The tailor's payout is
   100% of the alteration prices — see payout().
   ============================================================ */
export const VISIT_FEE_NOTE = 'Helps cover transportation for larger appointments.';
/* Round 12 (Kevin): customer tiers $50 / $90 / $150 by item count, and
   the tailor now takes a CUT of the fee on the same bands — $25 / $50 /
   $90 (tailorFee) — paid with the alteration payout (see payout()). */
export const VISIT_FEE_TIERS = [
  { max: 4, fee: 50 },
  { max: 10, fee: 90, note: VISIT_FEE_NOTE },
  { max: Infinity, fee: 150, note: VISIT_FEE_NOTE },
];
export const TAILOR_FEE_TIERS = [
  { max: 4, fee: 25 },
  { max: 10, fee: 50 },
  { max: Infinity, fee: 90 },
];
const tierFor = (tiers, count) => tiers.find((t) => (Number(count) || 0) <= t.max) ?? tiers[tiers.length - 1];
/** The visitation fee for a booked item count (1–4 → $50, 5–10 → $90, 11+ → $150). */
export const visitFee = (count) => tierFor(VISIT_FEE_TIERS, count).fee;
/** The tailor's cut of the visitation fee for an item count (1–4 → $25, 5–10 → $50, 11+ → $90). */
export const tailorFee = (count) => tierFor(TAILOR_FEE_TIERS, count).fee;
/** The tier's supporting line ('' on the $50 tier). */
export const visitFeeNote = (count) => tierFor(VISIT_FEE_TIERS, count).note ?? '';
/** Home delivery, chosen on 05 (05B) — charged with the alterations at handoff. */
export const DELIVERY_FEE = 20;

export const TAILORS = [
  { id: 'marco', name: 'Marco Tailor', initials: 'MT', promoted: true,
    spec: 'Bespoke suiting', specCat: 'Suiting', hood: 'Midtown West',
    home: true, store: true, mult: 1.0, homeFee: 150, turnaround: '3–5 days',
    avail: 'Tue–Sat · mornings & afternoons',
    rating: 4.8, reviews: 124, dist: 0.8,
    tags: ['House calls', 'Rush service'],
    pillsShort: ['Suiting Specialist', '10+ Years in Business'],
    review: { quote: 'I had my wedding suit made here and it came out perfect!', who: 'Scott C, 2 weeks ago' },
    address: '1025 Broadway, New York, NY 10018',
    desc: 'Third-generation master tailor specializing in bespoke suiting and precision alterations. Marco trained on Savile Row and has dressed Upper East Side clients for over 20 years.',
    pricing: [['Hem Trousers', '$30'], ['Suit Alteration', '$80'], ['Shirt Tailoring', '$45'], ['Full Bespoke Suit', '$800'], ['Wedding Dress Alteration', '$150']],
    availDate: 'Thu 9 Jul', daySlots: ['9:30 AM', '11:00 AM', '12:30 PM', '2:00 PM'],
    reviewsList: [
      ['SC', 'Scott C', '2 weeks ago', 5, 'I had my wedding suit made here and it came out perfect!'],
      ['DM', 'Dana M', '1 month ago', 5, 'Marco reshaped a vintage blazer I thought was beyond saving. Meticulous work.'],
      ['JL', 'James L', '2 months ago', 4, 'Great fit in the end, though the turnaround ran a few days longer than quoted.'],
    ] },
  { id: 'jordan', name: 'Jordan Tailor', initials: 'JT', promoted: false,
    spec: 'Suiting & alterations', specCat: 'Suiting', hood: 'Upper East Side',
    home: true, store: true, mult: 0.9, homeFee: 100, turnaround: '3\u20135 days',
    avail: 'Mon\u2013Sat \u00b7 mornings',
    rating: 4.8, reviews: 124, dist: 1.4,
    tags: ['Quick turnaround'],
    pillsShort: ['Quick Turnaround'],
    review: { quote: 'I had my wedding suit made here and it came out perfect!', who: 'Scott C, 2 weeks ago' },
    address: '220 E 60th Street, New York, NY 10022',
    desc: 'Precise, friendly suiting and everyday alterations with quick turnarounds on the Upper East Side.',
    pricing: [['Hem Trousers', '$95'], ['Suit Alteration', '$70'], ['Shirt Tailoring', '$40']],
    availDate: 'Thu 9 Jul', daySlots: ['9:30 AM', '11:00 AM', '12:30 PM', '2:00 PM'],
    reviewsList: [
      ['SC', 'Scott C', '2 weeks ago', 5, 'I had my wedding suit made here and it came out perfect!'],
      ['MB', 'Maya B', '1 month ago', 5, 'Quick, precise, and fairly priced.'],
      ['TR', 'Tom R', '2 months ago', 4, 'Solid work on two jackets, slight delay at pickup.'],
    ] },
  { id: 'elena', name: "Elena's Atelier", initials: 'EA', promoted: false,
    spec: 'Wedding dresses', specCat: 'Dresses', hood: 'Midtown West',
    home: false, store: false, mult: 1.5, homeFee: null, turnaround: 'Same day – 2 days',
    avail: 'Wed–Sun · same-day for emergencies',
    rating: 4.9, reviews: 89, dist: 1.2,
    tags: ['Same-day alterations'],
    pillsShort: ['In-Store Only', 'Same-Day Fixes'],
    review: { quote: 'They saved my dress the morning of the wedding. Forever grateful.', who: 'Dana M, 1 month ago' },
    address: '350 W 51st St, New York, NY 10019',
    desc: 'Bridal and eveningwear specialist. Elena and her team handle everything from delicate lace repair to full gown restructuring, with same-day service for emergencies.',
    pricing: [['Wedding Dress Alteration', '$150'], ['Gown Hem', '$60'], ['Bustle Add', '$75'], ['Corset Adjustment', '$90']],
    availDate: 'Thu 9 Jul', daySlots: ['11:00 AM', '1:00 PM', '3:30 PM'],
    reviewsList: [
      ['DM', 'Dana M', '1 month ago', 5, 'They saved my dress the morning of the wedding. Forever grateful.'],
      ['PK', 'Priya K', '2 months ago', 5, 'Lace repair you truly cannot see. Remarkable hands.'],
      ['AL', 'Anna L', '3 months ago', 4, 'Beautiful bustle work, though pickup ran a little behind schedule.'],
    ] },
  { id: 'stitch', name: 'StitchCraft Studio', initials: 'SS', promoted: false,
    spec: 'Alterations & repairs', specCat: 'Alterations', hood: 'SoHo',
    home: true, store: false, mult: 1.0, homeFee: 100, turnaround: '1–2 days',
    avail: 'Mon–Fri · evenings OK',
    rating: 4.5, reviews: 210, dist: 0.5,
    tags: ['House calls'],
    pillsShort: ['Home Pickup', 'Quick Turnaround'],
    review: { quote: 'Hemmed three pairs of jeans in two days. Easy and affordable.', who: 'Priya R, 3 weeks ago' },
    address: '98 Prince St, New York, NY 10012',
    desc: 'Fast, reliable everyday alterations and repairs. StitchCraft handles hems, zippers, and resizing with pickup and drop-off across downtown Manhattan.',
    pricing: [['Hem Trousers', '$20'], ['Zipper Replacement', '$35'], ['Resize Waist', '$40'], ['Patch & Repair', '$30']],
    availDate: 'Fri 10 Jul', daySlots: ['10:00 AM', '1:00 PM', '3:00 PM'],
    reviewsList: [
      ['PR', 'Priya R', '3 weeks ago', 5, 'Hemmed three pairs of jeans in two days. Easy and affordable.'],
      ['TW', 'Tom W', '1 month ago', 4, 'Quick zipper replacement at a fair price.'],
      ['KB', 'Kira B', '2 months ago', 4, 'Solid everyday alterations and great communication.'],
    ] },
];

/* Requested appointment — the time the USER asks for; the tailor confirms it or proposes another. */
export const APPT_PLACES = ['Home Visit', 'Store Visit'];
/* Phase R1 (Kevin): dates aligned to the Jul 12 fiction across all
   frames. */
/* UX-LOOP R1-U-05 (Kevin's fiction committed): the appointment is a
   HOME visit at the customer's 88 Leonard St, 4B — 02's address sheet,
   03.2's "Marco will message you when he arrives" and the tailor page
   all already said so. */
/* Round 9 (Kevin): both 02 pills start EMPTY — "Select Time" until the
   wheel writes them (one grammar, fmtPill). Nothing is requested until
   both are set. */
export const APPT_DEFAULT = { when: null, needBy: null, where: 'Home Visit' };
/** The 02 pills' one grammar — "Jul 12, 7:00 PM" (day alone when the
    source carries no time). Copies from an appointment (reschedule,
    re-request) pass through here so the two pills always match. */
export function fmtPill(str) {
  const p = parseWhen(str);
  if (!p) return str ?? null;
  return p.hour == null ? `${p.mon} ${p.day}` : `${p.mon} ${p.day}, ${clock(p)}`;
}
export const NEED_BY_OPTS = ['Thurs, Sept 1', 'Fri, Sept 2', 'Next week', 'Flexible'];

/* Seed appointments. state.js deep-clones these so the app can be reset.
   Display strings (dates, item lines, month/day) are aligned to the v4
   Figma frames — v3 showed Jul 8 / 2 items here. Statuses, structure and
   totals are untouched v3 behaviour. */
export const SEED_UPCOMING = [
  /* `mine: true` tags the appointment both personas share (the tailor
     side resolves "Sarah's job" by this tag, never by index). */
  { mine: true, name: 'Marco Tailor', initials: 'MT', tailorId: 'marco', where: 'home', place: '88 Leonard Street',
    orderId: 'TLY-2026-4417',   // R3-T-04: the frames' order number; fresh bookings count up from it
    payMethod: 'card',          // R4-U-02: the frames' "Visa •••• 4242" — each booking keeps the method it paid with
    when: 'Sunday Jul 12, 7PM', needBy: 'Fri, Jul 17', status: 'confirmed', items: '3 items · Alterations',
    visit: 'Home Visit', count: 3, month: 'JUL', day: '12',
    itemLines: ['1 Suit Jacket - Sleeve, Length', '1 Suit Jacket - Sleeve, Length', '1 Suit Jacket - Sleeve, Length'],
    /* UX-LOOP R1-U-02: the seed is the BOOKED (pre-appointment) order —
       $120 Hem + $80 Sleeve = $200 alterations — exactly what 02 /
       03/Confirmed / 03/Reminder draw. Round 7: + the $25 visitation fee
       (2 items → the $25 tier, charged 7/7/26 when Marco accepted) =
       $225. `a.garments` / `a.totals` are the shared truth for the final
       order: the tailor's T05 Send (or the user-side demo,
       state.draftFinalOrder()) writes the reviewed $360 order into them
       at the appointment. Post-appointment screens loaded by the harness
       with the seed still 'confirmed' render SEED_FINAL_ORDER (the
       frames' 06B fiction) instead. `count` / `itemLines` stay the 01/09
       frames' exact card copy. */
    garments: [{ id: 'g1', type: 'Suit Jacket', jobs: ['Hem / Adjust Length'], photos: 2 }, { id: 'g2', type: 'Suit Jacket', jobs: ['Sleeve / Adjust Length'], photos: 2 }],
    bring: ['Your garments', 'The shoes you plan to wear with them.'],
    feeChargedOn: '7/7/26',
    totals: { alterations: 200, items: 2, visitFee: 50, visitFeeCharged: 50, visitFeeAdded: 0, delivery: 0, total: 250, subtotal: 200 } },
  { name: 'James Tailor', initials: 'JT', tailorId: 'marco', where: 'home', place: '404 Madison, Midtown',
    when: 'Jul 1, 3PM', needBy: 'Thurs, Sep 2', status: 'ready', items: '2 items · Alterations',
    visit: 'Home Visit', count: 2, month: 'JUL', day: '1',
    itemLines: ['1 Suit Jacket - Hem - Adjust Length', '1 Suit Jacket - Sleeve - Adjust Length'],
    garments: [{ id: 'g3', type: 'Suit Jacket', jobs: ['Hem / Adjust Length'], photos: 2 }, { id: 'g4', type: 'Suit Jacket', jobs: ['Sleeve / Adjust Length'], photos: 2 }],
    bring: ['The shoes you plan to wear with your garments.'],
    feeChargedOn: '6/26/26',
    totals: { alterations: 200, items: 2, visitFee: 50, visitFeeCharged: 50, visitFeeAdded: 0, delivery: 0, total: 250, subtotal: 200 } },
];
/* garments/totals added so the 04d detail view has data to render;
   itemLines stay the 09 frame's exact card copy.
   UX-LOOP R2-U-10: coherent facts for the two past seeds — ONE name
   (the "Marco Tailor" the 09 frame draws; `displayName` is gone), a
   need-by after the visit, a same-day store pickup (`fulfilment`),
   `deliveredAt` in the card's own grammar so the 09 frame's
   "Picked up: Sep 2, 2PM" is unchanged (fmtDay() it for "Wed, Sept 2"),
   and a fee-charged date before the visit (round 7: the $25 visitation
   fee, charged 8/28/26 on acceptance). `displayCount` keeps the 09
   frame's "2 Items Total" quirk on the second card. Garment ids g5/g6. */
export const SEED_PAST = [
  { name: 'Marco Tailor', initials: 'MT', tailorId: 'marco', where: 'shop', place: '15 West Broadway',
    when: 'Sep 2, 2PM', needBy: 'Sep 4', status: 'Delivered', items: '1 jean · Length', month: 'SEP', day: '2',
    visit: 'Store Visit', count: 1, itemLines: ['1 Jean - Length'],
    fulfilment: { method: 'pickup', window: 'Wed 2–4 PM', date: 'Sep 2' },
    deliveredAt: 'Sep 2, 2PM', feeChargedOn: '8/28/26', feeLocked: true,
    garments: [{ id: 'g5', type: 'Pants / Jeans', jobs: ['Hem / Adjust Length'], photos: 0 }],
    totals: { alterations: 120, items: 1, visitFee: 50, visitFeeCharged: 50, visitFeeAdded: 0, delivery: 0, total: 170, subtotal: 120 } },
  { name: 'Marco Tailor', initials: 'MT', tailorId: 'marco', where: 'shop', place: '15 West Broadway',
    when: 'Sep 2, 2PM', needBy: 'Sep 4', status: 'Delivered', items: '1 shirt · Length', month: 'SEP', day: '2',
    visit: 'Store Visit', count: 1, displayCount: 2, itemLines: ['1 Shirt - Length'],
    fulfilment: { method: 'pickup', window: 'Wed 2–4 PM', date: 'Sep 2' },
    deliveredAt: 'Sep 2, 2PM', feeChargedOn: '8/28/26', feeLocked: true,
    garments: [{ id: 'g6', type: 'Shirt / Blouse', jobs: ['Hem / Adjust Length'], photos: 0 }],
    totals: { alterations: 120, items: 1, visitFee: 50, visitFeeCharged: 50, visitFeeAdded: 0, delivery: 0, total: 170, subtotal: 120 } },
];

/* The frames' post-appointment fiction (06B / 04D / 08 / 04E): at the
   Jul 12 visit Marco added an $80 Sleeve service to garment 1 and a
   third $80 Suit Jacket — $200 booked → $360 final. Round 7: 3 items
   is still the $25 tier, so the fee stays $25 → total $385 (+ $20
   delivery = $405 on the delivery receipt); tailor payout $200 → $360.
   `added` marks a whole added garment, `addedJobs` the services added
   at the appointment (04/Modified paints both semantic/info). The
   harness's deep links render this when the seed is still pre-
   appointment; the live flow writes the same shape via
   state.draftFinalOrder() or the tailor's T05 Send. */
export const SEED_FINAL_ORDER = {
  garments: [
    /* g1/g2 = the seed's booked garments (same identity, R2-T-08);
       g7 = the jacket added at the visit */
    { id: 'g1', type: 'Suit Jacket', jobs: ['Hem / Adjust Length', 'Sleeve / Adjust Length'], addedJobs: ['Sleeve / Adjust Length'], photos: 2 },
    { id: 'g2', type: 'Suit Jacket', jobs: ['Sleeve / Adjust Length'], photos: 2 },
    { id: 'g7', type: 'Suit Jacket', jobs: ['Sleeve / Adjust Length'], photos: 2, added: true },
  ],
  totals: { alterations: 360, items: 3, visitFee: 50, visitFeeCharged: 50, visitFeeAdded: 0, delivery: 0, total: 410, subtotal: 360 },
};

/* ============================================================
   Shared formatters (UX-LOOP round 1) — stable names, reused by both
   personas. Money renders whole dollars or two decimals ($20 / $20.80);
   dates come out in ONE grammar: rows "Sun, Jul 12 · 7:00 PM", days
   "Fri, Jul 17", receipts "7/12/26". Every fiction string in the seeds
   ("Sunday Jul 12, 7PM", "Jul 17, 3:00PM", "Thurs, Sep 2") and every
   picker value ("Sept 9, 9:30 AM") parses; the weekday is computed from
   the real calendar of the current year (Jul 12 2026 IS a Sunday).
   ============================================================ */
export const money = (n) => {
  const v = Number(n) || 0;
  const s = Number.isInteger(v) ? String(Math.abs(v)) : Math.abs(v).toFixed(2);
  return `${v < 0 ? '-' : ''}$${s}`;
};

/** Per-garment price: the appointment's totals.rows snapshot when the
    flow built them (bookingLines), else recomputed from JOB_TYPES —
    both agree at multiplier 1. */
export function rowPrice(g, rows, i) {
  if (rows?.[i]?.amount != null) return money(rows[i].amount);
  return money(garmentAmount(g));
}
export const garmentAmount = (g) => Math.round((g.jobs ?? []).reduce((s, j) => s + (JOB_TYPES[j]?.price ?? 0), 0));

/**
 * The customer's totals for a garment list (round 7 money model):
 *   { rows, alterations, items, visitFee, visitFeeCharged,
 *     visitFeeAdded, delivery, total, subtotal }
 * `alterations` = the sum of the alteration prices (multiplier 1);
 * `items` = the qty-aware count; `visitFee` = the tier for THAT count,
 * never below the fee already held / charged (`base.visitFeeCharged` —
 * removing items never lowers a charged fee); `visitFeeAdded` =
 * max(0, tier − charged), the extra fee a larger final order owes at
 * handoff; `delivery` = `base.delivery` (0 until 05B chooses home
 * delivery); `total` = alterations + visitFee + delivery. `subtotal`
 * is a deprecated alias of `alterations` (the tailor side's jobView
 * still reads it). Shared with the tailor's at-visit editor: call it
 * after writing `a.garments` with the old totals as `base`.
 */
export function apptTotals(garments, base = {}) {
  /* round 12 (Kevin): one garment = one item — quantities are gone */
  const rows = (garments ?? []).map((g) => ({ label: `${g.type} — ${(g.jobs ?? []).join(', ')}`, amount: garmentAmount(g) }));
  const alterations = rows.reduce((s, r) => s + r.amount, 0);
  const items = (garments ?? []).length;
  const tier = visitFee(items);
  const charged = base?.visitFeeCharged ?? base?.visitFee ?? tier;
  const fee = Math.max(tier, charged);
  const delivery = base?.delivery ?? 0;
  return {
    rows, alterations, items,
    visitFee: fee, visitFeeCharged: charged, visitFeeAdded: Math.max(0, tier - charged),
    delivery, total: alterations + fee + delivery,
    subtotal: alterations,
  };
}

/** The tailor's payout for a garment list (Kevin, round 12): 100% of
    the alteration prices PLUS the tailor's cut of the visitation fee
    for that item count (tailorFee) — no commission. payoutParts()
    returns the two parts the tailor screens itemise. */
export const payoutParts = (garments) => {
  const list = garments ?? [];
  const alterations = list.reduce((s, g) => s + garmentAmount(g), 0);
  const items = list.length;
  const visitCut = items ? tailorFee(items) : 0;
  return { alterations, items, visitCut, payout: alterations + visitCut };
};
export const payout = (garments) => payoutParts(garments).payout;

/**
 * No-show compensation (Kevin, UX-LOOP round 8): what the tailor
 * receives for the trip when the customer no-shows — $20 on the $25
 * tier, half the fee at $50 or more ($25 on $50, $50 on $100). Taily
 * pays it from the kept visitation fee (absorbed if the visit was
 * somehow unlocked); the tailor never sees the fee itself, only this
 * amount. `state.tailorCancels(a, 'no-show')` stamps it on
 * `a.noShowComp`; T02 quotes it before Accept from the booked fee.
 */
/* Round 12 (Kevin): the compensation IS the tailor's cut of the fee for
   the booked item count — $25 / $50 / $90. */
export const noShowComp = (items) => tailorFee(items);

/** "1 Item" / "3 Items" (09's "1 Items Total" bug, R1-U-19). */
export const itemsLabel = (n, word = 'Item') => `${n} ${word}${n === 1 ? '' : 's'}`;
/** Garment count of an appointment (qty-aware, falls back to `count`). */
export const itemCount = (a) => (a?.garments ?? []).length || a?.count || 0;

const MONTH_INDEX = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/* en-GB short months — the 02.1 wheel writes "Sept" for September */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

/** Parse any of the prototype's date strings. Returns
    { date, dow, mon, day, hour, min } or null. `hour` is null when the
    string carries no time. */
export function parseWhen(str) {
  if (!str) return null;
  const s = String(str);
  const m = s.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})\b/);
  const key = m?.[1].slice(0, 3).toLowerCase();
  if (!m || !(key in MONTH_INDEX)) return null;
  const mi = MONTH_INDEX[key];
  const day = Number(m[2]);
  const t = s.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  let hour = null; let min = 0;
  if (t) {
    hour = (Number(t[1]) % 12) + (t[3].toUpperCase() === 'PM' ? 12 : 0);
    min = Number(t[2] ?? 0);
  }
  const date = new Date(new Date().getFullYear(), mi, day, hour ?? 0, min);
  return { date, dow: DOW[date.getDay()], mon: MON[mi], day, hour, min };
}

const clock = (p) => {
  const h12 = ((p.hour + 11) % 12) + 1;
  return `${h12}:${String(p.min).padStart(2, '0')} ${p.hour >= 12 ? 'PM' : 'AM'}`;
};
/** "Sun, Jul 12 · 7:00 PM" (or the day alone when there is no time). */
export function fmtWhen(str, fallback = '') {
  const p = parseWhen(str);
  if (!p) return fallback || String(str ?? '');
  return p.hour == null ? `${p.dow}, ${p.mon} ${p.day}` : `${p.dow}, ${p.mon} ${p.day} · ${clock(p)}`;
}
/** "Fri, Jul 17". */
export function fmtDay(str, fallback = '') {
  const p = parseWhen(str);
  return p ? `${p.dow}, ${p.mon} ${p.day}` : (fallback || String(str ?? ''));
}
/** "7/12/26" — receipt rows. */
export function mdy(str, fallback = '') {
  const p = parseWhen(str);
  if (!p) return fallback;
  return `${p.date.getMonth() + 1}/${p.day}/${String(p.date.getFullYear()).slice(-2)}`;
}
/** Shift a parsed/parsable day by n days → "Thu, Jul 16". */
export function shiftDay(str, n) {
  const p = parseWhen(str);
  if (!p) return null;
  const d = new Date(p.date); d.setDate(d.getDate() + n);
  return `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`;
}
/** Wheel rows ("Thu 16 Jul") for every day from `from` to `to`
    inclusive — the 05A/05B custom-pickup range (ready date → need-by). */
export function dayRows(from, to, max = 31) {
  const a = parseWhen(from); const b = parseWhen(to);
  if (!a) return [];
  const rows = [];
  const d = new Date(a.date); d.setHours(0, 0, 0, 0);
  const end = b ? new Date(b.date) : new Date(d); if (b) end.setHours(0, 0, 0, 0);
  while (d <= end && rows.length < max) {
    rows.push(`${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`);
    d.setDate(d.getDate() + 1);
  }
  return rows.length ? rows : [`${DOW[a.date.getDay()]} ${a.day} ${a.mon}`];
}
const FULL_DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FULL_MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/* The 05A/05B frames' handoff days, chip copy verbatim (the second
   day's first chip is hyphenated in the frame — kept). */
const HANDOFF_CHIPS = [['9–11 AM', '12–2 PM', '4–6 PM'], ['9-11 AM', '12–2 PM', '4–6 PM']];
const HANDOFF_FIXTURE = ['Thu, Jul 16', 'Fri, Jul 17'];

/**
 * The pickup / delivery window days for an appointment (UX-LOOP
 * R2-U-02), in the shape 05A's WINDOWS constant has always had:
 *   [{ day: 'Thursday, July 16', abbr: 'Thu', date: 'Jul 16',
 *      chips: ['9–11 AM', '12–2 PM', '4–6 PM'] }, …]
 * (`short` / `slots` are aliases of `abbr` / `chips`.)
 * Day 1 = a.readyAt, day 2 = the next day, capped at a.needBy — when
 * readyAt already IS the need-by day only one window is returned.
 * Without a readyAt (the seed before markReady, harness deep links)
 * the frames' fixture stands, so the seed yields Thu Jul 16 / Fri Jul 17.
 */
export function handoffWindows(a) {
  const ready = parseWhen(a?.readyAt);
  const needBy = parseWhen(a?.needBy);
  const days = [];
  if (!ready) days.push(...HANDOFF_FIXTURE);
  else {
    const d0 = new Date(ready.date); d0.setHours(0, 0, 0, 0);
    const d1 = new Date(d0); d1.setDate(d1.getDate() + 1);
    const cap = needBy ? new Date(needBy.date) : null; if (cap) cap.setHours(0, 0, 0, 0);
    const key = (d) => `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`;
    days.push(key(d0));
    if (!cap || d1 <= cap) days.push(key(d1));
  }
  return days.map((str, i) => {
    const p = parseWhen(str);
    const chips = HANDOFF_CHIPS[Math.min(i, HANDOFF_CHIPS.length - 1)];
    return {
      day: `${FULL_DOW[p.date.getDay()]}, ${FULL_MON[p.date.getMonth()]} ${p.day}`,
      abbr: p.dow, short: p.dow,
      date: `${p.mon} ${p.day}`,
      chips, slots: chips,
    };
  });
}

/** Is `needBy` strictly after `when`? (02's need-by validation.) */
export function isAfter(needBy, when) {
  const a = parseWhen(needBy); const b = parseWhen(when);
  if (!a || !b) return true;
  return a.date > b.date;
}
/** Human label for the saved pay method (03/Cancelled's refund line). */
export const PAY_LABELS = { apple: 'Apple Pay', google: 'Google Pay', card: 'Visa •••• 4242' };

/* ============================================================
   UX-LOOP round 6 substrate (Kevin's fee policy + "no tailor name
   before matching") — shared by both personas.
   ============================================================ */

/**
 * Is `when` less than `hours` ahead of `now`? Round 7 retired the
 * 12-hour refund rule (the customer's confirmation on the 24-hour
 * prompt decides the fee now — state.js confirmAppointment); the
 * helper stays for the tailor side's time gates. A `when` already in
 * the past (the seed's Jul 12 fiction counts as today — its own day IS
 * "today") is within the window; an unparsable `when` is not (nothing
 * to measure against → treated as far ahead). `now` is an optional
 * override (ms) so the harness can pin the clock.
 */
export function withinHours(when, hours, now = Date.now()) {
  const p = parseWhen(when);
  if (!p) return false;
  return p.date.getTime() - now < hours * 3600 * 1000;
}

/** The tailor's name as the customer may see it: nothing until a
    tailor accepts (`requestTailor()` leaves `a.name` null;
    `tailorAccepts()` assigns it). */
export const TAILOR_MATCHING = 'Matching you with a tailor';
export const tailorName = (a) => a?.name ?? TAILOR_MATCHING;
/** The avatar glyph beside it — initials once matched, ✂ before. */
export const tailorInitials = (a) => a?.initials ?? '✂';
/** First name for prose ("Marco …"); `fallback` before a tailor is
    matched ("A tailor …" / "your tailor …"). */
export const tailorFirst = (a, fallback = 'A tailor') => (a?.name ? a.name.split(' ')[0] : fallback);

/* ============================================================
   UX-LOOP round 3 substrate (shared by both personas)
   ============================================================ */
const dayStart = (str) => {
  const p = parseWhen(str);
  if (!p) return null;
  const d = new Date(p.date); d.setHours(0, 0, 0, 0);
  return d;
};
/** Day-level: is `when`'s calendar day after `bound`'s? false when
    either side fails to parse (R3-U-02 / R3-T-01 — the same rule
    markReady uses, not the datetime `isAfter`). */
export function isAfterDay(when, bound) {
  const a = dayStart(when); const b = dayStart(bound);
  return !!(a && b && a > b);
}

/* The custom wheel's hour / minute rows (05A/05B custom pickup and the
   T03A proposal): studio hours 9 AM – 6 PM, quarter hours. */
export const STUDIO_HOURS = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM'];
export const WHEEL_MINS = ['00', '15', '30', '45'];
/** '9 AM' → 540, '12 PM' → 720, '1 PM' → 780 (minutes since midnight). */
const hourRowMins = (row) => {
  const m = String(row).match(/(\d{1,2})\s*(AM|PM)/i);
  if (!m) return null;
  return ((Number(m[1]) % 12) + (m[2].toUpperCase() === 'PM' ? 12 : 0)) * 60;
};
/* wheel day row "Fri 11 Sept" → parseWhen-able "Fri, Sept 11" */
const dayRowDate = (row) => dayStart(String(row).replace(/^(\w+) (\d+) (\w+)$/, '$1, $3 $2'));
/* -1 / 0 / 1: the wheel day against the need-by day (null = unbounded:
   no need-by, no time on it, or an unparsable day row) */
function needByCmp(a, dayRow) {
  const nb = parseWhen(a?.needBy);
  const d = dayRowDate(dayRow);
  if (!nb || nb.hour == null || !d) return null;
  const n = dayStart(a.needBy);
  return d < n ? -1 : d > n ? 1 : 0;
}

/**
 * The hour rows the tailor may propose on a wheel day (R4-U-03 /
 * R4-T-01): every studio hour on a day before the need-by, only the
 * hours STRICTLY before the need-by time on the need-by day itself,
 * none after it. A need-by without a time bounds by day only.
 */
export function proposalHours(a, dayRow, hours = STUDIO_HOURS) {
  const cmp = needByCmp(a, dayRow);
  if (cmp == null || cmp < 0) return hours;
  if (cmp > 0) return [];
  const nb = parseWhen(a.needBy);
  const limit = nb.hour * 60 + nb.min;
  return hours.filter((h) => { const m = hourRowMins(h); return m != null && m < limit; });
}
/** The minute rows for a proposal hour: capped only when that hour is
    the need-by hour on the need-by day (9 AM before a 9:30 AM need-by →
    00 / 15). */
export function proposalMins(a, dayRow, hourRow, mins = WHEEL_MINS) {
  if (needByCmp(a, dayRow) !== 0) return mins;
  const nb = parseWhen(a.needBy);
  const h = hourRowMins(hourRow);
  if (h == null || h + 60 <= nb.hour * 60 + nb.min) return mins;
  return mins.filter((m) => h + Number(m) < nb.hour * 60 + nb.min);
}

/**
 * The days a tailor may propose for a request (R3-U-02 / R3-T-01), as
 * wheel rows ("Thu 10 Sept"): the requested day through the need-by
 * day. The need-by day itself is offered only while a wheel slot can
 * still precede the need-by time (`proposalHours`, studio hours from
 * 9 AM); a need-by at or before 9 AM stops at the day before. `[]`
 * when nothing is left — a need-by on the visit day at or before 9 AM
 * (R4-T-04: T03A's "no later slot to offer" line). Falls back to seven
 * days from the requested visit only when the need-by is missing /
 * unparsable.
 */
export function proposalDays(a) {
  const from = a?.when;
  const start = dayStart(from);
  if (!start) return [];
  const nb = parseWhen(a?.needBy);
  if (!nb) return dayRows(from, shiftDay(from, 6), 7);
  const last = new Date(nb.date); last.setHours(0, 0, 0, 0);
  const nbRow = `${DOW[last.getDay()]} ${last.getDate()} ${MON[last.getMonth()]}`;
  if (proposalHours(a, nbRow).length === 0) last.setDate(last.getDate() - 1);
  if (last < start) return [];
  return dayRows(from, `${MON[last.getMonth()]} ${last.getDate()}`, 31);
}

/**
 * When the tailor's payout lands (R3-T-04): the handoff day
 * (`deliveredAt`, else the scheduled window's day, else `readyAt`,
 * else — nothing ready yet — the day before need-by, markReady's own
 * default) plus 4 days, rounded forward to a weekday. "Fri, Jul 17".
 * The Jul 12 seed yields "Mon, Jul 20" (ready Thu Jul 16 + 4).
 */
export function payoutDate(a) {
  const base = a?.deliveredAt ?? a?.fulfilment?.date ?? a?.readyAt ?? (a?.needBy ? shiftDay(a.needBy, -1) : null);
  const p = parseWhen(base);
  if (!p) return 'Mon, Jul 20';
  const d = new Date(p.date); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`;
}

/** Order ids per booking (R3-T-04): the seed keeps TLY-2026-4417;
    every requestTailor() takes the next one (4418, 4419, …). */
let orderSeq = 4417;
export const SEED_ORDER_ID = 'TLY-2026-4417';
export const nextOrderId = () => `TLY-2026-${++orderSeq}`;
