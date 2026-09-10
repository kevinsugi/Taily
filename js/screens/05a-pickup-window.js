/* ============================================================
   07A - Select Pickup Window — Figma 283:1328.
   Heading + two chip windows + custom-time trigger + due card +
   Confirm/Select CTAs. Gap 12.
   Phase R3 (Kevin): chips SELECT (shared selection with 07B, kept in
   state.ui.window, defaulting to the FIRST option — the frames still
   draw Fri 4–6 PM selected; raised), the confirm CTA follows the
   selection, Request Custom Time opens the wheel picker, and the
   secondary CTA cross-navigates to 07B.
   UX-LOOP R1-U-02: the amount due reads the live final order;
   R1-U-11: the custom picker is bounded to ready date → need-by and
   9 AM–6 PM.
   UX-LOOP round 6 (Kevin, UX-008 resolved): the CTA carries the DATED
   window ("Confirm Pickup · Fri, Jul 17 · 4–6 PM") and the secondary
   reads "Switch to Delivery" (07B: "Switch to Pickup"); frames edited
   to match. The deep link opens on the frames' Fri 4–6 PM selection.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, deliveryWindow, selectTime, cta, dueBase } from '../components.js';
import { money, dayRows, fmtDay, handoffWindows } from '../data.js';
import { state, chooseFulfilment, finalOrder } from '../state.js';
import { openDateTimeOverlay } from './02.1-date-time-sheet.js';
import { openWindowConfirmed } from './05.1-window-confirmed.js';
import { currentAppt } from './03-status-confirmed.js';

/* UX-LOOP R2-U-02: the two window days are derived from the
   appointment (readyAt → need-by, data.js handoffWindows) — the seed
   still yields the frames' Thu Jul 16 / Fri Jul 17. */
export const windowsFor = (s = state) => handoffWindows(currentAppt(s));

/** The pickup/delivery window selection, shared by 07A and 07B. */
export function winSel(s = state) {
  s.ui ??= {};
  /* live: the FIRST option (Phase R3, Kevin); the harness deep link
     (no navigation yet) opens on the frames' selection — Fri, Jul 17 ·
     4–6 PM — so the R6 dated CTA reads exactly as the frame draws it */
  s.ui.window ??= window.__tailyNavigated
    ? { w: 0, c: 0, custom: null, customDay: null }
    : { w: 1, c: 2, custom: null, customDay: null };
  const sel = s.ui.window;
  /* a shorter range (one day) must not strand an older selection */
  const wins = windowsFor(s);
  if (sel.w >= wins.length) sel.w = 0;
  if (sel.c >= (wins[sel.w]?.chips.length ?? 0)) sel.c = 0;
  return sel;
}

/** "Fri 4–6 PM" — the CTA copy (undated per R1-U-17, Kevin's call). */
export function windowLabel(sel, wins = windowsFor()) {
  return sel.custom ?? `${wins[sel.w].abbr} ${wins[sel.w].chips[sel.c]}`;
}
/** The chosen window's calendar day ("Jul 17") for receipts. */
export function windowDate(sel, wins = windowsFor()) {
  return sel.custom ? sel.customDay : wins[sel.w].date;
}
/** "Fri, Jul 17 · 4–6 PM" — the dated label stored on the fulfilment
    (05.1's When row, the card meta, 03/Tailoring's hero — R2-U-02). */
export function windowDated(sel, wins = windowsFor()) {
  if (sel.custom) return `${fmtDay(sel.customDay, sel.customDay)} · ${sel.customTime ?? sel.custom}`;
  return `${fmtDay(wins[sel.w].date, wins[sel.w].abbr)} · ${wins[sel.w].chips[sel.c]}`;
}

/** Amount due at handoff for the appointment being viewed, before
    delivery (R7): the alterations + any re-tiered visitation fee —
    the fee itself was charged on acceptance. 05B adds the $20. */
export function amountDue(s) {
  return dueBase(finalOrder(currentAppt(s)).totals);
}

export function windowsHtml(sel, wins = windowsFor()) {
  return wins.map((w, wi) => deliveryWindow(w.day, w.chips.map((label, ci) => ({
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
    Object.assign(sel, { w: Number(chip.dataset.win), c: Number(chip.dataset.chip), custom: null, customDay: null });
    go(screenId, { replace: true });
  }));
  root.querySelector('[data-act="custom-time"]')?.addEventListener('click', () => {
    /* R1-U-11: only days between the ready date and the need-by */
    const a = currentAppt(state);
    const wins = windowsFor(state);
    const days = dayRows(a.readyAt ?? wins[0].date, a.needBy ?? wins[wins.length - 1].date);
    openDateTimeOverlay('custom', (p) => {
      sel.custom = `${p.day} at ${p.time}`;
      sel.customDay = p.day;
      sel.customTime = p.time;
      go(screenId, { replace: true });
    }, { days });
  });
}

function renderScreen(s) {
  const sel = winSel(s);
  const a = currentAppt(s);
  const first = (a.name ?? 'Marco Tailor').split(' ')[0];
  return `${chrome('home')}
<div class="body" data-s="05a-pickup-window">
  <div class="heading">
    <h1 class="t-title c-ink">Select a pickup window.</h1>
    <p class="t-body w-500 c-500">${first}’s studio · 1025 Broadway.<br>Payment is settled at handoff.</p>
  </div>
  ${windowsHtml(sel)}
  <div class="prepare-card">
    <p class="t-body w-500 c-500">Due at pickup</p>
    <p class="due-card__amount">${money(amountDue(s))} · Charged to your saved card at pickup.</p>
  </div>
  <div class="actions">
    ${cta(`Confirm Pickup · ${windowDated(sel)}`, { attrs: 'data-act="confirm"' })}
    ${cta('Switch to Delivery', { variant: 'secondary', attrs: 'data-act="select"' })}
  </div>
</div>`;
}

function wire(root) {
  wireWindows(root, '05a-pickup-window');
  /* Phase R6 (Kevin): confirming opens the Window Confirmed modal —
     the order stays 'ready' until the TAILOR confirms the handoff. */
  root.querySelector('[data-act="confirm"]')?.addEventListener('click', () => {
    const sel = winSel();
    const when = windowDated(sel);   // R2-U-02: the stored window carries its date
    chooseFulfilment('pickup', when, windowDate(sel), currentAppt(state));
    openWindowConfirmed({ method: 'pickup', when });
  });
  root.querySelector('[data-act="select"]')?.addEventListener('click', () => go('05b-delivery-options'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('05a-pickup-window', renderScreen, wire);
