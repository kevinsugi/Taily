/* ============================================================
   05 - Items Ready — Figma 283:1287 (round 17, Kevin: the Scheduler).
   Ready hero ("Your items are ready." success serif) + "Please schedule
   your delivery below. / The balance of $280 will be charged upon
   delivery." + the Scheduler master's Delivery variant INLINE (350 wide:
   "Ready: Thu, Jul 16" over "Schedule Delivery", the date + time wheel,
   Confirm) + the delivery address row (tap → the 02.2 sheet) + Message
   Marco. Gap 12. The wheel opens on the delivery booked on 02 (the
   need-by) when it is on or after the ready day, else on the ready day.
   Confirm → 05.1 Confirm Delivery popup → 05.2 Delivery Confirmed →
   03 / Delivery Scheduled.
   The frame still draws the round-16 Calendar (Figma sync pending); the
   cold fixture keeps its values — ready Mon, Jul 20, delivery Thu, Jul 23
   · 5:00 PM, 88 Leonard Street, 10013.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, cta, headingRow, wireWheel, dueBase, toast } from '../components.js';
import { scheduler, SCHED_ROW, dayRows, dateColumn, timeColumns, readScheduler, readTime, strip, dayDiff, dayStamp, dayLabel, clampTime } from '../scheduler.js';
import { ICON_CAL_PIN } from '../icons.js';
import { state, homeAddress, finalOrder, chooseFulfilment } from '../state.js';
import { money, parseWhen } from '../data.js';
import { currentAppt } from './03-status-confirmed.js';
import { openAddressOverlay } from './02.2-address-sheet.js';
import { openConfirmDelivery } from './05.1-confirm-delivery.js';
import { openDeliveryConfirmed } from './05.2-delivery-confirmed.js';

const live = () => !!window.__tailyNavigated;
const SPAN = 60;

/** The frame's fixture. */
export const FRAME_DELIVERY = { today: new Date(2026, 6, 20), day: new Date(2026, 6, 23), time: '5:00 PM', address: '88 Leonard Street, 10013' };

/** "Thu, Jul 23 · 5:00 PM" — the window label the appointment stores. */
export const windowLabel = (day, time) => `${dayLabel(day)} · ${time}`;
/** "Jul 23" — the window's calendar day. */
export const windowDate = (day) => dayStamp(day);

const validDay = (x) => x instanceof Date && !Number.isNaN(x.getTime());
const timeOf = (p) => (p?.hour == null ? null : `${((p.hour + 11) % 12) + 1}:${String(p.min ?? 0).padStart(2, '0')} ${p.hour >= 12 ? 'PM' : 'AM'}`);

/** The delivery being scheduled (state.ui.delivery — day "Jul 23", time
    "5:00 PM", address). Opens on the delivery booked on 02 (the need-by)
    when that is on or after the ready day. */
export function deliveryDraft(a, readyDay = strip(parseWhen(a?.readyAt)?.date ?? new Date())) {
  state.ui ??= {};
  state.ui.delivery ??= {};
  const d = state.ui.delivery;
  d.address ??= a?.fulfilment?.address ?? a?.place ?? homeAddress(a);
  if (!d.day) {
    const booked = parseWhen(a?.fulfilment?.window ?? a?.needBy);
    const day = booked && strip(booked.date) >= readyDay ? strip(booked.date) : readyDay;
    d.day = dayStamp(day);
    d.time = clampTime(timeOf(booked) ?? '12:00 PM');
  }
  return d;
}
/** The draft's day as a Date. */
export const draftDay = (d) => (d?.day ? strip(parseWhen(d.day)?.date ?? new Date(NaN)) : null);

/** The card's columns for a ready day + a chosen day / time. */
function columnsFor(today, day, time) {
  const days = dayRows(today, SPAN);
  return { days, columns: [dateColumn(days, Math.max(0, dayDiff(today, day))), ...timeColumns(time)] };
}

/** Exported: 05.1 / 05.2 draw this screen (dimmed) as their backdrop —
    `fixture` forces the frame's values. */
export function viewItemsReady(s, fixture = null) {
  const a = currentAppt(s) ?? {};
  const first = (a.name ?? 'Marco Tailor').split(' ')[0];
  const t = finalOrder(a).totals ?? {};
  const isLive = live() && !fixture;
  const fx = fixture ?? (isLive ? null : FRAME_DELIVERY);
  const today = fx ? fx.today : strip(parseWhen(a.readyAt)?.date ?? new Date());
  const d = isLive ? deliveryDraft(a, today) : null;
  const day = fx ? fx.day : (validDay(draftDay(d)) ? draftDay(d) : today);
  const time = (fx ? fx.time : d?.time) ?? '12:00 PM';
  const address = fx ? fx.address : d?.address ?? null;
  const balance = fx && !isLive ? 280 : dueBase(t);
  const { columns } = columnsFor(today, day, time);
  return `${chrome('home')}
<div class="body" data-s="05-items-ready">
  ${headingRow(statusHero({ pill: 'ready', variant: 'ready', title: 'Your items are ready.', titleWeight: 600, titleColor: 'success' }))}
  <p class="status-hero__body">Please schedule your delivery below.<br><br>The balance of ${money(balance)} will be charged upon delivery.</p>
  ${scheduler({ title: 'Schedule Delivery', sub: `Ready: ${dayLabel(today)}`, columns, cta: 'Confirm', ctaAct: 'confirm', inline: true })}
  <button type="button" class="address-row" data-act="delivery-address"><span class="address-row__label">${ICON_CAL_PIN}Address:</span><span class="address-row__value" data-delivery-address>${address || 'Select Address'}</span></button>
  <div class="actions">
    ${cta(`Message ${first}`, { variant: 'secondary', attrs: 'data-act="message"' })}
  </div>
</div>`;
}

function wire(root) {
  const a = currentAppt(state);
  const today = live() ? strip(parseWhen(a?.readyAt)?.date ?? new Date()) : FRAME_DELIVERY.today;
  const d = deliveryDraft(a, today);
  const start = live() ? { day: draftDay(d) ?? today, time: d.time } : FRAME_DELIVERY;
  const { days, columns } = columnsFor(today, start.day, start.time);
  const read = () => {
    d.day = dayStamp(days[readScheduler(root, columns)[0].index].date);
    d.time = readTime(root);
  };
  wireWheel(root, read, SCHED_ROW);
  root.querySelector('[data-act="delivery-address"]')?.addEventListener('click', () => openAddressOverlay(() => {
    d.address = `${homeAddress(a)}, ${state.contact.zip || '10013'}`;
    const v = root.querySelector('[data-delivery-address]');
    if (v) v.textContent = d.address;
  }));
  root.querySelector('[data-act="confirm"]')?.addEventListener('click', () => {
    read();
    const day = draftDay(d);
    if (!validDay(day)) { toast('Please select a delivery day'); return; }
    if (!d.address) { toast('Please select an address'); return; }
    const when = windowLabel(day, d.time);
    const n = (finalOrder(a).garments ?? []).length || 2;
    const items = `${n} item${n === 1 ? '' : 's'}`;
    openConfirmDelivery({ when, where: d.address, items }, () => {
      chooseFulfilment('delivery', when, windowDate(day), a, d.address);
      state.ui.delivery = {};
      openDeliveryConfirmed({ when, where: d.address, items });
    });
  });
  root.querySelector('[data-act="message"]')?.addEventListener('click', () => go('10-messages'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('05-items-ready', viewItemsReady, wire);
