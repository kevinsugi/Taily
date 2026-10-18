/* ============================================================
   c-receipt — a receipt she can keep (S-25, pre-MVP B2; D-376). Opened from "See full receipt" on a finished order
   (c-complete, c-booking). The receipt number and date, who it is from (COUNSEL / PROTOTYPE: Taily's legal name), who it
   is for, what she paid for (the approved order + the breakdown), every charge and refund with its date and card, and
   "Email receipt" — PROTOTYPE: no mail service; it records that it went. Without an email on file the page says where to
   add one (Account → Personal info, DG-3 A). Dollars only.
   Screen-local UI: state.ui['c-receipt'] = { busy, error }; the order is the focused appointment (state.ui.apptId).
   ============================================================ */
import { register, render as go, currentScreen } from '../app.js';
import { state, T, getAppt, tailorById, receiptView, priceChangeView } from '../state.js';
import {
  chrome, headingRow, sectionHead, moneyRows, customerBreakdown, changeList, withPhotos, actionBar, textLink, banner, emptyState, toast, esc, balanceCardLabel, wirePhotoViewer,
} from '../components.js';
import { withLatency } from '../sim.js';
import { fmtDay, fmtTime } from '../dates.js';
import { bookingTab } from '../focus.js';
import { COMPANY } from '../policies.js';

const ID = 'c-receipt';
const ui = () => (state.ui[ID] ??= {});
const firstOf = (t) => (t?.name || 'The tailor').split(' ')[0];
const LABEL = { deposit: 'Deposit', balance: 'Balance', 'courier-change': 'Courier window change' };   // K-53: a pricier window after Pay, its own charge
const REFUND_LABEL = { deposit: 'Deposit refunded', overage: 'Courier difference refunded' };

function view(s) {
  const a = getAppt(s.ui.apptId);
  const r = receiptView(a);
  if (!a || !r) {
    return `${chrome(bookingTab())}<main class="body ${ID}" data-s="${ID}">
  ${headingRow('<h1 class="t-title">Receipt</h1>')}
  <div class="${ID}__empty" data-empty="no-receipt">${emptyState({ title: 'No receipt yet', body: 'A receipt shows here once you’ve paid for an order.', ctaLabel: 'Go to Past orders', ctaAct: 'orders' })}</div>
</main>`;
  }
  const t = tailorById(a.tailorId) ?? s.tailors[0];
  const first = firstOf(t);
  const c = s.customer;
  const d = s.ui[ID] ?? {};
  const card = (id) => balanceCardLabel(a, id);
  const rows = [
    ...r.charges.map((x) => ({ label: LABEL[x.kind], cents: x.cents, caption: `Charged ${x.at ? fmtDay(x.at) : ''} · ${card(x.cardId)}` })),
    ...r.refunds.map((x) => ({ label: REFUND_LABEL[x.kind], cents: x.cents, kind: 'negative', caption: `Refunded ${x.at ? fmtDay(x.at) : ''} · ${card(x.cardId)}` })),
    { label: 'Paid in all', cents: r.paid, kind: 'total' },
  ];
  const garments = a.lines?.length ? withPhotos(priceChangeView(a, a.lines).garments, a.job) : [];
  const email = String(c.email ?? '').trim();
  const noEmail = email ? '' : `<section class="sec ${ID}__email" data-no-email>
    <p class="t-body c-700">Add an email in Personal info to get receipts by email. This receipt stays here in Past orders either way.</p>
    <div>${textLink('Add an email', { act: 'add-email' })}</div>
  </section>`;
  return `${chrome(bookingTab())}<main class="body${email ? ' body--with-bar' : ''} ${ID}" data-s="${ID}">
  ${headingRow('<h1 class="t-title">Receipt</h1>')}
  <p class="t-small c-600 ${ID}__number"><span class="tabular" data-receipt-no>${esc(r.number)}</span> · ${fmtDay(r.issuedAt)}</p>
  <section class="sec sec--first ${ID}__parties" aria-label="From and to">
    <div class="${ID}__party"><p class="t-caps c-600">From</p><p class="t-body">${esc(COMPANY.name)} · ${esc(COMPANY.city)}</p><p class="t-small c-600">For work by ${esc(t.name)}${t.shopName ? `, ${esc(t.shopName)}` : ''}, an independent tailor booked through Taily.</p></div>
    <div class="${ID}__party"><p class="t-caps c-600">Billed to</p><p class="t-body">${esc(c.first)} ${esc(c.last)}</p>${email ? `<p class="t-small c-600">${esc(email)}</p>` : ''}</div>
  </section>
  <section class="sec" aria-labelledby="${ID}-order-h">
    ${sectionHead('What you paid for', { id: `${ID}-order-h` })}
    ${garments.length ? `<div class="${ID}__order">${changeList({ garments })}</div>` : ''}
    ${customerBreakdown(a.money, { stage: 'paid', tailorFirst: first, depositState: a.payments.deposit.state, confirmed: true, refundState: a.payments.refund?.state ?? '' })}
  </section>
  <section class="sec" aria-labelledby="${ID}-pay-h">
    ${sectionHead('Payments', { id: `${ID}-pay-h` })}
    <div data-money>${moneyRows(rows)}</div>
  </section>
  ${d.error ? `<div class="${ID}__alert">${banner({ tone: 'error', title: d.error === 'offline' ? 'You’re offline' : 'Couldn’t send it', text: 'The receipt wasn’t sent. Try again.' })}</div>` : ''}
  ${noEmail}
</main>
${email ? actionBar({ ctaLabel: r.emailedAt ? 'Email it again' : 'Email receipt', ctaAct: 'email', busy: !!d.busy, busyLabel: 'Sending…', note: r.emailedAt ? `Sent to ${esc(r.emailedTo)} · ${fmtDay(r.emailedAt)}, ${fmtTime(r.emailedAt)}` : `To ${esc(email)}` }) : ''}`;
}

function wire(root) {
  wirePhotoViewer(root);
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled || el.getAttribute('aria-busy') === 'true') return;
    if (el.dataset.act === 'orders') go('c-orders', { fresh: true });
    else if (el.dataset.act === 'add-email') { state.ui['c-profile'] = { focusEmail: true }; go('c-profile'); }
    else if (el.dataset.act === 'email') send();
  });
  function send() {
    const id = state.ui.apptId;
    if (ui().busy) return;
    ui().busy = true;
    ui().error = null;
    go(ID, { replace: true });
    withLatency(() => {
      ui().busy = false;
      const r = T.emailReceipt(id);
      if (currentScreen() !== ID) return;
      if (!r.ok) { ui().error = r.error; go(ID, { replace: true }); return; }
      go(ID, { replace: true });
      toast(`Receipt sent to ${r.to}`, { tone: 'success' });
    });
  }
}

register(ID, view, wire);
