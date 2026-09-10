/* ============================================================
   T03B - Job Cancelled — Figma 449:752.
   Error-red serif hero + body, Back to Home / View Calendar.
   Reached when a confirmed visit is called off. Active=T-Calendar.
   UX-LOOP R2-T-05/06: live copy from the tapped job and the way it
   ended — Sarah cancelled ("…your ${when} slot is open on your
   calendar again"; the seed / deep link keeps the frame's "tonight's
   7:00 PM"), Sarah withdrew a request Marco never accepted
   ("Request withdrawn."), Marco couldn't make it ("You cancelled this
   job."), Sarah didn't show ("Sarah didn't show.").
   Round 3 (R3-T-05): a confirmed booking's deposit was PAID, so Marco
   cancelling refunds it ("her $20 deposit is refunded") and a no-show
   charges no fee; "hold released" wording stays only for requests
   Marco never accepted. R3-T-06: View Calendar behaves like the
   Calendar tab (the soonest job still on the calendar).
   Round 7 (Kevin's money model v2): the visitation fee is Taily's and
   its amount is never shown here. A tailor cancel always refunds it
   ("her visitation fee is refunded"); a no-show keeps it with Taily
   only once Sarah confirmed the visit (`a.feeLocked`), else it is
   refunded; a customer cancel says nothing about the fee — it is
   between Sarah and Taily. The round-6 "deposit stays with you"
   wording is gone.
   ============================================================ */

import { register, render as go } from '../app.js';
import { statusHero, cta } from '../components.js';
import { tailorChrome, wireTailorNav, openCalendar, NO_SHOW_FEE } from '../tailor-components.js';
import { current, jobView, endedBy, isFixture, isSeed } from '../tailor-data.js';

const FRAME = { title: 'Job Cancelled.', body: 'Sarah cancelled this visit. The job is closed and tonight’s 7:00 PM slot is open on your calendar again.' };

/** Hero + body for the way this job ended. */
export function cancelCopy(a, { forced = false } = {}) {
  if (!a || (isFixture() && !forced)) return FRAME;
  const when = jobView(a).when;
  switch (endedBy(a)) {
    case 'withdrawn': return { title: 'Request withdrawn.', body: `Sarah withdrew her ${when} request before you accepted. Nothing to do.` };
    /* round 7: a tailor cancel always refunds Sarah's visitation fee (no amount) */
    case 'tailor': return { title: 'You cancelled this job.', body: `Sarah’s been notified and her visitation fee is refunded. Your ${when} slot is open again.` };
    case 'no-show': return { title: 'Sarah didn’t show.', body: `The job is closed and the slot is open again. ${NO_SHOW_FEE(a)}` };
    case 'expired': return { title: 'Request expired.', body: `No response in time — Sarah’s ${when} request lapsed. Nothing to do.` };
    default: {
      /* Sarah cancelled: the seed keeps the frame's "tonight" line;
         whatever happens to her fee is between her and Taily */
      const body = isSeed(a) ? FRAME.body : `Sarah cancelled this visit. The job is closed and your ${when} slot is open on your calendar again.`;
      return { title: FRAME.title, body };
    }
  }
}

/** Exported: a `forced` terminal job renders its own copy on the round-3
    frames "T03B - Job Cancelled / By You · No-Show · Withdrawn". */
export function viewJobCancelled(s, forced = null) {
  const { title, body } = forced ? cancelCopy(forced, { forced: true }) : cancelCopy(current(s));
  return `${tailorChrome('calendar')}
<div class="body" data-s="t03b-job-cancelled">
  ${statusHero({ pill: false, title, titleColor: 'error', body })}
  <div class="t-actions">
    ${cta('Back to Home', { attrs: 'data-act="home"' })}
    ${cta('View Calendar', { variant: 'secondary', attrs: 'data-act="calendar"' })}
  </div>
</div>`;
}

export function wire(root) {
  wireTailorNav(root);
  root.querySelector('[data-act="home"]')?.addEventListener('click', () => go('t01-home'));
  root.querySelector('[data-act="calendar"]')?.addEventListener('click', () => openCalendar());
}

register('t03b-job-cancelled', viewJobCancelled, wire);
