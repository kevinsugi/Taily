/* ============================================================
   02.1 - Date & Time Sheet — Figma 756:7291 (round 16, Kevin).
   The Calendar master (768:7277) floating over the scrimmed 02 at
   18 / 215: "Requested time" opens it in mode 'pickup' (Schedule Pickup),
   "Need by" in mode 'needby' (Select Need By Date — the visit day ink
   with its time, the days after shaded with the rush ladder, the choice
   outlined). Tapping a day stores it at once (the pill repaints live);
   "Select Time" swaps the Time Picker (771:6886 — a three-column wheel,
   9:00 AM – 9:00 PM on the half hour) into the popup, and its settle
   writes the time back and returns to the calendar. The scrim closes the
   popup; closing a pickup with a day but no time shows the Error variant
   first (the second tap closes anyway). The month arrows page months;
   days before the earliest allowed day are muted.
   The route render keeps the frame verbatim: 02's backdrop, the scrim,
   the Default calendar (July 2026, nothing chosen).
   The tailor's T03A proposal still uses the round-4 wheel SHEET
   (`openDateTimeOverlay('custom', …)`) — kept below unchanged.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { sheetOverlay, modalOverlay, wheelScroll, wireWheel, cta } from '../components.js';
import { calendar, wireCalendar, pickerColumns, pickerTime, cellTime, key, addDays, monthOf, addMonths, strip, sameDay } from '../calendar.js';
import { state, setAppt } from '../state.js';
import { parseWhen, STUDIO_HOURS, WHEEL_MINS } from '../data.js';
import { view02, pillText } from './02-appointment-details.js';

/* ---------- the calendar popup (02's two pills) ---------- */

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Jul 12, 7:00 PM" / "Jul 12" — the pill / state grammar (Phase R3). */
const stamp = (d, time) => `${MON[d.getMonth()]} ${d.getDate()}${time ? `, ${time}` : ''}`;
/** The Date + time a stored pill value carries (null when unset). */
function split(value) {
  const p = parseWhen(value);
  if (!p) return { day: null, time: null };
  const day = strip(p.date);
  const time = p.hour == null ? null : `${((p.hour + 11) % 12) + 1}:${String(p.min ?? 0).padStart(2, '0')} ${p.hour >= 12 ? 'PM' : 'AM'}`;
  return { day, time };
}

/* Update a filter pill's value in the live DOM — re-rendering 02 under
   the open popup would repaint the whole screen (the flash the overlay
   exists to avoid). The pill box is `${value}${chevron}`. */
function setPillValue(act, value) {
  const box = document.querySelector(`#screen [data-act="${act}"]`);
  if (box?.firstChild?.nodeType === Node.TEXT_NODE) box.firstChild.nodeValue = pillText(value);
}

/**
 * Open the calendar over the live 02. mode 'appt' = Requested time
 * (calendar mode 'pickup'), 'needby' = Need by (calendar mode 'needby',
 * anchored on the requested day). Both pills store "Jul 12, 7:00 PM"
 * (a day-only need-by stores "Jul 17").
 */
export function openCalendarOverlay(mode = 'appt') {
  const needby = mode === 'needby';
  const cur = split(needby ? state.appt?.needBy : state.appt?.when);
  const visit = split(state.appt?.when);
  const today = strip(new Date());
  /* the earliest day: today for the visit; the day after the visit for
     the need-by (Kevin: never the visit day itself) */
  const min = needby ? (visit.day ? addDays(visit.day, 1) : today) : today;
  const view = { day: cur.day, time: cur.time, month: monthOf(cur.day ?? (needby && visit.day ? visit.day : today)), error: false, picker: false };
  const save = () => {
    const act = needby ? 'needby' : 'time';
    const value = view.day ? stamp(view.day, view.time) : null;
    setAppt(needby ? 'needBy' : 'when', value);
    setPillValue(act, value);
    /* R1-U-11 / round 15: let 02 repaint the need-by validity + the rows */
    document.querySelector('#screen .filters')?.dispatchEvent(new CustomEvent('taily:appt-changed'));
  };
  const cardHtml = () => (view.picker
    ? `<div class="time-picker" data-time-picker><span class="time-picker__title">Select ${needby ? 'Need By' : 'Pickup'} Time</span>${wheelScroll(pickerColumns(view.time))}</div>`
    : calendar({
      mode: needby ? 'needby' : 'pickup',
      month: view.month,
      selected: view.day,
      anchor: needby ? visit.day : null,
      anchorTime: needby ? cellTime(visit.time) : '',
      min,
      time: view.time,
      errors: view.error ? { time: `Please select a ${needby ? 'need by' : 'pickup'} time` } : {},
    }));
  const html = `<div class="calendar-popup" data-calendar-popup>${cardHtml()}</div>`;
  modalOverlay(html, { dataS: '02.1-date-time-sheet' }, (root, close) => {
    const popup = root.querySelector('[data-calendar-popup]');
    const paint = () => {
      popup.classList.toggle('calendar-popup--picker', view.picker);
      popup.innerHTML = cardHtml();
      wire();
    };
    const wire = () => {
      if (view.picker) {
        const cols = pickerColumns(view.time);
        wireWheel(popup, () => {
          const rows = [...popup.querySelectorAll('.wheel__col--scroll')].map((col, i) => cols[i].rows[Number(col.dataset.sel)]);
          view.time = pickerTime(rows);
          view.error = false;
          save();
        });
        return;
      }
      wireCalendar(popup, {
        onDay: (d) => { view.day = d; view.error = false; save(); paint(); },
        onMonth: (n) => { view.month = addMonths(view.month, n); paint(); },
        onTime: () => { view.picker = true; view.time ??= '12:00 PM'; paint(); save(); },
      });
    };
    wire();
    /* the scrim: the picker → back to the calendar; a pickup day without
       a time → the Error variant (once); else close */
    const scrim = root.querySelector('[data-act="modal-dismiss"]');
    const fresh = scrim.cloneNode(true);
    scrim.replaceWith(fresh);
    fresh.addEventListener('click', () => {
      if (view.picker) { view.picker = false; paint(); return; }
      if (!needby && view.day && !view.time && !view.error) { view.error = true; paint(); return; }
      close();
    });
  });
}

/** Round 3 – 15 name, kept for 02's imports: 'appt' / 'needby' open the
    calendar; 'custom' (the tailor's T03A proposal) the wheel sheet. */
export function openDateTimeOverlay(mode = 'appt', onSet, opts = {}) {
  if (mode === 'custom') return openWheelSheet(onSet, opts);
  return openCalendarOverlay(mode);
}

/* ---------- the wheel sheet (T03A's proposal, rounds 4–11) ---------- */

const DAYS = Array.from({ length: 31 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  const dow = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const mon = d.toLocaleDateString('en-GB', { month: 'short' });
  return `${dow} ${d.getDate()} ${mon}`;
});
const MINS = WHEEL_MINS;
const PICKUP_HOURS = STUDIO_HOURS;

/* The T03A proposal wheel: days bounded to the ready date → need-by
   (passed in by the caller), hours 9 AM–6 PM. R4-U-03 / R4-T-01: the
   proposal passes `hoursFor(day)` / `minsFor(day, hour)` — on the
   need-by day only the slots before the need-by time are offered (the
   columns re-row as the day settles, see setWheelRows). */
function customWheel(days, { hoursFor, minsFor } = {}) {
  const rows = days?.length ? days : DAYS.slice(0, 7);
  const hours = hoursFor?.(rows[0])?.length ? hoursFor(rows[0]) : PICKUP_HOURS;
  const hSel = Math.min(1, hours.length - 1);
  const mins = minsFor?.(rows[0], hours[hSel])?.length ? minsFor(rows[0], hours[hSel]) : MINS;
  return [
    { width: 170, sel: 0, rows },
    { width: 100, sel: hSel, rows: hours },
    { width: 50, sel: 0, rows: mins },
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
  rows.forEach((r, i) => {
    const d = Math.abs(i - sel);
    const span = document.createElement('span');
    span.className = d === 0 ? 'wheel__row wheel__row--selected' : d >= 2 ? 'wheel__row wheel__row--edge' : 'wheel__row';
    span.style.width = '100%';
    span.textContent = r;
    tail.before(span);
  });
  col.dataset.sel = sel;
  col.scrollTop = sel * 40;
  return true;
}

/* 'Thu 9 Jul' -> day 'Thu, Jul 9' (sheet CTA wording) and md 'Jul 9'. */
function pick(values) {
  const [d, ...rest] = values;
  const [dow, num, mon] = d.split(' ');
  const time = rest.length === 3
    ? `${rest[0]}:${rest[1]} ${rest[2]}`
    : `${rest[0].split(' ')[0]}:${rest[1]} ${rest[0].split(' ')[1]}`;   // '9 AM' + '30'
  return { day: `${dow}, ${mon} ${num}`, md: `${mon} ${num}`, time };
}

function readPick(root, cols) {
  return pick([...root.querySelectorAll('.wheel__col--scroll')]
    .map((col, i) => cols[i].rows[Number(col.dataset.sel)]));
}

function openWheelSheet(onSet, opts = {}) {
  const cols = customWheel(opts.days, opts);
  const start = pick(cols.map((c) => c.rows[c.sel]));
  /* round 11 (Kevin): the tailor's proposal reuses this sheet with its
     own header and CTA verb — `opts.header`, `opts.cta` ("Propose") */
  const label = (p) => `${opts.cta ?? 'Set Time'} · ${p.day} at ${p.time}`;
  const content = wheelScroll(cols) + cta(label(start), { attrs: 'data-act="set-time"' });
  sheetOverlay(content, {
    header: opts.header ?? 'Custom pickup time',
    variant: 'picker',
    dataS: '02.1-date-time-sheet',
  }, (root, close) => {
    const ctaEl = root.querySelector('[data-act="set-time"]');
    const colEls = [...root.querySelectorAll('.wheel__col--scroll')];
    /* the hour / minute columns follow the day that settled */
    const capSlots = () => {
      if (!(opts.hoursFor || opts.minsFor)) return false;
      const day = cols[0].rows[Number(colEls[0].dataset.sel)];
      const hours = opts.hoursFor?.(day);
      let changed = hours?.length ? setWheelRows(colEls[1], cols[1], hours) : false;
      const hour = cols[1].rows[Number(colEls[1].dataset.sel)];
      const mins = opts.minsFor?.(day, hour);
      if (mins?.length) changed = setWheelRows(colEls[2], cols[2], mins) || changed;
      return changed;
    };
    const updateCta = () => { ctaEl.textContent = label(readPick(root, cols)); };
    wireWheel(root, () => { capSlots(); updateCta(); });
    const confirm = () => { onSet?.(readPick(root, cols)); close(); };
    root.querySelector('[data-act="sheet-confirm"]')?.addEventListener('click', confirm);
    ctaEl?.addEventListener('click', confirm);
  });
}

/* ---------- the route: the frame verbatim ---------- */

/** The frame's calendar: July 2026, nothing chosen, "Schedule Pickup". */
const FRAME_MONTH = new Date(2026, 6, 1);

function renderScreen() {
  return `<div class="screen-sheet" data-s="02.1-date-time-sheet">
  <div class="sheet-backdrop" aria-hidden="true">${view02(state)}</div>
  <div class="modal-scrim" data-act="sheet-cancel"></div>
  <div class="calendar-popup">${calendar({ mode: 'pickup', month: FRAME_MONTH })}</div>
</div>`;
}

function wire(root) {
  const dismiss = () => { back() || go('02-appointment-details'); };
  root.querySelectorAll('[data-act="sheet-cancel"]').forEach((el) => el.addEventListener('click', dismiss));
  /* the static calendar: a day tap stores it and opens the live popup */
  wireCalendar(root, {
    onDay: (d) => { setAppt('when', stamp(d, null)); dismiss(); },
    onMonth: () => {},
    onTime: () => {},
  });
}

register('02.1-date-time-sheet', renderScreen, wire);
