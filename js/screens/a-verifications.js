/* ============================================================
   a-verifications — K-54 happy-path review B2 (D-451): the admin's Verifications. Every tailor who submitted her setup and still has a
   check open, oldest submission first: the four checks in the order they run (ID and profile photo → Years tailoring → Payout and tax
   info → Background check, K-53 Q8), what is on file, each check's state, and the admin's answer per check — Pass, or Needs info (a
   confirm sheet quoting the text she gets, `check-action-needed`). The 4th pass takes her live and texts her `verified`. Below: the
   tailors already verified. Third tab of the admin nav (Inbox · Verifications · Ledger), behind the admin's sign-in (a-login gate).
   PROTOTYPE: one tailor record (state.tailors); the payout row stands in for the payments partner's answer.
   ============================================================ */
import { register, render as go, toolsAvailable, wireAdminTools } from '../app.js';
import { state, T, now, verificationQueue, verifyView, checkState, firstChecksPassed, listed, CHECK_WORDS } from '../state.js';
import { chrome, headingRow, sectionHead, statusPill, ctaSmall, confirmAction, emptyState, esc, toast, adminTools } from '../components.js';
import { TEXTS, textCtx } from '../texts.js';
import { fmtDay, fmtWhen } from '../dates.js';

const ID = 'a-verifications';
const firstOf = (t) => String(t?.name || 'The tailor').split(' ')[0];
const PILL = { verified: ['check-verified', 'Passed'], pending: ['check-pending', 'To review'], 'needs-info': ['check-needs', 'Needs info'], 'not-started': ['check-todo', 'Not started'], waitlist: ['check-waitlist', 'Waitlist'] };

/** What is on file for one check, in the admin's words. */
function onFile(t, id, st) {
  const p = t.payouts ?? {};
  const v = t.verify ?? {};
  const day = (iso) => (iso ? fmtDay(iso) : '');
  if (id === 'id') {
    if (st === 'pending') return 'Photo ID and profile photo in. Match them.';
    if (st === 'needs-info') return 'Asked her to add them again.';
    if (st === 'verified') return `Matched ${day(v.id?.at)}`;
    return 'No photo ID yet';
  }
  if (id === 'years') {
    const yrs = `${t.years} ${Number(t.years) === 1 ? 'year' : 'years'} on her profile`;
    if (st === 'pending') return `${yrs}. She saved them again.`;
    if (st === 'needs-info') return `${yrs}. Asked her for more.`;
    if (st === 'waitlist') return `${yrs}. Under the minimum: waitlist`;
    if (st === 'verified') return v.years?.at ? `${yrs} · passed ${day(v.years.at)}` : yrs;
    return 'Not on her profile yet';
  }
  if (id === 'payout') {
    if (st === 'pending') return 'Payments partner: checking her details';
    if (st === 'needs-info') return 'Payments partner: action needed';
    if (st === 'verified') return `${p.bank ?? 'Bank'} •••• ${p.last4 ?? ''}`;
    return 'Not set up yet';
  }
  if (st === 'pending' && !firstChecksPassed(t)) return 'Runs last, once the other three pass';
  if (st === 'pending') return v.background?.consentAt ? `Consented ${day(v.background.consentAt)}. Report is in.` : 'Report is in.';
  if (st === 'needs-info') return 'Asked her for more details.';
  if (st === 'verified') return `Cleared ${day(v.background?.at)}`;
  return 'She hasn’t agreed yet';
}

/** One check's row: label, what is on file, the pill, then Pass / Needs info when the admin can answer it. */
function checkRow(t, item) {
  const st = checkState(t, item.id);
  const waits = item.id === 'background' && !firstChecksPassed(t);
  const pass = ['pending', 'needs-info'].includes(st) && !waits;
  const ask = (st === 'pending' || (item.id === 'years' && st === 'verified')) && !waits;
  const [pill, word] = waits && st === 'pending' ? ['check-pending', 'Waiting'] : PILL[st] ?? PILL['not-started'];
  const actions = pass || ask ? `<div class="${ID}__acts">${pass ? ctaSmall('Pass', { filled: true, attrs: `data-act="check-pass" data-check="${item.id}"` }) : ''}${ask ? ctaSmall('Needs info', { attrs: `data-act="check-ask" data-check="${item.id}"` }) : ''}</div>` : '';
  return `<li class="${ID}__check" data-check-row="${item.id}" data-state="${st}">
    <div class="${ID}__check-head">
      <div class="${ID}__check-text"><p class="t-body w-600">${esc(item.label)}</p><p class="t-small c-600">${esc(onFile(t, item.id, st))}</p></div>
      ${statusPill(pill, word)}
    </div>
    ${actions}
  </li>`;
}

/** One tailor under review: her name, shop, number and when she submitted, then her four checks. */
function tailorBlock(t) {
  const v = verifyView(t);
  return `<div class="${ID}__tailor" data-tailor="${esc(t.id)}">
  <div class="${ID}__tailor-head">
    <h2 class="t-body w-600" id="${ID}-t-${esc(t.id)}">${esc(t.name || 'New tailor')}</h2>
    <p class="t-small c-600">${esc([t.shopName, t.phone, t.submittedAt ? `submitted ${fmtWhen(t.submittedAt)}` : '', `${v.passed} of ${v.total} passed`].filter(Boolean).join(' · '))}</p>
  </div>
  <ol class="card card--list ${ID}__checks" aria-labelledby="${ID}-t-${esc(t.id)}">${v.items.map((it) => checkRow(t, it)).join('')}</ol>
</div>`;
}

function view() {
  const { review, verified } = verificationQueue();
  const done = verified.length ? `<section class="sec ${ID}__done" aria-labelledby="${ID}-done">
  ${sectionHead('Verified', { id: `${ID}-done`, count: verified.length })}
  <ul class="card card--list ${ID}__list">${verified.map((t) => `<li class="${ID}__row"><div class="${ID}__check-text"><p class="t-body w-600">${esc(t.name)}</p><p class="t-small c-600">${esc(`All 4 checks passed${t.liveAt ? ` · live ${fmtDay(t.liveAt)}` : ''}`)}</p></div>${statusPill(listed(t) ? 'check-verified' : 'check-todo', listed(t) ? 'Listed' : 'Not listed')}</li>`).join('')}</ul>
</section>` : '';
  return `${chrome('checks', { persona: 'admin' })}
<main class="body ${ID}" data-s="${ID}${review.length ? '' : '--empty'}">
  ${headingRow('<h1 class="t-title">Verifications</h1>', { back: false })}
  <p class="t-small c-600 ${ID}__who">Taily admin · new tailors’ checks, in the order they run. The background check goes last.</p>
  ${review.length ? `<section class="sec ${ID}__review" aria-labelledby="${ID}-review">${sectionHead('Under review', { id: `${ID}-review`, count: review.length })}${review.map(tailorBlock).join('')}</section>`
    : `<div class="${ID}__empty" data-empty="checks">${emptyState({ title: 'No one waiting', body: 'A new tailor shows up here when she submits her setup.' })}</div>`}
  ${done}
  ${adminTools({ testFlows: toolsAvailable() })}
</main>`;
}

const label = (id) => ({ id: 'ID and profile photo', years: 'Years tailoring', payout: 'Payout and tax info', background: 'Background check' }[id] ?? id);

function wire(root) {
  wireAdminTools(root);
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act="check-pass"], [data-act="check-ask"]');
    if (!el || e.target.closest('.screen-sheet--overlay')) return;
    const id = el.dataset.check;
    const t = state.tailors[0];
    if (el.dataset.act === 'check-pass') {
      const r = T.reviewCheck(id, 'verified');
      go(ID, { replace: true });
      if (!r.ok) { toast('Couldn’t pass that check. Try again.', { tone: 'error' }); return; }
      toast(r.wentLive ? `All 4 checks passed. ${firstOf(t)} is listed, and we texted her.` : `${label(id)} passed.`, { tone: 'success' });
      return;
    }
    const text = TEXTS['check-action-needed'].body(textCtx({ t, now: now(), x: { check: CHECK_WORDS[id] } }));
    confirmAction({
      header: `Ask ${firstOf(t)} for more?`, ok: 'Ask for more', dataS: `${ID}--ask`, busyLabel: 'Sending…',
      body: `${esc(label(id))} goes to Needs info, and she can’t be booked until it passes. She gets this text: “Taily: ${esc(text)}”`,
    }, () => {
      const r = T.reviewCheck(id, 'needs-info');
      if (!r.ok) return 'Couldn’t change that check. Try again.';
      go(ID, { replace: true });
      toast(`Asked ${firstOf(t)} for more. She got a text.`, { tone: 'success' });
      return null;
    });
  });
}

register(ID, view, wire);
