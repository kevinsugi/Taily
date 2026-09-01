/* ============================================================
   M1 - Message Tailor — Figma 282:1239.
   Chat head (back ‹, avatar, name/meta, status pill), TODAY caps,
   T2 bubbles, composer with send. Gap 12.

   Functional: one thread per tailor kept on state.chats, opened for
   whatever appointment currentAppt points at. The Marco seed carries
   the frame's conversation and header subline verbatim, so the
   direct diff load matches the frame; typing + send (button or
   Enter) appends a bubble in place and the tailor answers after a
   beat. v3 had no chat behaviour — this is new, prototype-canned.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { chrome, statusPill, bubble } from '../components.js';
import { state } from '../state.js';

/* The frame's conversation (282:1239) — Marco's seeded thread. */
const SEED_THREAD = [
  { who: 'them', text: 'Hi Kevin — see you Thursday at 9:30. Please have both jackets ready, and the shoes you plan to wear with them.' },
  { who: 'me', text: 'Will do! The buzzer is 4B — call if it acts up.' },
  { who: 'them', text: 'Perfect. See you then.' },
];

const REPLIES = [
  'Got it — thanks!',
  'Perfect, noted.',
  'Sounds good — see you soon.',
];

function currentAppointment(s) {
  const cur = s.currentAppt ?? { list: 'upcoming', index: 0 };
  return s[cur.list]?.[cur.index] ?? s.upcoming[0] ?? {};
}

function threadFor(s, a) {
  s.chats ??= {};
  const key = a.displayName ?? a.name ?? 'Marco Tailor';
  if (!s.chats[key]) {
    const first = key.split(' ')[0];
    // chatMeta marks the frame-seeded Marco appointment
    s.chats[key] = a.chatMeta
      ? [...SEED_THREAD]
      : [{ who: 'them', text: `Hi Kevin — ${first} here. How can I help?` }];
  }
  return s.chats[key];
}

/** a.status -> a Status Pill variant that exists. */
function pillStatus(status) {
  const s = String(status ?? 'confirmed').toLowerCase();
  if (s === 'searching') return 'requested';
  if (s === 'delivered') return 'completed';
  return s;
}

function renderScreen(s) {
  const a = currentAppointment(s);
  const name = a.displayName ?? a.name ?? 'Marco Tailor';
  const first = name.split(' ')[0];
  const meta = a.chatMeta ?? [a.when, a.visit].filter(Boolean).join(' · ');
  const msgs = threadFor(s, a).map((m) => bubble(m.text, m.who)).join('\n  ');

  return `${chrome('home')}
<div class="body" data-s="m1-message-tailor">
  <div class="chat-head">
    <button type="button" class="chat-head__back" data-act="back">‹</button>
    <span class="chat-head__avatar">${a.initials ?? 'MT'}</span>
    <div class="chat-head__names">
      <span class="t-body w-700 c-ink">${name}</span>
      <span class="t-small c-500">${meta}</span>
    </div>
    ${statusPill(pillStatus(a.status))}
  </div>
  <p class="t-caps c-500 chat-day">TODAY, 4:12 PM</p>
  ${msgs}
  <div class="composer">
    <input class="composer__input" placeholder="Message ${first}…" aria-label="Message ${first}">
    <button type="button" class="composer__send" aria-label="Send">↑</button>
  </div>
</div>`;
}

function wire(root) {
  const a = currentAppointment(state);
  const thread = threadFor(state, a);
  const input = root.querySelector('.composer__input');
  const composerEl = root.querySelector('.composer');

  const addBubble = (text, who) => {
    thread.push({ who, text });
    composerEl.insertAdjacentHTML('beforebegin', bubble(text, who));
  };
  let ri = 0;
  const send = () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addBubble(text, 'me');
    const reply = REPLIES[ri++ % REPLIES.length];
    setTimeout(() => {
      // navigated away mid-reply: keep the message in the thread only
      if (root.isConnected) addBubble(reply, 'them');
      else thread.push({ who: 'them', text: reply });
    }, 1100);
  };
  root.querySelector('.composer__send')?.addEventListener('click', send);
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

  root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('09-bookings'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('m1-message-tailor', renderScreen, wire);
