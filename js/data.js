/* ============================================================
   Taily v5 — catalog + the Brooklyn seed (fictional). DOM-free.
   v4 data (Manhattan tailors, concierge fee, rush ladder, order seeds)
   is archived in js/v4/data.js. Rates and timers live ONLY in
   money-config.js. Prices here are the tailor's own price list, in
   dollars (money.js turns them into cents).
   ============================================================ */

/* Garment illustrations live in garment-icons.js (128px WebP data URLs) — re-exported so importers are unchanged. */
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

export const TRUST_BADGES = ['ID verified', 'Background check', 'Insured'];
/** DG-4 option B (K-48 / D-05 / D-06, D-350): the four checks behind the Verified check, in Kevin's order. Every one must pass before a tailor
    is listed (POLICY.LIVE_REQUIRES_VERIFIED) and before the Verified check shows. No insurance item: insurance is provided by Taily (Kevin). */
/* K-53 Q8 (D-427): the background check runs LAST (NYC Fair Chance Act: a conditional approval first) — ID and profile photo → Years
   tailoring → Payout and tax info → Background check. Still not listed until all four pass (K-49). */
export const VERIFY_ITEMS = [
  { id: 'id', label: 'ID and profile photo' },
  { id: 'years', label: 'Years tailoring' },
  { id: 'payout', label: 'Payout and tax info' },
  { id: 'background', label: 'Background check' },
];
export const itemsLabel = (n, word = 'Item') => `${n} ${word}${n === 1 ? '' : 's'}`;

export const DEMO_NOW = '2026-10-13T10:00';            // Tue — the frozen demo clock (D-09)
export const MAX_ITEMS = 10;                            // garments per job (D-11)
export const VISIT_MINUTES = { shop: 30, home: 60 };    // slot lengths (D-17); starts on :00 / :30, 9 AM–9 PM
export const DAY_START_MIN = 9 * 60;                    // earliest visit start
export const DAY_END_MIN = 21 * 60;                     // latest visit end
export const SLOT_STEP_MIN = 30;
export const SLOT_HORIZON_DAYS = 28;                    // how far ahead slots are generated when there is no need-by
export const NEED_BY_DEFAULT_D = 10;                 // K-54 F3 (D-453): a fresh draft's need-by, days from today — the seed's own (Tue, Oct 13 → Fri, Oct 23); Book again starts here
/** Optional single-choice reasons (D-76). The first entry of each is what driveTo('declined' | 'cant-make-it') passes. */
export const DECLINE_REASONS = ['Fully booked that week', 'Not work I take on', 'Too far for a home visit', 'Can’t finish by the need-by date'];
export const CANT_MAKE_IT_REASONS = ['Family emergency', 'I’m unwell', 'Shop closed unexpectedly', 'Something came up'];
export const VISIT_LABEL = { customer: { home: 'At my place', shop: 'At the shop' }, tailor: { home: 'Home visit', shop: 'Shop visit' } };
export const RETURN_LABEL = { pickup: 'In-store pickup', courier: 'Taily courier' };
export const CHARGE_WHEN = { pickup: 'at pickup', courier: 'on delivery' };   // K-44 / D-303: when the balance is charged, by the way back (the one source)   // K-37: Home drop-off is not a way back
export const PRIVACY_NOTE = 'Phone numbers and emails stay private on Taily.';
export const ZIP_INFO = {                               // mock geography: neighborhood + miles from the SEED shop (312 Metropolitan Ave) — kept as the seed's measured distances; every distance is computed by milesBetween (S-42)
  '11211': { hood: 'Williamsburg', miles: 0.6 }, '11222': { hood: 'Greenpoint', miles: 1.4 },
  '11206': { hood: 'East Williamsburg', miles: 1.5 }, '11237': { hood: 'Bushwick', miles: 2.3 },
  '11201': { hood: 'Brooklyn Heights', miles: 3.9 },   // the "zip outside" toggle
  '11249': { hood: 'Williamsburg', miles: 0.9 },       // Study-1 C5: Williamsburg's second zip (Amara's seed neighborhoods)
};
/** Study-1 C5: the five boroughs, picker order. */
export const BOROUGHS = [
  { id: 'manhattan', name: 'Manhattan' }, { id: 'brooklyn', name: 'Brooklyn' }, { id: 'queens', name: 'Queens' },
  { id: 'bronx', name: 'Bronx' }, { id: 'staten-island', name: 'Staten Island' },
];
/** Study-1 C5: mock neighborhoods a tailor picks for home visits — `home.hoods` (ids) is the source of truth, `home.zips` is derived
    from their `zips`. `tile` = the cell in that borough's SVG tile map (x = column, y = row, from 0). Mock geography, not real bounds. */
export const NEIGHBORHOODS = [
  { id: 'upper-west-side', name: 'Upper West Side', borough: 'manhattan', zips: ['10024', '10025'], tile: { x: 0, y: 0 } },
  { id: 'upper-east-side', name: 'Upper East Side', borough: 'manhattan', zips: ['10021', '10028'], tile: { x: 1, y: 0 } },
  { id: 'midtown', name: 'Midtown', borough: 'manhattan', zips: ['10018', '10019'], tile: { x: 0, y: 1 } },
  { id: 'chelsea', name: 'Chelsea', borough: 'manhattan', zips: ['10001', '10011'], tile: { x: 0, y: 2 } },
  { id: 'west-village', name: 'West Village', borough: 'manhattan', zips: ['10014'], tile: { x: 0, y: 3 } },
  { id: 'east-village', name: 'East Village', borough: 'manhattan', zips: ['10003', '10009'], tile: { x: 1, y: 3 } },
  { id: 'soho', name: 'SoHo', borough: 'manhattan', zips: ['10012', '10013'], tile: { x: 1, y: 4 } },
  { id: 'tribeca', name: 'Tribeca', borough: 'manhattan', zips: ['10007'], tile: { x: 0, y: 4 } },
  { id: 'greenpoint', name: 'Greenpoint', borough: 'brooklyn', zips: ['11222'], tile: { x: 1, y: 0 } },
  { id: 'williamsburg', name: 'Williamsburg', borough: 'brooklyn', zips: ['11211', '11249'], tile: { x: 0, y: 1 } },
  { id: 'east-williamsburg', name: 'East Williamsburg', borough: 'brooklyn', zips: ['11206'], tile: { x: 1, y: 1 } },
  { id: 'bushwick', name: 'Bushwick', borough: 'brooklyn', zips: ['11237'], tile: { x: 2, y: 1 } },
  { id: 'brooklyn-heights', name: 'Brooklyn Heights', borough: 'brooklyn', zips: ['11201'], tile: { x: 0, y: 2 } },
  { id: 'fort-greene', name: 'Fort Greene', borough: 'brooklyn', zips: ['11205'], tile: { x: 1, y: 2 } },
  { id: 'bed-stuy', name: 'Bed-Stuy', borough: 'brooklyn', zips: ['11216', '11221'], tile: { x: 2, y: 2 } },
  { id: 'park-slope', name: 'Park Slope', borough: 'brooklyn', zips: ['11215'], tile: { x: 1, y: 3 } },
  { id: 'astoria', name: 'Astoria', borough: 'queens', zips: ['11102', '11105'], tile: { x: 0, y: 0 } },
  { id: 'long-island-city', name: 'Long Island City', borough: 'queens', zips: ['11101'], tile: { x: 0, y: 1 } },
  { id: 'sunnyside', name: 'Sunnyside', borough: 'queens', zips: ['11104'], tile: { x: 1, y: 1 } },
  { id: 'jackson-heights', name: 'Jackson Heights', borough: 'queens', zips: ['11372'], tile: { x: 2, y: 1 } },
  { id: 'ridgewood', name: 'Ridgewood', borough: 'queens', zips: ['11385'], tile: { x: 1, y: 2 } },
  { id: 'forest-hills', name: 'Forest Hills', borough: 'queens', zips: ['11375'], tile: { x: 2, y: 2 } },
  { id: 'riverdale', name: 'Riverdale', borough: 'bronx', zips: ['10471'], tile: { x: 0, y: 0 } },
  { id: 'fordham', name: 'Fordham', borough: 'bronx', zips: ['10458'], tile: { x: 1, y: 1 } },
  { id: 'parkchester', name: 'Parkchester', borough: 'bronx', zips: ['10462'], tile: { x: 2, y: 1 } },
  { id: 'mott-haven', name: 'Mott Haven', borough: 'bronx', zips: ['10454'], tile: { x: 1, y: 2 } },
  { id: 'st-george', name: 'St. George', borough: 'staten-island', zips: ['10301'], tile: { x: 1, y: 0 } },
  { id: 'stapleton', name: 'Stapleton', borough: 'staten-island', zips: ['10304'], tile: { x: 1, y: 1 } },
  { id: 'great-kills', name: 'Great Kills', borough: 'staten-island', zips: ['10308'], tile: { x: 0, y: 2 } },
  { id: 'tottenville', name: 'Tottenville', borough: 'staten-island', zips: ['10307'], tile: { x: 0, y: 3 } },
];
/** Study-1 C5: neighborhood lookups. `zipsForHoods` = the zips a list of neighborhood ids covers (picked order, each once) —
    the ONE derivation of `home.zips` from `home.hoods`; `hoodNames` = their names in the same order. */
export const HOOD_BY_ID = Object.fromEntries(NEIGHBORHOODS.map((n) => [n.id, n]));
export const zipsForHoods = (ids = []) => [...new Set((ids ?? []).flatMap((id) => HOOD_BY_ID[id]?.zips ?? []))];
export const hoodNames = (ids = []) => (ids ?? []).map((id) => HOOD_BY_ID[id]?.name).filter(Boolean);
/* ---------- S-42 (D-357): mock geocoding. PROTOTYPE DATA SOURCE (production: address autocomplete + a geocoder) ----------
   Every ZIP Taily serves has a point on a flat mile grid (x east, y north; the origin is the seed shop, 312 Metropolitan Ave). An address
   is geocoded to its street's point when the street is one we know, else its ZIP's point. Distances are straight-line miles to 0.1, so
   the seed reads exactly as ZIP_INFO measured it (0.6 mi for Sarah in 11211). A ZIP not on the grid is outside Taily: "Taily isn't in that
   area yet." */
export const ZIP_XY = {
  /* Brooklyn — the ZIP_INFO six sit at their measured distance from the seed shop */
  '11211': [0.36, -0.48], '11249': [-0.72, -0.54], '11222': [0.29, 1.37], '11206': [0.9, -1.2], '11237': [1.84, -1.38], '11201': [-3.12, -2.34],
  '11205': [-1.2, -2.0], '11216': [0.3, -3.1], '11221': [1.3, -2.6], '11215': [-2.6, -4.4],
  /* Manhattan */
  '10024': [-3.6, 6.6], '10025': [-3.3, 7.4], '10021': [-1.8, 4.6], '10028': [-1.6, 5.4], '10018': [-3.3, 3.0], '10019': [-3.6, 3.7],
  '10001': [-3.7, 2.3], '10011': [-3.8, 1.6], '10014': [-4.1, 0.6], '10003': [-2.6, 0.9], '10009': [-1.9, 0.6], '10012': [-3.2, 0.2],
  '10013': [-3.7, -0.4], '10007': [-4.0, -1.0],
  /* Queens */
  '11102': [0.6, 5.2], '11105': [1.0, 5.9], '11101': [-0.4, 3.0], '11104': [1.4, 3.1], '11372': [3.4, 3.9], '11385': [2.6, -0.6], '11375': [5.6, 1.9],
  /* Bronx */
  '10471': [-2.6, 13.6], '10458': [0.4, 10.6], '10462': [2.6, 9.4], '10454': [-0.9, 7.8],
  /* Staten Island */
  '10301': [-7.6, -7.4], '10304': [-7.4, -8.6], '10308': [-11.2, -13.0], '10307': [-14.2, -15.6],
};
/** Streets the mock geocoder knows (the seed shop); any other address falls back to its ZIP's point. */
const STREET_XY = { '312 metropolitan ave|11211': [0, 0] };
const BOROUGH_CITY = { manhattan: 'New York', brooklyn: 'Brooklyn', queens: 'Queens', bronx: 'Bronx', 'staten-island': 'Staten Island' };
/** A served ZIP → `{ hood, borough, city, state }` (the city by borough: 10013 → SoHo, New York, NY); null outside Taily. */
export function placeForZip(zip) {
  const z = String(zip ?? '').trim();
  if (!ZIP_XY[z]) return null;
  const n = NEIGHBORHOODS.find((x) => x.zips.includes(z));
  const borough = n?.borough ?? 'brooklyn';
  return { hood: n?.name ?? ZIP_INFO[z]?.hood ?? '', borough, city: BOROUGH_CITY[borough] ?? SHOP_CITY.city, state: 'NY' };
}
/** `{ street, zip }` → its grid point, or null when the ZIP is outside Taily. */
export function geocode({ street = '', zip = '' } = {}) {
  const key = `${String(street ?? '').trim().toLowerCase()}|${String(zip ?? '').trim()}`;
  return STREET_XY[key] ?? ZIP_XY[String(zip ?? '').trim()] ?? null;
}
/** Straight-line miles (one decimal) between two points; null when either is unknown. */
export function milesBetween(a, b) {
  if (!a || !b) return null;
  return Math.round(Math.hypot(a[0] - b[0], a[1] - b[1]) * 10) / 10;
}
export const REVIEW_LIMITS = { TEXT_MAX: 500, PHOTOS_MAX: 3 };                       // D-107
export const HANDOFF_CODE_LEN = 4;                                                  // Study-1 A3: the customer's pickup code, digits
export const NOTES_LIMITS = { TEXT_MAX: 500, PHOTOS_MAX: 4 };                       // Study-1 B2: one private tailor note
export const STAR_WORDS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];        // index = stars
export const TAILOR_LIMITS = { BIO_MAX: 300, CARD_LINE_MAX: 110, WORK_PHOTOS_MAX: 6, PRICE_MAX: 999, FEE_MAX: 200, RUSH_MAX: 200, NOTE_MAX: 200, YEARS_MIN: 5, YEARS_MAX: 70, COURIER_NOTE_MAX: 140 };  // whole dollars (D-58, D-59); YEARS_MIN = K-15's onboarding minimum (D-18)
export const RUSH_TIERS = [1, 2, 3];                       // days after the visit; 4+ days is always free (D-64)
export const SHOP_CITY = { city: 'Brooklyn', state: 'NY' }; // prototype geography (D-60) — the fallback only; an address's city comes from its ZIP (placeForZip, S-42)
export const DEFAULT_WEEK = {                              // a new tailor's starting hours (D-62); no overlap
  shop: { tue: ['10:00', '18:00'], wed: ['10:00', '18:00'], thu: ['10:00', '18:00'], fri: ['10:00', '18:00'], sat: ['10:00', '18:00'] },
  home: { mon: ['18:00', '20:00'], thu: ['18:00', '20:00'] } };
export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];   // availability day order
export const DAY_LABEL = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
export const ROUTING_BANKS = { '021000021': 'Chase', '026009593': 'Bank of America', '021000089': 'Citibank', '026013673': 'TD Bank', '021000322': 'Bank of America' };   // mock routing table (D-63)
export const SHOP_RADIUS_MI = 5;                        // shop visits list shops within this distance (D-19)

const ALL = Object.keys(GARMENT_TYPES);
/** Service catalog: id → { label, garments: [GARMENT_TYPES keys], base }. K-33: no bridal service (removed from the catalog).
    `base` = the typical NYC price in whole dollars (Study-1 C3: the recommended range is base ± MONEY.PRICE_RANGE_SPREAD, rounded to
    MONEY.PRICE_ROUND, via money.js) — equal to Amara's seed price for each of the ten. */
/* K-39: PROTOTYPE DATA SOURCE. The service catalog and `base` prices are hard-coded for the prototype; in production they come
   from a live database (market price data per service, per city), never app constants. */
export const SERVICES = {
  'hem-pants': { label: 'Hem pants', garments: ['Suit Pant', 'Pants / Jeans'], base: 25 },
  taper: { label: 'Taper legs', garments: ['Suit Pant', 'Pants / Jeans'], base: 40 },
  waist: { label: 'Take in or let out waist', garments: ['Suit Pant', 'Pants / Jeans', 'Skirt'], base: 35 },
  sleeves: { label: 'Shorten sleeves', garments: ['Suit Jacket', 'Jacket', 'Shirt / Blouse'], base: 45 },
  'jacket-sides': { label: 'Take in jacket sides', garments: ['Suit Jacket', 'Jacket'], base: 55 },
  'shirt-take-in': { label: 'Take in shirt', garments: ['Shirt / Blouse'], base: 30 },
  'dress-hem': { label: 'Hem dress or skirt', garments: ['Formal Dress', 'Dress / Jumpsuit', 'Skirt'], base: 50 },
  'dress-take-in': { label: 'Take in dress', garments: ['Formal Dress', 'Dress / Jumpsuit'], base: 65 },
  zipper: { label: 'Replace zipper', garments: ['Suit Pant', 'Pants / Jeans', 'Skirt', 'Dress / Jumpsuit', 'Jacket'], base: 30 },
  repair: { label: 'Repair or patch', garments: ALL, base: 20 },
};
/** Service ids that apply to a garment type, catalog order. */
export const servicesForType = (type) => Object.keys(SERVICES).filter((id) => SERVICES[id].garments.includes(type));

export const TAILORS = [
  {
    id: 'amara', name: 'Amara Reyes', shopName: 'Reyes Tailoring', initials: 'AR', photo: true, workPhotos: 4, years: 12,
    phone: '(347) 555-0118', live: true, takingRequests: true,
    cardLine: 'I’ve fitted suits and dresses in Williamsburg since 2014. I pin every fitting myself, at my shop or yours.',   // K-19: the list-card line, ≤ CARD_LINE_MAX
    bio: 'Tailoring in Williamsburg since 2014. I fit at my shop on Metropolitan Ave or at your place, and I show you every pin before I cut.',
    badges: TRUST_BADGES,
    /* DG-4 (D-350): her checks, all passed — the Verified check is derived from them (state.js isVerified), never a stored flag.
       `idDoc` = a photo ID on file (matched to her profile photo); the background check ran with her consent. */
    idDoc: true,
    verify: { id: { state: 'verified', at: '2026-01-12T10:00' }, background: { state: 'verified', consentAt: '2026-01-12T10:20', at: '2026-01-14T09:00' } },
    submitted: true, submittedAt: '2026-01-12T10:30',
    shop: { enabled: true, street: '312 Metropolitan Ave', unit: '', city: 'Brooklyn', state: 'NY', zip: '11211', hood: 'Williamsburg' },
    collect: { street: '', unit: '', zip: '', notes: '' },   // B-15: where the courier collects without a shop (private); she has a shop
    home: { enabled: true, zips: ['11211', '11249', '11222', '11206', '11237'], fee: 35, hoods: ['williamsburg', 'greenpoint', 'east-williamsburg', 'bushwick'] },
    prices: {                                           // dollars; 10 services
      'hem-pants': 25, taper: 40, waist: 35, sleeves: 45, 'jacket-sides': 55, 'shirt-take-in': 30,
      'dress-hem': 50, 'dress-take-in': 65, zipper: 30, repair: 20,
    },
    rush: [{ days: 1, fee: 40 }, { days: 2, fee: 25 }, { days: 3, fee: 15 }],   // 4+ days free
    returns: { pickup: true, courier: true },
    availability: {                                     // no overlap between the two
      shop: { tue: [['10:00', '18:00']], wed: [['10:00', '18:00']], thu: [['10:00', '16:00']], fri: [['10:00', '18:00']], sat: [['13:00', '17:00']] },
      home: { mon: [['17:00', '20:00']], thu: [['17:00', '20:00']], sat: [['09:00', '12:00']] },
    },
    rating: { avg: 4.9, count: 37 },
    reviews: [                                          // newest first; shown on the profile with the average + count
      { id: 'r1', name: 'Priya S.', initials: 'PS', stars: 5, date: '2026-09-28', photos: 0, text: 'Hemmed three pairs of work pants in two days. She pinned everything at my place so the length was right with my shoes.' },
      { id: 'r2', name: 'Marcus T.', initials: 'MT', stars: 5, date: '2026-09-14', photos: 1, photoType: 'Suit Jacket', text: 'Took in a suit jacket I had given up on. It fits like it was made for me.' },
      { id: 'r3', name: 'Jenna L.', initials: 'JL', stars: 4, date: '2026-08-30', photos: 0, text: 'Great work on a dress hem. The return took a day longer than planned, but she messaged ahead.' },
      { id: 'r4', name: 'Dev R.', initials: 'DR', stars: 5, date: '2026-08-11', photos: 0, text: 'Fast zipper replacement at a fair price. Easy to book.' },
      /* S-26 (pre-MVP B2): the rest of the written reviews for the all-reviews page; the other 25 of the 37 are star ratings only */
      { id: 'r5', name: 'Sofia M.', initials: 'SM', stars: 5, date: '2026-07-30', photos: 0, text: 'She shortened the sleeves on my wool coat and you can’t tell they were ever touched.' },
      { id: 'r6', name: 'Andre K.', initials: 'AK', stars: 5, date: '2026-07-18', photos: 0, text: 'Booked a home visit after work. She was on time, pinned two suits in half an hour, and they came back early.' },
      { id: 'r7', name: 'Hannah P.', initials: 'HP', stars: 5, date: '2026-07-02', photos: 1, photoType: 'Formal Dress', text: 'Bridesmaid dress taken in at the waist. It fit perfectly on the day.' },
      { id: 'r8', name: 'Luis G.', initials: 'LG', stars: 4, date: '2026-06-21', photos: 0, text: 'Good hems on my jeans, and she kept the original wash. Pickup was quick.' },
      { id: 'r9', name: 'Grace W.', initials: 'GW', stars: 5, date: '2026-06-09', photos: 0, text: 'Clear prices before I booked, and the final order matched them.' },
      { id: 'r10', name: 'Omar F.', initials: 'OF', stars: 5, date: '2026-05-27', photos: 0, text: 'Fixed a torn lining I thought was a lost cause.' },
      { id: 'r11', name: 'Mei L.', initials: 'ML', stars: 5, date: '2026-05-12', photos: 0, text: 'Took in three shirts so they finally fit at the shoulders. Friendly and quick.' },
      { id: 'r12', name: 'Tom B.', initials: 'TB', stars: 4, date: '2026-04-30', photos: 0, text: 'Solid work on a jacket. The shop was a little hard to find the first time.' },
    ],
    /* D-06 (D-351): set up through the payments partner's hosted onboarding (Stripe Connect Express) — identity, W-9 and bank live there;
       Taily keeps the bank name + last 4 and the statuses. status: not-started | verifying | action-needed | verified | paused */
    payouts: { bank: 'Chase', last4: '6789', holder: 'Amara Reyes', routing: '021000021', status: 'verified', identity: 'verified', tax: 'verified', taxAt: '2026-01-12T10:28', issue: null },
    onboarding: { profile: true, services: true, where: true, returns: true, availability: true, payouts: true },
  },
];

/** Saved-address labels (M5, D-133) and chat limits (D-131), payout kind words (D-136). */
export const ADDRESS_LABELS = ['Home', 'Work', 'Other'];
/** pre-MVP B2 (S-27): her note for the tailor on a request, and the access notes on an address (buzzer, gate code) — both optional. */
export const BOOKING_LIMITS = { NOTE_MAX: 200, ACCESS_MAX: 140 };
/** DG-3 A (pre-MVP B2): the record a deleted customer account leaves behind — signed out, nothing personal; past orders stay with the old id. */
export const BLANK_CUSTOMER = { id: 'customer-new', first: '', last: '', initials: '', phone: '', email: '', addresses: [], address: null, cards: [], applePay: false };
export const CHAT_LIMITS = { PHOTOS_MAX: 3 };
/** K-52 (D-421): the one Taily admin (Kevin, K-48.1). PROTOTYPE: the address is a placeholder; production signs in through the real identity
    provider with a code by email and an authenticator app (the second factor). A backup admin (K-53 Q10) is a second account like this. */
export const ADMIN_ACCOUNT = Object.freeze({ email: 'kevin@taily.app', name: 'Kevin' });
/** K-02 (D-176): fitting documentation. Up to 4 Before and 4 Pinned photos per garment, a comment of up to 200 characters. */
export const FITTING_LIMITS = { PHOTOS_MAX: 4, COMMENT_MAX: 200 };
export const DOC_KINDS = ['before', 'pinned'];
export const DOC_LABEL = { before: 'Before', pinned: 'Pinned' };
export const PAYOUT_KIND_LABEL = { job: 'Job', 'kept-deposit': 'Late cancellation', 'no-show': 'No-show' };

const HOME_FIELDS = { street: '145 N 7th St', unit: '2R', city: 'Brooklyn', state: 'NY', zip: '11211' };
const HOME_ADDRESS = { id: 'home', label: 'Home', ...HOME_FIELDS, default: true };
export const CUSTOMER = {
  id: 'sarah', first: 'Sarah', last: 'Chen', initials: 'SC', phone: '(718) 555-0142', email: '',   // DG-3 A (pre-MVP B2): no email until she adds one for receipts (sign-up never asked)
  addresses: [HOME_ADDRESS],
  address: { ...HOME_FIELDS },                          // always the default saved address's fields, or null when none (D-133)
  cards: [{ id: 'visa-4242', brand: 'Visa', last4: '4242', exp: '08/28', default: true }],
  applePay: true,
};

/** Sarah's draft job (C1–C2 prefilled). Seed total: services $125.00 + home visit $35.00. */
export const SEED_JOB = {
  garments: [
    { id: 'g1', type: 'Suit Pant', services: ['hem-pants'], photos: 0 },
    { id: 'g2', type: 'Suit Jacket', services: ['sleeves', 'jacket-sides'], photos: 1 },
  ],
  visitType: 'home', zip: '11211', address: { ...CUSTOMER.address }, needBy: '2026-10-23',
  declinedBy: [], hiddenTailors: [],
};

/** A tailor with every section empty — the onboarding flows overwrite `amara` with it (D-20). */
export const BLANK_TAILOR = {
  id: 'amara', name: '', shopName: '', initials: '', photo: null, workPhotos: 0, years: null, cardLine: '', bio: '', phone: '', live: false, takingRequests: true,
  badges: [], idDoc: false,
  verify: { id: { state: 'not-started', at: null }, background: { state: 'not-started', consentAt: null, at: null } },
  submitted: false, submittedAt: null,
  shop: { enabled: false, street: '', unit: '', city: '', state: '', zip: '', hood: '' },
  collect: { street: '', unit: '', zip: '', notes: '' },
  home: { enabled: false, zips: [], fee: 0, hoods: [] },
  prices: {}, rush: [],
  returns: { pickup: false, courier: false },
  availability: { shop: {}, home: {} },
  rating: { avg: 0, count: 0 }, reviews: [],
  payouts: { bank: '', last4: '', holder: '', routing: '', status: 'not-started', identity: 'not-started', tax: 'not-started', taxAt: null, issue: null },
  onboarding: { profile: false, services: false, where: false, returns: false, availability: false, payouts: false },
};
