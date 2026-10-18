/* ============================================================
   t-help — pre-MVP A2 (DG-1 option B's shared Help page, B-05): Taily Help for the tailor. Message Taily, her conversations with
   Taily (open first), the topics that need no job, Taily's contact details and the policies (garment protection, D-21). Shop → Account's
   Help row lands here (track B2); a HELP reply to any text links here. The body is components.js helpHome (c-help shares it).
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, T, apptsFor } from '../state.js';
import { chrome, headingRow, helpHome, openSafetySheet, toast } from '../components.js';

const ID = 't-help';
const WHO = 'tailor';

function view() {
  return `${chrome('shop', { persona: 'tailor' })}
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
    if (act === 'open-case') { state.ui.help = { caseId: el.dataset.case }; go('t-case'); }
    else if (act === 'new-case') {
      const topic = el.dataset.topic ?? null;
      if (!topic) { state.ui.help = { caseId: null, apptId: null }; go('t-case'); return; }
      const r = T.openCase({ who: WHO, topic });   // a topic row is the chip: it opens the conversation with those words
      if (!r.ok) { toast(r.error === 'offline' ? 'You’re offline. Nothing was sent.' : 'Couldn’t send this. Try again.', { tone: 'error' }); return; }
      state.ui.help = { caseId: r.case.id };
      go('t-case');
    } else if (act === 'safety') {
      const a = apptsFor(WHO)[0] ?? null;   // her latest job's customer is the one she would report or block
      openSafetySheet({ who: WHO, other: state.customer.first, apptId: a?.id ?? null, tailorId: state.tailors[0].id, mode: 'menu',
        onDone: (c) => { state.ui.help = { caseId: c.id }; go('t-case'); toast('Sent. Taily is looking into it.', { tone: 'success' }); } });
    } else if (act === 'policy') { state.ui.policy = el.dataset.policy; go('t-policy'); }
  });
}

register(ID, view, wire);
