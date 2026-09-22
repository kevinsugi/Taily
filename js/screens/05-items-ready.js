/* ============================================================
   05 - Items Ready — Figma 283:1287 (round 16, Kevin: delivery only).
   Ready hero ("Your items are ready." success serif) + "Please schedule
   your delivery below. / The balance of $280 will be charged upon
   delivery." + the Calendar master in mode Delivery (white card: today
   ink, the chosen day outlined, the days between shaded, Preferred Time
   and Address rows) + Confirm Delivery / Message Marco. Gap 12.
   Confirm → 05.1 Confirm Delivery popup → 05.2 Delivery Confirmed →
   03 / Delivery Scheduled. Tapping "Select Time" opens the Time Picker
   (the 02.1 wheel card); Address opens the 02.2 sheet.
   The frame's fixture: today Mon Jul 20 2026, Thu Jul 23 · 5:00 PM chosen,
   88 Leonard Street, 10013. Live: today = the day the items were ready
   (`a.readyAt`), nothing chosen until the customer picks.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, cta, headingRow, modalOverlay, wheelScroll, wireWheel, dueBase, toast } from '../components.js';
import { calendar, wireCalendar, strip, monthOf, addMonths, pickerColumns, pickerTime } from '../calendar.js';
import { state, homeAddress, finalOrder, chooseFulfilment } from '../state.js';
import { money, parseWhen, fmtDay } from '../data.js';
import { currentAppt } from './03-status-confirmed.js';
import { openAddressOverlay } from './02.2-address-sheet.js';
import { openConfirmDelivery } from './05.1-confirm-delivery.js';
import { openDeliveryConfirmed } from './05.2-delivery-confirmed.js';

const live = () => !!window.__tailyNavigated;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The frame's fixture. */
export const FRAME_DELIVERY = { today: new Date(2026, 6, 20), day: new Date(2026, 6, 23), time: '5:00 PM', address: '88 Leonard Street, 10013' };

/** "Thu, Jul 23 · 5:00 PM" — the window label the appointment stores. */
export const windowLabel = (day, time) => `${fmtDay(`${MON[day.getMonth()]} ${day.getDate()}`, 'Thu, Jul 23')} · ${time}`;
/** "Jul 23" — the window's calendar day. */
export const windowDate = (day) => `${MON[day.getMonth()]} ${day.getDate()}`;

/** The delivery being scheduled (state.ui.delivery — day as "Jul 23",
    time "5:00 PM", address; a scratch like state.ui.window was). */
export function deliveryDraft(a) {
  state.ui ??= {};
  state.ui.delivery ??= {};
  const d = state.ui.delivery;
  d.address ??= a?.fulfilment?.address ?? a?.place ?? homeAddress(a);
  return d;
}
/** The draft's day as a Date (its "Jul 23" parses against the app's year). */
export const draftDay = (d) => (d?.day ? strip(parseWhen(d.day)?.date ?? new Date(NaN)) : null);
const validDay = (x) => x instanceof Date && !Number.isNaN(x.getTime());

/** Exported: 05.1 / 05.2 draw this screen (dimmed) as their backdrop —
    `fixture` forces the frame's values. */
export function viewItemsReady(s, fixture = null) {
  const a = currentAppt(s) ?? {};
  const first = (a.name ?? 'Marco Tailor').split(' ')[0];
  const t = finalOrder(a).totals ?? {};
  const isLive = live() && !fixture;
  const fx = fixture ?? (isLive ? null : FRAME_DELIVERY);
  const d = isLive ? deliveryDraft(a) : null;
  const readyDay = strip(parseWhen(a.readyAt)?.date ?? new Date());
  const today = fx ? fx.today : readyDay;
  const day = fx ? fx.day : (validDay(draftDay(d)) ? draftDay(d) : null);
  const time = fx ? fx.time : d?.time ?? null;
  const address = fx ? fx.address : d?.address ?? null;
  const month = d?.month ? monthOf(new Date(d.month)) : monthOf(day ?? today);
  const errors = d?.errors ?? {};
  const balance = fx && !isLive ? 280 : dueBase(t);
  return `${chrome('home')}
<div class="body" data-s="05-items-ready">
  ${headingRow(statusHero({ pill: 'ready', variant: 'ready', title: 'Your items are ready.', titleWeight: 600, titleColor: 'success' }))}
  <p class="status-hero__body">Please schedule your delivery below.<br><br>The balance of ${money(balance)} will be charged upon delivery.</p>
  ${calendar({ mode: 'delivery', white: true, month, selected: day, anchor: today, min: today, time, address, errors })}
  <div class="actions">
    ${cta('Confirm Delivery', { attrs: 'data-act="confirm"' })}
    ${cta(`Message ${first}`, { variant: 'secondary', attrs: 'data-act="message"' })}
  </div>
</div>`;
}

/** The Time Picker card over the live screen; the settle writes `onTime`. */
function openTimePicker(time, onTime) {
  const cols = pickerColumns(time);
  modalOverlay(`<div class="calendar-popup calendar-popup--picker"><div class="time-picker" data-time-picker><span class="time-picker__title">Select Delivery Time</span>${wheelScroll(cols)}</div></div>`, { dataS: '05-time-picker' }, (root) => {
    wireWheel(root, () => {
      const rows = [...root.querySelectorAll('.wheel__col--scroll')].map((col, i) => cols[i].rows[Number(col.dataset.sel)]);
      onTime(pickerTime(rows));
    });
  });
}

function wire(root) {
  const a = currentAppt(state);
  const d = deliveryDraft(a);
  const repaint = () => go('05-items-ready', { replace: true });
  wireCalendar(root, {
    onDay: (day) => { d.day = windowDate(day); d.errors = {}; repaint(); },
    onMonth: (n) => { d.month = addMonths(monthOf(d.month ? new Date(d.month) : (draftDay(d) ?? new Date())), n).toISOString(); repaint(); },
    onTime: () => { d.time ??= '12:00 PM'; delete d.errors?.time; openTimePicker(d.time, (t) => { d.time = t; const v = root.querySelector('[data-cal-time] .calendar__value'); if (v) { v.textContent = t; v.classList.remove('is-empty'); } }); },
    onAddress: () => openAddressOverlay(() => { d.address = `${homeAddress(a)}, ${state.contact.zip || '10013'}`; delete d.errors?.address; repaint(); }),
  });
  root.querySelector('[data-act="confirm"]')?.addEventListener('click', () => {
    const day = draftDay(d);
    if (!validDay(day)) { toast('Please select a delivery day'); return; }
    const errors = {};
    if (!d.time) errors.time = 'Please select a delivery time';
    if (!d.address) errors.address = 'Please select an address';
    if (Object.keys(errors).length) { d.errors = errors; repaint(); return; }
    const when = windowLabel(day, d.time);
    const n = (finalOrder(a).garments ?? []).length || 2;
    openConfirmDelivery({ when, where: d.address, items: `${n} item${n === 1 ? '' : 's'}` }, () => {
      chooseFulfilment('delivery', when, windowDate(day), a, d.address);
      state.ui.delivery = {};
      openDeliveryConfirmed({ when, where: d.address, items: `${n} item${n === 1 ? '' : 's'}` });
    });
  });
  root.querySelector('[data-act="message"]')?.addEventListener('click', () => go('10-messages'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('05-items-ready', viewItemsReady, wire);
