/* ============================================================
   c-complete — C11 order completed: the receipt and a review prompt.
   Focal: the review card's five stars. A completed order Sarah has not
   reviewed lands here (statusScreen); a reviewed one lands on c-booking.
   Tapping a star carries the rating into c-review (D-107).
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, tailorById } from '../state.js';
import {
  chrome, headingRow, statusHero, metaRow, customerBreakdown, actionBar, emptyState, stars, wireStars, esc,
} from '../components.js';
import { fmtDay } from '../dates.js';
import { RETURN_LABEL } from '../data.js';
import { focusAppt, setFocus } from '../focus.js';

const ID = 'c-complete';

const firstOf = (t) => (t?.name || 'The tailor').split(' ')[0];
const completedAt = (a) => [...a.history].reverse().find((h) => h.status === 'completed')?.at ?? a.requestedAt;
const RETURN_ICON = { pickup: 'bag', dropoff: 'home', courier: 'truck' };

function cardLabel(a) {
  const c = state.customer.cards.find((x) => x.id === a.balanceCardId);
  if (c) return `${c.brand} •••• ${c.last4}`;
  return a.balanceCardId === 'apple-pay' ? 'Apple Pay' : 'your card';
}

function view() {
  const a = focusAppt(ID);
  if (!a) {
    return `${chrome('bookings')}<main class="body ${ID}" data-s="${ID}">
  <div class="${ID}__empty" data-empty="no-booking">${emptyState({
    title: 'Nothing to review', body: 'Completed orders show up in Bookings.', ctaLabel: 'Go to Bookings', ctaAct: 'done',
  })}</div>
</main>`;
  }
  const t = tailorById(a.tailorId) ?? state.tailors[0];
  const first = firstOf(t);
  const how = a.returnOption ?? 'pickup';
  /* the star group is labelled by the question above it (aria-labelledby), not the generic "Your rating" */
  const rating = stars({ input: true, name: 'rate', value: 0 }).replace('aria-label="Your rating"', 'aria-labelledby="rate-label"');
  return `${chrome('bookings')}<main class="body body--with-bar ${ID}" data-s="${ID}">
  ${headingRow(statusHero({ pill: 'completed', title: 'All done', body: `${esc(first)} marked your order completed. Thanks for booking with Taily.` }), { backRow: true })}
  <section class="${ID}__rate" aria-labelledby="rate-label">
    <h2 class="t-h2" id="rate-label">How did ${esc(first)} do?</h2>
    ${rating}
    <p class="t-small c-600">Tap a star to rate. Reviews show on ${esc(first)}’s profile.</p>
  </section>
  <h2 class="t-h2 ${ID}__h2">Receipt</h2>
  <div class="${ID}__how">${metaRow('', esc(`${RETURN_LABEL[how]} · ${fmtDay(completedAt(a))}`), { icon: RETURN_ICON[how] })}</div>
  ${customerBreakdown(a.money, { stage: 'paid', tailorFirst: first, depositState: a.payments.deposit.state, confirmed: true })}
  <p class="t-small c-600 ${ID}__card">Balance paid with ${esc(cardLabel(a))}.</p>
</main>
${actionBar({ ctaLabel: 'Leave a review', ctaAct: 'leave-review', secondaryLabel: 'Done', secondaryAct: 'done' })}`;
}

function wire(root) {
  const a = focusAppt(ID);
  const backBtn = root.querySelector('.back[data-act="back"]');
  if (backBtn) {
    backBtn.dataset.wired = '1';
    backBtn.addEventListener('click', () => go('c-bookings'));
  }
  wireStars(root);

  /* a star tap is the start of the review: carry the rating over (D-107) */
  root.addEventListener('change', (e) => {
    const input = e.target.closest('input[name="rate"]');
    if (!input || !a) return;
    setFocus(a.id);
    state.ui['c-review'] = { apptId: a.id, stars: Number(input.value) };
    go('c-review');
  });
  root.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act || e.target.closest('.screen-sheet--overlay')) return;
    if (act === 'leave-review' && a) { setFocus(a.id); state.ui['c-review'] = { apptId: a.id }; go('c-review'); }
    else if (act === 'done') go('c-bookings', { fresh: true });
  });
}

register(ID, view, wire);
