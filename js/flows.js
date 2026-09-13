/* ============================================================
   Flow jumps — the "Test flows" menu's registry (Kevin, Sep 2026).

   Every entry is ONE step of the process, grouped by stage under the
   Customer flow or the Tailor flow. Choosing an entry:
     1. resets the demo (`resetDemo()` — the seed state, no UI flags),
     2. drives the shared appointment (the Jul 12 visit with Marco,
        `mine`) to that stage through the REAL transitions in state.js
        / tailor-data.js — never by hand-writing a fixture onto it,
     3. opens the step's screen LIVE (window.__tailyNavigated), and
     4. for overlays, presses the screen's real button (`click`), so the
        popup opens through its own wiring.
   Because the state is genuine, you can keep clicking forward from any
   step and flip personas with "View as …" — both sides stay in sync.

   `setup(a, S)` receives the seed appointment and a small toolkit.
   Keys are URL-safe: `?flow=<key>` boots straight into a step.
   ============================================================ */

import {
  state, reset, tailorAccepts, confirmAppointment, completeAppointment, approveOrder,
  markReady, chooseFulfilment, deliver, proposeTime, declineAppointment, expireAppointment,
  tailorCancels, cancelAppointment, autoCancelUnconfirmed, addGarment, setAppt,
} from './state.js';
import { SEED_FINAL_ORDER } from './data.js';
import { PROPOSED_WHEN } from './fixtures.js';
import { tailorOf, setCurrent, stampAcceptedPayout, writeFinalOrder, reopenDraft, resendFinalOrder } from './tailor-data.js';

const clone = (v) => JSON.parse(JSON.stringify(v));

/* ---------- the toolkit every setup composes ---------- */

/** Back to the app's boot state: seed lists, empty booking form, no
    UI / chat / tailor flags, customer persona. */
export function resetDemo() {
  reset();
  state.garments = [];
  state.ui = {};
  delete state.chats;
  state.tailorUi = { current: null };
  state.persona = 'user';
  state.contact.street = '88 Leonard St';   // round 12: the menu's steps start past "Please Enter Address"
  state.contact.unit = '4B';
  state.contact.zip = '10013';
}

/** The seed appointment wherever it now lives (upcoming or past). */
const seedAppt = () => state.upcoming.find((a) => a.mine) ?? state.past.find((a) => a.mine) ?? null;

/** Rewind the seed to a request nobody has accepted yet (R6: no tailor
    name, the fee only held). */
function asRequest(a) {
  Object.assign(a, { status: 'searching', name: null, initials: null, tailorId: null, matching: true, feeHeld: true });
  delete a.feeChargedOn;
  delete a.tailor;
  tailorOf(a).expiresAt = null;   // T01's first render starts the 1H 24M window
  return a;
}

/** Marco has accepted (the seed's own starting point) — stamp the
    tailor-side facts T02's Accept would have written. */
function accepted(a) {
  const t = tailorOf(a);
  t.requestHandled = true;
  stampAcceptedPayout(a);
  return a;
}

/** The at-visit drafts T05 sends (tailor-side shape: no `added` marks,
    a new garment has no id — writeFinalOrder derives the marks). */
const DRAFTS = {
  /* the frames' $360 order: + Sleeve on jacket 1, + a third jacket */
  modified: () => SEED_FINAL_ORDER.garments.map(({ addedJobs, added, ...g }) => (added ? (({ id, ...rest }) => rest)(g) : g)),
  /* nothing changed at the visit */
  unchanged: (a) => clone(a.garments).map(({ addedJobs, added, ...g }) => g),
  /* jacket 2 dropped at the visit, the added jacket kept ($280) */
  removed: () => {
    const [g1, , g7] = DRAFTS.modified();
    return [g1, g7];
  },
  /* the $360 order + two pairs of pants → 5 items, the $90 fee tier (round 12: one card per item) */
  retiered: () => [...DRAFTS.modified(), { type: 'Pants / Jeans', jobs: ['Hem / Adjust Length'], photos: 2 }, { type: 'Pants / Jeans', jobs: ['Hem / Adjust Length'], photos: 2 }],
};

/** The visit happened: Sarah confirmed on the 24-hour prompt, Marco
    reviewed the order and sent it (T05 Send's two calls, in order). */
function visited(a, order = 'modified') {
  accepted(a);
  confirmAppointment(a);
  completeAppointment(a);
  writeFinalOrder(a, DRAFTS[order](a));
  return a;
}

/** Round 10: Marco reopened the sent order and sent it again with two
    pairs of pants added (Edit Details → T04 → T05 Resend). */
const resent = (a) => { visited(a); reopenDraft(a); resendFinalOrder(a, DRAFTS.retiered()); return a; };
const approved = (a, order) => { visited(a, order); approveOrder(a); return a; };
const ready = (a, order) => { approved(a, order); markReady(a); return a; };
/** Sarah picked a handoff window on 05A / 05B (the seed's windows). */
const scheduled = (a, method = 'pickup') => {
  ready(a);
  chooseFulfilment(method, 'Fri, Jul 17 · 4–6 PM', 'Jul 17', a);
  return a;
};
const delivered = (a, method) => { scheduled(a, method); deliver(a); return a; };

/** 02's form: the frame's two jackets (two photos each). */
function bookingForm({ times = false } = {}) {
  addGarment({ type: 'Suit Jacket', jobs: ['Hem / Adjust Length'], photos: 2 });
  addGarment({ type: 'Suit Jacket', jobs: ['Sleeve / Adjust Length'], photos: 2 });
  state.ui.homeSelection = { 'Suit Jacket': 2 };
  if (times) { setAppt('when', 'Jul 12, 7:00 PM'); setAppt('needBy', 'Jul 17, 3:00 PM'); }
}

/* ============================================================
   The registry
   ============================================================ */

/** @typedef {{ key: string, code: string, title: string, note?: string,
    screen: string, setup?: (a: object) => void, click?: string[] }} Flow */

export const FLOWS = {
  customer: [
    {
      title: 'Booking',
      items: [
        { key: 'c-home', code: '01', title: 'Home', note: 'Fresh start, nothing selected', screen: '01-home' },
        { key: 'c-home-selected', code: '01', title: 'Home — garments picked', note: 'Two jackets selected', screen: '01-home', setup: () => { state.ui.homeSelection = { 'Suit Jacket': 2 }; } },
        { key: 'c-details', code: '02', title: 'Appointment details', note: 'Times not picked yet', screen: '02-appointment-details', setup: () => bookingForm() },
        { key: 'c-details-ready', code: '02', title: 'Appointment details — ready', note: 'Times picked, ready to reserve', screen: '02-appointment-details', setup: () => bookingForm({ times: true }) },
        { key: 'c-time-sheet', code: '02.1', title: 'Date & time picker', screen: '02-appointment-details', setup: () => bookingForm(), click: ['[data-act="time"]'] },
        { key: 'c-address-sheet', code: '02.2', title: 'Address sheet', screen: '02-appointment-details', setup: () => bookingForm(), click: ['[data-act="address"]'] },
        { key: 'c-payment-sheet', code: '02.3', title: 'Payment method', screen: '02-appointment-details', setup: () => bookingForm({ times: true }), click: ['[data-act="request"]'] },
        { key: 'c-card-sheet', code: '02.4', title: 'Add a card', screen: '02-appointment-details', setup: () => bookingForm({ times: true }), click: ['[data-act="request"]', '.screen-sheet--overlay .method-row:nth-of-type(3)'] },
      ],
    },
    {
      title: 'Finding a tailor',
      items: [
        { key: 'c-requested', code: '03', title: 'Requested', note: 'Finding your tailor…', screen: '03-status-requested', setup: (a) => asRequest(a) },
        { key: 'c-new-time', code: '03', title: 'Requested — new time proposed', note: 'Accept or keep looking', screen: '03-status-requested', setup: (a) => { asRequest(a); proposeTime(a, PROPOSED_WHEN); } },
        { key: 'c-cancel-request', code: '03.1', title: 'Cancel request popup', screen: '03-status-requested', setup: (a) => asRequest(a), click: ['[data-act="cancel"]'] },
      ],
    },
    {
      title: 'Before the visit',
      items: [
        { key: 'c-confirmed', code: '03', title: 'Confirmed', note: 'Marco accepted', screen: '03-status-confirmed', setup: (a) => accepted(a) },
        { key: 'c-booking-photos', code: '03.3', title: 'Photo viewer — your photos', screen: '03-status-confirmed', setup: (a) => accepted(a), click: ['.garment-card--view .photo-tile--photo'] },
        { key: 'c-reschedule', code: '03.1', title: 'Reschedule / cancel popup', screen: '03-status-confirmed', setup: (a) => accepted(a), click: ['[data-act="reschedule"]'] },
        { key: 'c-reminder', code: '03', title: 'Reminder — confirm the visit', note: '24-hour prompt, fee still refundable', screen: '03-status-reminder', setup: (a) => accepted(a) },
        { key: 'c-reminder-locked', code: '03', title: 'Reminder — visit confirmed', note: 'Fee now non-refundable', screen: '03-status-reminder', setup: (a) => { accepted(a); confirmAppointment(a); } },
        { key: 'c-confirm-popup', code: '03.2', title: 'Appointment confirmed popup', screen: '03-status-reminder', setup: (a) => accepted(a), click: ['[data-act="confirm"]'] },
      ],
    },
    {
      title: 'At the visit',
      items: [
        { key: 'c-review-updated', code: '04', title: 'Review — updated invoice', note: 'Marco added a service and a jacket ($360)', screen: '04-review-approve', setup: (a) => visited(a, 'modified') },
        { key: 'c-review-unchanged', code: '04', title: 'Review — order unchanged', note: 'Same as booked ($200)', screen: '04-review-approve', setup: (a) => visited(a, 'unchanged') },
        { key: 'c-review-removed', code: '04', title: 'Review — item removed', note: 'A jacket was dropped at the visit', screen: '04-review-approve', setup: (a) => visited(a, 'removed') },
        { key: 'c-review-retiered', code: '04', title: 'Review — higher fee tier', note: '5 items, additional visitation fee', screen: '04-review-approve', setup: (a) => visited(a, 'retiered') },
        { key: 'c-request-changes', code: '04.1', title: 'Request changes popup', screen: '04-review-approve', setup: (a) => visited(a), click: ['[data-act="changes"]'] },
        { key: 'c-resent', code: '04', title: 'Review — Marco updated the order', note: 'Sent again after editing, changes highlighted', screen: '04-review-approve', setup: (a) => resent(a) },
      ],
    },
    {
      title: 'Tailoring & handoff',
      items: [
        { key: 'c-tailoring', code: '03', title: 'Tailoring in progress', note: 'Order approved', screen: '03-status-tailoring', setup: (a) => approved(a) },
        { key: 'c-photo-viewer', code: '03.3', title: 'Photo viewer — before & pinned', screen: '03-status-tailoring', setup: (a) => approved(a), click: ['.photo-row'] },
        { key: 'c-ready-home', code: '01', title: 'Home — items ready', note: 'Schedule Pickup / Delivery card', screen: '01-home', setup: (a) => ready(a) },
        { key: 'c-items-ready', code: '05', title: 'Items ready', screen: '05-items-ready', setup: (a) => ready(a) },
        { key: 'c-pickup', code: '05A', title: 'Pickup window', screen: '05a-pickup-window', setup: (a) => ready(a) },
        { key: 'c-delivery', code: '05B', title: 'Delivery options', screen: '05b-delivery-options', setup: (a) => ready(a) },
        { key: 'c-window-confirmed', code: '05.1', title: 'Window confirmed popup', screen: '05a-pickup-window', setup: (a) => ready(a), click: ['[data-act="confirm"]'] },
        { key: 'c-scheduled', code: '03', title: 'Tailoring — handoff scheduled', note: 'Waiting for Marco to hand over', screen: '03-status-tailoring', setup: (a) => scheduled(a) },
      ],
    },
    {
      title: 'Complete',
      items: [
        { key: 'c-complete', code: '06', title: 'Journey complete', note: 'Picked up', screen: '06-journey-complete', setup: (a) => delivered(a, 'pickup') },
        { key: 'c-complete-delivery', code: '06', title: 'Journey complete — delivered', note: '+$20 delivery', screen: '06-journey-complete', setup: (a) => delivered(a, 'delivery') },
        { key: 'c-leave-review', code: '06.1', title: 'Leave a review', screen: '06-journey-complete', setup: (a) => delivered(a), click: ['[data-act="review"]'] },
        { key: 'c-review-submitted', code: '06.1', title: 'Review submitted', note: 'closes itself after 2 s or on a tap', screen: '06-journey-complete', setup: (a) => delivered(a), click: ['[data-act="review"]', '[data-act="confirm-review"]'] },
        { key: 'c-summary', code: '03', title: 'Order summary', note: 'Receipt after completion', screen: '03-status-summary', setup: (a) => delivered(a) },
      ],
    },
    {
      title: 'Cancellations & edge cases',
      items: [
        { key: 'c-cancel-refund', code: '03', title: 'Cancelled by you — refunded', note: 'Before confirming the visit', screen: '03-status-cancelled', setup: (a) => { accepted(a); cancelAppointment(a); } },
        { key: 'c-cancel-kept', code: '03', title: 'Cancelled by you — fee kept', note: 'After confirming the visit', screen: '03-status-cancelled', setup: (a) => { accepted(a); confirmAppointment(a); cancelAppointment(a); } },
        { key: 'c-withdrawn', code: '03', title: 'Request withdrawn', screen: '03-status-cancelled', setup: (a) => { asRequest(a); cancelAppointment(a); } },
        { key: 'c-expired', code: '03', title: 'Request expired', note: 'No tailor accepted in time', screen: '03-status-cancelled', setup: (a) => { asRequest(a); expireAppointment(a); } },
        { key: 'c-declined', code: '03', title: 'Tailor declined', screen: '03-status-cancelled', setup: (a) => { asRequest(a); declineAppointment(a); } },
        { key: 'c-tailor-cancelled', code: '03', title: 'Tailor had to cancel', screen: '03-status-cancelled', setup: (a) => { accepted(a); tailorCancels(a, 'cant-make-it'); } },
        { key: 'c-no-show', code: '03', title: 'Marked as a no-show', screen: '03-status-cancelled', setup: (a) => { accepted(a); confirmAppointment(a); tailorCancels(a, 'no-show'); } },
        { key: 'c-unconfirmed', code: '03', title: 'Auto-cancelled — never confirmed', screen: '03-status-cancelled', setup: (a) => { accepted(a); autoCancelUnconfirmed(a); } },
      ],
    },
    {
      title: 'Tabs',
      items: [
        { key: 'c-bookings', code: '09', title: 'Bookings', screen: '09-bookings' },
        { key: 'c-messages', code: '10', title: 'Messages with Marco', screen: '10-messages', setup: (a) => accepted(a) },
      ],
    },
  ],

  tailor: [
    {
      title: 'New requests',
      items: [
        { key: 't-home-request', code: 'T01', title: 'Home — new request', screen: 't01-home', setup: (a) => asRequest(a) },
        { key: 't-request', code: 'T02', title: 'Appointment request', note: 'Payout and no-show protection', screen: 't02-appointment-request', setup: (a) => asRequest(a) },
        { key: 't-request-expired', code: 'T02', title: 'Request expired', screen: 't02-appointment-request', setup: (a) => { asRequest(a); expireAppointment(a); } },
        { key: 't-request-new-time', code: 'T02', title: 'Request new time', note: 'The propose wheel', screen: 't02-appointment-request', setup: (a) => asRequest(a), click: ['[data-act="new-time"]'] },
        { key: 't-accepted', code: 'T03', title: 'Booking confirmed', note: 'Right after Accept', screen: 't03-request-accepted', setup: (a) => { accepted(a); tailorOf(a).justAccepted = true; } },
        { key: 't-decline', code: 'T03A', title: 'Decline request', screen: 't03a-decline-request', setup: (a) => asRequest(a) },
        { key: 't-suggest-time', code: 'T03A', title: 'Decline — suggest another time', note: 'Schedule conflict selected', screen: 't03a-decline-request', setup: (a) => { asRequest(a); tailorOf(a).declineReason = 0; } },
        { key: 't-decline-other', code: 'T03A', title: 'Decline — other reason', note: 'Free-text note', screen: 't03a-decline-request', setup: (a) => { asRequest(a); tailorOf(a).declineReason = 4; } },
        { key: 't-home-proposed', code: 'T01', title: 'Home — time proposed', note: 'Waiting for Sarah', screen: 't01-home', setup: (a) => { asRequest(a); proposeTime(a, PROPOSED_WHEN); } },
      ],
    },
    {
      title: 'Before the visit',
      items: [
        { key: 't-home-active', code: 'T01', title: 'Home — active job', screen: 't01-home', setup: (a) => accepted(a) },
        { key: 't-upcoming', code: 'T03', title: 'Upcoming visit', screen: 't03-request-accepted', setup: (a) => accepted(a) },
        { key: 't-cant-make-it', code: 'T03.1', title: 'Can’t make it popup', screen: 't03-request-accepted', setup: (a) => accepted(a), click: ['[data-act="cant-make-it"]'] },
      ],
    },
    {
      title: 'At the visit',
      items: [
        { key: 't-details', code: 'T04', title: 'Appointment details', note: 'Edit the order', screen: 't04-appointment-details', setup: (a) => accepted(a) },
        { key: 't-final-pricing', code: 'T05', title: 'Confirm final pricing', note: 'Updated invoice, payout $200 → $360', screen: 't05-confirm-final-pricing', setup: (a) => { accepted(a); tailorOf(a).draft = DRAFTS.modified(); } },
        { key: 't-final-removed', code: 'T05', title: 'Final pricing — item removed', screen: 't05-confirm-final-pricing', setup: (a) => { accepted(a); tailorOf(a).draft = DRAFTS.removed(); } },
        { key: 't-edit-details', code: 'T04', title: 'Edit details — order reopened', note: 'Awaiting approval; edit and resend', screen: 't04-appointment-details', setup: (a) => { visited(a); reopenDraft(a); } },
        { key: 't-resend', code: 'T05', title: 'Resend final pricing', note: 'Two pairs of pants added after sending', screen: 't05-confirm-final-pricing', setup: (a) => { visited(a); reopenDraft(a); tailorOf(a).draft = DRAFTS.retiered(); } },
        { key: 't-support', code: 'TM1', title: 'Taily support chat', screen: '10-messages', setup: (a) => { accepted(a); state.tailorUi.chat = 'support'; } },
      ],
    },
    {
      title: 'After the visit',
      items: [
        { key: 't-status-awaiting', code: 'T06', title: 'Status — awaiting Sarah’s approval', screen: 't06-appointment-status', setup: (a) => visited(a) },
        { key: 't-status-resent', code: 'T06', title: 'Status — updated order sent again', screen: 't06-appointment-status', setup: (a) => resent(a) },
        { key: 't-status-tailoring', code: 'T06', title: 'Status — tailoring', note: 'Order approved', screen: 't06-appointment-status', setup: (a) => approved(a) },
        { key: 't-ready-waiting', code: 'T07', title: 'Job ready — waiting for Sarah', note: 'No handoff chosen yet', screen: 't07-job-ready', setup: (a) => ready(a) },
        { key: 't-ready-pickup', code: 'T07', title: 'Job ready — pickup scheduled', screen: 't07-job-ready', setup: (a) => scheduled(a, 'pickup') },
        { key: 't-ready-delivery', code: 'T07', title: 'Job ready — delivery scheduled', screen: 't07-job-ready', setup: (a) => scheduled(a, 'delivery') },
        { key: 't-complete', code: 'T08', title: 'Job complete', note: 'Payout on its way', screen: 't08-job-complete', setup: (a) => delivered(a) },
      ],
    },
    {
      title: 'Closed jobs',
      items: [
        { key: 't-cancelled-by-you', code: 'T03B', title: 'Cancelled by you', screen: 't03b-job-cancelled', setup: (a) => { accepted(a); tailorCancels(a, 'cant-make-it'); } },
        { key: 't-no-show', code: 'T03B', title: 'No-show', note: 'Trip compensation', screen: 't03b-job-cancelled', setup: (a) => { accepted(a); confirmAppointment(a); tailorCancels(a, 'no-show'); } },
        { key: 't-customer-cancelled', code: 'T03B', title: 'Sarah cancelled', screen: 't03b-job-cancelled', setup: (a) => { accepted(a); cancelAppointment(a); } },
        { key: 't-withdrawn', code: 'T03B', title: 'Request withdrawn', screen: 't03b-job-cancelled', setup: (a) => { asRequest(a); cancelAppointment(a); } },
        { key: 't-home-closed', code: 'T01', title: 'Home — done today', note: 'Closed rows with Clear', screen: 't01-home', setup: (a) => { accepted(a); tailorCancels(a, 'cant-make-it'); } },
      ],
    },
    {
      title: 'Messages',
      items: [
        { key: 't-messages', code: 'TM1', title: 'Message Sarah', screen: '10-messages', setup: (a) => { accepted(a); state.tailorUi.chat = 'customer'; } },
      ],
    },
  ],
};

/** Every entry with its persona, flat. */
export const ALL_FLOWS = Object.entries(FLOWS).flatMap(([persona, groups]) =>
  groups.flatMap((g) => g.items.map((item) => ({ ...item, persona, group: g.title }))));

export const findFlow = (key) => ALL_FLOWS.find((f) => f.key === key) ?? null;

/**
 * Put the demo into a flow's state. Returns the entry (null for an
 * unknown key). The caller renders `entry.screen` and presses
 * `entry.click` — see flow-menu.js.
 */
export function prepareFlow(key) {
  const entry = findFlow(key);
  if (!entry) return null;
  resetDemo();
  const a = seedAppt();
  entry.setup?.(a);
  /* both sides look at the seed appointment, wherever the setup left it */
  const live = seedAppt();
  const ui = state.upcoming.indexOf(live);
  state.currentAppt = ui >= 0 ? { list: 'upcoming', index: ui } : { list: 'past', index: Math.max(0, state.past.indexOf(live)) };
  setCurrent(live);
  state.persona = entry.persona === 'tailor' ? 'tailor' : 'user';
  return entry;
}
