/* ============================================================
   t-texts — Shop → Texts (pre-MVP A1, D-02). New requests and job updates reach the tailor by text: one switch, the STOP state
   explained (t-home's "Texts are off" banner points here), the carrier lines. Sign-in codes always go. Focal: the switch.
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, T } from '../state.js';
import { myTailor } from '../tailor-data.js';
import { chrome, headingRow, toggle, wireToggles, banner, toast, esc } from '../components.js';
import { fmtDay } from '../dates.js';
import { POLICY } from '../money-config.js';

const ID = 't-texts';

function view(s) {
  const p = s.texts.tailor;
  const stop = !p.on && p.stoppedAt
    ? `<div class="${ID}__stop">${banner({ tone: 'warning', title: `You replied STOP on ${esc(fmtDay(p.stoppedAt))}`, text: 'So texts to this number are off, and new requests won’t reach you. Turn them on here, or reply START to any Taily text.' })}</div>` : '';
  return `${chrome('shop', { persona: 'tailor' })}
<main class="body ${ID}" data-s="${ID}">
  ${headingRow('<h1 class="t-title">Texts</h1>')}
  <p class="t-body c-700 ${ID}__lead">We text <span class="nb">${esc(myTailor()?.phone ?? '')}</span>. Each text links straight to the request or job.</p>
  ${stop}
  <div class="card ${ID}__card">${toggle({ id: 'texts-jobs', label: 'Requests and job updates', checked: p.on, helper: 'New requests, visit reminders, changes, payouts' })}</div>
  ${p.on ? '' : `<p class="t-small c-600 ${ID}__off" data-texts-off>Requests still expire ${POLICY.REQUEST_EXPIRY_H} hours after they arrive, so check Home often.</p>`}
  <p class="t-small c-600 ${ID}__fine">Sign-in codes are always sent, because you ask for them. Message frequency varies. Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help.</p>
</main>`;
}

function wire(root) {
  wireToggles(root);
  root.addEventListener('toggle', (e) => {
    if (e.detail.id !== 'texts-jobs') return;
    const r = T.setTexts('tailor', e.detail.checked);
    go(ID, { replace: true });
    document.getElementById('texts-jobs')?.focus({ preventScroll: true });
    if (!r.ok && r.error !== 'no-change') { toast('Couldn’t save this. Try again.', { tone: 'error' }); return; }
    toast(e.detail.checked ? 'Texts are on. We sent you a text to confirm.' : `Texts are off. Requests still expire after ${POLICY.REQUEST_EXPIRY_H} hours.`, { tone: 'success' });
  });
}

register(ID, view, wire);
