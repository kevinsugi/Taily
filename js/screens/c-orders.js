/* ============================================================
   c-orders — Past orders + receipts. Find what you paid and open its receipt.
   Orders (D-135) = bookings that were accepted and then completed or cancelled (incl. no-show), newest visit first.
   Amounts in words: completed → total "Paid" · cancelled early / by the tailor → "Refunded" · late / no-show → "Kept".
   Receipts print exact cents (one precision across the list). The list shows skeleton rows on its first load (D-141).
   Focal: the newest order row. Spec: M5-spec.md §C3.
   ============================================================ */
import { register, render as go, currentScreen } from '../app.js';
import { state, apptsFor, tailorById, statusScreen } from '../state.js';
import { chrome, headingRow, apptRow, emptyState, skeleton, heroGarment } from '../components.js';
import { withLatency } from '../sim.js';
import { fmtColumn } from '../money.js';
import { fmtDay, toDate } from '../dates.js';
import { setFocus, statusWord } from '../focus.js';

const ID = 'c-orders';

const ui = () => (state.ui[ID] ??= {});
const everConfirmed = (a) => a.history.some((h) => h.status === 'confirmed');
const orders = () => apptsFor('customer')
  .filter((a) => ['completed', 'cancelled'].includes(a.status) && everConfirmed(a) && !['withdrawn', 'switched'].includes(a.cancel?.reason))
  .sort((x, y) => toDate(y.slot.start).getTime() - toDate(x.slot.start).getTime());
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The amount an order row prints (D-135): the total paid, the refund, or the deposit kept. */
const amountOf = (a) => (a.status === 'completed' ? a.money.total : (a.cancel?.refund ?? 0) > 0 ? a.cancel.refund : (a.cancel?.kept ?? 0));

function row(a, fmtAmt) {
  const t = tailorById(a.tailorId) ?? state.tailors[0];
  const items = new Set(a.lines.map((l) => l.garmentId)).size || a.job.garments.length;
  const w = statusWord(a, 'customer', { short: true });
  const base = {
    id: a.id, name: t.name, initials: t.initials, when: fmtDay(a.slot.start), garment: heroGarment(a.job),   // M7-2-A-03
    place: `${plural(items, 'item')} · ${plural(a.lines.length, 'service')}`,
    status: w.pill, pillLabel: w.label, muted: true,
  };
  if (a.status === 'completed') return apptRow({ ...base, amountText: fmtAmt(a.money.total), amountCaption: 'Paid' });
  const { refund = 0, kept = 0 } = a.cancel ?? {};
  return refund > 0
    ? apptRow({ ...base, amountText: fmtAmt(refund), amountCaption: 'Refunded' })
    : apptRow({ ...base, amountText: fmtAmt(kept), amountCaption: 'Kept', kept: true });
}

function view() {
  const head = `${chrome('account')}<main class="body ${ID}" data-s="${ID}">
  ${headingRow('<h1 class="t-title">Past orders</h1>')}`;
  if (!ui().loaded) {
    return `${head}
  <div class="${ID}__loading" role="status" aria-label="Loading your orders">${skeleton({ kind: 'appt-row', count: 2 })}</div>
</main>`;
  }
  const list = orders();
  if (!list.length) {
    return `${head}
  <div class="${ID}__empty" data-empty="orders">${emptyState({
    title: 'No past orders yet', body: 'Finished orders and their receipts show up here.', ctaLabel: 'Start a booking', ctaAct: 'home', art: 'Formal Dress',
  })}</div>
</main>`;
  }
  const fmtAmt = fmtColumn(list.map(amountOf));                    // C-10: one precision down the list
  return `${head}
  <div class="${ID}__rows">${list.map((a) => row(a, fmtAmt)).join('')}</div>
</main>`;
}

function wire(root) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    if (el.dataset.act === 'open-appt') {
      const a = apptsFor('customer').find((x) => x.id === el.dataset.id);
      if (!a) return;
      setFocus(a.id);
      state.ui.from = 'account';   // M6-T-20: the booking opened from Past orders keeps the Account tab lit
      go(statusScreen(a, 'customer'));
    } else if (el.dataset.act === 'home') go('c-job', { fresh: true });
  });

  /* the skeleton is showing: "ask the server", then paint the list (instant under test, 'hold' never ends).
     Listeners go on first — an instant load re-renders this screen from inside this call. */
  if (!ui().loaded) {
    let sync = true;
    withLatency(() => {
      if (!sync && currentScreen() !== ID) return;
      ui().loaded = true;
      go(ID);
    });
    sync = false;
  }
}

register(ID, view, wire);
