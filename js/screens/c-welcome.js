/* ============================================================
   c-welcome — the entry. Phone first; Apple / Google are the
   quieter outline buttons (M1-spec §C1). One filled CTA.
   D-07 / B-09 (pre-MVP B2, D-372): Apple / Google are kept, then a required phone + code (c-phone in its social mode) before
   anything else. S-24: Terms and Privacy open the legal pages (c-legal). DG-3 A: after Delete account, a calm line says it's done.
   ============================================================ */
import { register, render as go, currentScreen } from '../app.js';
import { state } from '../state.js';
import { statusBar, cta, garmentIcon, banner } from '../components.js';
import { withLatency } from '../sim.js';
import * as A from '../account.js';

const ID = 'c-welcome';
const PROVIDERS = { apple: 'Apple', google: 'Google' };

const ui = () => state.ui[ID] ?? {};

function view(s) {
  const busy = (s.ui[ID] ?? {}).busy ?? null;
  const btn = (p, variant) => cta(`Continue with ${PROVIDERS[p]}`, {
    variant, busy: busy === p, busyLabel: 'Signing in…', disabled: !!busy && busy !== p, attrs: `data-act="${p}"`,
  });
  return `${statusBar()}
<main class="body ${ID}">
  <span class="${ID}__logo" role="img" aria-label="Taily"></span>
  <div class="${ID}__hero" aria-hidden="true">${garmentIcon('Suit Jacket', { size: 'hero' })}</div>
  ${s.session.customer?.deletedAt ? `<div class="${ID}__deleted" data-deleted>${banner({ tone: 'success', title: 'Your account is deleted', text: 'We keep receipts for past orders, as the law requires.' })}</div>` : ''}
  <h1 class="t-display ${ID}__title">A tailor near you, booked in five steps.</h1>
  <p class="t-body c-600 ${ID}__lead">Real prices up front. Your deposit is held, not charged, until the tailor accepts.</p>
  <div class="${ID}__spacer"></div>
  ${cta('Continue with phone', { disabled: !!busy, attrs: 'data-act="phone"' })}
  <div class="${ID}__or" role="separator"><span class="t-small c-600">or</span></div>
  ${btn('apple', 'secondary')}
  <div class="${ID}__gap"></div>
  ${btn('google', 'secondary')}
  <p class="t-small c-600 ${ID}__legal">By continuing you agree to Taily’s <button type="button" class="${ID}__link" data-act="terms" data-hit="inline">Terms</button> and <button type="button" class="${ID}__link" data-act="privacy" data-hit="inline">Privacy Policy</button>.</p>
  <p class="t-small c-600 ${ID}__tailor">Are you a tailor? <button type="button" class="${ID}__link" data-act="tailor" data-hit="inline">Sign in or join</button></p>
</main>`;
}

function wire(root) {
  /* #screen persists across renders: bind to this render's own nodes, never to root */
  root.querySelector('main').addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || a.disabled || ui().busy) return;
    if (a.dataset.act === 'phone') { if (state.session.customer) delete state.session.customer.social; return go('c-phone'); }   // a plain phone sign-in, not the social one
    if (a.dataset.act === 'tailor') return go('t-phone', { fresh: true });
    if (a.dataset.act === 'terms' || a.dataset.act === 'privacy') { state.ui['c-legal'] = { doc: a.dataset.act }; return go('c-legal'); }   // S-24 (pre-MVP B2)
    if (a.dataset.act === 'apple' || a.dataset.act === 'google') {
      const provider = a.dataset.act;
      state.ui[ID] = { busy: provider };
      go(ID);
      withLatency(() => {
        state.ui[ID] = {};
        if (currentScreen() !== ID) return;
        A.signInWith(provider);
        state.ui['c-phone'] = {};                 // D-07 / B-09: the phone + code come next, before anything else
        go('c-phone');
      });
    }
  });
}

register(ID, view, wire);
