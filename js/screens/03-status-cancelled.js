/* ============================================================
   05X - Appointment Cancelled V1 (Summary kept) — Figma 558:3817.
   05's chassis with a one-line error-red heading, the cancelled
   order's summary, a refund card in place of the prepare card, and
   a single Back to Home CTA. Reached from R1's confirm.
   UX-003: when R1 stashed the cancelled appointment
   (state.lastCancelled), the tailor card, garments and money render
   from it; a direct load (diff harness) renders the frame's $200
   fixture.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, summaryCard, garmentCard, feeRow, cta } from '../components.js';
import { rowPrice } from './03-status-tailoring.js';

function renderScreen(s) {
  const a = s.lastCancelled;
  const t = a?.totals ?? { subtotal: 200, deposit: 20 };
  const deposit = t.deposit ?? 20;
  const subtotal = t.subtotal ?? 200;
  const cards = a
    ? (a.garments ?? []).map((g, i) => garmentCard({
        variant: 'ViewOnly', type: g.type, qty: g.qty,
        price: rowPrice(g, t.rows, i), services: g.jobs, photos: g.photos ?? 0,
      })).join('\n      ')
    : [
        garmentCard({ variant: 'ViewOnly', type: 'Suit Jacket', qty: 1, price: '$120', services: ['Hem / Adjust Length'], photos: 2 }),
        garmentCard({ variant: 'ViewOnly', type: 'Suit Jacket', qty: 1, price: '$80', services: ['Sleeve / Adjust Length'], photos: 2 }),
      ].join('\n      ');
  const rows = a
    ? ['◉&nbsp;&nbsp;' + `${s.contact.street}, ${s.contact.unit} `, '▤&nbsp;&nbsp;' + (a.when ?? ''), '▤&nbsp;&nbsp;Need by: ' + (a.needBy ?? s.appt.needBy)]
    : ['◉&nbsp;&nbsp;88 Leonard Street ', '▤&nbsp;&nbsp;Fri, Jul 12 · 7:00PM', '▤&nbsp;&nbsp;Need by: Fri, Jul 17'];
  return `${chrome('home')}
<div class="body" data-s="03-status-cancelled">
  ${statusHero({ pill: 'declined', title: 'Appointment Cancelled', titleWeight: 600, titleColor: 'error' })}
  <div class="summary">
    ${summaryCard({ fixed: true, initials: a?.initials ?? 'MT', name: a?.name ?? 'Marco Tailor', rows })}
    <div class="garments-card">
      ${cards}
      ${feeRow(`$${subtotal}`, 'Subtotal - Confirmed at Appointment', { line: true })}
      ${feeRow(`$${deposit}`, '10% Deposit - Paid 7/7/26', { line: true })}
      ${feeRow(`$${subtotal - deposit}`, 'Balance')}
    </div>
    <div class="prepare-card">
      <p class="t-body w-500 c-500">Refund on the way</p>
      <p class="t-body c-700">Your $${deposit} deposit will be returned to Visa •••• 4242. Please rebook whenever you’re ready.</p>
    </div>
  </div>
  <div class="actions">
    ${cta('Back to Home', { attrs: 'data-act="home"' })}
  </div>
</div>`;
}

function wire(root) {
  root.querySelector('[data-act="home"]')?.addEventListener('click', () => go('01-home'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('03-status-cancelled', renderScreen, wire);
