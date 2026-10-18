/* ============================================================
   to-payouts — O6 "Background check and payouts" (M2-spec §C3, rebuilt for DG-4 option B / D-06, K-48; D-350…D-355).
   Onboarding (step 6 of 6): the background-check consent (its disclosure is its own sheet, copy marked for counsel), the Taily
   fee in dollars, and the hand-off to the payments partner's hosted onboarding (PROTOTYPE of Stripe Connect Express: identity,
   SSN or EIN, the W-9 and the bank live there; `state.sim.payoutSetup` decides what comes back). Coming back submits her
   onboarding → to-done "Submitted". Edit (onboarded): the partner's status — Verifying / Action needed / Verified / Payouts
   paused — and its three rows; "Update bank details" goes back to the partner. Taily's own bank form is retired.
   Focal: the consent + Continue to secure setup (onboarding) / the status (edit).
   ============================================================ */
import { register, render as go, back, currentScreen } from '../app.js';
import { state, T, nowIso, onboarded, checkState } from '../state.js';
import { myTailor, payoutsView } from '../tailor-data.js';
import { fmtDay, payoutDay } from '../dates.js';
import { MONEY, POLICY } from '../money-config.js';
import { cents, fmtExact, tailyFeeFor, payoutFor } from '../money.js';
import { withLatency } from '../sim.js';
import * as A from '../account.js';
import {
  onboardingHeader, onboardingSteps, ONBOARDING_STEPS, resumeText, headingRow, banner, sectionHead, infoButton, checkRow, textLink,
  actionBar, toast, esc, openBackgroundSheet, secureSetupCard, payoutRows, statusPill, checkWords, REVIEW_TIME,
} from '../components.js';

const ID = 'to-payouts';
const ui = () => (state.ui[ID] ??= {});
const isEditing = () => onboarded(myTailor());
const setUp = (t) => (t.payouts?.status ?? 'not-started') !== 'not-started';
const consented = (t) => checkState(t, 'background') !== 'not-started';
const CONSENT_ERR = 'Agree to the background check to continue.';
const LEAD = `Taily pays you every Friday for jobs completed by then. A job is complete when the customer has her order: at pickup, on delivery, or ${POLICY.HANDOFF_AUTO_H} hours after you mark it handed over.`;   // SF-31

/** "Pick up where you left off" — only when the tailor arrives from a step that left something incomplete. */
function resumeBanner(t) {
  if (!state.ui.onboarding?.resumed) return '';
  return banner({ tone: 'info', title: 'Pick up where you left off', text: resumeText(t), dismissible: true });   // SF-43
}

function feeCard() {
  const c = cents(MONEY.FEE_EXAMPLE_SERVICES);
  /* M7: flat. The sentence leads; the other three points live in the fee sheet (ⓘ), one line stays */
  return `<section class="sec ${ID}__fee" aria-labelledby="${ID}-fee-h">
  ${sectionHead('The Taily fee', { id: `${ID}-fee-h`, aside: infoButton('fee', { label: 'The Taily fee' }) })}
  <p class="t-body w-600 ${ID}__sentence" data-money>On ${fmtExact(c)} of services, Taily keeps ${fmtExact(tailyFeeFor(c))} and your payout is ${fmtExact(payoutFor({ services: c }))}.</p>
  <p class="t-small c-700 ${ID}__points">Home visit and rush fees are yours in full.</p>
</section>`;
}

/** DG-4: the background check — the consent box (and the disclosure, its own sheet), or its status once she agreed. */
function backgroundBlock(t, u) {
  const head = sectionHead('Background check', { id: `${ID}-bg-h` });
  if (consented(t)) {
    const w = checkWords(t, 'background');
    return `<section class="sec ${ID}__bg" aria-labelledby="${ID}-bg-h">${head}
    <div class="${ID}__bg-done"><p class="t-body c-700">${esc(w.sub)}.</p>${statusPill(w.pill, w.pillLabel)}</div>
  </section>`;
  }
  const err = u.errors?.consent ? CONSENT_ERR : '';
  return `<section class="sec ${ID}__bg" aria-labelledby="${ID}-bg-h">${head}
  <p class="t-body c-700 ${ID}__bg-lead">Customers book tailors Taily has checked. A background check company confirms who you are and looks at criminal records. It runs last, once your ID, years and payout details pass, and usually takes ${REVIEW_TIME}.</p>
  <div class="${ID}__bg-read">${textLink('Read the disclosure', { act: 'disclosure', attrs: 'aria-haspopup="dialog"' })}</div>
  ${checkRow({ id: 'bg-consent', label: 'I agree to a background check', caption: 'I’ve read the disclosure.', checked: !!u.consent, error: err, attrs: 'data-act="consent"' })}
</section>`;
}

/** R5-1-T-01 (D-148): the payout the bank sent back, said where it is fixed. Edit mode only. */
function returnedBanner() {
  const failed = payoutsView().failed;
  if (!failed) return '';
  const first = state.payouts.find((p) => p.state === 'failed');
  const mine = myTailor().payouts;
  const bank = `${first?.bank || mine?.bank || 'Your bank'} •••• ${first?.last4 || mine?.last4 || ''}`;
  return `<div class="${ID}__returned">${banner({
    tone: 'error', title: `Your <span data-money>${fmtExact(failed.cents)}</span> payout didn’t go through`,
    text: `${esc(bank)} returned it. Update your bank details with our payments partner and we’ll send it again on ${fmtDay(failed.retryDate)}.`,
  })}</div>`;
}

/** The partner's status, as one banner (edit mode, and onboarding once set up). */
function statusBanner(t) {
  const p = t.payouts ?? {};
  const owed = payoutsView().next;
  if (p.status === 'verifying') return banner({ tone: 'warning', title: 'Verifying your details', text: `Usually a few minutes, sometimes ${REVIEW_TIME}. We’ll text you when it’s done.` });
  if (p.status === 'action-needed') return banner({ tone: 'error', title: 'Action needed', text: 'Our payments partner couldn’t match your date of birth to your SSN. Check them and try again.' });
  if (p.status === 'paused') {
    return banner({ tone: 'warning', title: 'Payouts are paused', text: `Our payments partner needs you to confirm your tax info (W-9) by ${fmtDay(p.issueDue)}.${owed ? ` Your <span data-money>${fmtExact(owed.cents)}</span> goes out once it’s done.` : ''}` });
  }
  return '';
}

function barFor(t, u) {
  const busy = !!u.busy;
  const p = t.payouts ?? {};
  if (!isEditing()) {
    if (!setUp(t)) {
      return actionBar({ ctaLabel: 'Continue to secure setup', ctaAct: 'setup', busy, busyLabel: 'Opening secure setup…',
        lead: 'By continuing you agree to the Taily Tailor Agreement.', note: 'You’ll come back here when you’re done.' });   // SF-06
    }
    return actionBar({ ctaLabel: 'Finish setup', ctaAct: 'finish', busy, busyLabel: 'Finishing…' });
  }
  if (p.status === 'action-needed') return actionBar({ ctaLabel: 'Fix it with our payments partner', ctaAct: 'setup', busy, busyLabel: 'Opening secure setup…' });
  if (p.status === 'paused') return actionBar({ ctaLabel: 'Confirm tax info', ctaAct: 'tax', busy, busyLabel: 'Opening secure setup…' });
  if (p.status === 'verifying') return '';
  return actionBar({ ctaLabel: 'Update bank details', ctaAct: 'new-bank', busy, busyLabel: 'Opening secure setup…', note: 'Our payments partner keeps your bank details.' });
}

function view(s) {
  const t = myTailor();
  const editing = isEditing();
  const u = s.ui[ID] ?? {};
  const set = setUp(t);
  const title = `<h1 class="t-title">${editing ? 'Payouts' : 'Background check and payouts'}</h1>`;
  const bar = barFor(t, u);
  const secure = `<section class="sec ${ID}__secure" aria-labelledby="${ID}-secure-h">
  ${sectionHead('Secure setup', { id: `${ID}-secure-h` })}
  ${secureSetupCard()}
</section>`;
  const banner1 = set ? statusBanner(t) : '';
  const status = set ? `${banner1 ? `<div class="${ID}__status">${banner1}</div>` : ''}
  <section class="sec ${ID}__rows" aria-labelledby="${ID}-rows-h">${sectionHead('With our payments partner', { id: `${ID}-rows-h` })}${payoutRows(t, { interactive: true })}</section>` : '';
  return `${onboardingHeader({ editing, active: u.from === 'earnings' ? 'earnings' : 'shop' })}
<main class="body${bar ? ' body--with-bar' : ''} ${ID}${editing ? ` ${ID}--edit` : ''}">
  ${editing ? '' : onboardingSteps('payouts', ONBOARDING_STEPS.filter((st) => t.onboarding?.[st.id]).map((st) => st.id))}
  ${editing ? '' : resumeBanner(t)}
  ${editing ? headingRow(title) : `<div class="heading-block ${ID}__title">${title}</div>`}
  ${editing ? returnedBanner() : ''}
  <p class="t-body c-600 ${ID}__lead">${LEAD}</p>
  ${editing ? '' : backgroundBlock(t, u)}
  ${editing ? '' : feeCard()}
  ${set ? status : secure}
</main>
${bar}`;
}

function wire(root) {
  const editing = isEditing();
  if (ui().focus) { root.querySelector(ui().focus)?.focus(); ui().focus = null; }

  /* Back: Shop / Earnings (edit) or the step before (onboarding) */
  root.querySelectorAll('.back[data-act="back"]').forEach((btn) => {
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => { back() || go(editing ? 't-shop' : 'to-availability'); });
  });

  root.addEventListener('change', (e) => {
    if (e.target.id !== 'bg-consent') return;
    ui().consent = e.target.checked;
    if (ui().errors?.consent && e.target.checked) { delete ui().errors.consent; ui().focus = '#bg-consent'; go(ID); }
  });
  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || a.closest('.modal-host, .sheet-host')) return;
    switch (a.dataset.act) {
      case 'setup': case 'fix-payout': handOff(); break;
      case 'new-bank': handOff({ newBank: true }); break;
      case 'tax': handOff({ tax: true }); break;
      case 'finish': finish(); break;
      case 'disclosure': openBackgroundSheet(); break;
      case 'finish-later': finishLater(); break;
      case 'dismiss':
        if (state.ui.onboarding) state.ui.onboarding.resumed = false;
        a.closest('.banner')?.remove();
        break;
      default:
    }
  });

  /** The hand-off to the partner's hosted onboarding (simulated: a short wait, then its result comes back from sim.payoutSetup). */
  function handOff({ newBank = false, tax = false } = {}) {
    const u = ui();
    if (u.busy) return;
    const t = myTailor();
    if (!editing && !consented(t)) {
      if (!u.consent) { u.errors = { consent: 'consent-required' }; u.focus = '#bg-consent'; go(ID); return; }
      T.consentBackground(true);
    }
    if (state.ui.onboarding) state.ui.onboarding.resumed = false;
    u.errors = {};
    u.busy = true;
    go(ID);
    withLatency(() => {
      ui().busy = false;
      if (currentScreen() !== ID) return;
      if (tax) {
        T.confirmTaxInfo();
        go(ID);
        toast('Tax info confirmed. Your payouts go out Friday.', { tone: 'success' });
        return;
      }
      const r = T.setupPayouts({ newBank });
      if (!r.ok) { go(ID); toast('Couldn’t reach our payments partner. Try again.', { tone: 'error' }); return; }
      if (!editing) { finish(); return; }
      go(ID);
      if (newBank) toast(r.requeued ? `Saved. Sending again ${fmtDay(payoutDay(nowIso()))}.` : `Saved. Payouts go to ${r.tailor.payouts.bank} •••• ${r.tailor.payouts.last4}.`, { tone: 'success' });
      else if (r.status === 'verified') toast('Your payout details are verified.', { tone: 'success' });
    });
  }

  /** Onboarding: every section set up → submitted (to-done says what's next); else the first step still open. */
  function finish() {
    const r = T.submitOnboarding();
    delete state.ui[ID];
    if (r.ok || r.error === 'waitlist') { go('to-done', { fresh: true }); return; }
    const next = ONBOARDING_STEPS.find((st) => st.id === r.missing?.[0]);
    state.ui.onboarding = { ...(state.ui.onboarding ?? {}), resumed: true };
    go(next ? next.screen : 'to-profile');
  }

  /* D-57: sign out with the progress saved (nothing here is typed: the partner keeps what she entered there); never takes her live (SF-02) */
  function finishLater() {
    if (ui().consent && !consented(myTailor())) T.consentBackground(true);
    delete state.ui[ID];
    state.ui['t-phone'] = { saved: true, phone: myTailor().phone };
    A.signOut('tailor');
    go('t-phone', { fresh: true });
  }
}

register(ID, view, wire);
