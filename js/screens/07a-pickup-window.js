/* ============================================================
   07A - Select Pickup Window — Figma 283:1328.
   Heading + two chip windows + custom-time trigger + due card +
   Confirm/Select CTAs. Gap 12.
   Phase R3 (Kevin): chips SELECT (shared selection with 07B, kept in
   state.ui.window, defaulting to the FIRST option — the frames still
   draw Fri 4–6 PM selected; raised), the confirm CTA follows the
   selection, Request Custom Time opens the wheel picker, and the
   secondary CTA cross-navigates to 07B.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, deliveryWindow, selectTime, cta } from '../components.js';
import { state, chooseFulfilment } from '../state.js';
import { openDateTimeOverlay } from './02a-date-time-sheet.js';
import { openWindowConfirmed } from './07c-window-confirmed.js';

export const WINDOWS = [
  { day: 'Thursday, July 16', abbr: 'Thu', chips: ['9–11 AM', '12–2 PM', '4–6 PM'] },
  { day: 'Friday, July 17', abbr: 'Fri', chips: ['9-11 AM', '12–2 PM', '4–6 PM'] },
];

/** The pickup/delivery window selection, shared by 07A and 07B. */
export function winSel(s = state) {
  s.ui ??= {};
  s.ui.window ??= { w: 0, c: 0, custom: null };
  return s.ui.window;
}

export function windowLabel(sel) {
  return sel.custom ?? `${WINDOWS[sel.w].abbr} ${WINDOWS[sel.w].chips[sel.c]}`;
}

export function windowsHtml(sel) {
  return WINDOWS.map((w, wi) => deliveryWindow(w.day, w.chips.map((label, ci) => ({
    label,
    selected: !sel.custom && sel.w === wi && sel.c === ci,
    attrs: `data-win="${wi}" data-chip="${ci}"`,
  })))).join('\n  ')
  + `<div class="delivery-window">
    <span class="delivery-window__day">Request Custom Time</span>
    <div class="delivery-window__chips">${selectTime(sel.custom ?? 'Select Time', { attrs: 'data-act="custom-time"' })}</div>
  </div>`;
}

/** Chip selection + the custom-time picker; re-renders in place. */
export function wireWindows(root, screenId) {
  const sel = winSel();
  root.querySelectorAll('[data-win]').forEach((chip) => chip.addEventListener('click', () => {
    Object.assign(sel, { w: Number(chip.dataset.win), c: Number(chip.dataset.chip), custom: null });
    go(screenId, { replace: true });
  }));
  root.querySelector('[data-act="custom-time"]')?.addEventListener('click', () =>
    openDateTimeOverlay('custom', (p) => {
      sel.custom = `${p.day} at ${p.time}`;
      go(screenId, { replace: true });
    }));
}

function renderScreen(s) {
  const sel = winSel(s);
  return `${chrome('home')}
<div class="body" data-s="07a-pickup-window">
  <div class="heading">
    <h1 class="t-title c-ink">Pick a pickup window.</h1>
    <p class="t-body w-500 c-500">Marco’s studio · 1025 Broadway.<br>Payment is settled at handoff.</p>
  </div>
  ${windowsHtml(sel)}
  <div class="prepare-card">
    <p class="t-body w-500 c-500">Due at pickup</p>
    <p class="due-card__amount">$340 · Charged to your saved card at pickup.</p>
  </div>
  <div class="actions">
    ${cta(`Confirm Pickup · ${windowLabel(sel)}`, { attrs: 'data-act="confirm"' })}
    ${cta('Select Delivery', { variant: 'secondary', attrs: 'data-act="select"' })}
  </div>
</div>`;
}

function wire(root) {
  wireWindows(root, '07a-pickup-window');
  /* Phase R6 (Kevin): confirming opens the Window Confirmed modal —
     the order stays 'ready' until the TAILOR confirms the handoff. */
  root.querySelector('[data-act="confirm"]')?.addEventListener('click', () => {
    const when = windowLabel(winSel());
    chooseFulfilment('pickup', when);
    openWindowConfirmed({ method: 'pickup', when });
  });
  root.querySelector('[data-act="select"]')?.addEventListener('click', () => go('07b-delivery-options'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('07a-pickup-window', renderScreen, wire);
