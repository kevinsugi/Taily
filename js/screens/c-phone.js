/* ============================================================
   c-phone — US phone number. Focal: the phone field. Validation
   happens on Send, never while typing (M1-spec §C1).
   ============================================================ */
import { register, render as go, currentScreen } from '../app.js';
import { state } from '../state.js';
import { statusBar, headingRow, field, actionBar, toast } from '../components.js';
import { withLatency } from '../sim.js';
import * as A from '../account.js';

const ID = 'c-phone';
const HELPER = 'We’ll text you a sign-in code and updates about your bookings from Taily. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.';   // SF-05
/** SF-24: the terms notice sits with the button that creates the account (kept apart from the SMS helper). */
const TERMS = '<span>By tapping Send code, you agree to Taily’s <button type="button" class="c-phone__link" data-act="terms" data-hit="inline">Terms</button> and <button type="button" class="c-phone__link" data-act="privacy" data-hit="inline">Privacy Policy</button>.</span>';
const ERRORS = { 'phone-invalid': 'Enter a 10-digit US number, like (718) 555-0142.' };

const ui = () => (state.ui[ID] ??= {});

function view(s) {
  const d = s.ui[ID] ?? {};
  return `${statusBar()}
<main class="body body--with-bar ${ID}">
  ${headingRow('<h1 class="t-title">Your phone number</h1>')}
  <p class="t-body c-600 ${ID}__lead">We’ll text you a code to sign in. No passwords.</p>
  ${field({
    id: 'phone', label: 'Mobile number', prefix: '+1', type: 'tel', inputmode: 'tel', autocomplete: 'tel-national',
    placeholder: '(718) 555-0142', value: A.formatPhone(d.phone ?? ''), helper: HELPER,
    error: ERRORS[d.error] ?? '', disabled: !!d.busy,
  })}
</main>
${actionBar({ ctaLabel: 'Send code', ctaAct: 'send-code', busy: !!d.busy, busyLabel: 'Sending code…', lead: TERMS })}`;
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

  /* the action bar is a sibling of main: bind to this render's own nodes, never to root */
  root.querySelector('.action-bar').addEventListener('click', (e) => {
    if (e.target.closest('[data-act="send-code"]')) send();
    else if (e.target.closest('[data-act="terms"], [data-act="privacy"]')) toast('Terms and Privacy aren’t in this prototype yet.');   // SF-24: as c-welcome
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
      A.sendCode(raw);
      state.ui['c-code'] = {};              // a fresh code starts with an empty input
      go('c-code');
    });
  }
}

register(ID, view, wire);
