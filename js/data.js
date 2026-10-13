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
export const VISIT_LABEL = { customer: { home: 'At my place', shop: 'At the shop' }, tailor: { home: 'Home visit', shop: 'Shop visit' } };
export const RETURN_LABEL = { pickup: 'In-store pickup', dropoff: 'Home drop-off', courier: 'Taily courier' };
export const PRIVACY_NOTE = 'Phone numbers and emails stay private on Taily.';
export const ZIP_INFO = {                               // mock geography: neighborhood + miles from the seed shop
  '11211': { hood: 'Williamsburg', miles: 0.6 }, '11222': { hood: 'Greenpoint', miles: 1.4 },
  '11206': { hood: 'East Williamsburg', miles: 1.5 }, '11237': { hood: 'Bushwick', miles: 2.3 },
  '11201': { hood: 'Brooklyn Heights', miles: 3.9 },   // the "zip outside" toggle
};
export const SHOP_RADIUS_MI = 5;                        // shop visits list shops within this distance (D-19)

const ALL = Object.keys(GARMENT_TYPES);
/** Service catalog: id → { label, garments: [GARMENT_TYPES keys] }. 'bridal' is not offered by the seed tailor. */
export const SERVICES = {
  'hem-pants': { label: 'Hem pants', garments: ['Suit Pant', 'Pants / Jeans'] },
  taper: { label: 'Taper legs', garments: ['Suit Pant', 'Pants / Jeans'] },
  waist: { label: 'Take in or let out waist', garments: ['Suit Pant', 'Pants / Jeans', 'Skirt'] },
  sleeves: { label: 'Shorten sleeves', garments: ['Suit Jacket', 'Jacket', 'Shirt / Blouse'] },
  'jacket-sides': { label: 'Take in jacket sides', garments: ['Suit Jacket', 'Jacket'] },
  'shirt-take-in': { label: 'Take in shirt', garments: ['Shirt / Blouse'] },
  'dress-hem': { label: 'Hem dress or skirt', garments: ['Formal Dress', 'Dress / Jumpsuit', 'Skirt'] },
  'dress-take-in': { label: 'Take in dress', garments: ['Formal Dress', 'Dress / Jumpsuit'] },
  zipper: { label: 'Replace zipper', garments: ['Suit Pant', 'Pants / Jeans', 'Skirt', 'Dress / Jumpsuit', 'Jacket'] },
  repair: { label: 'Repair or patch', garments: ALL },
  bridal: { label: 'Bridal gown alterations', garments: ['Formal Dress'] },
};
/** Service ids that apply to a garment type, catalog order. */
export const servicesForType = (type) => Object.keys(SERVICES).filter((id) => SERVICES[id].garments.includes(type));

export const TAILORS = [
  {
    id: 'amara', name: 'Amara Reyes', shopName: 'Reyes Tailoring', initials: 'AR', photo: null, workPhotos: 4, years: 12,
    bio: 'Tailoring in Williamsburg since 2014. I fit at my shop on Metropolitan Ave or at your place, and I show you every pin before I cut.',
    verified: true, badges: TRUST_BADGES,
    shop: { enabled: true, street: '312 Metropolitan Ave', city: 'Brooklyn', state: 'NY', zip: '11211', hood: 'Williamsburg' },
    home: { enabled: true, zips: ['11211', '11222', '11206', '11237'], fee: 35 },
    prices: {                                           // dollars; 10 services
      'hem-pants': 25, taper: 40, waist: 35, sleeves: 45, 'jacket-sides': 55, 'shirt-take-in': 30,
      'dress-hem': 50, 'dress-take-in': 65, zipper: 30, repair: 20,
    },
    rush: [{ days: 1, fee: 40 }, { days: 2, fee: 25 }, { days: 3, fee: 15 }],   // 4+ days free
    returns: { pickup: true, dropoff: true, courier: true },
    availability: {                                     // no overlap between the two
      shop: { tue: [['10:00', '18:00']], wed: [['10:00', '18:00']], thu: [['10:00', '16:00']], fri: [['10:00', '18:00']], sat: [['13:00', '17:00']] },
      home: { mon: [['17:00', '20:00']], thu: [['17:00', '20:00']], sat: [['09:00', '12:00']] },
    },
    rating: { avg: 4.9, count: 37 },
    reviews: [                                          // newest first; shown on the profile with the average + count
      { id: 'r1', name: 'Priya S.', initials: 'PS', stars: 5, date: '2026-09-28', photos: 0, text: 'Hemmed three pairs of work pants in two days. She pinned everything at my place so the length was right with my shoes.' },
      { id: 'r2', name: 'Marcus T.', initials: 'MT', stars: 5, date: '2026-09-14', photos: 1, text: 'Took in a suit jacket I had given up on. It fits like it was made for me.' },
      { id: 'r3', name: 'Jenna L.', initials: 'JL', stars: 4, date: '2026-08-30', photos: 0, text: 'Great work on a dress hem. The return took a day longer than planned, but she messaged ahead.' },
      { id: 'r4', name: 'Dev R.', initials: 'DR', stars: 5, date: '2026-08-11', photos: 0, text: 'Fast zipper replacement at a fair price. Easy to book.' },
    ],
    payouts: { bank: 'Chase', last4: '6789', holder: 'Amara Reyes' },
    onboarding: { profile: true, services: true, where: true, returns: true, availability: true, payouts: true },
  },
];

export const CUSTOMER = {
  id: 'sarah', first: 'Sarah', last: 'Chen', initials: 'SC', phone: '(718) 555-0142', email: 'sarah.chen@example.com',
  address: { street: '145 N 7th St', unit: '2R', city: 'Brooklyn', state: 'NY', zip: '11211' },
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
  id: 'amara', name: '', shopName: '', initials: '', photo: null, workPhotos: 0, years: 0, bio: '',
  verified: false, badges: [],
  shop: { enabled: false, street: '', city: '', state: '', zip: '', hood: '' },
  home: { enabled: false, zips: [], fee: 0 },
  prices: {}, rush: [],
  returns: { pickup: false, dropoff: false, courier: false },
  availability: { shop: {}, home: {} },
  rating: { avg: 0, count: 0 }, reviews: [],
  payouts: { bank: '', last4: '', holder: '' },
  onboarding: { profile: false, services: false, where: false, returns: false, availability: false, payouts: false },
};
