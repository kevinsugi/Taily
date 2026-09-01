/* ============================================================
   06 - Order Status — Figma 282:1283.
   Tailoring pill ("In Progress"), Medium hero, 12px sub,
   five-step timeline card, Message Marco CTA. Gap 12.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusPill, timeline, cta } from '../components.js';

function renderScreen() {
  return `${chrome('home')}
<div class="body" data-s="06-order-status">
  ${statusPill('tailoring', 'In Progress')}
  <h1 class="t-title c-ink">Your garments are with Marco.</h1>
  <p class="t-small c-500 hero-sub">Measured and pinned at your appointment on Thu, Jul 9. We’ll tell you the moment they’re ready.</p>
  ${timeline([
    { state: 'done', title: 'Appointment completed', sub: 'Thu, Jul 9 · 9:30 AM' },
    { state: 'done', title: 'Final order approved', sub: '$280 confirmed · Jul 9' },
    { state: 'current', title: 'Tailoring in progress', sub: 'Est. ready Thu, Jul 16' },
    { state: 'todo', title: 'Ready — choose pickup or delivery' },
    { state: 'todo', title: 'Back with you' },
  ])}
  ${cta('Message Marco', { variant: 'secondary', attrs: 'data-act="message"' })}
</div>`;
}

function wire(root) {
  root.querySelector('[data-act="message"]')?.addEventListener('click', () => go('m1-message-tailor'));
  // demo affordance: tapping the timeline opens the final-order review
  root.querySelector('.timeline')?.addEventListener('click', () => go('06a-review-approve'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('06-order-status', renderScreen, wire);
