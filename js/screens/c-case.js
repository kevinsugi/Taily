/* ============================================================
   c-case — pre-MVP A2 (K-49 DG-1 option B, K-48.1): the Taily Help thread for the customer. Opened by "Get help" (the person button
   on c-booking, c-request, c-ready, c-complete, c-price-change), Help home, a case strip, or a Taily text. Pinned to the order (the
   context row) or to nothing; Taily's greeting + the topic chips that fit the order's state until she writes; then the case runs as
   this thread (masked like every chat): "Taily is reviewing · Reply by …" (K-16) while Taily owes the answer, the decision in dollars
   when it closes. The view and wiring are components.js helpThreadView / wireHelpThread (t-case shares them).
   ============================================================ */
import { register, render as go } from '../app.js';
import { statusScreen } from '../state.js';
import { chrome, headingRow, privacyNote, helpThreadView, wireHelpThread } from '../components.js';

const ID = 'c-case';
const WHO = 'customer';

function view() {
  const v = helpThreadView(WHO);
  return `${chrome('account')}
<main class="body ${ID} help-thread" data-s="${ID}"${v.caseId ? ` data-case="${v.caseId}"` : ''}>
  ${headingRow(v.head, { sticky: true })}
  ${v.strip ? `<div class="help-thread__strip">${v.strip}</div>` : ''}
  <div class="help-thread__context">${v.context}</div>
  <div class="help-thread__note">${privacyNote()}</div>
  <div class="help-thread__messages">${v.body}</div>
</main>
<div class="help-thread__foot">${v.foot}</div>`;
}

function wire(root) {
  wireHelpThread(root, WHO, { go, id: ID, statusScreenOf: (a) => statusScreen(a, WHO) });
}

register(ID, view, wire);
