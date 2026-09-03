/* ============================================================
   09 - Bookings — Figma 277:2804.
   "Current Bookings" + upcoming cards, "Past Bookings" + completed
   cards. Sections stack at gap 12; Active=Bookings in the nav.
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, apptCard } from '../components.js';
import { state, openAppt } from '../state.js';
import { apptMeta, apptActions, apptTarget } from './01-home.js';
import { openReschedulePopup } from './r1-reschedule-popup.js';

/** The 09 frames title the lists slightly differently per card. */
function upcomingCard(a, i) {
  const isFirst = i === 0;
  return apptCard({
    status: a.status,
    month: a.month, day: a.day,
    name: a.displayName ?? a.name,
    meta: apptMeta(a),
    itemsTitle: isFirst ? `${a.count} Items Total:` : `${a.count} Items Total - ${a.visit}:`,
    items: a.itemLines ?? [],
    prepare: isFirst ? (a.bring ?? []) : [],
    actions: apptActions(a),
  });
}

function pastCard(a) {
  const c = a.displayCount ?? a.count;
  return apptCard({
    status: 'completed',
    month: a.month, day: a.day,
    name: a.displayName ?? a.name,
    meta: `Picked up: ${a.when}`,
    itemsTitle: `${c} Item${c === 1 ? '' : 's'} Total - ${a.visit}:`,
    items: a.itemLines ?? [],
    actions: ['Leave Review'],
  });
}

function renderScreen(s) {
  return `${chrome('bookings')}
<div class="body" data-s="09-bookings">
  <h1 class="t-title c-ink">Current Bookings</h1>
  ${s.upcoming.map(upcomingCard).join('\n  ')}
  <h1 class="t-title c-ink">Past Bookings</h1>
  ${s.past.map(pastCard).join('\n  ')}
</div>`;
}

function wire(root) {
  /* Cards open the appointment: ready → pickup options (07),
     completed → order summary (04e), else the detail (04d). DOM order
     is upcoming then past, so the index maps straight onto the two
     lists. Inner buttons (Message / Reschedule / Leave Review) keep
     their actions. */
  root.querySelectorAll('.appt-card').forEach((card, i) => {
    const ref = i < state.upcoming.length
      ? { list: 'upcoming', index: i }
      : { list: 'past', index: i - state.upcoming.length };
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const target = apptTarget(state[ref.list][ref.index]);
      if (!target) return;   // Requested cards are inert (Phase R5)
      state.currentAppt = ref;
      go(target);
    });
    card.querySelectorAll('.cta-small').forEach((b) => {
      const label = b.textContent.trim();
      if (label === 'Message') {
        b.addEventListener('click', () => {
          state.currentAppt = ref;
          go('m1-message-tailor');
        });
      }
      /* Phase R3 (Kevin, via 01): Reschedule opens the R1 popup */
      if (label === 'Reschedule') {
        b.addEventListener('click', () => {
          state.currentAppt = ref;
          openReschedulePopup();
        });
      }
      /* Phase R5 (Kevin): a Ready card's CTA leads to 07 */
      if (label === 'Schedule Pickup / Delivery') {
        b.addEventListener('click', () => {
          state.currentAppt = ref;
          go('07-items-ready');
        });
      }
    });
  });
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (el.dataset.nav === 'home') go('01-home');
      if (el.dataset.nav === 'bookings') go('09-bookings');
    });
  });
}

register('09-bookings', renderScreen, wire);
