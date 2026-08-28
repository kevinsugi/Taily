/* ============================================================
   07A - Select Pickup Window — Figma 283:1328.
   Heading + two chip windows + custom-time trigger + due card +
   Confirm/Select CTAs. Gap 12.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, deliveryWindow, selectTime, cta } from '../components.js';
import { chooseFulfilment, deliver } from '../state.js';

function renderScreen() {
  return `${chrome('home')}
<div class="body" data-s="07a-pickup-window">
  <div class="heading">
    <h1 class="t-title c-ink">Pick a pickup window.</h1>
    <p class="t-body w-500 c-500">Marco’s studio · 1025 Broadway.<br>Payment is settled at handoff.</p>
  </div>
  ${deliveryWindow('Thursday, July 16', [{ label: '9–11 AM', selected: true }, { label: '12–2 PM' }, { label: '4–6 PM' }])}
  ${deliveryWindow('Friday, July 17', [{ label: '9-11 AM' }, { label: '12–2 PM' }, { label: '4–6 PM' }])}
  <div class="delivery-window">
    <span class="delivery-window__day">Request Custom Time</span>
    <div class="delivery-window__chips">${selectTime()}</div>
  </div>
  <div class="prepare-card">
    <p class="t-body w-500 c-500">Due at pickup</p>
    <p class="due-card__amount">$180 · Charged to your saved card at pickup.</p>
  </div>
  <div class="actions">
    ${cta('Confirm Pickup · Thu 9–11 AM', { attrs: 'data-act="confirm"' })}
    ${cta('Select Pickup', { variant: 'secondary', attrs: 'data-act="select"' })}
  </div>
</div>`;
}

function wire(root) {
  const confirm = () => { chooseFulfilment('pickup', 'Thu 9–11 AM'); deliver(); go('08-journey-complete'); };
  root.querySelector('[data-act="confirm"]')?.addEventListener('click', confirm);
  root.querySelector('[data-act="select"]')?.addEventListener('click', confirm);
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('07a-pickup-window', renderScreen, wire);
