/* ============================================================
   M1 - Message Tailor — Figma 282:1239.
   Chat head (back ‹, avatar, name/meta, status pill), TODAY caps,
   T2 bubbles, composer with send. Gap 12.

   Functional: one thread per tailor kept on state.chats, opened for
   whatever appointment currentAppt points at (the tailor persona
   opens Sarah's job). Every message carries an ABSOLUTE author —
   'tailor' | 'customer' — and each persona renders its own side
   (UX-LOOP R1-T-04); the greeting carries a {name} token so Kevin
   reads "Hi Kevin" and Marco's view reads "Hi Sarah". The header
   subline is computed from the appointment for both personas
   (R1-U-08 / R1-T-16); the harness deep link keeps the frame's
   "Sun, Jul 12 · 7:00 PM · Home Visit". Typing + send (button or
   Enter) appends a bubble in place and the other side answers after
   a beat. v3 had no chat behaviour — this is new, prototype-canned.
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { chrome, statusPill, bubble } from '../components.js';
import { fmtWhen, fmtDay } from '../data.js';
import { state, canonicalStatus } from '../state.js';
import { tailorChrome, wireTailorNav } from '../tailor-components.js';
import { job, isFixture } from '../tailor-data.js';

/* The frame's conversation (282:1239) — Marco's seeded thread. */
const SEED_THREAD = [
  { who: 'tailor', text: 'Hi {name} — see you Sunday at 7:00PM. Please have both jackets ready, and the shoes you plan to wear with them.' },
  { who: 'customer', text: 'Will do! The buzzer is 4B — call if it acts up.' },
  { who: 'tailor', text: 'Perfect. See you then.' },
];

const REPLIES = [
  'Got it — thanks!',
  'Perfect, noted.',
  'Sounds good — see you soon.',
];

const FRAME_META = 'Sun, Jul 12 · 7:00 PM · Home Visit';

function currentAppointment(s) {
  if (s.persona === 'tailor') return job(s) ?? {};
  const cur = s.currentAppt ?? { list: 'upcoming', index: 0 };
  return s[cur.list]?.[cur.index] ?? s.upcoming[0] ?? {};
}

function threadFor(s, a) {
  s.chats ??= {};
  const key = a.displayName ?? a.name ?? 'Marco Tailor';
  if (!s.chats[key]) {
    const first = key.split(' ')[0];
    /* the seeded appointment (it alone carries the 01 card's `items`
       copy) opens with the frame's conversation */
    s.chats[key] = a.mine && a.items
      ? SEED_THREAD.map((m) => ({ ...m }))
      : [{ who: 'tailor', text: `Hi {name} — ${first} here. How can I help?` }];
  }
  return s.chats[key];
}

/** a.status -> a Status Pill variant that exists. */
function pillStatus(status) {
  const s = String(status ?? 'confirmed').toLowerCase();
  if (s === 'searching') return 'requested';
  if (s === 'delivered') return 'completed';
  if (s === 'expired') return 'declined';
  return s;
}

/** Header subline for both personas: the appointment, or the handoff once ready. */
function chatMeta(a) {
  const canon = canonicalStatus(String(a.status ?? 'confirmed').toLowerCase());
  const day = fmtDay(a.needBy, 'Fri, Jul 17');
  if (canon === 'ready-for-pickup') return `Ready for ${a.fulfilment?.method === 'delivery' ? 'delivery' : 'pickup'} · ${day}`;
  if (canon === 'delivered') return `Completed · ${day}`;
  return [fmtWhen(a.when, ''), a.visit].filter(Boolean).join(' · ') || FRAME_META;
}

function renderScreen(s) {
  const a = currentAppointment(s);
  /* Phase T: the tailor sees the same thread from Marco's side —
     Sarah in the header, her own messages on the right. */
  const tailor = s.persona === 'tailor';
  const me = tailor ? 'tailor' : 'customer';
  const name = tailor ? 'Sarah Chen' : (a.displayName ?? a.name ?? 'Marco Tailor');
  const first = name.split(' ')[0];
  const customerName = tailor ? 'Sarah' : 'Kevin';
  const meta = isFixture() ? FRAME_META : chatMeta(a);
  const msgs = threadFor(s, a).map((m) => bubble(m.text.replace('{name}', customerName), m.who === me ? 'me' : 'them')).join('\n  ');

  return `${tailor ? tailorChrome('home') : chrome('home')}
<div class="body" data-s="10-messages">
  <div class="chat-head">
    <button type="button" class="chat-head__back" data-act="back">‹</button>
    <span class="chat-head__avatar">${tailor ? 'SC' : (a.initials ?? 'MT')}</span>
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
  const tailor = state.persona === 'tailor';
  const me = tailor ? 'tailor' : 'customer';
  const other = tailor ? 'customer' : 'tailor';
  const input = root.querySelector('.composer__input');
  const composerEl = root.querySelector('.composer');

  const addBubble = (text, who) => {
    thread.push({ who, text });
    composerEl.insertAdjacentHTML('beforebegin', bubble(text, who === me ? 'me' : 'them'));
  };
  let ri = 0;
  const send = () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addBubble(text, me);
    const reply = REPLIES[ri++ % REPLIES.length];
    setTimeout(() => {
      // navigated away mid-reply: keep the message in the thread only
      if (root.isConnected) addBubble(reply, other);
      else thread.push({ who: other, text: reply });
    }, 1100);
  };
  root.querySelector('.composer__send')?.addEventListener('click', send);
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

  if (tailor) {
    root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('t01-home'));
    wireTailorNav(root);
    return;
  }
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('09-bookings'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('10-messages', renderScreen, wire);
