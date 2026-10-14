/* ============================================================
   c-price-change — C9 review the adjusted price (M4-spec §C1).
   After the fitting the tailor changed the order. Sarah sees exactly
   what changed (the correction marks: struck old price + a text tag),
   the new total and the unchanged deposit, then approves or messages
   first. No reject path (§2). Focal: the "New total" figure.
   States are data: added · removed · repriced · messaged · revised.
   Which appointment: focusAppt (D-72).
   ============================================================ */
import { register, render as go, registered, currentScreen } from '../app.js';
import { state, T, tailorById, priceChangeView } from '../state.js';
import {
  chrome, headingRow, statusHero, banner, emptyState, deltaFigure, noteQuote, changeList, moneyRows, actionBar, toast, esc,
} from '../components.js';
import { fmtExact } from '../money.js';
import { fmtTime } from '../dates.js';
import { withLatency } from '../sim.js';
import { focusAppt, setFocus, redirectIfMoved } from '../focus.js';

const ID = 'c-price-change';

const ui = () => (state.ui[ID] ??= {});
const firstOf = (t) => (t?.name || 'The tailor').split(' ')[0];

function view() {
  const a = focusAppt(ID);
  const chromeHtml = chrome('bookings');
  if (!a || !a.priceChange) {
    return `${chromeHtml}<main class="body ${ID}" data-s="${ID}--none">
  <div class="${ID}__empty" data-empty="no-change">${emptyState({
    title: 'No price change to review', body: 'When a tailor changes the price after your fitting, it shows up here.',
    ctaLabel: 'Back to Bookings', ctaAct: 'bookings',
  })}</div>
</main>`;
  }
  const t = tailorById(a.tailorId) ?? state.tailors[0];
  const first = firstOf(t);
  const pv = priceChangeView(a);
  const after = pv.after;
  const messaged = pv.state === 'messaged';
  const busy = !!ui().busy;
  const hero = statusHero({
    variant: 'requested', pill: 'action', pillLabel: 'Approve new price', title: `${esc(first)} updated the price`,
    body: `After the fitting, ${esc(first)} changed your order. Nothing more is charged until it’s ready.`,
  });
  const rows = [
    { label: 'Services', cents: after.services, caption: `${first}’s new prices` },
    after.homeFee > 0 && { label: 'Home-visit fee', cents: after.homeFee },
    after.rush > 0 && { label: 'Rush fee', cents: after.rush },
    { label: 'New total', cents: after.total, kind: 'total' },
    { label: 'Deposit', cents: after.deposit, caption: 'Stays the same', status: 'Paid' },
    { label: 'New balance', cents: after.balance, status: 'Due when ready' },
    after.refund > 0 && { label: 'Refund to your card', cents: after.refund, caption: 'When your order is ready' },
  ].filter(Boolean);
  return `${chromeHtml}<main class="body body--with-bar ${ID}" data-s="${ID}${messaged ? '--messaged' : ''}" data-appt="${esc(a.id)}">
  ${headingRow(hero, { backRow: true })}
  ${messaged ? `<div class="${ID}__banner">${banner({ tone: 'info', text: `You messaged ${esc(first)} about the price. Approve when you’re ready, or keep talking in chat.` })}</div>` : ''}
  ${pv.revisions > 0 ? `<p class="t-small c-600 ${ID}__again">${esc(first)} changed the price again at <span class="nb">${esc(fmtTime(pv.sentAt))}</span>.</p>` : ''}
  <div class="${ID}__figure">${deltaFigure({ label: 'New total', cents: after.total, was: pv.before.total })}</div>
  ${pv.note ? `<div class="${ID}__quote">${noteQuote({ label: `${first}’s note`, text: pv.note })}${pv.noteMasked ? `<p class="t-small c-600 ${ID}__masked">Phone numbers and emails in this note are hidden.</p>` : ''}</div>` : ''}
  <h2 class="t-h2 ${ID}__h2">What changed</h2>
  ${changeList({ garments: pv.garments })}
  <h2 class="t-h2 ${ID}__h2">Price</h2>
  ${moneyRows(rows)}
  <p class="t-small c-600 ${ID}__fine">There’s no charge today. If something doesn’t look right, message ${esc(first)} before you approve.</p>
</main>
${actionBar({
    ctaLabel: 'Approve new price', ctaAct: 'approve', busy, busyLabel: 'Approving…',
    lead: `New balance <b data-money>${fmtExact(after.balance)}</b>`,
    secondaryLabel: messaged ? 'Open chat' : `Message ${first}`, secondaryAct: 'message',
  })}`;
}

function approve(a) {
  if (ui().busy) return;
  ui().busy = true;
  go(ID);
  withLatency(() => {
    ui().busy = false;
    if (currentScreen() !== ID) return;
    const r = T.approvePriceChange(a.id);
    const first = firstOf(tailorById(a.tailorId));
    if (r.ok) {
      setFocus(a.id);
      go('c-booking', { fresh: true });
      toast(`New price approved. ${first} can start the work.`, { tone: 'success' });
    } else {
      go(ID);
      toast('Something went wrong. Try again.', { tone: 'error' });
    }
  });
}

function wire(root) {
  if (redirectIfMoved(ID, go, { has: (id) => registered().includes(id) })) return;
  const a = focusAppt(ID);

  const backBtn = root.querySelector('.back[data-act="back"]');
  if (backBtn) {
    backBtn.dataset.wired = '1';
    backBtn.addEventListener('click', () => go('c-bookings'));
  }

  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled || e.target.closest('.screen-sheet--overlay')) return;
    const act = el.dataset.act;
    if (act === 'bookings') go('c-bookings', { fresh: true });
    else if (!a) return;
    else if (act === 'approve') approve(a);
    else if (act === 'message') go('c-thread');   // opening the chat changes nothing; Sarah's first message marks it (R4-2-C-02)
  });
}

register(ID, view, wire);
