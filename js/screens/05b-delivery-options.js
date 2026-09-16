/* ============================================================
   07B - Delivery Options — Figma 283:1372.
   Heading + address card + chip windows + custom time + the
   due-at-delivery summary + Confirm/Select CTAs. Gap 12.
   Phase R3 (Kevin): chips SELECT (selection shared with 07A via
   state.ui.window, default first option — the frame draws Fri 4–6 PM;
   raised), confirm CTA follows the selection, Request Custom Time
   opens the wheel picker, the secondary CTA cross-navigates to 07A,
   and Change address opens the 02B sheet.
   UX-LOOP R1-U-02: the summary rows read the live final order.
   UX-LOOP round 6 (Kevin, UX-008 resolved): dated CTA ("Confirm
   Delivery · Fri, Jul 17 · 4–6 PM") + "Switch to Pickup" — see 05A.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, infoCard, infoRow, cta, headingRow } from '../components.js';
import { money, DELIVERY_FEE } from '../data.js';
import { finalOrder } from '../state.js';
import { state, chooseFulfilment, homeAddress, FIXTURE_CONTACT } from '../state.js';
import { winSel, windowDate, windowDated, windowsHtml, wireWindows, amountDue } from './05a-pickup-window.js';
import { openAddressOverlay } from './02.2-address-sheet.js';
import { openWindowConfirmed } from './05.1-window-confirmed.js';
import { currentAppt } from './03-status-confirmed.js';

/* Exported: 07C draws this screen (dimmed) as its frame backdrop. */
export function viewDelivery(s) {
  const sel = winSel(s);
  const due = amountDue(s);
  /* R7: Alterations / [Additional visitation fee] / Delivery / Due at
     delivery — the visitation fee was charged on acceptance. Figma
     sync pending (the frame draws Balance due / Delivery / Charged). */
  const t = finalOrder(currentAppt(s)).totals ?? {};
  const added = t.visitFeeAdded ?? 0;
  const rows = [
    infoRow('Alterations', money(due - added)),
    ...(added > 0 ? [infoRow('Additional visitation fee', money(added))] : []),
    infoRow('Delivery', money(DELIVERY_FEE)),
    infoRow('Due at delivery', money(due + DELIVERY_FEE), { total: true }),
  ];
  return `${chrome('home')}
<div class="body" data-s="05b-delivery-options">
  ${headingRow(`<div class="heading">
    <h1 class="t-title c-ink">Delivery details.</h1>
    <p class="t-body w-500 c-500">Please select your preferred delivery window.</p>
  </div>`)}
  <div class="prepare-card">
    <p class="t-caps c-500">DELIVER TO</p>
    <p class="t-body w-600 c-ink" data-addr-full>${homeAddress()} — New York, NY ${s.contact.zip || FIXTURE_CONTACT.zip}</p>
    <button type="button" class="t-small w-600 address-card__change" data-act="change">Change address</button>
  </div>
  ${windowsHtml(sel)}
  ${infoCard(rows.join(''))}
  <div class="actions">
    ${cta(`Confirm Delivery · ${windowDated(sel)}`, { attrs: 'data-act="confirm"' })}
    ${cta('Switch to Pickup', { variant: 'secondary', attrs: 'data-act="select"' })}
  </div>
</div>`;
}

function wire(root) {
  wireWindows(root, '05b-delivery-options');
  /* Phase R6 (Kevin): confirming opens the Window Confirmed modal —
     the order stays 'ready' until the TAILOR confirms the handoff. */
  root.querySelector('[data-act="confirm"]')?.addEventListener('click', () => {
    const sel = winSel();
    const when = windowDated(sel);   // R2-U-02: the stored window carries its date
    chooseFulfilment('delivery', when, windowDate(sel), currentAppt(state));
    openWindowConfirmed({ method: 'delivery', when });
  });
  root.querySelector('[data-act="select"]')?.addEventListener('click', () => go('05a-pickup-window'));
  root.querySelector('[data-act="change"]')?.addEventListener('click', () => openAddressOverlay());
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('05b-delivery-options', viewDelivery, wire);
