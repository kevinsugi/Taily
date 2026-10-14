/* ============================================================
   c-messages (M5, C12) — the Messages tab. One conversation per tailor,
   newest first, each row says what was last said and whether it is new.
   Focal: the top (newest) thread row. First load shows skeleton rows
   (D-141); no threads is a real empty state (M5-spec §C1).
   ============================================================ */
import { register, render as go, currentScreen } from '../app.js';
import { state, tailorById, threadsFor, threadPreview, now } from '../state.js';
import { statusWord } from '../focus.js';
import { withLatency } from '../sim.js';
import { chrome, headingRow, threadRow, emptyState, skeleton, heroGarment } from '../components.js';
import { fmtTime, fmtShort, isoDay } from '../dates.js';

const ID = 'c-messages';

/* screen-local UI (D-34, D-141): { loaded } — the first visit asks "the server" once */
const ui = () => (state.ui[ID] ??= {});

const stamp = (iso) => (isoDay(iso) === isoDay(now()) ? fmtTime(iso) : fmtShort(iso));

function rowFor(r) {
  const t = tailorById(r.tailorId);
  const w = r.appt ? statusWord(r.appt, 'customer', { short: true }) : { pill: '', label: '' };
  return threadRow({
    id: r.tailorId, name: t.name, initials: t.initials, photo: t.photo,
    preview: threadPreview(r.last, 'customer'), time: stamp(r.last.at), unread: r.unread,
    pill: w.pill, pillLabel: w.label, closed: r.readOnly, garment: heroGarment(r.appt?.job),
  });
}

function view(s) {
  const head = `${chrome('messages')}<main class="body ${ID}" data-s="${ID}">
  ${headingRow('<h1 class="t-title">Messages</h1>', { back: false })}`;
  if (!(s.ui[ID] ?? {}).loaded) {
    return `${head}
  <div class="${ID}__list" aria-busy="true"><div class="thread-list">${skeleton({ kind: 'thread-row', count: 3 })}</div></div>
</main>`;
  }
  const threads = threadsFor('customer');
  if (!threads.length) {
    return `${head}
  <div class="${ID}__empty" data-empty="messages">${emptyState({
    title: 'No messages yet', body: 'Ask a tailor a question from their profile. No booking needed.', ctaLabel: 'Find a tailor', ctaAct: 'home', art: 'Shirt / Blouse',
  })}</div>
</main>`;
  }
  return `${head}
  <div class="${ID}__list"><div class="thread-list">${threads.map(rowFor).join('')}</div></div>
</main>`;
}

function wire(root) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || e.target.closest('.screen-sheet--overlay')) return;
    if (el.dataset.act === 'open-thread') {
      state.ui.thread = { tailorId: el.dataset.id };
      go('c-thread');
    } else if (el.dataset.act === 'home') go('c-job', { fresh: true });
  });

  /* the skeleton is showing: "ask the server", then paint the list (instant under test, 'hold' never ends).
     The listener is already on — an instant load re-renders this screen from inside this call. */
  if (!ui().loaded) {
    let sync = true;
    withLatency(() => {
      if (!sync && currentScreen() !== ID) return;
      ui().loaded = true;
      go(ID);
    });
    sync = false;
  }
}

register(ID, view, wire);
