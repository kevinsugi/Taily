/* ============================================================
   Account v2 — the shared account UI (pre-MVP B2, DG-3 option A; D-370…D-373). DOM helpers both personas use, so the
   customer's Account and the tailor's Shop → Account read the same: the sign-out and delete-account sheets (P-32: the one
   confirm sheet), the change-phone page (new number → a code to it). The legal pages are c-policy / t-policy (js/policies.js, D-380).
   Not a screen — c-account, t-shop, c-change-phone and t-change-phone import it. DOM-free model calls
   only through account.js / state.js; navigation through the `go` the screen passes in.
   ============================================================ */
import { state, deleteBlocker, statusScreen } from './state.js';
import { setFocus } from './focus.js';
import { confirmSheet, cta, field, codeInput, actionBar, headingRow, esc, toast } from './components.js';
import { withLatency } from './sim.js';
import * as A from './account.js';
import { fmtWhen, fmtDay } from './dates.js';
import { fmtExact } from './money.js';

const firstOf = (name, fallback) => String(name || '').trim().split(' ')[0] || fallback;
const HOME_AFTER = { customer: 'c-welcome', tailor: 't-phone' };

/* ---------- sign out (P-28 / P-32: the confirm sheet, focus on the safe choice) ---------- */
export function openSignOut(who, { go }) {
  const keepsWhat = who === 'tailor' ? 'Your jobs and requests stay as they are.' : 'Your bookings stay as they are.';
  confirmSheet({
    title: 'Sign out of Taily?', dataS: 'sign-out',
    body: `<p class="t-body c-700">You’ll need your phone number and a code to sign back in. ${keepsWhat}</p>`,
    primary: { label: 'Sign out', act: 'sign-out-ok' }, secondary: { label: 'Stay signed in', act: 'sign-out-keep' },
  }, (holder, close) => {
    const keep = holder.querySelector('[data-act="sign-out-keep"]');
    keep.addEventListener('click', () => close());
    keep.focus();   // R5-1-C-03: a stray Enter never signs her out
    holder.querySelector('[data-act="sign-out-ok"]').addEventListener('click', () => {
      A.signOut(who);
      close({ instant: true });
      go(HOME_AFTER[who], { fresh: true });
    });
  });
}

/* ---------- delete account (DG-3 A): blocked with the reason while something is open, else a confirm that says what goes and what stays ---------- */
/** The blocked sheet's words for `deleteBlocker(who)` → `{ lead, next, action: { label, act } }`. */
export function blockedWords(who, b) {
  if (who === 'tailor') {
    const a = b.appt;
    const p = b.payout;
    const cust = firstOf(state.customer.first, 'your customer');
    const job = !a ? '' : ['requested', 'suggested'].includes(a.status) ? `a request from ${cust} to answer`
      : a.status === 'confirmed' ? `a visit with ${cust} on ${fmtDay(a.slot.start)}` : `a job for ${cust} that isn’t finished`;
    const pay = !p ? '' : p.state === 'failed' ? `a ${fmtExact(p.cents)} payout that didn’t reach your bank` : `a ${fmtExact(p.cents)} payout on its way`;
    const next = a && p ? 'Once the job is done and the payout has reached your bank, you can delete your account here.'
      : a ? 'Once the job is done, you can delete your account here.'
        : p.state === 'failed' ? 'Update your bank details so we can pay it. Then you can delete your account here.'
          : 'Once the payout has reached your bank, you can delete your account here.';
    return { lead: `You have ${[job, pay].filter(Boolean).join(', and ')}.`, next, action: a ? { label: 'See the job', act: 'delete-see' } : { label: 'See your earnings', act: 'delete-see' } };
  }
  const a = b.appt;
  const t = state.tailors.find((x) => x.id === a.tailorId) ?? state.tailors[0];
  const first = firstOf(t?.name, 'your tailor');
  const action = { label: 'See the booking', act: 'delete-see' };
  if (b.reason === 'unpaid') return { lead: `Your ${fmtExact(a.payments.balance.cents)} balance with ${first} hasn’t been paid.`, next: 'Update your card on the booking. Then you can delete your account here.', action };
  if (b.reason === 'review') return { lead: `Taily is still looking into your order with ${first}.`, next: 'Once it’s settled, you can delete your account here.', action };
  if (['requested', 'suggested'].includes(a.status)) return { lead: `Your request to ${first} is still open.`, next: `Withdraw it, or wait for ${first}’s answer. Then you can delete your account here.`, action };
  if (a.status === 'confirmed') return { lead: `Your visit with ${first} on ${fmtWhen(a.slot.start)} is still open.`, next: 'Cancel it, or wait until it’s done. Then you can delete your account here.', action };
  return { lead: `Your order with ${first} is still open.`, next: 'Once you have it back, you can delete your account here.', action };
}

/* COUNSEL #9 (docs/v5/COUNSEL.md): what is deleted and what is kept, and for how long, needs counsel's retention periods */
const DELETE_WORDS = {
  customer: ['We delete your name, phone number, email, addresses and saved cards, and sign you out.', 'We keep receipts and messages for past orders, as the law requires.'],
  tailor: ['We delete your profile, prices, hours and bank details, and take your shop off Taily.', 'We keep your payout and tax records, as the law requires.'],
};

/** Delete account: the blocked sheet (reason + the one way on) or the confirm sheet. `go` navigates; `onSee(block)` handles "See the …". */
export function openDeleteAccount(who, { go, onSee }) {
  const block = deleteBlocker(who);
  if (block) {
    const w = blockedWords(who, block);
    confirmSheet({
      title: 'Delete account', dataS: 'delete-blocked',
      body: `<p class="t-body w-600" data-delete-blocked="${esc(block.reason)}">${esc(w.lead)}</p><p class="t-body c-700">${esc(w.next)}</p>`,
      primary: { ...w.action, variant: 'default' },
    }, (holder, close) => {
      holder.querySelector('[data-act="delete-see"]').addEventListener('click', () => { close({ instant: true }); onSee(block); });
    });
    return;
  }
  const words = DELETE_WORDS[who];
  confirmSheet({
    title: 'Delete your account?', dataS: 'delete-account',
    body: `${words.map((l) => `<p class="t-body c-700">${esc(l)}</p>`).join('')}<p class="t-body w-600">This can’t be undone.</p>`,
    primary: { label: 'Delete account', act: 'delete-ok', busyLabel: 'Deleting…' }, secondary: { label: 'Keep my account', act: 'delete-keep' },
  }, (holder, close) => {
    const keep = holder.querySelector('[data-act="delete-keep"]');
    keep.addEventListener('click', () => { if (holder.dataset.locked !== 'true') close(); });
    keep.focus();
    holder.querySelector('[data-act="delete-ok"]').addEventListener('click', (e) => {
      if (holder.dataset.locked === 'true') return;
      holder.dataset.locked = 'true';
      e.currentTarget.outerHTML = cta('Delete account', { variant: 'danger', busy: true, busyLabel: 'Deleting…', attrs: 'data-act="delete-ok"' });
      keep.disabled = true;
      withLatency(() => {
        if (!holder.isConnected) return;
        holder.dataset.locked = 'false';
        const r = A.deleteAccount(who);
        close({ instant: true });
        if (!r.ok) { toast('Something changed. Nothing was deleted.', { tone: 'error' }); return; }
        go(HOME_AFTER[who], { fresh: true });
      });
    });
  });
}
/** "See the booking / job" from the blocked sheet: the appointment's own screen (statusScreen), or Earnings for a payout. */
export function seeBlocker(who, block, go) {
  if (block.appt) { setFocus(block.appt.id); go(statusScreen(block.appt, who)); return; }
  go('t-earnings');
}

/* ---------- change phone (DG-3 A): the new number, then a code to it ---------- */
const PHONE_ERRORS = { 'phone-invalid': 'Enter a 10-digit US number, like (718) 555-0142.', 'phone-same': 'That’s the number you have now. Enter a new one.' };
const CODE_ERRORS = { 'code-wrong': 'That code doesn’t match. Check your texts and try again.', 'code-format': 'Enter all 6 digits.', 'code-expired': 'This code expired. Send a new one.' };
const PHONE_HELPER = 'We’ll text a code to this number to check it’s yours. Msg & data rates may apply.';
const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const phoneOf = (who) => (who === 'tailor' ? state.tailors[0].phone : state.customer.phone);

/** The change-phone page body (the screen adds its own chrome). `state.ui[id] = { step: 'number' | 'code', phone, code, error, busy }`. */
export function phoneChangeView(who, id, { nav }) {
  const d = state.ui[id] ?? {};
  const st = A.phoneChangeStatus(who);
  if (d.step === 'code' && st) {
    const err = d.error ?? (st.expired ? 'code-expired' : null);
    const resend = st.msToResend <= 0
      ? `<button type="button" class="phone-change__resend" data-act="resend"${d.busy ? ' disabled' : ''}>Resend code</button>`
      : `<p class="t-small c-600 phone-change__wait" role="timer">Resend code in ${mmss(st.msToResend)}</p>`;
    return `${nav}<main class="body body--with-bar phone-change ${id}" data-s="${id}" data-step="code">
  ${headingRow('<h1 class="t-title">Enter the code</h1>')}
  <p class="t-body c-600 phone-change__lead">We texted a 6-digit code to <b class="w-600 c-ink nb">${esc(st.phone)}</b>. <button type="button" class="phone-change__link" data-act="change-number" data-hit="inline">Change number</button></p>
  ${codeInput({ id: 'change-code', length: 6, value: d.code ?? '', error: CODE_ERRORS[err] ?? '' })}
  ${resend}
</main>
${actionBar({ ctaLabel: 'Verify', ctaAct: 'verify', busy: !!d.busy, busyLabel: 'Checking…', disabled: err === 'code-expired', note: err === 'code-expired' ? 'Send a new code to continue.' : '' })}`;
  }
  const moves = who === 'tailor' ? 'Your shop, jobs and payouts move with you.' : 'Your bookings move with you.';
  return `${nav}<main class="body body--with-bar phone-change ${id}" data-s="${id}" data-step="number">
  ${headingRow('<h1 class="t-title">Change phone number</h1>')}
  <p class="t-body c-600 phone-change__lead">Texts and sign-in codes go to <b class="w-600 c-ink nb">${esc(phoneOf(who))}</b> now. ${moves}</p>
  ${field({
    id: 'new-phone', label: 'New mobile number', prefix: '+1', type: 'tel', inputmode: 'tel', autocomplete: 'tel-national',
    placeholder: '(718) 555-0142', value: A.formatPhone(d.phone ?? ''), helper: PHONE_HELPER, error: PHONE_ERRORS[d.error] ?? '', disabled: !!d.busy,
  })}
</main>
${actionBar({ ctaLabel: 'Send code', ctaAct: 'send-code', busy: !!d.busy, busyLabel: 'Sending code…' })}`;
}

/** Wire the change-phone page. `done({ phone, was })` runs after the new number is verified (the screen navigates + toasts). */
export function wirePhoneChange(root, who, id, { go, done }) {
  const ui = () => (state.ui[id] ??= {});
  const rerender = () => go(id, { replace: true });
  const isTest = document.documentElement.classList.contains('is-test');
  const code = root.querySelector('#change-code');
  const phone = root.querySelector('#new-phone');

  if (phone) {
    if (ui().focus || (!isTest && !ui().busy)) phone.focus();
    ui().focus = false;
    phone.addEventListener('input', () => {
      phone.value = A.formatPhone(phone.value);
      ui().phone = phone.value;
      if (ui().error) clearError(phone, PHONE_HELPER);
    });
    phone.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } });
  }
  if (code) {
    if (ui().busy) code.disabled = true;
    else if (ui().focus || !isTest) { code.focus(); code.select?.(); }
    ui().focus = false;
    code.addEventListener('input', () => {
      code.value = code.value.replace(/\D/g, '').slice(0, 6);
      ui().code = code.value;
      if (ui().error) clearError(code, 'Enter the 6-digit code we sent you.');
      if (code.value.length === 6) verify();
    });
    code.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); verify(); } });
  }
  /* clear a field's error on edit, in place (keeps focus and the keyboard), as c-phone / c-code */
  function clearError(input, helper) {
    ui().error = null;
    const box = input.closest('.field');
    box.classList.remove('field--error');
    input.removeAttribute('aria-invalid');
    const msg = box.querySelector('.field__msg');
    if (msg) { msg.classList.remove('field__msg--error'); msg.removeAttribute('role'); msg.textContent = helper; }
  }
  root.querySelectorAll('main, .action-bar').forEach((n) => n.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || a.disabled || a.classList.contains('back')) return;
    if (a.dataset.act === 'send-code') send();
    else if (a.dataset.act === 'verify') verify();
    else if (a.dataset.act === 'resend') { if (A.resendPhoneChange(who).ok) { ui().code = ''; ui().error = null; rerender(); toast('New code sent'); } }
    else if (a.dataset.act === 'change-number') { A.cancelPhoneChange(who); state.ui[id] = { step: 'number', phone: ui().phone ?? '', focus: true }; rerender(); }
  }));

  function send() {
    if (ui().busy) return;
    ui().phone = A.formatPhone(phone.value);
    const r = A.startPhoneChange(phone.value, who);
    if (!r.ok) { ui().error = r.error; ui().focus = true; rerender(); return; }
    ui().error = null;
    ui().busy = true;
    rerender();
    withLatency(() => {
      ui().busy = false;
      if (root.ownerDocument.getElementById('screen')?.dataset.screen !== id) return;
      state.ui[id] = { step: 'code', phone: ui().phone, code: '', focus: true };
      rerender();
    });
  }
  function verify() {
    if (ui().busy) return;
    ui().code = code.value;
    ui().error = null;
    ui().busy = true;
    rerender();
    withLatency(() => {
      ui().busy = false;
      if (root.ownerDocument.getElementById('screen')?.dataset.screen !== id) return;
      const r = A.verifyPhoneChange(ui().code, who);
      if (r.ok) { state.ui[id] = {}; done(r); return; }
      if (r.error === 'no-code') { state.ui[id] = { step: 'number' }; rerender(); return; }
      ui().error = r.error;
      ui().focus = true;
      rerender();
    });
  }
}
