/* ============================================================
   c-complete — C11 order completed: the receipt and a review prompt.
   Focal: the review card's five stars. A completed order Sarah has not
   reviewed lands here (statusScreen); a reviewed one lands on c-booking.
   Tapping a star carries the rating into c-review (D-107).
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, tailorById, priceChangeView } from '../state.js';
import {
  chrome, headingRow, statusHero, receiptBlock, wirePhotoViewer, wireGarmentDocs, actionBar, emptyState, stars, wireStars, esc, sectionHead, garmentStrip,
} from '../components.js';
import { STAR_WORDS } from '../data.js';
import { focusAppt, setFocus, bookingTab } from '../focus.js';

const ID = 'c-complete';

/** How a review names Sarah on Amara’s profile: first name and last initial. */
const customerShort = () => `${state.customer.first} ${(state.customer.last ?? '').charAt(0)}.`.replace(/ \.$/, '');
const firstOf = (t) => (t?.name || 'The tailor').split(' ')[0];


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
  /* M7-1-A-06: the heading is the group's visible label; a star tap carries the rating into c-review (D-107) */
  /* CR-3: what came back, under the hero (count from the approved lines once they exist, as c-booking does) */
  const types = a.lines?.length ? [...new Map(a.lines.map((l) => [l.garmentId, l.garmentType])).values()] : a.job.garments.map((g) => g.type);
  const rating = stars({ input: true, name: 'rate', value: 0 }).replace('aria-label="Your rating"', 'aria-labelledby="rate-label"');
  return `${chrome(bookingTab())}<main class="body body--with-bar ${ID}" data-s="${ID}">
  <div class="ambient" aria-hidden="true"></div>
  ${headingRow(statusHero({ pill: 'completed', title: 'All done', body: `${esc(first)} marked your order completed. Thanks for booking with Taily.` }))}
  <section class="sec sec--first ${ID}__order">${garmentStrip(types, `${types.length} ${types.length === 1 ? 'item' : 'items'} · back with you`)}</section>
  <section class="sec card ${ID}__rate">
    <h2 class="t-body w-600 c-ink" id="rate-label">How did ${esc(first)} do?</h2>
    ${rating}
    <p class="t-small c-text ${ID}__word" id="rate-word" aria-live="polite">${esc(STAR_WORDS[0])}</p>
    <p class="t-small c-muted ${ID}__hint">Tap a star to rate. Reviews show on ${esc(first)}’s profile as ${esc(customerShort())}${customerShort().endsWith('.') ? '' : '.'}</p>
  </section>
  <section class="sec">${sectionHead('Receipt')}
  ${receiptBlock(a, first)}</section>
</main>
${actionBar({ secondaryLabel: `Message ${esc(first)}`, secondaryAct: 'message' })}`;
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
    if (act === 'message') { if (a) setFocus(a.id, { keepFrom: true }); go('c-thread'); }
    else if (act === 'done') go(state.ui.from === 'account' ? 'c-orders' : 'c-bookings', { fresh: true });
  });
}

register(ID, view, wire);
