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
   "Sun, Jul 12 · 7:00 PM · Home Visit"; the tailor page's frame
   TM1 - Message Customer (570:8782) is covered by the `t10-messages`
   route, which renders this screen as Marco. Typing + send (button or
   Enter) appends a bubble in place and the other side answers after
   a beat. v3 had no chat behaviour — this is new, prototype-canned.
   UX-LOOP round 6: T04's Contact Taily Support opens this screen on
   a canned SUPPORT thread (`state.tailorUi.chat === 'support'`, set by
   openChat): avatar TS, "Taily Support", "Usually replies in 10 min",
   no pill; one seed bubble from Support and one canned reply per
   send. It lives on `state.chats.support` (authors 'support' /
   'tailor') — the job thread is untouched. The customer side prints
   the tailor's name / initials through tailorName() / tailorInitials()
   (unassigned until a tailor accepts).
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { chrome, statusPill, bubble } from '../components.js';
import { fmtWhen, fmtDay } from '../data.js';
import { state, canonicalStatus } from '../state.js';
import { tailorChrome, wireTailorNav, pill } from '../tailor-components.js';
import { current, jobView, isFixture, isSeed, tailorUi, tailorName, tailorInitials } from '../tailor-data.js';

/* Round 6: the canned Taily Support thread (tailor side only). */
const SUPPORT = {
  name: 'Taily Support', initials: 'TS', meta: 'Usually replies in 10 min',
  seed: 'Hi Marco — Taily Support here. How can we help with this visit?',
  reply: 'Thanks, we’re on it. A specialist will reply within 10 minutes.',
};
const isSupport = (s) => s.persona === 'tailor' && tailorUi(s).chat === 'support';
function supportThread(s) {
  s.chats ??= {};
  s.chats.support ??= [{ who: 'support', text: SUPPORT.seed }];
  return s.chats.support;
}

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
  if (s.persona === 'tailor') return current(s) ?? {};   // the tapped job (R2-T-01)
  const cur = s.currentAppt ?? { list: 'upcoming', index: 0 };
  return s[cur.list]?.[cur.index] ?? s.upcoming[0] ?? {};
}

function threadFor(s, a) {
  s.chats ??= {};
  /* keyed by the assigned tailor (never the "Matching…" placeholder) */
  const key = a.name ?? 'Marco Tailor';
  if (!s.chats[key]) {
    const first = key.split(' ')[0];
    /* the seeded appointment opens with the frame's conversation */
    s.chats[key] = isSeed(a)
      ? SEED_THREAD.map((m) => ({ ...m }))
      : [{ who: 'tailor', text: `Hi {name} — ${first} here. How can I help?` }];
  }
  /* Round 10: Marco's note after resending the edited order lands the same way */
  if (a.pendingTailorNote) {
    s.chats[key].push({ who: 'tailor', text: String(a.pendingTailorNote) });
    a.pendingTailorNote = null;
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

/** Header subline for both personas: the appointment, or the handoff
    once ready (R2-T-10: dated by the chosen window's day when there is
    one, else need-by). */
function chatMeta(a) {
  const canon = canonicalStatus(String(a.status ?? 'confirmed').toLowerCase());
  const day = fmtDay(a.fulfilment?.date ?? a.needBy, 'Fri, Jul 17');
  if (canon === 'ready-for-pickup') return `Ready for ${a.fulfilment?.method === 'delivery' ? 'delivery' : 'pickup'} · ${day}`;
  if (canon === 'delivered') return `Completed · ${day}`;
  return [fmtWhen(a.when, ''), a.visit].filter(Boolean).join(' · ') || FRAME_META;
}

/** The header pill: the tailor reads his own vocabulary (jobView —
    "Awaiting Customer", "Ready for Delivery"), the customer hers. */
function headPill(a, tailor) {
  if (!tailor) return statusPill(pillStatus(a.status));
  const v = jobView(a);
  return pill(v.pill, v.pillLabel);
}

export function renderScreen(s) {
  const a = currentAppointment(s);
  /* Phase T: the tailor sees the same thread from Marco's side —
     Sarah in the header, her own messages on the right. */
  const tailor = s.persona === 'tailor';
  const support = isSupport(s);
  const me = tailor ? 'tailor' : 'customer';
  const name = support ? SUPPORT.name : tailor ? 'Sarah Chen' : (tailorName(a) || 'Marco Tailor');
  const first = support ? SUPPORT.name : name.split(' ')[0];
  const initials = support ? SUPPORT.initials : tailor ? 'SC' : (tailorInitials(a) || 'MT');
  const customerName = tailor ? 'Sarah' : 'Kevin';
  const meta = support ? SUPPORT.meta : isFixture() ? FRAME_META : chatMeta(a);
  const thread = support ? supportThread(s) : threadFor(s, a);
  const msgs = thread.map((m) => bubble(m.text.replace('{name}', customerName), m.who === me ? 'me' : 'them')).join('\n  ');

  return `${tailor ? tailorChrome('home') : chrome('home')}
<div class="body" data-s="10-messages"${support ? ' data-thread="support"' : ''}>
  <div class="chat-head">
    <button type="button" class="chat-head__back" data-act="back">‹</button>
    <span class="chat-head__avatar">${initials}</span>
    <div class="chat-head__names">
      <span class="t-body w-700 c-ink">${name}</span>
      <span class="t-small c-500">${meta}</span>
    </div>
    ${support ? '' : headPill(a, tailor)}
  </div>
  <p class="t-caps c-500 chat-day">TODAY, 4:12 PM</p>
  ${msgs}
  <div class="composer">
    <input class="composer__input" placeholder="Message ${first}…" aria-label="Message ${first}">
    <button type="button" class="composer__send" aria-label="Send">↑</button>
  </div>
</div>`;
}

export function wire(root) {
  const a = currentAppointment(state);
  const tailor = state.persona === 'tailor';
  const support = isSupport(state);
  const thread = support ? supportThread(state) : threadFor(state, a);
  const me = tailor ? 'tailor' : 'customer';
  const other = support ? 'support' : tailor ? 'customer' : 'tailor';
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
    /* round 6: Support always answers with the same canned line */
    const reply = support ? SUPPORT.reply : REPLIES[ri++ % REPLIES.length];
    setTimeout(() => {
      // navigated away mid-reply: keep the message in the thread only
      if (root.isConnected) addBubble(reply, other);
      else thread.push({ who: other, text: reply });
    }, 1100);
  };
  root.querySelector('.composer__send')?.addEventListener('click', send);
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

  if (tailor) {
    /* back returns wherever Marco came from (T04 for the support thread) */
    root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go(support ? 't04-appointment-details' : 't01-home'));
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
