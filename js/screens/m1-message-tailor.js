/* ============================================================
   M1 - Message Tailor — Figma 282:1239.
   Chat head (back ‹, avatar, name/meta, Confirmed pill), TODAY
   caps, three T2 bubbles, composer with send. Gap 12.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { chrome, statusPill, bubble } from '../components.js';

function renderScreen() {
  return `${chrome('home')}
<div class="body" data-s="m1-message-tailor">
  <div class="chat-head">
    <button type="button" class="chat-head__back" data-act="back">‹</button>
    <span class="chat-head__avatar">MT</span>
    <div class="chat-head__names">
      <span class="t-body w-700 c-ink">Marco Tailor</span>
      <span class="t-small c-500">Thu, Jul 9 · 9:30 AM · Home Visit</span>
    </div>
    ${statusPill('confirmed')}
  </div>
  <p class="t-caps c-500 chat-day">TODAY, 4:12 PM</p>
  ${bubble('Hi Kevin — see you Thursday at 9:30. Please have both jackets ready, and the shoes you plan to wear with them.', 'them')}
  ${bubble('Will do! The buzzer is 4B — call if it acts up.', 'me')}
  ${bubble('Perfect. See you then.', 'them')}
  <div class="composer">
    <span class="composer__hint">Message Marco…</span>
    <button type="button" class="composer__send" aria-label="Send">↑</button>
  </div>
</div>`;
}

function wire(root) {
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('09-bookings'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('m1-message-tailor', renderScreen, wire);
