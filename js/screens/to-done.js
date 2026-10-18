/* ============================================================
   to-done — the end of onboarding (M2-spec §C3; DG-4 option B, K-48 / D-05: D-350…D-353). Three outcomes:
   · Submitted — every step set up, the four checks under review ("We review in 1 to 2 days"); her row as a customer will see
     it once she's verified, the checks, what happens next → Shop (where the checklist lives).
   · You're bookable — every check already passed (she is live).
   · You're on the waitlist — under TAILOR_LIMITS.YEARS_MIN years tailoring (D-18).
   Focal: the title + the customer preview of her tailor row.
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, waitlisted, verifyView, approvedPendingBackground } from '../state.js';
import { myTailor, MY_TAILOR_ID, tailorRowProps, ownRow, previewJob } from '../tailor-data.js';
import { ZIP_INFO, VISIT_LABEL, CUSTOMER, TAILOR_LIMITS, placeForZip } from '../data.js';
import { POLICY } from '../money-config.js';
import { statusBar, customerPreview, tailorRow, miniProfile, actionBar, garmentIcon, sectionHead, esc, verifyChecklist, REVIEW_TIME, checksLine, APPROVED_PENDING_LINE } from '../components.js';
import * as A from '../account.js';

const ID = 'to-done';

/** Her row as a customer with the demo job gets it (D-65) — built whether or not she is listed yet (D-359); null when it doesn't fit. */
function previewRow() {
  const job = previewJob();   // K-53 L (D-431): the sample items when the draft is empty
  const { row } = ownRow(job);
  return row ? tailorRow(tailorRowProps(row, job)) : null;
}

/** No row → why the demo customer's sample job doesn't reach her, in words (D-65 / R2-2-T-02). */
function whyNotShown(t, job) {
  const who = `${CUSTOMER.first}’s sample job`;
  const { reason } = ownRow(job);
  const first = {
    zip: job.visitType === 'home'
      ? `${who} is a home visit in ${job.zip}, so you won’t show up for it.`
      : `${who} is a shop visit from ${job.zip}, too far from your shop, so you won’t show up for it.`,
    'shop-off': `${who} is a shop visit, and you don’t have a shop, so you won’t show up for it.`,
    'nothing-open': `${who} needs a visit before her need-by date, and you have no opening by then, so you won’t show up for it.`,
    services: `${who} needs a service you don’t price, so you won’t show up for it.`,   // K-48.2 (D-354)
  }[reason] ?? `You won’t show up for ${who}.`;
  return `${first} Customers in your area see your estimate when you price every service their order needs.`;
}

/* DG-4: while the checks run */
const REVIEW_STEPS = [
  'We check your details. You can still edit your shop.',
  'You get a text when customers can book you.',
  `Customers near you send requests. You have ${POLICY.REQUEST_EXPIRY_H} hours to answer each one.`,
];
const STEPS = [
  'A customer sends a request with their garments and a time.',
  'Accept, suggest another time, or decline.',
  'At the fitting, photograph each item before and pinned, then send the final order. You start once the customer approves.',   // SF-30
  'You’re paid the Friday after the customer has her order.',
];

/** "suit pant and suit jacket" / "a, b and c" — names in running text, no "·" chain (M7). */
const nameList = (types) => {
  const n = types.map((x) => x.toLowerCase());
  return n.length < 3 ? n.join(' and ') : `${n.slice(0, -1).join(', ')} and ${n.at(-1)}`;
};
const lowerFirst = (x) => x.charAt(0).toLowerCase() + x.slice(1);

const stepsHtml = (list) => `<ol class="${ID}__steps">${list.map((txt, i) => `<li class="${ID}__step"><span class="${ID}__num t-small w-600" aria-hidden="true">${i + 1}</span><span class="t-body">${txt}</span></li>`).join('')}</ol>`;

/** D-18 (D-353): under the minimum — her profile is kept, nothing goes live. */
function waitlistView(t) {
  const phone = esc(A.formatPhone(t.phone));
  return `${statusBar()}
<main class="body body--with-bar ${ID} ${ID}--waitlist" data-outcome="waitlist">
  <span class="${ID}__art" aria-hidden="true">${garmentIcon('Accessories', { size: 'hero' })}</span>
  <h1 class="t-display ${ID}__title">You’re on the waitlist</h1>
  <p class="t-body c-600 ${ID}__lead">Taily tailors have at least ${TAILOR_LIMITS.YEARS_MIN} years of experience, and you told us ${t.years} ${Number(t.years) === 1 ? 'year' : 'years'}. We saved your profile and we’ll text ${phone} when we open to newer tailors.</p>
</main>
${actionBar({ ctaLabel: 'Done', ctaAct: 'sign-out', secondaryLabel: 'Change years tailoring', secondaryAct: 'years' })}`;
}

function view(s) {
  const t = myTailor();
  if (waitlisted(t) && !t.live) return waitlistView(t);
  const live = !!t.live;
  const v = verifyView(t);
  const row = previewRow();
  const job = previewJob(s.job);
  const hood = placeForZip(job.zip)?.hood || ZIP_INFO[job.zip]?.hood || 'Brooklyn';
  /* a row → "How a customer in <hood> sees you"; no row → that customer wouldn't see her at all, so the neutral title (as t-shop) */
  const title = !row ? 'What customers will see' : live ? `How a customer in ${hood} sees you` : `How a customer in ${hood} will see you`;
  /* B5 P3-9: the caps head says "Preview" ("Once you’re verified" while the checks run); the sentence title leads the caption */
  const caption = row
    ? `${title}. Example: ${nameList(job.garments.map((g) => g.type))}, ${lowerFirst(VISIT_LABEL.tailor[job.visitType])}`
    : whyNotShown(t, job);
  const mini = miniProfile({ name: t.name, initials: t.initials, photo: t.photo, shopName: t.shopName, bio: t.bio ?? '' });
  const hours = POLICY.REQUEST_EXPIRY_H;
  const phone = esc(A.formatPhone(t.phone));
  const needs = v.needsYou.length;
  const head = live
    ? `<h1 class="t-display ${ID}__title">You’re bookable</h1>
  <p class="t-body c-600 ${ID}__lead">Customers near you can book you now. We’ll text each new request to ${phone}. You have ${hours} hour${hours === 1 ? '' : 's'} to reply.</p>`
    : approvedPendingBackground(t)   /* K-53 Q8 (D-427): ID, years and payout passed — the background check (run last) is the one left */
      ? `<h1 class="t-display ${ID}__title">You’re approved</h1>
  <p class="t-body c-600 ${ID}__lead" data-approved>${APPROVED_PENDING_LINE} Most checks take ${REVIEW_TIME}. We’ll text ${phone} when customers can book you.</p>`
      : `<h1 class="t-display ${ID}__title">Submitted</h1>
  <p class="t-body c-600 ${ID}__lead">${needs
    ? `${needs === 1 ? 'One check needs' : `${needs} checks need`} you before we can finish the review. You’ll find ${needs === 1 ? 'it' : 'them'} in your shop.`
    : `We’re checking your ID and payout details first, then your background check. Most reviews take ${REVIEW_TIME}. We’ll text ${phone} when customers can book you.`}</p>`;
  const checks = live ? '' : `<section class="sec ${ID}__checks" aria-labelledby="${ID}-checks-h">
    ${sectionHead('Your checks', { id: `${ID}-checks-h`, aside: `<span class="t-small c-600 tabular">${esc(checksLine(t))}</span>` })}
    ${verifyChecklist(t, { interactive: false })}
  </section>`;
  return `${statusBar()}
<main class="body body--with-bar ${ID}" data-outcome="${live ? 'live' : 'submitted'}">
  <span class="${ID}__art" aria-hidden="true">${garmentIcon('Suit Jacket', { size: 'hero' })}</span>
  ${head}
  ${checks}
  <div class="${ID}__preview">${customerPreview({ title, head: live ? 'Preview' : 'Once you’re verified', html: row ?? mini, caption })}</div>
  <section class="sec" aria-labelledby="${ID}-next-h">
    ${sectionHead('What happens next', { id: `${ID}-next-h` })}
    ${stepsHtml(live ? STEPS : REVIEW_STEPS)}
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
    else if (a.dataset.act === 'sign-out') {
      state.ui['t-phone'] = { saved: true, phone: myTailor().phone };
      A.signOut('tailor');
      go('t-phone', { fresh: true });
    } else if (a.dataset.act === 'years') { state.ui['to-profile'] = { focus: '#years' }; go('to-profile'); }
    else if (a.dataset.act === 'shop') {
      /* K-43 (D-301): no notification ask — new requests are texted to her verified phone from now on */
      state.sim.texts = 'on';
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
