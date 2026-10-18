/* ============================================================
   c-profile — Account → Personal info (DG-3 option A, pre-MVP B2; D-370). Her name (required), an optional email for
   receipts (S-25: without one, receipts stay in Past orders) and the phone every text goes to, with Change (a code to the
   new number, c-change-phone). Save changes is off until something changed; errors sit under their field.
   Screen-local UI: state.ui['c-profile'] = { first, last, email, errors, busy, focus }.
   Focal: the First name field.
   ============================================================ */
import { register, render as go, currentScreen } from '../app.js';
import { state } from '../state.js';
import { chrome, headingRow, field, actionBar, sectionHead, toast, esc } from '../components.js';
import { withLatency } from '../sim.js';
import { CHEVRON_RIGHT } from '../icons.js';
import * as A from '../account.js';

const ID = 'c-profile';
const ERRORS = { 'first-required': 'Enter your first name.', 'last-required': 'Enter your last name.', 'email-invalid': 'Enter an email like name@example.com.' };
const EMAIL_HELP = 'Without one, receipts stay in Past orders.';

const ui = () => (state.ui[ID] ??= {});
/** The form's values: the draft where she typed, else what is saved. */
const values = () => {
  const c = state.customer;
  const d = ui();
  return { first: d.first ?? c.first ?? '', last: d.last ?? c.last ?? '', email: d.email ?? c.email ?? '' };
};
const dirty = () => {
  const c = state.customer;
  const v = values();
  return v.first.trim() !== (c.first ?? '') || v.last.trim() !== (c.last ?? '') || v.email.trim() !== (c.email ?? '');
};

function view(s) {
  const d = s.ui[ID] ?? {};
  const v = values();
  const errs = d.errors ?? {};
  const shown = v.first.trim() ? `${esc(v.first.trim())}${v.last.trim() ? ` ${esc(v.last.trim().charAt(0))}.` : ''}` : 'your first name';
  const changed = dirty();
  return `${chrome('account')}
<main class="body body--with-bar ${ID}" data-s="${ID}">
  ${headingRow('<h1 class="t-title">Personal info</h1>')}
  <div class="${ID}__fields">
    ${field({ id: 'first', label: 'First name', autocomplete: 'given-name', value: v.first, error: ERRORS[errs.first] ?? '', disabled: !!d.busy })}
    ${field({ id: 'last', label: 'Last name', autocomplete: 'family-name', value: v.last, helper: `Tailors see ${shown} until they accept your request.`, error: ERRORS[errs.last] ?? '', disabled: !!d.busy })}
    ${field({ id: 'email', label: 'Email for receipts (optional)', type: 'email', inputmode: 'email', autocomplete: 'email', placeholder: 'name@example.com', value: v.email, helper: EMAIL_HELP, error: ERRORS[errs.email] ?? '', disabled: !!d.busy })}
  </div>
  <section class="sec ${ID}__phone" aria-labelledby="${ID}-phone-h">
    ${sectionHead('Phone', { id: `${ID}-phone-h` })}
    <button type="button" class="${ID}__phone-row card" data-act="change-phone"${d.busy ? ' disabled' : ''} aria-describedby="${ID}-phone-note">
      <span class="${ID}__phone-text"><span class="t-body ${ID}__number">${esc(s.customer.phone)}</span><span class="t-small c-600">Texts and sign-in codes go here</span></span>
      <span class="t-body w-600 c-accent-ink ${ID}__change">Change</span>${CHEVRON_RIGHT.replace('method-row__chevron', `${ID}__chevron`)}
    </button>
    <p class="t-small c-600 ${ID}__note" id="${ID}-phone-note">To change it, we text a code to the new number. Your bookings move with you.</p>
  </section>
</main>
${actionBar({ ctaLabel: 'Save changes', ctaAct: 'save', disabled: !changed && !d.busy, busy: !!d.busy, busyLabel: 'Saving…', note: changed || d.busy ? '' : 'No changes yet.' })}`;
}

function wire(root) {
  const d = ui();
  const target = d.focus ? root.querySelector('[aria-invalid="true"]') : d.focusEmail ? root.querySelector('#email') : null;   // S-25: "Add an email" from a receipt
  target?.focus();
  d.focus = false;
  d.focusEmail = false;
  const bar = root.querySelector('.action-bar [data-act="save"]');
  const note = root.querySelector('.action-bar__note');

  ['first', 'last', 'email'].forEach((key) => {
    const input = root.querySelector(`#${key}`);
    input?.addEventListener('input', () => {
      ui()[key] = input.value;
      if (ui().errors?.[key]) {                       // clear this field's error on edit, in place
        delete ui().errors[key];
        const box = input.closest('.field');
        box.classList.remove('field--error');
        input.removeAttribute('aria-invalid');
        const msg = box.querySelector('.field__msg');
        if (msg) {
          if (key === 'first') { msg.remove(); input.removeAttribute('aria-describedby'); }
          else { msg.classList.remove('field__msg--error'); msg.removeAttribute('role'); msg.textContent = key === 'email' ? EMAIL_HELP : msg.textContent; }
        }
      }
      /* Save turns on with the first change, in place (no re-render while she types) */
      const on = dirty();
      if (bar) { bar.disabled = !on; bar.toggleAttribute('aria-disabled', !on); bar.classList.toggle('cta--disabled', !on); }
      if (note) note.hidden = on;
    });
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  });

  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    if (el.dataset.act === 'save') save();
    else if (el.dataset.act === 'change-phone') { delete state.ui['c-change-phone']; A.cancelPhoneChange('customer'); go('c-change-phone'); }
  });

  function save() {
    if (ui().busy || !dirty()) return;
    const v = values();
    const r = A.saveProfile(v);   // validate first: errors show at once, nothing is sent
    if (!r.ok) { ui().errors = r.errors; ui().focus = true; go(ID, { replace: true }); return; }
    ui().errors = {};
    ui().busy = true;
    go(ID, { replace: true });
    withLatency(() => {
      state.ui[ID] = {};
      if (currentScreen() !== ID) return;
      go(ID, { replace: true });
      toast('Personal info saved', { tone: 'success' });
    });
  }
}

register(ID, view, wire);
