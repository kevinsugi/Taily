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
  /* Dynamic per the appointment currentAppt points at — the Marco seed
     reproduces the frame's copy verbatim (double space after "for"
     included, a frame quirk). */
  const cur = s.currentAppt ?? { list: 'upcoming', index: 0 };
  const a = s[cur.list]?.[cur.index] ?? s.upcoming[0] ?? {};
  const first = (a.name ?? 'Marco Tailor').split(' ')[0];
  const studio = (a.place ?? '1025 Broadway').split(',')[0];
  return `${chrome('home')}
<div class="body" data-s="05-items-ready">
  ${statusHero({ pill: 'ready', variant: 'ready', title: 'Your items are ready.', titleWeight: 600, titleColor: 'success', body: `${first} finished ahead of schedule. Choose how you’d like them back, the balance is settled upon receipt.` })}
  ${optionRow({ id: 'delivery', title: 'Home delivery', sub: `Courier service for  ${s.contact.street}, ${s.contact.unit}`, price: '$20', selected: sel === 'delivery' })}
  ${optionRow({ id: 'pickup', title: 'Pickup', sub: `From ${first}’s studio · ${studio}`, price: 'Free', selected: sel === 'pickup' })}
  <div class="actions">
    ${cta('Continue', { attrs: 'data-act="continue"' })}
    ${cta(`Message ${first}`, { variant: 'secondary', attrs: 'data-act="message"' })}
  </div>
</div>`;
}

function wire(root) {
  root.querySelectorAll('[data-opt]').forEach((el) => el.addEventListener('click', () => {
    state.ui ??= {};
    state.ui.fulfilment = el.dataset.opt;
    go('05-items-ready', { replace: true });
  }));
  root.querySelector('[data-act="continue"]')?.addEventListener('click', () => {
    const method = state.ui?.fulfilment ?? 'delivery';
    go(method === 'pickup' ? '05a-pickup-window' : '05b-delivery-options');
  });
  root.querySelector('[data-act="message"]')?.addEventListener('click', () => go('10-messages'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('05-items-ready', renderScreen, wire);
