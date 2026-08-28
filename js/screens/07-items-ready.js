/* ============================================================
   07 - Items Ready — Figma 283:1287.
   Ready hero + two fulfilment option rows (radio, labels, price)
   + Continue / Message Marco. Gap 12.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, cta } from '../components.js';
import { state, chooseFulfilment } from '../state.js';

function optionRow({ id, title, sub, price, selected }) {
  return `<button type="button" class="option-row${selected ? ' option-row--selected' : ''}" data-opt="${id}">
  <span class="option-row__radio"></span>
  <span class="option-row__labels">
    <span class="option-row__title">${title}</span>
    <span class="option-row__sub">${sub}</span>
  </span>
  <span class="option-row__price">${price}</span>
</button>`;
}

function renderScreen(s) {
  const sel = s.ui?.fulfilment ?? 'delivery';
  return `${chrome('home')}
<div class="body" data-s="07-items-ready">
  ${statusHero({ pill: false, variant: 'ready', title: 'Your items are ready.', body: 'Marco finished ahead of schedule. Choose how you’d like them back, the balance is settled upon receipt.' })}
  ${optionRow({ id: 'delivery', title: 'Home delivery', sub: 'Courier service for  88 Leonard St, 4B', price: '$10', selected: sel === 'delivery' })}
  ${optionRow({ id: 'pickup', title: 'Pickup', sub: 'From Marco’s studio · 1025 Broadway', price: 'Free', selected: sel === 'pickup' })}
  <div class="actions">
    ${cta('Continue', { attrs: 'data-act="continue"' })}
    ${cta('Message Marco', { variant: 'secondary', attrs: 'data-act="message"' })}
  </div>
</div>`;
}

function wire(root) {
  root.querySelectorAll('[data-opt]').forEach((el) => el.addEventListener('click', () => {
    state.ui ??= {};
    state.ui.fulfilment = el.dataset.opt;
    go('07-items-ready', { replace: true });
  }));
  root.querySelector('[data-act="continue"]')?.addEventListener('click', () => {
    const method = state.ui?.fulfilment ?? 'delivery';
    go(method === 'pickup' ? '07a-pickup-window' : '07b-delivery-options');
  });
  root.querySelector('[data-act="message"]')?.addEventListener('click', () => go('m1-message-tailor'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('07-items-ready', renderScreen, wire);
