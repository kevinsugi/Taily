/* ============================================================
   c-login — K-52 (D-420): Log in for a returning customer. "Welcome back", her mobile number, Send code → the same code step
   (c-code). The Log in path never signs anyone up: a number with no account says so next to the field ("No account with this
   number") with one way on, "Create one" (c-phone, the number carried over). Validation on Send, never while typing (as c-phone).
   ============================================================ */
import { register, render as go, currentScreen } from '../app.js';
import { state } from '../state.js';
import { statusBar, headingRow, field, actionBar } from '../components.js';
import { withLatency } from '../sim.js';
import * as A from '../account.js';

const ID = 'c-login';
const HELPER = 'We’ll text you a sign-in code from Taily. Msg & data rates may apply.';
const ERRORS = {
  'phone-invalid': 'Enter a 10-digit US number, like (718) 555-0142.',
  'no-account': 'No account with this number.',
};

const ui = () => (state.ui[ID] ??= {});

function view(s) {
  const d = s.ui[ID] ?? {};
  const unknown = d.error === 'no-account';
  return `${statusBar()}
<main class="body body--with-bar ${ID}" data-s="${ID}${unknown ? '--unknown' : ''}">
  ${headingRow('<h1 class="t-title">Welcome back</h1>')}
  <p class="t-body c-600 ${ID}__lead">Log in with your mobile number. We’ll text you a code. No passwords.</p>
  ${field({
    id: 'phone', label: 'Mobile number', prefix: '+1', type: 'tel', inputmode: 'tel', autocomplete: 'tel-national',
    placeholder: '(718) 555-0142', value: A.formatPhone(d.phone ?? ''), helper: HELPER,
    error: ERRORS[d.error] ?? '', disabled: !!d.busy,
  })}
  ${unknown ? `<p class="t-body c-700 ${ID}__create" data-unknown>Want to join with it? <button type="button" class="${ID}__link" data-act="create" data-hit="inline">Create one</button></p>` : ''}
  <p class="t-small c-600 ${ID}__new">New to Taily? <button type="button" class="${ID}__link" data-act="sign-up" data-hit="inline">Create an account</button></p>
</main>
${actionBar({ ctaLabel: 'Send code', ctaAct: 'send-code', busy: !!d.busy, busyLabel: 'Sending code…' })}`;
}

function wire(root) {
  const input = root.querySelector('#phone');
  const d = ui();
  const isTest = document.documentElement.classList.contains('is-test');

  if (d.focus || (!isTest && !d.busy)) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
  d.focus = false;

  input.addEventListener('input', () => {
    const f = A.formatPhone(input.value);
    input.value = f;
    ui().phone = f;
    if (ui().error) { ui().error = null; go(ID); const el = document.getElementById('phone'); el?.focus(); el?.setSelectionRange(el.value.length, el.value.length); }   // the Create one line goes with the error
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); send(); }
  });

  root.querySelector('.action-bar').addEventListener('click', (e) => {
    if (e.target.closest('[data-act="send-code"]')) send();
  });
  root.querySelector('main').addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || ui().busy) return;
    /* the sign-up path (c-phone): "Create one" carries the number over, so Send code is one tap away */
    if (a.dataset.act === 'create' || a.dataset.act === 'sign-up') {
      if (state.session.customer) delete state.session.customer.social;
      state.ui['c-phone'] = a.dataset.act === 'create' ? { phone: ui().phone ?? '' } : {};
      state.ui[ID] = {};
      go('c-phone');
    }
  });

  function send() {
    if (ui().busy) return;
    const raw = input.value;
    ui().phone = A.formatPhone(raw);
    const v = A.validatePhone(raw);
    if (!v.ok) { ui().error = v.error; ui().focus = true; go(ID); return; }
    ui().error = null;
    ui().busy = true;
    go(ID);
    withLatency(() => {
      ui().busy = false;
      if (currentScreen() !== ID) return;     // she stepped away while it was sending
      const r = A.sendLoginCode(raw);
      if (!r.ok) { ui().error = r.error; ui().focus = true; go(ID); return; }
      state.ui['c-code'] = {};              // a fresh code starts with an empty input
      go('c-code');
    });
  }
}

register(ID, view, wire);
