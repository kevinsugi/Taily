/* ============================================================
   c-thread (M1 stub, key c-thread--new) — "Ask a question".
   Ask the tailor anything before booking. Focal: the composer,
   pinned to the bottom. Full thread rules arrive in M5
   (M1-spec §C1).
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, T, tailorById, threadFor, threadReadOnly } from '../state.js';
import {
  chrome, headingRow, avatar, privacyNote, emptyState, chipGroup, chatBubble, composer, readOnlyBanner,
  wireChipGroups, wireComposer, toast, esc,
} from '../components.js';
import { fmtTime } from '../dates.js';

const ID = 'c-thread';
const SUGGESTIONS = ['Can you work with silk?', 'Can you take in a jacket at the shoulders?', 'How long does a hem take?'];

const ui = () => (state.ui[ID] ??= {});
const tailorOf = (s) => tailorById(s.ui.booking?.tailorId ?? s.tailors[0].id) ?? s.tailors[0];
const firstName = (t) => (t.name || 'the tailor').split(' ')[0];

function messageHtml(m) {
  if (m.from === 'system') return `<p class="t-small c-500 ${ID}__system">${esc(m.text)}</p>`;
  return chatBubble({ text: m.text, side: m.from === 'customer' ? 'me' : 'them', time: fmtTime(m.at), photos: m.photos, masked: m.masked });
}

function view(s) {
  const t = tailorOf(s);
  const messages = threadFor(t.id).messages;
  const closed = threadReadOnly(t.id);
  const draft = (s.ui[ID] ?? {}).draft ?? '';
  const where = [t.shopName, t.shop?.hood].filter(Boolean).join(' · ');
  const head = `<div class="${ID}__who">${avatar({ initials: t.initials, photo: t.photo, size: 'sm' })}
    <div class="${ID}__who-text"><span class="t-body w-600 ${ID}__who-name">${esc(t.name)}</span><span class="t-small c-600">${esc(where)}</span></div></div>`;
  const body = messages.length
    ? `<div class="${ID}__messages" aria-live="polite">${messages.map(messageHtml).join('')}</div>`
    : `<div class="${ID}__empty">${emptyState({
      title: `Ask ${esc(firstName(t))} a question`,
      body: 'No booking needed. Ask about a fabric, a fit, or timing — the conversation stays here if you book.',
    })}${chipGroup({ name: 'ask', label: '', options: SUGGESTIONS.map((q) => ({ value: q, label: q })), value: null })}</div>`;
  const foot = closed
    ? readOnlyBanner({ text: `${firstName(t)} can’t take this job, so this chat is closed.` })
    : composer({ value: draft, placeholder: `Message ${firstName(t)}` });
  return `${chrome('messages')}
<main class="body ${ID}">
  ${headingRow(head)}
  <div class="${ID}__note">${privacyNote()}</div>
  ${body}
</main>
<div class="${ID}__foot">${foot}</div>`;
}

function wire(root) {
  const t = tailorOf(state);
  const foot = root.querySelector(`.${ID}__foot`);
  const input = foot.querySelector('.composer__input');

  if (input) {
    wireComposer(foot, (text) => {
      const r = T.sendMessage(t.id, 'customer', { text });
      if (!r.ok) { ui().draft = text; toast('Couldn’t send. Try again.', { tone: 'error' }); go(ID); return; }
      ui().draft = '';
      go(ID);
      window.scrollTo?.(0, document.body.scrollHeight);
    });
    input.addEventListener('input', () => { ui().draft = input.value; });
  }

  /* chips fill the composer, they never send */
  const chips = root.querySelector('[data-chip-group]');
  if (chips && input) {
    const holder = chips.parentElement;
    wireChipGroups(holder);
    holder.addEventListener('chip', (e) => {
      input.value = e.detail.value;
      ui().draft = input.value;
      foot.querySelector('.composer__send').disabled = !input.value.trim();
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }

  foot.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="find-another"]')) go('c-tailors');
    else if (e.target.closest('[data-act="attach-photo"]')) toast('Photos arrive with messaging');
  });
}

register(ID, view, wire);
