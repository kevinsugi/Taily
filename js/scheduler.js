/* ============================================================
   Scheduler — Figma master "Scheduler" 802:7205 (variants Pickup /
   Delivery / Delivery_Rush). Round 17 (Kevin): THE date + time picker —
   it replaces the round-16 Calendar everywhere a date or time is chosen
   (02's two-step pickup → delivery flow, 05's delivery scheduling, the
   tailor's Request New Time).

   Card: 370 wide (350 inline on 05), white, radius 16, 20 padded, 12 gap,
   no shadow. Heading = an optional 12 Regular neutral-500 line ("Pickup:
   Jul 17, 6:30 PM") over the serif 24 SemiBold title. Wheel = 330 x 180,
   36px rows under a 40px neutral-50 band (radius 10) that runs to the
   card's right edge; columns Date 140 / Hour 56 / Minute 56 / Period 64;
   the settled row reads SemiBold 16 ink, its neighbours Medium 12
   neutral-500, the edges neutral-300. Delivery_Rush adds the caps note
   ("1-DAY DELIVERY: +$150"). The button is CTA_Small Default at full
   width (ink, radius 20, SemiBold 16 cream): "Next" / "Confirm".

   The wheel reuses the shared wheel classes (wheelScroll markup) at a
   44px pitch (rows are tap targets, M6-V-02) — `wireWheel(root, onChange, SCHED_ROW)`.
   ============================================================ */

import { strip, addDays, dayDiff, dayStamp, dayLabel, fmtWhen } from './dates.js';
import { wheelCol, wheelRows, markWheelRow, wireWheel, esc } from './components.js';
export { strip, addDays, dayDiff, dayStamp, dayLabel };   // v5 (M0 A1): one date implementation, in dates.js

export const SCHED_ROW = 44;

/** The "when" note under a wheel (M6-C-12): a caps label and the time in sentence case ("SARAH SEES  Thu, Oct 15 · 5:00 PM"). */
export const whenNote = (label, iso) => `<span class="t-caps">${esc(label)}</span> <span class="t-small w-600">${esc(fmtWhen(iso))}</span>`;

/** "Jul 17, 6:30 PM". */
export const stamp = (d, time) => `${dayStamp(d)}${time ? `, ${time}` : ''}`;

/** `count` consecutive days from `start`: [{ date, label }]. */
export const dayRows = (start, count = 60) => Array.from({ length: count }, (_, i) => { const date = addDays(strip(start), i); return { date, label: dayLabel(date) }; });

export const HOURS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
export const MINS = ['00', '30'];
export const PERIODS = ['AM', 'PM'];
/** Visits and deliveries run 9:00 AM – 9:00 PM on the half hour. */
export const OPEN_MIN = 9 * 60;
export const CLOSE_MIN = 21 * 60;

const RE_TIME = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
/** Minutes after midnight for "6:30 PM" (null when unparsable). */
export function timeMinutes(time) {
  const m = RE_TIME.exec(time ?? '');
  if (!m) return null;
  const h = (Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0);
  return h * 60 + Number(m[2]);
}
/** "6:30 PM" for minutes after midnight, snapped to the half hour inside opening hours. */
export function timeLabel(mins) {
  const v = Math.min(CLOSE_MIN, Math.max(OPEN_MIN, Math.round(mins / 30) * 30));
  const h = Math.floor(v / 60); const mm = v % 60;
  return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
/** The nearest time inside opening hours. */
export const clampTime = (time) => timeLabel(timeMinutes(time) ?? 12 * 60);

/** Rows each column may offer given the period (and, for the minute column, the hour):
    9:00 AM – 9:00 PM on :00 / :30 only — the wheel never offers a time it would reject. */
const AM_HOURS = ['9', '10', '11'];
const PM_HOURS = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const hoursFor = (period) => (period === 'AM' ? AM_HOURS : PM_HOURS);
const minsFor = (period, hour) => (period === 'PM' && hour === '9' ? ['00'] : MINS);
/** The three time columns settled on `time` (default 12:00 PM). */
export function timeColumns(time = '12:00 PM') {
  const m = RE_TIME.exec(clampTime(time));
  const period = m[3].toUpperCase();
  const hour = String(Number(m[1]));
  const hours = hoursFor(period);
  const mins = minsFor(period, hour);
  return [
    { width: 56, rows: hours, sel: Math.max(0, hours.indexOf(hour)), label: 'Hour' },
    { width: 56, rows: mins, sel: Math.max(0, mins.indexOf(m[2])), label: 'Minute' },
    { width: 64, rows: PERIODS, sel: PERIODS.indexOf(period), label: 'AM/PM' },
  ];
}
/** The date column for a list of day rows, settled on index `sel`. */
export const dateColumn = (rows, sel = 0, width = 140, label = 'Day') => ({ width, rows: rows.map((r) => r.label ?? r), sel: Math.max(0, Math.min(rows.length - 1, sel)), label });

/* R1-2-C-01: the shared listbox column (role, label, options, aria-activedescendant) */
const columnHtml = wheelCol;

/**
 * The Scheduler card.
 *   title     the serif heading ("Schedule Pickup")
 *   sub       the small line over it ("Pickup: Jul 17, 6:30 PM"); `subAct`
 *             makes it a button (02's way back to the pickup step)
 *   columns   [{ width, rows, sel }] — dateColumn() + timeColumns()
 *   note      the caps rush note ('' hides it; the node stays for live updates)
 *   cta       the button label; `ctaAct` its data-act ('' → no button: the screen's action bar carries it)
 *   compact   a 3-row wheel (108 tall, the settled row centred) — for a screen whose action lives in its action bar
 *   inline    05's in-page card (350 wide, the date column 134)
 */
export function scheduler({ title, sub = '', subAct = '', columns = [], note = '', cta = 'Next', ctaAct = 'sched-next', inline = false, compact = false, attrs = '' } = {}) {
  const subHtml = !sub ? '' : subAct
    ? `<button type="button" class="scheduler__sub" data-act="${subAct}">${sub}</button>`
    : `<span class="scheduler__sub">${sub}</span>`;
  const heading = subHtml || title ? `<div class="scheduler__heading">${subHtml}${title ? `<span class="scheduler__title">${title}</span>` : ''}</div>` : '';
  return `<div class="scheduler${inline ? ' scheduler--inline' : ''}${compact ? ' scheduler--compact' : ''}" data-scheduler ${attrs}>
  ${heading}
  <div class="wheel wheel--sched"><div class="wheel__band"></div>
    ${columns.map(columnHtml).join('\n    ')}
  </div>
  <p class="scheduler__note" data-sched-note aria-live="polite"${note ? '' : ' hidden'}>${note}</p>
  ${cta ? `<button type="button" class="scheduler__cta" data-act="${ctaAct}">${cta}</button>` : ''}
</div>`;
}

/** The settled row of every column, in order. */
export function readScheduler(root, columns) {
  return [...root.querySelectorAll('[data-scheduler] .wheel__col--scroll')].map((col, i) => ({ index: Number(col.dataset.sel), value: columns[i].rows[Number(col.dataset.sel)] }));
}
/** Settle one column on a row (dataset, scroll position, row styles). */
export function settle(col, idx) {
  markWheelRow(col, idx);
  col.scrollTop = idx * SCHED_ROW;
}
const rowTexts = (col) => [...col.querySelectorAll('.wheel__row')].map((r) => r.textContent.trim());
/** Re-row the hour and minute wheels for the period / hour just settled, keeping the nearest value.
    Call from the wheel's onChange (wireTimeWheel does). */
export function syncTimeColumns(root) {
  const cols = [...root.querySelectorAll('[data-scheduler] .wheel__col--scroll')].slice(-3);
  if (cols.length < 3) return;
  const period = rowTexts(cols[2])[Number(cols[2].dataset.sel)];
  const hours = hoursFor(period);
  const curHour = rowTexts(cols[0])[Number(cols[0].dataset.sel)];
  const hourSel = hours.includes(curHour) ? hours.indexOf(curHour) : (period === 'AM' ? hours.length - 1 : 0);
  const mins = minsFor(period, hours[hourSel]);
  const curMin = rowTexts(cols[1])[Number(cols[1].dataset.sel)];
  const minSel = Math.max(0, mins.indexOf(curMin));
  [[cols[0], hours, hourSel], [cols[1], mins, minSel]].forEach(([col, rows, sel]) => {
    if (rowTexts(col).join('|') !== rows.join('|')) col.innerHTML = wheelRows({ rows, sel });
    settle(col, sel);
  });
}
/** Wire the time wheels so the hour / minute rows follow the period and hour. */
export function wireTimeWheel(root, rowH = SCHED_ROW) {
  wireWheel(root, () => syncTimeColumns(root), rowH);
}
/** "6:30 PM" from the three time columns (the last three of the card). Always inside 9:00 AM – 9:00 PM. */
export function readTime(root) {
  const cols = [...root.querySelectorAll('[data-scheduler] .wheel__col--scroll')].slice(-3);
  const [hour, min, period] = cols.map((c) => rowTexts(c)[Number(c.dataset.sel)]);
  return `${hour}:${min} ${period}`;
}

/* ============================================================
   v5 — slot-limited columns (M0 §B). The day column lists only days
   that have open slots; the hour / minute / period columns list only
   what that day's slots use. readSlot() snaps whatever the wheels
   settled on to the nearest open slot and re-rows the time columns
   when the day changed. Slots are local ISO strings
   ("2026-10-15T17:00") or { start } objects.
   ============================================================ */
import { fmtDay as fmtSlotDay } from './dates.js';

const slotStart = (s) => (typeof s === 'string' ? s : s.start);
const clock12 = (iso) => {
  const h = Number(iso.slice(11, 13)); const m = iso.slice(14, 16);
  return { hour: String(((h + 11) % 12) + 1), min: m, period: h >= 12 ? 'PM' : 'AM', mins: h * 60 + Number(m) };
};
/** [{ day: '2026-10-15', label: 'Thu, Oct 15', times: [iso, …] }] — days with open slots, ascending. */
function slotDays(slots) {
  const byDay = new Map();
  [...slots].map(slotStart).sort().forEach((iso) => {
    const day = iso.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(iso);
  });
  return [...byDay].map(([day, times]) => ({ day, label: fmtSlotDay(times[0]), times }));
}
const uniq = (list) => [...new Set(list)];
function timeColumnsFor(times, iso) {
  const c = times.map(clock12);
  const cur = clock12(iso);
  const hourKeys = uniq(c.map((t) => `${t.hour} ${t.period}`));
  const mins = uniq(c.map((t) => t.min));
  const periods = uniq(c.map((t) => t.period));
  return [
    { width: 56, rows: hourKeys.map((k) => k.split(' ')[0]), sel: Math.max(0, hourKeys.indexOf(`${cur.hour} ${cur.period}`)), label: 'Hour' },
    { width: 56, rows: mins, sel: Math.max(0, mins.indexOf(cur.min)), label: 'Minute' },
    { width: 64, rows: periods, sel: Math.max(0, periods.indexOf(cur.period)), label: 'AM/PM' },
  ];
}
/** The four Scheduler columns for a list of open slots, settled on `selectedIso` (default: the first slot). */
export function slotColumns(slots, selectedIso = null) {
  const days = slotDays(slots);
  if (!days.length) return [];
  const want = selectedIso ? selectedIso.slice(0, 16) : null;
  const di = Math.max(0, days.findIndex((d) => want && d.day === want.slice(0, 10)));
  const times = days[di].times;
  const iso = times.includes(want) ? want : times[0];
  return [dateColumn(days.map((d) => d.label), di), ...timeColumnsFor(times, iso)];
}
/**
 * Read the Scheduler's four wheels back as an open slot (ISO string). A combination that is not
 * open snaps to the nearest slot of the chosen day, and the time wheels are re-rowed for that day.
 */
export function readSlot(root, slots) {
  const days = slotDays(slots);
  const cols = [...root.querySelectorAll('[data-scheduler] .wheel__col--scroll')].slice(-4);
  if (!days.length || cols.length < 4) return null;
  const rowsOf = (col) => [...col.querySelectorAll('.wheel__row')].map((r) => r.textContent.trim());
  const pick = (i) => rowsOf(cols[i])[Number(cols[i].dataset.sel)];
  const day = days[Math.max(0, Math.min(days.length - 1, Number(cols[0].dataset.sel)))];
  const h = Number(pick(1)) % 12 + (pick(3) === 'PM' ? 12 : 0);
  const want = h * 60 + Number(pick(2));
  const iso = day.times.reduce((best, t) => (Math.abs(clock12(t).mins - want) < Math.abs(clock12(best).mins - want) ? t : best), day.times[0]);
  const next = timeColumnsFor(day.times, iso);
  next.forEach((c, k) => {
    const col = cols[k + 1];
    if (rowsOf(col).join('|') !== c.rows.join('|')) {
      col.innerHTML = wheelRows(c);
    }
    settle(col, c.sel);
  });
  return iso;
}
