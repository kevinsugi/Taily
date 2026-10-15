/* ============================================================
   to-payouts — O6 Payouts (M2-spec §C3). Bank details + an honest
   picture of the Taily fee, in dollars. Two modes (D-56): onboarding
   (step 6 of 6, "Finish and go live") and edit (live tailor, Shop nav,
   "Save changes" until dirty). Focal: the fee sentence card
   (onboarding) / the bank fields (edit).
   ============================================================ */
import { register, render as go, back, currentScreen } from '../app.js';
import { state, T, nowIso } from '../state.js';
import { myTailor, payoutsView } from '../tailor-data.js';
import { fmtDay, payoutDay } from '../dates.js';
import { ROUTING_BANKS } from '../data.js';
import { MONEY } from '../money-config.js';
import { cents, fmt, fmtExact, tailyFeeFor, payoutFor } from '../money.js';
import { withLatency } from '../sim.js';
import * as A from '../account.js';
import {
  onboardingHeader, onboardingSteps, ONBOARDING_STEPS, headingRow, banner, field, sectionHead, infoButton,
  actionBar, modalOverlay, leaveModal, toast, esc,
} from '../components.js';

const ID = 'to-payouts';
const ERRORS = {
  'holder-required': 'Enter the name on the account.',
  'routing-invalid': 'Enter the 9-digit routing number.',
  'account-invalid': 'Account numbers are 4 to 17 digits.',
};
const ROUTING_HELP = '9 digits, on the bottom left of a check.';

const ui = () => (state.ui[ID] ??= {});
const isEditing = () => !!myTailor().live;
const fromTailor = (t) => ({ holder: t.payouts?.holder || t.name || '', routing: t.payouts?.routing ?? '', account: '' });
/** The draft: what she has typed, filled out with the model's values for anything not yet touched (D-34). */
function draftOf() {
  const u = ui();
  u.draft = { ...fromTailor(myTailor()), ...(u.draft ?? {}) };
  return u.draft;
}
const isDirty = () => JSON.stringify(draftOf()) !== JSON.stringify(fromTailor(myTailor()));
const bankFor = (routing) => (/^\d{9}$/.test(routing) ? ROUTING_BANKS[routing] ?? '' : '');
/** The account helper: keep the stored account only while the routing number is the saved one; a new bank needs its number. */
function accountHelpFor(routing) {
  const p = myTailor().payouts;
  if (!isEditing() || !p?.last4) return '4 to 17 digits.';
  if (routing === String(p.routing ?? '')) return `Leave blank to keep the account ending ${p.last4}.`;
  return `Enter your account number at ${bankFor(routing) || 'your new bank'}.`;
}
/** The account error: a blank account after a routing change asks for the new bank's number. */
function accountErrorFor(code, d) {
  if (!code) return '';
  const p = myTailor().payouts;
  if (code === 'account-invalid' && !String(d.account ?? '').trim() && p?.last4 && d.routing !== String(p.routing ?? '')) return 'Enter the account number for your new bank.';
  return ERRORS[code] ?? '';
}
const listLabels = (arr) => (arr.length < 3 ? arr.join(' and ') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`);

/** "Pick up where you left off" — only when the tailor arrives from a step that left something incomplete. */
function resumeBanner(t) {
  if (!state.ui.onboarding?.resumed) return '';
  const done = ONBOARDING_STEPS.filter((s) => t.onboarding?.[s.id]);
  const left = ONBOARDING_STEPS.length - done.length;
  const names = done.length ? `${listLabels(done.map((s) => s.label))} ${done.length === 1 ? 'is' : 'are'} done.` : 'Nothing is done yet.';
  return banner({ tone: 'info', title: 'Pick up where you left off', text: `${names} ${left} step${left === 1 ? '' : 's'} to go before customers can book you.`, dismissible: true });
}

function feeCard() {
  const c = cents(MONEY.FEE_EXAMPLE_SERVICES);
  /* M7: flat. The sentence leads; the other three points live in the fee sheet (ⓘ), one line stays */
  return `<section class="sec ${ID}__fee" aria-labelledby="${ID}-fee-h">
  ${sectionHead('The Taily fee', { id: `${ID}-fee-h`, aside: infoButton('fee', { label: 'The Taily fee' }) })}
  <p class="t-body w-600 ${ID}__sentence" data-money>On ${fmtExact(c)} of services, Taily keeps ${fmtExact(tailyFeeFor(c))} and your payout is ${fmtExact(payoutFor({ services: c }))}.</p>
  <p class="t-small c-700 ${ID}__points">Home-visit and rush fees are yours in full.</p>
</section>`;
}

/** R5-1-T-01 (D-148): the payout the bank sent back, said on the form that fixes it. Only a save re-sends it. Edit mode only. */
function returnedBanner() {
  const failed = payoutsView().failed;
  if (!failed) return '';
  const first = state.payouts.find((p) => p.state === 'failed');
  const mine = myTailor().payouts;
  const bank = `${first?.bank || mine?.bank || 'Your bank'} •••• ${first?.last4 || mine?.last4 || ''}`;
  return `<div class="${ID}__returned">${banner({
    tone: 'error', title: `Your <span data-money>${fmtExact(failed.cents)}</span> payout didn’t go through`,
    text: `${esc(bank)} returned it. Update the account below and we’ll send it again on ${fmtDay(failed.retryDate)}.`,
  })}</div>`;
}

function view(s) {
  const t = myTailor();
  const editing = isEditing();
  const u = s.ui[ID] ?? {};
  const d = draftOf();
  const errs = u.errors ?? {};
  const busy = !!u.busy;
  const dirty = isDirty();
  const bank = bankFor(d.routing);
  const accountHelp = accountHelpFor(d.routing);
  const title = '<h1 class="t-title">How you get paid</h1>';
  const head = headingRow(title, { back: editing });
  const current = editing && t.payouts?.bank
    ? `<div class="${ID}__current"><p class="t-caps c-600">Current account</p><p class="t-body w-600 tabular">${esc(t.payouts.bank)} •••• ${esc(t.payouts.last4)}</p><p class="t-small c-600">Paid every Friday</p></div><p class="t-small w-600 ${ID}__change">Change account</p>` : '';
  const fields = `<section class="sec ${ID}__bank" aria-labelledby="${ID}-bank-h">
  ${sectionHead('Your bank account', { id: `${ID}-bank-h` })}
  ${current}
  <div class="${ID}__fields">
    ${field({ id: 'holder', label: 'Name on the account', autocomplete: 'name', value: d.holder, error: ERRORS[errs.holder] ?? '', disabled: busy })}
    ${field({ id: 'routing', label: 'Routing number', inputmode: 'numeric', maxlength: 9, autocomplete: 'off', value: d.routing, helper: bank || ROUTING_HELP, error: ERRORS[errs.routing] ?? '', disabled: busy })}
    ${field({ id: 'account', label: 'Account number', inputmode: 'numeric', maxlength: 17, autocomplete: 'off', value: d.account, helper: accountHelp, error: accountErrorFor(errs.account, d), disabled: busy })}
  </div>
  <p class="t-small c-600 ${ID}__only4">Only the last 4 digits are shown in the app.</p>
  </section>`;
  const bar = editing
    ? actionBar({ ctaLabel: 'Save changes', ctaAct: 'save', disabled: !dirty && !busy, note: dirty || busy ? '' : 'No changes yet.', busy, busyLabel: 'Saving…' })
    : actionBar({ ctaLabel: 'Finish and go live', ctaAct: 'next', busy, busyLabel: 'Setting up payouts…' });
  return `${onboardingHeader({ editing, active: u.from === 'earnings' ? 'earnings' : 'shop' })}
<main class="body body--with-bar ${ID}${editing ? ` ${ID}--edit` : ''}">
  ${editing ? '' : onboardingSteps('payouts', ONBOARDING_STEPS.filter((st) => t.onboarding?.[st.id]).map((st) => st.id))}
  ${editing ? '' : resumeBanner(t)}
  ${head}
  ${editing ? returnedBanner() : ''}
  <p class="t-body c-600 ${ID}__lead">Every Friday, Taily pays you for the jobs you completed before that day.</p>
  ${editing ? '' : feeCard()}
  ${fields}
</main>
${bar}`;
}

function wire(root) {
  const editing = isEditing();
  const isTest = document.documentElement.classList.contains('is-test');
  const inputs = { holder: root.querySelector('#holder'), routing: root.querySelector('#routing'), account: root.querySelector('#account') };

  const invalid = root.querySelector('[aria-invalid="true"]');
  if (ui().focus) invalid?.focus();
  else if (!isTest && !ui().busy && editing) inputs.holder?.focus();
  ui().focus = false;

  /* typing: update the draft and the live captions in place — never re-render (it drops focus and the keyboard) */
  Object.entries(inputs).forEach(([key, input]) => {
    if (!input) return;
    input.addEventListener('input', () => {
      if (key !== 'holder') {
        const digits = input.value.replace(/\D/g, '');
        if (digits !== input.value) input.value = digits;
      }
      draftOf()[key] = input.value;
      if (ui().errors?.[key]) clearError(input, key);
      if (key === 'routing') { showBank(input); showAccountHelp(); }
      if (editing) syncBar(root);
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  });

  function clearError(input, key) {
    delete ui().errors[key];
    const box = input.closest('.field');
    box.classList.remove('field--error');
    input.removeAttribute('aria-invalid');
    const msg = box.querySelector('.field__msg');
    if (!msg) return;
    msg.classList.remove('field__msg--error');
    msg.removeAttribute('role');
    if (key === 'routing') msg.textContent = bankFor(input.value) || ROUTING_HELP;
    else if (key === 'account') msg.textContent = accountHelpFor(draftOf().routing);
    else msg.remove();
    if (!msg.isConnected) input.removeAttribute('aria-describedby');
  }
  function showAccountHelp() {
    /* back to the saved routing number with the account still blank → the "new bank" error no longer applies */
    const p = myTailor().payouts;
    if (ui().errors?.account && !draftOf().account && p?.last4 && draftOf().routing === String(p.routing ?? '')) clearError(inputs.account, 'account');
    const msg = inputs.account?.closest('.field').querySelector('.field__msg');
    if (msg && !msg.classList.contains('field__msg--error')) msg.textContent = accountHelpFor(draftOf().routing);
  }
  function showBank(input) {
    const msg = input.closest('.field').querySelector('.field__msg');
    if (msg && !msg.classList.contains('field__msg--error')) msg.textContent = bankFor(input.value) || ROUTING_HELP;
  }

  /* Back: edit + dirty → leave-without-saving; otherwise the previous screen */
  const backBtn = root.querySelector('.back[data-act="back"]');
  if (backBtn) {
    backBtn.dataset.wired = '1';
    backBtn.addEventListener('click', () => {
      if (editing && isDirty()) { leave(); return; }
      back() || go(editing ? 't-shop' : 'to-availability');
    });
  }
  function leave() {
    modalOverlay(leaveModal(), { dataS: `${ID}-unsaved` }, (holder, close) => {
      holder.querySelector('[data-act="keep-editing"]').addEventListener('click', () => close());
      holder.querySelector('[data-act="discard"]').addEventListener('click', () => {
        close({ instant: true });
        delete state.ui[ID];
        back() || go('t-shop');
      });
    });
  }

  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || a.closest('.modal-host')) return;
    const act = a.dataset.act;
    if (act === 'next' || act === 'save') submit();
    else if (act === 'finish-later') finishLater();
    else if (act === 'dismiss') {
      if (state.ui.onboarding) state.ui.onboarding.resumed = false;
      a.closest('.banner')?.remove();
    }
  });

  function submit() {
    const u = ui();
    if (u.busy || (editing && !isDirty())) return;
    if (state.ui.onboarding) state.ui.onboarding.resumed = false;
    const r = T.setPayouts({ ...draftOf() });
    if (!r.ok) { u.errors = r.errors ?? {}; u.focus = true; go(ID); return; }
    u.errors = {};
    u.busy = true;
    go(ID);
    withLatency(() => {
      ui().busy = false;
      if (currentScreen() !== ID) return;
      delete state.ui[ID];
      if (editing) {
        back() || go('t-shop');
        toast(r.requeued ? `Saved. Sending again ${fmtDay(payoutDay(nowIso()))}.` : 'Saved. Payouts go to this account.', { tone: 'success' });
      } else if (r.live) {
        go('to-done', { fresh: true });
      } else {
        const next = ONBOARDING_STEPS.find((st) => st.id === T.nextSection());
        state.ui.onboarding = { ...(state.ui.onboarding ?? {}), resumed: true };
        go(next ? next.screen : 'to-done');
      }
    });
  }

  /* D-57: save what she typed (the setter ignores what is not valid; no errors shown), sign out, t-phone with the saved banner */
  function finishLater() {
    T.setPayouts({ ...draftOf() });
    state.ui['t-phone'] = { saved: true, phone: myTailor().phone };
    A.signOut('tailor');
    go('t-phone', { fresh: true });
  }
}

/** Edit mode: enable / disable Save changes in place as the draft changes. */
function syncBar(root) {
  const btn = root.querySelector('.action-bar [data-act="save"]');
  if (!btn || btn.getAttribute('aria-busy')) return;
  const dirty = isDirty();
  btn.disabled = !dirty;
  btn.classList.toggle('cta--disabled', !dirty);
  if (dirty) { btn.removeAttribute('aria-disabled'); btn.removeAttribute('aria-describedby'); } else { btn.setAttribute('aria-disabled', 'true'); }
  const bar = root.querySelector('.action-bar');
  let note = bar.querySelector('.action-bar__note');
  if (dirty) note?.remove();
  else if (!note) {
    note = document.createElement('p');
    note.className = 'action-bar__note t-small c-600';
    note.id = 'action-bar-note-save';
    note.textContent = 'No changes yet.';
    bar.appendChild(note);
    btn.setAttribute('aria-describedby', note.id);
  }
}

register(ID, view, wire);
