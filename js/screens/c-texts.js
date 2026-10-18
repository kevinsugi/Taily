/* ============================================================
   c-texts — Account → Texts (pre-MVP A1, D-02 / DG-3 A's Texts page). Booking texts are their own opt-in: one switch,
   the STOP state explained (a "Texts are off" banner on Bookings points here), the carrier lines. Sign-in codes always go.
   Focal: the switch. Turning texts on sends a confirmation text (state.js setTexts).
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, T } from '../state.js';
import { chrome, headingRow, toggle, wireToggles, banner, toast, esc } from '../components.js';
import { fmtDay } from '../dates.js';

const ID = 'c-texts';

function view(s) {
  const p = s.texts.customer;
  const stop = !p.on && p.stoppedAt
    ? `<div class="${ID}__stop">${banner({ tone: 'warning', title: `You replied STOP on ${esc(fmtDay(p.stoppedAt))}`, text: 'So texts to this number are off, and reminders won’t reach you. Turn them on here, or reply START to any Taily text.' })}</div>` : '';
  return `${chrome('account')}
<main class="body ${ID}" data-s="${ID}">
  ${headingRow('<h1 class="t-title">Texts</h1>')}
  <p class="t-body c-700 ${ID}__lead">We text <span class="nb">${esc(s.customer.phone)}</span>. Each text links straight to your booking.</p>
  ${stop}
  <div class="card ${ID}__card">${toggle({ id: 'texts-booking', label: 'Booking updates', checked: p.on, helper: 'Replies to your request, reminders, ready to pick up, receipts' })}</div>
  ${p.on ? '' : `<p class="t-small c-600 ${ID}__off" data-texts-off>Updates still show here in the app. Without texts, the day-before reminder shows only in the app, so we never cancel a visit because you missed it.</p>`}
  <p class="t-small c-600 ${ID}__fine">Sign-in codes are always sent, because you ask for them. Message frequency varies. Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help.</p>
</main>`;
}

function wire(root) {
  wireToggles(root);
  root.addEventListener('toggle', (e) => {
    if (e.detail.id !== 'texts-booking') return;
    const r = T.setTexts('customer', e.detail.checked);
    go(ID, { replace: true });
    document.getElementById('texts-booking')?.focus({ preventScroll: true });
    if (!r.ok && r.error !== 'no-change') { toast('Couldn’t save this. Try again.', { tone: 'error' }); return; }
    toast(e.detail.checked ? 'Texts are on. We sent you a text to confirm.' : 'Texts are off. Updates still show in the app.', { tone: 'success' });
  });
}

register(ID, view, wire);
