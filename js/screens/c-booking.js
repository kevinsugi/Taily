/* ============================================================
   c-booking — C8 booking detail. The appointment, its money, and the
   ways to change it. Focal: the visit time (the first row of the Visit group, .t-figure).
   States: just confirmed · upcoming · cancel sheets (early / late) ·
   reschedule sheet · cancelled (early / late) · Amara can't make it ·
   no-show · M4: fitting · in progress · returning (pickup / drop-off /
   courier) · completed (reviewed). Which appointment: focusAppt (D-72).
   ============================================================ */
import { register, render as go, registered } from '../app.js';
import {
  state, T, tailorById, openSlots, justConfirmed, now, returnAddress, priceChangeView,
} from '../state.js';
import {
  chrome, headingRow, statusHero, visitBlock, personBlock, calendarHref, timeline, customerBreakdown, moneyRows, cta, banner, emptyState,
  sectionHead, infoButton, textLink, sheetOverlay, toast, esc, wireWheel, noteQuote, metaRow, courierCard, reviewRow, changeList, withPhotos, wirePhotoViewer, receiptBlock, wireGarmentDocs, garmentStrip, ICON_CHAT, ICON_CALENDAR,
} from '../components.js';
import { scheduler, slotColumns, readSlot, SCHED_ROW, timeLabel, whenNote } from '../scheduler.js';
import { fmtExact, cancelTerms } from '../money.js';
import { fmtWhen, fmtTime, fmtDay, addMinutes, toDate, isoMinute } from '../dates.js';
import { VISIT_LABEL, VISIT_MINUTES, SHOP_CITY } from '../data.js';
import { POLICY } from '../money-config.js';
import { withLatency } from '../sim.js';
import { focusAppt, redirectIfMoved, statusWord, bookingTab } from '../focus.js';

const ID = 'c-booking';

const firstOf = (t) => (t?.name || 'The tailor').split(' ')[0];
const money = (cents) => `<span data-money>${fmtExact(cents)}</span>`;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const dropped = (a) => a.status === 'cancelled' && ['withdrawn', 'switched'].includes(a.cancel?.reason);
const confirmedAt = (a) => [...a.history].reverse().find((h) => h.status === 'confirmed')?.at ?? a.requestedAt;

function whereOf(a, t) {
  if (a.job.visitType === 'home') {
    const ad = a.job.address ?? state.customer.address;
    return [ad.street, ad.unit, ad.city].filter(Boolean).join(', ');
  }
  return [t.shopName, t.shop?.street].filter(Boolean).join(', ');
}

function visitRows(a, t) {
  /* Count from the approved lines once they exist (R4-1-C-01): a price change can add or remove services. */
  const lines = a.lines?.length ? a.lines : null;
  const items = lines ? new Set(lines.map((l) => l.garmentId)).size : a.job.garments.length;
  const services = lines ? lines.length : a.job.garments.reduce((n, g) => n + g.services.length, 0);
  const home = a.job.visitType === 'home';
  const types = lines ? [...new Map(lines.map((l) => [l.garmentId, l.garmentType])).values()] : a.job.garments.map((g) => g.type);
  return [
    { icon: 'calendar', value: esc(fmtWhen(a.slot.start)), strong: true, detail: esc(`${VISIT_LABEL.customer[a.job.visitType]} · ${VISIT_MINUTES[a.job.visitType]} min`) },
    { icon: home ? 'home' : 'shop', value: esc(whereOf(a, t)) },
    /* M7-2-C-04 (D-202): the booked garments as illustrations; K-10: the count is the value, the tiles sit under it */
    { icon: 'hanger', value: `${plural(items, 'item')} · ${plural(services, 'service')}`, extra: garmentStrip(types) },
  ];
}
/** A group on the page (A3): `<section class="sec">`. */
const sec = (inner, cls = '') => `<section class="sec${cls ? ` ${cls}` : ''}">${inner}</section>`;
/** K-12 (D-237) Option C: the tailor leads the Visit block (avatar, name, a check once verified, no facts line), the visit rows hang under her
    name, then Message + Add to calendar (a confirmed booking only; Directions is Amara's side — the visit is at Sarah's place or Amara's shop). */
function visitSection(a, t) {
  const actions = [{ label: 'Message', icon: ICON_CHAT, act: 'message' }];
  if (a.status === 'confirmed') {
    const href = calendarHref({ uid: a.id, start: a.slot.start, end: a.slot.end, stamp: isoMinute(new Date(now())), summary: `${VISIT_LABEL.customer[a.job.visitType]} with ${t.name}`, location: whereOf(a, t) });
    actions.push({ label: 'Add to calendar', icon: ICON_CALENDAR, href, act: 'add-to-calendar', attrs: 'download="taily-visit.ics"' });
  }
  return sec(personBlock({ title: 'Visit', person: { initials: t.initials, name: t.name, verified: t.verified, years: t.years }, rows: visitRows(a, t), actions }));
}

/** The shared detail header (D-93, supersedes R3-1-C-04's pill-above-Back): Back on its own row, then the pill,
    the title and the notes, all flush at the screen padding. */
function head(a, { pill, pillLabel, title, body = '', variant = 'requested' }) {
  return headingRow(statusHero({ variant, pill, pillLabel, title, body }));
}

/* ---------- views ---------- */

function cancelledView(a, t, first) {
  const reason = a.cancel?.reason;
  const dep = a.payments.deposit.cents;
  const refund = a.cancel?.refund ?? 0;
  const kept = a.cancel?.kept ?? 0;
  const cfg = {
    'customer-early': {
      pill: 'calm', label: 'Cancelled', title: 'Booking cancelled',
      body: `Your ${fmtExact(refund)} deposit is on its way back to your card. It can take a few business days to show.`,
      status: 'Refunded',
    },
    'customer-late': {
      pill: 'cancelled', label: 'Cancelled', title: 'Booking cancelled',
      body: `${first} kept the ${fmtExact(kept)} deposit because you cancelled less than ${POLICY.CANCEL_WINDOW_H} hours before the visit. Nothing else is charged.`,
      status: 'Kept',
    },
    'tailor-cant-make-it': {
      pill: 'cancelled', label: `Cancelled by ${first}`, title: `${esc(first)} can’t make it`,
      body: `${first} cancelled your ${fmtWhen(a.slot.start)} visit. Your ${fmtExact(refund)} deposit is refunded in full, and your items and services are saved so you can book someone else.`,
      status: 'Refunded',
    },
    'no-show': {
      pill: 'cancelled', label: 'No-show', title: 'Marked as a no-show',
      body: `${first} marked the visit as missed at ${fmtTime(a.cancel.at)}, ${Math.max(0, Math.round((toDate(a.cancel.at).getTime() - toDate(a.slot.start).getTime()) / 60000))} minutes after the start. ${first} keeps your ${fmtExact(kept)} deposit. Nothing else is charged. If you were there, message ${first}.`,
      status: 'Kept',
    },
  }[reason] ?? {
    pill: 'cancelled', label: 'Cancelled', title: 'Booking cancelled', body: '', status: a.payments.deposit.state === 'refunded' ? 'Refunded' : 'Kept',
  };
  const note = reason === 'tailor-cant-make-it' && a.cancel?.note
    ? noteQuote({ label: `${first}’s note`, text: a.cancel.note }) : '';

  let actions;
  if (reason === 'tailor-cant-make-it') {
    actions = `${cta('Find another tailor', { attrs: 'data-act="find-another"' })}
    <div class="page-actions__links">${textLink(`Message ${esc(first)}`, { act: 'message' })}</div>`;
  } else if (reason === 'no-show') {
    actions = `${cta(`Message ${esc(first)}`, { attrs: 'data-act="message"' })}
    <div class="page-actions__links">${textLink('Find another tailor', { act: 'other-tailors' })}</div>`;
  } else {
    actions = `${cta(`Book ${esc(first)} again`, { attrs: 'data-act="book-again"' })}
    <div class="page-actions__links">${textLink('Find another tailor', { act: 'other-tailors' })}</div>`;
  }
  return `${chrome(bookingTab())}<main class="body ${ID} ${ID}--cancelled" data-s="${ID}">
  ${head(a, { pill: cfg.pill, pillLabel: cfg.label, title: cfg.title, body: esc(cfg.body), variant: 'declined' })}
  ${note}
  ${visitSection(a, t)}
  ${sec(`${sectionHead('Price')}${moneyRows([{ label: 'Deposit', cents: dep, status: cfg.status }])}`)}
  <div class="page-actions">
    ${actions}
  </div>
</main>`;
}

function liveView(a, t, first) {
  const terms = cancelTerms(a, now());
  const early = terms.window === 'early';
  const deposit = a.payments.deposit.cents;
  const cutoff = fmtWhen(addMinutes(a.slot.start, -POLICY.CANCEL_WINDOW_H * 60));
  const confirmed = a.status === 'confirmed';
  const fresh = confirmed && justConfirmed(a);
  const hero = fresh
    ? head(a, {
      pill: 'confirmed', title: `You’re booked with ${esc(first)}`,
      body: a.confirmedVia === 'suggestion'
        ? `You accepted ${esc(first)}’s new time. Your ${fmtExact(deposit)} deposit is paid.`
        : `${esc(first)} accepted your request. Your ${fmtExact(deposit)} deposit is paid.`,
      variant: 'confirmed',
    })
    : head(a, { pill: confirmed ? 'confirmed' : a.status, title: `Your visit with ${esc(first)}`, variant: 'confirmed' });

  const steps = timeline([
    { state: 'done', title: 'Booked', sub: fmtWhen(confirmedAt(a)) },
    { state: 'current', title: 'Visit and fitting', sub: `You approve the final order` },
    { state: 'todo', title: 'Tailoring' },
    { state: 'todo', title: 'Ready', sub: `Pay the balance, est. ${money(a.money.balance)}` },
    { state: 'todo', title: 'Back with you' },
  ]);
  const policy = early
    ? `Free cancellation until ${cutoff}. After that, ${esc(first)} keeps the ${money(deposit)} deposit.`
    : `The visit is less than ${POLICY.CANCEL_WINDOW_H} hours away. If you cancel now, ${esc(first)} keeps your ${money(deposit)} deposit.`;
  const links = !confirmed ? '' : `<div class="page-actions__links">${early ? textLink('Reschedule', { act: 'reschedule' }) : ''}${textLink('Cancel booking', { act: 'cancel', tone: 'danger' })}</div>`;
  const late = confirmed && !early ? `<p class="t-small c-600 ${ID}__late">To change the time now, message ${esc(first)}.</p>` : '';

  return `${chrome(bookingTab())}<main class="body ${ID}" data-s="${ID}">
  ${hero}
  ${visitSection(a, t)}
  ${sec(`${sectionHead('What happens next')}${steps}`)}
  ${sec(`${sectionHead('Price', { aside: infoButton('deposit') })}${customerBreakdown(a.money, { stage: 'booked', tailorFirst: first, depositState: a.payments.deposit.state })}${confirmed ? `<p class="t-small c-600 ${ID}__policy">${policy}</p>` : ''}`)}
  <div class="page-actions">
    ${late}
    ${links}
  </div>
</main>`;
}

/* ---------- M4: fitting → completed (D-110) ---------- */

const M4_STATES = ['fitting', 'price-change', 'in-progress', 'ready', 'returning', 'completed'];
const ORDER = ['confirmed', ...M4_STATES];
const completedAt = (a) => [...a.history].reverse().find((h) => h.status === 'completed')?.at ?? a.requestedAt;
/** The price Amara confirmed at the fitting: the booked money without the courier (that is added later, on top). */
const confirmedTotal = (a) => a.money.total - (a.money.courier || 0);


/** "What happens next", every live state after the visit (D-110). */
function m4Timeline(a, first) {
  const at = ORDER.indexOf(a.status);
  const stage = (from, to) => (at >= from && at <= to ? 'current' : at > to ? 'done' : 'todo');
  const fitting = ORDER.indexOf('fitting'), progress = ORDER.indexOf('in-progress'), ready = ORDER.indexOf('ready'), back = ORDER.indexOf('returning');
  const s2 = stage(fitting, ORDER.indexOf('price-change'));
  const s3 = stage(progress, progress);
  const s4 = stage(ready, ready);
  const s5 = a.status === 'completed' ? 'done' : a.status === 'returning' ? 'current' : 'todo';
  const paid = at >= back;
  return timeline([
    { state: 'done', title: 'Booked', sub: fmtWhen(confirmedAt(a)) },
    { state: s2, title: 'Visit and fitting', sub: s2 === 'done' ? `Order approved · ${money(confirmedTotal(a))}` : s2 === 'current' ? `${esc(first)} goes through the order with you` : '' },
    { state: s3, title: 'Tailoring' },
    { state: s4, title: 'Ready', sub: paid ? `Paid ${money(a.payments.balance.cents)}` : s4 === 'current' ? 'Pay the balance' : at >= progress ? `Pay the ${money(a.money.balance)} balance` : `Pay the balance, est. ${money(a.money.balance)}` },
    { state: s5, title: 'Back with you', sub: s5 === 'current' ? esc(statusWord(a, 'customer').label) : '' },
  ]);
}

const DOW_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DOW_NAME = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };
const minsOf = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
/** The next shop hours from now, from the tailor's availability: "Open today 10:00 AM – 6:00 PM" (R4-1-C-07). */
function shopHoursLine(t) {
  const week = t.availability?.shop ?? {};
  const d = toDate(now());
  const nowMin = d.getHours() * 60 + d.getMinutes();
  for (let i = 0; i < 7; i += 1) {
    const key = DOW_KEYS[(d.getDay() + i) % 7];
    const w = (week[key] ?? []).find(([, close]) => i > 0 || minsOf(close) > nowMin);
    if (!w) continue;
    const range = `${timeLabel(minsOf(w[0]))} – ${timeLabel(minsOf(w[1]))}`;
    const day = i === 0 ? 'Open today' : i === 1 ? 'Open tomorrow' : `Next open ${DOW_NAME[key]}`;
    return `${day} ${range}`;
  }
  return '';
}

/** P-27: the drop-off address in full — street, city, state and ZIP (Sarah's saved address, D-106). */
function dropoffAddress() {
  const ad = state.customer.address ?? {};
  return [returnAddress(), ad.city ?? SHOP_CITY.city, `${ad.state ?? SHOP_CITY.state} ${ad.zip ?? ''}`.trim()].filter(Boolean).join(', ');
}

/** The "how it comes back" block per return option (B3). */
function returnBlock(a, t, first) {
  const shopName = esc(t.shopName);
  if (a.returnOption === 'dropoff') {
    return sec(visitBlock([{ icon: 'home', value: esc(dropoffAddress()) }], { title: 'Home drop-off', flush: true }));
  }
  if (a.returnOption === 'courier' && a.courier) {
    return sec(courierCard({ state: 'ready', ...a.courier, from: t.shopName, to: returnAddress(), note: `Included in the ${fmtExact(a.payments.balance.cents)} you paid when it was ready.` }));
  }
  const hours = shopHoursLine(t);
  const rows = [{ icon: 'bag', value: shopName, detail: [esc(`${t.shop?.street ?? ''}, ${t.shop?.city ?? 'Brooklyn'}, ${t.shop?.state ?? 'NY'} ${t.shop?.zip ?? ''}`.trim()), ...(hours ? [esc(hours)] : [])] }];
  const f = esc(first);
  return `${sec(visitBlock(rows, { title: 'In-store pickup', flush: true }))}
  <p class="t-small c-600 ${ID}__policy">${f} marks the order completed when you have it.</p>`;
}

/** "Your order" (K-2-01, D-127): the approved order as plain rows, the same garment / service strings as Amara's "The work".
    Every row is 'same' once approved; a garment added at the fitting keeps a small "New item" tag. */
function orderSection(a, first = 'Amara') {
  const added = new Set(a.job.garments.filter((g) => g.added).map((g) => g.id));
  const garments = withPhotos(priceChangeView(a, a.lines).garments, a.job).map((g) => (added.has(g.id) ? { ...g, newItem: true } : g));
  return sec(`${sectionHead('Your order')}<div class="${ID}__order">${changeList({ garments, docs: a.priceChange?.docs ?? null, commentLabel: `${first}’s comment` })}</div>`);
}

function m4View(a, t, first) {
  const word = statusWord(a, 'customer');
  const f = esc(first);
  const shopName = esc(t.shopName);
  const how = a.returnOption ?? 'pickup';
  const cfg = {
    fitting: { title: `Fitting with ${f}`, body: `${f} is going through the order with you.` },
    'price-change': { title: 'Review your final order', body: 'Approve the final order before any work starts.' },
    'in-progress': { title: `${f} is working on it`, body: `You approved the order. You’ll pay the ${fmtExact(a.money.balance)} balance when it’s ready.` },
    ready: { title: `${f} finished your order`, body: `Pay the ${fmtExact(a.money.balance)} balance to choose how to get it back.` },
    completed: { title: `All done with ${f}`, body: `${f} completed your order on ${fmtDay(completedAt(a))}.` },
    returning: {
      pickup: { title: `Pick it up at ${shopName}`, body: `It’s ready, and you’ve paid in full.` },
      dropoff: { title: `${f} will drop it off`, body: `${f} will bring it to your door. You’ve paid in full.` },
      courier: { title: 'On its way to you', body: `A Taily courier is bringing it from ${shopName} today. You’ve paid in full.` },
    }[how],
  }[a.status];
  const hero = head(a, { pill: word.pill, pillLabel: word.label, title: cfg.title, body: cfg.body, variant: a.status === 'completed' ? 'confirmed' : 'tailoring' });

  const early = a.status === 'fitting' || a.status === 'price-change' || a.status === 'in-progress' || a.status === 'ready';
  const stage = a.status === 'returning' || a.status === 'completed' ? 'paid' : 'booked';
  const confirmed = a.status !== 'fitting' && a.status !== 'price-change';

  const updated = a.status === 'in-progress' && a.priceChange?.changed && a.priceChange?.state === 'approved';   // P-30: the services row says so
  const breakdown = a.status === 'completed' ? receiptBlock(a, first)
    : customerBreakdown(a.money, { stage, tailorFirst: first, depositState: a.payments.deposit.state, confirmed, ...(updated ? { servicesCaption: `${first}’s final prices · updated at the fitting` } : {}) });

  let middle = '';
  /* D-169: from the fitting onward the past visit time is demoted — one small line, no count line */
  const fitted = ['in-progress', 'ready', 'returning', 'completed'].includes(a.status)
    ? `<p class="t-small c-600 ${ID}__fitted">Fitted ${fmtDay(a.slot.start)} · ${esc(VISIT_LABEL.customer[a.job.visitType])}</p>` : '';
  if (early && !fitted) middle = visitSection(a, t);
  if (a.status === 'returning') {
    middle = returnBlock(a, t, first);
  }
  if (a.status === 'completed') {
    const r = (t.reviews ?? []).find((x) => x.id === `r-${a.id}`);
    const mine = r ? reviewRow({ name: r.name, initials: r.initials, stars: r.stars, date: r.date, text: r.text, photos: r.photos, photoType: r.photoType ?? a.job.garments[0]?.type ?? '' })
      : a.review ? reviewRow({ name: `${state.customer.first} ${state.customer.last[0]}.`, initials: state.customer.initials, stars: a.review.stars, date: a.review.date, text: a.review.text, photos: a.review.photos, photoType: a.job.garments[0]?.type ?? '' }) : '';
    middle = sec(`${sectionHead('Your review')}<div class="${ID}__review">${mine}</div>`, 'sec--first');
  }
  const steps = a.status === 'completed' ? '' : sec(`${sectionHead('What happens next')}${m4Timeline(a, first)}`);
  /* D-218: a completed booking's Receipt carries the order (with its photo stacks), so "Your order" is not shown twice */
  const order = ['in-progress', 'ready', 'returning'].includes(a.status) && a.lines?.length ? orderSection(a, first) : '';
  const actions = a.status === 'completed'
    ? `${cta(`Book ${f} again`, { attrs: 'data-act="book-again"' })}
    <div class="page-actions__links">${textLink(`Message ${f}`, { act: 'message' })}</div>`
    : early && !fitted ? '' : cta(`Message ${f}`, { attrs: 'data-act="message"' });   // K-12 (D-237): the person block above already carries Message

  return `${chrome(bookingTab())}<main class="body ${ID} ${ID}--${a.status}" data-s="${ID}">
  ${hero}
  ${fitted}
  ${middle}
  ${steps}
  ${order}
  ${sec(`${sectionHead(a.status === 'completed' ? 'Receipt' : 'Price', { aside: a.status === 'completed' ? '' : infoButton('deposit') })}${breakdown}`)}
  ${actions ? `<div class="page-actions">
    ${actions}
  </div>` : ''}
</main>`;
}

function view() {
  const a = focusAppt(ID);
  if (!a || dropped(a)) {
    return `${chrome(bookingTab())}<main class="body ${ID}" data-s="${ID}">
  <div class="${ID}__empty" data-empty="no-booking">${emptyState({
    title: 'No booking to show', body: 'Your requests and visits are in Bookings.', ctaLabel: 'Go to Bookings', ctaAct: 'bookings', art: 'Formal Dress',
  })}</div>
</main>`;
  }
  const t = tailorById(a.tailorId) ?? state.tailors[0];
  const first = firstOf(t);
  if (a.status === 'cancelled') return cancelledView(a, t, first);
  return M4_STATES.includes(a.status) ? m4View(a, t, first) : liveView(a, t, first);
}

/* ---------- sheets ---------- */

/** A sheet body that is rebuilt as busy while the simulated network wait runs. */
function cancelSheetHtml(a, terms, first, busy = false, error = '') {
  const early = terms.window === 'early';
  const deposit = a.payments.deposit.cents;
  const rows = early
    ? [{ label: 'Deposit paid', cents: deposit }, { label: 'Refund to your card', cents: terms.refund, kind: 'total' }]
    : [{ label: 'Deposit paid', cents: deposit }, { label: 'Refund', cents: 0 }, { label: `Kept by ${first}`, cents: terms.kept, kind: 'total' }];
  const text = early
    ? `You’re cancelling more than ${POLICY.CANCEL_WINDOW_H} hours before the visit, so your ${money(terms.refund)} deposit comes back in full.`
    : `The visit is less than ${POLICY.CANCEL_WINDOW_H} hours away. If you cancel now, ${esc(first)} keeps your ${money(terms.kept)} deposit for the time set aside. Nothing else is charged.`;
  const label = early ? `Cancel and get ${fmtExact(terms.refund)} back` : `Cancel and lose the ${fmtExact(terms.kept)} deposit`;
  return `<div class="${ID}-sheet"${busy ? ' aria-busy="true"' : ''}>
  <p class="t-body c-700">${text}</p>
  ${moneyRows(rows)}
  ${error ? banner({ tone: 'error', text: error }) : ''}
  ${cta(label, { variant: 'danger', busy, busyLabel: 'Cancelling…', attrs: 'data-act="cancel-ok"' })}
  ${cta('Keep booking', { variant: 'secondary', disabled: busy, attrs: 'data-act="cancel-keep"' })}
</div>`;
}

const gone = (holder) => !holder.isConnected || holder.classList.contains('is-closing');

function openCancel(a, first) {
  const terms = cancelTerms(a, now());
  const early = terms.window === 'early';
  sheetOverlay(cancelSheetHtml(a, terms, first), { header: 'Cancel this booking?', dataS: `${ID}--${early ? 'cancel' : 'cancel-late'}`, confirm: false }, (holder, close) => {
    let busy = false;
    const paint = (error = '') => { holder.querySelector(`.${ID}-sheet`).outerHTML = cancelSheetHtml(a, terms, first, busy, error); };
    holder.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (busy) return;
      if (act === 'cancel-keep') close();
      else if (act === 'cancel-ok') {
        busy = true; paint();
        withLatency(() => {
          if (gone(holder)) return;
          const res = T.cancelBooking(a.id);
          busy = false;
          if (!res.ok) { paint('Something went wrong. Your booking is unchanged. Try again.'); toast('Couldn’t cancel your booking', { tone: 'error' }); return; }   // D-140: the banner carries it, the toast only echoes
          close();
          go(ID);
          toast(early ? `Booking cancelled. ${fmtExact(terms.refund)} refunded.` : 'Booking cancelled.');
        });
      }
    });
  });
}

function openReschedule(a, first) {
  const slots = openSlots(a.tailorId, a.job.visitType, { until: a.job.needBy, exclude: a.id }).filter((s) => s !== a.slot.start);
  if (!slots.length) {
    sheetOverlay(`<div class="${ID}-sheet">
  <p class="t-body c-700">${esc(first)} has no other open times before ${esc(fmtWhen(a.job.needBy).split(' · ')[0])}. Message ${esc(first)} to find a time that works.</p>
  ${cta(`Message ${esc(first)}`, { attrs: 'data-act="resched-message"' })}
  ${cta('Keep current time', { variant: 'secondary', attrs: 'data-act="resched-keep"' })}
</div>`, { header: 'Pick a new time', dataS: `${ID}--reschedule-none`, confirm: false }, (holder, close) => {
      holder.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'resched-keep') close();
        else if (act === 'resched-message') { close(); go('c-thread'); }
      });
    });
    return;
  }
  let picked = slots[0];
  const sheetHtml = (busy = false, error = '') => `<div class="${ID}-sheet"${busy ? ' aria-busy="true"' : ''}>
  ${error ? banner({ tone: 'error', text: error }) : ''}
  <p class="t-small c-600 ${ID}-sheet__now" data-now>Booked for <span class="nb">${fmtWhen(a.slot.start)}</span></p>
  <div class="${ID}-sheet__wheel">${scheduler({ columns: slotColumns(slots, picked), compact: true, cta: '', inline: true, note: whenNote('New time', picked) })}</div>
  <p class="t-small c-600">Same price. ${esc(first)} is told right away.</p>
  ${cta('Move my visit', { busy, busyLabel: 'Moving…', attrs: 'data-act="move-ok"' })}
  ${cta('Keep current time', { variant: 'secondary', disabled: busy, attrs: 'data-act="resched-keep"' })}
</div>`;
  sheetOverlay(sheetHtml(), { header: 'Pick a new time', dataS: `${ID}--reschedule`, confirm: false }, (holder, close) => {
    let busy = false;
    const onWheel = () => {
      const iso = readSlot(holder, slots);
      if (!iso) return;
      picked = iso;
      const note = holder.querySelector('[data-sched-note]');
      if (note) { note.innerHTML = whenNote('New time', iso); note.hidden = false; }
    };
    const paint = (error = '') => {
      holder.querySelector(`.${ID}-sheet`).outerHTML = sheetHtml(busy, error);
      wireWheel(holder, onWheel, SCHED_ROW);
    };
    wireWheel(holder, onWheel, SCHED_ROW);
    holder.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (busy) return;
      if (act === 'resched-keep') close();
      else if (act === 'move-ok') {
        onWheel();
        busy = true; paint();
        withLatency(() => {
          if (gone(holder)) return;
          const res = T.rescheduleBooking(a.id, picked);
          busy = false;
          if (!res.ok) {
            paint(res.error === 'too-late'
              ? `This visit is now less than ${POLICY.CANCEL_WINDOW_H} hours away, so it can’t be moved. Message ${first} to change it.`
              : 'That time was just taken. Pick another one.');
            return;
          }
          close();
          go(ID);
          toast(`Moved to ${fmtWhen(picked)}. ${first} has been told.`);
        });
      }
    });
  });
}

/* ---------- wiring ---------- */

function wire(root) {
  if (redirectIfMoved(ID, go, { has: (id) => registered().includes(id) })) return;
  const a = focusAppt(ID);
  wirePhotoViewer(root);   // the customer-photo stack of an item with no fitting photos (K-04)

  const backBtn = root.querySelector('.back[data-act="back"]');
  if (backBtn) {
    backBtn.dataset.wired = '1';
    backBtn.addEventListener('click', () => go(state.ui.from === 'account' ? 'c-orders' : 'c-bookings'));
  }

  /* K-02: the tailor's Before | Pinned photos on "Your order" (read-only, the sent snapshot) */
  if (a) {
    const by = firstOf(tailorById(a.tailorId) ?? state.tailors[0]);
    wireGarmentDocs(root, {
      by: `Taken by ${by}`,
      lookup: (gid) => {
        const docs = a.priceChange?.docs?.[gid];
        const type = priceChangeView(a, a.lines).garments.find((g) => g.id === gid)?.type ?? '';
        return docs ? { type, docs } : null;
      },
    });
  }
  root.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act || e.target.closest('.screen-sheet--overlay')) return;
    const t = a ? tailorById(a.tailorId) ?? state.tailors[0] : null;
    switch (act) {
      case 'message': go('c-thread'); break;
      case 'cancel': if (a) openCancel(a, firstOf(t)); break;
      case 'reschedule': if (a) openReschedule(a, firstOf(t)); break;
      case 'book-again':
        state.ui.booking = { tailorId: a.tailorId };
        if (a.status === 'completed') { T.newJob(); go('c-job'); } else go('c-book');
        break;
      case 'other-tailors': go('c-tailors'); break;
      case 'find-another': go('c-tailors', { fresh: true }); break;
      case 'bookings': go('c-bookings', { fresh: true }); break;
      default:
    }
  });
}

register(ID, view, wire);
