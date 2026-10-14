/* ============================================================
   t-thread (M5, T9) — the same conversation Sarah sees, from
   Amara's side. The thread is pinned to the ticket: a context row
   under the header names the job (status pill, visit time, link).
   Focal: the composer + newest message (M5-spec §C2, D-128…D-132).
   ============================================================ */
import { register, render as go, personaHome } from '../app.js';
import {
  state, T, now, threadFor, threadReadOnly, threadAppt, maskContact, statusScreen,
} from '../state.js';
import { setFocus, statusWord } from '../focus.js';
import { MY_TAILOR_ID, requestView, customerInitials, threadCustomerName, jobAddress } from '../tailor-data.js';
import { withLatency } from '../sim.js';
import { CHAT_LIMITS } from '../data.js';
import {
  chrome, headingRow, privacyNote, composer, readOnlyBanner, emptyState, threadHead, threadContext,
  threadMessages, countdown, openAttachSheet, wireComposer, wirePhotoViewer, toast, esc, ICON_INFO,
  heroGarment,
} from '../components.js';
import { fmtWhen } from '../dates.js';

const ID = 't-thread';
const HINT = 'Phone numbers and emails are hidden when you send.';
const ui = () => (state.ui[ID] ??= {});
const firstName = () => state.customer.first;
const maxPhotos = () => CHAT_LIMITS?.PHOTOS_MAX ?? 3;
let failSeq = 0;

/** Header sub line (B2, tailor column; amended by D-149: the place, not the time). The countdown is the `countdown` component (no interval, D-09). */
function subLine(a) {
  if (!a) return 'Asking before booking';
  if (a.status === 'requested') {
    return countdown({ expiresAt: a.expiresAt, now: now(), suffix: 'left to reply' });   // D-171: the countdown only; the context pill says "New request"
  }
  /* R5-1-T-07 (D-149): the context row owns the time and the pill; the header says where she is going */
  return esc(jobAddress(a));
}

/** The context row (B2, tailor column): the job this thread belongs to. Neighborhood-only: no street is ever printed here. */
function contextRow(a) {
  if (!a) return threadContext({ title: 'No request yet', sub: `The request shows here once ${esc(state.customer.first)} books.` });
  const w = statusWord(a, 'tailor', { short: true });
  const v = requestView(a);
  const link = a.status === 'declined' ? ''
    : a.status === 'requested' || a.status === 'suggested' ? 'View request' : 'Open job';
  return threadContext({
    pill: w.pill, pillLabel: w.label,
    title: fmtWhen(a.slot.start),
    sub: link ? `${v.visitLabel} · ${link}` : v.visitLabel,
    act: link ? 'open-appt' : '', id: a.id,
    garment: heroGarment(a.job),
  });
}

function view(s) {
  const a = threadAppt(MY_TAILOR_ID);
  const thread = threadFor(MY_TAILOR_ID);
  if (!a && !thread.messages.length) {
    return `${chrome('messages', { persona: 'tailor' })}
<main class="body ${ID}">
  ${headingRow('<h1 class="t-title">Messages</h1>', { back: false })}
  <div class="${ID}__empty" data-empty="no-job">${emptyState({ title: 'No conversation yet', body: 'Messages with a customer show up here once they send a request.', art: 'Shirt / Blouse', ctaLabel: 'Go to Home', ctaAct: 'home' })}</div>
</main>`;
  }
  const u = ui();
  const closed = threadReadOnly(MY_TAILOR_ID);
  const first = firstName();
  const draft = u.draft ?? '';
  const hint = maskContact(draft).masked ? HINT : '';
  const busy = !!u.sending;
  const gType = a?.job?.garments?.[0]?.type || '';   // chat photos are drawn as this booking's first garment (no booking → hanger)
  const head = threadHead({ initials: customerInitials(), name: threadCustomerName(), sub: subLine(a) });
  const body = thread.messages.length || u.sending || (u.failed ?? []).length
    ? threadMessages(thread.messages, { reader: 'tailor', now: now(), failed: u.failed ?? [], sending: u.sending ?? null, peer: first, photoType: gType })
    : `<p class="t-body c-600 ${ID}__empty-text">No messages yet. Say hello or ask about the fit.</p>`;
  const foot = closed
    ? readOnlyBanner({ text: 'You declined this request, so the conversation is closed.', ctaLabel: 'Back to Home', ctaAct: 'home' })
    : composer({ value: draft, placeholder: `Message ${first}`, hint, photos: u.photos ?? 0, max: maxPhotos(), disabled: busy, photoType: gType });
  return `${chrome('messages', { persona: 'tailor' })}
<main class="body ${ID}"${busy ? ' aria-busy="true"' : ''}>
  ${headingRow(head, { sticky: true })}
  <div class="${ID}__context">${contextRow(a)}</div>
  <div class="${ID}__note">${privacyNote()}</div>
  <div class="${ID}__messages">${body}</div>
</main>
<div class="${ID}__foot">${foot}</div>`;
}

/** The error echo sits above the pinned composer, never over it (B3). */
function toastAboveFoot(msg) {
  toast(msg, { tone: 'error' });
  const el = document.querySelector('.toast');
  const foot = document.querySelector(`.${ID}__foot`);
  if (el && foot) el.style.bottom = `${foot.offsetHeight + 12}px`;
}
const onScreen = () => document.querySelector('#screen')?.dataset.screen === ID;
const scrollEnd = () => window.scrollTo?.(0, document.body.scrollHeight);

/** Send one message through the simulated network. Failure keeps the text as a "Not sent · Retry" bubble (D-130). */
function deliver({ text, photos, id = '' }) {
  const u = ui();
  const masked = maskContact(text);
  u.sending = { text: masked.text, photos, masked: masked.masked };
  u.draft = ''; u.photos = 0;
  go(ID);
  scrollEnd();
  withLatency(() => {
    const r = T.sendMessage(MY_TAILOR_ID, 'tailor', { text, photos });
    u.sending = null;
    if (!r.ok) {
      (u.failed ??= []).push({ id: id || `f${++failSeq}`, text: masked.text, rawText: text, photos, masked: masked.masked });
      if (onScreen()) { go(ID); scrollEnd(); }
      toastAboveFoot('Message not sent');
      return;
    }
    if (onScreen()) { go(ID); scrollEnd(); }
  });
}

function wire(root) {
  const u = ui();
  T.markThreadRead(MY_TAILOR_ID, 'tailor');
  const foot = root.querySelector(`.${ID}__foot`);
  const input = foot?.querySelector('.composer__input');

  if (input && !input.disabled) {
    wireComposer(foot, (text) => deliver({ text, photos: u.photos ?? 0 }));
    const hintEl = foot.querySelector('#composer-hint');
    input.addEventListener('input', () => {
      u.draft = input.value;
      /* toggle the live hint in place: no re-render while typing */
      const on = maskContact(input.value).masked;
      if (!hintEl) return;
      const has = !!hintEl.textContent.trim();
      if (on && !has) {
        hintEl.innerHTML = `${ICON_INFO}<span>${HINT}</span>`;
        input.setAttribute('aria-describedby', 'composer-hint');
      } else if (!on && has) {
        hintEl.textContent = '';
        input.removeAttribute('aria-describedby');
      }
    });
  }

  wirePhotoViewer(root);
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || e.target.closest('.screen-sheet--overlay')) return;
    const act = el.dataset.act;
    if (act === 'home') go(personaHome('tailor'));
    else if (act === 'open-appt') {
      const a = threadAppt(MY_TAILOR_ID);
      if (!a) return;
      setFocus(a.id);
      go(statusScreen(a, 'tailor'));
    } else if (act === 'retry') {
      const f = (u.failed ?? []).find((x) => x.id === el.dataset.id);
      if (!f || u.sending) return;
      u.failed = u.failed.filter((x) => x !== f);
      deliver({ text: f.rawText ?? f.text, photos: f.photos ?? 0, id: f.id });
    } else if (act === 'attach-photo') {
      openAttachSheet({ count: u.photos ?? 0, max: maxPhotos() }, () => {
        u.photos = Math.min(maxPhotos(), (u.photos ?? 0) + 1);
        go(ID);
      });
    } else if (act === 'remove-attachment') {
      u.photos = Math.max(0, (u.photos ?? 0) - 1);
      go(ID);
    }
  });
}

register(ID, view, wire);
