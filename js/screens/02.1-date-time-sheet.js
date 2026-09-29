/* ============================================================
   02.1 - Date & Time Sheet — Figma 756:7291 (round 17, Kevin).
   The Scheduler master (802:7205) floating over the scrimmed 02 at
   10 / 263. One two-step flow: either pill opens "Schedule Pickup"
   (date + time wheel, Next) → "Schedule Delivery" (the small "Pickup:
   Jul 17, 6:30 PM" line over the title, Confirm). The delivery IS the
   need-by. Nothing is stored until Confirm — the scrim discards; the
   "Pickup: …" line steps back to the pickup. "Need by" opens straight on
   the delivery step once a pickup exists. The delivery wheel lists the
   days from the day after the pickup and OPENS ten days after it
   (Kevin); the first three days carry the rush ladder as the caps note
   ("1-DAY DELIVERY: +$150" / 2-DAY +$100 / 3-DAY +$50), live as the wheel
   settles. Times run 9:00 AM – 9:00 PM on the half hour.
   The route render keeps the frame: 02's backdrop, the scrim, the Pickup
   card on Fri, Jul 17 · 6:30 PM.
   The tailor's Request New Time (T02 / T03A) is the same card — title
   "Request New Time", button "Propose" — over its capped day / hour /
   minute columns (`openDateTimeOverlay('custom', …)`).
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { modalOverlay, wireWheel } from '../components.js';
import {
  scheduler, SCHED_ROW, dayRows, dateColumn, timeColumns, readScheduler, readTime, settle,
  strip, addDays, dayDiff, stamp, clampTime,
} from '../scheduler.js';
import { state, setAppt } from '../state.js';
import { parseWhen, STUDIO_HOURS, WHEEL_MINS, rushFeeForDays, money } from '../data.js';
import { view02, pillText } from './02-appointment-details.js';

/** How many days each wheel lists. */
const SPAN = 60;
/** The delivery wheel opens this many days after the pickup (Kevin, round 17). */
export const DELIVERY_LEAD = 10;

/** The Date + time a stored pill value carries (nulls when unset). */
function split(value) {
  const p = parseWhen(value);
  if (!p) return { day: null, time: null };
  const time = p.hour == null ? null : `${((p.hour + 11) % 12) + 1}:${String(p.min ?? 0).padStart(2, '0')} ${p.hour >= 12 ? 'PM' : 'AM'}`;
  return { day: strip(p.date), time };
}

/** "1-Day Delivery: +$150" for a delivery `days` after the pickup ('' from four days). */
export function rushNote(days) {
  const fee = rushFeeForDays(days);
  return fee > 0 ? `${days}-Day Delivery: +${money(fee)}` : '';
}

/* Update a filter pill's value in the live DOM — re-rendering 02 under
   the open popup would repaint the whole screen. The pill box is
   `${value}${chevron}`. */
function setPillValue(act, value) {
  const box = document.querySelector(`#screen [data-act="${act}"]`);
  if (box?.firstChild?.nodeType === Node.TEXT_NODE) box.firstChild.nodeValue = pillText(value);
}

/**
 * Open the Scheduler over the live 02. mode 'appt' = the Requested time
 * pill, 'needby' = the Need by pill (the delivery step when a pickup is
 * already set). Both pills store "Jul 17, 6:30 PM".
 */
export function openSchedulerOverlay(mode = 'appt') {
  const today = strip(new Date());
  const had = split(state.appt?.when);
  const hadBy = split(state.appt?.needBy);
  const view = {
    step: mode === 'needby' && had.day ? 'delivery' : 'pickup',
    pickup: { day: had.day && had.day >= today ? had.day : today, time: clampTime(had.time ?? '12:00 PM') },
    delivery: { day: hadBy.day, time: hadBy.time ? clampTime(hadBy.time) : null },
  };
  let columns = [];
  let days = [];
  const build = () => {
    if (view.step === 'pickup') {
      days = dayRows(today, SPAN);
      columns = [dateColumn(days, dayDiff(today, view.pickup.day)), ...timeColumns(view.pickup.time)];
      return scheduler({ title: 'Schedule Pickup', columns, cta: 'Next', ctaAct: 'sched-next' });
    }
    const first = addDays(view.pickup.day, 1);
    days = dayRows(first, SPAN);
    /* a delivery on or before the pickup (the pickup moved) opens afresh */
    if (!view.delivery.day || view.delivery.day < first) view.delivery.day = addDays(view.pickup.day, DELIVERY_LEAD);
    view.delivery.time ??= view.pickup.time;
    columns = [dateColumn(days, dayDiff(first, view.delivery.day)), ...timeColumns(view.delivery.time)];
    return scheduler({
      title: 'Schedule Delivery',
      sub: `Pickup: ${stamp(view.pickup.day, view.pickup.time)}`,
      subAct: 'sched-back',
      columns,
      note: rushNote(dayDiff(view.pickup.day, view.delivery.day)),
      cta: 'Confirm',
      ctaAct: 'sched-confirm',
    });
  };
  modalOverlay(`<div class="scheduler-popup" data-scheduler-popup>${build()}</div>`, { dataS: '02.1-date-time-sheet' }, (root, close) => {
    const popup = root.querySelector('[data-scheduler-popup]');
    const read = () => {
      const day = days[readScheduler(popup, columns)[0].index].date;
      const time = readTime(popup);
      view[view.step] = { day, time };
      return view[view.step];
    };
    const wire = () => {
      wireWheel(popup, () => {
        const v = read();
        if (view.step !== 'delivery') return;
        const note = popup.querySelector('[data-sched-note]');
        const text = rushNote(dayDiff(view.pickup.day, v.day));
        note.textContent = text;
        note.hidden = !text;
      }, SCHED_ROW);
      popup.querySelector('[data-act="sched-next"]')?.addEventListener('click', () => { read(); view.step = 'delivery'; paint(); });
      popup.querySelector('[data-act="sched-back"]')?.addEventListener('click', () => { read(); view.step = 'pickup'; paint(); });
      popup.querySelector('[data-act="sched-confirm"]')?.addEventListener('click', () => {
        read();
        const when = stamp(view.pickup.day, view.pickup.time);
        const needBy = stamp(view.delivery.day, view.delivery.time);
        setAppt('when', when);
        setAppt('needBy', needBy);
        setPillValue('time', when);
        setPillValue('needby', needBy);
        /* R1-U-11 / round 15: 02 repaints the need-by validity + the rows */
        document.querySelector('#screen .filters')?.dispatchEvent(new CustomEvent('taily:appt-changed'));
        close();
      });
    };
    const paint = () => { popup.innerHTML = build(); wire(); };
    wire();
  });
}

/** Round 3 – 16 name, kept for the callers: 'appt' / 'needby' open 02's
    two-step Scheduler; 'custom' the tailor's Request New Time. */
export function openDateTimeOverlay(mode = 'appt', onSet, opts = {}) {
  if (mode === 'custom') return openProposalScheduler(onSet, opts);
  return openSchedulerOverlay(mode);
}

/* ---------- the tailor's Request New Time (rounds 4–11 rules) ---------- */

const DAYS = Array.from({ length: 31 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  const dow = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const mon = d.toLocaleDateString('en-GB', { month: 'short' });
  return `${dow} ${d.getDate()} ${mon}`;
});
const MINS = WHEEL_MINS;
const PICKUP_HOURS = STUDIO_HOURS;

/* The proposal wheel: days bounded to the requested day → need-by
   (passed in by the caller), studio hours. R4-U-03 / R4-T-01: `hoursFor
   (day)` / `minsFor(day, hour)` — on the need-by day only the slots
   before the need-by time are offered (the columns re-row as the day
   settles, see setWheelRows). */
function customWheel(days, { hoursFor, minsFor } = {}) {
  const rows = days?.length ? days : DAYS.slice(0, 7);
  const hours = hoursFor?.(rows[0])?.length ? hoursFor(rows[0]) : PICKUP_HOURS;
  const hSel = Math.min(1, hours.length - 1);
  const mins = minsFor?.(rows[0], hours[hSel])?.length ? minsFor(rows[0], hours[hSel]) : MINS;
  return [
    { width: 140, sel: 0, rows },
    { width: 112, sel: hSel, rows: hours },
    { width: 64, sel: 0, rows: mins },
  ];
}

/* Re-row one live wheel column in place (rows change, the column stays
   wired): keeps the selected label when the new rows still carry it,
   else clamps to the last row. Returns true when the rows changed. */
function setWheelRows(col, spec, rows) {
  if (rows.join('|') === spec.rows.join('|')) return false;
  const was = spec.rows[Number(col.dataset.sel)];
  const sel = Math.max(0, rows.indexOf(was) >= 0 ? rows.indexOf(was) : Math.min(Number(col.dataset.sel), rows.length - 1));
  spec.rows = rows;
  spec.sel = sel;
  col.querySelectorAll('.wheel__row').forEach((r) => r.remove());
  const tail = col.querySelector('.wheel__pad:last-child');
  rows.forEach((r) => {
    const span = document.createElement('span');
    span.className = 'wheel__row';
    span.style.width = '100%';
    span.textContent = r;
    tail.before(span);
  });
  settle(col, sel);
  return true;
}

/* 'Thu 9 Jul' -> day 'Thu, Jul 9' and md 'Jul 9'; '9 AM' + '30' -> '9:30 AM'. */
function pick(values) {
  const [d, hour, min] = values;
  const [dow, num, mon] = d.split(' ');
  const time = `${hour.split(' ')[0]}:${min} ${hour.split(' ')[1]}`;
  return { day: `${dow}, ${mon} ${num}`, md: `${mon} ${num}`, time };
}

function openProposalScheduler(onSet, opts = {}) {
  const cols = customWheel(opts.days, opts);
  const html = `<div class="scheduler-popup" data-scheduler-popup>${scheduler({
    title: opts.header ?? 'Schedule Pickup',
    columns: cols,
    cta: opts.cta ?? 'Next',
    ctaAct: 'set-time',
  })}</div>`;
  modalOverlay(html, { dataS: '02.1-date-time-sheet' }, (root, close) => {
    const colEls = [...root.querySelectorAll('.wheel__col--scroll')];
    const readPick = () => pick(colEls.map((col, i) => cols[i].rows[Number(col.dataset.sel)]));
    /* the hour / minute columns follow the day that settled */
    const capSlots = () => {
      if (!(opts.hoursFor || opts.minsFor)) return;
      const day = cols[0].rows[Number(colEls[0].dataset.sel)];
      const hours = opts.hoursFor?.(day);
      if (hours?.length) setWheelRows(colEls[1], cols[1], hours);
      const hour = cols[1].rows[Number(colEls[1].dataset.sel)];
      const mins = opts.minsFor?.(day, hour);
      if (mins?.length) setWheelRows(colEls[2], cols[2], mins);
    };
    wireWheel(root, capSlots, SCHED_ROW);
    root.querySelector('[data-act="set-time"]')?.addEventListener('click', () => { onSet?.(readPick()); close(); });
  });
}

/* ---------- the route: the frame verbatim ---------- */

/** The frame's card: Wed, Jul 15 … Sun, Jul 19 around Fri, Jul 17 · 6:30 PM. */
const FRAME_DAYS = dayRows(new Date(2026, 6, 15), 5);

function renderScreen() {
  return `<div class="screen-sheet" data-s="02.1-date-time-sheet">
  <div class="sheet-backdrop" aria-hidden="true">${view02(state)}</div>
  <div class="modal-scrim" data-act="sheet-cancel"></div>
  <div class="scheduler-popup">${scheduler({ title: 'Schedule Pickup', columns: [dateColumn(FRAME_DAYS, 2), ...timeColumns('6:30 PM')], cta: 'Next', ctaAct: 'sched-next' })}</div>
</div>`;
}

function wire(root) {
  const dismiss = () => { back() || go('02-appointment-details'); };
  root.querySelectorAll('[data-act="sheet-cancel"]').forEach((el) => el.addEventListener('click', dismiss));
  wireWheel(root, null, SCHED_ROW);
  root.querySelector('[data-act="sched-next"]')?.addEventListener('click', dismiss);
}

register('02.1-date-time-sheet', renderScreen, wire);
