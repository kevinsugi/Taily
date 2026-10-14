/* ============================================================
   Component gallery — every v5 component in each state, side by side,
   on the seed data (Amara's row, Sarah's $160.00 / $16.00 / $144.00
   breakdown, the tailor's −$12.50 / $147.50). One builder, two homes:
   the `sys-components` screen (the visual baseline for the component
   layer) and the standalone /components.html page.
   ============================================================ */

import * as C from './components.js';
import { scheduler, slotColumns, whenNote } from './scheduler.js';
import { TAILORS, DEMO_NOW, FITTING_LIMITS } from './data.js';
import { FITTING_COMMENTS } from './fixtures/common.js';
import { POLICY } from './money-config.js';
import { reauthHtml, pushPromptHtml, pushBannerHtml, systemBanner } from './system.js';
import { quote, fmt, fmtExact, cents, payoutFor } from './money.js';
import { ICON_CARD, ICON_CAMERA, META_ICONS, ph as phIcon } from './icons.js';
import { PH } from './phosphor.js';
import { SCENARIOS, AMARA } from './fixtures/money-scenarios.js';

/** Specimen garment id -> { type, docs } for the gallery's photo viewer (K-02). */
const GALLERY_DOCS = {};

/** The gallery's HTML (a string of labelled blocks). */
export function galleryHtml() {
  const amara = TAILORS[0];
  /* Seed numbers: Sarah's job with Amara (the model's golden scenarios), in cents */
  const lines = [{ cents: 12500 }];
  const seed = quote({ lines, homeFee: 3500 });                              // $160.00 / $16.00 / $144.00
  const rush = { ...quote({ lines, homeFee: 3500, rush: 4000 }), rushDays: 1 };
  const withCourier = quote({ lines, homeFee: 3500, courier: 1045 });
  const NOW = DEMO_NOW;

  const s = [];
  const h2 = (t) => s.push(`<h2>${t}</h2>`);
  const v  = (name) => s.push(`<p class="vname">${name}</p>`);
  const col = (...items) => s.push(`<div class="col">${items.join('')}</div>`);
  const row = (...items) => s.push(`<div class="row">${items.join('')}</div>`);
  const card = (inner) => `<div class="info-card">${inner}</div>`;

  /* ---------------- V6 — the redesign's reference group (docs/v6/V6-spec.md §A) ---------------- */
  h2('V6 · palette');
  const sw = (name, token, ink = 'var(--ink)') => `<span class="gal-swatch"><span class="gal-swatch__chip" style="background:var(${token});color:${ink}">Aa</span><span class="gal-swatch__name">${name}</span></span>`;
  v('canvas · surface · sunk · ink · text · muted · faint · border');
  row(sw('canvas', '--canvas'), sw('surface', '--surface'), sw('sunk', '--surface-sunk'), sw('ink', '--ink', 'var(--surface)'), sw('text', '--text', 'var(--surface)'), sw('muted', '--text-muted', 'var(--surface)'), sw('faint', '--text-faint', 'var(--surface)'), sw('border', '--border'));
  v('pastels (the only colour): red · blue · green · yellow · grey');
  row(...['red', 'blue', 'green', 'yellow', 'grey'].map((c) => `<span class="gal-swatch"><span class="gal-swatch__chip" style="background:var(--pastel-${c}-bg);color:var(--pastel-${c}-ink)">Aa</span><span class="gal-swatch__name">${c}</span></span>`));

  h2('V6 · type scale');
  v('Instrument Serif 40 / 32 / 24 · Geist money 32 / 24 · body 16 · label 13 · small 13 · caps 11 · micro 11');
  col(
    '<p class="t-display">Taily display 40</p>', '<p class="t-title">Page title 32</p>', '<p class="t-h2">Modal title 24</p>',
    '<p class="t-money">$147.50</p>', '<p class="t-figure">Thu, Oct 15 · 5:00 PM</p>',
    '<p class="t-body">Body 16 — rows and paragraphs read in Geist.</p>', '<p class="t-label">Label 13, sentence case, muted</p>',
    '<p class="t-small c-muted">Small 13 — captions, helpers and footnotes.</p>', '<p class="t-caps c-muted">Caps 11 — pills and day dividers only</p>', '<p class="t-micro c-muted">Micro 11 — nav labels</p>',
  );

  h2('V6 · status pills + tags');
  v('every statusPill key');
  row(...['new-request', 'suggested', 'action', 'requested', 'awaiting-customer', 'waiting', 'price-change', 'paused', 'confirmed', 'fitting', 'in-progress', 'tailoring', 'returning', 'ready', 'completed', 'bookable', 'declined', 'cancelled', 'withdrawn', 'expired', 'calm'].map((k) => C.statusPill(k)));
  v('tags: blue · red · green · yellow · grey');
  row(C.tag('New', 'blue'), C.tag('Removed', 'grey'), C.tag('Required', 'red'), C.tag('Default', 'grey'), C.tag('Paid', 'green'), C.tag('Soon', 'yellow'));

  h2('V6 · Phosphor Regular icons');
  const icons = (size, cls) => `<div class="gal-icons">${Object.keys(PH).map((n) => `<span class="gal-icon" title="${n}">${phIcon(n, { size, cls })}</span>`).join('')}</div>`;
  v('16 px'); s.push(icons(16, 'icon-16'));
  v('20 px'); s.push(icons(20, 'icon-20'));
  v('22 px (nav)'); s.push(icons(22, 'nav-icon'));

  h2('V6 · avatars (squircle)');
  v('sm 40 · md 56 · lg 80 · muted · add photo');
  row(C.avatar({ initials: 'AR', size: 'sm' }), C.avatar({ initials: 'AR', size: 'md' }), C.avatar({ initials: 'AR', size: 'lg' }), `<span class="appt-row--muted">${C.avatar({ initials: 'SC', size: 'md' })}</span>`, C.avatar({ photo: true, size: 'md' }));

  h2('V6 · buttons');
  v('default · hover (class) · disabled · busy · secondary · danger');
  col(C.cta('Send request'), `<span class="gal-hover">${C.cta('Send request')}</span>`, C.cta('Send request', { disabled: true }), C.cta('Sending', { busy: true, busyLabel: 'Sending…' }), C.cta('Message Amara', { variant: 'secondary' }), C.cta('Cancel booking', { variant: 'danger' }));
  v('small + text links');
  row(C.ctaSmall('Directions', { filled: false }), C.textLink('Reschedule'), C.textLink('Cancel booking', { tone: 'danger' }), C.textLink('Not now', { tone: 'muted' }));

  h2('V6 · card + hover lift');
  v('card · card on hover (class)');
  col('<div class="card"><p class="t-body w-500">A 12 px card, 1 px #EAEAEA rule, 20 px padding.</p><p class="t-small c-muted">No shadow at rest.</p></div>', '<div class="card gal-lift"><p class="t-body w-500">The same card, lifted (hover)</p><p class="t-small c-muted">Shadow under 0.04.</p></div>');

  h2('V6 · inputs');
  v('rest · focus (class) · error');
  col(C.field({ id: 'v6-f1', label: 'Full name', placeholder: 'Sarah Chen' }), `<span class="gal-focus">${C.field({ id: 'v6-f2', label: 'Phone', value: '(718) 555-0123' })}</span>`, C.field({ id: 'v6-f3', label: 'ZIP code', value: '1121', error: 'Enter a 5-digit ZIP code.' }));

  h2('V6 · toggle, check, radio, segmented');
  col(C.toggle({ id: 'v6-t1', label: 'Taking requests', checked: true }), C.toggle({ id: 'v6-t2', label: 'Shop visits' }), C.checkRow({ id: 'v6-c1', label: 'Pickup at the shop', checked: true }), C.checkRow({ id: 'v6-c2', label: 'Home drop-off' }));
  s.push(`<div class="option-demo" role="radiogroup" aria-label="Return">${C.optionRow({ name: 'v6', value: 'a', title: 'Pick up in store', sub: 'Free', checked: true, lead: META_ICONS.bag })}${C.optionRow({ name: 'v6', value: 'b', title: 'Home drop-off', sub: 'Free' })}</div>`);
  col(C.chipGroup({ name: 'v6-seg', label: 'Visit', variant: 'segmented', value: 'home', options: [{ value: 'home', label: 'At my place' }, { value: 'shop', label: 'At the shop' }] }));

  h2('V6 · empty state (offset tile) + stitched dash');
  col(C.emptyState({ title: 'No bookings yet', body: 'When you book a tailor, your visit shows up here.', ctaLabel: 'Book a tailor', ctaAct: 'x', art: 'Suit Jacket' }));
  v('stitched dash above a total');
  col(C.moneyRows([{ label: 'Services', cents: 12500 }, { label: 'Home-visit fee', cents: 3500 }, { label: 'Total', cents: 16000, kind: 'total' }]));

  /* ---------------- kept from v4 ---------------- */
  h2('CTA — 229:5030');
  v('Default · Secondary · disabled');   col(C.cta('Start Booking'), C.cta('Find another tailor', { variant: 'secondary' }), C.cta('Send request', { disabled: true }));
  v('Busy (spinner + busyLabel, aria-busy) · default · secondary');
  col(C.cta('Send code', { busy: true, busyLabel: 'Sending code…' }), C.cta('Sign in', { variant: 'secondary', busy: true, busyLabel: 'Signing in…' }));

  h2('CTA — danger variant (destructive confirm sheets, D-79)');
  v('default · busy · disabled');
  col(C.cta(`Cancel and get ${fmtExact(seed.deposit)} back`, { variant: 'danger' }), C.cta('Declining', { variant: 'danger', busy: true, busyLabel: 'Declining…' }), C.cta('Decline request', { variant: 'danger', disabled: true }));

  h2('CTA_Small — 302:1656');
  row(C.ctaSmall('Message'), C.ctaSmall('Reschedule'));

  h2('Status pills — 312:826 + v5 keys (19)');
  row(...['requested','confirmed','ready','completed','declined','cancelled','new-request','awaiting-customer','tailoring','suggested','fitting','price-change','in-progress','returning','withdrawn','expired','action','bookable','paused'].map((k) => C.statusPill(k)));

  h2('Top nav — customer · tailor');
  v('NAV.customer (Bookings active)');
  s.push(`<div style="position:relative;height:56px;width:390px;margin-inline:-20px">${C.topNav('bookings', C.NAV.customer).replace('<nav class="top-nav"', '<nav class="top-nav" style="top:0"')}</div>`);
  v('NAV.customer · count badges (D-164): Messages 2 unread, Bookings 1 new');
  s.push(`<div style="position:relative;height:56px;width:390px;margin-inline:-20px">${C.topNav('home', C.NAV.customer, { badges: { messages: 2, bookings: 1 } }).replace('<nav class="top-nav"', '<nav class="top-nav" style="top:0"')}</div>`);
  v('NAV.tailor · count badges (D-164): Home 3 new, Messages 1 unread');
  s.push(`<div style="position:relative;height:56px;width:390px;margin-inline:-20px">${C.topNav('shop', C.NAV.tailor, { badges: { home: 3, messages: 1 } }).replace('<nav class="top-nav"', '<nav class="top-nav" style="top:0"')}</div>`);
  v('NAV.tailor (Earnings active)');
  s.push(`<div style="position:relative;height:56px;width:390px;margin-inline:-20px">${C.topNav('earnings', C.NAV.tailor).replace('<nav class="top-nav"', '<nav class="top-nav" style="top:0"')}</div>`);

  h2('Time Chip · Select Time · Filter Pill');
  row(C.timeChip('9–11 AM', { selected: true }), C.timeChip('12–2 PM'), C.selectTime());
  row(C.filterPill('Desc.', 'Label'), C.filterPill('Desc.', 'Label', { open: true, options: ['Option 1','Option 2','Option 3'] }));

  h2('Garment Tile — 252:1235');
  v('Default ×2 · Selected');
  s.push(`<div class="tile-grid">${C.garmentTile('Suit Jacket')}${C.garmentTile('Suit Pant')}${C.garmentTile('Formal Dress', { qty: 1 })}</div>`);
  v('Selected · 3 · 4 · 8');
  s.push(`<div class="tile-grid">${C.garmentTile('Suit Pant', { qty: 3 })}${C.garmentTile('Suit Pant', { qty: 4 })}${C.garmentTile('Pants / Jeans', { qty: 8 })}</div>`);

  h2('Progress Bar — 473:7627');
  ['confirmed','tailoring','ready','complete'].forEach((st) => { v(st); s.push(C.progressBar(st)); });

  h2('Status Hero — 207:2087');
  v('Requested');
  s.push(C.statusHero({ variant: 'requested', title: 'Request sent.', body: 'Amara has 2 hours to reply. Your deposit is held, not charged.' }));
  v('Confirmed');
  s.push(C.statusHero({ variant: 'confirmed', title: 'You’re booked for', titleLine2: 'Thu, Oct 15 at 5:00 PM', body: 'Amara Reyes · At my place · 145 N 7th St' }));

  h2('Summary card · Trust badges · Visit block');
  s.push(C.summaryCard({ initials: 'AR', name: 'Amara Reyes', verified: true, badges: ['ID verified', 'Background check', 'Insured'] }));
  s.push(card(C.visitBlock(['145 N 7th St, 2R', 'Thu, Oct 15 · 5:00 PM', 'Need by: Fri, Oct 23'])));

  h2('Chat Bubble — v4 atom + Timeline + Info rows');
  col(C.bubble('See you Thursday at 5:00.', 'them'), C.bubble('Perfect, thank you!', 'me'));
  s.push(C.timeline([
    { state: 'done', title: 'Request accepted', sub: 'Tue, Oct 13' },
    { state: 'current', title: 'Fitting at your place', sub: 'Thu, Oct 15 · 5:00 PM' },
    { state: 'todo', title: 'Ready for return' },
  ]));
  s.push(C.infoCard([C.metaRow('', '145 N 7th St, 2R — At my place', { icon: 'home' }), C.metaRow('', 'Thu, Oct 15 · 5:00 PM', { icon: 'shop' })].join('')));
  s.push(C.feeRow('$35', 'Home-visit fee', { line: true, caption: 'Amara comes to you' }));

  h2('Modal · Method rows · Link row');
  s.push(`<div class="row"><div class="modal modal--center" style="position:static"><span class="modal__badge">${phIcon('coat-hanger', { size: 24, cls: 'icon-24' })}</span><h2 class="modal__title">Talk it over with Amara</h2><p class="modal__body">Prices are set by the tailor.</p><div class="modal__actions">${C.cta('Sounds good')}</div></div></div>`);
  col(C.methodRow('Apple Pay', 'apple'), C.methodRow('Credit Card', 'card'), C.linkRow('View receipt'));

  h2('Sheet chassis');
  s.push(`<div class="sheet-demo">${C.sheet(C.cta('Done'), { header: 'Sheet' })}</div>`);

  h2('Scheduler · slotColumns (open slots only)');
  const slots = ['2026-10-15T17:00', '2026-10-15T17:30', '2026-10-15T18:30', '2026-10-17T09:00', '2026-10-17T10:30'];
  const cols = slotColumns(slots, '2026-10-15T17:30');
  s.push(`<div class="row">${scheduler({ title: 'Choose a time', sub: 'Open times only', columns: cols, cta: 'Confirm', ctaAct: 'confirm-slot' })}</div>`);
  v('compact wheel · the "when" note (a caps label + the time in sentence case)');
  s.push(`<div class="row">${scheduler({ title: '', columns: cols, note: whenNote('Sarah sees', '2026-10-15T17:30'), cta: '', inline: true, compact: true })}</div>`);
  /* R1-2-C-01: every column is a listbox (Day · Hour · Minute · AM/PM) — Tab focuses it, arrows / Home / End move the pick */
  v('keyboard focus on the Day listbox · rush note (aria-live)');
  const focused = scheduler({ title: '', columns: cols, note: `RUSH FEE ${fmt(rush.rush)} · VISIT 1 DAY BEFORE YOUR NEED-BY`, cta: 'Continue', ctaAct: 'gallery-slot', inline: true })
    .replace('wheel__col wheel__col--scroll"', 'wheel__col wheel__col--scroll wheel__col--focus"');
  s.push(`<div class="row">${focused}</div>`);

  h2('Meta row — line icons (shop · home · bag · truck)');
  col(C.metaRow('', 'Reyes Tailoring, 312 Metropolitan Ave', { icon: 'shop' }), C.metaRow('', 'Comes to you in 11211', { icon: 'home' }),
      C.metaRow('', 'In-store pickup — free', { icon: 'bag' }), C.metaRow('', 'Taily courier — priced when your order is ready', { icon: 'truck' }));

  /* ---------------- v5 ---------------- */
  h2('Avatar — sm 40 · md 56 · lg 80 · photo');
  row(C.avatar({ initials: 'AR', size: 'sm' }), C.avatar({ initials: 'AR', size: 'md' }), C.avatar({ initials: 'AR', size: 'lg' }),
      C.avatar({ initials: 'AR', size: 'md', photo: 'assets/garments/tile-suit-jacket.png' }), C.avatar({ size: 'md', photo: true }), C.avatar({ size: 'lg', photo: true }));

  h2('Tailor Row');
  const trow = { id: 'amara', name: amara.name, initials: amara.initials, verified: true, rating: amara.rating, distanceMi: 0.6, nextOpening: '2026-10-15T17:00' };
  v('default (home visit)');  col(C.tailorRow({ ...trow, quote: seed, visitType: 'home' }));
  v('rush (+ $40 rush fee)'); col(C.tailorRow({ ...trow, quote: rush, visitType: 'home' }));
  v('shop visit');            col(C.tailorRow({ ...trow, quote: quote({ lines }), visitType: 'shop' }));
  v('declined');              col(C.tailorRow({ ...trow, quote: seed, declined: true }));
  v('skeleton');              col(C.skeleton({ kind: 'tailor-row', count: 2 }));

  h2('Price Row');
  s.push(card(C.priceRow({ label: 'Hem pants', cents: 2500 }) + C.priceRow({ label: 'Take in or let out waist', cents: 3500, note: 'Per garment' }) + C.priceRow({ label: 'Bridal gown alterations', muted: true })));

  h2('Stars · Rating summary · Review row');
  v('display 4 · input 3 (tap to try)'); row(C.stars({ value: 4 }), C.stars({ value: 3, input: true, name: 'demo-stars' }));
  v('ratingLine (M7): plain · as the Reviews anchor'); row(C.ratingLine(amara.rating), C.ratingLine({ ...amara.rating, anchor: '#reviews' }));
  v('review: text · no text · photos');
  s.push(card(
    C.reviewRow({ name: 'Priya S.', initials: 'PS', stars: 5, date: '2026-09-28', text: 'Hemmed three pairs of work pants in two days.' }) +
    C.reviewRow({ name: 'Dev R.', initials: 'DR', stars: 4, date: '2026-08-11' }) +
    C.reviewRow({ name: 'Marcus T.', initials: 'MT', stars: 5, date: '2026-09-14', text: 'It fits like it was made for me.', photos: 2 })));

  h2('Countdown');
  v('normal · soon · expired');
  row(C.countdown({ expiresAt: '2026-10-13T12:00', now: NOW }), C.countdown({ expiresAt: '2026-10-13T10:12', now: NOW }), C.countdown({ expiresAt: '2026-10-13T09:59', now: NOW }));

  h2('Chat Bubble v5 · privacy note · composer');
  s.push(C.privacyNote());
  col(
    C.chatBubble({ text: 'Can you hem the jacket sleeves too?', side: 'them', time: '10:02 AM' }),
    C.chatBubble({ text: 'Yes, I can add that to the fitting.', side: 'me', time: '10:04 AM' }),
    C.chatBubble({ text: 'Sending this now', side: 'me', status: 'sending' }),
    C.chatBubble({ text: 'This one did not go through', side: 'me', status: 'failed' }),
    C.chatBubble({ text: 'Call me at [phone hidden]', side: 'me', time: '10:06 AM', masked: true }),
    C.chatBubble({ text: 'Here is the jacket', side: 'them', time: '10:08 AM', photos: 2 }));
  v('composer: empty · typing · disabled');
  col(C.composer(), C.composer({ value: 'See you at five' }), C.composer({ disabled: true, placeholder: 'This request was declined' }));
  v('read-only banner');
  col(C.readOnlyBanner({ text: 'Amara declined this request. You can’t reply here.' }));

  h2('Field');
  col(
    C.field({ id: 'g-name', label: 'Full name', placeholder: 'Sarah Chen', autocomplete: 'name' }),
    C.field({ id: 'g-street', label: 'Street address', value: '145 N 7th St', helper: 'Only shared after Amara accepts.' }),
    C.field({ id: 'g-zip', label: 'ZIP code', value: '1121', inputmode: 'numeric', maxlength: 5, error: 'Enter a 5-digit ZIP code.' }),
    C.field({ id: 'g-price', label: 'Hem pants', value: '25', prefix: '$', inputmode: 'decimal' }),
    C.field({ id: 'g-miles', label: 'Travel radius', value: '5', suffix: 'mi' }),
    C.field({ id: 'g-off', label: 'Email', value: 'sarah.chen@example.com', disabled: true }));

  h2('Code input');
  col(C.codeInput({ id: 'g-code', length: 6 }), C.codeInput({ id: 'g-code-e', length: 6, value: '123', error: 'That code didn’t match. Try again.' }));

  h2('Stepper');
  col(C.stepper({ steps: ['Profile', 'Services prices', 'Where you work', 'Returns', 'Availability', 'Payouts'], current: 1, done: [0] }));

  v('compact · booking progress — step 1 · 3 · 5');
  s.push(`<div class="stepper-demo">${C.bookingSteps(0)}${C.bookingSteps(2)}${C.bookingSteps(4)}</div>`);

  h2('Action bar');
  const bar = (inner) => s.push(`<div class="action-bar-demo">${inner}</div>`);
  v('default');                 bar(C.actionBar({ ctaLabel: 'Send code', ctaAct: 'send-code' }));
  v('disabled + note');         bar(C.actionBar({ ctaLabel: 'Next: where and when', ctaAct: 'next', disabled: true, note: 'Add at least one garment to continue.' }));
  v('busy');                    bar(C.actionBar({ ctaLabel: 'Send code', ctaAct: 'send-code', busy: true, busyLabel: 'Sending code…' }));
  v('with lead');               bar(C.actionBar({ ctaLabel: 'Pick a time', ctaAct: 'pick-time', lead: `<span>Est. <b data-money>${fmt(seed.total)}</b> · 2 items</span>` }));
  v('with secondary');          bar(C.actionBar({ ctaLabel: 'Pick a time', ctaAct: 'pick-time', disabled: true, note: 'Not available for this job', secondaryLabel: 'Start a different job', secondaryAct: 'new-job' }));

  v('with split row (secondary + tertiary)');
  bar(C.actionBar({ ctaLabel: 'Accept', ctaAct: 'accept', busyLabel: 'Accepting…', secondaryLabel: 'Suggest time', secondaryAct: 'suggest', tertiaryLabel: 'Decline', tertiaryAct: 'decline', tertiaryTone: 'danger' }));
  v('split row · busy (both outline buttons locked)');
  bar(C.actionBar({ ctaLabel: 'Accept', ctaAct: 'accept', busy: true, busyLabel: 'Accepting…', secondaryLabel: 'Suggest time', secondaryAct: 'suggest', tertiaryLabel: 'Decline', tertiaryAct: 'decline', tertiaryTone: 'danger' }));
  v('split row · default tone');
  bar(C.actionBar({ ctaLabel: 'Send suggestion', ctaAct: 'send', secondaryLabel: 'Back', secondaryAct: 'back', tertiaryLabel: 'Not now', tertiaryAct: 'later' }));

  h2('Option row');
  v('unchecked · checked · with sub · with lead');
  s.push(`<div class="option-demo" role="radiogroup" aria-label="Pay with">${
    C.optionRow({ name: 'g-opt', value: 'a', title: 'Lowest price' }) +
    C.optionRow({ name: 'g-opt', value: 'b', title: 'Recommended', sub: 'Rating, distance and price together', checked: true }) +
    C.optionRow({ name: 'g-opt', value: 'c', title: 'Visa •••• 4242', sub: 'Expires 08/28', lead: ICON_CARD }) +
    C.optionRow({ name: 'g-opt', value: 'd', title: 'Apple Pay', lead: '<span class="pay-badge">Pay</span>', checked: true })
  }</div>`);

  h2('Toggle');
  col(C.toggle({ id: 'g-t1', label: 'Home visits', checked: true, helper: 'Customers in your ZIP list can book you.' }), C.toggle({ id: 'g-t2', label: 'Shop visits' }), C.toggle({ id: 'g-t3', label: 'Taily courier', disabled: true, helper: 'Not available yet' }));

  h2('Check row');
  col(C.checkRow({ id: 'g-c1', label: 'Pickup at the shop', checked: true }), C.checkRow({ id: 'g-c2', label: 'Home drop-off', caption: 'You bring it back' }), C.checkRow({ id: 'g-c3', label: 'I agree to the cancellation terms', error: 'Please agree to continue.' }), C.checkRow({ id: 'g-c4', label: 'Taily courier', caption: 'Not available in your ZIP yet', disabled: true }));

  h2('Chip group · segmented');
  col(
    C.chipGroup({ name: 'g-visit', label: 'Visit type', variant: 'segmented', options: [{ value: 'home', label: 'At my place' }, { value: 'shop', label: 'At the shop' }], value: 'home' }),
    C.chipGroup({ name: 'g-days', label: 'Days (pick any)', multi: true, options: [{ value: 'mon', label: 'Mon' }, { value: 'tue', label: 'Tue' }, { value: 'wed', label: 'Wed', disabled: true }, { value: 'thu', label: 'Thu' }], value: ['mon', 'thu'] }),
    C.chipGroup({ name: 'g-return', label: 'Return', options: [{ value: 'pickup', label: 'Pickup', caption: 'Free' }, { value: 'courier', label: 'Courier', caption: 'Quote at ready' }], value: null, error: 'Choose how you want it back.' }));

  h2('List row');
  s.push(card(C.listRow({ title: 'Payment method', sub: 'Visa ending 4242', act: 'open-payment' }) + C.listRow({ title: 'Phone', right: '(718) 555-0142', act: 'open-phone' }) + C.listRow({ title: 'Member since', right: 'Oct 2026', chevron: false })));

  h2('Skeleton');
  v('line ×3 · card · thread'); col(C.skeleton({ kind: 'line', count: 3 }), C.skeleton({ kind: 'card' }), C.skeleton({ kind: 'thread' }));

  h2('Empty state');
  col(C.emptyState({ title: 'No tailors near you yet', body: 'We’re adding tailors every week. Try the shop option or a nearby ZIP.', ctaLabel: 'Change where', ctaAct: 'change-where', secondaryLabel: 'Notify me', secondaryAct: 'notify' }),
      C.emptyState({ title: 'Nothing here yet', body: 'Your bookings will show up here.' }));

  h2('Banner');
  col(
    C.banner({ tone: 'info', title: 'Heads up', text: 'Amara usually replies within an hour.' }),
    C.banner({ tone: 'success', text: 'Request sent. Your deposit is held, not charged.' }),
    C.banner({ tone: 'warning', title: 'Almost out of time', text: 'Amara has 12 minutes left to reply.', actionLabel: 'Message Amara', actionAct: 'message', dismissible: true }),
    C.banner({ tone: 'error', title: 'Your card was declined', text: 'Visa •••• 4242 didn’t go through, and nothing was held.', actionLabel: 'Use another card', actionAct: 'change-card' }));

  h2('Toast tones (tap to fire)');
  row(...['neutral','success','warning','error','info'].map((t) => C.cta(t, { variant: 'secondary', attrs: `data-toast="${t}"` })).map((h) => `<div style="width:120px">${h}</div>`));

  h2('Money rows — customer breakdown by stage');
  v('estimate'); col(C.customerBreakdown(seed, { stage: 'estimate', tailorFirst: 'Amara' }));
  v('booked'); col(C.customerBreakdown(seed, { stage: 'booked', tailorFirst: 'Amara' }));
  v('booked, price confirmed at the fitting'); col(C.customerBreakdown(seed, { stage: 'booked', tailorFirst: 'Amara', depositState: 'captured', confirmed: true }));
  v('ready (with rush + courier)'); col(C.customerBreakdown({ ...rush, courier: 1045, total: rush.total + 1045, balance: rush.balance + 1045 }, { stage: 'ready' }));
  v('paid'); col(C.customerBreakdown(seed, { stage: 'paid' }));
  v('to hold (before the request is sent)'); col(C.customerBreakdown(seed, { stage: 'estimate', tailorFirst: 'Amara', depositState: 'to-hold' }));
  v('requested (deposit on hold)'); col(C.customerBreakdown(seed, { stage: 'booked', tailorFirst: 'Amara', depositState: 'authorized' }));
  v('confirmed (deposit captured)'); col(C.customerBreakdown(seed, { stage: 'booked', tailorFirst: 'Amara', depositState: 'captured' }));
  v('released (declined / expired / withdrawn)'); col(C.customerBreakdown(seed, { stage: 'booked', tailorFirst: 'Amara', depositState: 'released' }));
  v('refunded (early cancel)'); col(C.customerBreakdown(seed, { stage: 'booked', tailorFirst: 'Amara', depositState: 'refunded' }));
  v('kept (late cancel)'); col(C.customerBreakdown(seed, { stage: 'booked', tailorFirst: 'Amara', depositState: 'kept' }));
  h2('Money rows — tailor breakdown (no courier row)');
  col(C.tailorBreakdown(seed));
  h2('Money rows — every kind');
  col(C.moneyRows([
    { label: 'Default', cents: 4500 }, { label: 'Subtotal', cents: 9000, kind: 'subtotal' }, { label: 'Negative', cents: 1250, kind: 'negative' },
    { label: 'Muted', cents: 3000, kind: 'muted', caption: 'Not part of this order' }, { label: 'Changed', cents: 5000, kind: 'changed', status: 'Price change' },
    { label: 'Total', cents: 14750, kind: 'total' }]));

  /* ---------------- M2 · tailor onboarding + Shop ---------------- */
  const hdr = (inner) => s.push(`<div style="position:relative;height:100px;width:390px;margin-inline:-20px">${inner}</div>`);
  const take = (dollars) => payoutFor({ services: cents(dollars) });                 // what she keeps of a whole-dollar price
  const MINI_ROW = { id: 'amara', name: amara.name, initials: amara.initials, verified: true, rating: amara.rating, distanceMi: 0.6, nextOpening: '2026-10-15T17:00' };

  h2('Onboarding steps · "Step n of 6 · label"');
  v('step 1'); col(C.onboardingSteps('profile'));
  v('step 4 · steps 1–3 done'); col(C.onboardingSteps('returns', ['profile', 'services', 'where']));

  h2('Onboarding header');
  v('onboarding (Back · Finish later)'); hdr(C.onboardingHeader());
  v('onboarding step 1 (no Back)'); hdr(C.onboardingHeader({ back: false }));
  v('editing (tailor chrome, Shop active)'); hdr(C.onboardingHeader({ editing: true }));

  h2('Text area');
  const BIO = 'I have hemmed, taken in and let out suits and dresses in Williamsburg for twenty years.';
  col(
    C.textArea({ id: 'g-bio0', label: 'About your work', max: 280, helper: 'A line or two: what you do best.' }),
    C.textArea({ id: 'g-bio1', label: 'About your work', max: 280, value: BIO, helper: 'A line or two: what you do best.' }),
    C.textArea({ id: 'g-bio2', label: 'About your work', max: 40, value: BIO }),
    C.textArea({ id: 'g-bio3', label: 'About your work', max: 280, error: 'Tell customers a little about your work.' }));

  h2('Service row');
  col(
    C.serviceRow({ id: 'g-hem', label: 'Hem pants', caption: 'Suit Pant · Pants / Jeans' }),
    C.serviceRow({ id: 'g-hem1', label: 'Hem pants', caption: 'Suit Pant · Pants / Jeans', checked: true }),
    C.serviceRow({ id: 'g-hem2', label: 'Hem pants', caption: 'Suit Pant · Pants / Jeans', checked: true, price: '25', payoutCents: take(25) }),
    C.serviceRow({ id: 'g-hem3', label: 'Hem pants', caption: 'Suit Pant · Pants / Jeans', checked: true, price: 'abc', error: 'Enter a price in whole dollars.' }));

  h2('ZIP list');
  const ZIPS = ['11211', '11222', '11206', '11237'];
  v('empty (with suggestions)'); col(C.zipList({ suggestions: ZIPS }));
  v('4 zips'); col(C.zipList({ zips: ZIPS, suggestions: [...ZIPS, '11201'] }));
  v('input error'); col(C.zipList({ zips: ZIPS.slice(0, 2), input: '1121', inputError: 'Enter a 5-digit ZIP code.' }));
  v('list error'); col(C.zipList({ error: 'Add at least one ZIP code you cover.' }));

  h2('Day hours');
  v('closed · open · error');
  s.push(`<div class="info-card">${
    C.dayHours({ sched: 'shop', day: 'mon', label: 'Monday' }) +
    C.dayHours({ sched: 'shop', day: 'tue', label: 'Tuesday', open: '10:00 AM', close: '6:00 PM' }) +
    C.dayHours({ sched: 'shop', day: 'wed', label: 'Wednesday', open: '10:00 AM', close: '9:00 AM', error: 'Closing time must be after opening time.' })}</div>`);

  h2('Customer preview · "What customers see"');
  v('with a tailor row'); col(C.customerPreview({ html: C.tailorRow({ ...MINI_ROW, quote: seed, visitType: 'home' }), caption: 'For the sample job: Suit Pant hem · Home visit' }));
  v('with a mini profile');
  col(C.customerPreview({ html: `<div class="row">${C.avatar({ initials: 'AR', size: 'md', photo: true })}<div><p class="t-body w-600">Amara Reyes</p><p class="t-small c-600">Reyes Tailoring</p></div></div><p class="t-body">${BIO}</p>` }));
  v('with a text line'); col(C.customerPreview({ title: 'On your profile', html: '<p class="t-body">Return options: Pickup at the shop · Taily courier</p>' }));

  h2('Rush ladder');
  v('3 tiers'); col(`<p class="t-small c-600">${C.rushLadder(amara.rush)}</p>`);
  v('1 tier'); col(`<p class="t-small c-600">${C.rushLadder(amara.rush.slice(0, 1))}</p>`);
  v('empty'); col(`<p class="t-small c-600">${C.rushLadder([])}</p>`);

  h2('Leave modal');
  s.push(`<div class="row"><div style="position:relative;width:390px;height:300px;margin-inline:-20px;background:var(--neutral-100)">${
    C.leaveModal().replace('class="modal modal--leave"', 'class="modal modal--leave" style="position:absolute"')}</div></div>`);
  /* ---------------- M3 · request loop ---------------- */
  h2('Request card — the tailor’s inbox ticket (D-75)');
  const rc = { id: 'A-1001', name: 'Sarah C.', initials: 'SC', visitLabel: 'Home visit', place: 'Williamsburg · 11211', when: 'Thu, Oct 15 · 5:00 PM', items: 2, services: 3, payoutCents: seed.payout, feeCents: seed.tailyFee, expiresAt: '2026-10-13T12:00', now: NOW };
  v('requested (2h left)');          col(C.requestCard(rc));
  v('soon (15 min or less → warning ring)'); col(C.requestCard({ ...rc, expiresAt: '2026-10-13T10:12' }));
  v('suggested (muted money, waiting on Sarah)'); col(C.requestCard({ ...rc, status: 'suggested', waitingOn: 'Sarah' }));
  v('retried (Sent again) · one item, one service'); col(C.requestCard({ ...rc, retries: 1, items: 1, services: 1 }));

  h2('Appt row — one line of an appointment list');
  const ar = { id: 'A-1001', name: 'Amara Reyes', initials: 'AR', when: 'Thu, Oct 15 · 5:00 PM', place: 'At my place', status: 'confirmed' };
  v('default · long pill');
  col(C.apptRow(ar), C.apptRow({ ...ar, status: 'suggested', pillLabel: 'New time suggested' }));
  v('with amount (deposit held)');
  col(C.apptRow({ ...ar, status: 'requested', pillLabel: 'Request sent', amountText: fmtExact(seed.deposit), amountCaption: 'on hold' }));
  v('muted (past)');
  col(C.apptRow({ ...ar, status: 'cancelled', pillLabel: 'Cancelled', amountText: fmtExact(seed.deposit), amountCaption: 'refunded', muted: true }), C.apptRow({ ...ar, status: 'completed', muted: true }));
  /* ---------------- M4 · fitting to completion (all amounts from SCENARIOS, never typed) ---------------- */
  const seedLines = SCENARIOS.seed.lines;
  const rowOf = (l, kind, to) => ({ key: `${l.garmentId}:${l.serviceId}`, label: l.label, kind, from: kind === 'added' ? null : l.cents, to: kind === 'removed' ? null : (to ?? l.cents) });
  const byId = (id) => seedLines.find((l) => l.serviceId === id);
  const bumped = byId('sleeves').cents + (SCENARIOS.priceRepriced.services - SCENARIOS.seed.services);
  const taper = { ...byId('hem-pants'), serviceId: 'taper', label: 'Taper legs', cents: AMARA.prices.taper * 100 };
  const changeGarments = [
    { id: 'g1', type: byId('hem-pants').garmentType, rows: [rowOf(byId('hem-pants'), 'same'), rowOf(taper, 'added')] },
    { id: 'g2', type: byId('sleeves').garmentType, rows: [rowOf(byId('sleeves'), 'repriced', bumped), rowOf(byId('jacket-sides'), 'removed')] },
  ];
  h2('Change list — the correction mark (M4)');
  v('same · added (tint + tag) · repriced (old struck + New price) · removed (struck + tag)');
  col(C.changeList({ garments: changeGarments.map((g) => ({ ...g, kind: g.id === 'g2' ? 'changed' : 'same' })) }));
  v('K-01 · a New item panel (green, one tag) · a Removed item (struck, one tag)');
  const hemPants = { ...byId('hem-pants'), garmentId: 'n1', garmentType: 'Pants / Jeans', cents: AMARA.prices['hem-pants'] * 100 };
  col(C.changeList({ garments: [
    { id: 'n1', type: 'Pants / Jeans', kind: 'added', rows: [rowOf(hemPants, 'added')] },
    { id: 'g1', type: byId('hem-pants').garmentType, kind: 'removed', rows: [rowOf(byId('hem-pants'), 'removed')] },
  ] }));
  h2('Change summary (K-01)');
  v('changed · items and services');   col(C.changeSummary({ itemsAdded: 1, itemsRemoved: 0, servicesAdded: 0, servicesRemoved: 1, repriced: 0 }));
  v('changed · every part');           col(C.changeSummary({ itemsAdded: 2, itemsRemoved: 1, servicesAdded: 1, servicesRemoved: 3, repriced: 1 }));
  v('unchanged');                      col(C.changeSummary({ itemsAdded: 0, itemsRemoved: 0, servicesAdded: 0, servicesRemoved: 0, repriced: 0 }));

  h2('Delta figure (M4)');
  v('up (new total vs booked)');         col(C.deltaFigure({ label: 'Sarah pays', cents: SCENARIOS.priceAdded.total, was: SCENARIOS.seed.total }));
  v('down (a service came off)');        col(C.deltaFigure({ label: 'Sarah pays', cents: SCENARIOS.priceRemoved.total, was: SCENARIOS.seed.total }));
  v('same as booked');                   col(C.deltaFigure({ label: 'Sarah pays', cents: SCENARIOS.seed.total, was: SCENARIOS.seed.total }));
  v('no was (+ caption)');               col(C.deltaFigure({ label: 'You take home', cents: SCENARIOS.seed.payout, caption: `After the ${fmtExact(SCENARIOS.seed.tailyFee)} Taily fee` }));

  h2('Courier card (M4, D-100)');
  const cq = SCENARIOS.courierQuote;
  const cc = { quote: cq.quote, markup: cq.markup, cents: cq.cents, miles: cq.miles, from: amara.shopName, to: '145 N 7th St' };
  v('ready · customer');                 col(C.courierCard({ ...cc, note: 'Added to your balance.' }));
  v('ready · tailor');                   col(C.courierCard({ ...cc, note: 'Paid by Sarah. Not taken from your payout.' }));
  v('loading');                          col(C.courierCard({ state: 'loading', miles: cq.miles, from: cc.from, to: cc.to }));
  v('failed');                           col(C.courierCard({ state: 'failed', miles: cq.miles, from: cc.from, to: cc.to }));

  /* ---------------- K-02 · fitting documentation ---------------- */
  const ph = (n, kind, at = '2026-10-15T17:00') => ({ id: `p${n}`, kind, at, tone: (n - 1) % 4 });
  const docsFull = { before: [ph(1, 'before'), ph(2, 'before')], pinned: [ph(3, 'pinned')], comment: FITTING_COMMENTS.g2, commentMasked: false };
  const docsMasked = { before: [ph(1, 'before')], pinned: [ph(2, 'pinned')], comment: 'Call me at [phone hidden] if the pins move.', commentMasked: true };
  const docsMax = { before: [1, 2, 3, 4].map((n) => ph(n, 'before')), pinned: [ph(5, 'pinned')], comment: '', commentMasked: false };
  const none = { before: [], pinned: [], comment: '', commentMasked: false };
  GALLERY_DOCS.a1 = { type: 'Suit Jacket', docs: docsFull };
  GALLERY_DOCS.a2 = { type: 'Suit Jacket', docs: docsFull };
  GALLERY_DOCS.a3 = { type: 'Suit Jacket', docs: docsMasked };
  h2('K-02 · fitting documentation (D-175…D-183)');
  v('garmentIcon · card 40 · row 32 · inline 24 · the hanger fallback (unknown type) · alt on a lone icon');
  row(C.garmentIcon('Suit Jacket'), C.garmentIcon('Suit Pant', { size: 'row' }), C.garmentIcon('Skirt', { size: 'inline' }), C.garmentIcon('Spaceship'), C.garmentIcon('Dress / Jumpsuit', { alt: 'Dress / Jumpsuit' }));
  v('docPhoto · tones t0 t1 t2 t3 (Before) · a Pinned photo (pin badge)');
  row(...[0, 1, 2, 3].map((t) => C.docPhoto({ id: `p${t + 1}`, kind: 'before', at: NOW, tone: t }, { type: 'Suit Jacket' })), C.docPhoto({ id: 'p6', kind: 'pinned', at: NOW, tone: 1 }, { type: 'Suit Jacket' }));
  v('docsEditor · empty, pristine (both rows say "Required" quietly, the comment optional)');
  s.push(`<div class="info-card docs-demo">${C.docsEditor({ garmentId: 'e1', type: 'Suit Jacket', docs: none, missing: { before: true, pinned: true } })}</div>`);
  v('docsEditor · 2 Before + 1 Pinned, a saved comment');
  s.push(`<div class="info-card docs-demo">${C.docsEditor({ garmentId: 'e2', type: 'Suit Jacket', docs: docsFull })}</div>`);
  v(`docsEditor · at the max (${FITTING_LIMITS.PHOTOS_MAX} Before, no add tile) · a masked comment`);
  s.push(`<div class="info-card docs-demo">${C.docsEditor({ garmentId: 'e3', type: 'Suit Jacket', docs: docsMax })}</div>`);
  s.push(`<div class="info-card docs-demo">${C.docsEditor({ garmentId: 'e4', type: 'Suit Jacket', docs: docsMasked })}</div>`);
  v('docsEditor · the comment editor with an error');
  s.push(`<div class="info-card docs-demo">${C.docsEditor({ garmentId: 'e5', type: 'Suit Jacket', docs: docsFull, commentDraft: 'x'.repeat(FITTING_LIMITS.COMMENT_MAX + 1), commentError: `Keep the comment under ${FITTING_LIMITS.COMMENT_MAX} characters.` })}</div>`);
  v('garmentHead (K-05) · bare 40 px icon first, then the name underlined, then the tag · with a photo stack · removed (struck, no underline)');
  col(C.garmentHead({ type: 'Suit Jacket', photos: C.photoStack({ garmentId: 'h1', type: 'Suit Jacket', source: 'customer', count: 2, owner: 'Your' }) }),
      C.garmentHead({ type: 'Pants / Jeans', tag: '<span class="change-list__tag change-list__tag--new-item t-small w-600">New item</span>' }),
      C.garmentHead({ type: 'Suit Pant', kind: 'removed', tag: '<span class="change-list__tag change-list__tag--removed t-small w-600">Removed</span>' }));
  v('photoStack (K-04) · 1 photo · 2 photos · 4 photos from the fitting (Before, then Pinned) · the tap opens the viewer');
  row(C.photoStack({ garmentId: 'h2', type: 'Suit Jacket', source: 'customer', count: 1 }), C.photoStack({ garmentId: 'h3', type: 'Suit Jacket', source: 'customer', count: 2 }),
      C.photoStack({ garmentId: 'a1', type: 'Suit Jacket', source: 'fitting', photos: [...docsFull.before, ...docsFull.pinned] }));
  v('garmentDocs · the comment only (the photos live in the item row and the viewer) · a masked comment');
  s.push(`<div class="info-card">${C.garmentDocs({ garmentId: 'a1', type: 'Suit Jacket', docs: docsFull, commentLabel: 'Amara’s comment' })}</div>`);
  s.push(`<div class="info-card">${C.garmentDocs({ garmentId: 'a3', type: 'Suit Jacket', docs: docsMasked, commentLabel: 'Amara’s comment' })}</div>`);
  v('changeList with icons and docs · a kept garment · a New item · a Removed garment');
  col(C.changeList({
    garments: [
      { id: 'g2', type: byId('sleeves').garmentType, kind: 'same', rows: [rowOf(byId('sleeves'), 'same')] },
      { id: 'n1', type: 'Pants / Jeans', kind: 'added', rows: [rowOf(hemPants, 'added')] },
      { id: 'g1', type: byId('hem-pants').garmentType, kind: 'removed', rows: [rowOf(byId('hem-pants'), 'removed')] },
    ],
    docs: { g2: docsFull, n1: docsMasked, g1: docsFull }, commentLabel: 'Amara’s comment',
  }));

  /* ---------------- M5 · messaging, accounts, earnings, system ---------------- */
  const thread = [
    { id: 'm1', from: 'system', at: '2026-10-12T16:40', text: 'You sent a request', tailorText: 'Sarah sent a request' },
    { id: 'm2', from: 'customer', at: '2026-10-13T09:30', text: 'Can you take in a jacket at the shoulders?', photos: 0, masked: false },
    { id: 'm3', from: 'tailor', at: '2026-10-13T09:42', text: 'Yes. Text me at [phone hidden] when you are close.', photos: 0, masked: true },
    { id: 'm4', from: 'customer', at: '2026-10-13T09:50', text: 'This is the jacket.', photos: 2, masked: false },
    { id: 'm5', from: 'system', at: '2026-10-13T09:58', text: 'Amara accepted', tailorText: 'You accepted' },
  ];
  h2('Thread messages (M5, D-128) — one list, two readers');
  v('customer reader · day dividers, system line, masked token, photo buttons, sending, failed');
  col(C.threadMessages(thread, { reader: 'customer', now: NOW, peer: 'Amara', sending: { text: 'On my way', id: 'x1' }, failed: [{ text: 'See you soon', id: 'x2' }] }));
  v('tailor reader · same list in her wording');
  col(C.threadMessages(thread, { reader: 'tailor', now: NOW, peer: 'Sarah' }));

  h2('Thread header · context row (M5)');
  v('threadHead · name + sub · with a countdown');
  col(C.headingRow(C.threadHead({ initials: amara.initials, name: amara.name, sub: C.countdown({ expiresAt: '2026-10-13T12:00', now: NOW, suffix: 'left for Amara to reply' }) })),
      C.headingRow(C.threadHead({ initials: amara.initials, name: amara.name, sub: `${amara.shopName} · Williamsburg` })));
  v('threadContext · pill + time + chevron (button) · no pill · static · long');
  col(C.threadContext({ pill: 'requested', pillLabel: 'Requested', title: 'Thu, Oct 15, 6:00 PM', sub: 'At your place', act: 'open-request', id: 'a1' }),
      C.threadContext({ pill: 'confirmed', pillLabel: 'Confirmed', title: 'Thu, Oct 15, 6:00 PM', sub: 'View booking', act: 'open-booking', id: 'a1' }),
      C.threadContext({ title: 'No booking yet', sub: `See ${amara.name.split(' ')[0]}’s prices and open times`, act: 'open-tailor', id: 'amara' }),
      C.threadContext({ title: 'No request yet', sub: 'Sarah is asking before booking' }));

  h2('Thread row (M5) — the Messages list');
  v('read · unread (bold + count badge) · with a status pill · closed');
  s.push(`<div class="thread-list">${[
    C.threadRow({ id: 'amara', name: amara.name, initials: amara.initials, preview: 'Yes. Shoulders need a fitting, so book a visit.', time: '9:42 AM' }),
    C.threadRow({ id: 'amara', name: amara.name, initials: amara.initials, preview: 'You: Is Thursday still good for you?', time: '9:50 AM', unread: 2, pill: 'requested', pillLabel: 'Requested' }),
    C.threadRow({ id: 'sarah', name: 'Sarah C.', initials: 'SC', preview: 'phone hidden', time: 'Mon', unread: 1 }),
    C.threadRow({ id: 'amara', name: amara.name, initials: amara.initials, preview: 'Amara declined this request', time: 'Oct 9', closed: true }),
  ].join('')}</div>`);
  v('skeleton · thread-row ×3 · payout'); col(`<div class="thread-list">${C.skeleton({ kind: 'thread-row', count: 3 })}</div>`, C.skeleton({ kind: 'payout' }));

  h2('Chat bubble + composer — M5 extensions');
  v('failed (Retry carries data-id) · masked token (sender sees the note) · photo buttons');
  col(C.chatBubble({ text: 'This one did not go through', side: 'me', status: 'failed', id: 'x2' }),
      C.chatBubble({ text: 'Text me at [phone hidden] or [email hidden]', side: 'me', time: '9:42 AM', masked: true }),
      C.chatBubble({ text: 'Text me at [phone hidden]', side: 'them', time: '9:42 AM', masked: true }),
      C.chatBubble({ text: 'The sleeves are the problem.', side: 'them', time: '9:50 AM', photos: 2, photoLabel: 'Photo from Amara' }));
  v('composer · live privacy hint · one photo (send on, no text) · at the max (camera off)');
  col(C.composer({ value: 'Text me at (718) 555-0142', hint: 'Phone numbers and emails are hidden when you send.' }),
      C.composer({ photos: 1 }),
      C.composer({ photos: 3, value: 'Here is the jacket' }));
  v('read-only banner · with a secondary');
  col(C.readOnlyBanner({ text: 'Amara declined this request. You can’t reply here.', secondaryLabel: 'See Amara’s profile', secondaryAct: 'open-tailor' }));

  h2('Attach sheet (M5) — Add a photo');
  s.push(`<div class="sheet-demo">${C.sheet(`<div class="attach-sheet"><p class="t-small c-600 attach-sheet__note">Show Amara the garment. Up to 3&nbsp;per&nbsp;message.</p><div class="attach-sheet__rows">${
    C.listRow({ title: 'Take a photo', act: 'photo-camera', lead: ICON_CAMERA, chevron: false })}${C.listRow({ title: 'Choose from library', act: 'photo-library', lead: C.ICON_IMAGE, chevron: false })}</div></div>`, { header: 'Add a photo', open: true, confirm: false })}</div>`);

  h2('Card fields (M5) — add a card');
  v('empty · filled with errors under the fields');
  col(C.cardFields(), C.cardFields({ values: { number: '4242 4242', exp: '13/99', cvc: '1', zip: '1121' }, errors: { number: 'card-number', exp: 'card-exp', cvc: 'card-cvc', zip: 'card-zip' } }));

  h2('List row — attrs (M5)');
  s.push(card(C.listRow({ title: 'Home', sub: '145 N 7th St 2R · Brooklyn 11211', right: 'Default', act: 'open-address', attrs: 'data-id="home"' }) + C.listRow({ title: 'Work', sub: '30 Wythe Ave · Brooklyn 11249', act: 'open-address', attrs: 'data-id="addr-2"' })));

  h2('Money rows — tailor breakdown with rush (D-165: one order everywhere)');
  col(C.tailorBreakdown(rush));

  h2('System (M5) — offline banner · re-auth sheet · push ask');
  v('offline banner'); s.push(`<div class="sys-demo">${systemBanner({ sim: { network: 'offline' } })}</div>`);
  v('re-auth sheet (locked, no ✕) · with an error');
  s.push(`<div class="sheet-demo sheet-demo--tall" data-s="sys-reauth">${C.sheet(`<div class="reauth">${reauthHtml({ phone: '(718) 555-0142', msToResend: 30000 })}</div>`, { header: 'Sign in again', open: true, confirm: false })}</div>`);
  s.push(`<div class="sheet-demo sheet-demo--tall" data-s="sys-reauth">${C.sheet(`<div class="reauth">${reauthHtml({ phone: '(718) 555-0142', code: '123456', error: 'code-wrong' })}</div>`, { header: 'Sign in again', open: true, confirm: false })}</div>`);
  v('push ask (soft ask before the OS prompt)');
  s.push(`<div class="row"><div class="push-demo">${pushPromptHtml({ title: 'Don’t miss a request', body: `Requests expire after ${POLICY.REQUEST_EXPIRY_H} hours. Turn on notifications to reply in time.` })}</div></div>`);
  v('in-app push card (D-167): a new request, over the status bar');
  s.push(`<div class="push-banner-demo">${pushBannerHtml({ title: 'New request · Sarah C.', body: `Home visit Thu, Oct 15 · You take home ${fmtExact(seed.payout)} · 2h to reply` })}</div>`);
  /* ---------------- M7 · polish (K-03) ---------------- */
  h2('M7 · polish — nav icons, flow bar');
  const navDemo = (html) => s.push(`<div style="position:relative;height:56px;width:390px;margin-inline:-20px">${html.replace('<nav class="top-nav"', '<nav class="top-nav" style="top:0"')}</div>`);
  v('customer nav: Home active · Messages with an unread dot'); navDemo(C.topNav('home', C.NAV.customer, { badges: { messages: 2 } }));
  v('nav with Back (K-06): the chevron replaces the logo'); navDemo(C.topNav('bookings', C.NAV.customer, { back: true }));
  v('tailor nav: Earnings active · Home with a dot'); navDemo(C.topNav('earnings', C.NAV.tailor, { badges: { home: 1 } }));
  v('flowBar: step 2 of 5 · busy (Back and ✕ locked)');
  s.push(`<div style="position:relative;height:100px;width:390px;margin-inline:-20px">${C.flowBar({ step: 1 })}</div>`);
  s.push(`<div style="position:relative;height:100px;width:390px;margin-inline:-20px">${C.flowBar({ step: 4, busy: true })}</div>`);

  h2('M7 · avatar, section head, hero fact');
  v('avatar sm 40 · md 56 · lg 80 · muted (past row) · photo placeholder (initials) · no initials yet');
  row(C.avatar({ initials: 'AR', size: 'sm' }), C.avatar({ initials: 'AR', size: 'md' }), C.avatar({ initials: 'AR', size: 'lg' }),
    `<span class="appt-row--muted">${C.avatar({ initials: 'SC', size: 'md' })}</span>`, C.avatar({ initials: 'AR', photo: true, size: 'md' }), C.avatar({ photo: true, size: 'md' }));
  v('sectionHead · with a count · with ⓘ · with a link');
  col(C.sectionHead('Your items', { count: '2 items' }), C.sectionHead('Price', { aside: C.infoButton('deposit') }), C.sectionHead('Reviews', { aside: C.textLink('See all 37', { act: 'noop' }) }));
  v('.t-figure (hero fact) · .t-display (hero money)');
  col(`<p class="t-figure">Thu, Oct 15 · 5:00 PM</p>`, `<p class="t-display" data-money>${fmtExact(seed.payout)}</p>`);

  h2('M7 · text links, action bar, more menu');
  v('textLink: default · danger · muted · with icon · disabled');
  row(C.textLink('Ask a question', { act: 'a', icon: C.ICON_CHAT }), C.textLink('Withdraw request', { act: 'b', tone: 'danger' }), C.textLink('Not now', { act: 'c', tone: 'muted' }), C.textLink('Unavailable', { act: 'd', disabled: true }));
  v('actionBar: primary + two links (tertiary danger) · primary + one link · soft-disabled Send');
  bar(C.actionBar({ ctaLabel: 'Book Amara again', ctaAct: 'rebook', secondaryLabel: 'Message Amara', secondaryAct: 'message', tertiaryLabel: 'Cancel booking', tertiaryAct: 'cancel', tertiaryTone: 'danger' }));
  bar(C.actionBar({ ctaLabel: 'Accept new time', ctaAct: 'accept', secondaryLabel: 'Find another tailor', secondaryAct: 'find' }));
  bar(C.actionBar({ ctaLabel: 'Send final order', ctaAct: 'send', softDisabled: true, note: 'Add before and pinned photos for 1 item.' }));
  v('moreMenu button · the menu sheet');
  row(C.moreMenu());
  s.push(`<div class="sheet-demo">${C.sheet(`<div class="more-menu">${C.listRow({ title: 'I can’t make it', act: 'x' })}${C.listRow({ title: '<span class="more-item--danger">Mark as no-show</span>', act: 'y', chevron: false })}</div>`, { header: 'More', open: true, confirm: false })}</div>`);

  h2('M7 · stitched dash, status, verified, info');
  v('a breakdown: the stitch sits directly above the total');
  col(C.customerBreakdown(seed, { stage: 'estimate', tailorFirst: 'Amara' }));
  v('verifiedMark · inert');
  row(C.verifiedMark(), C.verifiedMark({ inert: true }));
  v('Verified by Taily sheet');
  s.push(`<div class="sheet-demo">${C.sheet(C.verifiedSheetHtml(), { header: 'Verified by Taily', open: true, confirm: false })}</div>`);
  v('infoButton · the "About the deposit" sheet');
  row(C.infoButton('deposit'), C.infoButton('pricing'));
  { const sh = C.infoSheetHtml('deposit'); s.push(`<div class="sheet-demo">${C.sheet(sh.html, { header: sh.title, open: true, confirm: false })}</div>`); }

  h2('M7 · photo stubs, empty state art, required vs error');
  v('photoStub tones 0-3 (thumb) · tile · hanger fallback');
  row(...[0, 1, 2, 3].map((t) => C.photoStub({ type: 'Suit Pant', tone: t, size: 'thumb' })), C.photoStub({ type: 'Suit Jacket', tone: 1, size: 'tile' }), C.photoStub({ type: '', tone: 2 }));
  v('emptyState with art');
  col(C.emptyState({ title: 'No bookings yet', body: 'Start with a garment.', ctaLabel: 'Start a booking', ctaAct: 'start', secondaryLabel: 'See how it works', secondaryAct: 'how', art: 'Formal Dress' }));
  v('docsEditor · pristine (Required) · tried (error line + red camera ring)');
  s.push(`<div class="card docs-demo">${C.docsEditor({ garmentId: 'm7a', type: 'Suit Jacket', docs: none, missing: { before: true, pinned: true } })}</div>`);
  s.push(`<div class="card docs-demo">${C.docsEditor({ garmentId: 'm7b', type: 'Suit Jacket', docs: none, missing: { before: true, pinned: true }, tried: true })}</div>`);
  /* the page has one h1 (its title, spoken only); a hero or thread-head demo is a specimen, so its title steps down to an h2 here */
  return `<h1 class="sr-only">Component gallery</h1>\n${s.join('\n').replace(/<h1( class="(?:status-hero__title|thread-head__name)[^>]*)>([\s\S]*?)<\/h1>/g, '<h2$1>$2</h2>')}`;
}

/** Attach the gallery's interactions (stars, toggles, chips, composer, toast buttons, scheduler position). */
export function wireGallery(root) {
  C.wireStars(root); C.wireToggles(root); C.wireChipGroups(root); C.wireComposer(root);
  C.wireGarmentDocs(root, { lookup: (gid) => GALLERY_DOCS[gid] ?? null, by: 'Taken by Amara' });
  C.wirePhotoViewer(root);
  root.addEventListener('click', (e) => { const b = e.target.closest('[data-toast]'); if (b) C.toast(`A ${b.dataset.toast} toast`, { tone: b.dataset.toast }); });
  root.querySelectorAll('.scheduler').forEach((sc) => C.wireWheel(sc, null, 44));   // positions + keyboard (R1-2-C-01)
}
