/* ============================================================
   02A - Date & Time Sheet — Figma 277:2916.
   Ink@0.4 scrim over the app background + bottom picker sheet:
   40x4 grabber, ✕ / Date & Time / ✓ header, 4-column wheel
   (170/50/50/80 x 5 rows of 40), Set Time CTA.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { sheet, sheetOverlay, wheel, wheelScroll, wireWheel, cta, wireSheetA11y } from '../components.js';
import { state, setAppt } from '../state.js';
import { parseWhen, STUDIO_HOURS, WHEEL_MINS } from '../data.js';
import { view02 } from './02-appointment-details.js';

const PICK = { day: 'Thu, Jul 9', time: '9:30 AM' };

function pickerContent() {
  return wheel([
    { width: 170, rows: ['Tue 7 Jul', 'Wed 8 Jul', 'Thu 9 Jul', 'Fri 10 Jul', 'Sat 11 Jul'] },
    { width: 50, rows: ['7', '8', '9', '10', '11'] },
    { width: 50, rows: ['00', '15', '30', '45', '—'] },
    { width: 80, rows: ['', '', 'AM', 'PM', ''] },
  ]) + cta(`Set Time · ${PICK.day} at ${PICK.time}`, { attrs: 'data-act="set-time"' });
}

/* Live wheel for the overlay. Dates are REAL: today (whenever the app
   is opened) through 30 days out, opened with today selected; time
   columns keep the frame's 9:30 AM default. The static route render
   keeps the frame's fictional July dates for the diff harness. */
const DAYS = Array.from({ length: 31 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  const dow = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const mon = d.toLocaleDateString('en-GB', { month: 'short' });
  return `${dow} ${d.getDate()} ${mon}`;
});
const HOURS = ['7', '8', '9', '10', '11', '12', '1', '2', '3', '4', '5', '6'];
const MINS = WHEEL_MINS;
/* Custom pickup hours (R1-U-11): studio hours only, 9 AM – 6 PM (the
   list lives in data.js since round 4 — proposalHours caps it) */
const PICKUP_HOURS = STUDIO_HOURS;

/* The requested-time / need-by wheel. mode 'needby' opens ON the
   requested date (R1-U-11) so a need-by before the appointment takes
   effort rather than being the default. */
function apptWheel(mode) {
  let daySel = 0;
  if (mode === 'needby') {
    const p = parseWhen(state.appt.when);
    const label = p ? `${p.dow} ${p.day} ${p.mon}` : '';
    daySel = Math.max(0, DAYS.indexOf(label));
  }
  return [
    { width: 170, sel: daySel, rows: DAYS },
    { width: 50, sel: 2, rows: HOURS },
    { width: 50, sel: 2, rows: MINS },
    { width: 80, sel: 0, rows: ['AM', 'PM'] },
  ];
}

/* The 05A/05B custom-pickup wheel: days bounded to the ready date →
   need-by (passed in by the caller), hours 9 AM–6 PM. R4-U-03 /
   R4-T-01: the T03A proposal passes `hoursFor(day)` / `minsFor(day,
   hour)` — on the need-by day only the slots before the need-by time
   are offered (the columns re-row as the day settles, see
   setWheelRows). */
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

/* 'Thu 9 Jul' -> day 'Thu, Jul 9' (sheet CTA wording, per the frame)
   and md 'Jul 9' (pill wording — Phase R3, Kevin: pills read
   "Jul 12, 7:00 PM"). */
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

/* Update a filter pill's value in the live DOM — re-rendering 02 under
   the open sheet would repaint the whole screen (the flash the overlay
   exists to avoid). The pill box is `${value}${chevron}`. */
function setPillValue(act, value) {
  const box = document.querySelector(`#screen [data-act="${act}"]`);
  if (box?.firstChild?.nodeType === Node.TEXT_NODE) box.firstChild.nodeValue = value;
}

/**
 * Open the wheel picker over the live screen (v3 timeSheetMode parity):
 * mode 'appt' = Requested time, 'needby' = Need By (same wheel
 * retitled). Phase R3 (Kevin): both pills store "Jul 12, 7:00 PM"
 * format. mode 'custom' (07A/07B custom windows) skips the pill/state
 * writes and hands the pick to `onSet`; `opts.days` bounds its dates,
 * `opts.hoursFor(day)` / `opts.minsFor(day, hour)` cap its slots per
 * day (R4-U-03 / R4-T-01).
 */
export function openDateTimeOverlay(mode = 'appt', onSet, opts = {}) {
  const cols = mode === 'custom' ? customWheel(opts.days, opts) : apptWheel(mode);
  const start = pick(cols.map((c) => c.rows[c.sel]));
  const content = wheelScroll(cols)
    + cta(`Set Time · ${start.day} at ${start.time}`, { attrs: 'data-act="set-time"' });
  sheetOverlay(content, {
    header: mode === 'needby' ? 'Need By' : mode === 'custom' ? 'Custom pickup time' : 'Date &amp; Time',
    variant: 'picker',
    dataS: '02.1-date-time-sheet',
  }, (root, close) => {
    const ctaEl = root.querySelector('[data-act="set-time"]');
    const colEls = [...root.querySelectorAll('.wheel__col--scroll')];
    /* the hour / minute columns follow the day that settled */
    const capSlots = () => {
      if (mode !== 'custom' || !(opts.hoursFor || opts.minsFor)) return false;
      const day = cols[0].rows[Number(colEls[0].dataset.sel)];
      const hours = opts.hoursFor?.(day);
      let changed = hours?.length ? setWheelRows(colEls[1], cols[1], hours) : false;
      const hour = cols[1].rows[Number(colEls[1].dataset.sel)];
      const mins = opts.minsFor?.(day, hour);
      if (mins?.length) changed = setWheelRows(colEls[2], cols[2], mins) || changed;
      return changed;
    };
    const updateCta = () => {
      const p = readPick(root, cols);
      ctaEl.textContent = `Set Time · ${p.day} at ${p.time}`;
    };
    // CTA label follows the wheels as they settle (v3 updateWheelCta)
    wireWheel(root, () => { capSlots(); updateCta(); });
    const confirm = () => {
      const p = readPick(root, cols);
      if (mode === 'custom') {
        onSet?.(p);
      } else {
        const value = `${p.md}, ${p.time}`;
        setAppt(mode === 'needby' ? 'needBy' : 'when', value);
        setPillValue(mode === 'needby' ? 'needby' : 'time', value);
        /* R1-U-11: let 02 repaint the need-by validity in place */
        document.querySelector('#screen .filters')?.dispatchEvent(new CustomEvent('taily:appt-changed'));
      }
      close();
    };
    root.querySelector('[data-act="sheet-confirm"]')?.addEventListener('click', confirm);
    ctaEl?.addEventListener('click', confirm);
  });
}

function renderScreen() {
  return `<div class="screen-sheet" data-s="02.1-date-time-sheet">
  <div class="sheet-backdrop" aria-hidden="true">${view02(state)}</div>
  ${sheet(pickerContent(), { header: 'Date &amp; Time', variant: 'picker' })}
</div>`;
}

function wire(root) {
  const host = root.querySelector('.sheet-host');

  // Slide in only when arriving from another screen; a direct load
  // (the diff harness) renders the open state statically.
  const cameFromApp = window.__tailyNavigated === true;
  if (cameFromApp && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    host.dataset.open = 'false';
    requestAnimationFrame(() => requestAnimationFrame(() => { host.dataset.open = 'true'; }));
  }

  const dismiss = () => {
    if (host.dataset.open) {
      host.dataset.open = 'false';
      setTimeout(() => back() || go('02-appointment-details'), 300);
    } else {
      back() || go('02-appointment-details');
    }
  };

  root.querySelectorAll('[data-act="sheet-cancel"]').forEach((el) => el.addEventListener('click', dismiss));
  wireSheetA11y(root, dismiss);
  const confirm = () => {
    setAppt('when', 'Jul 9, 9:30 AM');
    dismiss();
  };
  root.querySelector('[data-act="sheet-confirm"]')?.addEventListener('click', confirm);
  root.querySelector('[data-act="set-time"]')?.addEventListener('click', confirm);
}

register('02.1-date-time-sheet', renderScreen, wire);
