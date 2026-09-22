/* ============================================================
   Calendar — Figma master "Calendar" 768:7277 (variants Default / Pickup /
   Error / Needby / Delivery / Delivery_error) over "Calendar / Cell"
   764:4597 (Default / Selected / Selected_wTime / Between / Between_wPrice
   / Needby / Muted / Weekday). Round 16 (Kevin): the date picker for
   02's Requested time (mode 'pickup') and Need by ('needby', the rush
   ladder shown on the days after the visit) and 05's delivery
   scheduling ('delivery', today ink, the choice outlined, the days
   between shaded).

   Card: 354 wide, 24 padded, 12 gap, radius 16, neutral-50 (white on 05),
   0 4 4 black@25% shadow. Heading row = title (Medium 16) over the
   month header (Medium 24 + two 28px arrow buttons). Days = a weekday
   row + six rows of seven 44x44 cells, rows 2 apart. Time_row (and the
   Delivery Address_row) = a 12-padded row with a bottom hairline holding
   the icon + label left and the value ("Select Time" neutral-500) right;
   the Error variants add the semantic/error line above the selector.

   Cell states: Default ink · Muted neutral-300 (outside the month / before
   the earliest day) · Weekday neutral-500 · Selected ink square, cream
   text · Selected_wTime + an 8px Bold sublabel ("7:00PM" / "Today") ·
   Between accent-bg square · Between_wPrice + an 8px "+$150" · Needby a
   1px ink outline. Dates are real Date objects; `key(d)` = "YYYY-M-D".
   ============================================================ */

import { ICON_CAL_CLOCK, ICON_CAL_PIN, ICON_CAL_PREV, ICON_CAL_NEXT } from './icons.js';
import { RUSH_LADDER, money } from './data.js';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const strip = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const key = (d) => (d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : '');
export const fromKey = (k) => { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, m - 1, d); };
export const sameDay = (a, b) => !!a && !!b && key(a) === key(b);
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const dayDiff = (a, b) => Math.round((strip(b) - strip(a)) / 86400000);
export const monthOf = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
export const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
export const monthLabel = (d) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

/** The days the grid shows for a month: from the Monday on or before the
    1st, five or six weeks as the month needs (the frames' July 2026 opens
    on Mon Jun 29 and fits five rows). */
export function monthGrid(month) {
  const first = monthOf(month);
  const dow = (first.getDay() + 6) % 7;
  const start = addDays(first, -dow);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const rows = Math.ceil((dow + days) / 7);
  return Array.from({ length: rows * 7 }, (_, i) => addDays(start, i));
}

const TITLES = { pickup: 'Schedule Pickup', needby: 'Select Need By Date', delivery: 'Schedule Delivery' };
const TIME_LABELS = { pickup: 'Pickup time', needby: 'Need by time', delivery: 'Preferred Time' };

/**
 * The calendar card.
 *   mode       'pickup' | 'needby' | 'delivery'
 *   month      any Date in the month to show
 *   selected   the chosen day (ink square on pickup; outlined on needby /
 *              delivery — the frames' Needby cell)
 *   anchor     needby: the visit day (ink, its time under it); delivery:
 *              today (ink, "Today"). Days strictly between anchor and
 *              selected are shaded; on needby the first three carry the
 *              rush ladder ("+$150" …). A delivery chosen for today draws
 *              today outlined instead (Kevin, round 16).
 *   min        the earliest selectable day (earlier days are muted)
 *   time       the chosen time label, or null ("Select Time")
 *   address    delivery: the address line, or null ("Select Address"); omit
 *              the row entirely with `false`
 *   errors     { time, address } messages (the Error variants)
 *   white      the 05 instances' white card
 */
export function calendar({
  mode = 'pickup', month = new Date(), selected = null, anchor = null, anchorTime = '', min = null,
  time = null, address = false, errors = {}, white = false, title = null, attrs = '',
} = {}) {
  const grid = monthGrid(month);
  const m0 = monthOf(month);
  const sel = selected ? strip(selected) : null;
  const anc = anchor ? strip(anchor) : null;
  const lo = anc && sel ? (anc < sel ? anc : sel) : null;
  const hi = anc && sel ? (anc < sel ? sel : anc) : null;
  const cells = grid.map((d) => {
    const inMonth = d.getMonth() === m0.getMonth();
    const past = min && strip(d) < strip(min);
    let state = 'default'; let sub = '';
    if (!inMonth || past) state = 'muted';
    else if (sel && sameDay(d, sel)) state = mode === 'pickup' ? 'selected' : 'needby';
    else if (anc && sameDay(d, anc)) { state = 'selected'; sub = mode === 'delivery' ? 'Today' : anchorTime; }
    else if (lo && hi && strip(d) > lo && strip(d) < hi) {
      state = 'between';
      if (mode === 'needby' && anc) { const step = RUSH_LADDER[dayDiff(anc, d) - 1]; if (step) sub = `+${money(step)}`; }
    }
    const subHtml = sub ? `<span class="cal-cell__sub">${sub}</span>` : '';
    const inert = state === 'muted';
    return `<button type="button" class="cal-cell cal-cell--${state}${sub ? ' cal-cell--sub' : ''}" data-day="${key(d)}"${inert ? ' disabled' : ''}><span class="cal-cell__num">${d.getDate()}</span>${subHtml}</button>`;
  });
  const rows = Array.from({ length: cells.length / 7 }, (_, r) => `<div class="calendar__row">${cells.slice(r * 7, r * 7 + 7).join('')}</div>`).join('\n      ');
  const field = (name, icon, label, value, empty, error) => `<div class="calendar__field${error ? ' calendar__field--error' : ''}" data-cal-${name}>
        ${error ? `<span class="calendar__error">${error}</span>` : ''}
        <button type="button" class="calendar__selector" data-act="cal-${name}"><span class="calendar__field-label">${icon}${label}</span><span class="calendar__value${value ? '' : ' is-empty'}">${value || empty}</span></button>
      </div>`;
  const timeRow = field('time', ICON_CAL_CLOCK, TIME_LABELS[mode], time, 'Select Time', errors.time);
  const addressRow = address === false ? '' : field('address', ICON_CAL_PIN, 'Address:', address, 'Select Address', errors.address);
  const fields = mode === 'delivery' ? `<div class="calendar__fields">${timeRow}${addressRow}</div>` : timeRow;
  return `<div class="calendar calendar--${mode}${white ? ' calendar--white' : ''}" data-calendar data-month="${key(m0)}" ${attrs}>
    <div class="calendar__heading">
      <span class="calendar__title">${title ?? TITLES[mode]}</span>
      <div class="calendar__header">
        <span class="calendar__month">${monthLabel(m0)}</span>
        <button type="button" class="calendar__nav" data-act="cal-prev" aria-label="Previous month">${ICON_CAL_PREV}</button>
        <button type="button" class="calendar__nav" data-act="cal-next" aria-label="Next month">${ICON_CAL_NEXT}</button>
      </div>
    </div>
    <div class="calendar__days">
      <div class="calendar__row calendar__row--weekdays">${WEEKDAYS.map((w) => `<span class="cal-cell cal-cell--weekday"><span class="cal-cell__num">${w}</span></span>`).join('')}</div>
      ${rows}
    </div>
    ${fields}
  </div>`;
}

/** Wire a rendered calendar: `onDay(date)`, `onMonth(±1)`, `onTime()`,
    `onAddress()`. The caller re-renders (or patches) the card. */
export function wireCalendar(root, { onDay, onMonth, onTime, onAddress } = {}) {
  const cal = root.matches?.('[data-calendar]') ? root : root.querySelector('[data-calendar]');
  if (!cal) return;
  cal.querySelectorAll('.cal-cell[data-day]:not([disabled])').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); onDay?.(fromKey(b.dataset.day)); }));
  cal.querySelector('[data-act="cal-prev"]')?.addEventListener('click', (e) => { e.stopPropagation(); onMonth?.(-1); });
  cal.querySelector('[data-act="cal-next"]')?.addEventListener('click', (e) => { e.stopPropagation(); onMonth?.(1); });
  cal.querySelector('[data-act="cal-time"]')?.addEventListener('click', (e) => { e.stopPropagation(); onTime?.(); });
  cal.querySelector('[data-act="cal-address"]')?.addEventListener('click', (e) => { e.stopPropagation(); onAddress?.(); });
}

/* ---------- the time picker (Time Picker / Pickup 771:6886) ----------
   A 263-wide white card: "Select Pickup Time" over a three-column wheel
   (hour / minute / period) — 9:00 AM to 9:00 PM on the half hour. The
   wheel is the shared wheelScroll (40px rows; the master draws 36 —
   raised). Columns 74 wide. */
export const PICKER_HOURS = ['9', '10', '11', '12', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
export const PICKER_MINS = ['00', '30'];
export const PICKER_PERIODS = ['AM', 'PM'];
/** The wheel columns for a "5:00 PM" style time (defaults 12:00 PM). */
export function pickerColumns(time = null) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time ?? '') ?? [null, '12', '00', 'PM'];
  const period = m[3].toUpperCase();
  /* the hour list runs 9 AM → 9 PM: "9" appears twice, AM first */
  let h = PICKER_HOURS.indexOf(m[1]);
  if (m[1] === '9' && period === 'PM') h = PICKER_HOURS.length - 1;
  if (h < 0) h = 3;
  return [
    { width: 74, sel: h, rows: PICKER_HOURS },
    { width: 74, sel: Math.max(0, PICKER_MINS.indexOf(m[2])), rows: PICKER_MINS },
    { width: 74, sel: Math.max(0, PICKER_PERIODS.indexOf(period)), rows: PICKER_PERIODS },
  ];
}
/** "5:00 PM" from the three settled rows. */
export const pickerTime = ([h, m, p]) => `${h}:${m} ${p}`;
/** "5:00PM" — the calendar cell's sublabel grammar (no space). */
export const cellTime = (t) => String(t ?? '').replace(' ', '');
