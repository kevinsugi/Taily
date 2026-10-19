/* ============================================================
   c-help — pre-MVP A2 (DG-1 option B's shared Help page, B-05): Taily Help for the customer. Message Taily, her conversations with
   Taily (open first), the topics that need no order, Taily's contact details and the policies (garment protection, D-21). Account's
   Help row lands here (track B2); a HELP reply to any text links here. The body is components.js helpHome (t-help shares it).
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, T, apptsFor, tailorById } from '../state.js';
import { chrome, headingRow, helpHome, openSafetySheet, toast } from '../components.js';

const ID = 'c-help';
const WHO = 'customer';

function view() {
  return `${chrome('account')}
<main class="body ${ID} help-home" data-s="${ID}">
  ${headingRow('<h1 class="t-title">Help</h1>')}
  ${helpHome(WHO)}
</main>`;
}

function wire(root) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || e.target.closest('.screen-sheet--overlay')) return;
    const act = el.dataset.act;
    if (act === 'open-case') { state.ui.help = { caseId: el.dataset.case }; go('c-case'); }
    else if (act === 'new-case') {
      const topic = el.dataset.topic ?? null;
      if (!topic) { state.ui.help = { caseId: null, apptId: null }; go('c-case'); return; }
      const r = T.openCase({ who: WHO, topic });   // a topic row is the chip: it opens the conversation with those words
      if (!r.ok) { toast(r.error === 'offline' ? 'You’re offline. Nothing was sent.' : 'Couldn’t send this. Try again.', { tone: 'error' }); return; }
      state.ui.help = { caseId: r.case.id };
      go('c-case');
    } else if (act === 'safety') {
      const a = apptsFor(WHO)[0] ?? null;   // her latest booking's tailor is the one she would report or block
      const t = tailorById(a?.tailorId) ?? state.tailors[0];
      openSafetySheet({ who: WHO, other: (t?.name || 'your tailor').split(' ')[0], apptId: a?.id ?? null, tailorId: t?.id, mode: 'menu',
        onDone: (c) => { state.ui.help = { caseId: c.id }; go('c-case'); toast('Sent. Taily is looking into it.', { tone: 'success' }); } });
    } else if (act === 'policy') { state.ui.policy = el.dataset.policy; go('c-policy'); }
  });
}

register(ID, view, wire);
