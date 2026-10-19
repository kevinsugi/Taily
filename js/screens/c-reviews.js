/* ============================================================
   c-reviews — all of a tailor's reviews (S-26, pre-MVP B2; D-377). "See all 37 reviews" on c-tailor used to toast "Not built
   yet". The average and the count, whose reviews these are ("From customers who booked through Taily.", P-21 / FTC review
   provenance), every written review newest first through reviewRow, then how many left stars without words.
   No hiding or sorting by stars (COUNSEL #11: a neutral list). Back returns to the profile.
   Screen-local UI: state.ui['c-reviews'] = { tailorId }.
   ============================================================ */
import { register } from '../app.js';
import { state, tailorById } from '../state.js';
import { statusBar, headingRow, reviewRow, stars, esc } from '../components.js';

const ID = 'c-reviews';
const firstOf = (t) => (t?.name || 'The tailor').split(' ')[0];

function view(s) {
  const t = tailorById(s.ui[ID]?.tailorId ?? s.ui.booking?.tailorId ?? s.tailors[0].id) ?? s.tailors[0];
  const count = t.rating?.count ?? 0;
  const avg = Number(t.rating?.avg ?? 0);
  const list = [...(t.reviews ?? [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const silent = Math.max(0, count - list.length);
  const rows = list.map((r) => reviewRow({ name: r.name, initials: r.initials, stars: r.stars, date: r.date, text: r.text, photos: r.photos, photoType: r.photoType })).join('');
  return `${statusBar()}<main class="body ${ID}" data-s="${ID}">
  ${headingRow(`<h1 class="t-title">${esc(firstOf(t))}’s reviews</h1>`)}
  <section class="sec sec--first ${ID}__sum" aria-label="Rating">
    <p class="${ID}__avg"><span class="t-figure tabular">${avg.toFixed(1)}</span>${stars({ value: Math.round(avg) })}</p>
    <p class="t-body c-700 ${ID}__count">${count} ${count === 1 ? 'rating' : 'ratings'} · ${list.length} written ${list.length === 1 ? 'review' : 'reviews'}</p>
    <p class="t-small c-600 ${ID}__note">From customers who booked through Taily. Newest first.</p>
  </section>
  <section class="sec ${ID}__list" aria-label="Reviews">${rows || '<p class="t-body c-600">No written reviews yet.</p>'}</section>
  ${silent ? `<p class="t-small c-600 ${ID}__silent">${silent} more ${silent === 1 ? 'customer' : 'customers'} left a star rating without a written review.</p>` : ''}
</main>`;
}

register(ID, view);
