/* ============================================================
   07B - Delivery Options — Figma 283:1372.
   Heading + address card + chip windows + custom time + balance
   summary + Confirm/Select CTAs. Gap 12.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, deliveryWindow, selectTime, infoCard, infoRow, cta } from '../components.js';
import { chooseFulfilment, deliver } from '../state.js';

function renderScreen() {
  return `${chrome('home')}
<div class="body" data-s="07b-delivery-options">
  <div class="heading">
    <h1 class="t-title c-ink">Delivery details.</h1>
    <p class="t-body w-500 c-500">Please select your preferred delivery window.</p>
  </div>
  <div class="prepare-card">
    <p class="t-caps c-500">DELIVER TO</p>
    <p class="t-body w-600 c-ink">88 Leonard St, 4B — New York, NY 10013</p>
    <button type="button" class="t-small w-600 address-card__change" data-act="change">Change address</button>
  </div>
  ${deliveryWindow('Thursday, July 16', [{ label: '9–11 AM', selected: true }, { label: '12–2 PM' }, { label: '4–6 PM' }])}
  ${deliveryWindow('Friday, July 17', [{ label: '9-11 AM' }, { label: '12–2 PM' }, { label: '4–6 PM' }])}
  <div class="delivery-window">
    <span class="delivery-window__day">Request Custom Time</span>
    <div class="delivery-window__chips">${selectTime()}</div>
  </div>
  ${infoCard([
    infoRow('Balance due', '$180'),
    infoRow('Delivery', '$30'),
    infoRow('Charged on delivery', '$210', { total: true }),
  ].join(''))}
  <div class="actions">
    ${cta('Confirm Delivery · Thu 9-11 AM', { attrs: 'data-act="confirm"' })}
    ${cta('Select Delivery', { variant: 'secondary', attrs: 'data-act="select"' })}
  </div>
</div>`;
}

function wire(root) {
  const confirm = () => { chooseFulfilment('delivery', 'Thu 9-11 AM'); deliver(); go('08-journey-complete'); };
  root.querySelector('[data-act="confirm"]')?.addEventListener('click', confirm);
  root.querySelector('[data-act="select"]')?.addEventListener('click', confirm);
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('07b-delivery-options', renderScreen, wire);
