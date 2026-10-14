/* ============================================================
   c-price-change — C9 review your final order (M4-spec §C1, K-01).
   After the fitting the tailor sends the final order — always, even
   unchanged. Sarah sees what changed (New item / New / New price /
   Removed text tags, or "No changes"), the total and the unchanged
   deposit, then approves or messages first. No reject path (§2).
   Focal: the "New total" / "Total" figure.
   States are data: added · item-added · item-removed · removed ·
   repriced · messaged · unchanged · revised.
   Which appointment: focusAppt (D-72).
   ============================================================ */
import { register, render as go, registered, currentScreen } from '../app.js';
import { state, T, tailorById, priceChangeView } from '../state.js';
import {
  chrome, headingRow, statusHero, banner, emptyState, deltaFigure, noteQuote, changeList, withPhotos, wirePhotoViewer, changeSummary, moneyRows, actionBar, toast, esc, wireGarmentDocs, sectionHead,
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
    title: 'No final order to review', body: 'After your fitting, the order your tailor sends shows up here.',
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
  const changed = pv.changed;
  const hero = statusHero({
    variant: 'requested', pill: 'action', pillLabel: 'Approve order', title: 'Review your final order',
    body: changed
      ? `${esc(first)} changed your order at the fitting. Once you approve, the work starts.`
      : `${esc(first)} checked everything at the fitting. Nothing changed.`,
  });
  const rows = [
    { label: 'Services', cents: after.services, caption: `${first}’s final prices` },
    after.homeFee > 0 && { label: 'Home-visit fee', cents: after.homeFee },
    after.rush > 0 && { label: 'Rush fee', cents: after.rush },
    { label: changed ? 'New total' : 'Total', cents: after.total, kind: 'total' },
    { label: 'Deposit', cents: after.deposit, caption: 'Stays the same', status: 'Paid' },
    { label: changed ? 'New balance' : 'Balance', cents: after.balance, status: 'Due when ready' },
    after.refund > 0 && { label: 'Refund to your card', cents: after.refund, caption: 'When your order is ready' },
  ].filter(Boolean);
  return `${chromeHtml}<main class="body body--with-bar ${ID}" data-s="${ID}${messaged ? '--messaged' : ''}" data-changed="${changed}" data-appt="${esc(a.id)}">
  ${headingRow(hero)}
  ${messaged ? `<div class="${ID}__banner">${banner({ tone: 'info', text: `You messaged ${esc(first)} about the order. Approve when you’re ready, or keep talking in chat.` })}</div>` : ''}
  ${pv.revisions > 0 ? `<p class="t-small c-muted ${ID}__again">${esc(first)} updated the order again at <span class="nb">${esc(fmtTime(pv.sentAt))}</span>.</p>` : ''}
  <div class="sec sec--first ${ID}__figure">${deltaFigure({ label: changed ? 'New total' : 'Total', cents: after.total, was: pv.before.total })}</div>
  ${pv.note ? `<div class="${ID}__quote">${noteQuote({ label: `${first}’s note on the order`, text: pv.note })}${pv.noteMasked ? `<p class="t-small c-muted ${ID}__masked">Phone numbers and emails in this note are hidden.</p>` : ''}</div>` : ''}
  <section class="sec">${sectionHead(changed ? 'What changed' : 'Your order')}
  ${changed ? `<div class="${ID}__summary">${changeSummary(pv.counts)}</div>` : ''}
  ${changeList({ garments: withPhotos(pv.garments, a.job), docs: a.priceChange.docs ?? null, commentLabel: `${first}’s comment` })}</section>
  <section class="sec">${sectionHead('Price')}
  ${moneyRows(rows)}</section>
  ${ui().error ? `<div class="${ID}__fail" role="alert">${banner({ tone: 'error', title: 'Couldn’t approve the order', text: 'Nothing changed, and nothing was charged. Try again.' })}</div>` : ''}
</main>
${actionBar({
    ctaLabel: 'Approve and start', ctaAct: 'approve', busy, busyLabel: 'Approving…',
    lead: `<span>${changed ? 'New balance' : 'Balance'}, due when it’s ready</span><b data-money>${fmtExact(after.balance)}</b>`,
    secondaryLabel: messaged ? 'Open chat' : `Message ${first}`, secondaryAct: 'message',
  })}`;
}

function approve(a) {
  if (ui().busy) return;
  ui().busy = true;
  ui().error = false;
  go(ID);
  withLatency(() => {
    ui().busy = false;
    if (currentScreen() !== ID) return;
    const r = T.approvePriceChange(a.id);
    const first = firstOf(tailorById(a.tailorId));
    if (r.ok) {
      setFocus(a.id);
      go('c-booking', { fresh: true });
      toast(`Order approved. ${first} can start the work.`, { tone: 'success' });
    } else {
      ui().error = true;                                            // D-140 / A-14: the banner above the bar carries it, the toast only echoes
      go(ID);
      toast('Couldn’t approve the order', { tone: 'error' });
    }
  });
}

function wire(root) {
  if (redirectIfMoved(ID, go, { has: (id) => registered().includes(id) })) return;
  const a = focusAppt(ID);
  wirePhotoViewer(root);   // the customer-photo stack of an item the tailor did not document (K-04)

  const backBtn = root.querySelector('.back[data-act="back"]');
  if (backBtn) {
    backBtn.dataset.wired = '1';
    backBtn.addEventListener('click', () => go('c-bookings'));
  }

  /* K-02: the tailor's Before | Pinned photos from the SENT snapshot only (D-175) */
  const first = firstOf(a ? tailorById(a.tailorId) : null);
  wireGarmentDocs(root, {
    by: `Taken by ${first}`,
    lookup: (gid) => {
      const docs = a?.priceChange?.docs?.[gid];
      const type = priceChangeView(a).garments.find((g) => g.id === gid)?.type ?? '';
      return docs ? { type, docs } : null;
    },
  });

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
