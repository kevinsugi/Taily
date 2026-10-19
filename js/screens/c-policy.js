/* ============================================================
   c-policy — THE customer policy / legal page (state.ui.policy): the Help policies (pre-MVP A2: garment protection, cancellation
   and refunds, payments, disputes, safety) and the legal pages (pre-MVP B2, S-23 / S-24: Terms of service, Privacy policy,
   Accessibility) — one screen since the A2 + B2 merge (D-380; B2's c-legal folded in).
   Opened from Help → Policies, Account → Help and policies, c-pay (garment protection, Cancellation and refunds), the courier card,
   and — signed out — the Terms / Privacy links on c-welcome and c-phone (system.js exempt; no tabs, no Get help until she's in).
   D-21 / K-53 b (D-429): every legal page is a full plain-language draft under IN SHORT, marked "Draft — counsel review required"
   with its version; garment protection's copy is a COUNSEL draft and says so.
   Content: js/policies.js (every number from POLICY / MONEY, dollars only); body markup: components.js policySections (t-policy shares it).
   ============================================================ */
import { register, render as go } from '../app.js';
import { state } from '../state.js';
import { policyPage } from '../policies.js';
import { chrome, statusBar, headingRow, policySections, textLink, esc, ICON_HELP } from '../components.js';

const ID = 'c-policy';
const WHO = 'customer';

function view() {
  const page = policyPage(state.ui.policy ?? 'garment', WHO);
  const signedIn = !!state.session?.[WHO]?.signedIn;
  return `${signedIn ? chrome('account') : statusBar()}
<main class="body ${ID} policy" data-s="${ID}--${page.key}" data-doc="${esc(page.key)}">
  ${headingRow(`<h1 class="t-title">${esc(page.title)}</h1>`)}
  ${policySections(page)}
  ${signedIn ? `<div class="page-actions"><div class="page-actions__links">${textLink('Get help', { act: 'help', icon: ICON_HELP })}</div></div>` : ''}
</main>`;
}

function wire(root) {
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-act]')?.dataset.act === 'help') go('c-help');
  });
}

register(ID, view, wire);
