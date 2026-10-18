/* ============================================================
   t-messages (M5, T9) — Amara's Messages tab: one conversation per
   customer, newest first. Focal: the top (newest) row. Requests and
   jobs link from inside each thread (M5-spec §C2, D-128, D-141).
   ============================================================ */
import { register, render as go, personaHome, currentScreen } from '../app.js';
import { state, now, threadsFor, threadPreview } from '../state.js';
import { statusWord } from '../focus.js';
import { threadCustomerName, customerInitials } from '../tailor-data.js';
import { withLatency } from '../sim.js';
import { chrome, headingRow, threadRow, skeleton, emptyState, heroGarment } from '../components.js';
import { fmtTime, fmtShort, isoDay } from '../dates.js';

const ID = 't-messages';
/* screen-local UI: state.ui['t-messages'] = { loaded } (D-34, D-141) */
const ui = () => (state.ui[ID] ??= {});

const stamp = (iso) => (isoDay(iso) === isoDay(now()) ? fmtTime(iso) : fmtShort(iso));

function rowsHtml() {
  const name = threadCustomerName();
  const initials = customerInitials();
  return threadsFor('tailor').map((r) => {
    const w = r.appt ? statusWord(r.appt, 'tailor', { short: true }) : null;
    return threadRow({
      id: r.tailorId, act: 'open-thread', name, initials,
      preview: threadPreview(r.last, 'tailor'), time: stamp(r.last.at), unread: r.unread,
      pill: w?.pill ?? '', pillLabel: w?.label ?? '', closed: r.readOnly, garment: heroGarment(r.appt?.job),
    });
  }).join('');
}

function view(s) {
  const loaded = !!(s.ui[ID] ?? {}).loaded;
  const threads = loaded ? threadsFor('tailor') : [];
  let body;
  if (!loaded) body = `<div class="${ID}__list" data-loading="true"><div class="thread-list">${skeleton({ kind: 'thread-row', count: 3 })}</div></div>`;
  else if (!threads.length) {
    body = `<div class="${ID}__empty" data-empty="no-threads">${emptyState({ title: 'No messages yet', art: 'Shirt / Blouse', body: 'When a customer asks a question or sends a request, the conversation shows up here.', ctaLabel: 'Back to Home', ctaAct: 'home' })}</div>`;
  } else body = `<div class="thread-list ${ID}__list">${rowsHtml()}</div>`;
  return `${chrome('messages', { persona: 'tailor' })}
<main class="body ${ID}">
  ${headingRow('<h1 class="t-title">Messages</h1>', { back: false })}
  ${body}
</main>`;
}

let cancelLoad = () => {};

function wire(root) {
  cancelLoad();
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    if (el.dataset.act === 'open-thread') go('t-thread');
    else if (el.dataset.act === 'home') go(personaHome('tailor'));
  });

  /* first visit: "ask the server", then paint the list (instant under test, 'hold' never ends).
     Listeners go on first — an instant load re-renders this screen from inside this call. */
  if (!ui().loaded) {
    let sync = true;
    cancelLoad = withLatency(() => {
      if (!sync && currentScreen() !== ID) return;
      ui().loaded = true;
      go(ID);
    });
    sync = false;
  }
}

register(ID, view, wire);
