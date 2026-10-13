/* ============================================================
   t-code — 6-digit SMS code (tailor). Same screen as t-code,
   every account call made for the tailor session (M2-spec §C1).
   Focal: the code input. The sixth digit submits on its own. Any
   6 digits verify except 000000 (the demo's wrong code); the clock
   is frozen, so the resend countdown reads 0:30 until a flow
   advances it. New number → the blank profile (D-20); a returning
   tailor resumes at her first incomplete step, or lands on her
   shop (D-67).
   ============================================================ */
import { register, render as go, back, currentScreen } from '../app.js';
import { state } from '../state.js';
import { statusBar, headingRow, codeInput, actionBar, toast, esc, ONBOARDING_STEPS } from '../components.js';
import { withLatency } from '../sim.js';
import * as A from '../account.js';

const ID = 't-code';
const LENGTH = 6;
const ERRORS = {
  'code-wrong': 'That code doesn’t match. Check your texts and try again.',
  'code-format': 'Enter all 6 digits.',
  'code-expired': 'This code expired. Send a new one.',
};
const HELPER = `Enter the ${LENGTH}-digit code we sent you.`;

const ui = () => (state.ui[ID] ??= {});
const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function view(s) {
  const d = s.ui[ID] ?? {};
  const st = A.codeStatus('tailor');
  const err = d.error ?? (st?.expired ? 'code-expired' : null);
  const resend = !st || st.msToResend <= 0
    ? `<button type="button" class="${ID}__resend" data-act="resend"${d.busy ? ' disabled' : ''}>Resend code</button>`
    : `<p class="t-small c-600 ${ID}__wait" role="timer">Resend code in ${mmss(st.msToResend)}</p>`;
  return `${statusBar()}
<main class="body body--with-bar ${ID}">
  ${headingRow('<h1 class="t-title">Enter the code</h1>')}
  <p class="t-body c-600 ${ID}__lead">We texted a 6-digit code to ${st ? `<b class="w-600 c-ink">${esc(st.phone)}</b>` : 'your phone'}. <button type="button" class="${ID}__change" data-act="change-number" data-hit="inline">Change number</button></p>
  ${codeInput({ id: 'code', length: LENGTH, value: d.code ?? '', error: ERRORS[err] ?? '' })}
  ${resend}
</main>
${actionBar({ ctaLabel: 'Verify', ctaAct: 'verify', busy: !!d.busy, busyLabel: 'Checking…', disabled: err === 'code-expired', note: err === 'code-expired' ? 'Send a new code to continue.' : '' })}`;
}

function wire(root) {
  const input = root.querySelector('#code');
  const d = ui();
  const isTest = document.documentElement.classList.contains('is-test');

  if (d.busy) input.disabled = true;
  else if (d.focus) { input.focus(); input.select(); }
  else if (!isTest) input.focus();
  d.focus = false;

  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, LENGTH);
    ui().code = input.value;
    if (ui().error) {                        // clear the error on edit, in place
      ui().error = null;
      const box = input.closest('.field');
      box.classList.remove('field--error');
      input.removeAttribute('aria-invalid');
      const msg = box.querySelector('.field__msg');
      msg.classList.remove('field__msg--error');
      msg.removeAttribute('role');
      msg.textContent = HELPER;
    }
    if (input.value.length === LENGTH) verify();   // the sixth digit submits
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); verify(); }
  });

  /* the action bar is a sibling of main: bind to this render's own nodes, never to root */
  root.querySelectorAll('main, .action-bar').forEach((n) => n.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || a.disabled || a.classList.contains('back')) return;
    if (a.dataset.act === 'verify') verify();
    else if (a.dataset.act === 'resend') resend();
    else if (a.dataset.act === 'change-number') { ui().code = ''; ui().error = null; back() || go('t-phone'); }
  }));

  function resend() {
    if (!A.resendCode('tailor').ok) return;
    state.ui[ID] = {};
    go(ID);
    toast('New code sent');
  }

  function verify() {
    if (ui().busy) return;
    const code = input.value;
    ui().code = code;
    ui().error = null;
    ui().busy = true;
    go(ID);
    withLatency(() => {
      ui().busy = false;
      if (currentScreen() !== ID) return;    // the user stepped away while it was checking
      const r = A.verifyCode(code, 'tailor');
      if (r.ok) {
        state.ui[ID] = {};
        if (r.isNew) return go('to-profile', { fresh: true });          // the blank profile (D-20)
        if (r.next == null) return go('t-shop', { fresh: true });       // live: her shop (t-home from M3, D-67)
        state.ui.onboarding = { resumed: true };
        return go(ONBOARDING_STEPS.find((s) => s.id === r.next).screen, { fresh: true });
      }
      if (r.error === 'no-code') return go('t-phone');
      ui().error = r.error;
      ui().focus = true;
      go(ID);
    });
  }
}

register(ID, view, wire);
