/* ============================================================
   t-policy — THE tailor policy / legal page (state.ui.policy): the Help policies (pre-MVP A2: payments, garment protection,
   disputes, safety, cancellation) and the legal pages (pre-MVP B2, S-23: Tailor terms of service, Tailor agreement, Privacy
   policy) — one screen since the A2 + B2 merge (D-380; B2's t-legal folded in).
   Opened from Help → Policies, Shop → Help and policies, and — signed out — t-phone's Tailor terms / Privacy links (system.js
   exempt; no tabs, no Get help until she's in). COUNSEL (docs/v5/COUNSEL.md #2, #12): placeholder copy, marked on the page.
   Content: js/policies.js (every number from POLICY / MONEY, dollars only); body markup: components.js policySections (c-policy shares it).
   ============================================================ */
import { register, render as go } from '../app.js';
import { state } from '../state.js';
import { policyPage } from '../policies.js';
import { chrome, statusBar, headingRow, policySections, textLink, esc, ICON_HELP } from '../components.js';

const ID = 't-policy';
const WHO = 'tailor';

function view() {
  const page = policyPage(state.ui.policy ?? 'garment', WHO);
  const signedIn = !!state.session?.[WHO]?.signedIn;
  return `${signedIn ? chrome('shop', { persona: 'tailor' }) : statusBar()}
<main class="body ${ID} policy" data-s="${ID}--${page.key}" data-doc="${esc(page.key)}">
  ${headingRow(`<h1 class="t-title">${esc(page.title)}</h1>`)}
  ${policySections(page)}
  ${signedIn ? `<div class="page-actions"><div class="page-actions__links">${textLink('Get help', { act: 'help', icon: ICON_HELP })}</div></div>` : ''}
</main>`;
}

function wire(root) {
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-act]')?.dataset.act === 'help') go('t-help');
  });
}

register(ID, view, wire);
