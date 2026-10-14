/* ============================================================
   to-done — "You’re bookable" (M2-spec §C3). The payoff: she is
   live, sees herself the way a customer does (the customer's own
   tailor row, inert), and knows what happens next.
   Focal: the customer preview of her tailor row.
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, tailorsFor, eligible } from '../state.js';
import { myTailor, MY_TAILOR_ID } from '../tailor-data.js';
import { ZIP_INFO, VISIT_LABEL, CUSTOMER } from '../data.js';
import { POLICY } from '../money-config.js';
import { statusBar, customerPreview, tailorRow, miniProfile, actionBar, garmentIcon, sectionHead } from '../components.js';

const ID = 'to-done';

/** Her row exactly as `tailorsFor(state.job)` gives it to a customer (D-65); null when the demo job doesn't fit her area / hours. */
function previewRow() {
  const job = state.job;
  const r = tailorsFor(job).rows.find((x) => x.tailor.id === MY_TAILOR_ID);
  if (!r) return null;
  return tailorRow({
    id: r.tailor.id, name: r.tailor.name, initials: r.tailor.initials, photo: r.tailor.photo, verified: r.tailor.verified,
    rating: r.tailor.rating?.count > 0 ? r.tailor.rating : null, distanceMi: r.distanceMi, quote: r.quote,
    nextOpening: r.nextOpening, visitType: job.visitType,
  });
}

/** No row → why the demo customer's sample job doesn't reach her, in words (D-65 / R2-2-T-02). */
function whyNotShown(t, job) {
  const who = `${CUSTOMER.first}’s sample job`;
  const { reason } = eligible(t, job);
  const first = {
    zip: job.visitType === 'home'
      ? `${who} is a home visit in ${job.zip}, so you won’t show up for it.`
      : `${who} is a shop visit from ${job.zip}, too far from your shop, so you won’t show up for it.`,
    'shop-off': `${who} is a shop visit, and you don’t have a shop, so you won’t show up for it.`,
    'nothing-open': `${who} needs a visit before her need-by date, and you have no opening by then, so you won’t show up for it.`,
  }[reason] ?? `You won’t show up for ${who}.`;
  return `${first} Customers in your area who pick services you price will see your estimate.`;
}

const STEPS = [
  'A customer sends a request with their garments and a time.',
  'Accept, suggest another time, or decline.',
  'At the fitting, send the final order. You start once the customer approves.',
];

/** "suit pant and suit jacket" / "a, b and c" — names in running text, no "·" chain (M7). */
const nameList = (types) => {
  const n = types.map((x) => x.toLowerCase());
  return n.length < 3 ? n.join(' and ') : `${n.slice(0, -1).join(', ')} and ${n.at(-1)}`;
};
const lowerFirst = (x) => x.charAt(0).toLowerCase() + x.slice(1);

function view(s) {
  const t = myTailor();
  const job = s.job;
  const row = previewRow();
  const hood = ZIP_INFO[job.zip]?.hood ?? 'Brooklyn';
  const caption = row
    ? `Example: ${nameList(job.garments.map((g) => g.type))}, ${lowerFirst(VISIT_LABEL.tailor[job.visitType])}`
    : whyNotShown(t, job);
  /* a row → "How a customer in <hood> sees you"; no row → that customer wouldn't see her at all, so the neutral title (as t-shop) */
  const title = row ? `How a customer in ${hood} sees you` : 'What customers will see';
  const mini = miniProfile({ name: t.name, initials: t.initials, photo: t.photo, shopName: t.shopName, bio: t.bio ?? '' });
  const hours = POLICY.REQUEST_EXPIRY_H;
  return `${statusBar()}
<main class="body body--with-bar ${ID}">
  <span class="${ID}__art" aria-hidden="true">${garmentIcon('Suit Jacket', { size: 'hero' })}</span>
  <h1 class="t-display ${ID}__title">You’re bookable</h1>
  <p class="t-body c-600 ${ID}__lead">Customers near you can book you now. You have ${hours} hour${hours === 1 ? '' : 's'} to reply to each request.</p>
  <div class="${ID}__preview">${customerPreview({ title, html: row ?? mini, caption })}</div>
  <section class="sec" aria-labelledby="${ID}-next-h">
    ${sectionHead('What happens next', { id: `${ID}-next-h` })}
    <ol class="${ID}__steps">${STEPS.map((txt, i) => `<li class="${ID}__step"><span class="${ID}__num t-small w-600" aria-hidden="true">${i + 1}</span><span class="t-body">${txt}</span></li>`).join('')}</ol>
  </section>
  <p class="t-small c-600 ${ID}__rush">Want extra for rush jobs? <button type="button" class="${ID}__link" data-act="rush" data-hit="inline">Add rush fees</button> in your shop.</p>
</main>
${actionBar({ ctaLabel: 'Go to my shop', ctaAct: 'shop', secondaryLabel: 'See my profile as a customer', secondaryAct: 'as-customer' })}`;
}

function wire(root) {
  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    if (a.dataset.act === 'rush') go('t-rush');
    else if (a.dataset.act === 'shop') {
      /* D-139: first launch — the soft notification ask shows on Home (t-home), where requests will arrive */
      if (state.sim.push === 'default') state.sim.push = 'prompt';
      go('t-shop', { fresh: true });
    }
    else if (a.dataset.act === 'as-customer') {
      state.ui.booking = { ...state.ui.booking, from: undefined, tailorId: MY_TAILOR_ID };   // persona flips to customer on c-tailor (D-65)
      state.ui['c-tailor'] = { ...state.ui['c-tailor'], preview: true };
      go('c-tailor');
    }
  });
}

register(ID, view, wire);
