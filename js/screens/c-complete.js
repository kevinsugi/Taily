/* ============================================================
   c-complete — C11 order completed: the receipt and a review prompt. K-17: option 1-E "Linen and cognac".
   A stitch sews itself across a linen stage and the garments swing in on tags from it; Amara's woven
   "Tailored by" label carries the five stars (a star tap carries the rating into c-review, D-107) and the
   receipt is one row that opens in place. A completed order Sarah has not reviewed lands here
   (statusScreen); a reviewed one lands on c-booking. Study-1 A4 (K-28): Job Done without a fit check — the bar is
   Leave a review · Book Amara again · Message; 7 days on with no review, the reminder card (reviewReminderDue).
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, T, tailorById, priceChangeView, isVerified } from '../state.js';
import {
  chrome, navBackMark, receiptBlock, balanceCardLabel, wirePhotoViewer, wireGarmentDocs, actionBar, emptyState, stars, wireStars, esc, verifiedCheck, returnedItems, linenStage, tagRail,
} from '../components.js';
import { CHEVRON_RIGHT, VISIT_ICONS } from '../icons.js';
import { fmtExact } from '../money.js';
import { fmtDay } from '../dates.js';
import { focusAppt, setFocus, bookingTab } from '../focus.js';

const ID = 'c-complete';

/** How a review names Sarah on Amara’s profile: first name and last initial. */
const customerShort = () => `${state.customer.first} ${(state.customer.last ?? '').charAt(0)}.`.replace(/ \.$/, '');
const firstOf = (t) => (t?.name || 'The tailor').split(' ')[0];
const doneAt = (a) => [...a.history].reverse().find((h) => h.status === 'completed')?.at ?? a.requestedAt;

/** The receipt row's one line: what was paid and with what, or where a refund went (D-156). */
function receiptLine(a) {
  const card = balanceCardLabel(a);
  const paid = a.payments.balance?.cents ?? 0;
  const refund = a.payments.refund?.cents ?? 0;
  if (paid <= 0 && refund > 0) return `${fmtExact(refund)} refunded · ${balanceCardLabel(a, a.cardId)}`;
  return `Paid ${fmtExact(a.money.total)} · ${card}`;   // SF-25: what she paid in all (the breakdown below splits deposit and balance)
}


function view() {
  const a = focusAppt(ID);
  if (!a) {
    return `${chrome(bookingTab())}<main class="body ${ID}" data-s="${ID}">
  <div class="${ID}__empty" data-empty="no-booking">${emptyState({
    title: 'Nothing to review', body: 'Completed orders show up in Bookings.', ctaLabel: 'Go to Bookings', ctaAct: 'done', art: 'Formal Dress',
  })}</div>
</main>`;
  }
  const t = tailorById(a.tailorId) ?? state.tailors[0];
  const first = firstOf(t);
  const items = returnedItems(a);
  /* SF-39: no review-reminder card here — the inline stars below already ask (a week on, Home still carries the card) */
  /* M7-1-A-06: the heading is the group's visible label; a star tap carries the rating into c-review (D-107) */
  const rating = stars({ input: true, name: 'rate' }).replace('aria-label="Your rating"', 'aria-labelledby="rate-label"');
  const meta = [t.shopName, t.shop?.hood, `for ${customerShort()}`].filter(Boolean).join(' · ');
  return `${chrome(bookingTab())}<main class="body body--with-bar ${ID}" data-s="${ID}">
  ${navBackMark()}
  ${linenStage({ eyebrow: `${a.handoff?.completedBy === 'auto' ? 'Completed automatically' : 'Order complete'} · ${fmtDay(doneAt(a))}`, title: 'Back with you, tailored to fit.', rail: tagRail(items), label: 'Order complete' })}
  <section class="${ID}__label" aria-label="Rate ${esc(first)}">
    <p class="t-caps ${ID}__by">Tailored by</p>
    <span class="${ID}__namerow"><span class="${ID}__name">${esc(t.name)}</span>${isVerified(t) ? verifiedCheck({ years: t.years }) : ''}</span>
    <p class="t-small ${ID}__meta">${esc(meta)}</p>
    <div class="${ID}__rule" aria-hidden="true"></div>
    <h2 class="t-body w-600" id="rate-label">How did ${esc(first)} do?</h2>
    ${rating}
    <p class="t-small c-600 ${ID}__hint">Tap a star to rate. Reviews show on ${esc(first)}’s profile as ${esc(customerShort())}${customerShort().endsWith('.') ? '' : '.'}</p>
  </section>
  <section class="sec ${ID}__receipt">
    <button type="button" class="${ID}__row" data-act="receipt" aria-expanded="false" aria-controls="receipt-body">
      <span class="${ID}__rowicon" aria-hidden="true">${VISIT_ICONS.bag}</span>
      <span class="${ID}__rowtext"><span class="t-body w-600">Receipt</span><span class="t-small c-600" data-money>${esc(receiptLine(a))}</span></span>
      ${CHEVRON_RIGHT}
    </button>
    <div class="${ID}__receipt-body" id="receipt-body" hidden>${receiptBlock(a, first)}</div>
  </section>
</main>
${actionBar({ ctaLabel: 'Leave a review', ctaAct: 'leave-review', secondaryLabel: `Book ${esc(first)} again`, secondaryAct: 'book-again', tertiaryLabel: `Message ${esc(first)}`, tertiaryAct: 'message' })}`;
}

function wire(root) {
  const a = focusAppt(ID);
  const backBtn = root.querySelector('.back[data-act="back"]');
  if (backBtn) {
    backBtn.dataset.wired = '1';
    backBtn.addEventListener('click', () => go(state.ui.from === 'account' ? 'c-orders' : 'c-bookings'));
  }
  wireStars(root);
  /* K4-1-03: the receipt's item rows carry the same photo stacks as "Your order" */
  wirePhotoViewer(root);
  if (a) {
    const by = firstOf(tailorById(a.tailorId) ?? state.tailors[0]);
    wireGarmentDocs(root, {
      by: `Taken by ${by}`,
      lookup: (gid) => {
        const docs = a.priceChange?.docs?.[gid];
        const type = priceChangeView(a, a.lines).garments.find((g) => g.id === gid)?.type ?? '';
        return docs ? { type, docs } : null;
      },
    });
  }

  /* a star tap is the start of the review: carry the rating over (D-107) */
  root.addEventListener('change', (e) => {
    const input = e.target.closest('input[name="rate"]');
    if (!input || !a) return;
    setFocus(a.id, { keepFrom: true });
    state.ui['c-review'] = { apptId: a.id, stars: Number(input.value) };
    go('c-review');
  });
  root.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act || e.target.closest('.screen-sheet--overlay')) return;
    if (act === 'receipt') {
      const row = e.target.closest('[data-act="receipt"]');
      const open = row.getAttribute('aria-expanded') !== 'true';
      row.setAttribute('aria-expanded', String(open));
      root.querySelector('#receipt-body').hidden = !open;
    } else if (act === 'message') { if (a) setFocus(a.id, { keepFrom: true }); go('c-thread'); }
    else if (act === 'leave-review' && a) { setFocus(a.id, { keepFrom: true }); state.ui['c-review'] = { apptId: a.id }; go('c-review'); }
    else if (act === 'book-again' && a) { T.bookAgain(a.id); state.ui.booking = { tailorId: a.tailorId, again: true }; go('c-job', { fresh: true }); }   // Study-1 A4 (default 9)
    else if (act === 'done') go(state.ui.from === 'account' ? 'c-orders' : 'c-bookings', { fresh: true });
  });
}

register(ID, view, wire);
