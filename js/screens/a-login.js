/* ============================================================
   a-login — K-52 (D-421): the admin's own sign-in (Kevin, K-48.1), its own entry (`?admin`), linked from nowhere in the customer or
   tailor app. Three steps on one screen (state.ui['a-login'].step from the model's adminStatus()): his email → a 6-digit code by
   email → the 6-digit code from his authenticator app (the second factor). PROTOTYPE: both codes are simulated (any 6 digits but 000000).
   Signed in → the Test-flows tools come on for the tab (K-53 a8, D-422: app.js unlockTools) and the screen he asked for opens
   (state.ui['a-login'].next, else a-inbox). Every a-* screen sends a signed-out visit here (app.js render).
   ============================================================ */
import { register, render as go, currentScreen, unlockTools } from '../app.js';
import { state } from '../state.js';
import { statusBar, headingRow, field, codeInput, actionBar, toast, esc } from '../components.js';
import { withLatency } from '../sim.js';
import * as A from '../account.js';

const ID = 'a-login';
const ERRORS = {
  'email-invalid': 'Enter an email like name@example.com.',
  'not-admin': 'This email isn’t a Taily admin account.',
  'code-wrong': 'That code doesn’t match. Try again.',
  'code-format': 'Enter all 6 digits.',
  'code-expired': 'This code expired. Send a new one.',
};
const ui = () => (state.ui[ID] ??= {});
const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
/** 'email' | 'code' | 'second' — what the model is waiting for. */
const stepOf = () => A.adminStatus()?.step ?? 'email';

function emailStep(d) {
  return `${headingRow(`<p class="t-caps c-600 ${ID}__eyebrow">Taily admin</p><h1 class="t-title">Sign in</h1>`, { back: false })}
  <p class="t-body c-600 ${ID}__lead">For the Taily team only. We email you a code, then ask for the code from your authenticator app.</p>
  ${field({ id: 'admin-email', label: 'Email', type: 'email', inputmode: 'email', autocomplete: 'username', placeholder: 'name@taily.app', value: d.email ?? '', error: ERRORS[d.error] ?? '', disabled: !!d.busy })}`;
}
function codeStep(d, st) {
  const err = d.error ?? (st.expired ? 'code-expired' : null);
  const resend = st.msToResend <= 0
    ? `<button type="button" class="${ID}__resend" data-act="resend"${d.busy ? ' disabled' : ''}>Resend code</button>`
    : `<p class="t-small c-600 ${ID}__wait" role="timer">Resend code in ${mmss(st.msToResend)}</p>`;
  return `${headingRow(`<p class="t-caps c-600 ${ID}__eyebrow">Taily admin · Step 1 of 2</p><h1 class="t-title">Check your email</h1>`, { back: false })}
  <p class="t-body c-600 ${ID}__lead">We emailed a 6-digit code to <b class="w-600 c-ink">${esc(st.email)}</b>. <button type="button" class="${ID}__link" data-act="other-email" data-hit="inline">Use another email</button></p>
  ${codeInput({ id: 'admin-code', label: 'Code from your email', value: d.code ?? '', error: ERRORS[err] ?? '', helper: 'Enter the 6-digit code we emailed you.' })}
  ${resend}`;
}
function secondStep(d) {
  return `${headingRow(`<p class="t-caps c-600 ${ID}__eyebrow">Taily admin · Step 2 of 2</p><h1 class="t-title">Two-step check</h1>`, { back: false })}
  <p class="t-body c-600 ${ID}__lead">Open your authenticator app and enter the 6-digit code for Taily.</p>
  ${codeInput({ id: 'admin-second', label: 'Code from your authenticator app', value: d.code ?? '', error: ERRORS[d.error] ?? '', helper: 'It changes every 30 seconds.' })}
  <button type="button" class="${ID}__link ${ID}__restart" data-act="other-email" data-hit="inline">Start over</button>`;
}

function view(s) {
  const d = s.ui[ID] ?? {};
  const st = A.adminStatus();
  const step = stepOf();
  const body = step === 'second' ? secondStep(d) : step === 'code' && st ? codeStep(d, st) : emailStep(d);
  const bar = step === 'second'
    ? actionBar({ ctaLabel: 'Sign in', ctaAct: 'second', busy: !!d.busy, busyLabel: 'Signing in…' })
    : step === 'code'
      ? actionBar({ ctaLabel: 'Verify', ctaAct: 'verify', busy: !!d.busy, busyLabel: 'Checking…', disabled: !!st?.expired && !d.error, note: st?.expired ? 'Send a new code to continue.' : '' })
      : actionBar({ ctaLabel: 'Email me a code', ctaAct: 'send', busy: !!d.busy, busyLabel: 'Sending…' });
  return `${statusBar()}
<main class="body body--with-bar ${ID}" data-s="${ID}--${step}" data-step="${step}">
  ${body}
</main>
${bar}`;
}

function wire(root) {
  /* an admin already signed in (a remembered tab) goes straight on */
  if (A.adminSignedIn()) { const next = ui().next; state.ui[ID] = {}; go(next && next !== ID ? next : 'a-inbox', { replace: true }); return; }
  const step = stepOf();
  const input = root.querySelector('#admin-email, #admin-code, #admin-second');
  const d = ui();
  const isTest = document.documentElement.classList.contains('is-test');
  if (input && !d.busy && (d.focus || !isTest)) input.focus();
  d.focus = false;

  input?.addEventListener('input', () => {
    if (step !== 'email') input.value = input.value.replace(/\D/g, '').slice(0, 6);
    if (step === 'email') ui().email = input.value; else ui().code = input.value;
    if (ui().error) {                        // clear the error on edit, in place (keeps focus)
      ui().error = null;
      const box = input.closest('.field');
      box.classList.remove('field--error');
      input.removeAttribute('aria-invalid');
      const msg = box.querySelector('.field__msg');
      msg.classList.remove('field__msg--error');
      msg.removeAttribute('role');
      msg.textContent = step === 'email' ? '' : step === 'code' ? 'Enter the 6-digit code we emailed you.' : 'It changes every 30 seconds.';
    }
    if (step !== 'email' && input.value.length === 6) submit();   // the sixth digit submits
  });
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });

  root.querySelectorAll('main, .action-bar').forEach((n) => n.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || a.disabled || ui().busy) return;
    const act = a.dataset.act;
    if (act === 'send' || act === 'verify' || act === 'second') submit();
    else if (act === 'resend') {
      if (!A.adminResendCode().ok) return;
      Object.assign(ui(), { code: '', error: null });
      go(ID);
      toast('New code sent');
    } else if (act === 'other-email') {
      A.adminSignOut();
      state.ui[ID] = { email: ui().email ?? '', next: ui().next, focus: true };
      go(ID);
    }
  }));

  function submit() {
    if (ui().busy) return;
    const value = input?.value ?? '';
    ui().error = null;
    ui().busy = true;
    go(ID);
    withLatency(() => {
      ui().busy = false;
      if (currentScreen() !== ID) return;
      const r = step === 'email' ? A.adminSendCode(value) : step === 'code' ? A.adminVerifyCode(value) : A.adminVerifySecond(value);
      if (!r.ok) {
        if (r.error === 'no-code') { state.ui[ID] = { next: ui().next }; go(ID); return; }
        Object.assign(ui(), { error: r.error, focus: true });
        go(ID);
        return;
      }
      if (step !== 'second') { Object.assign(ui(), { code: '', error: null, focus: true }); go(ID); return; }
      /* signed in: the Test-flows tools come on for this tab (K-53 a8), then the screen he asked for */
      const next = ui().next;
      state.ui[ID] = {};
      unlockTools();
      go(next && next !== ID ? next : 'a-inbox', { fresh: true });
    });
  }
}

register(ID, view, wire);
