/* ============================================================
   c-complete — C11 order completed: the receipt and a review prompt.
   Focal: the review card's five stars. A completed order Sarah has not
   reviewed lands here (statusScreen); a reviewed one lands on c-booking.
   Tapping a star carries the rating into c-review (D-107).
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, tailorById } from '../state.js';
import {
  chrome, headingRow, statusHero, receiptBlock, actionBar, emptyState, stars, wireStars, esc,
} from '../components.js';
import { STAR_WORDS } from '../data.js';
import { focusAppt, setFocus, bookingTab } from '../focus.js';

const ID = 'c-complete';

const firstOf = (t) => (t?.name || 'The tailor').split(' ')[0];

function view() {
  const a = focusAppt(ID);
  if (!a) {
    return `${chrome(bookingTab())}<main class="body ${ID}" data-s="${ID}">
  <div class="${ID}__empty" data-empty="no-booking">${emptyState({
    title: 'Nothing to review', body: 'Completed orders show up in Bookings.', ctaLabel: 'Go to Bookings', ctaAct: 'done',
  })}</div>
</main>`;
  }
  const t = tailorById(a.tailorId) ?? state.tailors[0];
  const first = firstOf(t);
  /* C-21: c-review's star layout — the group is labelled "Your rating", left-aligned, the word under it */
  const rating = stars({ input: true, name: 'rate', value: 0 }).replace('aria-label="Your rating"', 'aria-labelledby="rate-label"');
  return `${chrome(bookingTab())}<main class="body body--with-bar ${ID}" data-s="${ID}">
  ${headingRow(statusHero({ pill: 'completed', title: 'All done', body: `${esc(first)} marked your order completed. Thanks for booking with Taily.` }), { backRow: true })}
  <section class="${ID}__rate">
    <h2 class="t-h2">How did ${esc(first)} do?</h2>
    <p class="t-body w-600" id="rate-label">Your rating</p>
    ${rating}
    <p class="t-small c-700 ${ID}__word" id="rate-word" aria-live="polite">${esc(STAR_WORDS[0])}</p>
    <p class="t-small c-600 ${ID}__hint">Tap a star to rate. Reviews show on ${esc(first)}’s profile.</p>
  </section>
  <h2 class="t-h2 ${ID}__h2">Receipt</h2>
  ${receiptBlock(a, first)}
</main>
${actionBar({ ctaLabel: 'Leave a review', ctaAct: 'leave-review', secondaryLabel: 'Done', secondaryAct: 'done', tertiaryLabel: `Message ${esc(first)}`, tertiaryAct: 'message' })}`;
}

function wire(root) {
  const a = focusAppt(ID);
  const backBtn = root.querySelector('.back[data-act="back"]');
  if (backBtn) {
    backBtn.dataset.wired = '1';
    backBtn.addEventListener('click', () => go(state.ui.from === 'account' ? 'c-orders' : 'c-bookings'));
  }
  wireStars(root);

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
    if (act === 'message') { if (a) setFocus(a.id, { keepFrom: true }); go('c-thread'); }
    else if (act === 'leave-review' && a) { setFocus(a.id, { keepFrom: true }); state.ui['c-review'] = { apptId: a.id }; go('c-review'); }
    else if (act === 'done') go(state.ui.from === 'account' ? 'c-orders' : 'c-bookings', { fresh: true });
  });
}

register(ID, view, wire);
