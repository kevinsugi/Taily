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
   36px pitch — `wireWheel(root, onChange, SCHED_ROW)`.
   ============================================================ */

import { fmtDay } from './data.js';

export const SCHED_ROW = 36;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const strip = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const dayDiff = (a, b) => Math.round((strip(b) - strip(a)) / 86400000);
/** "Jul 17" — the pill / state grammar's day (Phase R3). */
export const dayStamp = (d) => `${MON[d.getMonth()]} ${d.getDate()}`;
/** "Jul 17, 6:30 PM". */
export const stamp = (d, time) => `${dayStamp(d)}${time ? `, ${time}` : ''}`;
/** "Fri, Jul 17" — a date row's label (the app's day grammar). */
export const dayLabel = (d) => fmtDay(dayStamp(d), dayStamp(d));

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

/** The three time columns settled on `time` (default 12:00 PM). */
export function timeColumns(time = '12:00 PM') {
  const m = RE_TIME.exec(clampTime(time));
  return [
    { width: 56, rows: HOURS, sel: HOURS.indexOf(String(Number(m[1]))) },
    { width: 56, rows: MINS, sel: Math.max(0, MINS.indexOf(m[2])) },
    { width: 64, rows: PERIODS, sel: PERIODS.indexOf(m[3].toUpperCase()) },
  ];
}
/** The date column for a list of day rows, settled on index `sel`. */
export const dateColumn = (rows, sel = 0, width = 140) => ({ width, rows: rows.map((r) => r.label ?? r), sel: Math.max(0, Math.min(rows.length - 1, sel)) });

function columnHtml({ width, rows, sel }) {
  return `<div class="wheel__col wheel__col--scroll" style="width:${width}px" data-sel="${sel}">
      <span class="wheel__pad" aria-hidden="true"></span>
      ${rows.map((r, i) => {
    const d = Math.abs(i - sel);
    const cls = d === 0 ? 'wheel__row wheel__row--selected' : d >= 2 ? 'wheel__row wheel__row--edge' : 'wheel__row';
    return `<span class="${cls}" style="width:100%">${r}</span>`;
  }).join('')}
      <span class="wheel__pad" aria-hidden="true"></span>
    </div>`;
}

/**
 * The Scheduler card.
 *   title     the serif heading ("Schedule Pickup")
 *   sub       the small line over it ("Pickup: Jul 17, 6:30 PM"); `subAct`
 *             makes it a button (02's way back to the pickup step)
 *   columns   [{ width, rows, sel }] — dateColumn() + timeColumns()
 *   note      the caps rush note ('' hides it; the node stays for live updates)
 *   cta       the button label; `ctaAct` its data-act
 *   inline    05's in-page card (350 wide, the date column 134)
 */
export function scheduler({ title, sub = '', subAct = '', columns = [], note = '', cta = 'Next', ctaAct = 'sched-next', inline = false, attrs = '' } = {}) {
  const subHtml = !sub ? '' : subAct
    ? `<button type="button" class="scheduler__sub" data-act="${subAct}">${sub}</button>`
    : `<span class="scheduler__sub">${sub}</span>`;
  return `<div class="scheduler${inline ? ' scheduler--inline' : ''}" data-scheduler ${attrs}>
  <div class="scheduler__heading">${subHtml}<span class="scheduler__title">${title}</span></div>
  <div class="wheel wheel--sched"><div class="wheel__band"></div>
    ${columns.map(columnHtml).join('\n    ')}
  </div>
  <p class="scheduler__note" data-sched-note${note ? '' : ' hidden'}>${note}</p>
  <button type="button" class="scheduler__cta" data-act="${ctaAct}">${cta}</button>
</div>`;
}

/** The settled row of every column, in order. */
export function readScheduler(root, columns) {
  return [...root.querySelectorAll('[data-scheduler] .wheel__col--scroll')].map((col, i) => ({ index: Number(col.dataset.sel), value: columns[i].rows[Number(col.dataset.sel)] }));
}
/** Settle one column on a row (dataset, scroll position, row styles). */
export function settle(col, idx) {
  col.dataset.sel = idx;
  col.scrollTop = idx * SCHED_ROW;
  col.querySelectorAll('.wheel__row').forEach((r, i) => {
    r.classList.toggle('wheel__row--selected', i === idx);
    r.classList.toggle('wheel__row--edge', Math.abs(i - idx) >= 2);
  });
}
/** "6:30 PM" from the three time columns (the last three of the card),
    snapped back inside opening hours — the wheel follows the snap. */
export function readTime(root) {
  const cols = [...root.querySelectorAll('[data-scheduler] .wheel__col--scroll')].slice(-3);
  const raw = `${HOURS[Number(cols[0].dataset.sel)]}:${MINS[Number(cols[1].dataset.sel)]} ${PERIODS[Number(cols[2].dataset.sel)]}`;
  const ok = clampTime(raw);
  if (ok !== raw) timeColumns(ok).forEach((c, i) => settle(cols[i], c.sel));
  return ok;
}
