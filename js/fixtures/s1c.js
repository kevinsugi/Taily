/* ============================================================
   Study-1 WS-C Test-flows entries — onboarding: card line, about, price help, visit fee, neighborhoods (C1–C5).
   One `FLOWS_<screen_id>` array per screen (e.g. `export const FLOWS_c_booking = [ … ]`),
   same shape as js/fixtures/m#.js; flows.js concatenates every FLOWS_* export.
   Entry shape: see docs/v5/CONTEXT.md (FLOWS / EXPECT contract). The re-baselined primaries
   (to-profile, to-services, to-where, c-tailor, c-pay) stay in m1.js / m2.js with updated expects.
   ============================================================ */
import { AMARA } from './money-scenarios.js';
import { onboardTo } from './common.js';
import { fmt, priceRange } from '../money.js';

/** C2: Kevin's 110-character test line (copy deck §5). */
export const CARD_LINE_110 = 'Savile Row trained. Suits, shirts and eveningwear for 20 years. I pin every fitting myself, studio or at home.';
/** C2: a paste that runs past the limit — the field keeps the first 110 characters. */
const PASTED = `${CARD_LINE_110} Book a fitting any weekday evening.`;
const profileDraft = (patch = {}) => ({ name: AMARA.name, shopName: AMARA.shopName, cardLine: '', bio: '', photo: true, workPhotos: 0, ...patch });
const range = (id) => { const r = priceRange(id); return `Most NYC tailors charge ${fmt(r.low)}–${fmt(r.high)}.`; };

export const FLOWS_to_profile = [
  { key: 'to-profile--card-line-max', screen: 'to-profile', group: 'S1 · Onboarding', title: 'Profile — card line at 110',
    note: 'C2: a full 110-character line: typing stops, the counter and the ring turn red, the field stays valid (Next works)',
    setup: (S) => { onboardTo('profile'); S.state.ui['to-profile'] = { draft: profileDraft({ cardLine: CARD_LINE_110, bio: AMARA.bio }) }; },
    expect: { has: ['110 / 110', CARD_LINE_110], not: ['Keep it to 110 characters', 'Trimmed to 110 characters.'], sel: '.text-area--full #cardLine[maxlength="110"]:not([aria-invalid])', also: ['#cardLine-count.text-area__count--over', '.customer-preview--sticky .tailor-row__line'] } },
  { key: 'to-profile--card-line-trimmed', screen: 'to-profile', group: 'S1 · Onboarding', title: 'Profile — pasted line trimmed',
    note: 'C2: a 145-character paste into the empty card line (through the real paste handler) is cut to 110 with "Trimmed to 110 characters."',
    setup: (S) => { onboardTo('profile'); S.state.ui['to-profile'] = { draft: profileDraft({ bio: AMARA.bio }), paste: PASTED }; },
    expect: { has: ['Trimmed to 110 characters.', '110 / 110', CARD_LINE_110], not: 'Book a fitting any weekday evening', sel: '#cardLine-notice', also: ['.text-area--full'] } },
  { key: 'to-profile--about', screen: 'to-profile', group: 'S1 · Onboarding', title: 'Profile — About filled',
    note: 'C1: card line and the full About typed; the sticky preview shows the card line, About stays on the profile',
    setup: (S) => { onboardTo('profile'); S.state.ui['to-profile'] = { draft: profileDraft({ cardLine: AMARA.cardLine, bio: AMARA.bio }) }; },
    expect: { has: ['About — the full bio on your profile', `${[...AMARA.bio].length} / 300`, AMARA.cardLine], sel: '#bio:not(:placeholder-shown)', also: ['.customer-preview--sticky'] } },
];

export const FLOWS_c_tailors = [
  { key: 'c-tailors--card-line-max', screen: 'c-tailors', group: 'S1 · Onboarding', title: 'Tailors near you — 110-character card line',
    note: 'C2 fit check: Amara saved a full 110-character card line; the list card at 390',
    setup: (S) => { S.T.setTailorSection('profile', { cardLine: CARD_LINE_110 }); },
    expect: { has: [CARD_LINE_110, 'Est.'], sel: '.tailor-row__line' } },
];

export const FLOWS_to_services = [
  { key: 'to-services--recommended', screen: 'to-services', group: 'S1 · Onboarding', title: 'Services — recommended prices',
    note: 'C3: four ticked, Hem pants typed at $28, then Use recommended prices: the three empty ones fill with the midpoint, $28 stays',
    setup: (S) => { onboardTo('services'); S.state.ui['to-services'] = { draft: { prices: { 'hem-pants': 28, taper: null, sleeves: null, repair: null } } }; },
    click: ['[data-act="recommend"]'],
    expect: { has: ['4 selected', range('sleeves')], sel: '#price-sleeves[value="45"]', also: ['#price-hem-pants[value="28"]', '#price-taper[value="40"]', '#price-repair[value="20"]', '.toast'] } },
  { key: 'to-services--recommended-none', screen: 'to-services', group: 'S1 · Onboarding', title: 'Services — recommended prices, nothing ticked',
    note: 'C3: nothing ticked: Use recommended prices is off and says why; every row shows its NYC range',
    setup: () => { onboardTo('services'); },
    expect: { has: ['Use recommended prices', 'Tick the services you offer first.', range('hem-pants'), range('dress-take-in')], not: 'Bridal', sel: '[data-act="recommend"][disabled]' } },
];

/* C5 · the seed's shop + home settings as a typed draft */
const WHERE = (hoods) => ({ shop: { enabled: true, street: AMARA.shop.street, zip: AMARA.shop.zip }, home: { enabled: true, hoods, fee: AMARA.home.fee } });
export const FLOWS_to_where = [
  { key: 'to-where--hoods', screen: 'to-where', group: 'S1 · Onboarding', title: 'Where you work — picking neighborhoods',
    note: 'C5: a new tailor with Williamsburg picked taps Greenpoint: two Brooklyn chips on',
    setup: (S) => { onboardTo('where'); S.state.ui['to-where'] = { draft: WHERE(['williamsburg']) }; },
    click: ['[data-act="hood"][data-id="greenpoint"]'],
    expect: { has: ['Brooklyn', '2 selected'], not: 'neighborhoods highlighted', sel: '[data-act="hood"][data-id="greenpoint"][aria-pressed="true"]', also: ['[data-act="hood"][data-id="williamsburg"][aria-pressed="true"]'] } },
  { key: 'to-where--hoods-borough', screen: 'to-where', group: 'S1 · Onboarding', title: 'Where you work — another borough',
    note: 'C5: Amara opens Manhattan and adds SoHo and TriBeCa; Brooklyn keeps its three',
    setup: (S) => { onboardTo('where'); S.state.ui['to-where'] = { draft: WHERE([...AMARA.home.hoods]) }; },
    click: ['[data-act="borough"][data-id="manhattan"]', '[data-act="hood"][data-id="soho"]', '[data-act="hood"][data-id="tribeca"]'],
    expect: { has: ['Manhattan', '2 selected', '3 selected'], sel: '[data-act="borough"][data-id="manhattan"][aria-expanded="true"]', also: ['[data-act="hood"][data-id="soho"][aria-pressed="true"]', '[data-act="hood"][data-id="tribeca"][aria-pressed="true"]'] } },
  { key: 'to-where--hoods-none', screen: 'to-where', group: 'S1 · Onboarding', title: 'Where you work — no neighborhood',
    note: 'C5: home visits on, nothing picked, then Next',
    setup: (S) => { onboardTo('where'); S.state.ui['to-where'] = { draft: WHERE([]) }; },
    click: ['[data-act="next"]'],
    expect: { has: ['Pick at least one neighborhood.'], not: 'Step 4 of 6', sel: '.hood-picker--error' } },
];
