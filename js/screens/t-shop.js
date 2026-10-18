/* ============================================================
   t-shop — T7 Shop (M2-spec §C3). Every onboarding section at a
   glance, each editable, plus rush fees. Focal: the "What
   customers see" row. Summaries are dollars only.
   DG-4 option B (K-48, Kevin Oct 18; D-350…D-355): the four checks live here. Until all pass she isn't listed: the top card says
   "Under review · n of 4 checks" with Taking requests off ("Turns on when your checks clear."), the checklist follows with the one
   action each check needs; the setup list gains Verification and the Payouts row says the partner's status.
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, T, sectionsDone, listed, verifyView, collectAddress } from '../state.js';
import { myTailor, tailorRowProps, ownRow } from '../tailor-data.js';
import { VISIT_LABEL, RETURN_LABEL } from '../data.js';
import { cents, fmt } from '../money.js';
import * as A from '../account.js';
import {
  chrome, headingRow, banner, customerPreview, tailorRow, miniProfile, listRow, textLink, sectionHead, statusPill, toggle, wireToggles, toast, ONBOARDING_STEPS, esc,
  modalOverlay, cta, verifyChecklist, reviewPill, checksLine, openIdSheet, openBackgroundSheet, REVIEW_TIME,
} from '../components.js';

const ID = 't-shop';
const SCREEN_OF = { ...Object.fromEntries(ONBOARDING_STEPS.map((s) => [s.id, s.screen])), rush: 't-rush' };

/** "suit pant and suit jacket" — names in running text, no "·" chain (M7). */
const nameList = (types) => {
  const n = types.map((x) => x.toLowerCase());
  return n.length < 3 ? n.join(' and ') : `${n.slice(0, -1).join(', ')} and ${n.at(-1)}`;
};
const lowerFirst = (x) => x.charAt(0).toLowerCase() + x.slice(1);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Her row as a customer with the demo job gets it (D-65) — P-29 (D-359): built the K-19 way even while she is paused or under review;
    null when the demo job doesn't fit her area, services or hours. */
function previewRow() {
  const job = state.job;
  const { row } = ownRow(job);
  return row ? tailorRow(tailorRowProps(row, job)) : null;
}
/* ---------- row summaries (what is saved, in words and dollars) ---------- */
const SUMMARY = {
  profile: (t) => [t.name, t.shopName].filter(Boolean).join(' · ') || 'Not set up yet',
  services: (t) => {
    const prices = Object.values(t.prices ?? {}).map(Number).filter((n) => n > 0);
    if (!prices.length) return 'No services yet';
    const lo = Math.min(...prices); const hi = Math.max(...prices);
    return `${plural(prices.length, 'service', 'services')} · ${lo === hi ? fmt(cents(lo)) : `${fmt(cents(lo))} to ${fmt(cents(hi))}`}`;
  },
  rush: (t) => {
    const ladder = [...(t.rush ?? [])].sort((a, b) => a.days - b.days);
    return ladder.length ? ladder.map((r) => `${plural(r.days, 'day', 'days')} +${fmt(cents(r.fee))}`).join(', ') : 'Off — add a fee for rush jobs';
  },
  where: (t) => {
    const parts = [];
    if (t.shop?.enabled) parts.push(`Shop at ${t.shop.street}`);
    if (t.home?.enabled) parts.push(`Home visits in ${plural((t.home.hoods ?? []).length, 'neighborhood', 'neighborhoods')}, ${t.home.fee > 0 ? `${fmt(cents(t.home.fee))} fee` : 'no fee'}`);   // C5: neighborhoods, not ZIP codes
    return parts.join(' · ') || 'Not set up yet';
  },
  returns: (t) => {
    const ways = Object.keys(RETURN_LABEL).filter((k) => t.returns?.[k])
      .map((k, i) => (i === 0 || /^Taily/.test(RETURN_LABEL[k]) ? RETURN_LABEL[k] : RETURN_LABEL[k].replace(/^./, (c) => c.toLowerCase()))).join(', ');
    /* B-15 (D-356): without a shop the courier collects from her private address — say where */
    const from = t.returns?.courier && !t.shop?.enabled && collectAddress(t) ? ` · courier collects from ${collectAddress(t)}` : '';
    return ways ? `${ways}${from}` : 'Not set up yet';
  },
  availability: (t) => {
    const parts = [];
    const days = (kind) => Object.keys(t.availability?.[kind] ?? {}).length;
    if (t.shop?.enabled) parts.push(days('shop') ? `Shop ${plural(days('shop'), 'day', 'days')}` : 'Shop: none set');
    if (t.home?.enabled) parts.push(days('home') ? `Home visits ${plural(days('home'), 'day', 'days')}` : 'Home visits: none set');
    return parts.join(' · ') || 'Not set up yet';
  },
  /* DG-4 (B mirror): the payments partner's status rides on the bank line */
  payouts: (t) => {
    const p = t.payouts ?? {};
    if (!p.bank || !p.last4) return 'Not set up yet';
    const word = { verifying: 'verifying your details', 'action-needed': 'action needed', paused: 'payouts paused' }[p.status] ?? 'paid Fridays';
    return `${p.bank} •••• ${p.last4} · ${word}`;
  },
  verify: (t) => {
    const v = verifyView(t);
    const owed = v.items.filter((i) => ['needs-info', 'not-started', 'waitlist'].includes(i.state)).length;
    return owed ? `${checksLine(t)} · ${owed} ${owed === 1 ? 'needs' : 'need'} you` : checksLine(t);
  },
};
const ROWS = [
  { id: 'profile', label: 'Profile' },
  { id: 'services', label: 'Services and prices' },
  { id: 'rush', label: 'Rush fees' },
  { id: 'where', label: 'Where you work' },
  { id: 'returns', label: 'Return options' },
  { id: 'availability', label: 'Availability' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'verify', label: 'Verification' },
];
/** A setup row that needs her: a section that fails its rules, the Payouts row while the partner needs something, a check she owes. */
const needsAttention = (t, id) => (id === 'verify' ? verifyView(t).needsYou.length > 0
  : id === 'payouts' ? t.onboarding?.payouts === false || ['action-needed', 'paused'].includes(t.payouts?.status)
    : id !== 'rush' && t.onboarding?.[id] === false);
/* CP-T33: what the banner asks her to finish — "Finish your availability …" / the action "Finish availability" */
const FINISH = { profile: ['your profile', 'profile'], services: ['your services', 'services'], where: ['where you work', 'where you work'],
  returns: ['your return options', 'return options'], availability: ['your availability', 'availability'], payouts: ['your payouts', 'payouts'] };

function view(s) {
  const t = myTailor();
  const job = s.job;
  const ok = listed(t);
  const setUp = sectionsDone(t);
  const v = verifyView(t);
  const reviewing = setUp && !ok;   // DG-4: everything set up, the checks not all passed yet (or a waitlist)
  const missing = ONBOARDING_STEPS.find((st) => !t.onboarding?.[st.id]);
  const finish = FINISH[missing?.id] ?? ['your setup', 'setup'];
  /* D-161: "Taking requests" sits with the Bookable chip; off, the chip says customers can't send requests */
  const taking = t.takingRequests !== false;
  const status = ok
    ? `<div class="card ${ID}__live">
    <p class="${ID}__status">${taking ? statusPill('bookable') : statusPill('paused', 'Paused · customers can’t send requests')}</p>
    ${toggle({ id: 'taking-requests', label: 'Taking requests', checked: taking, helper: taking ? '' : 'Jobs you already booked are not affected.' })}
  </div>`
    : reviewing
      ? `<div class="card ${ID}__live ${ID}__review" data-review>
    <p class="${ID}__status">${reviewPill(t)}</p>
    ${toggle({ id: 'taking-requests', label: 'Taking requests', checked: false, disabled: true, helper: 'Turns on when your checks clear.' })}
  </div>`
      /* S-21: "again" only for a tailor customers could book before */
      : banner({ tone: 'warning', title: 'Customers can’t book you right now', text: `Finish ${finish[0]} so customers can book you${t.live ? ' again' : ''}.`, actionLabel: `Finish ${finish[1]}`, actionAct: 'fix' });
  const checks = !ok && !v.allPassed ? `<section class="sec ${ID}__checks" id="${ID}-checks" aria-labelledby="${ID}-checks-h">
    ${sectionHead('Your checks', { id: `${ID}-checks-h` })}
    <p class="t-small c-600 ${ID}__checks-lead">Customers can book you once all ${v.total} pass. Most reviews take ${REVIEW_TIME}.</p>
    ${verifyChecklist(t)}
  </section>` : '';
  const row = previewRow();
  const caption = !ok && !reviewing ? ''   /* CP-T33: the banner above says it */
    : ok && !taking ? ''   /* M7-2-T-04: the Paused pill already says it */
    : row
      ? `Example: ${nameList(job.garments.map((g) => g.type))}, ${lowerFirst(VISIT_LABEL.tailor[job.visitType])}`
      : 'Your estimate shows when a customer picks only services you price.';
  const rows = ROWS.map((r) => listRow({
    title: r.label,
    /* "Needs attention" sits as a second line under the summary, so the right column holds only the chevron (R2-2-T-06) */
    sub: `<span class="${ID}__sum">${esc(SUMMARY[r.id](t))}</span>${needsAttention(t, r.id) ? `<span class="${ID}__flag t-small w-600 c-error">Needs attention</span>` : ''}`,
    act: r.id === 'verify' ? (checks ? 'to-checks' : '') : `edit-${r.id}`,
    right: r.id === 'verify' && !checks ? statusPill('check-verified') : '',
  })).join('');
  return `${chrome('shop', { persona: 'tailor' })}
<main class="body ${ID}">
  ${headingRow('<h1 class="t-title">Your shop</h1>', { back: false })}
  <div class="sec ${ID}__state">${status}</div>
  ${checks}
  <div class="sec ${ID}__preview">${customerPreview({ title: ok && taking ? 'What customers see' : 'What customers will see', html: row ?? miniProfile({ name: t.name, initials: t.initials, photo: t.photo, shopName: t.shopName, bio: t.bio ?? '' }), caption })}</div>
  <section class="sec" aria-labelledby="${ID}-setup-h">
    ${sectionHead('Your setup', { id: `${ID}-setup-h` })}
    <div class="card card--list ${ID}__setup">${rows}</div>
  </section>
  <div class="${ID}__out">${textLink('Sign out', { act: 'sign-out', tone: 'danger' })}</div>
</main>`;
}

function wire(root) {
  wireToggles(root);
  root.addEventListener('toggle', (e) => {
    if (e.detail.id !== 'taking-requests') return;
    T.setTakingRequests(e.detail.checked);
    go(ID);
    document.getElementById('taking-requests')?.focus({ preventScroll: true });
    toast(e.detail.checked ? 'You’re taking requests again' : 'Paused. Customers can’t send you requests.', { tone: 'success' });
  });
  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const act = a.dataset.act;
    if (act.startsWith('edit-')) goTo(act.slice(5));
    else if (act === 'to-checks') document.getElementById(`${ID}-checks`)?.scrollIntoView({ block: 'start' });
    else if (act === 'check-id') openIdSheet(() => { const r = T.uploadId(); go(ID); if (r.ok) toast('ID added. We’ll check it again.', { tone: 'success' }); });
    else if (act === 'check-background') openBackgroundSheet({ agree: true, onDone: () => { go(ID); toast('Background check started', { tone: 'success' }); } });
    else if (act === 'check-years') { delete state.ui['to-profile']; state.ui['to-profile'] = { focus: '#years' }; go('to-profile'); }
    else if (act === 'check-payout') goTo('payouts');
    else if (act === 'fix') {
      const missing = ONBOARDING_STEPS.find((st) => !myTailor().onboarding?.[st.id]);
      if (missing) goTo(missing.id);
    } else if (act === 'sign-out') openSignOut();
  });
}

/* SF-44: the same confirm as the customer's account (c-account) — focus on the safe choice */
const signOutModal = () => `<div class="modal modal--leave" role="alertdialog" aria-modal="true" aria-labelledby="${ID}-so-title" aria-describedby="${ID}-so-body">
  <h2 class="modal__title t-h2" id="${ID}-so-title">Sign out of Taily?</h2>
  <p class="leave-modal__body" id="${ID}-so-body">You’ll need your phone number and a code to sign back in. Your jobs and requests stay as they are.</p>
  <div class="modal__actions">
    ${cta('Sign out', { variant: 'danger', attrs: 'data-act="sign-out-ok"' })}
    ${cta('Stay signed in', { variant: 'secondary', attrs: 'data-act="sign-out-keep"' })}
  </div>
</div>`;
function openSignOut() {
  modalOverlay(signOutModal(), { dataS: 'sign-out' }, (holder, close) => {
    const keep = holder.querySelector('[data-act="sign-out-keep"]');
    keep.addEventListener('click', () => close());
    keep.focus();
    holder.querySelector('[data-act="sign-out-ok"]').addEventListener('click', () => {
      A.signOut('tailor');
      close({ instant: true });
      go('t-phone', { fresh: true });
    });
  });
}
function goTo(section) {
  const screen = SCREEN_OF[section];
  if (!screen) return;
  delete state.ui[screen];       // a fresh draft from the saved values
  go(screen);
}

register(ID, view, wire);
