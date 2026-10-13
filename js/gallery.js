/* ============================================================
   Component gallery — every v5 component in each state, side by side,
   on the seed data (Amara's row, Sarah's $160.00 / $16.00 / $144.00
   breakdown, the tailor's −$12.50 / $147.50). One builder, two homes:
   the `sys-components` screen (the visual baseline for the component
   layer) and the standalone /components.html page.
   ============================================================ */

import * as C from './components.js';
import { scheduler, slotColumns } from './scheduler.js';
import { TAILORS, DEMO_NOW } from './data.js';
import { quote } from './money.js';

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

  /* ---------------- kept from v4 ---------------- */
  h2('CTA — 229:5030');
  v('Default · Secondary · disabled');   col(C.cta('Start Booking'), C.cta('Find another tailor', { variant: 'secondary' }), C.cta('Send request', { disabled: true }));

  h2('CTA_Small — 302:1656');
  row(C.ctaSmall('Message'), C.ctaSmall('Reschedule'));

  h2('Status Pill — 312:826 + v5 keys (16)');
  row(...['requested','confirmed','ready','completed','declined','cancelled','new-request','awaiting-customer','tailoring','suggested','fitting','price-change','in-progress','returning','withdrawn','expired'].map((k) => C.statusPill(k)));

  h2('Top nav — customer · tailor');
  v('NAV.customer (Bookings active)');
  s.push(`<div style="position:relative;height:56px;width:390px;margin-inline:-20px">${C.topNav('bookings', C.NAV.customer).replace('<nav class="top-nav"', '<nav class="top-nav" style="top:0"')}</div>`);
  v('NAV.tailor (Earnings active)');
  s.push(`<div style="position:relative;height:56px;width:390px;margin-inline:-20px">${C.topNav('earnings', C.NAV.tailor).replace('<nav class="top-nav"', '<nav class="top-nav" style="top:0"')}</div>`);

  h2('Time Chip · Select Time · Filter Pill');
  row(C.timeChip('9–11 AM', { selected: true }), C.timeChip('12–2 PM'), C.selectTime());
  row(C.filterPill('Desc.', 'Label'), C.filterPill('Desc.', 'Label', { open: true, options: ['Option 1','Option 2','Option 3'] }));

  h2('Garment Tile — 252:1235');
  v('Default ×2 · Selected');
  s.push(`<div class="tile-grid">${C.garmentTile('Suit Jacket')}${C.garmentTile('Suit Pant')}${C.garmentTile('Formal Dress', { qty: 1 })}</div>`);

  h2('Progress Bar — 473:7627');
  ['confirmed','tailoring','ready','complete'].forEach((st) => { v(st); s.push(C.progressBar(st)); });

  h2('Status Hero — 207:2087');
  v('Requested');
  s.push(C.statusHero({ variant: 'requested', title: 'Request sent.', body: 'Amara has 2 hours to reply. Your deposit is held, not charged.' }));
  v('Confirmed');
  s.push(C.statusHero({ variant: 'confirmed', title: 'You’re booked for', titleLine2: 'Thu, Oct 15 at 5:00 PM', body: 'Amara Reyes · At my place · 145 N 7th St' }));

  h2('Summary card · Trust badges · Visit block');
  s.push(C.summaryCard({ initials: 'AR', name: 'Amara Reyes', verified: true, badges: ['ID verified', 'Background check', 'Insured'] }));
  s.push(card(C.visitBlock(['◉  145 N 7th St, 2R', '▤  Thu, Oct 15 · 5:00 PM', '▤  Need by: Fri, Oct 23'])));

  h2('Chat Bubble — v4 atom + Timeline + Info rows');
  col(C.bubble('See you Thursday at 5:00.', 'them'), C.bubble('Perfect, thank you!', 'me'));
  s.push(C.timeline([
    { state: 'done', title: 'Request accepted', sub: 'Tue, Oct 13' },
    { state: 'current', title: 'Fitting at your place', sub: 'Thu, Oct 15 · 5:00 PM' },
    { state: 'todo', title: 'Ready for return' },
  ]));
  s.push(C.infoCard([C.metaRow('◉','145 N 7th St, 2R — At my place'), C.metaRow('▤','Thu, Oct 15 · 5:00 PM')].join('')));
  s.push(C.feeRow('$35', 'Home-visit fee', { line: true, caption: 'Amara comes to you' }));

  h2('Modal · Method rows · Link row');
  s.push(`<div class="row"><div class="modal modal--center" style="position:static"><span class="modal__badge">✂</span><h2 class="modal__title">Talk it over with Amara</h2><p class="modal__body">Prices are set by the tailor.</p><div class="modal__actions">${C.cta('Sounds good')}</div></div></div>`);
  col(C.methodRow('Apple Pay', 'apple'), C.methodRow('Credit Card', 'card'), C.linkRow('View receipt'));

  h2('Sheet chassis');
  s.push(`<div class="sheet-demo">${C.sheet(C.cta('Done'), { header: 'Sheet' })}</div>`);

  h2('Scheduler · slotColumns (open slots only)');
  const slots = ['2026-10-15T17:00', '2026-10-15T17:30', '2026-10-15T18:30', '2026-10-17T09:00', '2026-10-17T10:30'];
  const cols = slotColumns(slots, '2026-10-15T17:30');
  s.push(`<div class="row">${scheduler({ title: 'Choose a time', sub: 'Open times only', columns: cols, cta: 'Confirm', ctaAct: 'confirm-slot' })}</div>`);

  /* ---------------- v5 ---------------- */
  h2('Avatar — sm 40 · md 56 · lg 80 · photo');
  row(C.avatar({ initials: 'AR', size: 'sm' }), C.avatar({ initials: 'AR', size: 'md' }), C.avatar({ initials: 'AR', size: 'lg' }),
      C.avatar({ initials: 'AR', size: 'md', photo: 'assets/garments/tile-suit-jacket.png' }));

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
  v('rating summary'); row(C.ratingSummary(amara.rating));
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

  h2('Toggle');
  col(C.toggle({ id: 'g-t1', label: 'Home visits', checked: true, helper: 'Customers in your ZIP list can book you.' }), C.toggle({ id: 'g-t2', label: 'Shop visits' }), C.toggle({ id: 'g-t3', label: 'Taily courier', disabled: true, helper: 'Not available yet' }));

  h2('Check row');
  col(C.checkRow({ id: 'g-c1', label: 'Pickup at the shop', checked: true }), C.checkRow({ id: 'g-c2', label: 'Home drop-off', caption: 'You bring it back' }), C.checkRow({ id: 'g-c3', label: 'I agree to the cancellation terms', error: 'Please agree to continue.' }));

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
    C.banner({ tone: 'error', title: 'Card declined', text: 'Try another card to send your request.', actionLabel: 'Change card', actionAct: 'change-card' }));

  h2('Toast tones (tap to fire)');
  row(...['neutral','success','warning','error','info'].map((t) => C.cta(t, { variant: 'secondary', attrs: `data-toast="${t}"` })).map((h) => `<div style="width:120px">${h}</div>`));

  h2('Money rows — customer breakdown by stage');
  v('estimate'); col(C.customerBreakdown(seed, { stage: 'estimate', tailorFirst: 'Amara' }));
  v('booked'); col(C.customerBreakdown(seed, { stage: 'booked', tailorFirst: 'Amara' }));
  v('ready (with rush + courier)'); col(C.customerBreakdown({ ...rush, courier: 1045, total: rush.total + 1045, balance: rush.balance + 1045 }, { stage: 'ready' }));
  v('paid'); col(C.customerBreakdown(seed, { stage: 'paid' }));
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
  return s.join('\n');
}

/** Attach the gallery's interactions (stars, toggles, chips, composer, toast buttons, scheduler position). */
export function wireGallery(root) {
  C.wireStars(root); C.wireToggles(root); C.wireChipGroups(root); C.wireComposer(root);
  root.addEventListener('click', (e) => { const b = e.target.closest('[data-toast]'); if (b) C.toast(`A ${b.dataset.toast} toast`, { tone: b.dataset.toast }); });
  root.querySelector('.scheduler')?.querySelectorAll('.wheel__col--scroll').forEach((c) => { c.scrollTop = Number(c.dataset.sel) * 36; });
}
