/* ============================================================
   07B - Delivery Options — Figma 283:1372.
   Heading + address card + chip windows + custom time + balance
   summary + Confirm/Select CTAs. Gap 12.
   Phase R3 (Kevin): chips SELECT (selection shared with 07A via
   state.ui.window, default first option — the frame draws Fri 4–6 PM;
   raised), confirm CTA follows the selection, Request Custom Time
   opens the wheel picker, the secondary CTA cross-navigates to 07A,
   and Change address opens the 02B sheet.
   UX-LOOP R1-U-02: the balance rows read the live final order.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, infoCard, infoRow, cta } from '../components.js';
import { money } from '../data.js';
import { chooseFulfilment } from '../state.js';
import { winSel, windowLabel, windowDate, windowsHtml, wireWindows, amountDue } from './05a-pickup-window.js';
import { openAddressOverlay } from './02.2-address-sheet.js';
import { openWindowConfirmed } from './05.1-window-confirmed.js';

/* Exported: 07C draws this screen (dimmed) as its frame backdrop. */
export function viewDelivery(s) {
  const sel = winSel(s);
  const due = amountDue(s);
  return `${chrome('home')}
<div class="body" data-s="05b-delivery-options">
  <div class="heading">
    <h1 class="t-title c-ink">Delivery details.</h1>
    <p class="t-body w-500 c-500">Please select your preferred delivery window.</p>
  </div>
  <div class="prepare-card">
    <p class="t-caps c-500">DELIVER TO</p>
    <p class="t-body w-600 c-ink" data-addr-full>${s.contact.street}, ${s.contact.unit} — New York, NY ${s.contact.zip}</p>
    <button type="button" class="t-small w-600 address-card__change" data-act="change">Change address</button>
  </div>
  ${windowsHtml(sel)}
  ${infoCard([
    infoRow('Balance due', money(due)),
    infoRow('Delivery', '$20'),
    infoRow('Charged on delivery', money(due + 20), { total: true }),
  ].join(''))}
  <div class="actions">
    ${cta(`Confirm Delivery · ${windowLabel(sel)}`, { attrs: 'data-act="confirm"' })}
    ${cta('Select Pickup', { variant: 'secondary', attrs: 'data-act="select"' })}
  </div>
</div>`;
}

function wire(root) {
  wireWindows(root, '05b-delivery-options');
  /* Phase R6 (Kevin): confirming opens the Window Confirmed modal —
     the order stays 'ready' until the TAILOR confirms the handoff. */
  root.querySelector('[data-act="confirm"]')?.addEventListener('click', () => {
    const sel = winSel();
    const when = windowLabel(sel);
    chooseFulfilment('delivery', when, windowDate(sel));
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
