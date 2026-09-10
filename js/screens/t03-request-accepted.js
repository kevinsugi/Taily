/* ============================================================
   T03 - Request Accepted — Figma 449:714.
   "Booking Confirmed!" hero, the same order summary as T02,
   Back to Home / Message Sarah. Active=T-Home.

   UX-LOOP R1-T-05: this screen is ALSO the pre-visit view of a
   confirmed job (T01 card / Calendar tab / back from T04): back
   chevron + "Upcoming visit" header with the live date and address,
   the same summary, Start Appointment (→ T04) / Message Sarah.
   "Booking Confirmed!" renders only right after Accept (and on the
   harness deep link, which keeps the frame).
   Round 2: renders the tapped job (R2-T-01); the pre-visit view gains
   a tertiary "Can't make it" CTA → modal (I need to cancel / Sarah
   didn't show) → tailorCancels(a, reason) → T03B (R2-T-05).
   ============================================================ */

import { register, render as go, back } from '../app.js';
import { statusHero, summaryCard, cta, toast } from '../components.js';
import { state } from '../state.js';
import { tailorChrome, wireTailorNav, backHeader, payoutRows, openCantMakeIt } from '../tailor-components.js';
import { current, jobView, jobTarget, tailorOf, isFixture, T, CUSTOMER, CUSTOMER_ROWS } from '../tailor-data.js';
import { bookedCards } from './t02-appointment-request.js';

function renderScreen(s) {
  const a = current(s);
  const v = jobView(a);
  const fixture = isFixture();
  const accepted = fixture || tailorOf(a).justAccepted;
  const visit = a?.visit === 'Store Visit' ? 'Store visit' : 'Home visit';
  const head = accepted
    ? statusHero({ pill: false, title: 'Booking Confirmed!', body: 'We let Sarah know you’re coming and added the visit to your calendar.' })
    : backHeader('Upcoming visit', `${v.when} at ${v.address} · ${visit}`);
  const primary = accepted
    ? cta('Back to Home', { attrs: 'data-act="home"' })
    : v.canon === 'confirmed'
      ? cta('Start Appointment', { attrs: 'data-act="start"' })
      : cta('View Status', { attrs: 'data-act="status"' });
  /* R2-T-05: only the pre-visit view of a confirmed job can be called off */
  const tertiary = !accepted && v.canon === 'confirmed' ? cta('Can’t make it', { variant: 'secondary', attrs: 'data-act="cant-make-it"' }) : '';
  return `${tailorChrome('home')}
<div class="body" data-s="t03-request-accepted">
  ${head}
  <div class="summary">
    ${summaryCard({ initials: CUSTOMER.initials, name: CUSTOMER.name, rows: fixture ? CUSTOMER_ROWS : v.rows })}
    <div class="garments-card">
      ${bookedCards(v)}
      ${payoutRows(v)}
    </div>
  </div>
  <div class="t-actions">
    ${primary}
    ${cta('Message Sarah', { variant: 'secondary', attrs: 'data-act="message"' })}
    ${tertiary}
  </div>
</div>`;
}

function wire(root) {
  wireTailorNav(root);
  const a = current(state);
  tailorOf(a).justAccepted = false;   // the next visit to T03 is the pre-visit view
  root.querySelector('[data-act="home"]')?.addEventListener('click', () => go('t01-home'));
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => back() || go('t01-home'));
  root.querySelector('[data-act="start"]')?.addEventListener('click', () => go('t04-appointment-details'));
  root.querySelector('[data-act="status"]')?.addEventListener('click', () => go(jobTarget(current(state))));
  root.querySelector('[data-act="message"]')?.addEventListener('click', () => go('10-messages'));
  root.querySelector('[data-act="cant-make-it"]')?.addEventListener('click', () => openCantMakeIt((reason) => {
    const job = current(state);
    if (jobView(job).canon !== 'confirmed' || !T.cancel(job, reason)) { toast('This job is no longer on your calendar'); return; }
    toast(reason === 'no-show' ? 'Marked as a no-show — Sarah has been notified' : 'Job cancelled — Sarah has been notified');
    go('t03b-job-cancelled', { replace: true });
  }));
}

register('t03-request-accepted', renderScreen, wire);
