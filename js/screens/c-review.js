/* ============================================================
   c-review — stars (required), optional text, up to 3 photos, then
   the posted review (c-review--submitted). Focal: the star rating.
   Which appointment: state.ui['c-review'].apptId (set by c-complete),
   else the focused one, else the newest completed order of Sarah's.
   Screen-local: state.ui['c-review'] { apptId, stars, text, photos
   (a count), tried, busy, error, focus }.
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, T, tailorById, apptsFor } from '../state.js';
import {
  chrome, headingRow, statusHero, stars, textArea, photoStub, actionBar, emptyState, cta, ratingLine, reviewRow,
  textLink, wireStars, toast, esc,
} from '../components.js';
import { REVIEW_LIMITS, STAR_WORDS } from '../data.js';
import { withLatency } from '../sim.js';
import { setFocus, bookingTab } from '../focus.js';

const ID = 'c-review';

const ui = () => (state.ui[ID] ??= {});
const firstOf = (t) => (t?.name || 'The tailor').split(' ')[0];
const lastAt = (a) => a.history[a.history.length - 1]?.at ?? '';
const onScreen = () => document.getElementById('screen')?.dataset.screen === ID;
let cancelWait = null;

/** The completed order being reviewed (customer's own), or null. */
function target() {
  const mine = apptsFor('customer').filter((a) => a.status === 'completed');
  const pick = (id) => (id ? mine.find((a) => a.id === id) : null);
  return pick(ui().apptId) ?? pick(state.ui.apptId) ?? [...mine].sort((x, y) => String(lastAt(y)).localeCompare(String(lastAt(x))))[0] ?? null;
}

const CAMERA = '<svg class="c-review__camera" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.2"/></svg>';
const CLOSE = '<svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8"/></svg>';

function photoRow(d, type = '') {
  const n = d.photos || 0;
  const max = REVIEW_LIMITS.PHOTOS_MAX;
  const tiles = Array.from({ length: n }, (_, i) => `<span class="c-review__photo">${photoStub({ type, tone: i, size: 'fill', seed: i })}<button type="button" class="c-review__remove" data-act="remove-photo" aria-label="Remove photo ${i + 1} of ${n}"><span class="c-review__x" aria-hidden="true">${CLOSE}</span></button></span>`).join('');
  const add = n < max ? `<button type="button" class="c-review__add" data-act="add-photo" aria-label="Add a photo">${CAMERA}</button>` : '';
  const note = n >= max ? `You’ve added ${max} photos, the most a review can have.` : `Up to ${max} photos.`;
  return `<div class="c-review__photos" role="group" aria-labelledby="photos-label">${tiles}${add}</div>
  <p class="t-small c-600 c-review__photonote" id="photos-note" aria-live="polite">${note}</p>`;
}

function formView(a, t, first) {
  const d = ui();
  const tried = !!d.tried;
  const noStars = tried && !d.stars;
  const rating = stars({ input: true, name: 'stars', value: d.stars || 0 })
    .replace('aria-label="Your rating"', `aria-labelledby="stars-label"${noStars ? ' aria-describedby="stars-error" aria-invalid="true"' : ''}`);
  const busy = !!d.busy;
  return `${chrome(bookingTab())}<main class="body body--with-bar ${ID}" data-s="${ID}"${busy ? ' aria-busy="true"' : ''}>
  ${headingRow(`<h1 class="t-title">Review ${esc(first)}</h1><!--notes--><p class="t-body c-700">Shown on ${esc(first)}’s profile as ${esc(state.customer.first)} ${esc(state.customer.last[0])}.</p><!--/notes-->`, { backRow: true })}
  <section class="${ID}__rating">
    <p class="t-body w-600" id="stars-label">Your rating</p>
    ${rating}
    <p class="t-small c-700 ${ID}__word" id="stars-word" aria-live="polite">${esc(STAR_WORDS[d.stars || 0] || '')}</p>
    ${noStars ? `<p class="t-small ${ID}__error" id="stars-error" role="alert">Choose a star rating.</p>` : ''}
  </section>
  <div class="${ID}__text">${textArea({
    id: 'review-text', label: 'Tell others about it (optional)', value: d.text ?? '', rows: 5, max: REVIEW_LIMITS.TEXT_MAX,
    helper: 'Phone numbers and emails are hidden.',
    error: d.error === 'text-long' ? `Keep it under ${REVIEW_LIMITS.TEXT_MAX} characters.` : '',
  })}</div>
  <section class="${ID}__photosec">
    <p class="t-body w-600" id="photos-label">Photos (optional)</p>
    ${photoRow(d, a.job.garments[0]?.type ?? '')}
  </section>
</main>
${actionBar({ ctaLabel: 'Post review', ctaAct: 'post', busy, busyLabel: 'Posting…' })}`;
}

function submittedView(a, t, first) {
  const mine = a.review;
  const me = `${state.customer.first} ${state.customer.last[0]}.`;
  return `${chrome(bookingTab())}<main class="body ${ID} ${ID}--submitted" data-s="${ID}">
  ${headingRow(statusHero({ pill: 'completed', pillLabel: 'Posted', title: `Thanks, ${esc(state.customer.first)}`, body: `Your review is now on ${esc(first)}’s profile.` }), { backRow: true })}
  <section class="sec sec--first ${ID}__posted">
    ${ratingLine(t.rating)}
    ${reviewRow({ name: me, initials: state.customer.initials, stars: mine.stars, date: mine.date, text: mine.text, photos: mine.photos, photoType: a.job.garments[0]?.type ?? '' })}
  </section>
  <div class="page-actions">
    ${cta(`See ${esc(first)}’s profile`, { attrs: 'data-act="see-profile"' })}
    <div class="page-actions__links">${textLink('Back to Bookings', { act: 'bookings' })}</div>
  </div>
</main>`;
}

function view() {
  const a = target();
  if (!a) {
    return `${chrome(bookingTab())}<main class="body ${ID}" data-s="${ID}">
  <div class="${ID}__empty" data-empty="no-booking">${emptyState({
    title: 'Nothing to review yet', body: 'Once a tailor completes your order, you can review it here.', ctaLabel: 'Go to Bookings', ctaAct: 'bookings', art: 'Skirt',
  })}</div>
</main>`;
  }
  const t = tailorById(a.tailorId) ?? state.tailors[0];
  const first = firstOf(t);
  return a.review ? submittedView(a, t, first) : formView(a, t, first);
}

/* ---------- actions ---------- */

function post(a, first) {
  const d = ui();
  if (d.busy) return;
  d.tried = true;
  if (!d.stars) { d.focus = 'stars'; go(ID); return; }
  if ([...(d.text ?? '')].length > REVIEW_LIMITS.TEXT_MAX) { d.error = 'text-long'; d.focus = 'text'; go(ID); return; }
  d.error = null; d.busy = true;
  go(ID);
  cancelWait?.();
  cancelWait = withLatency(() => {
    if (!onScreen()) { d.busy = false; return; }
    const res = T.leaveReview(a.id, { stars: d.stars, text: d.text ?? '', photos: d.photos || 0 });
    d.busy = false;
    if (res.ok) {
      go(ID);
      toast(`Thanks. Your review is on ${first}’s profile.`, { tone: 'success' });
    } else {
      if (res.error === 'text-long') { d.error = 'text-long'; d.focus = 'text'; } else if (res.error === 'stars-required') d.focus = 'stars';
      go(ID);
      if (res.error !== 'text-long' && res.error !== 'stars-required') toast('Couldn’t post your review. Try again.', { tone: 'error' });
    }
  });
}

/* ---------- wire ---------- */

function wire(root) {
  const a = target();
  const t = a ? tailorById(a.tailorId) ?? state.tailors[0] : null;
  const first = firstOf(t);
  const d = ui();

  const backBtn = root.querySelector('.back[data-act="back"]');
  if (backBtn) {
    backBtn.dataset.wired = '1';
    backBtn.addEventListener('click', () => {
      if (d.busy) return;
      if (a) setFocus(a.id, { keepFrom: true });
      go(a?.review ? 'c-bookings' : 'c-complete');
    });
    if (d.busy) { backBtn.disabled = true; backBtn.setAttribute('aria-disabled', 'true'); }
  }
  if (!a || a.review) {
    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'bookings') go('c-bookings', { fresh: true });
      else if (act === 'see-profile' && a) { state.ui.booking = { tailorId: t.id, from: 'review' }; go('c-tailor'); }
    });
    return;
  }

  wireStars(root);
  if (d.busy) root.querySelectorAll('input, textarea, [data-act="add-photo"], [data-act="remove-photo"]').forEach((el) => { el.disabled = true; });

  const text = root.querySelector('#review-text');
  text.addEventListener('input', () => {
    d.text = text.value;
    const n = [...text.value].length;
    const c = root.querySelector('[data-count]');
    c.textContent = `${n} / ${REVIEW_LIMITS.TEXT_MAX}`;
    c.classList.toggle('text-area__count--over', n > REVIEW_LIMITS.TEXT_MAX);
    if (d.error && n <= REVIEW_LIMITS.TEXT_MAX) {          // fixed: drop the error in place (the caret stays)
      d.error = null;
      const field = text.closest('.field');
      field.classList.remove('field--error');
      text.removeAttribute('aria-invalid');
      const msg = field.querySelector('.field__msg');
      if (msg) { msg.classList.remove('field__msg--error'); msg.removeAttribute('role'); msg.textContent = 'Phone numbers and emails are hidden.'; }
    }
  });

  root.addEventListener('change', (e) => {
    const input = e.target.closest('input[name="stars"]');
    if (!input) return;
    d.stars = Number(input.value);
    root.querySelector('#stars-word').textContent = STAR_WORDS[d.stars];
    root.querySelector('#stars-error')?.remove();            // the error lived next to the stars: it goes with the fix
    root.querySelector('[data-stars]').removeAttribute('aria-describedby');
    root.querySelector('[data-stars]').removeAttribute('aria-invalid');
  });

  root.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act || d.busy || e.target.closest('.screen-sheet--overlay')) return;
    if (act === 'post') post(a, first);
    else if (act === 'add-photo') {
      if ((d.photos || 0) < REVIEW_LIMITS.PHOTOS_MAX) d.photos = (d.photos || 0) + 1;
      d.focus = (d.photos || 0) >= REVIEW_LIMITS.PHOTOS_MAX ? 'remove' : 'add';
      go(ID);
    } else if (act === 'remove-photo') {
      d.photos = Math.max(0, (d.photos || 0) - 1);
      d.focus = 'add';
      go(ID);
    }
  });

  if (d.focus) {
    const where = d.focus;
    d.focus = null;
    const el = where === 'stars' ? (root.querySelector('input[name="stars"]:checked') ?? root.querySelector('input[name="stars"]'))
      : where === 'text' ? text
        : where === 'add' ? (root.querySelector('[data-act="add-photo"]') ?? root.querySelector('[data-act="remove-photo"]'))
          : root.querySelector('[data-act="remove-photo"]');
    el?.focus();
  }
}

register(ID, view, wire);
