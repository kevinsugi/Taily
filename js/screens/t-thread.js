/* ============================================================
   t-thread (M3 stub, D-81; full rules arrive in M5) — the job's
   chat for Amara, so "Message Sarah" is never a dead end. Mirrors
   c-thread from the tailor side. Focal: the composer, pinned to
   the bottom (M3-spec §C2).
   ============================================================ */
import { register, render as go, personaHome } from '../app.js';
import { state, T, getAppt, apptsFor, threadFor, threadReadOnly } from '../state.js';
import { focusAppt } from '../focus.js';
import { MY_TAILOR_ID, requestView, customerName, customerInitials } from '../tailor-data.js';
import {
  chrome, headingRow, avatar, privacyNote, chatBubble, composer, readOnlyBanner, emptyState,
  wireComposer, toast, esc,
} from '../components.js';
import { fmtWhen, fmtTime } from '../dates.js';

const ID = 't-thread';
const ui = () => (state.ui[ID] ??= {});

/** The job this chat is about: the focused appointment when it is Amara's, else her newest job, else her newest request. */
function jobOf() {
  const f = state.ui.apptId ? getAppt(state.ui.apptId) : null;
  if (f && apptsFor('tailor').includes(f)) return f;
  return focusAppt('t-job') ?? focusAppt('t-request');
}

function messageHtml(m) {
  if (m.from === 'system') return `<p class="t-small c-500 ${ID}__system">${esc(m.tailorText ?? m.text)}</p>`;
  return chatBubble({ text: m.text, side: m.from === 'tailor' ? 'me' : 'them', time: fmtTime(m.at), photos: m.photos, masked: m.masked });
}

function view(s) {
  const a = jobOf();
  if (!a) {
    return `${chrome('messages', { persona: 'tailor' })}
<main class="body ${ID}">
  ${headingRow('<h1 class="t-title">Messages</h1>')}
  <div class="${ID}__empty" data-empty="no-job">${emptyState({ title: 'No conversation yet', body: 'Messages with a customer show up here once she has sent a request.', ctaLabel: 'Go to Home', ctaAct: 'home' })}</div>
</main>`;
  }
  const v = requestView(a);
  const messages = threadFor(MY_TAILOR_ID).messages;
  const closed = threadReadOnly(MY_TAILOR_ID);
  const first = customerName(a).split(' ')[0];
  const draft = (s.ui[ID] ?? {}).draft ?? '';
  const head = `<div class="${ID}__who">${avatar({ initials: customerInitials(), size: 'sm' })}
    <div class="${ID}__who-text"><span class="t-body w-600 ${ID}__who-name">${esc(customerName(a))}</span><span class="t-small c-600">${fmtWhen(a.slot.start)} · ${esc(v.visitLabel)}</span></div></div>`;
  const body = messages.length
    ? `<div class="${ID}__messages" aria-live="polite">${messages.map(messageHtml).join('')}</div>`
    : `<p class="t-body c-600 ${ID}__empty-text">No messages yet. Say hello or ask about the fit.</p>`;
  const foot = closed
    ? readOnlyBanner({ text: `You declined this request, so the conversation is closed.`, ctaLabel: 'Back to Home', ctaAct: 'home' })
    : composer({ value: draft, placeholder: `Message ${first}` });
  return `${chrome('messages', { persona: 'tailor' })}
<main class="body ${ID}">
  ${headingRow(head)}
  <div class="${ID}__note">${privacyNote()}</div>
  ${body}
</main>
<div class="${ID}__foot">${foot}</div>`;
}

function wire(root) {
  const foot = root.querySelector(`.${ID}__foot`);
  const input = foot?.querySelector('.composer__input');

  if (input) {
    wireComposer(foot, (text) => {
      const r = T.sendMessage(MY_TAILOR_ID, 'tailor', { text });
      if (!r.ok) { ui().draft = text; toast('Message not sent. Try again.', { tone: 'error' }); go(ID); return; }
      ui().draft = '';
      go(ID);
      window.scrollTo?.(0, document.body.scrollHeight);
    });
    input.addEventListener('input', () => { ui().draft = input.value; });
  }

  root.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'home') go(personaHome('tailor'));
    else if (act === 'attach-photo') toast('Photos arrive with messaging');
  });
}

register(ID, view, wire);
