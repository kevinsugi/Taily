/* ============================================================
   t-shop — T7 Shop (M2-spec §C3). Every onboarding section at a
   glance, each editable, plus rush fees. Focal: the "What
   customers see" row. Summaries are dollars only.
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, T, tailorsFor, bookable, textsOn } from '../state.js';
import { myTailor, MY_TAILOR_ID, tailorRowProps } from '../tailor-data.js';
import { VISIT_LABEL, RETURN_LABEL } from '../data.js';
import { cents, fmt } from '../money.js';
import * as A from '../account.js';
import {
  chrome, headingRow, banner, customerPreview, tailorRow, miniProfile, listRow, textLink, sectionHead, statusPill, toggle, wireToggles, toast, ONBOARDING_STEPS, esc,
  modalOverlay, cta,
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

/** Her row as `tailorsFor(state.job)` gives it to a customer (D-65); null when she is not bookable or the demo job doesn't fit. */
function previewRow() {
  const job = state.job;
  const r = tailorsFor(job).rows.find((x) => x.tailor.id === MY_TAILOR_ID);
  if (!r) return null;
  return tailorRow(tailorRowProps(r, job));
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
  returns: (t) => Object.keys(RETURN_LABEL).filter((k) => t.returns?.[k])
    .map((k, i) => (i === 0 || /^Taily/.test(RETURN_LABEL[k]) ? RETURN_LABEL[k] : RETURN_LABEL[k].replace(/^./, (c) => c.toLowerCase()))).join(', ') || 'Not set up yet',
  availability: (t) => {
    const parts = [];
    const days = (kind) => Object.keys(t.availability?.[kind] ?? {}).length;
    if (t.shop?.enabled) parts.push(days('shop') ? `Shop ${plural(days('shop'), 'day', 'days')}` : 'Shop: none set');
    if (t.home?.enabled) parts.push(days('home') ? `Home visits ${plural(days('home'), 'day', 'days')}` : 'Home visits: none set');
    return parts.join(' · ') || 'Not set up yet';
  },
  payouts: (t) => (t.payouts?.bank && t.payouts?.last4 ? `${t.payouts.bank} •••• ${t.payouts.last4} · paid Fridays` : 'Not set up yet'),
};
const ROWS = [
  { id: 'profile', label: 'Profile' },
  { id: 'services', label: 'Services and prices' },
  { id: 'rush', label: 'Rush fees' },
  { id: 'where', label: 'Where you work' },
  { id: 'returns', label: 'Return options' },
  { id: 'availability', label: 'Availability' },
  { id: 'payouts', label: 'Payouts' },
];
/* CP-T33: what the banner asks her to finish — "Finish your availability …" / the action "Finish availability" */
const FINISH = { profile: ['your profile', 'profile'], services: ['your services', 'services'], where: ['where you work', 'where you work'],
  returns: ['your return options', 'return options'], availability: ['your availability', 'availability'], payouts: ['your payouts', 'payouts'] };

function view(s) {
  const t = myTailor();
  const job = s.job;
  const ok = bookable(t);
  const missing = ONBOARDING_STEPS.find((st) => !t.onboarding?.[st.id]);
  const finish = FINISH[missing?.id] ?? ['your setup', 'setup'];
  /* D-161: "Taking requests" sits with the Bookable chip; off, the chip says customers can't send requests */
  const taking = t.takingRequests !== false;
  const status = ok
    ? `<div class="card ${ID}__live">
    <p class="${ID}__status">${taking ? statusPill('bookable') : statusPill('paused', 'Paused · customers can’t send requests')}</p>
    ${toggle({ id: 'taking-requests', label: 'Taking requests', checked: taking, helper: taking ? '' : 'Jobs you already booked are not affected.' })}
  </div>`
    : banner({ tone: 'warning', title: 'Customers can’t book you right now', text: `Finish ${finish[0]} so customers can book you again.`, actionLabel: `Finish ${finish[1]}`, actionAct: 'fix' });
  const row = previewRow();
  const caption = !ok ? ''   /* CP-T33: the banner above says it */
    : !taking ? ''   /* M7-2-T-04: the Paused pill already says it */
    : row
      ? `Example: ${nameList(job.garments.map((g) => g.type))}, ${lowerFirst(VISIT_LABEL.tailor[job.visitType])}`
      : 'Your estimate shows when a customer picks something you price.';
  const rows = ROWS.map((r) => listRow({
    title: r.label,
    /* "Needs attention" sits as a second line under the summary, so the right column holds only the chevron (R2-2-T-06) */
    sub: `<span class="${ID}__sum">${esc(SUMMARY[r.id](t))}</span>${r.id !== 'rush' && t.onboarding?.[r.id] === false ? `<span class="${ID}__flag t-small w-600 c-error">Needs attention</span>` : ''}`,
    act: `edit-${r.id}`,
  })).join('');
  return `${chrome('shop', { persona: 'tailor' })}
<main class="body ${ID}">
  ${headingRow('<h1 class="t-title">Your shop</h1>', { back: false })}
  <div class="sec ${ID}__state">${status}</div>
  <div class="sec ${ID}__preview">${customerPreview({ title: ok && taking ? 'What customers see' : 'What customers will see', html: row ?? miniProfile({ name: t.name, initials: t.initials, photo: t.photo, shopName: t.shopName, bio: t.bio ?? '' }), caption })}</div>
  <section class="sec" aria-labelledby="${ID}-setup-h">
    ${sectionHead('Your setup', { id: `${ID}-setup-h` })}
    <div class="card card--list ${ID}__setup">${rows}</div>
  </section>
  <section class="sec" aria-labelledby="${ID}-account-h">
    ${sectionHead('Account', { id: `${ID}-account-h` })}
    <div class="card card--list ${ID}__account">${listRow({ title: 'Texts', sub: `${esc(t.phone ?? '')} · ${textsOn('tailor') ? 'new requests come here' : 'off'}`, act: 'texts' })}</div>
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
    else if (act === 'fix') {
      const missing = ONBOARDING_STEPS.find((st) => !myTailor().onboarding?.[st.id]);
      if (missing) goTo(missing.id);
    } else if (act === 'sign-out') openSignOut();
    else if (act === 'texts') go('t-texts');   // pre-MVP A1 (D-02)
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
