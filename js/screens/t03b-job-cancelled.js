/* ============================================================
   T03B - Job Cancelled — Figma 449:752.
   Error-red serif hero + body, Back to Home / View Calendar.
   Reached when the customer cancels a confirmed visit. Active=T-Calendar.
   ============================================================ */

import { register, render as go } from '../app.js';
import { statusHero, cta } from '../components.js';
import { tailorChrome, wireTailorNav } from '../tailor-components.js';

function renderScreen() {
  return `${tailorChrome('calendar')}
<div class="body" data-s="t03b-job-cancelled">
  ${statusHero({ pill: false, title: 'Job Cancelled.', titleColor: 'error', body: 'Sarah cancelled this visit. The job is closed and tonight’s 7:00 PM slot is open on your calendar again.' })}
  <div class="t-actions">
    ${cta('Back to Home', { attrs: 'data-act="home"' })}
    ${cta('View Calendar', { variant: 'secondary', attrs: 'data-act="calendar"' })}
  </div>
</div>`;
}

function wire(root) {
  wireTailorNav(root);
  root.querySelector('[data-act="home"]')?.addEventListener('click', () => go('t01-home'));
  root.querySelector('[data-act="calendar"]')?.addEventListener('click', () => go('t01-home'));
}

register('t03b-job-cancelled', renderScreen, wire);
