/* ============================================================
   t-phone — tailor sign-up: phone (M2-spec §C1). Focal: the phone
   field. A copy of c-phone's wiring for the tailor session; sets
   the six-step expectation. After "Finish later" (D-57) a success
   banner says the progress is saved and pre-fills the number.
   ============================================================ */
import { register, render as go, back, currentScreen } from '../app.js';
import { state } from '../state.js';
import { statusBar, headingRow, field, actionBar, banner, esc } from '../components.js';
import { withLatency } from '../sim.js';
import * as A from '../account.js';

const ID = 't-phone';
const HELPER = 'US numbers only. Message and data rates may apply.';
const ERRORS = { 'phone-invalid': 'Enter a 10-digit US number, like (718) 555-0142.' };

const ui = () => (state.ui[ID] ??= {});

function view(s) {
  const d = s.ui[ID] ?? {};
  return `${statusBar()}
<main class="body body--with-bar ${ID}">
  ${headingRow(`<p class="t-caps c-600 ${ID}__eyebrow">For tailors</p><h1 class="t-title">Get booked by customers nearby</h1>`, { backRow: true })}
  <p class="t-body c-600 ${ID}__lead">Set your own prices and hours.</p>
  ${d.saved && d.phone ? `<div class="${ID}__saved">${banner({
    tone: 'success', title: 'Your progress is saved',
    text: `Sign in with ${esc(A.formatPhone(d.phone))} to pick up where you left off.`,
  })}</div>` : ''}
  <div class="${ID}__field">${field({
    id: 'phone', label: 'Mobile number', prefix: '+1', type: 'tel', inputmode: 'tel', autocomplete: 'tel-national',
    placeholder: '(718) 555-0142', value: A.formatPhone(d.phone ?? ''), helper: HELPER,
    error: ERRORS[d.error] ?? '', disabled: !!d.busy,
  })}</div>
  <p class="t-small c-600 ${ID}__steps">Next: six short steps, about 10 minutes. You can finish later.</p>
  <p class="t-small c-600 ${ID}__other">Looking for a tailor? <button type="button" class="${ID}__link" data-act="customer" data-hit="inline">Book one</button></p>
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
    if (ui().error) {                       // clear the error on edit, in place (keeps focus and the keyboard)
      ui().error = null;
      const box = input.closest('.field');
      box.classList.remove('field--error');
      input.removeAttribute('aria-invalid');
      const msg = box.querySelector('.field__msg');
      msg.classList.remove('field__msg--error');
      msg.removeAttribute('role');
      msg.textContent = HELPER;
    }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); send(); }
  });

  /* a fresh navigation has no history: Back goes to the welcome screen, never the developer index */
  const backBtn = root.querySelector('.back');
  if (backBtn && !backBtn.dataset.wired) {
    backBtn.dataset.wired = '1';
    backBtn.addEventListener('click', () => { if (!ui().busy) back() || go('c-welcome', { fresh: true }); });
  }

  /* the action bar is a sibling of main: bind to this render's own nodes, never to root */
  root.querySelector('.action-bar').addEventListener('click', (e) => {
    if (e.target.closest('[data-act="send-code"]')) send();
  });
  root.querySelector('main').addEventListener('click', (e) => {
    if (e.target.closest('[data-act="customer"]') && !ui().busy) go('c-welcome', { fresh: true });
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
      if (currentScreen() !== ID) return;     // the user stepped away while it was sending
      A.sendCode(raw, 'tailor');
      state.ui['t-code'] = {};              // a fresh code starts with an empty input
      go('t-code');
    });
  }
}

register(ID, view, wire);
