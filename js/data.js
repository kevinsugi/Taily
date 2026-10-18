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
export const itemsLabel = (n, word = 'Item') => `${n} ${word}${n === 1 ? '' : 's'}`;

export const DEMO_NOW = '2026-10-13T10:00';            // Tue — the frozen demo clock (D-09)
export const MAX_ITEMS = 10;                            // garments per job (D-11)
export const VISIT_MINUTES = { shop: 30, home: 60 };    // slot lengths (D-17); starts on :00 / :30, 9 AM–9 PM
export const DAY_START_MIN = 9 * 60;                    // earliest visit start
export const DAY_END_MIN = 21 * 60;                     // latest visit end
export const SLOT_STEP_MIN = 30;
export const SLOT_HORIZON_DAYS = 28;                    // how far ahead slots are generated when there is no need-by
/** Optional single-choice reasons (D-76). The first entry of each is what driveTo('declined' | 'cant-make-it') passes. */
export const DECLINE_REASONS = ['Fully booked that week', 'Not work I take on', 'Too far for a home visit', 'Can’t finish by the need-by date'];
export const CANT_MAKE_IT_REASONS = ['Family emergency', 'I’m unwell', 'Shop closed unexpectedly', 'Something came up'];
export const VISIT_LABEL = { customer: { home: 'At my place', shop: 'At the shop' }, tailor: { home: 'Home visit', shop: 'Shop visit' } };
export const RETURN_LABEL = { pickup: 'In-store pickup', courier: 'Taily courier' };   // K-37: Home drop-off is not a way back
export const PRIVACY_NOTE = 'Phone numbers and emails stay private on Taily.';
export const ZIP_INFO = {                               // mock geography: neighborhood + miles from the seed shop
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
export const REVIEW_LIMITS = { TEXT_MAX: 500, PHOTOS_MAX: 3 };                       // D-107
export const HANDOFF_CODE_LEN = 4;                                                  // Study-1 A3: the customer's pickup code, digits
export const NOTES_LIMITS = { TEXT_MAX: 500, PHOTOS_MAX: 4 };                       // Study-1 B2: one private tailor note
export const STAR_WORDS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];        // index = stars
export const TAILOR_LIMITS = { BIO_MAX: 300, CARD_LINE_MAX: 110, WORK_PHOTOS_MAX: 6, PRICE_MAX: 999, FEE_MAX: 200, RUSH_MAX: 200, NOTE_MAX: 200 };  // whole dollars (D-58, D-59)
export const RUSH_TIERS = [1, 2, 3];                       // days after the visit; 4+ days is always free (D-64)
export const SHOP_CITY = { city: 'Brooklyn', state: 'NY' }; // prototype geography (D-60)
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
    verified: true, badges: TRUST_BADGES,
    shop: { enabled: true, street: '312 Metropolitan Ave', city: 'Brooklyn', state: 'NY', zip: '11211', hood: 'Williamsburg' },
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
    ],
    payouts: { bank: 'Chase', last4: '6789', holder: 'Amara Reyes', routing: '021000021' },
    onboarding: { profile: true, services: true, where: true, returns: true, availability: true, payouts: true },
  },
];

/** Saved-address labels (M5, D-133) and chat limits (D-131), payout kind words (D-136). */
export const ADDRESS_LABELS = ['Home', 'Work', 'Other'];
export const CHAT_LIMITS = { PHOTOS_MAX: 3 };
/** K-02 (D-176): fitting documentation. Up to 4 Before and 4 Pinned photos per garment, a comment of up to 200 characters. */
export const FITTING_LIMITS = { PHOTOS_MAX: 4, COMMENT_MAX: 200 };
export const DOC_KINDS = ['before', 'pinned'];
export const DOC_LABEL = { before: 'Before', pinned: 'Pinned' };
export const PAYOUT_KIND_LABEL = { job: 'Job', 'kept-deposit': 'Late cancellation', 'no-show': 'No-show' };

const HOME_FIELDS = { street: '145 N 7th St', unit: '2R', city: 'Brooklyn', state: 'NY', zip: '11211' };
const HOME_ADDRESS = { id: 'home', label: 'Home', ...HOME_FIELDS, default: true };
export const CUSTOMER = {
  id: 'sarah', first: 'Sarah', last: 'Chen', initials: 'SC', phone: '(718) 555-0142', email: 'sarah.chen@example.com',
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
  id: 'amara', name: '', shopName: '', initials: '', photo: null, workPhotos: 0, years: 0, cardLine: '', bio: '', phone: '', live: false, takingRequests: true,
  verified: false, badges: [],
  shop: { enabled: false, street: '', city: '', state: '', zip: '', hood: '' },
  home: { enabled: false, zips: [], fee: 0, hoods: [] },
  prices: {}, rush: [],
  returns: { pickup: false, courier: false },
  availability: { shop: {}, home: {} },
  rating: { avg: 0, count: 0 }, reviews: [],
  payouts: { bank: '', last4: '', holder: '', routing: '' },
  onboarding: { profile: false, services: false, where: false, returns: false, availability: false, payouts: false },
};
