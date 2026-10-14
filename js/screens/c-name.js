/* ============================================================
   c-name — first + last name, new accounts only. Focal: the
   First name field. Errors appear after Continue, under the
   field they belong to (M1-spec §C1).
   ============================================================ */
import { register, render as go, currentScreen } from '../app.js';
import { state } from '../state.js';
import { statusBar, headingRow, field, actionBar } from '../components.js';
import { withLatency } from '../sim.js';
import * as A from '../account.js';

const ID = 'c-name';
const ERRORS = { 'first-required': 'Enter your first name.', 'last-required': 'Enter your last name.' };

const ui = () => (state.ui[ID] ??= {});

function view(s) {
  const d = s.ui[ID] ?? {};
  const errs = d.errors ?? {};
  return `${statusBar()}
<main class="body body--with-bar ${ID}">
  ${headingRow('<h1 class="t-title">What should we call you?</h1>')}
  <p class="t-body c-600 ${ID}__lead">Tailors see your first name and last initial until they accept your request, then your full name and address.</p>
  <div class="${ID}__fields">
    ${field({ id: 'first', label: 'First name', autocomplete: 'given-name', value: d.first ?? '', error: ERRORS[errs.first] ?? '', disabled: !!d.busy })}
    ${field({ id: 'last', label: 'Last name', autocomplete: 'family-name', value: d.last ?? '', error: ERRORS[errs.last] ?? '', disabled: !!d.busy })}
  </div>
</main>
${actionBar({ ctaLabel: 'Continue', ctaAct: 'save-name', busy: !!d.busy, busyLabel: 'Saving…' })}`;
}

function wire(root) {
  const d = ui();
  const isTest = document.documentElement.classList.contains('is-test');
  const first = root.querySelector('#first');
  const last = root.querySelector('#last');

  const target = d.focus ? root.querySelector('[aria-invalid="true"]') : (!isTest && !d.busy ? first : null);
  target?.focus();
  d.focus = false;

  [[first, 'first'], [last, 'last']].forEach(([input, key]) => {
    input.addEventListener('input', () => {
      ui()[key] = input.value;
      if (ui().errors?.[key]) {              // clear this field's error on edit, in place
        delete ui().errors[key];
        const box = input.closest('.field');
        box.classList.remove('field--error');
        input.removeAttribute('aria-invalid');
        box.querySelector('.field__msg')?.remove();
        input.removeAttribute('aria-describedby');
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); save(); }
    });
  });

  /* the action bar is a sibling of main: bind to this render's own nodes, never to root */
  root.querySelector('.action-bar').addEventListener('click', (e) => {
    if (e.target.closest('[data-act="save-name"]')) save();
  });

  function save() {
    if (ui().busy) return;
    ui().first = first.value;
    ui().last = last.value;
    const r = A.saveName({ first: ui().first, last: ui().last });
    if (!r.ok) { ui().errors = r.errors; ui().focus = true; go(ID); return; }
    ui().errors = {};
    ui().busy = true;
    go(ID);
    withLatency(() => {
      ui().busy = false;
      if (currentScreen() !== ID) return;
      state.ui[ID] = {};
      go('c-job', { fresh: true });
    });
  }
}

register(ID, view, wire);
