/* ============================================================
   02A - Date & Time Sheet — Figma 277:2916.
   Ink@0.4 scrim over the app background + bottom picker sheet:
   40x4 grabber, ✕ / Date & Time / ✓ header, 4-column wheel
   (170/50/50/80 x 5 rows of 40), Set Time CTA.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { sheet, sheetOverlay, wheel, wheelScroll, wireWheel, cta, wireSheetA11y } from '../components.js';
import { state, setAppt } from '../state.js';
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
const WHEEL = [
  { width: 170, sel: 0, rows: DAYS },
  { width: 50, sel: 2, rows: ['7', '8', '9', '10', '11', '12', '1', '2', '3', '4', '5', '6'] },
  { width: 50, sel: 2, rows: ['00', '15', '30', '45'] },
  { width: 80, sel: 0, rows: ['AM', 'PM'] },
];

/** 'Thu 9 Jul' -> 'Thu, Jul 9' (wheel rows vs CTA/pill wording in the frame). */
function fmtDay(row) {
  const [dow, num, mon] = row.split(' ');
  return `${dow}, ${mon} ${num}`;
}

function pick([d, h, m, ap]) {
  return { day: fmtDay(d), time: `${h}:${m} ${ap}` };
}

function readPick(root) {
  return pick([...root.querySelectorAll('.wheel__col--scroll')]
    .map((col, i) => WHEEL[i].rows[Number(col.dataset.sel)]));
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
 * mode 'appt' = Requested time, 'needby' = Need By (same wheel retitled;
 * confirm stores the day only, as v3 did).
 */
export function openDateTimeOverlay(mode = 'appt') {
  const start = pick(WHEEL.map((c) => c.rows[c.sel]));
  const content = wheelScroll(WHEEL)
    + cta(`Set Time · ${start.day} at ${start.time}`, { attrs: 'data-act="set-time"' });
  sheetOverlay(content, {
    header: mode === 'needby' ? 'Need By' : 'Date &amp; Time',
    variant: 'picker',
    dataS: '02a-date-time-sheet',
  }, (root, close) => {
    const ctaEl = root.querySelector('[data-act="set-time"]');
    // CTA label follows the wheels as they settle (v3 updateWheelCta)
    wireWheel(root, () => {
      const p = readPick(root);
      ctaEl.textContent = `Set Time · ${p.day} at ${p.time}`;
    });
    const confirm = () => {
      const p = readPick(root);
      if (mode === 'needby') {
        setAppt('needBy', p.day);
        setPillValue('needby', p.day);
      } else {
        setAppt('when', `${p.day} · ${p.time}`);
        setPillValue('time', `${p.day} · ${p.time}`);
      }
      close();
    };
    root.querySelector('[data-act="sheet-confirm"]')?.addEventListener('click', confirm);
    ctaEl?.addEventListener('click', confirm);
  });
}

function renderScreen() {
  return `<div class="screen-sheet" data-s="02a-date-time-sheet">
  <div class="sheet-backdrop" aria-hidden="true">${view02(state)}</div>
  ${sheet(pickerContent(), { header: 'Date &amp; Time', variant: 'picker' })}
</div>`;
}

function wire(root) {
  const host = root.querySelector('.sheet-host');

  // Slide in only when arriving from another screen; a direct load
  // (the diff harness) renders the open state statically.
  if (history?.length === undefined ? false : root.ownerDocument.defaultView.Taily?.currentScreen?.() !== null) {
    // no-op guard; animation decided below
  }
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
    setAppt('when', `${PICK.day} · ${PICK.time}`);
    dismiss();
  };
  root.querySelector('[data-act="sheet-confirm"]')?.addEventListener('click', confirm);
  root.querySelector('[data-act="set-time"]')?.addEventListener('click', confirm);
}

register('02a-date-time-sheet', renderScreen, wire);
