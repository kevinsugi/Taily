/* ============================================================
   02A - Date & Time Sheet — Figma 277:2916.
   Ink@0.4 scrim over the app background + bottom picker sheet:
   40x4 grabber, ✕ / Date & Time / ✓ header, 4-column wheel
   (170/50/50/80 x 5 rows of 40), Set Time CTA.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { sheet, wheel, cta, wireSheetA11y } from '../components.js';
import { state, setAppt } from '../state.js';
import { view02 } from './02-appointment-details.js';

const PICK = { day: 'Thu, Jul 9', time: '9:30 AM' };

function renderScreen() {
  const content = wheel([
    { width: 170, rows: ['Tue 7 Jul', 'Wed 8 Jul', 'Thu 9 Jul', 'Fri 10 Jul', 'Sat 11 Jul'] },
    { width: 50, rows: ['7', '8', '9', '10', '11'] },
    { width: 50, rows: ['00', '15', '30', '45', '—'] },
    { width: 80, rows: ['', '', 'AM', 'PM', ''] },
  ]) + cta(`Set Time · ${PICK.day} at ${PICK.time}`, { attrs: 'data-act="set-time"' });

  return `<div class="screen-sheet" data-s="02a-date-time-sheet">
  <div class="sheet-backdrop" aria-hidden="true">${view02(state)}</div>
  ${sheet(content, { header: 'Date &amp; Time', variant: 'picker' })}
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
