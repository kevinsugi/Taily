/* ============================================================
   c-thread (M5, C12) — one conversation with one tailor.
   "The thread is pinned to the ticket": the job (status pill, visit
   time, link) sits directly under the header; the conversation and
   the composer are the focal element (M5-spec §C1).
   Before a booking the thread is a question; after, the SAME thread
   carries the request, the accept and everything after.
   ============================================================ */
import { register, render as go, currentScreen } from '../app.js';
import {
  state, T, tailorById, threadFor, threadReadOnly, threadAppt, statusScreen, now, maskContact, isBlocked, blockedBy,
} from '../state.js';
import { setFocus, statusWord } from '../focus.js';
import { withLatency } from '../sim.js';
import * as DATA from '../data.js';
import {
  chrome, headingRow, privacyNote, emptyState, chipGroup, composer, readOnlyBanner, countdown,
  threadHead, threadContext, threadMessages, openAttachSheet,
  wireChipGroups, wireComposer, wirePhotoViewer, toast, esc,
  heroGarment, moreMenu, openSafetySheet,
} from '../components.js';
import { fmtWhen } from '../dates.js';
import { ICON_INFO } from '../icons.js';

const ID = 'c-thread';
const SUGGESTIONS = ['Can you work with silk?', 'Can you take in a jacket at the shoulders?', 'How long does a hem take?'];
const HINT = 'Phone numbers and emails are hidden when you send.';
const MAX_PHOTOS = () => DATA.CHAT_LIMITS?.PHOTOS_MAX ?? 3;
const REQUEST_STATUSES = ['requested', 'suggested', 'declined', 'expired'];

/* screen-local UI (D-34, D-130): { draft, photos, failed: [{ id, text, photos }], sending: { text, photos }, seq } */
const ui = () => (state.ui[ID] ??= {});
const tailorOf = (s) => tailorById(s.ui.thread?.tailorId ?? s.ui.booking?.tailorId ?? s.tailors[0].id) ?? s.tailors[0];
const firstName = (t) => (t.name || 'the tailor').split(' ')[0];

/** The text the other side would read: contact details become [phone hidden] / [email hidden]. */
function shown(m) {
  const r = maskContact(m.text ?? '');
  return { ...m, text: r.text, masked: r.masked };
}

function headerSub(t, a) {
  const where = [t.shopName, t.shop?.hood].filter(Boolean).join(' · ');
  /* D-171: the header sub is the countdown only — the context pill below already says "Request sent" */
  if (a?.status === 'requested') return countdown({ expiresAt: a.expiresAt, now: now(), suffix: `left for ${firstName(t)} to reply` });
  return esc(where);
}

function contextRow(t, a) {
  if (!a) {
    return threadContext({
      title: 'No booking yet', sub: `See ${firstName(t)}’s prices and open times`, act: 'open-profile', id: t.id,
    });
  }
  const w = statusWord(a, 'customer', { short: true });
  const visit = DATA.VISIT_LABEL?.customer?.[a.job?.visitType] ?? '';
  const link = REQUEST_STATUSES.includes(a.status) ? 'View request' : 'View booking';
  return threadContext({
    pill: w.pill, pillLabel: w.label, title: fmtWhen(a.slot.start), sub: [visit, link].filter(Boolean).join(' · '), act: 'open-appt', id: a.id,
    garment: heroGarment(a.job),
  });
}

function emptyBlock(t) {
  return `<div class="${ID}__empty">${emptyState({
    title: `Ask ${esc(firstName(t))} a question`,
    body: 'No booking needed. Ask about a fabric, a fit, or timing — the conversation stays here if you book.',
  })}${chipGroup({ name: 'ask', label: '', options: SUGGESTIONS.map((q) => ({ value: q, label: q })), value: null })}</div>`;
}

function view(s) {
  opening = document.getElementById('screen')?.dataset.screen !== ID;
  const t = tailorOf(s);
  const first = firstName(t);
  const a = threadAppt(t.id);
  const messages = threadFor(t.id).messages;
  const closed = threadReadOnly(t.id);
  const u = s.ui[ID] ?? {};
  const draft = u.draft ?? '';
  const sending = u.sending ? shown(u.sending) : null;
  const failed = (u.failed ?? []).map(shown);
  const photoType = a?.job?.garments?.[0]?.type ?? '';   // photo placeholders draw the booking's first garment (no booking → hanger)
  const head = threadHead({ initials: t.initials, photo: t.photo, name: t.name, sub: headerSub(t, a) });

  const body = messages.length || sending || failed.length
    ? threadMessages(messages, { reader: 'customer', now: now(), failed, sending, peer: first, photoType })
    : emptyBlock(t);
  const blocked = isBlocked(t.id) ? blockedBy(t.id) : null;   // S-32 (pre-MVP A2): a block closes the chat both ways
  const foot = blocked
    ? readOnlyBanner({ text: blocked === 'customer' ? `You blocked ${first}. You can’t message or book each other. Taily is looking into it.` : `This conversation is closed. You can’t message ${first} here any more.`, ctaLabel: 'Get help', ctaAct: 'get-help' })
    : closed
    ? readOnlyBanner({
      text: `${first} declined this request, so this chat is closed. To talk again, start a new request with ${first}.`,   // SF-28
      ctaLabel: 'Find another tailor', ctaAct: 'find-another',
      secondaryLabel: 'Start a new request', secondaryAct: 'new-job',
    })
    : composer({
      value: draft, placeholder: `Message ${first}`, hint: maskContact(draft).masked ? HINT : '', photos: u.photos ?? 0, max: MAX_PHOTOS(), disabled: !!u.sending, photoType,
    });
  return `${chrome('messages')}
<main class="body ${ID}">
  ${headingRow(head, { sticky: true, trailing: moreMenu() })}
  <div class="${ID}__context">${contextRow(t, a)}</div>
  <div class="${ID}__note">${privacyNote()}</div>
  <div class="${ID}__messages">${body}</div>
</main>
<div class="${ID}__foot">${foot}</div>`;
}

/* true while the render in flight opens this screen (not a re-render of it): the view runs before the router sets data-screen */
let opening = false;
/** "Message not sent" echoes the failed bubble; the sticky composer is not an action bar, so lift the toast above it (D-71). */
function notFlagged() {
  toast('Message not sent', { tone: 'error' });
  const el = document.querySelector('.toast');
  const foot = document.querySelector(`.${ID}__foot`);
  if (el && foot) el.style.bottom = `${foot.offsetHeight + 12}px`;
}
const scrollToEnd = () => {
  const go2 = () => window.scrollTo?.(0, document.documentElement.scrollHeight);
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(go2); else go2();
};
/** Is the reader at (or within a screen-eighth of) the bottom? A re-render that grows the foot keeps her there (R5-1-C-02). */
const nearEnd = () => {
  const d = document.documentElement;
  return d.scrollHeight - (window.scrollY + window.innerHeight) < 80;
};

function wire(root) {
  const t = tailorOf(state);
  const foot = root.querySelector(`.${ID}__foot`);
  const input = foot.querySelector('.composer__input');
  const u = ui();

  /* opening a thread reads it (no re-render) */
  T.markThreadRead(t.id, 'customer');

  const setHint = () => {
    const hint = foot.querySelector('#composer-hint');
    if (!hint || !input) return;
    const on = maskContact(input.value).masked;
    hint.innerHTML = on ? `${ICON_INFO}<span>${HINT}</span>` : '';
    if (on) input.setAttribute('aria-describedby', 'composer-hint'); else input.removeAttribute('aria-describedby');
  };

  /* send / retry: show "Sending…", ask the server, then the sent bubble or "Not sent · Retry" (D-130) */
  function deliver(msg) {
    const du = ui();
    du.sending = { text: msg.text, photos: msg.photos };
    go(ID);
    scrollToEnd();
    withLatency(() => {
      const r = T.sendMessage(t.id, 'customer', { text: msg.text, photos: msg.photos });
      du.sending = null;
      if (!r.ok) {
        du.failed = [...(du.failed ?? []), { id: msg.id ?? `f${(du.seq = (du.seq ?? 0) + 1)}`, text: msg.text, photos: msg.photos }];
        if (currentScreen() === ID) { go(ID); scrollToEnd(); notFlagged(); }
        return;
      }
      if (currentScreen() === ID) { du.refocus = true; go(ID); scrollToEnd(); }
    });
  }

  if (input) {
    wireComposer(foot, (text) => {
      const photos = ui().photos ?? 0;
      ui().draft = ''; ui().photos = 0;
      deliver({ text, photos });
    });
    input.addEventListener('input', () => { ui().draft = input.value; setHint(); });
    if (u.refocus) { u.refocus = false; input.focus({ preventScroll: true }); }
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
      setHint();
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }

  wirePhotoViewer(root);

  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (act === 'retry') {
      const list = ui().failed ?? [];
      const f = list.find((x) => x.id === el.dataset.id);
      if (!f) return;
      ui().failed = list.filter((x) => x !== f);
      deliver(f);
    } else if (act === 'attach-photo') {
      openAttachSheet({ count: ui().photos ?? 0, max: MAX_PHOTOS(), peer: firstName(t) }, () => {
        const end = nearEnd();
        ui().photos = Math.min(MAX_PHOTOS(), (ui().photos ?? 0) + 1);
        go(ID);
        if (end) scrollToEnd();
      });
    } else if (act === 'remove-attachment') {
      const end = nearEnd();
      ui().photos = Math.max(0, (ui().photos ?? 0) - 1);
      go(ID);
      if (end) scrollToEnd();
    } else if (act === 'open-appt') {
      const a = threadAppt(t.id);
      if (!a) return;
      setFocus(a.id);
      go(statusScreen(a, 'customer'));
    } else if (act === 'open-profile') {
      state.ui.booking = { ...(state.ui.booking ?? {}), tailorId: t.id };
      go('c-tailor');
    } else if (act === 'more' || act === 'get-help') {   // S-32 + DG-1 B (pre-MVP A2): Report · Block · Get help
      const a = threadAppt(t.id);
      const help = () => { state.ui.help = { apptId: a?.id ?? null, caseId: null }; go('c-case'); };
      if (act === 'get-help') { help(); return; }
      openSafetySheet({ who: 'customer', other: firstName(t), apptId: a?.id ?? null, tailorId: t.id, mode: 'menu', onHelp: help,
        onDone: (c, kind) => { state.ui.help = { apptId: a?.id ?? null, caseId: c.id }; if (kind === 'block') go(ID); else go('c-case'); toast(kind === 'block' ? `${firstName(t)} is blocked. Taily has been told.` : 'Sent. Taily is looking into it.', { tone: 'success' }); } });
    } else if (act === 'find-another') go('c-tailors');
    else if (act === 'new-job') { T.newJob(); go('c-job', { fresh: true }); }
  });

  /* the newest message is what she came for (the router resets scroll to the top after wire) */
  if (opening && threadFor(t.id).messages.length) scrollToEnd();
}

register(ID, view, wire);
