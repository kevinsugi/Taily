/* ============================================================
   t-policy — pre-MVP A2: one Help policy for the tailor (state.ui.policy: garment · cancellation · payments · disputes · safety).
   D-21: garment protection is linked from c-pay, the courier card and Help; its copy is a COUNSEL draft and says so on the page.
   Content: js/policies.js (every number from POLICY / MONEY, dollars only); body markup: components.js policySections (c-policy shares it).
   ============================================================ */
import { register, render as go } from '../app.js';
import { state } from '../state.js';
import { policyPage } from '../policies.js';
import { chrome, headingRow, policySections, textLink, esc, ICON_HELP } from '../components.js';

const ID = 't-policy';
const WHO = 'tailor';

function view() {
  const page = policyPage(state.ui.policy ?? 'garment', WHO);
  return `${chrome('shop', { persona: 'tailor' })}
<main class="body ${ID} policy" data-s="${ID}--${page.key}">
  ${headingRow(`<h1 class="t-title">${esc(page.title)}</h1>`)}
  ${policySections(page)}
  <div class="page-actions"><div class="page-actions__links">${textLink('Get help', { act: 'help', icon: ICON_HELP })}</div></div>
</main>`;
}

function wire(root) {
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-act]')?.dataset.act === 'help') go('t-help');
  });
}

register(ID, view, wire);
