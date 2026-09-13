/* ============================================================
   08C - Journey Complete (Leave Review) — Figma 584:9430 (Leave
   Review / Sheet 582:2266). 08 dimmed under an ink@45% scrim + n50
   review card at y291: grabber, serif-28 title, sub, five 30px
   stars (5 filled — round 12, Kevin: the default is five), bordered
   text input, Confirm Review. Opened from 08's Leave a Review (and
   09's Leave Review, R1-U-14).
   LIVE: stars select a 1–5 rating, the input is a real textarea, and
   Confirm stores { rating, text } on the appointment. Round 12
   (Kevin): Confirm turns the sheet into "Review Submitted" (check +
   title, nothing else) which dismisses itself after 2 s or on the
   first tap anywhere. Sibling frame "06.1 - Leave Review / Submitted"
   → route 06.1-leave-review-submitted. The route render keeps the
   frame's fixture (5 stars, typed review text, "2 items · Jul 17").
   ============================================================ */

import { register, render as go } from '../app.js';
import { cta, modalOverlay, toast } from '../components.js';
import { itemsLabel, itemCount, fmtDay } from '../data.js';
import { apptEntry } from '../state.js';
import { viewComplete } from './06-journey-complete.js';

const FIXTURE_REVIEW = 'The sleeves came out perfectly — quick, friendly, and right on time.';

function stars(rating) {
  return Array.from({ length: 5 }, (_, i) =>
    `<button type="button" class="${i < rating ? 'is-filled' : ''}" data-star="${i + 1}" aria-label="${i + 1} star${i ? 's' : ''}">${i < rating ? '★' : '☆'}</button>`).join('\n    ');
}

export const SUBMITTED_MS = 2000;

/** The sheet after Confirm (round 12): success check + title only. */
export function submittedHtml() {
  return `<div class="review-sheet review-sheet--submitted" role="status" aria-live="polite" data-submitted>
  <span class="review-sheet__grabber" aria-hidden="true"></span>
  <div class="review-sheet__head review-sheet__head--center">
    <h2 class="review-sheet__title">Review Submitted</h2>
    <span class="review-sheet__check" aria-hidden="true">✓</span>
  </div>
</div>`;
}

function sheetHtml({ rating = 5, sub = 'Marco Tailor · 2 items · Jul 17', live = false } = {}) {
  return `<div class="review-sheet" role="dialog" aria-label="Leave a review">
  <span class="review-sheet__grabber" aria-hidden="true"></span>
  <div class="review-sheet__head">
    <h2 class="review-sheet__title">Please rate your experience.</h2>
    <p class="review-sheet__sub">${sub}</p>
  </div>
  <div class="review-sheet__stars" data-stars>
    ${stars(rating)}
  </div>
  ${live
    ? `<textarea class="review-sheet__input" data-review placeholder="How did it go?"></textarea>`
    : `<div class="review-sheet__input"><p class="review-sheet__fixture">${FIXTURE_REVIEW}</p></div>`}
  ${cta('Confirm Review', { attrs: 'data-act="confirm-review"' })}
</div>`;
}

function wireStars(root) {
  const row = root.querySelector('[data-stars]');
  row?.querySelectorAll('[data-star]').forEach((b) => b.addEventListener('click', () => {
    const rating = Number(b.dataset.star);
    row.innerHTML = stars(rating);
    wireStars(root);   // re-wire the re-rendered row
  }));
}

function wireSheet(root, close, onConfirm) {
  wireStars(root);
  root.querySelector('[data-act="confirm-review"]')?.addEventListener('click', () => {
    onConfirm?.({
      rating: root.querySelectorAll('[data-star].is-filled').length,
      text: root.querySelector('[data-review]')?.value?.trim() ?? '',
    });
    /* round 12 (Kevin): the sheet becomes "Review Submitted" and goes
       away by itself after 2 s — or on the first tap anywhere */
    const sheet = root.querySelector('.review-sheet');
    if (!sheet) { close?.(); return; }
    sheet.outerHTML = submittedHtml();
    let done = false;
    const finish = () => { if (done) return; done = true; clearTimeout(timer); close?.(); };
    const timer = setTimeout(finish, SUBMITTED_MS);
    /* listen after the confirming tap has finished bubbling */
    setTimeout(() => root.addEventListener('click', finish, { once: true }), 0);
  });
}

/** One name for the sheet, its toast and the "already reviewed" toast
    (UX-LOOP R2-U-10: the seed past bookings display `displayName`). */
export const tailorName = (a) => a?.displayName ?? a?.name ?? 'Marco Tailor';

/** Open over the live 08 / 09 for the appointment currentAppt points at. */
export function openLeaveReview() {
  const a = apptEntry() ?? {};
  /* R2-U-10: no fulfilment on file → the appointment's own day */
  const handoff = fmtDay(a.deliveredAt ?? a.fulfilment?.date ?? a.when, 'Jul 17');
  modalOverlay(sheetHtml({ sub: `${tailorName(a)} · ${itemsLabel(itemCount(a) || 2, 'item')} · ${handoff}`, live: true }),
    { dataS: '06.1-leave-review' }, (root, close) => wireSheet(root, close, (review) => { a.review = review; }));
}

/* Route registration keeps the frame-verbatim render for the diff
   harness: 08 as backdrop, scrim, fixture sheet. */
function renderScreen(s) {
  return `<div class="screen-sheet" data-s="06.1-leave-review">
  <div class="sheet-backdrop" aria-hidden="true">${viewComplete(s)}</div>
  <div class="modal-scrim"></div>
  ${sheetHtml()}
</div>`;
}

function wire(root) {
  wireSheet(root, () => go('06-journey-complete'));
}

register('06.1-leave-review', renderScreen, wire);

/* Round 12: the sibling frame's fixture — 06 as backdrop, scrim, the
   submitted sheet (a tap anywhere returns to 06 like the live one). */
export function renderSubmitted(s) {
  return `<div class="screen-sheet" data-s="06.1-leave-review-submitted">
  <div class="sheet-backdrop" aria-hidden="true">${viewComplete(s)}</div>
  <div class="modal-scrim"></div>
  ${submittedHtml()}
</div>`;
}
register('06.1-leave-review-submitted', renderSubmitted, (root) => {
  root.addEventListener('click', () => go('06-journey-complete'), { once: true });
});
