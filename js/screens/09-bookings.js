/* ============================================================
   09 - Bookings — Figma 277:2804.
   "Current Bookings" + upcoming cards, "Past Bookings" + completed
   cards. Sections stack at gap 12; Active=Bookings in the nav.
   UX-LOOP R1-U-13: the lists partition by STATUS — a delivered
   upcoming order moves under Past Bookings. R1-U-14: Leave Review
   opens the 06.1 sheet for that appointment (a second tap toasts).
   R1-U-19/22: one card-title rule ("3 Items Total - Home Visit:").
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, apptCard, toast } from '../components.js';
import { state, canonicalStatus } from '../state.js';
import { apptMeta, apptActions, apptTarget, apptItemsTitle } from './01-home.js';
import { openReschedulePopup } from './03.1-reschedule-popup.js';
import { openLeaveReview } from './06.1-leave-review.js';

function upcomingCard(a, isFirst) {
  return apptCard({
    status: a.status,
    month: a.month, day: a.day,
    name: a.displayName ?? a.name,
    meta: apptMeta(a),
    itemsTitle: apptItemsTitle(a),
    items: a.itemLines ?? [],
    /* the 09 frame draws the prepare list on the first card only */
    prepare: isFirst ? (a.bring ?? []) : [],
    actions: apptActions(a),
  });
}

function pastCard(a) {
  return apptCard({
    status: 'completed',
    month: a.month, day: a.day,
    name: a.displayName ?? a.name,
    meta: a.fulfilment || a.deliveredAt ? apptMeta(a) : `Picked up: ${a.when}`,
    itemsTitle: apptItemsTitle(a, a.displayCount ?? a.count),
    items: a.itemLines ?? [],
    actions: ['Leave Review'],
  });
}

const delivered = (a) => canonicalStatus(a.status) === 'delivered';

/** Cards in DOM order with the state ref each one opens. */
function partition(s) {
  const up = s.upcoming.map((a, index) => ({ a, ref: { list: 'upcoming', index } }));
  return {
    current: up.filter((x) => !delivered(x.a)),
    past: [...up.filter((x) => delivered(x.a)), ...s.past.map((a, index) => ({ a, ref: { list: 'past', index } }))],
  };
}

function renderScreen(s) {
  const { current, past } = partition(s);
  return `${chrome('bookings')}
<div class="body" data-s="09-bookings">
  <h1 class="t-title c-ink">Current Bookings</h1>
  ${current.map((x, i) => upcomingCard(x.a, i === 0)).join('\n  ')}
  <h1 class="t-title c-ink">Past Bookings</h1>
  ${past.map((x) => pastCard(x.a)).join('\n  ')}
</div>`;
}

function wire(root) {
  /* Cards open the appointment's 03 variant (apptTarget); DOM order is
     current then past, mirrored by partition(). Inner buttons
     (Message / Reschedule / Leave Review) keep their actions. */
  const { current, past } = partition(state);
  const refs = [...current, ...past].map((x) => x.ref);
  root.querySelectorAll('.appt-card').forEach((card, i) => {
    const ref = refs[i];
    if (!ref) return;
    const appt = () => state[ref.list][ref.index];
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const target = apptTarget(appt());
      if (!target) return;   // Requested cards are inert (Phase R5)
      state.currentAppt = ref;
      go(target);
    });
    card.querySelectorAll('.cta-small').forEach((b) => {
      const label = b.textContent.trim();
      if (label === 'Message') {
        b.addEventListener('click', () => {
          state.currentAppt = ref;
          go('10-messages');
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
      if (label === 'Schedule Pickup / Delivery' || label === 'Change Pickup / Delivery') {
        b.addEventListener('click', () => {
          state.currentAppt = ref;
          go('05-items-ready');
        });
      }
      /* R1-U-14: the review sheet, once per appointment */
      if (label === 'Leave Review') {
        b.addEventListener('click', () => {
          state.currentAppt = ref;
          const a = appt();
          if (a.review) { toast(`You already reviewed ${(a.displayName ?? a.name ?? 'Marco Tailor').split(' ')[0]}`); return; }
          openLeaveReview();
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
